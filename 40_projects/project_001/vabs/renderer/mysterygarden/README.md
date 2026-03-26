# Mystery Garden Renderer Stub

This is the first project-specific GS VABS renderer stub package for `project_001`.

## Status
- Stub only
- Read-only
- Not a finished production renderer

## Purpose
- prove the intended folder/package shape
- prove the first row-contract parsing pattern
- keep future renderer work grounded in one concrete project slice
- produce one stronger replay-summary panel from the local row fixture

## Current Files
- `code.js`
- `strings_en.js`

## Scope
- reads the contract fixture fields and grouped payload values
- exposes the expected callback structure for future GS VABS work
- renders a deterministic replay summary with fixture provenance, sanitized/raw availability, comparison status, `ROUND_ID`, state flow, bet/win/balance, feature cues, trigger/follow-up notes, encoded boards, evidence refs, and provenance notes
- is now exported and previewed through a local GS-style `common/vabs/mysterygarden/` package layout
- is now also exercised through a local page-shell mock and hidden-browser smoke that approximate the `/vabs/show.jsp` boot seam without claiming real JSP proof
- now updates inside that shell when a different session-row entry is selected from the local mock row list
- can now be re-run against an explicit sanitized captured-session row when one becomes available through the captured-session intake flow
- does not depend on live runtime APIs beyond the normal GS VABS row/engine surface
- remains a stub and does not claim the final VABS art or gameplay renderer
