#!/usr/bin/env bash
# Run examples/npm-smoke and/or examples/hono-npm against the published package.
# Skips (exit 0) when packages/ai version is not on the registry yet, unless
# REQUIRE_PUBLISHED=1 (release / main).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VERSION="$(node -p "require('${ROOT}/packages/ai/package.json').version")"
REQUIRE_PUBLISHED="${REQUIRE_PUBLISHED:-0}"
TARGETS="${1:-both}" # npm | hono | both

if ! npm view "@monorch/ai@${VERSION}" version >/dev/null 2>&1; then
  msg="@monorch/ai@${VERSION} is not on the npm registry yet"
  if [ "$REQUIRE_PUBLISHED" = "1" ]; then
    echo "consumer-smoke FAIL: $msg" >&2
    exit 1
  fi
  echo "consumer-smoke SKIP: $msg"
  exit 0
fi

run_one() {
  local name="$1"
  local dir="$ROOT/examples/$name"
  echo "consumer-smoke: $name (@monorch/ai@${VERSION})"
  if [ -f "$dir/package-lock.json" ]; then
    # Prefer ci for reproducibility; fall back if lock is stale vs package.json.
    npm --prefix "$dir" ci || npm --prefix "$dir" install
  else
    npm --prefix "$dir" install
  fi
  npm --prefix "$dir" run smoke
}

case "$TARGETS" in
  npm) run_one npm-smoke ;;
  hono) run_one hono-npm ;;
  both)
    run_one npm-smoke
    run_one hono-npm
    ;;
  *)
    echo "usage: $0 [npm|hono|both]" >&2
    exit 2
    ;;
esac

echo "consumer-smoke OK ($TARGETS)"
