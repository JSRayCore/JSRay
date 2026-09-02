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

const SAMPLE_CODE = `export function merge(left, right) {
  const out = [];
  return out.concat(left, right);
}`;

test('portable output depends on nothing outside itself', () => {
  const html = JSRay.renderPortable('const a = 1;', 'js', DARK);

  assert.doesNotMatch(html, /class=/, 'a class needs a stylesheet that will not be there');
  assert.doesNotMatch(html, /<style/, 'rich-text editors strip style blocks');
  assert.doesNotMatch(html, /<link/);
  assert.doesNotMatch(html, /var\(--/, 'a custom property needs a declaration somewhere else');
  assert.match(html, /^<pre data-jsray-portable style="/);
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

// JSRay's own auto-init scans for `pre > code`, and a portable block is exactly
// that shape. Left alone it re-renders the code in class form, which on a page
// with no jsray.css means the block loses every colour — the one failure this
// whole module exists to prevent. It bit the demo page first: the preview was
// quietly showing the class rendering, not the portable one.
test('the portable block marks itself so the auto-scan skips it', () => {
  const html = JSRay.renderPortable('const a = 1;', 'js', DARK);
  assert.match(html, /<pre data-jsray-portable /, 'without the marker highlightAll() overwrites it');
});

test('highlightAll leaves a portable block alone but still does its job', () => {
  const rendered = [];

  // A `code` element as highlightAll actually touches one. `inPortable` decides
  // what closest() reports, which is the only thing the guard consults.
  const codeEl = (inPortable) => ({
    className: '',
    textContent: 'const a = 1;',
    classList: { add() {} },
    dataset: {},
    closest: (sel) => (inPortable && sel === '[data-jsray-portable]' ? {} : null),
    set innerHTML(v) { rendered.push(v); },
  });

  const portable = codeEl(true);
  const ordinary = codeEl(false);
  JSRay.highlightAll({ querySelectorAll: () => [portable, ordinary] });

  assert.equal(rendered.length, 1, 'exactly one of the two blocks should be rewritten');
  assert.match(rendered[0], /class="tk-/, 'the ordinary block still gets the class rendering');
  assert.equal(portable.dataset.jsrayLang, undefined, 'the portable block was not touched');
});

// Inline styles beat everything a host writes at normal weight, but an author's
// !important beats inline — and `pre { white-space: pre-wrap !important }` is a
// real thing themes ship to stop code scrolling on phones. It reflows the block
// and destroys the alignment, so the container has to outrank it.
test('the container outranks a host stylesheet that uses !important', () => {
  const html = JSRay.renderPortable('const a = 1;', 'js', DARK);
  const shell = html.slice(0, html.indexOf('><code'));

  for (const prop of ['background', 'color', 'font', 'white-space', 'overflow-x']) {
    assert.match(
      shell,
      new RegExp(`${prop}:[^;"]*!important`),
      `${prop} loses to a host rule that marks it important`
    );
  }
});

test('token colours take the same weight only when asked', () => {
  const code = 'const a = 1;';
  const normal = JSRay.renderPortable(code, 'js', DARK);
  const hardened = JSRay.renderPortable(code, 'js', DARK, { important: true });

  const spanOf = (html) => html.slice(html.indexOf('<span'), html.indexOf('</span>'));
  assert.doesNotMatch(spanOf(normal), /!important/, 'the default should not pay for it per token');
  assert.match(spanOf(hardened), /color:[^;"]*!important/);

  // Worth knowing what the option costs before reaching for it.
  assert.ok(
    hardened.length > normal.length && hardened.length < normal.length * 1.5,
    `hardening every token changed the size by ${(hardened.length / normal.length).toFixed(2)}×`
  );
});

// ---------------------------------------------------------------------------
// Frames
//
// A block copied from the site should be able to look like one the plugin
// rendered, so the chrome is derived from the same palette rather than from a
// second set of colours that would drift away from it.
// ---------------------------------------------------------------------------

const FRAMES = ['header', 'macos', 'minimal'];

test('a frame wraps the block and keeps the marker on both parts', () => {
  for (const frame of FRAMES) {
    const html = JSRay.renderPortable('const a = 1;', 'js', DARK, { frame });
    assert.match(html, /^<div data-jsray-portable /, `${frame} should return a wrapper`);
    assert.match(html, /<pre data-jsray-portable /,
      `${frame} lost the marker on the pre, so highlightAll would rewrite the code`);
    assert.match(html, /<\/div>$/);
  }
});

test('no frame is still a bare pre', () => {
  for (const frame of [undefined, 'none', 'not-a-frame']) {
    const html = JSRay.renderPortable('const a = 1;', 'js', DARK, { frame });
    assert.match(html, /^<pre data-jsray-portable /,
      `frame:${frame} should fall back to the unframed block`);
  }
});

test('the header frame carries the plugin\'s own chrome colours', () => {
  // jsray-block.css derives the bar with
  // color-mix(in srgb, var(--jr-bg) 88%, var(--jr-fg) 12%). A pasted block has
  // no custom properties, so the same arithmetic has to happen at render time —
  // #1C1C1E and #E1E4E8 mix to #343436.
  const html = JSRay.renderPortable('const a = 1;', 'js', DARK, { frame: 'header' });
  assert.match(html, /background:#343436/,
    'the header background no longer matches what the plugin computes');
  assert.match(html, new RegExp(`border(?:-bottom)?:1px solid ${DARK.border}`));
});

test('frame chrome defends itself against the host stylesheet', () => {
  // A host that styles `div` at !important would otherwise flatten the bar,
  // and a frame that loses its background reads as broken rather than plain.
  for (const frame of FRAMES) {
    const html = JSRay.renderPortable('const a = 1;', 'js', DARK, { frame });
    const chrome = html.slice(0, html.indexOf('<pre'));
    assert.ok(
      (chrome.match(/!important/g) || []).length >= 6,
      `${frame} chrome is mostly at normal weight and a host rule will beat it`
    );
  }
});

test('the inner code element is defended too', () => {
  // `code { background: … !important }` is one of the most common rules a blog
  // theme ships. Unguarded it painted a band behind every line, and its colour
  // showed through on tokens the palette leaves unstyled.
  const html = JSRay.renderPortable('const a = 1;', 'js', DARK);
  const code = html.slice(html.indexOf('<code'), html.indexOf('>', html.indexOf('<code')));
  for (const prop of ['background', 'color', 'padding', 'font']) {
    assert.match(code, new RegExp(`${prop}:[^;"]*!important`),
      `the code element's ${prop} loses to a host rule that marks it important`);
  }
});

test('the frame labels the language, and a title is escaped', () => {
  const labelled = JSRay.renderPortable('const a = 1;', 'js', DARK, { frame: 'header' });
  assert.match(labelled, />JavaScript</, 'js should be labelled JavaScript, not JS');

  const jsx = JSRay.renderPortable('const a = 1;', 'jsx', DARK, { frame: 'header' });
  assert.match(jsx, />JSX</, 'jsx collapses to javascript for grammar, but the label should not');

  const hostile = JSRay.renderPortable('x', 'js', DARK, {
    frame: 'header',
    title: '<img src=x onerror=alert(1)>',
  });
  assert.doesNotMatch(hostile, /<img/, 'a title must not become a live tag');
  assert.match(hostile, /&lt;img/);
});

test('a frame costs less than doubling the block', () => {
  const plain = JSRay.renderPortable(SAMPLE_CODE, 'js', DARK).length;
  for (const frame of FRAMES) {
    const framed = JSRay.renderPortable(SAMPLE_CODE, 'js', DARK, { frame, title: 'merge.js' }).length;
    assert.ok(framed < plain * 2,
      `${frame} is ${(framed / plain).toFixed(1)}× the unframed block`);
  }
});
