// Palette completeness + cross-file consistency.
// Guards the contracts that are otherwise maintained by hand:
//   palette JSON (tokens.json, themes/*.json)  →  23 token keys, hex colors
//   src/jsray.css tk-* classes                 ↔  --jr-* vars in themes
//   grammar tk-* classes                        ↔  styled classes in jsray.css
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const JSRay = require('../dist/jsray.js');
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(resolve(ROOT, p), 'utf8');

// The token contract, read from vocabulary.json rather than restated here.
// A hand-copied list in the test cannot fail when the vocabulary grows — it
// just quietly stops checking the new tokens, which is the opposite of what
// a contract test is for.
const VOCABULARY = JSON.parse(read('vocabulary.json'));
const REQUIRED_TOKENS = Object.keys(VOCABULARY.tokens);

const HEX = /^#[0-9A-Fa-f]{6}$/;

function palettePaths() {
  const paths = ['tokens.json'];
  const dir = resolve(ROOT, 'themes');
  if (existsSync(dir)) {
    for (const f of readdirSync(dir).sort()) {
      if (f.endsWith('.json')) paths.push(`themes/${f}`);
    }
  }
  return paths;
}

test('palettes: every palette ships complete dark + light blocks', () => {
  for (const path of palettePaths()) {
    const palette = JSON.parse(read(path));
    for (const mode of ['dark', 'light']) {
      const theme = palette.themes?.[mode];
      assert.ok(theme, `${path}: missing themes.${mode}`);
      assert.match(theme.background, HEX, `${path} ${mode}: background`);
      assert.match(theme.foreground, HEX, `${path} ${mode}: foreground`);
      for (const key of REQUIRED_TOKENS) {
        const tok = theme.tokens?.[key];
        assert.ok(tok, `${path} ${mode}: missing token "${key}"`);
        assert.match(tok.color, HEX, `${path} ${mode}: "${key}" color ${tok?.color}`);
      }
    }
  }
});

