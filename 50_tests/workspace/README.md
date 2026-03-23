# Workspace Smoke Tests

## Purpose
- Prove that a new project folder can be created, discovered, and reflected in the derived registry.
- Prove that editable internal project data can be saved, reloaded, and restored safely.
- Keep the folder-based workspace model honest without expanding gameplay scope.

## Commands
- `npm run manual:status`
- `npm run manual:prepare:project_001`
- `npm run manual:bug-context`
- `npm run manual:bug-bundle`
- `npm run manual:reset:project_001`
- `npm run sync:project_001`
- `npm run build && node dist/50_tests/workspace/create-project-smoke.js`
- `npm run build && node dist/50_tests/workspace/edit-project-smoke.js`
- `npm run build && node dist/50_tests/workspace/drag-edit-smoke.js`
- `npm run build && node dist/50_tests/workspace/duplicate-delete-smoke.js`
- `npm run build && node dist/50_tests/workspace/create-object-smoke.js`
- `npm run build && node dist/50_tests/workspace/order-isolate-smoke.js`
- `npm run build && node dist/50_tests/workspace/layer-navigation-smoke.js`
- `npm run build && node dist/50_tests/workspace/viewport-controls-smoke.js`
- `npm run build && node dist/50_tests/workspace/electron-bridge-smoke.js`
- `npm run build && node dist/50_tests/workspace/electron-live-persist-smoke.js`
- `npm run build && node dist/50_tests/workspace/electron-live-drag-smoke.js`
- `npm run build && node dist/50_tests/workspace/electron-live-create-drag-smoke.js`
- `npm run build && node dist/50_tests/workspace/electron-live-duplicate-delete-smoke.js`
- `npm run build && node dist/50_tests/workspace/electron-live-reorder-smoke.js`
- `npm run build && node dist/50_tests/workspace/electron-live-layer-reassign-smoke.js`
- `npm run build && node dist/50_tests/workspace/electron-live-resize-smoke.js`
- `npm run build && node dist/50_tests/workspace/electron-live-align-smoke.js`
- `npm run build && node dist/50_tests/workspace/electron-live-undo-redo-smoke.js`
- `npm run verify:persistence`
- `npm run verify:workspace`

