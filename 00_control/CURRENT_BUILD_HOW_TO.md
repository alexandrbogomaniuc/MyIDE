# Current Build: How To Use It

Use this when you want to test the current MyIDE build exactly as it works today.

## 1. Launch The Current Build
1. Finder double-click daily start: `./run/Start-MyIDE-Workbench.command`.
2. Finder double-click clean demo/test start: `./run/Start-MyIDE-Workbench-Clean.command`.
3. Finder double-click runtime-only debug start: `./run/Open-Runtime-Debug-Host.command`.
4. Finder double-click safe runtime refresh: `./run/Refresh-Runtime-Assets.command`.
5. Terminal equivalents:
   - `./run/start-workbench.sh`
   - `./run/start-workbench-clean.sh`
   - `./run/open-runtime-debug-host.sh`
   - `./run/refresh-runtime-assets.sh`
6. If you still need the raw commands, the scripts wrap these existing repo commands:
   - `manual:prepare:project_001`
   - `donor-assets:index:project_001`
   - `runtime:harvest:project_001`
   - `runtime:debug:project_001`
   - `dev`
7. Runtime debug rule:
   - `./run/Open-Runtime-Debug-Host.command` and `npm run runtime:debug:project_001` are the interactive runtime window path.
   - `npm run smoke:electron-runtime-debug` is the automated proof harness.

Recommended rule:
- If you are unsure, double-click `./run/Start-MyIDE-Workbench.command`.
- Use the clean launcher only when you intentionally want a clean `project_001` baseline.

## 2. Open The Validated Project
1. In the shell, use **Project Browser**.
2. Open `project_001` (`Mystery Garden Replay Slice`).
3. If the list looks stale, click **Rescan Workspace**.

## 2A. Start A New Project From A Donor URL
1. In **New Project**, fill in:
   - **Display Name**
   - **Slug**
   - **Donor Reference / ID**
   - **Donor Launch URL** if you already have one
   - **Target / Resulting Game**
2. Click **Create Project**.
3. MyIDE now does two things:
   - scaffolds the project under `40_projects/<slug>/`
   - scaffolds the shared donor pack under `10_donors/<donorId>/`
4. If a launch URL was supplied, MyIDE also captures:
   - `raw/bootstrap/launch.html`
   - `raw/bootstrap/launch-request.json`
   - `raw/discovered/discovered-urls.json`
   - `reports/DONOR_INTAKE_REPORT.md`
   - `evidence/local_only/harvest/asset-manifest.json`
   - `evidence/local_only/harvest/package-manifest.json`
   - `evidence/local_only/harvest/package-graph.json`
   - downloaded bounded recursive static assets under `evidence/local_only/harvest/files/`
5. The donor panel now surfaces the harvest manifest, donor-package manifest, and donor-package graph summary so you can see how many referenced URLs, bounded asset families, graph nodes, graph edges, and unresolved entries were captured.
6. Downloaded package-graph images now join the donor asset palette automatically, grouped by harvested runtime/package bundle, so you can drag one image at a time or use **Import Bundle To Compose** for a whole captured family of editable donor-backed objects instead of keeping them stuck in read-only capture files.
6. This is still only a bounded donor-package slice. It does not yet recurse through the full runtime package or expose full game logic as editable objects.

## 3. Runtime Mode Is The Primary Workflow
1. `project_001` now opens into **Runtime** mode when the grounded donor runtime entry is available.
2. Use the new **Workflow Hub** in the left column to switch the side context between **Runtime**, **Donor**, **Compose**, **VABS**, and **Project** without hunting through one long stack of panels.
3. Runtime Mode is the main working surface; **Compose** mode is the bounded secondary workflow.
4. Use **Launch Runtime** to open the recorded Mystery Garden donor runtime inside the shell.
4. Use **Launch Runtime** to open the bounded local Mystery Garden runtime mirror inside the shell when it is available on this machine.
5. Use **Reload Runtime** to refresh the runtime surface.
6. Use **Click To Start** if the donor runtime needs one bounded pointer click to begin.
7. Use **Spin / Trigger** if you want the bounded runtime action path that currently sends `Space` to the runtime surface.
8. Use **Use Debug Host** from the Runtime toolbar as the primary runtime action.
9. The dedicated Runtime Debug Host loads the same local mirror in a separate window and is the current path that can prove a request-backed static image override hit.
10. Use **Pick / Inspect** and then click the live runtime surface when you need the strongest grounded runtime trace available inside the shell.
11. Read the right-hand inspector and runtime asset workbench for picked target, request-backed source priority, runtime/display-object trace when exposed, texture/frame info when exposed, runtime URL, local mirror file path when grounded, the current runtime resource-map record, override eligibility, and supporting evidence refs.
12. Use the new runtime bridge actions in the inspector or workbench to:
   - focus the strongest grounded donor asset card
   - focus the strongest grounded donor evidence entry
   - focus a related compose object if one already exists for that donor-linked asset
