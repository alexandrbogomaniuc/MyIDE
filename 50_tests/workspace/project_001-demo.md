# project_001 Before/After Demo

## Live Shell Persist Proof
- Project id: project_001.
- Object id: node.title.
- Bridge path: Electron main -> preload `dist/30_app/shell/preload.js` -> renderer `window.myideApi`.
- Edit path: scene explorer selection -> inspector `x` field edit -> Save Scene Changes -> Reload From Disk.
- Before: `node.title.x = 640`.
- After live-shell save/reload: `node.title.x = 657`.
- Replay-facing/generated file changed during the smoke: `40_projects/project_001/project.json`.

## Live Shell Canvas Drag Proof
- Project id: project_001.
- Object id: node.bottom-bar.
- Bridge path: Electron main -> preload `dist/30_app/shell/preload.js` -> renderer `window.myideApi`.
- Drag path: real canvas pointerdown on `node.bottom-bar` -> pointermove by `(20, -12)` at reset view with snap off -> pointerup -> Save Scene Changes -> Reload From Disk.
- Before: `node.bottom-bar = (64, 620)`.
- After live-shell drag/save/reload: `node.bottom-bar = (84, 608)`.
- Replay-facing/generated file changed during the smoke: `40_projects/project_001/project.json`.

## Live Shell Create -> Drag Proof
- Project id: project_001.
- Preset: `Banner`.
- Object id: node.placeholder.banner-01.
- Bridge path: Electron main -> preload `dist/30_app/shell/preload.js` -> renderer `window.myideApi`.
- UI path: placeholder preset selector -> `New Banner` -> real canvas pointerdown/move/up -> Save Scene Changes -> Reload From Disk.
- View state during proof: reset view, zoom `1`, pan `(0, 0)`, snap `Off`.
- Created at: `(370, 72)`.
- After live-shell create->drag/save/reload: `(406, 96)`.
- Replay-facing/generated file changed during the smoke: `40_projects/project_001/project.json`.

## Live Shell Create -> Duplicate/Delete Proof
- Project id: project_001.
- Preset: `Banner`.
- Created object id: `node.placeholder.banner-01`.
- Duplicate object id: `node.placeholder.banner-01-copy-01`.
- Bridge path: Electron main -> preload `dist/30_app/shell/preload.js` -> renderer `window.myideApi`.
- UI path: placeholder preset selector -> `New Banner` -> `Duplicate Object` -> `Delete Object` on the selected duplicate -> Save Scene Changes -> Reload From Disk.
- Surviving object after reload: `node.placeholder.banner-01` at `(370, 72)`.
- Deleted object after reload: `node.placeholder.banner-01-copy-01` absent from both internal editable data and replay-facing output.
- Replay-facing/generated file changed during the smoke: `40_projects/project_001/project.json`.

## Proof Artifacts
- Machine-readable smoke artifact: `/tmp/myide-electron-live-persist.json`.
- Visible live-shell screenshot: `/tmp/myide-phase5l-live-top.png`.
- Machine-readable drag smoke artifact: `/tmp/myide-electron-live-drag.json`.
- Visible live-shell drag screenshot: `/tmp/myide-phase5m-live.png`.
- Machine-readable create-drag smoke artifact: `/tmp/myide-electron-live-create-drag.json`.
- Visible live-shell create-drag screenshot: `/tmp/myide-phase5n-live.png`.
- Machine-readable duplicate-delete smoke artifact: `/tmp/myide-electron-live-duplicate-delete.json`.
- Visible live-shell duplicate-delete screenshot: `/tmp/myide-phase5o-live.png`.

## Notes
- The live-shell smokes restore the touched `project_001` internal files, replay-facing `project.json`, and local editor logs after verification so the repository returns to baseline.
- This proof set is bounded to one real shell inspector edit/save/reload loop, one real shell existing-object canvas drag/save/reload loop, one real shell create->drag->save->reload loop for a new placeholder, and one real shell create->duplicate/delete->save->reload loop for a new placeholder; it does not claim broader GUI automation than what was actually exercised.
