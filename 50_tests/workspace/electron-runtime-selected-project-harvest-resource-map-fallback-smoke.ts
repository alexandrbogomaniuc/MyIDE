import { strict as assert } from "node:assert";
import { createHash } from "node:crypto";
import { existsSync, promises as fs, writeFileSync } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { loadWorkspaceSlice } from "../../30_app/shell/workspaceSlice";

interface SmokeRunResult {
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  output: string;
}

interface HarvestPayload {
  status?: string;
  error?: string;
  projectId?: string;
  runtimeLaunchBlocked?: boolean;
  runtimeLaunchEntryUrl?: string | null;
  harvestActionVisible?: boolean;
  harvestSucceeded?: boolean;
  harvestedEntryCount?: number;
  harvestedRequestCategory?: string | null;
  harvestedRequestSource?: string | null;
  harvestedStaticAssetSourceUrl?: string | null;
  harvestedStaticAssetRequestCategory?: string | null;
  harvestedStaticAssetRequestSource?: string | null;
  taskId?: string | null;
  pageName?: string | null;
  preHarvestRuntimeWorkbenchEntryKind?: string | null;
  taskRuntimeEntryKind?: string | null;
  taskRuntimeEntrySourceUrl?: string | null;
  runtimeWorkbenchEntryKind?: string | null;
  runtimeWorkbenchEntryRequestSource?: string | null;
  runtimeModeSelected?: boolean;
  taskRuntimeOpenUsesHarvestedRequestWorkbenchEntry?: boolean;
  runtimeOverrideEligible?: boolean;
  runtimeOverrideSourceUrl?: string | null;
  runtimeOverrideRequestSource?: string | null;
  runtimeOverrideDonorAssetId?: string | null;
  createOverrideButtonEnabled?: boolean;
  runtimeOverrideCreated?: boolean;
  overrideProofHarvestSucceeded?: boolean;
  overrideProofHarvestEntryCount?: number;
  overrideProofStaticAssetRequestSource?: string | null;
  overrideProofStaticAssetHitCount?: number;
  runtimeOverrideCleared?: boolean;
  runtimeDebugHostActionVisible?: boolean;
  runtimeSourceDebugHostActionVisible?: boolean;
  runtimeStatusHeading?: string | null;
  runtimeStatusMentionsOfficialDailyPath?: boolean;
  embeddedRuntimeLaunched?: boolean;
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
  return process.env.MYIDE_LIVE_RUNTIME_SELECTED_PROJECT_HARVEST_FALLBACK_ARTIFACT_PATH
    || "/tmp/myide-electron-runtime-selected-project-harvest-resource-map-fallback.json";
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

function sanitizeSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "runtime-asset";
}

function buildModificationTaskAssetId(projectId: string, taskId: string, localPath: string): string {
  const raw = `${projectId}::${taskId}::${localPath}`;
  const hash = createHash("sha1").update(raw).digest("hex").slice(0, 18);
  return `donor.asset.task-${hash}`;
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

function runElectronSelectedProjectHarvestSmoke(workspaceRoot: string): Promise<SmokeRunResult> {
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
        MYIDE_RUNTIME_LOCAL_MIRROR_PORT: process.env.MYIDE_RUNTIME_LOCAL_MIRROR_PORT || "39023",
        MYIDE_LIVE_RUNTIME_SELECTED_PROJECT_HARVEST_SMOKE: "1",
        MYIDE_LIVE_RUNTIME_SELECTED_PROJECT_HARVEST_TIMEOUT_MS: process.env.MYIDE_LIVE_RUNTIME_SELECTED_PROJECT_HARVEST_TIMEOUT_MS || "90000"
      },
      stdio: ["ignore", "pipe", "pipe"]
    });

    let output = "";
    let lineBuffer = "";
    const markerPrefix = "MYIDE_LIVE_RUNTIME_SELECTED_PROJECT_HARVEST_RESULT:";

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
    child.on("close", (exitCode, signal) => resolve({ exitCode, signal, output }));
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

async function restoreOptionalUtf8(filePath: string, originalRaw: string | null): Promise<void> {
  if (originalRaw === null) {
    await fs.rm(filePath, { force: true });
    return;
  }

  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, originalRaw, "utf8");
}