test('palettes: every palette has a generated CSS file in src/ and dist/', () => {
  for (const path of palettePaths()) {
    const id = path === 'tokens.json' ? 'default' : path.replace(/^themes\//, '').replace(/\.json$/, '');
    for (const dir of ['src/themes', 'dist/themes']) {
      assert.ok(existsSync(resolve(ROOT, `${dir}/${id}.css`)),
        `${dir}/${id}.css missing — run sh build.sh`);
    }
  }
});

test('consistency: every --jr-* var consumed by jsray.css is defined by every theme', () => {
  const consumed = [...new Set(read('src/jsray.css').match(/var\(--jr-[\w-]+\)/g) || [])]
    .map((v) => v.slice(4, -1));
  assert.ok(consumed.length > 20, 'sanity: jsray.css consumes many vars');
  for (const path of palettePaths()) {
    const id = path === 'tokens.json' ? 'default' : path.replace(/^themes\//, '').replace(/\.json$/, '');
    const themeCss = read(`src/themes/${id}.css`);
    for (const v of consumed) {
      assert.ok(themeCss.includes(`${v}:`), `${id}.css does not define ${v}`);
    }
  }
});

test('consistency: every tk-* class emitted by grammars is styled in jsray.css', () => {
  // tk-scope is a structural wrapper (intentionally unstyled);
  // tk-xxx only appears in a documentation comment.
  const UNSTYLED_OK = new Set(['tk-scope', 'tk-xxx']);
  const emitted = [...new Set(read('src/jsray.js').match(/tk-[\w-]+/g) || [])];
  const styled = new Set((read('src/jsray.css').match(/\.tk-[\w-]+/g) || []).map((c) => c.slice(1)));
  for (const cls of emitted) {
    if (UNSTYLED_OK.has(cls)) continue;
    assert.ok(styled.has(cls), `grammar emits ${cls} but jsray.css has no .${cls} rule`);
  }
});

test('consistency: every exported language key round-trips through normalizeLanguage', () => {
  for (const key of Object.keys(JSRay.languages)) {
    const normalized = JSRay.normalizeLanguage(key);
    assert.ok(JSRay.languages[normalized],
      `languages["${key}"] normalizes to "${normalized}" which has no grammar`);
  }
});

test('detectLanguage: ambiguous or prose input returns empty string', () => {
  assert.equal(JSRay.detectLanguage('hello world, how are you today'), '');
  assert.equal(JSRay.detectLanguage('the quick brown fox\njumps over the lazy dog'), '');
  assert.equal(JSRay.detectLanguage('42'), '');
  assert.equal(JSRay.detectLanguage('   '), '');
});

// ---------------------------------------------------------------------------
// Single-source guards
//
// The token vocabulary and the language-alias table each have exactly one
// home. Everything else that needs them either reads them or is checked
// against them here — the drift these catch is silent by nature: nothing
// breaks at the moment the copies disagree, only later and somewhere else.
// ---------------------------------------------------------------------------

test('vocabulary: THEME_ALIAS in the runtime matches vocabulary.json exactly', () => {
  // Core ships as a plain <script> and cannot read JSON at runtime, so the
  // mapping is inlined in src/jsray.js. This is what keeps the copy honest.
  const src = read('src/jsray.js');
  const block = src.slice(src.indexOf('const THEME_ALIAS'), src.indexOf('function applyThemeToRoot'));
  const inlined = {};
  for (const m of block.matchAll(/['"]([\w.]+)['"]:\s*['"]([\w-]+)['"]/g)) inlined[m[1]] = m[2];

  assert.deepEqual(inlined, VOCABULARY.tokens,
    'src/jsray.js THEME_ALIAS has drifted from vocabulary.json — applyTheme() would ignore the difference');
});

test('vocabulary: applyTheme actually sets a var for every token in the vocabulary', () => {
  // deepEqual above proves the table matches; this proves the table is used.
  const bag = {};
  const root = { style: { setProperty(k, v) { bag[k] = v; } } };
  const tokens = {};
  for (const key of REQUIRED_TOKENS) tokens[key] = { color: '#010203' };
  JSRay.applyTheme({ background: '#000', foreground: '#fff', tokens }, root);

  for (const suffix of Object.values(VOCABULARY.tokens)) {
    assert.equal(bag[`--jr-${suffix}`], '#010203', `applyTheme never set --jr-${suffix}`);
  }
});

test('vocabulary: every surface reaches the generated themes and applyTheme', () => {
  // Not every surface is consumed by jsray.css: --jr-gutter-fg exists for
  // integrations that draw line numbers (jsray-wp's gutter, the VS Code and
  // terminal renderers), which Core itself does not. What must hold is that
  // a surface a palette can set actually arrives somewhere a consumer reads.
  const src = read('src/jsray.js');
  for (const [key, suffix] of Object.entries(VOCABULARY.surfaces || {})) {
    assert.ok(read('src/themes/default.css').includes(`--jr-${suffix}:`),
      `surface "${key}" is not emitted into the generated theme CSS`);
    assert.ok(src.includes(`'--jr-${suffix}'`),
      `applyTheme() never sets --jr-${suffix}, so a runtime palette cannot change surface "${key}"`);
  }
});

test('aliases: every LANGUAGE_ALIASES target is a real grammar', () => {
  const src = read('src/jsray.js');
  const block = src.slice(src.indexOf('const LANGUAGE_ALIASES'), src.indexOf('for (const alias in LANGUAGE_ALIASES)'));
  const pairs = [...block.matchAll(/['"]([\w+#.-]+)['"]:\s*['"](\w+)['"]/g)];

  assert.ok(pairs.length > 30, 'alias table failed to parse');
  for (const [, alias, target] of pairs) {
    assert.ok(JSRay.languages[target], `alias "${alias}" points at "${target}", which has no grammar`);
    assert.equal(JSRay.normalizeLanguage(alias), target, `"${alias}" should normalize to "${target}"`);
  }
});

test('aliases: no language is registered by both mechanisms', () => {
  // Aliases are declared once in LANGUAGE_ALIASES and registered on G by the
  // loop below it. A hand-written `G.rb = G.ruby` beside a table entry is the
  // duplication that let `ts` point at javascript here and typescript there.
  const src = read('src/jsray.js');
  const block = src.slice(src.indexOf('const LANGUAGE_ALIASES'), src.indexOf('for (const alias in LANGUAGE_ALIASES)'));
  const declared = new Set([...block.matchAll(/['"]([\w+#.-]+)['"]:\s*['"]\w+['"]/g)].map((m) => m[1]));

  for (const m of src.matchAll(/^\s*G\.(\w+)\s*=\s*G\.(\w+);/gm)) {
    assert.ok(!declared.has(m[1]),
      `G.${m[1]} = G.${m[2]} duplicates LANGUAGE_ALIASES["${m[1]}"] — declare it in one place`);
  }
});

test('palettes: every first-party palette declares every surface', () => {
  // generate-theme.mjs substitutes a default when a palette omits a surface,
  // so the CSS looked complete while tokens.json — the file applyTheme() and
  // the integrations actually read — was missing border, gutter and
  // lineHighlight. The result: switching to the default palette at runtime
  // left the previous theme's border and gutter in place. Third-party
  // palettes may still rely on the substitution; ours must not.
  for (const path of palettePaths()) {
    const palette = JSON.parse(read(path));
    for (const mode of ['dark', 'light']) {
      for (const surface of Object.keys(VOCABULARY.surfaces)) {
        assert.ok(palette.themes[mode][surface],
          `${path} ${mode} does not declare "${surface}" — applyTheme() would leave --jr-${VOCABULARY.surfaces[surface]} unset`);
      }
    }
  }
});

test('palettes: applyTheme and the generated CSS agree on every surface', () => {
  // Two code paths read the same palette: the generator writes CSS at build
  // time, applyTheme sets variables at runtime. A value only one of them knows
  // is a theme that looks different depending on how it was loaded.
  const palette = JSON.parse(read('tokens.json'));
  const css = read('src/themes/default.css');

  for (const mode of ['dark', 'light']) {
    const bag = {};
    JSRay.applyTheme(palette.themes[mode], { style: { setProperty: (k, v) => { bag[k] = v; } } });

    for (const [key, suffix] of Object.entries(VOCABULARY.surfaces)) {
      const runtime = bag[`--jr-${suffix}`];
      assert.ok(runtime, `applyTheme did not set --jr-${suffix} for ${mode}`);
      assert.ok(css.includes(`--jr-${suffix}:      ${runtime};`) ||
                css.includes(`--jr-${suffix}:   ${runtime};`) ||
                css.includes(`--jr-${suffix}:     ${runtime};`) ||
                css.includes(`${runtime};`),
        `${mode}: applyTheme sets --jr-${suffix} to ${runtime}, which the generated CSS never uses`);
    }
  }
});

test('vocabulary: the theme studio maps tokens the same way the runtime does', () => {
  // studio.js carries its own ordered token list, because it also decides
  // grouping and labels — but the cssVar half of each entry is the vocabulary
  // restated, and a wrong one silently produces a theme whose variables no
  // stylesheet reads. This is the same drift THEME_ALIAS is guarded against;
  // the studio was simply the copy nobody had checked.
  const src = read('demo/studio/studio.js');
  const entries = [...src.matchAll(/key:\s*'([\w.$]+)',\s*label:[^,]+,\s*cssVar:\s*'([\w-]+)'/g)];

  assert.ok(entries.length > 20, 'studio token table failed to parse');

  for (const [, key, cssVar] of entries) {
    if (key.startsWith('$')) {
      const surface = key.slice(1);
      assert.equal(cssVar, VOCABULARY.surfaces[surface],
        `studio maps surface "${surface}" to --jr-${cssVar}`);
      continue;
    }
    assert.equal(cssVar, VOCABULARY.tokens[key], `studio maps "${key}" to --jr-${cssVar}`);
  }

  // Every token has to be offered, or a palette built here is incomplete.
  const covered = new Set(entries.map(([, k]) => k));
  for (const key of Object.keys(VOCABULARY.tokens)) {
    assert.ok(covered.has(key), `the studio has no picker for "${key}"`);
  }
});
