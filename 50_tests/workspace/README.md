# Workspace Smoke Tests

## Purpose
- Prove that a new project folder can be created, discovered, and reflected in the derived registry.
- Keep the folder-based workspace model honest without expanding gameplay scope.

## Commands
- `npm run smoke:create-project`
- `npm run verify:workspace`

## Scope
- The smoke test creates a temporary project scaffold under `40_projects/`, validates lifecycle-aware metadata, validates folder discovery, checks that the derived registry refreshes automatically, and restores the workspace afterward.
- `project_001` remains the validated replay slice.
