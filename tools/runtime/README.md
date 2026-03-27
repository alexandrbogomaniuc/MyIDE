# Runtime Mirror Tooling

Local-first helper for the bounded `project_001` Mystery Garden runtime mirror slice.

## Current scope
- `project_001` only
- HTML5 Mystery Garden runtime only
- bounded partial local mirror only
- raw donor files stay read-only

## Command
- `npm run runtime:mirror:project_001`

## Output
- `40_projects/project_001/runtime/local-mirror/manifest.json`
- `40_projects/project_001/runtime/local-mirror/files/`

## Honest limit
- This tool captures the strongest grounded local mirror we can support today.
- It does **not** create or claim a full standalone local donor runtime package.
