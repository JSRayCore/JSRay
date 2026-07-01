// Node built-in test runner · no external dependencies
// Run with: node --test tests/
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const JSRay = require('../dist/jsray.js');

test('JavaScript: keyword / fn-decl / param', () => {
  const out = JSRay.highlight('function foo(n) { return n; }', 'js');
  assert.match(out, /class="tk-keyword">function</);
  assert.match(out, /class="tk-fn-decl">foo</);
  assert.match(out, /class="tk-var-param">n</);
  assert.match(out, /class="tk-keyword">return</);
});

test('JavaScript: console is builtin var, log is builtin fn', () => {
  const out = JSRay.highlight('console.log(x);', 'js');
  assert.match(out, /class="tk-var-builtin">console</);
  assert.match(out, /class="tk-fn-builtin">log</);
});

test('JavaScript: regex literal recognized in context', () => {
  const out = JSRay.highlight('const p = /^[a-z]+$/i;', 'js');
  assert.match(out, /class="tk-regex">\/\^\[a-z\]\+\$\/i</);
});

test('JavaScript: ALL_CAPS is constant', () => {
  const out = JSRay.highlight('const MAX_ITEMS = 100;', 'js');
  assert.match(out, /class="tk-var-const">MAX_ITEMS</);
});

test('Python: def name + self', () => {
  const out = JSRay.highlight('def foo(self, n):\n    return self.x', 'py');
  assert.match(out, /class="tk-fn-decl">foo</);
  assert.match(out, /class="tk-var-builtin">self</);
  assert.match(out, /class="tk-var-param">n</);
});

test('Python: decorator', () => {
  const out = JSRay.highlight('@dataclass\nclass A: pass', 'py');
  assert.match(out, /class="tk-decorator">@dataclass</);
});

test('JSON: keys colored as type, values as string', () => {
  const out = JSRay.highlight('{"k":"v","n":1,"b":true}', 'json');
  assert.match(out, /class="tk-type">&quot;k&quot;</);
  assert.match(out, /class="tk-string">&quot;v&quot;</);
  assert.match(out, /class="tk-number">1</);
  assert.match(out, /class="tk-keyword">true</);
});

test('HTML: tag, attribute, string', () => {
  const out = JSRay.highlight('<a href="x">y</a>', 'html');
  assert.match(out, /class="tk-tag">a</);
  assert.match(out, /class="tk-attr">href/);
  assert.match(out, /class="tk-string">&quot;x&quot;</);
});

test('CSS: selector, property, unit', () => {
  const out = JSRay.highlight('.card { padding: 24px; }', 'css');
  assert.match(out, /class="tk-selector"/);
  assert.match(out, /class="tk-css-prop">padding</);
  // number + unit must be a single token "24px", not split
  assert.match(out, /class="tk-css-unit">24px</);
});

