#!/usr/bin/env bash
# Fork only (.github/workflows/fork-ios.yml): the commits since the build this
# one is made on, one subject per line, newest first, for BUILD_NOTES (the
# Developer screen's "What to test").
#
# Usage: build-notes.sh [base] [prefix]
#   base: the build to compare with, e.g. ios-build/<fingerprint>. Without it,
#   the newest <prefix>/* tag this commit contains. Without any, the last 10.
#   prefix: ios-build (the default) or tvos-build.
# Needs the full history and the tags (checkout with fetch-depth: 0).
set -euo pipefail

base="${1:-}"
prefix="${2:-ios-build}"
if [ -n "$base" ] && ! git rev-parse -q --verify "$base^{commit}" >/dev/null; then
  base=""
fi
if [ -z "$base" ]; then
  base=$(git tag --merged HEAD --list "$prefix/*" --sort=-committerdate | head -1)
fi

if [ -n "$base" ]; then
  range=("$base..HEAD")
else
  range=(-10 HEAD)
fi

# The fork's own plumbing is nothing to test; merges say nothing on their own.
git log --no-merges --format='%s' "${range[@]}" \
  | grep -v -E '^(chore|fix)\(fork\)' \
  | head -20 || true
