# Mystery Garden Capture Blockers

## Proven Blockers
- `MG-CS-20260320-LIVE-A` did not reach a live free-spins trigger during the observed public runtime session. Evidence: `MG-EV-20260320-LIVE-A-006`
- The visible spin interaction was observed through the live UI, but the exact `spin` request body was not isolated from the current tooling pass. Evidence: `MG-EV-20260320-LIVE-A-006`
- The runtime `init` response reported `layout.reels = 1` and `layout.rows = 1`, which does not match the visible `5x3` board and therefore must not be treated as authoritative display-layout proof. Evidence: `MG-EV-20260320-LIVE-A-005`, `MG-EV-20260320-LIVE-A-006`
- Synthetic JavaScript-dispatched clicks on the canvas did not reliably advance the intro, while a real DevTools click did. Evidence: `MG-EV-20260320-LIVE-A-006`

## Environment Notes
- Public runtime access was available at the demo URL exposed by BGaming.
- Chrome DevTools MCP allowed screenshots, console inspection, network inspection, and one successful real click on the runtime canvas.

## Exact Next Manual Steps
1. Start a fresh public demo session from `https://demo.bgaming-network.com/play/MysteryGarden/FUN?server=demo`.
2. Capture the intro screen, then enter the game with a real click, not a synthetic script-dispatched click.
3. Record the first successful spin request/response pair with bodies saved as JSON.
4. Continue until either a scatter-led free-spins trigger or a buy-bonus entry is visibly reached.
5. Capture a restart/reload while free spins are active and record the first recovery request/response pair plus visible restored state.

## Follow-up Risks
- The public demo session may expose `FUN` values that differ from published `EUR` screenshots, so currency-specific claims must stay source-bound.
- Runtime APIs may expose service-layout fields that are not direct UI-layout evidence.
