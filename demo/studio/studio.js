/* =========================================================
   JSRay Studio · client logic
   Loads default palette → renders pickers → applies edits live
   via CSS variables → exports CSS / JSON.
   ========================================================= */

// Token definitions: order, grouping, label, JSON key, CSS variable suffix.
// Keep cssVar in lock-step with tools/generate-theme.mjs ALIAS.
const TOKEN_GROUPS = [
  {
    label: 'Surface',
    items: [
      { key: '$background', label: 'Background',           cssVar: 'bg' },
      { key: '$foreground', label: 'Foreground (default)', cssVar: 'fg' },
    ],
  },
  {
    label: 'Identifiers',
    items: [
      { key: 'variable',           label: 'Variable',            cssVar: 'var' },
      { key: 'variable.parameter', label: 'Parameter',           cssVar: 'var-param' },
      { key: 'variable.builtin',   label: 'System / builtin',    cssVar: 'var-builtin' },
      { key: 'variable.constant',  label: 'Constant',            cssVar: 'var-const' },
    ],
  },
  {
    label: 'Functions',
    items: [
      { key: 'function',             label: 'Function call',      cssVar: 'function' },
      { key: 'function.declaration', label: 'Function declaration', cssVar: 'fn-decl' },
      { key: 'function.builtin',     label: 'Builtin function',   cssVar: 'fn-builtin' },
    ],
  },
  {
    label: 'Types & access',
    items: [
      { key: 'type',     label: 'Type',     cssVar: 'type' },
      { key: 'property', label: 'Property', cssVar: 'property' },
    ],
  },
  {
    label: 'Literals',
    items: [
      { key: 'string',       label: 'String',       cssVar: 'string' },
      { key: 'string.regex', label: 'Regex',        cssVar: 'regex' },
      { key: 'number',       label: 'Number',       cssVar: 'number' },
      { key: 'comment',      label: 'Comment',      cssVar: 'comment' },
      { key: 'comment.doc',  label: 'Doc comment',  cssVar: 'doc' },
    ],
  },
  {
    label: 'Structural',
    items: [
      { key: 'keyword',     label: 'Keyword',    cssVar: 'keyword' },
      { key: 'decorator',   label: 'Decorator',  cssVar: 'decorator' },
      { key: 'operator',    label: 'Operator',   cssVar: 'operator' },
      { key: 'punctuation', label: 'Punctuation',cssVar: 'punct' },
    ],
  },
  {
    label: 'Markup',
    items: [
      { key: 'tag',       label: 'HTML tag',       cssVar: 'tag' },
      { key: 'attribute', label: 'HTML attribute', cssVar: 'attr' },
    ],
  },
  {
    label: 'CSS-specific',
    items: [
      { key: 'selector',     label: 'Selector',  cssVar: 'selector' },
      { key: 'css.property', label: 'Property',  cssVar: 'css-prop' },
      { key: 'css.unit',     label: 'Unit',      cssVar: 'css-unit' },
    ],
  },
];

const ALL_ITEMS = TOKEN_GROUPS.flatMap(g => g.items);

// --- Sample code for live preview, one per language --------------------------
const SAMPLES = {
  js: `// Fibonacci sequence
function fibonacci(n) {
  const result = [0, 1];
  for (let i = 2; i < n; i++) {
    result.push(result[i - 1] + result[i - 2]);
  }
  return result;
}

const name = "JSRay";
const MAX_ITEMS = 100;
const pattern = /^[a-z]+$/i;
console.log(fibonacci(10));`,

  python: `from dataclasses import dataclass
from typing import List

@dataclass
class Article:
    title: str
    tags: List[str]
    views: int = 0

    def popular(self) -> bool:
        # Articles above 1,000 views are popular
        return self.views > 1_000

if __name__ == "__main__":
    a = Article(title="Hello", tags=["intro"], views=2048)
    print(a.popular())`,

  html: `<!-- Article card -->
<article class="card card--featured" data-id="42">
  <h2 class="card__title">JSRay is live</h2>
  <p>A <strong>zero-dependency</strong> code rendering kernel</p>
  <a href="https://jsray.org" target="_blank">
    Learn more →
  </a>
</article>`,

  css: `/* Card component */
.card {
  display: flex;
  flex-direction: column;
  padding: 24px;
  background: #0A0B0E;
  border-radius: 0.75rem;
  transition: transform 200ms ease;
}

.card:hover { transform: translateY(-2px); }

@media (max-width: 640px) {
  .card { padding: 16px; }
}`,

  json: `{
  "name": "jsray",
  "version": "1.0.0",
  "active": true,
  "count": 22,
  "languages": ["js", "python", "html", "css", "json"]
}`,
};

