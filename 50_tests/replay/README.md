# Replay Assertions

## Purpose
- Assert that the local replay still loads internal project data only.
- Verify the normal spin, free-spins trigger, and restart-restore paths against `project_001`.
- Keep replay assertions separate from workspace discovery and registry validation.

## Command
- `npm run assert:replay`

## Known Gaps
- Assertions cover deterministic replay structure and state flow, not production server behavior.
- Visual fidelity still depends on separate manual/GUI checks.
- Replay assertions currently prove the bounded `project_001` slice only.
