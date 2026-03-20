# Mystery Garden Donor Report V1

## Donor Identification
- Donor name: `Mystery Garden`. Evidence: `MG-EV-20260320-WEB-A-001`
- Donor game id: `MysteryGarden`. Evidence: `MG-EV-20260320-WEB-A-001`
- Primary public page: `https://bgaming.com/games/mystery-garden`. Evidence: `MG-EV-20260320-WEB-A-001`
- Release date: `June 10, 2025`. Evidence: `MG-EV-20260320-WEB-A-001`, `MG-EV-20260320-WEB-A-002`

## Source URLs And Build Notes
- Official game JSON endpoint: `https://bgaming.com/wp-json/wp/v2/game/23724`. Evidence: `MG-EV-20260320-WEB-A-001`
- Official release article JSON endpoint: `https://bgaming.com/wp-json/wp/v2/news/30341`. Evidence: `MG-EV-20260320-WEB-A-002`
- Official demo URL exposed in the game JSON: `https://demo.bgaming-network.com/play/MysteryGarden/FUN?server=demo`. Evidence: `MG-EV-20260320-WEB-A-001`
- Official trailer URL exposed in the game JSON: `https://vimeo.com/bgaming/mysterygarden?share=copy`. Evidence: `MG-EV-20260320-WEB-A-001`
- Live public runtime session `MG-CS-20260320-LIVE-A` captured an intro screen, entered idle board, post-spin board, and live init request/response pair. Evidence: `MG-EV-20260320-LIVE-A-001`, `MG-EV-20260320-LIVE-A-002`, `MG-EV-20260320-LIVE-A-003`, `MG-EV-20260320-LIVE-A-004`, `MG-EV-20260320-LIVE-A-005`
- Live console output reported wrapper `v1.2.0`, build `v0.0.15_53dc164`, `Mystery Garden v0.0.1`, PixiJS `6.5.10`, Spine `@pixi-spine/all-4.1`, and build time `Thu Nov 20 2025 12:19:38 GMT+0000`. Evidence: `MG-EV-20260320-LIVE-A-006`

## Game Overview
- Mystery Garden is presented as a calm garden-themed slot with floral symbols, golden Scatter keys, and a greenhouse-like free spins feature. Evidence: `MG-EV-20260320-WEB-A-001`, `MG-EV-20260320-WEB-A-002`, `MG-EV-20260320-WEB-A-003`
- The official copy describes a hand-drawn art style and a folk-inspired score. Evidence: `MG-EV-20260320-WEB-A-002`
- The game record lists `10` lines, `97` RTP, and `x2,000` max multiplier. Evidence: `MG-EV-20260320-WEB-A-001`
- The observed public demo session uses currency `FUN`, not `EUR`, and the entered idle screen shows `Balance 1,000.00 FUN`, `Total bet 0.30 FUN`, and `BUY BONUS FROM 18.00 FUN`. Evidence: `MG-EV-20260320-LIVE-A-002`, `MG-EV-20260320-LIVE-A-005`, `MG-EV-20260320-LIVE-A-006`

## Visible States
- Intro/start state is visible with title, subtitle, `MAX WIN 2000×`, explanatory copy, and `CLICK TO START`. Evidence: `MG-EV-20260320-LIVE-A-001`
- Base game idle is visible live with a title plate, a `5x3` board, a left-side bonus panel, a bottom HUD, and controls on the lower right. Evidence: `MG-EV-20260320-LIVE-A-002`
- A post-spin base-game state is visible live with a changed board, a balance change, and a visible `W` book-style wild token. Evidence: `MG-EV-20260320-LIVE-A-003`, `MG-EV-20260320-LIVE-A-006`
- A win-ready scatter state is visible with three gold keys on the reels and a blue win strip that reads `3.00 EUR`. Evidence: `MG-EV-20260320-WEB-A-006`
- A free spins trigger modal is visible with the text `YOU HAVE WON 10 FREE SPINS`. Evidence: `MG-EV-20260320-WEB-A-007`
- A free spins active state is visible with `Free spins: 9/10`, sticky framed wins, and a `BONUS ACTIVE 60.00 EUR` side panel. Evidence: `MG-EV-20260320-WEB-A-005`
- A buy bonus modal is visible with `BUY FREE SPINS 60.00 EUR` and a green buy action. Evidence: `MG-EV-20260320-WEB-A-008`

## UI Components
- Top-center title treatment reads `MYSTERY GARDEN` in both live and published evidence. Evidence: `MG-EV-20260320-WEB-A-004`, `MG-EV-20260320-LIVE-A-001`, `MG-EV-20260320-LIVE-A-002`
- The left-side panel is used for bonus context and buy-bonus presentation. Evidence: `MG-EV-20260320-WEB-A-005`, `MG-EV-20260320-WEB-A-008`, `MG-EV-20260320-LIVE-A-002`
- The bottom HUD shows balance, bet, and session controls. Evidence: `MG-EV-20260320-WEB-A-004`, `MG-EV-20260320-LIVE-A-002`
- A blue horizontal result strip is used for at least one win presentation. Evidence: `MG-EV-20260320-WEB-A-006`
- Modal overlays are used for both free spins awards and buy bonus purchase prompts. Evidence: `MG-EV-20260320-WEB-A-007`, `MG-EV-20260320-WEB-A-008`
- A lower-left bird illustration is visible in the live entered idle state. Evidence: `MG-EV-20260320-LIVE-A-002`

