# Manual Test Playbook

Use this when testing the current local MyIDE build by hand.

## Before You Start
1. This test edits reconstructed internal scene data under `40_projects/project_001/internal`; donor evidence under `10_donors/` is read-only in the current shell.
2. Run `npm run manual:prepare:project_001`.
3. If you only need a quick context check, run `npm run manual:status`.
4. Launch the shell with `npm run dev`.
5. Test the LOCAL build on this machine, not the public GitHub snapshot.
6. If you do not want the full prepare flow, `npm run manual:reset:project_001` still restores only the `project_001` baseline.

## Core Checklist
1. App launch
   - Electron opens without a crash and the shell window appears.
2. Bridge health
   - The bridge health card shows the preload bridge is healthy.
3. `project_001` load
   - `project_001` appears in the project list and loads without error.
   - The read-only Donor Evidence panel shows donor/capture context for the project.
4. Create and edit
   - Create one placeholder object from the preset picker.
   - Select it and change at least one inspector field such as `displayName`, `width`, or `height`.
5. Move and layout
   - Drag the new object on the canvas.
   - Try one alignment action.
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
   - Confirm the final state is still visible after reload.
9. Evidence linkage
   - With an object selected, inspect the read-only Evidence Linkage section.
   - If linkage is grounded, evidence refs should be visible.
   - If linkage is not grounded, the shell should say so plainly instead of inventing provenance.

## Expected Result
- The app stays open.
- Bridge health stays good.
- `project_001` loads.
- The created object remains editable.
- Drag, resize, align, reassign, reorder, duplicate/delete, and undo/redo behave coherently.
- Save/reload keeps the final intended state.

## If Something Fails
1. Stop after the first clear failure.
2. Take a screenshot.
3. Note the exact step where it failed.
4. Run `npm run manual:bug-bundle`.
5. Put screenshots or exported files into the new `attachments/` folder.
6. Finish `BUG.md` inside the new bundle folder.
7. If you only need a quick text block for chat or notes, run `npm run manual:bug-context` too.
