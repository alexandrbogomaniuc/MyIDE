# Runtime Package Notes

## Current grounded result
- `project_001` still does **not** currently have a full captured local donor runtime package or a standalone local HTML runtime entry.
- The shell now does have a bounded **partial local runtime mirror** for the strongest grounded Mystery Garden launch path on this machine.
- Runtime Mode now prefers that local mirror when it is available.

## Checked local candidates
- `10_donors/donor_001_mystery_garden/evidence/local_only/`
- `10_donors/donor_001_mystery_garden/evidence/capture_sessions/MG-CS-20260320-LIVE-A/`
- `40_projects/project_001/runtime/`

## Grounded files currently present
- `10_donors/donor_001_mystery_garden/evidence/local_only/capture_sessions/MG-CS-20260320-LIVE-A/downloads/MG-EV-20260320-LIVE-A-004__runtime_init_request.json`
- `10_donors/donor_001_mystery_garden/evidence/local_only/capture_sessions/MG-CS-20260320-LIVE-A/downloads/MG-EV-20260320-LIVE-A-005__runtime_init_response.json`
- `10_donors/donor_001_mystery_garden/evidence/capture_sessions/MG-CS-20260320-LIVE-A/MG-EV-20260320-LIVE-A-006__runtime_observation_notes.md`
- `40_projects/project_001/runtime/mock-game-state.json`
- `40_projects/project_001/runtime/mock-last-action.json`

## What is missing
- no local donor `index.html`
- no captured local runtime JS bundle
- no grounded local static host path for the donor runtime package
- no local donor asset root that can be launched as the real Mystery Garden runtime package

## What now exists
- `40_projects/project_001/runtime/local-mirror/manifest.json`
- `40_projects/project_001/runtime/local-mirror/files/`
- `40_projects/project_001/runtime/local-mirror/request-log.latest.json`
- bounded local mirror launch URL:
  - `http://127.0.0.1:38901/runtime/project_001/launch`
- bounded local mirror asset host:
  - `http://127.0.0.1:38901/runtime/project_001/assets/...`
- bounded runtime resource map in the shell for the current launch/reload cycle:
  - requested runtime URL
  - matched local mirror file path when grounded
  - active override file path when grounded
  - hit count

## Current best launch target
- Recorded donor runtime entry from the live capture session:
  - `https://demo.bgaming-network.com/play/MysteryGarden/FUN?server=demo`

## Exact blocker
- Source availability is still the blocker for a **full local donor runtime package**.
- Runtime Mode can now honestly prefer the bounded local mirror, but it still cannot honestly claim a full captured local donor package until one real local donor HTML/JS package or entry point is captured into the donor/runtime boundary.

## Current bounded workaround
- The shell now supports one bounded project-local static override slice on top of the local mirror/runtime boundary.
- When Runtime pick/inspect exposes the strongest grounded static Mystery Garden runtime source we can prove, the shell can create a project-local override under `40_projects/project_001/overrides/`, reload Runtime Mode without cache, and keep raw donor files untouched.
- Honest current limit:
  - Runtime Mode now launches from the local mirror URL, can trace one grounded static runtime candidate back to a local mirror file path, and can show the current launch/reload request map in the shell.
- No unresolved upstream bootstrap/static dependency remains in the current bounded launch/start/spin cycle.
- Direct local launch inspection now proves the bounded mirror can serve local `bundle.js` plus local preloader images such as `logo-lights.png`, `split.png`, and `a.png`.
- The embedded Electron Runtime Mode request tap now proves a real local `bundle.js` request inside the runtime webview partition.
- The strongest previously verified embedded guest-preload runtime introspection bridge proved `frameCount=0`, `accessibleFrameCount=0`, `canvasCount=0`, and resource window labels only at `top` in the current bounded embedded slice.
- The embedded runtime path is now treated as a no-go for stronger asset-level proof in this environment, so the repo also includes a bounded dedicated Runtime Debug Host path that loads the same local mirror in a separate BrowserWindow.
- The new exact blocker is environment-level: Electron smoke is aborting in macOS AppKit before MyIDE emits either the embedded or debug-host markers, so the stronger trace path still needs a healthy Electron GUI run.
- The embedded Electron Runtime Mode proof still does not surface a request-backed static image in the current bounded slice, so the selected static override candidate remains mirror-manifest-backed rather than request-backed and the first hit-confirmed local override is still blocked.
