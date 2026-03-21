# project_001 Before/After Demo

## Desktop Bridge Proof
- Project id: project_001.
- Loaded object example: node.title.
- View state in the live shell: 100% zoom at the default origin after the renderer-ready bridge handshake.
- Bridge health proof: preload path `dist/30_app/shell/preload.js`, preload executed `true`, renderer ready `true`, selected project `project_001`, workspace projects `2`.
- Live GUI proof: the Electron shell showed `Desktop bridge healthy` while the Mystery Garden Replay Slice project browser, canvas, and inspector were all loaded from the live preload bridge path.
- Replay-facing/generated file referenced by the loaded shell path: 40_projects/project_001/project.json.

## Notes
- The bridge-health card is session-only UI state and does not dirty project files by itself.
- The deterministic smoke artifact for this proof is written to `/tmp/myide-electron-bridge-smoke.json`.
- Live screenshot captured during this run: `/tmp/myide-phase5k-live.png`.
