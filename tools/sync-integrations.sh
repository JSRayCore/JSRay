#!/bin/sh
# Propagate the current Core dist to every sibling integration in one command,
# then run each integration's tests and version checks.
#
# Usage:
#   sh tools/sync-integrations.sh           # build Core, sync + test all siblings
#   sh tools/sync-integrations.sh --check   # no changes: report drift status only
set -e
cd "$(dirname "$0")/.."
CORE=$(pwd)
MODE="${1:-sync}"

if [ "$MODE" != "--check" ]; then
  sh build.sh
fi

FAILED=0
for repo in jsray-wp jsray-vscode jsray-terminal; do
  dir="$CORE/../$repo"
  if [ ! -d "$dir" ]; then
    echo "skip: ../$repo not checked out"
    continue
  fi
  echo "=== $repo ==="
  if [ "$MODE" = "--check" ]; then
    (cd "$dir" && JSRAY_CORE_DIR="$CORE" JSRAY_STRICT_DRIFT=1 node tools/check-versions.mjs) || FAILED=1
  else
    (cd "$dir" \
      && JSRAY_CORE_DIR="$CORE" sh tools/sync-core.sh \
      && npm test \
      && JSRAY_CORE_DIR="$CORE" JSRAY_STRICT_DRIFT=1 node tools/check-versions.mjs) || FAILED=1
  fi
done

if [ "$FAILED" = "1" ]; then
  echo "sync-integrations: at least one integration failed" >&2
  exit 1
fi
echo "sync-integrations: all integrations in step with Core"
