# MyIDE TODO

## PHASE 0
- [x] Create the required folder tree.
- [x] Create the core control docs.
- [x] Create the reference docs.
- [x] Create draft model schemas.

## PHASE 1
- [x] Audit GSRefactor reference repos.
- [x] Map the current integration contract.
- [x] Write the donor capture plan for `donor_001_mystery_garden`.
- [x] Scaffold the minimal desktop shell.
- [x] Build and typecheck the PHASE 1 shell locally.
- [ ] Verify interactive Electron launch in a GUI-capable environment.

## PHASE 2 Next Tasks
- [x] Capture official Mystery Garden public evidence for the first donor report slice.
- [x] Populate the donor inventories with real evidence IDs and hashes.
- [x] Produce a donor report with proven facts, assumptions, and TODO investigations.
- [x] Create the first clean internal project under `40_projects/`.
- [x] Import the first proven donor scene/assets/animation slices into the internal model.
- [x] Replace the preview placeholder with a local replay of the imported model.
- [x] Add mocked restart recovery inputs and fixture scenarios.
- [ ] Capture observable live runtime evidence for launch, spin timing, and restart.
- [x] Add a first importer manifest that turns donor evidence into the internal model automatically.

## PHASE 3
- [x] Attempt a real live Mystery Garden runtime capture and document blockers honestly.
- [x] Update donor reports with live evidence refs and blocker notes.
- [x] Extend the importer contract with live evidence-aware provenance.
- [x] Add an executable importer command for the Mystery Garden slice.
- [x] Add repeatable schema validation for `project_001`.
- [x] Add repeatable replay assertions for normal spin, free-spins trigger, and restart restore.
- [x] Keep replay loader paths internal to `40_projects/project_001`.
- [x] Add explicit third-party inventory and reuse strategy updates.
- [x] Add local adapter interfaces plus an isolated `PCUI` property-panel spike.
- [x] Establish public-safe repository publication policy and sanitized donor evidence tracking.
- [ ] Capture a live free-spins trigger or buy-bonus bonus entry.
- [ ] Capture a live restart recovery sequence.
- [ ] Verify the Electron shell interactively in a GUI-capable environment.

## PHASE 4A
- [x] Add workspace/project registry model and metadata.
- [x] Make the shell show the workspace/project list from the registry.
- [x] Extend validation to cover the workspace layer.
- [x] Keep the slot-first Mystery Garden slice healthy while the universal architecture is introduced.
- [x] Confirm public docs continue to separate universal architecture from validated implementation scope.

## PHASE 4B
- [x] Document the project lifecycle as a donor-to-release cycle.
- [x] Define the standard per-project folder layout.
- [x] Make project folder discovery authoritative.
- [x] Add a practical project scaffold or create-project flow.
- [x] Add a second project folder that is clearly scaffold-only and unvalidated.
- [x] Update the shell to treat discovered folders as the primary workspace source.

## PHASE 4C
- [x] Add an explicit lifecycle stage model for projects.
- [x] Use controlled lifecycle statuses instead of a single opaque phase value.
- [x] Keep `project_001` honest as the only verified replay slice.
- [x] Add a shell-backed New Project workflow with a bounded local scaffold path.
- [x] Refresh folder discovery and the derived registry automatically after shell project creation.
- [x] Show lifecycle stage summaries in the shell project browser and inspector.
- [x] Add a create-project smoke test for create -> discover -> registry -> shell visibility.
- [ ] Verify the shell New Project flow interactively in a GUI-capable Electron session.

## PHASE 5A
- [x] Define the first editable scene/layer/object contract for `project_001`.
- [x] Show a scene/layer/object explorer in the shell.
- [x] Render a simple editor canvas from internal project data only.
- [x] Allow selection from the object list and the preview canvas.
- [x] Allow bounded object edits for `displayName`, `x`, `y`, `scaleX`, `scaleY`, and `visible`.
- [x] Save editor changes back to internal project files.
- [x] Reload the selected project and confirm persisted editor changes remain visible.
- [x] Add local-only save snapshots / save-history safety outputs.
- [x] Add an edit-project smoke test for edit -> save -> reload -> restore.
- [ ] Verify the editor workflow interactively in a GUI-capable Electron session.

