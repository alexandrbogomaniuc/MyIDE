import { strict as assert } from "node:assert";
import { existsSync, promises as fs, writeFileSync } from "node:fs";
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
  bridgeVersion?: string | null;
  engineKind?: string | null;
  engineNote?: string | null;
  frameCount?: number;
  accessibleFrameCount?: number;
  canvasCount?: number;
  pixiDetected?: boolean;
  pixiVersion?: string | null;
  assetUseEntryCount?: number;
  assetUseTopUrl?: string | null;
  resourceMapCount?: number;
  staticImageEntryCount?: number;
  candidateRuntimeSourceUrl?: string | null;
  candidateRuntimeRelativePath?: string | null;
  candidateRequestSource?: string | null;
  candidateHitCount?: number;
  candidateCaptureMethods?: string[];
  localMirrorSourcePath?: string | null;
  overrideDonorAssetId?: string | null;
  overrideCreated?: boolean;
  overrideCleared?: boolean;
  overrideHitCountAfterReload?: number;
  overrideBlocked?: string | null;
  allowMissingDonorAsset?: boolean;
}

function resolveWorkspaceRoot(): string {
  let current = process.cwd();
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
  throw new Error(`Unable to locate MyIDE workspace root from ${process.cwd()}`);
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
  return process.env.MYIDE_RUNTIME_DEBUG_ARTIFACT_PATH || "/tmp/myide-electron-runtime-debug.json";
}

function getExpectedProjectId(): string {
  return process.env.MYIDE_RUNTIME_DEBUG_PROJECT_ID || "project_001";
}

function allowMissingDonorAsset(): boolean {
  return process.env.MYIDE_RUNTIME_DEBUG_ALLOW_MISSING_DONOR_ASSET === "1";
}

function writeArtifact(payload: unknown): void {
  writeFileSync(getArtifactPath(), `${JSON.stringify(payload, null, 2)}\n`);
}

function summarizeOutput(output: string): string {
  const trimmed = output.trim();
  if (trimmed.length === 0) {
    return "<no stdout/stderr captured>";
  }
  return trimmed.split(/\r?\n/).slice(-80).join("\n");
}

function runElectronRuntimeDebugSmoke(workspaceRoot: string): Promise<SmokeRunResult> {
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
        MYIDE_RUNTIME_DEBUG_SMOKE: "1",
        MYIDE_RUNTIME_DEBUG_PROJECT_ID: getExpectedProjectId(),
        MYIDE_RUNTIME_DEBUG_TIMEOUT_MS: process.env.MYIDE_RUNTIME_DEBUG_TIMEOUT_MS ?? "90000",
        MYIDE_RUNTIME_DEBUG_SHOW: process.env.MYIDE_RUNTIME_DEBUG_SHOW ?? "0"
      },
      stdio: ["ignore", "pipe", "pipe"]
    });

    let output = "";
    const handleChunk = (chunk: unknown) => {
      output += String(chunk);
    };
    child.stdout.on("data", handleChunk);
    child.stderr.on("data", handleChunk);
    child.on("error", reject);
    child.on("close", (exitCode, signal) => {
      resolve({ exitCode, signal, output });
    });
  });
}