// --- State -------------------------------------------------------------------
const state = {
  name: 'my-theme',
  mode: 'dark',           // 'dark' | 'light'
  lang: 'js',
  themes: null,           // { dark: ThemeBlock, light: ThemeBlock }
  pristine: null,         // original copy for "Reset"
};

// --- Bootstrap ---------------------------------------------------------------
(async function init() {
  const palette = await fetch('../tokens.json').then(r => r.json());
  state.themes   = clone(palette.themes);
  state.pristine = clone(palette.themes);

  buildPickers();
  bindToolbar();
  bindTabs();
  syncAll();
})().catch(err => {
  console.error('Studio failed to load:', err);
  document.getElementById('pickers').textContent =
    'Failed to load tokens.json — open this page through the dev server.';
});

// --- Build picker rows -------------------------------------------------------
function buildPickers() {
  const root = document.getElementById('pickers');
  root.innerHTML = '';
  for (const group of TOKEN_GROUPS) {
    const head = document.createElement('div');
    head.className = 'picker-group';
    head.textContent = group.label;
    root.appendChild(head);

    for (const item of group.items) {
      root.appendChild(buildRow(item));
    }
  }
}

function buildRow(item) {
  const row = document.createElement('div');
  row.className = 'picker-row';
  row.dataset.key = item.key;

  const color = document.createElement('input');
  color.type = 'color';
  color.dataset.role = 'color';

  const label = document.createElement('label');
  label.innerHTML = `<div>${escapeHtml(item.label)}</div>
                     <div class="meta">--jr-${item.cssVar}</div>`;

  const hex = document.createElement('input');
  hex.type = 'text';
  hex.maxLength = 7;
  hex.className = 'hex';
  hex.dataset.role = 'hex';
  hex.autocomplete = 'off';

  // Two-way sync between native picker and hex text input
  color.addEventListener('input',  () => onColorChange(item, color.value, color, hex));
  hex.addEventListener('change',   () => {
    const v = normalizeHex(hex.value);
    if (v) onColorChange(item, v, color, hex);
    else hex.value = currentColorOf(item);
  });

  row.appendChild(color);
  row.appendChild(label);
  row.appendChild(hex);
  return row;
}

// --- Sync UI ↔ state ↔ DOM ---------------------------------------------------
function currentColorOf(item) {
  const theme = state.themes[state.mode];
  if (item.key === '$background') return theme.background;
  if (item.key === '$foreground') return theme.foreground;
  return theme.tokens[item.key]?.color || '#000000';
}

function setColorOf(item, value) {
  const theme = state.themes[state.mode];
  if (item.key === '$background')      theme.background = value;
  else if (item.key === '$foreground') theme.foreground = value;
  else {
    theme.tokens[item.key] = theme.tokens[item.key] || { color: value };
    theme.tokens[item.key].color = value;
  }
}

function onColorChange(item, value, colorEl, hexEl) {
  setColorOf(item, value);
  // Sync companion input
  if (colorEl.value !== value) colorEl.value = value;
  if (hexEl.value !== value)   hexEl.value = value;
  // Apply onto <body>: it carries data-theme, so inline vars there beat the
  // theme stylesheet's [data-theme] block.
  JSRay.applyTheme(state.themes[state.mode], document.body);
}

