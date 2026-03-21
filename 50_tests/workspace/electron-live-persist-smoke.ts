import { strict as assert } from "node:assert";
import { existsSync, promises as fs, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

interface SmokeRunResult {
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  output: string;
}

interface LivePersistPayload {
  status?: string;
  error?: string;
  startedAt?: string;
  projectId?: string;
  objectId?: string;
  field?: string;
  originalValue?: number | null;
  editedValue?: number | null;
  reloadedValue?: number | null;
  replayValue?: number | null;
  syncStatus?: string | null;
  replayPath?: string | null;
  previewStatus?: string | null;
  preloadExecuted?: boolean;
  myideApiExposed?: boolean;
  projectLoaded?: boolean;
  objectSelected?: boolean;
  editApplied?: boolean;
  saveSucceeded?: boolean;
  reloadSucceeded?: boolean;
  internalPersistVerified?: boolean;
  replaySyncVerified?: boolean;
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
  return process.env.MYIDE_LIVE_PERSIST_ARTIFACT_PATH || "/tmp/myide-electron-live-persist.json";
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

async function captureGitStatus(workspaceRoot: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn("git", ["-C", workspaceRoot, "status", "--short"], {
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
      if (exitCode !== 0) {
        reject(new Error(`git status --short failed with code ${exitCode}: ${stderr.trim()}`));
        return;
      }

      const normalized = stdout
        .split(/\r?\n/)
        .map((line) => line.trimEnd())
        .filter((line) => line.length > 0)
        .sort()
        .join("\n");
      resolve(normalized);
    });
  });
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

function runElectronLivePersistSmoke(workspaceRoot: string): Promise<SmokeRunResult> {
  return new Promise((resolve, reject) => {
    const electronBinary = resolveElectronBinary(workspaceRoot);
    if (!existsSync(electronBinary)) {
      reject(new Error(`Electron binary is missing at ${electronBinary}. Run npm install first.`));
      return;
    }

    const child = spawn(electronBinary, ["."], {
      cwd: workspaceRoot,
      env: {
        ...process.env,
        MYIDE_LIVE_PERSIST_SMOKE: "1",
        MYIDE_LIVE_PERSIST_TIMEOUT_MS: process.env.MYIDE_LIVE_PERSIST_TIMEOUT_MS || "45000"
      },
      stdio: ["ignore", "pipe", "pipe"]
    });

    let output = "";
    const capture = (chunk: unknown) => {
      output += String(chunk);
    };

    child.stdout.on("data", capture);
    child.stderr.on("data", capture);
    child.on("error", reject);
    child.on("close", (exitCode, signal) => resolve({ exitCode, signal, output }));
  });
}

async function readJson(filePath: string): Promise<unknown> {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw) as unknown;
}

function getInternalObjectField(document: unknown, objectId: string, field: string): number {
  const objects = Array.isArray((document as { objects?: unknown[] })?.objects)
    ? ((document as { objects: Array<Record<string, unknown>> }).objects)
    : [];
  const match = objects.find((entry) => entry?.id === objectId);
  assert(match, `Editable objects.json must contain ${objectId}.`);
  const value = Number(match[field]);
  assert(Number.isFinite(value), `Editable field ${field} for ${objectId} must be numeric.`);
  return value;
}

