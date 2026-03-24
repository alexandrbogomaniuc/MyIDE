# Parsed Row Example

This file shows the intended parsed summary for the current `project_001` contract fixture.

## Source Row
- file: `contract/sample-playerBets-row.json`
- status: sanitized derived contract fixture, not a captured production GS row
- strongest captured input so far: `MG-EV-20260320-LIVE-A-005__runtime_init_response.json`
- confirmed captured value reused here: `flow.round_id=14099735306`
- captured-row intake paths reserved:
  - local raw: `contract/captured-playerBets-row.json`
  - sanitized: `contract/captured-playerBets-row.sanitized.json`
  - `auto` only promotes the sanitized path
  - the raw local path is opt-in for capture intake and sanitization work

## Parsed Summary
- `time`: `20 Mar 2026 10:32:56`
- `stateId`: `317`
- `stateName`: `Free Spins Trigger`
- `extBetId`: `project001-fs-trigger-0001`
- `ROUND_ID`: `14099735306`
- `fixtureProvenance`: `derived-project-fixture-plus-gs-example-plus-captured-round-id`
- `captureStatus`: `no-captured-playerbets-row__captured-round-id-only`
- `capturedRoundIdEvidence`: `MG-EV-20260320-LIVE-A-005`
- `entryState`: `state.spin`
- `resultState`: `state.free-spins-trigger`
- `followUpState`: `state.free-spins-active`
- `featureMode`: `FREE_SPINS`
- `awardFreeSpins`: `10`
- `counterFreeSpinsAwarded`: `10`
- `currency`: `EUR`
- `triggerModalText`: `YOU HAVE WON 10 FREE SPINS`
- `followUpCounterText`: `Free spins: 9/10`
- `symbolGrid`: `5 columns x 3 rows`
- `followUpSymbolGrid`: `5 columns x 3 rows`
- `evidenceRefCount`: `4`

## Session-Level Example
- file: `contract/sample-playerBets-session.json`
- status: derived session-level `playerBets[]` fixture, not a captured archived session
- row count: `3`
- row 0: derived base-spin neighbor row
- row 1: derived free-spins-trigger row with grounded `ROUND_ID=14099735306`
- row 2: derived free-spins-active neighbor row
- purpose: drive a local shell row list and row-click replay update without claiming a real GS history response

## Parsed betData Keys
- `BET_TOTAL`
- `BETID`
- `COINSEQ`
- `ENTRY_STATE`
- `RESULT_STATE`
- `FOLLOW_UP_STATE`
- `FEATURE_MODE`
- `AWARD_FREE_SPINS`
- `COUNTER_FREE_SPINS_AWARDED`
- `CURRENCY`
- `TRIGGER_MODAL_TEXT`
- `FOLLOW_UP_COUNTER_TEXT`
- `SYMBOL_GRID`
- `FOLLOW_UP_SYMBOL_GRID`
- `EVIDENCE_REFS`

## Parsed servletData Keys
- `ROUND_ID`
- `PROJECT_ID`
- `DONOR_ID`
- `SOURCE_CAPTURE`
- `FIXTURE_KIND`
- `FIXTURE_PROVENANCE`
- `CAPTURE_STATUS`
- `CAPTURED_ROUND_ID`
- `CAPTURED_ROUND_ID_EVIDENCE`
- `SOURCE_NOTE`

## Why This Example Exists
- to keep the contract parser testable
- to keep the renderer stub and local replay harness deterministic
- to make the first project-specific VABS slice concrete without claiming a finished production row
- to make the derived-vs-captured comparison readable through `fixture-comparison.md`

## Provenance Snapshot
- Derived from audited GS row transport: top-level row fields plus `ROUND_ID` contract expectations.
- Derived from canonical GS `gethistory` example: `FEATURE_MODE`, `COUNTER_FREE_SPINS_AWARDED`.
- Derived from `project_001` free-spins-trigger fixture: states, grids, trigger/follow-up text, evidence refs.
- Confirmed from captured live init response: `ROUND_ID=14099735306`.
- Still provisional until a captured target row exists: `stateId`, `extBetId`, and the full archived `playerBets` transport row.

## Captured Intake Note
- A future sanitized captured row may produce a smaller parsed summary if the real archived row does not carry every current derived helper key.
- That is expected and should be reported as stronger provenance, not as a regression.
