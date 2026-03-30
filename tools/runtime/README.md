# Runtime Mirror Tooling

Local-first helper for the bounded `project_001` Mystery Garden runtime mirror slice.

## Current scope
- `project_001` only
- HTML5 Mystery Garden runtime only
- bounded partial local mirror only
- raw donor files stay read-only

## Command
- `npm run runtime:mirror:project_001`
- `npm run runtime:harvest:project_001`

## Output
- `40_projects/project_001/runtime/local-mirror/manifest.json`
- `40_projects/project_001/runtime/local-mirror/files/`
- `40_projects/project_001/runtime/local-mirror/request-log.latest.json`

## Honest limit
- This tool captures the strongest grounded local mirror we can support today.
- It does **not** create or claim a full standalone local donor runtime package.
- The strongest current proof now leaves no unresolved upstream bootstrap/static dependency in the current launch/start/spin cycle, the embedded runtime tap proves a real local `bundle.js` request inside Runtime Mode, and direct local launch inspection proves the bounded mirror can serve local `bundle.js` plus local preloader images.
- The strongest current static override candidate inside the embedded Electron Runtime Mode proof is still mirror-manifest-backed, not request-backed, so the runtime does not yet prove an override hit in this bounded slice.
- The new guest-preload introspection bridge now also proves the current embedded slice exposes `frameCount=0`, `accessibleFrameCount=0`, `canvasCount=0`, and resource windows only at `top`.
