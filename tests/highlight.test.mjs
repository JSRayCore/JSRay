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

test('Scala: def declaration and case class', () => {
  const out = JSRay.highlight('case class User(name: String)\ndef greet(u: User): String = "hi"', 'scala');
  assert.match(out, /class="tk-keyword">def</);
  assert.match(out, /class="tk-fn-decl">greet</);
  assert.match(out, /class="tk-type">User</);
});

test('Objective-C: directives and NSLog', () => {
  const out = JSRay.highlight('#import <Foundation/Foundation.h>\n@interface Foo : NSObject\n@end\nNSLog(@"hi %d", 42);', 'objc');
  assert.match(out, /class="tk-decorator">@interface</);
  assert.match(out, /class="tk-fn-builtin">NSLog</);
});

test('R: assignment function declaration and pipes', () => {
  const out = JSRay.highlight('square <- function(x) { x^2 }\nprint(square(4))', 'r');
  assert.match(out, /class="tk-fn-decl">square</);
  assert.match(out, /class="tk-keyword">function</);
  assert.match(out, /class="tk-fn-builtin">print</);
});

test('Perl: sub declaration, sigil variables, regex bind', () => {
  const out = JSRay.highlight('my $name = "x";\nsub greet { print $name if $name =~ /x/; }', 'perl');
  assert.match(out, /class="tk-fn-decl">greet</);
  assert.match(out, /class="tk-keyword">my</);
  assert.match(out, /class="tk-var">\$name</);
  assert.match(out, /class="tk-regex">/);
});

test('PowerShell: function, cmdlet, automatic variable', () => {
  const out = JSRay.highlight('function Get-Greeting { Write-Host $PSItem }', 'ps1');
  assert.match(out, /class="tk-fn-decl">Get-Greeting</);
  assert.match(out, /class="tk-fn-builtin">Write-Host</);
  assert.match(out, /class="tk-var-builtin">\$PSItem</);
});

test('Elixir: defmodule, def, atoms, pipe', () => {
  const out = JSRay.highlight('defmodule Greeter do\n  def hello(name), do: IO.puts(name)\nend', 'elixir');
  assert.match(out, /class="tk-keyword">defmodule</);
  assert.match(out, /class="tk-fn-decl">hello</);
  assert.match(out, /class="tk-type">Greeter</);
});

test('Haskell: type signature name, types, builtin', () => {
  const out = JSRay.highlight('module Main where\nmain :: IO ()\nmain = putStrLn "hi"', 'haskell');
  assert.match(out, /class="tk-fn-decl">main</);
  assert.match(out, /class="tk-type">IO</);
  assert.match(out, /class="tk-fn-builtin">putStrLn</);
});

test('GraphQL: keywords, variables, types, fields', () => {
  const out = JSRay.highlight('query GetUser($id: ID!) { user(id: $id) { name } }', 'graphql');
  assert.match(out, /class="tk-keyword">query</);
  assert.match(out, /class="tk-var-param">\$id</);
  assert.match(out, /class="tk-type">ID</);
  assert.match(out, /class="tk-property">user</);
});

test('TOML / INI: sections, keys, values', () => {
  const toml = JSRay.highlight('[package]\nname = "jsray"\nversion = "0.1.0"', 'toml');
  assert.match(toml, /class="tk-tag">\[package\]</);
  assert.match(toml, /class="tk-type">name</);

  const ini = JSRay.highlight('; config\n[server]\nport = 8080', 'ini');
  assert.match(ini, /class="tk-comment">; config</);
  assert.match(ini, /class="tk-tag">\[server\]</);
  assert.match(ini, /class="tk-number">8080</);
});

test('Dockerfile: instructions and variables', () => {
  const out = JSRay.highlight('FROM node:18 AS build\nRUN npm ci\nENV PORT=$PORT', 'dockerfile');
  assert.match(out, /class="tk-keyword">FROM</);
  assert.match(out, /class="tk-keyword">RUN</);
  assert.match(out, /class="tk-var-builtin">\$PORT</);
});

test('Makefile: targets, variables, directives', () => {
  const out = JSRay.highlight('.PHONY: all\nall: build\n\t$(CC) -o app main.c', 'makefile');
  assert.match(out, /class="tk-decorator">\.PHONY</);
  assert.match(out, /class="tk-fn-decl">all</);
  assert.match(out, /class="tk-var-builtin">\$\(CC\)</);
});