function getReplayNodeField(project: unknown, objectId: string, field: string): number {
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
        const value = Number(position[field]);
        assert(Number.isFinite(value), `Replay field ${field} for ${objectId} must be numeric.`);
        return value;
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
  const logsRoot = path.join(projectRoot, "logs");
  const snapshotRoot = path.join(logsRoot, "editor-snapshots");
  const historyPath = path.join(logsRoot, "editor-save-history.jsonl");
  const backupRoot = await fs.mkdtemp(path.join(os.tmpdir(), "myide-live-persist-backup-"));

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
  let payload: LivePersistPayload | null = null;
  let onDiskInternalValue: number | null = null;
  let onDiskReplayValue: number | null = null;
  let restoredStatus = "";

  try {
    result = await runElectronLivePersistSmoke(workspaceRoot);
    const outputSummary = summarizeOutput(result.output);
    const lines = result.output
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const mainReadySeen = lines.some((line) => line.includes("MYIDE_LIVE_PERSIST_MAIN_READY"));
    assert(
      mainReadySeen,
      `Main-process live-persist marker was not emitted. Exit=${result.exitCode} Signal=${result.signal ?? "none"}\n${outputSummary}`
    );

    const markerPrefix = "MYIDE_LIVE_PERSIST_RESULT:";
    const payloadLine = lines.find((line) => line.startsWith(markerPrefix));
    assert(
      payloadLine,
      `Renderer live-persist result marker was not emitted. Exit=${result.exitCode} Signal=${result.signal ?? "none"}\n${outputSummary}`
    );

    payload = JSON.parse(payloadLine.slice(markerPrefix.length)) as LivePersistPayload;
    assert.equal(payload.status, "pass", `Live persist smoke reported failure: ${payload.error ?? "unknown error"}`);
    assert.equal(payload.preloadExecuted, true, "Preload execution marker was false.");
    assert.equal(payload.myideApiExposed, true, "Renderer did not observe window.myideApi.");
    assert.equal(payload.projectLoaded, true, "Renderer did not load project_001.");
    assert.equal(payload.objectSelected, true, "Renderer did not select the editable object.");
    assert.equal(payload.editApplied, true, "Renderer did not apply the inspector edit.");
    assert.equal(payload.saveSucceeded, true, "Renderer did not complete save over the live shell path.");
    assert.equal(payload.reloadSucceeded, true, "Renderer did not complete reload after save.");
    assert.equal(payload.internalPersistVerified, true, "Renderer did not confirm the reloaded internal value.");
    assert.equal(payload.replaySyncVerified, true, "Renderer did not confirm replay-facing sync.");

    const objectId = payload.objectId ?? "node.title";
    const field = payload.field ?? "x";
    const expectedValue = Number(payload.editedValue);
    assert(Number.isFinite(expectedValue), `Edited value from renderer payload must be numeric, received ${payload.editedValue}.`);

    const internalDocument = await readJson(path.join(internalRoot, "objects.json"));
    const replayProject = await readJson(replayProjectPath);
    onDiskInternalValue = getInternalObjectField(internalDocument, objectId, field);
    onDiskReplayValue = getReplayNodeField(replayProject, objectId, field);
    assert.equal(onDiskInternalValue, expectedValue, "Editable objects.json did not persist the renderer edit.");
    assert.equal(onDiskReplayValue, expectedValue, "Replay-facing project.json did not persist the renderer edit.");
    assert.equal(
      result.exitCode,
      0,
      `Electron live-persist smoke exited with code ${result.exitCode} (signal ${result.signal ?? "none"}).\n${outputSummary}`
    );
  } catch (error) {
    writeArtifact({
      status: "fail",
      artifactPath: getArtifactPath(),
      baselineStatus,
      result,
      payload,
      onDiskInternalValue,
      onDiskReplayValue,
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
    `Repository status diverged after restoring the live-persist smoke.\nBefore:\n${baselineStatus || "<clean>"}\nAfter:\n${restoredStatus || "<clean>"}`
  );

  writeArtifact({
    status: "pass",
    artifactPath: getArtifactPath(),
    baselineStatus,
    restoredStatus,
    result,
    payload,
    onDiskInternalValue,
    onDiskReplayValue
  });

  console.log("PASS smoke:electron-live-persist");
  console.log(`Edited object: ${payload?.objectId} ${payload?.field} ${payload?.originalValue} -> ${payload?.editedValue}`);
  console.log(`Replay path: ${payload?.replayPath}`);
  console.log(`Artifact: ${getArtifactPath()}`);
  console.log(`Repo status restored: ${restoredStatus || "<clean>"}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`FAIL smoke:electron-live-persist - ${message}`);
  process.exitCode = 1;
});
