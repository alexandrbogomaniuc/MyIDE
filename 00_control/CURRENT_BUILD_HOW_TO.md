# Current Build: How To Use It

Use this when you want to test the current MyIDE build exactly as it works today.

## 1. Launch The Current Build
1. Run `npm run manual:prepare:project_001`.
2. Run `npm run dev`.
3. Wait for the Electron shell window to open.

## 2. Open The Validated Project
1. In the shell, use **Project Browser**.
2. Open `project_001` (`Mystery Garden Replay Slice`).
3. If the list looks stale, click **Rescan Workspace**.

## 3. Where Donor Evidence Appears
1. Before launching the shell, run `npm run donor-assets:index:project_001`.
2. In the shell, donor content appears in **Donor Assets & Evidence**.
3. On a typical window size, that panel sits in the **left column below Project Browser**.
4. If you do not see it immediately, scroll the left column down.
5. The donor area now has two bounded parts:
   - a donor asset palette for supported local donor images
   - the existing read-only donor evidence drill-down for refs, sessions, and linkage

## 4. What You Can Edit Today
You can edit the reconstructed internal scene for `project_001`, including new donor-backed image objects created from the donor asset palette.

Current editable workflow:
- select objects from the scene list or canvas
- create placeholder objects from the preset picker
- drag one supported donor image asset from **Donor Assets & Evidence** into the canvas to create a new internal image object
- move objects on the canvas
- change bounded inspector fields
- resize placeholder-backed objects
- resize donor-backed imported image objects
- align placeholder-backed objects to the viewport
- reassign objects between unlocked layers
- reorder objects within the current layer
- duplicate and delete objects
- undo and redo
- save and reload

The live editable source is:
- `40_projects/project_001/internal/scene.json`
- `40_projects/project_001/internal/layers.json`
- `40_projects/project_001/internal/objects.json`

Save still syncs the replay-facing:
- `40_projects/project_001/project.json`

## 5. What You Cannot Edit Yet
You still cannot edit the donor source files themselves.

Current hard limits:
- only `project_001` is supported in this slice
- only static donor image files are supported
- no atlas slicing
- no animation import
- no audio/video import
- no raw donor file mutation

The donor file remains read-only evidence. Drag/drop creates a new internal scene object that preserves donor linkage.

## 6. Save / Reload Loop
1. Optionally drag one donor image into the canvas.
2. Click **Save Scene Changes** or use `Ctrl/Cmd+S`.
3. Check that the editor state returns to **Saved**.
4. Click **Reload From Disk**.
5. Confirm the imported donor-backed object and any later edits still appear after reload.

## 7. If You Hit A Bug
1. Stop after the first clear failure.
2. Run `npm run manual:bug-bundle`.
3. Add screenshots or exports into the new `attachments/` folder.
4. Fill in `BUG.md`.
5. If you only need a short paste-friendly status block, run `npm run manual:bug-context`.
