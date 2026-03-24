# GS VABS Tooling

These commands manage the project-local GS VABS scaffold without coupling VABS into the current editor runtime.

## Commands
- `npm run vabs:scaffold:project_001`
  - Ensure the required `40_projects/project_001/vabs/` folder and file scaffold exists.
  - Create only missing scaffold files.
- `npm run vabs:parse:project_001`
  - Parse the concrete `playerBets` contract fixture for `project_001`.
  - Print the target folder decision, parsed `ROUND_ID`, and payload keys.
- `npm run vabs:verify:project_001`
  - Verify the scaffold is present.
  - Check contract docs exist.
  - Check the folder-name mapping is present.
  - Check `ROUND_ID` is documented and parses numerically.
  - Check required `betData` and `servletData` keys exist in the row fixture.
  - Check the project-specific renderer stub package exists.
  - Check the acceptance checklist exists.

## Scope
- Local-first.
- Deterministic.
- Scaffold and verification only.
- No production VABS renderer build in this phase.
