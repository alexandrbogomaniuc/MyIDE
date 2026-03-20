# Shell

Electron desktop shell for MyIDE.

## Current scope
- Load a local web UI.
- Show a workspace/project browser driven from the discovered project bundle.
- Support a simple workspace rescan so newly added project folders can appear after discovery refreshes the derived registry.
- Show the selected project's donor, target/resulting game, phase, verification status, folder path, and notes.
- Keep the validated `project_001` replay slice intact.
- Keep donor decoding and server integration out of this phase.

## Files
- `main.ts`: Electron main process entry.
- `workspaceSlice.ts`: workspace/project registry loader.
- `projectSlice.ts`: validated replay slice loader.
- `renderer/index.html`: Web UI scaffold.
- `renderer/styles.css`: App styling.
