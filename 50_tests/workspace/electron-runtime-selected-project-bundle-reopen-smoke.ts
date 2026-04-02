import { strict as assert } from "node:assert";
import { existsSync, promises as fs, writeFileSync } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { loadWorkspaceSlice } from "../../30_app/shell/workspaceSlice";

interface SmokeRunResult {
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  output: string;
}

interface BundleReopenPayload {
  status?: string;
  error?: string;
  projectId?: string;
  runtimeLaunchBlocked?: boolean;
  runtimeLaunchEntryUrl?: string | null;
  taskId?: string | null;
  pageName?: string | null;
  pageRuntimeProofLoaded?: boolean;
  runtimeWorkbenchHasPageProofEntry?: boolean;
  taskRuntimeEntryKind?: string | null;
  taskRuntimeEntrySourceUrl?: string | null;
  runtimeWorkbenchEntryKind?: string | null;
  runtimeWorkbenchEntryRequestSource?: string | null;
  runtimeModeSelected?: boolean;
  taskRuntimeOpenUsesPersistedPageProof?: boolean;
  taskRuntimeOpenUsesRequestBackedWorkbenchEntry?: boolean;
  taskRuntimeOpenUsesLocalMirrorWorkbenchEntry?: boolean;
  runtimeDebugHostActionVisible?: boolean;
  runtimeSourceDebugHostActionVisible?: boolean;
  runtimeStatusHeading?: string | null;
  runtimeSurfaceCountLabel?: string | null;
  runtimeSurfaceSummaryTitle?: string | null;
  runtimeStatusSurfaceChipLabel?: string | null;
  runtimeStatusSurfaceCardTitle?: string | null;
  inspectorSurfaceChipLabel?: string | null;
  onboardingSurfaceChipLabel?: string | null;
  onboardingSurfaceCardTitle?: string | null;
  activeTaskRuntimeChipLabel?: string | null;
  activeTaskRuntimeContextLine?: string | null;
  runtimeStatusMentionsOfficialDailyPath?: boolean;
  embeddedRuntimeLaunched?: boolean;
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
  return process.env.MYIDE_LIVE_RUNTIME_SELECTED_PROJECT_BUNDLE_REOPEN_ARTIFACT_PATH
    || "/tmp/myide-electron-runtime-selected-project-bundle-reopen.json";
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

function runElectronSelectedProjectBundleReopenSmoke(workspaceRoot: string): Promise<SmokeRunResult> {
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
        MYIDE_LIVE_RUNTIME_SELECTED_PROJECT_REOPEN_SMOKE: "1",
        MYIDE_LIVE_RUNTIME_SELECTED_PROJECT_REOPEN_TIMEOUT_MS: process.env.MYIDE_LIVE_RUNTIME_SELECTED_PROJECT_REOPEN_TIMEOUT_MS || "90000"
      },
      stdio: ["ignore", "pipe", "pipe"]
    });

    let output = "";
    let lineBuffer = "";
    const markerPrefix = "MYIDE_LIVE_RUNTIME_SELECTED_PROJECT_REOPEN_RESULT:";

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

