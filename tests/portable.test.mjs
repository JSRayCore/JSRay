// Node built-in test runner · no external dependencies
// Run with: node --test tests/
//
// renderPortable exists for code that leaves this page — pasted into a CMS, a
// newsletter, somebody else's blog. Everything it must survive comes down to
// one rule: nothing outside the returned string may be required to make it
// look right. These assert that rule from several directions, because the
// failure is silent — a class-based block pasted elsewhere still *renders*,
// just in black and white, and nobody reports that as a bug.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const JSRay = require('../dist/jsray.js');
const PALETTE = require('../tokens.json');
const DARK = PALETTE.themes.dark;

test('portable output depends on nothing outside itself', () => {
  const html = JSRay.renderPortable('const a = 1;', 'js', DARK);

  assert.doesNotMatch(html, /class=/, 'a class needs a stylesheet that will not be there');
  assert.doesNotMatch(html, /<style/, 'rich-text editors strip style blocks');
  assert.doesNotMatch(html, /<link/);
  assert.doesNotMatch(html, /var\(--/, 'a custom property needs a declaration somewhere else');
  assert.match(html, /^<pre style="/);
  assert.match(html, /<\/pre>$/);
});

test('the container carries what the host would otherwise impose', () => {
  const html = JSRay.renderPortable('const a = 1;', 'js', DARK);

  // Without these the block arrives as coloured text in the host's body font,
  // on the host's background, reflowed by the host's white-space rule.
  assert.match(html, new RegExp(`background:${DARK.background}`));
  assert.match(html, new RegExp(`color:${DARK.foreground}`));
  assert.match(html, /white-space:pre/);
  assert.match(html, /font:[^"]*monospace/);
  assert.match(html, /overflow-x:auto/);
});

test('every coloured token carries its colour inline', () => {
  const html = JSRay.renderPortable('const a = 1;', 'js', DARK);

  assert.match(html, new RegExp(`color:${DARK.tokens.keyword.color}`), 'keyword colour missing');
  assert.match(html, new RegExp(`color:${DARK.tokens.number.color}`), 'number colour missing');

  // fontStyle travels too — a palette that asks for bold keywords gets them.
  if ((DARK.tokens.keyword.fontStyle || '').includes('bold')) {
    assert.match(html, /font-weight:700/);
  }
});

test('a palette that predates a token key falls back to its base', () => {
  // Same chain every other renderer uses: function.declaration → function.
  // Without it, a palette written for an older Core loses colours here while
  // keeping them in the browser, which is the kind of difference nobody looks
  // for until a paste comes out wrong.
  const thin = {
    background: '#000',
    foreground: '#fff',
    tokens: { function: { color: '#00ff00' }, keyword: { color: '#ff00ff' } },
  };

  const html = JSRay.renderPortable('function foo() {}', 'js', thin);
  assert.match(html, /color:#00ff00">foo</, 'fn-decl should resolve through function');
  assert.match(html, /color:#ff00ff">function</);
});

test('an unstyled token is text, not an empty span', () => {
  // A span with no colour costs bytes and buys nothing, and this output is
  // twelve times its source already.
  const html = JSRay.renderPortable('a b c', 'text', DARK);
  assert.doesNotMatch(html, /<span style="">/);
  assert.doesNotMatch(html, /<span><\/span>/);
});

test('an unknown language degrades to plain text instead of throwing', () => {
  const html = JSRay.renderPortable('hello', 'klingon', DARK);
  assert.match(html, />hello</);
  assert.doesNotMatch(html, /<span/);
});

test('code is escaped, including code that is itself markup', () => {
  const html = JSRay.renderPortable('<script>alert(1)</script>', 'html', DARK);
  assert.doesNotMatch(html, /<script/, 'the payload must not become a live tag');
  assert.match(html, /&lt;/);
  assert.match(html, /&gt;/);
});

test('both bundled theme modes produce output, and they differ', () => {
  const dark = JSRay.renderPortable('const a = 1;', 'js', PALETTE.themes.dark);
  const light = JSRay.renderPortable('const a = 1;', 'js', PALETTE.themes.light);

  assert.notEqual(dark, light, 'the theme block is chosen at call time and must matter');
  assert.match(light, new RegExp(`background:${PALETTE.themes.light.background}`));
});

test('the size premium over the class form stays modest', () => {
  const code = 'export function merge(a, b) {\n  return [...a, ...b];\n}';
  const classed = JSRay.highlight(code, 'js').length;
  const portable = JSRay.renderPortable(code, 'js', DARK).length;

  // Inline styles cost more than class names — that is the trade. The number
  // is asserted so a change that doubles it has to be deliberate.
  assert.ok(
    portable < classed * 2,
    `portable output is ${(portable / classed).toFixed(1)}× the class form; ` +
      'something is repeating itself'
  );
});
