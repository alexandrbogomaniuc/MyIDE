# Shell

Electron desktop shell for MyIDE.

## Current scope
- Load a local web UI.
- Show a workspace/project browser driven from the discovered project bundle.
- Create a new project scaffold from the shell through a bounded local IPC bridge.
- Support a simple workspace rescan so newly added project folders can appear after discovery refreshes the derived registry.
- Show the selected project's donor, target/resulting game, lifecycle stage summary, phase, verification status, folder path, and notes.
- Show a scene/layer/object explorer for the selected project's editable internal scene files.
- Render the editor canvas from the deterministic preview scene bridged from `internal/scene.json`, `layers.json`, and `objects.json` when those files exist.
- Support object selection from the list and canvas, direct canvas move, snap-assisted drag and nudge, selected-object layer reassignment, preset-based placeholder object creation, bounded placeholder width/height editing, layer-local ordering controls, quick session-only layer isolation, duplicate/delete for editable objects, bounded property editing, bounded undo/redo, bounded viewport alignment, layer visible/locked toggles, save, and reload for the validated `project_001` editor slice.
- Save deterministically syncs the replay-facing `project.json` scene from the editable internal scene files so the visible editor path and replay-facing output do not drift silently.
- Surface save/sync status in the shell with the replay-facing generated target path and the last successful sync time for the current session.
- Keep the validated `project_001` replay slice intact.
- Keep donor decoding and server integration out of this phase.

## Bounded Shortcuts
- `Ctrl/Cmd+S`: save and sync replay-facing output.
- `Ctrl/Cmd+Z`: undo.
- `Ctrl/Cmd+Shift+Z` or `Ctrl/Cmd+Y`: redo.
- `Ctrl/Cmd+Shift+N`: create a new placeholder object from the selected preset.
- `Ctrl/Cmd+D`: duplicate the selected editable object.
- `Delete` or `Backspace`: delete the selected editable object.
- `Ctrl/Cmd+Shift+G`: toggle 10px snap for drag and keyboard nudge.
- `Ctrl/Cmd+[` and `Ctrl/Cmd+]`: send backward/bring forward within the current layer.

## Files
- `main.ts`: Electron main process entry.
- `workspaceSlice.ts`: workspace/project registry loader.
- `projectSlice.ts`: validated replay slice loader.
- `renderer/index.html`: Web UI scaffold.
- `renderer/styles.css`: App styling.
