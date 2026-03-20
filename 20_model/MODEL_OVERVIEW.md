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

## Draft Model Shape
- `workspace.schema.json`
  - workspace identity, project browser state, and registry path for the shell.
- `project-registry.schema.json`
  - the multi-project registry consumed by the shell and future workspace tooling.
- `project-metadata.schema.json`
  - project-level linkage between donor evidence, internal clean model, and target/resulting game.
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
  - scene graph and layout nodes for preview and shell presentation.
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

## Assumptions
- File-backed JSON artifacts are sufficient for PHASE 2.
- The first imported projects will benefit from one root document referencing modular sub-documents.
- PHASE 2 restart recovery can be modeled with clean internal checkpoints before any production adapter exists.
- The workspace registry can stay small and explicit until additional projects are added.
- The shell can consume registry summaries while the replay engine continues to consume only `project_001` internal data.

## TODO Investigation
- Decide whether future projects should share a single workspace registry file or split by product line when the list grows.
- Decide how much of the project metadata should be duplicated between registry summaries and project meta files.
- Decide whether a future workspace file should become the shell's active-state source or remain an editor-only concept.
