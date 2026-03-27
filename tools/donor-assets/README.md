# Donor Assets

Local-first tooling for the donor image import slice and the first bounded runtime static override slice.

## Current Scope
- `project_001` only
- static donor images only
- supported formats: `png`, `webp`, `jpg`, `jpeg`, `svg`
- raw donor files stay read-only
- project-local runtime overrides stay local to `40_projects/project_001/overrides/`

## Command
- `npm run donor-assets:index:project_001`
- `npm run donor-assets:verify-override:project_001`

## Output
- Local index: `40_projects/project_001/donor-assets/local-index.json`
- Local runtime override manifest: `40_projects/project_001/overrides/runtime-asset-overrides.json`
- Local runtime override files: `40_projects/project_001/overrides/runtime-assets/`

The donor index and runtime override outputs are local-only and intentionally gitignored. They record importable donor image metadata plus bounded project-local runtime override state for the current machine without publishing raw donor binaries or mutating donor source files.
