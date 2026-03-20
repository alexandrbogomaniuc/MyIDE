# Open Source Reuse Plan

## Goal
Reuse MIT-friendly tools, patterns, and small modules where they accelerate MyIDE, while avoiding unverified license copying and avoiding donor-specific contamination.

## Proven Facts
- The current reference client depends on `pixi.js`, `typescript`, and `vite`. Evidence: `/Users/alexb/Documents/Dev/new-games-client/package.json:1-14`.
- The current reference server depends on `fastify`, `@fastify/cors`, `tsx`, and `typescript`. Evidence: `/Users/alexb/Documents/Dev/new-games-server/package.json:1-19`.
- The reference repos already use small TypeScript-first toolchains rather than large framework-heavy stacks. Evidence: `/Users/alexb/Documents/Dev/new-games-client/package.json:1-14`, `/Users/alexb/Documents/Dev/new-games-server/package.json:1-19`.

## Reuse Policy
- Prefer reuse of architecture patterns before reuse of source files.
- Verify license metadata before any direct code import.
- Keep donor evidence, generated artifacts, and reusable implementation code in separate folders.
- Favor thin wrappers and adapters over copying whole runtime subsystems.

## Safe Early Reuse Candidates
- TypeScript build configuration patterns.
- Vite-based web renderer development flow.
- Fastify route/testing patterns for local adapter mocks.
- Pixi-based preview rendering patterns if the preview canvas proves it useful.
- Local proof/test script structure as inspiration for later validation tooling.

## Deferred Until Verified
- Any direct copy of runtime scripts from the reference server.
- Any extraction of game-specific client modules from the reference client.
- Any third-party dependency not yet checked for license compatibility in the context of MyIDE packaging.

## Assumptions
- Using mainstream TypeScript desktop/web tooling will keep licensing manageable, but each concrete dependency still needs verification before release.

## TODO Investigation Items
- Record SPDX/license findings for every dependency added to MyIDE.
- Decide whether the preview layer benefits more from Pixi or from a DOM/canvas hybrid once the shell scaffold exists.
- Identify any minimal utilities worth promoting from the reference repos after code and license review.

## Current Reuse Direction
- `PCUI` is the preferred direction for property-panel style tooling UI.
- `PCUI-Graph` is the preferred direction for future graph/trigger surfaces.
- `GDevelop` remains workflow inspiration only, especially for scene/layout and logic-workspace separation.
- `Electron` remains the desktop shell foundation and is not being replaced in PHASE 3.

## Local Boundary Rule
- Third-party UI libraries must stay behind local MyIDE adapters.
- Core replay and import logic must only talk to local adapter interfaces and local view-models.
