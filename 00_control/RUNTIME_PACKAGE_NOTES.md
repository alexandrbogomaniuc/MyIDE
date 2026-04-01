# Runtime Package Notes

## Current grounded result
- `FULL_LOCAL_RUNTIME_PACKAGE = no`
- `PARTIAL_LOCAL_RUNTIME_PACKAGE = yes`
- `project_001` still does **not** currently have a full captured standalone local donor runtime package or a standalone local donor HTML entry that can run without upstream launch/token state.
- The shell does have a strong bounded **partial local runtime mirror** for the strongest grounded Mystery Garden launch path on this machine.
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
- `40_projects/project_001/runtime/local-mirror/manifest.json`
- `40_projects/project_001/runtime/local-mirror/request-log.latest.json`
- `40_projects/project_001/runtime/local-mirror/files/cdn.bgaming-network.com/bundle.js`
- `40_projects/project_001/runtime/local-mirror/files/cdn.bgaming-network.com/loader--q1774630728.js`

## What is missing
- no local donor `index.html`
- no full standalone local donor launch HTML package under the donor/runtime boundary
- no local donor launch token/API/websocket stack independent of upstream
- no locally captured runtime asset root for `img/spines/*.json`, `img/coins/coin.json`, `img/ui/logo.png`, translations, or font/runtime support files
- no grounded local donor asset root that can be launched as the real Mystery Garden runtime package without fallback

## What now exists
- `40_projects/project_001/runtime/local-mirror/manifest.json`
- `40_projects/project_001/runtime/local-mirror/files/`
- `40_projects/project_001/runtime/local-mirror/request-log.latest.json`
- bounded local mirror launch URL:
  - `http://127.0.0.1:38901/runtime/project_001/launch`
- bounded local mirror asset host:
  - `http://127.0.0.1:38901/runtime/project_001/assets/...`
- grounded mirrored runtime files:
  - `33` JavaScript files
  - `9` PNG files
  - `3` GIF files
  - `1` JPG file
  - `1` BIN file
- grounded local mirror host coverage from `manifest.json` (`46` entries total):
  - `cdn.bgaming-network.com`: `38`
  - `boost2.bgaming-network.com`: `2`
  - `rs-cdn.shared.bgaming-system.com`: `2`
  - `drops-fe.bgaming-network.com`: `1`
  - `lobby.bgaming-network.com`: `1`
  - `replays.bgaming-network.com`: `1`
  - `www.googletagmanager.com`: `1`
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
- Runtime Mode can now honestly prefer the bounded local mirror, but it still cannot honestly claim a full captured local donor package until one real local donor HTML package plus the runtime asset families named in `bundle.js` are captured into the donor/runtime boundary.
- The deepest grounded runtime asset hints now come from `bundle.js`, not local asset files:
  - `img/spines/Start_page.json`
  - `img/spines/bird.json`
  - `img/spines/antisipation.json`
  - `img/spines/big_win.json`
  - `img/spines/key.json`
  - `img/spines/FS_popups.json`
  - `img/spines/stick.json`
  - `img/spines/h1.json`
  - `img/spines/h2.json`
  - `img/spines/h3.json`
  - `img/spines/m1.json`
  - `img/spines/m2.json`
  - `img/spines/m3.json`
  - `img/spines/m4.json`
  - `img/spines/scatter.json`
  - `img/spines/wild.json`
  - `img/coins/coin.json`
  - `img/ui/logo.png`
  - `https://translations.bgaming-network.com/MysteryGarden`
- Those references mean local runtime package work is still the next best path, while atlas/frame import remains blocked until the referenced runtime metadata files are actually captured locally.

## Current bounded workaround
- The shell now supports one bounded project-local static override slice on top of the local mirror/runtime boundary.
- When Runtime pick/inspect exposes the strongest grounded static Mystery Garden runtime source we can prove, the shell can create a project-local override under `40_projects/project_001/overrides/`, reload Runtime Mode without cache, and keep raw donor files untouched.
- Honest current limit:
  - Runtime Mode now launches from the local mirror URL, can trace one grounded static runtime candidate back to a local mirror file path, and can show the current launch/reload request map in the shell.
- No unresolved upstream bootstrap/static dependency remains in the current bounded launch/start/spin cycle.
- Direct local launch inspection now proves the bounded mirror can serve local `bundle.js` plus local preloader images such as `logo-lights.png`, `split.png`, and `a.png`.
- The embedded Electron Runtime Mode request tap now proves a real local `bundle.js` request inside the runtime webview partition.
- The strongest previously verified embedded guest-preload runtime introspection bridge proved `frameCount=0`, `accessibleFrameCount=0`, `canvasCount=0`, and resource window labels only at `top` in the current bounded embedded slice.
- The repo now includes a bounded dedicated Runtime Debug Host path that loads the same local mirror in a separate BrowserWindow and is the stronger runtime-trace workflow for `project_001`.
- The dedicated debug-host smoke now proves a request-backed local static image candidate plus a bounded project-local override hit after reload.
- The embedded Electron Runtime Mode proof still does not surface a request-backed static image in the current bounded slice, so the selected static override candidate remains mirror-manifest-backed rather than request-backed and the first hit-confirmed local override is still blocked.
