# MyIDE

MyIDE is a local-first desktop application with a web UI for taking one slot donor game, documenting it with evidence, reconstructing it into a clean internal project format, replaying that internal model locally, and preparing the path toward a production-ready original game.

## Current Phase
- Current milestone: controlled PHASE 3 closeout with a public-safe repository baseline.
- Active donor: `donor_001_mystery_garden`.
- Proven replay scope: one bounded Mystery Garden slice driven only by internal project data under `40_projects/project_001`.

## Core Rules
- V1 is slot-only.
- V1 is single-user.
- The editable source of truth is the internal clean project model, not donor atlas/json/runtime files.
- Raw donor material remains read-only evidence and is not read by preview runtime.
- Public git excludes raw donor/runtime downloads when hashes and sanitized notes are sufficient.

## Public Repo Contents
- Control docs, schemas, importer code, shell code, replay fixtures, and validation tooling.
- Evidence indexes, hashes, inventories, and honest capture notes.
- Sanitized donor reports with evidence IDs.

## Public Repo Exclusions
- Raw donor downloads and runtime payload bodies.
- Session-specific runtime identifiers, tokens, cookies, and private local notes.
- Local-only capture artifacts that are unnecessary for architecture validation.

Public publication rules are defined in [PUBLIC_REPO_POLICY.md](/Users/alexb/Documents/Dev/MyIDE/00_control/PUBLIC_REPO_POLICY.md).

## Local Verification
- `npm run build`
- `npm run typecheck`
- `npm run import:mystery-garden`
- `npm run verify:project_001`

## Current Boundaries
- No production server adapter implementation yet.
- No reskinning yet.
- No full editor platform yet.
- No non-slot or multi-user work yet.
