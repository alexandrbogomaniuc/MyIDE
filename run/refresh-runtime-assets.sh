#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./_common.sh
source "${SCRIPT_DIR}/_common.sh"

if [ "${1:-}" = "--help" ]; then
  cat <<'EOF'
refresh-runtime-assets.sh

Refresh the safe local runtime mirror/request view for project_001.

What it does:
1. Builds the repo.
2. Runs the safe runtime harvest command.

It does not launch extra smoke windows.
It does not open the full MyIDE shell.
EOF
  exit 0
fi

ensure_npm

print_step "Refreshing the safe local runtime mirror view for project_001"
run_myide_script runtime:harvest:project_001
