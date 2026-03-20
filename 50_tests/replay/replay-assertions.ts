import { strict as assert } from "node:assert";
import path from "node:path";
import { getProjectSlicePaths, loadProjectSlice } from "../../30_app/shell/projectSlice";

type JsonValue = unknown;
type JsonObject = Record<string, JsonValue>;

const workspaceRoot = path.resolve(__dirname, "../../..");
const projectRoot = path.join(workspaceRoot, "40_projects", "project_001");

function asObject(value: JsonValue | undefined, label: string): JsonObject {
  assert(value && typeof value === "object" && !Array.isArray(value), `${label} must be an object`);
  return value as JsonObject;
}

function asArray(value: JsonValue | undefined, label: string): JsonValue[] {
  assert(Array.isArray(value), `${label} must be an array`);
  return value;
}

function getStateMap(project: JsonObject): Map<string, JsonObject> {
  const states = asArray(project.states, "project.states");
  return new Map(
    states.map((entry) => {
      assert(entry && typeof entry === "object" && !Array.isArray(entry), "state entry must be an object");
      const state = entry as JsonObject;
      assert(typeof state.stateId === "string", "state.stateId must be a string");
      return [state.stateId, state];
    })
  );
}

function assertTransition(states: Map<string, JsonObject>, fromStateId: string, eventName: string, targetStateId: string): void {
  const fromState = states.get(fromStateId);
  assert(fromState, `Missing state: ${fromStateId}`);
  const transitions = asArray(fromState.transitions, `${fromStateId}.transitions`);
  const hasTransition = transitions.some((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      return false;
    }

    const transition = entry as JsonObject;
    return transition.event === eventName && transition.targetStateId === targetStateId;
  });

  assert(hasTransition, `Missing transition ${fromStateId} --${eventName}--> ${targetStateId}`);
}

function getSceneNode(project: JsonObject, nodeId: string): { node: JsonObject; layerId: string } {
  const scenes = asArray(project.scenes, "project.scenes");
  const scene = asObject(scenes[0], "project.scenes[0]");
  const layers = asArray(scene.layers, "project.scenes[0].layers");

  for (const layerEntry of layers) {
    const layer = asObject(layerEntry, "project.scenes[0].layers[]");
    const layerId = String(layer.layerId ?? "");
    const nodes = asArray(layer.nodes, `project.scenes[0].layers[${layerId}].nodes`);
    for (const nodeEntry of nodes) {
      const node = asObject(nodeEntry, `project.scenes[0].layers[${layerId}].nodes[]`);
      if (node.nodeId === nodeId) {
        return { node, layerId };
      }
    }
  }

  assert.fail(`Missing replay scene node ${nodeId}`);
}

async function main(): Promise<void> {
  const slicePaths = getProjectSlicePaths();
  assert(slicePaths.length === 6, "Replay slice should enumerate six internal file paths");
  slicePaths.forEach((filePath) => {
    assert(filePath.startsWith(projectRoot), `Replay loader must stay inside project_001: ${filePath}`);
  });

  const bundle = await loadProjectSlice();
  const project = bundle.project;
  const states = getStateMap(project);

  const normalSpin = asObject(bundle.fixtures.normalSpin, "fixtures.normalSpin");
  const freeSpinsTrigger = asObject(bundle.fixtures.freeSpinsTrigger, "fixtures.freeSpinsTrigger");
  const restartRestore = asObject(bundle.fixtures.restartRestore, "fixtures.restartRestore");
  const mockGameState = asObject(bundle.runtime.mockedGameState, "runtime.mockedGameState");
  const mockLastAction = asObject(bundle.runtime.mockedLastAction, "runtime.mockedLastAction");

  assertTransition(states, "state.idle", "spin.requested", "state.spin");
  assertTransition(states, "state.spin", "spin.resolved.baseWin", "state.base-win");
  assert(normalSpin.entryStateId === "state.idle", "normal spin fixture must start at state.idle");
  assert(normalSpin.resultStateId === "state.base-win", "normal spin fixture must end at state.base-win");

  assertTransition(states, "state.spin", "spin.resolved.freeSpinsTrigger", "state.free-spins-trigger");
  assertTransition(states, "state.free-spins-trigger", "bonus.start", "state.free-spins-active");
  assert(freeSpinsTrigger.resultStateId === "state.free-spins-trigger", "free spins trigger fixture must end at state.free-spins-trigger");
  assert(freeSpinsTrigger.followUpStateId === "state.free-spins-active", "free spins trigger fixture must flow into state.free-spins-active");

  assertTransition(states, "state.restore.free-spins-active", "restart.restore", "state.free-spins-active");
  assert(restartRestore.entryStateId === "state.restore.free-spins-active", "restart fixture must start at restore state");
  assert(restartRestore.resultStateId === "state.free-spins-active", "restart fixture must settle at free-spins-active");
  assert(mockGameState.stateId === "state.free-spins-active", "mock game state must target free-spins-active");
  assert(mockLastAction.type === "restart.restore", "mock last action must be restart.restore");

  const bottomHudNode = getSceneNode(project, "node.bottom-bar");
  const bottomHudPosition = asObject(bottomHudNode.node.position, "node.bottom-bar.position");
  assert(bottomHudNode.layerId === "layer.ui", "node.bottom-bar must remain on layer.ui in replay output");
  assert(bottomHudPosition.width === 1152, "node.bottom-bar replay width must stay in sync with the internal editable model");
  assert(bottomHudPosition.height === 76, "node.bottom-bar replay height must stay in sync with the internal editable model");

  const assets = asArray(project.assets, "project.assets");
  assets.forEach((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      return;
    }

    const asset = entry as JsonObject;
    const source = asset.source;
    if (!source || typeof source !== "object" || Array.isArray(source)) {
      return;
    }

    const sourcePath = (source as JsonObject).path;
    if (typeof sourcePath === "string") {
      assert(!sourcePath.startsWith("10_donors/"), `Replay asset source must not read donor evidence at runtime: ${sourcePath}`);
    }
  });

  console.log("PASS assert:replay");
  console.log("Verified normal spin, free-spins trigger, and restart restore replay paths.");
  console.log("Verified replay loader paths stay inside 40_projects/project_001.");
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`FAIL assert:replay - ${message}`);
  process.exitCode = 1;
});
