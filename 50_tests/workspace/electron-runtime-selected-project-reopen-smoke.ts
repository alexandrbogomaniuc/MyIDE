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

interface ReopenPayload {
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
  runtimeDebugHostActionVisible?: boolean;
  runtimeSourceDebugHostActionVisible?: boolean;
  runtimeStatusHeading?: string | null;
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
  return process.env.MYIDE_LIVE_RUNTIME_SELECTED_PROJECT_REOPEN_ARTIFACT_PATH || "/tmp/myide-electron-runtime-selected-project-reopen.json";
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

function runElectronSelectedProjectReopenSmoke(workspaceRoot: string): Promise<SmokeRunResult> {
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
  const sourceBundlePath = path.join(reportsRoot, "selected-project-runtime-reopen.smoke.json");
  const sourceAssetPath = path.join(reportsRoot, "selected-project-runtime-reopen", "big-win-ribbon.png");
  const requestLogPath = path.join(runtimeRoot, "local-mirror", "request-log.latest.json");
  const runtimeProofPath = path.join(runtimeRoot, "page-runtime-proofs.latest.json");
  const repoSourceBundlePath = path.relative(workspaceRoot, sourceBundlePath).replace(/\\/g, "/");
  const repoSourceAssetPath = path.relative(workspaceRoot, sourceAssetPath).replace(/\\/g, "/");
  const repoRequestLogPath = path.relative(workspaceRoot, requestLogPath).replace(/\\/g, "/");
  const baselineStatus = await captureGitStatus(workspaceRoot);
  const originalHandoffRaw = await readOptionalUtf8(handoffPath);
  const originalSourceBundleRaw = await readOptionalUtf8(sourceBundlePath);
  const originalSourceAssetRaw = await readOptionalBuffer(sourceAssetPath);
  const originalRequestLogRaw = await readOptionalUtf8(requestLogPath);
  const originalRuntimeProofRaw = await readOptionalUtf8(runtimeProofPath);
  const runtimeSourceUrl = "https://example.invalid/runtime/img/big-win-ribbon.png";
  const taskId = "task.runtime.reopen.project_002.smoke";
  const pageName = "big_win";

  let run: SmokeRunResult | null = null;
  let payload: ReopenPayload | null = null;

  try {
    await fs.mkdir(path.dirname(sourceAssetPath), { recursive: true });
    await fs.mkdir(reportsRoot, { recursive: true });
    await fs.mkdir(path.dirname(requestLogPath), { recursive: true });

    const generatedAt = new Date().toISOString();
    await fs.writeFile(sourceAssetPath, Buffer.from("project_002_runtime_reopen_source_placeholder", "utf8"));
    await fs.writeFile(
      sourceBundlePath,
      `${JSON.stringify({
        generatedAt,
        nextTextureFitApplyStep: "Open Runtime and reuse the request-backed runtime workbench entry for the selected project.",
        pages: [
          {
            pageName,
            pageState: "ready",
            selectedMode: "page-source",
            selectedReason: "Smoke-seeded selected-project runtime reopen from request-backed resource-map evidence.",
            selectedLocalPath: repoSourceAssetPath,
            topAffectedSlotName: "smoke.slot.big_win",
            topAffectedAttachmentName: "smoke.attachment.big_win",
            affectedLayerCount: 1,
            affectedSlotNames: ["smoke.slot.big_win"],
            affectedAttachmentNames: ["smoke.attachment.big_win"],
            regionNames: ["big-win-ribbon"],
            nextFitApplyStep: "Open Runtime and keep the request-backed runtime workbench entry active even while launch stays blocked."
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
        nextOperatorAction: "Open Runtime from the modification board and continue from the request-backed runtime workbench entry.",
        tasks: [
          {
            taskId,
            queueId: "smoke.queue.project_002.runtime_reopen",
            scenarioId: "smoke.scenario.project_002.runtime_reopen",
            displayName: "Project 002 Runtime Reopen Smoke",
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
            supportingArtifactPaths: [repoSourceAssetPath],
            rationale: "Smoke-seeded modification task proving selected-project runtime reopen can stay on grounded request-backed workbench evidence while live launch is blocked.",
            nextAction: "Open Runtime and verify the request-backed workbench entry stays project-aware.",
            canOpenCompose: true,
            canOpenRuntime: true
          }
        ]
      }, null, 2)}\n`,
      "utf8"
    );

    await fs.rm(runtimeProofPath, { force: true });
    await fs.writeFile(
      requestLogPath,
      `${JSON.stringify({
        projectId,
        generatedAtUtc: generatedAt,
        snapshotRepoRelativePath: repoRequestLogPath,
        entryCount: 1,
        entries: [
          {
            canonicalSourceUrl: runtimeSourceUrl,
            latestRequestUrl: runtimeSourceUrl,
            requestSource: "upstream-request",
            lastCaptureMethod: "server-route",
            captureMethods: ["server-route"],
            requestCategory: "static-asset",
            resourceType: "image",
            runtimeRelativePath: "img/big-win-ribbon.png",
            runtimeFilename: "big-win-ribbon.png",
            fileType: "png",
            localMirrorRepoRelativePath: null,
            localMirrorAbsolutePath: null,
            overrideRepoRelativePath: null,
            overrideAbsolutePath: null,
            hitCount: 2,
            lastHitAtUtc: generatedAt,
            lastStage: "smoke",
            stageHitCounts: {
              smoke: 2
            }
          }
        ]
      }, null, 2)}\n`,
      "utf8"
    );

    run = await runElectronSelectedProjectReopenSmoke(workspaceRoot);
    const output = summarizeOutput(run.output);
    const lines = run.output
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const mainReadySeen = lines.some((line) => line.includes("MYIDE_LIVE_RUNTIME_SELECTED_PROJECT_REOPEN_MAIN_READY"));
    assert(
      mainReadySeen,
      `Main-process selected-project reopen smoke marker was not emitted. Exit=${run.exitCode} Signal=${run.signal ?? "none"}\n${output}`
    );

    const markerPrefix = "MYIDE_LIVE_RUNTIME_SELECTED_PROJECT_REOPEN_RESULT:";
    const payloadLine = lines.find((line) => line.startsWith(markerPrefix));
    assert(
      payloadLine,
      `Renderer selected-project reopen smoke result marker was not emitted. Exit=${run.exitCode} Signal=${run.signal ?? "none"}\n${output}`
    );

    payload = JSON.parse(payloadLine.slice(markerPrefix.length)) as ReopenPayload;
    writeArtifact(payload);

    assert.equal(payload.status, "pass", `Selected-project reopen smoke payload reported failure: ${payload.error ?? "<no error>"}\n${output}`);
    assert.equal(payload.projectId, projectId, `Selected-project reopen smoke did not load ${projectId}.`);
    assert.equal(payload.runtimeLaunchBlocked, true, "Selected-project reopen smoke should keep launch blocked.");
    assert.equal(payload.runtimeLaunchEntryUrl, null, "Selected-project reopen smoke should not fake an embedded launch URL.");
    assert.equal(payload.pageRuntimeProofLoaded, false, "Selected-project reopen smoke should not rely on a persisted page proof.");
    assert.equal(payload.runtimeWorkbenchHasPageProofEntry, false, "Selected-project reopen smoke should not surface a page-proof runtime entry.");
    assert(payload.taskRuntimeEntryKind, "Selected-project reopen smoke should match the task through broader runtime evidence.");
    assert.notEqual(payload.taskRuntimeEntryKind, "page-proof", "Selected-project reopen smoke should not match the task through a persisted page proof.");
    assert.equal(payload.taskRuntimeEntrySourceUrl, runtimeSourceUrl, "Selected-project reopen smoke used the wrong runtime source.");
    assert.equal(payload.runtimeWorkbenchEntryKind, "resource-map", "Selected-project reopen smoke should reopen from a request-backed runtime resource-map entry.");
    assert.equal(payload.runtimeWorkbenchEntryRequestSource, "upstream-request", "Selected-project reopen smoke should preserve the selected-project request source.");
    assert.equal(payload.runtimeModeSelected, true, "Selected-project reopen smoke did not keep the runtime workbench active.");
    assert.equal(payload.taskRuntimeOpenUsesPersistedPageProof, false, "Selected-project reopen smoke should not report page-proof reopen.");
    assert.equal(payload.taskRuntimeOpenUsesRequestBackedWorkbenchEntry, true, "Selected-project reopen smoke did not reopen from the request-backed workbench entry.");
    assert.equal(payload.runtimeDebugHostActionVisible, false, "Selected-project reopen smoke should not expose the runtime Debug Host action for project_002.");
    assert.equal(payload.runtimeSourceDebugHostActionVisible, false, "Selected-project reopen smoke should not expose source-level Debug Host actions for project_002.");
    assert.equal(payload.runtimeStatusHeading, "Selected-project runtime surface", "Selected-project reopen smoke should keep the runtime status heading project-aware.");
    assert.equal(payload.runtimeStatusMentionsOfficialDailyPath, false, "Selected-project reopen smoke should not claim project_002 is on the official daily runtime path.");
    assert.equal(payload.embeddedRuntimeLaunched, false, "Selected-project reopen smoke should not launch the embedded runtime.");

    console.log("PASS smoke:electron-runtime-selected-project-reopen");
    console.log(`Project: ${projectId}`);
    console.log(`Task: ${payload.taskId ?? taskId}`);
    console.log(`Runtime source: ${payload.taskRuntimeEntrySourceUrl ?? runtimeSourceUrl}`);
  } finally {
    await restoreOptionalUtf8(handoffPath, originalHandoffRaw);
    await restoreOptionalUtf8(sourceBundlePath, originalSourceBundleRaw);
    await restoreOptionalBuffer(sourceAssetPath, originalSourceAssetRaw);
    await restoreOptionalUtf8(requestLogPath, originalRequestLogRaw);
    await restoreOptionalUtf8(runtimeProofPath, originalRuntimeProofRaw);

    await cleanupEmptyDirectory(path.join(reportsRoot, "selected-project-runtime-reopen"));
    await cleanupEmptyDirectory(path.join(runtimeRoot, "local-mirror"));
    await cleanupEmptyDirectory(reportsRoot);
    await cleanupEmptyDirectory(runtimeRoot);
    const restoredStatus = await captureGitStatus(workspaceRoot);
    assert.equal(
      restoredStatus,
      baselineStatus,
      `Selected-project reopen smoke should restore the repo status.\nBefore:\n${baselineStatus || "<clean>"}\nAfter:\n${restoredStatus || "<clean>"}`
    );
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  writeArtifact({ status: "fail", error: message });
  console.error(`FAIL smoke:electron-runtime-selected-project-reopen - ${message}`);
  process.exitCode = 1;
});
