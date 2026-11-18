#!/usr/bin/env bash
# Fork only (.github/workflows/fork-ios.yml): the commits since the build this
# one is made on, one subject per line, newest first, for BUILD_NOTES (the
# Developer screen's "What to test") and TestFlight's "What to Test".
#
# Usage: build-notes.sh [base]
#   base: the build to compare with, e.g. ios-build/<fingerprint>. Without it,
#   the newest ios-build/* tag this commit contains. Without any, the last 10.
# Needs the full history and the tags (checkout with fetch-depth: 0).
set -euo pipefail

base="${1:-}"
if [ -n "$base" ] && ! git rev-parse -q --verify "$base^{commit}" >/dev/null; then
  base=""
fi
if [ -z "$base" ]; then
  base=$(git tag --merged HEAD --list 'ios-build/*' --sort=-committerdate | head -1)
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
