# MyIDE

MyIDE is a universal local-first IDE for multiple game projects over time, with a desktop web UI for collecting donor evidence, reconstructing each project into a clean internal model, replaying that model locally, and preparing a project-specific target or resulting game path.

## Current Phase
- Current milestone: PHASE 5T live shell create -> drag -> undo -> redo -> save -> reload proof slice on top of the folder-based multi-project workspace.
- Active validated donor slice: `donor_001_mystery_garden`.
- Proven replay scope: one bounded Mystery Garden slice driven only by internal project data under `40_projects/project_001`.
- Proven editor scope: open `project_001`, inspect the internal scene/layer/object list, create placeholder objects from a small preset set, drag/nudge with optional snap, align supported placeholder-backed objects to viewport edges/centers, reassign editable objects between unlocked layers, edit bounded properties including placeholder width/height, reorder editable objects within a layer, read the selected object's order position within its layer, step to the previous/next object within that layer, use quick session-only layer isolation for focused editing, zoom/pan/reset/fit the viewport without dirtying project state, duplicate/delete, undo/redo, save, reload, prove deterministic sync updates the replay-facing `project.json`, prove the live Electron shell can load `project_001` through a working preload bridge, prove one bounded renderer-driven inspector edit/save/reload cycle through the real Electron shell path, prove one bounded live-shell canvas drag/save/reload cycle for an existing object, prove one bounded live-shell create -> drag -> save -> reload cycle for a newly created placeholder object, prove one bounded live-shell create -> duplicate/delete -> save -> reload cycle for a newly created placeholder object, prove one bounded live-shell create -> reorder -> save -> reload cycle for a newly created placeholder object, prove one bounded live-shell create -> layer reassignment -> save -> reload cycle for a newly created placeholder object, prove one bounded live-shell create -> resize -> save -> reload cycle for a newly created placeholder object, prove one bounded live-shell create -> align -> save -> reload cycle for a newly created placeholder object, and prove one bounded live-shell create -> drag -> undo -> redo -> save -> reload cycle for a newly created placeholder object through the same real shell path.
- GS VABS support now starts as a separate strategy/scaffold/validation module on top of that editor. It does not replace the current internal-scene authoring flow.

## Core Rules
- The product architecture is universal and multi-project.
- One project equals one donor-to-release cycle.
- The current implementation slice is slot-only.
- V1 is single-user.
- The editable source of truth is the internal clean project model, not donor atlas/json/runtime files.
- Raw donor material remains read-only evidence and is not read by preview runtime.
- Public git excludes raw donor/runtime downloads when hashes and sanitized notes are sufficient.

## Public Repo Contents
- Control docs, schemas, importer code, shell code, replay fixtures, workspace registry files, and validation tooling.
- Evidence indexes, hashes, inventories, and honest capture notes.
- Sanitized donor reports with evidence IDs.
- Project metadata that explains donor -> internal model -> target/resulting game relationships.
- Standard project folder templates and lifecycle docs for adding new projects by folder.

## Public Repo Exclusions
- Raw donor downloads and runtime payload bodies.
- Session-specific runtime identifiers, tokens, cookies, and private local notes.
- Local-only capture artifacts that are unnecessary for architecture validation.

Public publication rules are defined in [`00_control/PUBLIC_REPO_POLICY.md`](./00_control/PUBLIC_REPO_POLICY.md).

