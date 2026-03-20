# project_001 Before/After Demo

## Edit / Save / Sync / Reload
- Before: node.title = Title Plate at (640, 68), scaleX 1, visible true; layer.ui visible true, locked false.
- After save: node.title = Title Plate (edited) at (658, 80), scaleX 1.1, visible false; layer.ui visible false, locked true.
- After restore: node.title = Title Plate at (640, 68), scaleX 1, visible true; layer.ui visible true, locked false.

## Sync Contract
- Scene layerIds = layer.background, layer.gameplay, layer.ui, layer.overlay.
- Scene objectIds = node.backdrop, node.title, node.left-panel, node.reel-board, node.win-banner, node.bottom-bar, node.free-spins-pill, node.free-spins-modal, node.restore-chip.
- Authoritative source: 40_projects/project_001/internal/scene.json, layers.json, objects.json.
- Generated replay output changed: 40_projects/project_001/project.json.
- Save history: 40_projects/project_001/logs/editor-save-history.jsonl.

## Related Smoke
- Duplicate/delete persistence is covered by `duplicate-delete-smoke.ts`.
