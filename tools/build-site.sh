#!/bin/sh
# Assemble the static site published at jsray.org (Cloudflare Pages).
#
# Layout produced in _site/:
#   index.html         ← the demo page, served at the site root
#   studio.html        ← theme studio
#   studio/            ← studio assets
#   dist/              ← jsray.js + jsray.css + themes/ (also usable as a CDN)
#   assets/brand/      ← logo and mark files
#   tokens.json        ← palette source the studio fetches
#
# Usage:  sh tools/build-site.sh      (Pages: build command = this, output = _site)
set -e
cd "$(dirname "$0")/.."

# Keep dist/ and the generated theme CSS current before copying.
sh build.sh > /dev/null

rm -rf _site
mkdir -p _site

# Demo becomes the site root.
cp demo/index.html   _site/index.html
cp demo/studio.html  _site/studio.html
cp -R demo/studio    _site/studio

cp -R dist           _site/dist
mkdir -p _site/assets
cp -R assets/brand   _site/assets/brand
cp tokens.json       _site/tokens.json

# The demo lives one level deeper in the repo (demo/index.html) and reaches
# assets with ../ prefixes; at the site root those must become same-level paths.
# Portable in-place edit: BSD sed (macOS) needs `-i ''`, GNU sed (Linux CI)
# rejects it — use a temp file so both platforms work.
for f in _site/index.html _site/studio.html; do
  sed -e 's|\.\./dist/|dist/|g' -e 's|\.\./assets/|assets/|g' "$f" > "$f.tmp"
  mv "$f.tmp" "$f"
done
# studio.js fetches ../tokens.json from studio/, which resolves to the root — correct as-is.

echo "built _site/ ($(find _site -type f | wc -l | tr -d ' ') files)"
