# Changelog

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
versioning follows [SemVer](https://semver.org/).

> This repository tracks JSRay Core versions only. Platform plugins such as WordPress maintain their own versions and changelogs in separate repositories.

## [0.0.1-beta.4] — 2026-08-01

No engine changes. `dist/jsray.js` is byte-for-byte the 0.0.1-beta.3 build — this release is about what surrounds it: what the package publishes, what the site sends, and how a copied snapshot stays current.

### Added
- **Subresource Integrity for anyone loading Core from jsray.org.** The integrations verify their bundled snapshot against `integrity.json`; a page loading the same file over a `<script>` tag verified nothing. The digests were already `sha256-<base64>`, the exact format SRI takes, so this needed publishing rather than inventing. Two things had to be true for the instructions to work rather than break pages: `/v/<version>/integrity.json` had to exist — it was a 404, because the build copied `dist/` and left the manifest behind — and the pinned paths had to send `Access-Control-Allow-Origin`, because SRI on a cross-origin script is only enforced when `crossorigin="anonymous"` makes the load a CORS request, and the browser blocks the script outright otherwise. Verified end to end from a separate origin: a correct hash loads, a wrong one is refused.
- **Security response headers.** jsray.org serves JavaScript into other people's pages and sent none: no HSTS, so a first visit typed without a scheme was a plaintext request; no `nosniff`, on an origin whose job is serving `.js` and `.css` to third parties. Also `Referrer-Policy` and `X-Frame-Options`.
- **The palette sources ship.** `themes/*.json` is in `files` and in `exports`. The VS Code themes and terminal ANSI maps are regenerated from those sources, not from the CSS, and an integration syncing from the published package would otherwise have quietly ended up with one palette where there should be four — the copy step skipped a missing directory rather than failing on it.
- A footer on both site pages: install, documentation, ecosystem, project. The integrations are named but not linked, because their repositories do not exist yet.

### Fixed
- **`/v/<version>/` is immutable.** Those paths never change by design — that is the entire reason they exist — and were served with the same `must-revalidate` policy as `/dist/`, so every page load asked the origin about a file that cannot differ.
- **One fewer redirect.** The deployed pages link `/studio` rather than `/studio.html`, which Cloudflare was answering with a 307 on every visit. Rewritten at build time, so opening `demo/index.html` from a checkout still works.
- **The theme studio wrote incomplete themes.** Its surface list had two of five entries, so a downloaded theme carried no `--jr-border`, `--jr-gutter-fg` or `--jr-line-hl` — leaving inline code with no background and the scrollbar thumb invisible, on a file the studio itself tells you to drop next to `jsray.css`.

### Changed
- **Integrations stop relying on someone remembering to sync.** They vendor a Core snapshot because a WordPress plugin is a zip on a host with no package manager and a VS Code extension has to work offline. A copy does not update itself, and the existing drift check compares against a sibling checkout and skips silently when Core is absent — which is every CI run. beta.3 fixed a denial of service that stayed in all three bundles until someone measured them. `tools/sync-core.sh` now accepts `JSRAY_CORE_VERSION` and syncs from the published tarball, so the sync can run somewhere other than a maintainer's laptop; `sync-core-version.mjs` falls back to `package.json`, because `version.json` is not published. The integration side — a CI check that fails when the bundle is behind the `beta` dist-tag, and a scheduled workflow that opens a sync pull request — lives in those repositories.
- `docs/development.md` records a convention that was never written down: **security releases do not batch.**

## [0.0.1-beta.3] — 2026-07-31

### Fixed
- **Catastrophic backtracking on unterminated interpolating strings.** JavaScript template literals, Ruby and Elixir `#{}` strings, and shell `"$var"` strings each let an interpolation be matched two ways — as one placeholder or character by character — so an unclosed string made the regex engine try every combination. Twenty-six `$a` in an unclosed shell string took 115 seconds; a few thousand characters would never finish. In a browser that is a frozen tab, reachable from ordinary content: a snippet cut off mid-line, a tutorial showing half a function. Each fallback character class now excludes the character its interpolation branch starts with, which is what PHP and PowerShell already did. The same input is now handled in single-digit milliseconds at any length.
- **CSS custom properties were split in two.** `--jr-keyword: #ff7b72` rendered as an uncolored `--` followed by a `jr-keyword` token, and `var(--brand)` was left entirely uncolored, because a word boundary cannot match before a leading `-`. Custom properties are now matched whole in both roles. JSRay's own theme stylesheets are made of nothing else — all 56 declarations in `default.css` were affected.
- **YAML block scalars treated `#` as a comment.** Everything indented under `key: |` or `key: >` is literal text; a `#` in there is content.
- **The default palette was missing three surfaces.** `tokens.json` declared `background` and `foreground` but not `border`, `gutter`, or `lineHighlight`; the other three themes declared all five. The generated CSS looked complete because `generate-theme.mjs` substitutes a default for anything a palette omits — but `applyTheme()` and the integrations read the palette, not the CSS. Switching to the default palette at runtime therefore left the previous theme's border and gutter in place. The values are now in the palette itself, identical to what the generator was substituting, so the stylesheets are byte-for-byte unchanged.

### Changed
- `JSRay.languages` gained the four punctuation aliases (`c++`, `c#`, `objective-c`, `obj-c`), which were reachable through `normalizeLanguage()` but absent as lookup keys — 79 keys to 83, over the same 35 grammars. No existing key changed what it normalizes to.
- Language aliases are declared once. Thirty-five `G.rb = G.ruby` assignments duplicated `LANGUAGE_ALIASES` and had already drifted from it — `ts` pointed at `javascript` in one place and `typescript` in the other. The table is now the only declaration and the lookup keys are derived from it.
- Node 18 left the CI matrix (end-of-life) and `engines.node` moved to `>=20`. Nothing in Core required the change; a supported version the tests never run is a guess.

### Added
- `tests/contract.test.mjs`: invariants that hold across every language rather than one at a time — highlighting never alters the source text, `tokenize()` never loses text, output can never break out of `innerHTML`, no input shape takes superlinear time in any grammar, and the published package contains what the docs, types, and integrations depend on. 108 tests total, up from 67.
- Drift guards for the two single-source tables. `vocabulary.json` is inlined in the runtime as `THEME_ALIAS` because Core loads as a plain `<script>` and cannot read JSON; a test now asserts the copy matches entry for entry, and that `applyTheme()` uses all of it. `tests/palettes.test.mjs` also stopped restating the token list and reads it from `vocabulary.json` — a hand-copied list in a contract test silently stops checking tokens added after it was written.
- While no stable version exists on the registry, `tools/release.sh` now points `latest` at the newest prerelease as well as `beta`. `latest` has to point somewhere and npm picks it regardless, so leaving it alone did not mean "no default" — it meant the default stayed frozen on whichever prerelease claimed it first. `npm install @jsray/core`, the command in the README, kept installing 0.0.1-beta.2 after beta.3 shipped: older than the current release, and carrying the denial of service above. The check reads the registry rather than a flag, so it ends by itself when 1.0 is published.
- CI verifies `integrity.json` and includes it in the build-sync diff. This manifest is how every integration decides whether the Core snapshot it bundles is the official build, and nothing in CI had been checking it.

### Documentation
- `types/jsray.d.ts` said `require('jsray')` — the package is `@jsray/core` — carried a version example from the retired internal channel, and described `applyTheme()`'s default root as `document.documentElement` when the implementation prefers the element carrying `data-theme`. A test now ties the example version to the real one.
- The README documented four of the eight public API methods. `tokenize()` and `render()`, the entry points for rendering to anything other than HTML, are now shown with the stream shape they exchange; `applyTheme()` and `normalizeLanguage()` are listed. A test keeps the list complete.
- Corrected the identifier-family count (the feature table lists nine, the text said six), the language table's missing identifiers (`jsonc`, `sass`, `less`, `kts`, `cfg`, `conf`), and the repository tree, which omitted `dist/themes/` — the directory every Quick Start snippet links — along with two of the five files in `docs/`.

## [0.0.1-beta.2] — 2026-07-26

### Fixed
- `highlightElement()` tagged elements with `data-cx-lang`, a leftover from the project's pre-rename identity, instead of `data-jsray-lang`. The attribute is informational — nothing in Core reads it back — but it surfaced in the DOM of every page using JSRay. Integrations that read it (the VS Code preview adapter's re-render cache) were updated in step.

