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

// The 23-token contract. Every palette must define all of these.
const REQUIRED_TOKENS = [
  'keyword', 'function', 'function.declaration', 'function.builtin',
  'variable', 'variable.parameter', 'variable.builtin', 'variable.constant',
  'type', 'property', 'string', 'string.regex', 'number',
  'comment', 'comment.doc', 'decorator', 'operator', 'punctuation',
  'tag', 'attribute', 'selector', 'css.property', 'css.unit',
];

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