## Asset Groups
- Garden and hero illustration group. Evidence: `MG-EV-20260320-WEB-A-003`, `MG-EV-20260320-WEB-A-004`
- Book-like reel board and decorative frame group. Evidence: `MG-EV-20260320-WEB-A-004`, `MG-EV-20260320-WEB-A-005`, `MG-EV-20260320-LIVE-A-002`
- Scatter key symbol group. Evidence: `MG-EV-20260320-WEB-A-001`, `MG-EV-20260320-WEB-A-006`
- Wild and floral symbol group. Evidence: `MG-EV-20260320-WEB-A-001`, `MG-EV-20260320-WEB-A-005`, `MG-EV-20260320-LIVE-A-003`
- Modal and control chrome group. Evidence: `MG-EV-20260320-WEB-A-004`, `MG-EV-20260320-WEB-A-007`, `MG-EV-20260320-WEB-A-008`
- Live runtime network requests prove translation, font, and spine asset groups, including `wild`, `scatter`, `key`, `FS_popups`, `big_win`, and `Start_page`. Evidence: `MG-EV-20260320-LIVE-A-006`

## Animation Groups
- Intro dismissal exists as a visible interaction path from `CLICK TO START` into the base game, but its animation timing is not yet captured. Evidence: `MG-EV-20260320-LIVE-A-001`, `MG-EV-20260320-LIVE-A-002`, `MG-EV-20260320-LIVE-A-006`
- Reel spin existence is proven by the live state change from idle to post-spin, but the cadence and frame sequence are not yet captured. Evidence: `MG-EV-20260320-LIVE-A-002`, `MG-EV-20260320-LIVE-A-003`, `MG-EV-20260320-LIVE-A-006`
- Free spins award modal appearance is proven as a visible presentation state, but not yet frame-timed. Evidence: `MG-EV-20260320-WEB-A-007`
- Sticky framed wins in free spins are proven by official copy and the active bonus screenshot. Evidence: `MG-EV-20260320-WEB-A-001`, `MG-EV-20260320-WEB-A-005`
- Win-strip appearance is proven as a visual element, but its motion timing remains unresolved. Evidence: `MG-EV-20260320-WEB-A-006`

## Observed Rules
- `3+` scatters trigger `10` free spins. Evidence: `MG-EV-20260320-WEB-A-001`, `MG-EV-20260320-WEB-A-007`
- Scatter symbols can appear on reels `1-5`. Evidence: `MG-EV-20260320-WEB-A-001`
- During free spins, winning combinations stay in place and pay each spin. Evidence: `MG-EV-20260320-WEB-A-001`, `MG-EV-20260320-WEB-A-005`
- `3+` scatters during free spins award `10` extra free spins. Evidence: `MG-EV-20260320-WEB-A-001`
- Wild symbols substitute for every symbol except scatters. Evidence: `MG-EV-20260320-WEB-A-001`
- Buy bonus activates free spins immediately on the next spin after purchase. Evidence: `MG-EV-20260320-WEB-A-001`, `MG-EV-20260320-WEB-A-008`
- The observed live init response exposes available actions `init` and `spin` while the flow state is `ready`. Evidence: `MG-EV-20260320-LIVE-A-005`

## Free Spins Flow
1. The live demo session opens on a dedicated intro/start state. Evidence: `MG-EV-20260320-LIVE-A-001`
2. A real click advances into the entered idle/base-game screen. Evidence: `MG-EV-20260320-LIVE-A-001`, `MG-EV-20260320-LIVE-A-002`, `MG-EV-20260320-LIVE-A-006`
3. The live session proves that a spin path exists because a post-spin board and balance change were observed. Evidence: `MG-EV-20260320-LIVE-A-002`, `MG-EV-20260320-LIVE-A-003`, `MG-EV-20260320-LIVE-A-006`
4. A qualifying scatter result is possible, and an official screenshot shows three gold key scatters on the board followed by a `10` free-spins award modal. Evidence: `MG-EV-20260320-WEB-A-001`, `MG-EV-20260320-WEB-A-006`, `MG-EV-20260320-WEB-A-007`
5. The bonus round continues with sticky framed wins and a visible `9/10` counter. Evidence: `MG-EV-20260320-WEB-A-001`, `MG-EV-20260320-WEB-A-005`
6. The round can be entered either by scatter trigger or by the buy-bonus flow. Evidence: `MG-EV-20260320-WEB-A-001`, `MG-EV-20260320-WEB-A-008`

## Assumptions
- The visible reel frame is treated as a `5x3` board for the replay slice because the live entered runtime and published screenshots both show a visible `5x3` layout, even though the current API `layout` field is non-authoritative for display layout. Evidence: `MG-EV-20260320-WEB-A-004`, `MG-EV-20260320-LIVE-A-002`, `MG-EV-20260320-LIVE-A-005`, `MG-EV-20260320-LIVE-A-006`
- The replay uses clean placeholder text and blocks for symbols because donor art is still excluded from preview runtime in this milestone. Evidence boundary: internal implementation choice, not a donor claim.
- The published volatility value of `1` is recorded as a fact from the JSON field, but its scale meaning is still unresolved. Evidence: `MG-EV-20260320-WEB-A-001`
- The observed `Space` key behavior is treated as an environment-observed interaction shortcut, not yet as a proven product input contract. Evidence: `MG-EV-20260320-LIVE-A-006`

## Unresolved Questions
- The exact symbol set, paytable, and line layout are not yet fully captured from observable runtime behavior.
- The timing and sequencing of reel spins, win-strip motion, and modal transitions are not yet evidence-backed.
- A live `spin` request/response pair, a live free-spins trigger, and a live restart recovery sequence are still unobserved in this donor pack.
- Audio cues and exact localization strings beyond published English marketing copy are still unobserved.
