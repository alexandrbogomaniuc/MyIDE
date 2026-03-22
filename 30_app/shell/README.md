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
- Support object selection from the list and canvas, direct canvas move, snap-assisted drag and nudge, selected-object layer reassignment, preset-based placeholder object creation, bounded placeholder width/height editing, layer-local ordering controls, a read-only order-position cue, previous/next sibling selection within the current layer, quick session-only layer isolation, session-only viewport zoom/pan/reset/fit controls, duplicate/delete for editable objects, bounded property editing, bounded undo/redo, bounded viewport alignment, layer visible/locked toggles, save, and reload for the validated `project_001` editor slice.
- Save deterministically syncs the replay-facing `project.json` scene from the editable internal scene files so the visible editor path and replay-facing output do not drift silently.
- Surface save/sync status in the shell with the replay-facing generated target path and the last successful sync time for the current session.
- Surface desktop bridge health in the shell, including preload path presence, preload execution, renderer handshake status, and the currently loaded project when the Electron preload bridge is healthy.
- Support a dedicated Electron bridge smoke mode that verifies main start, preload execution, `window.myideApi`, bridge calls, and `project_001` load while writing a machine-readable artifact to `/tmp/myide-electron-bridge-smoke.json`.
- Support a dedicated Electron live-persist smoke mode that uses the real renderer action flow to load `project_001`, select an editable object, edit it through the inspector path, save, reload, verify replay-facing sync, and write `/tmp/myide-electron-live-persist.json` while the outer smoke harness restores the touched project files and logs.
- Support a dedicated Electron live-drag smoke mode that uses the real renderer pointer path to load `project_001`, select an editable canvas object, drag it, save, reload, verify replay-facing sync, and write `/tmp/myide-electron-live-drag.json` while the outer smoke harness restores the touched project files and logs.
- Support a dedicated Electron live-create-drag smoke mode that uses the real renderer preset selection + new-placeholder action + pointer drag path to load `project_001`, create a placeholder object, drag it, save, reload, verify replay-facing sync, and write `/tmp/myide-electron-live-create-drag.json` while the outer smoke harness restores the touched project files and logs.
- Support a dedicated Electron live-duplicate-delete smoke mode that uses the real renderer preset selection + new-placeholder action + duplicate/delete UI path to load `project_001`, create a placeholder object, duplicate it, delete one of the two, save, reload, verify replay-facing sync, and write `/tmp/myide-electron-live-duplicate-delete.json` while the outer smoke harness restores the touched project files and logs.
- Support a dedicated Electron live-reorder smoke mode that uses the real renderer preset selection + new-placeholder action + layer-ordering UI path to load `project_001`, create a placeholder object, reorder it within `layer.ui`, save, reload, verify replay-facing sync, and write `/tmp/myide-electron-live-reorder.json` while the outer smoke harness restores the touched project files and logs.
- Support a dedicated Electron live-layer-reassign smoke mode that uses the real renderer preset selection + new-placeholder action + Assigned Layer inspector UI path to load `project_001`, create a placeholder object, move it from `layer.ui` to `layer.overlay`, save, reload, verify replay-facing sync, and write `/tmp/myide-electron-live-layer-reassign.json` while the outer smoke harness restores the touched project files and logs.
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
- `Ctrl/Cmd+=` / `Ctrl/Cmd+-`: zoom in or out.
- `Ctrl/Cmd+0`: reset the viewport to 100% at the default origin.
- `Ctrl/Cmd+[` and `Ctrl/Cmd+]`: send backward/bring forward within the current layer.
- `Ctrl/Cmd+Shift+[` and `Ctrl/Cmd+Shift+]`: select previous/next object within the current layer (session-only, non-persistent).
- `Space+drag` or middle mouse drag: pan the viewport (session-only, non-persistent).

## Files
- `main.ts`: Electron main process entry.
- `workspaceSlice.ts`: workspace/project registry loader.
- `projectSlice.ts`: validated replay slice loader.
- `renderer/index.html`: Web UI scaffold.
- `renderer/styles.css`: App styling.
