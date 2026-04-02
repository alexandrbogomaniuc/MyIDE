import { app, BrowserWindow, ipcMain, session } from "electron";
import { existsSync } from "node:fs";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import path from "node:path";
import { loadProjectSlice } from "./projectSlice";
import { createProjectFromInput, type ShellCreateProjectInput } from "../workspace/createProject";
import { saveEditableProjectData, type EditableProjectData } from "../workspace/editableProject";
import { prepareProjectModificationHandoff } from "../workspace/modificationHandoff";
import { loadWorkspaceSlice } from "./workspaceSlice";
import {
  buildRuntimeAssetOverrideRedirectMap,
  buildRuntimeAssetOverrideStatus,
  clearRuntimeAssetOverride,
  createRuntimeAssetOverride,
  type RuntimeAssetOverrideHitInfo
} from "../workspace/donorOverride";
import {
  buildProjectDonorAssetIndex,
  readProjectDonorAssetIndex,
  type IndexedDonorAsset
} from "../../tools/donor-assets/shared";
import {
  buildLocalRuntimeLaunchHtml,
  buildLocalRuntimeMirrorProxyUrl,
  buildLocalRuntimeMirrorRedirectMap,
  findLocalRuntimeMirrorEntry,
  findLocalRuntimeMirrorEntryByRelativePath,
  buildLocalRuntimeMirrorStatus,
  getLocalRuntimeMirrorPort,
  readLocalRuntimeMirrorFile,
  readLocalRuntimeMirrorFileByRelativePath,
  type LocalRuntimeMirrorStatus
} from "../runtime/localRuntimeMirror";
import {
  buildRuntimeResourceMapStatus,
  exportRuntimeResourceMapSnapshotSync,
  recordRuntimeResourceRequest,
  resetRuntimeResourceMap
} from "../runtime/runtimeResourceMap";
import {
  preferUpstreamRuntimeDebugCandidate,
  buildRuntimeDebugCenterPickScript,
  buildRuntimeDebugPrimeAssetRequestScript,
  buildRuntimeDebugStatusScript,
  selectRuntimeDebugBridgeAssetCandidate,
  selectRuntimeDebugCandidate,
  type RuntimeDebugBridgeStatus,
  type RuntimeDebugPickPayload
} from "../runtime/runtimeDebugHost";
import { captureNextTargets } from "../../tools/donor-scan/captureNextTargets";
import { runFamilyAction } from "../../tools/donor-scan/runFamilyAction";
import { runScenarioScan } from "../../tools/donor-scan/runScenarioScan";
import { runPromotionQueue } from "../../tools/donor-scan/runPromotionQueue";
import { runSectionAction } from "../../tools/donor-scan/runSectionAction";
import { getScenarioProfile } from "../../tools/donor-scan/scenarioProfiles";

const isBridgeSmokeMode = process.env.MYIDE_BRIDGE_SMOKE === "1";
const isRuntimeDebugSmokeMode = process.env.MYIDE_RUNTIME_DEBUG_SMOKE === "1";
const isRuntimeDebugHostMode = process.env.MYIDE_RUNTIME_DEBUG_HOST === "1" || isRuntimeDebugSmokeMode;
const isLivePersistSmokeMode = process.env.MYIDE_LIVE_PERSIST_SMOKE === "1";
const isLiveDragSmokeMode = process.env.MYIDE_LIVE_DRAG_SMOKE === "1";
const isLiveCreateDragSmokeMode = process.env.MYIDE_LIVE_CREATE_DRAG_SMOKE === "1";
const isLiveDonorImportSmokeMode = process.env.MYIDE_LIVE_DONOR_IMPORT_SMOKE === "1";
const isLiveRuntimeSmokeMode = process.env.MYIDE_LIVE_RUNTIME_SMOKE === "1";
const isLiveDuplicateDeleteSmokeMode = process.env.MYIDE_LIVE_DUPLICATE_DELETE_SMOKE === "1";
const isLiveReorderSmokeMode = process.env.MYIDE_LIVE_REORDER_SMOKE === "1";
const isLiveLayerReassignSmokeMode = process.env.MYIDE_LIVE_LAYER_REASSIGN_SMOKE === "1";
const isLiveResizeSmokeMode = process.env.MYIDE_LIVE_RESIZE_SMOKE === "1";
const isLiveAlignSmokeMode = process.env.MYIDE_LIVE_ALIGN_SMOKE === "1";
const isLiveUndoRedoSmokeMode = process.env.MYIDE_LIVE_UNDO_REDO_SMOKE === "1";
const shouldShowLiveRuntimeWindow = process.env.MYIDE_LIVE_RUNTIME_SHOW === "1";
const shouldShowRuntimeDebugWindow = process.env.MYIDE_RUNTIME_DEBUG_SHOW === "1" || (isRuntimeDebugHostMode && !isRuntimeDebugSmokeMode);
const shouldKeepLivePersistWindowOpen = process.env.MYIDE_LIVE_PERSIST_KEEP_OPEN === "1";
const shouldShowLivePersistWindow = process.env.MYIDE_LIVE_PERSIST_SHOW === "1" || shouldKeepLivePersistWindowOpen;
const shouldKeepLiveDragWindowOpen = process.env.MYIDE_LIVE_DRAG_KEEP_OPEN === "1";
const shouldShowLiveDragWindow = process.env.MYIDE_LIVE_DRAG_SHOW === "1" || shouldKeepLiveDragWindowOpen;
const shouldKeepLiveCreateDragWindowOpen = process.env.MYIDE_LIVE_CREATE_DRAG_KEEP_OPEN === "1";
const shouldShowLiveCreateDragWindow = process.env.MYIDE_LIVE_CREATE_DRAG_SHOW === "1" || shouldKeepLiveCreateDragWindowOpen;
const shouldKeepLiveDuplicateDeleteWindowOpen = process.env.MYIDE_LIVE_DUPLICATE_DELETE_KEEP_OPEN === "1";
const shouldShowLiveDuplicateDeleteWindow = process.env.MYIDE_LIVE_DUPLICATE_DELETE_SHOW === "1" || shouldKeepLiveDuplicateDeleteWindowOpen;
const shouldKeepLiveReorderWindowOpen = process.env.MYIDE_LIVE_REORDER_KEEP_OPEN === "1";
const shouldShowLiveReorderWindow = process.env.MYIDE_LIVE_REORDER_SHOW === "1" || shouldKeepLiveReorderWindowOpen;
const shouldKeepLiveLayerReassignWindowOpen = process.env.MYIDE_LIVE_LAYER_REASSIGN_KEEP_OPEN === "1";
const shouldShowLiveLayerReassignWindow = process.env.MYIDE_LIVE_LAYER_REASSIGN_SHOW === "1" || shouldKeepLiveLayerReassignWindowOpen;
const shouldKeepLiveResizeWindowOpen = process.env.MYIDE_LIVE_RESIZE_KEEP_OPEN === "1";
const shouldShowLiveResizeWindow = process.env.MYIDE_LIVE_RESIZE_SHOW === "1" || shouldKeepLiveResizeWindowOpen;
const shouldKeepLiveAlignWindowOpen = process.env.MYIDE_LIVE_ALIGN_KEEP_OPEN === "1";
const shouldShowLiveAlignWindow = process.env.MYIDE_LIVE_ALIGN_SHOW === "1" || shouldKeepLiveAlignWindowOpen;
const shouldKeepLiveUndoRedoWindowOpen = process.env.MYIDE_LIVE_UNDO_REDO_KEEP_OPEN === "1";
const shouldShowLiveUndoRedoWindow = process.env.MYIDE_LIVE_UNDO_REDO_SHOW === "1" || shouldKeepLiveUndoRedoWindowOpen;
const shouldDisableHardwareAcceleration = process.env.MYIDE_DISABLE_HARDWARE_ACCELERATION === "1";

interface BridgeHealthSnapshot {
  preloadPath: string;
  preloadExists: boolean;
  preloadExecuted: boolean;
  bridgeExposed: boolean;
  rendererReady: boolean;
  lastRendererReadyAt: string | null;
  lastPingAt: string | null;
  lastProjectLoadAt: string | null;
  lastProjectLoadRequestedProjectId: string | null;
  lastSelectedProjectId: string | null;
  lastProjectLoadError: string | null;
  workspaceProjectCount: number;
}

interface BridgeSmokePayload {
  status?: string;
  error?: string;
}

interface LivePersistSmokePayload {
  status?: string;
  error?: string;
}

interface LiveDragSmokePayload {
  status?: string;
  error?: string;
}

interface LiveCreateDragSmokePayload {
  status?: string;
  error?: string;
}

interface LiveDonorImportSmokePayload {
  status?: string;
  error?: string;
}

interface LiveRuntimeSmokePayload {
  status?: string;
  error?: string;
}

interface RuntimeDebugSmokePayload {
  status?: string;
  error?: string;
}

interface RuntimeDebugHostOptions {
  showWindow?: boolean;
  smokeMode?: boolean;
  closeWhenDone?: boolean;
  proofMode?: boolean;
  profileId?: string | null;
  candidateHintTokens?: string[] | null;
}

type RuntimeDebugHostResult = Record<string, unknown>;

interface LiveDuplicateDeleteSmokePayload {
  status?: string;
  error?: string;
}

interface LiveReorderSmokePayload {
  status?: string;
  error?: string;
}

interface LiveLayerReassignSmokePayload {
  status?: string;
  error?: string;
}

interface LiveResizeSmokePayload {
  status?: string;
  error?: string;
}

interface LiveAlignSmokePayload {
  status?: string;
  error?: string;
}

interface LiveUndoRedoSmokePayload {
  status?: string;
  error?: string;
}

const bridgeHealthState: BridgeHealthSnapshot = createBridgeHealthSnapshot(resolvePreloadPath());
let activeBridgeSmokeReporter: ((payload: BridgeSmokePayload) => void) | null = null;
let activeLivePersistSmokeReporter: ((payload: LivePersistSmokePayload) => void) | null = null;
let activeLiveDragSmokeReporter: ((payload: LiveDragSmokePayload) => void) | null = null;
let activeLiveCreateDragSmokeReporter: ((payload: LiveCreateDragSmokePayload) => void) | null = null;
let activeLiveDonorImportSmokeReporter: ((payload: LiveDonorImportSmokePayload) => void) | null = null;
let activeLiveRuntimeSmokeReporter: ((payload: LiveRuntimeSmokePayload) => void) | null = null;
let activeLiveDuplicateDeleteSmokeReporter: ((payload: LiveDuplicateDeleteSmokePayload) => void) | null = null;
let activeLiveReorderSmokeReporter: ((payload: LiveReorderSmokePayload) => void) | null = null;
let activeLiveLayerReassignSmokeReporter: ((payload: LiveLayerReassignSmokePayload) => void) | null = null;
let activeLiveResizeSmokeReporter: ((payload: LiveResizeSmokePayload) => void) | null = null;
let activeLiveAlignSmokeReporter: ((payload: LiveAlignSmokePayload) => void) | null = null;
let activeLiveUndoRedoSmokeReporter: ((payload: LiveUndoRedoSmokePayload) => void) | null = null;
let runtimeAssetOverrideRedirectMap = new Map<string, string>();
let runtimeLocalMirrorRedirectMap = new Map<string, string>();
let runtimeAssetOverrideInterceptionInstalled = false;
const runtimeAssetOverrideHits = new Map<string, RuntimeAssetOverrideHitInfo>();
const runtimeWebviewPartition = "persist:myide-runtime-project001";
const runtimeDebugPartition = "persist:myide-runtime-debug-project001";
let runtimeLocalMirrorStatus: LocalRuntimeMirrorStatus | null = null;
let runtimeLocalMirrorServer: Server | null = null;
let runtimeRequestStage = "launch";
const recentRuntimeObservationFingerprints = new Map<string, number>();
let activeRuntimeDebugWindow: BrowserWindow | null = null;
let lastRuntimeDebugResult: RuntimeDebugHostResult | null = null;

function resolvePreloadPath(): string {
  return path.resolve(__dirname, "preload.js");
}

function resolveRuntimeInspectorPreloadPath(): string {
  return path.resolve(__dirname, "../runtime/runtimeInspectorBridge.js");
}

function createBridgeHealthSnapshot(preloadPath: string): BridgeHealthSnapshot {
  return {
    preloadPath,
    preloadExists: existsSync(preloadPath),
    preloadExecuted: false,
    bridgeExposed: false,
    rendererReady: false,
    lastRendererReadyAt: null,
    lastPingAt: null,
    lastProjectLoadAt: null,
    lastProjectLoadRequestedProjectId: null,
    lastSelectedProjectId: null,
    lastProjectLoadError: null,
    workspaceProjectCount: 0
  };
}

