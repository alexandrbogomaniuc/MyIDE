import { strict as assert } from "node:assert";
import { promises as fs } from "node:fs";
import path from "node:path";
import { cloneEditableProjectData, loadEditableProjectData, saveEditableProjectData } from "../../30_app/workspace/editableProject";
import { loadProjectSlice } from "../../30_app/shell/projectSlice";
import { loadWorkspaceSlice } from "../../30_app/shell/workspaceSlice";

const workspaceRoot = path.resolve(__dirname, "../../..");
const projectRoot = path.join(workspaceRoot, "40_projects", "project_001");

function findEditableObject(data: NonNullable<Awaited<ReturnType<typeof loadEditableProjectData>>>, objectId: string) {
  const object = data.objects.find((entry) => entry.id === objectId);
  assert(object, `Editable object ${objectId} must exist.`);
  return object;
}

async function main(): Promise<void> {
  const original = await loadEditableProjectData(projectRoot);
  assert(original, "project_001 editable scene data must exist before the persistence smoke test.");

  const restoredSnapshot = cloneEditableProjectData(original);
  const mutated = cloneEditableProjectData(original);
  const targetObject = findEditableObject(mutated, "node.title");
  const originalDisplayName = targetObject.displayName;
  targetObject.displayName = `${originalDisplayName} (saved)`;
  targetObject.notes = `${targetObject.notes ?? "Editable title text"} | persistence smoke test`;

  const mutatedSave = await saveEditableProjectData(projectRoot, mutated);
  const mutatedSnapshotDir = mutatedSave.snapshotDir;
  const mutatedHistoryPath = mutatedSave.historyPath;
  assert(mutatedSnapshotDir, "saveEditableProjectData must create a snapshot directory.");
  assert(mutatedHistoryPath, "saveEditableProjectData must append a local save-history log.");
  await fs.access(mutatedSnapshotDir);
  await fs.access(mutatedHistoryPath);

  const reloadedAfterSave = await loadEditableProjectData(projectRoot);
  assert(reloadedAfterSave, "project_001 editable data must still load after save.");
  assert.equal(
    findEditableObject(reloadedAfterSave, "node.title").displayName,
    `${originalDisplayName} (saved)`,
    "Saved object edits must survive a reload."
  );

  const sliceAfterSave = await loadProjectSlice("project_001");
  const editableProjectAfterSave = sliceAfterSave.editableProject;
  assert(editableProjectAfterSave, "project slice must include the editable project after save.");
  assert.equal(
    findEditableObject(editableProjectAfterSave, "node.title").displayName,
    `${originalDisplayName} (saved)`,
    "Shell project reload must reflect the saved internal object data."
  );

  const restoreSave = await saveEditableProjectData(projectRoot, restoredSnapshot);
  const restoreSnapshotDir = restoreSave.snapshotDir;
  const restoreHistoryPath = restoreSave.historyPath;
  assert(restoreSnapshotDir, "restore save must create a snapshot directory.");
  assert(restoreHistoryPath, "restore save must append a local save-history log.");
  await fs.access(restoreSnapshotDir);
  await fs.access(restoreHistoryPath);

  const reloadedAfterRestore = await loadEditableProjectData(projectRoot);
  assert(reloadedAfterRestore, "project_001 editable data must still load after restore.");
  assert.equal(
    findEditableObject(reloadedAfterRestore, "node.title").displayName,
    originalDisplayName,
    "Original object data must be restored after the smoke test."
  );

  await Promise.all([
    fs.rm(mutatedSnapshotDir, { recursive: true, force: true }),
    fs.rm(restoreSnapshotDir, { recursive: true, force: true }),
    fs.rm(mutatedHistoryPath, { force: true })
  ]);

  const workspace = await loadWorkspaceSlice();
  assert(
    workspace.projects.some((project) => project.projectId === "project_001"),
    "project_001 must remain discoverable after persistence smoke testing."
  );

  console.log("PASS smoke:project-persistence");
  console.log(`Saved object edit: ${path.relative(workspaceRoot, projectRoot)}/internal/objects.json`);
  console.log(`Snapshot directories: ${path.relative(workspaceRoot, mutatedSnapshotDir)} and ${path.relative(workspaceRoot, restoreSnapshotDir)}`);
  console.log(`History log: ${path.relative(workspaceRoot, mutatedHistoryPath)}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`FAIL smoke:project-persistence - ${message}`);
  process.exitCode = 1;
});
