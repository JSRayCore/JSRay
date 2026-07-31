# Contributing

Issues and PRs for JSRay are welcome.

## Development workflow

1. Fork & clone
2. Edit `src/jsray.js` or `src/jsray.css`
3. Run `sh build.sh` to sync into `dist/` (currently a plain `cp`; minification can be layered on later)
4. Run the tests: `npm test` (requires Node ≥ 20)
5. Preview locally: serve the project root with any static server and open `/demo/index.html`

## Adding a language

Add a grammar object at `G.<lang>` in `src/jsray.js`:

```js
G.mylang = [
  { cls: 'tk-comment', pattern: /\/\/.*/ },
  { cls: 'tk-keyword', pattern: /\b(?:if|then|else)\b/ },
  // ... rules are ordered by priority — first match wins
];
```

Key points:
- **Rule order determines priority.** Comments / strings always go first.
- **Declaration rules go before `keyword`** (otherwise `function`/`def`/`class` are consumed by the keyword rule first and the declaration name is never captured).
- Use `lookbehind: true` with patterns like `(\bfunction\s+)` to mark a prefix; the prefix is consumed but not colored.
- Use `inside: [...]` to re-apply a sub-grammar to captured text (parameter lists and template-string interpolations rely on this).

Add a matching example to [docs/languages.md](docs/languages.md).

## Tuning the palette

Only touch the CSS variables at the top of `src/jsray.css`.
**Do not hardcode colors in the JS engine** — every color is driven through `--jr-*` variables.

After tuning, also update:
- `tokens.json` (machine-readable copy)
- the color table in `docs/tokens.md`
- the color table in `README.md`

## Commit conventions

Use short, imperative commit messages, e.g.:

```
add Rust language grammar
fix regex tokenizer infinite loop on empty match
docs: add Markdown-specific classes to the 22-token table
```

## Pull Requests

`main` is protected and **nobody pushes to it directly — maintainers included**.
Every change lands the same way:

```sh
git checkout -b my-change
# ... work, then:
npm test && node tools/check-versions.mjs && node tools/integrity.mjs --check
git push origin my-change
gh pr create --fill
```

CI runs the suite on Node 20, 22, and 24. All three must pass before the PR can
merge; the branch also has to be up to date with `main`.

- One PR per concern, to keep reviews easy.
- Engine or grammar changes must come with added / updated tests.
- Palette changes should include demo screenshots (both dark and light).

## Releasing

Only for maintainers, and the version bump is itself a pull request:

1. Bump `version.json`, `package.json`, `src/jsray.js`, `tokens.json`, and the
   docs `check:versions` looks at; add the `CHANGELOG.md` section.
2. Open a PR, let CI pass, merge it.
3. From the merged `main`: `npm run release`.

`tools/release.sh` publishes to npm, tags the commit, and cuts the GitHub
release from the changelog section — refusing to start if the tree is dirty,
the tag exists, the version is already on npm, or `dist/` is stale in the
commit. Tags are not covered by branch protection, so the script needs no
special access.

## Code of Conduct

Participating in this project means you agree to follow [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
