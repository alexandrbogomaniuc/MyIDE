import { strict as assert } from "node:assert";
import { existsSync, promises as fs } from "node:fs";
import path from "node:path";
import {
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

function findEditableObject(data: NonNullable<Awaited<ReturnType<typeof loadEditableProjectData>>>, objectId: string) {
  const object = data.objects.find((entry) => entry.id === objectId);
  assert(object, `Editable object ${objectId} must exist.`);
  return object;
}

function getSyncedSceneNode(project: Record<string, unknown>, nodeId: string) {
  const scenes = Array.isArray(project.scenes) ? project.scenes : [];
  const scene = scenes[0] as {
    layers?: Array<{ nodes?: Array<Record<string, unknown>> }>;
  } | undefined;
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

function getViewportSize(data: NonNullable<Awaited<ReturnType<typeof loadEditableProjectData>>>) {
  const width = Number.isFinite(data.scene.viewport?.width) ? Math.max(1, Math.round(data.scene.viewport!.width)) : 1280;
  const height = Number.isFinite(data.scene.viewport?.height) ? Math.max(1, Math.round(data.scene.viewport!.height)) : 720;
  return { width, height };
}

function clampToSceneBounds(value: number, max: number) {
  return Math.min(max, Math.max(0, Math.round(value)));
}

async function main(): Promise<void> {
  const original = await loadEditableProjectData(projectRoot);
  assert(original, "project_001 editable scene data must exist before viewport-controls smoke.");

  const restoredSnapshot = cloneEditableProjectData(original);
  const mutated = cloneEditableProjectData(original);
  const targetObject = findEditableObject(mutated, "node.win-banner");
  const originalPosition = { x: targetObject.x, y: targetObject.y };
  const viewFingerprintBaseline = editorState.fingerprint(mutated);
  const viewportSize = getViewportSize(mutated);
  const sceneSize = {
    width: viewportSize.width,
    height: viewportSize.height
  };
  const smallerViewport = {
    width: Math.round(viewportSize.width * 0.7),
    height: Math.round(viewportSize.height * 0.7)
  };

  const baseViewState = editorState.sanitizeViewportState({
    zoom: editorState.DEFAULT_VIEW_ZOOM,
    panX: 0,
    panY: 0
  });
  assert.equal(baseViewState.zoom, 1, "Base viewport state should start at 1x zoom.");
  assert.equal(baseViewState.panX, 0, "Base viewport state should start with zero panX.");
  assert.equal(baseViewState.panY, 0, "Base viewport state should start with zero panY.");

  const zoomedViewState = editorState.zoomViewportAtPoint(baseViewState, {
    zoom: 1.5,
    anchor: { x: viewportSize.width / 2, y: viewportSize.height / 2 },
    viewportSize,
    sceneSize
  });
  assert(zoomedViewState.zoom > baseViewState.zoom, "Zoom helper should increase zoom when requested.");

  const pannedViewState = editorState.panViewportByDelta(zoomedViewState, {
    delta: { x: -84, y: 48 },
    viewportSize,
    sceneSize
  });
  assert(
    pannedViewState.panX !== zoomedViewState.panX || pannedViewState.panY !== zoomedViewState.panY,
    "Pan helper should move the viewport when delta is applied."
  );

  const fitViewState = editorState.fitViewportToScene(smallerViewport, sceneSize, 48);
  assert(
    fitViewState.zoom < editorState.DEFAULT_VIEW_ZOOM,
    "Fit helper should zoom out when the visible viewport is smaller than the scene."
  );
  assert(
    Number.isFinite(fitViewState.panX) && Number.isFinite(fitViewState.panY),
    "Fit helper should produce finite centered pan values."
  );

  const resetViewState = editorState.sanitizeViewportState(null);
  assert.equal(resetViewState.zoom, editorState.DEFAULT_VIEW_ZOOM, "Reset helper should return the default zoom.");
  assert.equal(resetViewState.panX, 0, "Reset helper should return default panX.");
  assert.equal(resetViewState.panY, 0, "Reset helper should return default panY.");

  assert.equal(
    editorState.fingerprint(mutated),
    viewFingerprintBaseline,
    "Session-only viewport view operations must not mutate persistent project data."
  );

  const worldStart = { x: targetObject.x, y: targetObject.y };
  const screenStart = editorState.worldToScreenPoint(worldStart, pannedViewState);
  const screenDragged = {
    x: screenStart.x + 45,
    y: screenStart.y - 30
  };
  const worldDragged = editorState.screenToWorldPoint(screenDragged, pannedViewState);
  const expectedX = clampToSceneBounds(worldDragged.x, viewportSize.width - 1);
  const expectedY = clampToSceneBounds(worldDragged.y, viewportSize.height - 1);
  assert(
    expectedX !== originalPosition.x || expectedY !== originalPosition.y,
    "Transformed-view drag projection should produce a different persistent object position."
  );

  targetObject.x = expectedX;
  targetObject.y = expectedY;

  const saveResult = await saveEditableProjectData(projectRoot, mutated);
  assert(saveResult.snapshotDir, "Viewport-controls save must create a snapshot directory.");
  assert(saveResult.historyPath, "Viewport-controls save must append save history.");
  assert(saveResult.replayProjectPath, "Viewport-controls save must include replay sync target.");
  await Promise.all([
    fs.access(saveResult.snapshotDir),
    fs.access(saveResult.historyPath),
    fs.access(saveResult.replayProjectPath)
  ]);

  const reloadedAfterSave = await loadEditableProjectData(projectRoot);
  assert(reloadedAfterSave, "Editable project data must reload after viewport-controls save.");
  const reloadedObject = findEditableObject(reloadedAfterSave, "node.win-banner");
  assert.equal(reloadedObject.x, expectedX, "Transformed-view x change must persist after reload.");
  assert.equal(reloadedObject.y, expectedY, "Transformed-view y change must persist after reload.");

  const sliceAfterSave = await loadProjectSlice("project_001");
  const sliceObject = sliceAfterSave.editableProject?.objects.find((entry) => entry.id === "node.win-banner");
  assert(sliceObject, "Project slice must contain node.win-banner after viewport-controls save.");
  assert.equal(sliceObject.x, expectedX, "Project slice must reflect transformed-view persisted x.");
  assert.equal(sliceObject.y, expectedY, "Project slice must reflect transformed-view persisted y.");

  const syncedNode = getSyncedSceneNode(sliceAfterSave.project as Record<string, unknown>, "node.win-banner") as Record<string, unknown>;
  const syncedPosition = syncedNode.position as Record<string, unknown>;
  assert.equal(syncedPosition.x, expectedX, "Replay-facing project.json must reflect transformed-view persisted x.");
  assert.equal(syncedPosition.y, expectedY, "Replay-facing project.json must reflect transformed-view persisted y.");

  const restoreSave = await saveEditableProjectData(projectRoot, restoredSnapshot);
  assert(restoreSave.snapshotDir, "Viewport-controls restore must create a snapshot directory.");
  assert(restoreSave.historyPath, "Viewport-controls restore must append save history.");
  await Promise.all([
    fs.access(restoreSave.snapshotDir),
    fs.access(restoreSave.historyPath)
  ]);

  const reloadedAfterRestore = await loadEditableProjectData(projectRoot);
  assert(reloadedAfterRestore, "Editable project data must reload after viewport-controls restore.");
  const restoredObject = findEditableObject(reloadedAfterRestore, "node.win-banner");
  assert.equal(restoredObject.x, originalPosition.x, "Restore must return original x after viewport-controls smoke.");
  assert.equal(restoredObject.y, originalPosition.y, "Restore must return original y after viewport-controls smoke.");

  await Promise.all([
    fs.rm(saveResult.snapshotDir, { recursive: true, force: true }),
    fs.rm(restoreSave.snapshotDir, { recursive: true, force: true }),
    fs.rm(saveResult.historyPath, { force: true })
  ]);

  const demoArtifactPath = path.join(workspaceRoot, "50_tests", "workspace", "project_001-demo.md");
  const demoArtifact = [
    "# project_001 Before/After Demo",
    "",
    "## Viewport Controls / Save / Sync / Reload",
    "- Object id: node.win-banner.",
    `- View state (session-only): zoom ${baseViewState.zoom} -> ${zoomedViewState.zoom}, pan (${zoomedViewState.panX}, ${zoomedViewState.panY}) -> (${pannedViewState.panX}, ${pannedViewState.panY}), fit (${fitViewState.panX}, ${fitViewState.panY}), reset (${resetViewState.zoom}, ${resetViewState.panX}, ${resetViewState.panY}).`,
    `- Original world position: (${originalPosition.x}, ${originalPosition.y}).`,
    `- Final world position after transformed-view drag projection and save/sync/reload: (${expectedX}, ${expectedY}).`,
    `- Replay-facing/generated file changed: ${path.relative(workspaceRoot, saveResult.replayProjectPath)}.`,
    "",
    "## Notes",
    "- Zoom/pan/fit/reset are session-only view operations and do not dirty persistent project data by themselves.",
    "- Object position edits derived from transformed view coordinates persist through internal save and replay sync."
  ].join("\n");
  await fs.writeFile(demoArtifactPath, `${demoArtifact}\n`, "utf8");

  console.log("PASS smoke:viewport-controls");
  console.log(`Session-only view state verified at zoom ${zoomedViewState.zoom} with pan (${pannedViewState.panX}, ${pannedViewState.panY}).`);
  console.log(`Transformed-view persisted position: node.win-banner -> (${expectedX}, ${expectedY}).`);
  console.log(`Demo artifact: ${path.relative(workspaceRoot, demoArtifactPath)}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`FAIL smoke:viewport-controls - ${message}`);
  process.exitCode = 1;
});
