// Contracts that hold for every language and every consumer, rather than for
// one grammar at a time.
//
// The per-language tests in highlight.test.mjs check that the right things get
// the right colors. These check the promises underneath that: highlighting
// never alters the source, never takes superlinear time, and what ships on npm
// matches what the docs and types say ships.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const JSRay = require('../dist/jsray.js');
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(resolve(ROOT, p), 'utf8');

/** Every registered identifier, including aliases. */
const ALL_LANGUAGES = Object.keys(JSRay.languages);

/** Undo exactly what escapeHtml does, so a round trip is comparable. */
const unescapeHtml = (s) => s
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"')
  .replace(/&amp;/g, '&');

// ---------------------------------------------------------------------------
// Losslessness
//
// A highlighter that drops or reorders a character is worse than no
// highlighter: the reader copies the block and gets code that no longer runs.
// Rule ordering, lookbehind offsets, and nested `inside` grammars all move
// text around, and any one of them can lose a character on input the rule
// author did not picture. So this runs every sample through every grammar,
// including combinations that are nonsense — nonsense still must not be eaten.
// ---------------------------------------------------------------------------
const SAMPLES = [
  'const x = 42;',
  'a < b && c > d',
  '"quoted \\" inside"',
  '`tpl ${a} tail`',
  '# comment with <tag> & ampersand',
  '/* block */ // line',
  'f(x, y) { return x / y; }',
  '--custom-prop: var(--other);',
  'key: |\n  block # text',
  '<a href="/x?a=1&b=2">t</a>',
  "SELECT 'it''s' FROM t",
  '@@ -1,2 +1,3 @@\n-old\n+new',
  '\t\n  mixed   whitespace \t',
  'emoji 🎨 and ünïcödé',
  '',
];

test('losslessness: highlight never changes the source text, in any language', () => {
  const failures = [];
  for (const lang of ALL_LANGUAGES) {
    for (const sample of SAMPLES) {
      const restored = unescapeHtml(JSRay.highlight(sample, lang).replace(/<\/?span[^>]*>/g, ''));
      if (restored !== sample) {
        failures.push(`${lang}: ${JSON.stringify(sample)} → ${JSON.stringify(restored)}`);
      }
    }
  }
  assert.deepEqual(failures, [], `highlighting altered the source in ${failures.length} case(s)`);
});

test('losslessness: tokenize preserves the source text, in any language', () => {
  // render() is one consumer of the stream; integrations write their own. If
  // the stream itself is lossy, every renderer inherits the loss.
  const flatten = (node) => {
    if (typeof node === 'string') return node;
    if (Array.isArray(node)) return node.map(flatten).join('');
    return flatten(node.content);
  };
  for (const lang of ALL_LANGUAGES) {
    for (const sample of SAMPLES) {
      assert.equal(flatten(JSRay.tokenize(sample, lang)), sample,
        `tokenize(${JSON.stringify(sample)}, "${lang}") lost text`);
    }
  }
});

test('losslessness: highlight output escapes every character that could break out', () => {
  const hostile = '<script>alert("x")</script> & <img src=x onerror=y>';
  for (const lang of ALL_LANGUAGES) {
    const out = JSRay.highlight(hostile, lang);
    const withoutTokens = out.replace(/<\/?span[^>]*>/g, '');
    assert.doesNotMatch(withoutTokens, /<[a-zA-Z/]/,
      `"${lang}" let a raw tag through — output is injected into innerHTML`);
  }
});

// ---------------------------------------------------------------------------
// Time
//
// Unterminated constructs are ordinary content: a snippet cut off mid-line, a
// tutorial showing half a function. Four grammars once answered them with
// exponential backtracking — 26 `$a` in an unclosed shell string took 115
// seconds, which in a browser is a frozen tab. This sweeps the same shapes
// across every grammar so a new one cannot reintroduce it unnoticed.
// ---------------------------------------------------------------------------
const BUDGET_MS = 2000;
const REPEATS = 400;

