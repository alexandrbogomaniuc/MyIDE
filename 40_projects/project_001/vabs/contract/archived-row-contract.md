# Archived Row Contract

This document describes the first concrete `project_001` archived row contract slice for GS VABS support work.

## Fixture Status
- Current row file: `sample-playerBets-row.json`
- Current session file: `sample-playerBets-session.json`
- Status: derived contract fixture / expected shape
- No full captured `playerBets` row is stored in this repo yet
- No captured archived `playerBets[]` session is stored in this repo yet
- Reserved captured intake paths:
  - local raw: `captured-playerBets-row.json` (gitignored)
  - sanitized commit-safe: `captured-playerBets-row.sanitized.json`
  - local raw session: `captured-playerBets-session.json` (gitignored)
  - sanitized commit-safe session: `captured-playerBets-session.sanitized.json`
- Grounded parts come from:
  - the audited GS servlet + `TRow` row/parse contract
  - the canonical GS `gethistory.response.json` example for free-spins feature-mode/counter structure
  - the existing `project_001` `fixtures/free_spins_trigger.json` donor-backed replay slice
- Strongest currently captured row-adjacent evidence:
  - `MG-EV-20260320-LIVE-A-005__runtime_init_response.json`
  - confirms a live `flow.round_id` of `14099735306`
  - does not contain a full archived `playerBets` row
- Provisional parts remain:
  - the exact numeric `stateId`
  - the exact `extBetId`
  - any per-game key that still reflects `project_001` contract shaping rather than a captured GS row

## Captured Vs Derived Truth
- Captured target evidence found so far:
  - one sanitized live init response proving `flow.round_id=14099735306`
  - no full archived `playerBets` row with the complete GS history shape
  - no full archived `playerBets[]` session with the complete GS history shape
- Captured-row intake rule:
  - local raw archived rows belong only in `captured-playerBets-row.json`
  - commit-safe captured rows belong only in `captured-playerBets-row.sanitized.json`
  - `auto` fixture selection must only promote the sanitized captured row
  - the raw local-only row may be used only through explicit captured selection or the sanitize flow
  - the compare/verify lane must say which one was actually used
- Derived fixture file:
  - `contract/sample-playerBets-row.json`
  - remains the deterministic replay input for the local harness
- Parser-ready normalized view:
  - generated at runtime by the shared parser and replay harness
  - explained in `parsed-row-example.md`
- Comparison doc:
  - `contract/fixture-comparison.md`
  - records which fields are confirmed from captured data vs derived from GS examples vs still provisional
- Session mock doc:
  - `contract/session-notes.md`
  - records how the derived row list supports the local support/history shell mock without claiming captured session truth
- Operator capture docs:
  - `contract/operator-session-capture-request.md`
  - `contract/captured-session-redaction-guidelines.md`
  - document the smallest safe captured-session intake flow while no real session payload is available yet

## Source Shape
The audited GS history servlet returns JSON rows under `playerBets[]` with the following fields:
- `time`
- `stateId`
- `stateName`
- `bet`
- `win`
- `balance`
- `betData`
- `servletData`
- `extBetId`

## Required Fields
- `time` must be present for ordering and support-history display.
- `stateId` and `stateName` must be present for readable replay state labeling.
- `bet`, `win`, and `balance` must be present for deterministic replay summaries.
- `betData` must exist even if the current game uses only a few keys.
- `servletData` must exist even if the current game uses only a few keys.
- `ROUND_ID` must be recoverable from the parsed row payloads.
- `extBetId` must be present so support/history tooling can show a stable external row identifier.

## Payload Parsing Rule
- Engine-level VABS parsing expects delimiter-based key/value text payloads.
- The audited engine treats:
  - `betData` as the public payload bag
  - `servletData` as the private/server payload bag
- Key/value format observed in the audited engine:
  - `~` between entries
  - `=` between key and value

## ROUND_ID Requirement
- `ROUND_ID` is mandatory.
- If `ROUND_ID` is missing, support/history lookup and round-specific replay navigation become unreliable.
- Every project should prove where `ROUND_ID` comes from and which payload bag carries it.
- For `project_001`, the current derived fixture carries `ROUND_ID` in `servletData`.
- That value is now grounded to the captured live init response `MG-EV-20260320-LIVE-A-005`.

## Project 001 Concrete Fixture Shape
- Intended row slice: free-spins trigger into free-spins active
- Intended session slice: one derived base-spin neighbor row, one derived free-spins-trigger row with the grounded live `ROUND_ID`, and one derived free-spins-active neighbor row
- Project replay states aligned to the fixture:
  - entry: `state.spin`
  - result: `state.free-spins-trigger`
  - follow-up: `state.free-spins-active`
- The current fixture is sanitized and deterministic on purpose so it can drive parser, local replay harness, and renderer-stub work without needing a live GS runtime.
- The current session fixture is also deterministic on purpose so it can drive a local history-style row list and click-to-replay flow without claiming a real GS archived session.

## Provenance Tiers
- Top-level row fields are derived from the audited GS history servlet row contract.
- `FEATURE_MODE` and `COUNTER_FREE_SPINS_AWARDED` are derived from the canonical GS `gethistory` example shape for free-spins history items.
- `TRIGGER_MODAL_TEXT`, `FOLLOW_UP_COUNTER_TEXT`, `SYMBOL_GRID`, `FOLLOW_UP_SYMBOL_GRID`, and `EVIDENCE_REFS` are derived from the current `project_001` free-spins-trigger internal replay fixture.
- `ROUND_ID` is confirmed from captured live init evidence, but still not from a captured archived `playerBets` row.
- `stateId` and `extBetId` remain provisional until a real archived target row is captured.

## Required Deterministic Keys
### Top-level JSON row
- `time`
- `stateId`
- `stateName`
- `extBetId`
- `bet`
- `win`
- `balance`
- `betData`
- `servletData`

### betData
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

### Sanitized captured minimum
- A sanitized captured row does not have to preserve every derived `project_001` helper key.
- It must still preserve enough stable row truth for deterministic replay and comparison:
  - top-level GS history row fields
  - `BET_TOTAL`
  - `BETID`
  - `COINSEQ`
  - `ROUND_ID`
  - explicit provenance keys in `servletData`
- If richer game-specific keys are missing from the captured row, the replay harness must report that honestly instead of fabricating them.

### servletData
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

## Deterministic Replay Requirement
- The same archived row input must produce the same VABS replay output.
- Project-specific renderer logic must not depend on live mutable server state at replay time.
- Acceptance testing must include at least one stable row fixture with a stable `ROUND_ID`.
- The local replay harness must be able to turn the parsed row plus the project-specific stub into the same replay-summary JSON, text, and HTML artifacts on repeated runs.
