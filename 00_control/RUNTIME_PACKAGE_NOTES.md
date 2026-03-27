# Runtime Package Notes

## Current grounded result
- `project_001` does **not** currently have a captured local donor runtime package or local HTML runtime entry that the shell can launch honestly.
- Runtime Mode therefore continues to use the recorded public Mystery Garden donor demo entry inside the shell.

## Checked local candidates
- `10_donors/donor_001_mystery_garden/evidence/local_only/`
- `10_donors/donor_001_mystery_garden/evidence/capture_sessions/MG-CS-20260320-LIVE-A/`
- `40_projects/project_001/runtime/`

## Grounded files currently present
- `10_donors/donor_001_mystery_garden/evidence/local_only/capture_sessions/MG-CS-20260320-LIVE-A/downloads/MG-EV-20260320-LIVE-A-004__runtime_init_request.json`
- `10_donors/donor_001_mystery_garden/evidence/local_only/capture_sessions/MG-CS-20260320-LIVE-A/downloads/MG-EV-20260320-LIVE-A-005__runtime_init_response.json`
- `10_donors/donor_001_mystery_garden/evidence/capture_sessions/MG-CS-20260320-LIVE-A/MG-EV-20260320-LIVE-A-006__runtime_observation_notes.md`
- `40_projects/project_001/runtime/mock-game-state.json`
- `40_projects/project_001/runtime/mock-last-action.json`

## What is missing
- no local donor `index.html`
- no captured local runtime JS bundle
- no grounded local static host path for the donor runtime package
- no local donor asset root that can be launched as the real Mystery Garden runtime package

## Current best launch target
- Recorded donor runtime entry from the live capture session:
  - `https://demo.bgaming-network.com/play/MysteryGarden/FUN?server=demo`

## Exact blocker
- Source availability is still the blocker.
- Until one real local donor runtime package or entry point is captured into the donor/runtime boundary, Runtime Mode cannot honestly prefer a local package over the recorded public donor runtime entry.
