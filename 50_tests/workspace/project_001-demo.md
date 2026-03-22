# project_001 Before/After Demo

## Live Shell Create -> Layer Reassign Proof
- Project id: `project_001`.
- Preset: `Banner`.
- Object id: `node.placeholder.banner-01`.
- Bridge path: Electron main -> preload `dist/30_app/shell/preload.js` -> renderer `window.myideApi`.
- UI path: placeholder preset selector -> `New Banner` -> inspector `Assigned Layer = layer.overlay` -> `Save Scene Changes` -> `Reload From Disk`.
- Source layer before reassignment: `layer.ui` with `node.win-banner`, `node.bottom-bar`, `node.free-spins-pill`, `node.placeholder.banner-01` (`4 of 4`).
- Target layer after save/reload: `layer.overlay` with `node.free-spins-modal`, `node.restore-chip`, `node.placeholder.banner-01` (`3 of 3`).
- Replay-facing/generated file changed during the smoke: `40_projects/project_001/project.json`.

## Proof Artifacts
- Machine-readable layer-reassign smoke artifact: `/tmp/myide-electron-live-layer-reassign.json`.
- Visible live-shell layer-reassign screenshot: `/tmp/myide-phase5q-live.png`.

## Notes
- The live-shell smoke restores the touched `project_001` internal files, replay-facing `project.json`, and local editor logs after verification so the repository returns to baseline.
- This proof is bounded to one real shell create -> layer reassignment -> save -> reload loop for a new placeholder object; it does not claim broader GUI automation than what was actually exercised.
