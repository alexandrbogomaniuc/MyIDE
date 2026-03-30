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
- grounded mirrored third-party runtime/bootstrap scripts observed during the latest harvest, including `replays.js`, `gtag/js`, and two `rs-cdn.shared.bgaming-system.com` plugin scripts

## What the mirror does not prove yet
- a full standalone local donor runtime package
- a local donor launch token/API/websocket stack independent of the live upstream
- a confirmed reload-time hit for the current mirrored static override candidate, even though the shell now records a bounded request map for the current launch/reload cycle

## Current local launch path
- `http://127.0.0.1:38901/runtime/project_001/launch`

## Current exact blocker
- The shell can now trace one grounded static runtime candidate back to a local mirror file path and record the current launch/reload request map.
- No unresolved upstream bootstrap/static dependency remains in the current bounded launch/start/spin cycle.
- Direct local launch inspection shows the bounded mirror can serve local `bundle.js` plus local preloader images such as `logo-lights.png`, `split.png`, and `a.png`.
- The embedded Electron Runtime Mode proof now exposes a request-backed local `bundle.js` hit in the runtime partition, but it still does not expose a request-backed static image in the current bounded cycle, so the strongest current image candidate remains mirror-manifest-backed and cannot prove an override hit yet.
- The strongest previously verified embedded guest-preload introspection bridge proved `frameCount=0`, `accessibleFrameCount=0`, `canvasCount=0`, and resource window labels only at `top`, so there was no hidden same-origin child frame or accessible canvas surface in that bounded embedded slice.
- The embedded runtime path is now treated as a no-go for stronger asset-level proof in this environment, so the repo also includes a bounded dedicated Runtime Debug Host path that loads the same local mirror in a separate BrowserWindow.
- Electron smoke now aborts in macOS AppKit before MyIDE emits either its embedded or debug-host markers, so the stronger trace path could not be verified end-to-end here.
