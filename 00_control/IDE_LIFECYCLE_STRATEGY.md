# IDE Lifecycle Strategy

MyIDE is moving toward one explicit project lifecycle for every future game:

1. Investigation
2. Modification / Compose / Runtime
3. Math / Config
4. GS Export

## Stage 1 — Investigation

Goal:
- open a donor project locally
- run static donor scan
- run bounded runtime/scenario capture
- track scenario-family coverage honestly
- let the IDE investigate by itself first with bounded profiles
- guide the operator when the bounded pass stops helping
- promote ready families/sections explicitly into Modification
- separate reconstruction-ready families from source-blocked families

Entry criteria:
- a donor URL, donor package, or donor evidence root exists

Exit criteria:
- the project has enough grounded source material for at least part of the scenario catalog
- the IDE can explain what is ready, what is blocked, what profile to run next, what manual action is needed next, and what is ready to promote into Modification

Key outputs:
- `scan-summary.json`
- `scenario-catalog.json`
- `scenario-coverage.json`
- `scenario-capture-log.json`
- `next-scenario-targets.json`
- `investigation-events.jsonl`
- `investigation-status.json`
- `reconstruction-ready-families.json`
- `modification-queue.json`

## Stage 2 — Modification / Compose / Runtime

Goal:
- move donor-backed work into reconstruction, compose, and runtime testing
- keep raw donor files read-only
- bridge donor evidence, runtime targets, compose objects, and override paths

Entry criteria:
- investigation proves at least partial reconstruction readiness

Exit criteria:
- runtime and reconstructed parts are stable enough that math/config changes make sense as a separate step

## Stage 3 — Math / Config

Goal:
- keep RTP, bets, feature parameters, and configuration work separate from visual/runtime reconstruction

Entry criteria:
- investigation and modification are stable enough that config changes are meaningful

Exit criteria:
- the project has a coherent runtime plus a coherent configuration package

## Stage 4 — GS Export

Goal:
- prepare the project for GS-side export, registration, packaging, and later wider assignment

Entry criteria:
- the project is stable enough to export without hiding upstream investigation or reconstruction blockers

Exit criteria:
- export artifacts are prepared honestly for the current project scope

## Investigation Lanes

The IDE must keep two lanes explicit:

- Lane A — ready for reconstruction / modification
- Lane B — still blocked on source material

The shell and agent should use those lanes to avoid mixing reconstruction work with source-hunt work.

## Agent Contract

The agent should summarize state from structured investigation artifacts, not screenshots alone:

- what was found
- what is still missing
- what profile to run next
- what manual action is needed
- whether the project is still investigation-only, partially ready, or ready for reconstruction

## Non-Goals For This Backbone

- do not rewrite the app from scratch
- do not overbuild math/config yet
- do not overbuild GS export yet
- do not treat `project_001` specifics as the permanent project model
