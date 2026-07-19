// DOM entry points (highlightElement / highlightAll) tested against minimal
// fake elements — same zero-dependency approach as the applyTheme fakeRoot.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const JSRay = require('../dist/jsray.js');

function fakeCode(text, className = '') {
  const el = {
    className,
    textContent: text,
    innerHTML: null,
    dataset: {},
    addedClasses: [],
  };
  el.classList = { add: (c) => el.addedClasses.push(c) };
  return el;
}

test('highlightElement: explicit language-js class is honored', () => {
  const el = fakeCode('const x = 42;', 'language-js');
  JSRay.highlightElement(el);
  assert.match(el.innerHTML, /class="tk-keyword">const</);
  assert.equal(el.dataset.cxLang, 'js');
  assert.deepEqual(el.addedClasses, []); // class already present, none added
});

test('highlightElement: lang- prefix and aliases normalize', () => {
  const el = fakeCode('puts "hi"', 'lang-rb');
  JSRay.highlightElement(el);
  assert.equal(el.dataset.cxLang, 'ruby');
  assert.match(el.innerHTML, /tk-fn-builtin">puts</);
});

test('highlightElement: no class → auto-detects and tags the element', () => {
  const el = fakeCode('def greet(name):\n    print(name)\n\nself.x = 1');
  JSRay.highlightElement(el);
  assert.equal(el.dataset.cxLang, 'python');
  assert.deepEqual(el.addedClasses, ['language-python']);
  assert.match(el.innerHTML, /class="tk-keyword">def</);
});

test('highlightElement: undetectable content is left untouched', () => {
  const el = fakeCode('hello world, nothing code-like here at all');
  JSRay.highlightElement(el);
  assert.equal(el.innerHTML, null);
  assert.equal(el.dataset.cxLang, undefined);
  assert.deepEqual(el.addedClasses, []);
});

test('highlightElement: XSS-bearing content stays escaped through the DOM path', () => {
  const el = fakeCode('const s = "<img src=x onerror=alert(1)>";', 'language-js');
  JSRay.highlightElement(el);
  assert.ok(!el.innerHTML.includes('<img'), 'raw tag must not survive');
  assert.match(el.innerHTML, /&lt;img/);
});

test('highlightAll: highlights every matched element in the scope', () => {
  const els = [
    fakeCode('const a = 1;', 'language-js'),
    fakeCode('SELECT * FROM t;', 'language-sql'),
    fakeCode('plain prose that stays untouched'),
  ];
  const scope = {
    querySelectorAll: (sel) => {
      assert.match(sel, /language-/); // sanity: selector targets code blocks
      return els;
    },
  };
  JSRay.highlightAll(scope);
  assert.match(els[0].innerHTML, /tk-keyword">const</);
  assert.match(els[1].innerHTML, /tk-keyword">SELECT</i);
  assert.equal(els[2].innerHTML, null); // undetectable → untouched
});
