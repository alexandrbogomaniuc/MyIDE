# Mystery Garden Animation Map

## Animation Groups
| Animation ID | Donor-Facing Effect | Status | Evidence | PHASE 2 Replay Behavior |
| --- | --- | --- | --- | --- |
| `anim.intro.dismiss` | Intro start-screen dismissal | proven existence, timing unresolved | `MG-EV-20260320-LIVE-A-001`, `MG-EV-20260320-LIVE-A-002`, `MG-EV-20260320-LIVE-A-006` | not imported in PHASE 3 replay |
| `anim.reels.spin` | Reel spin motion | proven existence, cadence unresolved | `MG-EV-20260320-LIVE-A-002`, `MG-EV-20260320-LIVE-A-003`, `MG-EV-20260320-LIVE-A-006` | lightweight board shimmer while state is `state.spin` |
| `anim.win-banner.flash` | Win result strip emphasis | proven existence, timing unresolved | `MG-EV-20260320-WEB-A-006` | pulse the local win banner during `state.base-win` |
| `anim.free-spins-modal.pop` | Free spins award reveal | proven existence, timing unresolved | `MG-EV-20260320-WEB-A-007` | scale and fade-in overlay during `state.free-spins-trigger` |
| `anim.frames.sticky-hold` | Sticky frame persistence during bonus | proven fact | `MG-EV-20260320-WEB-A-001`, `MG-EV-20260320-WEB-A-005` | mark sticky cells and keep them highlighted in the bonus replay |
| `anim.restore-chip.fade` | Restart recovery badge | internal assumption | internal project runtime fixtures only | fade-in recovery badge after mock restore |

## Proven Facts
- The current donor pack proves the existence of the intro-dismiss path, the spin path, the bonus overlay, sticky framed wins, and a win-strip presentation.

## Assumptions
- The exact duration, easing, and sequencing of these animations remain unknown until runtime observation is added.

## TODO Investigation Items
- Capture a motion-focused live session for spin cadence, modal timing, and sticky win transitions.
