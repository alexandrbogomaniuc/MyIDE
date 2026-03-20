# Screenshot Baseline Checklist

- Idle screen renders the internal title, board, side panel, and HUD from `project.json` only.
- Normal spin demo reaches `state.base-win` and shows a `3.00 EUR` banner.
- Free spins trigger demo reaches `state.free-spins-trigger` and shows `YOU HAVE WON 10 FREE SPINS`.
- Free spins active demo shows `Free spins: 9/10` and at least three sticky frame highlights.
- Restart restore demo shows the recovery chip `Recovered from mocked gameState`.
- Inspector shows donor evidence IDs for donor-backed states.
- No preview asset path points into `10_donors/donor_001_mystery_garden/raw/`.
