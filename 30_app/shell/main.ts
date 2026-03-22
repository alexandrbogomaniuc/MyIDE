import { app, BrowserWindow, ipcMain } from "electron";
import { existsSync } from "node:fs";
import path from "node:path";
import { loadProjectSlice } from "./projectSlice";
import { createProjectFromInput, type ShellCreateProjectInput } from "../workspace/createProject";
import { saveEditableProjectData, type EditableProjectData } from "../workspace/editableProject";
import { loadWorkspaceSlice } from "./workspaceSlice";

const isBridgeSmokeMode = process.env.MYIDE_BRIDGE_SMOKE === "1";
const isLivePersistSmokeMode = process.env.MYIDE_LIVE_PERSIST_SMOKE === "1";
const isLiveDragSmokeMode = process.env.MYIDE_LIVE_DRAG_SMOKE === "1";
const isLiveCreateDragSmokeMode = process.env.MYIDE_LIVE_CREATE_DRAG_SMOKE === "1";
const shouldKeepLivePersistWindowOpen = process.env.MYIDE_LIVE_PERSIST_KEEP_OPEN === "1";
const shouldShowLivePersistWindow = process.env.MYIDE_LIVE_PERSIST_SHOW === "1" || shouldKeepLivePersistWindowOpen;
const shouldKeepLiveDragWindowOpen = process.env.MYIDE_LIVE_DRAG_KEEP_OPEN === "1";
const shouldShowLiveDragWindow = process.env.MYIDE_LIVE_DRAG_SHOW === "1" || shouldKeepLiveDragWindowOpen;
const shouldKeepLiveCreateDragWindowOpen = process.env.MYIDE_LIVE_CREATE_DRAG_KEEP_OPEN === "1";
const shouldShowLiveCreateDragWindow = process.env.MYIDE_LIVE_CREATE_DRAG_SHOW === "1" || shouldKeepLiveCreateDragWindowOpen;

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

const bridgeHealthState: BridgeHealthSnapshot = createBridgeHealthSnapshot(resolvePreloadPath());
let activeBridgeSmokeReporter: ((payload: BridgeSmokePayload) => void) | null = null;
let activeLivePersistSmokeReporter: ((payload: LivePersistSmokePayload) => void) | null = null;
let activeLiveDragSmokeReporter: ((payload: LiveDragSmokePayload) => void) | null = null;
let activeLiveCreateDragSmokeReporter: ((payload: LiveCreateDragSmokePayload) => void) | null = null;

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

function createWindow(): void {
  const preloadPath = resolvePreloadPath();
  resetBridgeHealthState(preloadPath);

  const window = new BrowserWindow({
    width: 1600,
    height: 980,
    minWidth: 1280,
    minHeight: 800,
    show: isBridgeSmokeMode
      ? false
      : (isLivePersistSmokeMode
          ? shouldShowLivePersistWindow
          : (isLiveDragSmokeMode
              ? shouldShowLiveDragWindow
              : (isLiveCreateDragSmokeMode ? shouldShowLiveCreateDragWindow : true))),
    backgroundColor: "#0b1017",
    title: "MyIDE",
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  const rendererPath = path.resolve(__dirname, "../../../30_app/shell/renderer/index.html");
  attachBridgeSmokeHandlers(window);
  attachLivePersistSmokeHandlers(window);
  attachLiveDragSmokeHandlers(window);
  attachLiveCreateDragSmokeHandlers(window);
  const query = {
    ...(isBridgeSmokeMode ? { bridgeSmoke: "1" } : {}),
    ...(isLivePersistSmokeMode ? { livePersistSmoke: "1" } : {}),
    ...(shouldKeepLivePersistWindowOpen ? { livePersistKeepOpen: "1" } : {}),
    ...(isLiveDragSmokeMode ? { liveDragSmoke: "1" } : {}),
    ...(shouldKeepLiveDragWindowOpen ? { liveDragKeepOpen: "1" } : {}),
    ...(isLiveCreateDragSmokeMode ? { liveCreateDragSmoke: "1" } : {}),
    ...(shouldKeepLiveCreateDragWindowOpen ? { liveCreateDragKeepOpen: "1" } : {})
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

app.whenReady().then(() => {
  createWindow();

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