function resetBridgeHealthState(preloadPath: string): void {
  const snapshot = createBridgeHealthSnapshot(preloadPath);
  Object.assign(bridgeHealthState, snapshot);
}

function getBridgeHealthSnapshot(): BridgeHealthSnapshot {
  return { ...bridgeHealthState };
}

function finishBridgeSmoke(exitCode: number, message: string): void {
  if (exitCode === 0) {
    console.log(message);
  } else {
    console.error(message);
  }

  setTimeout(() => {
    app.exit(exitCode);
  }, 0);
}

function finishLivePersistSmoke(exitCode: number, message: string): void {
  if (exitCode === 0) {
    console.log(message);
  } else {
    console.error(message);
  }

  if (shouldKeepLivePersistWindowOpen && exitCode === 0) {
    return;
  }

  setTimeout(() => {
    app.exit(exitCode);
  }, 0);
}

function finishLiveDragSmoke(exitCode: number, message: string): void {
  if (exitCode === 0) {
    console.log(message);
  } else {
    console.error(message);
  }

  if (shouldKeepLiveDragWindowOpen && exitCode === 0) {
    return;
  }

  setTimeout(() => {
    app.exit(exitCode);
  }, 0);
}

function finishLiveCreateDragSmoke(exitCode: number, message: string): void {
  if (exitCode === 0) {
    console.log(message);
  } else {
    console.error(message);
  }

  if (shouldKeepLiveCreateDragWindowOpen && exitCode === 0) {
    return;
  }

  setTimeout(() => {
    app.exit(exitCode);
  }, 0);
}

function finishLiveDonorImportSmoke(exitCode: number, message: string): void {
  if (exitCode === 0) {
    console.log(message);
  } else {
    console.error(message);
  }

  setTimeout(() => {
    app.exit(exitCode);
  }, 0);
}

function finishLiveRuntimeSmoke(exitCode: number, message: string): void {
  if (exitCode === 0) {
    console.log(message);
  } else {
    console.error(message);
  }

  setTimeout(() => {
    app.exit(exitCode);
  }, 0);
}

function finishLiveDuplicateDeleteSmoke(exitCode: number, message: string): void {
  if (exitCode === 0) {
    console.log(message);
  } else {
    console.error(message);
  }

  if (shouldKeepLiveDuplicateDeleteWindowOpen && exitCode === 0) {
    return;
  }

  setTimeout(() => {
    app.exit(exitCode);
  }, 0);
}

function finishLiveReorderSmoke(exitCode: number, message: string): void {
  if (exitCode === 0) {
    console.log(message);
  } else {
    console.error(message);
  }

  if (shouldKeepLiveReorderWindowOpen && exitCode === 0) {
    return;
  }

  setTimeout(() => {
    app.exit(exitCode);
  }, 0);
}

function finishLiveLayerReassignSmoke(exitCode: number, message: string): void {
  if (exitCode === 0) {
    console.log(message);
  } else {
    console.error(message);
  }

  if (shouldKeepLiveLayerReassignWindowOpen && exitCode === 0) {
    return;
  }

  setTimeout(() => {
    app.exit(exitCode);
  }, 0);
}

function finishLiveResizeSmoke(exitCode: number, message: string): void {
  if (exitCode === 0) {
    console.log(message);
  } else {
    console.error(message);
  }

  if (shouldKeepLiveResizeWindowOpen && exitCode === 0) {
    return;
  }

  setTimeout(() => {
    app.exit(exitCode);
  }, 0);
}

function finishLiveAlignSmoke(exitCode: number, message: string): void {
  if (exitCode === 0) {
    console.log(message);
  } else {
    console.error(message);
  }

  if (shouldKeepLiveAlignWindowOpen && exitCode === 0) {
    return;
  }

  setTimeout(() => {
    app.exit(exitCode);
  }, 0);
}

function finishLiveUndoRedoSmoke(exitCode: number, message: string): void {
  if (exitCode === 0) {
    console.log(message);
  } else {
    console.error(message);
  }

  if (shouldKeepLiveUndoRedoWindowOpen && exitCode === 0) {
    return;
  }

  setTimeout(() => {
    app.exit(exitCode);
  }, 0);
}

async function refreshRuntimeAssetOverrideRedirects(): Promise<void> {
  const [overrideStatus, mirrorStatus] = await Promise.all([
    buildRuntimeAssetOverrideStatus("project_001", runtimeAssetOverrideHits),
    buildLocalRuntimeMirrorStatus("project_001")
  ]);
  runtimeAssetOverrideRedirectMap = buildRuntimeAssetOverrideRedirectMap(overrideStatus);
  runtimeLocalMirrorStatus = mirrorStatus;
  runtimeLocalMirrorRedirectMap = buildLocalRuntimeMirrorRedirectMap(mirrorStatus);
}

async function clearRuntimeWebviewCache(): Promise<{ cleared: true; partition: string }> {
  return clearRuntimeSessionCache(runtimeWebviewPartition);
}

async function clearRuntimeSessionCache(partition: string): Promise<{ cleared: true; partition: string }> {
  const runtimeSession = session.fromPartition(partition);
  await runtimeSession.clearCache();
  await runtimeSession.clearStorageData({
    storages: ["serviceworkers", "cachestorage"]
  });
  return {
    cleared: true,
    partition
  };
}

function finishRuntimeDebugSmoke(exitCode: number, message: string): void {
  if (exitCode === 0) {
    console.log(message);
  } else {
    console.error(message);
  }

  setTimeout(() => {
    app.exit(exitCode);
  }, 0);
}

function delay(delayMs: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });
}

async function waitForNextLoad(window: BrowserWindow, timeoutMs = 45000): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error(`Runtime debug host timed out waiting for load after ${timeoutMs}ms.`));
    }, timeoutMs);

    const cleanup = () => {
      clearTimeout(timeout);
      window.webContents.removeListener("did-finish-load", onDidFinishLoad);
      window.webContents.removeListener("did-fail-load", onDidFailLoad);
      window.webContents.removeListener("render-process-gone", onRenderProcessGone);
    };

    const onDidFinishLoad = () => {
      cleanup();
      resolve();
    };
    const onDidFailLoad = (_event: unknown, errorCode: number, errorDescription: string) => {
      cleanup();
      reject(new Error(`Runtime debug host failed to load (${errorCode} ${errorDescription}).`));
    };
    const onRenderProcessGone = (_event: unknown, details: { reason: string }) => {
      cleanup();
      reject(new Error(`Runtime debug host renderer exited (${details.reason}).`));
    };

    window.webContents.once("did-finish-load", onDidFinishLoad);
    window.webContents.once("did-fail-load", onDidFailLoad);
    window.webContents.once("render-process-gone", onRenderProcessGone);
  });
}

async function safeExecuteDebugScript<T>(window: BrowserWindow, script: string): Promise<T | null> {
  try {
    return await window.webContents.executeJavaScript(script, true) as T | null;
  } catch {
    return null;
  }
}

async function sendRuntimeDebugCenterClick(window: BrowserWindow): Promise<void> {
  try {
    const point = await window.webContents.executeJavaScript(
      "({ x: Math.round(window.innerWidth / 2), y: Math.round(window.innerHeight / 2) })",
      true
    ) as { x?: number; y?: number } | null;
    const x = Number(point?.x ?? 0);
    const y = Number(point?.y ?? 0);
    if (!(x > 0 && y > 0)) {
      return;
    }

    window.webContents.focus();
    window.webContents.sendInputEvent({ type: "mouseMove", x, y });
    window.webContents.sendInputEvent({ type: "mouseDown", x, y, button: "left", clickCount: 1 });
    window.webContents.sendInputEvent({ type: "mouseUp", x, y, button: "left", clickCount: 1 });
  } catch {
    // Best-effort only.
  }
}

function sendRuntimeDebugSpace(window: BrowserWindow): void {
  try {
    window.webContents.focus();
    window.webContents.sendInputEvent({ type: "keyDown", keyCode: "Space" });
    window.webContents.sendInputEvent({ type: "char", keyCode: " " });
    window.webContents.sendInputEvent({ type: "keyUp", keyCode: "Space" });
  } catch {
    // Best-effort only.
  }
}

function getRuntimeDebugProofProfile(profileId?: string | null) {
  const requestedProfileId = typeof profileId === "string" && profileId.trim().length > 0
    ? profileId.trim()
    : (process.env.MYIDE_RUNTIME_DEBUG_PROFILE ?? "autoplay");
  return getScenarioProfile(requestedProfileId) ?? getScenarioProfile("autoplay") ?? null;
}

async function runRuntimeDebugProofSequence(window: BrowserWindow, profileId?: string | null): Promise<{
  profileId: string | null;
  spinCountAttempted: number;
}> {
  const profile = getRuntimeDebugProofProfile(profileId);
  const actionSet = new Set(Array.isArray(profile?.suggestedRuntimeActions) ? profile.suggestedRuntimeActions : []);
  const spinCount = actionSet.has("spin") ? Math.max(1, Number(profile?.boundedSpinCount ?? 1)) : 0;

  if (actionSet.has("enter")) {
    setRuntimeRequestStage("enter");
    await sendRuntimeDebugCenterClick(window);
    await delay(1500);
  }

  for (let index = 0; index < spinCount; index += 1) {
    setRuntimeRequestStage("spin");
    sendRuntimeDebugSpace(window);
    await delay(1600);
  }

  return {
    profileId: profile?.profileId ?? null,
    spinCountAttempted: spinCount
  };
}

async function loadPreferredRuntimeDebugDonorAsset(preferredFileType?: string | null): Promise<IndexedDonorAsset | null> {
  const donorIndex = await readProjectDonorAssetIndex("project_001") ?? await buildProjectDonorAssetIndex("project_001");
  const normalizedPreferredFileType = typeof preferredFileType === "string" && preferredFileType.trim().length > 0
    ? preferredFileType.trim().toLowerCase()
    : null;
  return donorIndex.assets.find((entry) => normalizedPreferredFileType !== null && entry.fileType === normalizedPreferredFileType)
    ?? donorIndex.assets.find((entry) => entry.fileType === "png")
    ?? donorIndex.assets.find((entry) => entry.fileType === "webp")
    ?? donorIndex.assets[0]
    ?? null;
}

