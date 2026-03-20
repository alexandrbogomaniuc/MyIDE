# project_001 Before/After Demo

## Create / Snap / Reassign / Save / Sync / Reload
- Created object id: node.placeholder-01.
- Default values: displayName = Placeholder Object 01, layerId = layer.gameplay, x = 550, y = 175, scaleX = 1, visible = true.
- After save + sync + reload: displayName = Placeholder Object 01 (edited), layerId = layer.ui, x = 580, y = 190, scaleX = 1.15, visible = false.

## Duplicate / Delete After Creation
- Duplicate id: node.placeholder-01-copy.
- The duplicate was saved, reloaded, then deleted cleanly while the original created object remained on layer.ui until restore.

## Sync Contract
- Authoritative source: 40_projects/project_001/internal/scene.json, layers.json, objects.json.
- Generated replay output changed: 40_projects/project_001/project.json.
- Save history: 40_projects/project_001/logs/editor-save-history.jsonl.
