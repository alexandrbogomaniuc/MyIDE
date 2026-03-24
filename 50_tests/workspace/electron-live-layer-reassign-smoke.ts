import { deepStrictEqual, strict as assert } from "node:assert";
import { existsSync, promises as fs, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn, type ChildProcess } from "node:child_process";

interface SmokeRunResult {
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  output: string;
  screenshotPath: string | null;
  screenshotCaptured: boolean;
  screenshotError: string | null;
}

interface LiveLayerReassignPayload {
  status?: string;
  error?: string;
  startedAt?: string;
  projectId?: string;
  presetKey?: string;
  presetLabel?: string;
  objectId?: string | null;
  sourceLayerId?: string | null;
  sourceLayerName?: string | null;
  targetLayerId?: string | null;
  targetLayerName?: string | null;
  preloadExecuted?: boolean;
  myideApiExposed?: boolean;
  projectLoaded?: boolean;
  objectCreated?: boolean;
  objectSelected?: boolean;
  layerReassigned?: boolean;
  saveSucceeded?: boolean;
  reloadSucceeded?: boolean;
  internalPersistVerified?: boolean;
  replaySyncVerified?: boolean;
  objectCountBefore?: number | null;
  objectCountAfterCreate?: number | null;
  objectCountAfterReload?: number | null;
  createdOrderIndex?: number | null;
  createdOrderTotal?: number | null;
  reassignedOrderIndex?: number | null;
  reassignedOrderTotal?: number | null;
  reloadedOrderIndex?: number | null;
  reloadedOrderTotal?: number | null;
  createdOrderIds?: string[];
  sourceLayerOrderIdsAfterReassign?: string[];
  sourceLayerOrderIdsAfterReload?: string[];
  reassignedOrderIds?: string[];
  reloadedOrderIds?: string[];
  replayOrderIds?: string[];
  sourceReplayOrderIds?: string[];
  replayPath?: string | null;
  previewStatus?: string | null;
  syncStatus?: string | null;
}

function resolveWorkspaceRoot(): string {
  const candidates = [process.cwd(), __dirname, path.resolve(__dirname, ".."), path.resolve(__dirname, "../..")];

  for (const start of candidates) {
    let current = start;
    while (true) {
      if (existsSync(path.join(current, "package.json")) && existsSync(path.join(current, "30_app", "shell", "main.ts"))) {
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

function resolveElectronBinary(workspaceRoot: string): string {
  if (process.platform === "darwin") {
    return path.join(workspaceRoot, "node_modules", "electron", "dist", "Electron.app", "Contents", "MacOS", "Electron");
  }

  if (process.platform === "win32") {
    return path.join(workspaceRoot, "node_modules", "electron", "dist", "electron.exe");
  }

  return path.join(workspaceRoot, "node_modules", "electron", "dist", "electron");
}

function getArtifactPath(): string {
  return process.env.MYIDE_LIVE_LAYER_REASSIGN_ARTIFACT_PATH || "/tmp/myide-electron-live-layer-reassign.json";
}

function getScreenshotPath(): string | null {
  const value = process.env.MYIDE_LIVE_LAYER_REASSIGN_SCREENSHOT_PATH ?? "";
  return value.trim().length > 0 ? value.trim() : null;
}

function writeArtifact(payload: unknown): void {
  writeFileSync(getArtifactPath(), `${JSON.stringify(payload, null, 2)}\n`);
}

function summarizeOutput(output: string): string {
  const trimmed = output.trim();
  if (trimmed.length === 0) {
    return "<no stdout/stderr captured>";
  }

  return trimmed.split(/\r?\n/).slice(-40).join("\n");
}

function sleep(delayMs: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });
}

function runCommand(command: string, args: string[]): Promise<{ exitCode: number | null; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("error", reject);
    child.on("close", (exitCode) => {
      resolve({ exitCode, stdout, stderr });
    });
  });
}

async function captureGitStatus(workspaceRoot: string): Promise<string> {
  const result = await runCommand("git", ["-C", workspaceRoot, "status", "--short"]);
  if (result.exitCode !== 0) {
    throw new Error(`git status --short failed with code ${result.exitCode}: ${result.stderr.trim()}`);
  }

  return result.stdout
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0)
    .sort()
    .join("\n");
}

