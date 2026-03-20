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

  assert.fail(`Synced replay scene must contain node ${nodeId}.`);
}

async function main(): Promise<void> {
  const original = await loadEditableProjectData(projectRoot);
  assert(original, "project_001 editable scene data must exist before the drag-edit smoke test.");

  const restoredSnapshot = cloneEditableProjectData(original);
  const mutated = cloneEditableProjectData(original);
  const targetObject = findEditableObject(mutated, "node.free-spins-modal");
  const originalX = targetObject.x;
  const originalY = targetObject.y;

  let history = editorState.createHistory(original);
  history = editorState.pushUndoSnapshot(history, original, "Dragged node.free-spins-modal");

  targetObject.x = originalX + 36;
  targetObject.y = originalY + 24;

  const dragSave = await saveEditableProjectData(projectRoot, mutated);
  assert(dragSave.snapshotDir, "drag save must create a snapshot directory.");
  assert(dragSave.historyPath, "drag save must append a local save-history log.");
  assert(dragSave.replayProjectPath, "drag save must report the synced replay-facing project path.");
  await fs.access(dragSave.snapshotDir);
  await fs.access(dragSave.historyPath);
  await fs.access(dragSave.replayProjectPath);

  const reloadedAfterSave = await loadEditableProjectData(projectRoot);
  assert(reloadedAfterSave, "project_001 editable data must still load after drag save.");
  const savedObject = findEditableObject(reloadedAfterSave, "node.free-spins-modal");
  assert.equal(savedObject.x, originalX + 36, "Dragged x position must persist after save.");
  assert.equal(savedObject.y, originalY + 24, "Dragged y position must persist after save.");

  const sliceAfterSave = await loadProjectSlice("project_001");
  const sliceObject = sliceAfterSave.editableProject?.objects.find((entry) => entry.id === "node.free-spins-modal");
  assert(sliceObject, "Shell project slice must include the dragged object after save.");
  assert.equal(sliceObject.x, originalX + 36, "Project slice must reflect dragged x after reload.");
  assert.equal(sliceObject.y, originalY + 24, "Project slice must reflect dragged y after reload.");
  const syncedModalNode = getSyncedSceneNode(sliceAfterSave.project as Record<string, unknown>, "node.free-spins-modal") as Record<string, unknown>;
  const syncedModalPosition = syncedModalNode.position as Record<string, unknown>;
  assert.equal(syncedModalPosition.x, originalX + 36, "Replay-facing project.json must reflect dragged x after sync.");
  assert.equal(syncedModalPosition.y, originalY + 24, "Replay-facing project.json must reflect dragged y after sync.");

  const undone = editorState.undo(history, mutated);
  assert(undone, "Undo state must exist for the drag snapshot.");
  const undoneObject = findEditableObject(undone.editorData, "node.free-spins-modal");
  assert.equal(undoneObject.x, originalX, "Undo must restore dragged x in memory.");
  assert.equal(undoneObject.y, originalY, "Undo must restore dragged y in memory.");

  const redone = editorState.redo(undone.history, undone.editorData);
  assert(redone, "Redo state must exist after drag undo.");
  const redoneObject = findEditableObject(redone.editorData, "node.free-spins-modal");
  assert.equal(redoneObject.x, originalX + 36, "Redo must restore dragged x in memory.");
  assert.equal(redoneObject.y, originalY + 24, "Redo must restore dragged y in memory.");

  const restoreSave = await saveEditableProjectData(projectRoot, restoredSnapshot);
  assert(restoreSave.snapshotDir, "restore save must create a snapshot directory.");
  assert(restoreSave.historyPath, "restore save must append a local save-history log.");
  await fs.access(restoreSave.snapshotDir);
  await fs.access(restoreSave.historyPath);

  const reloadedAfterRestore = await loadEditableProjectData(projectRoot);
  assert(reloadedAfterRestore, "project_001 editable data must still load after drag restore.");
  const restoredObject = findEditableObject(reloadedAfterRestore, "node.free-spins-modal");
  assert.equal(restoredObject.x, originalX, "Original x must be restored after the drag smoke test.");
  assert.equal(restoredObject.y, originalY, "Original y must be restored after the drag smoke test.");

  await Promise.all([
    fs.rm(dragSave.snapshotDir, { recursive: true, force: true }),
    fs.rm(restoreSave.snapshotDir, { recursive: true, force: true }),
    fs.rm(dragSave.historyPath, { force: true })
  ]);

  console.log("PASS smoke:drag-edit");
  console.log(`Dragged object: ${path.relative(workspaceRoot, projectRoot)}/internal/objects.json`);
  console.log(`Snapshot directories: ${path.relative(workspaceRoot, dragSave.snapshotDir)} and ${path.relative(workspaceRoot, restoreSave.snapshotDir)}`);
  console.log(`History log: ${path.relative(workspaceRoot, dragSave.historyPath)}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`FAIL smoke:drag-edit - ${message}`);
  process.exitCode = 1;
});
