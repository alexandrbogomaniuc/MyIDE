# Mystery Garden Capture Checklist

## Session Setup
1. Create a new session folder under `capture_sessions/` using `MG-CS-YYYYMMDD-CHANNEL-SESSION`.
2. Record session metadata in the session `README.md` before capturing more evidence.
3. Keep donor `raw/` content untouched; store only session artifacts inside `evidence/`.

## Required Captures
1. Save the resolved public runtime URL and the visible launch/start screen.
2. Save the entered idle/base-game screen after the intro/start interaction.
3. Save the first successful post-spin visible state.
4. Save the first `init` request/response pair and the first isolated `spin` request/response pair if available.
5. Save console or observation notes for build version, runtime wrapper version, Pixi/Spine versions, and interaction notes.
6. Save at least one evidence note covering blockers, assumptions, and unresolved questions from the session.

## Naming Rules
- Evidence IDs: `MG-EV-YYYYMMDD-CHANNEL-SESSION-SEQ`
- Screenshot files: `<evidence_id>__<descriptor>.png`
- Request/response files: `<evidence_id>__<descriptor>.json`
- Observation notes: `<evidence_id>__<descriptor>.md`

## Hash And Inventory Steps
1. Record each new item in `HASHES.csv`.
2. Record each new item in `INVENTORY.csv`.
3. Add each new item to `EVIDENCE_INDEX.md`.
4. Update donor reports and the claims ledger with the new evidence IDs only after the files are indexed and hashed.

## Notes Template
```md
# Observation Note

## Session
- Session ID: `MG-CS-...`
- Observer: Codex

## Proven Facts
- Evidence-backed runtime observation.

## Assumptions
- Any bounded inference that still needs follow-up.

## TODO Investigation Items
- Exact next runtime captures still needed.
```