async function runRuntimeDebugHost(options: RuntimeDebugHostOptions = {}): Promise<RuntimeDebugHostResult | null> {
  const timeoutMs = Number.parseInt(process.env.MYIDE_RUNTIME_DEBUG_TIMEOUT_MS ?? "90000", 10);
  const runtimeInspectorPreloadPath = resolveRuntimeInspectorPreloadPath();
  const showWindow = options.showWindow ?? shouldShowRuntimeDebugWindow;
  const smokeMode = options.smokeMode ?? isRuntimeDebugSmokeMode;
  const closeWhenDone = options.closeWhenDone ?? !showWindow;
  const proofMode = options.proofMode ?? smokeMode;
  const proofProfileId = options.profileId ?? null;
  const candidateHintTokens = Array.isArray(options.candidateHintTokens)
    ? options.candidateHintTokens.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    : [];

  if (smokeMode) {
    console.log("MYIDE_RUNTIME_DEBUG_MAIN_READY");
  }

  if (!smokeMode && activeRuntimeDebugWindow && !activeRuntimeDebugWindow.isDestroyed()) {
    activeRuntimeDebugWindow.show();
    activeRuntimeDebugWindow.focus();
    return lastRuntimeDebugResult;
  }

  try {
    const bundle = await loadProjectSlice("project_001");
    const runtimeLaunch = bundle.runtimeLaunch;
    if (!runtimeLaunch?.entryUrl) {
      throw new Error(runtimeLaunch?.blocker ?? "No grounded runtime launch URL is available for project_001.");
    }

    recentRuntimeObservationFingerprints.clear();
    runtimeAssetOverrideHits.clear();
    resetRuntimeResourceMap("project_001");
    setRuntimeRequestStage("launch");
    await clearRuntimeSessionCache(runtimeDebugPartition);

    const debugWindow = new BrowserWindow({
      width: 1440,
      height: 960,
      show: showWindow,
      backgroundColor: "#0b1017",
      title: "MyIDE Runtime Debug Host",
      webPreferences: {
        preload: runtimeInspectorPreloadPath,
        backgroundThrottling: false,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        partition: runtimeDebugPartition
      }
    });
    activeRuntimeDebugWindow = debugWindow;
    const runtimeDebugConsoleMessages: Array<{
      level: string;
      message: string;
      sourceId: string | null;
      line: number | null;
    }> = [];
    let runtimeDebugLoadFailure: string | null = null;
    debugWindow.on("closed", () => {
      if (activeRuntimeDebugWindow === debugWindow) {
        activeRuntimeDebugWindow = null;
      }
    });
    const debugContents = debugWindow.webContents as Electron.WebContents & {
      on: (event: string, listener: (...args: any[]) => void) => Electron.WebContents;
      reloadIgnoringCache?: () => void;
    };
    debugContents.on("console-message", (...args: any[]) => {
      let level: string = "info";
      let message = "";
      let sourceId: string | null = null;
      let line: number | null = null;

      if (typeof args[1] === "object" && args[1] && !Array.isArray(args[1])) {
        const params = args[1] as {
          level?: number | string;
          message?: string;
          sourceId?: string;
          line?: number;
        };
        if (typeof params.level === "number") {
          level = params.level >= 2 ? "error" : params.level === 1 ? "warn" : "info";
        } else if (typeof params.level === "string" && params.level.length > 0) {
          level = params.level;
        }
        message = typeof params.message === "string" ? params.message : "";
        sourceId = typeof params.sourceId === "string" && params.sourceId.length > 0 ? params.sourceId : null;
        line = typeof params.line === "number" ? params.line : null;
      } else {
        const rawLevel = args[1];
        level = typeof rawLevel === "number"
          ? (rawLevel >= 2 ? "error" : rawLevel === 1 ? "warn" : "info")
          : "info";
        message = typeof args[2] === "string" ? args[2] : "";
        sourceId = typeof args[4] === "string" && args[4].length > 0 ? args[4] : null;
        line = typeof args[3] === "number" ? args[3] : null;
      }

      const normalizedMessage = message.replace(/\s+/g, " ").trim();
      if (!normalizedMessage) {
        return;
      }
      runtimeDebugConsoleMessages.push({
        level,
        message: normalizedMessage.slice(0, 400),
        sourceId,
        line
      });
      if (runtimeDebugConsoleMessages.length > 20) {
        runtimeDebugConsoleMessages.splice(0, runtimeDebugConsoleMessages.length - 20);
      }
    });
    debugWindow.webContents.on("did-fail-load", (_event, errorCode, errorDescription) => {
      runtimeDebugLoadFailure = `${errorCode}: ${errorDescription}`;
    });

    const failIfGone = (_event: unknown, details: { reason: string }) => {
      const payload = {
        status: "fail",
        error: `Runtime debug host renderer exited (${details.reason}).`,
        loadFailure: runtimeDebugLoadFailure,
        consoleMessages: runtimeDebugConsoleMessages.slice(-8)
      };
      lastRuntimeDebugResult = payload;
      console.log(`MYIDE_RUNTIME_DEBUG_RESULT:${JSON.stringify(payload)}`);
      if (smokeMode) {
        finishRuntimeDebugSmoke(1, `FAIL smoke:electron-runtime-debug - ${payload.error}`);
      }
    };
    debugWindow.webContents.once("render-process-gone", failIfGone);

    await debugWindow.loadURL(runtimeLaunch.entryUrl);
    await delay(3000);

    const initialStatus = await safeExecuteDebugScript<RuntimeDebugBridgeStatus>(debugWindow, buildRuntimeDebugStatusScript());
    const initialPick = await safeExecuteDebugScript<RuntimeDebugPickPayload>(debugWindow, buildRuntimeDebugCenterPickScript());
    const initialResourceMap = buildRuntimeResourceMapStatus("project_001");
    const initialCandidate = preferUpstreamRuntimeDebugCandidate(initialResourceMap, selectRuntimeDebugCandidate(initialResourceMap, {
      preferredTokens: candidateHintTokens
    }));

    if (!proofMode) {
      const payload = {
        status: "open",
        error: null,
        pathDecision: "interactive-debug-host",
        projectId: "project_001",
        runtimeSourceLabel: runtimeLaunch.runtimeSourceLabel,
        entryUrl: runtimeLaunch.entryUrl,
        bridgeSource: initialStatus?.bridgeSource ?? null,
        bridgeVersion: initialStatus?.bridgeVersion ?? null,
        engineKind: initialStatus?.engineKind ?? null,
        engineNote: initialStatus?.engineNote ?? null,
        frameCount: initialStatus?.frameCount ?? 0,
        accessibleFrameCount: initialStatus?.accessibleFrameCount ?? 0,
        canvasCount: initialStatus?.canvasCount ?? 0,
        pixiDetected: initialStatus?.pixiDetected ?? false,
        pixiVersion: initialStatus?.pixiVersion ?? null,
        candidateApps: initialStatus?.candidateApps ?? [],
        assetUseEntryCount: initialStatus?.assetUseEntries?.length ?? 0,
        assetUseTopUrl: initialPick?.topRuntimeAsset?.canonicalUrl
          ?? initialStatus?.assetUseEntries?.[0]?.canonicalUrl
          ?? null,
        pickedTargetTag: initialPick?.targetTag ?? null,
        pickedDisplayObjectName: initialPick?.topDisplayObject?.name ?? null,
        pickedTextureResourceUrl: initialPick?.topDisplayObject?.texture?.resourceUrl ?? null,
        resourceMapCount: initialResourceMap.entryCount,
        staticImageEntryCount: initialResourceMap.entries.filter((entry) => entry.requestCategory === "static-asset").length,
        candidateRuntimeSourceUrl: initialCandidate?.canonicalSourceUrl ?? null,
        candidateRuntimeRelativePath: initialCandidate?.runtimeRelativePath ?? null,
        candidateRequestSource: initialCandidate?.requestSource ?? null,
        candidateHitCount: initialCandidate?.hitCount ?? 0,
        candidateCaptureMethods: initialCandidate?.captureMethods ?? [],
        localMirrorSourcePath: initialCandidate?.localMirrorRepoRelativePath ?? null,
        overrideDonorAssetId: null,
        overrideCreated: false,
        overrideCleared: false,
        overrideHitCountAfterReload: 0,
        overrideStatusEntryCount: 0,
        overrideBlocked: null,
        loadFailure: runtimeDebugLoadFailure,
        consoleMessages: runtimeDebugConsoleMessages.slice(-8)
      };
      lastRuntimeDebugResult = payload;
      return payload;
    }

    const proofSequence = await runRuntimeDebugProofSequence(debugWindow, proofProfileId);

    const statusBeforeOverride = await safeExecuteDebugScript<RuntimeDebugBridgeStatus>(debugWindow, buildRuntimeDebugStatusScript());
    const bridgeAssetCandidate = selectRuntimeDebugBridgeAssetCandidate(statusBeforeOverride, {
      preferredTokens: candidateHintTokens
    });
    let resourceMapBeforeOverride = buildRuntimeResourceMapStatus("project_001");
    let candidate = preferUpstreamRuntimeDebugCandidate(resourceMapBeforeOverride, selectRuntimeDebugCandidate(resourceMapBeforeOverride, {
      preferredTokens: candidateHintTokens
    }));

    if (!candidate && bridgeAssetCandidate) {
      setRuntimeRequestStage("prime");
      const requestUrl = buildLocalRuntimeMirrorProxyUrl("project_001", bridgeAssetCandidate.canonicalSourceUrl);
      await safeExecuteDebugScript(debugWindow, buildRuntimeDebugPrimeAssetRequestScript(requestUrl));
      await delay(1500);
      resourceMapBeforeOverride = buildRuntimeResourceMapStatus("project_001");
      candidate = preferUpstreamRuntimeDebugCandidate(resourceMapBeforeOverride, selectRuntimeDebugCandidate(resourceMapBeforeOverride, {
        preferredTokens: candidateHintTokens
      }));
    }

    const donorAsset = await loadPreferredRuntimeDebugDonorAsset(candidate?.fileType ?? bridgeAssetCandidate?.fileType ?? null);

    let overrideCreated = false;
    let overrideCleared = false;
    let overrideHitCountAfterReload = 0;
    let overrideBlocked: string | null = null;

    if (!candidate) {
      overrideBlocked = "Dedicated Runtime Debug Host still did not capture any request-backed static image candidate.";
    } else if (!donorAsset) {
      overrideBlocked = "No compatible local donor asset exists to drive the bounded project-local override proof.";
    } else {
      await createRuntimeAssetOverride({
        projectId: "project_001",
        runtimeSourceUrl: candidate.canonicalSourceUrl,
        donorAssetId: donorAsset.assetId
      });
      await refreshRuntimeAssetOverrideRedirects();
      runtimeAssetOverrideHits.delete(candidate.canonicalSourceUrl);
      overrideCreated = true;

      setRuntimeRequestStage("reload");
      await clearRuntimeSessionCache(runtimeDebugPartition);
      const reloadPromise = waitForNextLoad(debugWindow, timeoutMs);
      if (typeof debugContents.reloadIgnoringCache === "function") {
        debugContents.reloadIgnoringCache();
      } else {
        debugWindow.webContents.reload();
      }
      await reloadPromise;
      await delay(3000);
      overrideHitCountAfterReload = runtimeAssetOverrideHits.get(candidate.canonicalSourceUrl)?.count ?? 0;

      if (overrideHitCountAfterReload <= 0) {
        overrideBlocked = `Dedicated Runtime Debug Host found request-backed static image ${candidate.runtimeRelativePath ?? candidate.canonicalSourceUrl}, but the override path was not hit after reload.`;
      }

      await clearRuntimeAssetOverride("project_001", candidate.canonicalSourceUrl);
      await refreshRuntimeAssetOverrideRedirects();
      overrideCleared = true;
    }

    const finalStatus = await safeExecuteDebugScript<RuntimeDebugBridgeStatus>(debugWindow, buildRuntimeDebugStatusScript());
    const finalPick = await safeExecuteDebugScript<RuntimeDebugPickPayload>(debugWindow, buildRuntimeDebugCenterPickScript());
    const finalResourceMap = buildRuntimeResourceMapStatus("project_001");
    const finalOverrideStatus = await buildRuntimeAssetOverrideStatus("project_001", runtimeAssetOverrideHits);

    const payload = {
      status: overrideHitCountAfterReload > 0 ? "pass" : "fail",
      error: overrideHitCountAfterReload > 0 ? null : overrideBlocked,
      pathDecision: "embedded-no-go-debug-host",
      projectId: "project_001",
      runtimeSourceLabel: runtimeLaunch.runtimeSourceLabel,
      entryUrl: runtimeLaunch.entryUrl,
      bridgeSource: finalStatus?.bridgeSource ?? initialStatus?.bridgeSource ?? null,
      bridgeVersion: finalStatus?.bridgeVersion ?? initialStatus?.bridgeVersion ?? null,
      engineKind: finalStatus?.engineKind ?? initialStatus?.engineKind ?? null,
      engineNote: finalStatus?.engineNote ?? initialStatus?.engineNote ?? null,
      frameCount: finalStatus?.frameCount ?? initialStatus?.frameCount ?? 0,
      accessibleFrameCount: finalStatus?.accessibleFrameCount ?? initialStatus?.accessibleFrameCount ?? 0,
      canvasCount: finalStatus?.canvasCount ?? initialStatus?.canvasCount ?? 0,
      pixiDetected: finalStatus?.pixiDetected ?? initialStatus?.pixiDetected ?? false,
      pixiVersion: finalStatus?.pixiVersion ?? initialStatus?.pixiVersion ?? null,
      candidateApps: finalStatus?.candidateApps ?? initialStatus?.candidateApps ?? [],
      assetUseEntryCount: finalStatus?.assetUseEntries?.length ?? initialStatus?.assetUseEntries?.length ?? 0,
      assetUseTopUrl: finalPick?.topRuntimeAsset?.canonicalUrl
        ?? finalStatus?.assetUseEntries?.[0]?.canonicalUrl
        ?? initialPick?.topRuntimeAsset?.canonicalUrl
        ?? null,
      pickedTargetTag: finalPick?.targetTag ?? initialPick?.targetTag ?? null,
      pickedDisplayObjectName: finalPick?.topDisplayObject?.name ?? initialPick?.topDisplayObject?.name ?? null,
      pickedTextureResourceUrl: finalPick?.topDisplayObject?.texture?.resourceUrl ?? initialPick?.topDisplayObject?.texture?.resourceUrl ?? null,
      resourceMapCount: finalResourceMap.entryCount,
      staticImageEntryCount: finalResourceMap.entries.filter((entry) => entry.requestCategory === "static-asset").length,
      candidateRuntimeSourceUrl: candidate?.canonicalSourceUrl ?? null,
      candidateRuntimeRelativePath: candidate?.runtimeRelativePath ?? null,
      candidateRequestSource: candidate?.requestSource ?? null,
      candidateHitCount: candidate?.hitCount ?? 0,
      candidateCaptureMethods: candidate?.captureMethods ?? [],
      localMirrorSourcePath: candidate?.localMirrorRepoRelativePath ?? null,
      overrideDonorAssetId: donorAsset?.assetId ?? null,
      candidateHintTokens,
      proofProfileId: proofSequence.profileId,
      proofSpinCountAttempted: proofSequence.spinCountAttempted,
      overrideCreated,
      overrideCleared,
      overrideHitCountAfterReload,
      overrideStatusEntryCount: finalOverrideStatus.entryCount,
      overrideBlocked,
      loadFailure: runtimeDebugLoadFailure,
      consoleMessages: runtimeDebugConsoleMessages.slice(-8)
    };
    lastRuntimeDebugResult = payload;

    console.log(`MYIDE_RUNTIME_DEBUG_RESULT:${JSON.stringify(payload)}`);

    if (smokeMode) {
      if (payload.status === "pass") {
        finishRuntimeDebugSmoke(0, "PASS smoke:electron-runtime-debug");
      } else {
        finishRuntimeDebugSmoke(1, `FAIL smoke:electron-runtime-debug - ${payload.error ?? "runtime debug host reported failure"}`);
      }
      return payload;
    }

    if (closeWhenDone) {
      debugWindow.close();
    }
    return payload;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const payload = {
      status: "fail",
      error: message,
      pathDecision: "embedded-no-go-debug-host"
    };
    lastRuntimeDebugResult = payload;
    console.log(`MYIDE_RUNTIME_DEBUG_RESULT:${JSON.stringify(payload)}`);
    if (smokeMode) {
      finishRuntimeDebugSmoke(1, `FAIL smoke:electron-runtime-debug - ${message}`);
    }
    return payload;
  }
}

