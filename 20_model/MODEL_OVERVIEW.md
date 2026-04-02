# MyIDE Model Overview

## Purpose
The internal model is the editable source of truth for reconstructed games inside MyIDE. It is intentionally separate from donor raw assets, donor atlases, and donor JSON files.

## Proven Facts
- V1 is slot-only.
- V1 is single-user only.
- Raw donor files must remain separate and read-only.
- The first milestone is donor to local preview.
- MyIDE is a universal local-first IDE with a multi-project workspace model, even though the current implementation slice remains slot-first.
- Each project is expected to carry donor linkage, internal model data, target/resulting game metadata, verification history, and phase/status context.
- Project folders under `40_projects/` are the authoritative source of project existence.
- `registry.json` is a derived cache generated from discovered project folders, not the sole source of truth.
- Each project now carries an explicit four-stage lifecycle backbone across investigation, modification/compose/runtime, math/config, and GS export.
- Shell-created project scaffolds and manually added valid project folders use the same `project.meta.json` contract and the same discovery path.

## Draft Model Shape
- `workspace.schema.json`
  - workspace identity, project browser state, and folder-discovery-derived registry path for the shell.
- `project-registry.schema.json`
  - a deterministic cache derived from discovered project folders.
- `project-metadata.schema.json`
  - project-level linkage between donor evidence, internal clean model, target/resulting game, standard project roots, and lifecycle stage statuses.
- `donor-link.schema.json`
  - explicit donor provenance and evidence references for a project.
- `target-game.schema.json`
  - the resulting or future game target for a project, with clear status markers.
- `project.schema.json`
  - overall project metadata,
  - storage roots,
  - evidence ledger,
  - references to the modular schemas.
- `assets.schema.json`
  - clean asset catalog for imported, recreated, original, or placeholder assets.
- `scene.schema.json`
  - backward-compatible legacy scene graph plus the first editable scene/layer/object contract for visual editor slices.
  - supports split internal scene documents for header, layer stack, and object placement while keeping replay validation intact.
- `animations.schema.json`
  - clips, timelines, and trigger bindings.
- `states.schema.json`
  - gameplay and UI state machines.
- `bindings.schema.json`
  - bindings between UI, model state, filesystem actions, and runtime actions.
- `server-map.schema.json`
  - adapter-facing contract map for local preview and later GS integration.
- `messages.schema.json`
  - replay and UI copy packs with evidence-aware message ids.
- `localization.schema.json`
  - locale overlays that map clean message ids to strings.
- `client-config.schema.json`
  - preview-shell configuration overlays for deterministic local replay.
- `rng-source.schema.json`
  - explicit origin for mock, captured, or upstream random sources.
- `state-history.schema.json`
  - restart and resume checkpoints for replay and later adapter recovery.

## Core Rules
- No internal runtime asset path may point into donor `raw/`.
- Donor-derived claims must pass through the project evidence ledger.
- Each claim is marked as `proven`, `assumption`, or `todo`.
- The model supports placeholder and recreated assets so local replay can progress before every donor detail is fully proven.
- Replay fixtures, mock `gameState`, and mock `lastAction` live under `40_projects/` and are internal data only.
- The first editable scene slice for `project_001` lives under `40_projects/project_001/internal/scene.json`, `layers.json`, and `objects.json`, while the legacy `project.json` replay slice remains the runtime source of truth for now.
- The preview-facing shell bundle derives its replay-facing project and scene view from the editable internal scene files when they exist, so the editor path no longer silently trusts the stale `project.json` copy.
- Placeholder-backed objects can carry explicit `width` and `height` in the internal object document; the current editor exposes those fields only for bounded placeholder sizing, and deterministic replay sync exports the same dimensions into replay-facing node positions.

## Assumptions
- File-backed JSON artifacts are sufficient for PHASE 2.
- The first imported projects will benefit from one root document referencing modular sub-documents.
- PHASE 2 restart recovery can be modeled with clean internal checkpoints before any production adapter exists.
- The shell can consume discovered project summaries while the replay engine continues to consume only `project_001` internal data.
- The lifecycle model remains intentionally file-backed and small enough for shell-created projects and manual folder additions.
- The authoritative relationship for the first visual editor slice is `internal/scene.json + layers.json + objects.json -> deterministic preview and replay bridge`, while `project.json` is now the replay export target produced from that internal model.

## TODO Investigation
- Decide whether the derived registry cache should stay single-file or split by product line when the list grows.
- Decide how much of the project metadata should be duplicated between registry summaries and project meta files.
- Decide whether a future workspace file should become the shell's active-state source or remain an editor-only concept.
