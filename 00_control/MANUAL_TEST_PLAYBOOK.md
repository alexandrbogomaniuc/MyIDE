# Manual Test Playbook

Use this when testing the current local MyIDE build by hand.

## Before You Start
1. Run `npm run manual:prepare:project_001`.
2. If you only need a quick context check, run `npm run manual:status`.
3. Launch the shell with `npm run dev`.
4. Test the LOCAL build on this machine, not the public GitHub snapshot.
5. If you do not want the full prepare flow, `npm run manual:reset:project_001` still restores only the `project_001` baseline.

## Core Checklist
1. App launch
   - Electron opens without a crash and the shell window appears.
2. Bridge health
   - The bridge health card shows the preload bridge is healthy.
3. `project_001` load
   - `project_001` appears in the project list and loads without error.
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
4. Run `npm run manual:bug-context` and copy the output.
5. Fill in [`MANUAL_BUG_TEMPLATE.md`](./MANUAL_BUG_TEMPLATE.md).
6. If needed, run `npm run manual:status` again for a second quick context check.
