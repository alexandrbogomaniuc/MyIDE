# Workspace Smoke Tests

## Purpose
- Prove that a new project folder can be created, discovered, and reflected in the derived registry.
- Prove that editable internal project data can be saved, reloaded, and restored safely.
- Keep the folder-based workspace model honest without expanding gameplay scope.

## Commands
- `npm run sync:project_001`
- `npm run build && node dist/50_tests/workspace/create-project-smoke.js`
- `npm run build && node dist/50_tests/workspace/edit-project-smoke.js`
- `npm run build && node dist/50_tests/workspace/drag-edit-smoke.js`
- `npm run build && node dist/50_tests/workspace/duplicate-delete-smoke.js`
- `npm run build && node dist/50_tests/workspace/create-object-smoke.js`
- `npm run verify:persistence`
- `npm run verify:workspace`

## Scope
- The create-project smoke test creates a temporary project scaffold under `40_projects/`, validates lifecycle-aware metadata, validates folder discovery, checks that the derived registry refreshes automatically, and restores the workspace afterward.
- The sync command deterministically regenerates the replay-facing `project.json` scene from the internal editable scene files.
- The edit-project smoke test mutates a real editable object in `project_001`, saves it through the internal project files, asserts that generated replay-facing `project.json` changed with it, reloads the project slice, verifies bounded undo/redo behavior, and then restores the original data.
- The drag-edit smoke test simulates a snap-assisted drag-equivalent move, verifies bounded undo/redo around that snapped position, then proves the snapped coordinates persist through both the editable files and generated replay-facing `project.json` before restore.
- The duplicate-delete smoke test proves a duplicated object persists through save/reload and replay sync, then proves delete persistence plus undo/redo before restoring the original project.
- The create-object smoke test proves a new placeholder object can be created, snapped into position, reassigned to another editable layer, synced into replay-facing output, then duplicated and deleted cleanly before restore.
- The latest demo smoke writes a concise before/after artifact to `50_tests/workspace/project_001-demo.md`.
- `project_001` remains the validated replay slice.