## PHASE 5B
- [x] Make the internal editable scene the practical authority for the editor-facing preview path.
- [x] Add direct canvas move and keyboard nudge for editable objects.
- [x] Add bounded undo/redo and layer visible/locked persistence.
- [x] Keep deterministic replay sync tied to editor save so preview/replay output does not drift silently.

## PHASE 5C
- [x] Add duplicate/delete for editable objects.
- [x] Add deterministic replay export from internal editable files to `project.json`.
- [x] Add smoke coverage for sync and duplicate/delete persistence.
- [ ] Verify the duplicate/delete/save/reload loop interactively in a GUI-capable Electron session.

## PHASE 5D
- [x] Align public phase/status wording with the actual current editor behavior.
- [x] Add a New Object action for a bounded placeholder scene object inside the shell.
- [x] Surface replay sync target/status visibly in the shell after save.
- [x] Add create-object smoke coverage for create -> edit -> save -> sync -> reload plus duplicate/delete after creation.
- [ ] Verify the create/move/save/reload loop interactively in a GUI-capable Electron session.

## PHASE 5E
- [x] Add a 10px snap toggle for drag and keyboard nudge.
- [x] Add selected-object reassignment between unlocked layers.
- [x] Prove snapped movement and layer reassignment persist through save -> sync -> reload.
- [ ] Verify the snap/reassign workflow interactively in a GUI-capable Electron session.

## PHASE 5F
- [x] Align public phase/status wording with the actual current editor behavior.
- [x] Add bounded width/height editing for placeholder-backed objects.
- [x] Keep width/height changes visible in the canvas and deterministic replay sync.
- [x] Add smoke coverage for create -> resize -> move -> save -> sync -> reload plus duplicate/delete after resizing.
- [ ] Verify the resize/move/save/reload loop interactively in a GUI-capable Electron session.
- [x] Decide whether the next bounded editor upgrade is placeholder presets, simple alignment aids, or another small inspector productivity field.

## PHASE 5H
- [x] Align public phase/status wording with the actual current editor behavior.
- [x] Add bounded object ordering controls within the current layer.
- [x] Add quick session-only layer isolation for focused editing.
- [x] Keep ordering and isolation on the same deterministic save/sync/reload path where applicable.
- [x] Add smoke coverage for reorder -> save -> sync -> reload plus isolate on/off behavior.
- [ ] Verify the ordering/isolation workflow interactively in a GUI-capable Electron session.

## PHASE 5I
- [x] Add a read-only order-position cue for the selected object within its current layer.
- [x] Add previous/next selection within the current layer.
- [x] Keep navigation session-only and non-dirty while staying compatible with reorder, duplicate/delete, and layer reassignment.
- [x] Add smoke coverage for order cues plus previous/next layer navigation.
- [ ] Verify the order-cue/navigation workflow interactively in a GUI-capable Electron session.

## PHASE 5J
- [x] Add bounded viewport zoom in/out controls.
- [x] Add bounded session-only viewport pan plus fit/reset view controls.
- [x] Keep viewport state session-only and non-dirty while preserving correct object selection and drag math under transformed view.
- [x] Add smoke coverage for transformed-view editing plus fit/reset behavior.
- [x] Verify the viewport-controls workflow interactively in a GUI-capable Electron session.

## PHASE 5K
- [x] Prove whether preload actually loads in the built Electron app.
- [x] Add a bridge-specific smoke path with a machine-readable health artifact.
- [x] Prove `window.myideApi` is available in the renderer and can load `project_001`.
- [x] Replace the generic bridge failure with more specific bridge-health messaging.
- [x] Capture live GUI proof that the desktop shell opens with bridge health and a loaded project.

## PHASE 5L
- [x] Add a live-shell persistence smoke path that uses the real Electron main/preload/renderer bridge.
- [x] Prove `project_001` can be loaded, one bounded object selected, one bounded edit applied, saved, and reloaded through the live shell path.
- [x] Verify the same live-shell edit reaches replay-facing generated `project.json`.
- [x] Keep the repository clean after the smoke by restoring the touched project files and local logs.
- [x] Capture a live GUI artifact for the bounded persistence loop.

