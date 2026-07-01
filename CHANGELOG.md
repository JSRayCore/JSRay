# Changelog

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
versioning follows [SemVer](https://semver.org/).

> This repository tracks JSRay Core versions only. Platform plugins such as WordPress maintain their own versions and changelogs in separate repositories.

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
