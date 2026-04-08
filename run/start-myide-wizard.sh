#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./_common.sh
source "${SCRIPT_DIR}/_common.sh"

if [ "${1:-}" = "--help" ]; then
  cat <<'EOF'
start-myide-wizard.sh

Wizard-mode launcher for onboarding a brand-new donor.

What it does:
1. Launch the MyIDE shell in Wizard Mode (New Project guidance overlay).

Use this when you want the IDE to focus on creating a new donor project.

Optional flags:
  --prep   Refresh the donor asset index and runtime mirror before launch.
EOF
  exit 0
fi

ensure_npm

if [ "${1:-}" = "--prep" ]; then
  print_step "Refreshing donor asset index for project_001"
  run_myide_script donor-assets:index:project_001

  print_step "Refreshing the safe local runtime mirror view"
  run_myide_script runtime:harvest:project_001
fi

print_step "Launching MyIDE in wizard mode"
(
  cd "${MYIDE_ROOT}"
  MYIDE_WIZARD_MODE=1 exec npm run dev
)
