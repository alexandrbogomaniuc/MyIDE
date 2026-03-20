# Workspace Smoke Tests

## Purpose
- Prove that a new project folder can be created, discovered, and reflected in the derived registry.
- Prove that editable internal project data can be saved, reloaded, and restored safely.
- Keep the folder-based workspace model honest without expanding gameplay scope.

## Commands
- `npm run smoke:create-project`
- `npm run verify:persistence`
- `npm run verify:workspace`

## Scope
- The create-project smoke test creates a temporary project scaffold under `40_projects/`, validates lifecycle-aware metadata, validates folder discovery, checks that the derived registry refreshes automatically, and restores the workspace afterward.
- The persistence smoke test mutates a real editable object in `project_001`, saves it through the internal project files, reloads the project slice, and then restores the original data.
- `project_001` remains the validated replay slice.
