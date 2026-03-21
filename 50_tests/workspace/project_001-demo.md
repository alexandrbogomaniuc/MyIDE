# project_001 Before/After Demo

## Preset / Align / Save / Sync / Reload
- Created preset object id: node.placeholder.generic-box-01.
- Default values: placeholderRef = placeholder.shape.generic-box, layerId = layer.gameplay, x = 530, y = 160, width = 220, height = 140, scaleX = 1, visible = true.
- After save + sync + reload: placeholderRef = placeholder.shape.generic-box, layerId = layer.ui, x = 560, y = 180, width = 244, height = 152, scaleX = 1.15, visible = false.

## Duplicate / Delete After Creation
- Duplicate id: node.placeholder.generic-box-01-copy.
- The duplicate was saved, reloaded, then deleted cleanly while the original created object remained on layer.ui until restore.

## Sync Contract
- Authoritative source: 40_projects/project_001/internal/scene.json, layers.json, objects.json.
- Generated replay output changed: 40_projects/project_001/project.json.
- Save history: 40_projects/project_001/logs/editor-save-history.jsonl.
