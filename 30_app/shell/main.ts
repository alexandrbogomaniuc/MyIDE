import { app, BrowserWindow, ipcMain, session } from "electron";
import { existsSync, promises as fs } from "node:fs";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { createServer as createNetServer } from "node:net";
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
  describeRuntimeOverrideDonorSource,
  loadPreferredRuntimeOverrideDonorAsset,
  type RuntimeAssetOverrideHitInfo
} from "../workspace/donorOverride";
import {
  buildLocalRuntimeMirrorAssetUrl,
  buildLocalRuntimeLaunchHtml,
  buildLocalRuntimeMirrorProxyUrl,
  buildLocalRuntimeMirrorRedirectMap,
  findLocalRuntimeMirrorEntry,
  findLocalRuntimeMirrorEntryByRelativePath,
  getLocalRuntimeMirrorRelativePath,
  buildLocalRuntimeMirrorStatus,
  getLocalRuntimeMirrorPort,
  setLocalRuntimeMirrorPort,
  getMirrorLaunchUrl,
  readLocalRuntimeMirrorFile,
  readLocalRuntimeMirrorFileByRelativePath,
  type LocalRuntimeMirrorStatus
} from "../runtime/localRuntimeMirror";
import {
  buildRuntimeResourceMapStatus,
  loadRuntimeResourceMapStatus,
  exportRuntimeResourceMapSnapshotSync,
  recordRuntimeResourceRequest,
  resetRuntimeResourceMap
} from "../runtime/runtimeResourceMap";
import {
  buildRuntimePageProofStatus,
  saveRuntimePageProof,
  type SaveRuntimePageProofInput
} from "../runtime/runtimePageProofs";
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
import { runDonorScan } from "../../tools/donor-scan/runDonorScan";
import { runScenarioScan } from "../../tools/donor-scan/runScenarioScan";
import { runPromotionQueue } from "../../tools/donor-scan/runPromotionQueue";
import { runSectionAction } from "../../tools/donor-scan/runSectionAction";
import { getScenarioProfile } from "../../tools/donor-scan/scenarioProfiles";

const isBridgeSmokeMode = process.env.MYIDE_BRIDGE_SMOKE === "1";
const isWizardMode = process.env.MYIDE_WIZARD_MODE === "1";
const isRuntimeDebugSmokeMode = process.env.MYIDE_RUNTIME_DEBUG_SMOKE === "1";
const isRuntimeDebugHostMode = process.env.MYIDE_RUNTIME_DEBUG_HOST === "1" || isRuntimeDebugSmokeMode;
const isLivePersistSmokeMode = process.env.MYIDE_LIVE_PERSIST_SMOKE === "1";
const isLiveDragSmokeMode = process.env.MYIDE_LIVE_DRAG_SMOKE === "1";
const isLiveCreateDragSmokeMode = process.env.MYIDE_LIVE_CREATE_DRAG_SMOKE === "1";
const isLiveDonorImportSmokeMode = process.env.MYIDE_LIVE_DONOR_IMPORT_SMOKE === "1";
const isLiveRuntimePageProofRelaunchSmokeMode = process.env.MYIDE_LIVE_RUNTIME_PAGE_PROOF_RELAUNCH_SMOKE === "1";
const isLiveRuntimeSelectedProjectReopenSmokeMode = process.env.MYIDE_LIVE_RUNTIME_SELECTED_PROJECT_REOPEN_SMOKE === "1";
const isLiveRuntimeSelectedProjectHarvestSmokeMode = process.env.MYIDE_LIVE_RUNTIME_SELECTED_PROJECT_HARVEST_SMOKE === "1";
const isLiveRuntimeSelectedProjectOverrideSmokeMode = process.env.MYIDE_LIVE_RUNTIME_SELECTED_PROJECT_OVERRIDE_SMOKE === "1";
const isLiveRuntimeSmokeMode = process.env.MYIDE_LIVE_RUNTIME_SMOKE === "1";
const isRuntimeSelectedProjectRouteSmokeMode = process.env.MYIDE_RUNTIME_SELECTED_PROJECT_ROUTE_SMOKE === "1";
const isRuntimeSelectedProjectRedirectSmokeMode = process.env.MYIDE_RUNTIME_SELECTED_PROJECT_REDIRECT_SMOKE === "1";
const isRuntimeSelectedProjectObservationSmokeMode = process.env.MYIDE_RUNTIME_SELECTED_PROJECT_UPSTREAM_OBSERVATION_SMOKE === "1";
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

interface LiveRuntimePageProofRelaunchSmokePayload {
  status?: string;
  error?: string;
}

interface LiveRuntimeSelectedProjectReopenSmokePayload {
  status?: string;
  error?: string;
}

interface LiveRuntimeSelectedProjectHarvestSmokePayload {
  status?: string;
  error?: string;
}

interface LiveRuntimeSelectedProjectOverrideSmokePayload {
  status?: string;
  error?: string;
}

interface RuntimeDebugSmokePayload {
  status?: string;
  error?: string;
}

interface RuntimeDebugHostOptions {
  projectId?: string | null;
  showWindow?: boolean;
  smokeMode?: boolean;
  closeWhenDone?: boolean;
  proofMode?: boolean;
  profileId?: string | null;
  candidateHintTokens?: string[] | null;
  allowMissingDonorAsset?: boolean;
}

type RuntimeDebugHostResult = Record<string, unknown>;

type FileEvidenceRequest = {
  label: string;
  path: string;
};

type FileEvidenceResponse = {
  label: string;
  path: string;
  exists: boolean;
  size: number | null;
  modifiedAt: string | null;
  error?: string;
};

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
let activeLiveRuntimePageProofRelaunchSmokeReporter: ((payload: LiveRuntimePageProofRelaunchSmokePayload) => void) | null = null;
let activeLiveRuntimeSelectedProjectReopenSmokeReporter: ((payload: LiveRuntimeSelectedProjectReopenSmokePayload) => void) | null = null;
let activeLiveRuntimeSelectedProjectHarvestSmokeReporter: ((payload: LiveRuntimeSelectedProjectHarvestSmokePayload) => void) | null = null;
let activeLiveRuntimeSelectedProjectOverrideSmokeReporter: ((payload: LiveRuntimeSelectedProjectOverrideSmokePayload) => void) | null = null;
let activeLiveRuntimeSmokeReporter: ((payload: LiveRuntimeSmokePayload) => void) | null = null;
let activeLiveDuplicateDeleteSmokeReporter: ((payload: LiveDuplicateDeleteSmokePayload) => void) | null = null;
let activeLiveReorderSmokeReporter: ((payload: LiveReorderSmokePayload) => void) | null = null;
let activeLiveLayerReassignSmokeReporter: ((payload: LiveLayerReassignSmokePayload) => void) | null = null;
let activeLiveResizeSmokeReporter: ((payload: LiveResizeSmokePayload) => void) | null = null;
let activeLiveAlignSmokeReporter: ((payload: LiveAlignSmokePayload) => void) | null = null;
let activeLiveUndoRedoSmokeReporter: ((payload: LiveUndoRedoSmokePayload) => void) | null = null;
const runtimeAssetOverrideRedirectMaps = new Map<string, Map<string, string>>();
const runtimeLocalMirrorRedirectMaps = new Map<string, Map<string, string>>();
let runtimeAssetOverrideInterceptionInstalled = false;
const runtimeAssetOverrideHits = new Map<string, RuntimeAssetOverrideHitInfo>();
const runtimeWebviewPartition = "persist:myide-runtime-project001";
const runtimeDebugPartition = "persist:myide-runtime-debug-project001";
const runtimeLocalMirrorStatuses = new Map<string, LocalRuntimeMirrorStatus>();
const knownRuntimeProjectIds = new Set<string>(["project_001"]);
let runtimeLocalMirrorServer: Server | null = null;
let runtimeRequestStage = "launch";
const recentRuntimeObservationFingerprints = new Map<string, number>();
let activeRuntimeDebugWindow: BrowserWindow | null = null;
let activeRuntimeDebugProjectId: string | null = null;
let activeRuntimeRequestProjectId: string | null = null;
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

