# Capture Source Log

This file records the exact sources checked for a real archived `playerBets` row for `project_001`.

## Current Outcome
- No full Mystery Garden archived `playerBets` row is currently available in the accessible local workspace or canonical GS reference material.
- The strongest grounded project-specific capture remains `MG-EV-20260320-LIVE-A-005__runtime_init_response.json`.
- That file confirms a real live `flow.round_id=14099735306`, but it is not itself an archived history row.

## Sources Checked

### Project 001 donor-local evidence
- Path family:
  - `10_donors/donor_001_mystery_garden/evidence/local_only/capture_sessions/`
- Result:
  - live/web evidence, screenshots, runtime init request/response, and donor assets are present
  - no archived `playerBets`, `gethistory`, or equivalent history-row payload was found

### Project 001 captured-adjacent live init payload
- File:
  - `10_donors/donor_001_mystery_garden/evidence/local_only/capture_sessions/MG-CS-20260320-LIVE-A/downloads/MG-EV-20260320-LIVE-A-005__runtime_init_response.json`
- Result:
  - confirms `flow.round_id=14099735306`
  - confirms `flow.state=ready`
  - confirms `flow.available_actions=["init","spin"]`
  - shows currency code `FUN`
- Limitation:
  - not a GS history servlet `playerBets[]` row

### Canonical GS generic history fixtures
- Files:
  - `/Users/alexb/WorkspaceArchive/Dev_20260304/canonical/GSRefactor_canonical_20260307_091032/Gamesv1/docs/gs/fixtures/gethistory.response.json`
  - `/Users/alexb/WorkspaceArchive/Dev_20260304/canonical/GSRefactor_canonical_20260307_091032/Gamesv1/docs/generated/gs-contract/upstream-mirror/fixtures/gethistory.response.json`
- Result:
  - useful for GS transport/payload shape
  - not Mystery Garden archived `playerBets` rows

### Canonical GS reference code
- Files checked:
  - `GameHistoryServlet.java`
  - `show.jsp`
  - `html5template.jspf`
  - `TRow.js`
  - `dragonstone/code.js`
- Result:
  - confirms row shape, payload-bag parsing, and renderer package loading rules
  - does not provide a project_001 archived row fixture

### Other-game archived row data
- Source family:
  - `/Users/alexb/WorkspaceArchive/Dev_20260304/canonical/.../docs/phase7/cassandra/full-copy/.../*.csv`
- Result:
  - proves archived row storage exists for other games
  - not valid project_001 captured provenance

## Intake Rule
- Local-only raw archived rows belong at:
  - `contract/captured-playerBets-row.json`
- Commit-safe sanitized archived rows belong at:
  - `contract/captured-playerBets-row.sanitized.json`
- `auto` selection must only promote the sanitized path.
- Raw local-only rows may only be used intentionally via explicit captured selection or sanitization commands.
