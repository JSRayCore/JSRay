#!/usr/bin/env bash
# ============================================================
# watch-domain.sh
#
# Poll a domain's WHOIS status and shout when it becomes
# available, or when its status changes meaningfully. Designed
# for a self-hosted "drop sniper" on Linux or macOS.
#
# Usage:
#   ./watch-domain.sh jsray.org
#
# Cron (every 30 min):
#   */30 * * * * /path/to/watch-domain.sh jsray.org
#
# Output:
#   - Stdout: human-readable status line
#   - Log:    ~/.jsray-watch/<domain>.log  (append-only history)
#   - Alert:  terminal bell + desktop notification + email (if mail is configured)
# ============================================================

set -euo pipefail

DOMAIN="${1:-jsray.org}"
LOG_DIR="${HOME}/.jsray-watch"
LOG_FILE="${LOG_DIR}/${DOMAIN}.log"
STATE_FILE="${LOG_DIR}/${DOMAIN}.state"
mkdir -p "${LOG_DIR}"

now() { date '+%Y-%m-%d %H:%M:%S'; }

# --- Detect platform for notification ---------------------------------------
notify() {
  local title="$1" body="$2"
  # macOS
  if command -v osascript >/dev/null 2>&1; then
    osascript -e "display notification \"${body}\" with title \"${title}\" sound name \"Glass\"" 2>/dev/null || true
  fi
  # Linux (GNOME / KDE)
  if command -v notify-send >/dev/null 2>&1; then
    notify-send -u critical "${title}" "${body}" 2>/dev/null || true
  fi
  # Email fallback (if `mail` is configured)
  if command -v mail >/dev/null 2>&1 && [ -n "${WATCH_EMAIL:-}" ]; then
    printf '%s\n' "${body}" | mail -s "${title}" "${WATCH_EMAIL}" 2>/dev/null || true
  fi
  # Always ring the terminal bell
  printf '\a'
}

# --- WHOIS lookup ------------------------------------------------------------
if ! command -v whois >/dev/null 2>&1; then
  echo "error: 'whois' command not found. Install it first:" >&2
  echo "  macOS:  brew install whois" >&2
  echo "  Linux:  sudo apt install whois  /  sudo yum install whois" >&2
  exit 1
fi

WHOIS_RAW="$(whois "${DOMAIN}" 2>/dev/null || true)"

# --- Classify status ---------------------------------------------------------
# Order matters — earliest match wins.
STATUS="unknown"
DETAIL=""

if echo "${WHOIS_RAW}" | grep -qiE "no match|not found|no entries found|NOT FOUND|domain not found"; then
  STATUS="AVAILABLE"
  DETAIL="domain is free — go register now!"
elif echo "${WHOIS_RAW}" | grep -qi "pendingDelete"; then
  STATUS="pendingDelete"
  DETAIL="will drop within ~5 days"
elif echo "${WHOIS_RAW}" | grep -qi "redemptionPeriod"; then
  STATUS="redemptionPeriod"
  DETAIL="owner can still recover (~30 day window)"
elif echo "${WHOIS_RAW}" | grep -qi "autoRenewPeriod\|renewPeriod"; then
  STATUS="autoRenewPeriod"
  DETAIL="expired, in registrar grace period"
elif echo "${WHOIS_RAW}" | grep -qiE "Domain Status: ok|clientTransferProhibited"; then
  STATUS="registered"
  EXPIRY="$(echo "${WHOIS_RAW}" | grep -iE "(Registry Expiry|Registrar Registration Expiration|Expir.* Date):" | head -1 | sed 's/^[^:]*: *//')"
  DETAIL="held by current owner; expiry: ${EXPIRY:-unknown}"
fi

# --- Read previous state and detect transitions ------------------------------
PREV_STATUS=""
if [ -f "${STATE_FILE}" ]; then
  PREV_STATUS="$(cat "${STATE_FILE}")"
fi

LINE="[$(now)] ${DOMAIN}  status=${STATUS}  ${DETAIL}"
echo "${LINE}"
echo "${LINE}" >> "${LOG_FILE}"

# --- Trigger alerts on meaningful change -------------------------------------
if [ "${STATUS}" != "${PREV_STATUS}" ]; then
  case "${STATUS}" in
    AVAILABLE)
      notify "🚨 ${DOMAIN} AVAILABLE" "Register it immediately at Cloudflare / Porkbun / Namecheap"
      # Hammer the bell a few times so you actually hear it
      for _ in 1 2 3 4 5; do printf '\a'; sleep 0.3; done
      ;;
    pendingDelete)
      notify "⏳ ${DOMAIN} entering pendingDelete" "Drop expected in ~5 days. Get ready."
      ;;
    redemptionPeriod)
      notify "📅 ${DOMAIN} in redemptionPeriod" "Owner can still recover; wait it out."
      ;;
    *)
      notify "ℹ️ ${DOMAIN} status changed" "${PREV_STATUS} → ${STATUS}"
      ;;
  esac
fi

echo "${STATUS}" > "${STATE_FILE}"
