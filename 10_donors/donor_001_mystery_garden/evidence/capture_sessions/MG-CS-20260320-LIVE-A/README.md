# MG-CS-20260320-LIVE-A Capture Session

## Session Metadata
- Session ID: `MG-CS-20260320-LIVE-A`
- Donor: `donor_001_mystery_garden`
- Capture date: `2026-03-20`
- Channel: `LIVE`
- Scope: public BGaming Mystery Garden demo runtime observation with screenshots, saved request/response bodies, and session notes

## Capture Method
- Open only the public demo URL exposed by the official BGaming record.
- Observe only client-visible UI, console messages, network requests, and normal runtime behavior.
- Save screenshots and request/response bodies without modification under `../../local_only/capture_sessions/MG-CS-20260320-LIVE-A/downloads/`.
- Record any manual observations in evidence-notes files with their own evidence IDs.
- Keep `10_donors/donor_001_mystery_garden/raw/` read-only and unused for runtime preview.
- Keep only sanitized notes, hashes, and redacted metadata in public git.

## Runtime Entry
- Entry URL used: `https://demo.bgaming-network.com/play/MysteryGarden/FUN?server=demo`
- Observed resolved runtime host: `https://demo.bgaming-network.com/games/MysteryGarden/FUN?...`

## Captured Items
- `MG-EV-20260320-LIVE-A-001` intro/start screen screenshot.
- `MG-EV-20260320-LIVE-A-002` entered idle/base-game screenshot.
- `MG-EV-20260320-LIVE-A-003` post-spin base-game screenshot.
- `MG-EV-20260320-LIVE-A-004` live `init` request body.
- `MG-EV-20260320-LIVE-A-005` live `init` response body.
- `MG-EV-20260320-LIVE-A-006` runtime observation note for build/version/interaction findings and blockers.

## Proven Facts
- This session uses a real public Mystery Garden runtime, not only published screenshots.
- Saved files are limited to screenshots, request/response JSON, and observation notes.
- Screenshots and request/response bodies from this session are intentionally excluded from public git.

## Assumptions
- Spin timing still requires a dedicated motion-focused capture pass because this session proves state changes more strongly than frame timing.

## TODO Investigation Items
- Capture a visibly isolated free-spins trigger in live runtime.
- Capture a live restart/restore sequence while bonus state is active.
