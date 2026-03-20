import { strict as assert } from "node:assert";
import { existsSync, promises as fs } from "node:fs";
import path from "node:path";
import { cloneEditableProjectData, loadEditableProjectData, saveEditableProjectData } from "../../30_app/workspace/editableProject";
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

function findEditableObject(data: NonNullable<Awaited<ReturnType<typeof loadEditableProjectData>>>, objectId: string) {
  const object = data.objects.find((entry) => entry.id === objectId);
  assert(object, `Editable object ${objectId} must exist.`);
  return object;
}

function getSyncedSceneNode(project: Record<string, unknown>, nodeId: string) {
  const scenes = Array.isArray(project.scenes) ? project.scenes : [];
  const scene = scenes[0] as {
    layers?: Array<{ layerId?: string; name?: string; nodes?: Array<Record<string, unknown>> }>;
  } | undefined;
  const layers = Array.isArray(scene?.layers) ? scene.layers : [];

  for (const layer of layers) {
    const nodes = Array.isArray(layer.nodes) ? layer.nodes : [];
    const match = nodes.find((entry) => entry?.nodeId === nodeId);
    if (match) {
      return {
        node: match,
        layerId: typeof layer.layerId === "string" ? layer.layerId : null,
        layerName: typeof layer.name === "string" ? layer.name : null
      };
    }
  }

  return null;
}