async function restoreOptionalBuffer(filePath: string, originalBuffer: Buffer | null): Promise<void> {
  if (originalBuffer === null) {
    await fs.rm(filePath, { force: true });
    return;
  }

  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, originalBuffer);
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
  const workspace = await loadWorkspaceSlice();
  const project = workspace.projects.find((entry) => entry.projectId === projectId);
  assert(project, `Workspace should expose ${projectId}.`);
  const reportsRootRelativePath = project.keyPaths.reportsRoot;
  const runtimeRootRelativePath = project.keyPaths.runtimeRoot;
  if (typeof reportsRootRelativePath !== "string") {
    throw new Error(`${projectId} should expose reportsRoot.`);
  }
  if (typeof runtimeRootRelativePath !== "string") {
    throw new Error(`${projectId} should expose runtimeRoot.`);
  }
  const reportsRoot = path.join(workspaceRoot, reportsRootRelativePath);
  const runtimeRoot = path.join(workspaceRoot, runtimeRootRelativePath);
  const handoffPath = path.join(reportsRoot, "modification-handoff.json");
  const sourceBundlePath = path.join(reportsRoot, "selected-project-runtime-harvest-resource-map-fallback.smoke.json");
  const sourceRuntimeBundlePath = path.join(reportsRoot, "selected-project-runtime-harvest-resource-map-fallback", "big-win.bundle.js");
  const sourceRuntimeImagePath = path.join(reportsRoot, "selected-project-runtime-harvest-resource-map-fallback", "big-win-ribbon.png");
  const mirrorManifestPath = path.join(runtimeRoot, "local-mirror", "manifest.json");
  const mirrorBundlePath = path.join(runtimeRoot, "local-mirror", "files", "example.invalid", "big-win.bundle.js");
  const mirrorImagePath = path.join(runtimeRoot, "local-mirror", "files", "example.invalid", "big-win-ribbon.png");
  const requestLogPath = path.join(runtimeRoot, "local-mirror", "request-log.latest.json");
  const runtimeProofPath = path.join(runtimeRoot, "page-runtime-proofs.latest.json");
  const overrideManifestPath = path.join(workspaceRoot, "40_projects", projectId, "overrides", "runtime-asset-overrides.json");
  const repoSourceBundlePath = path.relative(workspaceRoot, sourceBundlePath).replace(/\\/g, "/");
  const repoSourceRuntimeBundlePath = path.relative(workspaceRoot, sourceRuntimeBundlePath).replace(/\\/g, "/");
  const repoSourceRuntimeImagePath = path.relative(workspaceRoot, sourceRuntimeImagePath).replace(/\\/g, "/");
  const repoMirrorBundlePath = path.relative(workspaceRoot, mirrorBundlePath).replace(/\\/g, "/");
  const repoMirrorImagePath = path.relative(workspaceRoot, mirrorImagePath).replace(/\\/g, "/");
  const baselineStatus = await captureGitStatus(workspaceRoot);
  const originalHandoffRaw = await readOptionalUtf8(handoffPath);
  const originalSourceBundleRaw = await readOptionalUtf8(sourceBundlePath);
  const originalSourceRuntimeBundleRaw = await readOptionalUtf8(sourceRuntimeBundlePath);
  const originalSourceRuntimeImageRaw = await readOptionalBuffer(sourceRuntimeImagePath);
  const originalMirrorManifestRaw = await readOptionalUtf8(mirrorManifestPath);
  const originalMirrorBundleRaw = await readOptionalUtf8(mirrorBundlePath);
  const originalMirrorImageRaw = await readOptionalBuffer(mirrorImagePath);
  const originalRequestLogRaw = await readOptionalUtf8(requestLogPath);
  const originalRuntimeProofRaw = await readOptionalUtf8(runtimeProofPath);
  const originalOverrideManifestRaw = await readOptionalUtf8(overrideManifestPath);
  const runtimeSourceUrl = "https://example.invalid/runtime/big-win.bundle.js";
  const runtimeStaticSourceUrl = "https://example.invalid/runtime/img/big-win-ribbon.png";
  const taskId = "task.runtime.harvest.resource-map-fallback.project_002.smoke";
  const pageName = "big_win_bundle";
  const donorAssetId = buildModificationTaskAssetId(projectId, taskId, repoSourceRuntimeImagePath);
  const overrideFilePath = path.join(
    workspaceRoot,
    "40_projects",
    projectId,
    "overrides",
    "runtime-assets",
    `${sanitizeSlug("big-win-ribbon")}--${sanitizeSlug(donorAssetId)}.png`
  );
  const originalOverrideFileRaw = await readOptionalBuffer(overrideFilePath);

  let run: SmokeRunResult | null = null;
  let payload: HarvestPayload | null = null;

  try {
    await fs.mkdir(path.dirname(sourceRuntimeBundlePath), { recursive: true });
    await fs.mkdir(path.dirname(mirrorBundlePath), { recursive: true });
    await fs.mkdir(path.dirname(mirrorImagePath), { recursive: true });

    const generatedAt = new Date().toISOString();
    const png1x1 = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+k6X8AAAAASUVORK5CYII=", "base64");
    const requestLogRepoRelativePath = `40_projects/${projectId}/runtime/local-mirror/request-log.latest.json`;

    await fs.writeFile(sourceRuntimeBundlePath, "console.log('project_002_runtime_harvest_resource_map_fallback_source_placeholder');\n", "utf8");
    await fs.writeFile(sourceRuntimeImagePath, png1x1);
    await fs.writeFile(mirrorBundlePath, "console.log('project_002_runtime_harvest_resource_map_fallback_bundle_placeholder');\n", "utf8");
    await fs.writeFile(mirrorImagePath, png1x1);

    await fs.writeFile(
      sourceBundlePath,
      `${JSON.stringify({
        generatedAt,
        nextTextureFitApplyStep: "Harvest request-backed runtime traces from existing grounded request-log evidence even though no mirror manifest is available.",
        pages: [
          {
            pageName,
            pageState: "ready",
            selectedMode: "page-source",
            selectedReason: "Smoke-seeded selected-project runtime harvest from grounded request-log bundle evidence without a mirror manifest.",
            selectedLocalPath: repoSourceRuntimeBundlePath,
            topAffectedSlotName: "smoke.slot.big_win_bundle",
            topAffectedAttachmentName: "smoke.attachment.big_win_bundle",
            affectedLayerCount: 1,
            affectedSlotNames: ["smoke.slot.big_win_bundle"],
            affectedAttachmentNames: ["smoke.attachment.big_win_bundle"],
            regionNames: ["big-win-bundle"],
            nextFitApplyStep: "Harvest request-backed runtime evidence from the existing request-log entry and keep the selected-project runtime workbench on that bundle trace while launch stays blocked."
          },
          {
            pageName: "big_win_image",
            pageState: "ready",
            selectedMode: "page-source",
            selectedReason: "Smoke-seeded task-kit image bridge for request-log fallback static-image override proof.",
            selectedLocalPath: repoSourceRuntimeImagePath,
            topAffectedSlotName: "smoke.slot.big_win_image",
            topAffectedAttachmentName: "smoke.attachment.big_win_image",
            affectedLayerCount: 1,
            affectedSlotNames: ["smoke.slot.big_win_image"],
            affectedAttachmentNames: ["smoke.attachment.big_win_image"],
            regionNames: ["big-win-ribbon"],
            nextFitApplyStep: "Use the harvested request-log-backed static image as the bounded override candidate while the task runtime entry stays on the bundle."
          }
        ],
        localSources: [
          {
            localPath: repoSourceRuntimeImagePath,
            sourceUrl: runtimeStaticSourceUrl,
            familyName: "big_win",
            sourceKind: "task-kit-image",
            relation: "request-log-fallback-static-override"
          }
        ]
      }, null, 2)}\n`,
      "utf8"
    );

    await fs.writeFile(
      handoffPath,
      `${JSON.stringify({
        schemaVersion: "0.1.0",
        projectId,
        projectDisplayName: project.displayName,
        donorId: project.donor.donorId,
        donorName: project.donor.donorName,
        generatedAt,
        currentStage: "modificationComposeRuntime",
        recommendedStage: "modificationComposeRuntime",
        handoffState: "ready-for-modification",
        sourceQueuePath: null,
        queueItemCount: 1,
        readyTaskCount: 1,
        blockedTaskCount: 0,
        nextOperatorAction: "Harvest request-backed runtime traces from existing grounded request-log evidence, open Runtime from the modification board on that bundle entry, then create a bounded override from the harvested static image.",
        tasks: [
          {
            taskId,
            queueId: "smoke.queue.project_002.runtime_harvest_resource_map_fallback",
            scenarioId: "smoke.scenario.project_002.runtime_harvest_resource_map_fallback",
            displayName: "Project 002 Runtime Harvest Resource-map Fallback Smoke",
            promotionKind: "section",
            familyName: "big_win",
            sectionKey: "big_win/BW",
            taskStatus: "ready-for-compose-runtime",
            recommendedWorkbench: "runtime",
            preferredWorkflowPanel: "runtime",
            preferredWorkbenchMode: "runtime",
            sourceArtifactKind: "queue-source",
            sourceArtifactState: "ready",
            sourceArtifactPath: repoSourceBundlePath,
            supportingArtifactPaths: [repoSourceRuntimeBundlePath, repoMirrorBundlePath],
            rationale: "Smoke-seeded modification task proving selected-project runtime harvest can refresh grounded request-log/runtime-resource-map evidence without a mirror manifest, then keep the task on the bundle trace while bounded static-image override proof still works.",
            nextAction: "Harvest Runtime requests from existing request-log evidence, verify the task reopens on the bundle trace, and create/clear the bounded override from the harvested static image.",
            canOpenCompose: true,
            canOpenRuntime: true
          }
        ]
      }, null, 2)}\n`,
      "utf8"
    );

    await fs.rm(mirrorManifestPath, { force: true });
    await fs.writeFile(
      requestLogPath,
      `${JSON.stringify({
        projectId,
        generatedAtUtc: generatedAt,
        entryCount: 2,
        snapshotRepoRelativePath: requestLogRepoRelativePath,
        coverage: {},
        entries: [
          {
            canonicalSourceUrl: runtimeSourceUrl,
            latestRequestUrl: `http://127.0.0.1:39023/runtime/${projectId}/mirror?source=${encodeURIComponent(runtimeSourceUrl)}`,
            requestSource: "local-mirror-proxy",
            lastCaptureMethod: "server-route",
            captureMethods: ["server-route"],
            requestCategory: "html-bootstrap",
            resourceType: "fetch",
            runtimeRelativePath: "big-win.bundle.js",
            runtimeFilename: "big-win.bundle.js",
            fileType: "js",
            localMirrorRepoRelativePath: repoMirrorBundlePath,
            localMirrorAbsolutePath: mirrorBundlePath,
            overrideRepoRelativePath: null,
            overrideAbsolutePath: null,
            hitCount: 1,
            lastHitAtUtc: generatedAt,
            lastStage: "smoke",
            stageHitCounts: {
              smoke: 1
            }
          },
          {
            canonicalSourceUrl: runtimeStaticSourceUrl,
            latestRequestUrl: `http://127.0.0.1:39023/runtime/${projectId}/mirror?source=${encodeURIComponent(runtimeStaticSourceUrl)}`,
            requestSource: "local-mirror-proxy",
            lastCaptureMethod: "server-route",
            captureMethods: ["server-route"],
            requestCategory: "static-asset",
            resourceType: "image",
            runtimeRelativePath: "img/big-win-ribbon.png",
            runtimeFilename: "big-win-ribbon.png",
            fileType: "png",
            localMirrorRepoRelativePath: repoMirrorImagePath,
            localMirrorAbsolutePath: mirrorImagePath,
            overrideRepoRelativePath: null,
            overrideAbsolutePath: null,
            hitCount: 1,
            lastHitAtUtc: generatedAt,
            lastStage: "smoke",
            stageHitCounts: {
              smoke: 1
            }
          }
        ]
      }, null, 2)}\n`,
      "utf8"
    );
    await fs.rm(runtimeProofPath, { force: true });

    run = await runElectronSelectedProjectHarvestSmoke(workspaceRoot);
    const output = summarizeOutput(run.output);
    const lines = run.output
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const mainReadySeen = lines.some((line) => line.includes("MYIDE_LIVE_RUNTIME_SELECTED_PROJECT_HARVEST_MAIN_READY"));
    assert(mainReadySeen, `Main-process selected-project harvest fallback marker was not emitted. Exit=${run.exitCode} Signal=${run.signal ?? "none"}\n${output}`);

    const markerPrefix = "MYIDE_LIVE_RUNTIME_SELECTED_PROJECT_HARVEST_RESULT:";
    const payloadLine = lines.find((line) => line.startsWith(markerPrefix));
    assert(payloadLine, `Renderer selected-project harvest fallback result marker was not emitted. Exit=${run.exitCode} Signal=${run.signal ?? "none"}\n${output}`);

    payload = JSON.parse(payloadLine.slice(markerPrefix.length)) as HarvestPayload;
    writeArtifact(payload);

    assert.equal(payload.status, "pass", `Selected-project harvest resource-map fallback smoke payload reported failure: ${payload.error ?? "<no error>"}\n${output}`);
    assert.equal(payload.projectId, projectId, `Selected-project harvest resource-map fallback smoke did not load ${projectId}.`);
    assert.equal(payload.runtimeLaunchBlocked, true, "Selected-project harvest resource-map fallback smoke should keep launch blocked.");
    assert.equal(payload.runtimeLaunchEntryUrl, null, "Selected-project harvest resource-map fallback smoke should not fake an embedded launch URL.");
    assert.equal(payload.harvestActionVisible, true, "Selected-project harvest resource-map fallback smoke should expose the harvest action even without a mirror manifest.");
    assert.equal(payload.preHarvestRuntimeWorkbenchEntryKind, "resource-map", "Selected-project harvest resource-map fallback smoke should start from request-backed runtime evidence.");
    assert.equal(payload.harvestSucceeded, true, "Selected-project harvest resource-map fallback smoke should refresh request-backed runtime evidence.");
    assert((payload.harvestedEntryCount ?? 0) >= 2, "Selected-project harvest resource-map fallback smoke should preserve both the bundle and static-image entries.");
    assert.equal(payload.harvestedRequestCategory, "html-bootstrap", "Selected-project harvest resource-map fallback smoke should treat the bundle as a runtime dependency.");
    assert.equal(payload.harvestedRequestSource, "local-mirror-proxy", "Selected-project harvest resource-map fallback smoke should refresh the bundle through the proxy path.");
    assert.equal(payload.harvestedStaticAssetSourceUrl, runtimeStaticSourceUrl, "Selected-project harvest resource-map fallback smoke should preserve the static-image source.");
    assert.equal(payload.harvestedStaticAssetRequestCategory, "static-asset", "Selected-project harvest resource-map fallback smoke should preserve the static-image category.");
    assert.equal(payload.harvestedStaticAssetRequestSource, "local-mirror-proxy", "Selected-project harvest resource-map fallback smoke should refresh the static image through the proxy path without a manifest.");
    assert.equal(payload.taskId, taskId, "Selected-project harvest resource-map fallback smoke should keep the prepared task active.");
    assert.equal(payload.pageName, pageName, "Selected-project harvest resource-map fallback smoke should keep the prepared page name.");
    assert.equal(payload.taskRuntimeEntrySourceUrl, runtimeSourceUrl, "Selected-project harvest resource-map fallback smoke used the wrong runtime source.");
    assert.equal(payload.runtimeWorkbenchEntryKind, "resource-map", "Selected-project harvest resource-map fallback smoke should stay on request-backed runtime workbench evidence.");
    assert.equal(payload.runtimeModeSelected, true, "Selected-project harvest resource-map fallback smoke should keep Runtime Mode active.");
    assert.equal(payload.taskRuntimeOpenUsesHarvestedRequestWorkbenchEntry, true, "Selected-project harvest resource-map fallback smoke should reopen on the harvested request-backed workbench entry.");
    assert.equal(payload.runtimeOverrideEligible, true, "Selected-project harvest resource-map fallback smoke should expose an override-eligible static image.");
    assert.equal(payload.runtimeOverrideSourceUrl, runtimeStaticSourceUrl, "Selected-project harvest resource-map fallback smoke should promote the static image as the override target.");
    assert.equal(payload.runtimeOverrideRequestSource, "local-mirror-proxy", "Selected-project harvest resource-map fallback smoke should preserve the request-log-backed static image request source.");
    assert.equal(payload.runtimeOverrideDonorAssetId, donorAssetId, "Selected-project harvest resource-map fallback smoke should bridge the harvested static image back to the task-kit donor asset.");
    assert.equal(payload.createOverrideButtonEnabled, true, "Selected-project harvest resource-map fallback smoke should enable Create Override.");
    assert.equal(payload.runtimeOverrideCreated, true, "Selected-project harvest resource-map fallback smoke did not create the bounded override.");
    assert.equal(payload.overrideProofHarvestSucceeded, true, "Selected-project harvest resource-map fallback smoke should prove an override-backed hit after re-harvest.");
    assert.equal(payload.overrideProofStaticAssetRequestSource, "project-local-override", "Selected-project harvest resource-map fallback smoke should upgrade the static image to a project-local override hit.");
    assert((payload.overrideProofStaticAssetHitCount ?? 0) >= 2, "Selected-project harvest resource-map fallback smoke should increase the static-image hit count after override proof harvest.");
    assert.equal(payload.runtimeOverrideCleared, true, "Selected-project harvest resource-map fallback smoke did not clear the bounded override.");
    assert.equal(payload.runtimeDebugHostActionVisible, false, "Selected-project harvest resource-map fallback smoke should not expose the runtime Debug Host action for project_002.");
    assert.equal(payload.runtimeSourceDebugHostActionVisible, false, "Selected-project harvest resource-map fallback smoke should not expose source-level Debug Host actions for project_002.");
    assert.equal(payload.runtimeStatusHeading, "Selected-project runtime surface", "Selected-project harvest resource-map fallback smoke should keep the runtime status heading project-aware.");
    assert.equal(payload.runtimeStatusMentionsOfficialDailyPath, false, "Selected-project harvest resource-map fallback smoke should not claim project_002 is on the official daily runtime path.");
    assert.equal(payload.embeddedRuntimeLaunched, false, "Selected-project harvest resource-map fallback smoke should not launch the embedded runtime.");

    console.log("PASS smoke:electron-runtime-selected-project-harvest-resource-map-fallback");
    console.log(`Project: ${projectId}`);
    console.log(`Task: ${payload.taskId ?? taskId}`);
    console.log(`Runtime source: ${payload.taskRuntimeEntrySourceUrl ?? runtimeSourceUrl}`);
  } finally {
    await restoreOptionalUtf8(handoffPath, originalHandoffRaw);
    await restoreOptionalUtf8(sourceBundlePath, originalSourceBundleRaw);
    await restoreOptionalUtf8(sourceRuntimeBundlePath, originalSourceRuntimeBundleRaw);
    await restoreOptionalBuffer(sourceRuntimeImagePath, originalSourceRuntimeImageRaw);
    await restoreOptionalUtf8(mirrorManifestPath, originalMirrorManifestRaw);
    await restoreOptionalUtf8(mirrorBundlePath, originalMirrorBundleRaw);
    await restoreOptionalBuffer(mirrorImagePath, originalMirrorImageRaw);
    await restoreOptionalUtf8(requestLogPath, originalRequestLogRaw);
    await restoreOptionalUtf8(runtimeProofPath, originalRuntimeProofRaw);
    await restoreOptionalUtf8(overrideManifestPath, originalOverrideManifestRaw);
    await restoreOptionalBuffer(overrideFilePath, originalOverrideFileRaw);

    await cleanupEmptyDirectory(path.join(reportsRoot, "selected-project-runtime-harvest-resource-map-fallback"));
    await cleanupEmptyDirectory(path.join(runtimeRoot, "local-mirror", "files", "example.invalid"));
    await cleanupEmptyDirectory(path.join(runtimeRoot, "local-mirror", "files"));
    await cleanupEmptyDirectory(path.join(runtimeRoot, "local-mirror"));
    await cleanupEmptyDirectory(path.join(workspaceRoot, "40_projects", projectId, "overrides", "runtime-assets"));
    await cleanupEmptyDirectory(path.join(workspaceRoot, "40_projects", projectId, "overrides"));
    await cleanupEmptyDirectory(reportsRoot);
    await cleanupEmptyDirectory(runtimeRoot);
    const restoredStatus = await captureGitStatus(workspaceRoot);
    assert.equal(
      restoredStatus,
      baselineStatus,
      `Selected-project harvest resource-map fallback smoke should restore the repo status.\nBefore:\n${baselineStatus || "<clean>"}\nAfter:\n${restoredStatus || "<clean>"}`
    );
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  writeArtifact({ status: "fail", error: message });
  console.error(`FAIL smoke:electron-runtime-selected-project-harvest-resource-map-fallback - ${message}`);
  process.exitCode = 1;
});