test('Diff: hunks, additions, deletions', () => {
  const out = JSRay.highlight('diff --git a/f.js b/f.js\n@@ -1,2 +1,2 @@\n-old line\n+new line', 'diff');
  assert.match(out, /class="tk-keyword">@@[^<]*@@</);
  assert.match(out, /class="tk-function">\+new line</);
  assert.match(out, /class="tk-property">-old line</);
});

test('detectLanguage: recognizes new language snippets', () => {
  assert.equal(JSRay.detectLanguage('defmodule Greeter do\n  def hello(n), do: IO.puts(n)\nend'), 'elixir');
  assert.equal(JSRay.detectLanguage('import scala.collection.mutable\ncase class User(name: String)'), 'scala');
  assert.equal(JSRay.detectLanguage('#import <Foundation/Foundation.h>\n@interface Foo : NSObject\n@end'), 'objectivec');
  assert.equal(JSRay.detectLanguage('library(dplyr)\nsquare <- function(x) x^2'), 'r');
  assert.equal(JSRay.detectLanguage('use strict;\nmy $x = 1;\nsub go { print $x; }'), 'perl');
  assert.equal(JSRay.detectLanguage('param([string]$Name)\nWrite-Host $Name -eq "x"'), 'powershell');
  assert.equal(JSRay.detectLanguage('module Main where\nmain :: IO ()\nmain = putStrLn "hi"'), 'haskell');
  assert.equal(JSRay.detectLanguage('fragment UserFields on User { name }'), 'graphql');
  assert.equal(JSRay.detectLanguage('[[bin]]\nname = "app"\npath = "src/main.rs"'), 'toml');
  assert.equal(JSRay.detectLanguage('FROM node:18\nRUN npm ci\nCMD ["node", "index.js"]'), 'dockerfile');
  assert.equal(JSRay.detectLanguage('.PHONY: all\nall: build\n\tnpm run build'), 'makefile');
  assert.equal(JSRay.detectLanguage('diff --git a/f b/f\n@@ -1,1 +1,1 @@\n-a\n+b'), 'diff');
});

test('detectLanguage: shebang lines resolve the interpreter', () => {
  assert.equal(JSRay.detectLanguage('#!/usr/bin/env python3\nx = 1'), 'python');
  assert.equal(JSRay.detectLanguage('#!/usr/bin/perl\nprint 1;'), 'perl');
  assert.equal(JSRay.detectLanguage('#!/usr/bin/env node\nconsole.log(1)'), 'javascript');
  assert.equal(JSRay.detectLanguage('#!/usr/bin/env ruby\nputs 1'), 'ruby');
  assert.equal(JSRay.detectLanguage('#!/bin/bash\necho hi'), 'shell');
});

test('normalizeLanguage: new language aliases', () => {
  assert.equal(JSRay.normalizeLanguage('objc'), 'objectivec');
  assert.equal(JSRay.normalizeLanguage('objective-c'), 'objectivec');
  assert.equal(JSRay.normalizeLanguage('pl'), 'perl');
  assert.equal(JSRay.normalizeLanguage('ps1'), 'powershell');
  assert.equal(JSRay.normalizeLanguage('hs'), 'haskell');
  assert.equal(JSRay.normalizeLanguage('gql'), 'graphql');
  assert.equal(JSRay.normalizeLanguage('language-docker'), 'dockerfile');
  assert.equal(JSRay.normalizeLanguage('make'), 'makefile');
  assert.equal(JSRay.normalizeLanguage('patch'), 'diff');
  assert.equal(JSRay.normalizeLanguage('properties'), 'ini');
});

test('Ruby: # inside a double-quoted string is not a comment', () => {
  const tokens = JSRay.tokenize('"hi #{name} bye"', 'ruby');
  assert.equal(tokens.length, 1);
  assert.equal(tokens[0].type, 'tk-string');
  // interpolation is highlighted inside the string token
  assert.ok(tokens[0].content.some(
    (t) => typeof t !== 'string' && t.type === 'tk-operator' && t.content === '#{name}'
  ));
});

