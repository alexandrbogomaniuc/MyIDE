#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ "${1:-}" = "--help" ]; then
  cat <<'EOF'
start-myide.sh

Universal daily launcher for MyIDE.

What it does:
1. Runs the standard workbench startup flow.
2. Opens the MyIDE shell for day-to-day use.

Use this as the single entry point. Advanced tools (clean baseline, debug host,
runtime refresh) are optional and documented elsewhere.
EOF
  exit 0
fi

"${SCRIPT_DIR}/start-workbench.sh" "$@"
