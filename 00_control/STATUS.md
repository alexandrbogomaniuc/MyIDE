# MyIDE Status

## Current Phase
- Active scope: PHASE 5F public alignment and placeholder sizing slice on top of the existing slot-first implementation slice.
- Current milestone: keep `project_001` as the validated bounded internal scene editor slice with create -> resize/move/edit -> snap-assisted layout -> layer reassignment -> duplicate/delete -> undo/redo -> save/reload -> deterministic replay sync.

## Progress Log

### 2026-03-19
- Initialized the required folder tree under the `MyIDE/` repository root.
- Wrote the control docs, reference docs, donor capture plan, and draft model schemas.
- Built the minimal desktop shell as an Electron + TypeScript scaffold with a local HTML/CSS renderer placeholder.
- Ran `npm run build` and `npm run typecheck` successfully in the repository root.

### 2026-03-20
- Captured the first official public Mystery Garden evidence session under `10_donors/donor_001_mystery_garden/evidence/capture_sessions/MG-CS-20260320-WEB-A`.
- Indexed and hashed eight public evidence items covering donor identification, published screenshots, and visible bonus states.
- Produced `DONOR_REPORT_V1.md` plus state, asset, animation, and UI flow maps with evidence IDs on donor claims.
- Extended the internal model with `messages`, `localization`, `client-config`, `rng-source`, and `state-history` schema drafts.
- Authored the first real internal project slice under `40_projects/project_001` for idle, base win, free spins trigger, free spins active, and mocked restart recovery.
- Replaced the preview placeholder with a local replay path driven only by internal project JSON.
- Captured the first real public runtime attempt under `10_donors/donor_001_mystery_garden/evidence/capture_sessions/MG-CS-20260320-LIVE-A`.
- Indexed and hashed live intro, idle, post-spin, init request/response, and runtime observation-note evidence.
- Updated donor reports and the claims ledger with live-backed facts and explicit blockers.
- Extended the importer foundation so live evidence refs flow into the Mystery Garden import manifest and mapping layer.
- Added repeatable schema validation and replay assertion commands for `project_001`.
- Added a documented open-source reuse foundation with local adapters, a third-party inventory, and one isolated `PCUI` spike.
- Established the first public-safe Git publication baseline for MyIDE with a root README, publication policy, publish checklist, and donor evidence sanitization rules.
- Moved raw donor downloads and runtime payload bodies behind a git-ignored `local_only/` evidence boundary while keeping hashes, inventories, and honest capture notes public.
- Added an executable `import:mystery-garden` CLI step and a consolidated `verify:project_001` command.
- Hardened validation so the import artifact must match deterministic importer output and current fixture shape expectations.
- Reframed MyIDE as a universal multi-project IDE while keeping the validated implementation slice slot-first and single-user.
- Introduced workspace/project terminology for donor -> internal model -> target/resulting game relationships.
- Added the workspace/project registry layer with `40_projects/registry.json`, `40_projects/project_001/project.meta.json`, and new workspace/project schemas.
- Updated the shell so the project browser is driven from the workspace bundle while `project_001` replay remains the only validated runtime slice.
- Added `validate:workspace` and `verify:workspace`, then passed the full workspace verification stack.
- Started the folder-based workspace standard so each project can own its own donor, imports, reports, runtime, fixtures, target, release, and logs folders.
- Added the project lifecycle framing so one project now maps to one donor-to-release cycle in the public architecture docs.
- Added an explicit lifecycle stage model so projects can track donorEvidence through releasePrep with honest statuses.
- Kept `project_001` compatibility explicit while the folder standard is introduced gradually.
- Added folder-based discovery and a deterministic derived `40_projects/registry.json` cache so project folders now drive workspace visibility.
- Added a planned `project_002` scaffold and a reusable create-project helper for future project folders.
- Added a shell-backed New Project workflow that creates a valid project scaffold under `40_projects/` without leaving the IDE shell.
- Extended the project browser and inspector to show donor linkage, target/resulting game metadata, verification, and lifecycle stage summaries for the selected project.
- Added a scaffold smoke test that proves create -> discover -> derived registry refresh -> shell visibility while keeping `project_001` verification intact.
- Added the first editable scene contract under `40_projects/project_001/internal/scene.json`, `layers.json`, and `objects.json`.
- Turned the shell into a visible editor-style workspace with project browser, scene explorer, preview canvas, property inspector, save, and reload actions.
- Added the first bounded object-edit loop for `displayName`, `x`, `y`, `scaleX`, `scaleY`, and `visible`.
- Added local save snapshots and save-history logging under `40_projects/project_001/logs/` as ignored local-only safety outputs.
- Added an `edit-project` smoke test that proves edit -> save -> reload -> restore for the validated `project_001` editor slice.
- Kept folder-based discovery authoritative while the shell editor continues to use internal project data only.
- Hardened the editor loop so drag/nudge, bounded undo/redo, layer visible/locked toggles, duplicate/delete, and deterministic replay sync all stay on the same internal scene authority.
- Added a visible shell sync-status surface that shows the replay-facing target path and the last successful save/sync time for the current session.
- Added an in-shell New Object action for a bounded placeholder scene object that is immediately selectable, editable, movable, saveable, reloadable, and syncable.
- Added a `create-object` smoke that proves create -> edit -> save -> sync -> reload and duplicate/delete after creation before restoring the original project state.
- Added a bounded snap-assisted layout workflow with a 10px snap toggle for drag and keyboard nudge.
- Added selected-object reassignment between unlocked layers and verified that save/reload plus deterministic sync keep the reassigned layer honest.
- Added bounded width/height editing for placeholder-backed objects so placeholder layout blocks can be resized inside the shell editor and synced into replay-facing output.

