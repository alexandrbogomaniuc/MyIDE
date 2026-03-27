# Shell

Electron desktop shell for MyIDE.

## Current scope
- Load a local web UI.
- Show a workspace/project browser driven from the discovered project bundle.
- Create a new project scaffold from the shell through a bounded local IPC bridge.
- Support a simple workspace rescan so newly added project folders can appear after discovery refreshes the derived registry.
- Show the selected project's donor, target/resulting game, lifecycle stage summary, phase, verification status, folder path, and notes.
- Split the main workbench into a runtime-first `Runtime` mode and a bounded secondary `Compose` mode for `project_001`.
- Launch the strongest grounded Mystery Garden donor runtime entry inside the shell when one is indexed, keeping the live donor runtime as the primary viewport in `Runtime` mode.
- Keep the strongest current runtime truth honest: there is no captured local donor runtime package for `project_001` yet, so the current launch path uses the recorded public donor demo entry instead of pretending local runtime files exist.
- Add a workflow hub plus a left-rail context switcher so Runtime, Donor, Compose, VABS, and Project setup behave like one deliberate flow instead of one long stacked wall of panels.
- Group runtime controls separately from scene-composition controls, with bounded launch, reload, click-to-start, space-triggered gameplay trigger, and the strongest honest pause/resume/step affordances the embedded runtime exposes.
- Support a stronger runtime pick/inspect flow that can click the live runtime surface, surface the strongest grounded runtime trace we can prove, jump into the best grounded donor asset, donor evidence, or related compose object context when available, and mark whether the current trace is eligible for the bounded static override slice.
- Support one bounded project-local static runtime override slice for `project_001`: create an override from a grounded static Mystery Garden runtime image URL, store it under `40_projects/project_001/overrides/`, reload Runtime Mode without cache, and redirect the live runtime request to the project-local override file while leaving raw donor files untouched.
- Show the selected project's read-only GS VABS status when a project-local `vabs/` workspace exists, including current fixture provenance, captured row/session presence, export/mock/smoke readiness, current blocker, and the next operator capture step.
- Show a scene/layer/object explorer for the selected project's editable internal scene files.
- Render the editor canvas from the deterministic preview scene bridged from `internal/scene.json`, `layers.json`, and `objects.json` when those files exist.
- Support object selection from the list and canvas, direct canvas move, snap-assisted drag and nudge, selected-object layer reassignment, preset-based placeholder object creation, bounded placeholder width/height editing, layer-local ordering controls, a read-only order-position cue, previous/next sibling selection within the current layer, quick session-only layer isolation, session-only viewport zoom/pan/reset/fit controls, duplicate/delete for editable objects, bounded property editing, bounded undo/redo, bounded viewport alignment, layer visible/locked toggles, save, and reload for the validated `project_001` editor slice.
- Save deterministically syncs the replay-facing `project.json` scene from the editable internal scene files so the visible editor path and replay-facing output do not drift silently.
- Explain current scope inside the shell with a compact Start Here panel, quickstart, current-scope guidance, a bounded donor asset palette for supported local donor images in `project_001`, search plus file-type filters for that palette, an explicit donor import target layer control, direct drop-to-replace feedback in the canvas, the existing bounded replace-selected-object path for donor assets, bounded marquee/additive multi-selection for composition, compact align/distribute tools, a small resize handle for selected donor-backed images, the existing donor/importer drill-down, item-level evidence cards and lightweight previews where local artifacts already exist, small copy helpers for donor IDs / paths / evidence refs, clearer donor-backed markers in the scene list, and a stronger selected-object donor summary plus evidence/object navigation helpers so testers understand the build edits reconstructed internal scene files rather than raw donor assets directly.
- Keep the donor surface honest: on a typical window size it sits below Project Browser in the left column and may require scrolling to reach; raw donor files remain read-only evidence even though supported donor images can now be dragged into the canvas to create new internal scene objects or dropped directly onto an editable object to replace it.
- Keep the local runtime blocker explicit and documented in `00_control/RUNTIME_PACKAGE_NOTES.md`.
- Surface save/sync status in the shell with the replay-facing generated target path and the last successful sync time for the current session.
- Surface desktop bridge health in the shell, including preload path presence, preload execution, renderer handshake status, and the currently loaded project when the Electron preload bridge is healthy.
- Support a dedicated Electron bridge smoke mode that verifies main start, preload execution, `window.myideApi`, bridge calls, and `project_001` load while writing a machine-readable artifact to `/tmp/myide-electron-bridge-smoke.json`.
- Support a dedicated Electron live-persist smoke mode that uses the real renderer action flow to load `project_001`, select an editable object, edit it through the inspector path, save, reload, verify replay-facing sync, and write `/tmp/myide-electron-live-persist.json` while the outer smoke harness restores the touched project files and logs.
- Support a dedicated Electron live-drag smoke mode that uses the real renderer pointer path to load `project_001`, select an editable canvas object, drag it, save, reload, verify replay-facing sync, and write `/tmp/myide-electron-live-drag.json` while the outer smoke harness restores the touched project files and logs.
- Support a dedicated Electron live-create-drag smoke mode that uses the real renderer preset selection + new-placeholder action + pointer drag path to load `project_001`, create a placeholder object, drag it, save, reload, verify replay-facing sync, and write `/tmp/myide-electron-live-create-drag.json` while the outer smoke harness restores the touched project files and logs.
- Support a dedicated Electron live-duplicate-delete smoke mode that uses the real renderer preset selection + new-placeholder action + duplicate/delete UI path to load `project_001`, create a placeholder object, duplicate it, delete one of the two, save, reload, verify replay-facing sync, and write `/tmp/myide-electron-live-duplicate-delete.json` while the outer smoke harness restores the touched project files and logs.
- Support a dedicated Electron live-reorder smoke mode that uses the real renderer preset selection + new-placeholder action + layer-ordering UI path to load `project_001`, create a placeholder object, reorder it within `layer.ui`, save, reload, verify replay-facing sync, and write `/tmp/myide-electron-live-reorder.json` while the outer smoke harness restores the touched project files and logs.
- Support a dedicated Electron live-layer-reassign smoke mode that uses the real renderer preset selection + new-placeholder action + Assigned Layer inspector UI path to load `project_001`, create a placeholder object, move it from `layer.ui` to `layer.overlay`, save, reload, verify replay-facing sync, and write `/tmp/myide-electron-live-layer-reassign.json` while the outer smoke harness restores the touched project files and logs.
- Support a dedicated Electron live-resize smoke mode that uses the real renderer preset selection + new-placeholder action + inspector width/height UI path to load `project_001`, create a placeholder object, resize it from `540x120` to `564x132`, save, reload, verify replay-facing sync, and write `/tmp/myide-electron-live-resize.json` while the outer smoke harness restores the touched project files and logs.
- Support a dedicated Electron live-align smoke mode that uses the real renderer preset selection + new-placeholder action + viewport alignment toolbar path to load `project_001`, create a placeholder object, align it to the viewport right edge, save, reload, verify replay-facing sync, and write `/tmp/myide-electron-live-align.json` while the outer smoke harness restores the touched project files and logs.
- Support a dedicated Electron live-undo-redo smoke mode that uses the real renderer preset selection + new-placeholder action + canvas drag path + undo/redo toolbar path to load `project_001`, create a placeholder object, drag it, undo it, redo it, save, reload, verify replay-facing sync, and write `/tmp/myide-electron-live-undo-redo.json` while the outer smoke harness restores the touched project files and logs.
- Keep the validated `project_001` replay slice intact.
- Keep donor decoding and server integration out of this phase.
- Keep runtime support bounded to the currently grounded `project_001` Mystery Garden HTML5 donor runtime only; there is still no generic multi-game runtime abstraction, no local runtime package, no atlas/animation/audio/video workflow, and no broad override system beyond the first static image override slice.
- Keep this donor import slice bounded to `project_001` and supported local static images only; the stronger proof now covers more than one donor image import, explicit target-layer placement, direct drop-to-replace on editable objects, bounded marquee/additive multi-selection, align/distribute composition actions, donor source jumps, and one bounded donor-backed resize-handle path when grounded assets exist locally, but atlas/frame donor import is still blocked on this machine because no local atlas text or sprite-sheet metadata source has been captured yet, and there is still no animation import, no audio/video import, and no raw donor file mutation.
- Keep the new VABS panel read-only and outside the editor save path; it is workflow visibility only, not JSP/deployment proof.

