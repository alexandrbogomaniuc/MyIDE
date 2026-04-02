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
  return process.env.MYIDE_RUNTIME_SELECTED_PROJECT_ROUTE_ARTIFACT_PATH || "/tmp/myide-electron-runtime-selected-project-route.json";
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

function runElectronSelectedProjectRouteSmoke(
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
  const relativePath = "img/big-win-ribbon.png";
  const runtimeSourceUrl = "https://example.invalid/runtime/img/big-win-ribbon.png";
  const mirrorManifestPath = path.join(workspaceRoot, "40_projects", projectId, "runtime", "local-mirror", "manifest.json");
  const requestLogPath = path.join(workspaceRoot, "40_projects", projectId, "runtime", "local-mirror", "request-log.latest.json");
  const loaderFilePath = path.join(workspaceRoot, "40_projects", projectId, "runtime", "local-mirror", "files", "example.invalid", "loader.js");
  const bundleFilePath = path.join(workspaceRoot, "40_projects", projectId, "runtime", "local-mirror", "files", "example.invalid", "bundle.js");
  const imageFilePath = path.join(workspaceRoot, "40_projects", projectId, "runtime", "local-mirror", "files", "example.invalid", "big-win-ribbon.png");
  const overrideManifestPath = path.join(workspaceRoot, "40_projects", projectId, "overrides", "runtime-asset-overrides.json");
  const overrideFilePath = path.join(workspaceRoot, "40_projects", projectId, "overrides", "runtime-assets", "big-win-ribbon--smoke.png");
  const trackedPaths = [mirrorManifestPath, requestLogPath, loaderFilePath, bundleFilePath, imageFilePath, overrideManifestPath, overrideFilePath];
  const originalFiles = new Map<string, Buffer | null>();
  const baselineStatus = await captureGitStatus(workspaceRoot);

  for (const filePath of trackedPaths) {
    originalFiles.set(filePath, await readOptionalBuffer(filePath));
  }

  let result: SmokeRunResult | null = null;
  let payload: Record<string, unknown> | null = null;
  try {
    await fs.mkdir(path.dirname(mirrorManifestPath), { recursive: true });
    await fs.mkdir(path.dirname(loaderFilePath), { recursive: true });
    await fs.mkdir(path.dirname(overrideManifestPath), { recursive: true });
    await fs.mkdir(path.dirname(overrideFilePath), { recursive: true });

    await Promise.all([
      fs.writeFile(loaderFilePath, "console.log('project_002 loader');\n", "utf8"),
      fs.writeFile(bundleFilePath, "console.log('project_002 bundle');\n", "utf8"),
      fs.writeFile(imageFilePath, Buffer.from("project_002_image_placeholder", "utf8")),
      fs.writeFile(overrideFilePath, Buffer.from("project_002_override_placeholder", "utf8"))
    ]);

    await fs.writeFile(
      mirrorManifestPath,
      `${JSON.stringify({
        schemaVersion: "0.1.0",
        projectId,
        mode: "partial-local-runtime-mirror",
        generatedAtUtc: new Date().toISOString(),
        publicEntryUrl: "https://demo.bgaming-network.com/play/MysteryGarden/FUN?server=demo",
        resourceVersion: "project-002-route-smoke",
        notes: [
          "Smoke manifest for selected-project live runtime route verification."
        ],
        entries: [
          {
            sourceUrl: "https://example.invalid/runtime/loader.js",
            kind: "runtime-loader",
            repoRelativePath: "40_projects/project_002/runtime/local-mirror/files/example.invalid/loader.js",
            fileType: "js"
          },
          {
            sourceUrl: "https://example.invalid/runtime/bundle.js",
            kind: "runtime-bundle",
            repoRelativePath: "40_projects/project_002/runtime/local-mirror/files/example.invalid/bundle.js",
            fileType: "js"
          },
          {
            sourceUrl: runtimeSourceUrl,
            kind: "static-image",
            repoRelativePath: "40_projects/project_002/runtime/local-mirror/files/example.invalid/big-win-ribbon.png",
            fileType: "png"
          }
        ]
      }, null, 2)}\n`,
      "utf8"
    );

    await fs.writeFile(
      overrideManifestPath,
      `${JSON.stringify({
        schemaVersion: "0.1.0",
        projectId,
        generatedAtUtc: new Date().toISOString(),
        entries: [
          {
            overrideId: "runtime.override.big-win-ribbon.png",
            runtimeSourceUrl,
            runtimeRelativePath: relativePath,
            runtimeFilename: "big-win-ribbon.png",
            fileType: "png",
            donorAssetId: "smoke.donor.asset",
            donorEvidenceId: "smoke.evidence.asset",
            donorFilename: "smoke-donor.png",
            donorRepoRelativePath: "10_donors/smoke/donor.png",
            overrideRepoRelativePath: "40_projects/project_002/overrides/runtime-assets/big-win-ribbon--smoke.png",
            createdAtUtc: new Date().toISOString(),
            note: "Smoke override for selected-project live runtime route verification."
          }
        ]
      }, null, 2)}\n`,
      "utf8"
    );

    result = await runElectronSelectedProjectRouteSmoke(workspaceRoot, {
      ...process.env,
      MYIDE_RUNTIME_SELECTED_PROJECT_ROUTE_SMOKE: "1",
      MYIDE_RUNTIME_SELECTED_PROJECT_ROUTE_TIMEOUT_MS: process.env.MYIDE_RUNTIME_SELECTED_PROJECT_ROUTE_TIMEOUT_MS || "45000",
      MYIDE_RUNTIME_SELECTED_PROJECT_ROUTE_PROJECT_ID: projectId,
      MYIDE_RUNTIME_SELECTED_PROJECT_ROUTE_RELATIVE_PATH: relativePath,
      MYIDE_RUNTIME_SELECTED_PROJECT_ROUTE_SOURCE_URL: runtimeSourceUrl,
      MYIDE_RUNTIME_LOCAL_MIRROR_PORT: process.env.MYIDE_RUNTIME_LOCAL_MIRROR_PORT || "39017"
    });

    const outputSummary = summarizeOutput(result.output);
    const lines = result.output
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    const mainReadySeen = lines.some((line) => line.includes("MYIDE_RUNTIME_SELECTED_PROJECT_ROUTE_MAIN_READY"));
    assert(
      mainReadySeen,
      `Main-process selected-project route smoke marker was not emitted. Exit=${result.exitCode} Signal=${result.signal ?? "none"}\n${outputSummary}`
    );

    const markerPrefix = "MYIDE_RUNTIME_SELECTED_PROJECT_ROUTE_RESULT:";
    const payloadLine = lines.find((line) => line.startsWith(markerPrefix));
    assert(
      payloadLine,
      `Selected-project route result marker was not emitted. Exit=${result.exitCode} Signal=${result.signal ?? "none"}\n${outputSummary}`
    );

    payload = JSON.parse(payloadLine.slice(markerPrefix.length)) as Record<string, unknown>;
    assert.equal(payload.status, "pass", `Selected-project route smoke reported failure: ${String(payload.error ?? "unknown error")}`);
    assert.equal(payload.projectId, projectId, "Selected-project route smoke reported the wrong project id.");
    assert.equal(payload.assetStatus, 200, "Selected-project asset route did not return 200.");
    assert.equal(payload.proxyStatus, 200, "Selected-project proxy route did not return 200.");
    assert.equal(payload.launchStatus, 200, "Selected-project launch route should return 200 when a grounded local mirror is indexed.");
    assert.match(String(payload.launchBodySnippet ?? ""), /myide-runtime-source/, "Selected-project launch route did not emit the local-mirror launch HTML marker.");
    assert.equal(payload.matchedProjectRequestSource, "project-local-override", "Selected-project runtime route should honor the project-local override.");
    assert.equal(payload.project001ContainsSeedSource, false, "Selected-project runtime route polluted project_001 resource tracking.");
    assert.match(String(payload.assetBodySnippet ?? ""), /project_002_override_placeholder/, "Asset route did not serve the selected-project override content.");
    assert.match(String(payload.proxyBodySnippet ?? ""), /project_002_override_placeholder/, "Proxy route did not serve the selected-project override content.");
    assert.equal(result.exitCode, 0, `Electron selected-project route smoke exited with code ${result.exitCode} (signal ${result.signal ?? "none"}).\n${outputSummary}`);
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
    for (const filePath of trackedPaths) {
      await restoreFile(filePath, originalFiles.get(filePath) ?? null);
    }

    await cleanupEmptyDirectory(path.join(workspaceRoot, "40_projects", projectId, "runtime", "local-mirror", "files", "example.invalid"));
    await cleanupEmptyDirectory(path.join(workspaceRoot, "40_projects", projectId, "runtime", "local-mirror", "files"));
    await cleanupEmptyDirectory(path.join(workspaceRoot, "40_projects", projectId, "runtime", "local-mirror"));
    await cleanupEmptyDirectory(path.join(workspaceRoot, "40_projects", projectId, "overrides", "runtime-assets"));
    await cleanupEmptyDirectory(path.join(workspaceRoot, "40_projects", projectId, "overrides"));

    const restoredStatus = await captureGitStatus(workspaceRoot);
    assert.equal(restoredStatus, baselineStatus, "Selected-project route smoke did not restore the repo status.");
  }

  writeArtifact({
    status: "pass",
    artifactPath: getArtifactPath(),
    result,
    payload
  });

  console.log("PASS smoke:electron-runtime-selected-project-route");
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
  console.error(`FAIL smoke:electron-runtime-selected-project-route - ${message}`);
  process.exitCode = 1;
});
