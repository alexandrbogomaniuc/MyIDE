import { app, BrowserWindow, ipcMain, session } from "electron";
import { existsSync } from "node:fs";
import path from "node:path";
import { loadProjectSlice } from "./projectSlice";
import { createProjectFromInput, type ShellCreateProjectInput } from "../workspace/createProject";
import { saveEditableProjectData, type EditableProjectData } from "../workspace/editableProject";
import { loadWorkspaceSlice } from "./workspaceSlice";
import {
  buildRuntimeAssetOverrideRedirectMap,
  buildRuntimeAssetOverrideStatus,
  clearRuntimeAssetOverride,
  createRuntimeAssetOverride,
  type RuntimeAssetOverrideHitInfo
} from "../workspace/donorOverride";

const isBridgeSmokeMode = process.env.MYIDE_BRIDGE_SMOKE === "1";
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
let runtimeAssetOverrideInterceptionInstalled = false;
const runtimeAssetOverrideHits = new Map<string, RuntimeAssetOverrideHitInfo>();
const runtimeWebviewPartition = "persist:myide-runtime-project001";

function resolvePreloadPath(): string {
  return path.resolve(__dirname, "preload.js");
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
  const status = await buildRuntimeAssetOverrideStatus("project_001", runtimeAssetOverrideHits);
  runtimeAssetOverrideRedirectMap = buildRuntimeAssetOverrideRedirectMap(status);
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
    const redirectURL = runtimeAssetOverrideRedirectMap.get(details.url);
    if (!redirectURL) {
      callback({});
      return;
    }

    const current = runtimeAssetOverrideHits.get(details.url) ?? {
      count: 0,
      lastHitAtUtc: null
    };
    runtimeAssetOverrideHits.set(details.url, {
      count: current.count + 1,
      lastHitAtUtc: new Date().toISOString()
    });
    callback({ redirectURL });
  };

  session.defaultSession.webRequest.onBeforeRequest(
    { urls: ["https://cdn.bgaming-network.com/*"] },
    onBeforeRequest
  );
  session.fromPartition(runtimeWebviewPartition).webRequest.onBeforeRequest(
    { urls: ["https://cdn.bgaming-network.com/*"] },
    onBeforeRequest
  );
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
    return false;
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

app.disableHardwareAcceleration();
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
      createWindow();
    });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