function getRuntimeRedirectUrl(requestUrl: string): string | null {
  const overrideRedirect = runtimeAssetOverrideRedirectMap.get(requestUrl);
  if (overrideRedirect) {
    return overrideRedirect;
  }

  const exactMirrorRedirect = runtimeLocalMirrorRedirectMap.get(requestUrl);
  if (exactMirrorRedirect) {
    return exactMirrorRedirect;
  }

  const mirrorEntry = findLocalRuntimeMirrorEntry(runtimeLocalMirrorStatus, requestUrl);
  return mirrorEntry
    ? `http://127.0.0.1:${getLocalRuntimeMirrorPort()}/runtime/project_001/mirror?source=${encodeURIComponent(mirrorEntry.sourceUrl)}`
    : null;
}

function getRuntimeMirrorRelativePathFromUrl(requestUrl: string): string | null {
  try {
    const parsedUrl = new URL(requestUrl);
    if (!parsedUrl.pathname.startsWith("/runtime/project_001/assets/")) {
      return null;
    }
    return parsedUrl.pathname.replace("/runtime/project_001/assets/", "").replace(/^\/+/, "") || null;
  } catch {
    return null;
  }
}

function getRuntimeObservedRequestMetadata(requestUrl: string): {
  canonicalSourceUrl: string;
  requestSource: "local-mirror-launch" | "local-mirror-asset" | "local-mirror-proxy" | "project-local-override" | "upstream-request";
  localMirrorAbsolutePath?: string | null;
  overrideAbsolutePath?: string | null;
  runtimeRelativePath?: string | null;
  fileType?: string | null;
} | null {
  try {
    const parsedUrl = new URL(requestUrl);
    if (isRuntimeMirrorOrigin(requestUrl)) {
      if (parsedUrl.pathname === "/runtime/project_001/launch") {
        return {
          canonicalSourceUrl: runtimeLocalMirrorStatus?.publicEntryUrl ?? requestUrl,
          requestSource: "local-mirror-launch",
          runtimeRelativePath: "launch.html",
          fileType: "html"
        };
      }

      if (parsedUrl.pathname === "/runtime/project_001/mirror") {
        const sourceUrl = parsedUrl.searchParams.get("source");
        if (!sourceUrl) {
          return null;
        }
        const localMirrorEntry = findLocalRuntimeMirrorEntry(runtimeLocalMirrorStatus, sourceUrl);
        const overrideAbsolutePath = getRuntimeOverrideAbsolutePath(sourceUrl);
        return {
          canonicalSourceUrl: sourceUrl,
          requestSource: overrideAbsolutePath ? "project-local-override" : "local-mirror-proxy",
          localMirrorAbsolutePath: localMirrorEntry?.absolutePath ?? null,
          overrideAbsolutePath,
          runtimeRelativePath: (() => {
            try {
              return new URL(sourceUrl).pathname.split("/html/MysteryGarden/")[1] ?? null;
            } catch {
              return null;
            }
          })(),
          fileType: localMirrorEntry?.fileType ?? null
        };
      }

      if (parsedUrl.pathname.startsWith("/runtime/project_001/assets/")) {
        const runtimeRelativePath = getRuntimeMirrorRelativePathFromUrl(requestUrl);
        const localMirrorEntry = findLocalRuntimeMirrorEntryByRelativePath(runtimeLocalMirrorStatus, runtimeRelativePath);
        const fallbackSourceUrl = runtimeRelativePath ? buildRuntimeUpstreamFallbackUrl(runtimeRelativePath) : null;
        const canonicalSourceUrl = localMirrorEntry?.sourceUrl ?? fallbackSourceUrl ?? requestUrl;
        const overrideAbsolutePath = getRuntimeOverrideAbsolutePath(canonicalSourceUrl);
        return {
          canonicalSourceUrl,
          requestSource: overrideAbsolutePath
            ? "project-local-override"
            : localMirrorEntry
              ? "local-mirror-asset"
              : "upstream-request",
          localMirrorAbsolutePath: localMirrorEntry?.absolutePath ?? null,
          overrideAbsolutePath,
          runtimeRelativePath,
          fileType: localMirrorEntry?.fileType ?? null
        };
      }
    }

    return {
      canonicalSourceUrl: requestUrl,
      requestSource: "upstream-request"
    };
  } catch {
    return null;
  }
}

function scheduleRuntimeResourceMapSnapshotWrite(): void {
  try {
    exportRuntimeResourceMapSnapshotSync("project_001");
  } catch (error) {
    console.warn("Failed to export runtime resource map snapshot:", error);
  }
}

function setRuntimeRequestStage(stage: string): void {
  const normalized = stage.trim().toLowerCase();
  runtimeRequestStage = normalized.length > 0 ? normalized : "unscoped";
}

function isRuntimeMirrorOrigin(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.hostname === "127.0.0.1" && parsed.port === String(getLocalRuntimeMirrorPort());
  } catch {
    return false;
  }
}

function recordRuntimeOverrideHit(runtimeSourceUrl: string): void {
  const current = runtimeAssetOverrideHits.get(runtimeSourceUrl) ?? {
    count: 0,
    lastHitAtUtc: null
  };
  runtimeAssetOverrideHits.set(runtimeSourceUrl, {
    count: current.count + 1,
    lastHitAtUtc: new Date().toISOString()
  });
}

function recordRuntimeResourceHit(
  requestUrl: string,
  canonicalSourceUrl: string,
  requestSource: "local-mirror-launch" | "local-mirror-asset" | "local-mirror-proxy" | "project-local-override" | "upstream-request",
  options: {
    captureMethod?: "server-route" | "partition-webrequest";
    localMirrorAbsolutePath?: string | null;
    overrideAbsolutePath?: string | null;
    fileType?: string | null;
    runtimeRelativePath?: string | null;
    resourceType?: string | null;
    stage?: string | null;
  } = {}
): void {
  const observationFingerprint = [
    requestSource,
    options.stage ?? runtimeRequestStage,
    requestUrl,
    canonicalSourceUrl,
    options.resourceType ?? "",
    options.overrideAbsolutePath ?? "",
    options.localMirrorAbsolutePath ?? ""
  ].join("|");
  const now = Date.now();
  const previousObservationAt = recentRuntimeObservationFingerprints.get(observationFingerprint) ?? 0;
  if (now - previousObservationAt < 750) {
    return;
  }
  recentRuntimeObservationFingerprints.set(observationFingerprint, now);
  if (recentRuntimeObservationFingerprints.size > 512) {
    for (const [fingerprint, observedAt] of recentRuntimeObservationFingerprints) {
      if (now - observedAt > 30_000) {
        recentRuntimeObservationFingerprints.delete(fingerprint);
      }
    }
  }

  const entry = recordRuntimeResourceRequest({
    projectId: "project_001",
    requestUrl,
    canonicalSourceUrl,
    requestSource,
    captureMethod: options.captureMethod ?? "server-route",
    localMirrorAbsolutePath: options.localMirrorAbsolutePath ?? null,
    overrideAbsolutePath: options.overrideAbsolutePath ?? null,
    fileType: options.fileType ?? null,
    runtimeRelativePath: options.runtimeRelativePath ?? null,
    resourceType: options.resourceType ?? null,
    stage: options.stage ?? runtimeRequestStage
  });

  if (requestSource === "project-local-override") {
    runtimeAssetOverrideHits.set(canonicalSourceUrl, {
      count: entry.hitCount,
      lastHitAtUtc: entry.lastHitAtUtc
    });
  }

  scheduleRuntimeResourceMapSnapshotWrite();
}

function getRuntimeOverrideAbsolutePath(runtimeSourceUrl: string): string | null {
  const redirectUrl = runtimeAssetOverrideRedirectMap.get(runtimeSourceUrl);
  if (!redirectUrl) {
    return null;
  }

  try {
    const parsedUrl = new URL(redirectUrl);
    return parsedUrl.protocol === "file:" ? decodeURIComponent(parsedUrl.pathname) : null;
  } catch {
    return null;
  }
}

function installRuntimeAssetOverrideInterception(): void {
  if (runtimeAssetOverrideInterceptionInstalled) {
    return;
  }

  runtimeAssetOverrideInterceptionInstalled = true;
  const onBeforeRequest = (
    details: Electron.OnBeforeRequestListenerDetails,
    callback: (response: Electron.CallbackResponse) => void
  ) => {
    if (isRuntimeMirrorOrigin(details.url)) {
      callback({});
      return;
    }

    const redirectURL = getRuntimeRedirectUrl(details.url);
    if (!redirectURL) {
      recordRuntimeResourceHit(details.url, details.url, "upstream-request", {
        resourceType: details.resourceType
      });
      callback({});
      return;
    }

    const observed = getRuntimeObservedRequestMetadata(redirectURL) ?? getRuntimeObservedRequestMetadata(details.url);
    if (observed) {
      recordRuntimeResourceHit(
        details.url,
        observed.canonicalSourceUrl,
        observed.requestSource,
        {
          captureMethod: "partition-webrequest",
          localMirrorAbsolutePath: observed.localMirrorAbsolutePath ?? null,
          overrideAbsolutePath: observed.overrideAbsolutePath ?? null,
          fileType: observed.fileType ?? null,
          runtimeRelativePath: observed.runtimeRelativePath ?? null,
          resourceType: details.resourceType,
          stage: runtimeRequestStage
        }
      );
    }
    callback({ redirectURL });
  };

  const installPartitionHooks = (partition: string) => {
    const partitionSession = session.fromPartition(partition);
    partitionSession.webRequest.onBeforeRequest(
      {
        urls: ["<all_urls>"]
      },
      onBeforeRequest
    );
    partitionSession.webRequest.onCompleted(
      {
        urls: ["<all_urls>"]
      },
      (details) => {
        const observed = getRuntimeObservedRequestMetadata(details.url);
        if (!observed) {
          return;
        }
        recordRuntimeResourceHit(
          details.url,
          observed.canonicalSourceUrl,
          observed.requestSource,
          {
            captureMethod: "partition-webrequest",
            localMirrorAbsolutePath: observed.localMirrorAbsolutePath ?? null,
            overrideAbsolutePath: observed.overrideAbsolutePath ?? null,
            fileType: observed.fileType ?? null,
            runtimeRelativePath: observed.runtimeRelativePath ?? null,
            resourceType: details.resourceType,
            stage: runtimeRequestStage
          }
        );
      }
    );
  };

  installPartitionHooks(runtimeWebviewPartition);
  installPartitionHooks(runtimeDebugPartition);
  session.defaultSession.webRequest.onBeforeRequest(
    {
      urls: [
        "https://cdn.bgaming-network.com/*",
        "https://boost2.bgaming-network.com/*",
        "https://replays.bgaming-network.com/*",
        "https://rs-cdn.shared.bgaming-system.com/*",
        "https://lobby.bgaming-network.com/*",
        "https://drops-fe.bgaming-network.com/*",
        "https://www.googletagmanager.com/*"
      ]
    },
    (details, callback) => {
      const redirectURL = getRuntimeRedirectUrl(details.url);
      callback(redirectURL ? { redirectURL } : {});
    }
  );
}