function finishLiveRuntimePageProofRelaunchSmoke(exitCode: number, message: string): void {
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

function finishRuntimeSelectedProjectRouteSmoke(exitCode: number, message: string): void {
  if (exitCode === 0) {
    console.log(message);
  } else {
    console.error(message);
  }

  setTimeout(() => {
    app.exit(exitCode);
  }, 0);
}

function finishRuntimeSelectedProjectRedirectSmoke(exitCode: number, message: string): void {
  if (exitCode === 0) {
    console.log(message);
  } else {
    console.error(message);
  }

  setTimeout(() => {
    app.exit(exitCode);
  }, 0);
}

function finishRuntimeSelectedProjectObservationSmoke(exitCode: number, message: string): void {
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

function getRuntimeLocalMirrorStatus(projectId: string): LocalRuntimeMirrorStatus | null {
  return runtimeLocalMirrorStatuses.get(projectId) ?? null;
}

function getRuntimeLocalMirrorRedirectMap(projectId: string): Map<string, string> {
  return runtimeLocalMirrorRedirectMaps.get(projectId) ?? new Map<string, string>();
}

function getRuntimeAssetOverrideRedirectMap(projectId: string): Map<string, string> {
  return runtimeAssetOverrideRedirectMaps.get(projectId) ?? new Map<string, string>();
}

function rememberRuntimeProjectId(projectId: string): void {
  if (typeof projectId !== "string" || !/^[A-Za-z0-9._-]+$/.test(projectId)) {
    return;
  }
  knownRuntimeProjectIds.add(projectId);
}

async function refreshRuntimeAssetOverrideRedirects(projectId = "project_001"): Promise<void> {
  const [overrideStatus, mirrorStatus] = await Promise.all([
    buildRuntimeAssetOverrideStatus(projectId, runtimeAssetOverrideHits),
    buildLocalRuntimeMirrorStatus(projectId)
  ]);
  rememberRuntimeProjectId(projectId);
  runtimeAssetOverrideRedirectMaps.set(projectId, buildRuntimeAssetOverrideRedirectMap(overrideStatus));
  runtimeLocalMirrorStatuses.set(projectId, mirrorStatus);
  runtimeLocalMirrorRedirectMaps.set(projectId, buildLocalRuntimeMirrorRedirectMap(mirrorStatus));
}

async function ensureRuntimeProjectCaches(projectId: string): Promise<void> {
  if (
    runtimeLocalMirrorStatuses.has(projectId)
    && runtimeLocalMirrorRedirectMaps.has(projectId)
    && runtimeAssetOverrideRedirectMaps.has(projectId)
  ) {
    return;
  }

  await refreshRuntimeAssetOverrideRedirects(projectId);
}

async function primeRuntimeProjectCachesFromWorkspace(): Promise<string[]> {
  const workspace = await loadWorkspaceSlice();
  const projectIds = Array.from(new Set([
    "project_001",
    ...workspace.projects
      .map((entry) => entry?.projectId)
      .filter((value): value is string => typeof value === "string" && value.length > 0)
  ]));
  await Promise.all(projectIds.map(async (projectId) => {
    rememberRuntimeProjectId(projectId);
    await ensureRuntimeProjectCaches(projectId);
  }));
  return projectIds;
}

type RuntimeHarvestCandidateKind = LocalRuntimeMirrorStatus["entries"][number]["kind"];

interface RuntimeHarvestCandidate {
  sourceUrl: string;
  kind: RuntimeHarvestCandidateKind;
  preferAssetRoute: boolean;
}

function inferRuntimeHarvestCandidateKind(
  sourceUrl: string,
  fileType: string | null = null
): RuntimeHarvestCandidateKind | null {
  const normalizedSourceUrl = String(sourceUrl ?? "").toLowerCase();
  const normalizedFileType = String(fileType ?? "").toLowerCase();

  if (normalizedSourceUrl.startsWith("https://translations.bgaming-network.com/")) {
    return "translation-payload";
  }
  if (normalizedSourceUrl.includes("/wrapper.js") || normalizedSourceUrl.includes("/lobby-bundle.js") || normalizedSourceUrl.includes("/replays.js")) {
    return "support-script";
  }
  if (normalizedSourceUrl.includes("/loader.js")) {
    return "runtime-loader";
  }
  if (normalizedSourceUrl.includes("/bundle.js")) {
    return "runtime-bundle";
  }
  if (
    ["json", "atlas", "plist", "xml", "fnt", "skel"].includes(normalizedFileType)
    || /\.(json|atlas|plist|xml|fnt|skel)(?:$|[?#])/i.test(sourceUrl)
  ) {
    return "runtime-metadata";
  }
  if (
    ["png", "webp", "jpg", "jpeg", "svg", "gif"].includes(normalizedFileType)
    || /\.(png|webp|jpg|jpeg|svg|gif)(?:$|[?#])/i.test(sourceUrl)
  ) {
    return "static-image";
  }
  if (normalizedSourceUrl.endsWith(".js") || /\.js(?:$|[?#])/i.test(sourceUrl)) {
    return "launch-script";
  }

  return null;
}

function resolveRuntimeHarvestLocalMirrorAbsolutePath(entry: {
  localMirrorAbsolutePath?: string | null;
  localMirrorRepoRelativePath?: string | null;
}): string | null {
  const absolutePath = typeof entry.localMirrorAbsolutePath === "string" && entry.localMirrorAbsolutePath.length > 0
    ? entry.localMirrorAbsolutePath
    : null;
  if (absolutePath && existsSync(absolutePath)) {
    return absolutePath;
  }

  const repoRelativePath = typeof entry.localMirrorRepoRelativePath === "string" && entry.localMirrorRepoRelativePath.length > 0
    ? entry.localMirrorRepoRelativePath
    : null;
  if (!repoRelativePath) {
    return null;
  }

  const fallbackAbsolutePath = path.resolve(__dirname, "../../..", repoRelativePath);
  return existsSync(fallbackAbsolutePath) ? fallbackAbsolutePath : null;
}

function getRuntimeHarvestCandidateEntries(
  status: LocalRuntimeMirrorStatus | null | undefined,
  resourceMap: Awaited<ReturnType<typeof loadRuntimeResourceMapStatus>> | null | undefined,
  pageProofStatus: Awaited<ReturnType<typeof buildRuntimePageProofStatus>> | null | undefined
): RuntimeHarvestCandidate[] {
  const candidates = new Map<string, RuntimeHarvestCandidate>();

  for (const entry of status?.entries ?? []) {
    if (
      entry?.fileExists === false
      || typeof entry?.sourceUrl !== "string"
      || entry.sourceUrl.length === 0
      || !inferRuntimeHarvestCandidateKind(entry.sourceUrl, entry.fileType)
    ) {
      continue;
    }

    candidates.set(entry.sourceUrl, {
      sourceUrl: entry.sourceUrl,
      kind: entry.kind,
      preferAssetRoute: entry.kind === "static-image"
    });
  }

  for (const entry of resourceMap?.entries ?? []) {
    if (typeof entry?.canonicalSourceUrl !== "string" || entry.canonicalSourceUrl.length === 0) {
      continue;
    }
    if (candidates.has(entry.canonicalSourceUrl)) {
      continue;
    }

    const kind = inferRuntimeHarvestCandidateKind(entry.canonicalSourceUrl, entry.fileType);
    if (!kind) {
      continue;
    }

    candidates.set(entry.canonicalSourceUrl, {
      sourceUrl: entry.canonicalSourceUrl,
      kind,
      preferAssetRoute: false
    });
  }

  for (const entry of pageProofStatus?.entries ?? []) {
    if (typeof entry?.sourceUrl !== "string" || entry.sourceUrl.length === 0) {
      continue;
    }
    if (candidates.has(entry.sourceUrl)) {
      continue;
    }
    if (!resolveRuntimeHarvestLocalMirrorAbsolutePath(entry)) {
      continue;
    }

    const kind = inferRuntimeHarvestCandidateKind(entry.sourceUrl, path.extname(entry.localMirrorRepoRelativePath ?? "").replace(/^\./, "").toLowerCase() || null);
    if (!kind) {
      continue;
    }

    candidates.set(entry.sourceUrl, {
      sourceUrl: entry.sourceUrl,
      kind,
      preferAssetRoute: false
    });
  }

  return Array.from(candidates.values()).slice(0, 8);
}

function getRuntimeHarvestRequestUrl(
  projectId: string,
  entry: RuntimeHarvestCandidate
): string {
  if (entry.preferAssetRoute && entry.kind === "static-image") {
    const relativePath = getLocalRuntimeMirrorRelativePath(entry.sourceUrl);
    if (relativePath && !relativePath.includes("?")) {
      return buildLocalRuntimeMirrorAssetUrl(projectId, relativePath);
    }
  }

  return buildLocalRuntimeMirrorProxyUrl(projectId, entry.sourceUrl);
}

async function harvestRuntimeRequestEvidence(projectId: string): Promise<{
  projectId: string;
  status: "ready" | "blocked";
  blocker: string | null;
  attemptedSourceCount: number;
  harvestedEntryCount: number;
  overrideEntryCount: number;
  harvestedSourceUrls: string[];
  overrideSourceUrls: string[];
  failedSourceUrls: string[];
  topSourceUrl: string | null;
  resourceMapEntryCount: number;
}> {
  rememberRuntimeProjectId(projectId);
  await ensureRuntimeProjectCaches(projectId);

  const runtimeMirrorStatus = getRuntimeLocalMirrorStatus(projectId);
  const resourceMap = await loadRuntimeResourceMapStatus(projectId);
  const pageProofStatus = await buildRuntimePageProofStatus(projectId);
  const candidates = getRuntimeHarvestCandidateEntries(runtimeMirrorStatus, resourceMap, pageProofStatus);
  if (candidates.length === 0) {
    return {
      projectId,
      status: "blocked",
      blocker: runtimeMirrorStatus?.blocker ?? "No bounded grounded runtime source candidates are indexed for this project yet.",
      attemptedSourceCount: 0,
      harvestedEntryCount: 0,
      overrideEntryCount: 0,
      harvestedSourceUrls: [],
      overrideSourceUrls: [],
      failedSourceUrls: [],
      topSourceUrl: null,
      resourceMapEntryCount: resourceMap.entryCount
    };
  }

  const previousStage = runtimeRequestStage;
  const harvestedSourceUrls: string[] = [];
  const failedSourceUrls: string[] = [];

  try {
    setRuntimeRequestStage("selected-project-harvest");

    for (const entry of candidates) {
      try {
        const response = await fetch(getRuntimeHarvestRequestUrl(projectId, entry), {
          headers: {
            "user-agent": "Mozilla/5.0 (MyIDE selected-project runtime harvest)"
          },
          redirect: "follow"
        });

        if (!response.ok) {
          throw new Error(`${response.status} ${response.statusText}`);
        }

        await response.arrayBuffer();
        harvestedSourceUrls.push(entry.sourceUrl);
      } catch {
        failedSourceUrls.push(entry.sourceUrl);
      }
    }
  } finally {
    setRuntimeRequestStage(previousStage);
  }

  const refreshedResourceMap = await loadRuntimeResourceMapStatus(projectId);
  const harvestedEntries = refreshedResourceMap.entries.filter((entry) => (
    Number(entry.stageHitCounts["selected-project-harvest"] ?? 0) > 0
  ));
  const overrideEntries = harvestedEntries.filter((entry) => entry.requestSource === "project-local-override");

  return {
    projectId,
    status: harvestedEntries.length > 0 ? "ready" : "blocked",
    blocker: harvestedEntries.length > 0
      ? null
      : "The bounded selected-project harvest did not record any grounded runtime requests.",
    attemptedSourceCount: candidates.length,
    harvestedEntryCount: harvestedEntries.length,
    overrideEntryCount: overrideEntries.length,
    harvestedSourceUrls,
    overrideSourceUrls: overrideEntries
      .map((entry) => entry.canonicalSourceUrl)
      .filter((value, index, items) => items.indexOf(value) === index),
    failedSourceUrls,
    topSourceUrl: harvestedEntries[0]?.canonicalSourceUrl ?? harvestedSourceUrls[0] ?? null,
    resourceMapEntryCount: refreshedResourceMap.entryCount
  };
}

async function readRuntimeHarvestFallbackFile(
  projectId: string,
  sourceUrl: string
): Promise<{ absolutePath: string; fileType: string; content: Uint8Array } | null> {
  const resourceMap = await loadRuntimeResourceMapStatus(projectId);
  const matchingEntry = resourceMap.entries.find((entry) => entry.canonicalSourceUrl === sourceUrl);
  if (matchingEntry) {
    const absolutePath = resolveRuntimeHarvestLocalMirrorAbsolutePath(matchingEntry);
    if (!absolutePath) {
      return null;
    }

    return {
      absolutePath,
      fileType: matchingEntry.fileType ?? (path.extname(absolutePath).replace(/^\./, "").toLowerCase() || "bin"),
      content: new Uint8Array(await fs.readFile(absolutePath))
    };
  }

  const pageProofStatus = await buildRuntimePageProofStatus(projectId);
  const matchingProofEntry = pageProofStatus?.entries.find((entry) => entry.sourceUrl === sourceUrl);
  if (!matchingProofEntry) {
    return null;
  }

  const absolutePath = resolveRuntimeHarvestLocalMirrorAbsolutePath(matchingProofEntry);
  if (!absolutePath) {
    return null;
  }

  return {
    absolutePath,
    fileType: path.extname(absolutePath).replace(/^\./, "").toLowerCase() || "bin",
    content: new Uint8Array(await fs.readFile(absolutePath))
  };
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

async function runRuntimeDebugHost(options: RuntimeDebugHostOptions = {}): Promise<RuntimeDebugHostResult | null> {
  const timeoutMs = Number.parseInt(process.env.MYIDE_RUNTIME_DEBUG_TIMEOUT_MS ?? "90000", 10);
  const runtimeInspectorPreloadPath = resolveRuntimeInspectorPreloadPath();
  const requestedProjectId = typeof options.projectId === "string" && /^[A-Za-z0-9._-]+$/.test(options.projectId)
    ? options.projectId
    : typeof process.env.MYIDE_RUNTIME_DEBUG_PROJECT_ID === "string" && /^[A-Za-z0-9._-]+$/.test(process.env.MYIDE_RUNTIME_DEBUG_PROJECT_ID)
      ? process.env.MYIDE_RUNTIME_DEBUG_PROJECT_ID
      : "project_001";
  const projectId = requestedProjectId;
  const showWindow = options.showWindow ?? shouldShowRuntimeDebugWindow;
  const smokeMode = options.smokeMode ?? isRuntimeDebugSmokeMode;
  const closeWhenDone = options.closeWhenDone ?? !showWindow;
  const proofMode = options.proofMode ?? smokeMode;
  const proofProfileId = options.profileId ?? null;
  const allowMissingDonorAsset = options.allowMissingDonorAsset ?? (process.env.MYIDE_RUNTIME_DEBUG_ALLOW_MISSING_DONOR_ASSET === "1");
  const candidateHintTokens = Array.isArray(options.candidateHintTokens)
    ? options.candidateHintTokens.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    : [];

  if (smokeMode) {
    console.log("MYIDE_RUNTIME_DEBUG_MAIN_READY");
  }

  if (!smokeMode && activeRuntimeDebugWindow && !activeRuntimeDebugWindow.isDestroyed()) {
    if (activeRuntimeDebugProjectId === projectId) {
      activeRuntimeDebugWindow.show();
      activeRuntimeDebugWindow.focus();
      return lastRuntimeDebugResult;
    }
    activeRuntimeDebugWindow.close();
    activeRuntimeDebugWindow = null;
    activeRuntimeDebugProjectId = null;
  }

  try {
    rememberRuntimeProjectId(projectId);
    await ensureRuntimeProjectCaches(projectId);
    activeRuntimeRequestProjectId = projectId;

    const bundle = await loadProjectSlice(projectId);
    const runtimeLaunch = bundle.runtimeLaunch;
    if (!runtimeLaunch?.entryUrl) {
      throw new Error(runtimeLaunch?.blocker ?? `No grounded runtime launch URL is available for ${projectId}.`);
    }

    recentRuntimeObservationFingerprints.clear();
    runtimeAssetOverrideHits.clear();
    resetRuntimeResourceMap(projectId);
    setRuntimeRequestStage("launch");
    await clearRuntimeSessionCache(runtimeDebugPartition);

    const debugWindow = new BrowserWindow({
      width: 1440,
      height: 960,
      show: showWindow,
      backgroundColor: "#0b1017",
      title: `MyIDE Runtime Debug Host · ${projectId}`,
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
    activeRuntimeDebugProjectId = projectId;
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
        activeRuntimeDebugProjectId = null;
        activeRuntimeRequestProjectId = null;
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
    const initialResourceMap = buildRuntimeResourceMapStatus(projectId);
    const initialCandidate = preferUpstreamRuntimeDebugCandidate(initialResourceMap, selectRuntimeDebugCandidate(initialResourceMap, {
      preferredTokens: candidateHintTokens
    }));

    if (!proofMode) {
      const payload = {
        status: "open",
        error: null,
        pathDecision: "interactive-debug-host",
        projectId,
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
        overrideDonorSourceKind: null,
        overrideDonorSourceLabel: null,
        overrideDonorSourceNote: null,
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
    let resourceMapBeforeOverride = buildRuntimeResourceMapStatus(projectId);
    let candidate = preferUpstreamRuntimeDebugCandidate(resourceMapBeforeOverride, selectRuntimeDebugCandidate(resourceMapBeforeOverride, {
      preferredTokens: candidateHintTokens
    }));

    if (!candidate && bridgeAssetCandidate) {
      setRuntimeRequestStage("prime");
      const requestUrl = buildLocalRuntimeMirrorProxyUrl(projectId, bridgeAssetCandidate.canonicalSourceUrl);
      await safeExecuteDebugScript(debugWindow, buildRuntimeDebugPrimeAssetRequestScript(requestUrl));
      await delay(1500);
      resourceMapBeforeOverride = buildRuntimeResourceMapStatus(projectId);
      candidate = preferUpstreamRuntimeDebugCandidate(resourceMapBeforeOverride, selectRuntimeDebugCandidate(resourceMapBeforeOverride, {
        preferredTokens: candidateHintTokens
      }));
    }

    if (!candidate) {
      const mirrorStatus = await buildLocalRuntimeMirrorStatus(projectId);
      const mirrorStaticEntry = mirrorStatus.entries.find((entry) => (
        entry.fileExists
        && entry.kind === "static-image"
        && ["png", "jpg", "jpeg", "webp", "svg", "gif"].includes(String(entry.fileType ?? "").toLowerCase())
      ));
      if (mirrorStaticEntry) {
        setRuntimeRequestStage("prime");
        const runtimeRelativePath = getLocalRuntimeMirrorRelativePath(mirrorStaticEntry.sourceUrl);
        const requestUrl = runtimeRelativePath
          ? buildLocalRuntimeMirrorAssetUrl(projectId, runtimeRelativePath)
          : buildLocalRuntimeMirrorProxyUrl(projectId, mirrorStaticEntry.sourceUrl);
        try {
          await fetch(requestUrl, { redirect: "manual" });
        } catch {
          // best-effort priming for runtime resource map
        }
        await delay(1500);
        resourceMapBeforeOverride = buildRuntimeResourceMapStatus(projectId);
        candidate = preferUpstreamRuntimeDebugCandidate(resourceMapBeforeOverride, selectRuntimeDebugCandidate(resourceMapBeforeOverride, {
          preferredTokens: candidateHintTokens
        }));
      }
    }

    const donorAsset = await loadPreferredRuntimeOverrideDonorAsset(
      projectId,
      candidate?.fileType ?? bridgeAssetCandidate?.fileType ?? null
    );
    const overrideDonorSource = describeRuntimeOverrideDonorSource(donorAsset);

    let overrideCreated = false;
    let overrideCleared = false;
    let overrideHitCountAfterReload = 0;
    let overrideBlocked: string | null = null;

    if (!candidate) {
      overrideBlocked = "Dedicated Runtime Debug Host still did not capture any request-backed static image candidate.";
    } else if (!donorAsset) {
      overrideBlocked = allowMissingDonorAsset
        ? "No compatible donor asset is indexed for this project yet, so bounded override proof stays blocked even though the grounded runtime candidate was captured."
        : "No compatible local donor asset exists to drive the bounded project-local override proof.";
    } else {
      await createRuntimeAssetOverride({
        projectId,
        runtimeSourceUrl: candidate.canonicalSourceUrl,
        donorAssetId: donorAsset.assetId
      });
      await refreshRuntimeAssetOverrideRedirects(projectId);
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

      await clearRuntimeAssetOverride(projectId, candidate.canonicalSourceUrl);
      await refreshRuntimeAssetOverrideRedirects(projectId);
      overrideCleared = true;
    }

    const finalStatus = await safeExecuteDebugScript<RuntimeDebugBridgeStatus>(debugWindow, buildRuntimeDebugStatusScript());
    const finalPick = await safeExecuteDebugScript<RuntimeDebugPickPayload>(debugWindow, buildRuntimeDebugCenterPickScript());
    const finalResourceMap = buildRuntimeResourceMapStatus(projectId);
    const finalOverrideStatus = await buildRuntimeAssetOverrideStatus(projectId, runtimeAssetOverrideHits);
    const debugProofPassed = overrideHitCountAfterReload > 0 || Boolean(allowMissingDonorAsset && candidate && !donorAsset);

    const payload = {
      status: debugProofPassed ? "pass" : "fail",
      error: debugProofPassed ? null : overrideBlocked,
      pathDecision: "embedded-no-go-debug-host",
      projectId,
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
      overrideDonorSourceKind: overrideDonorSource?.kind ?? null,
      overrideDonorSourceLabel: overrideDonorSource?.label ?? null,
      overrideDonorSourceNote: overrideDonorSource?.note ?? null,
      candidateHintTokens,
      proofProfileId: proofSequence.profileId,
      proofSpinCountAttempted: proofSequence.spinCountAttempted,
      overrideCreated,
      overrideCleared,
      overrideHitCountAfterReload,
      overrideStatusEntryCount: finalOverrideStatus.entryCount,
      overrideBlocked,
      allowMissingDonorAsset,
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
      pathDecision: "embedded-no-go-debug-host",
      projectId
    };
    activeRuntimeRequestProjectId = null;
    lastRuntimeDebugResult = payload;
    console.log(`MYIDE_RUNTIME_DEBUG_RESULT:${JSON.stringify(payload)}`);
    if (smokeMode) {
      finishRuntimeDebugSmoke(1, `FAIL smoke:electron-runtime-debug - ${message}`);
    }
    return payload;
  }
}

function resolveRuntimeRedirectMatch(requestUrl: string): {
  projectId: string;
  redirectUrl: string;
  canonicalSourceUrl: string;
  matchKind: "mirror-proxy" | "project-local-override";
} | null {
  const preferredProjectId = typeof activeRuntimeRequestProjectId === "string" && activeRuntimeRequestProjectId.length > 0
    ? activeRuntimeRequestProjectId
    : typeof bridgeHealthState.lastSelectedProjectId === "string"
      ? bridgeHealthState.lastSelectedProjectId
    : null;
  const matches: Array<{
    projectId: string;
    redirectUrl: string;
    canonicalSourceUrl: string;
    matchKind: "mirror-proxy" | "project-local-override";
    score: number;
  }> = [];

  for (const projectId of knownRuntimeProjectIds) {
    const mirrorStatus = getRuntimeLocalMirrorStatus(projectId);
    const mirrorEntry = findLocalRuntimeMirrorEntry(mirrorStatus, requestUrl);
    if (mirrorEntry) {
      matches.push({
        projectId,
        redirectUrl: buildLocalRuntimeMirrorProxyUrl(projectId, mirrorEntry.sourceUrl),
        canonicalSourceUrl: mirrorEntry.sourceUrl,
        matchKind: "mirror-proxy",
        score: 300 + (projectId === preferredProjectId ? 50 : 0)
      });
      continue;
    }

    const overrideRedirect = getRuntimeAssetOverrideRedirectMap(projectId).get(requestUrl);
    if (overrideRedirect) {
      matches.push({
        projectId,
        redirectUrl: overrideRedirect,
        canonicalSourceUrl: requestUrl,
        matchKind: "project-local-override",
        score: 100 + (projectId === preferredProjectId ? 50 : 0)
      });
    }
  }

  if (matches.length === 0) {
    return null;
  }

  matches.sort((left, right) => right.score - left.score);
  const topScore = matches[0]?.score ?? 0;
  const topMatches = matches.filter((entry) => entry.score === topScore);
  if (topMatches.length > 1) {
    const preferredMatch = preferredProjectId
      ? topMatches.find((entry) => entry.projectId === preferredProjectId)
      : null;
    if (!preferredMatch) {
      return null;
    }
    return {
      projectId: preferredMatch.projectId,
      redirectUrl: preferredMatch.redirectUrl,
      canonicalSourceUrl: preferredMatch.canonicalSourceUrl,
      matchKind: preferredMatch.matchKind
    };
  }

  return {
    projectId: matches[0].projectId,
    redirectUrl: matches[0].redirectUrl,
    canonicalSourceUrl: matches[0].canonicalSourceUrl,
    matchKind: matches[0].matchKind
  };
}

function resolveRuntimeObservedProjectId(requestUrl: string): string {
  const redirectMatch = resolveRuntimeRedirectMatch(requestUrl);
  if (redirectMatch) {
    return redirectMatch.projectId;
  }

  const selectedProjectId = activeRuntimeRequestProjectId ?? bridgeHealthState.lastSelectedProjectId;
  if (typeof selectedProjectId === "string" && knownRuntimeProjectIds.has(selectedProjectId)) {
    return selectedProjectId;
  }

  return "project_001";
}

function getRuntimeRedirectUrl(requestUrl: string): string | null {
  return resolveRuntimeRedirectMatch(requestUrl)?.redirectUrl ?? null;
}

function parseRuntimeMirrorRoute(pathname: string): {
  projectId: string;
  route: "launch" | "mirror" | "assets";
  runtimeRelativePath: string | null;
} | null {
  const normalized = pathname.trim();
  const match = normalized.match(/^\/runtime\/([A-Za-z0-9._-]+)\/(launch|mirror|assets(?:\/.*)?)$/);
  if (!match) {
    return null;
  }

  const projectId = match[1] ?? "";
  const rawRoute = match[2] ?? "";
  if (rawRoute === "launch" || rawRoute === "mirror") {
    return {
      projectId,
      route: rawRoute,
      runtimeRelativePath: null
    };
  }

  const runtimeRelativePath = rawRoute.replace(/^assets\/?/, "").replace(/^\/+/, "") || null;
  return {
    projectId,
    route: "assets",
    runtimeRelativePath
  };
}

function getRuntimeMirrorRelativePathFromUrl(requestUrl: string): {
  projectId: string;
  runtimeRelativePath: string;
} | null {
  try {
    const parsedUrl = new URL(requestUrl);
    const route = parseRuntimeMirrorRoute(parsedUrl.pathname);
    if (!route || route.route !== "assets" || !route.runtimeRelativePath) {
      return null;
    }
    return {
      projectId: route.projectId,
      runtimeRelativePath: route.runtimeRelativePath
    };
  } catch {
    return null;
  }
}

function getRuntimeObservedRequestMetadata(requestUrl: string): {
  projectId: string;
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
      const route = parseRuntimeMirrorRoute(parsedUrl.pathname);
      if (!route) {
        return null;
      }

      const cachedMirrorStatus = getRuntimeLocalMirrorStatus(route.projectId);

      if (route.route === "launch") {
        return {
          projectId: route.projectId,
          canonicalSourceUrl: cachedMirrorStatus?.publicEntryUrl ?? requestUrl,
          requestSource: "local-mirror-launch",
          runtimeRelativePath: "launch.html",
          fileType: "html"
        };
      }

      if (route.route === "mirror") {
        const sourceUrl = parsedUrl.searchParams.get("source");
        if (!sourceUrl) {
          return null;
        }
        const localMirrorEntry = findLocalRuntimeMirrorEntry(cachedMirrorStatus, sourceUrl);
        const overrideAbsolutePath = getRuntimeOverrideAbsolutePath(sourceUrl, route.projectId);
        return {
          projectId: route.projectId,
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

      if (route.route === "assets") {
        const runtimeRelativePath = route.runtimeRelativePath;
        const localMirrorEntry = findLocalRuntimeMirrorEntryByRelativePath(cachedMirrorStatus, runtimeRelativePath);
        const fallbackSourceUrl = route.projectId === "project_001" && runtimeRelativePath
          ? buildRuntimeUpstreamFallbackUrl(runtimeRelativePath)
          : null;
        const canonicalSourceUrl = localMirrorEntry?.sourceUrl ?? fallbackSourceUrl ?? requestUrl;
        const overrideAbsolutePath = getRuntimeOverrideAbsolutePath(canonicalSourceUrl, route.projectId);
        if (!localMirrorEntry && !fallbackSourceUrl && !overrideAbsolutePath) {
          return null;
        }
        return {
          projectId: route.projectId,
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
      projectId: resolveRuntimeObservedProjectId(requestUrl),
      canonicalSourceUrl: requestUrl,
      requestSource: "upstream-request"
    };
  } catch {
    return null;
  }
}

function scheduleRuntimeResourceMapSnapshotWrite(projectId = "project_001"): void {
  try {
    exportRuntimeResourceMapSnapshotSync(projectId);
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
  projectId: string,
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
    projectId,
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

  scheduleRuntimeResourceMapSnapshotWrite(projectId);
}

function getRuntimeOverrideAbsolutePath(runtimeSourceUrl: string, projectId = "project_001"): string | null {
  const redirectUrl = getRuntimeAssetOverrideRedirectMap(projectId).get(runtimeSourceUrl);
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
      const observed = getRuntimeObservedRequestMetadata(details.url);
      if (observed) {
        recordRuntimeResourceHit(
          observed.projectId,
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
      callback({});
      return;
    }

    const observed = getRuntimeObservedRequestMetadata(redirectURL) ?? getRuntimeObservedRequestMetadata(details.url);
    if (observed) {
      recordRuntimeResourceHit(
        observed.projectId,
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
          observed.projectId,
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

  const route = parseRuntimeMirrorRoute(parsedUrl.pathname);
  if (!route) {
    sendRuntimeMirrorResponse(response, 404, { "content-type": "text/plain; charset=utf-8" }, "Not found");
    return;
  }

  const { projectId } = route;
  await ensureRuntimeProjectCaches(projectId);
  const runtimeMirrorStatus = getRuntimeLocalMirrorStatus(projectId);

  if (route.route === "launch") {
    if (!runtimeMirrorStatus?.available) {
      sendRuntimeMirrorResponse(
        response,
        503,
        { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
        runtimeMirrorStatus?.blocker ?? "Local runtime mirror is not available."
      );
      return;
    }

    const launch = await buildLocalRuntimeLaunchHtml(projectId);
    recordRuntimeResourceHit(
      projectId,
      parsedUrl.toString(),
      runtimeMirrorStatus.publicEntryUrl ?? parsedUrl.toString(),
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

  if (route.route === "mirror") {
    const sourceUrl = parsedUrl.searchParams.get("source");
    if (!sourceUrl) {
      sendRuntimeMirrorResponse(response, 400, { "content-type": "text/plain; charset=utf-8" }, "Missing mirror source URL.");
      return;
    }

    const mirrorFile = await readLocalRuntimeMirrorFile(projectId, sourceUrl);
    if (!mirrorFile) {
      const fallbackFile = await readRuntimeHarvestFallbackFile(projectId, sourceUrl);
      if (fallbackFile) {
        const overrideAbsolutePath = getRuntimeOverrideAbsolutePath(sourceUrl, projectId);
        if (overrideAbsolutePath) {
          recordRuntimeOverrideHit(sourceUrl);
          recordRuntimeResourceHit(projectId, parsedUrl.toString(), sourceUrl, "project-local-override", {
            localMirrorAbsolutePath: fallbackFile.absolutePath,
            overrideAbsolutePath,
            fileType: fallbackFile.fileType,
            resourceType: "fetch"
          });
          sendRuntimeMirrorResponse(response, 200, {
            "content-type": getRuntimeMirrorContentType(fallbackFile.fileType),
            "cache-control": "no-store",
            "x-myide-runtime-source": "project-local-override",
            "x-myide-runtime-local-path": overrideAbsolutePath
          }, new Uint8Array(await fs.readFile(overrideAbsolutePath)));
          return;
        }

        recordRuntimeResourceHit(projectId, parsedUrl.toString(), sourceUrl, "local-mirror-proxy", {
          localMirrorAbsolutePath: fallbackFile.absolutePath,
          fileType: fallbackFile.fileType,
          resourceType: "fetch"
        });
        sendRuntimeMirrorResponse(response, 200, {
          "content-type": getRuntimeMirrorContentType(fallbackFile.fileType),
          "cache-control": "no-store",
          "x-myide-runtime-source": "local-mirror-fallback",
          "x-myide-runtime-local-path": fallbackFile.absolutePath
        }, fallbackFile.content);
        return;
      }

      try {
        const overrideAbsolutePath = getRuntimeOverrideAbsolutePath(sourceUrl, projectId);
        if (overrideAbsolutePath) {
          const overrideContent = new Uint8Array(await fs.readFile(overrideAbsolutePath));
          const overrideFileType = path.extname(new URL(sourceUrl).pathname).replace(/^\./, "").toLowerCase()
            || path.extname(overrideAbsolutePath).replace(/^\./, "").toLowerCase()
            || "bin";
          recordRuntimeOverrideHit(sourceUrl);
          recordRuntimeResourceHit(projectId, parsedUrl.toString(), sourceUrl, "project-local-override", {
            overrideAbsolutePath,
            fileType: overrideFileType,
            resourceType: "fetch"
          });
          sendRuntimeMirrorResponse(response, 200, {
            "content-type": getRuntimeMirrorContentType(overrideFileType),
            "cache-control": "no-store",
            "x-myide-runtime-source": "project-local-override",
            "x-myide-runtime-local-path": overrideAbsolutePath
          }, overrideContent);
          return;
        }

        const upstreamFallback = await fetchRuntimeUpstreamFallbackUrl(sourceUrl);
        recordRuntimeResourceHit(projectId, parsedUrl.toString(), upstreamFallback.sourceUrl, "upstream-request", {
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

    const overrideAbsolutePath = getRuntimeOverrideAbsolutePath(sourceUrl, projectId);
    if (overrideAbsolutePath) {
      recordRuntimeOverrideHit(sourceUrl);
      recordRuntimeResourceHit(projectId, parsedUrl.toString(), sourceUrl, "project-local-override", {
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

    recordRuntimeResourceHit(projectId, parsedUrl.toString(), sourceUrl, "local-mirror-proxy", {
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

  const relativePath = route.runtimeRelativePath ?? "";
  const mirrorFile = await readLocalRuntimeMirrorFileByRelativePath(projectId, relativePath);
  if (!mirrorFile) {
    if (projectId !== "project_001") {
      sendRuntimeMirrorResponse(
        response,
        404,
        { "content-type": "text/plain; charset=utf-8" },
        "Mirror asset not found for this project-local runtime path."
      );
      return;
    }

    const fallbackSourceUrl = buildRuntimeUpstreamFallbackUrl(relativePath);
    const overrideAbsolutePath = getRuntimeOverrideAbsolutePath(fallbackSourceUrl, projectId);
    if (overrideAbsolutePath) {
      const overrideContent = new Uint8Array(await import("node:fs").then(({ promises }) => promises.readFile(overrideAbsolutePath)));
      const fallbackFileType = path.extname(new URL(fallbackSourceUrl).pathname).replace(/^\./, "").toLowerCase()
        || path.extname(overrideAbsolutePath).replace(/^\./, "").toLowerCase()
        || "bin";
      recordRuntimeOverrideHit(fallbackSourceUrl);
      recordRuntimeResourceHit(projectId, parsedUrl.toString(), fallbackSourceUrl, "project-local-override", {
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
      recordRuntimeResourceHit(projectId, parsedUrl.toString(), upstreamFallback.sourceUrl, "upstream-request", {
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

  const overrideAbsolutePath = getRuntimeOverrideAbsolutePath(mirrorFile.sourceUrl, projectId);
  if (overrideAbsolutePath) {
    recordRuntimeOverrideHit(mirrorFile.sourceUrl);
    recordRuntimeResourceHit(projectId, parsedUrl.toString(), mirrorFile.sourceUrl, "project-local-override", {
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

  recordRuntimeResourceHit(projectId, parsedUrl.toString(), mirrorFile.sourceUrl, "local-mirror-asset", {
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

  const getAvailablePort = () => new Promise<number>((resolve, reject) => {
    const probe = createNetServer();
    probe.unref();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const address = probe.address();
      const port = typeof address === "object" && address ? address.port : null;
      probe.close(() => {
        if (typeof port === "number") {
          resolve(port);
        } else {
          reject(new Error("Could not allocate an open runtime mirror port."));
        }
      });
    });
  });

  await new Promise<void>((resolve, reject) => {
    const listenOnPort = (port: number) => {
      setLocalRuntimeMirrorPort(port);
      runtimeLocalMirrorServer?.listen(port, "127.0.0.1", () => {
        runtimeLocalMirrorServer?.removeListener("error", handleError);
        resolve();
      });
    };
    const handleError = (error: NodeJS.ErrnoException) => {
      if (error?.code === "EADDRINUSE") {
        const blockedPort = getLocalRuntimeMirrorPort();
        console.warn(`MYIDE_RUNTIME_MIRROR_SERVER_IN_USE: Port ${blockedPort} already in use; selecting a free port.`);
        runtimeLocalMirrorServer?.removeListener("error", handleError);
        void getAvailablePort()
          .then((port) => {
            console.warn(`MYIDE_RUNTIME_MIRROR_SERVER_FALLBACK: Using port ${port} instead of ${blockedPort}.`);
            listenOnPort(port);
          })
          .catch(reject);
        return;
      }
      reject(error);
    };
    runtimeLocalMirrorServer?.once("error", handleError);
    listenOnPort(getLocalRuntimeMirrorPort());
  });
}

async function runRuntimeSelectedProjectRouteSmoke(): Promise<void> {
  console.log("MYIDE_RUNTIME_SELECTED_PROJECT_ROUTE_MAIN_READY");
  const projectId = process.env.MYIDE_RUNTIME_SELECTED_PROJECT_ROUTE_PROJECT_ID ?? "project_002";
  const runtimeRelativePath = process.env.MYIDE_RUNTIME_SELECTED_PROJECT_ROUTE_RELATIVE_PATH ?? "img/big-win-ribbon.png";
  const runtimeSourceUrl = process.env.MYIDE_RUNTIME_SELECTED_PROJECT_ROUTE_SOURCE_URL ?? "https://example.invalid/runtime/img/big-win-ribbon.png";

  try {
    recentRuntimeObservationFingerprints.clear();
    runtimeAssetOverrideHits.clear();
    resetRuntimeResourceMap(projectId);
    scheduleRuntimeResourceMapSnapshotWrite(projectId);
    await refreshRuntimeAssetOverrideRedirects(projectId);

    const assetUrl = buildLocalRuntimeMirrorAssetUrl(projectId, runtimeRelativePath);
    const proxyUrl = buildLocalRuntimeMirrorProxyUrl(projectId, runtimeSourceUrl);
    const launchUrl = getMirrorLaunchUrl(projectId);

    const [mirrorStatus, assetResponse, proxyResponse, launchResponse] = await Promise.all([
      buildLocalRuntimeMirrorStatus(projectId),
      fetch(assetUrl, { redirect: "manual" }),
      fetch(proxyUrl, { redirect: "manual" }),
      fetch(launchUrl, { redirect: "manual" })
    ]);

    const assetBody = new TextDecoder().decode(new Uint8Array(await assetResponse.arrayBuffer()));
    const proxyBody = new TextDecoder().decode(new Uint8Array(await proxyResponse.arrayBuffer()));
    const launchBody = await launchResponse.text();
    const projectResourceMap = await loadRuntimeResourceMapStatus(projectId);
    const project001ResourceMap = await loadRuntimeResourceMapStatus("project_001");
    const matchedProjectEntry = projectResourceMap.entries.find((entry) => entry.canonicalSourceUrl === runtimeSourceUrl) ?? null;
    const project001ContainsSeedSource = project001ResourceMap.entries.some((entry) => entry.canonicalSourceUrl === runtimeSourceUrl);
    const payload: {
      status: "pass" | "fail";
      error: string | null;
      projectId: string;
      runtimeRelativePath: string;
      runtimeSourceUrl: string;
      mirrorAvailable: boolean;
      assetUrl: string;
      assetStatus: number;
      assetBodySnippet: string;
      proxyUrl: string;
      proxyStatus: number;
      proxyBodySnippet: string;
      launchUrl: string;
      launchStatus: number;
      launchBodySnippet: string;
      projectResourceMapEntryCount: number;
      matchedProjectRequestSource: string | null;
      matchedProjectLatestRequestUrl: string | null;
      project001ContainsSeedSource: boolean;
    } = {
      status: (
        mirrorStatus.available
        && assetResponse.ok
        && proxyResponse.ok
        && launchResponse.ok
        && /\/runtime\/project_002\/(?:mirror\?source=|assets\/)/.test(launchBody)
        && assetBody.includes("project_002_override_placeholder")
        && proxyBody.includes("project_002_override_placeholder")
        && Boolean(matchedProjectEntry)
        && !project001ContainsSeedSource
      ) ? "pass" : "fail",
      error: null,
      projectId,
      runtimeRelativePath,
      runtimeSourceUrl,
      mirrorAvailable: mirrorStatus.available,
      assetUrl,
      assetStatus: assetResponse.status,
      assetBodySnippet: assetBody.slice(0, 120),
      proxyUrl,
      proxyStatus: proxyResponse.status,
      proxyBodySnippet: proxyBody.slice(0, 120),
      launchUrl,
      launchStatus: launchResponse.status,
      launchBodySnippet: launchBody.slice(0, 240),
      projectResourceMapEntryCount: projectResourceMap.entryCount,
      matchedProjectRequestSource: matchedProjectEntry?.requestSource ?? null,
      matchedProjectLatestRequestUrl: matchedProjectEntry?.latestRequestUrl ?? null,
      project001ContainsSeedSource
    };

    if (payload.status !== "pass") {
      payload.error = "Selected-project runtime route smoke did not stay project-aware through asset, proxy, and launch routes.";
    }

    console.log(`MYIDE_RUNTIME_SELECTED_PROJECT_ROUTE_RESULT:${JSON.stringify(payload)}`);
    if (payload.status === "pass") {
      finishRuntimeSelectedProjectRouteSmoke(0, "PASS smoke:electron-runtime-selected-project-route");
      return;
    }

    finishRuntimeSelectedProjectRouteSmoke(1, `FAIL smoke:electron-runtime-selected-project-route - ${payload.error}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(`MYIDE_RUNTIME_SELECTED_PROJECT_ROUTE_RESULT:${JSON.stringify({
      status: "fail",
      error: message,
      projectId
    })}`);
    finishRuntimeSelectedProjectRouteSmoke(1, `FAIL smoke:electron-runtime-selected-project-route - ${message}`);
  }
}

async function runRuntimeSelectedProjectRedirectSmoke(): Promise<void> {
  console.log("MYIDE_RUNTIME_SELECTED_PROJECT_REDIRECT_MAIN_READY");
  const projectId = process.env.MYIDE_RUNTIME_SELECTED_PROJECT_REDIRECT_PROJECT_ID ?? "project_002";
  const runtimeSourceUrl = process.env.MYIDE_RUNTIME_SELECTED_PROJECT_REDIRECT_SOURCE_URL
    ?? "https://cdn.bgaming-network.com/runtime/img/big-win-ribbon.png";

  let probeWindow: BrowserWindow | null = null;
  try {
    bridgeHealthState.lastSelectedProjectId = projectId;
    recentRuntimeObservationFingerprints.clear();
    runtimeAssetOverrideHits.clear();
    resetRuntimeResourceMap(projectId);
    scheduleRuntimeResourceMapSnapshotWrite(projectId);
    await primeRuntimeProjectCachesFromWorkspace();
    await refreshRuntimeAssetOverrideRedirects(projectId);

    const redirectUrl = getRuntimeRedirectUrl(runtimeSourceUrl);
    probeWindow = new BrowserWindow({
      width: 800,
      height: 600,
      show: false,
      backgroundColor: "#0b1017",
      webPreferences: {
        backgroundThrottling: false,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true
      }
    });
    await probeWindow.loadURL("data:text/html;charset=utf-8,<html><body>runtime redirect smoke</body></html>");

    const fetchResult = await probeWindow.webContents.executeJavaScript(
      `fetch(${JSON.stringify(runtimeSourceUrl)}, { redirect: "follow" }).then(async (response) => ({
        status: response.status,
        finalUrl: response.url,
        bodyText: await response.text()
      }))`,
      true
    ) as {
      status?: number;
      finalUrl?: string;
      bodyText?: string;
    } | null;
    await delay(500);

    const projectResourceMap = await loadRuntimeResourceMapStatus(projectId);
    const project001ResourceMap = await loadRuntimeResourceMapStatus("project_001");
    const matchedProjectEntry = projectResourceMap.entries.find((entry) => entry.canonicalSourceUrl === runtimeSourceUrl) ?? null;
    const project001ContainsSeedSource = project001ResourceMap.entries.some((entry) => entry.canonicalSourceUrl === runtimeSourceUrl);
    const fetchStatus = Number(fetchResult?.status ?? 0);
    const fetchFinalUrl = typeof fetchResult?.finalUrl === "string" ? fetchResult.finalUrl : null;
    const fetchBody = typeof fetchResult?.bodyText === "string" ? fetchResult.bodyText : "";
    const payload: {
      status: "pass" | "fail";
      error: string | null;
      projectId: string;
      runtimeSourceUrl: string;
      redirectUrl: string | null;
      fetchStatus: number;
      fetchFinalUrl: string | null;
      fetchBodySnippet: string;
      projectResourceMapEntryCount: number;
      matchedProjectRequestSource: string | null;
      matchedProjectLatestRequestUrl: string | null;
      project001ContainsSeedSource: boolean;
    } = {
      status: (
        typeof redirectUrl === "string"
        && redirectUrl.includes(`/runtime/${projectId}/mirror?source=`)
        && fetchStatus === 200
        && fetchBody.includes("project_002_override_placeholder")
        && typeof fetchFinalUrl === "string"
        && fetchFinalUrl.includes(`/runtime/${projectId}/mirror?source=`)
        && Boolean(matchedProjectEntry)
        && matchedProjectEntry?.requestSource === "project-local-override"
        && !project001ContainsSeedSource
      ) ? "pass" : "fail",
      error: null,
      projectId,
      runtimeSourceUrl,
      redirectUrl,
      fetchStatus,
      fetchFinalUrl,
      fetchBodySnippet: fetchBody.slice(0, 120),
      projectResourceMapEntryCount: projectResourceMap.entryCount,
      matchedProjectRequestSource: matchedProjectEntry?.requestSource ?? null,
      matchedProjectLatestRequestUrl: matchedProjectEntry?.latestRequestUrl ?? null,
      project001ContainsSeedSource
    };

    if (payload.status !== "pass") {
      payload.error = "Selected-project upstream redirect smoke did not stay project-aware.";
    }

    console.log(`MYIDE_RUNTIME_SELECTED_PROJECT_REDIRECT_RESULT:${JSON.stringify(payload)}`);
    if (payload.status === "pass") {
      finishRuntimeSelectedProjectRedirectSmoke(0, "PASS smoke:electron-runtime-selected-project-upstream-redirect");
      return;
    }

    finishRuntimeSelectedProjectRedirectSmoke(1, `FAIL smoke:electron-runtime-selected-project-upstream-redirect - ${payload.error}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(`MYIDE_RUNTIME_SELECTED_PROJECT_REDIRECT_RESULT:${JSON.stringify({
      status: "fail",
      error: message,
      projectId
    })}`);
    finishRuntimeSelectedProjectRedirectSmoke(1, `FAIL smoke:electron-runtime-selected-project-upstream-redirect - ${message}`);
  } finally {
    if (probeWindow && !probeWindow.isDestroyed()) {
      probeWindow.destroy();
    }
  }
}

async function runRuntimeSelectedProjectObservationSmoke(): Promise<void> {
  console.log("MYIDE_RUNTIME_SELECTED_PROJECT_UPSTREAM_OBSERVATION_MAIN_READY");
  const projectId = process.env.MYIDE_RUNTIME_SELECTED_PROJECT_UPSTREAM_OBSERVATION_PROJECT_ID ?? "project_002";
  const runtimeSourceUrl = process.env.MYIDE_RUNTIME_SELECTED_PROJECT_UPSTREAM_OBSERVATION_SOURCE_URL
    ?? "https://cdn.bgaming-network.com/runtime/img/selected-project-upstream-observation-smoke.png";

  let probeWindow: BrowserWindow | null = null;
  try {
    bridgeHealthState.lastSelectedProjectId = projectId;
    recentRuntimeObservationFingerprints.clear();
    runtimeAssetOverrideHits.clear();
    resetRuntimeResourceMap(projectId);
    scheduleRuntimeResourceMapSnapshotWrite(projectId);
    resetRuntimeResourceMap("project_001");
    scheduleRuntimeResourceMapSnapshotWrite("project_001");
    await primeRuntimeProjectCachesFromWorkspace();

    const redirectUrl = getRuntimeRedirectUrl(runtimeSourceUrl);
    probeWindow = new BrowserWindow({
      width: 800,
      height: 600,
      show: false,
      backgroundColor: "#0b1017",
      webPreferences: {
        partition: runtimeWebviewPartition,
        backgroundThrottling: false,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true
      }
    });
    await probeWindow.loadURL("data:text/html;charset=utf-8,<html><body>runtime upstream observation smoke</body></html>");

    const imageResult = await probeWindow.webContents.executeJavaScript(
      `new Promise((resolve) => {
        const image = new Image();
        image.onload = () => resolve({ status: "load", currentSrc: image.currentSrc || image.src });
        image.onerror = () => resolve({ status: "error", currentSrc: image.currentSrc || image.src });
        image.src = ${JSON.stringify(runtimeSourceUrl)};
        document.body.appendChild(image);
      })`,
      true
    ) as {
      status?: string;
      currentSrc?: string;
    } | null;
    await delay(500);

    const projectResourceMap = await loadRuntimeResourceMapStatus(projectId);
    const project001ResourceMap = await loadRuntimeResourceMapStatus("project_001");
    const matchedProjectEntry = projectResourceMap.entries.find((entry) => entry.canonicalSourceUrl === runtimeSourceUrl) ?? null;
    const project001ContainsSeedSource = project001ResourceMap.entries.some((entry) => entry.canonicalSourceUrl === runtimeSourceUrl);
    const payload: {
      status: "pass" | "fail";
      error: string | null;
      projectId: string;
      runtimeSourceUrl: string;
      redirectUrl: string | null;
      imageStatus: string | null;
      imageCurrentSrc: string | null;
      projectResourceMapEntryCount: number;
      matchedProjectRequestSource: string | null;
      matchedProjectLatestRequestUrl: string | null;
      project001ContainsSeedSource: boolean;
    } = {
      status: (
        redirectUrl === null
        && Boolean(matchedProjectEntry)
        && matchedProjectEntry?.requestSource === "upstream-request"
        && !project001ContainsSeedSource
      ) ? "pass" : "fail",
      error: null,
      projectId,
      runtimeSourceUrl,
      redirectUrl,
      imageStatus: typeof imageResult?.status === "string" ? imageResult.status : null,
      imageCurrentSrc: typeof imageResult?.currentSrc === "string" ? imageResult.currentSrc : null,
      projectResourceMapEntryCount: projectResourceMap.entryCount,
      matchedProjectRequestSource: matchedProjectEntry?.requestSource ?? null,
      matchedProjectLatestRequestUrl: matchedProjectEntry?.latestRequestUrl ?? null,
      project001ContainsSeedSource
    };

    if (payload.status !== "pass") {
      payload.error = "Selected-project upstream observation smoke still polluted project_001 or failed to attribute the request to the selected project.";
    }

    console.log(`MYIDE_RUNTIME_SELECTED_PROJECT_UPSTREAM_OBSERVATION_RESULT:${JSON.stringify(payload)}`);
    if (payload.status === "pass") {
      finishRuntimeSelectedProjectObservationSmoke(0, "PASS smoke:electron-runtime-selected-project-upstream-observation");
      return;
    }

    finishRuntimeSelectedProjectObservationSmoke(1, `FAIL smoke:electron-runtime-selected-project-upstream-observation - ${payload.error}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(`MYIDE_RUNTIME_SELECTED_PROJECT_UPSTREAM_OBSERVATION_RESULT:${JSON.stringify({
      status: "fail",
      error: message,
      projectId
    })}`);
    finishRuntimeSelectedProjectObservationSmoke(1, `FAIL smoke:electron-runtime-selected-project-upstream-observation - ${message}`);
  } finally {
    if (probeWindow && !probeWindow.isDestroyed()) {
      probeWindow.destroy();
    }
  }
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

function attachLiveRuntimePageProofRelaunchSmokeHandlers(window: BrowserWindow): void {
  if (!isLiveRuntimePageProofRelaunchSmokeMode) {
    return;
  }

  console.log("MYIDE_LIVE_RUNTIME_PAGE_PROOF_RELAUNCH_MAIN_READY");
  const timeoutMs = Number.parseInt(process.env.MYIDE_LIVE_RUNTIME_PAGE_PROOF_RELAUNCH_TIMEOUT_MS ?? "90000", 10);
  const smokeTimeout = setTimeout(() => {
    finishLiveRuntimePageProofRelaunchSmoke(1, "FAIL smoke:electron-runtime-page-proof-relaunch - timeout waiting for renderer relaunch payload");
  }, Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 90000);

  const clearSmokeTimeout = () => {
    clearTimeout(smokeTimeout);
  };

  window.webContents.on("did-fail-load", (_event, errorCode, errorDescription) => {
    clearSmokeTimeout();
    finishLiveRuntimePageProofRelaunchSmoke(1, `FAIL smoke:electron-runtime-page-proof-relaunch - renderer failed to load (${errorCode} ${errorDescription})`);
  });

  window.webContents.on("render-process-gone", (_event, details) => {
    clearSmokeTimeout();
    finishLiveRuntimePageProofRelaunchSmoke(1, `FAIL smoke:electron-runtime-page-proof-relaunch - renderer process exited (${details.reason})`);
  });

  activeLiveRuntimePageProofRelaunchSmokeReporter = (payload) => {
    clearSmokeTimeout();
    console.log(`MYIDE_LIVE_RUNTIME_PAGE_PROOF_RELAUNCH_RESULT:${JSON.stringify(payload)}`);
    if (payload.status === "pass") {
      finishLiveRuntimePageProofRelaunchSmoke(0, "PASS smoke:electron-runtime-page-proof-relaunch");
      return;
    }

    finishLiveRuntimePageProofRelaunchSmoke(1, `FAIL smoke:electron-runtime-page-proof-relaunch - ${payload.error ?? "renderer reported failure"}`);
  };
}

function attachLiveRuntimeSelectedProjectReopenSmokeHandlers(window: BrowserWindow): void {
  if (!isLiveRuntimeSelectedProjectReopenSmokeMode) {
    return;
  }

  console.log("MYIDE_LIVE_RUNTIME_SELECTED_PROJECT_REOPEN_MAIN_READY");
  const timeoutMs = Number.parseInt(process.env.MYIDE_LIVE_RUNTIME_SELECTED_PROJECT_REOPEN_TIMEOUT_MS ?? "90000", 10);
  const smokeTimeout = setTimeout(() => {
    finishLiveRuntimeSmoke(1, "FAIL smoke:electron-runtime-selected-project-reopen - timeout waiting for renderer reopen payload");
  }, Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 90000);

  const clearSmokeTimeout = () => {
    clearTimeout(smokeTimeout);
  };

  window.webContents.on("did-fail-load", (_event, errorCode, errorDescription) => {
    clearSmokeTimeout();
    finishLiveRuntimeSmoke(1, `FAIL smoke:electron-runtime-selected-project-reopen - renderer failed to load (${errorCode} ${errorDescription})`);
  });

  window.webContents.on("render-process-gone", (_event, details) => {
    clearSmokeTimeout();
    finishLiveRuntimeSmoke(1, `FAIL smoke:electron-runtime-selected-project-reopen - renderer process exited (${details.reason})`);
  });

  activeLiveRuntimeSelectedProjectReopenSmokeReporter = (payload) => {
    clearSmokeTimeout();
    console.log(`MYIDE_LIVE_RUNTIME_SELECTED_PROJECT_REOPEN_RESULT:${JSON.stringify(payload)}`);
    if (payload.status === "pass") {
      finishLiveRuntimeSmoke(0, "PASS smoke:electron-runtime-selected-project-reopen");
      return;
    }

    finishLiveRuntimeSmoke(1, `FAIL smoke:electron-runtime-selected-project-reopen - ${payload.error ?? "renderer reported failure"}`);
  };
}

function attachLiveRuntimeSelectedProjectHarvestSmokeHandlers(window: BrowserWindow): void {
  if (!isLiveRuntimeSelectedProjectHarvestSmokeMode) {
    return;
  }

  console.log("MYIDE_LIVE_RUNTIME_SELECTED_PROJECT_HARVEST_MAIN_READY");
  const timeoutMs = Number.parseInt(process.env.MYIDE_LIVE_RUNTIME_SELECTED_PROJECT_HARVEST_TIMEOUT_MS ?? "90000", 10);
  const smokeTimeout = setTimeout(() => {
    finishLiveRuntimeSmoke(1, "FAIL smoke:electron-runtime-selected-project-harvest - timeout waiting for renderer harvest payload");
  }, Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 90000);

  const clearSmokeTimeout = () => {
    clearTimeout(smokeTimeout);
  };

  window.webContents.on("did-fail-load", (_event, errorCode, errorDescription) => {
    clearSmokeTimeout();
    finishLiveRuntimeSmoke(1, `FAIL smoke:electron-runtime-selected-project-harvest - renderer failed to load (${errorCode} ${errorDescription})`);
  });

  window.webContents.on("render-process-gone", (_event, details) => {
    clearSmokeTimeout();
    finishLiveRuntimeSmoke(1, `FAIL smoke:electron-runtime-selected-project-harvest - renderer process exited (${details.reason})`);
  });

  activeLiveRuntimeSelectedProjectHarvestSmokeReporter = (payload) => {
    clearSmokeTimeout();
    console.log(`MYIDE_LIVE_RUNTIME_SELECTED_PROJECT_HARVEST_RESULT:${JSON.stringify(payload)}`);
    if (payload.status === "pass") {
      finishLiveRuntimeSmoke(0, "PASS smoke:electron-runtime-selected-project-harvest");
      return;
    }

    finishLiveRuntimeSmoke(1, `FAIL smoke:electron-runtime-selected-project-harvest - ${payload.error ?? "renderer reported failure"}`);
  };
}

function attachLiveRuntimeSelectedProjectOverrideSmokeHandlers(window: BrowserWindow): void {
  if (!isLiveRuntimeSelectedProjectOverrideSmokeMode) {
    return;
  }

  console.log("MYIDE_LIVE_RUNTIME_SELECTED_PROJECT_OVERRIDE_MAIN_READY");
  const timeoutMs = Number.parseInt(process.env.MYIDE_LIVE_RUNTIME_SELECTED_PROJECT_OVERRIDE_TIMEOUT_MS ?? "90000", 10);
  const smokeTimeout = setTimeout(() => {
    finishLiveRuntimeSmoke(1, "FAIL smoke:electron-runtime-selected-project-override - timeout waiting for renderer override payload");
  }, Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 90000);

  const clearSmokeTimeout = () => {
    clearTimeout(smokeTimeout);
  };

  window.webContents.on("did-fail-load", (_event, errorCode, errorDescription) => {
    clearSmokeTimeout();
    finishLiveRuntimeSmoke(1, `FAIL smoke:electron-runtime-selected-project-override - renderer failed to load (${errorCode} ${errorDescription})`);
  });

  window.webContents.on("render-process-gone", (_event, details) => {
    clearSmokeTimeout();
    finishLiveRuntimeSmoke(1, `FAIL smoke:electron-runtime-selected-project-override - renderer process exited (${details.reason})`);
  });

  activeLiveRuntimeSelectedProjectOverrideSmokeReporter = (payload) => {
    clearSmokeTimeout();
    console.log(`MYIDE_LIVE_RUNTIME_SELECTED_PROJECT_OVERRIDE_RESULT:${JSON.stringify(payload)}`);
    if (payload.status === "pass") {
      finishLiveRuntimeSmoke(0, "PASS smoke:electron-runtime-selected-project-override");
      return;
    }

    finishLiveRuntimeSmoke(1, `FAIL smoke:electron-runtime-selected-project-override - ${payload.error ?? "renderer reported failure"}`);
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
  attachLiveRuntimePageProofRelaunchSmokeHandlers(window);
  attachLiveRuntimeSelectedProjectReopenSmokeHandlers(window);
  attachLiveRuntimeSelectedProjectHarvestSmokeHandlers(window);
  attachLiveRuntimeSelectedProjectOverrideSmokeHandlers(window);
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
    ...(isLiveRuntimePageProofRelaunchSmokeMode ? { liveRuntimePageProofRelaunchSmoke: "1" } : {}),
    ...(isLiveRuntimeSelectedProjectReopenSmokeMode ? { liveRuntimeSelectedProjectReopenSmoke: "1" } : {}),
    ...(isLiveRuntimeSelectedProjectHarvestSmokeMode ? { liveRuntimeSelectedProjectHarvestSmoke: "1" } : {}),
    ...(isLiveRuntimeSelectedProjectOverrideSmokeMode ? { liveRuntimeSelectedProjectOverrideSmoke: "1" } : {}),
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

async function buildFileEvidence(entries: FileEvidenceRequest[]): Promise<FileEvidenceResponse[]> {
  if (!Array.isArray(entries) || entries.length === 0) {
    return [];
  }

  return Promise.all(entries.map(async (entry) => {
    const label = typeof entry?.label === "string" ? entry.label : "Evidence";
    const targetPath = typeof entry?.path === "string" ? entry.path : "";
    if (!targetPath) {
      return {
        label,
        path: targetPath,
        exists: false,
        size: null,
        modifiedAt: null,
        error: "Missing path"
      };
    }
    try {
      const stats = await fs.stat(targetPath);
      return {
        label,
        path: targetPath,
        exists: true,
        size: Number.isFinite(stats.size) ? stats.size : null,
        modifiedAt: stats.mtime ? stats.mtime.toISOString() : null
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        label,
        path: targetPath,
        exists: false,
        size: null,
        modifiedAt: null,
        error: message
      };
    }
  }));
}

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

ipcMain.handle("myide:get-launch-flags", async () => ({
  wizardMode: isWizardMode
}));

ipcMain.handle("myide:get-file-evidence", async (_event, entries: FileEvidenceRequest[]) => {
  return buildFileEvidence(entries);
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

ipcMain.on("myide:live-runtime-page-proof-relaunch-smoke-result", (_event, payload: LiveRuntimePageProofRelaunchSmokePayload) => {
  if (typeof activeLiveRuntimePageProofRelaunchSmokeReporter === "function") {
    activeLiveRuntimePageProofRelaunchSmokeReporter(payload ?? {});
  }
});

ipcMain.on("myide:live-runtime-selected-project-reopen-smoke-result", (_event, payload: LiveRuntimeSelectedProjectReopenSmokePayload) => {
  if (typeof activeLiveRuntimeSelectedProjectReopenSmokeReporter === "function") {
    activeLiveRuntimeSelectedProjectReopenSmokeReporter(payload ?? {});
  }
});

ipcMain.on("myide:live-runtime-selected-project-harvest-smoke-result", (_event, payload: LiveRuntimeSelectedProjectHarvestSmokePayload) => {
  if (typeof activeLiveRuntimeSelectedProjectHarvestSmokeReporter === "function") {
    activeLiveRuntimeSelectedProjectHarvestSmokeReporter(payload ?? {});
  }
});

ipcMain.on("myide:live-runtime-selected-project-override-smoke-result", (_event, payload: LiveRuntimeSelectedProjectOverrideSmokePayload) => {
  if (typeof activeLiveRuntimeSelectedProjectOverrideSmokeReporter === "function") {
    activeLiveRuntimeSelectedProjectOverrideSmokeReporter(payload ?? {});
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
    if (typeof bundle.selectedProjectId === "string" && bundle.selectedProjectId.length > 0) {
      rememberRuntimeProjectId(bundle.selectedProjectId);
      await ensureRuntimeProjectCaches(bundle.selectedProjectId);
    }
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
  return loadRuntimeResourceMapStatus(projectId);
});
ipcMain.handle("myide:harvest-runtime-request-evidence", async (_event, projectId: string) => {
  return harvestRuntimeRequestEvidence(projectId);
});
ipcMain.handle("myide:save-runtime-page-proof", async (_event, projectId: string, proof: SaveRuntimePageProofInput) => {
  return saveRuntimePageProof(projectId, proof);
});
ipcMain.handle("myide:reset-runtime-resource-map", async (_event, projectId: string) => {
  runtimeAssetOverrideHits.clear();
  recentRuntimeObservationFingerprints.clear();
  setRuntimeRequestStage("launch");
  const status = resetRuntimeResourceMap(projectId);
  scheduleRuntimeResourceMapSnapshotWrite(projectId);
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
    projectId: options?.projectId ?? bridgeHealthState.lastSelectedProjectId ?? "project_001",
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
ipcMain.handle("myide:run-donor-scan-coverage", async (_event, donorId: string, donorName?: string, launchUrl?: string) => {
  return runDonorScan({
    donorId,
    donorName: typeof donorName === "string" && donorName.length > 0 ? donorName : donorId,
    launchUrl: typeof launchUrl === "string" && launchUrl.length > 0 ? launchUrl : undefined
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
  await refreshRuntimeAssetOverrideRedirects(projectId);
  return buildRuntimeAssetOverrideStatus(projectId, runtimeAssetOverrideHits);
});
ipcMain.handle("myide:clear-runtime-override", async (_event, projectId: string, runtimeSourceUrl: string) => {
  runtimeAssetOverrideHits.delete(runtimeSourceUrl);
  await clearRuntimeAssetOverride(projectId, runtimeSourceUrl);
  await refreshRuntimeAssetOverrideRedirects(projectId);
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
          if (isRuntimeSelectedProjectObservationSmokeMode) {
            void runRuntimeSelectedProjectObservationSmoke();
            return;
          }

          if (isRuntimeSelectedProjectRedirectSmokeMode) {
            void runRuntimeSelectedProjectRedirectSmoke();
            return;
          }

          if (isRuntimeSelectedProjectRouteSmokeMode) {
            void runRuntimeSelectedProjectRouteSmoke();
            return;
          }

          if (isRuntimeDebugHostMode) {
            void runRuntimeDebugHost({
              projectId: process.env.MYIDE_RUNTIME_DEBUG_PROJECT_ID ?? null,
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
    if (isRuntimeSelectedProjectObservationSmokeMode) {
      void runRuntimeSelectedProjectObservationSmoke();
      return;
    }

    if (isRuntimeSelectedProjectRouteSmokeMode) {
      void runRuntimeSelectedProjectRouteSmoke();
      return;
    }

    if (isRuntimeDebugHostMode) {
      void runRuntimeDebugHost({
        projectId: process.env.MYIDE_RUNTIME_DEBUG_PROJECT_ID ?? null,
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
