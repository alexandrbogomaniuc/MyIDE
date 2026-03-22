# project_001 Before/After Demo

## Viewport Controls / Save / Sync / Reload
- Object id: node.win-banner.
- View state (session-only): zoom 1 -> 1.5, pan (-320, -180) -> (-404, -132), fit (85.333, 48), reset (1, 0, 0).
- Original world position: (640, 598).
- Final world position after transformed-view drag projection and save/sync/reload: (670, 578).
- Replay-facing/generated file changed: 40_projects/project_001/project.json.

## Notes
- Zoom/pan/fit/reset are session-only view operations and do not dirty persistent project data by themselves.
- Object position edits derived from transformed view coordinates persist through internal save and replay sync.