function sendRuntimeMirrorResponse(
  response: ServerResponse,
  statusCode: number,
  headers: Record<string, string>,
  body: string | Uint8Array
): void {
  response.writeHead(statusCode, {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET, OPTIONS",
    "cross-origin-resource-policy": "cross-origin",
    ...headers
  });
  response.end(body);
}

function getRuntimeMirrorContentType(fileType: string): string {
  switch (fileType.toLowerCase()) {
    case "js":
      return "application/javascript; charset=utf-8";
    case "json":
      return "application/json; charset=utf-8";
    case "woff2":
      return "font/woff2";
    case "woff":
      return "font/woff";
    case "ogg":
      return "audio/ogg";
    case "mp3":
      return "audio/mpeg";
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "svg":
      return "image/svg+xml";
    case "gif":
      return "image/gif";
    case "html":
      return "text/html; charset=utf-8";
    default:
      return "application/octet-stream";
  }
}

function buildRuntimeUpstreamFallbackUrl(relativePath: string): string {
  const normalizedRelativePath = relativePath.replace(/^\/+/, "");
  return `https://cdn.bgaming-network.com/html/MysteryGarden/${normalizedRelativePath}`;
}

function inferRuntimeResourceTypeFromContentType(contentType: string | null): string | null {
  const normalized = String(contentType ?? "").toLowerCase();
  if (normalized.startsWith("image/")) {
    return "image";
  }
  if (normalized.includes("javascript")) {
    return "script";
  }
  if (normalized.includes("json")) {
    return "fetch";
  }
  if (normalized.startsWith("audio/")) {
    return "media";
  }
  if (normalized.startsWith("font/")) {
    return "font";
  }
  if (normalized.startsWith("text/css")) {
    return "stylesheet";
  }
  if (normalized.startsWith("text/html")) {
    return "mainFrame";
  }
  return null;
}

async function fetchRuntimeUpstreamFallbackAsset(relativePath: string): Promise<{
  sourceUrl: string;
  content: Uint8Array;
  contentType: string | null;
  fileType: string | null;
}> {
  return fetchRuntimeUpstreamFallbackUrl(buildRuntimeUpstreamFallbackUrl(relativePath));
}

async function fetchRuntimeUpstreamFallbackUrl(sourceUrl: string): Promise<{
  sourceUrl: string;
  content: Uint8Array;
  contentType: string | null;
  fileType: string | null;
}> {
  const response = await fetch(sourceUrl, {
    headers: {
      "user-agent": "Mozilla/5.0 (MyIDE runtime fallback proxy)"
    },
    redirect: "follow"
  });

  if (!response.ok) {
    throw new Error(`Upstream fallback fetch failed for ${sourceUrl}: ${response.status} ${response.statusText}`);
  }

  const contentType = response.headers.get("content-type");
  return {
    sourceUrl,
    content: new Uint8Array(await response.arrayBuffer()),
    contentType,
    fileType: path.extname(new URL(sourceUrl).pathname).replace(/^\./, "").toLowerCase() || null
  };
}

async function handleRuntimeMirrorRequest(request: IncomingMessage, response: ServerResponse): Promise<void> {
  const origin = `http://127.0.0.1:${getLocalRuntimeMirrorPort()}`;
  const parsedUrl = new URL(request.url ?? "/", origin);

  if (request.method !== "GET") {
    sendRuntimeMirrorResponse(response, 405, { "content-type": "text/plain; charset=utf-8" }, "Method not allowed");
    return;
  }

  if (parsedUrl.pathname === "/runtime/project_001/launch") {
    if (!runtimeLocalMirrorStatus?.available) {
      sendRuntimeMirrorResponse(
        response,
        503,
        { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
        runtimeLocalMirrorStatus?.blocker ?? "Local runtime mirror is not available."
      );
      return;
    }

    const launch = await buildLocalRuntimeLaunchHtml("project_001");
    recordRuntimeResourceHit(
      parsedUrl.toString(),
      runtimeLocalMirrorStatus.publicEntryUrl ?? parsedUrl.toString(),
      "local-mirror-launch",
      {
        fileType: "html",
        runtimeRelativePath: "launch.html",
        resourceType: "mainFrame"
      }
    );
    sendRuntimeMirrorResponse(response, 200, {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "x-myide-runtime-source": "local-mirror",
      "x-myide-runtime-final-url": launch.finalUrl
    }, launch.html);
    return;
  }

  if (parsedUrl.pathname === "/runtime/project_001/mirror") {
    const sourceUrl = parsedUrl.searchParams.get("source");
    if (!sourceUrl) {
      sendRuntimeMirrorResponse(response, 400, { "content-type": "text/plain; charset=utf-8" }, "Missing mirror source URL.");
      return;
    }

    const mirrorFile = await readLocalRuntimeMirrorFile("project_001", sourceUrl);
    if (!mirrorFile) {
      try {
        const upstreamFallback = await fetchRuntimeUpstreamFallbackUrl(sourceUrl);
        recordRuntimeResourceHit(parsedUrl.toString(), upstreamFallback.sourceUrl, "upstream-request", {
          fileType: upstreamFallback.fileType,
          resourceType: inferRuntimeResourceTypeFromContentType(upstreamFallback.contentType)
        });
        sendRuntimeMirrorResponse(response, 200, {
          "content-type": upstreamFallback.contentType ?? getRuntimeMirrorContentType(upstreamFallback.fileType ?? "bin"),
          "cache-control": "no-store",
          "x-myide-runtime-source": "upstream-fallback",
          "x-myide-runtime-final-url": upstreamFallback.sourceUrl
        }, upstreamFallback.content);
        return;
      } catch {
        sendRuntimeMirrorResponse(response, 404, { "content-type": "text/plain; charset=utf-8" }, "Mirror asset not found.");
        return;
      }
    }

    const overrideAbsolutePath = getRuntimeOverrideAbsolutePath(sourceUrl);
    if (overrideAbsolutePath) {
      recordRuntimeOverrideHit(sourceUrl);
      recordRuntimeResourceHit(parsedUrl.toString(), sourceUrl, "project-local-override", {
        localMirrorAbsolutePath: mirrorFile.absolutePath,
        overrideAbsolutePath,
        fileType: mirrorFile.fileType,
        resourceType: "fetch"
      });
      sendRuntimeMirrorResponse(response, 200, {
        "content-type": getRuntimeMirrorContentType(mirrorFile.fileType),
        "cache-control": "no-store",
        "x-myide-runtime-source": "project-local-override",
        "x-myide-runtime-local-path": overrideAbsolutePath
      }, new Uint8Array(await import("node:fs").then(({ promises }) => promises.readFile(overrideAbsolutePath))));
      return;
    }

    recordRuntimeResourceHit(parsedUrl.toString(), sourceUrl, "local-mirror-proxy", {
      localMirrorAbsolutePath: mirrorFile.absolutePath,
      fileType: mirrorFile.fileType,
      resourceType: "fetch"
    });
    sendRuntimeMirrorResponse(response, 200, {
      "content-type": getRuntimeMirrorContentType(mirrorFile.fileType),
      "cache-control": "no-store",
      "x-myide-runtime-source": "local-mirror-asset",
      "x-myide-runtime-local-path": mirrorFile.absolutePath
    }, mirrorFile.content);
    return;
  }

  if (parsedUrl.pathname.startsWith("/runtime/project_001/assets/")) {
    const relativePath = parsedUrl.pathname.replace("/runtime/project_001/assets/", "");
    const mirrorFile = await readLocalRuntimeMirrorFileByRelativePath("project_001", relativePath);
    if (!mirrorFile) {
      const fallbackSourceUrl = buildRuntimeUpstreamFallbackUrl(relativePath);
      const overrideAbsolutePath = getRuntimeOverrideAbsolutePath(fallbackSourceUrl);
      if (overrideAbsolutePath) {
        const overrideContent = new Uint8Array(await import("node:fs").then(({ promises }) => promises.readFile(overrideAbsolutePath)));
        const fallbackFileType = path.extname(new URL(fallbackSourceUrl).pathname).replace(/^\./, "").toLowerCase()
          || path.extname(overrideAbsolutePath).replace(/^\./, "").toLowerCase()
          || "bin";
        recordRuntimeOverrideHit(fallbackSourceUrl);
        recordRuntimeResourceHit(parsedUrl.toString(), fallbackSourceUrl, "project-local-override", {
          overrideAbsolutePath,
          fileType: fallbackFileType,
          runtimeRelativePath: relativePath,
          resourceType: "image"
        });
        sendRuntimeMirrorResponse(response, 200, {
          "content-type": getRuntimeMirrorContentType(fallbackFileType),
          "cache-control": "no-store",
          "x-myide-runtime-source": "project-local-override",
          "x-myide-runtime-final-url": fallbackSourceUrl,
          "x-myide-runtime-local-path": overrideAbsolutePath
        }, overrideContent);
        return;
      }
      try {
        const upstreamFallback = await fetchRuntimeUpstreamFallbackAsset(relativePath);
        recordRuntimeResourceHit(parsedUrl.toString(), upstreamFallback.sourceUrl, "upstream-request", {
          fileType: upstreamFallback.fileType,
          runtimeRelativePath: relativePath,
          resourceType: inferRuntimeResourceTypeFromContentType(upstreamFallback.contentType)
        });
        sendRuntimeMirrorResponse(response, 200, {
          "content-type": upstreamFallback.contentType ?? getRuntimeMirrorContentType(upstreamFallback.fileType ?? "bin"),
          "cache-control": "no-store",
          "x-myide-runtime-source": "upstream-fallback",
          "x-myide-runtime-final-url": upstreamFallback.sourceUrl
        }, upstreamFallback.content);
        return;
      } catch {
        sendRuntimeMirrorResponse(response, 404, { "content-type": "text/plain; charset=utf-8" }, "Mirror asset not found.");
        return;
      }
    }

    const overrideAbsolutePath = getRuntimeOverrideAbsolutePath(mirrorFile.sourceUrl);
    if (overrideAbsolutePath) {
      recordRuntimeOverrideHit(mirrorFile.sourceUrl);
      recordRuntimeResourceHit(parsedUrl.toString(), mirrorFile.sourceUrl, "project-local-override", {
        localMirrorAbsolutePath: mirrorFile.absolutePath,
        overrideAbsolutePath,
        fileType: mirrorFile.fileType,
        runtimeRelativePath: relativePath,
        resourceType: "image"
      });
      sendRuntimeMirrorResponse(response, 200, {
        "content-type": getRuntimeMirrorContentType(mirrorFile.fileType),
        "cache-control": "no-store",
        "x-myide-runtime-source": "project-local-override",
        "x-myide-runtime-local-path": overrideAbsolutePath
      }, new Uint8Array(await import("node:fs").then(({ promises }) => promises.readFile(overrideAbsolutePath))));
      return;
    }

    recordRuntimeResourceHit(parsedUrl.toString(), mirrorFile.sourceUrl, "local-mirror-asset", {
      localMirrorAbsolutePath: mirrorFile.absolutePath,
      fileType: mirrorFile.fileType,
      runtimeRelativePath: relativePath,
      resourceType: "image"
    });
    sendRuntimeMirrorResponse(response, 200, {
      "content-type": getRuntimeMirrorContentType(mirrorFile.fileType),
      "cache-control": "no-store",
      "x-myide-runtime-source": "local-mirror-asset",
      "x-myide-runtime-local-path": mirrorFile.absolutePath
    }, mirrorFile.content);
    return;
  }

  sendRuntimeMirrorResponse(response, 404, { "content-type": "text/plain; charset=utf-8" }, "Not found");
}

async function startRuntimeLocalMirrorServer(): Promise<void> {
  if (runtimeLocalMirrorServer) {
    return;
  }

  runtimeLocalMirrorServer = createServer((request, response) => {
    void handleRuntimeMirrorRequest(request, response).catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      sendRuntimeMirrorResponse(response, 500, { "content-type": "text/plain; charset=utf-8" }, message);
    });
  });

  await new Promise<void>((resolve, reject) => {
    runtimeLocalMirrorServer?.once("error", reject);
    runtimeLocalMirrorServer?.listen(getLocalRuntimeMirrorPort(), "127.0.0.1", () => {
      runtimeLocalMirrorServer?.off("error", reject);
      resolve();
    });
  });
}

