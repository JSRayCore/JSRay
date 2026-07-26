#!/bin/sh
# JSRay Core · one-command release
#
# Publishes a version to every channel a user can install from, so they can
# never disagree about what "0.0.1-beta.2" contains:
#
#   npm            @jsray/core        → bundlers and Node
#   git tag        v<version>         → the exact source of the release
#   GitHub Release dist zip + digests → self-hosted installs
#
# The version comes from version.json — this script never invents one. Bump
# version.json (plus package.json, src/jsray.js, tokens.json, docs) in a pull
# request first: main is protected and takes no direct pushes, from anyone.
# Merge that PR, then run this from the merged main. Tags are not covered by
# branch protection, so this needs no special access.
#
#   sh tools/release.sh              # publish
#   sh tools/release.sh --dry-run    # verify and build artifacts, publish nothing
set -e
cd "$(dirname "$0")/.."

DRY_RUN=0
[ "$1" = "--dry-run" ] && DRY_RUN=1

VERSION=$(node -p "require('./version.json').version")
CHANNEL=$(node -p "require('./version.json').channel")
TAG="v$VERSION"

# npm dist-tag: a prerelease must never become the default install. Only a
# stable release is allowed to take `latest`.
case "$CHANNEL" in
  stable) NPM_TAG=latest ;;
  beta)   NPM_TAG=beta ;;
  *)      echo "error: channel '$CHANNEL' is not publishable — only beta and stable are." >&2; exit 1 ;;
esac

echo "==> releasing JSRay Core $VERSION ($CHANNEL → npm tag '$NPM_TAG')"

# --- gates ------------------------------------------------------------------
# Everything that can be wrong is checked before anything is published, because
# npm publishes are permanent: a version number, once used, is gone forever.

if [ -n "$(git status --porcelain)" ]; then
  echo "error: working tree is dirty — commit before releasing." >&2
  git status --short >&2
  exit 1
fi

if git rev-parse "$TAG" >/dev/null 2>&1; then
  echo "error: tag $TAG already exists — bump version.json first." >&2
  exit 1
fi

if npm view "@jsray/core@$VERSION" version >/dev/null 2>&1; then
  echo "error: @jsray/core@$VERSION is already on npm — a version can never be reused." >&2
  exit 1
fi

echo "==> building and verifying"
sh build.sh >/dev/null
node tools/check-versions.mjs
node tools/integrity.mjs --check
npm test 2>&1 | grep -E '^ℹ (tests|pass|fail)'

# The build must not have changed anything tracked, or dist/ was stale in git.
if [ -n "$(git status --porcelain)" ]; then
  echo "error: 'sh build.sh' changed tracked files — dist/ was out of date in the commit." >&2
  git status --short >&2
  exit 1
fi

# --- artifacts --------------------------------------------------------------
echo "==> packaging release artifacts"
rm -rf build && mkdir -p build
ZIP="build/jsray-$VERSION.zip"

# What a self-hosting user needs: the runtime, the palettes, the machine-readable
# vocabulary, and the digests to verify all of it.
zip -qr "$ZIP" dist tokens.json vocabulary.json integrity.json types LICENSE README.md
(cd build && shasum -a 256 "jsray-$VERSION.zip" > SHA256SUMS.txt)
cp integrity.json build/integrity.json

echo "    $ZIP ($(wc -c < "$ZIP" | tr -d ' ') bytes)"

if [ "$DRY_RUN" = "1" ]; then
  echo
  echo "dry run — nothing published. Artifacts are in build/."
  exit 0
fi

# --- publish ----------------------------------------------------------------
echo "==> publishing to npm"
npm publish --tag "$NPM_TAG"

echo "==> tagging $TAG"
git tag -a "$TAG" -m "JSRay Core $VERSION"
git push origin "$TAG"

echo "==> creating the GitHub release"
NOTES=$(node tools/changelog-section.mjs "$VERSION")
PRERELEASE=""
[ "$CHANNEL" != "stable" ] && PRERELEASE="--prerelease"

printf '%s' "$NOTES" | gh release create "$TAG" \
  "$ZIP" build/SHA256SUMS.txt build/integrity.json \
  --repo JSRayCore/JSRay \
  --title "JSRay Core $VERSION" \
  --notes-file - \
  $PRERELEASE

echo
echo "released $VERSION"
echo "  npm     https://www.npmjs.com/package/@jsray/core/v/$VERSION"
echo "  github  https://github.com/JSRayCore/JSRay/releases/tag/$TAG"
echo "  site    https://jsray.org/dist/jsray.js"
echo
echo "next: propagate to the integrations with 'npm run sync:integrations'"
