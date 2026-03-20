# Mystery Garden Runtime Observation Notes

## Session
- Session ID: `MG-CS-20260320-LIVE-A`
- Observation window: `2026-03-20T09:15Z`
- Entry URL: `https://demo.bgaming-network.com/play/MysteryGarden/FUN?server=demo`
- Resolved runtime host: `https://demo.bgaming-network.com/games/MysteryGarden/FUN?...`

## Proven Facts
- The live intro screen shows `MYSTERY GARDEN`, the subtitle `FREE SPINS WITH STICKY WINS`, a `MAX WIN 2000×` badge, and a `CLICK TO START` call to action. Supporting screenshots: `MG-EV-20260320-LIVE-A-001`
- A real click on the runtime canvas advanced the intro into the base game. Supporting screenshots: `MG-EV-20260320-LIVE-A-001`, `MG-EV-20260320-LIVE-A-002`
- The entered live base-game screen visibly presents a `5x3` board, a left panel reading `BUY BONUS FROM 18.00 FUN`, and a bottom HUD showing `Balance 1,000.00 FUN` and `Total bet 0.30 FUN`. Supporting screenshots: `MG-EV-20260320-LIVE-A-002`
- A live interaction produced a changed post-spin board and a reduced balance of `999.40 FUN`. A `W` book-style wild token is visible in the post-spin screenshot. Supporting screenshots: `MG-EV-20260320-LIVE-A-003`
- The saved live `init` response reports `flow.state = ready`, `flow.available_actions = ["init","spin"]`, `default_bet = 30`, `currency.code = FUN`, `feature_options.feature_multipliers.freespin_buy = 600`, and `feature_options.feature_multipliers.base_bet = 10`. Supporting JSON: `MG-EV-20260320-LIVE-A-005`
- Console output during the live runtime session reported wrapper `v1.2.0`, build `v0.0.15_53dc164`, `Mystery Garden v0.0.1`, PixiJS `6.5.10`, Spine package `@pixi-spine/all-4.1`, and build time `Thu Nov 20 2025 12:19:38 GMT+0000`. Source: direct live console observation during `MG-CS-20260320-LIVE-A`
- Visible network asset names in the live runtime included `translations.bgaming-network.com/MysteryGarden/en.json`, spine JSON files for `stick`, `m1`, `m2`, `m3`, `m4`, `bird`, `Start_page`, `h1`, `h2`, `h3`, `scatter`, `wild`, `FS_popups`, `antisipation`, `big_win`, and `key`, plus fonts `SoupOfJustice.woff2` and `ElMessiri-Bold.woff2`. Source: direct live network observation during `MG-CS-20260320-LIVE-A`

## Assumptions
- The `Space` key appears to trigger spin in the observed environment, but the key-to-action mapping should be treated as environment-observed behavior until a dedicated input capture confirms the exact command path.

## TODO Investigation Items
- Isolate and save a first live `spin` request/response pair with bodies.
- Reach and capture a live scatter trigger or buy-bonus entry into free spins.
- Capture a live restart/reload while free spins are active.

## Blockers
- Synthetic JavaScript-dispatched clicks on the runtime canvas did not reliably advance the intro, while a real DevTools click did.
- The `layout.reels = 1` and `layout.rows = 1` values in the live `init` response do not match the visible board and therefore cannot be used as display-layout proof.
- This session did not reach a live free-spins trigger or a restart/restore flow.
