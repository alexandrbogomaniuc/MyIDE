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

interface OverridePayload {
  status?: string;
  error?: string;
  projectId?: string;
  runtimeLaunchBlocked?: boolean;
  runtimeLaunchEntryUrl?: string | null;
  donorAssetCount?: number;
  taskId?: string | null;
  pageName?: string | null;
  harvestActionVisible?: boolean;
  harvestSucceeded?: boolean;
  harvestApiStatus?: string | null;
  harvestApiAttemptedSourceCount?: number;
  harvestApiTopSourceUrl?: string | null;
  preHarvestRuntimeWorkbenchEntryKind?: string | null;
  taskRuntimeEntryKind?: string | null;
  taskRuntimeEntrySourceUrl?: string | null;
  runtimeWorkbenchEntryKind?: string | null;
  runtimeWorkbenchEntryRequestSource?: string | null;
  taskRuntimeOpenUsesHarvestedRequestWorkbenchEntry?: boolean;
  focusedWorkbenchGroupTitle?: string | null;
  focusedWorkbenchRequestedUrlLine?: string | null;
  focusedWorkbenchSourceAssetLine?: string | null;
  focusedWorkbenchEligibilityChipLabel?: string | null;
  runtimeOverrideEligible?: boolean;
  runtimeOverrideRequestSource?: string | null;
  runtimeOverrideDonorAssetId?: string | null;
  createOverrideButtonEnabled?: boolean;
  runtimeOverrideCreated?: boolean;
  overrideStatusCardTitle?: string | null;
  overrideStatusCardNote?: string | null;
  activeOverrideCardTitle?: string | null;
  activeOverrideCardNote?: string | null;
  runtimeOverrideCleared?: boolean;
  runtimeOverrideManifestRepoRelativePath?: string | null;
  runtimeOverrideRepoRelativePath?: string | null;
  previewStatusAfterCreate?: string | null;
  previewStatusAfterClear?: string | null;
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
  return process.env.MYIDE_LIVE_RUNTIME_SELECTED_PROJECT_OVERRIDE_ARTIFACT_PATH || "/tmp/myide-electron-runtime-selected-project-override.json";
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

function runElectronSelectedProjectOverrideSmoke(workspaceRoot: string): Promise<SmokeRunResult> {
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
        MYIDE_LIVE_RUNTIME_SELECTED_PROJECT_OVERRIDE_SMOKE: "1",
        MYIDE_LIVE_RUNTIME_SELECTED_PROJECT_OVERRIDE_TIMEOUT_MS: process.env.MYIDE_LIVE_RUNTIME_SELECTED_PROJECT_OVERRIDE_TIMEOUT_MS || "90000",
        MYIDE_RUNTIME_LOCAL_MIRROR_PORT: process.env.MYIDE_RUNTIME_LOCAL_MIRROR_PORT || "39019"
      },
      stdio: ["ignore", "pipe", "pipe"]
    });

    let output = "";
    let lineBuffer = "";
    const markerPrefix = "MYIDE_LIVE_RUNTIME_SELECTED_PROJECT_OVERRIDE_RESULT:";

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

async function restoreOptionalBuffer(filePath: string, originalRaw: Buffer | null): Promise<void> {
  if (originalRaw === null) {
    await fs.rm(filePath, { force: true });
    return;
  }

  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, originalRaw);
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

function buildModificationTaskAssetId(projectId: string, taskId: string, localPath: string): string {
  const raw = `${projectId}::${taskId}::${localPath}`;
  const hash = createHash("sha1").update(raw).digest("hex").slice(0, 18);
  return `donor.asset.task-${hash}`;
}

function sanitizeSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "runtime-asset";
}

