import { strict as assert } from "node:assert";
import { existsSync, promises as fs } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

interface SmokeRunResult {
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  output: string;
}

interface RuntimeDebugSmokePayload {
  status?: string;
  error?: string | null;
  pathDecision?: string | null;
  projectId?: string;
  runtimeSourceLabel?: string | null;
  entryUrl?: string | null;
  bridgeSource?: string | null;
  resourceMapCount?: number;
  staticImageEntryCount?: number;
  candidateRuntimeSourceUrl?: string | null;
  candidateRuntimeRelativePath?: string | null;
  candidateRequestSource?: string | null;
  candidateHitCount?: number;
  localMirrorSourcePath?: string | null;
  overrideDonorAssetId?: string | null;
  overrideCreated?: boolean;
  overrideCleared?: boolean;
  overrideHitCountAfterReload?: number;
  overrideBlocked?: string | null;
  allowMissingDonorAsset?: boolean;
}

interface LocalRuntimeMirrorManifest {
  schemaVersion: "0.1.0";
  projectId: string;
  mode: "partial-local-runtime-mirror";
  generatedAtUtc: string;
  publicEntryUrl: string;
  resourceVersion: string | null;
  notes: string[];
  entries: Array<{
    sourceUrl: string;
    kind: string;
    repoRelativePath: string;
    fileType: string;
  }>;
}

