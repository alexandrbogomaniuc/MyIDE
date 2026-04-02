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

interface LiveDonorImportPayload {
  status?: string;
  error?: string;
  startedAt?: string;
  projectId?: string;
  availableDonorAssetCount?: number | null;
  availableFileTypes?: string[];
  createDropIntentVisible?: boolean;
  replaceDropIntentVisible?: boolean;
  marqueeSelectionVisible?: boolean;
  marqueeSelectionCompleted?: boolean;
  selectedObjectCountAfterMarquee?: number | null;
  selectedObjectCountAfterExpansion?: number | null;
  alignSelectionCompleted?: boolean;
  distributionCompleted?: boolean;
  sourceAssetFocusCompleted?: boolean;
  sourceEvidenceFocusCompleted?: boolean;
  taskKitPageRuntimeTraceCompleted?: boolean;
  taskKitPageRuntimeTraceMode?: string | null;
  taskKitPageRuntimeProfileId?: string | null;
  taskKitPageRuntimeSourceUrl?: string | null;
  taskKitPageRuntimeSourceLabel?: string | null;
  taskKitPageRuntimeBlocked?: string | null;
  taskKitPageRuntimePromotedToDirectLink?: boolean;
  taskKitPageRuntimePromotedSourceUrl?: string | null;
  taskKitTaskRuntimeOpenUsesPageProof?: boolean;
  importedAssetCount?: number | null;
  importedFileTypes?: string[];
  importModes?: string[];
  importedAssets?: Array<{
    donorAssetId?: string | null;
    donorEvidenceId?: string | null;
    fileType?: string | null;
    filename?: string | null;
    objectId?: string | null;
    importMode?: string | null;
    importedX?: number | null;
    importedY?: number | null;
    composedX?: number | null;
    composedY?: number | null;
    targetLayerId?: string | null;
    importedLayerId?: string | null;
    draggedX?: number | null;
    draggedY?: number | null;
    reloadedLayerId?: string | null;
    reloadedX?: number | null;
    reloadedY?: number | null;
  }>;
  replacementStarted?: boolean;
  replacementCompleted?: boolean;
  replacementMode?: string | null;
  replacementPersistVerified?: boolean;
  replacementLinkageVerified?: boolean;
  replacementObjectId?: string | null;
  replacementDonorAssetId?: string | null;
  replacementDonorEvidenceId?: string | null;
  replacementLayerId?: string | null;
  replacementX?: number | null;
  replacementY?: number | null;
  replacementReloadedLayerId?: string | null;
  replacementReloadedX?: number | null;
  replacementReloadedY?: number | null;
  donorAssetId?: string | null;
  donorEvidenceId?: string | null;
  objectId?: string | null;
  preloadExecuted?: boolean;
  myideApiExposed?: boolean;
  projectLoaded?: boolean;
  assetPaletteReady?: boolean;
  importStarted?: boolean;
  importCompleted?: boolean;
  dragStarted?: boolean;
  dragMoved?: boolean;
  dragCompleted?: boolean;
  resizeStarted?: boolean;
  resizeCompleted?: boolean;
  resizePersistVerified?: boolean;
  saveSucceeded?: boolean;
  reloadSucceeded?: boolean;
  internalPersistVerified?: boolean;
  replaySyncVerified?: boolean;
  donorLinkageVerified?: boolean;
  objectCountBefore?: number | null;
  objectCountAfterImport?: number | null;
  objectCountAfterReload?: number | null;
  importedX?: number | null;
  importedY?: number | null;
  draggedX?: number | null;
  draggedY?: number | null;
  resizedWidth?: number | null;
  resizedHeight?: number | null;
  reloadedX?: number | null;
  reloadedY?: number | null;
  reloadedWidth?: number | null;
  reloadedHeight?: number | null;
  syncStatus?: string | null;
  replayPath?: string | null;
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
  return process.env.MYIDE_LIVE_DONOR_IMPORT_ARTIFACT_PATH || "/tmp/myide-electron-donor-import.json";
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

function runCommand(command: string, args: string[]): Promise<{ exitCode: number | null; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      env: process.env,
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

async function copyIfPresent(sourcePath: string, backupPath: string): Promise<boolean> {
  if (!existsSync(sourcePath)) {
    return false;
  }

  await fs.mkdir(path.dirname(backupPath), { recursive: true });
  await fs.cp(sourcePath, backupPath, { recursive: true, force: true });
  return true;
}

async function restoreFromBackup(sourcePath: string, backupPath: string, existed: boolean): Promise<void> {
  await fs.rm(sourcePath, { recursive: true, force: true });
  if (existed) {
    await fs.mkdir(path.dirname(sourcePath), { recursive: true });
    await fs.cp(backupPath, sourcePath, { recursive: true, force: true });
  }
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

function runElectronLiveDonorImportSmoke(workspaceRoot: string): Promise<SmokeRunResult> {
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
        MYIDE_LIVE_DONOR_IMPORT_SMOKE: "1",
        MYIDE_LIVE_DONOR_IMPORT_TIMEOUT_MS: process.env.MYIDE_LIVE_DONOR_IMPORT_TIMEOUT_MS || "90000"
      },
      stdio: ["ignore", "pipe", "pipe"]
    });

