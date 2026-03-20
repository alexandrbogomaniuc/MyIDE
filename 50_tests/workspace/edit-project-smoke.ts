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
  assert(original, "project_001 editable scene data must exist before the edit-project smoke test.");

  const restoredSnapshot = cloneEditableProjectData(original);
  const mutated = cloneEditableProjectData(original);
  const titleObject = findEditableObject(mutated, "node.title");
  const uiLayer = findEditableLayer(mutated, "layer.ui");
  const originalDisplayName = titleObject.displayName;
  const originalX = titleObject.x;
  const originalY = titleObject.y;
  const originalScaleX = titleObject.scaleX;
  const originalVisible = titleObject.visible;
  const originalLayerVisible = uiLayer.visible;
  const originalLayerLocked = uiLayer.locked;

  titleObject.displayName = `${originalDisplayName} (edited)`;
  titleObject.x = originalX + 18;
  titleObject.y = originalY + 12;
  titleObject.scaleX = Number((originalScaleX + 0.1).toFixed(2));
  titleObject.visible = !originalVisible;
  titleObject.notes = `${titleObject.notes ?? "Editable title text"} | edit-project smoke test`;

  uiLayer.visible = false;
  uiLayer.locked = true;
  uiLayer.notes = `${uiLayer.notes ?? "UI layer"} | edit-project smoke test`;

  const mutatedSave = await saveEditableProjectData(projectRoot, mutated);
  const mutatedSnapshotDir = mutatedSave.snapshotDir;
  const mutatedHistoryPath = mutatedSave.historyPath;
  assert(mutatedSnapshotDir, "saveEditableProjectData must create a snapshot directory.");
  assert(mutatedHistoryPath, "saveEditableProjectData must append a local save-history log.");
  await fs.access(mutatedSnapshotDir);
  await fs.access(mutatedHistoryPath);

  const reloadedAfterSave = await loadEditableProjectData(projectRoot);
  assert(reloadedAfterSave, "project_001 editable data must still load after save.");
  const reloadedObject = findEditableObject(reloadedAfterSave, "node.title");
  const reloadedLayer = findEditableLayer(reloadedAfterSave, "layer.ui");
  assert.equal(reloadedObject.displayName, `${originalDisplayName} (edited)`, "Saved displayName edits must survive reload.");
  assert.equal(reloadedObject.x, originalX + 18, "Saved x edits must survive reload.");
  assert.equal(reloadedObject.y, originalY + 12, "Saved y edits must survive reload.");
  assert.equal(reloadedObject.scaleX, Number((originalScaleX + 0.1).toFixed(2)), "Saved scale edits must survive reload.");
  assert.equal(reloadedObject.visible, !originalVisible, "Saved visibility edits must survive reload.");
  assert.equal(reloadedLayer.visible, false, "Saved layer visibility must survive reload.");
  assert.equal(reloadedLayer.locked, true, "Saved layer lock state must survive reload.");

  const sliceAfterSave = await loadProjectSlice("project_001");
  const sliceObject = sliceAfterSave.editableProject?.objects.find((entry) => entry.id === "node.title");
  const sliceLayer = sliceAfterSave.editableProject?.layers.find((entry) => entry.id === "layer.ui");
  assert(sliceObject, "Shell project slice must include the editable title object after save.");
  assert(sliceLayer, "Shell project slice must include the UI layer after save.");
  assert.equal(sliceObject.displayName, `${originalDisplayName} (edited)`, "Shell project reload must reflect the saved displayName.");
  assert.equal(sliceObject.x, originalX + 18, "Shell project reload must reflect the saved object x position.");
  assert.equal(sliceObject.y, originalY + 12, "Shell project reload must reflect the saved object y position.");
  assert.equal(sliceObject.scaleX, Number((originalScaleX + 0.1).toFixed(2)), "Shell project reload must reflect the saved object scale.");
  assert.equal(sliceObject.visible, !originalVisible, "Shell project reload must reflect the saved object visibility.");
  assert.equal(sliceLayer.visible, false, "Shell project reload must reflect the saved layer visibility.");
  assert.equal(sliceLayer.locked, true, "Shell project reload must reflect the saved layer lock state.");

  const restoreSave = await saveEditableProjectData(projectRoot, restoredSnapshot);
  const restoreSnapshotDir = restoreSave.snapshotDir;
  const restoreHistoryPath = restoreSave.historyPath;
  assert(restoreSnapshotDir, "restore save must create a snapshot directory.");
  assert(restoreHistoryPath, "restore save must append a local save-history log.");
  await fs.access(restoreSnapshotDir);
  await fs.access(restoreHistoryPath);

  const reloadedAfterRestore = await loadEditableProjectData(projectRoot);
  assert(reloadedAfterRestore, "project_001 editable data must still load after restore.");
  const restoredObject = findEditableObject(reloadedAfterRestore, "node.title");
  const restoredLayer = findEditableLayer(reloadedAfterRestore, "layer.ui");
  assert.equal(restoredObject.displayName, originalDisplayName, "Original displayName must be restored after the smoke test.");
  assert.equal(restoredObject.x, originalX, "Original x must be restored after the smoke test.");
  assert.equal(restoredObject.y, originalY, "Original y must be restored after the smoke test.");
  assert.equal(restoredObject.scaleX, originalScaleX, "Original scaleX must be restored after the smoke test.");
  assert.equal(restoredObject.visible, originalVisible, "Original visible state must be restored after the smoke test.");
  assert.equal(restoredLayer.visible, originalLayerVisible, "Original layer visibility must be restored after the smoke test.");
  assert.equal(restoredLayer.locked, originalLayerLocked, "Original layer lock state must be restored after the smoke test.");

  await Promise.all([
    fs.rm(mutatedSnapshotDir, { recursive: true, force: true }),
    fs.rm(restoreSnapshotDir, { recursive: true, force: true }),
    fs.rm(mutatedHistoryPath, { force: true })
  ]);

  const workspace = await loadWorkspaceSlice();
  assert(
    workspace.projects.some((project) => project.projectId === "project_001"),
    "project_001 must remain discoverable after edit-project smoke testing."
  );

  console.log("PASS smoke:edit-project");
  console.log(`Edited object: ${path.relative(workspaceRoot, projectRoot)}/internal/objects.json`);
  console.log(`Saved and restored snapshots: ${path.relative(workspaceRoot, mutatedSnapshotDir)} and ${path.relative(workspaceRoot, restoreSnapshotDir)}`);
  console.log(`History log: ${path.relative(workspaceRoot, mutatedHistoryPath)}`);
  console.log("Undo/redo-equivalent behavior: save mutation, reload, restore original, reload again.");
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`FAIL smoke:edit-project - ${message}`);
  process.exitCode = 1;
});