13. If the picked runtime trace or runtime asset workbench shows **Eligible static image override**, click **Create Override**.
14. The embedded runtime reloads immediately, and you should reopen or keep using **Use Debug Host** for the strongest override-hit confirmation path.
15. Use **Clear Override** if you want to restore the original donor runtime asset.
16. Use **Show Runtime Note** or **Show Init Response** to jump back to the grounded runtime evidence behind the current Runtime Mode slice.

## 4. Where Donor Evidence Appears
1. In the shell, donor content appears in **Donor Assets & Evidence**.
2. On a typical window size, that panel sits in the **left column below Project Browser**.
3. If you do not see it immediately, scroll the left column down.
4. The donor area now has two bounded parts:
   - a donor asset palette for supported local donor images
   - the existing read-only donor evidence drill-down for refs, sessions, and linkage
5. The donor asset palette now supports quick search, format filters such as `PNG` and `WEBP`, and a visible donor import target layer control.

## 5. Scene Mode Is Still Available
1. Use the **Compose** tab in the workbench mode bar when you want the bounded internal compositor instead of the live donor runtime.
2. Compose Mode is where donor images can still be composed into the internal scene, replaced onto existing objects, resized, aligned, distributed, saved, and reloaded.

## 6. What You Can Edit Today
You can edit the reconstructed internal scene for `project_001` in **Compose** mode, including new donor-backed image objects created from the donor asset palette.

Current editable workflow:
- select objects from the scene list or canvas
- create placeholder objects from the preset picker
- choose the donor import target layer in **Donor Assets & Evidence**
- drag one supported donor image asset from **Donor Assets & Evidence** into empty canvas space to create a new internal image object on that target layer
- drag a second supported donor image asset into the canvas if you want to confirm multiple donor-backed imports in one session
- drag one supported donor image asset directly over an editable canvas object if you want to replace it while keeping the same object slot, layer, and layout
- use **Replace Selected Object** on a donor asset card if you want the bounded button path instead of direct drop-to-replace
- drag a marquee box across visible canvas objects if you want a bounded multi-select path
- use `Shift`/`Cmd` click in the scene list or canvas if you want to add or remove one object from the current selection
- move objects on the canvas
- change bounded inspector fields
- resize placeholder-backed objects
- resize donor-backed imported image objects with the small bottom-right canvas handle on the selected donor-backed image
- align or distribute the current multi-selection from the canvas toolbar
- use **Show Asset In Palette** or **Show Evidence** from the donor summary on a selected donor-backed object if you want to jump back to donor source context quickly
- use **Open Runtime Context** from a selected donor-backed runtime screenshot object if you want to move straight back to Runtime Mode
- align placeholder-backed objects to the viewport
- reassign objects between unlocked layers
- reorder objects within the current layer
- duplicate and delete objects
- undo and redo
- save and reload

The live editable source is still:
- `40_projects/project_001/internal/scene.json`
- `40_projects/project_001/internal/layers.json`
- `40_projects/project_001/internal/objects.json`

Save still syncs the replay-facing:
- `40_projects/project_001/project.json`

## 7. What Is Still Blocked
You still cannot edit donor source files directly, and the current runtime-first slice has real limits.

