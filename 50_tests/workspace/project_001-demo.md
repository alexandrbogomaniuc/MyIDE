# project_001 Before/After Demo

## Live Shell Persist Proof
- Project id: project_001.
- Object id: node.title.
- Bridge path: Electron main -> preload `dist/30_app/shell/preload.js` -> renderer `window.myideApi`.
- Edit path: scene explorer selection -> inspector `x` field edit -> Save Scene Changes -> Reload From Disk.
- Before: `node.title.x = 640`.
- After live-shell save/reload: `node.title.x = 657`.
- Replay-facing/generated file changed during the smoke: `40_projects/project_001/project.json`.

## Proof Artifacts
- Machine-readable smoke artifact: `/tmp/myide-electron-live-persist.json`.
- Visible live-shell screenshot: `/tmp/myide-phase5l-live-top.png`.

## Notes
- The live-shell smoke restores the touched `project_001` internal files, replay-facing `project.json`, and local editor logs after verification so the repository returns to baseline.
- This proof is bounded to one real shell edit/save/reload loop for the validated `project_001` slice; it does not claim broader GUI automation than what was actually exercised.
