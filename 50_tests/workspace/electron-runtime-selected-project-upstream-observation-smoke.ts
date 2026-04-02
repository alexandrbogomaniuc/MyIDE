import { strict as assert } from "node:assert";
import { existsSync, promises as fs, writeFileSync } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

interface SmokeRunResult {
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  output: string;
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
  return process.env.MYIDE_RUNTIME_SELECTED_PROJECT_UPSTREAM_OBSERVATION_ARTIFACT_PATH || "/tmp/myide-electron-runtime-selected-project-upstream-observation.json";
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

function runElectronSelectedProjectObservationSmoke(
  workspaceRoot: string,
  env: NodeJS.ProcessEnv
): Promise<SmokeRunResult> {
  return new Promise((resolve, reject) => {
    const electronBinary = resolveElectronBinary(workspaceRoot);
    if (!existsSync(electronBinary)) {
      reject(new Error(`Electron binary is missing at ${electronBinary}. Run npm install first.`));
      return;
    }

    const child = spawn(electronBinary, ["."], {
      cwd: workspaceRoot,
      env,
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

async function readOptionalBuffer(filePath: string): Promise<Buffer | null> {
  try {
    return await fs.readFile(filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException | undefined)?.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

async function restoreFile(filePath: string, original: Buffer | null): Promise<void> {
  if (original === null) {
    await fs.rm(filePath, { force: true });
    return;
  }

  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, original);
}

async function cleanupEmptyDirectory(directoryPath: string): Promise<void> {
  try {
    const entries = await fs.readdir(directoryPath);
    if (entries.length === 0) {
      await fs.rmdir(directoryPath);
    }
  } catch {
    // Best-effort cleanup only.
  }
}

async function main(): Promise<void> {
  const workspaceRoot = resolveWorkspaceRoot();
  const projectId = "project_002";
  const runtimeSourceUrl = `https://cdn.bgaming-network.com/runtime/img/selected-project-upstream-observation-smoke.png?ts=${Date.now()}`;
  const requestLogPaths = [
    path.join(workspaceRoot, "40_projects", "project_001", "runtime", "local-mirror", "request-log.latest.json"),
    path.join(workspaceRoot, "40_projects", projectId, "runtime", "local-mirror", "request-log.latest.json")
  ];
  const originalFiles = new Map<string, Buffer | null>();
  const baselineStatus = await captureGitStatus(workspaceRoot);

  for (const filePath of requestLogPaths) {
    originalFiles.set(filePath, await readOptionalBuffer(filePath));
  }

  let result: SmokeRunResult | null = null;
  let payload: Record<string, unknown> | null = null;
  try {
    result = await runElectronSelectedProjectObservationSmoke(workspaceRoot, {
      ...process.env,
      MYIDE_RUNTIME_SELECTED_PROJECT_UPSTREAM_OBSERVATION_SMOKE: "1",
      MYIDE_RUNTIME_SELECTED_PROJECT_UPSTREAM_OBSERVATION_PROJECT_ID: projectId,
      MYIDE_RUNTIME_SELECTED_PROJECT_UPSTREAM_OBSERVATION_SOURCE_URL: runtimeSourceUrl,
      MYIDE_RUNTIME_LOCAL_MIRROR_PORT: process.env.MYIDE_RUNTIME_LOCAL_MIRROR_PORT || "39020"
    });

    const outputSummary = summarizeOutput(result.output);
    const lines = result.output
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    const mainReadySeen = lines.some((line) => line.includes("MYIDE_RUNTIME_SELECTED_PROJECT_UPSTREAM_OBSERVATION_MAIN_READY"));
    assert(
      mainReadySeen,
      `Main-process selected-project upstream observation smoke marker was not emitted. Exit=${result.exitCode} Signal=${result.signal ?? "none"}\n${outputSummary}`
    );

    const markerPrefix = "MYIDE_RUNTIME_SELECTED_PROJECT_UPSTREAM_OBSERVATION_RESULT:";
    const payloadLine = lines.find((line) => line.startsWith(markerPrefix));
    assert(
      payloadLine,
      `Selected-project upstream observation result marker was not emitted. Exit=${result.exitCode} Signal=${result.signal ?? "none"}\n${outputSummary}`
    );

    payload = JSON.parse(payloadLine.slice(markerPrefix.length)) as Record<string, unknown>;
    assert.equal(payload.status, "pass", `Selected-project upstream observation smoke reported failure: ${String(payload.error ?? "unknown error")}`);
    assert.equal(payload.projectId, projectId, "Selected-project upstream observation smoke reported the wrong project id.");
    assert.equal(payload.redirectUrl, null, "Selected-project upstream observation smoke should stay on a non-redirected upstream URL.");
    assert.equal(payload.matchedProjectRequestSource, "upstream-request", "Selected-project upstream observation should stay request-backed and upstream.");
    assert.equal(payload.project001ContainsSeedSource, false, "Selected-project upstream observation polluted project_001 resource tracking.");
    assert.equal(result.exitCode, 0, `Electron selected-project upstream observation smoke exited with code ${result.exitCode} (signal ${result.signal ?? "none"}).\n${outputSummary}`);
  } catch (error) {
    writeArtifact({
      status: "fail",
      artifactPath: getArtifactPath(),
      result,
      payload,
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  } finally {
    for (const filePath of requestLogPaths) {
      await restoreFile(filePath, originalFiles.get(filePath) ?? null);
    }

    await cleanupEmptyDirectory(path.join(workspaceRoot, "40_projects", projectId, "runtime", "local-mirror"));
    await cleanupEmptyDirectory(path.join(workspaceRoot, "40_projects", "project_001", "runtime", "local-mirror"));

    const restoredStatus = await captureGitStatus(workspaceRoot);
    assert.equal(restoredStatus, baselineStatus, "Selected-project upstream observation smoke did not restore the repo status.");
  }

  writeArtifact({
    status: "pass",
    artifactPath: getArtifactPath(),
    result,
    payload
  });

  console.log("PASS smoke:electron-runtime-selected-project-upstream-observation");
  console.log(`Project: ${projectId}`);
  console.log(`Runtime source: ${runtimeSourceUrl}`);
  console.log(`Artifact: ${getArtifactPath()}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  if (!existsSync(getArtifactPath())) {
    writeArtifact({
      status: "fail",
      artifactPath: getArtifactPath(),
      error: message
    });
  }
  console.error(`FAIL smoke:electron-runtime-selected-project-upstream-observation - ${message}`);
  process.exitCode = 1;
});
