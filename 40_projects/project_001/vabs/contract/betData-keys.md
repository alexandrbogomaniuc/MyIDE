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

## Project 001 Concrete Fixture Keys
- `BET_TOTAL`
  - total stake in minor units for the archived row fixture
- `BETID`
  - selected bet index used with `COINSEQ`
- `COINSEQ`
  - deterministic coin sequence values used by the parser harness
- `ENTRY_STATE`
  - expected entry replay state, currently `state.spin`
- `RESULT_STATE`
  - expected result replay state, currently `state.free-spins-trigger`
- `FOLLOW_UP_STATE`
  - expected follow-up replay state, currently `state.free-spins-active`
- `AWARD_FREE_SPINS`
  - free spins award count for the trigger slice
- `CURRENCY`
  - current fixture currency code
- `SYMBOL_GRID`
  - stable encoded reel grid for renderer-stub parsing
- `EVIDENCE_REFS`
  - stable evidence reference list tied to the trigger slice

## Notes
- The exact keys above are a project-local contract fixture for the first `project_001` slice.
- They are not yet claimed as the final production GS payload for Mystery Garden.
