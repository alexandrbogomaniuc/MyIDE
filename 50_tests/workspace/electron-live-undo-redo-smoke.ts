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

interface LiveUndoRedoPayload {
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
  dragStarted?: boolean;
  dragMoved?: boolean;
  dragCompleted?: boolean;
  undoSucceeded?: boolean;
  redoSucceeded?: boolean;
  saveSucceeded?: boolean;
  reloadSucceeded?: boolean;
  internalPersistVerified?: boolean;
  replaySyncVerified?: boolean;
  objectCountBefore?: number | null;
  objectCountAfterCreate?: number | null;
  objectCountAfterReload?: number | null;
  snapEnabled?: boolean | null;
  viewportZoom?: number | null;
  viewportPanX?: number | null;
  viewportPanY?: number | null;
  dragDeltaX?: number | null;
  dragDeltaY?: number | null;
  createdX?: number | null;
  createdY?: number | null;
  draggedX?: number | null;
  draggedY?: number | null;
  undoneX?: number | null;
  undoneY?: number | null;
  redoneX?: number | null;
  redoneY?: number | null;
  reloadedX?: number | null;
  reloadedY?: number | null;
  replayX?: number | null;
  replayY?: number | null;
  undoDepthAfterDrag?: number | null;
  redoDepthAfterDrag?: number | null;
  undoDepthAfterUndo?: number | null;
  redoDepthAfterUndo?: number | null;
  undoDepthAfterRedo?: number | null;
  redoDepthAfterRedo?: number | null;
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
  return process.env.MYIDE_LIVE_UNDO_REDO_ARTIFACT_PATH || "/tmp/myide-electron-live-undo-redo.json";
}

