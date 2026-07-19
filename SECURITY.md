# Security Policy

## Reporting a vulnerability

If you find a security vulnerability, **do not** open a public issue. Please report it privately:

- Email: **support@jsray.org**
- Official site: https://jsray.org

We aim to acknowledge reports within 72 hours.

## Scope

`jsray.js` runs in a browser context, so the primary security concern is **XSS protection**:

- The engine escapes `& < > "` via `escapeHtml()`, and no input should ever produce unescaped HTML.
- If you find an input string that makes the output contain unescaped angle brackets or an attribute-quote escape, **that is a high-severity vulnerability**.

Out of scope:
- Security issues introduced by user-defined grammar rules (`G.xxx`).
- Known catastrophic backtracking — please report it as an issue, not as a vulnerability.

## Supported versions

| Version | Security updates |
|---|---|
| 0.0.1-internal.1 | ✅ Internal test |
| Public beta / stable | Not yet released |