interface RuntimeResourceMapSnapshot {
  projectId?: string;
  entryCount?: number;
  entries?: Array<{
    canonicalSourceUrl?: string;
    runtimeRelativePath?: string | null;
  }>;
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

function getArtifactPath(): string {
  return process.env.MYIDE_RUNTIME_SELECTED_PROJECT_DEBUG_ARTIFACT_PATH || "/tmp/myide-electron-runtime-selected-project-debug.json";
}

function summarizeOutput(output: string): string {
  const trimmed = output.trim();
  if (trimmed.length === 0) {
    return "<no stdout/stderr captured>";
  }
  return trimmed.split(/\r?\n/).slice(-80).join("\n");
}

function resolveDebugSmokeScript(workspaceRoot: string): string {
  return path.join(workspaceRoot, "dist", "50_tests", "workspace", "electron-runtime-debug-smoke.js");
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

async function snapshotDirectory(directoryPath: string): Promise<Map<string, Buffer> | null> {
  try {
    const stat = await fs.stat(directoryPath);
    if (!stat.isDirectory()) {
      return null;
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException | undefined)?.code === "ENOENT") {
      return null;
    }
    throw error;
  }

  const snapshot = new Map<string, Buffer>();
  const visit = async (currentPath: string): Promise<void> => {
    const entries = await fs.readdir(currentPath, { withFileTypes: true });
    for (const entry of entries) {
      const absolutePath = path.join(currentPath, entry.name);
      if (entry.isDirectory()) {
        await visit(absolutePath);
        continue;
      }
      if (entry.isFile()) {
        snapshot.set(path.relative(directoryPath, absolutePath), await fs.readFile(absolutePath));
      }
    }
  };

  await visit(directoryPath);
  return snapshot;
}

async function restoreDirectory(directoryPath: string, snapshot: Map<string, Buffer> | null): Promise<void> {
  await fs.rm(directoryPath, { recursive: true, force: true });
  if (snapshot === null) {
    return;
  }
  await fs.mkdir(directoryPath, { recursive: true });
  for (const [relativePath, content] of snapshot) {
    const absolutePath = path.join(directoryPath, relativePath);
    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs.writeFile(absolutePath, content);
  }
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

function runSelectedProjectDebugSmoke(workspaceRoot: string, env: NodeJS.ProcessEnv): Promise<SmokeRunResult> {
  return new Promise((resolve, reject) => {
    const smokeScriptPath = resolveDebugSmokeScript(workspaceRoot);
    if (!existsSync(smokeScriptPath)) {
      reject(new Error(`Runtime debug smoke script is missing at ${smokeScriptPath}. Run npm run build first.`));
      return;
    }

    const child = spawn(process.execPath, [smokeScriptPath], {
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

async function main(): Promise<void> {
  const workspaceRoot = resolveWorkspaceRoot();
  const projectId = "project_002";
  const sourceManifestPath = path.join(workspaceRoot, "40_projects", "project_001", "runtime", "local-mirror", "manifest.json");
  const targetManifestPath = path.join(workspaceRoot, "40_projects", projectId, "runtime", "local-mirror", "manifest.json");
  const targetRequestLogPath = path.join(workspaceRoot, "40_projects", projectId, "runtime", "local-mirror", "request-log.latest.json");
  const targetOverrideManifestPath = path.join(workspaceRoot, "40_projects", projectId, "overrides", "runtime-asset-overrides.json");
  const targetRuntimeAssetsDirectory = path.join(workspaceRoot, "40_projects", projectId, "overrides", "runtime-assets");
  const artifactPath = getArtifactPath();
  const baselineStatus = await captureGitStatus(workspaceRoot);

  const sourceManifestRaw = await fs.readFile(sourceManifestPath, "utf8");
  const sourceManifest = JSON.parse(sourceManifestRaw) as LocalRuntimeMirrorManifest;
  assert(Array.isArray(sourceManifest.entries) && sourceManifest.entries.length > 0, "project_001 runtime mirror manifest should expose grounded entries.");

  const originalTargetManifest = await readOptionalBuffer(targetManifestPath);
  const originalTargetRequestLog = await readOptionalBuffer(targetRequestLogPath);
  const originalTargetOverrideManifest = await readOptionalBuffer(targetOverrideManifestPath);
  const originalTargetRuntimeAssets = await snapshotDirectory(targetRuntimeAssetsDirectory);

  let run: SmokeRunResult | null = null;
  try {
    await fs.mkdir(path.dirname(targetManifestPath), { recursive: true });
    await fs.mkdir(path.dirname(artifactPath), { recursive: true });
    await fs.rm(artifactPath, { force: true });

    const selectedProjectManifest: LocalRuntimeMirrorManifest = {
      ...sourceManifest,
      projectId,
      generatedAtUtc: new Date().toISOString(),
      notes: [
        ...(Array.isArray(sourceManifest.notes) ? sourceManifest.notes : []),
        "Smoke manifest for selected-project Runtime Debug Host verification."
      ]
    };
    await fs.writeFile(targetManifestPath, `${JSON.stringify(selectedProjectManifest, null, 2)}\n`, "utf8");

    run = await runSelectedProjectDebugSmoke(workspaceRoot, {
      ...process.env,
      MYIDE_RUNTIME_DEBUG_PROJECT_ID: projectId,
      MYIDE_RUNTIME_DEBUG_ALLOW_MISSING_DONOR_ASSET: "1",
      MYIDE_RUNTIME_DEBUG_ARTIFACT_PATH: artifactPath
    });

    const output = summarizeOutput(run.output);
    assert.equal(run.exitCode, 0, `Selected-project runtime debug smoke exited with code ${run.exitCode}.\n${output}`);
    const payload = JSON.parse(await fs.readFile(artifactPath, "utf8")) as RuntimeDebugSmokePayload;

    assert.equal(payload.status, "pass", `Selected-project runtime debug smoke payload reported failure: ${payload.error ?? "<no error>"}\n${output}`);
    assert.equal(payload.projectId, projectId, "Selected-project runtime debug smoke should target project_002.");
    assert.match(String(payload.entryUrl ?? ""), /\/runtime\/project_002\/launch$/, "Selected-project runtime debug smoke should use the selected-project launch URL.");
    assert.equal(payload.runtimeSourceLabel, "Local mirror", "Selected-project runtime debug smoke should use the grounded local mirror.");
    assert.ok(Number(payload.resourceMapCount ?? 0) > 0, "Selected-project runtime debug smoke should record runtime resource-map entries.");
    assert.ok(Number(payload.staticImageEntryCount ?? 0) > 0, "Selected-project runtime debug smoke should capture at least one static-image candidate.");
    assert.ok(typeof payload.candidateRuntimeSourceUrl === "string" && payload.candidateRuntimeSourceUrl.length > 0, "Selected-project runtime debug smoke should capture a request-backed runtime candidate.");
    assert.equal(payload.allowMissingDonorAsset, true, "Selected-project runtime debug smoke should mark donor-asset fallback as allowed.");

    const requestLogRaw = await fs.readFile(targetRequestLogPath, "utf8");
    const requestLog = JSON.parse(requestLogRaw) as RuntimeResourceMapSnapshot;
    assert.equal(requestLog.projectId, projectId, "Selected-project runtime debug smoke should write the request log under project_002.");
    assert.ok(Number(requestLog.entryCount ?? 0) > 0, "Selected-project runtime debug smoke should populate the selected-project request log.");
    assert(
      Array.isArray(requestLog.entries) && requestLog.entries.some((entry) => (
        entry.canonicalSourceUrl === payload.candidateRuntimeSourceUrl
        || entry.runtimeRelativePath === payload.candidateRuntimeRelativePath
      )),
      "Selected-project runtime debug smoke should record the chosen candidate inside the selected-project request log."
    );

    if (!(typeof payload.overrideDonorAssetId === "string" && payload.overrideDonorAssetId.length > 0)) {
      assert.match(
        String(payload.overrideBlocked ?? ""),
        /donor asset/i,
        "Selected-project runtime debug smoke should explain when donor-asset-backed override proof stays blocked."
      );
    }

    console.log("PASS smoke:electron-runtime-selected-project-debug");
    console.log(`Project: ${projectId}`);
    console.log(`Entry URL: ${payload.entryUrl ?? "<missing>"}`);
    console.log(`Runtime candidate: ${payload.candidateRuntimeRelativePath ?? payload.candidateRuntimeSourceUrl ?? "<missing>"}`);
  } finally {
    await restoreFile(targetManifestPath, originalTargetManifest);
    await restoreFile(targetRequestLogPath, originalTargetRequestLog);
    await restoreFile(targetOverrideManifestPath, originalTargetOverrideManifest);
    await restoreDirectory(targetRuntimeAssetsDirectory, originalTargetRuntimeAssets);

    await cleanupEmptyDirectory(path.join(workspaceRoot, "40_projects", projectId, "runtime", "local-mirror"));
    await cleanupEmptyDirectory(path.join(workspaceRoot, "40_projects", projectId, "runtime"));
    await cleanupEmptyDirectory(targetRuntimeAssetsDirectory);
    await cleanupEmptyDirectory(path.join(workspaceRoot, "40_projects", projectId, "overrides"));

    const restoredStatus = await captureGitStatus(workspaceRoot);
    assert.equal(
      restoredStatus,
      baselineStatus,
      `Selected-project runtime debug smoke should restore the repo status.\nBefore:\n${baselineStatus || "<clean>"}\nAfter:\n${restoredStatus || "<clean>"}`
    );
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error(`FAIL smoke:electron-runtime-selected-project-debug - ${message}`);
  process.exitCode = 1;
});
