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
  const scene = scenes[0] as { layers?: Array<{ nodes?: Array<Record<string, unknown>> }> } | undefined;
  const layers = Array.isArray(scene?.layers) ? scene.layers : [];

  for (const layer of layers) {
    const nodes = Array.isArray(layer.nodes) ? layer.nodes : [];
    const match = nodes.find((entry) => entry?.nodeId === nodeId);
    if (match) {
      return match;
    }
  }

  return null;
}

async function main(): Promise<void> {
  const original = await loadEditableProjectData(projectRoot);
  assert(original, "project_001 editable scene data must exist before the duplicate-delete smoke test.");

  const duplicateId = "node.title-copy-smoke";
  const source = findEditableObject(original, "node.title");
  const duplicateSnapshot = cloneEditableProjectData(original);
  duplicateSnapshot.objects.push({
    ...source,
    id: duplicateId,
    displayName: `${source.displayName} Copy`,
    x: source.x + 44,
    y: source.y + 26,
    notes: `${source.notes ?? "Editable title text"} | duplicate smoke`
  });

  const duplicateHistory = editorState.createHistory(original);
  const duplicateHistoryWithUndo = editorState.pushUndoSnapshot(duplicateHistory, original, "Duplicate node.title");
  assert(editorState.isDirty(duplicateHistoryWithUndo, duplicateSnapshot), "Duplicate state must be dirty before save.");

  const duplicateSave = await saveEditableProjectData(projectRoot, duplicateSnapshot);
  assert(duplicateSave.snapshotDir, "duplicate save must create a snapshot directory.");
  assert(duplicateSave.historyPath, "duplicate save must append a local save-history log.");
  assert(duplicateSave.replayProjectPath, "duplicate save must report the synced replay-facing project path.");
  await Promise.all([
    fs.access(duplicateSave.snapshotDir),
    fs.access(duplicateSave.historyPath),
    fs.access(duplicateSave.replayProjectPath)
  ]);

  const reloadedAfterDuplicate = await loadEditableProjectData(projectRoot);
  assert(reloadedAfterDuplicate, "project_001 editable data must still load after duplicate save.");
  const duplicateObject = findEditableObject(reloadedAfterDuplicate, duplicateId);
  assert.equal(duplicateObject.layerId, source.layerId, "Duplicate object must stay on the source layer after reload.");
  assert.equal(duplicateObject.x, source.x + 44, "Duplicate x must persist after reload.");
  assert.equal(duplicateObject.y, source.y + 26, "Duplicate y must persist after reload.");
  assert(reloadedAfterDuplicate.scene.objectIds.includes(duplicateId), "Scene objectIds must include the duplicated object after sync.");

  const duplicateSavedHistory = editorState.markSaved(duplicateHistoryWithUndo, reloadedAfterDuplicate);
  assert.equal(editorState.isDirty(duplicateSavedHistory, reloadedAfterDuplicate), false, "Duplicate save must clear the dirty flag.");
  const sliceAfterDuplicate = await loadProjectSlice("project_001");
  const syncedDuplicateNode = getSyncedSceneNode(sliceAfterDuplicate.project as Record<string, unknown>, duplicateId) as Record<string, unknown> | null;
  assert(syncedDuplicateNode, "Replay-facing project.json must contain the duplicated object after save/sync.");
  const syncedDuplicatePosition = syncedDuplicateNode?.position as Record<string, unknown>;
  assert.equal(syncedDuplicatePosition.x, source.x + 44, "Replay-facing project.json must reflect duplicated x after sync.");
  assert.equal(syncedDuplicatePosition.y, source.y + 26, "Replay-facing project.json must reflect duplicated y after sync.");

  const deletedSnapshot = cloneEditableProjectData(reloadedAfterDuplicate);
  deletedSnapshot.objects = deletedSnapshot.objects.filter((entry) => entry.id !== duplicateId);
  deletedSnapshot.scene.objectIds = deletedSnapshot.scene.objectIds.filter((id) => id !== duplicateId);
  const deleteHistory = editorState.pushUndoSnapshot(duplicateSavedHistory, reloadedAfterDuplicate, "Delete node.title-copy-smoke");
  assert(editorState.isDirty(deleteHistory, deletedSnapshot), "Delete state must be dirty before save.");

  const deleteSave = await saveEditableProjectData(projectRoot, deletedSnapshot);
  assert(deleteSave.snapshotDir, "delete save must create a snapshot directory.");
  assert(deleteSave.historyPath, "delete save must append a local save-history log.");
  assert(deleteSave.replayProjectPath, "delete save must report the synced replay-facing project path.");
  await Promise.all([
    fs.access(deleteSave.snapshotDir),
    fs.access(deleteSave.historyPath),
    fs.access(deleteSave.replayProjectPath)
  ]);

  const reloadedAfterDelete = await loadEditableProjectData(projectRoot);
  assert(reloadedAfterDelete, "project_001 editable data must still load after delete save.");
  assert(!reloadedAfterDelete.objects.some((entry: { id: string }) => entry.id === duplicateId), "Deleted duplicate object must not survive reload.");
  assert(!reloadedAfterDelete.scene.objectIds.includes(duplicateId), "Scene objectIds must not include the deleted duplicate.");
  const sliceAfterDelete = await loadProjectSlice("project_001");
  assert.equal(getSyncedSceneNode(sliceAfterDelete.project as Record<string, unknown>, duplicateId), null, "Replay-facing project.json must not contain the deleted duplicate after save/sync.");

  const undone = editorState.undo(deleteHistory, deletedSnapshot);
  assert(undone, "Undo state must exist after delete.");
  assert(undone.editorData.objects.some((entry: { id: string }) => entry.id === duplicateId), "Undo must restore the duplicate in memory.");

  const redone = editorState.redo(undone.history, undone.editorData);
  assert(redone, "Redo state must exist after delete undo.");
  assert(!redone.editorData.objects.some((entry: { id: string }) => entry.id === duplicateId), "Redo must re-apply the delete in memory.");

  const restoreSave = await saveEditableProjectData(projectRoot, original);
  assert(restoreSave.snapshotDir, "restore save must create a snapshot directory.");
  assert(restoreSave.historyPath, "restore save must append a local save-history log.");
  await Promise.all([
    fs.access(restoreSave.snapshotDir),
    fs.access(restoreSave.historyPath)
  ]);

  const reloadedAfterRestore = await loadEditableProjectData(projectRoot);
  assert(reloadedAfterRestore, "project_001 editable data must still load after restore.");
  assert.equal(
    reloadedAfterRestore.objects.some((entry) => entry.id === duplicateId),
    false,
    "Restored project_001 must not contain the duplicated object."
  );

  await Promise.all([
    fs.rm(duplicateSave.snapshotDir, { recursive: true, force: true }),
    fs.rm(deleteSave.snapshotDir, { recursive: true, force: true }),
    fs.rm(restoreSave.snapshotDir, { recursive: true, force: true }),
    fs.rm(duplicateSave.historyPath, { force: true })
  ]);

  const sliceAfterRestore = await loadProjectSlice("project_001");
  assert(
    sliceAfterRestore.editableProject?.objects.every((entry: { id: string }) => entry.id !== duplicateId),
    "Reloaded project slice must not contain the duplicate after full restore."
  );

  console.log("PASS smoke:duplicate-delete");
  console.log(`Duplicate id: ${duplicateId}`);
  console.log(`Saved and restored snapshots: ${path.relative(workspaceRoot, duplicateSave.snapshotDir)} and ${path.relative(workspaceRoot, deleteSave.snapshotDir)}`);
  console.log(`History log: ${path.relative(workspaceRoot, duplicateSave.historyPath)}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`FAIL smoke:duplicate-delete - ${message}`);
  process.exitCode = 1;
});
