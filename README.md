# MyIDE

MyIDE is a universal local-first IDE for multiple game projects over time, with a desktop web UI for collecting donor evidence, reconstructing each project into a clean internal model, replaying that model locally, and preparing a project-specific target or resulting game path.

## Current Phase
- Current milestone: controlled PHASE 4C project onboarding and lifecycle dashboard on top of the folder-based multi-project workspace.
- Active validated donor slice: `donor_001_mystery_garden`.
- Proven replay scope: one bounded Mystery Garden slice driven only by internal project data under `40_projects/project_001`.

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
- `npm run create:project -- --config 40_projects/templates/project-template/project.meta.json.example --project-root 40_projects/project_003`
- `npm run smoke:create-project`
- `npm run import:mystery-garden`
- `npm run validate:workspace`
- `npm run verify:workspace`
- `npm run verify:project_001`

## Current Boundaries
- No production server adapter implementation yet.
- No reskinning yet.
- No full editor platform yet.
- No non-slot or multi-user implementation yet.
