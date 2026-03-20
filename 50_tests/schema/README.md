# Schema Validation

## Purpose
- Validate the workspace registry plus `project_001` against the current MyIDE schemas.
- Parse the project fixtures, runtime mocks, and importer artifact.
- Confirm the importer artifact still matches the deterministic importer output.
- Fail loudly if the replay slice drifts away from the current model contracts.

## Command
- `npm run validate:workspace`
- `npm run validate:project_001`
- `npm run verify:workspace`
- `npm run verify:project_001`

## Known Gaps
- Fixture JSON still uses local shape checks documented in `fixture-schemas.md` rather than dedicated JSON Schema files.
- Validation proves structure and replay boundaries, not donor math correctness.
