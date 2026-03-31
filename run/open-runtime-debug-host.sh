#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./_common.sh
source "${SCRIPT_DIR}/_common.sh"

if [ "${1:-}" = "--help" ]; then
  cat <<'EOF'
open-runtime-debug-host.sh

Launch the dedicated Runtime Debug Host for project_001.

Use this when you only want the stronger runtime-debug path and do not need the full shell workbench first.
This opens the interactive Runtime Debug Host window.
If you want the automated proof harness instead, use `npm run smoke:electron-runtime-debug`.
EOF
  exit 0
fi

ensure_npm

print_step "Launching the Runtime Debug Host for project_001"
run_myide_script runtime:debug:project_001
