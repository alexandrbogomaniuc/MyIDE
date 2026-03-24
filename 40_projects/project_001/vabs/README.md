# Project 001 VABS Workspace

This folder is the GS VABS workspace scaffold for `project_001`.

## Current Status
- Project-specific concrete slice, still stub-only.
- No finished production VABS renderer is claimed here yet.
- The current MyIDE shell/editor still authors the internal scene under `40_projects/project_001/internal`.
- VABS remains a separate delivery module for archived round history and support replay readiness.

## What Belongs Here
- archived row contract notes
- payload key notes
- renderer templates
- package-local asset notes
- deployment notes
- acceptance notes

## Project 001 Guardrails
- Treat `ROUND_ID` as mandatory.
- Keep replay deterministic for the same archived row input.
- Keep donor/source material read-only.
- Do not couple this folder into the current shell save path.

## Commands
- `npm run vabs:scaffold:project_001`
- `npm run vabs:parse:project_001`
- `npm run vabs:compare:project_001`
- `npm run vabs:replay:project_001`
- `npm run vabs:verify:project_001`

## Current Decisions
- Intended GS VABS folder name: `mysterygarden`
- Decision status: provisional but intended
- Reason: the audited GS template normalizes the real game name to a lowercase folder token before loading `common/vabs/<folder>/code.js`; for `Mystery Garden`, the intended normalized token is `mysterygarden`.

## Current Slice
- The archived row fixture is still derived, but it now carries one confirmed captured `ROUND_ID` from `MG-EV-20260320-LIVE-A-005`.
- `contract/captured-row-notes.md` records the exact captured-vs-derived status and blocker.
- `contract/captured-playerBets-row.json` is the local-only raw intake path and is gitignored.
- `contract/captured-playerBets-row.sanitized.json` is the reserved future commit-safe captured-row path.
- `contract/fixture-comparison.md` records which fields are confirmed from captured data vs derived from GS examples vs still provisional.
- The renderer folder now contains one project-specific stub package under `renderer/mysterygarden/`.
- The local replay harness now supports fixture provenance reporting and writes deterministic replay-summary artifacts under `/tmp/myide-vabs-project_001-replay/<fixture-kind>/`.
- The stub now renders a stronger replay-summary panel, but it is still not a finished production GS renderer.
