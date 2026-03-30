# Manual Test Playbook

Use this when testing the current local MyIDE build by hand.

## Before You Start
1. This test edits reconstructed internal scene data under `40_projects/project_001/internal`; raw donor files under `10_donors/` stay read-only even when a donor image is imported.
2. Run `npm run manual:prepare:project_001`.
3. Run `npm run donor-assets:index:project_001`.
4. Run `npm run runtime:harvest:project_001` if you want a safe local mirror refresh before opening the shell.
5. Run `npm run runtime:harvest:smoke:project_001` only if you intentionally want a smoke-backed refresh from fresh Runtime Debug Host evidence.
5. If you only need a quick context check, run `npm run manual:status`.
6. Launch the shell with `npm run dev`.
7. Test the LOCAL build on this machine, not the public GitHub snapshot.
8. If you do not want the full prepare flow, `npm run manual:reset:project_001` still restores only the `project_001` baseline.
9. GS VABS validation is a separate delivery lane; it does not replace the current shell manual QA flow.

## Core Checklist
1. App launch
   - Electron opens without a crash and the shell window appears.
2. Bridge health
   - The bridge health card shows the preload bridge is healthy.
3. `project_001` load
   - `project_001` appears in the project list and loads without error.
   - Runtime Mode is selected by default when the grounded donor runtime entry is available.
   - The runtime toolbar is grouped separately from compose controls.
   - The left-side workflow rail shows `Runtime`, `Donor`, `Compose`, `VABS`, and `Project`.
4. Runtime-first path
   - Click **Launch Runtime** and confirm the live donor runtime loads inside the shell.
   - Confirm Runtime Mode now says whether the current source is **Local mirror** or **Public fallback**.
   - Click **Reload Runtime** and confirm the runtime refreshes.
   - If the runtime needs a starter interaction, use **Click To Start** once.
   - If a grounded gameplay trigger is exposed, use **Spin / Trigger** once.
   - Toggle **Pick / Inspect**, click the live runtime surface, and confirm the inspector shows the strongest grounded runtime trace available.
   - After a live runtime pick, confirm the inspector exposes at least one grounded bridge action such as **Focus Asset** or **Focus Evidence**.
   - Use one runtime bridge action and confirm the left-side workflow rail moves into the right source context.
   - If the picked trace is override-eligible, use **Create Override** once and confirm Runtime Mode reloads with a project-local override active.
   - If Runtime Mode is using the local mirror, confirm the inspector also shows a grounded local mirror source path for the current runtime candidate.
   - Confirm the inspector also shows a runtime resource-map record for the current launch/reload cycle.
   - Confirm the stronger embedded-runtime truth is visible when available: current bounded proof should show no accessible child frames or canvas surface in the embedded path, and the blocker should stay explicit rather than implying a hidden Pixi object.
- If the active override card shows a blocker instead of a request-backed hit for the current mirrored candidate, record that blocker exactly; the current stronger proof may still show a request-backed local `bundle.js` hit without any request-backed static image hit, and that is still a blocker for the override loop.
- Record which bridge attached in the Runtime inspector:
  - `main-world-execute-js`
  - or `guest-preload`
- If the app aborts before the runtime smoke even reaches the MyIDE main-process marker, record that exact launch blocker separately from runtime-trace blockers.
- If you are testing the strongest current runtime-trace path directly, use **Open Debug Host** in Runtime Mode or run `npm run runtime:debug:project_001` / `npm run smoke:electron-runtime-debug`.
   - Use **Clear Override** once and confirm the project-local override is removed cleanly.
   - Use **Show Runtime Note** or **Show Init Response** once and confirm the supporting donor evidence is focused.
   - If **Pause**, **Resume**, or **Step One Tick** are disabled, the shell should explain the blocker plainly instead of pretending those controls work.
5. Scene/donor composition path
   - Switch to **Compose** mode.
   - The **Donor Assets & Evidence** panel appears in the left column below Project Browser, so scroll the left column if you do not see it immediately.
   - The donor asset palette shows at least one supported local donor image card after indexing.
   - If both `png` and `webp` donor images exist locally, the palette filter buttons should show both formats.
   - The donor palette should show a clear donor import target layer control.
   - At least one donor asset card shows filename/type/provenance and a lightweight preview or honest preview fallback.
   - Expand at least one donor evidence drill-down section and confirm copy helpers are visible for donor IDs, paths, sessions, or refs.
6. Create and edit
   - Create one placeholder object from the preset picker.
   - Choose a donor import target layer.
   - Drag one donor asset card into empty canvas space and confirm a new donor-backed image object appears on the intended layer.
   - If a second grounded donor image is available, drag a second donor asset card into the canvas too.
   - Drag one donor asset card directly over an editable canvas object and confirm it replaces that object while keeping its slot and layer.
   - Optionally compare that direct drop-to-replace path with **Replace Selected Object** on a donor asset card.
   - Select it and change at least one inspector field such as `displayName`, `width`, or `height`.
7. Move and layout
   - Drag the new object on the canvas.
   - Use a marquee box or `Shift`/`Cmd` selection to select more than one visible object.
   - If the marquee catches extra visible objects, narrow the exact selection from the scene list before composition.
   - Try at least one multi-object align action.
   - Try at least one multi-object distribute action once three objects are selected.
   - Select one donor-backed image object and use its bottom-right resize handle once.
   - Try one alignment action on a placeholder-backed object.
   - Try one layer reassignment.
   - Try one reorder action within the current layer.
