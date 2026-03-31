#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./_common.sh
source "${SCRIPT_DIR}/_common.sh"

if [ "${1:-}" = "--help" ]; then
  cat <<'EOF'
start-workbench-clean.sh

Clean launcher for MyIDE project_001 work.

What it does:
1. Reset project_001 to the current tracked baseline.
2. Refresh the donor asset index.
3. Refresh the safe local runtime mirror/request view.
4. Launch the main MyIDE shell.

Warning:
- This uses manual:prepare:project_001.
- It is meant for a clean testing/demo session, not for preserving in-progress project_001 edits.
EOF
  exit 0
fi

ensure_npm

print_step "Resetting project_001 to the tracked baseline"
run_myide_script manual:prepare:project_001

print_step "Refreshing donor asset index for project_001"
run_myide_script donor-assets:index:project_001

print_step "Refreshing the safe local runtime mirror view"
run_myide_script runtime:harvest:project_001

print_step "Launching MyIDE workbench"
(
  cd "${MYIDE_ROOT}"
  exec npm run dev
)
