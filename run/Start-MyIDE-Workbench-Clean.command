#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

if ! "${SCRIPT_DIR}/start-workbench-clean.sh"; then
  echo
  echo "MyIDE clean workbench launch failed."
  echo "Press Enter to close this window."
  read -r _
  exit 1
fi
