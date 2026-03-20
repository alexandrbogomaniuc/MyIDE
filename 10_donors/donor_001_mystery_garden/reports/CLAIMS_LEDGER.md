# Mystery Garden Claims Ledger

## Proven
- `Mystery Garden` is a BGaming game with public id `MysteryGarden`. Evidence: `MG-EV-20260320-WEB-A-001`
- The published record lists `10` lines, `97` RTP, and `x2,000` max multiplier. Evidence: `MG-EV-20260320-WEB-A-001`
- The visible donor state pack currently covers a live intro/start screen, a live entered idle board, a live post-spin board, a win-ready scatter state, a free spins trigger modal, a free spins active state, and a buy bonus modal. Evidence: `MG-EV-20260320-LIVE-A-001`, `MG-EV-20260320-LIVE-A-002`, `MG-EV-20260320-LIVE-A-003`, `MG-EV-20260320-WEB-A-006`, `MG-EV-20260320-WEB-A-007`, `MG-EV-20260320-WEB-A-005`, `MG-EV-20260320-WEB-A-008`
- `3+` scatters trigger `10` free spins, and free spins use sticky wins that persist through the round. Evidence: `MG-EV-20260320-WEB-A-001`, `MG-EV-20260320-WEB-A-005`, `MG-EV-20260320-WEB-A-007`
- The live public demo visibly uses a `5x3` board, `FUN` currency, `0.30 FUN` total bet, and `18.00 FUN` buy-bonus entry on the entered idle screen. Evidence: `MG-EV-20260320-LIVE-A-002`, `MG-EV-20260320-LIVE-A-005`, `MG-EV-20260320-LIVE-A-006`
- The live init response exposes `flow.available_actions = ["init","spin"]` while `flow.state = ready`. Evidence: `MG-EV-20260320-LIVE-A-005`

## Assumptions
- The observed `Space` key behavior may reflect an environment shortcut rather than the final product input contract. Evidence: `MG-EV-20260320-LIVE-A-006`
- Spin timing, modal timing, and exact payline choreography remain unproven until a motion-focused runtime observation session exists.

## TODO Investigation
- Capture a live `spin` request/response pair and a live restart request/response sequence from observable runtime.
- Capture a live free-spins trigger or buy-bonus bonus entry in the public demo.
- Capture the full symbol inventory and paytable.
- Confirm exact animation timings and transitional states.