function getInitialWindowVisibility(): boolean {
  if (isBridgeSmokeMode) {
    return false;
  }

  if (isLivePersistSmokeMode) {
    return shouldShowLivePersistWindow;
  }

  if (isLiveDragSmokeMode) {
    return shouldShowLiveDragWindow;
  }

  if (isLiveCreateDragSmokeMode) {
    return shouldShowLiveCreateDragWindow;
  }

  if (isLiveDonorImportSmokeMode || isLiveRuntimeSmokeMode) {
    return isLiveRuntimeSmokeMode ? shouldShowLiveRuntimeWindow : false;
  }

  if (isLiveDuplicateDeleteSmokeMode) {
    return shouldShowLiveDuplicateDeleteWindow;
  }

  if (isLiveReorderSmokeMode) {
    return shouldShowLiveReorderWindow;
  }

  if (isLiveLayerReassignSmokeMode) {
    return shouldShowLiveLayerReassignWindow;
  }

  if (isLiveResizeSmokeMode) {
    return shouldShowLiveResizeWindow;
  }

  if (isLiveAlignSmokeMode) {
    return shouldShowLiveAlignWindow;
  }

  if (isLiveUndoRedoSmokeMode) {
    return shouldShowLiveUndoRedoWindow;
  }

  return true;
}

function attachBridgeSmokeHandlers(window: BrowserWindow): void {
  if (!isBridgeSmokeMode) {
    return;
  }

  console.log("MYIDE_BRIDGE_SMOKE_MAIN_READY");
  const timeoutMs = Number.parseInt(process.env.MYIDE_BRIDGE_SMOKE_TIMEOUT_MS ?? "25000", 10);
  const smokeTimeout = setTimeout(() => {
    finishBridgeSmoke(1, "FAIL smoke:electron-bridge - timeout waiting for renderer smoke payload");
  }, Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 25000);

  const clearSmokeTimeout = () => {
    clearTimeout(smokeTimeout);
  };

  window.webContents.on("did-fail-load", (_event, errorCode, errorDescription) => {
    clearSmokeTimeout();
    finishBridgeSmoke(1, `FAIL smoke:electron-bridge - renderer failed to load (${errorCode} ${errorDescription})`);
  });

  window.webContents.on("render-process-gone", (_event, details) => {
    clearSmokeTimeout();
    finishBridgeSmoke(1, `FAIL smoke:electron-bridge - renderer process exited (${details.reason})`);
  });

  activeBridgeSmokeReporter = (payload) => {
    clearSmokeTimeout();
    console.log(`MYIDE_BRIDGE_SMOKE_RESULT:${JSON.stringify(payload)}`);
    if (payload.status === "pass") {
      finishBridgeSmoke(0, "PASS smoke:electron-bridge");
      return;
    }

    finishBridgeSmoke(1, `FAIL smoke:electron-bridge - ${payload.error ?? "renderer reported failure"}`);
  };

}

function attachLivePersistSmokeHandlers(window: BrowserWindow): void {
  if (!isLivePersistSmokeMode) {
    return;
  }

  console.log("MYIDE_LIVE_PERSIST_MAIN_READY");
  const timeoutMs = Number.parseInt(process.env.MYIDE_LIVE_PERSIST_TIMEOUT_MS ?? "45000", 10);
  const smokeTimeout = setTimeout(() => {
    finishLivePersistSmoke(1, "FAIL smoke:electron-live-persist - timeout waiting for renderer persist payload");
  }, Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 45000);

  const clearSmokeTimeout = () => {
    clearTimeout(smokeTimeout);
  };

  window.webContents.on("did-fail-load", (_event, errorCode, errorDescription) => {
    clearSmokeTimeout();
    finishLivePersistSmoke(1, `FAIL smoke:electron-live-persist - renderer failed to load (${errorCode} ${errorDescription})`);
  });

  window.webContents.on("render-process-gone", (_event, details) => {
    clearSmokeTimeout();
    finishLivePersistSmoke(1, `FAIL smoke:electron-live-persist - renderer process exited (${details.reason})`);
  });

  activeLivePersistSmokeReporter = (payload) => {
    clearSmokeTimeout();
    console.log(`MYIDE_LIVE_PERSIST_RESULT:${JSON.stringify(payload)}`);
    if (payload.status === "pass") {
      finishLivePersistSmoke(0, "PASS smoke:electron-live-persist");
      return;
    }

    finishLivePersistSmoke(1, `FAIL smoke:electron-live-persist - ${payload.error ?? "renderer reported failure"}`);
  };
}

function attachLiveDragSmokeHandlers(window: BrowserWindow): void {
  if (!isLiveDragSmokeMode) {
    return;
  }

  console.log("MYIDE_LIVE_DRAG_MAIN_READY");
  const timeoutMs = Number.parseInt(process.env.MYIDE_LIVE_DRAG_TIMEOUT_MS ?? "45000", 10);
  const smokeTimeout = setTimeout(() => {
    finishLiveDragSmoke(1, "FAIL smoke:electron-live-drag - timeout waiting for renderer drag payload");
  }, Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 45000);

  const clearSmokeTimeout = () => {
    clearTimeout(smokeTimeout);
  };

  window.webContents.on("did-fail-load", (_event, errorCode, errorDescription) => {
    clearSmokeTimeout();
    finishLiveDragSmoke(1, `FAIL smoke:electron-live-drag - renderer failed to load (${errorCode} ${errorDescription})`);
  });

  window.webContents.on("render-process-gone", (_event, details) => {
    clearSmokeTimeout();
    finishLiveDragSmoke(1, `FAIL smoke:electron-live-drag - renderer process exited (${details.reason})`);
  });

  activeLiveDragSmokeReporter = (payload) => {
    clearSmokeTimeout();
    console.log(`MYIDE_LIVE_DRAG_RESULT:${JSON.stringify(payload)}`);
    if (payload.status === "pass") {
      finishLiveDragSmoke(0, "PASS smoke:electron-live-drag");
      return;
    }

    finishLiveDragSmoke(1, `FAIL smoke:electron-live-drag - ${payload.error ?? "renderer reported failure"}`);
  };
}

function attachLiveCreateDragSmokeHandlers(window: BrowserWindow): void {
  if (!isLiveCreateDragSmokeMode) {
    return;
  }

  console.log("MYIDE_LIVE_CREATE_DRAG_MAIN_READY");
  const timeoutMs = Number.parseInt(process.env.MYIDE_LIVE_CREATE_DRAG_TIMEOUT_MS ?? "45000", 10);
  const smokeTimeout = setTimeout(() => {
    finishLiveCreateDragSmoke(1, "FAIL smoke:electron-live-create-drag - timeout waiting for renderer create-drag payload");
  }, Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 45000);

  const clearSmokeTimeout = () => {
    clearTimeout(smokeTimeout);
  };

  window.webContents.on("did-fail-load", (_event, errorCode, errorDescription) => {
    clearSmokeTimeout();
    finishLiveCreateDragSmoke(1, `FAIL smoke:electron-live-create-drag - renderer failed to load (${errorCode} ${errorDescription})`);
  });

  window.webContents.on("render-process-gone", (_event, details) => {
    clearSmokeTimeout();
    finishLiveCreateDragSmoke(1, `FAIL smoke:electron-live-create-drag - renderer process exited (${details.reason})`);
  });

  activeLiveCreateDragSmokeReporter = (payload) => {
    clearSmokeTimeout();
    console.log(`MYIDE_LIVE_CREATE_DRAG_RESULT:${JSON.stringify(payload)}`);
    if (payload.status === "pass") {
      finishLiveCreateDragSmoke(0, "PASS smoke:electron-live-create-drag");
      return;
    }

    finishLiveCreateDragSmoke(1, `FAIL smoke:electron-live-create-drag - ${payload.error ?? "renderer reported failure"}`);
  };
}

function attachLiveDonorImportSmokeHandlers(window: BrowserWindow): void {
  if (!isLiveDonorImportSmokeMode) {
    return;
  }

  console.log("MYIDE_LIVE_DONOR_IMPORT_MAIN_READY");
  const timeoutMs = Number.parseInt(process.env.MYIDE_LIVE_DONOR_IMPORT_TIMEOUT_MS ?? "90000", 10);
  const smokeTimeout = setTimeout(() => {
    finishLiveDonorImportSmoke(1, "FAIL smoke:electron-donor-import - timeout waiting for renderer donor import payload");
  }, Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 90000);

  const clearSmokeTimeout = () => {
    clearTimeout(smokeTimeout);
  };

  window.webContents.on("did-fail-load", (_event, errorCode, errorDescription) => {
    clearSmokeTimeout();
    finishLiveDonorImportSmoke(1, `FAIL smoke:electron-donor-import - renderer failed to load (${errorCode} ${errorDescription})`);
  });

  window.webContents.on("render-process-gone", (_event, details) => {
    clearSmokeTimeout();
    finishLiveDonorImportSmoke(1, `FAIL smoke:electron-donor-import - renderer process exited (${details.reason})`);
  });

  activeLiveDonorImportSmokeReporter = (payload) => {
    clearSmokeTimeout();
    console.log(`MYIDE_LIVE_DONOR_IMPORT_RESULT:${JSON.stringify(payload)}`);
    if (payload.status === "pass") {
      finishLiveDonorImportSmoke(0, "PASS smoke:electron-donor-import");
      return;
    }

    finishLiveDonorImportSmoke(1, `FAIL smoke:electron-donor-import - ${payload.error ?? "renderer reported failure"}`);
  };
}

function attachLiveRuntimeSmokeHandlers(window: BrowserWindow): void {
  if (!isLiveRuntimeSmokeMode) {
    return;
  }

  console.log("MYIDE_LIVE_RUNTIME_MAIN_READY");
  const timeoutMs = Number.parseInt(process.env.MYIDE_LIVE_RUNTIME_TIMEOUT_MS ?? "90000", 10);
  const smokeTimeout = setTimeout(() => {
    finishLiveRuntimeSmoke(1, "FAIL smoke:electron-runtime-mode - timeout waiting for renderer runtime payload");
  }, Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 90000);

  const clearSmokeTimeout = () => {
    clearTimeout(smokeTimeout);
  };

  window.webContents.on("did-fail-load", (_event, errorCode, errorDescription) => {
    clearSmokeTimeout();
    finishLiveRuntimeSmoke(1, `FAIL smoke:electron-runtime-mode - renderer failed to load (${errorCode} ${errorDescription})`);
  });

  window.webContents.on("render-process-gone", (_event, details) => {
    clearSmokeTimeout();
    finishLiveRuntimeSmoke(1, `FAIL smoke:electron-runtime-mode - renderer process exited (${details.reason})`);
  });

  activeLiveRuntimeSmokeReporter = (payload) => {
    clearSmokeTimeout();
    console.log(`MYIDE_LIVE_RUNTIME_RESULT:${JSON.stringify(payload)}`);
    if (payload.status === "pass") {
      finishLiveRuntimeSmoke(0, "PASS smoke:electron-runtime-mode");
      return;
    }

    finishLiveRuntimeSmoke(1, `FAIL smoke:electron-runtime-mode - ${payload.error ?? "renderer reported failure"}`);
  };
}

function attachLiveDuplicateDeleteSmokeHandlers(window: BrowserWindow): void {
  if (!isLiveDuplicateDeleteSmokeMode) {
    return;
  }

  console.log("MYIDE_LIVE_DUPLICATE_DELETE_MAIN_READY");
  const timeoutMs = Number.parseInt(process.env.MYIDE_LIVE_DUPLICATE_DELETE_TIMEOUT_MS ?? "45000", 10);
  const smokeTimeout = setTimeout(() => {
    finishLiveDuplicateDeleteSmoke(1, "FAIL smoke:electron-live-duplicate-delete - timeout waiting for renderer duplicate-delete payload");
  }, Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 45000);

  const clearSmokeTimeout = () => {
    clearTimeout(smokeTimeout);
  };

  window.webContents.on("did-fail-load", (_event, errorCode, errorDescription) => {
    clearSmokeTimeout();
    finishLiveDuplicateDeleteSmoke(1, `FAIL smoke:electron-live-duplicate-delete - renderer failed to load (${errorCode} ${errorDescription})`);
  });

  window.webContents.on("render-process-gone", (_event, details) => {
    clearSmokeTimeout();
    finishLiveDuplicateDeleteSmoke(1, `FAIL smoke:electron-live-duplicate-delete - renderer process exited (${details.reason})`);
  });

  activeLiveDuplicateDeleteSmokeReporter = (payload) => {
    clearSmokeTimeout();
    console.log(`MYIDE_LIVE_DUPLICATE_DELETE_RESULT:${JSON.stringify(payload)}`);
    if (payload.status === "pass") {
      finishLiveDuplicateDeleteSmoke(0, "PASS smoke:electron-live-duplicate-delete");
      return;
    }

    finishLiveDuplicateDeleteSmoke(1, `FAIL smoke:electron-live-duplicate-delete - ${payload.error ?? "renderer reported failure"}`);
  };
}

