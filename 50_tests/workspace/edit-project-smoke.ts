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
const editorState = require(path.join(workspaceRoot, "30_app", "shell", "renderer", "editorState.js"));

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
  assert(original, "project_001 editable scene data must exist before the edit-project smoke test.");

  const restoredSnapshot = cloneEditableProjectData(original);
  const mutated = cloneEditableProjectData(original);
  const titleObject = findEditableObject(mutated, "node.title");
  const uiLayer = findEditableLayer(mutated, "layer.ui");
  const originalDisplayName = titleObject.displayName;
  const originalX = titleObject.x;
  const originalY = titleObject.y;
  const originalScaleX = titleObject.scaleX;
  const originalScaleY = titleObject.scaleY;
  const originalVisible = titleObject.visible;
  const originalLayerVisible = uiLayer.visible;
  const originalLayerLocked = uiLayer.locked;
  const originalSceneLayerIds = original.layers.map((layer) => layer.id);
  const originalSceneObjectIds = original.objects.map((object) => object.id);
  const history = editorState.createHistory(original);

  titleObject.displayName = `${originalDisplayName} (edited)`;
  titleObject.x = originalX + 18;
  titleObject.y = originalY + 12;
  titleObject.scaleX = Number((originalScaleX + 0.1).toFixed(2));
  titleObject.visible = !originalVisible;
  titleObject.notes = `${titleObject.notes ?? "Editable title text"} | edit-project smoke test`;

  uiLayer.visible = false;
  uiLayer.locked = true;
  uiLayer.notes = `${uiLayer.notes ?? "UI layer"} | edit-project smoke test`;

  assert(editorState.isDirty(history, mutated), "Edit history must be dirty before save.");

  const mutatedSave = await saveEditableProjectData(projectRoot, mutated);
  assert(mutatedSave.snapshotDir, "saveEditableProjectData must create a snapshot directory.");
  assert(mutatedSave.historyPath, "saveEditableProjectData must append a local save-history log.");
  assert(mutatedSave.replayProjectPath, "saveEditableProjectData must report the synced replay-facing project path.");
  await Promise.all([
    fs.access(mutatedSave.snapshotDir),
    fs.access(mutatedSave.historyPath),
    fs.access(mutatedSave.replayProjectPath)
  ]);

  const reloadedAfterSave = await loadEditableProjectData(projectRoot);
  assert(reloadedAfterSave, "project_001 editable data must still load after save.");
  const reloadedObject = findEditableObject(reloadedAfterSave, "node.title");
  const reloadedLayer = findEditableLayer(reloadedAfterSave, "layer.ui");
  assert.equal(reloadedObject.displayName, `${originalDisplayName} (edited)`, "Saved displayName edits must survive reload.");
  assert.equal(reloadedObject.x, originalX + 18, "Saved x edits must survive reload.");
  assert.equal(reloadedObject.y, originalY + 12, "Saved y edits must survive reload.");
  assert.equal(reloadedObject.scaleX, Number((originalScaleX + 0.1).toFixed(2)), "Saved scale edits must survive reload.");
  assert.equal(reloadedObject.scaleY, originalScaleY, "Saved scaleY must remain unchanged.");
  assert.equal(reloadedObject.visible, !originalVisible, "Saved visibility edits must survive reload.");
  assert.equal(reloadedLayer.visible, false, "Saved layer visibility must survive reload.");
  assert.equal(reloadedLayer.locked, true, "Saved layer lock state must survive reload.");
  assert.deepStrictEqual(
    reloadedAfterSave.scene.layerIds,
    originalSceneLayerIds,
    "Scene layerIds must be synced from the saved layer collection."
  );
  assert.deepStrictEqual(
    reloadedAfterSave.scene.objectIds,
    reloadedAfterSave.objects.map((object) => object.id),
    "Scene objectIds must be synced from the saved object collection."
  );

  const savedHistory = editorState.markSaved(history, reloadedAfterSave);
  assert.equal(editorState.isDirty(savedHistory, reloadedAfterSave), false, "Save should clear the dirty flag after sync and reload.");

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
  const syncedTitleNode = getSyncedSceneNode(sliceAfterSave.project as Record<string, unknown>, "node.title") as Record<string, unknown>;
  const syncedTitlePosition = syncedTitleNode.position as Record<string, unknown>;
  assert.equal(syncedTitleNode.name, `${originalDisplayName} (edited)`, "Replay-facing project.json must reflect the edited title name.");
  assert.equal(syncedTitlePosition.x, originalX + 18, "Replay-facing project.json must reflect the edited title x.");
  assert.equal(syncedTitlePosition.y, originalY + 12, "Replay-facing project.json must reflect the edited title y.");
  assert.equal(syncedTitlePosition.scaleX, Number((originalScaleX + 0.1).toFixed(2)), "Replay-facing project.json must reflect the edited title scaleX.");
  assert.equal(syncedTitleNode.visible, !originalVisible, "Replay-facing project.json must reflect the edited title visibility.");

  const restoreSave = await saveEditableProjectData(projectRoot, restoredSnapshot);
  assert(restoreSave.snapshotDir, "restore save must create a snapshot directory.");
  assert(restoreSave.historyPath, "restore save must append a local save-history log.");
  await Promise.all([
    fs.access(restoreSave.snapshotDir),
    fs.access(restoreSave.historyPath)
  ]);

  const reloadedAfterRestore = await loadEditableProjectData(projectRoot);
  assert(reloadedAfterRestore, "project_001 editable data must still load after restore.");
  const restoredObject = findEditableObject(reloadedAfterRestore, "node.title");
  const restoredLayer = findEditableLayer(reloadedAfterRestore, "layer.ui");
  assert.equal(restoredObject.displayName, originalDisplayName, "Original displayName must be restored after the smoke test.");
  assert.equal(restoredObject.x, originalX, "Original x must be restored after the smoke test.");
  assert.equal(restoredObject.y, originalY, "Original y must be restored after the smoke test.");
  assert.equal(restoredObject.scaleX, originalScaleX, "Original scaleX must be restored after the smoke test.");
  assert.equal(restoredObject.scaleY, originalScaleY, "Original scaleY must be restored after the smoke test.");
  assert.equal(restoredObject.visible, originalVisible, "Original visible state must be restored after the smoke test.");
  assert.equal(restoredLayer.visible, originalLayerVisible, "Original layer visibility must be restored after the smoke test.");
  assert.equal(restoredLayer.locked, originalLayerLocked, "Original layer lock state must be restored after the smoke test.");
  assert.deepStrictEqual(reloadedAfterRestore.scene.layerIds, originalSceneLayerIds, "Restored scene layerIds must match the original snapshot.");
  assert.deepStrictEqual(reloadedAfterRestore.scene.objectIds, originalSceneObjectIds, "Restored scene objectIds must match the original snapshot.");

  await Promise.all([
    fs.rm(mutatedSave.snapshotDir, { recursive: true, force: true }),
    fs.rm(restoreSave.snapshotDir, { recursive: true, force: true }),
    fs.rm(mutatedSave.historyPath, { force: true })
  ]);

  const demoArtifactPath = path.join(workspaceRoot, "50_tests", "workspace", "project_001-demo.md");
  const demoArtifact = [
    "# project_001 Before/After Demo",
    "",
    "## Edit / Save / Sync / Reload",
    `- Before: node.title = ${originalDisplayName} at (${originalX}, ${originalY}), scaleX ${originalScaleX}, visible ${originalVisible}; layer.ui visible ${originalLayerVisible}, locked ${originalLayerLocked}.`,
    `- After save: node.title = ${reloadedObject.displayName} at (${reloadedObject.x}, ${reloadedObject.y}), scaleX ${reloadedObject.scaleX}, visible ${reloadedObject.visible}; layer.ui visible ${reloadedLayer.visible}, locked ${reloadedLayer.locked}.`,
    `- After restore: node.title = ${restoredObject.displayName} at (${restoredObject.x}, ${restoredObject.y}), scaleX ${restoredObject.scaleX}, visible ${restoredObject.visible}; layer.ui visible ${restoredLayer.visible}, locked ${restoredLayer.locked}.`,
    "",
    "## Sync Contract",
    `- Scene layerIds = ${originalSceneLayerIds.join(", ")}.`,
    `- Scene objectIds = ${originalSceneObjectIds.join(", ")}.`,
    `- Authoritative source: ${path.relative(workspaceRoot, projectRoot)}/internal/scene.json, layers.json, objects.json.`,
    `- Generated replay output changed: ${path.relative(workspaceRoot, mutatedSave.replayProjectPath)}.`,
    `- Save history: ${path.relative(workspaceRoot, mutatedSave.historyPath)}.`,
    "",
    "## Related Smoke",
    "- Duplicate/delete persistence is covered by `duplicate-delete-smoke.ts`."
  ].join("\n");
  await fs.writeFile(demoArtifactPath, `${demoArtifact}\n`, "utf8");

  const workspace = await loadWorkspaceSlice();
  assert(
    workspace.projects.some((project) => project.projectId === "project_001"),
    "project_001 must remain discoverable after edit-project smoke testing."
  );

  console.log("PASS smoke:edit-project");
  console.log(`Edited object: ${path.relative(workspaceRoot, projectRoot)}/internal/objects.json`);
  console.log(`Saved and restored snapshots: ${path.relative(workspaceRoot, mutatedSave.snapshotDir)} and ${path.relative(workspaceRoot, restoreSave.snapshotDir)}`);
  console.log(`History log: ${path.relative(workspaceRoot, mutatedSave.historyPath)}`);
  console.log("Verified bounded undo/redo snapshots and synchronized scene layer/object ids.");
  console.log(`Demo artifact: ${path.relative(workspaceRoot, demoArtifactPath)}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`FAIL smoke:edit-project - ${message}`);
  process.exitCode = 1;
});