async function copyIfPresent(sourcePath: string, backupPath: string): Promise<boolean> {
  if (!existsSync(sourcePath)) {
    return false;
  }

  await fs.mkdir(path.dirname(backupPath), { recursive: true });
  await fs.cp(sourcePath, backupPath, { recursive: true, force: true });
  return true;
}

async function restoreFromBackup(sourcePath: string, backupPath: string, existed: boolean): Promise<void> {
  await fs.rm(sourcePath, { recursive: true, force: true });
  if (existed) {
    await fs.mkdir(path.dirname(sourcePath), { recursive: true });
    await fs.cp(backupPath, sourcePath, { recursive: true, force: true });
  }
}

async function activateElectronWindow(): Promise<void> {
  if (process.platform !== "darwin") {
    return;
  }

  const result = await runCommand("osascript", ["-e", 'tell application "Electron" to activate']);
  if (result.exitCode !== 0) {
    throw new Error(result.stderr.trim() || result.stdout.trim() || "osascript failed to activate Electron.");
  }
}

async function captureElectronScreenshot(screenshotPath: string): Promise<{ captured: boolean; error: string | null }> {
  try {
    await activateElectronWindow();
    await sleep(1200);
    const result = await runCommand("screencapture", ["-x", screenshotPath]);
    if (result.exitCode !== 0) {
      return {
        captured: false,
        error: result.stderr.trim() || result.stdout.trim() || "screencapture failed."
      };
    }

    return {
      captured: existsSync(screenshotPath),
      error: existsSync(screenshotPath) ? null : "screenshot file was not created"
    };
  } catch (error) {
    return {
      captured: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

async function terminateChild(child: ChildProcess): Promise<void> {
  if (child.killed || child.exitCode !== null) {
    return;
  }

  child.kill("SIGTERM");
  const startedAt = Date.now();
  while (child.exitCode === null && Date.now() - startedAt < 5000) {
    await sleep(100);
  }

  if (child.exitCode === null) {
    child.kill("SIGKILL");
  }
}

function runElectronLiveLayerReassignSmoke(workspaceRoot: string): Promise<SmokeRunResult> {
  return new Promise((resolve, reject) => {
    const electronBinary = resolveElectronBinary(workspaceRoot);
    if (!existsSync(electronBinary)) {
      reject(new Error(`Electron binary is missing at ${electronBinary}. Run npm install first.`));
      return;
    }

    const screenshotPath = getScreenshotPath();
    const child = spawn(electronBinary, ["."], {
      cwd: workspaceRoot,
      env: {
        ...process.env,
        MYIDE_LIVE_LAYER_REASSIGN_SMOKE: "1",
        MYIDE_LIVE_LAYER_REASSIGN_TIMEOUT_MS: process.env.MYIDE_LIVE_LAYER_REASSIGN_TIMEOUT_MS || "45000",
        ...(screenshotPath ? {
          MYIDE_LIVE_LAYER_REASSIGN_SHOW: "1",
          MYIDE_LIVE_LAYER_REASSIGN_KEEP_OPEN: "1"
        } : {})
      },
      stdio: ["ignore", "pipe", "pipe"]
    });

    let output = "";
    let lineBuffer = "";
    let screenshotCaptured = false;
    let screenshotError: string | null = null;
    let screenshotRequested = false;
    const markerPrefix = "MYIDE_LIVE_LAYER_REASSIGN_RESULT:";

    const handleChunk = (chunk: unknown) => {
      const text = String(chunk);
      output += text;
      lineBuffer += text;

      while (lineBuffer.includes("\n")) {
        const newlineIndex = lineBuffer.indexOf("\n");
        const line = lineBuffer.slice(0, newlineIndex).trim();
        lineBuffer = lineBuffer.slice(newlineIndex + 1);

        if (!screenshotPath || screenshotRequested || !line.startsWith(markerPrefix)) {
          continue;
        }

        screenshotRequested = true;
        let payload: LiveLayerReassignPayload | null = null;
        try {
          payload = JSON.parse(line.slice(markerPrefix.length)) as LiveLayerReassignPayload;
        } catch (error) {
          screenshotError = error instanceof Error ? error.message : String(error);
        }

        if (payload?.status === "pass") {
          void (async () => {
            const capture = await captureElectronScreenshot(screenshotPath);
            screenshotCaptured = capture.captured;
            screenshotError = capture.error;
            await terminateChild(child);
          })();
        } else {
          void terminateChild(child);
        }
      }
    };

    child.stdout.on("data", handleChunk);
    child.stderr.on("data", handleChunk);
    child.on("error", reject);
    child.on("close", (exitCode, signal) => resolve({
      exitCode,
      signal,
      output,
      screenshotPath,
      screenshotCaptured,
      screenshotError
    }));
  });
}

async function readJson(filePath: string): Promise<unknown> {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw) as unknown;
}

function getInternalLayerOrder(document: unknown, layerId: string): string[] {
  const objects = Array.isArray((document as { objects?: unknown[] })?.objects)
    ? ((document as { objects: Array<Record<string, unknown>> }).objects)
    : [];
  return objects
    .filter((entry) => entry?.layerId === layerId)
    .map((entry) => entry?.id)
    .filter((id): id is string => typeof id === "string");
}

function getInternalSceneLayerOrder(sceneDocument: unknown, objectsDocument: unknown, layerId: string): string[] {
  const objectLayerById = new Map<string, string>();
  const objects = Array.isArray((objectsDocument as { objects?: unknown[] })?.objects)
    ? ((objectsDocument as { objects: Array<Record<string, unknown>> }).objects)
    : [];

  for (const entry of objects) {
    const objectId = typeof entry?.id === "string" ? entry.id : null;
    const objectLayerId = typeof entry?.layerId === "string" ? entry.layerId : null;
    if (objectId && objectLayerId) {
      objectLayerById.set(objectId, objectLayerId);
    }
  }

  const objectIds = Array.isArray((sceneDocument as { objectIds?: unknown[] })?.objectIds)
    ? ((sceneDocument as { objectIds: unknown[] }).objectIds)
    : [];

  return objectIds
    .filter((objectId): objectId is string => typeof objectId === "string")
    .filter((objectId) => objectLayerById.get(objectId) === layerId);
}

function getInternalObject(document: unknown, objectId: string): Record<string, unknown> | null {
  const objects = Array.isArray((document as { objects?: unknown[] })?.objects)
    ? ((document as { objects: Array<Record<string, unknown>> }).objects)
    : [];
  return objects.find((entry) => entry?.id === objectId) ?? null;
}

function getReplayLayerOrder(project: unknown, layerId: string): string[] {
  const scenes = Array.isArray((project as { scenes?: unknown[] })?.scenes)
    ? ((project as { scenes: Array<Record<string, unknown>> }).scenes)
    : [];

  for (const scene of scenes) {
    const layers = Array.isArray(scene?.layers)
      ? (scene.layers as Array<Record<string, unknown>>)
      : [];
    const match = layers.find((layer) => layer?.layerId === layerId);
    if (!match) {
      continue;
    }

    const nodes = Array.isArray(match.nodes)
      ? (match.nodes as Array<Record<string, unknown>>)
      : [];
    return nodes
      .map((node) => node?.nodeId)
      .filter((nodeId): nodeId is string => typeof nodeId === "string");
  }

  return [];
}

function getReplayNodeInfo(project: unknown, objectId: string): { layerId: string | null; node: Record<string, unknown> | null } {
  const scenes = Array.isArray((project as { scenes?: unknown[] })?.scenes)
    ? ((project as { scenes: Array<Record<string, unknown>> }).scenes)
    : [];

  for (const scene of scenes) {
    const layers = Array.isArray(scene?.layers)
      ? (scene.layers as Array<Record<string, unknown>>)
      : [];
    for (const layer of layers) {
      const layerId = typeof layer?.layerId === "string" ? layer.layerId : null;
      const nodes = Array.isArray(layer?.nodes)
        ? (layer.nodes as Array<Record<string, unknown>>)
        : [];
      const match = nodes.find((node) => node?.nodeId === objectId) ?? null;
      if (match) {
        return {
          layerId,
          node: match
        };
      }
    }
  }

  return {
    layerId: null,
    node: null
  };
}

async function main(): Promise<void> {
  const workspaceRoot = resolveWorkspaceRoot();
  const projectRoot = path.join(workspaceRoot, "40_projects", "project_001");
  const internalRoot = path.join(projectRoot, "internal");
  const replayProjectPath = path.join(projectRoot, "project.json");
  const registryPath = path.join(workspaceRoot, "40_projects", "registry.json");
  const logsRoot = path.join(projectRoot, "logs");
  const snapshotRoot = path.join(logsRoot, "editor-snapshots");
  const historyPath = path.join(logsRoot, "editor-save-history.jsonl");
  const backupRoot = await fs.mkdtemp(path.join(os.tmpdir(), "myide-live-layer-reassign-backup-"));

  const restorePlan = [
    { source: registryPath, backup: path.join(backupRoot, "registry.json"), existed: false },
    { source: internalRoot, backup: path.join(backupRoot, "internal"), existed: false },
    { source: replayProjectPath, backup: path.join(backupRoot, "project.json"), existed: false },
    { source: snapshotRoot, backup: path.join(backupRoot, "editor-snapshots"), existed: false },
    { source: historyPath, backup: path.join(backupRoot, "editor-save-history.jsonl"), existed: false }
  ];

  const baselineStatus = await captureGitStatus(workspaceRoot);
  for (const item of restorePlan) {
    item.existed = await copyIfPresent(item.source, item.backup);
  }

  let result: SmokeRunResult | null = null;
  let payload: LiveLayerReassignPayload | null = null;
  let onDiskSourceSceneOrder: string[] | null = null;
  let onDiskTargetSceneOrder: string[] | null = null;
  let onDiskSourceInternalOrder: string[] | null = null;
  let onDiskTargetInternalOrder: string[] | null = null;
  let onDiskSourceReplayOrder: string[] | null = null;
  let onDiskTargetReplayOrder: string[] | null = null;
  let onDiskInternalLayerId: string | null = null;
  let onDiskReplayLayerId: string | null = null;
  let restoredStatus = "";

  try {
    result = await runElectronLiveLayerReassignSmoke(workspaceRoot);
    const outputSummary = summarizeOutput(result.output);
    const lines = result.output
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const mainReadySeen = lines.some((line) => line.includes("MYIDE_LIVE_LAYER_REASSIGN_MAIN_READY"));
    assert(
      mainReadySeen,
      `Main-process live layer-reassign marker was not emitted. Exit=${result.exitCode} Signal=${result.signal ?? "none"}\n${outputSummary}`
    );

    const markerPrefix = "MYIDE_LIVE_LAYER_REASSIGN_RESULT:";
    const payloadLine = lines.find((line) => line.startsWith(markerPrefix));
    assert(
      payloadLine,
      `Renderer live layer-reassign result marker was not emitted. Exit=${result.exitCode} Signal=${result.signal ?? "none"}\n${outputSummary}`
    );

    payload = JSON.parse(payloadLine.slice(markerPrefix.length)) as LiveLayerReassignPayload;
    assert.equal(payload.status, "pass", `Live layer-reassign smoke reported failure: ${payload.error ?? "unknown error"}`);
    assert.equal(payload.preloadExecuted, true, "Preload execution marker was false.");
    assert.equal(payload.myideApiExposed, true, "Renderer did not observe window.myideApi.");
    assert.equal(payload.projectLoaded, true, "Renderer did not load project_001.");
    assert.equal(payload.objectCreated, true, "Renderer did not create the new placeholder object.");
    assert.equal(payload.objectSelected, true, "Renderer did not keep the created placeholder selected.");
    assert.equal(payload.layerReassigned, true, "Renderer did not apply the layer reassignment.");
    assert.equal(payload.saveSucceeded, true, "Renderer did not complete save after the live layer reassignment.");
    assert.equal(payload.reloadSucceeded, true, "Renderer did not complete reload after the live layer reassignment.");
    assert.equal(payload.internalPersistVerified, true, "Renderer did not confirm the reloaded internal layer state.");
    assert.equal(payload.replaySyncVerified, true, "Renderer did not confirm replay-facing sync after layer reassignment.");

    const objectId = payload.objectId;
    const sourceLayerId = payload.sourceLayerId;
    const targetLayerId = payload.targetLayerId;
    const expectedCreatedOrder = Array.isArray(payload.createdOrderIds) ? payload.createdOrderIds : [];
    const expectedSourceAfterReassign = Array.isArray(payload.sourceLayerOrderIdsAfterReassign) ? payload.sourceLayerOrderIdsAfterReassign : [];
    const expectedSourceAfterReload = Array.isArray(payload.sourceLayerOrderIdsAfterReload) ? payload.sourceLayerOrderIdsAfterReload : [];
    const expectedReassignedOrder = Array.isArray(payload.reassignedOrderIds) ? payload.reassignedOrderIds : [];
    const expectedReloadedOrder = Array.isArray(payload.reloadedOrderIds) ? payload.reloadedOrderIds : [];
    const expectedReplayOrder = Array.isArray(payload.replayOrderIds) ? payload.replayOrderIds : [];
    const expectedSourceReplayOrder = Array.isArray(payload.sourceReplayOrderIds) ? payload.sourceReplayOrderIds : [];

    assert(objectId, "Renderer did not report the reassigned object id.");
    assert(sourceLayerId, "Renderer did not report the source layer id.");
    assert(targetLayerId, "Renderer did not report the target layer id.");
    assert.notEqual(sourceLayerId, targetLayerId, "Layer reassignment smoke did not change the layer.");
    assert(expectedCreatedOrder.includes(objectId), "Created source-layer order did not include the created object.");
    assert(!expectedSourceAfterReassign.includes(objectId), "Created object still appeared in the source layer after reassignment.");
    assert(!expectedSourceAfterReload.includes(objectId), "Created object still appeared in the source layer after reload.");
    assert(expectedReassignedOrder.includes(objectId), "Target layer order did not include the reassigned object.");
    assert.deepEqual(expectedReloadedOrder, expectedReassignedOrder, "Renderer reload order differed from the saved target-layer order.");
    assert.deepEqual(expectedReplayOrder, expectedReassignedOrder, "Renderer replay order differed from the saved target-layer order.");
    assert(!expectedSourceReplayOrder.includes(objectId), "Replay-facing source layer still contained the reassigned object.");

    const createdIndex = Number(payload.createdOrderIndex);
    const reassignedIndex = Number(payload.reassignedOrderIndex);
    const reloadedIndex = Number(payload.reloadedOrderIndex);
    assert(Number.isInteger(createdIndex) && createdIndex >= 0, "Created order index must be numeric.");
    assert(Number.isInteger(reassignedIndex) && reassignedIndex >= 0, "Reassigned order index must be numeric.");
    assert(Number.isInteger(reloadedIndex) && reloadedIndex >= 0, "Reloaded order index must be numeric.");
    assert.equal(expectedReassignedOrder[reassignedIndex], objectId, "Saved target-layer order did not place the object at the reported reassigned index.");
    assert.equal(reloadedIndex, reassignedIndex, "Reloaded target-layer index did not match the saved index.");

    const sceneDocument = await readJson(path.join(internalRoot, "scene.json"));
    const internalDocument = await readJson(path.join(internalRoot, "objects.json"));
    const replayProject = await readJson(replayProjectPath);
    onDiskSourceSceneOrder = getInternalSceneLayerOrder(sceneDocument, internalDocument, sourceLayerId);
    onDiskTargetSceneOrder = getInternalSceneLayerOrder(sceneDocument, internalDocument, targetLayerId);
    onDiskSourceInternalOrder = getInternalLayerOrder(internalDocument, sourceLayerId);
    onDiskTargetInternalOrder = getInternalLayerOrder(internalDocument, targetLayerId);
    onDiskSourceReplayOrder = getReplayLayerOrder(replayProject, sourceLayerId);
    onDiskTargetReplayOrder = getReplayLayerOrder(replayProject, targetLayerId);
    const internalObject = getInternalObject(internalDocument, objectId);
    const replayNodeInfo = getReplayNodeInfo(replayProject, objectId);
    onDiskInternalLayerId = typeof internalObject?.layerId === "string" ? internalObject.layerId : null;
    onDiskReplayLayerId = replayNodeInfo.layerId;

    assert.equal(onDiskInternalLayerId, targetLayerId, "Editable objects.json did not persist the reassigned layer.");
    assert.equal(onDiskReplayLayerId, targetLayerId, "Replay-facing project.json did not persist the reassigned layer.");
    deepStrictEqual(onDiskSourceSceneOrder, expectedSourceAfterReload, "Editable scene.json did not persist the source-layer removal after reassignment.");
    deepStrictEqual(onDiskTargetSceneOrder, expectedReassignedOrder, "Editable scene.json did not persist the reassigned target-layer order.");
    deepStrictEqual(onDiskSourceInternalOrder, expectedSourceAfterReload, "Editable objects.json did not persist the source-layer removal after reassignment.");
    deepStrictEqual(onDiskTargetInternalOrder, expectedReassignedOrder, "Editable objects.json did not persist the reassigned target-layer order.");
    deepStrictEqual(onDiskSourceReplayOrder, expectedSourceReplayOrder, "Replay-facing project.json did not persist the source-layer removal after reassignment.");
    deepStrictEqual(onDiskTargetReplayOrder, expectedReassignedOrder, "Replay-facing project.json did not persist the reassigned target-layer order.");
    assert.equal(
      result.exitCode,
      0,
      `Electron live layer-reassign smoke exited with code ${result.exitCode} (signal ${result.signal ?? "none"}).\n${outputSummary}`
    );
  } catch (error) {
    writeArtifact({
      status: "fail",
      artifactPath: getArtifactPath(),
      baselineStatus,
      result,
      payload,
      onDiskSourceSceneOrder,
      onDiskTargetSceneOrder,
      onDiskSourceInternalOrder,
      onDiskTargetInternalOrder,
      onDiskSourceReplayOrder,
      onDiskTargetReplayOrder,
      onDiskInternalLayerId,
      onDiskReplayLayerId,
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  } finally {
    for (const item of restorePlan) {
      await restoreFromBackup(item.source, item.backup, item.existed);
    }
    restoredStatus = await captureGitStatus(workspaceRoot);
    await fs.rm(backupRoot, { recursive: true, force: true });
  }

  assert.equal(
    restoredStatus,
    baselineStatus,
    `Repository status diverged after restoring the live layer-reassign smoke.\nBefore:\n${baselineStatus || "<clean>"}\nAfter:\n${restoredStatus || "<clean>"}`
  );

  writeArtifact({
    status: "pass",
    artifactPath: getArtifactPath(),
    baselineStatus,
    restoredStatus,
    result,
    payload,
    onDiskSourceSceneOrder,
    onDiskTargetSceneOrder,
    onDiskSourceInternalOrder,
    onDiskTargetInternalOrder,
    onDiskSourceReplayOrder,
    onDiskTargetReplayOrder,
    onDiskInternalLayerId,
    onDiskReplayLayerId
  });

  console.log("PASS smoke:electron-live-layer-reassign");
  console.log(`Created ${payload?.objectId} and reassigned it from ${payload?.sourceLayerId} to ${payload?.targetLayerId}`);
  console.log(`Replay path: ${payload?.replayPath}`);
  if (result?.screenshotPath) {
    console.log(`Screenshot: ${result.screenshotPath}${result.screenshotCaptured ? "" : ` (not captured: ${result.screenshotError ?? "unknown reason"})`}`);
  }
  console.log(`Artifact: ${getArtifactPath()}`);
  console.log(`Repo status restored: ${restoredStatus || "<clean>"}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`FAIL smoke:electron-live-layer-reassign - ${message}`);
  process.exitCode = 1;
});
