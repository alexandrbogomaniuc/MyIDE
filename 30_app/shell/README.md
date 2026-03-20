# Shell

Electron desktop shell for MyIDE.

## Current scope
- Load a local web UI.
- Show a workspace/project browser driven from the workspace bundle.
- Show the selected project's donor, target/resulting game, phase, verification status, and notes.
- Keep the validated `project_001` replay slice intact.
- Keep donor decoding and server integration out of this phase.

## Files
- `main.ts`: Electron main process entry.
- `workspaceSlice.ts`: workspace/project registry loader.
- `projectSlice.ts`: validated replay slice loader.
- `renderer/index.html`: Web UI scaffold.
- `renderer/styles.css`: App styling.