    let output = "";
    let lineBuffer = "";
    const markerPrefix = "MYIDE_LIVE_DONOR_IMPORT_RESULT:";

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

async function readJson(filePath: string): Promise<unknown> {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw) as unknown;
}

function getInternalObject(document: unknown, objectId: string): Record<string, unknown> {
  const objects = Array.isArray((document as { objects?: unknown[] })?.objects)
    ? ((document as { objects: Array<Record<string, unknown>> }).objects)
    : [];
  const match = objects.find((entry) => entry?.id === objectId);
  assert(match, `Editable objects.json must contain ${objectId}.`);
  return match;
}

function getReplayNode(project: unknown, objectId: string): Record<string, unknown> {
  const scenes = Array.isArray((project as { scenes?: unknown[] })?.scenes)
    ? ((project as { scenes: Array<Record<string, unknown>> }).scenes)
    : [];

  for (const scene of scenes) {
    const layers = Array.isArray(scene?.layers)
      ? (scene.layers as Array<Record<string, unknown>>)
      : [];
    for (const layer of layers) {
      const nodes = Array.isArray(layer?.nodes)
        ? (layer.nodes as Array<Record<string, unknown>>)
        : [];
      const match = nodes.find((node) => node?.nodeId === objectId);
      if (match) {
        return match;
      }
    }
  }

  assert.fail(`Replay-facing project.json must contain node ${objectId}.`);
}

