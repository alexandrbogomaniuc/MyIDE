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

interface RuntimeSmokePayload {
  status?: string;
  error?: string;
  projectId?: string;
  runtimeModeSelected?: boolean;
  launchSucceeded?: boolean;
  reloadSucceeded?: boolean;
  pickSucceeded?: boolean;
  runtimeCurrentUrl?: string | null;
  runtimeResolvedHost?: string | null;
  runtimePageTitle?: string | null;
  pixiDetected?: boolean;
  pixiVersion?: string | null;
  candidateRuntimeApps?: string[];
  pauseSupported?: boolean;
  resumeSupported?: boolean;
  stepSupported?: boolean;
  pauseBlocked?: string | null;
  stepBlocked?: string | null;
  pickedTargetTag?: string | null;
  pickedCanvasDetected?: boolean;
  pickedDisplayHitCount?: number;
  pickedDisplayObjectName?: string | null;
  pickedTextureCacheId?: string | null;
  supportingEvidenceIds?: string[];
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
  return process.env.MYIDE_LIVE_RUNTIME_ARTIFACT_PATH || "/tmp/myide-electron-runtime-mode.json";
}

function writeArtifact(payload: unknown): void {
  writeFileSync(getArtifactPath(), `${JSON.stringify(payload, null, 2)}\n`);
}

function summarizeOutput(output: string): string {
  const trimmed = output.trim();
  if (trimmed.length === 0) {
    return "<no stdout/stderr captured>";
  }

  return trimmed.split(/\r?\n/).slice(-60).join("\n");
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

function runElectronLiveRuntimeSmoke(workspaceRoot: string): Promise<SmokeRunResult> {
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
        MYIDE_LIVE_RUNTIME_SMOKE: "1",
        MYIDE_LIVE_RUNTIME_TIMEOUT_MS: process.env.MYIDE_LIVE_RUNTIME_TIMEOUT_MS ?? "90000"
      },
      stdio: ["ignore", "pipe", "pipe"]
    });

    let output = "";
    let lineBuffer = "";
    const markerPrefix = "MYIDE_LIVE_RUNTIME_RESULT:";

    const handleChunk = (chunk: unknown) => {
      const text = String(chunk);
      output += text;
      lineBuffer += text;

      while (lineBuffer.includes("\n")) {
        const newlineIndex = lineBuffer.indexOf("\n");
        const line = lineBuffer.slice(0, newlineIndex).trim();
        lineBuffer = lineBuffer.slice(newlineIndex + 1);

        if (!line.startsWith(markerPrefix)) {
          continue;
        }

        if (!child.killed && child.exitCode === null) {
          child.kill("SIGTERM");
        }
      }
    };

    child.stdout.on("data", handleChunk);
    child.stderr.on("data", handleChunk);
    child.on("error", reject);
    child.on("close", (exitCode, signal) => {
      resolve({
        exitCode,
        signal,
        output
      });
    });
  });
}

async function main(): Promise<void> {
  const workspaceRoot = resolveWorkspaceRoot();
  const statusBefore = await captureGitStatus(workspaceRoot);
  const artifactPath = getArtifactPath();
  const artifactDirectory = path.dirname(artifactPath);
  await fs.mkdir(artifactDirectory, { recursive: true });
  await fs.rm(artifactPath, { force: true });

  const run = await runElectronLiveRuntimeSmoke(workspaceRoot);
  const output = summarizeOutput(run.output);
  const lines = run.output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const mainReadySeen = lines.some((line) => line.includes("MYIDE_LIVE_RUNTIME_MAIN_READY"));
  assert(
    mainReadySeen,
    `Main-process runtime smoke marker was not emitted. Exit=${run.exitCode} Signal=${run.signal ?? "none"}\n${output}`
  );

  const markerPrefix = "MYIDE_LIVE_RUNTIME_RESULT:";
  const payloadLine = lines.find((line) => line.startsWith(markerPrefix));
  assert(
    payloadLine,
    `Renderer runtime smoke result marker was not emitted. Exit=${run.exitCode} Signal=${run.signal ?? "none"}\n${output}`
  );

  const payload = JSON.parse(payloadLine.slice(markerPrefix.length)) as RuntimeSmokePayload;
  writeArtifact(payload);

  assert.equal(payload.status, "pass", `Runtime smoke payload reported failure: ${payload.error ?? "<no error>"}\n${output}`);
  assert.equal(payload.projectId, "project_001", "Runtime smoke did not load project_001.");
  assert.equal(payload.runtimeModeSelected, true, "Runtime Mode was not selected.");
  assert.equal(payload.launchSucceeded, true, "Runtime launch did not succeed.");
  assert.equal(payload.pickSucceeded, true, "Runtime pick/inspect did not succeed.");
  assert.equal(payload.reloadSucceeded, true, "Runtime reload did not succeed.");
  assert.ok(typeof payload.runtimeCurrentUrl === "string" && payload.runtimeCurrentUrl.length > 0, "Runtime current URL is missing.");
  assert.ok(Array.isArray(payload.supportingEvidenceIds) && payload.supportingEvidenceIds.length > 0, "Supporting runtime evidence ids are missing.");

  const statusAfter = await captureGitStatus(workspaceRoot);
  assert.equal(statusAfter, statusBefore, `Runtime smoke changed git status.\nBefore:\n${statusBefore || "<clean>"}\nAfter:\n${statusAfter || "<clean>"}`);

  console.log("PASS smoke:electron-runtime-mode");
  console.log(`Artifact: ${artifactPath}`);
  if (payload.runtimeCurrentUrl) {
    console.log(`Runtime URL: ${payload.runtimeCurrentUrl}`);
  }
  if (payload.pickedTargetTag) {
    console.log(`Picked target: ${payload.pickedTargetTag}`);
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  writeArtifact({
    status: "fail",
    error: message
  });
  console.error(`FAIL smoke:electron-runtime-mode - ${message}`);
  process.exitCode = 1;
});