## Bounded Shortcuts
- `Ctrl/Cmd+S`: save and sync replay-facing output.
- `Ctrl/Cmd+Z`: undo.
- `Ctrl/Cmd+Shift+Z` or `Ctrl/Cmd+Y`: redo.
- `Ctrl/Cmd+Shift+N`: create a new placeholder object from the selected preset.
- `Ctrl/Cmd+D`: duplicate the selected editable object.
- `Delete` or `Backspace`: delete the selected editable object.
- `Ctrl/Cmd+Shift+G`: toggle 10px snap for drag and keyboard nudge.
- `Ctrl/Cmd+=` / `Ctrl/Cmd+-`: zoom in or out.
- `Ctrl/Cmd+0`: reset the viewport to 100% at the default origin.
- `Ctrl/Cmd+[` and `Ctrl/Cmd+]`: send backward/bring forward within the current layer.
- `Ctrl/Cmd+Shift+[` and `Ctrl/Cmd+Shift+]`: select previous/next object within the current layer (session-only, non-persistent).
- `Space+drag` or middle mouse drag: pan the viewport (session-only, non-persistent).

## Files
- `main.ts`: Electron main process entry.
- `workspaceSlice.ts`: workspace/project registry loader.
- `projectSlice.ts`: validated replay slice loader.
- `renderer/index.html`: Web UI scaffold.
- `renderer/styles.css`: App styling.
