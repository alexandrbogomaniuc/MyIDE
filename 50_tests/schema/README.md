# Schema Validation

## Purpose
- Discover projects from `40_projects/*/project.meta.json`.
- Validate discovered project metadata against the model schemas.
- Derive the registry projection from discovered folders and compare it to `40_projects/registry.json`.
- Keep `project_001` replay-slice verification passing.

## Command
- `npm run typecheck`
- `npm run validate:workspace`

## Known Gaps
- Fixture JSON still uses local shape checks documented in `fixture-schemas.md` rather than dedicated JSON Schema files.
- The validator proves folder discovery, metadata/schema conformance, and derived registry consistency, not donor math correctness.
- Live donor runtime capture is still incomplete, so the discovery pass is limited to the currently captured evidence-backed projects.
