# project_001 Before/After Demo

## Create / Drag / Undo / Redo / Save / Sync / Reload
- Preset/object: Banner -> node.placeholder.banner-01.
- Pointer path: New Placeholder -> canvas drag by (+36, +24) -> Undo -> Redo.
- Original bounds: layer.ui at (370, 72) sized 540x120.
- Drag result: layer.ui at (406, 96).
- Undo result: layer.ui back at (370, 72).
- Final redone bounds after save/sync/reload: layer.ui at (406, 96) sized 540x120.
- Replay-facing/generated file changed: 40_projects/project_001/project.json.

## Notes
- The undo/redo proof uses the real live Electron shell path, the real canvas pointer drag path, and the real toolbar undo/redo actions, not direct file edits.
- The smoke restores the touched project files and logs after verifying the final redone result.
