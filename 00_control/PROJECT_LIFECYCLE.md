# Project Lifecycle

## Universal Model
One MyIDE project represents one full donor-to-release cycle.

The cycle is:
- donor evidence
- donor report
- import mapping
- internal replay
- target concept
- target build
- integration
- qa
- release prep

Each stage must carry one of these statuses:
- planned
- in-progress
- blocked
- ready-for-review
- verified
- deferred

## Lifecycle Rule
- `project_001` is currently the only project with a verified replay slice.
- Other projects may exist as planned or scaffolded projects, but they must not be marked verified unless evidence supports that claim.
- Non-slot support and production adapter work remain unimplemented until a future validated slice proves them.

## Standard Project Folder
Each project should live under `40_projects/<project_slug>/` and use this structure:

- `project.meta.json`
- `donor/`
- `reports/`
- `imports/`
- `internal/`
- `runtime/`
- `fixtures/`
- `target/`
- `release/`
- `logs/`

## Transitional Compatibility
- `project_001` remains compatible with the current replay/import path while the folder standard is being introduced.
- Existing validated slice files may remain alongside the new folder standard during transition.
- New projects should follow the standard folder layout from the start.

## Source Of Truth
- Project existence should be discoverable from valid project folders.
- `project.meta.json` should describe the donor link, target/resulting game, lifecycle stage statuses, phase/status, verification status, and key paths.
- Any derived workspace index should be treated as a cache or summary, not the sole source of truth.
