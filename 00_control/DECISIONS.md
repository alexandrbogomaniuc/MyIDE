# MyIDE Decisions

## Accepted

### D-001: Slot-only V1
- Status: accepted
- Reason: the current mission and first donor pipeline are slot-specific.

### D-002: Single-user desktop app with web UI
- Status: accepted
- Reason: V1 is local-first and does not need collaborative editing or hosted web deployment.

### D-003: Raw donor evidence is separate from editable source
- Status: accepted
- Reason: donor materials are read-only evidence and must not become the editable runtime source of truth.

### D-004: GSRefactor is reference/upstream, not a direct implementation dependency
- Status: accepted
- Reason: the audited reference repos are narrow single-game services and do not yet form a reusable editor platform.

### D-005: PHASE 1 desktop shell uses Electron plus TypeScript with a local HTML/CSS renderer
- Status: accepted
- Reason: it matches the existing JavaScript/TypeScript tooling direction in the audited client/server repos while providing a local desktop container without introducing Rust or native bridge complexity in the first milestone.

### D-006: The internal model includes an evidence ledger
- Status: accepted
- Reason: MyIDE must separate proven facts, assumptions, and TODO investigations and link donor-derived claims back to evidence.

### D-007: PHASE 1 avoids production server integration
- Status: accepted
- Reason: the first milestone is donor to local preview; the audited NGS server currently keeps runtime state in memory and is not a suitable production adapter baseline.

## Pending

### P-001: Local project persistence backend
- Options under consideration:
  - plain JSON files under `40_projects/`,
  - JSON plus an index manifest,
  - local embedded database.
- Current direction: JSON-first files, because PHASE 2 needs inspectable project artifacts more than database features.

### P-002: Internal replay renderer stack beyond PHASE 1 placeholders
- Options under consideration:
  - PixiJS reuse,
  - canvas 2D for editor chrome plus Pixi for preview,
  - full custom renderer abstraction.
- Current direction: keep the preview shell renderer-agnostic in PHASE 1 and evaluate PixiJS reuse in PHASE 2.
