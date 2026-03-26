# Donor Assets

Local-first tooling for the first donor image import slice.

## Current Scope
- `project_001` only
- static donor images only
- supported formats: `png`, `webp`, `jpg`, `jpeg`, `svg`
- raw donor files stay read-only

## Command
- `npm run donor-assets:index:project_001`

## Output
- Local index: `40_projects/project_001/donor-assets/local-index.json`

The index is local-only and intentionally gitignored. It records importable donor image metadata for the current machine without publishing raw donor binaries.
