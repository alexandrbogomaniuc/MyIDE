#!/usr/bin/env bash
set -euo pipefail

MYIDE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MYIDE_NODE_FALLBACK_BIN="${HOME}/.local/node-v22.22.1/bin"

ensure_npm() {
  if command -v npm >/dev/null 2>&1; then
    return 0
  fi
  if [ -x "${MYIDE_NODE_FALLBACK_BIN}/npm" ]; then
    export PATH="${MYIDE_NODE_FALLBACK_BIN}:${PATH}"
    return 0
  fi
  echo "MyIDE launcher could not find npm." >&2
  echo "Install Node.js or make sure npm is on PATH, then try again." >&2
  exit 1
}

run_myide_script() {
  local script_name="$1"
  shift || true
  (
    cd "${MYIDE_ROOT}"
    npm run "${script_name}" -- "$@"
  )
}

print_step() {
  printf '\n==> %s\n' "$1"
}