test('Ruby: string with # coexists with a real trailing comment', () => {
  const out = JSRay.highlight('msg = "issue #42" # note', 'ruby');
  assert.match(out, /class="tk-string">&quot;issue #42&quot;</);
  assert.match(out, /class="tk-comment"># note</);
});

test('Shell: # inside a double-quoted string is not a comment', () => {
  const out = JSRay.highlight('git commit -m "fix #42" # done', 'bash');
  assert.match(out, /class="tk-string">/);
  assert.match(out, /fix #42/);
  assert.match(out, /class="tk-comment"># done</);
  assert.doesNotMatch(out, /class="tk-comment">#42/);
});

test('Elixir: #{} interpolation stays inside the string', () => {
  const out = JSRay.highlight('IO.puts("hi #{name} bye") # note', 'elixir');
  assert.match(out, /class="tk-string">&quot;hi <span class="tk-operator">#\{name\}<\/span> bye&quot;</);
  assert.match(out, /class="tk-comment"># note</);
});

test('Perl: # inside a double-quoted string is not a comment', () => {
  const out = JSRay.highlight('my $tag = "issue #42"; # note', 'perl');
  assert.match(out, /class="tk-string">&quot;issue #42&quot;</);
  assert.match(out, /class="tk-comment"># note</);
});

test('R: # inside a string is not a comment', () => {
  const out = JSRay.highlight('col <- "#ff0000" # red', 'r');
  assert.match(out, /class="tk-string">&quot;#ff0000&quot;</);
  assert.match(out, /class="tk-comment"># red</);
});

test('YAML: # inside a quoted scalar is not a comment', () => {
  const out = JSRay.highlight('color: "#fff" # note', 'yaml');
  assert.match(out, /class="tk-string">&quot;#fff&quot;</);
  assert.match(out, /class="tk-comment"># note</);
});

test('TOML: # inside a string is not a comment', () => {
  const out = JSRay.highlight('path = "a#b" # note', 'toml');
  assert.match(out, /class="tk-string">&quot;a#b&quot;</);
  assert.match(out, /class="tk-comment"># note</);
});

test('line-comment markers inside strings never become comments (all families)', () => {
  const cases = [
    ['js', 'const s = "https://jsray.org";'],
    ['python', 's = "not # a comment"'],
    ['php', '$s = "not # or // comment";'],
    ['c', 'char *s = "https://x";'],
    ['rust', 'let s = "https://x";'],
    ['java', 'String s = "https://x";'],
    ['go', 's := "https://x"'],
    ['swift', 'let s = "https://x"'],
    ['kotlin', 'val s = "https://x"'],
    ['scala', 'val s = "https://x"'],
    ['objectivec', 'NSString *s = @"https://x";'],
    ['lua', 's = "not -- a comment"'],
    ['sql', "SELECT 'not -- a comment' FROM t;"],
    ['haskell', 's = "not -- a comment"'],
    ['powershell', '$s = "not # a comment"'],
    ['graphql', '{ f(arg: "not # x") }'],
    ['dockerfile', 'ENV MSG="not # a comment"'],
  ];
  for (const [lang, code] of cases) {
    const out = JSRay.highlight(code, lang);
    assert.ok(!out.includes('tk-comment') && !out.includes('tk-doc'),
      `${lang}: comment leaked in ${code} → ${out}`);
  }
});

test('real comments still work after strings on the same line', () => {
  assert.match(JSRay.highlight('const u = "https://x"; // real', 'js'), /tk-comment">\/\/ real</);
  assert.match(JSRay.highlight('s = "a#b"  # real', 'python'), /tk-comment"># real</);
  assert.match(JSRay.highlight("SELECT 'a--b'; -- real", 'sql'), /tk-comment">-- real</);
});

test('block comments containing quotes stay whole comments', () => {
  const out = JSRay.highlight('/* say "AS IS" */ int x;', 'c');
  assert.match(out, /tk-comment">\/\* say &quot;AS IS&quot; \*\/</);
  const hs = JSRay.highlight('{- "quoted" -} main = 1', 'haskell');
  assert.match(hs, /tk-comment">\{- &quot;quoted&quot; -\}</);
});

test('JSRay.version matches version.json', () => {
  const { readFileSync } = require('node:fs');
  const release = JSON.parse(readFileSync(new URL('../version.json', import.meta.url), 'utf8'));
  assert.equal(JSRay.version, release.version);
});

test('applyTheme: refined keys fall back to their base family', () => {
  const fakeRoot = { style: { _bag: {}, setProperty(k, v) { this._bag[k] = v; } } };
  // Palette defines only the base "function" — the refined keys must inherit it.
  JSRay.applyTheme({
    background: '#000', foreground: '#fff',
    tokens: { 'function': { color: '#123456' } },
  }, fakeRoot);
  assert.equal(fakeRoot.style._bag['--jr-function'],   '#123456');
  assert.equal(fakeRoot.style._bag['--jr-fn-decl'],    '#123456', 'function.declaration falls back');
  assert.equal(fakeRoot.style._bag['--jr-fn-builtin'], '#123456', 'function.builtin falls back');
  assert.equal(fakeRoot.style._bag['--jr-keyword'], undefined, 'unrelated families stay unset');
});