async function main(): Promise<void> {
  const workspaceRoot = resolveWorkspaceRoot();
  const projectRoot = path.join(workspaceRoot, "40_projects", "project_001");
  const internalRoot = path.join(projectRoot, "internal");
  const replayProjectPath = path.join(projectRoot, "project.json");
  const registryPath = path.join(workspaceRoot, "40_projects", "registry.json");
  const logsRoot = path.join(projectRoot, "logs");
  const snapshotRoot = path.join(logsRoot, "editor-snapshots");
  const historyPath = path.join(logsRoot, "editor-save-history.jsonl");
  const backupRoot = await fs.mkdtemp(path.join(os.tmpdir(), "myide-live-donor-import-backup-"));

  const restorePlan = [
    { source: registryPath, backup: path.join(backupRoot, "registry.json"), existed: false },
    { source: internalRoot, backup: path.join(backupRoot, "internal"), existed: false },
    { source: replayProjectPath, backup: path.join(backupRoot, "project.json"), existed: false },
    { source: snapshotRoot, backup: path.join(backupRoot, "editor-snapshots"), existed: false },
    { source: historyPath, backup: path.join(backupRoot, "editor-save-history.jsonl"), existed: false }
  ];

  const baselineStatus = await captureGitStatus(workspaceRoot);
  for (const item of restorePlan) {
    item.existed = await copyIfPresent(item.source, item.backup);
  }

  let result: SmokeRunResult | null = null;
  let payload: LiveDonorImportPayload | null = null;
  let restoredStatus = "";

  try {
    result = await runElectronLiveDonorImportSmoke(workspaceRoot);
    const outputSummary = summarizeOutput(result.output);
    const lines = result.output
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const mainReadySeen = lines.some((line) => line.includes("MYIDE_LIVE_DONOR_IMPORT_MAIN_READY"));
    assert(
      mainReadySeen,
      `Main-process donor import smoke marker was not emitted. Exit=${result.exitCode} Signal=${result.signal ?? "none"}\n${outputSummary}`
    );

    const markerPrefix = "MYIDE_LIVE_DONOR_IMPORT_RESULT:";
    const payloadLine = lines.find((line) => line.startsWith(markerPrefix));
    assert(
      payloadLine,
      `Renderer donor import smoke result marker was not emitted. Exit=${result.exitCode} Signal=${result.signal ?? "none"}\n${outputSummary}`
    );

    payload = JSON.parse(payloadLine.slice(markerPrefix.length)) as LiveDonorImportPayload;
    assert.equal(payload.status, "pass", `Live donor import smoke reported failure: ${payload.error ?? "unknown error"}`);
    assert.equal(payload.preloadExecuted, true, "Preload execution marker was false.");
    assert.equal(payload.myideApiExposed, true, "Renderer did not observe window.myideApi.");
    assert.equal(payload.projectLoaded, true, "Renderer did not load project_001.");
    assert.equal(payload.assetPaletteReady, true, "Renderer did not render the donor asset palette.");
    assert.equal(payload.importStarted, true, "Renderer did not begin donor import drag/drop.");
    assert.equal(payload.importCompleted, true, "Renderer did not import a donor asset.");
    assert.equal(payload.createDropIntentVisible, true, "Renderer did not surface the create drop intent on empty canvas.");
    assert.equal(payload.dragStarted, true, "Renderer did not start dragging the imported object.");
    assert.equal(payload.dragMoved, true, "Renderer did not move the imported object.");
    assert.equal(payload.dragCompleted, true, "Renderer did not complete the imported object drag.");
    assert.equal(payload.resizeStarted, true, "Renderer did not start the donor-backed resize interaction.");
    assert.equal(payload.resizeCompleted, true, "Renderer did not complete the donor-backed resize interaction.");
    assert.equal(payload.resizePersistVerified, true, "Renderer did not preserve the donor-backed resize through reload.");
    assert.equal(payload.saveSucceeded, true, "Renderer did not save after donor import.");
    assert.equal(payload.reloadSucceeded, true, "Renderer did not reload after donor import.");
    assert.equal(payload.internalPersistVerified, true, "Renderer did not confirm internal donor linkage after reload.");
    assert.equal(payload.replaySyncVerified, true, "Renderer did not confirm replay asset ref sync after donor import.");
    assert.equal(payload.donorLinkageVerified, true, "Renderer did not confirm replay donor linkage metadata after donor import.");
    assert(
      (payload.importModes ?? []).every((mode) => mode === "synthetic-drop" || mode === "drop-handler-bridge"),
      "Renderer relied on a donor import fallback outside the bounded drag/drop composition path."
    );
    assert(Array.isArray(payload.availableFileTypes), "Renderer did not report available donor file types.");
    assert(Array.isArray(payload.importedFileTypes), "Renderer did not report imported donor file types.");
    assert(Array.isArray(payload.importedAssets), "Renderer did not report imported donor assets.");
    assert.equal(payload.importedAssets.length, payload.importedAssetCount, "Imported asset count did not match the payload list.");
    assert(payload.importedAssets.length >= 1, "Renderer did not report any imported donor assets.");
    if ((payload.availableDonorAssetCount ?? 0) >= 2) {
      assert(payload.importedAssets.length >= 2, "Renderer did not prove more than one donor asset import even though multiple donor assets were available.");
    }
    if ((payload.availableFileTypes ?? []).includes("png") && (payload.availableFileTypes ?? []).includes("webp")) {
      assert((payload.importedFileTypes ?? []).includes("png"), "Renderer did not import a grounded PNG donor asset.");
      assert((payload.importedFileTypes ?? []).includes("webp"), "Renderer did not import a grounded WEBP donor asset.");
    }
    for (const importedAsset of payload.importedAssets) {
      assert(
        importedAsset.importMode === "synthetic-drop" || importedAsset.importMode === "drop-handler-bridge",
        `Imported donor asset ${importedAsset.donorAssetId ?? "unknown"} did not use the bounded donor drop path.`
      );
      assert.equal(importedAsset.importedLayerId, importedAsset.targetLayerId, `Imported donor asset ${importedAsset.donorAssetId ?? "unknown"} did not land on the intended layer.`);
      assert.equal(importedAsset.reloadedLayerId, importedAsset.targetLayerId, `Reloaded donor object ${importedAsset.objectId ?? "unknown"} did not stay on its intended layer.`);
    }
    assert.equal(payload.replacementStarted, true, "Renderer did not attempt the donor-backed replacement proof.");
    assert.equal(payload.replaceDropIntentVisible, true, "Renderer did not surface the replace drop intent on an editable object.");
    assert.equal(payload.replacementCompleted, true, "Renderer did not complete the donor-backed replacement proof.");
    assert(
      payload.replacementMode === "synthetic-drop" || payload.replacementMode === "drop-handler-bridge",
      "Renderer relied on a replacement path outside the bounded donor drop workflow."
    );
    assert.equal(payload.marqueeSelectionVisible, true, "Renderer did not surface the canvas marquee selection feedback.");
    assert.equal(payload.marqueeSelectionCompleted, true, "Renderer did not complete the multi-object marquee selection proof.");
    assert(
      (payload.selectedObjectCountAfterMarquee ?? 0) >= 2,
      "Renderer did not keep at least two objects selected after the marquee selection proof."
    );
    assert.equal(payload.alignSelectionCompleted, true, "Renderer did not complete the multi-object alignment proof.");
    assert(
      (payload.selectedObjectCountAfterExpansion ?? 0) >= 3,
      "Renderer did not expand the selection to at least three objects before distribution."
    );
    assert.equal(payload.distributionCompleted, true, "Renderer did not complete the multi-object distribution proof.");
    assert.equal(payload.sourceAssetFocusCompleted, true, "Renderer did not complete the source donor asset focus jump.");
    assert.equal(payload.sourceEvidenceFocusCompleted, true, "Renderer did not complete the source donor evidence focus jump.");
    assert.equal(payload.taskKitPageRuntimeTraceCompleted, true, "Renderer did not complete the page-aware runtime trace jump from the active modification guide.");
    assert(
      payload.taskKitPageRuntimeTraceMode === "matched-workbench"
        || payload.taskKitPageRuntimeTraceMode === "debug-host-pass"
        || payload.taskKitPageRuntimeTraceMode === "debug-host-blocked",
      "Renderer did not report whether the page-aware runtime trace used a matched workbench source, a passing Debug Host proof, or a concrete Debug Host blocker."
    );
    if (payload.taskKitPageRuntimeTraceMode === "debug-host-pass" || payload.taskKitPageRuntimeTraceMode === "debug-host-blocked") {
      assert.equal(
        payload.taskKitPageRuntimeProfileId,
        "max-bet",
        "Renderer did not use the scenario-recommended bounded Runtime Debug Host profile for the active big_win task."
      );
    }
    if (payload.taskKitPageRuntimeTraceMode === "debug-host-pass") {
      assert.ok(
        typeof payload.taskKitPageRuntimeSourceUrl === "string"
          && /big_win|big-win/i.test(payload.taskKitPageRuntimeSourceUrl),
        `Renderer did not land the page-aware Runtime Debug Host proof on a big_win-family runtime asset. Saw ${payload.taskKitPageRuntimeSourceUrl ?? "<missing>"}.`
      );
    }
    assert.equal(
      payload.taskKitPageRuntimePromotedToDirectLink,
      true,
      "Renderer did not promote the page-aware runtime proof into a direct runtime link after the proof pass."
    );
    assert.ok(
      typeof payload.taskKitPageRuntimePromotedSourceUrl === "string"
        && /big_win|big-win/i.test(payload.taskKitPageRuntimePromotedSourceUrl),
      `Renderer did not keep a big_win-family source on the promoted direct runtime link. Saw ${payload.taskKitPageRuntimePromotedSourceUrl ?? "<missing>"}.`
    );
    assert.equal(
      payload.taskKitTaskRuntimeOpenUsesPageProof,
      true,
      "Renderer did not make task-level Open Runtime reuse the promoted page-aware runtime proof."
    );
    assert.equal(payload.replacementPersistVerified, true, "Renderer did not preserve the donor-backed replacement layout/layer after reload.");
    assert.equal(payload.replacementLinkageVerified, true, "Renderer did not preserve donor linkage for the donor-backed replacement after reload.");
    assert.equal(payload.replacementReloadedLayerId, payload.replacementLayerId, "Renderer reloaded the donor-backed replacement on a different layer.");
    assert(
      typeof payload.resizedWidth === "number" && typeof payload.resizedHeight === "number",
      "Renderer did not report resized donor-backed image dimensions."
    );
    assert(
      payload.reloadedWidth === payload.resizedWidth && payload.reloadedHeight === payload.resizedHeight,
      "Renderer did not preserve the resized donor-backed image dimensions after reload."
    );

    const internalDocument = await readJson(path.join(internalRoot, "objects.json"));
    const replayProject = await readJson(replayProjectPath);
    for (const importedAsset of payload.importedAssets) {
      const objectId = importedAsset.objectId;
      const donorAssetId = importedAsset.donorAssetId;
      const donorEvidenceId = importedAsset.donorEvidenceId;
      assert(objectId, "Renderer did not report an imported object id.");
      assert(donorAssetId, "Renderer did not report an imported donor asset id.");
      assert(donorEvidenceId, "Renderer did not report an imported donor evidence id.");

      const internalObject = getInternalObject(internalDocument, objectId);
      const replayNode = getReplayNode(replayProject, objectId);
      const internalDonorAsset = (internalObject.donorAsset ?? {}) as Record<string, unknown>;
      const replayExtensions = (replayNode.extensions ?? {}) as Record<string, unknown>;
      const replayDonorAsset = (replayExtensions.donorAsset ?? {}) as Record<string, unknown>;
      const replayEvidenceRefs = Array.isArray(replayExtensions.evidenceRefs) ? replayExtensions.evidenceRefs : [];

      assert.equal(internalObject.assetRef, donorAssetId, `Editable object ${objectId} did not persist donor assetRef.`);
      assert.equal(internalDonorAsset.assetId, donorAssetId, `Editable object ${objectId} did not persist donor asset metadata.`);
      assert.equal(internalDonorAsset.evidenceId, donorEvidenceId, `Editable object ${objectId} did not persist donor evidence metadata.`);
      assert.equal(replayNode.assetRef, donorAssetId, `Replay node ${objectId} did not persist donor assetRef.`);
      assert.equal(replayDonorAsset.assetId, donorAssetId, `Replay node ${objectId} did not persist donor asset metadata.`);
      assert.equal(replayDonorAsset.evidenceId, donorEvidenceId, `Replay node ${objectId} did not persist donor evidence metadata.`);
      assert(replayEvidenceRefs.includes(donorEvidenceId), `Replay node ${objectId} did not persist donor evidenceRefs.`);
      assert.equal(internalObject.layerId, importedAsset.targetLayerId, `Editable object ${objectId} did not persist its intended donor layer.`);
      if (objectId === payload.objectId && payload.resizedWidth && payload.resizedHeight) {
        assert.equal(internalObject.width, payload.resizedWidth, `Editable object ${objectId} did not persist the resized width.`);
        assert.equal(internalObject.height, payload.resizedHeight, `Editable object ${objectId} did not persist the resized height.`);
      }
    }
    if (payload.replacementObjectId && payload.replacementDonorAssetId && payload.replacementDonorEvidenceId) {
      const replacementInternalObject = getInternalObject(internalDocument, payload.replacementObjectId);
      const replacementReplayNode = getReplayNode(replayProject, payload.replacementObjectId);
      const replacementInternalDonorAsset = (replacementInternalObject.donorAsset ?? {}) as Record<string, unknown>;
      const replacementReplayExtensions = (replacementReplayNode.extensions ?? {}) as Record<string, unknown>;
      const replacementReplayDonorAsset = (replacementReplayExtensions.donorAsset ?? {}) as Record<string, unknown>;
      const replacementReplayEvidenceRefs = Array.isArray(replacementReplayExtensions.evidenceRefs)
        ? replacementReplayExtensions.evidenceRefs
        : [];

      assert.equal(replacementInternalObject.assetRef, payload.replacementDonorAssetId, "Replacement object did not persist donor assetRef.");
      assert.equal(replacementInternalDonorAsset.assetId, payload.replacementDonorAssetId, "Replacement object did not persist donor asset metadata.");
      assert.equal(replacementInternalDonorAsset.evidenceId, payload.replacementDonorEvidenceId, "Replacement object did not persist donor evidence metadata.");
      assert.equal(replacementInternalObject.layerId, payload.replacementLayerId, "Replacement object did not persist its layer.");
      assert.equal(replacementReplayNode.assetRef, payload.replacementDonorAssetId, "Replay replacement node did not persist donor assetRef.");
      assert.equal(replacementReplayDonorAsset.assetId, payload.replacementDonorAssetId, "Replay replacement node did not persist donor asset metadata.");
      assert.equal(replacementReplayDonorAsset.evidenceId, payload.replacementDonorEvidenceId, "Replay replacement node did not persist donor evidence metadata.");
      assert(replacementReplayEvidenceRefs.includes(payload.replacementDonorEvidenceId), "Replay replacement node did not persist donor evidenceRefs.");
    }
    assert.equal(
      result.exitCode,
      0,
      `Electron donor import smoke exited with code ${result.exitCode} (signal ${result.signal ?? "none"}).\n${outputSummary}`
    );
  } catch (error) {
    writeArtifact({
      status: "fail",
      artifactPath: getArtifactPath(),
      baselineStatus,
      result,
      payload,
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  } finally {
    for (const item of restorePlan) {
      await restoreFromBackup(item.source, item.backup, item.existed);
    }
    restoredStatus = await captureGitStatus(workspaceRoot);
    await fs.rm(backupRoot, { recursive: true, force: true });
  }

  assert.equal(
    restoredStatus,
    baselineStatus,
    `Repository status diverged after restoring the donor import smoke.\nBefore:\n${baselineStatus || "<clean>"}\nAfter:\n${restoredStatus || "<clean>"}`
  );

  writeArtifact({
    status: "pass",
    artifactPath: getArtifactPath(),
    baselineStatus,
    restoredStatus,
    result,
    payload
  });

  console.log("PASS smoke:electron-donor-import");
  console.log(`Imported donor assets: ${(payload?.importedAssets ?? []).map((entry) => `${entry.donorAssetId} -> ${entry.objectId}`).join(", ")}`);
  console.log(`Replay path: ${payload?.replayPath}`);
  console.log(`Artifact: ${getArtifactPath()}`);
  console.log(`Repo status restored: ${restoredStatus || "<clean>"}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`FAIL smoke:electron-donor-import - ${message}`);
  process.exitCode = 1;
});