async function main(): Promise<void> {
  const workspaceRoot = resolveWorkspaceRoot();
  const projectId = "project_002";
  const workspace = await loadWorkspaceSlice();
  const project = workspace.projects.find((entry) => entry.projectId === projectId);
  assert(project, `Workspace should expose ${projectId}.`);

  const reportsRootRelativePath = project.keyPaths.reportsRoot;
  const runtimeRootRelativePath = project.keyPaths.runtimeRoot;
  const projectRootRelativePath = project.keyPaths.projectRoot;
  if (typeof reportsRootRelativePath !== "string" || typeof runtimeRootRelativePath !== "string" || typeof projectRootRelativePath !== "string") {
    throw new Error(`${projectId} should expose reportsRoot, runtimeRoot, and projectRoot.`);
  }

  const reportsRoot = path.join(workspaceRoot, reportsRootRelativePath);
  const runtimeRoot = path.join(workspaceRoot, runtimeRootRelativePath);
  const projectRoot = path.join(workspaceRoot, projectRootRelativePath);
  const handoffPath = path.join(reportsRoot, "modification-handoff.json");
  const sourceBundlePath = path.join(reportsRoot, "runtime-override-kit", "selected-project-runtime-override.smoke.json");
  const sourceAssetPath = path.join(reportsRoot, "runtime-override-kit", "big-win-ribbon.png");
  const runtimeProofPath = path.join(runtimeRoot, "page-runtime-proofs.latest.json");
  const requestLogPath = path.join(runtimeRoot, "local-mirror", "request-log.latest.json");
  const overrideManifestPath = path.join(projectRoot, "overrides", "runtime-asset-overrides.json");
  const repoSourceBundlePath = path.relative(workspaceRoot, sourceBundlePath).replace(/\\/g, "/");
  const repoSourceAssetPath = path.relative(workspaceRoot, sourceAssetPath).replace(/\\/g, "/");
  const repoRuntimeProofPath = path.relative(workspaceRoot, runtimeProofPath).replace(/\\/g, "/");
  const taskId = "task.runtime.override.project_002.smoke";
  const pageName = "big_win";
  const runtimeSourceUrl = "https://example.invalid/runtime/img/big-win-ribbon.png";
  const donorAssetId = buildModificationTaskAssetId(projectId, taskId, repoSourceAssetPath);
  const overrideFilePath = path.join(
    projectRoot,
    "overrides",
    "runtime-assets",
    `${sanitizeSlug("big-win-ribbon") }--${sanitizeSlug(donorAssetId)}.png`
  );

  const baselineStatus = await captureGitStatus(workspaceRoot);
  const originalHandoffRaw = await readOptionalUtf8(handoffPath);
  const originalSourceBundleRaw = await readOptionalUtf8(sourceBundlePath);
  const originalSourceAssetRaw = await readOptionalBuffer(sourceAssetPath);
  const originalRuntimeProofRaw = await readOptionalUtf8(runtimeProofPath);
  const originalRequestLogRaw = await readOptionalUtf8(requestLogPath);
  const originalOverrideManifestRaw = await readOptionalUtf8(overrideManifestPath);
  const originalOverrideFileRaw = await readOptionalBuffer(overrideFilePath);

  let run: SmokeRunResult | null = null;
  let payload: OverridePayload | null = null;

  try {
    await fs.mkdir(path.dirname(sourceAssetPath), { recursive: true });
    await fs.mkdir(reportsRoot, { recursive: true });
    await fs.mkdir(runtimeRoot, { recursive: true });

    const generatedAt = new Date().toISOString();
    await fs.writeFile(sourceAssetPath, Buffer.from("project_002_runtime_override_source_placeholder", "utf8"));
    await fs.writeFile(
      sourceBundlePath,
      `${JSON.stringify({
        generatedAt,
        nextTextureFitApplyStep: "Open Runtime and create a bounded project-local override from the grounded page proof.",
        pages: [
          {
            pageName,
            pageState: "ready",
            selectedMode: "page-runtime-proof",
            selectedReason: "Smoke-seeded selected-project runtime override proof.",
            selectedLocalPath: repoSourceAssetPath,
            topAffectedSlotName: "smoke.slot.big_win",
            topAffectedAttachmentName: "smoke.attachment.big_win",
            affectedLayerCount: 1,
            affectedSlotNames: ["smoke.slot.big_win"],
            affectedAttachmentNames: ["smoke.attachment.big_win"],
            regionNames: ["big-win-ribbon"],
            nextFitApplyStep: "Open Runtime and create the bounded project-local override while embedded launch stays blocked."
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
        nextOperatorAction: "Open Runtime and create a bounded project-local override from the grounded page proof.",
        tasks: [
          {
            taskId,
            queueId: "smoke.queue.project_002.runtime_override",
            scenarioId: "smoke.scenario.project_002.runtime_override",
            displayName: "Project 002 Runtime Override Smoke",
            promotionKind: "section",
            familyName: "big_win",
            sectionKey: "big_win/BW",
            taskStatus: "ready-for-compose-runtime",
            recommendedWorkbench: "runtime",
            preferredWorkflowPanel: "runtime",
            preferredWorkbenchMode: "runtime",
            sourceArtifactKind: "texture-fit-apply-bundle",
            sourceArtifactState: "ready",
            sourceArtifactPath: repoSourceBundlePath,
            supportingArtifactPaths: [],
            rationale: "Smoke-seeded modification task proving selected-project bounded override creation from grounded runtime evidence while launch stays blocked.",
            nextAction: "Open Runtime and create the project-local override from the grounded page proof.",
            canOpenCompose: true,
            canOpenRuntime: true
          }
        ]
      }, null, 2)}\n`,
      "utf8"
    );

    await fs.writeFile(
      runtimeProofPath,
      `${JSON.stringify({
        projectId,
        generatedAtUtc: generatedAt,
        snapshotRepoRelativePath: repoRuntimeProofPath,
        entryCount: 1,
        entries: [
          {
            taskId,
            pageName,
            sourceUrl: runtimeSourceUrl,
            runtimeLabel: "big_win",
            profileId: null,
            requestSource: "upstream-request",
            requestBacked: true,
            relativePath: "img/big-win-ribbon.png",
            localMirrorRepoRelativePath: repoSourceAssetPath,
            overrideHitCountAfterReload: 0,
            savedAtUtc: generatedAt
          }
        ]
      }, null, 2)}\n`,
      "utf8"
    );

    run = await runElectronSelectedProjectOverrideSmoke(workspaceRoot);
    const output = summarizeOutput(run.output);
    const lines = run.output
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const mainReadySeen = lines.some((line) => line.includes("MYIDE_LIVE_RUNTIME_SELECTED_PROJECT_OVERRIDE_MAIN_READY"));
    assert(
      mainReadySeen,
      `Main-process selected-project runtime override smoke marker was not emitted. Exit=${run.exitCode} Signal=${run.signal ?? "none"}\n${output}`
    );

    const markerPrefix = "MYIDE_LIVE_RUNTIME_SELECTED_PROJECT_OVERRIDE_RESULT:";
    const payloadLine = lines.find((line) => line.startsWith(markerPrefix));
    assert(
      payloadLine,
      `Renderer selected-project runtime override smoke result marker was not emitted. Exit=${run.exitCode} Signal=${run.signal ?? "none"}\n${output}`
    );

    payload = JSON.parse(payloadLine.slice(markerPrefix.length)) as OverridePayload;
    writeArtifact(payload);

    assert.equal(payload.status, "pass", `Selected-project runtime override smoke payload reported failure: ${payload.error ?? "<no error>"}\n${output}`);
    assert.equal(payload.projectId, projectId, `Selected-project runtime override smoke did not load ${projectId}.`);
    assert.equal(payload.runtimeLaunchBlocked, true, "Selected-project runtime override smoke should keep launch blocked without a grounded mirror manifest.");
    assert.equal(payload.runtimeLaunchEntryUrl, null, "Selected-project runtime override smoke should not expose an embedded launch URL without a grounded mirror manifest.");
    assert.equal(payload.donorAssetCount, 1, "Selected-project runtime override smoke should surface the seeded task-kit donor asset.");
    assert.equal(payload.taskId, taskId, "Selected-project runtime override smoke reported the wrong task id.");
    assert.equal(payload.pageName, pageName, "Selected-project runtime override smoke reported the wrong page name.");
    assert.equal(payload.harvestActionVisible, true, "Selected-project runtime override smoke should expose the bounded harvest action.");
    assert.equal(payload.harvestSucceeded, true, "Selected-project runtime override smoke should harvest the stronger runtime trace before override creation.");
    assert.equal(payload.harvestApiStatus, "ready", "Selected-project runtime override smoke harvest should complete successfully.");
    assert((payload.harvestApiAttemptedSourceCount ?? 0) >= 1, "Selected-project runtime override smoke should attempt at least one bounded harvest source.");
    assert(
      typeof payload.harvestApiTopSourceUrl === "string" && payload.harvestApiTopSourceUrl.length > 0,
      "Selected-project runtime override smoke should report a harvested top runtime source URL."
    );
    assert.equal(payload.preHarvestRuntimeWorkbenchEntryKind, "page-runtime-proof", "Selected-project runtime override smoke should start from persisted page-proof evidence before harvest.");
    assert.equal(payload.taskRuntimeEntryKind, "request-backed", "Selected-project runtime override smoke should report the stronger harvested request-backed trace before override creation.");
    assert.equal(payload.taskRuntimeEntrySourceUrl, runtimeSourceUrl, "Selected-project runtime override smoke used the wrong runtime source.");
    assert.equal(payload.runtimeWorkbenchEntryKind, "resource-map", "Selected-project runtime override smoke should use the harvested request-backed runtime entry before override creation.");
    assert.equal(payload.runtimeWorkbenchEntryRequestSource, "local-mirror-proxy", "Selected-project runtime override smoke should reopen on the harvested request-backed source.");
    assert.equal(payload.taskRuntimeOpenUsesHarvestedRequestWorkbenchEntry, true, "Selected-project runtime override smoke should keep the task open on the harvested request-backed runtime entry.");
    assert.equal(payload.focusedWorkbenchGroupTitle, "Request-backed runtime assets", "Selected-project runtime override smoke should group the focused runtime row under request-backed runtime assets.");
    assert(payload.focusedWorkbenchRequestedUrlLine?.includes(runtimeSourceUrl), "Selected-project runtime override smoke should show the requested runtime URL in the workbench row.");
    assert(payload.focusedWorkbenchSourceAssetLine?.includes(donorAssetId), "Selected-project runtime override smoke should show the bridged donor asset in the workbench row.");
    assert.equal(payload.focusedWorkbenchEligibilityChipLabel, "override ready", "Selected-project runtime override smoke should show the focused row as override ready before creation.");
    assert.equal(payload.runtimeOverrideEligible, true, "Selected-project runtime override candidate should be eligible.");
    assert.equal(payload.runtimeOverrideRequestSource, "local-mirror-proxy", "Selected-project runtime override smoke should create the override from the harvested request-backed source.");
    assert.equal(payload.runtimeOverrideDonorAssetId, donorAssetId, "Selected-project runtime override smoke matched the wrong donor asset.");
    assert.equal(payload.createOverrideButtonEnabled, true, "Selected-project runtime override button should be enabled.");
    assert.equal(payload.runtimeOverrideCreated, true, "Selected-project runtime override smoke did not create the override.");
    assert(payload.overrideStatusCardTitle?.includes("modification-task-kit"), "Selected-project runtime override smoke should expose the donor-source class in the Override Status card.");
    assert(payload.overrideStatusCardNote?.includes("modification-task-kit"), "Selected-project runtime override smoke should explain the donor-source class in the Override Status card.");
    assert(payload.activeOverrideCardTitle?.includes(donorAssetId) && payload.activeOverrideCardTitle?.includes("modification-task-kit"), "Selected-project runtime override smoke should expose donor asset id plus donor-source class in the Active Override card.");
    assert(payload.activeOverrideCardNote?.includes("modification-task-kit"), "Selected-project runtime override smoke should explain the donor-source class in the Active Override card note.");
    assert.equal(payload.runtimeOverrideManifestRepoRelativePath, "40_projects/project_002/overrides/runtime-asset-overrides.json", "Selected-project runtime override manifest path was wrong.");
    assert.equal(payload.runtimeOverrideRepoRelativePath, path.relative(workspaceRoot, overrideFilePath).replace(/\\/g, "/"), "Selected-project runtime override file path was wrong.");
    assert.equal(payload.runtimeOverrideCleared, true, "Selected-project runtime override smoke did not clear the override.");
    assert.equal(payload.embeddedRuntimeLaunched, false, "Selected-project runtime override smoke should not launch the embedded runtime.");
    const createStatusMessage = payload.previewStatusAfterCreate ?? "";
    assert(
      createStatusMessage.includes("Embedded launch stays blocked")
      || createStatusMessage.includes("Coverage scan")
      || createStatusMessage.includes("Open Debug Host"),
      "Selected-project runtime override create status should mention blocked launch follow-up or an explicit coverage/debug-host rerun follow-up."
    );
    assert(!payload.previewStatusAfterCreate?.includes("Reloading the embedded runtime now"), "Selected-project runtime override create status should not claim a blocked embedded runtime reload.");

    console.log("PASS smoke:electron-runtime-selected-project-override");
    console.log(`Project: ${projectId}`);
    console.log(`Task: ${payload.taskId ?? taskId}`);
    console.log(`Override donor asset: ${payload.runtimeOverrideDonorAssetId ?? donorAssetId}`);
  } finally {
    await restoreOptionalUtf8(handoffPath, originalHandoffRaw);
    await restoreOptionalUtf8(sourceBundlePath, originalSourceBundleRaw);
    await restoreOptionalBuffer(sourceAssetPath, originalSourceAssetRaw);
    await restoreOptionalUtf8(runtimeProofPath, originalRuntimeProofRaw);
    await restoreOptionalUtf8(requestLogPath, originalRequestLogRaw);
    await restoreOptionalUtf8(overrideManifestPath, originalOverrideManifestRaw);
    await restoreOptionalBuffer(overrideFilePath, originalOverrideFileRaw);

    await cleanupEmptyDirectory(path.dirname(sourceAssetPath));
    await cleanupEmptyDirectory(path.join(runtimeRoot, "local-mirror"));
    await cleanupEmptyDirectory(path.join(projectRoot, "overrides", "runtime-assets"));
    await cleanupEmptyDirectory(path.join(projectRoot, "overrides"));
    await cleanupEmptyDirectory(reportsRoot);
    await cleanupEmptyDirectory(runtimeRoot);

    const restoredStatus = await captureGitStatus(workspaceRoot);
    assert.equal(
      restoredStatus,
      baselineStatus,
      `Selected-project runtime override smoke should restore the repo status.\nBefore:\n${baselineStatus || "<clean>"}\nAfter:\n${restoredStatus || "<clean>"}`
    );
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  writeArtifact({ status: "fail", error: message });
  console.error(`FAIL smoke:electron-runtime-selected-project-override - ${message}`);
  process.exitCode = 1;
});
