# Mystery Garden UI Flow

## Proven Donor Flow
1. The player first sees a dedicated intro/start screen with `CLICK TO START`. Evidence: `MG-EV-20260320-LIVE-A-001`
2. A real click advances the session into the entered base game scene with title, visible `5x3` board, side panel, HUD, and spin control. Evidence: `MG-EV-20260320-LIVE-A-001`, `MG-EV-20260320-LIVE-A-002`, `MG-EV-20260320-LIVE-A-006`
3. The live session proves that a spin path exists because a changed post-spin board and balance change were observed. Evidence: `MG-EV-20260320-LIVE-A-002`, `MG-EV-20260320-LIVE-A-003`, `MG-EV-20260320-LIVE-A-006`
4. The game rules support a scatter-led transition into free spins, and a published image shows three gold key scatters on the board. Evidence: `MG-EV-20260320-WEB-A-001`, `MG-EV-20260320-WEB-A-006`
5. A free spins trigger overlay announces `10` awarded spins. Evidence: `MG-EV-20260320-WEB-A-007`
6. Free spins continue on a bonus board that shows sticky framed wins and a visible `9/10` counter. Evidence: `MG-EV-20260320-WEB-A-001`, `MG-EV-20260320-WEB-A-005`
7. The same bonus mode can also be entered through a buy bonus prompt, and the official copy states that the next spin after purchase triggers the round. Evidence: `MG-EV-20260320-WEB-A-001`, `MG-EV-20260320-WEB-A-008`

## PHASE 3 Internal Replay Flow
1. `state.idle`
2. `state.spin`
3. `state.base-win`
4. `state.free-spins-trigger`
5. `state.free-spins-active`
6. `state.restore.free-spins-active` to `state.free-spins-active` via mocked restart recovery

## Proven Facts
- The replay spine above stays within donor states that are actually evidenced, with live confirmation for idle and spin-path existence.
- The restart branch is clearly labeled as local replay support rather than a donor-backed runtime claim.

## Assumptions
- The donor likely has intermediate motion between trigger and active bonus entry, but that motion is not proven in the current pack.

## Unresolved Questions
- Exact transition timings.
- Exact `spin` request body and any input-to-command translation details.
- Any interstitial audio or celebratory overlays before the free spins board settles.