function attachLiveReorderSmokeHandlers(window: BrowserWindow): void {
  if (!isLiveReorderSmokeMode) {
    return;
  }

  console.log("MYIDE_LIVE_REORDER_MAIN_READY");
  const timeoutMs = Number.parseInt(process.env.MYIDE_LIVE_REORDER_TIMEOUT_MS ?? "45000", 10);
  const smokeTimeout = setTimeout(() => {
    finishLiveReorderSmoke(1, "FAIL smoke:electron-live-reorder - timeout waiting for renderer reorder payload");
  }, Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 45000);

  const clearSmokeTimeout = () => {
    clearTimeout(smokeTimeout);
  };

  window.webContents.on("did-fail-load", (_event, errorCode, errorDescription) => {
    clearSmokeTimeout();
    finishLiveReorderSmoke(1, `FAIL smoke:electron-live-reorder - renderer failed to load (${errorCode} ${errorDescription})`);
  });

  window.webContents.on("render-process-gone", (_event, details) => {
    clearSmokeTimeout();
    finishLiveReorderSmoke(1, `FAIL smoke:electron-live-reorder - renderer process exited (${details.reason})`);
  });

  activeLiveReorderSmokeReporter = (payload) => {
    clearSmokeTimeout();
    console.log(`MYIDE_LIVE_REORDER_RESULT:${JSON.stringify(payload)}`);
    if (payload.status === "pass") {
      finishLiveReorderSmoke(0, "PASS smoke:electron-live-reorder");
      return;
    }

    finishLiveReorderSmoke(1, `FAIL smoke:electron-live-reorder - ${payload.error ?? "renderer reported failure"}`);
  };
}

function attachLiveLayerReassignSmokeHandlers(window: BrowserWindow): void {
  if (!isLiveLayerReassignSmokeMode) {
    return;
  }

  console.log("MYIDE_LIVE_LAYER_REASSIGN_MAIN_READY");
  const timeoutMs = Number.parseInt(process.env.MYIDE_LIVE_LAYER_REASSIGN_TIMEOUT_MS ?? "45000", 10);
  const smokeTimeout = setTimeout(() => {
    finishLiveLayerReassignSmoke(1, "FAIL smoke:electron-live-layer-reassign - timeout waiting for renderer layer-reassign payload");
  }, Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 45000);

  const clearSmokeTimeout = () => {
    clearTimeout(smokeTimeout);
  };

  window.webContents.on("did-fail-load", (_event, errorCode, errorDescription) => {
    clearSmokeTimeout();
    finishLiveLayerReassignSmoke(1, `FAIL smoke:electron-live-layer-reassign - renderer failed to load (${errorCode} ${errorDescription})`);
  });

  window.webContents.on("render-process-gone", (_event, details) => {
    clearSmokeTimeout();
    finishLiveLayerReassignSmoke(1, `FAIL smoke:electron-live-layer-reassign - renderer process exited (${details.reason})`);
  });

  activeLiveLayerReassignSmokeReporter = (payload) => {
    clearSmokeTimeout();
    console.log(`MYIDE_LIVE_LAYER_REASSIGN_RESULT:${JSON.stringify(payload)}`);
    if (payload.status === "pass") {
      finishLiveLayerReassignSmoke(0, "PASS smoke:electron-live-layer-reassign");
      return;
    }

    finishLiveLayerReassignSmoke(1, `FAIL smoke:electron-live-layer-reassign - ${payload.error ?? "renderer reported failure"}`);
  };
}

function attachLiveResizeSmokeHandlers(window: BrowserWindow): void {
  if (!isLiveResizeSmokeMode) {
    return;
  }

  console.log("MYIDE_LIVE_RESIZE_MAIN_READY");
  const timeoutMs = Number.parseInt(process.env.MYIDE_LIVE_RESIZE_TIMEOUT_MS ?? "45000", 10);
  const smokeTimeout = setTimeout(() => {
    finishLiveResizeSmoke(1, "FAIL smoke:electron-live-resize - timeout waiting for renderer resize payload");
  }, Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 45000);

  const clearSmokeTimeout = () => {
    clearTimeout(smokeTimeout);
  };

  window.webContents.on("did-fail-load", (_event, errorCode, errorDescription) => {
    clearSmokeTimeout();
    finishLiveResizeSmoke(1, `FAIL smoke:electron-live-resize - renderer failed to load (${errorCode} ${errorDescription})`);
  });

  window.webContents.on("render-process-gone", (_event, details) => {
    clearSmokeTimeout();
    finishLiveResizeSmoke(1, `FAIL smoke:electron-live-resize - renderer process exited (${details.reason})`);
  });

  activeLiveResizeSmokeReporter = (payload) => {
    clearSmokeTimeout();
    console.log(`MYIDE_LIVE_RESIZE_RESULT:${JSON.stringify(payload)}`);
    if (payload.status === "pass") {
      finishLiveResizeSmoke(0, "PASS smoke:electron-live-resize");
      return;
    }

    finishLiveResizeSmoke(1, `FAIL smoke:electron-live-resize - ${payload.error ?? "renderer reported failure"}`);
  };
}

function attachLiveAlignSmokeHandlers(window: BrowserWindow): void {
  if (!isLiveAlignSmokeMode) {
    return;
  }

  console.log("MYIDE_LIVE_ALIGN_MAIN_READY");
  const timeoutMs = Number.parseInt(process.env.MYIDE_LIVE_ALIGN_TIMEOUT_MS ?? "45000", 10);
  const smokeTimeout = setTimeout(() => {
    finishLiveAlignSmoke(1, "FAIL smoke:electron-live-align - timeout waiting for renderer align payload");
  }, Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 45000);

  const clearSmokeTimeout = () => {
    clearTimeout(smokeTimeout);
  };

  window.webContents.on("did-fail-load", (_event, errorCode, errorDescription) => {
    clearSmokeTimeout();
    finishLiveAlignSmoke(1, `FAIL smoke:electron-live-align - renderer failed to load (${errorCode} ${errorDescription})`);
  });

  window.webContents.on("render-process-gone", (_event, details) => {
    clearSmokeTimeout();
    finishLiveAlignSmoke(1, `FAIL smoke:electron-live-align - renderer process exited (${details.reason})`);
  });

  activeLiveAlignSmokeReporter = (payload) => {
    clearSmokeTimeout();
    console.log(`MYIDE_LIVE_ALIGN_RESULT:${JSON.stringify(payload)}`);
    if (payload.status === "pass") {
      finishLiveAlignSmoke(0, "PASS smoke:electron-live-align");
      return;
    }

    finishLiveAlignSmoke(1, `FAIL smoke:electron-live-align - ${payload.error ?? "renderer reported failure"}`);
  };
}

function attachLiveUndoRedoSmokeHandlers(window: BrowserWindow): void {
  if (!isLiveUndoRedoSmokeMode) {
    return;
  }

  console.log("MYIDE_LIVE_UNDO_REDO_MAIN_READY");
  const timeoutMs = Number.parseInt(process.env.MYIDE_LIVE_UNDO_REDO_TIMEOUT_MS ?? "45000", 10);
  const smokeTimeout = setTimeout(() => {
    finishLiveUndoRedoSmoke(1, "FAIL smoke:electron-live-undo-redo - timeout waiting for renderer undo/redo payload");
  }, Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 45000);

  const clearSmokeTimeout = () => {
    clearTimeout(smokeTimeout);
  };

  window.webContents.on("did-fail-load", (_event, errorCode, errorDescription) => {
    clearSmokeTimeout();
    finishLiveUndoRedoSmoke(1, `FAIL smoke:electron-live-undo-redo - renderer failed to load (${errorCode} ${errorDescription})`);
  });

  window.webContents.on("render-process-gone", (_event, details) => {
    clearSmokeTimeout();
    finishLiveUndoRedoSmoke(1, `FAIL smoke:electron-live-undo-redo - renderer process exited (${details.reason})`);
  });

  activeLiveUndoRedoSmokeReporter = (payload) => {
    clearSmokeTimeout();
    console.log(`MYIDE_LIVE_UNDO_REDO_RESULT:${JSON.stringify(payload)}`);
    if (payload.status === "pass") {
      finishLiveUndoRedoSmoke(0, "PASS smoke:electron-live-undo-redo");
      return;
    }

    finishLiveUndoRedoSmoke(1, `FAIL smoke:electron-live-undo-redo - ${payload.error ?? "renderer reported failure"}`);
  };
}

function createWindow(): void {
  const preloadPath = resolvePreloadPath();
  const runtimeInspectorPreloadPath = resolveRuntimeInspectorPreloadPath();
  resetBridgeHealthState(preloadPath);

  const window = new BrowserWindow({
    width: 1600,
    height: 980,
    minWidth: 1280,
    minHeight: 800,
    show: getInitialWindowVisibility(),
    backgroundColor: "#0b1017",
    title: "MyIDE",
    webPreferences: {
      preload: preloadPath,
      backgroundThrottling: false,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webviewTag: true
    }
  });

  const rendererPath = path.resolve(__dirname, "../../../30_app/shell/renderer/index.html");
  attachBridgeSmokeHandlers(window);
  attachLivePersistSmokeHandlers(window);
  attachLiveDragSmokeHandlers(window);
  attachLiveCreateDragSmokeHandlers(window);
  attachLiveDonorImportSmokeHandlers(window);
  attachLiveRuntimeSmokeHandlers(window);
  attachLiveDuplicateDeleteSmokeHandlers(window);
  attachLiveReorderSmokeHandlers(window);
  attachLiveLayerReassignSmokeHandlers(window);
  attachLiveResizeSmokeHandlers(window);
  attachLiveAlignSmokeHandlers(window);
  attachLiveUndoRedoSmokeHandlers(window);
  if (isLiveRuntimeSmokeMode) {
    const runtimeSmokeWebContents = window.webContents as Electron.WebContents & {
      on: (event: string, listener: (...args: any[]) => void) => Electron.WebContents;
    };
    runtimeSmokeWebContents.on("console-message", (...args: any[]) => {
      const params = args[1] && typeof args[1] === "object" ? args[1] as { message?: string } : {};
      const message = typeof params.message === "string" ? params.message : "";
      if (typeof message === "string" && message.startsWith("MYIDE_LIVE_RUNTIME_PROGRESS:")) {
        console.log(message);
      }
    });
  }
  window.webContents.on(
    "will-attach-webview",
    (_event, webPreferences, params: { partition?: string | undefined }) => {
      if (params.partition !== runtimeWebviewPartition) {
        return;
      }

      webPreferences.preload = runtimeInspectorPreloadPath;
      webPreferences.contextIsolation = true;
      webPreferences.nodeIntegration = false;
      webPreferences.sandbox = true;
    }
  );
  const query = {
    ...(isBridgeSmokeMode ? { bridgeSmoke: "1" } : {}),
    ...(isLivePersistSmokeMode ? { livePersistSmoke: "1" } : {}),
    ...(shouldKeepLivePersistWindowOpen ? { livePersistKeepOpen: "1" } : {}),
    ...(isLiveDragSmokeMode ? { liveDragSmoke: "1" } : {}),
    ...(shouldKeepLiveDragWindowOpen ? { liveDragKeepOpen: "1" } : {}),
    ...(isLiveCreateDragSmokeMode ? { liveCreateDragSmoke: "1" } : {}),
    ...(shouldKeepLiveCreateDragWindowOpen ? { liveCreateDragKeepOpen: "1" } : {}),
    ...(isLiveDonorImportSmokeMode ? { liveDonorImportSmoke: "1" } : {}),
    ...(isLiveRuntimeSmokeMode ? { liveRuntimeSmoke: "1" } : {}),
    ...(isLiveDuplicateDeleteSmokeMode ? { liveDuplicateDeleteSmoke: "1" } : {}),
    ...(shouldKeepLiveDuplicateDeleteWindowOpen ? { liveDuplicateDeleteKeepOpen: "1" } : {}),
    ...(isLiveReorderSmokeMode ? { liveReorderSmoke: "1" } : {}),
    ...(shouldKeepLiveReorderWindowOpen ? { liveReorderKeepOpen: "1" } : {}),
    ...(isLiveLayerReassignSmokeMode ? { liveLayerReassignSmoke: "1" } : {}),
    ...(shouldKeepLiveLayerReassignWindowOpen ? { liveLayerReassignKeepOpen: "1" } : {}),
    ...(isLiveResizeSmokeMode ? { liveResizeSmoke: "1" } : {}),
    ...(shouldKeepLiveResizeWindowOpen ? { liveResizeKeepOpen: "1" } : {}),
    ...(isLiveAlignSmokeMode ? { liveAlignSmoke: "1" } : {}),
    ...(shouldKeepLiveAlignWindowOpen ? { liveAlignKeepOpen: "1" } : {}),
    ...(isLiveUndoRedoSmokeMode ? { liveUndoRedoSmoke: "1" } : {}),
    ...(shouldKeepLiveUndoRedoWindowOpen ? { liveUndoRedoKeepOpen: "1" } : {})
  };
  void window.loadFile(rendererPath, query ? { query } : undefined);
}

