# project_001 Before/After Demo

## Preset / Align / Save / Sync / Reload
- Created preset object id: node.placeholder.banner-01.
- Preset: banner.
- Default values: placeholderRef = placeholder.shape.banner, layerId = layer.ui, x = 370, y = 72, width = 540, height = 120, scaleX = 1, visible = true.
- After save + sync + reload: placeholderRef = placeholder.shape.banner, layerId = layer.ui, x = 631, y = 588, width = 564, height = 132, scaleX = 1.15, visible = true.

## Duplicate / Delete After Creation
- Duplicate id: node.placeholder.banner-01-copy.
- The duplicate was saved, reloaded, then deleted cleanly while the original created preset object remained on layer.ui until restore.

## Sync Contract
- Authoritative source: 40_projects/project_001/internal/scene.json, layers.json, objects.json.
- Generated replay output changed: 40_projects/project_001/project.json.
- Save history: 40_projects/project_001/logs/editor-save-history.jsonl.
