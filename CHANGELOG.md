# Changelog

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
versioning follows [SemVer](https://semver.org/).

> This repository tracks JSRay Core versions only. Platform plugins such as WordPress maintain their own versions and changelogs in separate repositories.

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
