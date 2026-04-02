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

interface RelaunchPayload {
  status?: string;
  error?: string;
  startedAt?: string;
  projectId?: string;
  preloadExecuted?: boolean;
  myideApiExposed?: boolean;
  projectLoaded?: boolean;
  taskId?: string | null;
  pageName?: string | null;
  pageRuntimeProofLoaded?: boolean;
  pageRuntimeProofEntryCount?: number | null;
  pageRuntimeProofSourceUrl?: string | null;
  runtimeWorkbenchHasPageProofEntry?: boolean;
  taskRuntimeEntryKind?: string | null;
  taskRuntimeEntrySourceUrl?: string | null;
  taskRuntimeOpenUsesPersistedPageProof?: boolean;
  runtimeDebugHostStatePresent?: boolean;
  previewStatus?: string | null;
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
  return process.env.MYIDE_LIVE_RUNTIME_PAGE_PROOF_RELAUNCH_ARTIFACT_PATH || "/tmp/myide-electron-runtime-page-proof-relaunch.json";
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

function runCommand(
  command: string,
  args: string[],
  options: { cwd?: string; env?: NodeJS.ProcessEnv } = {}
): Promise<{ exitCode: number | null; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env ?? process.env,
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

async function terminateChild(child: ReturnType<typeof spawn>): Promise<void> {
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

function runElectronRuntimePageProofRelaunchSmoke(workspaceRoot: string): Promise<SmokeRunResult> {
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
        MYIDE_LIVE_RUNTIME_PAGE_PROOF_RELAUNCH_SMOKE: "1",
        MYIDE_LIVE_RUNTIME_PAGE_PROOF_RELAUNCH_TIMEOUT_MS: process.env.MYIDE_LIVE_RUNTIME_PAGE_PROOF_RELAUNCH_TIMEOUT_MS || "90000"
      },
      stdio: ["ignore", "pipe", "pipe"]
    });

    let output = "";
    let lineBuffer = "";
    const markerPrefix = "MYIDE_LIVE_RUNTIME_PAGE_PROOF_RELAUNCH_RESULT:";

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

        void terminateChild(child);
      }
    };

    child.stdout.on("data", handleChunk);
    child.stderr.on("data", handleChunk);
    child.on("error", reject);
    child.on("close", (exitCode, signal) => resolve({
      exitCode,
      signal,
      output
    }));
  });
}

async function readOptionalUtf8(filePath: string): Promise<string | null> {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException | undefined)?.code === "ENOENT") {
      return null;
    }

    throw error;
  }
}

async function restoreOptionalUtf8(filePath: string, originalRaw: string | null): Promise<void> {
  if (originalRaw === null) {
    await fs.rm(filePath, { force: true });
    return;
  }

  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, originalRaw, "utf8");
}

