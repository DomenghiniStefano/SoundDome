#!/bin/bash
set -e

TYPE=${1:-minor}

if [[ "$TYPE" != "major" && "$TYPE" != "minor" && "$TYPE" != "patch" ]]; then
  echo "Usage: npm run release -- [major|minor|patch]"
  echo "Default: minor"
  exit 1
fi

BRANCH=$(git branch --show-current)
if [[ "$BRANCH" != "develop" ]]; then
  echo "Error: must be on develop branch (currently on $BRANCH)"
  exit 1
fi

if [[ -n $(git status --porcelain) ]]; then
  echo "Error: working directory is not clean"
  exit 1
fi

VERSION=$(node -e "
  const pkg = require('./package.json');
  const [major, minor, patch] = pkg.version.split('.').map(Number);
  if ('$TYPE' === 'major') console.log((major+1) + '.0.0');
  else if ('$TYPE' === 'minor') console.log(major + '.' + (minor+1) + '.0');
  else console.log(major + '.' + minor + '.' + (patch+1));
")

echo "Releasing v$VERSION ($TYPE)..."

git flow release start "$VERSION"
npm version "$TYPE" --no-git-tag-version
git add package.json package-lock.json
git commit -m "$VERSION"
git flow release finish "$VERSION" -m "$VERSION"
git push origin master develop "$VERSION"

echo "Done! v$VERSION pushed. GitHub Actions will build and publish the release."
