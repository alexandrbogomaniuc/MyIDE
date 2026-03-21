# project_001 Before/After Demo

## Order + Isolate / Save / Sync / Reload
- Object id: node.win-banner.
- Original layer/order context: layer.ui index 0 of 3 (node.win-banner > node.bottom-bar > node.free-spins-pill).
- Final saved layer/order context: layer.ui index 2 of 3 (node.bottom-bar > node.free-spins-pill > node.win-banner).
- Previous / next navigation relation after restore: node.win-banner <- node.bottom-bar -> node.free-spins-pill within layer.ui.
- Isolate mode used: layer.ui solo view (session-only, non-persistent, non-dirty).
- Replay-facing/generated file changed: 40_projects/project_001/project.json.

## Notes
- Ordering is layer-local only.
- Isolate mode is a render-time filter and does not mutate saved layer visibility.
