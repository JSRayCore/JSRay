# JSRay Versioning

JSRay Core uses single-project versioning. Platform plugins keep their own version files in their own repositories.

Current version: `0.0.1-internal.1`
Current channel: `internal`
Public beta released: no
Next public beta target: `0.0.1-beta.1`

JSRay Core is the standalone JavaScript-native code rendering kernel. Platform plugins, including the WordPress plugin, are separate repositories that consume and bundle Core.

Internal test builds may be shared privately, but they should not be described as public beta releases.

## Channels

| Channel | Format | Meaning |
|---|---|---|
| Internal | `0.0.1-internal.N` | Private test builds before a public beta. |
| Public beta | `0.0.1-beta.N` | Public beta builds announced to external users. |
| Stable | `0.0.1` | Stable public release. |

## Rules

1. `version.json` is the Core release-channel summary.
2. `package.json` and `tokens.json` track the Core version.
3. Platform plugin versions live in their own repositories and may differ from the Core version.
4. Internal Core builds keep `package.json` marked as `"private": true` to prevent accidental npm publishing.
5. Before committing version changes, run `npm run check:versions`.

## Promotion

When Core is ready for its first public beta:

1. Change `version.json` to `0.0.1-beta.1` and `channel` to `beta`.
2. Remove `"private": true` from `package.json` only when npm publishing is intended.
3. Update the README badges and changelog status from internal test to public beta.
