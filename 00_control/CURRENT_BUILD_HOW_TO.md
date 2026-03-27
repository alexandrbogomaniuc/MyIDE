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
6. The donor asset palette now supports quick search, format filters such as `PNG` and `WEBP`, and a visible donor import target layer control.

## 4. What You Can Edit Today
You can edit the reconstructed internal scene for `project_001`, including new donor-backed image objects created from the donor asset palette.

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
- atlas/frame donor import is blocked in this build because no local atlas text or sprite-sheet metadata source exists for `project_001` yet
- no animation import
- no audio/video import
- no raw donor file mutation

The donor file remains read-only evidence. Drag/drop creates a new internal scene object that preserves donor linkage.

## 6. Save / Reload Loop
1. Optionally choose a donor import target layer first.
2. Drag one donor image into empty canvas space.
3. If both `png` and `webp` donor assets are visible in the palette, import one of each for the stronger bounded donor proof.
4. Optionally drag a donor image over an existing editable object to replace it directly.
5. Drag a marquee box across two or more visible objects, or refine the selection with `Shift`/`Cmd` click from the scene list.
6. Use one or two toolbar composition actions such as **Align Left**, **Align Top**, **Align Center Horizontally**, **Distribute Horizontally**, or **Distribute Vertically**.
7. Select one donor-backed image and drag its small bottom-right resize handle if you want to test bounded direct manipulation.
8. Use **Show Asset In Palette** or **Show Evidence** from the donor summary if you want to confirm source-jump behavior.
9. Click **Save Scene Changes** or use `Ctrl/Cmd+S`.
10. Check that the editor state returns to **Saved**.
11. Click **Reload From Disk**.
12. Confirm the imported or replaced donor-backed objects still appear after reload, on the intended layer, with donor linkage details intact.

## 7. If You Hit A Bug
1. Stop after the first clear failure.
2. Run `npm run manual:bug-bundle`.
3. Add screenshots or exports into the new `attachments/` folder.
4. Fill in `BUG.md`.
5. If you only need a short paste-friendly status block, run `npm run manual:bug-context`.
