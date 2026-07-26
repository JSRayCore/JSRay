#!/usr/bin/env node
/**
 * Print the CHANGELOG section for one version, for use as release notes.
 *
 * Keeps the release notes and the changelog from drifting: there is one
 * description of what shipped, and it is the one already reviewed in the repo.
 *
 *   node tools/changelog-section.mjs 0.0.1-beta.2
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const version = process.argv[2];

if (!version) {
  console.error('usage: node tools/changelog-section.mjs <version>');
  process.exit(1);
}

const changelog = readFileSync(resolve(ROOT, 'CHANGELOG.md'), 'utf8');
const lines = changelog.split('\n');
const start = lines.findIndex((line) => line.startsWith(`## [${version}]`));

if (start === -1) {
  console.error(`error: CHANGELOG.md has no section for ${version}`);
  process.exit(1);
}

const rest = lines.slice(start + 1);
const end = rest.findIndex((line) => line.startsWith('## '));
const body = (end === -1 ? rest : rest.slice(0, end)).join('\n').trim();

process.stdout.write(
  `${body}\n\n---\n\n` +
    `**Install**\n\n` +
    '```sh\n' +
    `npm install @jsray/core@${version}\n` +
    '```\n\n' +
    `Or load it directly — no build step:\n\n` +
    '```html\n' +
    `<link rel="stylesheet" href="https://unpkg.com/@jsray/core@${version}/dist/themes/default.css">\n` +
    `<link rel="stylesheet" href="https://unpkg.com/@jsray/core@${version}/dist/jsray.css">\n` +
    `<script src="https://unpkg.com/@jsray/core@${version}/dist/jsray.js"></script>\n` +
    '```\n\n' +
    `**Verifying this download**\n\n` +
    `\`SHA256SUMS.txt\` covers the zip. \`integrity.json\` carries the per-file digests ` +
    `every JSRay integration checks its bundled snapshot against, so a self-hosted copy ` +
    `can be verified the same way.\n`
);