if (shouldDisableHardwareAcceleration) {
  app.disableHardwareAcceleration();
} else {
  // Runtime Debug Host needs WebGL; let Electron use the GPU unless explicitly forced off.
  app.commandLine.appendSwitch("ignore-gpu-blocklist");
}
app.setAppUserModelId("dev.myide");

ipcMain.on("myide:preload-ready", () => {
  bridgeHealthState.preloadExecuted = true;
});

ipcMain.handle("myide:ping", async () => {
  bridgeHealthState.bridgeExposed = true;
  bridgeHealthState.lastPingAt = new Date().toISOString();
  return {
    ok: true,
    stamp: bridgeHealthState.lastPingAt,
    preloadPath: bridgeHealthState.preloadPath
  };
});

ipcMain.handle("myide:bridge-health", async () => getBridgeHealthSnapshot());

ipcMain.handle("myide:renderer-ready", async () => {
  bridgeHealthState.bridgeExposed = true;
  bridgeHealthState.rendererReady = true;
  bridgeHealthState.lastRendererReadyAt = new Date().toISOString();
  return getBridgeHealthSnapshot();
});

ipcMain.on("myide:bridge-smoke-result", (_event, payload: BridgeSmokePayload) => {
  if (typeof activeBridgeSmokeReporter === "function") {
    activeBridgeSmokeReporter(payload ?? {});
  }
});

ipcMain.on("myide:live-persist-smoke-result", (_event, payload: LivePersistSmokePayload) => {
  if (typeof activeLivePersistSmokeReporter === "function") {
    activeLivePersistSmokeReporter(payload ?? {});
  }
});

ipcMain.on("myide:live-drag-smoke-result", (_event, payload: LiveDragSmokePayload) => {
  if (typeof activeLiveDragSmokeReporter === "function") {
    activeLiveDragSmokeReporter(payload ?? {});
  }
});

ipcMain.on("myide:live-create-drag-smoke-result", (_event, payload: LiveCreateDragSmokePayload) => {
  if (typeof activeLiveCreateDragSmokeReporter === "function") {
    activeLiveCreateDragSmokeReporter(payload ?? {});
  }
});

ipcMain.on("myide:live-donor-import-smoke-result", (_event, payload: LiveDonorImportSmokePayload) => {
  if (typeof activeLiveDonorImportSmokeReporter === "function") {
    activeLiveDonorImportSmokeReporter(payload ?? {});
  }
});

ipcMain.on("myide:live-runtime-smoke-result", (_event, payload: LiveRuntimeSmokePayload) => {
  if (typeof activeLiveRuntimeSmokeReporter === "function") {
    activeLiveRuntimeSmokeReporter(payload ?? {});
  }
});

ipcMain.on("myide:live-runtime-smoke-progress", (_event, payload: unknown) => {
  if (!isLiveRuntimeSmokeMode) {
    return;
  }

  try {
    console.log(`MYIDE_LIVE_RUNTIME_PROGRESS:${JSON.stringify(payload ?? {})}`);
  } catch {
    console.log("MYIDE_LIVE_RUNTIME_PROGRESS:{}");
  }
});

ipcMain.on("myide:live-duplicate-delete-smoke-result", (_event, payload: LiveDuplicateDeleteSmokePayload) => {
  if (typeof activeLiveDuplicateDeleteSmokeReporter === "function") {
    activeLiveDuplicateDeleteSmokeReporter(payload ?? {});
  }
});

ipcMain.on("myide:live-reorder-smoke-result", (_event, payload: LiveReorderSmokePayload) => {
  if (typeof activeLiveReorderSmokeReporter === "function") {
    activeLiveReorderSmokeReporter(payload ?? {});
  }
});

ipcMain.on("myide:live-layer-reassign-smoke-result", (_event, payload: LiveLayerReassignSmokePayload) => {
  if (typeof activeLiveLayerReassignSmokeReporter === "function") {
    activeLiveLayerReassignSmokeReporter(payload ?? {});
  }
});

ipcMain.on("myide:live-resize-smoke-result", (_event, payload: LiveResizeSmokePayload) => {
  if (typeof activeLiveResizeSmokeReporter === "function") {
    activeLiveResizeSmokeReporter(payload ?? {});
  }
});

ipcMain.on("myide:live-align-smoke-result", (_event, payload: LiveAlignSmokePayload) => {
  if (typeof activeLiveAlignSmokeReporter === "function") {
    activeLiveAlignSmokeReporter(payload ?? {});
  }
});

ipcMain.on("myide:live-undo-redo-smoke-result", (_event, payload: LiveUndoRedoSmokePayload) => {
  if (typeof activeLiveUndoRedoSmokeReporter === "function") {
    activeLiveUndoRedoSmokeReporter(payload ?? {});
  }
});

ipcMain.handle("myide:load-project-slice", async (_event, selectedProjectId?: string) => {
  bridgeHealthState.bridgeExposed = true;
  bridgeHealthState.lastProjectLoadAt = new Date().toISOString();
  bridgeHealthState.lastProjectLoadRequestedProjectId = selectedProjectId ?? null;
  bridgeHealthState.lastProjectLoadError = null;

  try {
    const bundle = await loadProjectSlice(selectedProjectId);
    bridgeHealthState.lastSelectedProjectId = bundle.selectedProjectId ?? null;
    bridgeHealthState.workspaceProjectCount = Array.isArray(bundle.workspace?.projects) ? bundle.workspace.projects.length : 0;
    return bundle;
  } catch (error) {
    bridgeHealthState.lastSelectedProjectId = null;
    bridgeHealthState.workspaceProjectCount = 0;
    bridgeHealthState.lastProjectLoadError = error instanceof Error ? error.message : String(error);
    throw error;
  }
});
ipcMain.handle("myide:create-project", async (_event, input: ShellCreateProjectInput) => createProjectFromInput(input));
ipcMain.handle("myide:save-project-editor", async (_event, projectId: string, data: EditableProjectData) => {
  const workspace = await loadWorkspaceSlice();
  const selectedProject = workspace.projects.find((entry) => entry.projectId === projectId);

  if (!selectedProject) {
    throw new Error(`Unknown project for editor save: ${projectId}`);
  }

  return saveEditableProjectData(path.resolve(__dirname, "../../..", selectedProject.keyPaths.projectRoot), data);
});
ipcMain.handle("myide:get-runtime-resource-map", async (_event, projectId: string) => {
  return buildRuntimeResourceMapStatus(projectId);
});
ipcMain.handle("myide:reset-runtime-resource-map", async (_event, projectId: string) => {
  runtimeAssetOverrideHits.clear();
  recentRuntimeObservationFingerprints.clear();
  setRuntimeRequestStage("launch");
  const status = resetRuntimeResourceMap(projectId);
  scheduleRuntimeResourceMapSnapshotWrite();
  return status;
});
ipcMain.handle("myide:set-runtime-request-stage", async (_event, stage: string) => {
  setRuntimeRequestStage(stage);
  return { stage: runtimeRequestStage };
});
ipcMain.handle("myide:clear-runtime-cache", async () => clearRuntimeWebviewCache());
ipcMain.handle("myide:open-runtime-debug-host", async (_event, options?: RuntimeDebugHostOptions | null) => {
  return runRuntimeDebugHost({
    ...(options ?? {}),
    showWindow: true,
    smokeMode: false,
    closeWhenDone: false
  });
});
ipcMain.handle("myide:run-donor-scan-capture", async (_event, donorId: string, limit?: number, family?: string, mode?: string) => {
  return captureNextTargets({
    donorId,
    limit: typeof limit === "number" ? limit : undefined,
    family: typeof family === "string" ? family : undefined,
    mode: mode === "family-sources" ? "family-sources" : "ranked-targets"
  });
});
ipcMain.handle("myide:run-donor-scan-family-action", async (_event, donorId: string, family: string, limit?: number) => {
  return runFamilyAction({
    donorId,
    family,
    limit: typeof limit === "number" ? limit : undefined
  });
});
ipcMain.handle("myide:run-donor-scan-scenario", async (_event, donorId: string, profileId: string, minutes?: number, donorName?: string) => {
  return runScenarioScan({
    donorId,
    donorName: typeof donorName === "string" && donorName.length > 0 ? donorName : donorId,
    profileId,
    minutesRequested: typeof minutes === "number" && Number.isFinite(minutes) && minutes > 0 ? minutes : 5
  });
});
ipcMain.handle("myide:run-donor-scan-promotion", async (_event, donorId: string, donorName?: string) => {
  return runPromotionQueue({
    donorId,
    donorName: typeof donorName === "string" && donorName.length > 0 ? donorName : donorId,
    scenarioIds: []
  });
});
ipcMain.handle("myide:prepare-project-modification-handoff", async (_event, projectId: string) => {
  return prepareProjectModificationHandoff(projectId);
});
ipcMain.handle("myide:run-donor-scan-section-action", async (_event, donorId: string, sectionKey: string) => {
  return runSectionAction({
    donorId,
    sectionKey
  });
});
ipcMain.handle("myide:get-runtime-override-status", async (_event, projectId: string) => {
  return buildRuntimeAssetOverrideStatus(projectId, runtimeAssetOverrideHits);
});
ipcMain.handle("myide:create-runtime-override", async (_event, projectId: string, runtimeSourceUrl: string, donorAssetId: string) => {
  runtimeAssetOverrideHits.delete(runtimeSourceUrl);
  const status = await createRuntimeAssetOverride({
    projectId,
    runtimeSourceUrl,
    donorAssetId
  });
  await refreshRuntimeAssetOverrideRedirects();
  return buildRuntimeAssetOverrideStatus(projectId, runtimeAssetOverrideHits);
});
ipcMain.handle("myide:clear-runtime-override", async (_event, projectId: string, runtimeSourceUrl: string) => {
  runtimeAssetOverrideHits.delete(runtimeSourceUrl);
  await clearRuntimeAssetOverride(projectId, runtimeSourceUrl);
  await refreshRuntimeAssetOverrideRedirects();
  return buildRuntimeAssetOverrideStatus(projectId, runtimeAssetOverrideHits);
});

app.whenReady().then(() => {
  void refreshRuntimeAssetOverrideRedirects()
    .catch((error) => {
      console.error(`MYIDE_RUNTIME_OVERRIDE_INIT_FAIL:${error instanceof Error ? error.message : String(error)}`);
    })
    .finally(() => {
      installRuntimeAssetOverrideInterception();
      void startRuntimeLocalMirrorServer()
        .catch((error) => {
          console.error(`MYIDE_RUNTIME_MIRROR_SERVER_FAIL:${error instanceof Error ? error.message : String(error)}`);
        })
        .finally(() => {
          if (isRuntimeDebugHostMode) {
            void runRuntimeDebugHost({
              showWindow: shouldShowRuntimeDebugWindow,
              smokeMode: isRuntimeDebugSmokeMode,
              closeWhenDone: !shouldShowRuntimeDebugWindow
            });
            return;
          }

          createWindow();
        });
    });

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    if (isRuntimeDebugHostMode) {
      void runRuntimeDebugHost({
        showWindow: shouldShowRuntimeDebugWindow,
        smokeMode: isRuntimeDebugSmokeMode,
        closeWhenDone: !shouldShowRuntimeDebugWindow
      });
      return;
    }

      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  runtimeLocalMirrorServer?.close();
  runtimeLocalMirrorServer = null;
});