async function main(): Promise<void> {
  const original = await loadEditableProjectData(projectRoot);
  assert(original, "project_001 editable scene data must exist before the create-object smoke test.");

  const restoredSnapshot = cloneEditableProjectData(original);
  const createdSnapshot = cloneEditableProjectData(original);
  const createHistory = editorState.createHistory(original);
  const createdObject = editorState.createPlaceholderObject(createdSnapshot, {
    selectedLayerId: "layer.gameplay",
    viewport: createdSnapshot.scene.viewport
  });

  assert(createdObject, "A placeholder object should be creatable on an editable layer.");
  assert.equal(createdObject.type, "shape", "New placeholder object should use the bounded generic shape type.");
  assert.equal(createdObject.layerId, "layer.gameplay", "New placeholder object should prefer the selected editable layer.");
  assert.equal(createdObject.visible, true, "New placeholder object should default to visible.");
  assert.equal(createdObject.locked, false, "New placeholder object should default to unlocked.");

  const createHistoryWithUndo = editorState.pushUndoSnapshot(createHistory, original, `Create ${createdObject.id}`);
  createdSnapshot.objects.push(createdObject);
  assert(editorState.isDirty(createHistoryWithUndo, createdSnapshot), "Create must mark the editor state dirty.");

  const undoneCreate = editorState.undo(createHistoryWithUndo, createdSnapshot);
  assert(undoneCreate, "Undo should exist for a created object.");
  assert.equal(undoneCreate.editorData.objects.some((entry: { id: string }) => entry.id === createdObject.id), false, "Undo should remove the created object in memory.");

  const redoneCreate = editorState.redo(undoneCreate.history, undoneCreate.editorData);
  assert(redoneCreate, "Redo should exist after create undo.");
  assert.equal(redoneCreate.editorData.objects.some((entry: { id: string }) => entry.id === createdObject.id), true, "Redo should restore the created object in memory.");

  const editedSnapshot = cloneEditableProjectData(redoneCreate.editorData);
  const createdEditableObject = findEditableObject(editedSnapshot, createdObject.id);
  const defaultDisplayName = createdEditableObject.displayName;
  const defaultX = createdEditableObject.x;
  const defaultY = createdEditableObject.y;
  const defaultLayerId = createdEditableObject.layerId;
  const defaultScaleX = createdEditableObject.scaleX;
  const defaultVisible = createdEditableObject.visible;
  const targetLayerId = "layer.ui";
  const snappedPosition = editorState.snapPoint({
    x: defaultX + 33,
    y: defaultY + 19
  }, editorState.DEFAULT_SNAP_SIZE);
  const historyBeforeEdit = editorState.pushUndoSnapshot(redoneCreate.history, redoneCreate.editorData, `Edit ${createdObject.id}`);

  createdEditableObject.displayName = `${defaultDisplayName} (edited)`;
  createdEditableObject.x = snappedPosition.x;
  createdEditableObject.y = snappedPosition.y;
  createdEditableObject.scaleX = 1.15;
  createdEditableObject.visible = false;
  createdEditableObject.notes = `${createdEditableObject.notes ?? "Created in MyIDE"} | create-object smoke`;
  const reassignResult = editorState.reassignObjectLayer(editedSnapshot, createdObject.id, targetLayerId);
  assert(reassignResult?.changed, "Created object should be reassignable to another unlocked layer.");
  assert.equal(reassignResult.targetLayerId, targetLayerId, "Created object should move to the requested target layer.");

  const undoneEdit = editorState.undo(historyBeforeEdit, editedSnapshot);
  assert(undoneEdit, "Undo should exist for created-object edits.");
  const undoneCreatedObject = findEditableObject(undoneEdit.editorData, createdObject.id);
  assert.equal(undoneCreatedObject.displayName, defaultDisplayName, "Undo should restore the default display name for the created object.");
  assert.equal(undoneCreatedObject.x, defaultX, "Undo should restore the default x for the created object.");
  assert.equal(undoneCreatedObject.y, defaultY, "Undo should restore the default y for the created object.");
  assert.equal(undoneCreatedObject.layerId, defaultLayerId, "Undo should restore the default layer for the created object.");

  const redoneEdit = editorState.redo(undoneEdit.history, undoneEdit.editorData);
  assert(redoneEdit, "Redo should exist for created-object edits.");
  const redoneCreatedObject = findEditableObject(redoneEdit.editorData, createdObject.id);
  assert.equal(redoneCreatedObject.displayName, `${defaultDisplayName} (edited)`, "Redo should restore the edited display name for the created object.");
  assert.equal(redoneCreatedObject.x, snappedPosition.x, "Redo should restore the snapped x for the created object.");
  assert.equal(redoneCreatedObject.y, snappedPosition.y, "Redo should restore the snapped y for the created object.");
  assert.equal(redoneCreatedObject.layerId, targetLayerId, "Redo should restore the reassigned layer for the created object.");

  const createSave = await saveEditableProjectData(projectRoot, editedSnapshot);
  assert(createSave.snapshotDir, "create save must create a snapshot directory.");
  assert(createSave.historyPath, "create save must append a local save-history log.");
  assert(createSave.replayProjectPath, "create save must report the replay-facing sync target.");
  await Promise.all([
    fs.access(createSave.snapshotDir),
    fs.access(createSave.historyPath),
    fs.access(createSave.replayProjectPath)
  ]);

  const reloadedAfterCreate = await loadEditableProjectData(projectRoot);
  assert(reloadedAfterCreate, "Editable project data must reload after create-object save.");
  const reloadedCreatedObject = findEditableObject(reloadedAfterCreate, createdObject.id);
  assert.equal(reloadedCreatedObject.displayName, `${defaultDisplayName} (edited)`, "Created object display name must persist after reload.");
  assert.equal(reloadedCreatedObject.x, snappedPosition.x, "Created object snapped x must persist after reload.");
  assert.equal(reloadedCreatedObject.y, snappedPosition.y, "Created object snapped y must persist after reload.");
  assert.equal(reloadedCreatedObject.scaleX, 1.15, "Created object scaleX must persist after reload.");
  assert.equal(reloadedCreatedObject.visible, false, "Created object visibility must persist after reload.");
  assert.equal(reloadedCreatedObject.layerId, targetLayerId, "Created object layer reassignment must persist after reload.");

  const sliceAfterCreate = await loadProjectSlice("project_001");
  const syncedCreatedNode = getSyncedSceneNode(sliceAfterCreate.project as Record<string, unknown>, createdObject.id) as {
    node: Record<string, unknown>;
    layerId: string | null;
    layerName: string | null;
  } | null;
  assert(syncedCreatedNode, "Replay-facing project.json must contain the created object after save/sync.");
  const syncedCreatedPosition = syncedCreatedNode.node.position as Record<string, unknown>;
  assert.equal(syncedCreatedNode.node.name, `${defaultDisplayName} (edited)`, "Replay-facing project.json must reflect the created object display name.");
  assert.equal(syncedCreatedPosition.x, snappedPosition.x, "Replay-facing project.json must reflect the created object snapped x.");
  assert.equal(syncedCreatedPosition.y, snappedPosition.y, "Replay-facing project.json must reflect the created object snapped y.");
  assert.equal(syncedCreatedPosition.scaleX, 1.15, "Replay-facing project.json must reflect the created object scaleX.");
  assert.equal(syncedCreatedNode.node.visible, false, "Replay-facing project.json must reflect the created object visibility.");
  assert.equal(syncedCreatedNode.layerId, targetLayerId, "Replay-facing project.json must reflect the created object layer reassignment.");

  const duplicatedSnapshot = cloneEditableProjectData(reloadedAfterCreate);
  const duplicateResult = editorState.duplicateObject(duplicatedSnapshot, createdObject.id);
  assert(duplicateResult, "Duplicate should work for the newly created object.");
  const duplicateId = duplicateResult.objectId;
  assert(duplicateId, "Duplicate should return a stable duplicate id.");

  const duplicateSave = await saveEditableProjectData(projectRoot, duplicatedSnapshot);
  assert(duplicateSave.snapshotDir, "duplicate save must create a snapshot directory.");
  assert(duplicateSave.historyPath, "duplicate save must append a local save-history log.");
  await Promise.all([
    fs.access(duplicateSave.snapshotDir),
    fs.access(duplicateSave.historyPath)
  ]);

  const reloadedAfterDuplicate = await loadEditableProjectData(projectRoot);
  assert(reloadedAfterDuplicate, "Editable project data must reload after duplicate save.");
  const duplicatedObject = findEditableObject(reloadedAfterDuplicate, duplicateId);
  assert.equal(duplicatedObject.layerId, targetLayerId, "Duplicate of created object must remain on the reassigned layer.");

  const deletedSnapshot = cloneEditableProjectData(reloadedAfterDuplicate);
  const deleteHistory = editorState.pushUndoSnapshot(
    editorState.createHistory(reloadedAfterDuplicate),
    reloadedAfterDuplicate,
    `Delete ${duplicateId}`
  );
  const deleteResult = editorState.deleteObject(deletedSnapshot, duplicateId);
  assert(deleteResult, "Delete should work for the duplicate of the created object.");
  assert.equal(deletedSnapshot.objects.some((entry: { id: string }) => entry.id === duplicateId), false, "Delete should remove the duplicated object in memory.");

  const undoneDelete = editorState.undo(deleteHistory, deletedSnapshot);
  assert(undoneDelete, "Undo should exist for duplicate delete.");
  assert.equal(undoneDelete.editorData.objects.some((entry: { id: string }) => entry.id === duplicateId), true, "Undo should restore the duplicated object in memory.");

  const redoneDelete = editorState.redo(undoneDelete.history, undoneDelete.editorData);
  assert(redoneDelete, "Redo should exist after duplicate delete undo.");
  assert.equal(redoneDelete.editorData.objects.some((entry: { id: string }) => entry.id === duplicateId), false, "Redo should re-apply the duplicate delete in memory.");

  const deleteSave = await saveEditableProjectData(projectRoot, deletedSnapshot);
  assert(deleteSave.snapshotDir, "delete save must create a snapshot directory.");
  assert(deleteSave.historyPath, "delete save must append a local save-history log.");
  await Promise.all([
    fs.access(deleteSave.snapshotDir),
    fs.access(deleteSave.historyPath)
  ]);

  const reloadedAfterDelete = await loadEditableProjectData(projectRoot);
  assert(reloadedAfterDelete, "Editable project data must reload after delete save.");
  assert.equal(reloadedAfterDelete.objects.some((entry) => entry.id === duplicateId), false, "Deleted duplicate must not persist after reload.");
  assert(reloadedAfterDelete.objects.some((entry) => entry.id === createdObject.id), "The original created object should remain after duplicate delete.");

  const sliceAfterDelete = await loadProjectSlice("project_001");
  assert.equal(getSyncedSceneNode(sliceAfterDelete.project as Record<string, unknown>, duplicateId), null, "Replay-facing project.json must not contain the deleted duplicate.");

  const restoreSave = await saveEditableProjectData(projectRoot, restoredSnapshot);
  assert(restoreSave.snapshotDir, "restore save must create a snapshot directory.");
  assert(restoreSave.historyPath, "restore save must append a local save-history log.");
  await Promise.all([
    fs.access(restoreSave.snapshotDir),
    fs.access(restoreSave.historyPath)
  ]);

  const reloadedAfterRestore = await loadEditableProjectData(projectRoot);
  assert(reloadedAfterRestore, "Editable project data must reload after restore.");
  assert.equal(reloadedAfterRestore.objects.some((entry) => entry.id === createdObject.id), false, "Restored project must not keep the created object.");
  assert.equal(reloadedAfterRestore.objects.some((entry) => entry.id === duplicateId), false, "Restored project must not keep the duplicate of the created object.");

  await Promise.all([
    fs.rm(createSave.snapshotDir, { recursive: true, force: true }),
    fs.rm(duplicateSave.snapshotDir, { recursive: true, force: true }),
    fs.rm(deleteSave.snapshotDir, { recursive: true, force: true }),
    fs.rm(restoreSave.snapshotDir, { recursive: true, force: true }),
    fs.rm(createSave.historyPath, { force: true })
  ]);

  const demoArtifactPath = path.join(workspaceRoot, "50_tests", "workspace", "project_001-demo.md");
  const demoArtifact = [
    "# project_001 Before/After Demo",
    "",
    "## Create / Snap / Reassign / Save / Sync / Reload",
    `- Created object id: ${createdObject.id}.`,
    `- Default values: displayName = ${defaultDisplayName}, layerId = ${defaultLayerId}, x = ${defaultX}, y = ${defaultY}, scaleX = ${defaultScaleX}, visible = ${defaultVisible}.`,
    `- After save + sync + reload: displayName = ${reloadedCreatedObject.displayName}, layerId = ${reloadedCreatedObject.layerId}, x = ${reloadedCreatedObject.x}, y = ${reloadedCreatedObject.y}, scaleX = ${reloadedCreatedObject.scaleX}, visible = ${reloadedCreatedObject.visible}.`,
    "",
    "## Duplicate / Delete After Creation",
    `- Duplicate id: ${duplicateId}.`,
    `- The duplicate was saved, reloaded, then deleted cleanly while the original created object remained on ${targetLayerId} until restore.`,
    "",
    "## Sync Contract",
    `- Authoritative source: ${path.relative(workspaceRoot, projectRoot)}/internal/scene.json, layers.json, objects.json.`,
    `- Generated replay output changed: ${path.relative(workspaceRoot, createSave.replayProjectPath)}.`,
    `- Save history: ${path.relative(workspaceRoot, createSave.historyPath)}.`
  ].join("\n");
  await fs.writeFile(demoArtifactPath, `${demoArtifact}\n`, "utf8");

  console.log("PASS smoke:create-object");
  console.log(`Created object: ${createdObject.id}`);
  console.log(`Duplicate id: ${duplicateId}`);
  console.log(`Synced replay output: ${path.relative(workspaceRoot, createSave.replayProjectPath)}`);
  console.log(`Demo artifact: ${path.relative(workspaceRoot, demoArtifactPath)}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`FAIL smoke:create-object - ${message}`);
  process.exitCode = 1;
});
