# Mystery Garden Evidence Index

## Capture Protocol
- Evidence ID format: `MG-EV-YYYYMMDD-CHANNEL-SESSION-SEQ`.
- Capture session ID format: `MG-CS-YYYYMMDD-CHANNEL-SESSION`.
- Hash recording format: `HASHES.csv` with `evidence_id,capture_session_id,relative_path,sha256,size_bytes,captured_at_utc,source_url,notes`.
- Screenshot naming format: `<evidence_id>__<descriptor>.<ext>`.
- Notes format: one capture-session README per session with `Session Metadata`, `Capture Method`, `Notes Template`, and `Captured Items`.

## Public Repo Boundary
- Downloaded donor files, screenshots, and runtime payload bodies are preserved locally under `local_only/` and are excluded from public git.
- Public git keeps evidence IDs, hashes, sanitized source metadata, and capture notes.
- Session-specific runtime endpoints are redacted in tracked metadata.

## Current Capture Sessions
| Session ID | Captured UTC | Method | Scope | Notes |
| --- | --- | --- | --- | --- |
| `MG-CS-20260320-WEB-A` | `2026-03-20T07:55:07Z` | Public web capture from official BGaming pages and published images | Donor identification, published screenshots, build notes, and visible state references | Uses only normally delivered public web assets and official JSON endpoints. |
| `MG-CS-20260320-LIVE-A` | `2026-03-20T09:15:29Z` | Live public runtime observation from the public BGaming demo | Intro/start, live idle board, post-spin board, live init request/response, and runtime observation notes | Bonus trigger and restart recovery remain uncaptured in this session. |