async function main(): Promise<void> {
  const workspaceRoot = resolveWorkspaceRoot();
  const artifactPath = getArtifactPath();
  await fs.mkdir(path.dirname(artifactPath), { recursive: true });
  await fs.rm(artifactPath, { force: true });

  const run = await runElectronRuntimeDebugSmoke(workspaceRoot);
  const output = summarizeOutput(run.output);
  const lines = run.output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  assert(
    lines.some((line) => line.includes("MYIDE_RUNTIME_DEBUG_MAIN_READY")),
    `Runtime debug smoke marker was not emitted. Exit=${run.exitCode} Signal=${run.signal ?? "none"}\n${output}`
  );

  const markerPrefix = "MYIDE_RUNTIME_DEBUG_RESULT:";
  const payloadLine = lines.find((line) => line.startsWith(markerPrefix));
  assert(payloadLine, `Runtime debug result marker was not emitted. Exit=${run.exitCode} Signal=${run.signal ?? "none"}\n${output}`);

  const payload = JSON.parse(payloadLine.slice(markerPrefix.length)) as RuntimeDebugSmokePayload;
  writeArtifact(payload);
  const expectedProjectId = getExpectedProjectId();
  const relaxedOverrideProof = allowMissingDonorAsset();

  assert.equal(payload.status, "pass", `Runtime debug payload reported failure: ${payload.error ?? "<no error>"}\n${output}`);
  assert.equal(payload.pathDecision, "embedded-no-go-debug-host", "Runtime debug smoke did not report the debug-host pivot.");
  assert.equal(payload.projectId, expectedProjectId, `Runtime debug smoke did not target ${expectedProjectId}.`);
  assert.equal(payload.runtimeSourceLabel, "Local mirror", "Runtime debug host did not use the local mirror.");
  assert.ok(typeof payload.entryUrl === "string" && payload.entryUrl.length > 0, "Runtime debug host entry URL is missing.");
  assert.ok(typeof payload.bridgeSource === "string" && payload.bridgeSource.length > 0, "Runtime debug host bridge source is missing.");
  assert.ok(Number(payload.resourceMapCount ?? 0) > 0, "Runtime debug host did not populate the runtime resource map.");
  assert.ok(Number(payload.staticImageEntryCount ?? 0) > 0, "Runtime debug host did not capture any request-backed static image entries.");
  assert.ok(typeof payload.candidateRuntimeSourceUrl === "string" && payload.candidateRuntimeSourceUrl.length > 0, "Runtime debug host did not choose a request-backed static image candidate.");
  assert.ok(Number(payload.candidateHitCount ?? 0) > 0, "Runtime debug candidate did not record any hits.");
  if (relaxedOverrideProof) {
    if (typeof payload.overrideDonorAssetId === "string" && payload.overrideDonorAssetId.length > 0) {
      assert.equal(payload.overrideCreated, true, "Runtime debug override was not created after donor asset selection succeeded.");
      assert.equal(payload.overrideCleared, true, "Runtime debug override was not cleared after donor asset selection succeeded.");
      assert.ok(Number(payload.overrideHitCountAfterReload ?? 0) > 0, `Runtime debug override did not record a hit after reload.\n${output}`);
    } else {
      assert.equal(payload.overrideCreated, false, "Runtime debug smoke should not create an override when donor assets are unavailable.");
      assert.equal(payload.overrideCleared, false, "Runtime debug smoke should not clear an override that was never created.");
      assert.match(
        String(payload.overrideBlocked ?? ""),
        /donor asset/i,
        "Runtime debug smoke should explain when donor-asset-backed override proof stays blocked."
      );
    }
  } else {
    assert.ok(typeof payload.overrideDonorAssetId === "string" && payload.overrideDonorAssetId.length > 0, "Runtime debug override donor asset id is missing.");
    assert.equal(payload.overrideCreated, true, "Runtime debug override was not created.");
    assert.equal(payload.overrideCleared, true, "Runtime debug override was not cleared.");
    assert.ok(Number(payload.overrideHitCountAfterReload ?? 0) > 0, `Runtime debug override did not record a hit after reload.\n${output}`);
  }

  console.log("PASS smoke:electron-runtime-debug");
  console.log(`Artifact: ${artifactPath}`);
  if (payload.candidateRuntimeRelativePath) {
    console.log(`Debug candidate: ${payload.candidateRuntimeRelativePath}`);
  }
  if (payload.localMirrorSourcePath) {
    console.log(`Local mirror source: ${payload.localMirrorSourcePath}`);
  }
  if (payload.overrideHitCountAfterReload != null) {
    console.log(`Override hits after reload: ${payload.overrideHitCountAfterReload}`);
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  writeArtifact({
    status: "fail",
    error: message
  });
  console.error(`FAIL smoke:electron-runtime-debug - ${message}`);
  process.exitCode = 1;
});