## Proven Facts
- Local reference repos are available in the developer workspace outside this repository.
- The first Mystery Garden donor evidence pack now contains both official web evidence and one live public runtime session, all hashed.
- Replay/runtime data still lives only under `40_projects/project_001`.
- The importer command, validation command, and replay assertion command now exist in `package.json`.
- The workspace validation command and consolidated workspace verification command now exist in `package.json`.
- The public repo no longer tracks raw donor downloads or live runtime payload bodies for the current donor pack.
- MyIDE now has a public-facing architecture scope doc and subagent workflow doc that keep universal architecture separate from the current slot-first implementation slice.
- The shell now exposes a real project list and selected-project summary sourced from folder discovery and the derived workspace bundle.
- The workspace standard now documents a per-project folder layout and transitional compatibility for `project_001`.
- The project lifecycle now uses explicit stage statuses rather than a single opaque phase value.
- Project folders under `40_projects/` are now the authoritative source of project existence.
- `registry.json` is now a generated/derived cache rather than the sole workspace truth.
- The shell can now create a new project scaffold and have it appear in the browser after the workspace refreshes from disk.
- The shell now exposes the first real editor-style workflow for `project_001`, including new object creation, object selection, drag/nudge, bounded property edits, duplicate/delete, save, reload, and visible sync status.
- The shell now exposes snap-assisted layout movement, selected-object layer reassignment, and bounded placeholder width/height editing inside the validated `project_001` editor slice.
- `project_001/internal/*.json` now forms the persistence target for the first editor slice while `project.json` remains the validated replay source.
- Workspace verification now validates the internal editor scene files in addition to project metadata and replay contracts.
- The shell now deterministically syncs the replay-facing generated output on save and surfaces that target path in the editor UI.

## Active Assumptions
- Electron remains an acceptable desktop container for the bounded local replay workflow.
- File-backed JSON artifacts remain sufficient through the current bounded editor hardening milestone.
- Lifecycle metadata remains file-backed JSON and intentionally small enough for hand-authored and shell-created projects.
- The visible `5x3` board is proven by live runtime observation, but the API layout fields remain non-authoritative for display layout.
- The observed `Space` key behavior is treated as an environment-observed shortcut until a dedicated input capture proves the exact command path.
- A bounded placeholder-object creation flow is sufficient for the next visible editor step without needing an asset picker yet.

## Blockers
- A live `spin` request/response pair, live free-spins entry, and live restart recovery sequence are still uncaptured.
- Animation timings and the full symbol/paytable inventory remain unresolved.
- Folder-based discovery is in place, but GUI-level shell validation is still pending in a display-capable environment.
- The New Project flow is implemented in the shell, but an interactive Electron GUI check is still pending in a display-capable environment.
- Preview hit-selection works in the shell canvas, but this remains a minimal property-edit slice rather than a full drag/drop scene editor.
- The shell can now create a new placeholder object, but there is still no asset picker or richer object-type creation flow yet.
- Placeholder sizing is now bounded to placeholder-backed objects only; asset-backed objects still do not expose a broader resizing workflow.