## Scope
- The manual QA pack now gives a tester-facing reset, status, playbook, matrix, and bug template layer on top of the automated smokes so local testing can start from a known `project_001` baseline.
- The QA-B follow-up adds one-command manual session prep and one paste-friendly bug-context command so testers can start faster and capture cleaner defect notes without widening editor scope.
- The QA-C follow-up adds a timestamped bug-bundle helper outside the repo so testers can collect `BUG.md`, current context, and attachments in one predictable place without polluting Git.
- The create-project smoke test creates a temporary project scaffold under `40_projects/`, validates lifecycle-aware metadata, validates folder discovery, checks that the derived registry refreshes automatically, and restores the workspace afterward.
- The sync command deterministically regenerates the replay-facing `project.json` scene from the internal editable scene files.
- The edit-project smoke test mutates a real editable object in `project_001`, saves it through the internal project files, asserts that generated replay-facing `project.json` changed with it, reloads the project slice, verifies bounded undo/redo behavior, and then restores the original data.
- The drag-edit smoke test simulates a snap-assisted drag-equivalent move, verifies bounded undo/redo around that snapped position, then proves the snapped coordinates persist through both the editable files and generated replay-facing `project.json` before restore.
- The duplicate-delete smoke test proves a duplicated object persists through save/reload and replay sync, then proves delete persistence plus undo/redo before restoring the original project.
- The create-object smoke test proves a new placeholder preset object can be created, resized, aligned to the viewport, synced into replay-facing output, then duplicated and deleted cleanly before restore.
- The order-isolate smoke test proves layer-local draw-order cues are coherent (`index`, `canSendBackward`, `canBringForward`), validates previous/next sibling navigation lookups within the current layer as session-only and non-dirty, then proves the saved reorder persists through save/reload and replay sync.
- The layer-navigation smoke test proves previous/next sibling stepping stays within the current layer, respects solo-filtered visibility, stays non-dirty, and remains coherent after duplicate/delete plus layer reassignment.
- The same order-isolate smoke test proves a session-only layer isolation view stays in memory, does not mutate persistent layer visibility, and does not dirty persistent project state.
- The viewport-controls smoke test proves session-only zoom/pan/fit/reset view operations are non-dirty and non-persistent, then proves transformed-view coordinate edits persist through save/reload and replay sync.
- The electron-bridge smoke test launches Electron in dedicated smoke mode, asserts main startup, preload bridge exposure, renderer-ready handshake, renderer bridge call success, and `project_001` workspace load over `window.myideApi.loadProjectSlice`, then writes `/tmp/myide-electron-bridge-smoke.json`.
- The electron-live-persist smoke test launches the real Electron shell, drives the renderer action path for object selection, inspector edit, save, and reload, verifies both internal editable data and replay-facing `project.json`, writes `/tmp/myide-electron-live-persist.json`, and restores the touched project files/logs so the repo status returns to baseline.
- The electron-live-drag smoke test launches the real Electron shell, drives the renderer canvas pointer path for object selection, drag, save, and reload, verifies both internal editable data and replay-facing `project.json`, writes `/tmp/myide-electron-live-drag.json`, and restores the touched project files/logs so the repo status returns to baseline.
- The electron-live-create-drag smoke test launches the real Electron shell, drives the renderer preset selection + new-placeholder action + canvas pointer path, verifies the newly created object persists through save/reload in both internal editable data and replay-facing `project.json`, writes `/tmp/myide-electron-live-create-drag.json`, and restores the touched project files/logs so the repo status returns to baseline.
- The electron-live-duplicate-delete smoke test launches the real Electron shell, drives the renderer preset selection + new-placeholder action + duplicate/delete toolbar path, verifies the surviving created object persists through save/reload in both internal editable data and replay-facing `project.json` while the deleted duplicate stays absent, writes `/tmp/myide-electron-live-duplicate-delete.json`, and restores the touched project files/logs so the repo status returns to baseline.
- The electron-live-reorder smoke test launches the real Electron shell, drives the renderer preset selection + new-placeholder action + layer-order toolbar path, verifies the reordered created object persists through save/reload in both internal editable data and replay-facing `project.json`, writes `/tmp/myide-electron-live-reorder.json`, and restores the touched project files/logs so the repo status returns to baseline.
- The electron-live-layer-reassign smoke test launches the real Electron shell, drives the renderer preset selection + new-placeholder action + Assigned Layer inspector path, verifies the created object persists after moving from `layer.ui` to `layer.overlay` through save/reload in both internal editable data and replay-facing `project.json`, writes `/tmp/myide-electron-live-layer-reassign.json`, and restores the touched project files/logs so the repo status returns to baseline.
- The electron-live-resize smoke test launches the real Electron shell, drives the renderer preset selection + new-placeholder action + inspector width/height path, verifies the created object persists after resizing from `540x120` to `564x132` through save/reload in both internal editable data and replay-facing `project.json`, writes `/tmp/myide-electron-live-resize.json`, and restores the touched project files/logs so the repo status returns to baseline.
- The electron-live-align smoke test launches the real Electron shell, drives the renderer preset selection + new-placeholder action + alignment toolbar path, verifies the created object persists after a right-edge viewport alignment through save/reload in both internal editable data and replay-facing `project.json`, writes `/tmp/myide-electron-live-align.json`, and restores the touched project files/logs so the repo status returns to baseline.
- The electron-live-undo-redo smoke test launches the real Electron shell, drives the renderer preset selection + new-placeholder action + canvas drag path + undo/redo toolbar path, verifies the created object returns to its original position after undo, returns to its dragged position after redo, then persists that final redone position through save/reload in both internal editable data and replay-facing `project.json`, writes `/tmp/myide-electron-live-undo-redo.json`, and restores the touched project files/logs so the repo status returns to baseline.
- Individual smoke runs may rewrite `50_tests/workspace/project_001-demo.md` with the latest concise before/after note, but `npm run verify:workspace` now restores that tracked file from `HEAD` before finishing so the repo stays clean.
- `project_001` remains the validated replay slice.
