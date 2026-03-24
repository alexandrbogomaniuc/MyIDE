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
