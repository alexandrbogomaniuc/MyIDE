# Project 001 Runtime Package Inventory

## Hard answers
- `FULL_LOCAL_RUNTIME_PACKAGE = no`
- `PARTIAL_LOCAL_RUNTIME_PACKAGE = yes`

## Strongest grounded local runtime entry candidates
1. `http://127.0.0.1:38901/runtime/project_001/launch`
   - status: bounded local launch path
   - blocker: local server still refreshes launch HTML against the live donor entry so launch token/API state is not standalone
2. `40_projects/project_001/runtime/local-mirror/files/cdn.bgaming-network.com/loader--q1774630728.js`
   - status: grounded mirrored runtime loader
   - grounded note: defines `resources_root_path`, `resources_path`, version `v0.0.15_53dc164`, and `bundle.js`
   - blocker: only one part of the runtime package; no complete local HTML/bootstrap state
3. `40_projects/project_001/runtime/local-mirror/files/cdn.bgaming-network.com/bundle.js`
   - status: grounded mirrored runtime bundle
   - grounded note: references concrete runtime asset families such as `img/spines/*.json`, `img/coins/coin.json`, `img/ui/logo.png`, and translation roots
   - blocker: the referenced runtime metadata files are not present locally
4. `40_projects/project_001/runtime/local-mirror/files/`
   - status: strong partial local hostable runtime asset root
   - grounded note: contains `47` mirrored files across `7` hosts after the latest safe refresh
   - blocker: still missing the deeper runtime asset families needed for standalone local runtime proof

## Local mirror inventory summary
- manifest entries: `47`
- file extension counts:
  - `.js`: `33`
  - `.png`: `9`
  - `.gif`: `3`
  - `.jpg`: `1`
  - `.bin`: `1`
- host coverage:
  - `cdn.bgaming-network.com`: `38`
  - `boost2.bgaming-network.com`: `2`
  - `rs-cdn.shared.bgaming-system.com`: `2`
  - `drops-fe.bgaming-network.com`: `1`
  - `lobby.bgaming-network.com`: `1`
  - `replays.bgaming-network.com`: `1`
  - `www.googletagmanager.com`: `1`

## Strongest bounded local package proof
- the local mirror contains:
  - launch path served through MyIDE
  - versioned loader variants
  - `bundle.js`
  - preloader image set
  - bounded third-party bootstrap/runtime scripts
- current request-harvest evidence confirms local/proxied use of:
  - `bundle.js`
  - `drops-fe bundle.js`
  - `lobby-bundle.js`
  - `wrapper.js`
  - `amplitude.js`
  - `replays.js`

## Exact blockers for a full standalone local package
- no local donor `index.html` or standalone donor launch HTML package inside the donor/runtime boundary
- no local launch token/API/websocket stack independent of upstream donor services
- no locally captured runtime asset roots for:
  - `img/spines/*.json`
  - `img/coins/coin.json`
  - `img/ui/logo.png`
  - translation payloads
  - fonts/runtime support files
- request-harvest evidence still proves request-backed scripts better than request-backed static runtime images

## Product-direction answer
- local runtime package work is still the next best path
- the next practical hunt should target the concrete bundle-discovered runtime asset families, not more editor-side grouping work
