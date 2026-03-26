# Donor Asset Source Notes

Current grounded donor image sources for `project_001` come from:
- `10_donors/donor_001_mystery_garden/evidence/HASHES.csv`
- `10_donors/donor_001_mystery_garden/evidence/local_only/capture_sessions/MG-CS-20260320-WEB-A/downloads/`
- `10_donors/donor_001_mystery_garden/evidence/local_only/capture_sessions/MG-CS-20260320-LIVE-A/downloads/`

Grounded usable image classes currently present on this machine:
- published donor screenshots in `webp` (`6`)
- live runtime screenshots in `png` (`3`)

Current stronger bounded proof assets:
- `10_donors/donor_001_mystery_garden/evidence/local_only/capture_sessions/MG-CS-20260320-LIVE-A/downloads/MG-EV-20260320-LIVE-A-002__runtime_base_idle_after_start.png`
- `10_donors/donor_001_mystery_garden/evidence/local_only/capture_sessions/MG-CS-20260320-WEB-A/downloads/MG-EV-20260320-WEB-A-004__base_game_gallery.webp`

Current first-slice intent:
- show those images in a bounded donor asset palette
- drag/drop one image into the internal scene as an editable object
- preserve donor linkage through evidence id and donor-relative path

Current stronger-slice intent:
- make the palette easier to filter by image format
- show donor-backed linkage clearly in the object list and inspector
- prove more than one real donor image import survives save/reload
- prove donor import can land on an intended layer
- prove one existing editable object can be replaced with donor art while preserving layout and donor linkage

Out of scope in this slice:
- atlas slicing
- animation import
- audio/video import
- raw donor file mutation
