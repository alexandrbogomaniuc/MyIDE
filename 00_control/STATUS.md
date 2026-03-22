# MyIDE Status

## Current Phase
- Active scope: PHASE 5M live shell canvas drag/save/reload proof on top of the existing slot-first implementation slice.
- Current milestone: keep `project_001` as the validated bounded internal scene editor slice with preset-based placeholder creation -> resize/move/edit -> snap-assisted layout -> viewport alignment aids -> layer reassignment -> layer-local ordering -> order-position cues -> previous/next layer navigation -> quick session-only isolation -> session-only viewport zoom/pan/reset/fit -> duplicate/delete -> undo/redo -> save/reload -> deterministic replay sync -> preload bridge health proof -> live Electron shell project load proof -> live Electron shell inspector edit/save/reload proof -> live Electron shell canvas drag/save/reload proof.

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
- Added a bounded placeholder preset picker so the shell can create Generic Box, Banner, Panel, Modal, and Badge / Pill layout blocks directly inside `project_001`.
- Added single-object viewport alignment aids for supported placeholder-backed objects so left/center/right/top/middle/bottom placement persists through save, reload, and deterministic replay sync.
- Added bounded object ordering controls within the current layer and a quick session-only layer isolation mode for focused layout edits.

### 2026-03-21
- Added a read-only order-position cue so the selected object now shows its current layer-local stack position directly in the shell toolbar.
- Added previous/next sibling navigation inside the selected object's current layer, including bounded toolbar actions, shortcuts, and boundary-safe status messaging.
- Added a dedicated layer-navigation smoke test and folded it into `verify:workspace` so sibling stepping stays session-only, non-dirty, and coherent after duplicate/delete plus layer reassignment.
- Added session-only viewport zoom in/out, space-or-middle-mouse pan, reset view, and fit view controls to make layout edits less cramped without mutating project files.
- Corrected canvas selection and drag math under transformed view so object edits still land in world coordinates, remain snap-compatible, and persist through save/reload plus deterministic replay sync.
- Added a viewport-controls smoke test and folded it into `verify:workspace` so transformed-view interaction stays non-dirty until an actual object edit is saved.
- Hardened the desktop preload bridge by removing the preload's dependency on the external property-panel adapter module and by exposing explicit ping, bridge-health, and renderer-ready diagnostics.
- Added a dedicated `smoke:electron-bridge` path plus a machine-readable `/tmp/myide-electron-bridge-smoke.json` artifact that proves main start, preload execution, bridge exposure, bridge calls, and `project_001` load.
- Captured a live Electron screenshot with the shell loaded, the desktop bridge healthy, and `project_001` open in the real desktop path.
- Added a dedicated `smoke:electron-live-persist` path that launches the real Electron app, loads `project_001` through the preload bridge, selects `node.title` through the renderer UI, edits `x` through the inspector path, saves, reloads, verifies replay sync, writes `/tmp/myide-electron-live-persist.json`, and restores the touched project files/logs afterward.
- Captured a visible keep-open Electron proof run showing the loaded shell with the edited object still selected and the persisted `x=657` inspector value in the live desktop path.

### 2026-03-22
- Added a dedicated `smoke:electron-live-drag` path that launches the real Electron app, loads `project_001` through the preload bridge, selects `node.bottom-bar` from the real canvas, dispatches a real pointer drag, saves, reloads, verifies replay sync, writes `/tmp/myide-electron-live-drag.json`, and restores the touched project files/logs afterward.
- Captured a visible keep-open Electron drag proof run and screenshot artifact after the same bounded drag/save/reload loop completed through the live shell path.

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
- The shell now exposes placeholder presets and viewport alignment aids inside the validated `project_001` editor slice without widening into a full scene editor.
- The shell now exposes layer-local draw-order controls and a session-only layer isolate mode inside the validated `project_001` editor slice without widening into a full scene editor.
- The shell now exposes a read-only order-position cue and previous/next selection within the current layer without turning selection navigation into persistent project state.
- The shell now exposes session-only viewport zoom/pan/reset/fit controls without turning viewport state into persistent project state.
- The shell now exposes an explicit desktop bridge health card and a deterministic Electron bridge smoke path for the validated `project_001` slice.
- The shell now proves one bounded inspector edit/save/reload persistence loop and one bounded canvas drag/save/reload persistence loop inside the real Electron app through the same preload bridge and renderer action flow that the live shell uses.
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
- Object ordering remains layer-local, and layer isolation is session-only rather than a persistent project setting.
- Previous/next layer navigation remains session-only selection state and does not cross layer boundaries.
- Live GUI proof now exists for preload bridge health, `project_001` load, one bounded in-window inspector edit/save/reload loop, and one bounded in-window canvas drag/save/reload loop, but the shell still does not yet prove broader interactive automation flows beyond those constrained persistence paths.
