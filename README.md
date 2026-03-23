# MyIDE

MyIDE is a universal local-first IDE for multiple game projects over time, with a desktop web UI for collecting donor evidence, reconstructing each project into a clean internal model, replaying that model locally, and preparing a project-specific target or resulting game path.

## Current Phase
- Current milestone: PHASE 5T live shell create -> drag -> undo -> redo -> save -> reload proof slice on top of the folder-based multi-project workspace.
- Active validated donor slice: `donor_001_mystery_garden`.
- Proven replay scope: one bounded Mystery Garden slice driven only by internal project data under `40_projects/project_001`.
- Proven editor scope: open `project_001`, inspect the internal scene/layer/object list, create placeholder objects from a small preset set, drag/nudge with optional snap, align supported placeholder-backed objects to viewport edges/centers, reassign editable objects between unlocked layers, edit bounded properties including placeholder width/height, reorder editable objects within a layer, read the selected object's order position within its layer, step to the previous/next object within that layer, use quick session-only layer isolation for focused editing, zoom/pan/reset/fit the viewport without dirtying project state, duplicate/delete, undo/redo, save, reload, prove deterministic sync updates the replay-facing `project.json`, prove the live Electron shell can load `project_001` through a working preload bridge, prove one bounded renderer-driven inspector edit/save/reload cycle through the real Electron shell path, prove one bounded live-shell canvas drag/save/reload cycle for an existing object, prove one bounded live-shell create -> drag -> save -> reload cycle for a newly created placeholder object, prove one bounded live-shell create -> duplicate/delete -> save -> reload cycle for a newly created placeholder object, prove one bounded live-shell create -> reorder -> save -> reload cycle for a newly created placeholder object, prove one bounded live-shell create -> layer reassignment -> save -> reload cycle for a newly created placeholder object, prove one bounded live-shell create -> resize -> save -> reload cycle for a newly created placeholder object, prove one bounded live-shell create -> align -> save -> reload cycle for a newly created placeholder object, and prove one bounded live-shell create -> drag -> undo -> redo -> save -> reload cycle for a newly created placeholder object through the same real shell path.

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
- `npm run publication:preflight`
- `npm run publication:compare`
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
- This host can measure the LOCAL vs PUBLIC gap and refresh the external handoff package, but GitHub HTTPS push may still fail here until credentials are configured.
- [`00_control/PUBLICATION_PLAYBOOK.md`](./00_control/PUBLICATION_PLAYBOOK.md) explains the repeatable publication and handoff flow.
- [`00_control/LOCAL_PUBLIC_GAP.md`](./00_control/LOCAL_PUBLIC_GAP.md) is the tracked snapshot generated by `npm run publication:compare`.

## Current Boundaries
- No production server adapter implementation yet.
- No reskinning yet.
- No full editor platform yet beyond the bounded internal scene/object editor slice.
- No non-slot or multi-user implementation yet.
