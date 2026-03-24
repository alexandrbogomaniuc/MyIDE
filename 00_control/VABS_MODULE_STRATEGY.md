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
