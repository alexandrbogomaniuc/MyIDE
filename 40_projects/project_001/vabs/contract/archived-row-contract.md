# Archived Row Contract

This document describes the minimum row contract MyIDE expects for GS VABS support work.

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

## Deterministic Replay Requirement
- The same archived row input must produce the same VABS replay output.
- Project-specific renderer logic must not depend on live mutable server state at replay time.
- Acceptance testing must include at least one stable row fixture with a stable `ROUND_ID`.
