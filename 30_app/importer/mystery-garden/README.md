# Mystery Garden Importer

## Purpose
This folder holds the first deterministic importer path for `donor_001_mystery_garden`.

## Scope
- Read donor evidence and mapped findings only.
- Emit clean internal project data and a bounded import artifact.
- Preserve evidence references wherever a field is imported from donor-backed observation.
- Keep unknowns explicit instead of guessing.

## Inputs
- `10_donors/donor_001_mystery_garden/evidence/EVIDENCE_INDEX.md`
- `10_donors/donor_001_mystery_garden/reports/DONOR_REPORT_V1.md`
- `10_donors/donor_001_mystery_garden/reports/STATE_MAP.md`
- `10_donors/donor_001_mystery_garden/reports/ASSET_MAP.md`
- `10_donors/donor_001_mystery_garden/reports/ANIMATION_MAP.md`
- `10_donors/donor_001_mystery_garden/reports/UI_FLOW.md`

## Output
- `40_projects/project_001/imports/mystery-garden-import.json`

## Deterministic Rule
The importer does not inspect donor raw files and does not invent runtime facts. If a field is not evidenced, it remains marked as unknown or assumption-bound in the import artifact.

## Local Interface
Use `map-evidence-to-project.ts` as the single local mapping layer for the first importer slice.

## Command
- `npm run import:mystery-garden`

## Current Execution Model
- `cli.ts` reads `importer-manifest.json`, verifies the documented donor evidence/report inputs exist, and writes the internal import artifact.
- The mapping logic is still local and deterministic; it is maintained from evidence-backed reports rather than parsed directly from donor raw files.
- The importer output stays inside `40_projects/project_001/imports/`.

## PHASE 3 Update
- Live runtime evidence from `MG-CS-20260320-LIVE-A` now supplements the published screenshot pack.
- The importer still emits only internal clean project data under `40_projects/project_001`.