## PHASE 5M
- [x] Add a live-shell canvas-drag persistence smoke path that uses the real Electron main/preload/renderer bridge.
- [x] Prove `project_001` can be loaded, one bounded editable object selected from the canvas, one real pointer drag applied, saved, and reloaded through the live shell path.
- [x] Verify the same live-shell drag reaches replay-facing generated `project.json`.
- [x] Keep the repository clean after the smoke by restoring the touched project files and local logs.
- [x] Capture a live GUI artifact for the bounded canvas drag persistence loop.

## PHASE 5N
- [x] Add a live-shell create->drag persistence smoke path that uses the real Electron main/preload/renderer bridge.
- [x] Prove `project_001` can be loaded, one placeholder preset object created through the real shell action path, dragged on the live canvas, saved, and reloaded through the live shell path.
- [x] Verify the same live-shell create->drag loop reaches replay-facing generated `project.json`.
- [x] Keep the repository clean after the smoke by restoring the touched project files and local logs.
- [x] Capture a live GUI artifact for the bounded create->drag persistence loop.

## PHASE 5O
- [x] Add a live-shell create->duplicate/delete persistence smoke path that uses the real Electron main/preload/renderer bridge.
- [x] Prove `project_001` can be loaded, one placeholder preset object created through the real shell action path, duplicated through the real shell UI, one of the two deleted, saved, and reloaded through the live shell path.
- [x] Verify the same live-shell create->duplicate/delete loop reaches replay-facing generated `project.json`.
- [x] Keep the repository clean after the smoke by restoring the touched project files and local logs.
- [x] Capture a live GUI artifact for the bounded create->duplicate/delete persistence loop.

## PHASE 5P
- [x] Add a live-shell create->reorder persistence smoke path that uses the real Electron main/preload/renderer bridge.
- [x] Prove `project_001` can be loaded, one placeholder preset object created through the real shell action path, reordered within its current layer through the real shell UI, saved, and reloaded through the live shell path.
- [x] Verify the same live-shell create->reorder loop reaches replay-facing generated `project.json`.
- [x] Keep the repository clean after the smoke by restoring the touched project files and local logs.
- [x] Capture a live GUI artifact for the bounded create->reorder persistence loop.

## PHASE 5Q
- [x] Add a live-shell create->layer-reassign persistence smoke path that uses the real Electron main/preload/renderer bridge.
- [x] Prove `project_001` can be loaded, one placeholder preset object created through the real shell action path, reassigned to another unlocked editable layer through the real shell UI, saved, and reloaded through the live shell path.
- [x] Verify the same live-shell create->layer-reassign loop reaches replay-facing generated `project.json`.
- [x] Keep the repository clean after the smoke by restoring the touched project files and local logs.
- [x] Capture a live GUI artifact for the bounded create->layer-reassign persistence loop.

## PHASE 5R
- [x] Add a live-shell create->resize persistence smoke path that uses the real Electron main/preload/renderer bridge.
- [x] Prove `project_001` can be loaded, one placeholder preset object created through the real shell action path, resized through the real inspector width/height UI, saved, and reloaded through the live shell path.
- [x] Verify the same live-shell create->resize loop reaches replay-facing generated `project.json`.
- [x] Keep the repository clean after the smoke by restoring the touched project files and local logs.
- [x] Capture a live GUI artifact for the bounded create->resize persistence loop.

## PHASE 5S
- [x] Add a live-shell create->align persistence smoke path that uses the real Electron main/preload/renderer bridge.
- [x] Prove `project_001` can be loaded, one placeholder preset object created through the real shell action path, aligned through the real toolbar alignment UI, saved, and reloaded through the live shell path.
- [x] Verify the same live-shell create->align loop reaches replay-facing generated `project.json`.
- [x] Keep the repository clean after the smoke by restoring the touched project files and local logs.
- [x] Capture a live GUI artifact for the bounded create->align persistence loop.

## PHASE 5T
- [x] Add a live-shell create->drag->undo->redo persistence smoke path that uses the real Electron main/preload/renderer bridge.
- [x] Prove `project_001` can be loaded, one placeholder preset object created through the real shell action path, dragged through the real canvas pointer path, undone, redone, saved, and reloaded through the live shell path.
- [x] Verify the same live-shell create->drag->undo->redo loop reaches replay-facing generated `project.json`.
- [x] Keep the repository clean after the smoke by restoring the touched project files and local logs.
- [x] Capture a live GUI artifact for the bounded create->drag->undo->redo persistence loop.

