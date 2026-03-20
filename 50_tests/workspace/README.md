# Workspace Smoke Tests

## Purpose
- Prove that a new project folder can be created, discovered, and reflected in the derived registry.
- Prove that editable internal project data can be saved, reloaded, and restored safely.
- Keep the folder-based workspace model honest without expanding gameplay scope.

## Commands
- `npm run build && node dist/50_tests/workspace/create-project-smoke.js`
- `npm run build && node dist/50_tests/workspace/edit-project-smoke.js`
- `npm run build && node dist/50_tests/workspace/drag-edit-smoke.js`
- `npm run verify:persistence`
- `npm run verify:workspace`

## Scope
- The create-project smoke test creates a temporary project scaffold under `40_projects/`, validates lifecycle-aware metadata, validates folder discovery, checks that the derived registry refreshes automatically, and restores the workspace afterward.
- The edit-project smoke test mutates a real editable object in `project_001`, saves it through the internal project files, reloads the project slice, asserts persisted editor properties and layer state, and then restores the original data.
- The drag-edit smoke test simulates a bounded drag equivalent by changing object placement and layer membership, then verifies layer visibility and lock persistence through save/reload and restore.
- `project_001` remains the validated replay slice.
