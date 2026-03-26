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
1. Donor evidence is shown in the **Donor Evidence** panel.
2. On a typical window size, that panel sits in the **left column below Project Browser**.
3. If you do not see it immediately, scroll the left column down.
4. The donor area is read-only context:
   - donor/capture summary
   - evidence refs
   - capture sessions
   - item-level evidence cards
   - lightweight previews where local preview artifacts already exist
   - copy helpers and linkage helpers

## 4. What You Can Edit Today
You can edit the reconstructed internal scene for `project_001`, not donor assets.

Current editable workflow:
- select objects from the scene list or canvas
- create placeholder objects from the preset picker
- move objects on the canvas
- change bounded inspector fields
- resize placeholder-backed objects
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
You cannot directly drag/drop donor assets into the scene today.

This build does **not** currently have:
- a donor asset browser or palette
- draggable donor asset items
- a donor-asset drop target on the canvas
- a bridge/import path that turns a donor evidence item into a new editable scene object

Donor evidence is visible for provenance only.

## 6. Save / Reload Loop
1. Make your bounded edit.
2. Click **Save Scene Changes** or use `Ctrl/Cmd+S`.
3. Check that the editor state returns to **Saved**.
4. Click **Reload From Disk**.
5. Confirm the final state still appears after reload.

## 7. If You Hit A Bug
1. Stop after the first clear failure.
2. Run `npm run manual:bug-bundle`.
3. Add screenshots or exports into the new `attachments/` folder.
4. Fill in `BUG.md`.
5. If you only need a short paste-friendly status block, run `npm run manual:bug-context`.
