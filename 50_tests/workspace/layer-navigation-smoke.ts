import { strict as assert } from "node:assert";
import { existsSync } from "node:fs";
import path from "node:path";
import { cloneEditableProjectData, loadEditableProjectData } from "../../30_app/workspace/editableProject";

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

function getUnlockedAlternativeLayerId(data: LoadedEditableProject, excludedLayerId: string): string {
  const candidate = data.layers.find((entry) => entry.id !== excludedLayerId && !entry.locked);
  assert(candidate, "The smoke test needs an unlocked alternative layer.");
  return candidate.id;
}

async function main(): Promise<void> {
  const original = await loadEditableProjectData(projectRoot);
  assert(original, "project_001 editable scene data must exist before the layer-navigation smoke test.");

  const initialFingerprint = editorState.fingerprint(original);
  const baseContext = editorState.getObjectOrderContext(original, "node.bottom-bar");
  assert(baseContext, "Order context must exist for node.bottom-bar.");
  assert.equal(baseContext.layerId, "layer.ui", "The smoke expects node.bottom-bar to stay on layer.ui.");
  assert.equal(baseContext.index, 1, "node.bottom-bar should start as the middle UI object.");
  assert.equal(baseContext.total, 3, "The smoke expects three UI objects in the base layer order.");

  const previousContext = editorState.getAdjacentObjectInLayer(original, "node.bottom-bar", "previous");
  assert(previousContext, "Previous navigation context must exist for node.bottom-bar.");
  assert.equal(previousContext.targetObjectId, "node.win-banner", "Previous-in-layer should move to node.win-banner.");

  const nextContext = editorState.getAdjacentObjectInLayer(original, "node.bottom-bar", "next");
  assert(nextContext, "Next navigation context must exist for node.bottom-bar.");
  assert.equal(nextContext.targetObjectId, "node.free-spins-pill", "Next-in-layer should move to node.free-spins-pill.");

  const firstBoundary = editorState.getAdjacentObjectInLayer(original, "node.win-banner", "previous");
  assert(firstBoundary?.boundary, "The first object in a layer should report a previous boundary.");
  const lastBoundary = editorState.getAdjacentObjectInLayer(original, "node.free-spins-pill", "next");
  assert(lastBoundary?.boundary, "The last object in a layer should report a next boundary.");

  const soloFilteredNext = editorState.getAdjacentObjectInLayer(original, "node.bottom-bar", "next", {
    allowedObjectIds: ["node.win-banner", "node.bottom-bar"]
  });
  assert(soloFilteredNext?.boundary, "Solo-filtered navigation should stop cleanly when the next sibling is hidden.");
  assert.equal(
    editorState.fingerprint(original),
    initialFingerprint,
    "Pure navigation queries must not dirty or mutate the project data."
  );

  const duplicated = cloneEditableProjectData(original);
  const duplicateResult = editorState.duplicateObject(duplicated, "node.free-spins-pill");
  assert(duplicateResult, "Duplicate should produce a new sibling to navigate to.");
  const duplicateId = duplicateResult.objectId;
  const nextAfterDuplicate = editorState.getAdjacentObjectInLayer(duplicated, "node.free-spins-pill", "next");
  assert.equal(nextAfterDuplicate?.targetObjectId, duplicateId, "Navigation should include the duplicated sibling at the layer boundary.");

  const reassigned = cloneEditableProjectData(duplicated);
  const targetLayerId = getUnlockedAlternativeLayerId(reassigned, "layer.ui");
  const reassignResult = editorState.reassignObjectLayer(reassigned, duplicateId, targetLayerId);
  assert(reassignResult, "Duplicate should be reassignable to another unlocked layer.");
  const reassignedContext = editorState.getObjectOrderContext(reassigned, duplicateId);
  assert(reassignedContext, "Order context should still exist after layer reassignment.");
  assert.equal(reassignedContext.layerId, targetLayerId, "Reassigned object should report its new layer.");
  const navigationAfterReassign = editorState.getAdjacentObjectInLayer(reassigned, duplicateId, "next");
  assert(navigationAfterReassign, "Navigation context should still resolve after layer reassignment.");

  const deleted = cloneEditableProjectData(duplicated);
  const deleteResult = editorState.deleteObject(deleted, duplicateId);
  assert(deleteResult, "Deleted duplicate should be removable after duplicate navigation coverage.");
  const nextAfterDelete = editorState.getAdjacentObjectInLayer(deleted, "node.free-spins-pill", "next");
  assert(nextAfterDelete?.boundary, "Navigation should return to a clean boundary after deleting the temporary duplicate.");

  console.log("PASS smoke:layer-navigation");
  console.log(`Base order cue: ${baseContext.index + 1} of ${baseContext.total} in ${baseContext.layerName}`);
  console.log(`Previous/next siblings: ${previousContext.targetObjectId} <- node.bottom-bar -> ${nextContext.targetObjectId}`);
  console.log(`Duplicate navigation id: ${duplicateId}`);
  console.log(`Reassigned duplicate layer: ${targetLayerId}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`FAIL smoke:layer-navigation - ${message}`);
  process.exitCode = 1;
});
