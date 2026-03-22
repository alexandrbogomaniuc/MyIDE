import { strict as assert } from "node:assert";
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

interface LiveResizePayload {
  status?: string;
  error?: string;
  startedAt?: string;
  projectId?: string;
  presetKey?: string;
  presetLabel?: string;
  objectId?: string | null;
  preloadExecuted?: boolean;
  myideApiExposed?: boolean;
  projectLoaded?: boolean;
  objectCreated?: boolean;
  objectSelected?: boolean;
  resized?: boolean;
  saveSucceeded?: boolean;
  reloadSucceeded?: boolean;
  internalPersistVerified?: boolean;
  replaySyncVerified?: boolean;
  objectCountBefore?: number | null;
  objectCountAfterCreate?: number | null;
  objectCountAfterReload?: number | null;
  createdLayerId?: string | null;
  reloadedLayerId?: string | null;
  replayLayerId?: string | null;
  createdX?: number | null;
  createdY?: number | null;
  reloadedX?: number | null;
  reloadedY?: number | null;
  replayX?: number | null;
  replayY?: number | null;
  createdWidth?: number | null;
  createdHeight?: number | null;
  resizedWidth?: number | null;
  resizedHeight?: number | null;
  reloadedWidth?: number | null;
  reloadedHeight?: number | null;
  replayWidth?: number | null;
  replayHeight?: number | null;
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
  return process.env.MYIDE_LIVE_RESIZE_ARTIFACT_PATH || "/tmp/myide-electron-live-resize.json";
}