function getScreenshotPath(): string | null {
  const value = process.env.MYIDE_LIVE_UNDO_REDO_SCREENSHOT_PATH ?? "";
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

function runElectronLiveUndoRedoSmoke(workspaceRoot: string): Promise<SmokeRunResult> {
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
        MYIDE_LIVE_UNDO_REDO_SMOKE: "1",
        MYIDE_LIVE_UNDO_REDO_TIMEOUT_MS: process.env.MYIDE_LIVE_UNDO_REDO_TIMEOUT_MS || "45000",
        ...(screenshotPath ? {
          MYIDE_LIVE_UNDO_REDO_SHOW: "1",
          MYIDE_LIVE_UNDO_REDO_KEEP_OPEN: "1"
        } : {})
      },
      stdio: ["ignore", "pipe", "pipe"]
    });

    let output = "";
    let lineBuffer = "";
    let screenshotCaptured = false;
    let screenshotError: string | null = null;
    let screenshotRequested = false;
    const markerPrefix = "MYIDE_LIVE_UNDO_REDO_RESULT:";

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
        let payload: LiveUndoRedoPayload | null = null;
        try {
          payload = JSON.parse(line.slice(markerPrefix.length)) as LiveUndoRedoPayload;
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

function getInternalObjectState(document: unknown, objectId: string): { x: number; y: number } {
  const objects = Array.isArray((document as { objects?: unknown[] })?.objects)
    ? ((document as { objects: Array<Record<string, unknown>> }).objects)
    : [];
  const match = objects.find((entry) => entry?.id === objectId);
  assert(match, `Editable objects.json must contain ${objectId}.`);
  const x = Number(match.x);
  const y = Number(match.y);
  assert(Number.isFinite(x) && Number.isFinite(y), `Editable position for ${objectId} must be numeric.`);
  return { x, y };
}

function getReplayNodePosition(project: unknown, objectId: string): { x: number; y: number } {
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
      if (match) {
        const position = (match.position ?? {}) as Record<string, unknown>;
        const x = Number(position.x);
        const y = Number(position.y);
        assert(Number.isFinite(x) && Number.isFinite(y), `Replay position for ${objectId} must be numeric.`);
        return { x, y };
      }
    }
  }

  assert.fail(`Replay-facing project.json must contain node ${objectId}.`);
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
  const backupRoot = await fs.mkdtemp(path.join(os.tmpdir(), "myide-live-undo-redo-backup-"));

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
  let payload: LiveUndoRedoPayload | null = null;
  let onDiskInternalState: { x: number; y: number } | null = null;
  let onDiskReplayPosition: { x: number; y: number } | null = null;
  let restoredStatus = "";

  try {
    result = await runElectronLiveUndoRedoSmoke(workspaceRoot);
    const outputSummary = summarizeOutput(result.output);
    const lines = result.output
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const mainReadySeen = lines.some((line) => line.includes("MYIDE_LIVE_UNDO_REDO_MAIN_READY"));
    assert(
      mainReadySeen,
      `Main-process live undo-redo marker was not emitted. Exit=${result.exitCode} Signal=${result.signal ?? "none"}\n${outputSummary}`
    );

    const markerPrefix = "MYIDE_LIVE_UNDO_REDO_RESULT:";
    const payloadLine = lines.find((line) => line.startsWith(markerPrefix));
    assert(
      payloadLine,
      `Renderer live undo-redo result marker was not emitted. Exit=${result.exitCode} Signal=${result.signal ?? "none"}\n${outputSummary}`
    );

    payload = JSON.parse(payloadLine.slice(markerPrefix.length)) as LiveUndoRedoPayload;
    assert.equal(payload.status, "pass", `Live undo-redo smoke reported failure: ${payload.error ?? "unknown error"}`);
    assert.equal(payload.preloadExecuted, true, "Preload execution marker was false.");
    assert.equal(payload.myideApiExposed, true, "Renderer did not observe window.myideApi.");
    assert.equal(payload.projectLoaded, true, "Renderer did not load project_001.");
    assert.equal(payload.objectCreated, true, "Renderer did not create the new placeholder object.");
    assert.equal(payload.objectSelected, true, "Renderer did not keep the new placeholder selected.");
    assert.equal(payload.dragStarted, true, "Renderer did not start the live drag interaction.");
    assert.equal(payload.dragMoved, true, "Renderer did not move the new object through the live pointer path.");
    assert.equal(payload.dragCompleted, true, "Renderer did not complete the live drag interaction.");
    assert.equal(payload.undoSucceeded, true, "Renderer did not complete undo through the live shell path.");
    assert.equal(payload.redoSucceeded, true, "Renderer did not complete redo through the live shell path.");
    assert.equal(payload.saveSucceeded, true, "Renderer did not complete save after redo.");
    assert.equal(payload.reloadSucceeded, true, "Renderer did not complete reload after save.");
    assert.equal(payload.internalPersistVerified, true, "Renderer did not confirm internal persistence after reload.");
    assert.equal(payload.replaySyncVerified, true, "Renderer did not confirm replay-facing sync after reload.");

    const objectId = payload.objectId;
    assert(objectId, "Renderer did not report the created object id.");

    const createdX = Number(payload.createdX);
    const createdY = Number(payload.createdY);
    const draggedX = Number(payload.draggedX);
    const draggedY = Number(payload.draggedY);
    const undoneX = Number(payload.undoneX);
    const undoneY = Number(payload.undoneY);
    const redoneX = Number(payload.redoneX);
    const redoneY = Number(payload.redoneY);
    const dragDeltaX = Number(payload.dragDeltaX);
    const dragDeltaY = Number(payload.dragDeltaY);
    assert(Number.isFinite(createdX) && Number.isFinite(createdY), "Created coordinates must be numeric.");
    assert(Number.isFinite(draggedX) && Number.isFinite(draggedY), "Dragged coordinates must be numeric.");
    assert(Number.isFinite(undoneX) && Number.isFinite(undoneY), "Undone coordinates must be numeric.");
    assert(Number.isFinite(redoneX) && Number.isFinite(redoneY), "Redone coordinates must be numeric.");
    assert(Number.isFinite(dragDeltaX) && Number.isFinite(dragDeltaY), "Drag delta must be numeric.");

    assert.equal(undoneX, createdX, "Undo must restore the created x coordinate.");
    assert.equal(undoneY, createdY, "Undo must restore the created y coordinate.");
    assert.equal(redoneX, draggedX, "Redo must restore the dragged x coordinate.");
    assert.equal(redoneY, draggedY, "Redo must restore the dragged y coordinate.");
    assert.equal(draggedX, createdX + dragDeltaX, "Dragged x should match the created x plus the fixed drag delta.");
    assert.equal(draggedY, createdY + dragDeltaY, "Dragged y should match the created y plus the fixed drag delta.");
    assert((payload.undoDepthAfterDrag ?? 0) >= 2, "Undo depth after drag should include create + drag.");
    assert.equal(payload.redoDepthAfterDrag ?? 0, 0, "Redo depth after drag should be empty.");
    assert((payload.redoDepthAfterUndo ?? 0) >= 1, "Redo depth after undo should be populated.");
    assert.equal(payload.redoDepthAfterRedo ?? 0, 0, "Redo depth after redo should be empty again.");

    const internalDocument = await readJson(path.join(internalRoot, "objects.json"));
    const replayProject = await readJson(replayProjectPath);
    onDiskInternalState = getInternalObjectState(internalDocument, objectId);
    onDiskReplayPosition = getReplayNodePosition(replayProject, objectId);
    assert.equal(onDiskInternalState.x, redoneX, "Editable objects.json did not persist the redone x coordinate.");
    assert.equal(onDiskInternalState.y, redoneY, "Editable objects.json did not persist the redone y coordinate.");
    assert.equal(onDiskReplayPosition.x, redoneX, "Replay-facing project.json did not persist the redone x coordinate.");
    assert.equal(onDiskReplayPosition.y, redoneY, "Replay-facing project.json did not persist the redone y coordinate.");
    assert.equal(
      result.exitCode,
      0,
      `Electron live undo-redo smoke exited with code ${result.exitCode} (signal ${result.signal ?? "none"}).\n${outputSummary}`
    );
  } catch (error) {
    writeArtifact({
      status: "fail",
      artifactPath: getArtifactPath(),
      baselineStatus,
      result,
      payload,
      onDiskInternalState,
      onDiskReplayPosition,
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
    `Repository status diverged after restoring the live undo-redo smoke.\nBefore:\n${baselineStatus || "<clean>"}\nAfter:\n${restoredStatus || "<clean>"}`
  );

  writeArtifact({
    status: "pass",
    artifactPath: getArtifactPath(),
    baselineStatus,
    restoredStatus,
    result,
    payload,
    onDiskInternalState,
    onDiskReplayPosition
  });

  console.log("PASS smoke:electron-live-undo-redo");
  console.log(`Created, dragged, undone, and redone object: ${payload?.objectId} (${payload?.createdX}, ${payload?.createdY}) -> (${payload?.draggedX}, ${payload?.draggedY}) -> (${payload?.undoneX}, ${payload?.undoneY}) -> (${payload?.redoneX}, ${payload?.redoneY})`);
  console.log(`Replay path: ${payload?.replayPath}`);
  if (result?.screenshotPath) {
    console.log(`Screenshot: ${result.screenshotPath}${result.screenshotCaptured ? "" : ` (not captured: ${result.screenshotError ?? "unknown reason"})`}`);
  }
  console.log(`Artifact: ${getArtifactPath()}`);
  console.log(`Repo status restored: ${restoredStatus || "<clean>"}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`FAIL smoke:electron-live-undo-redo - ${message}`);
  process.exitCode = 1;
});
