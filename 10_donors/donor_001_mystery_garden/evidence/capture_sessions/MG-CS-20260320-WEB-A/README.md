# MG-CS-20260320-WEB-A Capture Session

## Session Metadata
- Session ID: `MG-CS-20260320-WEB-A`
- Donor: `donor_001_mystery_garden`
- Capture date: `2026-03-20`
- Channel: `WEB`
- Scope: official BGaming JSON endpoints plus published Mystery Garden web images

## Capture Method
- Use only normally delivered public web assets and observable published content.
- Store downloaded files without modification under `../../local_only/capture_sessions/MG-CS-20260320-WEB-A/downloads/`.
- Record one evidence ID per captured file.
- Record SHA-256 in `../../HASHES.csv` immediately after capture.
- Treat `10_donors/donor_001_mystery_garden/raw/` as read-only and do not overwrite it.
- Keep only hashes, inventories, and sanitized metadata in public git.

## Naming Rules
- Evidence IDs: `MG-EV-YYYYMMDD-CHANNEL-SESSION-SEQ`
- Downloaded filenames: `<evidence_id>__<descriptor>.<ext>`
- Notes files: `<session_id>__notes.md` if additional notes are needed later

## Notes Template
Use this template for any follow-up note in this session:

```md
# Observation
- Short observation statement.

## Claim Type
- proven fact | assumption | TODO investigation item

## Evidence IDs
- `MG-EV-...`

## Confidence
- high | medium | low

## Open Questions
- Follow-up question if the observation is incomplete.
```

## Captured Items
- `MG-EV-20260320-WEB-A-001` official game JSON record.
- `MG-EV-20260320-WEB-A-002` official release article JSON.
- `MG-EV-20260320-WEB-A-003` hero portrait image.
- `MG-EV-20260320-WEB-A-004` base game screenshot.
- `MG-EV-20260320-WEB-A-005` bonus game screenshot.
- `MG-EV-20260320-WEB-A-006` scatter and win screenshot.
- `MG-EV-20260320-WEB-A-007` free spins trigger screenshot.
- `MG-EV-20260320-WEB-A-008` buy bonus screenshot.

## Proven Facts
- The session contains public official donor evidence only.
- All captured files are hashed and indexed.
- The downloaded files for this session are intentionally excluded from public git.

## Assumptions
- Additional runtime captures will require a new session ID rather than extending this session with mixed collection methods.

## TODO Investigation Items
- Add a runtime observation session for live launch, reel motion, and restart evidence.
