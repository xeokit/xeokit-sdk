#!/usr/bin/env bash
set -euo pipefail

CURRENT=$(git rev-parse --abbrev-ref HEAD)

git fetch origin
git checkout docs-build
git rebase origin/master
git push --force-with-lease origin docs-build
git checkout "$CURRENT"