## Evidence Index
| Evidence ID | Kind | Source URL | Relative Path | Hash Ref | Claim Scope |
| --- | --- | --- | --- | --- | --- |
| `MG-EV-20260320-WEB-A-001` | official JSON record | `https://bgaming.com/wp-json/wp/v2/game/23724` | `local_only/capture_sessions/MG-CS-20260320-WEB-A/downloads/MG-EV-20260320-WEB-A-001__official_game_record.json` | `HASHES.csv` | donor identification, game rules, release metadata; raw body excluded from public git |
| `MG-EV-20260320-WEB-A-002` | official JSON article | `https://bgaming.com/wp-json/wp/v2/news/30341` | `local_only/capture_sessions/MG-CS-20260320-WEB-A/downloads/MG-EV-20260320-WEB-A-002__official_release_article.json` | `HASHES.csv` | overview copy, RTP and max win confirmation, art/audio notes; raw body excluded from public git |
| `MG-EV-20260320-WEB-A-003` | published image | `https://bgaming.com/wp-content/uploads/2025/06/6821c2010407bbd95bbcdf13_Mystery_Garden_1020%D1%851280.webp` | `local_only/capture_sessions/MG-CS-20260320-WEB-A/downloads/MG-EV-20260320-WEB-A-003__hero_portrait.webp` | `HASHES.csv` | hero art, palette, garden theme; raw image excluded from public git |
| `MG-EV-20260320-WEB-A-004` | published image | `https://bgaming.com/wp-content/uploads/2025/06/6821cc79d7a20dee334a97ab_Screenshot-2025-05-12-at-12.21.53-scaled.webp` | `local_only/capture_sessions/MG-CS-20260320-WEB-A/downloads/MG-EV-20260320-WEB-A-004__base_game_gallery.webp` | `HASHES.csv` | base game layout, HUD, reel frame; raw image excluded from public git |
| `MG-EV-20260320-WEB-A-005` | published image | `https://bgaming.com/wp-content/uploads/2025/06/68248af6e8faebbb8f0650af_Mystery_garden_bonus_game_desktop.webp` | `local_only/capture_sessions/MG-CS-20260320-WEB-A/downloads/MG-EV-20260320-WEB-A-005__bonus_game_gallery.webp` | `HASHES.csv` | free spins active state, sticky wins, counter; raw image excluded from public git |
| `MG-EV-20260320-WEB-A-006` | published image | `https://bgaming.com/wp-content/uploads/2025/06/68248aea05d32c8594d5886b_Mystery_garden_scatter_desktop.webp` | `local_only/capture_sessions/MG-CS-20260320-WEB-A/downloads/MG-EV-20260320-WEB-A-006__scatter_gallery.webp` | `HASHES.csv` | scatter presentation, win strip, bonus-ready state; raw image excluded from public git |
| `MG-EV-20260320-WEB-A-007` | published image | `https://bgaming.com/wp-content/uploads/2025/06/68248aec1131b68180575b72_Mystery_garden_free_spins_desktop.webp` | `local_only/capture_sessions/MG-CS-20260320-WEB-A/downloads/MG-EV-20260320-WEB-A-007__free_spins_gallery.webp` | `HASHES.csv` | free spins trigger modal, award amount; raw image excluded from public git |
| `MG-EV-20260320-WEB-A-008` | published image | `https://bgaming.com/wp-content/uploads/2025/06/68248af1a6063e2dc273a5c1_Mystery_garden_buy_bonus_desktop.webp` | `local_only/capture_sessions/MG-CS-20260320-WEB-A/downloads/MG-EV-20260320-WEB-A-008__buy_bonus_gallery.webp` | `HASHES.csv` | buy bonus modal, observed purchase amount; raw image excluded from public git |
| `MG-EV-20260320-LIVE-A-001` | runtime screenshot | `https://demo.bgaming-network.com/play/MysteryGarden/FUN?server=demo` | `local_only/capture_sessions/MG-CS-20260320-LIVE-A/downloads/MG-EV-20260320-LIVE-A-001__runtime_intro_click_to_start.png` | `HASHES.csv` | live intro/start state and visible launch CTA; raw image excluded from public git |
| `MG-EV-20260320-LIVE-A-002` | runtime screenshot | `https://demo.bgaming-network.com/play/MysteryGarden/FUN?server=demo` | `local_only/capture_sessions/MG-CS-20260320-LIVE-A/downloads/MG-EV-20260320-LIVE-A-002__runtime_base_idle_after_start.png` | `HASHES.csv` | live idle board, live HUD values, visible `5x3` layout, and buy bonus panel; raw image excluded from public git |
| `MG-EV-20260320-LIVE-A-003` | runtime screenshot | `https://demo.bgaming-network.com/play/MysteryGarden/FUN?server=demo` | `local_only/capture_sessions/MG-CS-20260320-LIVE-A/downloads/MG-EV-20260320-LIVE-A-003__runtime_post_spin_base_game.png` | `HASHES.csv` | live post-spin board change, live balance change, and visible wild token; raw image excluded from public git |
| `MG-EV-20260320-LIVE-A-004` | runtime request JSON | `https://demo.bgaming-network.com/api/MysteryGarden/<runtime-session-redacted>` | `local_only/capture_sessions/MG-CS-20260320-LIVE-A/downloads/MG-EV-20260320-LIVE-A-004__runtime_init_request.json` | `HASHES.csv` | live init request structure; raw body excluded from public git |
| `MG-EV-20260320-LIVE-A-005` | runtime response JSON | `https://demo.bgaming-network.com/api/MysteryGarden/<runtime-session-redacted>` | `local_only/capture_sessions/MG-CS-20260320-LIVE-A/downloads/MG-EV-20260320-LIVE-A-005__runtime_init_response.json` | `HASHES.csv` | live available actions, currency, feature multipliers, and non-authoritative service layout fields; raw body excluded from public git |
| `MG-EV-20260320-LIVE-A-006` | observation note | `https://demo.bgaming-network.com/play/MysteryGarden/FUN?server=demo` | `capture_sessions/MG-CS-20260320-LIVE-A/MG-EV-20260320-LIVE-A-006__runtime_observation_notes.md` | `HASHES.csv` | live build/version notes, asset-request observations, input notes, and capture blockers |

## Proven Facts
- Fourteen evidence items have been captured for the first Mystery Garden pack.
- Every captured item has a SHA-256 recorded in `HASHES.csv`.
- The current evidence pack now includes both published official evidence and one real live public runtime session.

## Assumptions
- Published marketing screenshots remain useful for bonus states that were not reached live, but they are not sufficient for frame-accurate timing.
- The current pack is enough for a bounded local replay slice and importer proof, but not for math reconstruction or production integration.

## TODO Investigation Items
- Add a separate observable-runtime capture session for a saved `spin` request/response pair, bonus entry, and restart behavior.
- Add evidence for paytable contents, full symbol inventory, and exact animation timing.
- Confirm the meaning of the published volatility value before using it as a gameplay design input.
