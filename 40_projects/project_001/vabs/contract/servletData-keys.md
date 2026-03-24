# servletData Keys

`servletData` is the private/server payload bag in the audited GS history flow.

## Minimum Cross-Game Expectation
- delimiter-based key/value text
- stable enough for deterministic replay and support/history lookup
- available to the row parser even when the renderer mostly reads public payload values

## Keys To Track Explicitly
- `ROUND_ID`
  - mandatory somewhere in the parsed row payloads
  - if the project stores it in `servletData`, document that decision clearly
- game- or server-specific session/progression hints
  - only if they are actually needed by the renderer

## Rule
- Do not assume every useful replay value belongs in `servletData`.
- Keep renderer requirements small and explicit.
- Document only grounded keys proven from real target rows.

## Project 001 Concrete Fixture Keys
- `ROUND_ID`
  - mandatory round identifier
  - carried in `servletData` for the current contract fixture
  - currently grounded to captured live init evidence `MG-EV-20260320-LIVE-A-005`
- `PROJECT_ID`
  - ties the row fixture back to `project_001`
- `DONOR_ID`
  - ties the fixture back to `donor_001_mystery_garden`
- `SOURCE_CAPTURE`
  - records which evidence capture session informed the contract fixture
- `FIXTURE_KIND`
  - marks the row explicitly as a derived contract fixture
- `FIXTURE_PROVENANCE`
  - records that the fixture is still derived, but now carries one confirmed captured `ROUND_ID`
- `CAPTURE_STATUS`
  - makes the absence of a full captured archived row explicit
- `CAPTURED_ROUND_ID`
  - preserves the round id confirmed from captured live init evidence
- `CAPTURED_ROUND_ID_EVIDENCE`
  - points at the concrete evidence item used to ground `ROUND_ID`
- `SOURCE_NOTE`
  - short note explaining the row source and current assumption status

## Notes
- These keys are deliberately small and explicit so the first renderer stub can stay deterministic.
- They are still a sanitized derived contract fixture, not a claim of final production servlet payload shape.
- A full captured `playerBets` row is still missing, so provenance must remain explicit in both docs and replay output.
