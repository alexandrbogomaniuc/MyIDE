# Fixture Shape Notes

This phase still uses local fixture shape checks instead of dedicated JSON Schema files.

## normal_spin.json
- Requires `fixtureId`, `entryStateId`, `resultStateId`, `evidenceRefs`, `grid`, `win`, and `validationNotes`.
- `grid` must be `5x3`.
- `win.amount` must be numeric and `win.bannerText` must be present.

## free_spins_trigger.json
- Requires `fixtureId`, `entryStateId`, `resultStateId`, `followUpStateId`, `evidenceRefs`, `grid`, `award`, `followUp`, and `validationNotes`.
- Base `grid` and `followUp.grid` must both be `5x3`.
- `award.freeSpins` must be numeric.
- `followUp.stickyFrames` must be present.

## restart_restore.json
- Requires `fixtureId`, `entryStateId`, `resultStateId`, `evidenceRefs`, `gameStateFile`, `lastActionFile`, `expectedUi`, and `validationNotes`.
- `gameStateFile` and `lastActionFile` must stay inside `40_projects/project_001/runtime/`.
- `expectedUi.counterText` must be present.

## Known Gap
- These checks verify deterministic replay contracts, not production server payload contracts.