## PUB-B
- [x] Add repeatable publication preflight and LOCAL vs PUBLIC comparison commands.
- [x] Add repeatable external handoff refresh and handoff verification commands.
- [x] Standardize the external handoff package with stable `CURRENT.*` files outside the repo.
- [x] Add an in-repo publication playbook and tracked LOCAL vs PUBLIC gap snapshot.
- [x] Publish the unpublished local commit range from an authenticated environment and confirm public catches up.

## QA-A
- [x] Add a plain-English manual test playbook.
- [x] Add a compact manual test matrix and bug template.
- [x] Add `manual:status` for quick LOCAL vs PUBLIC vs HANDOFF context.
- [x] Add `manual:reset:project_001` for a safe reset to the current tracked baseline.
- [ ] Run and record the first full manual QA pass against the current LOCAL build.

## QA-B
- [x] Add `manual:prepare:project_001` for one-command manual session prep.

## GS-VABS-F
- [x] Add explicit raw vs sanitized captured-row intake paths for `project_001`.
- [x] Add stronger provenance-aware compare/verify/replay reporting.
- [ ] Capture one real sanitized Mystery Garden archived `playerBets` row.
- [ ] Promote provisional fields to confirmed only after a captured archived row is available.

## GS-VABS-G
- [x] Add a deterministic local GS-style export package path for `project_001`.
- [x] Add a local preview dry-run against the exported package.
- [ ] Prove the same package against a real sanitized captured archived row once one exists.

## GS-VABS-A
- [x] Audit accessible GS/VABS reference files and document grounded patterns.
- [x] Document VABS as an additional MyIDE module rather than an editor replacement.
- [x] Add a per-project VABS scaffold under `40_projects/project_001/vabs/`.
- [x] Add local scaffold/verify tooling for the VABS workspace.
- [x] Keep current editor/manual verification passing after the VABS scaffold is introduced.
- [x] Add `manual:bug-context` for paste-friendly bug-report context.
- [x] Add `manual:bug-bundle` for one-command timestamped bug capture outside the repo.
- [x] Refresh tester-facing docs so the new commands are the easiest manual QA path.
- [ ] Use the new prep/context commands during the first full manual QA pass.

## GS-VABS-B
- [x] Lock one intended `project_001` GS VABS folder-name decision.
- [x] Add one concrete archived-row contract fixture for `project_001`.
- [x] Add a row parser / contract verification harness.
- [x] Add the first project-specific renderer stub package for `project_001`.
- [x] Keep current editor/manual verification passing after the concrete VABS slice is introduced.
- [ ] Replace the sanitized contract fixture with a real captured target row when that row becomes available.
- [ ] Replace the stub renderer package with a visual project-specific renderer only after the real target row and deployment path are locked.

## GS-VABS-D
- [x] Attempt to locate one real/sanitized archived row or the strongest row-adjacent evidence available for `project_001`.
- [x] Make captured-vs-derived provenance explicit in the contract docs and replay output.
- [x] Strengthen the local replay harness with fixture-tier provenance and deterministic output paths.
- [x] Deepen the `mysterygarden` renderer stub into a richer replay-summary panel while keeping it read-only and non-production.
- [ ] Capture one real sanitized archived `playerBets` row for Mystery Garden and add it as a separate captured fixture tier.

## GS-VABS-E
- [x] Define explicit local raw vs sanitized captured-row intake paths for `project_001`.
- [x] Add a deterministic captured-vs-derived comparison lane.
- [x] Make replay/verify output state which fixture kind was used and which fields remain provisional.
- [ ] Drop in one real sanitized archived `playerBets` row and rerun the comparison lane against it.

## GS-VABS-C
- [x] Strengthen the `project_001` row fixture with clearer grounded/derived/provisional provenance.
- [x] Add a deterministic local replay harness for the `project_001` VABS slice.
- [x] Advance the `mysterygarden` stub to a minimal replay-summary panel.
- [x] Extend `vabs:verify:project_001` to prove the local replay harness can execute.
- [ ] Replace the derived fixture with a captured GS archived row when that row becomes available.
- [ ] Advance the minimal replay-summary stub into a true project-specific GS replay renderer only after a captured row and target deployment path are locked.

## Deferred
- [ ] Donor decoding automation.
- [ ] Full editor interactions.
- [ ] Production server adapter implementation.
- [ ] Sugar Merge Up implementation.
