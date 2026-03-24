# Archived Row Contract

This document describes the first concrete `project_001` archived row contract slice for GS VABS support work.

## Fixture Status
- Current row file: `sample-playerBets-row.json`
- Status: contract fixture / expected shape
- Not yet a captured production GS row
- Grounded parts come from the audited GS servlet + TRow format plus the existing `project_001` free-spins-trigger replay slice
- Provisional parts are the exact numeric `stateId`, `extBetId`, and some per-game payload keys until a real target row is captured

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
- For `project_001`, the current contract fixture carries `ROUND_ID` in `servletData`.

## Project 001 Concrete Fixture Shape
- Intended row slice: free-spins trigger into free-spins active
- Project replay states aligned to the fixture:
  - entry: `state.spin`
  - result: `state.free-spins-trigger`
  - follow-up: `state.free-spins-active`
- The current fixture is sanitized and deterministic on purpose so it can drive parser and renderer-stub work without needing a live GS runtime.

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
- `AWARD_FREE_SPINS`
- `CURRENCY`
- `SYMBOL_GRID`
- `EVIDENCE_REFS`

### servletData
- `ROUND_ID`
- `PROJECT_ID`
- `DONOR_ID`
- `SOURCE_CAPTURE`
- `FIXTURE_KIND`
- `SOURCE_NOTE`

## Deterministic Replay Requirement
- The same archived row input must produce the same VABS replay output.
- Project-specific renderer logic must not depend on live mutable server state at replay time.
- Acceptance testing must include at least one stable row fixture with a stable `ROUND_ID`.
