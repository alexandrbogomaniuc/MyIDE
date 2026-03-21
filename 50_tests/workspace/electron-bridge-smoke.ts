import { strict as assert } from "node:assert";
import { existsSync, writeFileSync } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

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

interface SmokeRunResult {
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  output: string;
}

function getArtifactPath(): string {
  return process.env.MYIDE_BRIDGE_SMOKE_ARTIFACT_PATH || "/tmp/myide-electron-bridge-smoke.json";
}

function writeArtifact(payload: unknown): void {
  writeFileSync(getArtifactPath(), JSON.stringify(payload, null, 2));
}

function runElectronBridgeSmoke(workspaceRoot: string): Promise<SmokeRunResult> {
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
        MYIDE_BRIDGE_SMOKE: "1",
        MYIDE_BRIDGE_SMOKE_TIMEOUT_MS: "25000"
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

async function main(): Promise<void> {
  const workspaceRoot = resolveWorkspaceRoot();
  const result = await runElectronBridgeSmoke(workspaceRoot);
  const outputSummary = result.output.trim().length > 0
    ? result.output.trim().split(/\r?\n/).slice(-20).join("\n")
    : "<no stdout/stderr captured>";

  const lines = result.output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const mainReadySeen = lines.some((line) => line.includes("MYIDE_BRIDGE_SMOKE_MAIN_READY"));
  assert(
    mainReadySeen,
    `Main-process bridge smoke marker was not emitted. Exit=${result.exitCode} Signal=${result.signal ?? "none"}\n${outputSummary}`
  );

  const markerPrefix = "MYIDE_BRIDGE_SMOKE_RESULT:";
  const payloadLine = lines.find((line) => line.startsWith(markerPrefix));
  assert(
    payloadLine,
    `Renderer bridge result marker was not emitted. Exit=${result.exitCode} Signal=${result.signal ?? "none"}\n${outputSummary}`
  );

  const payload = JSON.parse(payloadLine.slice(markerPrefix.length)) as {
    status?: string;
    preloadExecuted?: boolean;
    myideApiExposed?: boolean;
    pingSucceeded?: boolean;
    rendererReadyAcknowledged?: boolean;
    bridgeCallSucceeded?: boolean;
    workspaceLoadSucceeded?: boolean;
    project001LoadSucceeded?: boolean;
    selectedProjectId?: string;
    preloadExists?: boolean;
    preloadPath?: string | null;
    error?: string;
  };

  try {
    assert.equal(payload.status, "pass", `Bridge smoke reported failure: ${payload.error ?? "unknown error"}`);
    assert.equal(payload.preloadExecuted, true, "Preload execution marker was false.");
    assert.equal(payload.preloadExists, true, "Preload path did not exist at runtime.");
    assert.equal(payload.myideApiExposed, true, "Renderer did not observe window.myideApi.");
    assert.equal(payload.pingSucceeded, true, "Renderer ping did not succeed over the desktop bridge.");
    assert.equal(payload.rendererReadyAcknowledged, true, "Renderer-ready handshake was not acknowledged.");
    assert.equal(payload.bridgeCallSucceeded, true, "Renderer bridge loadProjectSlice call failed.");
    assert.equal(payload.workspaceLoadSucceeded, true, "Workspace load path did not return any projects.");
    assert.equal(payload.project001LoadSucceeded, true, "project_001 was not discoverable through the bridge.");
    assert.equal(payload.selectedProjectId, "project_001", "Bridge smoke did not load the expected project.");
    assert.equal(
      result.exitCode,
      0,
      `Electron bridge smoke exited with code ${result.exitCode} (signal ${result.signal ?? "none"}).\n${outputSummary}`
    );
  } catch (error) {
    writeArtifact({
      status: "fail",
      artifactPath: getArtifactPath(),
      result,
      payload,
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }

  writeArtifact({
    status: "pass",
    artifactPath: getArtifactPath(),
    result,
    payload
  });

  console.log("PASS smoke:electron-bridge");
  console.log(`Main ready marker: ${mainReadySeen ? "seen" : "missing"}`);
  console.log(`Selected project: ${payload.selectedProjectId}`);
  console.log(`Artifact: ${getArtifactPath()}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  writeArtifact({
    status: "fail",
    artifactPath: getArtifactPath(),
    error: message
  });
  console.error(`FAIL smoke:electron-bridge - ${message}`);
  process.exitCode = 1;
});
