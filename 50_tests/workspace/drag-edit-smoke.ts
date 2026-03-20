import { strict as assert } from "node:assert";
import { existsSync, promises as fs } from "node:fs";
import path from "node:path";
import { cloneEditableProjectData, loadEditableProjectData, saveEditableProjectData } from "../../30_app/workspace/editableProject";
import { loadProjectSlice } from "../../30_app/shell/projectSlice";
import { loadWorkspaceSlice } from "../../30_app/shell/workspaceSlice";

function resolveWorkspaceRoot(): string {
  const candidates = [process.cwd(), __dirname, path.resolve(__dirname, ".."), path.resolve(__dirname, "../..")];

  for (const start of candidates) {
    let current = start;
    while (true) {
      if (existsSync(path.join(current, "package.json")) && existsSync(path.join(current, "40_projects"))) {
        return current;
      }

      const parent = path.dirname(current);
      if (parent === current) {
        break;
      }

      current = parent;
    }
  }

  throw new Error(`Unable to locate the MyIDE workspace root from ${__dirname}`);
}

const workspaceRoot = resolveWorkspaceRoot();
const projectRoot = path.join(workspaceRoot, "40_projects", "project_001");

function findEditableObject(data: NonNullable<Awaited<ReturnType<typeof loadEditableProjectData>>>, objectId: string) {
  const object = data.objects.find((entry) => entry.id === objectId);
  assert(object, `Editable object ${objectId} must exist.`);
  return object;
}

function findEditableLayer(data: NonNullable<Awaited<ReturnType<typeof loadEditableProjectData>>>, layerId: string) {
  const layer = data.layers.find((entry) => entry.id === layerId);
  assert(layer, `Editable layer ${layerId} must exist.`);
  return layer;
}