8. Lifecycle actions
   - Duplicate the object.
   - Delete the duplicate.
9. History
   - Undo once.
   - Redo once.
10. Save and reload
   - Save the scene.
   - Reload from disk.
   - Confirm imported and replaced donor-backed objects are still visible after reload on the intended layer.
11. Evidence linkage
   - With an object selected, inspect the read-only Evidence Linkage section.
   - If linkage is grounded, grouped linkage rows and evidence refs should be visible.
   - For the imported donor image object, confirm the donor summary card shows donor asset id, donor evidence id, file type, filename, donor-relative path, and placement layer.
   - In the scene list, imported donor-backed objects should be visibly marked as donor-backed rather than generic placeholders.
   - Use **Show Asset In Palette** from the donor summary on a selected donor-backed object and confirm the donor asset card is focused in the donor palette.
   - If donor evidence is grounded, use **Show Evidence** and confirm the linked donor evidence entry is focused in the evidence browser.
   - If the selected donor-backed object represents one of the grounded runtime screenshots, use **Open Runtime Context** and confirm Runtime Mode becomes active again.
   - Use one linkage helper to focus that evidence in the Donor Evidence panel or to filter the donor evidence view down to the selected object.
   - Copying one grounded evidence ref or linkage id should work when a copy button is shown.
   - If linkage is not grounded, the shell should say so plainly instead of inventing provenance.

## Expected Result
- The app stays open.
- Bridge health stays good.
- `project_001` loads.
- Runtime Mode loads the strongest grounded donor runtime source inside the shell.
- When the bounded local mirror is available, Runtime Mode should prefer `Local mirror` over `Public fallback`.
- Runtime controls are grouped clearly, and unsupported controls report blockers plainly.
- Runtime pick/inspect produces a grounded runtime trace instead of an empty or invented provenance card.
- Runtime pick can focus at least one grounded source context such as donor asset or donor evidence.
- The strongest current local-runtime proof should show no unresolved upstream bootstrap/static dependency in the bounded slice.
- For one grounded static Mystery Garden runtime image source, the shell can create a project-local override and clear it again.
- When the current runtime slice resolves that source through the bounded local mirror, the shell should also show the grounded local mirror file path.
- Runtime Mode now also shows the current launch/reload resource-map record when one has been captured.
- If the mirrored candidate still does not record a reload-time hit, the shell should report that blocker plainly instead of inventing success.
- The official Runtime Debug Host path should now prove one request-backed static image candidate and one bounded override hit after reload.
- The created object remains editable.
- At least one donor asset is visible in the donor asset palette.
- More than one donor asset can be imported into the scene as editable internal image objects when multiple grounded donor images are available locally.
- One editable object can be replaced directly on drop with a donor asset while preserving layout and save/reload behavior.
- Multi-object composition is available through bounded marquee/additive selection plus align/distribute actions.
- A selected donor-backed object can jump back to its source donor asset card and, when grounded, to its donor evidence entry.
- Donor source files stay read-only even after import.
- Drag, resize, align, reassign, reorder, duplicate/delete, and undo/redo behave coherently.
- Save/reload keeps the final intended state.

## Explicit Current Blocker
- The shell now supports one bounded runtime-first donor slice plus one bounded donor composition slice, but it is still limited.
- Remaining blockers:
  - there is still no captured full local donor runtime package for `project_001`
  - Runtime Mode can prefer a bounded local runtime mirror on this machine, but that is still not the same as a full captured local donor bundle
  - the bounded runtime override slice only works when the current runtime trace exposes a grounded static image URL and the chosen donor asset matches that file type
  - the current local-mirror override path now has a real request map, and no unresolved upstream bootstrap/static dependency remains in the bounded cycle
  - direct local launch inspection proves the mirror can serve local static assets, but the mirrored static override candidate is still only mirror-manifest-backed inside the strongest previously verified embedded Runtime Mode proof, so that part remains partially blocked
  - the embedded runtime path is still weaker for asset ownership truth than the dedicated Runtime Debug Host path and should be treated as secondary
  - the dedicated Runtime Debug Host now proves the first request-backed static image override hit and is the official runtime work mode for this validated slice, but the embedded Runtime Mode surface still does not expose the same asset-level truth
  - pause/resume/step only work when the embedded donor runtime exposes a stable ticker-like hook; otherwise the shell reports that blocker plainly
  - only `project_001` is supported
  - only supported local donor image files are importable
  - atlas/frame donor import is blocked on this machine because no local atlas text or sprite-sheet metadata source exists for `project_001` yet
  - no animation import, audio/video import, or generic donor format pipeline
  - imported objects are internal scene objects with donor linkage, not editable raw donor assets

## If Something Fails
1. Stop after the first clear failure.
2. Take a screenshot.
3. Note the exact step where it failed.
4. Run `npm run manual:bug-bundle`.
5. Put screenshots or exported files into the new `attachments/` folder.
6. Finish `BUG.md` inside the new bundle folder.
7. If you only need a quick text block for chat or notes, run `npm run manual:bug-context` too.
