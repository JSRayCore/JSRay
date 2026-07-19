#!/usr/bin/env node
/**
 * Generate src/themes/<name>.css from palette JSON.
 *
 * Palette JSON is the single source of truth. This script fans it out into
 * CSS so non-web renderers (PDF, DOCX, ANSI, ...) can consume the same JSON
 * without re-parsing CSS.
 *
 * Sources:
 *   tokens.json     → src/themes/default.css   (the signature palette)
 *   themes/<x>.json → src/themes/<x>.css       (additional palettes)
 *
 * Usage:  node tools/generate-theme.mjs
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { dirname, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

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

function renderBlock(source, selector, theme) {
  const lines = [
    `  --jr-bg:          ${theme.background};`,
    `  --jr-fg:          ${theme.foreground};`,
    `  --jr-border:      ${theme.border ?? (selector.includes('light') ? '#E5E5EA' : '#2C2C2E')};`,
    `  --jr-gutter-fg:   ${theme.gutter   ?? (selector.includes('light') ? '#8E8E93' : '#48484A')};`,
    `  --jr-line-hl:     ${theme.lineHighlight ?? (selector.includes('light') ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.05)')};`,
    '',
  ];
  for (const [key, suffix] of Object.entries(ALIAS)) {
    // Fallback chain: a refined key missing from the palette resolves through
    // its base (function.declaration → function), so older palettes keep
    // working when the vocabulary grows in a minor version.
    let k = key, tok = null;
    while (k && !(tok = theme.tokens[k])) {
      const dot = k.lastIndexOf('.');
      k = dot === -1 ? '' : k.slice(0, dot);
    }
    if (!tok) throw new Error(`${source} missing "${key}" (and its fallback chain) in theme block`);
    lines.push(`  --jr-${(suffix + ':').padEnd(14)} ${tok.color};`);
  }
  return `${selector} {\n${lines.join('\n')}\n}`;
}

function generate(srcPath, themeId) {
  const palette = JSON.parse(readFileSync(srcPath, 'utf8'));
  const source = basename(srcPath);
  const out = resolve(ROOT, `src/themes/${themeId}.css`);

  for (const mode of ['dark', 'light']) {
    if (!palette.themes?.[mode]) throw new Error(`${source} missing themes.${mode} — every palette ships dark + light`);
  }

  const header = `/* =========================================================
   ${palette.name} · ${themeId} theme
   AUTO-GENERATED from ${source} — do not edit by hand.
   Run \`node tools/generate-theme.mjs\` after editing the palette.
   ========================================================= */
`;

  const dark  = renderBlock(source, ':root,\n[data-theme="dark"]', palette.themes.dark);
  const light = renderBlock(source, '[data-theme="light"]',          palette.themes.light);

  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, `${header}\n${dark}\n\n${light}\n`);
  console.log(`generated ${out}`);
}

// The signature palette lives at the repo root.
generate(resolve(ROOT, 'tokens.json'), 'default');

// Additional palettes live in themes/*.json.
const THEMES_DIR = resolve(ROOT, 'themes');
if (existsSync(THEMES_DIR)) {
  for (const file of readdirSync(THEMES_DIR).sort()) {
    if (file.endsWith('.json')) {
      generate(resolve(THEMES_DIR, file), basename(file, '.json'));
    }
  }
}
