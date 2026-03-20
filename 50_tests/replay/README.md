# Replay Assertions

## Purpose
- Assert that the local replay still loads internal project data only.
- Verify the normal spin, free-spins trigger, and restart-restore paths against `project_001`.

## Command
- `npm run assert:replay`
- `npm run verify:project_001`

## Known Gaps
- Assertions cover deterministic replay structure and state flow, not production server behavior.
- Visual fidelity still depends on separate manual/GUI checks.
