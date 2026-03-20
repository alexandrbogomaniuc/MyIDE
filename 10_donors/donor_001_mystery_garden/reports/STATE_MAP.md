# Mystery Garden State Map

## Proven State Spine
| Internal State ID | Donor-Facing Label | Classification | Proven Claim | Evidence |
| --- | --- | --- | --- | --- |
| `state.donor.intro-start` | Intro / start screen | proven donor state, not yet imported | The live runtime opens on a dedicated start screen with `CLICK TO START`. | `MG-EV-20260320-LIVE-A-001` |
| `state.idle` | Base game idle | proven fact | The game shows a reel board, title plate, left panel, bottom HUD, and spin control in live runtime. | `MG-EV-20260320-LIVE-A-002` |
| `state.spin` | Spin in progress | proven existence, timing unresolved | A live interaction produced a changed post-spin board and balance change, proving the spin path exists even though motion cadence is still uncaptured. | `MG-EV-20260320-LIVE-A-002`, `MG-EV-20260320-LIVE-A-003`, `MG-EV-20260320-LIVE-A-006` |
| `state.base-win` | Base win reveal | proven fact | A blue result strip and scatter-led win presentation are visibly used. | `MG-EV-20260320-WEB-A-006` |
| `state.free-spins-trigger` | Free spins award modal | proven fact | The game displays a `YOU HAVE WON 10 FREE SPINS` overlay. | `MG-EV-20260320-WEB-A-007` |
| `state.free-spins-active` | Free spins with sticky wins | proven fact | Free spins show sticky framed wins and a `9/10` counter in the published screenshot. | `MG-EV-20260320-WEB-A-001`, `MG-EV-20260320-WEB-A-005` |
| `state.restore.free-spins-active` | Local restart restore checkpoint | internal assumption | PHASE 2 introduces this recovery state so the preview can restore from mocked `gameState` and `lastAction` without production integration. | internal project runtime fixtures only |

## Transition Spine
| From | Event | To | Status | Evidence |
| --- | --- | --- | --- | --- |
| `state.donor.intro-start` | `ui.start.clicked` | `state.idle` | proven donor transition, not yet imported | `MG-EV-20260320-LIVE-A-001`, `MG-EV-20260320-LIVE-A-002`, `MG-EV-20260320-LIVE-A-006` |
| `state.idle` | `spin.requested` | `state.spin` | proven existence, command path unresolved | `MG-EV-20260320-LIVE-A-002`, `MG-EV-20260320-LIVE-A-003`, `MG-EV-20260320-LIVE-A-006` |
| `state.spin` | `spin.resolved.baseWin` | `state.base-win` | proven replay slice based on observed win state | `MG-EV-20260320-WEB-A-006` |
| `state.spin` | `spin.resolved.freeSpinsTrigger` | `state.free-spins-trigger` | proven replay slice based on official rules and trigger modal | `MG-EV-20260320-WEB-A-001`, `MG-EV-20260320-WEB-A-007` |
| `state.free-spins-trigger` | `bonus.start` | `state.free-spins-active` | proven replay slice based on bonus screenshot | `MG-EV-20260320-WEB-A-005`, `MG-EV-20260320-WEB-A-007` |
| `state.restore.free-spins-active` | `restart.restore` | `state.free-spins-active` | internal assumption for PHASE 2 recovery demo | internal project runtime fixtures only |

## Proven Facts
- The replay slice can now ground `state.idle` on live runtime evidence rather than published screenshots alone.
- Live evidence also proves a donor intro/start state and the existence of a spin interaction path.
- Restart restore exists in PHASE 2 as a local replay capability, not as a donor-backed production claim.

## Assumptions
- Exact spin timing, settle timing, and exit timing remain assumptions until motion-focused runtime capture is added.

## TODO Investigation Items
- Capture a live free-spins trigger and live restart evidence from a public session.
- Confirm whether there are additional visible intermediary states between trigger and free spins active.
