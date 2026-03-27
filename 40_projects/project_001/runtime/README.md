# Project 001 Runtime

## Purpose
- Stores local replay-only runtime samples for PHASE 2.
- Stores the bounded local Mystery Garden runtime mirror for the current runtime-first slice.
- Does not contain production adapter traffic or donor raw payloads.

## Files
- `../project.json`: replay-facing project artifact whose scene content is generated from the editable internal scene files on save/sync.
- `mock-game-state.json`: mocked restartable state for free spins recovery.
- `mock-last-action.json`: mocked last action that explains the recovery state.
- `local-mirror/manifest.json`: local mirror manifest for the strongest grounded Mystery Garden runtime capture on this machine.
- `local-mirror/files/`: local-only mirrored runtime loader/bundle/static files used by the bounded local runtime mirror slice.
- Runtime Mode now also surfaces a bounded request map for the current launch/reload cycle so the shell can show which requested runtime URLs resolved to local mirror files or project-local override files.

## Rules
- These files are internal replay fixtures only.
- `local-mirror/` is local-only and gitignored; it is a bounded partial mirror, not a full captured donor runtime package.
- The current shell proof can show local mirror source paths and current request-map entries, but the mirrored static override candidate still does not prove a reload-time hit yet.
- They must not be mistaken for GS production contract payloads.
- The editable authority for scene content lives under `../internal/`; `project.json` is the replay-facing generated output for the current editor slice.
- The shell now surfaces `project.json` as the replay sync target after save so the generated output is visible instead of implicit.
- Placeholder-backed object width/height edits are not editor-only: save must carry them into the generated replay-facing `project.json` node positions.
