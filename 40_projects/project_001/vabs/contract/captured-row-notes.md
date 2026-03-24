# Captured Row Attempt Notes

This file tracks the strongest grounded row-adjacent evidence currently available for `project_001`.

## Current Result
- No full captured `playerBets` archived row was found in the accessible local donor/canonical data for this run.
- The deterministic replay fixture therefore remains `contract/sample-playerBets-row.json`.
- That fixture is still derived, not captured.

## Captured Evidence Found
- Capture session: `MG-CS-20260320-LIVE-A`
- Evidence item: `MG-EV-20260320-LIVE-A-005__runtime_init_response.json`
- Confirmed values from that captured response:
  - `flow.round_id=14099735306`
  - `flow.state=ready`
  - `flow.available_actions=["init","spin"]`
  - currency code `FUN`

## Why This Does Not Count As A Captured Archived Row
- The file is a live init response, not a GS history servlet `playerBets[]` row.
- It does not contain the full archived row transport fields required by the VABS contract:
  - `time`
  - `stateId`
  - `stateName`
  - `bet`
  - `win`
  - `balance`
  - `betData`
  - `servletData`
  - `extBetId`

## How The Derived Fixture Uses This Capture
- `sample-playerBets-row.json` now carries `ROUND_ID=14099735306`.
- `servletData.CAPTURED_ROUND_ID_EVIDENCE` points back to `MG-EV-20260320-LIVE-A-005`.
- Everything else in that row remains derived from audited GS examples plus the donor-backed `project_001` free-spins-trigger replay slice.

## Exact Blocker
- A real/sanitizable archived `playerBets` row for the target Mystery Garden history path is still not present in the accessible local reference material.
- Until one is captured, the replay harness should keep reporting the row as `derived-contract-fixture` with `captured-round-id-only` provenance.
