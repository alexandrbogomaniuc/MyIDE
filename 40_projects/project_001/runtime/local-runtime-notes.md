# Project 001 Local Runtime Notes

## Current grounded result
- A bounded partial local Mystery Garden runtime mirror now exists under `40_projects/project_001/runtime/local-mirror/`.
- Runtime Mode prefers that mirror when it is available on this machine.
- This is still **not** a full captured local donor runtime package.

## What the mirror includes
- grounded live launch HTML refresh through the local shell mirror server
- grounded mirrored `loader.js`
- grounded mirrored `bundle.js`
- bounded mirrored static preloader/runtime image files

## What the mirror does not prove yet
- a full standalone local donor runtime package
- a local donor launch token/API/websocket stack independent of the live upstream
- a confirmed reload-time hit for the current mirrored static override candidate, even though the shell now records a bounded request map for the current launch/reload cycle

## Current local launch path
- `http://127.0.0.1:38901/runtime/project_001/launch`

## Current exact blocker
- The shell can now trace one grounded static runtime candidate back to a local mirror file path and record the current launch/reload request map, but the runtime still does not confirm a reload-time hit for that mirrored candidate after override reload.