Current hard limits:
- there is still no captured full local donor runtime package for `project_001`
- Runtime Mode now prefers a bounded local runtime mirror when it is available, but that mirror still depends on the live donor launch upstream for launch HTML/token/API state
- the first static override slice works only for grounded static runtime image URLs that the current runtime trace can prove and that match a supported donor image file type
- when Runtime Mode uses the local mirror, the shell can now trace one grounded static runtime candidate back to a local mirror file path and show the current request map; no unresolved upstream bootstrap/static dependency remains in the current bounded cycle, the embedded runtime tap now proves a local `bundle.js` hit, direct local launch inspection proves the mirror can serve local static assets, but the embedded Runtime Mode slice still does not confirm a request-backed static override hit
- the embedded runtime webview is still weaker for live asset-level proof, so the bounded dedicated Runtime Debug Host is now the official runtime work mode for `project_001`
- the strongest previously verified embedded-runtime proof is still the reason it stays secondary: `frameCount=0`, `accessibleFrameCount=0`, `canvasCount=0`, resource window labels stay at `top`, and no request-backed static image or display-object handle is exposed in the bounded embedded slice
- the dedicated Runtime Debug Host is the stronger proof path in daily use: it can surface a request-backed static image candidate from the local mirror and prove a bounded project-local override hit after reload
- pause, resume, and step only work if the embedded runtime exposes a stable ticker-like hook; if it does not, the shell shows the blocker instead of faking the control
- only `project_001` is supported in this slice
- only static donor image files are supported
- atlas/frame donor import is blocked in this build because no local atlas text or sprite-sheet metadata source exists for `project_001` yet
- no animation import
- no audio/video import
- no raw donor file mutation

The donor file remains read-only evidence. Runtime Mode can now create one bounded project-local static override, but it still does not edit raw donor files or donor runtime package files directly. Donor drag/drop in Compose Mode still creates a new internal scene object that preserves donor linkage.

## 8. Runtime Override Loop
1. Stay in **Runtime** mode.
2. Click **Use Debug Host**.
3. Use **Pick / Inspect** and click the live runtime surface.
4. Confirm the inspector or runtime asset workbench shows:
   - `Runtime Source: Local mirror` when the bounded mirror is available
   - a request-backed runtime source first when one exists, otherwise the strongest grounded local mirror candidate path
   - a runtime resource-map record for the current launch/reload cycle when one has been captured
   - whether the current trace is override-eligible
5. Click **Create Override**.
6. Wait for the embedded runtime to reload and keep using the Debug Host window for the strongest confirmation path.
7. Read the **Project-local Overrides** card, the active override detail in the inspector, or the selected runtime asset entry in the workbench.
8. If the current slice reports a blocker for the local mirrored candidate instead of a reload-time hit, treat that as the current honest limit rather than a silent failure.
9. Watch the `Inspection Bridge` card in Runtime Mode:
   - `main-world-execute-js` means the new preferred bridge attached
   - `guest-preload` means the shell fell back to the older isolated bridge
10. The current strongest blocker is still explicit: the request map is real, the embedded runtime tap proves a local `bundle.js` hit, the bounded local mirror can serve local static assets in a direct local launch, the strongest previously verified embedded bridge still proves `frameCount=0`, `accessibleFrameCount=0`, `canvasCount=0`, and the strongest current embedded Runtime Mode image candidate is still only mirror-manifest-backed rather than request-backed.
10. Use **Clear Override** when you want to restore the original runtime asset.
11. The override file stays under `40_projects/project_001/overrides/`, and raw donor files under `10_donors/` stay untouched.

## 9. Save / Reload Loop For Scene Composition
1. Switch to **Compose** mode.
2. Optionally choose a donor import target layer first.
3. Drag one donor image into empty canvas space.
4. If both `png` and `webp` donor assets are visible in the palette, import one of each for the stronger bounded donor proof.
5. Optionally drag a donor image over an existing editable object to replace it directly.
6. Drag a marquee box across two or more visible objects, or refine the selection with `Shift`/`Cmd` click from the scene list.
7. Use one or two toolbar composition actions such as **Align Left**, **Align Top**, **Align Center Horizontally**, **Distribute Horizontally**, or **Distribute Vertically**.
8. Select one donor-backed image and drag its small bottom-right resize handle if you want to test bounded direct manipulation.
9. Use **Show Asset In Palette**, **Show Evidence**, or **Open Runtime Context** from the donor summary if you want to confirm the unified bridge behavior.
10. Click **Save Scene Changes** or use `Ctrl/Cmd+S`.
11. Check that the editor state returns to **Saved**.
12. Click **Reload From Disk**.
13. Confirm the imported or replaced donor-backed objects still appear after reload, on the intended layer, with donor linkage details intact.

## 10. If You Hit A Bug
1. Stop after the first clear failure.
2. Run `npm run manual:bug-bundle`.
3. Add screenshots or exports into the new `attachments/` folder.
4. Fill in `BUG.md`.
5. If you only need a short paste-friendly status block, run `npm run manual:bug-context`.
