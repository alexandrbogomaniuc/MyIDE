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
- [ ] Decide whether the next editor target is preview hit-manipulation, richer inspector fields, or undo/redo.

## Deferred
- [ ] Donor decoding automation.
- [ ] Full editor interactions.
- [ ] Production server adapter implementation.
- [ ] Sugar Merge Up implementation.