test('Shell: comment, keyword, builtin command, variable', () => {
  const out = JSRay.highlight('# hi\nif [ -d "$D" ]; then echo $D; fi', 'bash');
  assert.match(out, /class="tk-comment"># hi</);
  assert.match(out, /class="tk-keyword">if</);
  assert.match(out, /class="tk-fn-builtin">echo</);
  assert.match(out, /class="tk-var-builtin">\$D</);
});

test('Markdown: heading and bold', () => {
  const out = JSRay.highlight('# title\n**bold**', 'md');
  assert.match(out, /class="tk-md-heading"># title</);
  assert.match(out, /class="tk-md-bold">\*\*bold\*\*</);
});

test('PHP: variable and function declaration', () => {
  const out = JSRay.highlight('<?php function glow($code) { echo $code; }', 'php');
  assert.match(out, /class="tk-decorator">&lt;\?php</);
  assert.match(out, /class="tk-fn-decl">glow</);
  assert.match(out, /class="tk-var">\$code</);
});

test('Go: package and function', () => {
  const out = JSRay.highlight('package main\nfunc main() { fmt.Println("hi") }', 'go');
  assert.match(out, /class="tk-keyword">package</);
  assert.match(out, /class="tk-fn-decl">main</);
  assert.match(out, /class="tk-property">Println</);
});

test('Swift / Kotlin / Dart / Lua: modern language coverage', () => {
  const swift = JSRay.highlight('import Foundation\nfunc greet(name: String) { print(name) }', 'swift');
  assert.match(swift, /class="tk-keyword">func</);
  assert.match(swift, /class="tk-fn-decl">greet</);

  const kotlin = JSRay.highlight('fun main() { println("hi") }', 'kt');
  assert.match(kotlin, /class="tk-keyword">fun</);
  assert.match(kotlin, /class="tk-fn-decl">main</);

  const dart = JSRay.highlight('void main() { print("hi"); }', 'dart');
  assert.match(dart, /class="tk-keyword">void</);
  assert.match(dart, /class="tk-fn-decl">main</);

  const lua = JSRay.highlight('function greet(name)\n  print(name)\nend', 'lua');
  assert.match(lua, /class="tk-keyword">function</);
  assert.match(lua, /class="tk-fn-decl">greet</);
});

test('Java / C-like: class and builtin call', () => {
  const out = JSRay.highlight('public class App { void run() { System.out.println("hi"); } }', 'java');
  assert.match(out, /class="tk-keyword">public</);
  assert.match(out, /class="tk-type">App</);
  assert.match(out, /class="tk-property">out</);
});

test('SQL: keywords and function', () => {
  const out = JSRay.highlight('SELECT count(*) FROM posts WHERE status = \'publish\';', 'sql');
  assert.match(out, /class="tk-keyword">SELECT</i);
  assert.match(out, /class="tk-fn-builtin">count</i);
  assert.match(out, /class="tk-string">'publish'<\/span>/);
});

test('YAML: keys and booleans', () => {
  const out = JSRay.highlight('name: jsray\nenabled: true', 'yaml');
  assert.match(out, /class="tk-type">name</);
  assert.match(out, /class="tk-type">enabled</);
  assert.match(out, /class="tk-keyword">true</);
});

test('detectLanguage: recognizes common snippets', () => {
  assert.equal(JSRay.detectLanguage('<?php echo $name;'), 'php');
  assert.equal(JSRay.detectLanguage('package main\nfunc main() { fmt.Println("hi") }'), 'go');
  assert.equal(JSRay.detectLanguage('import Foundation\nfunc greet(name: String) { print(name) }'), 'swift');
  assert.equal(JSRay.detectLanguage('fun main() { println("hi") }'), 'kotlin');
  assert.equal(JSRay.detectLanguage('import "dart:async";\nvoid main() { print("hi"); }'), 'dart');
  assert.equal(JSRay.detectLanguage('function greet(name)\n  print(name)\nend'), 'lua');
  assert.equal(JSRay.detectLanguage('SELECT * FROM posts WHERE id = 1;'), 'sql');
  assert.equal(JSRay.detectLanguage('name: jsray\nenabled: true'), 'yaml');
});

test('XSS: angle brackets in source are escaped', () => {
  const out = JSRay.highlight('<script>alert(1)</script>', 'js');
  // Critical security property: output must contain no unescaped <script> tag
  assert.doesNotMatch(out, /<script\b/i);
  assert.doesNotMatch(out, /<\/script>/i);
  // Source < > must be escaped
  assert.match(out, /&lt;/);
  assert.match(out, /&gt;/);
});

test('Unknown language: falls back to escaped text', () => {
  const out = JSRay.highlight('<x>', 'made-up-lang-xyz');
  assert.equal(out, '&lt;x&gt;');
});

test('Empty input: returns empty string', () => {
  assert.equal(JSRay.highlight('', 'js'), '');
});

test('languages export is populated', () => {
  assert.ok(JSRay.languages.js);
  assert.ok(JSRay.languages.python);
  assert.ok(JSRay.languages.json);
  assert.ok(JSRay.languages.php);
  assert.ok(JSRay.languages.go);
  assert.ok(JSRay.languages.swift);
  assert.ok(JSRay.languages.kotlin);
  assert.ok(JSRay.languages.dart);
  assert.ok(JSRay.languages.lua);
  assert.ok(JSRay.languages.sql);
  assert.ok(JSRay.languages.yaml);
});

test('tokenize: returns renderer-agnostic stream', () => {
  const stream = JSRay.tokenize('const x = 1;', 'js');
  assert.ok(Array.isArray(stream));
  // Stream entries are strings or { type, content } objects
  for (const piece of stream) {
    if (typeof piece !== 'string') {
      assert.ok(typeof piece.type === 'string');
      assert.ok('content' in piece);
    }
  }
  // const should be a keyword token
  const flat = JSON.stringify(stream);
  assert.match(flat, /"type":"tk-keyword".*?const/);
});

test('tokenize + render: equivalent to highlight', () => {
  const code = 'function foo(n) { return n; }';
  const direct = JSRay.highlight(code, 'js');
  const twoStep = JSRay.render(JSRay.tokenize(code, 'js'));
  assert.equal(direct, twoStep);
});

test('tokenize: unknown language returns raw stream', () => {
  const stream = JSRay.tokenize('hello', 'made-up-xyz');
  assert.deepEqual(stream, ['hello']);
});

test('normalizeLanguage: handles common aliases', () => {
  assert.equal(JSRay.normalizeLanguage('language-c++'), 'cpp');
  assert.equal(JSRay.normalizeLanguage('c#'), 'csharp');
  assert.equal(JSRay.normalizeLanguage('kt'), 'kotlin');
  assert.equal(JSRay.normalizeLanguage('yml'), 'yaml');
});

test('applyTheme: writes --jr-* vars onto the given root', () => {
  const fakeRoot = { style: { _bag: {}, setProperty(k, v) { this._bag[k] = v; } } };
  JSRay.applyTheme({
    background: '#000',
    foreground: '#fff',
    tokens: {
      'keyword':           { color: '#abc' },
      'function.declaration': { color: '#def' },
      'variable.parameter':{ color: '#123' },
    },
  }, fakeRoot);
  assert.equal(fakeRoot.style._bag['--jr-bg'],        '#000');
  assert.equal(fakeRoot.style._bag['--jr-fg'],        '#fff');
  assert.equal(fakeRoot.style._bag['--jr-keyword'],   '#abc');
  assert.equal(fakeRoot.style._bag['--jr-fn-decl'],   '#def');
  assert.equal(fakeRoot.style._bag['--jr-var-param'],'#123');
});
