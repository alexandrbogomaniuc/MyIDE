# betData Keys

`betData` is the public renderer-facing payload bag in the audited GS history flow.

## Minimum Cross-Game Expectation
- delimiter-based key/value text
- compatible with VABS row parsing
- stable enough for deterministic replay

## Keys To Track Explicitly
- `ROUND_ID`
  - may appear here or in `servletData`
  - if it appears here, keep it stable and numeric
- `BETID`
  - useful when a renderer derives a selected coin or bet lane from `COINSEQ`
- `COINSEQ`
  - observed in the audited engine as a split-able value list used for coin lookup

## Game-Specific Payload Notes
- Individual games often pack richer per-round data into `betData`.
- The audited `dragonstone` pack parses game-specific semicolon-delimited values from the public payload after the engine-level split.
- Do not generalize one game's internal payload layout to every game.

## Project 001 Rule
- Treat this file as a contract checklist, not a claim that `project_001` already has a final shipped `betData` schema.
