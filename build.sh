#!/bin/sh
# JSRay · zero-build release script
# Sync src/ → dist/ (plain copy for now; can layer in minification later)
set -e
cd "$(dirname "$0")"

# Regenerate theme CSS from tokens.json if node is available.
# When node is missing (rare), the existing src/themes/default.css
# is used as-is — it is still a tracked file so the project never
# breaks for users without a node toolchain.
if command -v node >/dev/null 2>&1; then
  node tools/generate-theme.mjs
else
  echo "skip: node not found, reusing existing src/themes/default.css"
fi

mkdir -p dist/themes
cp src/jsray.js  dist/jsray.js
cp src/jsray.css dist/jsray.css
cp src/themes/*.css dist/themes/
# Fingerprint the released assets so integrations can verify the snapshot they
# bundle is the official build.
if command -v node >/dev/null 2>&1; then
  node tools/integrity.mjs
fi

echo "synced src/ → dist/"