const PATHOLOGICAL = [
  ['unterminated double quote',  '"' + 'a$b#{c}${d}'.repeat(REPEATS)],
  ['unterminated single quote',  "'" + "a$b\\c".repeat(REPEATS)],
  ['unterminated backtick',      '`' + '${a}'.repeat(REPEATS)],
  ['unterminated block comment', '/*' + 'a*b/'.repeat(REPEATS)],
  ['unterminated triple quote',  '"""' + 'x'.repeat(REPEATS * 4)],
  ['unbalanced parens',          '('.repeat(REPEATS)],
  ['unbalanced braces',          '{'.repeat(REPEATS)],
  ['dense attributes',           '<div ' + 'a=1 '.repeat(REPEATS) + '>'],
  ['dense operators',            '='.repeat(REPEATS)],
  ['one long line',              'x'.repeat(REPEATS * 20)],
];

for (const [label, input] of PATHOLOGICAL) {
  test(`time: "${label}" stays linear in every language`, () => {
    const slow = [];
    for (const lang of ALL_LANGUAGES) {
      const started = Date.now();
      JSRay.highlight(input, lang);
      const elapsed = Date.now() - started;
      if (elapsed > BUDGET_MS) slow.push(`${lang}: ${elapsed}ms`);
    }
    assert.deepEqual(slow, [], `${input.length} chars took too long — likely catastrophic backtracking`);
  });
}

test('time: highlighting a real source file is fast enough for a page load', () => {
  // Core's own dist is the largest realistic block a docs page would show.
  const started = Date.now();
  JSRay.highlight(read('dist/jsray.js'), 'javascript');
  const elapsed = Date.now() - started;
  assert.ok(elapsed < 2000, `${elapsed}ms to highlight dist/jsray.js`);
});

// ---------------------------------------------------------------------------
// Coverage
// ---------------------------------------------------------------------------