function syncPickers() {
  for (const row of document.querySelectorAll('.picker-row')) {
    const item = ALL_ITEMS.find(i => i.key === row.dataset.key);
    const v = currentColorOf(item);
    row.querySelector('[data-role="color"]').value = v;
    row.querySelector('[data-role="hex"]').value   = v;
  }
}

function syncPreview() {
  const code = SAMPLES[state.lang];
  const el = document.getElementById('preview-code');
  el.className = 'language-' + state.lang;
  el.innerHTML = JSRay.highlight(code, state.lang);
}

function syncAll() {
  document.body.dataset.theme = state.mode;
  JSRay.applyTheme(state.themes[state.mode], document.body);
  syncPickers();
  syncPreview();
}

// --- Toolbar -----------------------------------------------------------------
function bindToolbar() {
  document.getElementById('theme-name').addEventListener('input', e => {
    state.name = (e.target.value || 'my-theme').trim() || 'my-theme';
  });

  document.getElementById('reset-btn').addEventListener('click', () => {
    state.themes = clone(state.pristine);
    syncAll();
  });

  document.getElementById('css-btn').addEventListener('click', () => {
    download(generateThemeCss(state.name, state.themes), state.name + '.css', 'text/css');
  });

  document.getElementById('json-btn').addEventListener('click', () => {
    const payload = {
      name: state.name,
      version: '1.0.0',
      generatedBy: 'JSRay Studio',
      themes: state.themes,
    };
    download(JSON.stringify(payload, null, 2), state.name + '.json', 'application/json');
  });
}

function bindTabs() {
  for (const tab of document.querySelectorAll('.toolbar-tabs .tab')) {
    tab.addEventListener('click', () => {
      for (const t of document.querySelectorAll('.toolbar-tabs .tab')) t.classList.remove('active');
      tab.classList.add('active');
      state.mode = tab.dataset.mode;
      syncAll();
    });
  }
  for (const tab of document.querySelectorAll('.preview-tabs .ptab')) {
    tab.addEventListener('click', () => {
      for (const t of document.querySelectorAll('.preview-tabs .ptab')) t.classList.remove('active');
      tab.classList.add('active');
      state.lang = tab.dataset.lang;
      syncPreview();
    });
  }
}

// --- CSS generation (mirrors tools/generate-theme.mjs but selector-customizable)
function generateThemeCss(name, themes) {
  const head =
`/* =========================================================
   ${name} · generated by JSRay Studio
   Drop this file next to dist/jsray.css and switch with
   <body data-theme="${name}">  or  data-theme="${name}-light".
   ========================================================= */
`;
  const blocks = [
    block(`[data-theme="${name}"]`,       themes.dark),
    block(`[data-theme="${name}-light"]`, themes.light),
  ];
  return head + '\n' + blocks.join('\n\n') + '\n';
}

function block(selector, theme) {
  const lines = [
    `  --jr-bg:        ${theme.background};`,
    `  --jr-fg:        ${theme.foreground};`,
    '',
  ];
  for (const item of ALL_ITEMS) {
    if (item.key === '$background' || item.key === '$foreground') continue;
    const tok = theme.tokens[item.key];
    if (!tok) continue;
    lines.push(`  --jr-${(item.cssVar + ':').padEnd(14)} ${tok.color};`);
  }
  return `${selector} {\n${lines.join('\n')}\n}`;
}

// --- Helpers -----------------------------------------------------------------
function download(text, filename, mime) {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function clone(v) { return JSON.parse(JSON.stringify(v)); }

function escapeHtml(s) {
  return s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function normalizeHex(s) {
  s = (s || '').trim();
  if (!s) return null;
  if (s[0] !== '#') s = '#' + s;
  if (/^#[0-9a-fA-F]{6}$/.test(s)) return s.toLowerCase();
  if (/^#[0-9a-fA-F]{3}$/.test(s)) {
    return '#' + s.slice(1).split('').map(c => c + c).join('').toLowerCase();
  }
  return null;
}
