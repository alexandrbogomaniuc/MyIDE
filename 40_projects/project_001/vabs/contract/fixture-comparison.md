# Fixture Comparison

This file tracks captured-vs-derived truth for `project_001`.

## Fixture Inputs
- Derived fixture: `40_projects/project_001/vabs/contract/sample-playerBets-row.json`
- Derived session fixture: `40_projects/project_001/vabs/contract/sample-playerBets-session.json`
- Captured fixture: none committed yet
- Captured fixture kind: none
- Comparison mode: `derived-only`
- Captured-row notes: `40_projects/project_001/vabs/contract/captured-row-notes.md`

## Confirmed From Captured Data
- `ROUND_ID`

## Derived From GS Examples
- `FEATURE_MODE`
- `COUNTER_FREE_SPINS_AWARDED`

## Derived From Project Fixture
- `ENTRY_STATE`
- `RESULT_STATE`
- `FOLLOW_UP_STATE`
- `AWARD_FREE_SPINS`
- `TRIGGER_MODAL_TEXT`
- `FOLLOW_UP_COUNTER_TEXT`
- `SYMBOL_GRID`
- `FOLLOW_UP_SYMBOL_GRID`
- `EVIDENCE_REFS`

## Provisional For Project 001
- `time`
- `stateId`
- `stateName`
- `extBetId`
- `bet`
- `win`
- `balance`
- `BET_TOTAL`
- `BETID`
- `COINSEQ`
- `CURRENCY`

## Current Blocker
- No full captured archived `playerBets` row is available yet, so field-by-field archived-row comparison cannot run yet.
- The current compare lane therefore anchors only the confirmed `ROUND_ID` plus the documented derived/provisional buckets.
- Captured live init evidence reports currency code `FUN`, while the derived fixture still uses `CURRENCY=EUR`; that mismatch remains provisional until a captured archived row is available.

## Notes
- The compare lane is deterministic and local-first.
- The current session-level `playerBets[]` shell-mock rows are also derived and exist only to emulate support/history selection flow locally.
- A captured raw fixture should stay local-only and is expected at contract/captured-playerBets-row.json.
- A public-safe sanitized captured fixture should be committed only at contract/captured-playerBets-row.sanitized.json.
- Auto fixture selection only promotes a sanitized captured row; a raw local intake remains opt-in via `-- captured` until it is sanitized.
- No captured archived playerBets row is available yet.
- No captured archived `playerBets[]` session is available yet.
- The strongest grounded capture is MG-EV-20260320-LIVE-A-005, which confirms ROUND_ID=14099735306 from a live init response rather than a history row.
- That same live init response reports currency code FUN, while the current derived fixture still uses CURRENCY=EUR until a captured archived row confirms the transport value.
