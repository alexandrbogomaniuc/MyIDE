# Manual Test Playbook

Use this when testing the current local MyIDE build by hand.

## Before You Start
1. This test edits reconstructed internal scene data under `40_projects/project_001/internal`; raw donor files under `10_donors/` stay read-only even when a donor image is imported.
2. Run `npm run manual:prepare:project_001`.
3. Run `npm run donor-assets:index:project_001`.
4. If you only need a quick context check, run `npm run manual:status`.
5. Launch the shell with `npm run dev`.
6. Test the LOCAL build on this machine, not the public GitHub snapshot.
7. If you do not want the full prepare flow, `npm run manual:reset:project_001` still restores only the `project_001` baseline.
8. GS VABS validation is a separate delivery lane; it does not replace the current shell manual QA flow.

## Core Checklist
1. App launch
   - Electron opens without a crash and the shell window appears.
2. Bridge health
   - The bridge health card shows the preload bridge is healthy.
3. `project_001` load
   - `project_001` appears in the project list and loads without error.
   - The **Donor Assets & Evidence** panel appears in the left column below Project Browser, so scroll the left column if you do not see it immediately.
   - The donor asset palette shows at least one supported local donor image card after indexing.
   - If both `png` and `webp` donor images exist locally, the palette filter buttons should show both formats.
   - The donor palette should show a clear donor import target layer control.
   - At least one donor asset card shows filename/type/provenance and a lightweight preview or honest preview fallback.
   - Expand at least one donor evidence drill-down section and confirm copy helpers are visible for donor IDs, paths, sessions, or refs.
4. Create and edit
   - Create one placeholder object from the preset picker.
   - Choose a donor import target layer.
   - Drag one donor asset card into empty canvas space and confirm a new donor-backed image object appears on the intended layer.
   - If a second grounded donor image is available, drag a second donor asset card into the canvas too.
   - Drag one donor asset card directly over an editable canvas object and confirm it replaces that object while keeping its slot and layer.
   - Optionally compare that direct drop-to-replace path with **Replace Selected Object** on a donor asset card.
   - Select it and change at least one inspector field such as `displayName`, `width`, or `height`.
5. Move and layout
   - Drag the new object on the canvas.
   - Use a marquee box or `Shift`/`Cmd` selection to select more than one visible object.
   - If the marquee catches extra visible objects, narrow the exact selection from the scene list before composition.
   - Try at least one multi-object align action.
   - Try at least one multi-object distribute action once three objects are selected.
   - Select one donor-backed image object and use its bottom-right resize handle once.
   - Try one alignment action on a placeholder-backed object.
   - Try one layer reassignment.
   - Try one reorder action within the current layer.
6. Lifecycle actions
   - Duplicate the object.
   - Delete the duplicate.
7. History
   - Undo once.
   - Redo once.
8. Save and reload
   - Save the scene.
   - Reload from disk.
   - Confirm imported and replaced donor-backed objects are still visible after reload on the intended layer.
9. Evidence linkage
   - With an object selected, inspect the read-only Evidence Linkage section.
   - If linkage is grounded, grouped linkage rows and evidence refs should be visible.
   - For the imported donor image object, confirm the donor summary card shows donor asset id, donor evidence id, file type, filename, donor-relative path, and placement layer.
   - In the scene list, imported donor-backed objects should be visibly marked as donor-backed rather than generic placeholders.
   - Use **Show Asset In Palette** from the donor summary on a selected donor-backed object and confirm the donor asset card is focused in the donor palette.
   - If donor evidence is grounded, use **Show Evidence** and confirm the linked donor evidence entry is focused in the evidence browser.
   - Use one linkage helper to focus that evidence in the Donor Evidence panel or to filter the donor evidence view down to the selected object.
   - Copying one grounded evidence ref or linkage id should work when a copy button is shown.
   - If linkage is not grounded, the shell should say so plainly instead of inventing provenance.

## Expected Result
- The app stays open.
- Bridge health stays good.
- `project_001` loads.
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
- The shell now supports one bounded donor import slice, but it is still limited.
- Remaining blockers:
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
