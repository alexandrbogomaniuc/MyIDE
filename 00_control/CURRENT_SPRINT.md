# Current Sprint

Sprint: SPRINT-DISCIPLINE-A (one chunk only)
Date: 2026-04-10 (Europe/London)

## Chosen chunk
- Chunk: `C6 Runtime / debug host / trace / override`

## Why this chunk now
- It was the only hard blocker in the active verify chain (`electron-runtime-selected-project-harvest*` and `electron-runtime-selected-project-override` lanes).
- It is foundational for downstream reliability (C7/C8/C9 depend on honest runtime grounding and override behavior).
- It was close enough to finish in one sprint with clear automated evidence.

## Input
- Selected project runtime evidence sources (resource-map, page-runtime-proof, local mirror).
- Runtime actions (`Harvest`, `Create Override`, `Clear Override`, Debug Host lane).
- Existing selected-project runtime smoke suites.

## Expected behavior and logic
- Harvest result must remain observable even when auto-coverage triggers workspace reload.
- Harvest candidate selection must keep page-proof sources within the bounded candidate window.
- Runtime workbench source should remain stable across harvest/coverage refreshes.
- Smoke assertions should accept honest follow-up messages (explicit override-hit wording OR coverage/debug-host follow-up wording).

## Expected output
- C6 smokes pass in targeted and full workspace verification.
- Runtime selected-project harvest/override surfaces remain truthful and project-scoped.
- No cross-chunk feature drift introduced.

## Automated tests
- Required baseline:
  - `npm run typecheck`
  - `npm run manual:status`
  - `npm run verify:workspace`
- C6 focused tests (covered in full suite and validated directly during sprint):
  - `npm run smoke:electron-runtime-selected-project-harvest`
  - `npm run smoke:electron-runtime-selected-project-harvest-page-proof-fallback` (via built node invocation)
  - `npm run smoke:electron-runtime-selected-project-harvest-resource-map-fallback` (via built node invocation)
  - `npm run smoke:electron-runtime-selected-project-harvest-upstream-fallback` (via built node invocation)
  - `npm run smoke:electron-runtime-selected-project-override`

## Manual user checklist
- See `00_control/CHUNK_USER_CHECKLISTS.md` under **C6 runtime/debug host/trace/override**.

## Done criteria
- `C6` specific runtime selected-project harvest/fallback/override smokes are green.
- Full `npm run verify:workspace` is green.
- Chunk matrix and checklist docs are updated to reflect current reality.
- Changes are committed and pushed, with remote/public preflight verification captured.
