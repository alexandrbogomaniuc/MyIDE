# VABS Module Strategy

## What This Is
GS VABS support is an additional MyIDE module for archived round history, per-game replay package scaffolding, folder mapping, deployment validation, and support/history replay readiness.

## What This Is Not
- It is not a rewrite of the current MyIDE shell.
- It is not a replacement for the current internal scene editor.
- It is not raw donor asset drag/drop editing.
- It is not the final production VABS renderer for a shipped game.

## Current Product Truth
- The current validated MyIDE slice is still `project_001`.
- The current shell edits the reconstructed internal scene under `40_projects/project_001/internal`.
- Raw donor material remains read-only evidence.
- VABS belongs alongside that editor flow, not inside or instead of it.

## Why VABS Stays Separate
- The current editor solves internal scene authoring.
- GS VABS solves support/history replay requirements.
- These concerns have different contracts, deployment targets, and validation rules.
- Keeping them separate protects the current editor from unnecessary coupling and lets each project own its own VABS package lifecycle.

## When VABS Starts In The Game Lifecycle
Start VABS work early, not at the end.

Every new game should define, from day one:
- the GS VABS folder name
- the archived replay row schema
- the renderer scaffold
- the static host/deployment validation path
- the acceptance test path for support/history replay

## Recommended MyIDE VABS Shape
- Reference audit and patterns live under `01_reference/gs_vabs/`.
- Project-local VABS work lives under `40_projects/<project_id>/vabs/`.
- Scaffold and verification tooling lives under `tools/gs-vabs/`.
- The current shell/editor remains the internal-scene authoring tool.

## Project-Level Deliverables
For each project, VABS work should produce:
- contract notes for archived rows and payload keys
- a renderer package scaffold with clearly marked templates
- asset notes for the future static package
- deploy notes for target host/path checks
- acceptance notes proving deterministic replay readiness

## Delivery Rule
A project is not VABS-ready until it has:
- an explicit folder-name decision
- a documented `ROUND_ID` requirement
- a deterministic archived row sample
- a renderer scaffold
- a deploy checklist
- an acceptance checklist

## Current GS-VABS-A Scope
This run adds:
- strategy docs
- grounded GS reference audit notes
- a `project_001` VABS scaffold
- local scaffold/verify tooling

This run does not add:
- a production GS VABS renderer
- deep shell/runtime coupling
- donor asset editing

## Current GS-VABS-B Scope
This run adds:
- one intended `project_001` folder-name decision: `mysterygarden`
- one concrete sanitized archived-row contract fixture
- one parser/verification harness for that fixture
- one project-specific renderer stub package under `renderer/mysterygarden/`

This run still does not add:
- a finished production GS VABS renderer
- live GS runtime dependency
- any change to the current internal-scene editor model

## Current GS-VABS-C Scope
This run adds:
- one stronger derived archived-row fixture with clearer provenance notes
- one local replay harness that loads the row fixture through the shared parser and runs the `mysterygarden` stub locally
- one minimal replay-summary panel stub that renders `ROUND_ID`, state flow, wallet summary, trigger/follow-up cues, encoded boards, and evidence refs deterministically

This run still does not add:
- a finished production GS VABS renderer
- live GS deployment/runtime dependency
- any change to the current internal-scene editor model

## Current GS-VABS-D Scope
This run adds:
- one explicit captured-vs-derived provenance lane for `project_001`
- one stronger derived fixture that now carries a live-captured `ROUND_ID`
- one captured-row attempt note that records the exact blocker when no full `playerBets` row is available
- one explicit captured-row intake path split between a local raw row and a future sanitized commit-safe row
- one stronger local replay harness with fixture-tier output and provenance in the replay artifacts
- one stronger `mysterygarden` stub that surfaces provenance, feature cues, boards, and evidence refs more clearly

This run still does not add:
- a finished production GS VABS renderer
- a captured full archived `playerBets` row for Mystery Garden
- any change to the current internal-scene editor model

## Current GS-VABS-E Scope
This run adds:
- one clearer captured-row intake path with local raw vs sanitized captured tiers
- one deterministic fixture-comparison lane for `project_001`
- one stronger provenance-aware local replay harness and verification output

This run still does not add:
- a finished production GS VABS renderer
- a committed full captured archived `playerBets` row
- any change to the current internal-scene editor model

## Current GS-VABS-F Scope
This run adds:
- one stronger raw-intake -> sanitize -> verify captured-row workflow
- one tracked source-log for exactly which donor/canonical locations were checked for a real archived row
- one explicit rule that `auto` replay selection only promotes a sanitized captured row
- one stronger provenance-aware replay summary that reports sanitized/raw availability and comparison notes

This run still does not add:
- a finished production GS VABS renderer
- a committed full captured Mystery Garden archived `playerBets` row
- any change to the current internal-scene editor model

## Current GS-VABS-G Scope
This run adds:
- one deterministic GS-style local export package under `common/vabs/mysterygarden/`
- one local export preview dry-run that loads the exported package rather than the source renderer path
- one stronger deployment-readiness layer with explicit package-shape and manifest expectations
- local validation artifacts that feel closer to GS delivery without claiming production package readiness

This run still does not add:
- a finished production GS VABS renderer
- live JSP/static-host deployment proof
- a committed full captured Mystery Garden archived `playerBets` row
- any change to the current internal-scene editor model
