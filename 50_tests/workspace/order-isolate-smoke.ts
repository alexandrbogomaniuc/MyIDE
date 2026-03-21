import { strict as assert } from "node:assert";
import { existsSync, promises as fs } from "node:fs";
import path from "node:path";
import {
  buildPreviewSceneFromEditableProject,
  cloneEditableProjectData,
  loadEditableProjectData,
  saveEditableProjectData
} from "../../30_app/workspace/editableProject";
import { loadProjectSlice } from "../../30_app/shell/projectSlice";

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
const editorState = require(path.join(workspaceRoot, "30_app", "shell", "renderer", "editorState.js"));
type LoadedEditableProject = NonNullable<Awaited<ReturnType<typeof loadEditableProjectData>>>;

function findEditableObject(data: LoadedEditableProject, objectId: string) {
  const object = data.objects.find((entry) => entry.id === objectId);
  assert(object, `Editable object ${objectId} must exist.`);
  return object;
}

function getSyncedLayerNodeIds(project: Record<string, unknown>, layerId: string) {
  const scenes = Array.isArray(project.scenes) ? project.scenes : [];
  const scene = scenes[0] as {
    layers?: Array<{ layerId?: string; nodes?: Array<Record<string, unknown>> }>;
  } | undefined;
  const layers = Array.isArray(scene?.layers) ? scene.layers : [];
  const layer = layers.find((entry) => entry?.layerId === layerId);

  return Array.isArray(layer?.nodes)
    ? layer.nodes.map((node) => String(node.nodeId ?? ""))
    : [];
}

function getPreviewLayerObjectIds(previewScene: NonNullable<Awaited<ReturnType<typeof buildPreviewSceneFromEditableProject>>>, layerId: string) {
  const layer = previewScene.layers.find((entry) => entry.id === layerId);
  assert(layer, `Preview layer ${layerId} must exist.`);
  return layer.objectIds.slice();
}

