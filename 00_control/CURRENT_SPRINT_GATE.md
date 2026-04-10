# Current Sprint Gate

## Chosen Chunk
C3 Investigation coverage board

## Why This Gate
Investigation is the entry point for new donors. This chunk is partially implemented and is the highest-impact truth surface for onboarding and promotion.

## Purpose
Make Investigation the single clear source of scan state, coverage, next profile, next operator action, and promotion readiness for a selected donor/project.

## Input
- Donor scan summary under `10_donors/<donorId>/evidence/local_only/harvest/scan-summary.json`
- Coverage artifacts (coverage summary, scenario run output)
- Project metadata linking the donor to the selected project

## Expected Behavior
- Investigation shows scan status, coverage status, and scenario status without requiring manual JSON reading.
- The panel exposes **Next Profile** and **Next Operator Action** based on the scan summary.
- Promotion readiness is explicit and matches the latest scan artifacts.
- The panel links to the relevant CLI commands when an action is needed.

## Expected Output
- Investigation UI reflects the latest donor scan state for the selected project.
- A tester can read the panel and know the next command to run.

## Automated Checks
- `npm run smoke:donor-scan-investigation`
- `npm run verify:workspace`

## Manual Checkbox Checks
- [ ] Open Investigation for a project with scan artifacts. Expected: scan state and coverage are visible. Failure: panel is empty or stale.
- [ ] When scan is incomplete, **Next Profile** is shown. Expected: a concrete profile name and command appears. Failure: no guidance is shown.
- [ ] When scan is blocked, **Next Operator Action** is shown. Expected: a concrete action and command appears. Failure: generic or missing guidance.
- [ ] When families are ready, promotion readiness is explicit. Expected: **Promote Ready Families** is visible. Failure: readiness is hidden or contradictory.

## Done Criteria
- The automated checks above pass.
- The manual checkbox checks above pass.
- Investigation truth matches the latest scan artifacts for the selected donor/project.
