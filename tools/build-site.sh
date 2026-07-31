#!/bin/sh
# Assemble the static site published at jsray.org (Cloudflare Pages).
#
# Layout produced in _site/:
#   index.html         ← the demo page, served at the site root
#   studio.html        ← theme studio
#   studio/            ← studio assets
#   dist/              ← jsray.js + jsray.css + themes/ — tracks the newest release
#   v/<version>/       ← the same files, frozen per release, so a site can pin
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
cp demo/footer.css   _site/footer.css
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

# --- versioned copies -------------------------------------------------------
# /dist/ moves on every release, which is wrong for a site nobody is watching.
# /v/<version>/ never moves. Cloudflare replaces the whole asset bundle on each
# deploy, so previously published versions have to be rebuilt here rather than
# surviving from the last one — they come from npm, which is already the record
# of what was released. A network failure degrades to "only this version is
# pinnable" instead of failing the deploy.
VERSION=$(node -p "require('./version.json').version")
mkdir -p "_site/v/$VERSION"
cp -R dist/* "_site/v/$VERSION/"

PUBLISHED=$(npm view @jsray/core versions --json 2>/dev/null \
  | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{const v=JSON.parse(d);process.stdout.write((Array.isArray(v)?v:[v]).join(' '));}catch(e){}})" || true)

if [ -z "$PUBLISHED" ]; then
  echo "warn: could not reach npm — only $VERSION will be pinnable." >&2
else
  TMP="${TMPDIR:-/tmp}/jsray-versions.$$"
  mkdir -p "$TMP"
  for v in $PUBLISHED; do
    [ "$v" = "$VERSION" ] && continue
    [ -d "_site/v/$v" ] && continue
    if (cd "$TMP" && npm pack "@jsray/core@$v" --silent >/dev/null 2>&1); then
      TARBALL=$(ls "$TMP"/jsray-core-"$v".tgz 2>/dev/null || true)
      if [ -n "$TARBALL" ]; then
        mkdir -p "$TMP/x-$v" && tar xzf "$TARBALL" -C "$TMP/x-$v"
        if [ -d "$TMP/x-$v/package/dist" ]; then
          mkdir -p "_site/v/$v"
          cp -R "$TMP/x-$v/package/dist/"* "_site/v/$v/"
        fi
      fi
    else
      echo "warn: could not fetch @jsray/core@$v — that version will not be pinnable." >&2
    fi
  done
  rm -rf "$TMP"
fi

echo "pinnable versions: $(ls _site/v 2>/dev/null | tr '\n' ' ')"
echo "built _site/ ($(find _site -type f | wc -l | tr -d ' ') files)"
