# Schema Validation

## Purpose
- Discover projects from `40_projects/*/project.meta.json`.
- Validate discovered project metadata against the model schemas.
- Derive the registry projection from discovered folders and compare it to `40_projects/registry.json`.
- Validate `project_001/internal/scene.json`, `layers.json`, and `objects.json` against the scene contract.
- Keep `project_001` replay-slice verification passing.

## Command
- `npm run typecheck`
- `npm run sync:project_001`
- `npm run build && node dist/50_tests/schema/validate-workspace.js`
- `npm run build && node dist/50_tests/workspace/create-project-smoke.js`
- `npm run build && node dist/50_tests/workspace/edit-project-smoke.js`
- `npm run build && node dist/50_tests/workspace/drag-edit-smoke.js`
- `npm run build && node dist/50_tests/workspace/duplicate-delete-smoke.js`
- `npm run verify:workspace`

## Known Gaps
- Fixture JSON still uses local shape checks documented in `fixture-schemas.md` rather than dedicated JSON Schema files.
- The validator proves folder discovery, metadata/lifecycle conformance, and derived registry consistency, not donor math correctness.
- Live donor runtime capture is still incomplete, so the discovery pass is limited to the currently captured evidence-backed projects.