test('coverage: every registered language actually tokenizes something', () => {
  // A grammar that never emits a token is a registration with no working rules
  // behind it: the language looks supported and renders bare. One shared
  // sample cannot prove the opposite — HTML has nothing to say about
  // `fn(a, b)` and diff has nothing to say about anything that is not a
  // patch — so a grammar passes by tokenizing any sample in the set.
  const inert = ALL_LANGUAGES.filter(
    (lang) => !SAMPLES.some((s) => /class="tk-/.test(JSRay.highlight(s, lang)))
  );
  assert.deepEqual(inert, [], 'these languages produced no tokens for any sample');
});

test('coverage: every grammar rule has a class the stylesheet knows', () => {
  const styled = new Set((read('src/jsray.css').match(/\.tk-[\w-]+/g) || []).map((c) => c.slice(1)));
  const structural = new Set(['tk-scope']); // intentionally unstyled wrapper
  const seen = new Set();

  const walk = (rules) => {
    for (const rule of rules) {
      seen.add(rule.cls);
      if (rule.inside) walk(rule.inside);
    }
  };
  for (const lang of ALL_LANGUAGES) walk(JSRay.languages[lang]);

  for (const cls of seen) {
    if (structural.has(cls)) continue;
    assert.ok(styled.has(cls), `a grammar rule emits ${cls}, which jsray.css does not style`);
  }
});

// ---------------------------------------------------------------------------
// What ships
//
// The published package is a different artifact from the repository. These
// check the seams where the two are kept in agreement by hand.
// ---------------------------------------------------------------------------

test('ship: dist/ is in sync with src/', () => {
  for (const f of ['jsray.js', 'jsray.css', 'themes/default.css', 'themes/aurora.css',
                   'themes/ember.css', 'themes/fjord.css']) {
    assert.equal(read(`dist/${f}`), read(`src/${f}`), `dist/${f} differs from src/${f} — run sh build.sh`);
  }
});

test('ship: integrity.json matches the dist it fingerprints', () => {
  // This manifest is how every integration decides whether the Core snapshot
  // it bundles is the official build. A stale one either clears a tampered
  // file or condemns a genuine one.
  execFileSync(process.execPath, ['tools/integrity.mjs', '--check'], { cwd: ROOT });
});

test('ship: the npm package contains everything the docs point at', () => {
  const pkg = JSON.parse(read('package.json'));
  const packed = new Set(
    JSON.parse(execFileSync('npm', ['pack', '--dry-run', '--json'], { cwd: ROOT, encoding: 'utf8' }))[0]
      .files.map((f) => f.path)
  );

  for (const required of [
    pkg.main,                 // require('@jsray/core')
    pkg.types,                // TypeScript users, no @types package
    pkg.style,
    'dist/themes/default.css', // every Quick Start snippet links this
    'tokens.json',
    'vocabulary.json',         // integrations validate custom palettes against it
    'integrity.json',          // integrations verify their Core snapshot against it
    'LICENSE',
  ]) {
    assert.ok(packed.has(required), `package.json "files" omits ${required}`);
  }
});

test('ship: type declarations cover every runtime export', () => {
  // The .d.ts is hand-written; nothing else notices when an export is added.
  const dts = read('types/jsray.d.ts');
  for (const name of Object.keys(JSRay)) {
    assert.match(dts, new RegExp(`\\b(?:function|const)\\s+${name}\\b`),
      `types/jsray.d.ts does not declare JSRay.${name}`);
  }
});

test('ship: the README documents every public API method', () => {
  // Four methods — tokenize, render, applyTheme, normalizeLanguage — shipped
  // undocumented through beta.2, and tokenize/render are exactly the entry
  // points a non-HTML renderer needs.
  const readme = read('README.md') + read('README.zh-CN.md');
  for (const [name, value] of Object.entries(JSRay)) {
    if (typeof value !== 'function') continue;
    assert.ok(readme.includes(`JSRay.${name}`), `README does not mention JSRay.${name}`);
  }
});

test('ship: the d.ts example version matches the real one', () => {
  const dts = read('types/jsray.d.ts');
  const quoted = dts.match(/"(\d+\.\d+\.\d+[\w.-]*)"/);
  assert.ok(quoted, 'no example version found in types/jsray.d.ts');
  assert.equal(quoted[1], JSRay.version,
    'the version shown in types/jsray.d.ts is stale');
});

test('ship: every exports subpath resolves to a file that is actually packed', () => {
  // An exports map is a promise about what an installed package exposes. A
  // path that is mapped but not packed fails only after publish.
  const pkg = JSON.parse(read('package.json'));
  const packed = new Set(
    JSON.parse(execFileSync('npm', ['pack', '--dry-run', '--json'], { cwd: ROOT, encoding: 'utf8' }))[0]
      .files.map((f) => f.path)
  );

  const targets = [];
  const collect = (node) => {
    if (typeof node === 'string') targets.push(node);
    else if (node && typeof node === 'object') Object.values(node).forEach(collect);
  };
  collect(pkg.exports);

  for (const target of targets) {
    const clean = target.replace(/^\.\//, '');
    if (clean.includes('*')) {
      const prefix = clean.split('*')[0];
      assert.ok([...packed].some((f) => f.startsWith(prefix)),
        `exports maps "${target}" but nothing under ${prefix} is packed`);
      continue;
    }
    assert.ok(packed.has(clean), `exports maps "${target}" but it is not in the published files`);
  }
});

test('docs: every relative link points at a file that exists', () => {
  const { existsSync } = require('node:fs');
  const docs = ['README.md', 'README.zh-CN.md', 'CONTRIBUTING.md', 'docs/tokens.md',
                'docs/tokens.zh-CN.md', 'docs/languages.md', 'docs/versioning.md', 'docs/projects.md'];
  const broken = [];

  for (const doc of docs) {
    if (!existsSync(resolve(ROOT, doc))) continue;
    const base = dirname(resolve(ROOT, doc));
    // Code samples are not links: docs/tokens.md documents `tk-md-link` with a
    // literal `[text](url)` inside backticks, which is prose about a link, not
    // one to follow. Strip fenced blocks and inline code before scanning.
    const prose = read(doc).replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '');
    for (const m of prose.matchAll(/\]\((?!https?:|#|mailto:)([^)#]+)/g)) {
      if (!existsSync(resolve(base, m[1]))) broken.push(`${doc} → ${m[1]}`);
    }
  }
  assert.deepEqual(broken, [], 'documentation links to files that do not exist');
});

test('docs: the palette is not described as living in jsray.css', () => {
  // jsray.css binds .tk-* to var(--jr-*) and defines none of them; the values
  // live in the theme stylesheets. tokens.md used to tell readers to copy
  // ":root blocks at the top of src/jsray.css", where there are none — an
  // instruction that fails for anyone who follows it.
  assert.equal((read('src/jsray.css').match(/--jr-[\w-]+:/g) || []).length, 0,
    'jsray.css now defines palette values — the docs describe the opposite split');

  for (const doc of ['docs/tokens.md', 'docs/tokens.zh-CN.md']) {
    const text = read(doc);
    assert.doesNotMatch(text, /:root[\s\S]{0,80}(?:blocks|块)[\s\S]{0,40}jsray\.css/,
      `${doc} still sends readers to jsray.css for the palette`);
    assert.match(text, /themes\/default\.css/,
      `${doc} should point at the theme stylesheet instead`);
  }
});

test('docs: every English document has a Chinese counterpart, and they link to each other', () => {
  // English is the source language and Chinese is a first-class copy, not an
  // afterthought — projects.md and versioning.md had no translation at all.
  const { existsSync, readdirSync } = require('node:fs');
  for (const file of [...readdirSync(resolve(ROOT, 'docs')).map((f) => `docs/${f}`), 'README.md']) {
    if (!file.endsWith('.md') || file.endsWith('.zh-CN.md')) continue;
    const zh = file.replace(/\.md$/, '.zh-CN.md');
    assert.ok(existsSync(resolve(ROOT, zh)), `${file} has no ${zh}`);

    // A translation nobody can reach from the original is close to no
    // translation, so the switcher has to point both ways.
    const base = file.split('/').pop().replace(/\.md$/, '');
    assert.match(read(file), new RegExp(`${base}\\.zh-CN\\.md`), `${file} does not link to its translation`);
    assert.match(read(zh), new RegExp(`${base}\\.md`), `${zh} does not link back to the English`);
  }
});

// ---------------------------------------------------------------------------
// The site
//
// demo/ is what jsray.org serves. Nothing else in this suite loads it, so the
// pieces that only matter once deployed are asserted here.
// ---------------------------------------------------------------------------

test('site: both pages carry the footer and its stylesheet', () => {
  // The markup is duplicated in the two pages on purpose — this is a zero-build
  // site, and a shared partial would only exist after a build step, making the
  // local demo/ files differ from what ships. The stylesheet is shared, which
  // is where an inconsistency would actually hurt.
  for (const page of ['demo/index.html', 'demo/studio.html']) {
    const html = read(page);
    assert.match(html, /<link rel="stylesheet" href="footer\.css/, `${page} does not load footer.css`);
    assert.match(html, /<footer class="site-footer">/, `${page} has no footer`);
    assert.match(html, /data-jsray-version/, `${page} footer does not show a version`);

    for (const heading of ['Install', 'Documentation', 'Ecosystem', 'Project']) {
      assert.ok(html.includes(`<h3>${heading}</h3>`), `${page} footer is missing the ${heading} column`);
    }
  }
});

test('site: build-site.sh publishes every asset the pages reference', () => {
  const build = read('tools/build-site.sh');
  for (const page of ['demo/index.html', 'demo/studio.html']) {
    // Same-directory assets are the ones a copy step can forget; ../dist and
    // ../assets are copied wholesale and rewritten by the existing sed.
    for (const m of read(page).matchAll(/(?:href|src)="(?!\.\.\/|https?:|#)([\w.-]+\.(?:css|js))/g)) {
      assert.ok(build.includes(m[1]), `${page} loads ${m[1]}, which build-site.sh never copies into _site/`);
    }
  }
});

test('site: the footer does not link to integrations that do not exist yet', () => {
  // docs/projects.md: no route is published before the product behind it
  // exists. The three integration repositories are not on GitHub yet, so a
  // link to one is a 404 in the footer of the project's own home page.
  for (const page of ['demo/index.html', 'demo/studio.html']) {
    const footer = read(page).match(/<footer class="site-footer">[\s\S]*?<\/footer>/)[0];
    for (const repo of ['jsray-wp', 'jsray-vscode', 'jsray-terminal']) {
      assert.doesNotMatch(footer, new RegExp(`href="[^"]*${repo}`),
        `${page} footer links to ${repo}, which has no public repository yet`);
      assert.ok(footer.includes(repo), `${page} footer should still name ${repo}`);
    }
  }
});

test('release: while no stable version exists, latest follows the newest prerelease', () => {
  // `npm install @jsray/core` installed 0.0.1-beta.2 — older than the current
  // release and carrying a denial of service — for as long as release.sh left
  // `latest` alone. The tag has to point somewhere; not choosing means the
  // first prerelease to claim it keeps it forever.
  const script = read('tools/release.sh');

  assert.match(script, /npm dist-tag add "@jsray\/core@\$VERSION" latest/,
    'release.sh no longer moves the latest tag');
  assert.match(script, /MOVE_LATEST=1/, 'the no-stable-yet branch is gone');

  // It must key off the registry, not a flag someone has to remember to flip,
  // so the behaviour ends by itself when 1.0 ships.
  assert.match(script, /npm view "@jsray\/core" versions/,
    'the decision should read the registry rather than a local switch');
  assert.match(script, /filter\(x => !x\.includes\('-'\)\)/,
    'stable versions are the ones without a prerelease suffix');

  // And a prerelease must still never take latest from a stable release.
  assert.match(script, /if \[ "\$NPM_TAG" = "beta" \]/,
    'the move must be scoped to prerelease publishes');
});

test('ship: the palette sources travel with the package', () => {
  // The integrations vendor a Core snapshot, and two of them regenerate their
  // own artifacts from the palette JSON — VS Code builds colour themes, the
  // terminal builds ANSI maps. dist/themes/*.css is the generated CSS, not a
  // source they can rebuild from. Publishing only the CSS meant a sync that
  // read the package instead of a checkout would quietly ship one palette
  // where there should be four, because the copy step skips a missing
  // directory rather than failing on it.
  const packed = new Set(
    JSON.parse(execFileSync('npm', ['pack', '--dry-run', '--json'], { cwd: ROOT, encoding: 'utf8' }))[0]
      .files.map((f) => f.path)
  );

  const { readdirSync } = require('node:fs');
  const sources = readdirSync(resolve(ROOT, 'themes')).filter((f) => f.endsWith('.json'));
  assert.ok(sources.length >= 3, 'expected the additional palettes to exist');

  for (const file of sources) {
    assert.ok(packed.has(`themes/${file}`), `themes/${file} is not published`);
  }
  assert.ok(packed.has('tokens.json'), 'the default palette source is not published');
});

test('site: response headers are declared and cover the paths that need them', () => {
  // jsray.org serves JavaScript into other people's pages, and the README now
  // tells readers to pin a version with a Subresource Integrity hash. SRI on a
  // cross-origin script is only enforced when the load is a CORS request, so
  // without the CORS header those instructions do not merely fail to protect —
  // the browser blocks the script and the page breaks.
  const headers = read('_headers');

  assert.match(headers, /^\/v\/\*$/m, 'no rule for the pinned-version paths');
  const pinned = headers.slice(headers.indexOf('/v/*'), headers.indexOf('/dist/*'));
  assert.match(pinned, /Access-Control-Allow-Origin: \*/, 'SRI on /v/ needs CORS');
  assert.match(pinned, /Cache-Control:.*immutable/,
    '/v/<version>/ never changes; it should not be revalidated on every load');

  const global = headers.slice(headers.indexOf('/*'), headers.indexOf('/v/*'));
  for (const h of ['Strict-Transport-Security', 'X-Content-Type-Options', 'Referrer-Policy']) {
    assert.match(global, new RegExp(`${h}:`), `${h} is not set`);
  }

  // A file the deploy never copies configures nothing.
  assert.match(read('tools/build-site.sh'), /cp _headers\s+_site\/_headers/,
    'build-site.sh does not publish _headers');
});

test('site: the pinned paths carry the digests the README points at', () => {
  // The README sends readers to /v/<version>/integrity.json for the hash to
  // put in an integrity= attribute. That file has to be there, and its digests
  // have to describe the files as served — the manifest keys are Core's dist/
  // paths, while the site serves them one level up.
  const build = read('tools/build-site.sh');
  assert.match(build, /cp integrity\.json "_site\/v\/\$VERSION\/integrity\.json"/,
    'the current release does not publish its digests');
  assert.match(build, /package\/integrity\.json" "_site\/v\/\$v\/integrity\.json"/,
    'older releases do not publish theirs');

  assert.match(read('README.md'), /\/v\/[\d.a-z-]+\/integrity\.json/,
    'the README does not say where the hashes are');
  assert.match(read('README.md'), /crossorigin="anonymous"/,
    'an SRI example without crossorigin= would leave the script blocked');
});

test('ship: everything published is reachable by name', () => {
  // `files` and `exports` answer different questions — what is in the tarball,
  // and what a consumer may import — and nothing made them agree. themes/*.json
  // was added to `files` so integrations could read the palette sources, and
  // was unreachable through `exports`: on disk in node_modules, and
  // ERR_PACKAGE_PATH_NOT_EXPORTED to anyone who asked for it by name.
  const pkg = JSON.parse(read('package.json'));
  const packed = JSON.parse(
    execFileSync('npm', ['pack', '--dry-run', '--json'], { cwd: ROOT, encoding: 'utf8' })
  )[0].files.map((f) => f.path);

  const patterns = Object.keys(pkg.exports)
    .filter((k) => k !== '.')
    .map((k) => new RegExp('^' + k.replace(/^\.\//, '').replace(/[.]/g, '\\.').replace(/\*/g, '.*') + '$'));

  // A file can also be reachable as the target of a condition rather than as a
  // subpath of its own: types/jsray.d.ts is resolved through the "types"
  // condition on ".", and nobody imports it by path.
  const targets = new Set();
  const collect = (node) => {
    if (typeof node === 'string') targets.add(node.replace(/^\.\//, ''));
    else if (node && typeof node === 'object') Object.values(node).forEach(collect);
  };
  collect(pkg.exports);

  // Documentation and licence text is read, not imported; the rest is API.
  const prose = /^(README|CHANGELOG|LICENSE|assets\/)/;
  const unreachable = packed.filter(
    (f) => !prose.test(f) && !targets.has(f) && !patterns.some((p) => p.test(f))
  );

  assert.deepEqual(unreachable, [],
    'these files ship but cannot be imported — add them to exports or stop publishing them');
});

test('docs: the contributing guide states the commit conventions it asks for', () => {
  // The section used to be three examples that contradicted each other — two
  // plain sentences and one with a `docs:` prefix — and cited a 22-token table
  // that has had 23 tokens since before this repository was public. A
  // convention nobody can read off the page is not a convention.
  const guide = read('CONTRIBUTING.md');

  assert.match(guide, /60 characters/, 'no subject-length guidance');
  assert.match(guide, /\(#N\)|\(#\d+\)/, 'the pull request number is not mentioned');
  assert.match(guide, /--subject/, 'nothing warns that --subject drops the PR number');
  assert.match(guide, /doubles it/, 'nothing warns that typing the number yourself doubles it');

  // The rule that matters is the causal one; the rest is formatting.
  assert.match(guide, /why it is better/, 'the guide does not ask for cause and effect');
  assert.match(guide, /core\.hooksPath tools\/hooks/, 'the guide does not say how to enforce this');

  // A documented hook that does not exist enforces nothing.
  const hook = read('tools/hooks/commit-msg');
  for (const [rule, pattern] of [
    ['type prefixes', /chore:\*/],
    ['bare version numbers', /a version number is not a description/],
    ['hand-typed PR numbers', /do not type the \(#N\)/],
    ['subject length', /-gt 72/],
  ]) {
    assert.match(hook, pattern, `the commit-msg hook does not reject ${rule}`);
  }
  assert.doesNotMatch(guide, /22-token/, 'stale token count in the examples');

  // The examples have to obey the rule they illustrate.
  const fences = [...guide.matchAll(/```\n([\s\S]*?)```/g)].map((m) => m[1]);
  const subjects = fences
    .map((f) => f.split('\n')[0].trim())
    .filter((s) => s && !s.startsWith('#') && !s.includes('$') && !s.startsWith('npm'));

  for (const s of subjects) {
    assert.ok(s.length <= 60, `a commit example is ${s.length} characters: "${s}"`);
  }
});
