# Donor Assets

Local-first tooling for the donor image import slice and the first bounded runtime static override slice.

## Current Scope
- `project_001` only
- static donor images only
- supported formats: `png`, `webp`, `jpg`, `jpeg`, `svg`
- raw donor files stay read-only
- project-local runtime overrides stay local to `40_projects/project_001/overrides/`

## Command
- `npm run donor-assets:index:project_001`
- `npm run donor-assets:verify-override:project_001`
- `npm run runtime:mirror:project_001`
- `npm run runtime:harvest:project_001`

## Output
- Local index: `40_projects/project_001/donor-assets/local-index.json`
- Local runtime override manifest: `40_projects/project_001/overrides/runtime-asset-overrides.json`
- Local runtime override files: `40_projects/project_001/overrides/runtime-assets/`
- Local runtime mirror manifest: `40_projects/project_001/runtime/local-mirror/manifest.json`
- Local runtime mirror files: `40_projects/project_001/runtime/local-mirror/files/`
- Local runtime request log: `40_projects/project_001/runtime/local-mirror/request-log.latest.json`

The donor index, runtime mirror, and runtime override outputs are local-only and intentionally gitignored. They record importable donor image metadata plus bounded local runtime/override state for the current machine without publishing raw donor binaries or mutating donor source files.

The current shell also surfaces a bounded runtime request map for the active launch/reload cycle so testers can see which runtime URLs actually resolved to local mirror files or active override files. The strongest current proof now leaves no unresolved upstream bootstrap/static dependency in the current cycle, the embedded runtime tap proves a real local `bundle.js` request, direct local launch inspection proves the mirror can serve local static assets, and the same honest override blocker remains in the embedded Runtime Mode slice: the strongest current image candidate is still mirror-manifest-backed rather than request-backed. The shell now prefers a stronger main-world introspection bridge too, but the strongest previously verified embedded result is still the older `0` child frames / `0` canvases proof because the current Electron smoke environment is aborting in AppKit before MyIDE emits its own main-process marker.

Deep donor-scan result:
- strong partial local runtime package: yes
- full standalone local donor runtime package: no
- atlas/frame import from current local files: no
- concrete bundle-discovered runtime metadata candidates do now exist, including `img/spines/*.json`, `img/coins/coin.json`, and `img/ui/logo.png`, but the referenced local files are still missing.
