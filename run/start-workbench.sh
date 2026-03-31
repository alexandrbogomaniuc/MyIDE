#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./_common.sh
source "${SCRIPT_DIR}/_common.sh"

if [ "${1:-}" = "--help" ]; then
  cat <<'EOF'
start-workbench.sh

Normal daily launcher for MyIDE project_001 work.

What it does:
1. Refresh the donor asset index.
2. Refresh the safe local runtime mirror/request view.
3. Launch the main MyIDE shell.

Use this when you want to open the app and start working without resetting your project files.
EOF
  exit 0
fi

ensure_npm

print_step "Refreshing donor asset index for project_001"
run_myide_script donor-assets:index:project_001

print_step "Refreshing the safe local runtime mirror view"
run_myide_script runtime:harvest:project_001

print_step "Launching MyIDE workbench"
(
  cd "${MYIDE_ROOT}"
  exec npm run dev
)
