# Internal

## Purpose
- Internal clean model roots for `project_001`.
- This folder now hosts the first editable scene slice for the visual editor:
  - `scene.json` for scene header and references
  - `layers.json` for layer stack
  - `objects.json` for object placement

## Compatibility
- The editable scene files are the persistence target for save/update flows.
- `project.json` remains the replay source of truth for the validated local slice.
- The new internal scene files are additive and must not break replay validation.
- Do not point internal data back to donor raw files.

## Notes
- The editable scene slice is intentionally minimal and slot-first.
- The contract is small enough for the first editor pass, but it is not the full editor model.