async function main(): Promise<void> {
  const original = await loadEditableProjectData(projectRoot);
  assert(original, "project_001 editable scene data must exist before the drag-edit smoke test.");

  const restoredSnapshot = cloneEditableProjectData(original);
  const mutated = cloneEditableProjectData(original);
  const draggedObject = findEditableObject(mutated, "node.title");
  const gameplayLayer = findEditableLayer(mutated, "layer.gameplay");
  const uiLayer = findEditableLayer(mutated, "layer.ui");
  const originalLayerId = draggedObject.layerId;
  const originalX = draggedObject.x;
  const originalY = draggedObject.y;
  const originalUiVisible = uiLayer.visible;
  const originalUiLocked = uiLayer.locked;
  const originalGameplayLocked = gameplayLayer.locked;

  draggedObject.layerId = "layer.ui";
  draggedObject.x = originalX + 64;
  draggedObject.y = originalY + 32;
  draggedObject.notes = `${draggedObject.notes ?? "Editable title text"} | drag-edit smoke test`;

  uiLayer.visible = false;
  uiLayer.locked = true;
  uiLayer.notes = `${uiLayer.notes ?? "UI layer"} | drag-edit smoke test`;
  gameplayLayer.locked = true;
  gameplayLayer.notes = `${gameplayLayer.notes ?? "Gameplay layer"} | drag-edit smoke test`;

  const dragSave = await saveEditableProjectData(projectRoot, mutated);
  const dragSnapshotDir = dragSave.snapshotDir;
  const dragHistoryPath = dragSave.historyPath;
  assert(dragSnapshotDir, "drag-edit save must create a snapshot directory.");
  assert(dragHistoryPath, "drag-edit save must append a save-history log.");
  await fs.access(dragSnapshotDir);
  await fs.access(dragHistoryPath);

  const reloadedAfterDrag = await loadEditableProjectData(projectRoot);
  assert(reloadedAfterDrag, "project_001 editable data must still load after the drag-edit save.");
  const reloadedObject = findEditableObject(reloadedAfterDrag, "node.title");
  const reloadedUiLayer = findEditableLayer(reloadedAfterDrag, "layer.ui");
  const reloadedGameplayLayer = findEditableLayer(reloadedAfterDrag, "layer.gameplay");
  assert.equal(reloadedObject.layerId, "layer.ui", "Dragged object layerId must survive reload.");
  assert.equal(reloadedObject.x, originalX + 64, "Dragged object x must survive reload.");
  assert.equal(reloadedObject.y, originalY + 32, "Dragged object y must survive reload.");
  assert.equal(reloadedUiLayer.visible, false, "UI layer visibility must survive reload.");
  assert.equal(reloadedUiLayer.locked, true, "UI layer locked state must survive reload.");
  assert.equal(reloadedGameplayLayer.locked, true, "Gameplay layer locked state must survive reload.");

  const sliceAfterDrag = await loadProjectSlice("project_001");
  const sliceObject = sliceAfterDrag.editableProject?.objects.find((entry) => entry.id === "node.title");
  const sliceUiLayer = sliceAfterDrag.editableProject?.layers.find((entry) => entry.id === "layer.ui");
  assert(sliceObject, "Shell project slice must include the dragged title object after save.");
  assert(sliceUiLayer, "Shell project slice must include the UI layer after save.");
  assert.equal(sliceObject.layerId, "layer.ui", "Shell reload must reflect the dragged layer move.");
  assert.equal(sliceObject.x, originalX + 64, "Shell reload must reflect the dragged x position.");
  assert.equal(sliceObject.y, originalY + 32, "Shell reload must reflect the dragged y position.");
  assert.equal(sliceUiLayer.visible, false, "Shell reload must reflect the saved layer visibility.");
  assert.equal(sliceUiLayer.locked, true, "Shell reload must reflect the saved layer lock state.");

  const restoreSave = await saveEditableProjectData(projectRoot, restoredSnapshot);
  const restoreSnapshotDir = restoreSave.snapshotDir;
  assert(restoreSnapshotDir, "drag-edit restore must create a snapshot directory.");
  await fs.access(restoreSnapshotDir);

  const reloadedAfterRestore = await loadEditableProjectData(projectRoot);
  assert(reloadedAfterRestore, "project_001 editable data must still load after the drag-edit restore.");
  const restoredObject = findEditableObject(reloadedAfterRestore, "node.title");
  const restoredUiLayer = findEditableLayer(reloadedAfterRestore, "layer.ui");
  const restoredGameplayLayer = findEditableLayer(reloadedAfterRestore, "layer.gameplay");
  assert.equal(restoredObject.layerId, originalLayerId, "Original object layerId must be restored after drag-edit smoke.");
  assert.equal(restoredObject.x, originalX, "Original x must be restored after drag-edit smoke.");
  assert.equal(restoredObject.y, originalY, "Original y must be restored after drag-edit smoke.");
  assert.equal(restoredUiLayer.visible, originalUiVisible, "Original UI layer visibility must be restored after drag-edit smoke.");
  assert.equal(restoredUiLayer.locked, originalUiLocked, "Original UI layer lock state must be restored after drag-edit smoke.");
  assert.equal(restoredGameplayLayer.locked, originalGameplayLocked, "Original gameplay layer lock state must be restored after drag-edit smoke.");

  await Promise.all([
    fs.rm(dragSnapshotDir, { recursive: true, force: true }),
    fs.rm(restoreSnapshotDir, { recursive: true, force: true }),
    fs.rm(dragHistoryPath, { force: true })
  ]);

  const workspace = await loadWorkspaceSlice();
  assert(
    workspace.projects.some((project) => project.projectId === "project_001"),
    "project_001 must remain discoverable after drag-edit smoke testing."
  );

  console.log("PASS smoke:drag-edit");
  console.log(`Dragged object: ${path.relative(workspaceRoot, projectRoot)}/internal/objects.json`);
  console.log(`Saved and restored snapshots: ${path.relative(workspaceRoot, dragSnapshotDir)} and ${path.relative(workspaceRoot, restoreSnapshotDir)}`);
  console.log(`History log: ${path.relative(workspaceRoot, dragHistoryPath)}`);
  console.log("Layer persistence: UI visibility/lock state and gameplay layer lock state survived save/reload and restore.");
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`FAIL smoke:drag-edit - ${message}`);
  process.exitCode = 1;
});
