#!/usr/bin/env node
/**
 * Generate src/themes/<name>.css from tokens.json.
 *
 * tokens.json is the single source of truth for the palette. This script
 * fans it out into CSS so non-web renderers (PDF, DOCX, ANSI, ...) can
 * consume the same JSON without re-parsing CSS.
 *
 * Usage:  node tools/generate-theme.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC  = resolve(ROOT, 'tokens.json');
const OUT  = resolve(ROOT, 'src/themes/default.css');

// Map semantic JSON keys → CSS variable suffix (and CSS class suffix).
// CSS produces `--jr-<suffix>`; the runtime emits `<span class="tk-<suffix>">`.
const ALIAS = {
  'keyword':              'keyword',
  'function':             'function',
  'function.declaration': 'fn-decl',
  'function.builtin':     'fn-builtin',
  'variable':             'var',
  'variable.parameter':   'var-param',
  'variable.builtin':     'var-builtin',
  'variable.constant':    'var-const',
  'type':                 'type',
  'property':             'property',
  'string':               'string',
  'string.regex':         'regex',
  'number':               'number',
  'comment':              'comment',
  'comment.doc':          'doc',
  'decorator':            'decorator',
  'operator':             'operator',
  'punctuation':          'punct',
  'tag':                  'tag',
  'attribute':            'attr',
  'selector':             'selector',
  'css.property':         'css-prop',
  'css.unit':             'css-unit',
};

const palette = JSON.parse(readFileSync(SRC, 'utf8'));

function renderBlock(selector, theme) {
  const lines = [
    `  --jr-bg:          ${theme.background};`,
    `  --jr-fg:          ${theme.foreground};`,
    `  --jr-border:      ${theme.border ?? (selector.includes('light') ? '#E5E5EA' : '#2C2C2E')};`,
    `  --jr-gutter-fg:   ${theme.gutter   ?? (selector.includes('light') ? '#8E8E93' : '#48484A')};`,
    `  --jr-line-hl:     ${theme.lineHighlight ?? (selector.includes('light') ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.05)')};`,
    '',
  ];
  for (const [key, suffix] of Object.entries(ALIAS)) {
    const tok = theme.tokens[key];
    if (!tok) throw new Error(`tokens.json missing "${key}" in theme block`);
    lines.push(`  --jr-${(suffix + ':').padEnd(14)} ${tok.color};`);
  }
  return `${selector} {\n${lines.join('\n')}\n}`;
}

const header = `/* =========================================================
   ${palette.name} · default theme
   AUTO-GENERATED from tokens.json — do not edit by hand.
   Run \`node tools/generate-theme.mjs\` after editing the palette.
   ========================================================= */
`;

const dark  = renderBlock(':root,\n[data-theme="dark"]', palette.themes.dark);
const light = renderBlock('[data-theme="light"]',          palette.themes.light);

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, `${header}\n${dark}\n\n${light}\n`);
console.log(`generated ${OUT}`);
