#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

if ! "${SCRIPT_DIR}/run/start-myide.sh"; then
  echo
  echo "MyIDE launch failed."
  echo "Press Enter to close."
  read -r
fi