async function restoreOptionalUtf8(filePath: string, originalRaw: string | null): Promise<void> {
  if (originalRaw === null) {
    await fs.rm(filePath, { force: true });
    return;
  }

  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, originalRaw, "utf8");
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
  const sourceBundlePath = path.join(reportsRoot, "selected-project-runtime-bundle-reopen.smoke.json");
  const sourceRuntimeBundlePath = path.join(reportsRoot, "selected-project-runtime-bundle-reopen", "big-win.bundle.js");
  const mirrorManifestPath = path.join(runtimeRoot, "local-mirror", "manifest.json");
  const mirrorBundlePath = path.join(runtimeRoot, "local-mirror", "files", "example.invalid", "big-win.bundle.js");
  const requestLogPath = path.join(runtimeRoot, "local-mirror", "request-log.latest.json");
  const runtimeProofPath = path.join(runtimeRoot, "page-runtime-proofs.latest.json");
  const repoSourceBundlePath = path.relative(workspaceRoot, sourceBundlePath).replace(/\\/g, "/");
  const repoSourceRuntimeBundlePath = path.relative(workspaceRoot, sourceRuntimeBundlePath).replace(/\\/g, "/");
  const repoMirrorBundlePath = path.relative(workspaceRoot, mirrorBundlePath).replace(/\\/g, "/");
  const baselineStatus = await captureGitStatus(workspaceRoot);
  const originalHandoffRaw = await readOptionalUtf8(handoffPath);
  const originalSourceBundleRaw = await readOptionalUtf8(sourceBundlePath);
  const originalSourceRuntimeBundleRaw = await readOptionalUtf8(sourceRuntimeBundlePath);
  const originalMirrorManifestRaw = await readOptionalUtf8(mirrorManifestPath);
  const originalMirrorBundleRaw = await readOptionalUtf8(mirrorBundlePath);
  const originalRequestLogRaw = await readOptionalUtf8(requestLogPath);
  const originalRuntimeProofRaw = await readOptionalUtf8(runtimeProofPath);
  const runtimeSourceUrl = "https://example.invalid/runtime/big-win.bundle.js";
  const taskId = "task.runtime.bundle-reopen.project_002.smoke";
  const pageName = "big_win_bundle";

  let run: SmokeRunResult | null = null;
  let payload: BundleReopenPayload | null = null;

  try {
    await fs.mkdir(path.dirname(sourceRuntimeBundlePath), { recursive: true });
    await fs.mkdir(path.dirname(mirrorManifestPath), { recursive: true });
    await fs.mkdir(path.dirname(mirrorBundlePath), { recursive: true });

    const generatedAt = new Date().toISOString();
    await fs.writeFile(sourceRuntimeBundlePath, "console.log('project_002_runtime_bundle_reopen_source_placeholder');\n", "utf8");
    await fs.writeFile(mirrorBundlePath, "console.log('project_002_runtime_bundle_placeholder');\n", "utf8");

    await fs.writeFile(
      sourceBundlePath,
      `${JSON.stringify({
        generatedAt,
        nextTextureFitApplyStep: "Open Runtime and reuse the grounded local-mirror runtime bundle entry for the selected project.",
        pages: [
          {
            pageName,
            pageState: "ready",
            selectedMode: "page-source",
            selectedReason: "Smoke-seeded selected-project runtime reopen from grounded local-mirror runtime bundle evidence.",
            selectedLocalPath: repoSourceRuntimeBundlePath,
            topAffectedSlotName: "smoke.slot.big_win_bundle",
            topAffectedAttachmentName: "smoke.attachment.big_win_bundle",
            affectedLayerCount: 1,
            affectedSlotNames: ["smoke.slot.big_win_bundle"],
            affectedAttachmentNames: ["smoke.attachment.big_win_bundle"],
            regionNames: ["big-win-bundle"],
            nextFitApplyStep: "Open Runtime and keep the local-mirror runtime bundle workbench entry active while launch stays blocked."
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
        nextOperatorAction: "Open Runtime from the modification board and continue from the grounded local-mirror runtime bundle entry.",
        tasks: [
          {
            taskId,
            queueId: "smoke.queue.project_002.runtime_bundle_reopen",
            scenarioId: "smoke.scenario.project_002.runtime_bundle_reopen",
            displayName: "Project 002 Runtime Bundle Reopen Smoke",
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
            rationale: "Smoke-seeded modification task proving selected-project runtime reopen can stay on grounded local-mirror runtime bundle evidence while live launch stays blocked.",
            nextAction: "Open Runtime and verify the local-mirror runtime bundle entry stays project-aware.",
            canOpenCompose: true,
            canOpenRuntime: true
          }
        ]
      }, null, 2)}\n`,
      "utf8"
    );

    await fs.writeFile(
      mirrorManifestPath,
      `${JSON.stringify({
        schemaVersion: "0.1.0",
        projectId,
        mode: "partial-local-runtime-mirror",
        generatedAtUtc: generatedAt,
        publicEntryUrl: "https://example.invalid/runtime/launch",
        resourceVersion: "project-002-bundle-reopen-smoke",
        notes: [
          "Smoke manifest for selected-project local-mirror runtime bundle reopen verification."
        ],
        entries: [
          {
            sourceUrl: runtimeSourceUrl,
            kind: "runtime-bundle",
            repoRelativePath: repoMirrorBundlePath,
            fileType: "js"
          }
        ]
      }, null, 2)}\n`,
      "utf8"
    );

    await fs.rm(requestLogPath, { force: true });
    await fs.rm(runtimeProofPath, { force: true });

    run = await runElectronSelectedProjectBundleReopenSmoke(workspaceRoot);
    const output = summarizeOutput(run.output);
    const lines = run.output
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const mainReadySeen = lines.some((line) => line.includes("MYIDE_LIVE_RUNTIME_SELECTED_PROJECT_REOPEN_MAIN_READY"));
    assert(
      mainReadySeen,
      `Main-process selected-project bundle reopen smoke marker was not emitted. Exit=${run.exitCode} Signal=${run.signal ?? "none"}\n${output}`
    );

    const markerPrefix = "MYIDE_LIVE_RUNTIME_SELECTED_PROJECT_REOPEN_RESULT:";
    const payloadLine = lines.find((line) => line.startsWith(markerPrefix));
    assert(
      payloadLine,
      `Renderer selected-project bundle reopen smoke result marker was not emitted. Exit=${run.exitCode} Signal=${run.signal ?? "none"}\n${output}`
    );

    payload = JSON.parse(payloadLine.slice(markerPrefix.length)) as BundleReopenPayload;
    writeArtifact(payload);

    assert.equal(payload.status, "pass", `Selected-project bundle reopen smoke payload reported failure: ${payload.error ?? "<no error>"}\n${output}`);
    assert.equal(payload.projectId, projectId, `Selected-project bundle reopen smoke did not load ${projectId}.`);
    assert.equal(payload.runtimeLaunchBlocked, true, "Selected-project bundle reopen smoke should keep launch blocked for a partial mirror.");
    assert.equal(payload.runtimeLaunchEntryUrl, null, "Selected-project bundle reopen smoke should not expose an embedded launch URL without a full mirror.");
    assert.equal(payload.pageRuntimeProofLoaded, false, "Selected-project bundle reopen smoke should not rely on a persisted page proof.");
    assert.equal(payload.runtimeWorkbenchHasPageProofEntry, false, "Selected-project bundle reopen smoke should not surface a page-proof runtime entry.");
    assert.equal(payload.taskRuntimeEntryKind, "local-mirror", "Selected-project bundle reopen smoke should report the exact local-mirror runtime trace.");
    assert.equal(payload.taskRuntimeEntrySourceUrl, runtimeSourceUrl, "Selected-project bundle reopen smoke used the wrong runtime source.");
    assert.equal(payload.runtimeWorkbenchEntryKind, "local-mirror-manifest", "Selected-project bundle reopen smoke should reopen from a grounded local-mirror manifest entry.");
    assert.equal(payload.runtimeWorkbenchEntryRequestSource, "local-mirror-manifest", "Selected-project bundle reopen smoke should preserve the local-mirror request source label.");
    assert.equal(payload.runtimeModeSelected, true, "Selected-project bundle reopen smoke did not keep the runtime workbench active.");
    assert.equal(payload.taskRuntimeOpenUsesPersistedPageProof, false, "Selected-project bundle reopen smoke should not report page-proof reopen.");
    assert.equal(payload.taskRuntimeOpenUsesRequestBackedWorkbenchEntry, false, "Selected-project bundle reopen smoke should not report request-backed reopen.");
    assert.equal(payload.taskRuntimeOpenUsesLocalMirrorWorkbenchEntry, true, "Selected-project bundle reopen smoke did not reopen from the local-mirror workbench entry.");
    assert.equal(payload.runtimeDebugHostActionVisible, false, "Selected-project bundle reopen smoke should not expose the runtime Debug Host action for project_002.");
    assert.equal(payload.runtimeSourceDebugHostActionVisible, false, "Selected-project bundle reopen smoke should not expose source-level Debug Host actions for project_002.");
    assert.equal(payload.runtimeStatusHeading, "Selected-project runtime surface", "Selected-project bundle reopen smoke should keep the runtime status heading project-aware.");
    assert.equal(payload.runtimeSurfaceCountLabel, "local-mirror", "Selected-project bundle reopen smoke should expose the exact local-mirror runtime surface label.");
    assert.equal(payload.runtimeSurfaceSummaryTitle, "Local-mirror runtime workbench", "Selected-project bundle reopen smoke should expose the exact local-mirror runtime surface summary title.");
    assert.equal(payload.runtimeStatusSurfaceChipLabel, "local-mirror", "Selected-project bundle reopen smoke should expose the exact local-mirror runtime status chip.");
    assert.equal(payload.runtimeStatusSurfaceCardTitle, "Local-mirror runtime workbench", "Selected-project bundle reopen smoke should expose the exact local-mirror runtime status card title.");
    assert.equal(payload.inspectorSurfaceChipLabel, "local-mirror", "Selected-project bundle reopen smoke should expose the exact local-mirror inspector chip.");
    assert.equal(payload.onboardingSurfaceChipLabel, "local-mirror", "Selected-project bundle reopen smoke should expose the exact local-mirror onboarding chip.");
    assert.equal(payload.onboardingSurfaceCardTitle, "Local-mirror runtime workbench", "Selected-project bundle reopen smoke should expose the exact local-mirror onboarding card title.");
    assert.equal(payload.activeTaskRuntimeChipLabel, "local-mirror", "Selected-project bundle reopen smoke should expose the exact local-mirror active task chip.");
    assert(payload.activeTaskRuntimeContextLine?.includes("Local-mirror runtime workbench"), "Selected-project bundle reopen smoke should expose the exact local-mirror active task runtime context.");
    assert.equal(payload.runtimeStatusMentionsOfficialDailyPath, false, "Selected-project bundle reopen smoke should not claim project_002 is on the official daily runtime path.");
    assert.equal(payload.embeddedRuntimeLaunched, false, "Selected-project bundle reopen smoke should not launch the embedded runtime.");

    console.log("PASS smoke:electron-runtime-selected-project-bundle-reopen");
    console.log(`Project: ${projectId}`);
    console.log(`Task: ${payload.taskId ?? taskId}`);
    console.log(`Runtime source: ${payload.taskRuntimeEntrySourceUrl ?? runtimeSourceUrl}`);
  } finally {
    await restoreOptionalUtf8(handoffPath, originalHandoffRaw);
    await restoreOptionalUtf8(sourceBundlePath, originalSourceBundleRaw);
    await restoreOptionalUtf8(sourceRuntimeBundlePath, originalSourceRuntimeBundleRaw);
    await restoreOptionalUtf8(mirrorManifestPath, originalMirrorManifestRaw);
    await restoreOptionalUtf8(mirrorBundlePath, originalMirrorBundleRaw);
    await restoreOptionalUtf8(requestLogPath, originalRequestLogRaw);
    await restoreOptionalUtf8(runtimeProofPath, originalRuntimeProofRaw);

    await cleanupEmptyDirectory(path.join(reportsRoot, "selected-project-runtime-bundle-reopen"));
    await cleanupEmptyDirectory(path.join(runtimeRoot, "local-mirror", "files", "example.invalid"));
    await cleanupEmptyDirectory(path.join(runtimeRoot, "local-mirror", "files"));
    await cleanupEmptyDirectory(path.join(runtimeRoot, "local-mirror"));
    await cleanupEmptyDirectory(reportsRoot);
    await cleanupEmptyDirectory(runtimeRoot);
    const restoredStatus = await captureGitStatus(workspaceRoot);
    assert.equal(
      restoredStatus,
      baselineStatus,
      `Selected-project bundle reopen smoke should restore the repo status.\nBefore:\n${baselineStatus || "<clean>"}\nAfter:\n${restoredStatus || "<clean>"}`
    );
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  writeArtifact({ status: "fail", error: message });
  console.error(`FAIL smoke:electron-runtime-selected-project-bundle-reopen - ${message}`);
  process.exitCode = 1;
});
