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
- `PROJECT_ID`
  - ties the row fixture back to `project_001`
- `DONOR_ID`
  - ties the fixture back to `donor_001_mystery_garden`
- `SOURCE_CAPTURE`
  - records which evidence capture session informed the contract fixture
- `FIXTURE_KIND`
  - marks the row explicitly as a contract fixture
- `SOURCE_NOTE`
  - short note explaining the row source and current assumption status

## Notes
- These keys are deliberately small and explicit so the first renderer stub can stay deterministic.
- They are still a sanitized contract fixture, not a claim of final production servlet payload shape.