## Local Verification
- `npm run build`
- `npm run typecheck`
- `npm run generate:registry`
- `npm run manual:status`
- `npm run manual:prepare:project_001`
- `npm run manual:bug-context`
- `npm run manual:bug-bundle`
- `npm run manual:reset:project_001`
- `npm run vabs:scaffold:project_001`
- `npm run vabs:intake:project_001`
- `npm run vabs:sanitize:project_001`
- `npm run vabs:verify:captured:project_001`
- `npm run vabs:intake:session:project_001`
- `npm run vabs:sanitize:session:project_001`
- `npm run vabs:verify:captured-session:project_001`
- `npm run vabs:verify:project_001`
- `npm run vabs:compare:project_001`
- `npm run vabs:export:project_001`
- `npm run vabs:verify:export:project_001`
- `npm run vabs:preview:project_001`
- `npm run vabs:mock:project_001`
- `npm run vabs:smoke:project_001`
- `npm run vabs:replay:project_001`
- `npm run publication:preflight`
- `npm run publication:compare`
- `npm run automation:status-snapshot`
- `npm run automation:check-freshness`
- `npm run handoff:refresh`
- `npm run handoff:verify`
- `npm run create:project -- --config 40_projects/templates/project-template/project.meta.json.example --project-root 40_projects/project_003`
- `npm run smoke:create-project`
- `npm run smoke:edit-project`
- `npm run smoke:create-object`
- `npm run smoke:order-isolate`
- `npm run smoke:layer-navigation`
- `npm run smoke:viewport-controls`
- `npm run smoke:electron-bridge`
- `npm run smoke:electron-live-persist`
- `npm run smoke:electron-live-drag`
- `npm run smoke:electron-live-create-drag`
- `npm run smoke:electron-live-duplicate-delete`
- `npm run smoke:electron-live-reorder`
- `npm run smoke:electron-live-layer-reassign`
- `npm run smoke:electron-live-resize`
- `npm run smoke:electron-live-align`
- `npm run smoke:electron-live-undo-redo`
- `npm run import:mystery-garden`
- `npm run validate:workspace`
- `npm run verify:workspace`
- `npm run verify:project_001`

## Publication Control
- Use `npm run publication:preflight` to confirm whether this host can publish right now instead of assuming the answer.
- [`00_control/PUBLICATION_PLAYBOOK.md`](./00_control/PUBLICATION_PLAYBOOK.md) explains the repeatable publication and handoff flow.
- [`00_control/LOCAL_PUBLIC_GAP.md`](./00_control/LOCAL_PUBLIC_GAP.md) is the tracked snapshot generated by `npm run publication:compare`.
- Before any automated project report, run `npm run automation:status-snapshot` and require `npm run automation:check-freshness` to return `CURRENT`.
- Do not send cached or previously copied status as if it were current, and if no new substantive workstream has completed since the last outbound report, say `no new substantive workstream` plainly.

## Manual QA
- [`00_control/MANUAL_TEST_PLAYBOOK.md`](./00_control/MANUAL_TEST_PLAYBOOK.md) is the plain-English tester checklist.
- [`00_control/MANUAL_TEST_MATRIX.md`](./00_control/MANUAL_TEST_MATRIX.md) is the fast pass/fail matrix.
- [`00_control/MANUAL_BUG_TEMPLATE.md`](./00_control/MANUAL_BUG_TEMPLATE.md) is the copy/paste bug report format.
- The current shell is a bounded internal scene editor for `40_projects/project_001/internal`; donor evidence under `10_donors/` now appears in a read-only donor evidence browser with item-level cards, lightweight previews where local artifacts already exist, copyable refs/paths, selected-object linkage drill-down, and small navigation helpers back to the internal scene, but it remains reference material rather than directly editable assets in this build.
- `npm run manual:prepare:project_001` resets `project_001` to the current tracked baseline, refreshes derived/synced outputs, validates the project slice, and tells the tester what to run next.
- `npm run manual:status` prints the exact local/public/handoff context the tester is using.
- `npm run manual:bug-context` prints a paste-friendly bug context block with current local/public/handoff details.
- `npm run manual:bug-bundle` creates a timestamped bug-report folder outside the repo under `/Users/alexb/Documents/Dev/MyIDE_manual_reports/`, prefilled with `BUG.md`, current `context.txt`, and an `attachments/` folder.
- `npm run manual:reset:project_001` restores `project_001` to the current tracked local baseline and clears known local-only editor logs.

