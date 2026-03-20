# Project 001 Runtime

## Purpose
- Stores local replay-only runtime samples for PHASE 2.
- Does not contain production adapter traffic or donor raw payloads.

## Files
- `../project.json`: replay-facing project artifact whose scene content is generated from the editable internal scene files on save/sync.
- `mock-game-state.json`: mocked restartable state for free spins recovery.
- `mock-last-action.json`: mocked last action that explains the recovery state.

## Rules
- These files are internal replay fixtures only.
- They must not be mistaken for GS production contract payloads.
- The editable authority for scene content lives under `../internal/`; `project.json` is the replay-facing generated output for the current editor slice.