### Changed
- Published to npm as [`@jsray/core`](https://www.npmjs.com/package/@jsray/core). The unscoped name `jsray` is unavailable, and the `@jsray` scope reserves the whole family for the integrations.

## [0.0.1-beta.1] — 2026-07-17

### Status
- **First public beta.** The repository is public at [github.com/JSRayCore/JSRay](https://github.com/JSRayCore/JSRay); integration repositories (WordPress, VS Code, terminal) open as each reaches its own beta.

### Highlights (everything from the internal series below)
- Zero-dependency rendering kernel: 35 language families / 79 language keys, 23-class token semantics with six-family identifier separation.
- Four built-in themes (default, aurora, ember, fjord), each dark + light, generated from palette JSON.
- Three-step language detection (JSON fast path → shebang → signal scoring).
- Token fallback chain and vocabulary governance for forward-compatible growth.
- ~2× tokenizer performance via rule-regex caching.

## [0.0.1-internal.2] — 2026-07-02

### Status
- Internal test build; not a public beta.

### Added
- 13 new language families (30+ total): Scala, Objective-C, R, Perl, PowerShell, Elixir, Haskell, GraphQL, TOML, INI, Dockerfile, Makefile, and Diff/Patch, with aliases (`objc`, `pl`, `ps1`, `ex`, `hs`, `gql`, `docker`, `make`, `patch`, `properties`, ...).
- `cLikeGrammar` gained a `fnDeclKeywords` option for declaration syntaxes without `(...) {` bodies (used by Scala's `def`).
- Shebang fast path in `detectLanguage()`: a leading `#!` line resolves the interpreter directly (python/perl/ruby/node/pwsh/php/bash).
- Detection signals for all new languages, with diff ranked first so patch payloads don't get mistaken for their embedded language.
- Three new built-in themes, each with dark + light variants and full 23-token coverage: **Aurora** (polar night, glacial blue + aurora mint/violet), **Ember** (warm forge, flame keywords + patina-mint functions), and **Fjord** (Nordic low-chroma for long reading sessions).
- `tools/generate-theme.mjs` now fans out every `themes/*.json` palette to `src/themes/<name>.css` in addition to `tokens.json` → `default.css`.
- Demo page gained a palette switcher (Default / Aurora / Ember / Fjord) alongside the dark/light toggle.

### Fixed
- `JSRay.applyTheme()` without an explicit root now targets the element carrying `data-theme` (usually `<body>`) instead of `<html>`. Inline variables on `<html>` were shadowed by the theme stylesheet's `[data-theme]` block on `<body>`, which made runtime theme edits — including every color change in the Theme Studio — visually inert.
- Comment markers inside strings no longer break highlighting, across every language family: `#` in ruby/shell/yaml/r/perl/elixir/toml/python/php/powershell/graphql/dockerfile, `//` in JS/TS, PHP, and the whole C-like family (URLs like `"https://..."` used to turn into comments), and `--` in lua/sql/haskell. Rule: block comments stay before strings; line comments come after.

### Added (post 2026-07-02)
- Token fallback chain in every render consumer (`applyTheme`, theme generator, VS Code themes, terminal ANSI): a refined key resolves through its base (`function.declaration` → `function`), so the vocabulary can grow in minor versions without breaking existing palettes or surfaces. Vocabulary governance rules documented in the development guide.
- `JSRay.version` runtime export for shell/core compatibility negotiation; `check:versions` asserts it matches `version.json`.
- Final logo (gradient `</>` mark, design 11b) wired into README heroes, demo/studio favicons, and downstream marketplace icons.
- `tools/sync-integrations.sh` / `npm run sync:integrations`: one-command Core → integrations propagation.

### Performance
- Grammar-rule regexes are compiled once and cached instead of per stream piece: highlighting is roughly 2× faster (64KB JS: 5.0 → 2.5 ms; 16KB Python: 2.0 → 0.8 ms).

### Changed
- The class count in docs and headers is standardized to the factual **23** (was branded "22"); the six-family separation remains the headline claim. `docs/tokens.md` family grouping corrected from 5 to 6.

## [0.0.1-internal.1] — 2026-06-12

### Status
- Internal test build; not a public beta.

### Added
- JavaScript-native rendering kernel `jsray.js`.
- 20+ language families / identifier sets: JS/TS, Python, PHP, Go, Swift, Kotlin, Dart, Lua, Java, C/C++/C#, Ruby, Rust, HTML, CSS, JSON, Shell, Markdown, SQL, YAML, and more.
- `JSRay.detectLanguage()` for auto-detecting common snippets when no `language-*` class is present.
- 22-class token semantic system with default dark/light themes.
- Programmatic API: `JSRay.highlight()` / `highlightElement()` / `highlightAll()`.
- `version.json` and `tools/check-versions.mjs` for validating Core internal version metadata.
- `docs/projects.md`, defining the boundary between Core and platform-plugin repositories.

### Changed
- Core version reset to `0.0.1-internal.1`.
- `package.json` keeps `"private": true` during the internal test phase to prevent accidental publishing.
- WordPress plugin code moved out of the Core repository, now maintained in a separate repository.