function getScreenshotPath(): string | null {
  const value = process.env.MYIDE_LIVE_RESIZE_SCREENSHOT_PATH ?? "";
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

function runElectronLiveResizeSmoke(workspaceRoot: string): Promise<SmokeRunResult> {
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
        MYIDE_LIVE_RESIZE_SMOKE: "1",
        MYIDE_LIVE_RESIZE_TIMEOUT_MS: process.env.MYIDE_LIVE_RESIZE_TIMEOUT_MS || "45000",
        ...(screenshotPath ? {
          MYIDE_LIVE_RESIZE_SHOW: "1",
          MYIDE_LIVE_RESIZE_KEEP_OPEN: "1"
        } : {})
      },
      stdio: ["ignore", "pipe", "pipe"]
    });

    let output = "";
    let lineBuffer = "";
    let screenshotCaptured = false;
    let screenshotError: string | null = null;
    let screenshotRequested = false;
    const markerPrefix = "MYIDE_LIVE_RESIZE_RESULT:";

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
        let payload: LiveResizePayload | null = null;
        try {
          payload = JSON.parse(line.slice(markerPrefix.length)) as LiveResizePayload;
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

function getObjectIdsFromScene(sceneDocument: unknown): string[] {
  const objectIds = Array.isArray((sceneDocument as { objectIds?: unknown[] })?.objectIds)
    ? ((sceneDocument as { objectIds: unknown[] }).objectIds)
    : [];
  return objectIds.filter((objectId): objectId is string => typeof objectId === "string");
}

function countMatches(items: readonly string[], value: string): number {
  return items.filter((item) => item === value).length;
}

function getInternalObjectInfo(document: unknown, objectId: string) {
  const objects = Array.isArray((document as { objects?: unknown[] })?.objects)
    ? ((document as { objects: Array<Record<string, unknown>> }).objects)
    : [];
  const match = objects.find((entry) => entry?.id === objectId);
  assert(match, `Editable objects.json must contain ${objectId}.`);
  return {
    layerId: typeof match.layerId === "string" ? match.layerId : null,
    x: Number(match.x),
    y: Number(match.y),
    width: Number(match.width),
    height: Number(match.height),
    scaleX: Number(match.scaleX),
    scaleY: Number(match.scaleY),
    visible: match.visible === true,
    placeholderRef: typeof match.placeholderRef === "string" ? match.placeholderRef : null
  };
}

function getReplayNodeInfo(project: unknown, objectId: string) {
  const scenes = Array.isArray((project as { scenes?: unknown[] })?.scenes)
    ? ((project as { scenes: Array<Record<string, unknown>> }).scenes)
    : [];

  for (const scene of scenes) {
    const layers = Array.isArray(scene?.layers)
      ? (scene.layers as Array<Record<string, unknown>>)
      : [];
    for (const layer of layers) {
      const nodes = Array.isArray(layer?.nodes)
        ? (layer.nodes as Array<Record<string, unknown>>)
        : [];
      const match = nodes.find((node) => node?.nodeId === objectId);
      if (!match) {
        continue;
      }

      const position = (match.position ?? {}) as Record<string, unknown>;
      return {
        layerId: typeof layer.layerId === "string" ? layer.layerId : null,
        x: Number(position.x),
        y: Number(position.y),
        width: Number(position.width),
        height: Number(position.height),
        scaleX: Number(position.scaleX),
        scaleY: Number(position.scaleY),
        visible: match.visible === true,
        assetRef: typeof match.assetRef === "string" ? match.assetRef : null
      };
    }
  }

  assert.fail(`Replay-facing project.json must contain node ${objectId}.`);
}

async function main(): Promise<void> {
  const workspaceRoot = resolveWorkspaceRoot();
  const projectRoot = path.join(workspaceRoot, "40_projects", "project_001");
  const internalRoot = path.join(projectRoot, "internal");
  const replayProjectPath = path.join(projectRoot, "project.json");
  const logsRoot = path.join(projectRoot, "logs");
  const snapshotRoot = path.join(logsRoot, "editor-snapshots");
  const historyPath = path.join(logsRoot, "editor-save-history.jsonl");
  const backupRoot = await fs.mkdtemp(path.join(os.tmpdir(), "myide-live-resize-backup-"));

  const restorePlan = [
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
  let payload: LiveResizePayload | null = null;
  let onDiskSceneObjectIds: string[] | null = null;
  let onDiskInternalObject: ReturnType<typeof getInternalObjectInfo> | null = null;
  let onDiskReplayObject: ReturnType<typeof getReplayNodeInfo> | null = null;
  let restoredStatus = "";

  try {
    result = await runElectronLiveResizeSmoke(workspaceRoot);
    const outputSummary = summarizeOutput(result.output);
    const lines = result.output
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const mainReadySeen = lines.some((line) => line.includes("MYIDE_LIVE_RESIZE_MAIN_READY"));
    assert(
      mainReadySeen,
      `Main-process live resize marker was not emitted. Exit=${result.exitCode} Signal=${result.signal ?? "none"}\n${outputSummary}`
    );

    const markerPrefix = "MYIDE_LIVE_RESIZE_RESULT:";
    const payloadLine = lines.find((line) => line.startsWith(markerPrefix));
    assert(
      payloadLine,
      `Renderer live resize result marker was not emitted. Exit=${result.exitCode} Signal=${result.signal ?? "none"}\n${outputSummary}`
    );

    payload = JSON.parse(payloadLine.slice(markerPrefix.length)) as LiveResizePayload;
    assert.equal(payload.status, "pass", `Live resize smoke reported failure: ${payload.error ?? "unknown error"}`);
    assert.equal(payload.preloadExecuted, true, "Preload execution marker was false.");
    assert.equal(payload.myideApiExposed, true, "Renderer did not observe window.myideApi.");
    assert.equal(payload.projectLoaded, true, "Renderer did not load project_001.");
    assert.equal(payload.objectCreated, true, "Renderer did not create the new placeholder object.");
    assert.equal(payload.objectSelected, true, "Renderer did not keep the new placeholder selected.");
    assert.equal(payload.resized, true, "Renderer did not apply the inspector resize.");
    assert.equal(payload.saveSucceeded, true, "Renderer did not complete save after the live resize.");
    assert.equal(payload.reloadSucceeded, true, "Renderer did not complete reload after the live resize.");
    assert.equal(payload.internalPersistVerified, true, "Renderer did not confirm the reloaded internal resize state.");
    assert.equal(payload.replaySyncVerified, true, "Renderer did not confirm replay-facing sync after the live resize.");

    const objectId = payload.objectId;
    assert(objectId, "Renderer did not report the created object id.");
    const expectedLayerId = payload.createdLayerId;
    const expectedX = Number(payload.createdX);
    const expectedY = Number(payload.createdY);
    const expectedWidth = Number(payload.resizedWidth);
    const expectedHeight = Number(payload.resizedHeight);
    assert(expectedLayerId, "Renderer did not report the created layer id.");
    assert(Number.isFinite(expectedX) && Number.isFinite(expectedY), "Renderer create coordinates must be numeric.");
    assert(Number.isFinite(expectedWidth) && Number.isFinite(expectedHeight), "Renderer resized width/height must be numeric.");

    const sceneDocument = await readJson(path.join(internalRoot, "scene.json"));
    const internalDocument = await readJson(path.join(internalRoot, "objects.json"));
    const replayProject = await readJson(replayProjectPath);
    onDiskSceneObjectIds = getObjectIdsFromScene(sceneDocument);
    onDiskInternalObject = getInternalObjectInfo(internalDocument, objectId);
    onDiskReplayObject = getReplayNodeInfo(replayProject, objectId);

    assert.equal(countMatches(onDiskSceneObjectIds, objectId), 1, "Editable scene.json must contain the created object exactly once.");
    assert.equal(onDiskInternalObject.layerId, expectedLayerId, "Editable objects.json did not persist the created object layer.");
    assert.equal(onDiskInternalObject.x, expectedX, "Editable objects.json did not persist the created object's x coordinate.");
    assert.equal(onDiskInternalObject.y, expectedY, "Editable objects.json did not persist the created object's y coordinate.");
    assert.equal(onDiskInternalObject.width, expectedWidth, "Editable objects.json did not persist the created object's resized width.");
    assert.equal(onDiskInternalObject.height, expectedHeight, "Editable objects.json did not persist the created object's resized height.");
    assert.equal(onDiskReplayObject.layerId, expectedLayerId, "Replay-facing project.json did not persist the created object layer.");
    assert.equal(onDiskReplayObject.x, expectedX, "Replay-facing project.json did not persist the created object's x coordinate.");
    assert.equal(onDiskReplayObject.y, expectedY, "Replay-facing project.json did not persist the created object's y coordinate.");
    assert.equal(onDiskReplayObject.width, expectedWidth, "Replay-facing project.json did not persist the created object's resized width.");
    assert.equal(onDiskReplayObject.height, expectedHeight, "Replay-facing project.json did not persist the created object's resized height.");
    assert.equal(
      result.exitCode,
      0,
      `Electron live resize smoke exited with code ${result.exitCode} (signal ${result.signal ?? "none"}).\n${outputSummary}`
    );
  } catch (error) {
    writeArtifact({
      status: "fail",
      artifactPath: getArtifactPath(),
      baselineStatus,
      result,
      payload,
      onDiskSceneObjectIds,
      onDiskInternalObject,
      onDiskReplayObject,
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
    `Repository status diverged after restoring the live resize smoke.\nBefore:\n${baselineStatus || "<clean>"}\nAfter:\n${restoredStatus || "<clean>"}`
  );

  writeArtifact({
    status: "pass",
    artifactPath: getArtifactPath(),
    baselineStatus,
    restoredStatus,
    result,
    payload,
    onDiskSceneObjectIds,
    onDiskInternalObject,
    onDiskReplayObject
  });

  console.log("PASS smoke:electron-live-resize");
  console.log(`Created and resized object: ${payload?.objectId} ${payload?.createdWidth}x${payload?.createdHeight} -> ${payload?.resizedWidth}x${payload?.resizedHeight}`);
  console.log(`Replay path: ${payload?.replayPath}`);
  if (result?.screenshotPath) {
    console.log(`Screenshot: ${result.screenshotPath}${result.screenshotCaptured ? "" : ` (not captured: ${result.screenshotError ?? "unknown reason"})`}`);
  }
  console.log(`Artifact: ${getArtifactPath()}`);
  console.log(`Repo status restored: ${restoredStatus || "<clean>"}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`FAIL smoke:electron-live-resize - ${message}`);
  process.exitCode = 1;
});
