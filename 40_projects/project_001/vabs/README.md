# Project 001 VABS Workspace

This folder is the GS VABS workspace scaffold for `project_001`.

## Current Status
- Scaffold only.
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
- `npm run vabs:verify:project_001`

## Open Decision
- Final GS VABS folder name for `project_001` is still pending a real target-environment naming lock. Do not guess and ship it blindly.
