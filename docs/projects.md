# JSRay Project Boundary

This repository is **JSRay Core**.

JSRay Core is the standalone JavaScript-native code rendering kernel. Platform plugins are separate products and should live in separate git repositories.

## Ecosystem Vision

JSRay is a fully open-source code rendering ecosystem. The goal is to let JSRay work wherever code appears: websites, content platforms, editors, documentation systems, and developer tools.

> One renderer. Many places for code to shine.

## Ecosystem Layers

1. Core: `jsray`, the zero-dependency JavaScript renderer.
2. Official integrations: maintained platform projects: `jsray-wp`, `jsray-vscode`, and `jsray-terminal`.
3. Community integrations: third-party adapters for frameworks, static-site generators, editors, and publishing tools.

Official integrations should be complete open-source projects. They should not lock the baseline JSRay experience behind paid feature gates.

## Renderer Boundary

Official integrations use JSRay Core by default. They are JSRay ecosystem entry points, not closed wrappers around a single renderer.

The platform layer should expose adapter hooks so host projects can integrate another renderer when needed. The default experience stays JSRay, while the extension points keep the ecosystem open.

The minimum renderer shape is:

```js
renderer.highlight(code, language, options) -> html
renderer.highlightElement(element, options) -> void
renderer.languages -> { [language]: label }
```

## Core Owns

- `src/jsray.js`
- `src/jsray.css`
- `src/themes/`
- `tokens.json`
- `types/jsray.d.ts`
- `dist/`
- npm package metadata
- Core versioning and changelog

## Platform Plugins Own

- Platform-specific editor UI
- Platform-specific settings
- Platform-specific packaging
- Platform plugin versioning and changelog
- Bundled Core asset snapshots

## Dependency Direction

Platform plugins depend on Core. Core must not depend on platform plugins.

Core changes flow into plugin repositories by copying or packaging `dist/` assets. Plugin changes should not require Core version changes unless they alter the Core API or assets.

## Repository Split

Expected open-source repositories:

- `jsray`: Core renderer and npm package.
- `jsray-wp`: WordPress plugin.
- `jsray-terminal`: terminal CLI.
- `jsray-vscode`: VS Code extension.
- Future platform repositories such as `jsray-react`, `jsray-astro`, or `jsray-mdx` if needed.

## Website Routes

The public website should keep the brand concentrated under `jsray.org`:

- `https://jsray.org`: project home and Core renderer.
- `https://jsray.org/docs`: shared documentation.
- `https://jsray.org/wordpress`: WordPress plugin.
- `https://jsray.org/vscode`: VS Code extension.
