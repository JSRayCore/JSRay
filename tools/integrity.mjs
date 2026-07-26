#!/usr/bin/env node
/**
 * Write integrity.json: a SHA-256 manifest of the released Core assets.
 *
 * Integrations bundle a *snapshot* of Core rather than depending on it, which
 * means the file that actually renders a user's code lives inside the plugin,
 * where a host, a theme, or a bad actor can quietly replace it. The manifest
 * lets every integration answer one question at runtime: is the engine I am
 * about to run the official build, byte for byte?
 *
 * The digests are over the released `dist/` files, so they are stable for a
 * given Core version and can be published alongside the release.
 *
 *   node tools/integrity.mjs            # write integrity.json
 *   node tools/integrity.mjs --check    # verify without writing (CI / packaging)
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const check = process.argv.includes('--check');

const digest = (path) => 'sha256-' + createHash('sha256').update(readFileSync(path)).digest('base64');

const targets = ['dist/jsray.js', 'dist/jsray.css'];
const themeDir = resolve(ROOT, 'dist/themes');
if (existsSync(themeDir)) {
  for (const file of readdirSync(themeDir).filter((f) => f.endsWith('.css')).sort()) {
    targets.push(`dist/themes/${file}`);
  }
}

const files = {};
for (const target of targets) {
  const path = resolve(ROOT, target);
  if (!existsSync(path)) {
    console.error(`error: ${target} missing — run 'sh build.sh' first.`);
    process.exit(1);
  }
  files[target] = digest(path);
}

const manifest = {
  project: 'jsray',
  version: JSON.parse(readFileSync(resolve(ROOT, 'version.json'), 'utf8')).version,
  algorithm: 'sha256',
  note: 'Base64 SHA-256 digests of the released Core assets. Integrations copy the relevant digest at sync time and verify their bundled snapshot against it.',
  files,
};

const manifestPath = resolve(ROOT, 'integrity.json');
const serialized = JSON.stringify(manifest, null, 2) + '\n';

if (check) {
  if (!existsSync(manifestPath)) {
    console.error("error: integrity.json missing — run 'node tools/integrity.mjs'.");
    process.exit(1);
  }
  const current = readFileSync(manifestPath, 'utf8');
  if (current !== serialized) {
    console.error('error: integrity.json is stale — dist/ changed without regenerating the manifest.');
    process.exit(1);
  }
  console.log(`integrity ok: ${Object.keys(files).length} files, Core ${manifest.version}`);
} else {
  writeFileSync(manifestPath, serialized);
  console.log(`wrote integrity.json — ${Object.keys(files).length} files, Core ${manifest.version}`);
}