async function main(): Promise<void> {
  const original = await loadEditableProjectData(projectRoot);
  assert(original, "project_001 editable scene data must exist before the ordering/isolation smoke test.");

  const restoredSnapshot = cloneEditableProjectData(original);
  const mutated = cloneEditableProjectData(original);
  const uiLayerId = "layer.ui";
  const sourceOrder = original.objects
    .filter((entry: LoadedEditableProject["objects"][number]) => entry.layerId === uiLayerId)
    .map((entry: LoadedEditableProject["objects"][number]) => entry.id);
  const reorderedOrder = ["node.bottom-bar", "node.free-spins-pill", "node.win-banner"];
  assert.deepEqual(
    sourceOrder,
    ["node.win-banner", "node.bottom-bar", "node.free-spins-pill"],
    "The test expects the Mystery Garden UI layer to start with the known project_001 order."
  );

  const reorderResult = editorState.reorderObjectInLayer(mutated, "node.win-banner", "bring-to-front");
  assert(reorderResult?.changed, "The selected UI object should reorder within its current layer.");
  mutated.scene.objectIds = mutated.objects.map((entry) => entry.id);
  assert.deepEqual(
    mutated.objects
      .filter((entry: LoadedEditableProject["objects"][number]) => entry.layerId === uiLayerId)
      .map((entry: LoadedEditableProject["objects"][number]) => entry.id),
    reorderedOrder,
    "Layer-local reorder helper must keep ordering changes inside layer.ui only."
  );

  const history = editorState.createHistory(original);
  const reorderHistory = editorState.pushUndoSnapshot(history, original, "Reorder layer.ui objects");
  assert(editorState.isDirty(reorderHistory, mutated), "Reordering a layer must mark the editor state dirty before save.");

  const undoResult = editorState.undo(reorderHistory, mutated);
  assert(undoResult, "Undo should exist for a layer-local reorder.");
  assert.deepEqual(
    undoResult.editorData.objects
      .filter((entry: LoadedEditableProject["objects"][number]) => entry.layerId === uiLayerId)
      .map((entry: LoadedEditableProject["objects"][number]) => entry.id),
    sourceOrder,
    "Undo should restore the original layer-local object order in memory."
  );

  const redoResult = editorState.redo(undoResult.history, undoResult.editorData);
  assert(redoResult, "Redo should exist for a layer-local reorder.");
  assert.deepEqual(
    redoResult.editorData.objects
      .filter((entry: LoadedEditableProject["objects"][number]) => entry.layerId === uiLayerId)
      .map((entry: LoadedEditableProject["objects"][number]) => entry.id),
    reorderedOrder,
    "Redo should restore the reordered layer-local object order in memory."
  );

  const saveResult = await saveEditableProjectData(projectRoot, mutated);
  assert(saveResult.snapshotDir, "Reorder save must create a snapshot directory.");
  assert(saveResult.historyPath, "Reorder save must append a local save-history log.");
  assert(saveResult.replayProjectPath, "Reorder save must report the replay-facing sync target.");
  await Promise.all([
    fs.access(saveResult.snapshotDir),
    fs.access(saveResult.historyPath),
    fs.access(saveResult.replayProjectPath)
  ]);

  const reloadedAfterSave = await loadEditableProjectData(projectRoot);
  assert(reloadedAfterSave, "Editable project data must reload after layer reorder save.");
  assert.deepEqual(
    reloadedAfterSave.objects
      .filter((entry: LoadedEditableProject["objects"][number]) => entry.layerId === uiLayerId)
      .map((entry: LoadedEditableProject["objects"][number]) => entry.id),
    reorderedOrder,
    "Layer-local object order must persist in editable files after reload."
  );

  const previewScene = buildPreviewSceneFromEditableProject(reloadedAfterSave);
  assert.deepEqual(
    getPreviewLayerObjectIds(previewScene, uiLayerId),
    reorderedOrder,
    "Preview scene layer object order must reflect the saved layer-local reorder."
  );

  const sliceAfterSave = await loadProjectSlice("project_001");
  assert.deepEqual(
    sliceAfterSave.previewScene ? getPreviewLayerObjectIds(sliceAfterSave.previewScene, uiLayerId) : [],
    reorderedOrder,
    "Shell preview scene must reflect the saved layer-local reorder."
  );
  assert.deepEqual(
    getSyncedLayerNodeIds(sliceAfterSave.project as Record<string, unknown>, uiLayerId),
    reorderedOrder,
    "Replay-facing project.json must preserve the reordered draw order within layer.ui."
  );

  const duplicateSnapshot = cloneEditableProjectData(reloadedAfterSave);
  const duplicateResult = editorState.duplicateObject(duplicateSnapshot, "node.win-banner");
  assert(duplicateResult, "Duplicate must still work after a layer-local reorder.");
  const duplicateId = duplicateResult.objectId;
  const duplicateSave = await saveEditableProjectData(projectRoot, duplicateSnapshot);
  assert(duplicateSave.snapshotDir, "Duplicate save after reorder must create a snapshot directory.");
  assert(duplicateSave.historyPath, "Duplicate save after reorder must append a local save-history log.");
  await Promise.all([
    fs.access(duplicateSave.snapshotDir),
    fs.access(duplicateSave.historyPath)
  ]);

  const reloadedAfterDuplicate = await loadEditableProjectData(projectRoot);
  assert(reloadedAfterDuplicate, "Editable project data must reload after duplicate save.");
  const duplicatedObject = findEditableObject(reloadedAfterDuplicate, duplicateId);
  assert.equal(duplicatedObject.layerId, uiLayerId, "Duplicate after reorder must stay on the same layer.");

  const deleteSnapshot = cloneEditableProjectData(reloadedAfterDuplicate);
  const deleteResult = editorState.deleteObject(deleteSnapshot, duplicateId);
  assert(deleteResult, "Delete must still work after duplicate-after-reorder.");
  const deleteSave = await saveEditableProjectData(projectRoot, deleteSnapshot);
  assert(deleteSave.snapshotDir, "Delete save after reorder must create a snapshot directory.");
  assert(deleteSave.historyPath, "Delete save after reorder must append a local save-history log.");
  await Promise.all([
    fs.access(deleteSave.snapshotDir),
    fs.access(deleteSave.historyPath)
  ]);

  const reloadedAfterDelete = await loadEditableProjectData(projectRoot);
  assert(reloadedAfterDelete, "Editable project data must reload after delete save.");
  assert.equal(reloadedAfterDelete.objects.some((entry) => entry.id === duplicateId), false, "Deleted duplicate must not persist after reload.");

  const isolationHistory = editorState.createHistory(reloadedAfterSave);
  const beforeIsolationFingerprint = editorState.fingerprint(reloadedAfterDelete);
  const visibleLayerIds = editorState.getRenderableLayerIds(reloadedAfterDelete, uiLayerId);
  const hiddenLayerIds = reloadedAfterDelete.layers
    .map((entry) => entry.id)
    .filter((entry) => entry !== uiLayerId);
  assert.deepEqual(visibleLayerIds, [uiLayerId], "Session-only isolate should focus exactly one layer.");
  assert.equal(hiddenLayerIds.includes(uiLayerId), false, "Session-only isolate should hide non-focused layers only.");
  assert.equal(editorState.isDirty(isolationHistory, reloadedAfterDelete), false, "Session-only isolate must not dirty the persistent project data.");
  assert.equal(
    editorState.fingerprint(reloadedAfterDelete),
    beforeIsolationFingerprint,
    "Session-only isolate must not mutate the saved project data."
  );

  const restoreSave = await saveEditableProjectData(projectRoot, restoredSnapshot);
  assert(restoreSave.snapshotDir, "Restore save must create a snapshot directory.");
  assert(restoreSave.historyPath, "Restore save must append a local save-history log.");
  await Promise.all([
    fs.access(restoreSave.snapshotDir),
    fs.access(restoreSave.historyPath)
  ]);

  const reloadedAfterRestore = await loadEditableProjectData(projectRoot);
  assert(reloadedAfterRestore, "Editable project data must reload after restore.");
  assert.deepEqual(
    reloadedAfterRestore.objects
      .filter((entry: LoadedEditableProject["objects"][number]) => entry.layerId === uiLayerId)
      .map((entry: LoadedEditableProject["objects"][number]) => entry.id),
    sourceOrder,
    "Restored project must return the UI layer to its original object order."
  );

  await Promise.all([
    fs.rm(saveResult.snapshotDir, { recursive: true, force: true }),
    fs.rm(duplicateSave.snapshotDir, { recursive: true, force: true }),
    fs.rm(deleteSave.snapshotDir, { recursive: true, force: true }),
    fs.rm(restoreSave.snapshotDir, { recursive: true, force: true }),
    fs.rm(saveResult.historyPath, { force: true })
  ]);

  const sliceAfterRestore = await loadProjectSlice("project_001");
  assert.deepEqual(
    sliceAfterRestore.previewScene ? getPreviewLayerObjectIds(sliceAfterRestore.previewScene, uiLayerId) : [],
    sourceOrder,
    "Preview scene must return to the original layer-local order after restore."
  );

  console.log("PASS smoke:order-isolate");
  console.log(`Layer reorder persisted in: ${path.relative(workspaceRoot, projectRoot)}/internal/objects.json`);
  console.log(`Isolated layer view: ${uiLayerId} only (session-only, non-persistent)`);
  console.log(`Reordered layer order: ${reorderedOrder.join(" > ")}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`FAIL smoke:order-isolate - ${message}`);
  process.exitCode = 1;
});
