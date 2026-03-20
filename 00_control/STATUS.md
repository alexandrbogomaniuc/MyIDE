# MyIDE Status

## Current Phase
- Active scope: PHASE 4B folder-based multi-project workspace alignment on top of the existing slot-first implementation slice.
- Current milestone: make project folders the discoverable unit of the workspace while keeping the only validated implementation slice as `donor_001_mystery_garden`.

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
- Kept `project_001` compatibility explicit while the folder standard is introduced gradually.
- Added folder-based discovery and a deterministic derived `40_projects/registry.json` cache so project folders now drive workspace visibility.
- Added a planned `project_002` scaffold and a reusable create-project helper for future project folders.

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
- Project folders under `40_projects/` are now the authoritative source of project existence.
- `registry.json` is now a generated/derived cache rather than the sole workspace truth.

## Active Assumptions
- Electron remains an acceptable desktop container for the bounded local replay workflow.
- File-backed JSON artifacts remain sufficient through the current PHASE 4B workspace-alignment milestone.
- The visible `5x3` board is proven by live runtime observation, but the API layout fields remain non-authoritative for display layout.
- The observed `Space` key behavior is treated as an environment-observed shortcut until a dedicated input capture proves the exact command path.

## Blockers
- A live `spin` request/response pair, live free-spins entry, and live restart recovery sequence are still uncaptured.
- Animation timings and the full symbol/paytable inventory remain unresolved.
- Folder-based discovery is in place, but GUI-level shell validation is still pending in a display-capable environment.
