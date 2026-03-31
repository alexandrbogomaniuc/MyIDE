#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

if ! "${SCRIPT_DIR}/start-workbench.sh"; then
  echo
  echo "MyIDE workbench launch failed."
  echo "Press Enter to close this window."
  read -r _
  exit 1
fi