## GS VABS Module
- [`00_control/VABS_MODULE_STRATEGY.md`](./00_control/VABS_MODULE_STRATEGY.md) explains how GS VABS fits into MyIDE as an additional module.
- [`00_control/VABS_DELIVERY_CHECKLIST.md`](./00_control/VABS_DELIVERY_CHECKLIST.md) is the delivery checklist for per-project archived round history support.
- `40_projects/project_001/vabs/` is now the project-local VABS scaffold for `project_001`.
- `project_001` now has one concrete project-specific VABS slice: an intended folder-name decision, a stronger derived archived-row fixture, a derived session-level `playerBets[]` fixture, explicit captured-row and captured-session intake paths, a parser/compare harness, a local replay harness, a local GS-style export package path, a local export preview dry-run, a local page-shell mock plus browser smoke path, and a replay-summary stub package under `40_projects/project_001/vabs/renderer/mysterygarden/`.
- The shell now exposes that VABS lane as a compact read-only project panel so operators can see fixture truth, current blocker, and the exact next capture commands without changing the editor workflow.
- `npm run vabs:scaffold:project_001`, `npm run vabs:intake:project_001`, `npm run vabs:sanitize:project_001`, `npm run vabs:verify:captured:project_001`, `npm run vabs:intake:session:project_001`, `npm run vabs:sanitize:session:project_001`, `npm run vabs:verify:captured-session:project_001`, `npm run vabs:verify:project_001`, `npm run vabs:export:project_001`, `npm run vabs:verify:export:project_001`, `npm run vabs:preview:project_001`, `npm run vabs:mock:project_001`, `npm run vabs:smoke:project_001`, and `npm run vabs:replay:project_001` are local-first scaffold/intake/sanitize/verification/export/preview/mock/smoke/replay helpers.
- `npm run vabs:parse:project_001` prints the parsed row-contract summary for the current fixture.
- `npm run vabs:compare:project_001` prints the current captured-vs-derived comparison view for `project_001`.
- `project_001` now tracks captured-vs-derived truth explicitly: no full captured archived `playerBets` row or `playerBets[]` session is stored yet, but the current derived fixture carries one confirmed live `ROUND_ID` from `MG-EV-20260320-LIVE-A-005`, the repo now reserves both gitignored raw captured-row/session intake paths and future commit-safe sanitized captured row/session paths, and `auto` selection only promotes sanitized captured data.
- GS-VABS-L hard-stops the lane there for now: until one real sanitized archived row or session exists, the repo should use the derived proof chain plus the operator capture request docs instead of adding more generic VABS scaffolding.
- The next operator step is still one real sanitized archived row or session drop through the existing intake/sanitize/verify flow; the new app panel only makes that blocker visible in the project workflow.
- `npm run vabs:replay:project_001` writes deterministic replay-summary artifacts to `/tmp/myide-vabs-project_001-replay/<fixture-kind>/`.
- `npm run vabs:export:project_001` writes a deterministic GS-style local package to `/tmp/myide-vabs-project_001-export/common/vabs/mysterygarden/`.
- `npm run vabs:preview:project_001` proves that exported package can be exercised locally without JSP hosting or live GS deployment.
- `npm run vabs:mock:project_001` writes a browser-facing local shell mock under `/tmp/myide-vabs-project_001-shell-mock/<fixture-kind>/`.
- `npm run vabs:smoke:project_001` opens that mock through a headless local browser, confirms a non-default session row was selected, and confirms the exported stub updated inside the mock shell.
- These export, preview, mock, and smoke outputs are local validation artifacts, not production-ready GS deployment proof.
- VABS in the current repo is now at a stronger project-specific concrete replay slice for `project_001`, but it still does not claim a finished production GS renderer.

## Current Boundaries
- No production server adapter implementation yet.
- No reskinning yet.
- No full editor platform yet beyond the bounded internal scene/object editor slice.
- No non-slot or multi-user implementation yet.