async function main(): Promise<void> {
  const workspaceRoot = resolveWorkspaceRoot();
  const projectId = "project_001";
  const runtimeProofPath = path.join(
    workspaceRoot,
    "40_projects",
    projectId,
    "runtime",
    "page-runtime-proofs.latest.json"
  );
  const backupRoot = await fs.mkdtemp(path.join(os.tmpdir(), "myide-runtime-page-proof-relaunch-backup-"));
  const phaseOneArtifactPath = path.join(backupRoot, "phase-one-donor-import.json");
  const baselineStatus = await captureGitStatus(workspaceRoot);
  const originalRuntimeProofRaw = await readOptionalUtf8(runtimeProofPath);

  let phaseOneResult: { exitCode: number | null; stdout: string; stderr: string } | null = null;
  let phaseOneArtifact: unknown = null;
  let phaseTwoResult: SmokeRunResult | null = null;
  let phaseTwoPayload: RelaunchPayload | null = null;
  let restoredStatus = "";

  try {
    phaseOneResult = await runCommand(
      process.execPath,
      [path.join(workspaceRoot, "dist", "50_tests", "workspace", "electron-donor-import-smoke.js")],
      {
        cwd: workspaceRoot,
        env: {
          ...process.env,
          MYIDE_LIVE_DONOR_IMPORT_ARTIFACT_PATH: phaseOneArtifactPath
        }
      }
    );

    assert.equal(
      phaseOneResult.exitCode,
      0,
      `Phase 1 donor-import proof did not pass.\n${summarizeOutput(`${phaseOneResult.stdout}\n${phaseOneResult.stderr}`)}`
    );

    const phaseOneArtifactRaw = await readOptionalUtf8(phaseOneArtifactPath);
    assert(phaseOneArtifactRaw, "Phase 1 donor-import proof did not write its artifact.");
    phaseOneArtifact = JSON.parse(phaseOneArtifactRaw);

    const runtimeProofRaw = await readOptionalUtf8(runtimeProofPath);
    assert(runtimeProofRaw, "Phase 1 donor-import proof did not persist a runtime page proof snapshot.");

    phaseTwoResult = await runElectronRuntimePageProofRelaunchSmoke(workspaceRoot);
    const outputSummary = summarizeOutput(phaseTwoResult.output);
    const lines = phaseTwoResult.output
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const mainReadySeen = lines.some((line) => line.includes("MYIDE_LIVE_RUNTIME_PAGE_PROOF_RELAUNCH_MAIN_READY"));
    assert(
      mainReadySeen,
      `Main-process runtime page proof relaunch smoke marker was not emitted. Exit=${phaseTwoResult.exitCode} Signal=${phaseTwoResult.signal ?? "none"}\n${outputSummary}`
    );

    const markerPrefix = "MYIDE_LIVE_RUNTIME_PAGE_PROOF_RELAUNCH_RESULT:";
    const payloadLine = lines.find((line) => line.startsWith(markerPrefix));
    assert(
      payloadLine,
      `Renderer runtime page proof relaunch marker was not emitted. Exit=${phaseTwoResult.exitCode} Signal=${phaseTwoResult.signal ?? "none"}\n${outputSummary}`
    );

    phaseTwoPayload = JSON.parse(payloadLine.slice(markerPrefix.length)) as RelaunchPayload;
    assert.equal(phaseTwoPayload.status, "pass", `Runtime page proof relaunch smoke reported failure: ${phaseTwoPayload.error ?? "unknown error"}`);
    assert.equal(phaseTwoPayload.preloadExecuted, true, "Relaunch smoke preload execution marker was false.");
    assert.equal(phaseTwoPayload.myideApiExposed, true, "Relaunch smoke did not observe window.myideApi.");
    assert.equal(phaseTwoPayload.projectLoaded, true, "Relaunch smoke did not load project_001.");
    assert.equal(phaseTwoPayload.pageRuntimeProofLoaded, true, "Relaunch smoke did not load a persisted page runtime proof.");
    assert.equal(phaseTwoPayload.runtimeWorkbenchHasPageProofEntry, true, "Relaunch smoke did not surface the persisted page proof in the runtime workbench.");
    assert.equal(phaseTwoPayload.taskRuntimeEntryKind, "page-proof", "Relaunch smoke did not classify the task runtime entry as a page proof.");
    assert.ok(
      typeof phaseTwoPayload.pageRuntimeProofSourceUrl === "string"
        && /big_win|big-win/i.test(phaseTwoPayload.pageRuntimeProofSourceUrl),
      `Relaunch smoke did not keep a big_win-family source on the persisted page proof. Saw ${phaseTwoPayload.pageRuntimeProofSourceUrl ?? "<missing>"}.`
    );
    assert.equal(
      phaseTwoPayload.taskRuntimeEntrySourceUrl,
      phaseTwoPayload.pageRuntimeProofSourceUrl,
      "Relaunch smoke task runtime entry did not reuse the persisted page-proof source."
    );
    assert.equal(
      phaseTwoPayload.taskRuntimeOpenUsesPersistedPageProof,
      true,
      "Relaunch smoke did not make task-level Open Runtime reuse the persisted page runtime proof after a fresh launch."
    );
    assert.equal(
      phaseTwoPayload.runtimeDebugHostStatePresent,
      false,
      "Relaunch smoke unexpectedly surfaced Runtime Debug Host state during the direct persisted-proof reopen path."
    );
    assert.equal(
      phaseTwoResult.exitCode,
      0,
      `Electron runtime page proof relaunch smoke exited with code ${phaseTwoResult.exitCode} (signal ${phaseTwoResult.signal ?? "none"}).\n${outputSummary}`
    );
  } catch (error) {
    writeArtifact({
      status: "fail",
      artifactPath: getArtifactPath(),
      baselineStatus,
      phaseOneResult,
      phaseOneArtifact,
      phaseTwoResult,
      phaseTwoPayload,
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  } finally {
    await restoreOptionalUtf8(runtimeProofPath, originalRuntimeProofRaw);
    restoredStatus = await captureGitStatus(workspaceRoot);
    await fs.rm(backupRoot, { recursive: true, force: true });
  }

  assert.equal(
    restoredStatus,
    baselineStatus,
    `Repository status diverged after restoring the runtime page proof relaunch smoke.\nBefore:\n${baselineStatus || "<clean>"}\nAfter:\n${restoredStatus || "<clean>"}`
  );

  writeArtifact({
    status: "pass",
    artifactPath: getArtifactPath(),
    baselineStatus,
    restoredStatus,
    phaseOneResult,
    phaseOneArtifact,
    phaseTwoResult,
    phaseTwoPayload
  });

  console.log("PASS smoke:electron-runtime-page-proof-relaunch");
  console.log(`Task: ${phaseTwoPayload?.taskId ?? "<missing>"}`);
  console.log(`Page: ${phaseTwoPayload?.pageName ?? "<missing>"}`);
  console.log(`Persisted source: ${phaseTwoPayload?.pageRuntimeProofSourceUrl ?? "<missing>"}`);
  console.log(`Artifact: ${getArtifactPath()}`);
  console.log(`Repo status restored: ${restoredStatus || "<clean>"}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`FAIL smoke:electron-runtime-page-proof-relaunch - ${message}`);
  process.exitCode = 1;
});
