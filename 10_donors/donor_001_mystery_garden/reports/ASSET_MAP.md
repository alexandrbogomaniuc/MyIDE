# Mystery Garden Asset Map

## Asset Groups
| Internal Asset ID | Group | Status | Donor Claim | Evidence | PHASE 2 Local Representation |
| --- | --- | --- | --- | --- | --- |
| `asset.bg.garden-dawn` | background | proven fact | The donor uses a calm garden backdrop and illustrated hero palette. | `MG-EV-20260320-WEB-A-003`, `MG-EV-20260320-WEB-A-004`, `MG-EV-20260320-LIVE-A-002` | CSS gradient and labeled placeholder block |
| `asset.board.book-frame` | gameplay frame | proven fact | The reel board is presented as a book-like or framed garden panel with a visible `5x3` layout. | `MG-EV-20260320-WEB-A-004`, `MG-EV-20260320-WEB-A-005`, `MG-EV-20260320-LIVE-A-002` | bordered board container |
| `asset.symbol.scatter-key` | symbol | proven fact | Gold key scatters are used to trigger free spins. | `MG-EV-20260320-WEB-A-001`, `MG-EV-20260320-WEB-A-006` | text token `KEY` |
| `asset.symbol.wild-book` | symbol | proven fact | A wild symbol exists and a `W` book-style wild token is visible in live runtime. | `MG-EV-20260320-WEB-A-001`, `MG-EV-20260320-LIVE-A-003`, `MG-EV-20260320-LIVE-A-006` | text token `BOOK` |
| `asset.ui.left-summary` | UI | proven fact | A left-side information panel is used in base, bonus, and buy-bonus presentations. | `MG-EV-20260320-WEB-A-005`, `MG-EV-20260320-WEB-A-008`, `MG-EV-20260320-LIVE-A-002` | side info card |
| `asset.ui.bottom-controls` | UI | proven fact | The bottom HUD contains bet, balance, and main controls. | `MG-EV-20260320-WEB-A-004`, `MG-EV-20260320-LIVE-A-002` | footer controls bar |
| `asset.modal.free-spins-award` | overlay | proven fact | A centered modal announces `10` awarded free spins. | `MG-EV-20260320-WEB-A-007` | overlay card |
| `asset.modal.buy-bonus` | overlay | proven fact | A buy bonus modal is shown with a green confirmation action. | `MG-EV-20260320-WEB-A-008` | inspection-only mapped placeholder |
| `ref.donor.spine.runtime-pack` | runtime spine pack | proven fact | Live runtime requests include spine payloads for `wild`, `scatter`, `key`, `bird`, `Start_page`, `FS_popups`, `big_win`, `antisipation`, and multiple `m*` / `h*` symbols. | `MG-EV-20260320-LIVE-A-006` | not imported in PHASE 3 |
| `ref.donor.localization.en` | localization | proven fact | Live runtime requests include `translations.bgaming-network.com/MysteryGarden/en.json`. | `MG-EV-20260320-LIVE-A-006` | not imported in PHASE 3 |
| `ref.donor.fonts.runtime` | font pack | proven fact | Live runtime requests include `SoupOfJustice.woff2` and `ElMessiri-Bold.woff2`. | `MG-EV-20260320-LIVE-A-006` | not imported in PHASE 3 |

## Proven Facts
- All replay/runtime assets remain clean placeholders that point to internal project records, not donor files.
- Donor evidence IDs are preserved as provenance references on the internal asset records.
- Live runtime now proves the existence of donor translation, font, and spine asset groups without pulling them into preview runtime.

## Assumptions
- The placeholder `BOOK` token stands in for at least one book-like symbol observed in the donor materials, but the exact production art and full symbol family are still unresolved.

## TODO Investigation Items
- Capture the full symbol inventory and paytable from observable runtime behavior.
- Replace placeholder blocks with original recreated art in a later non-PHASE-2 milestone.
