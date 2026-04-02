const state = {
  bundle: null,
  selectedProjectId: null,
  editorData: null,
  workbenchMode: "runtime",
  selectedObjectId: null,
  selectedObjectIds: [],
  history: null,
  canvasDrag: null,
  canvasResize: null,
  canvasMarquee: null,
  viewport: {
    zoom: 1,
    panX: 0,
    panY: 0,
    panDrag: null,
    spacePressed: false,
    suppressNextClick: false
  },
  dirty: false,
  activityLog: [],
  syncStatus: null,
  bridge: {
    tone: "warning",
    heading: "Desktop bridge check pending",
    message: "Checking preload and renderer bridge handshake.",
    details: ["Waiting for a live bridge handshake."],
    snapshot: null
  },
  placeholderPresetKey: "generic-box",
  snap: {
    enabled: false,
    size: 10
  },
  evidenceUi: {
    selectedObjectOnly: false,
    highlightedEvidenceId: null
  },
  donorAssetUi: {
    searchQuery: "",
    fileTypeFilter: "all",
    assetGroupFilter: "all",
    highlightedAssetId: null,
    dragPayload: null,
    importTargetLayerId: "auto",
    dropIntent: null
  },
  workflowUi: {
    activePanel: "runtime"
  },
  modificationTaskUi: {
    activeTaskId: null,
    pageRuntimeProofs: {}
  },
  runtimeUi: {
    launched: false,
    loading: false,
    ready: false,
    inspectEnabled: false,
    lastCommand: null,
    lastCommandStatus: null,
    lastError: null,
    currentUrl: null,
    pageTitle: null,
    diagnostics: null,
    resourceMap: null,
    overrideStatus: null,
    debugHost: null,
    workbenchSourceUrl: null,
    controlSupport: {
      pause: false,
      resume: false,
      step: false
    },
    controlBlockers: {
      pause: null,
      resume: null,
      step: null,
      spin: "Spin is only an observed Space-key behavior so far; no stable runtime action contract is captured yet.",
      enter: "The live donor runtime still relies on a best-effort real input event to advance the intro."
    },
    lastPick: null,
    lastConsoleEvents: []
  },
  layerIsolation: {
    activeLayerId: null,
    previousSelectedObjectId: null
  },
  sceneSectionIsolation: {
    activeSectionId: null,
    previousSelectedObjectId: null
  }
};

const lifecycleStageOrder = [
  "investigation",
  "modificationComposeRuntime",
  "mathConfig",
  "gsExport"
];

const investigationProfiles = [
  {
    profileId: "default-bet",
    label: "Default Bet",
    minutes: 5,
    executionMode: "self-bounded",
    runtimeActions: ["launch", "enter", "spin", "spin", "spin"]
  },
  {
    profileId: "max-bet",
    label: "Max Bet",
    minutes: 10,
    executionMode: "self-bounded",
    runtimeActions: ["launch", "enter", "spin", "spin", "spin", "spin", "spin", "spin"]
  },
  {
    profileId: "autoplay",
    label: "Autoplay",
    minutes: 10,
    executionMode: "self-bounded",
    runtimeActions: ["launch", "enter", "spin", "spin", "spin", "spin", "spin", "spin", "spin", "spin", "spin", "spin"]
  },
  {
    profileId: "buy-feature",
    label: "Buy Feature",
    minutes: 5,
    executionMode: "operator-assisted",
    runtimeActions: ["launch", "enter"]
  },
  {
    profileId: "manual-operator",
    label: "Manual Operator",
    minutes: 10,
    executionMode: "operator-assisted",
    runtimeActions: ["launch", "enter", "spin"]
  }
];

const objectSizePresets = {
  "object.backdrop": { width: 1280, height: 720 },
  "object.board-frame": { width: 760, height: 420 },
  "object.board-center": { width: 220, height: 84 },
  "object.status-chip": { width: 240, height: 108 },
  "object.free-spins-card": { width: 260, height: 168 },
  shape: { width: 220, height: 140 },
  text: { width: 180, height: 72 },
  image: { width: 180, height: 110 },
  container: { width: 240, height: 160 }
};

const runtimeReferenceScreenDefs = [
  {
    key: "intro",
    label: "Intro / click-to-start",
    evidenceId: "MG-EV-20260320-LIVE-A-001",
    note: "Grounded from the runtime observation notes: the intro screen with CLICK TO START is supported by MG-EV-20260320-LIVE-A-001."
  },
  {
    key: "base-idle",
    label: "Base game after start",
    evidenceId: "MG-EV-20260320-LIVE-A-002",
    note: "Grounded from the runtime observation notes: the entered live base-game screen is supported by MG-EV-20260320-LIVE-A-002."
  },
  {
    key: "post-spin",
    label: "Post-spin board",
    evidenceId: "MG-EV-20260320-LIVE-A-003",
    note: "Grounded from the runtime observation notes: the changed post-spin board is supported by MG-EV-20260320-LIVE-A-003."
  }
];

const elements = {
  onboardingCard: document.getElementById("onboarding-card"),
  workflowPanelbar: document.getElementById("workflow-panelbar"),
  projectBrowser: document.getElementById("project-browser"),
  evidenceBrowser: document.getElementById("evidence-browser"),
  investigationBrowser: document.getElementById("investigation-browser"),
  sceneExplorer: document.getElementById("scene-explorer"),
  workflowVabsPanel: document.getElementById("workflow-vabs-panel"),
  panelInvestigation: document.getElementById("panel-investigation"),
  panelDonor: document.getElementById("panel-donor"),
  panelCompose: document.getElementById("panel-compose"),
  panelVabs: document.getElementById("panel-vabs"),
  panelNewProject: document.getElementById("panel-new-project"),
  projectSummary: document.getElementById("project-summary"),
  editorCanvas: document.getElementById("editor-canvas"),
  previewStatus: document.getElementById("preview-status"),
  inspector: document.getElementById("inspector"),
  activityLog: document.getElementById("activity-log"),
  actionRescan: document.getElementById("action-rescan"),
  actionUndo: document.getElementById("action-undo"),
  actionRedo: document.getElementById("action-redo"),
  actionZoomOut: document.getElementById("action-zoom-out"),
  actionZoomIn: document.getElementById("action-zoom-in"),
  actionFitView: document.getElementById("action-fit-view"),
  actionResetView: document.getElementById("action-reset-view"),
  actionToggleSnap: document.getElementById("action-toggle-snap"),
  actionNewObject: document.getElementById("action-new-object"),
  fieldPlaceholderPreset: document.getElementById("field-placeholder-preset"),
  actionSelectPrevious: document.getElementById("action-select-previous"),
  actionSelectNext: document.getElementById("action-select-next"),
  actionDuplicate: document.getElementById("action-duplicate"),
  actionDelete: document.getElementById("action-delete"),
  actionSave: document.getElementById("action-save"),
  actionReloadEditor: document.getElementById("action-reload-editor"),
  editorToolbar: document.getElementById("editor-toolbar"),
  workbenchModebar: document.getElementById("workbench-modebar"),
  runtimeToolbar: document.getElementById("runtime-toolbar"),
  runtimeControlNote: document.getElementById("runtime-control-note"),
  runtimeWorkbench: document.getElementById("runtime-workbench"),
  sceneWorkbench: document.getElementById("scene-workbench"),
  runtimeStatus: document.getElementById("runtime-status"),
  runtimeWebview: document.getElementById("runtime-webview"),
  dirtyIndicator: document.getElementById("dirty-indicator"),
  viewportIndicator: document.getElementById("viewport-indicator"),
  orderContextIndicator: document.getElementById("order-context-indicator"),
  bridgeStatus: document.getElementById("bridge-status"),
  syncStatus: document.getElementById("sync-status"),
  newProjectForm: document.getElementById("new-project-form"),
  createProjectStatus: document.getElementById("create-project-status"),
  fieldDisplayName: document.getElementById("field-display-name"),
  fieldSlug: document.getElementById("field-slug"),
  fieldGameFamily: document.getElementById("field-game-family"),
  fieldDonorReference: document.getElementById("field-donor-reference"),
  fieldDonorLaunchUrl: document.getElementById("field-donor-launch-url"),
  fieldTargetDisplayName: document.getElementById("field-target-display-name"),
  fieldNotes: document.getElementById("field-notes")
};

document.addEventListener("DOMContentLoaded", () => {
  if (isBridgeSmokeMode()) {
    void runBridgeSmoke();
    return;
  }

  void bootRenderer();
});

function isBridgeSmokeMode() {
  try {
    const search = typeof window.location?.search === "string" ? window.location.search : "";
    return new URLSearchParams(search).get("bridgeSmoke") === "1";
  } catch {
    return false;
  }
}

function isLivePersistSmokeMode() {
  try {
    const search = typeof window.location?.search === "string" ? window.location.search : "";
    return new URLSearchParams(search).get("livePersistSmoke") === "1";
  } catch {
    return false;
  }
}

function isLiveDragSmokeMode() {
  try {
    const search = typeof window.location?.search === "string" ? window.location.search : "";
    return new URLSearchParams(search).get("liveDragSmoke") === "1";
  } catch {
    return false;
  }
}

function isLiveCreateDragSmokeMode() {
  try {
    const search = typeof window.location?.search === "string" ? window.location.search : "";
    return new URLSearchParams(search).get("liveCreateDragSmoke") === "1";
  } catch {
    return false;
  }
}

function isLiveDonorImportSmokeMode() {
  try {
    const search = typeof window.location?.search === "string" ? window.location.search : "";
    return new URLSearchParams(search).get("liveDonorImportSmoke") === "1";
  } catch {
    return false;
  }
}

function isLiveRuntimePageProofRelaunchSmokeMode() {
  try {
    const search = typeof window.location?.search === "string" ? window.location.search : "";
    return new URLSearchParams(search).get("liveRuntimePageProofRelaunchSmoke") === "1";
  } catch {
    return false;
  }
}

function isLiveRuntimeSmokeMode() {
  try {
    const search = typeof window.location?.search === "string" ? window.location.search : "";
    return new URLSearchParams(search).get("liveRuntimeSmoke") === "1";
  } catch {
    return false;
  }
}

function isLiveDuplicateDeleteSmokeMode() {
  try {
    const search = typeof window.location?.search === "string" ? window.location.search : "";
    return new URLSearchParams(search).get("liveDuplicateDeleteSmoke") === "1";
  } catch {
    return false;
  }
}

function isLiveReorderSmokeMode() {
  try {
    const search = typeof window.location?.search === "string" ? window.location.search : "";
    return new URLSearchParams(search).get("liveReorderSmoke") === "1";
  } catch {
    return false;
  }
}

function closeToolbarMenuFromTarget(target) {
  if (!(target instanceof HTMLElement)) {
    return;
  }

  const menu = target.closest(".toolbar-menu");
  if (menu instanceof HTMLDetailsElement) {
    menu.open = false;
  }
}

function setupToolbarMenus() {
  document.querySelectorAll(".toolbar-menu").forEach((menu) => {
    if (!(menu instanceof HTMLDetailsElement)) {
      return;
    }

    menu.addEventListener("toggle", () => {
      if (!menu.open) {
        return;
      }

      const toolbar = menu.parentElement;
      if (!toolbar) {
        return;
      }

      toolbar.querySelectorAll(".toolbar-menu").forEach((peer) => {
        if (peer instanceof HTMLDetailsElement && peer !== menu) {
          peer.open = false;
        }
      });
    });
  });
}

function isLiveLayerReassignSmokeMode() {
  try {
    const search = typeof window.location?.search === "string" ? window.location.search : "";
    return new URLSearchParams(search).get("liveLayerReassignSmoke") === "1";
  } catch {
    return false;
  }
}

function isLiveResizeSmokeMode() {
  try {
    const search = typeof window.location?.search === "string" ? window.location.search : "";
    return new URLSearchParams(search).get("liveResizeSmoke") === "1";
  } catch {
    return false;
  }
}

function isLiveAlignSmokeMode() {
  try {
    const search = typeof window.location?.search === "string" ? window.location.search : "";
    return new URLSearchParams(search).get("liveAlignSmoke") === "1";
  } catch {
    return false;
  }
}

function isLiveUndoRedoSmokeMode() {
  try {
    const search = typeof window.location?.search === "string" ? window.location.search : "";
    return new URLSearchParams(search).get("liveUndoRedoSmoke") === "1";
  } catch {
    return false;
  }
}

function shouldKeepLivePersistWindowOpen() {
  try {
    const search = typeof window.location?.search === "string" ? window.location.search : "";
    return new URLSearchParams(search).get("livePersistKeepOpen") === "1";
  } catch {
    return false;
  }
}

function shouldKeepLiveDragWindowOpen() {
  try {
    const search = typeof window.location?.search === "string" ? window.location.search : "";
    return new URLSearchParams(search).get("liveDragKeepOpen") === "1";
  } catch {
    return false;
  }
}

function shouldKeepLiveCreateDragWindowOpen() {
  try {
    const search = typeof window.location?.search === "string" ? window.location.search : "";
    return new URLSearchParams(search).get("liveCreateDragKeepOpen") === "1";
  } catch {
    return false;
  }
}

function shouldKeepLiveDuplicateDeleteWindowOpen() {
  try {
    const search = typeof window.location?.search === "string" ? window.location.search : "";
    return new URLSearchParams(search).get("liveDuplicateDeleteKeepOpen") === "1";
  } catch {
    return false;
  }
}

function shouldKeepLiveReorderWindowOpen() {
  try {
    const search = typeof window.location?.search === "string" ? window.location.search : "";
    return new URLSearchParams(search).get("liveReorderKeepOpen") === "1";
  } catch {
    return false;
  }
}

function shouldKeepLiveLayerReassignWindowOpen() {
  try {
    const search = typeof window.location?.search === "string" ? window.location.search : "";
    return new URLSearchParams(search).get("liveLayerReassignKeepOpen") === "1";
  } catch {
    return false;
  }
}

function shouldKeepLiveResizeWindowOpen() {
  try {
    const search = typeof window.location?.search === "string" ? window.location.search : "";
    return new URLSearchParams(search).get("liveResizeKeepOpen") === "1";
  } catch {
    return false;
  }
}

function shouldKeepLiveAlignWindowOpen() {
  try {
    const search = typeof window.location?.search === "string" ? window.location.search : "";
    return new URLSearchParams(search).get("liveAlignKeepOpen") === "1";
  } catch {
    return false;
  }
}

function shouldKeepLiveUndoRedoWindowOpen() {
  try {
    const search = typeof window.location?.search === "string" ? window.location.search : "";
    return new URLSearchParams(search).get("liveUndoRedoKeepOpen") === "1";
  } catch {
    return false;
  }
}

async function emitBridgeSmoke(payload) {
  try {
    if (window.myideApi && typeof window.myideApi.reportBridgeSmokeResult === "function") {
      window.myideApi.reportBridgeSmokeResult(payload);
      return;
    }

    console.log(`MYIDE_BRIDGE_SMOKE:${JSON.stringify(payload)}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(`MYIDE_BRIDGE_SMOKE:${JSON.stringify({ status: "fail", error: `smoke payload serialization failed: ${message}` })}`);
  }
}

async function emitLivePersistSmoke(payload) {
  try {
    if (window.myideApi && typeof window.myideApi.reportLivePersistSmokeResult === "function") {
      window.myideApi.reportLivePersistSmokeResult(payload);
      return;
    }

    console.log(`MYIDE_LIVE_PERSIST:${JSON.stringify(payload)}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(`MYIDE_LIVE_PERSIST:${JSON.stringify({ status: "fail", error: `live persist payload serialization failed: ${message}` })}`);
  }
}

async function emitLiveDragSmoke(payload) {
  try {
    if (window.myideApi && typeof window.myideApi.reportLiveDragSmokeResult === "function") {
      window.myideApi.reportLiveDragSmokeResult(payload);
      return;
    }

    console.log(`MYIDE_LIVE_DRAG:${JSON.stringify(payload)}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(`MYIDE_LIVE_DRAG:${JSON.stringify({ status: "fail", error: `live drag payload serialization failed: ${message}` })}`);
  }
}

async function emitLiveCreateDragSmoke(payload) {
  try {
    if (window.myideApi && typeof window.myideApi.reportLiveCreateDragSmokeResult === "function") {
      window.myideApi.reportLiveCreateDragSmokeResult(payload);
      return;
    }

    console.log(`MYIDE_LIVE_CREATE_DRAG:${JSON.stringify(payload)}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(`MYIDE_LIVE_CREATE_DRAG:${JSON.stringify({ status: "fail", error: `live create-drag payload serialization failed: ${message}` })}`);
  }
}

async function emitLiveDonorImportSmoke(payload) {
  try {
    if (window.myideApi && typeof window.myideApi.reportLiveDonorImportSmokeResult === "function") {
      window.myideApi.reportLiveDonorImportSmokeResult(payload);
      return;
    }

    console.log(`MYIDE_LIVE_DONOR_IMPORT:${JSON.stringify(payload)}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(`MYIDE_LIVE_DONOR_IMPORT:${JSON.stringify({ status: "fail", error: `live donor import payload serialization failed: ${message}` })}`);
  }
}

async function emitLiveRuntimePageProofRelaunchSmoke(payload) {
  try {
    if (window.myideApi && typeof window.myideApi.reportLiveRuntimePageProofRelaunchSmokeResult === "function") {
      window.myideApi.reportLiveRuntimePageProofRelaunchSmokeResult(payload);
      return;
    }

    console.log(`MYIDE_LIVE_RUNTIME_PAGE_PROOF_RELAUNCH:${JSON.stringify(payload)}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(`MYIDE_LIVE_RUNTIME_PAGE_PROOF_RELAUNCH:${JSON.stringify({ status: "fail", error: `live runtime page proof relaunch payload serialization failed: ${message}` })}`);
  }
}

async function emitLiveRuntimeSmoke(payload) {
  try {
    if (window.myideApi && typeof window.myideApi.reportLiveRuntimeSmokeResult === "function") {
      window.myideApi.reportLiveRuntimeSmokeResult(payload);
      return;
    }

    console.log(`MYIDE_LIVE_RUNTIME:${JSON.stringify(payload)}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(`MYIDE_LIVE_RUNTIME:${JSON.stringify({ status: "fail", error: `live runtime payload serialization failed: ${message}` })}`);
  }
}

async function emitLiveDuplicateDeleteSmoke(payload) {
  try {
    if (window.myideApi && typeof window.myideApi.reportLiveDuplicateDeleteSmokeResult === "function") {
      window.myideApi.reportLiveDuplicateDeleteSmokeResult(payload);
      return;
    }

    console.log(`MYIDE_LIVE_DUPLICATE_DELETE:${JSON.stringify(payload)}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(`MYIDE_LIVE_DUPLICATE_DELETE:${JSON.stringify({ status: "fail", error: `live duplicate-delete payload serialization failed: ${message}` })}`);
  }
}

async function emitLiveReorderSmoke(payload) {
  try {
    if (window.myideApi && typeof window.myideApi.reportLiveReorderSmokeResult === "function") {
      window.myideApi.reportLiveReorderSmokeResult(payload);
      return;
    }

    console.log(`MYIDE_LIVE_REORDER:${JSON.stringify(payload)}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(`MYIDE_LIVE_REORDER:${JSON.stringify({ status: "fail", error: `live reorder payload serialization failed: ${message}` })}`);
  }
}

async function emitLiveLayerReassignSmoke(payload) {
  try {
    if (window.myideApi && typeof window.myideApi.reportLiveLayerReassignSmokeResult === "function") {
      window.myideApi.reportLiveLayerReassignSmokeResult(payload);
      return;
    }

    console.log(`MYIDE_LIVE_LAYER_REASSIGN:${JSON.stringify(payload)}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(`MYIDE_LIVE_LAYER_REASSIGN:${JSON.stringify({ status: "fail", error: `live layer-reassign payload serialization failed: ${message}` })}`);
  }
}

async function emitLiveResizeSmoke(payload) {
  try {
    if (window.myideApi && typeof window.myideApi.reportLiveResizeSmokeResult === "function") {
      window.myideApi.reportLiveResizeSmokeResult(payload);
      return;
    }

    console.log(`MYIDE_LIVE_RESIZE:${JSON.stringify(payload)}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(`MYIDE_LIVE_RESIZE:${JSON.stringify({ status: "fail", error: `live resize payload serialization failed: ${message}` })}`);
  }
}

async function emitLiveAlignSmoke(payload) {
  try {
    if (window.myideApi && typeof window.myideApi.reportLiveAlignSmokeResult === "function") {
      window.myideApi.reportLiveAlignSmokeResult(payload);
      return;
    }

    console.log(`MYIDE_LIVE_ALIGN:${JSON.stringify(payload)}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(`MYIDE_LIVE_ALIGN:${JSON.stringify({ status: "fail", error: `live align payload serialization failed: ${message}` })}`);
  }
}

async function emitLiveUndoRedoSmoke(payload) {
  try {
    if (window.myideApi && typeof window.myideApi.reportLiveUndoRedoSmokeResult === "function") {
      window.myideApi.reportLiveUndoRedoSmokeResult(payload);
      return;
    }

    console.log(`MYIDE_LIVE_UNDO_REDO:${JSON.stringify(payload)}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(`MYIDE_LIVE_UNDO_REDO:${JSON.stringify({ status: "fail", error: `live undo-redo payload serialization failed: ${message}` })}`);
  }
}

async function runBridgeSmoke() {
  const api = window.myideApi;
  const startedAt = new Date().toISOString();
  const baseResult = {
    startedAt,
    preloadExecuted: Boolean(api),
    myideApiExposed: Boolean(api && typeof api.loadProjectSlice === "function"),
    pingSucceeded: false,
    rendererReadyAcknowledged: false,
    bridgeCallSucceeded: false,
    workspaceLoadSucceeded: false,
    project001LoadSucceeded: false,
    preloadExists: false,
    preloadPath: null
  };

  try {
    if (
      !api
      || typeof api.loadProjectSlice !== "function"
      || typeof api.ping !== "function"
      || typeof api.bridgeHealth !== "function"
      || typeof api.reportRendererReady !== "function"
    ) {
      await emitBridgeSmoke({
        ...baseResult,
        status: "fail",
        error: "myideApi bridge helpers are unavailable in renderer."
      });
      return;
    }

    await api.ping();
    const rendererHandshake = await api.reportRendererReady();
    const health = await api.bridgeHealth();
    const bundle = await api.loadProjectSlice("project_001");
    const workspaceProjects = Array.isArray(bundle?.workspace?.projects) ? bundle.workspace.projects : [];
    const selectedProjectId = typeof bundle?.selectedProjectId === "string" ? bundle.selectedProjectId : "";
    const project001 = workspaceProjects.find((entry) => entry?.projectId === "project_001") ?? null;
    const projectShapeValid = Boolean(bundle?.project && typeof bundle.project === "object" && !Array.isArray(bundle.project));
    const vabsStatus = bundle?.vabs && typeof bundle.vabs === "object" && !Array.isArray(bundle.vabs)
      ? bundle.vabs
      : null;
    const vabsStatusReady = Boolean(
      vabsStatus
      && typeof vabsStatus.currentBlocker === "string"
      && typeof vabsStatus.nextRecommendedAction === "string"
      && typeof vabsStatus.targetFolderToken === "string"
    );
    const propertyPanelApiReady = typeof api.buildPropertyPanelViewModel === "function";

    if (!projectShapeValid) {
      throw new Error("project slice returned an invalid project object.");
    }

    if (!vabsStatusReady) {
      throw new Error("project slice returned no usable VABS status summary for project_001.");
    }

    if (propertyPanelApiReady) {
      api.buildPropertyPanelViewModel({
        mode: "read-only",
        subjectId: "bridge-smoke",
        title: "Bridge Smoke",
        subtitle: "Renderer bridge smoke validation",
        facts: ["Bridge smoke"],
        assumptions: [],
        unresolved: [],
        groups: []
      });
    }

    await emitBridgeSmoke({
      ...baseResult,
      status: "pass",
      preloadExecuted: Boolean(health?.preloadExecuted),
      pingSucceeded: true,
      rendererReadyAcknowledged: Boolean(rendererHandshake?.rendererReady),
      bridgeCallSucceeded: true,
      workspaceLoadSucceeded: workspaceProjects.length > 0,
      project001LoadSucceeded: Boolean(project001),
      selectedProjectId,
      workspaceProjectCount: workspaceProjects.length,
      vabsStatusReady,
      vabsActiveFixtureSource: vabsStatus?.activeFixtureSource ?? null,
      propertyPanelBridgeReady: propertyPanelApiReady,
      preloadExists: Boolean(health?.preloadExists),
      preloadPath: health?.preloadPath ?? null
    });
  } catch (error) {
    await emitBridgeSmoke({
      ...baseResult,
      status: "fail",
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

async function init() {
  bindActions();
  setupToolbarMenus();
  renderBridgeStatus();

  try {
    await checkDesktopBridge();
    await reloadWorkspace(true);
  } catch (error) {
    renderFatal(error instanceof Error ? error.message : "Unknown editor load error.");
  }
}

async function bootRenderer() {
  const reportBootProgress = (step, extra = {}) => {
    if (!isLiveRuntimeSmokeMode()) {
      return;
    }

    if (window.myideApi && typeof window.myideApi.reportLiveRuntimeSmokeProgress === "function") {
      try {
        window.myideApi.reportLiveRuntimeSmokeProgress({ step, ...extra, phase: "boot" });
        return;
      } catch {
        // Fall through to console logging.
      }
    }

    try {
      console.log(`MYIDE_LIVE_RUNTIME_PROGRESS:${JSON.stringify({ step, ...extra, phase: "boot" })}`);
    } catch {
      console.log(`MYIDE_LIVE_RUNTIME_PROGRESS:${step}`);
    }
  };

  reportBootProgress("boot-start");
  await init();
  reportBootProgress("boot-init-complete", {
    selectedProjectId: state.selectedProjectId,
    workspaceProjectCount: getWorkspaceProjects().length
  });

  if (isLivePersistSmokeMode()) {
    await runLivePersistSmoke();
    return;
  }

  if (isLiveDragSmokeMode()) {
    await runLiveDragSmoke();
    return;
  }

  if (isLiveCreateDragSmokeMode()) {
    await runLiveCreateDragSmoke();
    return;
  }

  if (isLiveDonorImportSmokeMode()) {
    await runLiveDonorImportSmoke();
    return;
  }

  if (isLiveRuntimePageProofRelaunchSmokeMode()) {
    await runLiveRuntimePageProofRelaunchSmoke();
    return;
  }

  if (isLiveRuntimeSmokeMode()) {
    reportBootProgress("boot-enter-live-runtime-smoke");
    await runLiveRuntimeSmoke();
    return;
  }

  if (isLiveDuplicateDeleteSmokeMode()) {
    await runLiveDuplicateDeleteSmoke();
    return;
  }

  if (isLiveReorderSmokeMode()) {
    await runLiveReorderSmoke();
    return;
  }

  if (isLiveLayerReassignSmokeMode()) {
    await runLiveLayerReassignSmoke();
    return;
  }

  if (isLiveResizeSmokeMode()) {
    await runLiveResizeSmoke();
    return;
  }

  if (isLiveAlignSmokeMode()) {
    await runLiveAlignSmoke();
    return;
  }

  if (isLiveUndoRedoSmokeMode()) {
    await runLiveUndoRedoSmoke();
    return;
  }
}

function sleep(delayMs) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, delayMs);
  });
}

async function waitForRendererCondition(check, description, options = {}) {
  const timeoutMs = Number.isFinite(options.timeoutMs) ? options.timeoutMs : 15000;
  const intervalMs = Number.isFinite(options.intervalMs) ? options.intervalMs : 50;
  const startedAt = Date.now();
  let lastValue;

  while (Date.now() - startedAt <= timeoutMs) {
    lastValue = check();
    if (lastValue) {
      return lastValue;
    }
    await sleep(intervalMs);
  }

  throw new Error(`Timed out waiting for ${description}.`);
}

const runtimeConsolePrefix = "__MYIDE_RUNTIME__";

function getRuntimeLaunchInfo() {
  const runtimeLaunch = state.bundle?.runtimeLaunch;
  return runtimeLaunch && typeof runtimeLaunch === "object" ? runtimeLaunch : null;
}

function getRuntimeWebview() {
  const webview = elements.runtimeWebview;
  if (!webview || typeof webview.executeJavaScript !== "function") {
    return null;
  }

  return webview;
}

function canUseRuntimeMode() {
  const runtimeLaunch = getRuntimeLaunchInfo();
  return Boolean(runtimeLaunch && runtimeLaunch.entryUrl);
}

function getRuntimeOverrideStatus() {
  const overrideStatus = state.runtimeUi.overrideStatus ?? state.bundle?.runtimeOverrides;
  return overrideStatus && typeof overrideStatus === "object" ? overrideStatus : null;
}

function getRuntimeMirrorStatus() {
  const runtimeMirror = state.bundle?.runtimeMirror;
  return runtimeMirror && typeof runtimeMirror === "object" ? runtimeMirror : null;
}

function getRuntimeResourceMapStatus() {
  const resourceMap = state.runtimeUi.resourceMap ?? state.bundle?.runtimeResourceMap;
  return resourceMap && typeof resourceMap === "object" ? resourceMap : null;
}

function getRuntimeCoverageStatus() {
  const resourceMap = getRuntimeResourceMapStatus();
  return resourceMap?.coverage && typeof resourceMap.coverage === "object" ? resourceMap.coverage : null;
}

function getRuntimeResourceMapEntries() {
  const resourceMap = getRuntimeResourceMapStatus();
  return Array.isArray(resourceMap?.entries) ? resourceMap.entries : [];
}

function getRuntimeResourceMapEntry(runtimeSourceUrl) {
  if (typeof runtimeSourceUrl !== "string" || runtimeSourceUrl.length === 0) {
    return null;
  }

  const canonicalSourceUrl = getRuntimeCanonicalSourceUrl(runtimeSourceUrl) ?? runtimeSourceUrl;
  return getRuntimeResourceMapEntries().find((entry) => entry.canonicalSourceUrl === canonicalSourceUrl) ?? null;
}

function getRuntimeMirrorEntry(sourceUrl) {
  const canonicalSourceUrl = getRuntimeCanonicalSourceUrl(sourceUrl);
  if (!canonicalSourceUrl) {
    return null;
  }

  return getRuntimeMirrorStatus()?.entries?.find((entry) => entry.sourceUrl === canonicalSourceUrl) ?? null;
}

function buildLocalMirrorObservedUrl(sourceUrl) {
  const runtimeMirrorStatus = getRuntimeMirrorStatus();
  if (!runtimeMirrorStatus?.launchUrl) {
    return sourceUrl;
  }

  try {
    const launchUrl = new URL(runtimeMirrorStatus.launchUrl);
    const projectId = runtimeMirrorStatus.projectId || "project_001";
    return `${launchUrl.protocol}//${launchUrl.host}/runtime/${projectId}/mirror?source=${encodeURIComponent(sourceUrl)}`;
  } catch {
    return sourceUrl;
  }
}

function getRuntimeCanonicalSourceUrl(resourceUrl) {
  try {
    const parsedUrl = new URL(String(resourceUrl));
    const mirroredSourceUrl = parsedUrl.searchParams.get("source");
    if (
      parsedUrl.hostname === "127.0.0.1"
      && /^\/runtime\/[^/]+\/mirror$/.test(parsedUrl.pathname)
      && mirroredSourceUrl
    ) {
      return new URL(mirroredSourceUrl).toString();
    }
    if (
      parsedUrl.hostname === "127.0.0.1"
      && /^\/runtime\/[^/]+\/assets\//.test(parsedUrl.pathname)
    ) {
      const relativePath = parsedUrl.pathname.replace(/^\/runtime\/[^/]+\/assets\//, "");
      const runtimeMirrorEntry = (getRuntimeMirrorStatus()?.entries ?? []).find((entry) => {
        try {
          const entryUrl = new URL(entry.sourceUrl);
          const entryRelativePath = entryUrl.pathname.includes("/html/MysteryGarden/")
            ? `${entryUrl.pathname.split("/html/MysteryGarden/")[1]}${entryUrl.search}`
            : entryUrl.pathname.replace(/^\/+/, "");
          return entryRelativePath === relativePath;
        } catch {
          return false;
        }
      });
      if (runtimeMirrorEntry?.sourceUrl) {
        return runtimeMirrorEntry.sourceUrl;
      }
    }
    return parsedUrl.toString();
  } catch {
    return null;
  }
}

function getRuntimeResourceFileType(resourceUrl) {
  try {
    const canonicalSourceUrl = getRuntimeCanonicalSourceUrl(resourceUrl);
    if (!canonicalSourceUrl) {
      return null;
    }
    const parsedUrl = new URL(canonicalSourceUrl);
    const match = parsedUrl.pathname.match(/\.([a-z0-9]+)$/i);
    if (!match) {
      return null;
    }
    const fileType = match[1].toLowerCase();
    return ["png", "webp", "jpg", "jpeg", "svg"].includes(fileType) ? fileType : null;
  } catch {
    return null;
  }
}

function getRuntimeResourceRelativePath(resourceUrl) {
  try {
    const canonicalSourceUrl = getRuntimeCanonicalSourceUrl(resourceUrl);
    if (!canonicalSourceUrl) {
      return null;
    }
    const parsedUrl = new URL(canonicalSourceUrl);
    if (parsedUrl.pathname.includes("/html/MysteryGarden/")) {
      return parsedUrl.pathname.split("/html/MysteryGarden/")[1];
    }
    return parsedUrl.pathname.replace(/^\/+/, "");
  } catch {
    return null;
  }
}

function normalizeRuntimeResourceEntries(rawEntries) {
  if (!Array.isArray(rawEntries)) {
    return [];
  }

  return rawEntries
    .map((entry) => {
      const observedUrl = typeof entry?.url === "string" ? entry.url : "";
      const canonicalUrl = getRuntimeCanonicalSourceUrl(observedUrl);
      const fileType = getRuntimeResourceFileType(observedUrl);
      if (!canonicalUrl || !fileType) {
        return null;
      }

      return {
        url: canonicalUrl,
        observedUrl,
        fileType,
        initiatorType: typeof entry?.initiatorType === "string" ? entry.initiatorType : null,
        relativePath: getRuntimeResourceRelativePath(observedUrl),
        filename: typeof entry?.filename === "string" && entry.filename.length > 0
          ? entry.filename
          : (() => {
              try {
                return String(new URL(canonicalUrl).pathname.split("/").pop() ?? "");
              } catch {
                return "";
              }
            })()
      };
    })
    .filter(Boolean);
}

function normalizeRuntimeAssetUseEntries(rawEntries) {
  if (!Array.isArray(rawEntries)) {
    return [];
  }

  return rawEntries
    .map((entry) => {
      const observedUrl = typeof entry?.observedUrl === "string" && entry.observedUrl.length > 0
        ? entry.observedUrl
        : (typeof entry?.canonicalUrl === "string" ? entry.canonicalUrl : "");
      const canonicalUrl = getRuntimeCanonicalSourceUrl(
        typeof entry?.canonicalUrl === "string" && entry.canonicalUrl.length > 0
          ? entry.canonicalUrl
          : observedUrl
      );
      const fileType = typeof entry?.fileType === "string" && entry.fileType.length > 0
        ? entry.fileType.toLowerCase()
        : getRuntimeResourceFileType(observedUrl);
      if (!canonicalUrl || !fileType) {
        return null;
      }

      return {
        url: canonicalUrl,
        observedUrl: observedUrl || canonicalUrl,
        fileType,
        relativePath: typeof entry?.runtimeRelativePath === "string" && entry.runtimeRelativePath.length > 0
          ? entry.runtimeRelativePath
          : getRuntimeResourceRelativePath(canonicalUrl),
        filename: (() => {
          try {
            return String(new URL(canonicalUrl).pathname.split("/").pop() ?? "");
          } catch {
            return "";
          }
        })(),
        initiatorType: Array.isArray(entry?.sourceKinds) && entry.sourceKinds.length > 0
          ? entry.sourceKinds.join(", ")
          : "runtime-asset-use",
        hitCount: Number.isFinite(entry?.hitCount) ? Number(entry.hitCount) : 0,
        naturalWidth: Number.isFinite(entry?.naturalWidth) ? Number(entry.naturalWidth) : null,
        naturalHeight: Number.isFinite(entry?.naturalHeight) ? Number(entry.naturalHeight) : null,
        sourceKinds: Array.isArray(entry?.sourceKinds) ? entry.sourceKinds.filter(Boolean) : [],
        contexts: Array.isArray(entry?.contexts) ? entry.contexts.filter(Boolean) : [],
        canvasRect: entry?.canvasRect && typeof entry.canvasRect === "object" ? entry.canvasRect : null,
        lastUsedAtUtc: typeof entry?.lastUsedAtUtc === "string" ? entry.lastUsedAtUtc : null
      };
    })
    .filter(Boolean);
}

function getRuntimeAssetUseEntries() {
  const pickEntries = normalizeRuntimeAssetUseEntries(state.runtimeUi.lastPick?.assetUseEntries);
  if (pickEntries.length > 0) {
    return pickEntries;
  }

  return normalizeRuntimeAssetUseEntries(state.runtimeUi.diagnostics?.assetUseEntries);
}

function getObservedRuntimeResources() {
  const lastPickResources = normalizeRuntimeResourceEntries(state.runtimeUi.lastPick?.resourceEntries);
  if (lastPickResources.length > 0) {
    return lastPickResources;
  }

  return normalizeRuntimeResourceEntries(state.runtimeUi.diagnostics?.resourceEntries);
}

function getRuntimeOverrideEntry(runtimeSourceUrl) {
  if (typeof runtimeSourceUrl !== "string" || runtimeSourceUrl.length === 0) {
    return null;
  }

  return getRuntimeOverrideStatus()?.entries?.find((entry) => entry.runtimeSourceUrl === runtimeSourceUrl) ?? null;
}

function getRuntimeWorkbenchSourceUrl() {
  const explicitSourceUrl = getRuntimeCanonicalSourceUrl(state.runtimeUi.workbenchSourceUrl);
  if (explicitSourceUrl) {
    return explicitSourceUrl;
  }

  const debugHostSourceUrl = getRuntimeCanonicalSourceUrl(state.runtimeUi.debugHost?.candidateRuntimeSourceUrl);
  if (debugHostSourceUrl) {
    return debugHostSourceUrl;
  }

  return null;
}

function setRuntimeWorkbenchSource(sourceUrl, options = {}) {
  const canonicalSourceUrl = typeof sourceUrl === "string" && sourceUrl.length > 0
    ? (getRuntimeCanonicalSourceUrl(sourceUrl) ?? sourceUrl)
    : null;
  state.runtimeUi.workbenchSourceUrl = canonicalSourceUrl;
  if (options.render !== false) {
    renderAll();
  }
  return canonicalSourceUrl;
}

function getWorkbenchModeLabel(mode = state.workbenchMode) {
  return mode === "runtime" ? "Runtime" : "Compose";
}

function normalizeWorkflowPanel(panel) {
  const value = String(panel ?? "").trim().toLowerCase();
  if (["runtime", "investigation", "donor", "compose", "vabs", "project"].includes(value)) {
    return value;
  }

  return state.workbenchMode === "runtime" ? "runtime" : "compose";
}

function getActiveWorkflowPanel() {
  return normalizeWorkflowPanel(state.workflowUi?.activePanel);
}

function getWorkflowPanelLabel(panel = getActiveWorkflowPanel()) {
  const labels = {
    runtime: "Runtime",
    investigation: "Investigation",
    donor: "Donor Assets / Evidence",
    compose: "Compose",
    vabs: "VABS",
    project: "Project"
  };

  return labels[normalizeWorkflowPanel(panel)] ?? "Runtime";
}

function syncWorkflowPanelToWorkbenchMode(mode = state.workbenchMode) {
  const activePanel = getActiveWorkflowPanel();
  if (mode === "runtime" && (activePanel === "runtime" || activePanel === "compose")) {
    state.workflowUi.activePanel = "runtime";
    return;
  }

  if (mode === "scene" && (activePanel === "runtime" || activePanel === "compose")) {
    state.workflowUi.activePanel = "compose";
  }
}

function setWorkflowPanel(panel, options = {}) {
  const nextPanel = normalizeWorkflowPanel(panel);
  if (state.workflowUi.activePanel === nextPanel && !options.force) {
    return;
  }

  state.workflowUi.activePanel = nextPanel;
  renderAll();

  if (!options.silent) {
    setPreviewStatus(`${getWorkflowPanelLabel(nextPanel)} panel is active in the left workflow rail.`);
  }
}

function setWorkbenchMode(mode, options = {}) {
  const requestedMode = mode === "scene" ? "scene" : "runtime";
  const nextMode = requestedMode === "runtime" && !canUseRuntimeMode()
    ? "scene"
    : requestedMode;

  if (state.workbenchMode === nextMode && !options.force) {
    return;
  }

  state.workbenchMode = nextMode;
  syncWorkflowPanelToWorkbenchMode(nextMode);
  renderAll();

  if (!options.silent) {
    setPreviewStatus(nextMode === "runtime"
      ? "Runtime Mode is active. Launch the grounded donor runtime, pick a live target, then jump into donor or compose context from the workflow hub."
      : "Compose Mode is active. Edit the internal scene while donor sources stay read-only, then jump back to Runtime Mode when you need live donor context.");
  }

  if (nextMode === "runtime" && state.runtimeUi.launched) {
    void refreshRuntimeDiagnostics();
  }
}

function trimRuntimeText(value, maxLength = 160) {
  const normalized = String(value ?? "").replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(0, maxLength - 1))}…`;
}

function renderWorkflowPanels() {
  const activePanel = getActiveWorkflowPanel();

  elements.workflowPanelbar?.querySelectorAll("[data-workflow-panel]").forEach((button) => {
    if (!(button instanceof HTMLButtonElement)) {
      return;
    }

    const isActive = normalizeWorkflowPanel(button.dataset.workflowPanel) === activePanel;
    button.dataset.tone = isActive ? "active" : "default";
    button.setAttribute("aria-selected", isActive ? "true" : "false");
  });

  if (elements.panelDonor) {
    elements.panelDonor.hidden = activePanel !== "donor";
  }
  if (elements.panelInvestigation) {
    elements.panelInvestigation.hidden = activePanel !== "investigation";
  }
  if (elements.panelCompose) {
    elements.panelCompose.hidden = activePanel !== "compose";
  }
  if (elements.panelVabs) {
    elements.panelVabs.hidden = activePanel !== "vabs";
  }
  if (elements.panelNewProject) {
    elements.panelNewProject.hidden = activePanel !== "project";
  }
}

function buildRuntimeGuestBridgeScript() {
  function installRuntimeMainWorldBridge() {
    const PREFIX = "__MYIDE_RUNTIME__";
    const staticFileTypes = new Set(["png", "webp", "jpg", "jpeg", "svg", "gif"]);
    const existingBridge = window.__MYIDE_RUNTIME_MAIN_WORLD_BRIDGE__;
    if (existingBridge && typeof existingBridge.getStatus === "function") {
      return existingBridge.getStatus();
    }

    function emit(type, payload) {
      try {
        console.log(PREFIX + JSON.stringify({ type, ...payload }));
      } catch (error) {
        console.log(PREFIX + JSON.stringify({
          type: "error",
          error: error instanceof Error ? error.message : String(error)
        }));
      }
    }

    function isRecord(value) {
      return Boolean(value) && typeof value === "object";
    }

    function normalizeNumber(value) {
      return typeof value === "number" && Number.isFinite(value) ? Math.round(value) : null;
    }

    function nowIso() {
      return new Date().toISOString();
    }

    function nowMs() {
      return Date.now();
    }

    function safeLocationHref(targetWindow) {
      try {
        return typeof targetWindow.location?.href === "string" ? targetWindow.location.href : null;
      } catch {
        return null;
      }
    }

    function safeDocumentTitle(targetWindow) {
      try {
        return typeof targetWindow.document?.title === "string" ? targetWindow.document.title || null : null;
      } catch {
        return null;
      }
    }

    function collectInspectableWindows(maxDepth = 2, maxFramesPerWindow = 6) {
      const root = {
        win: window,
        label: "top",
        href: safeLocationHref(window),
        title: safeDocumentTitle(window),
        depth: 0,
        offsetX: 0,
        offsetY: 0
      };
      const results = [root];
      const queue = [root];
      const seen = new WeakSet([window]);

      while (queue.length > 0) {
        const current = queue.shift();
        if (!current || current.depth >= maxDepth) {
          continue;
        }

        let frameElements = [];
        try {
          frameElements = Array.from(current.win.document.querySelectorAll("iframe, frame")).slice(0, maxFramesPerWindow);
        } catch {
          frameElements = [];
        }

        frameElements.forEach((frameElement, index) => {
          const childWindow = frameElement?.contentWindow;
          if (!childWindow || seen.has(childWindow)) {
            return;
          }
          seen.add(childWindow);

          try {
            const frameRect = typeof frameElement.getBoundingClientRect === "function"
              ? frameElement.getBoundingClientRect()
              : null;
            const target = {
              win: childWindow,
              label: `${current.label}/frame-${index + 1}`,
              href: safeLocationHref(childWindow),
              title: safeDocumentTitle(childWindow),
              depth: current.depth + 1,
              offsetX: current.offsetX + Math.round(frameRect?.left ?? 0),
              offsetY: current.offsetY + Math.round(frameRect?.top ?? 0)
            };
            results.push(target);
            queue.push(target);
          } catch {
            // Cross-origin frames remain best-effort only in the main-world bridge.
          }
        });
      }

      return results;
    }

    function normalizeContextLabel(value) {
      const normalized = String(value ?? "").trim().toLowerCase();
      return normalized === "experimental-webgl" ? "webgl" : normalized;
    }

    function normalizeObservedUrl(resourceUrl, baseHref) {
      if (typeof resourceUrl !== "string" || resourceUrl.trim().length === 0) {
        return null;
      }

      try {
        const normalizedBaseHref = typeof baseHref === "string" && baseHref.trim().length > 0
          ? baseHref
          : window.location.href;
        return new URL(resourceUrl, normalizedBaseHref).toString();
      } catch {
        return null;
      }
    }

    function getCanonicalResourceUrl(resourceUrl, baseHref) {
      const observedUrl = normalizeObservedUrl(resourceUrl, baseHref);
      if (!observedUrl) {
        return null;
      }

      try {
        const parsedUrl = new URL(observedUrl);
        const mirroredSourceUrl = parsedUrl.searchParams.get("source");
        if (
          parsedUrl.hostname === "127.0.0.1"
          && /^\/runtime\/[^/]+\/mirror$/.test(parsedUrl.pathname)
          && mirroredSourceUrl
        ) {
          return new URL(mirroredSourceUrl).toString();
        }
        return parsedUrl.toString();
      } catch {
        return null;
      }
    }

    function getRuntimeRelativePath(resourceUrl, baseHref) {
      const canonicalUrl = getCanonicalResourceUrl(resourceUrl, baseHref) ?? normalizeObservedUrl(resourceUrl, baseHref);
      if (!canonicalUrl) {
        return null;
      }

      try {
        const parsedUrl = new URL(canonicalUrl);
        if (parsedUrl.pathname.includes("/html/MysteryGarden/")) {
          return parsedUrl.pathname.split("/html/MysteryGarden/")[1] ?? null;
        }
        const assetMatch = parsedUrl.pathname.match(/^\/runtime\/[^/]+\/assets\/(.+)$/);
        if (assetMatch?.[1]) {
          return assetMatch[1];
        }
        return parsedUrl.pathname.replace(/^\/+/, "") || null;
      } catch {
        return null;
      }
    }

    function getFileType(resourceUrl, baseHref) {
      const canonicalUrl = getCanonicalResourceUrl(resourceUrl, baseHref) ?? normalizeObservedUrl(resourceUrl, baseHref);
      if (!canonicalUrl) {
        return null;
      }

      try {
        const parsedUrl = new URL(canonicalUrl);
        const extension = parsedUrl.pathname.split(".").pop()?.toLowerCase() ?? null;
        return extension && extension.length > 0 ? extension : null;
      } catch {
        return null;
      }
    }

    function summarizeRect(rect) {
      if (!rect) {
        return null;
      }

      return {
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width: Math.round(rect.width),
        height: Math.round(rect.height)
      };
    }

    function translateRect(rect, offsetX, offsetY) {
      if (!rect) {
        return null;
      }

      return {
        x: rect.x + offsetX,
        y: rect.y + offsetY,
        width: rect.width,
        height: rect.height
      };
    }

    function getTagName(value) {
      return isRecord(value) && typeof value.tagName === "string"
        ? value.tagName.toLowerCase()
        : null;
    }

    function isElementLike(value) {
      return Boolean(getTagName(value))
        && isRecord(value)
        && typeof value.getBoundingClientRect === "function";
    }

    function isCanvasLike(value) {
      return getTagName(value) === "canvas"
        && isRecord(value)
        && typeof value.getContext === "function";
    }

    function isRuntimeTickerLike(value) {
      return isRecord(value)
        && typeof value.stop === "function"
        && typeof value.start === "function";
    }

    function getImageLikeDescriptor(source, baseHref) {
      if (!source) {
        return null;
      }

      if (source instanceof HTMLImageElement) {
        const observedUrl = normalizeObservedUrl(source.currentSrc || source.src, baseHref);
        return {
          observedUrl,
          canonicalUrl: getCanonicalResourceUrl(observedUrl, baseHref),
          runtimeRelativePath: getRuntimeRelativePath(observedUrl, baseHref),
          fileType: getFileType(observedUrl, baseHref),
          naturalWidth: Number.isFinite(source.naturalWidth) ? Number(source.naturalWidth) : null,
          naturalHeight: Number.isFinite(source.naturalHeight) ? Number(source.naturalHeight) : null
        };
      }

      if (typeof SVGImageElement !== "undefined" && source instanceof SVGImageElement) {
        const observedUrl = normalizeObservedUrl(source.href?.baseVal ?? null, baseHref);
        return {
          observedUrl,
          canonicalUrl: getCanonicalResourceUrl(observedUrl, baseHref),
          runtimeRelativePath: getRuntimeRelativePath(observedUrl, baseHref),
          fileType: getFileType(observedUrl, baseHref),
          naturalWidth: null,
          naturalHeight: null
        };
      }

      if (source instanceof HTMLVideoElement) {
        const observedUrl = normalizeObservedUrl(source.currentSrc || source.src, baseHref);
        return {
          observedUrl,
          canonicalUrl: getCanonicalResourceUrl(observedUrl, baseHref),
          runtimeRelativePath: getRuntimeRelativePath(observedUrl, baseHref),
          fileType: getFileType(observedUrl, baseHref),
          naturalWidth: Number.isFinite(source.videoWidth) ? Number(source.videoWidth) : null,
          naturalHeight: Number.isFinite(source.videoHeight) ? Number(source.videoHeight) : null
        };
      }

      if (source instanceof HTMLCanvasElement) {
        return {
          observedUrl: null,
          canonicalUrl: null,
          runtimeRelativePath: null,
          fileType: null,
          naturalWidth: Number.isFinite(source.width) ? Number(source.width) : null,
          naturalHeight: Number.isFinite(source.height) ? Number(source.height) : null
        };
      }

      if (typeof ImageBitmap !== "undefined" && source instanceof ImageBitmap) {
        return {
          observedUrl: null,
          canonicalUrl: null,
          runtimeRelativePath: null,
          fileType: null,
          naturalWidth: Number.isFinite(source.width) ? Number(source.width) : null,
          naturalHeight: Number.isFinite(source.height) ? Number(source.height) : null
        };
      }

      if (isRecord(source) && getTagName(source) === "img" && typeof source.src === "string") {
        const observedUrl = normalizeObservedUrl(
          typeof source.currentSrc === "string" && source.currentSrc.length > 0 ? source.currentSrc : source.src,
          baseHref
        );
        return {
          observedUrl,
          canonicalUrl: getCanonicalResourceUrl(observedUrl, baseHref),
          runtimeRelativePath: getRuntimeRelativePath(observedUrl, baseHref),
          fileType: getFileType(observedUrl, baseHref),
          naturalWidth: normalizeNumber(source.naturalWidth ?? source.width),
          naturalHeight: normalizeNumber(source.naturalHeight ?? source.height)
        };
      }

      if (isRecord(source) && typeof source.src === "string") {
        const observedUrl = normalizeObservedUrl(source.src, baseHref);
        return {
          observedUrl,
          canonicalUrl: getCanonicalResourceUrl(observedUrl, baseHref),
          runtimeRelativePath: getRuntimeRelativePath(observedUrl, baseHref),
          fileType: getFileType(observedUrl, baseHref),
          naturalWidth: normalizeNumber(source.naturalWidth ?? source.width),
          naturalHeight: normalizeNumber(source.naturalHeight ?? source.height)
        };
      }

      return null;
    }

    function buildAssetUseKey(info) {
      return info.canonicalUrl
        ?? info.observedUrl
        ?? `inline:${info.naturalWidth ?? 0}x${info.naturalHeight ?? 0}`;
    }

    const state = window.__MYIDE_RUNTIME_MAIN_WORLD_BRIDGE_STATE__ || {
      inspectEnabled: false,
      lastPick: null,
      paused: false,
      assetUseRecords: new Map(),
      contextTypes: new Set(),
      webglBindings: new WeakMap(),
      textureInfo: new WeakMap()
    };
    window.__MYIDE_RUNTIME_MAIN_WORLD_BRIDGE_STATE__ = state;

    function recordAssetUse(info, sourceKind, contextLabel, canvasRect = null) {
      const fileType = info.fileType?.toLowerCase() ?? null;
      if (!fileType || !staticFileTypes.has(fileType)) {
        return null;
      }

      const key = buildAssetUseKey(info);
      const existing = state.assetUseRecords.get(key);
      const next = existing ?? {
        key,
        observedUrl: info.observedUrl,
        canonicalUrl: info.canonicalUrl,
        runtimeRelativePath: info.runtimeRelativePath,
        fileType,
        hitCount: 0,
        lastUsedAtUtc: null,
        sourceKinds: [],
        contexts: [],
        naturalWidth: info.naturalWidth,
        naturalHeight: info.naturalHeight,
        canvasRect: null,
        lastCanvasRectTimestamp: null,
        lastUsedAtMs: null
      };

      next.hitCount += 1;
      next.lastUsedAtUtc = nowIso();
      next.lastUsedAtMs = nowMs();
      if (!next.sourceKinds.includes(sourceKind)) {
        next.sourceKinds.push(sourceKind);
      }
      if (!next.contexts.includes(contextLabel)) {
        next.contexts.push(contextLabel);
      }
      if (info.observedUrl) {
        next.observedUrl = info.observedUrl;
      }
      if (info.canonicalUrl) {
        next.canonicalUrl = info.canonicalUrl;
      }
      if (info.runtimeRelativePath) {
        next.runtimeRelativePath = info.runtimeRelativePath;
      }
      if (info.naturalWidth != null) {
        next.naturalWidth = info.naturalWidth;
      }
      if (info.naturalHeight != null) {
        next.naturalHeight = info.naturalHeight;
      }
      if (canvasRect) {
        next.canvasRect = canvasRect;
        next.lastCanvasRectTimestamp = nowMs();
      }

      state.assetUseRecords.set(key, next);
      return next;
    }

    function extractCssUrls(value) {
      if (typeof value !== "string" || value.length === 0) {
        return [];
      }

      return Array.from(value.matchAll(/url\((['"]?)([^'")]+)\1\)/gi))
        .map((match) => normalizeObservedUrl(match[2]))
        .filter(Boolean);
    }

    function recordElementAssetUse(targetWindow, element, sourceKind) {
      const rect = element.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) {
        return;
      }

      if (getTagName(element) === "img") {
        const info = getImageLikeDescriptor(element, targetWindow.href);
        if (info) {
          recordAssetUse(
            info,
            sourceKind,
            `${targetWindow.label}:dom`,
            translateRect(summarizeRect(rect), targetWindow.offsetX, targetWindow.offsetY)
          );
        }
      }

      const style = targetWindow.win.getComputedStyle(element);
      for (const url of [
        ...extractCssUrls(style.backgroundImage),
        ...extractCssUrls(style.maskImage),
        ...extractCssUrls(style.listStyleImage),
        ...extractCssUrls(style.content)
      ]) {
        recordAssetUse(
          {
            observedUrl: url,
            canonicalUrl: getCanonicalResourceUrl(url, targetWindow.href),
            runtimeRelativePath: getRuntimeRelativePath(url, targetWindow.href),
            fileType: getFileType(url, targetWindow.href),
            naturalWidth: null,
            naturalHeight: null
          },
          sourceKind,
          `${targetWindow.label}:dom`,
          translateRect(summarizeRect(rect), targetWindow.offsetX, targetWindow.offsetY)
        );
      }
    }

    function scanDomAssetUse() {
      for (const targetWindow of collectInspectableWindows()) {
        let elements = [];
        try {
          elements = Array.from(targetWindow.win.document.querySelectorAll("*")).slice(0, 512);
        } catch {
          elements = [];
        }

        for (const element of elements) {
          if (!isElementLike(element)) {
            continue;
          }
          if (getTagName(element) === "img") {
            recordElementAssetUse(targetWindow, element, "dom-image-element");
            continue;
          }
          recordElementAssetUse(targetWindow, element, "dom-style-image");
        }
      }
    }

    function buildAssetUseEntries() {
      return Array.from(state.assetUseRecords.values())
        .sort((left, right) => {
          const rightMs = right.lastUsedAtMs ?? 0;
          const leftMs = left.lastUsedAtMs ?? 0;
          if (rightMs !== leftMs) {
            return rightMs - leftMs;
          }
          if (right.hitCount !== left.hitCount) {
            return right.hitCount - left.hitCount;
          }
          return String(left.runtimeRelativePath ?? left.canonicalUrl ?? left.observedUrl)
            .localeCompare(String(right.runtimeRelativePath ?? right.canonicalUrl ?? right.observedUrl));
        })
        .slice(0, 80)
        .map((entry) => ({
          observedUrl: entry.observedUrl,
          canonicalUrl: entry.canonicalUrl,
          runtimeRelativePath: entry.runtimeRelativePath,
          fileType: entry.fileType,
          hitCount: entry.hitCount,
          lastUsedAtUtc: entry.lastUsedAtUtc,
          sourceKinds: entry.sourceKinds.slice(),
          contexts: entry.contexts.slice(),
          naturalWidth: entry.naturalWidth,
          naturalHeight: entry.naturalHeight,
          canvasRect: entry.canvasRect ? { ...entry.canvasRect } : null
        }));
    }

    function pointInsideRect(point, rect) {
      if (!rect) {
        return false;
      }
      return (
        point.x >= rect.x
        && point.x <= rect.x + rect.width
        && point.y >= rect.y
        && point.y <= rect.y + rect.height
      );
    }

    function selectTopAssetForPoint(point) {
      const entries = buildAssetUseEntries();
      if (entries.length === 0) {
        return null;
      }
      if (point) {
        const directMatch = entries.find((entry) => pointInsideRect(point, entry.canvasRect));
        if (directMatch) {
          return directMatch;
        }
      }
      return entries[0] ?? null;
    }

    function getCanvasPoint(canvas, clientX, clientY) {
      if (!canvas) {
        return null;
      }

      const rect = canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) {
        return null;
      }

      const internalWidth = Number.isFinite(canvas.width) ? Number(canvas.width) : rect.width;
      const internalHeight = Number.isFinite(canvas.height) ? Number(canvas.height) : rect.height;
      return {
        x: Math.round((clientX - rect.left) * (internalWidth / rect.width)),
        y: Math.round((clientY - rect.top) * (internalHeight / rect.height))
      };
    }

    function applyCanvasTransform(ctx, rect) {
      if (typeof ctx.getTransform !== "function") {
        return rect;
      }

      try {
        const matrix = ctx.getTransform();
        const points = [
          new DOMPoint(rect.x, rect.y).matrixTransform(matrix),
          new DOMPoint(rect.x + rect.width, rect.y).matrixTransform(matrix),
          new DOMPoint(rect.x, rect.y + rect.height).matrixTransform(matrix),
          new DOMPoint(rect.x + rect.width, rect.y + rect.height).matrixTransform(matrix)
        ];
        const xs = points.map((point) => point.x);
        const ys = points.map((point) => point.y);
        const minX = Math.min(...xs);
        const minY = Math.min(...ys);
        const maxX = Math.max(...xs);
        const maxY = Math.max(...ys);
        return {
          x: Math.round(minX),
          y: Math.round(minY),
          width: Math.round(maxX - minX),
          height: Math.round(maxY - minY)
        };
      } catch {
        return rect;
      }
    }

    function installCanvasInstrumentationForWindow(targetWindow) {
      const runtimeWindow = targetWindow.win;
      if (runtimeWindow.__MYIDE_RUNTIME_MAIN_WORLD_CANVAS_PATCHED__) {
        return;
      }
      runtimeWindow.__MYIDE_RUNTIME_MAIN_WORLD_CANVAS_PATCHED__ = true;

      const canvasConstructor = runtimeWindow.HTMLCanvasElement;
      const canvas2dConstructor = runtimeWindow.CanvasRenderingContext2D;
      if (!canvasConstructor || !canvas2dConstructor) {
        return;
      }

      const originalGetContext = canvasConstructor.prototype.getContext;
      canvasConstructor.prototype.getContext = function patchedGetContext(contextId, options) {
        const contextLabel = normalizeContextLabel(contextId);
        if (contextLabel.length > 0) {
          state.contextTypes.add(contextLabel);
        }
        return originalGetContext.call(this, contextId, options);
      };

      const originalDrawImage = canvas2dConstructor.prototype.drawImage;
      canvas2dConstructor.prototype.drawImage = function patchedDrawImage(image, ...rest) {
        const info = getImageLikeDescriptor(image, targetWindow.href);
        if (info) {
          let rect = null;
          if (rest.length === 2) {
            rect = {
              x: Math.round(rest[0]),
              y: Math.round(rest[1]),
              width: info.naturalWidth ?? 0,
              height: info.naturalHeight ?? 0
            };
          } else if (rest.length === 4) {
            rect = {
              x: Math.round(rest[0]),
              y: Math.round(rest[1]),
              width: Math.round(rest[2]),
              height: Math.round(rest[3])
            };
          } else if (rest.length >= 8) {
            rect = {
              x: Math.round(rest[4]),
              y: Math.round(rest[5]),
              width: Math.round(rest[6]),
              height: Math.round(rest[7])
            };
          }
          recordAssetUse(
            info,
            "canvas-2d-draw",
            `${targetWindow.label}:2d`,
            rect
              ? translateRect(applyCanvasTransform(this, rect), targetWindow.offsetX, targetWindow.offsetY)
              : null
          );
        }

        return Reflect.apply(originalDrawImage, this, [image, ...rest]);
      };
    }

    function getOrCreateTextureBindingState(context, contextLabel) {
      const existing = state.webglBindings.get(context);
      if (existing) {
        return existing;
      }

      const created = {
        activeTextureUnit: 0,
        boundTextures: new Map(),
        contextLabel
      };
      state.webglBindings.set(context, created);
      return created;
    }

    function installWebGlInstrumentationForPrototype(targetWindow, canvasConstructor, prototype, contextLabel, patchMarker) {
      if (prototype[patchMarker] === true) {
        return;
      }
      prototype[patchMarker] = true;

      const originalGetContext = canvasConstructor.prototype.getContext;
      canvasConstructor.prototype.getContext = function patchedGetContext(requestedContextId, options) {
        const context = originalGetContext.call(this, requestedContextId, options);
        const normalized = normalizeContextLabel(requestedContextId);
        if (
          context
          && (
            normalized === contextLabel
            || (contextLabel === "webgl" && normalized === "experimental-webgl")
          )
        ) {
          state.contextTypes.add(contextLabel);
          getOrCreateTextureBindingState(context, contextLabel);
        }
        return context;
      };

      const originalActiveTexture = prototype.activeTexture;
      prototype.activeTexture = function patchedActiveTexture(texture) {
        const bindingState = getOrCreateTextureBindingState(this, contextLabel);
        bindingState.activeTextureUnit = Number(texture) - Number(this.TEXTURE0);
        return Reflect.apply(originalActiveTexture, this, [texture]);
      };

      const originalBindTexture = prototype.bindTexture;
      prototype.bindTexture = function patchedBindTexture(target, texture) {
        const bindingState = getOrCreateTextureBindingState(this, contextLabel);
        if (target === this.TEXTURE_2D) {
          bindingState.boundTextures.set(bindingState.activeTextureUnit, texture);
        }
        return Reflect.apply(originalBindTexture, this, [target, texture]);
      };

      for (const methodName of ["texImage2D", "texSubImage2D"]) {
        const originalMethod = prototype[methodName];
        if (typeof originalMethod !== "function") {
          continue;
        }
        prototype[methodName] = function patchedTextureUpload(...args) {
          const bindingState = getOrCreateTextureBindingState(this, contextLabel);
          const boundTexture = bindingState.boundTextures.get(bindingState.activeTextureUnit) ?? null;
          if (boundTexture) {
            const sourceArgument = args.find((value) => getImageLikeDescriptor(value, targetWindow.href) !== null);
            const info = getImageLikeDescriptor(sourceArgument, targetWindow.href);
            if (info) {
              state.textureInfo.set(boundTexture, info);
              recordAssetUse(info, "webgl-texture-upload", `${targetWindow.label}:${contextLabel}`, null);
            }
          }

          return Reflect.apply(originalMethod, this, args);
        };
      }

      for (const methodName of ["drawArrays", "drawElements"]) {
        const originalMethod = prototype[methodName];
        if (typeof originalMethod !== "function") {
          continue;
        }
        prototype[methodName] = function patchedDraw(...args) {
          const bindingState = getOrCreateTextureBindingState(this, contextLabel);
          for (const texture of bindingState.boundTextures.values()) {
            if (!texture) {
              continue;
            }
            const info = state.textureInfo.get(texture);
            if (info) {
              recordAssetUse(info, "webgl-draw", `${targetWindow.label}:${contextLabel}`, null);
            }
          }

          return Reflect.apply(originalMethod, this, args);
        };
      }
    }

    function installWebGlInstrumentationForWindow(targetWindow) {
      const runtimeWindow = targetWindow.win;
      const canvasConstructor = runtimeWindow.HTMLCanvasElement;
      if (!canvasConstructor) {
        return;
      }

      if (typeof runtimeWindow.WebGLRenderingContext !== "undefined") {
        installWebGlInstrumentationForPrototype(
          targetWindow,
          canvasConstructor,
          runtimeWindow.WebGLRenderingContext.prototype,
          "webgl",
          "__MYIDE_RUNTIME_MAIN_WORLD_WEBGL_PATCHED__"
        );
      }

      if (typeof runtimeWindow.WebGL2RenderingContext !== "undefined") {
        installWebGlInstrumentationForPrototype(
          targetWindow,
          canvasConstructor,
          runtimeWindow.WebGL2RenderingContext.prototype,
          "webgl2",
          "__MYIDE_RUNTIME_MAIN_WORLD_WEBGL2_PATCHED__"
        );
      }
    }

    function installInspectableWindowInstrumentation() {
      for (const targetWindow of collectInspectableWindows()) {
        installCanvasInstrumentationForWindow(targetWindow);
        installWebGlInstrumentationForWindow(targetWindow);
      }
    }

    function safeWindowValue(targetWindow, key) {
      try {
        return targetWindow[key];
      } catch {
        return undefined;
      }
    }

    function summarizeTexture(texture, baseHref) {
      if (!isRecord(texture)) {
        return null;
      }

      const baseTexture = isRecord(texture.baseTexture) ? texture.baseTexture : null;
      const resource = baseTexture && isRecord(baseTexture.resource) ? baseTexture.resource : null;
      const frame = isRecord(texture.frame) ? texture.frame : null;
      const cacheIds = Array.isArray(texture.textureCacheIds) ? texture.textureCacheIds.filter(Boolean).map(String) : [];
      const resourceUrl = typeof resource?.url === "string"
        ? resource.url
        : typeof baseTexture?.imageUrl === "string"
          ? baseTexture.imageUrl
          : null;
      const resourceSourceUrl = resource && isRecord(resource.source)
        ? normalizeObservedUrl(resource.source.currentSrc ?? resource.source.src ?? null, baseHref)
        : null;

      return {
        cacheId: typeof cacheIds[0] === "string" ? cacheIds[0] : null,
        cacheIds,
        resourceUrl: resourceUrl ? getCanonicalResourceUrl(resourceUrl, baseHref) ?? resourceUrl : null,
        resourceSourceUrl,
        baseTextureUid: normalizeNumber(baseTexture?.uid),
        baseTextureUrl: typeof baseTexture?.imageUrl === "string"
          ? getCanonicalResourceUrl(baseTexture.imageUrl, baseHref) ?? baseTexture.imageUrl
          : null,
        frame: frame
          ? {
              x: normalizeNumber(frame.x) ?? 0,
              y: normalizeNumber(frame.y) ?? 0,
              width: normalizeNumber(frame.width) ?? 0,
              height: normalizeNumber(frame.height) ?? 0
            }
          : null
      };
    }

    function summarizeDisplayObject(displayObject, baseHref) {
      if (!isRecord(displayObject)) {
        return null;
      }

      const pathEntries = [];
      let current = displayObject;
      let depth = 0;
      while (isRecord(current) && depth < 6) {
        pathEntries.push({
          name: typeof current.name === "string" ? current.name : null,
          label: typeof current.label === "string" ? current.label : null,
          constructorName: current.constructor && isRecord(current.constructor) && typeof current.constructor.name === "string"
            ? current.constructor.name
            : null
        });
        current = isRecord(current.parent) ? current.parent : null;
        depth += 1;
      }

      return {
        id: typeof displayObject.id === "string" ? displayObject.id : null,
        name: typeof displayObject.name === "string" ? displayObject.name : null,
        label: typeof displayObject.label === "string" ? displayObject.label : null,
        constructorName: displayObject.constructor && isRecord(displayObject.constructor) && typeof displayObject.constructor.name === "string"
          ? displayObject.constructor.name
          : null,
        zIndex: typeof displayObject.zIndex === "number" && Number.isFinite(displayObject.zIndex)
          ? Number(displayObject.zIndex)
          : null,
        visible: displayObject.visible !== false,
        renderable: displayObject.renderable !== false,
        worldAlpha: typeof displayObject.worldAlpha === "number" && Number.isFinite(displayObject.worldAlpha)
          ? Number(displayObject.worldAlpha)
          : null,
        displayObjectPath: pathEntries,
        texture: summarizeTexture(displayObject.texture, baseHref)
      };
    }

    function isRuntimeCandidateObject(value) {
      return isRecord(value)
        && isRecord(value.stage)
        && isRecord(value.renderer);
    }

    function collectRuntimeCandidates() {
      const results = [];
      const visited = new WeakSet();
      const queue = collectInspectableWindows()
        .flatMap((targetWindow) => Object.getOwnPropertyNames(targetWindow.win)
          .slice(0, 256)
          .map((key) => ({
            key: `${targetWindow.label}.${key}`,
            value: safeWindowValue(targetWindow.win, key),
            depth: 0,
            windowTarget: targetWindow
          })));

      while (queue.length > 0 && results.length < 12) {
        const current = queue.shift();
        if (!current || !isRecord(current.value)) {
          continue;
        }
        if (visited.has(current.value)) {
          continue;
        }
        visited.add(current.value);

        if (isRuntimeCandidateObject(current.value)) {
          const renderer = isRecord(current.value.renderer) ? current.value.renderer : null;
          const view = renderer && isCanvasLike(renderer.view) ? renderer.view : null;
          const childCount = Array.isArray(current.value.stage.children)
            ? current.value.stage.children.length
            : null;
          results.push({
            key: current.key,
            object: current.value,
            windowTarget: current.windowTarget,
            summary: {
              key: current.key,
              childCount,
              viewWidth: view ? normalizeNumber(view.width) : null,
              viewHeight: view ? normalizeNumber(view.height) : null
            }
          });
          continue;
        }

        if (current.depth >= 2) {
          continue;
        }

        for (const childKey of Object.getOwnPropertyNames(current.value).slice(0, 24)) {
          let childValue;
          try {
            childValue = current.value[childKey];
          } catch {
            childValue = undefined;
          }
          if (!isRecord(childValue) || visited.has(childValue)) {
            continue;
          }
          queue.push({
            key: `${current.key}.${childKey}`,
            value: childValue,
            depth: current.depth + 1,
            windowTarget: current.windowTarget
          });
        }
      }

      results.sort((left, right) => (right.summary.childCount ?? 0) - (left.summary.childCount ?? 0));
      return results.slice(0, 8);
    }

    function getPixiHit(candidate, point) {
      if (!candidate || !point) {
        return null;
      }

      const renderer = isRecord(candidate.object.renderer) ? candidate.object.renderer : null;
      const interaction = renderer && isRecord(renderer.plugins) ? renderer.plugins.interaction : null;
      if (!interaction || typeof interaction.hitTest !== "function") {
        return null;
      }

      try {
        return interaction.hitTest(point, candidate.object.stage) ?? null;
      } catch {
        return null;
      }
    }

    function getTickerTarget() {
      for (const candidate of collectRuntimeCandidates()) {
        const ticker = candidate.object.ticker;
        if (isRuntimeTickerLike(ticker)) {
          return {
            label: candidate.summary.key,
            ticker
          };
        }
      }

      for (const targetWindow of collectInspectableWindows()) {
        const pixi = safeWindowValue(targetWindow.win, "PIXI");
        const sharedTicker = isRecord(pixi) && isRecord(pixi.Ticker) ? pixi.Ticker.shared : null;
        if (isRuntimeTickerLike(sharedTicker)) {
          return {
            label: `${targetWindow.label}.PIXI.Ticker.shared`,
            ticker: sharedTicker
          };
        }
      }

      return null;
    }

    function buildSupport() {
      const tickerTarget = getTickerTarget();
      const pauseResumeBlocked = tickerTarget ? null : "No exposed Pixi ticker or application handle is available in the live donor runtime.";
      const stepBlocked = tickerTarget && typeof tickerTarget.ticker.update === "function"
        ? null
        : "No stable ticker update hook is exposed for single-step runtime control.";
      return {
        pause: Boolean(tickerTarget),
        resume: Boolean(tickerTarget),
        step: Boolean(tickerTarget && typeof tickerTarget.ticker.update === "function"),
        blockers: {
          pause: pauseResumeBlocked,
          resume: pauseResumeBlocked,
          step: stepBlocked
        }
      };
    }

    function summarizeLoadedResources() {
      const entries = [];

      for (const targetWindow of collectInspectableWindows()) {
        try {
          const resourceEntries = targetWindow.win.performance.getEntriesByType("resource");
          for (const entry of resourceEntries) {
            const url = typeof entry.name === "string" ? entry.name : null;
            if (!url) {
              continue;
            }
            entries.push({
              url,
              canonicalUrl: getCanonicalResourceUrl(url, targetWindow.href),
              observedUrl: url,
              initiatorType: typeof entry.initiatorType === "string" ? entry.initiatorType : null,
              filename: url.split("?")[0].split("/").pop() ?? null,
              windowLabel: targetWindow.label
            });
          }
        } catch {
          // Resource timing reads are best-effort only.
        }
      }

      return entries
        .filter((entry) => Boolean(entry.url))
        .slice(0, 120);
    }

    function collectDisplayHits(displayObject, point, hits, depth, baseHref) {
      if (!isRecord(displayObject) || hits.length >= 12 || depth > 40) {
        return;
      }

      const children = Array.isArray(displayObject.children) ? displayObject.children : [];
      for (let index = children.length - 1; index >= 0; index -= 1) {
        collectDisplayHits(children[index], point, hits, depth + 1, baseHref);
      }

      if (displayObject.visible === false || typeof displayObject.getBounds !== "function") {
        return;
      }

      try {
        const boundsValue = displayObject.getBounds();
        if (!isRecord(boundsValue)) {
          return;
        }
        const bounds = {
          x: normalizeNumber(boundsValue.x) ?? 0,
          y: normalizeNumber(boundsValue.y) ?? 0,
          width: normalizeNumber(boundsValue.width) ?? 0,
          height: normalizeNumber(boundsValue.height) ?? 0
        };
        if (
          point.x >= bounds.x
          && point.x <= bounds.x + bounds.width
          && point.y >= bounds.y
          && point.y <= bounds.y + bounds.height
        ) {
          hits.push({
            ...(summarizeDisplayObject(displayObject, baseHref) ?? {
              id: null,
              name: null,
              label: null,
              constructorName: null,
              zIndex: null,
              texture: null
            }),
            bounds
          });
        }
      } catch {
        // Display-object bounds checks are best-effort only.
      }
    }

    function getEngineKind(candidateApps, inspectableWindows, totalCanvasCount) {
      const contextTypes = Array.from(state.contextTypes.values()).sort();
      for (const targetWindow of inspectableWindows) {
        const pixi = safeWindowValue(targetWindow.win, "PIXI");
        if (isRecord(pixi) && typeof pixi.VERSION === "string") {
          return {
            kind: "pixi-global",
            note: `${targetWindow.label} exposes window.PIXI with version ${pixi.VERSION}.`,
            pixiVersion: pixi.VERSION
          };
        }
      }
      if (candidateApps.length > 0) {
        return {
          kind: "pixi-handle-scan",
          note: `A stage/renderer candidate is exposed through ${candidateApps[0].summary.key}.`,
          pixiVersion: null
        };
      }
      if (typeof window.Phaser === "object" && window.Phaser) {
        return {
          kind: "phaser-global",
          note: "window.Phaser is exposed in the main world, but no stable app/stage handle was surfaced yet.",
          pixiVersion: null
        };
      }
      if (contextTypes.some((entry) => entry.startsWith("webgl"))) {
        return {
          kind: "bundled-webgl-runtime",
          note: "The donor runtime requested a WebGL context in main world, but no stable global app handle is exposed.",
          pixiVersion: null
        };
      }
      if (contextTypes.includes("2d")) {
        return {
          kind: "canvas-2d-runtime",
          note: "The donor runtime requested a 2D canvas context in main world, but no stable global app handle is exposed.",
          pixiVersion: null
        };
      }
      if (totalCanvasCount > 0) {
        return {
          kind: "canvas-runtime-in-main-world",
          note: `The donor runtime exposes ${totalCanvasCount} canvas surface${totalCanvasCount === 1 ? "" : "s"} in main world, but no stable app handle is exposed.`,
          pixiVersion: null
        };
      }
      return {
        kind: "dom-only-or-hidden-runtime",
        note: "Main-world inspection did not expose a stable canvas/WebGL runtime handle yet.",
        pixiVersion: null
      };
    }

    function buildStatus() {
      const candidateApps = collectRuntimeCandidates();
      const inspectableWindows = collectInspectableWindows();
      const totalCanvasCount = inspectableWindows.reduce((count, targetWindow) => {
        try {
          return count + targetWindow.win.document.querySelectorAll("canvas").length;
        } catch {
          return count;
        }
      }, 0);
      const engine = getEngineKind(candidateApps, inspectableWindows, totalCanvasCount);
      return {
        href: window.location.href,
        title: document.title || null,
        bridgeSource: "main-world-execute-js",
        bridgeVersion: "runtime-main-world-v1",
        frameCount: Math.max(0, inspectableWindows.length - 1),
        accessibleFrameCount: Math.max(0, inspectableWindows.length - 1),
        canvasCount: totalCanvasCount,
        pixiDetected: engine.kind === "pixi-global" || candidateApps.length > 0,
        pixiVersion: engine.pixiVersion,
        candidateApps: candidateApps.map((candidate) => candidate.summary),
        inspectEnabled: state.inspectEnabled,
        paused: state.paused,
        support: buildSupport(),
        resourceEntries: summarizeLoadedResources(),
        assetUseEntries: buildAssetUseEntries(),
        contextTypes: Array.from(state.contextTypes.values()).sort(),
        engineKind: engine.kind,
        engineNote: engine.note
      };
    }

    function setInspectEnabled(flag) {
      state.inspectEnabled = Boolean(flag);
      emit("inspect", { enabled: state.inspectEnabled });
      return { enabled: state.inspectEnabled };
    }

    function pause() {
      const target = getTickerTarget();
      if (!target) {
        return { ok: false, blocked: buildSupport().blockers.pause };
      }
      try {
        target.ticker.stop();
        state.paused = true;
        emit("control", { action: "pause", ok: true, label: target.label });
        return { ok: true, label: target.label };
      } catch (error) {
        return { ok: false, blocked: error instanceof Error ? error.message : String(error) };
      }
    }

    function resume() {
      const target = getTickerTarget();
      if (!target) {
        return { ok: false, blocked: buildSupport().blockers.resume };
      }
      try {
        target.ticker.start();
        state.paused = false;
        emit("control", { action: "resume", ok: true, label: target.label });
        return { ok: true, label: target.label };
      } catch (error) {
        return { ok: false, blocked: error instanceof Error ? error.message : String(error) };
      }
    }

    function step() {
      const target = getTickerTarget();
      if (!target || typeof target.ticker.update !== "function") {
        return { ok: false, blocked: buildSupport().blockers.step };
      }
      try {
        target.ticker.update(performance.now());
        emit("control", { action: "step", ok: true, label: target.label });
        return { ok: true, label: target.label };
      } catch (error) {
        return { ok: false, blocked: error instanceof Error ? error.message : String(error) };
      }
    }

    function pickAtPoint(clientX, clientY) {
      const inspectableWindows = collectInspectableWindows().sort((left, right) => right.depth - left.depth);
      const pickedWindowTarget = inspectableWindows.find((targetWindow) => {
        if (targetWindow.label === "top") {
          return true;
        }
        try {
          const localX = clientX - targetWindow.offsetX;
          const localY = clientY - targetWindow.offsetY;
          return (
            localX >= 0
            && localY >= 0
            && localX <= targetWindow.win.innerWidth
            && localY <= targetWindow.win.innerHeight
          );
        } catch {
          return false;
        }
      }) ?? inspectableWindows[inspectableWindows.length - 1] ?? {
        win: window,
        label: "top",
        href: safeLocationHref(window),
        title: safeDocumentTitle(window),
        depth: 0,
        offsetX: 0,
        offsetY: 0
      };

      const localClientX = Math.round(clientX - pickedWindowTarget.offsetX);
      const localClientY = Math.round(clientY - pickedWindowTarget.offsetY);
      let target = null;
      try {
        target = pickedWindowTarget.win.document.elementFromPoint(localClientX, localClientY);
      } catch {
        target = null;
      }
      if (!target && pickedWindowTarget.label !== "top") {
        target = document.elementFromPoint(clientX, clientY);
      }

      const canvasElement = target && typeof target.closest === "function"
        ? target.closest("canvas")
        : null;
      const canvas = canvasElement ?? (isCanvasLike(target) ? target : null);
      const canvasPoint = canvas ? getCanvasPoint(canvas, localClientX, localClientY) : null;
      const candidates = collectRuntimeCandidates();
      const candidateForWindow = candidates.find((candidate) => candidate.windowTarget.label === pickedWindowTarget.label)
        ?? candidates[0]
        ?? null;
      const displayHits = [];

      if (canvasPoint && candidateForWindow) {
        const pixiHit = getPixiHit(candidateForWindow, canvasPoint);
        if (pixiHit) {
          let hitBounds = null;
          try {
            if (typeof pixiHit.getBounds === "function") {
              const bounds = pixiHit.getBounds();
              hitBounds = isRecord(bounds)
                ? {
                    x: normalizeNumber(bounds.x) ?? 0,
                    y: normalizeNumber(bounds.y) ?? 0,
                    width: normalizeNumber(bounds.width) ?? 0,
                    height: normalizeNumber(bounds.height) ?? 0
                  }
                : null;
            }
          } catch {
            hitBounds = null;
          }
          displayHits.push({
            ...(summarizeDisplayObject(pixiHit, pickedWindowTarget.href) ?? {
              id: null,
              name: null,
              label: null,
              constructorName: null,
              zIndex: null,
              texture: null
            }),
            bounds: hitBounds
          });
        }
        if (displayHits.length === 0) {
          collectDisplayHits(candidateForWindow.object.stage, canvasPoint, displayHits, 0, pickedWindowTarget.href);
        }
      }

      const topRuntimeAsset = selectTopAssetForPoint({ x: clientX, y: clientY });
      const status = buildStatus();
      const payload = {
        ...status,
        clientX: Math.round(clientX),
        clientY: Math.round(clientY),
        targetTag: target && target.tagName ? String(target.tagName).toLowerCase() : null,
        targetId: target instanceof HTMLElement && typeof target.id === "string" && target.id.length > 0 ? target.id : null,
        targetClassName: target instanceof HTMLElement && typeof target.className === "string" ? target.className : null,
        canvasDetected: Boolean(canvas),
        canvasPoint,
        canvasSize: canvas ? {
          width: normalizeNumber(canvas.width),
          height: normalizeNumber(canvas.height)
        } : null,
        topDisplayObject: displayHits[0] ?? null,
        displayHitCount: displayHits.length,
        topRuntimeAsset
      };

      state.lastPick = payload;
      emit("pick", payload);
      return payload;
    }

    function installInspectPointerListener() {
      if (window.__MYIDE_RUNTIME_MAIN_WORLD_POINTER_LISTENER__) {
        return;
      }
      window.__MYIDE_RUNTIME_MAIN_WORLD_POINTER_LISTENER__ = true;

      window.addEventListener("pointerdown", (event) => {
        if (!state.inspectEnabled) {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        pickAtPoint(event.clientX, event.clientY);
      }, true);
    }

    function installDomAssetScanner() {
      if (typeof window.__MYIDE_RUNTIME_MAIN_WORLD_DOM_SCAN__ === "number") {
        return;
      }

      const runScan = () => {
        try {
          installInspectableWindowInstrumentation();
          scanDomAssetUse();
        } catch {
          // DOM asset scan remains best-effort only.
        }
      };

      runScan();
      window.addEventListener("load", runScan, { once: true });
      window.__MYIDE_RUNTIME_MAIN_WORLD_DOM_SCAN__ = window.setInterval(runScan, 750);

      const attachObserver = () => {
        if (window.__MYIDE_RUNTIME_MAIN_WORLD_DOM_OBSERVER_READY__) {
          return;
        }
        const root = document.documentElement;
        if (!(root instanceof HTMLElement)) {
          return;
        }
        const observer = new MutationObserver(() => runScan());
        observer.observe(root, {
          subtree: true,
          childList: true,
          attributes: true,
          attributeFilter: ["class", "style", "src"]
        });
        window.__MYIDE_RUNTIME_MAIN_WORLD_DOM_MUTATION__ = observer;
        window.__MYIDE_RUNTIME_MAIN_WORLD_DOM_OBSERVER_READY__ = true;
      };

      attachObserver();
      if (!window.__MYIDE_RUNTIME_MAIN_WORLD_DOM_OBSERVER_READY__) {
        window.addEventListener("DOMContentLoaded", attachObserver, { once: true });
      }
    }

    const bridge = {
      getStatus: () => buildStatus(),
      setInspectEnabled: (flag) => setInspectEnabled(flag),
      pickAtPoint: (clientX, clientY) => pickAtPoint(clientX, clientY),
      pause: () => pause(),
      resume: () => resume(),
      step: () => step()
    };

    window.__MYIDE_RUNTIME_MAIN_WORLD_BRIDGE__ = bridge;
    installInspectableWindowInstrumentation();
    installInspectPointerListener();
    installDomAssetScanner();

    const status = bridge.getStatus();
    emit("ready", status);
    return status;
  }

  return `(${installRuntimeMainWorldBridge.toString()})();`;
}

function recordRuntimeConsoleEvent(entry) {
  state.runtimeUi.lastConsoleEvents = [
    entry,
    ...state.runtimeUi.lastConsoleEvents
  ].slice(0, 8);
}

function applyRuntimeBridgeStatus(status) {
  state.runtimeUi.ready = true;
  state.runtimeUi.diagnostics = status;
  state.runtimeUi.currentUrl = typeof status?.href === "string" ? status.href : state.runtimeUi.currentUrl;
  state.runtimeUi.pageTitle = typeof status?.title === "string" ? status.title : state.runtimeUi.pageTitle;
  const support = status?.support ?? {};
  state.runtimeUi.controlSupport = {
    pause: Boolean(support.pause),
    resume: Boolean(support.resume),
    step: Boolean(support.step)
  };
  state.runtimeUi.controlBlockers = {
    ...state.runtimeUi.controlBlockers,
    ...(support.blockers && typeof support.blockers === "object" ? support.blockers : {})
  };
}

function handleRuntimeConsoleMessage(message) {
  if (typeof message !== "string" || !message.startsWith(runtimeConsolePrefix)) {
    return false;
  }

  const rawPayload = message.slice(runtimeConsolePrefix.length);
  let payload = null;
  try {
    payload = JSON.parse(rawPayload);
  } catch {
    return false;
  }

  recordRuntimeConsoleEvent(payload);

  if (payload.type === "ready") {
    applyRuntimeBridgeStatus(payload);
    renderAll();
    setPreviewStatus("Runtime bridge attached. Use Pick / Inspect to capture the strongest grounded live trace.");
    return true;
  }

  if (payload.type === "inspect") {
    state.runtimeUi.inspectEnabled = Boolean(payload.enabled);
    renderAll();
    return true;
  }

  if (payload.type === "pick") {
    state.runtimeUi.lastPick = payload;
    applyRuntimeBridgeStatus({
      ...state.runtimeUi.diagnostics,
      href: payload.href ?? state.runtimeUi.currentUrl,
      title: payload.title ?? state.runtimeUi.pageTitle,
      support: state.runtimeUi.diagnostics?.support ?? null
    });
    void refreshRuntimeResourceMap({ silent: true });
    renderAll();
    const targetSummary = payload.topDisplayObject?.name
      ?? payload.topDisplayObject?.label
      ?? payload.targetTag
      ?? "runtime target";
    setPreviewStatus(`Picked ${targetSummary} in Runtime Mode. The inspector now shows the strongest grounded source trace available.`);
    return true;
  }

  if (payload.type === "control") {
    state.runtimeUi.lastCommandStatus = payload;
    state.runtimeUi.lastCommand = payload.action ?? null;
    if (payload.ok === false && payload.blocked) {
      state.runtimeUi.controlBlockers[payload.action] = payload.blocked;
      setPreviewStatus(payload.blocked);
    } else if (payload.action) {
      setPreviewStatus(`Runtime ${payload.action} executed through ${payload.label ?? "the embedded runtime hook"}.`);
    }
    renderAll();
    return true;
  }

  if (payload.type === "error" && payload.error) {
    state.runtimeUi.lastError = String(payload.error);
    renderAll();
    return true;
  }

  return true;
}

async function installRuntimeBridge() {
  const status = await callRuntimeBridge("getStatus");
  if (status && typeof status === "object" && !Array.isArray(status) && !status.blocked) {
    applyRuntimeBridgeStatus(status);
    renderAll();
    return status;
  }

  if (status?.blocked) {
    state.runtimeUi.lastError = String(status.blocked);
    renderAll();
  }
  return null;
}

async function callRuntimeBridge(method, ...args) {
  const webview = getRuntimeWebview();
  if (!webview) {
    return { ok: false, blocked: "The Runtime Mode webview is not available in this renderer session." };
  }

  const serializedMethod = JSON.stringify(String(method));
  const serializedArgs = JSON.stringify(args);
  try {
    return await webview.executeJavaScript(`${buildRuntimeGuestBridgeScript()}; (() => {
      const bridge = window.__MYIDE_RUNTIME_MAIN_WORLD_BRIDGE__ || window.__MYIDE_RUNTIME_BRIDGE__;
      if (!bridge || typeof bridge[${serializedMethod}] !== "function") {
        return { ok: false, blocked: "Runtime bridge is not ready yet." };
      }
      return bridge[${serializedMethod}](...${serializedArgs});
    })()`, true);
  } catch (error) {
    return {
      ok: false,
      blocked: error instanceof Error ? error.message : String(error)
    };
  }
}

async function refreshRuntimeDiagnostics() {
  const result = await callRuntimeBridge("getStatus");
  if (result && typeof result === "object" && !Array.isArray(result)) {
    applyRuntimeBridgeStatus(result);
    await refreshRuntimeResourceMap({ silent: true });
    renderAll();
  }
}

async function setRuntimeRequestStage(stage) {
  const api = window.myideApi;
  if (!api || typeof api.setRuntimeRequestStage !== "function") {
    return null;
  }

  try {
    return await api.setRuntimeRequestStage(stage);
  } catch {
    return null;
  }
}

async function clearRuntimeCache(options = {}) {
  const api = window.myideApi;
  if (!api || typeof api.clearRuntimeCache !== "function") {
    return null;
  }

  try {
    return await api.clearRuntimeCache();
  } catch (error) {
    if (!options.silent) {
      setPreviewStatus(error instanceof Error ? error.message : "Runtime cache clear failed.");
    }
    return null;
  }
}

function setRuntimeLaunched(launched) {
  state.runtimeUi.launched = Boolean(launched);
  state.runtimeUi.loading = Boolean(launched);
  state.runtimeUi.ready = false;
  state.runtimeUi.lastError = null;
  state.runtimeUi.lastPick = null;
  state.runtimeUi.currentUrl = launched ? getRuntimeLaunchInfo()?.entryUrl ?? null : null;
  state.runtimeUi.pageTitle = null;
  state.runtimeUi.diagnostics = null;
}

async function handleRuntimeLaunch() {
  const runtimeLaunch = getRuntimeLaunchInfo();
  const webview = getRuntimeWebview();
  if (!runtimeLaunch?.entryUrl || !webview) {
    setPreviewStatus(runtimeLaunch?.blocker ?? "Runtime Mode is blocked because no grounded donor runtime entry is indexed.");
    return false;
  }

  await clearRuntimeCache({ silent: true });
  await setRuntimeRequestStage("launch");
  await resetRuntimeResourceMapForCurrentProject({ silent: true });
  setRuntimeLaunched(true);
  renderAll();
  setPreviewStatus(runtimeLaunch.localRuntimePackageAvailable
    ? "Launching the grounded local Mystery Garden runtime mirror inside Runtime Mode."
    : "Launching the recorded donor runtime entry inside Runtime Mode.");
  webview.src = runtimeLaunch.entryUrl;
  return true;
}

async function handleRuntimeReload() {
  const webview = getRuntimeWebview();
  if (!webview || !state.runtimeUi.launched) {
    return handleRuntimeLaunch();
  }

  await clearRuntimeCache({ silent: true });
  await setRuntimeRequestStage("reload");
  await resetRuntimeResourceMapForCurrentProject({ silent: true });
  state.runtimeUi.loading = true;
  state.runtimeUi.ready = false;
  state.runtimeUi.lastError = null;
  renderAll();
  if (typeof webview.reloadIgnoringCache === "function") {
    webview.reloadIgnoringCache();
  } else {
    webview.reload();
  }
  setPreviewStatus(getRuntimeOverrideStatus()?.entryCount
    ? "Reloading the embedded donor runtime with the current project-local override set."
    : "Reloading the embedded donor runtime.");
  return true;
}

function getRuntimeWebviewCenterPoint() {
  const webview = getRuntimeWebview();
  if (!webview || typeof webview.getBoundingClientRect !== "function") {
    return null;
  }

  const rect = webview.getBoundingClientRect();
  if (!rect || rect.width <= 0 || rect.height <= 0) {
    return null;
  }

  return {
    x: Math.round(rect.width / 2),
    y: Math.round(rect.height / 2)
  };
}

async function sendRuntimePointerClick() {
  const webview = getRuntimeWebview();
  const center = getRuntimeWebviewCenterPoint();
  if (!webview || !center || typeof webview.sendInputEvent !== "function") {
    return {
      ok: false,
      blocked: "The embedded runtime does not expose a usable input surface for a real click-to-start action in this shell."
    };
  }

  webview.focus();
  webview.sendInputEvent({ type: "mouseMove", x: center.x, y: center.y });
  webview.sendInputEvent({ type: "mouseDown", x: center.x, y: center.y, button: "left", clickCount: 1 });
  webview.sendInputEvent({ type: "mouseUp", x: center.x, y: center.y, button: "left", clickCount: 1 });
  return {
    ok: true,
    detail: `Sent a centered real click at ${center.x},${center.y} to the embedded donor runtime.`
  };
}

async function sendRuntimeSpaceKey() {
  const webview = getRuntimeWebview();
  if (!webview || typeof webview.sendInputEvent !== "function") {
    return {
      ok: false,
      blocked: "The embedded runtime does not expose a usable input surface for an observed Space-key trigger in this shell."
    };
  }

  webview.focus();
  webview.sendInputEvent({ type: "keyDown", keyCode: "Space" });
  webview.sendInputEvent({ type: "char", keyCode: " " });
  webview.sendInputEvent({ type: "keyUp", keyCode: "Space" });
  return {
    ok: true,
    detail: "Sent the observed Space-key trigger into the embedded donor runtime. Spin confirmation is still limited to best-effort status in this slice."
  };
}

async function refreshRuntimeOverrideStatus(options = {}) {
  const api = window.myideApi;
  if (!api || typeof api.getRuntimeOverrideStatus !== "function" || !state.selectedProjectId) {
    return state.runtimeUi.overrideStatus ?? state.bundle?.runtimeOverrides ?? null;
  }

  try {
    const status = await api.getRuntimeOverrideStatus(state.selectedProjectId);
    state.runtimeUi.overrideStatus = status ?? null;
    if (state.bundle) {
      state.bundle.runtimeOverrides = status ?? null;
    }
    if (!options.silent) {
      renderAll();
    }
    return status ?? null;
  } catch (error) {
    if (!options.silent) {
      setPreviewStatus(error instanceof Error ? error.message : "Runtime override status refresh failed.");
    }
    return state.runtimeUi.overrideStatus ?? state.bundle?.runtimeOverrides ?? null;
  }
}

async function refreshRuntimeResourceMap(options = {}) {
  const api = window.myideApi;
  if (!api || typeof api.getRuntimeResourceMap !== "function" || !state.selectedProjectId) {
    return state.runtimeUi.resourceMap ?? state.bundle?.runtimeResourceMap ?? null;
  }

  try {
    const resourceMap = await api.getRuntimeResourceMap(state.selectedProjectId);
    state.runtimeUi.resourceMap = resourceMap ?? null;
    if (state.bundle) {
      state.bundle.runtimeResourceMap = resourceMap ?? null;
    }
    if (!options.silent) {
      renderAll();
    }
    return resourceMap ?? null;
  } catch (error) {
    if (!options.silent) {
      setPreviewStatus(error instanceof Error ? error.message : "Runtime resource map refresh failed.");
    }
    return state.runtimeUi.resourceMap ?? state.bundle?.runtimeResourceMap ?? null;
  }
}

async function resetRuntimeResourceMapForCurrentProject(options = {}) {
  const api = window.myideApi;
  if (!api || typeof api.resetRuntimeResourceMap !== "function" || !state.selectedProjectId) {
    return state.runtimeUi.resourceMap ?? state.bundle?.runtimeResourceMap ?? null;
  }

  try {
    const resourceMap = await api.resetRuntimeResourceMap(state.selectedProjectId);
    state.runtimeUi.resourceMap = resourceMap ?? null;
    if (state.bundle) {
      state.bundle.runtimeResourceMap = resourceMap ?? null;
    }
    if (!options.silent) {
      renderAll();
    }
    return resourceMap ?? null;
  } catch (error) {
    if (!options.silent) {
      setPreviewStatus(error instanceof Error ? error.message : "Runtime resource map reset failed.");
    }
    return state.runtimeUi.resourceMap ?? state.bundle?.runtimeResourceMap ?? null;
  }
}

async function createRuntimeOverrideFromCurrentBridge() {
  const candidate = getRuntimeOverrideCandidate();
  if (!candidate.eligible || !candidate.runtimeSourceUrl || !candidate.donorAsset) {
    setPreviewStatus(candidate.note);
    return;
  }

  const api = window.myideApi;
  if (!api || typeof api.createRuntimeOverride !== "function") {
    setPreviewStatus("Runtime override creation is not available in this renderer session.");
    return;
  }

  const status = await api.createRuntimeOverride(
    state.selectedProjectId,
    candidate.runtimeSourceUrl,
    candidate.donorAsset.assetId
  );
  state.runtimeUi.overrideStatus = status ?? null;
  if (state.bundle) {
    state.bundle.runtimeOverrides = status ?? null;
  }
  renderAll();
  setPreviewStatus(`Created a project-local runtime override for ${candidate.runtimeRelativePath ?? candidate.runtimeSourceUrl} from donor asset ${candidate.donorAsset.assetId}. Reloading the embedded runtime now; use Debug Host again when you want the strongest override-hit confirmation.`);
  if (state.runtimeUi.launched) {
    await handleRuntimeReload();
  }
}

async function createRuntimeOverrideForSource(sourceUrl, options = {}) {
  const canonicalSourceUrl = typeof sourceUrl === "string" && sourceUrl.length > 0
    ? (getRuntimeCanonicalSourceUrl(sourceUrl) ?? sourceUrl)
    : null;
  if (!canonicalSourceUrl) {
    setPreviewStatus("No grounded runtime source is available for this grouped runtime override.");
    return;
  }

  setRuntimeWorkbenchSource(canonicalSourceUrl, { render: false });
  const candidate = getRuntimeOverrideCandidate({
    sourceUrl: canonicalSourceUrl,
    donorAsset: options.donorAsset
  });
  if (!candidate.eligible || !candidate.runtimeSourceUrl || !candidate.donorAsset) {
    renderAll();
    setPreviewStatus(candidate.note);
    return;
  }

  const api = window.myideApi;
  if (!api || typeof api.createRuntimeOverride !== "function") {
    renderAll();
    setPreviewStatus("Runtime override creation is not available in this renderer session.");
    return;
  }

  const status = await api.createRuntimeOverride(
    state.selectedProjectId,
    candidate.runtimeSourceUrl,
    candidate.donorAsset.assetId
  );
  state.runtimeUi.overrideStatus = status ?? null;
  if (state.bundle) {
    state.bundle.runtimeOverrides = status ?? null;
  }
  renderAll();
  setPreviewStatus(options.statusMessage
    ?? `Created a project-local runtime override for ${candidate.runtimeRelativePath ?? candidate.runtimeSourceUrl} from donor asset ${candidate.donorAsset.assetId}. Reloading the embedded runtime now; use Debug Host again when you want the strongest override-hit confirmation.`);
  if (state.runtimeUi.launched) {
    await handleRuntimeReload();
  }
}

async function clearRuntimeOverrideForCurrentCandidate() {
  const candidate = getRuntimeOverrideCandidate();
  if (!candidate.runtimeSourceUrl) {
    setPreviewStatus("No grounded runtime override target is selected in the current runtime trace.");
    return;
  }

  const api = window.myideApi;
  if (!api || typeof api.clearRuntimeOverride !== "function") {
    setPreviewStatus("Runtime override removal is not available in this renderer session.");
    return;
  }

  const status = await api.clearRuntimeOverride(state.selectedProjectId, candidate.runtimeSourceUrl);
  state.runtimeUi.overrideStatus = status ?? null;
  if (state.bundle) {
    state.bundle.runtimeOverrides = status ?? null;
  }
  renderAll();
  setPreviewStatus(`Cleared the project-local runtime override for ${candidate.runtimeRelativePath ?? candidate.runtimeSourceUrl}. Reloading the embedded runtime now; re-open Debug Host if you want to confirm the clean runtime path again.`);
  if (state.runtimeUi.launched) {
    await handleRuntimeReload();
  }
}

async function clearRuntimeOverrideForSource(sourceUrl, options = {}) {
  const canonicalSourceUrl = typeof sourceUrl === "string" && sourceUrl.length > 0
    ? (getRuntimeCanonicalSourceUrl(sourceUrl) ?? sourceUrl)
    : null;
  if (!canonicalSourceUrl) {
    setPreviewStatus("No grounded runtime override target is available for this grouped runtime source.");
    return;
  }

  setRuntimeWorkbenchSource(canonicalSourceUrl, { render: false });
  const candidate = getRuntimeOverrideCandidate({
    sourceUrl: canonicalSourceUrl,
    donorAsset: options.donorAsset
  });
  if (!candidate.runtimeSourceUrl) {
    renderAll();
    setPreviewStatus("No grounded runtime override target is selected for this grouped runtime source.");
    return;
  }

  const api = window.myideApi;
  if (!api || typeof api.clearRuntimeOverride !== "function") {
    renderAll();
    setPreviewStatus("Runtime override removal is not available in this renderer session.");
    return;
  }

  const status = await api.clearRuntimeOverride(state.selectedProjectId, candidate.runtimeSourceUrl);
  state.runtimeUi.overrideStatus = status ?? null;
  if (state.bundle) {
    state.bundle.runtimeOverrides = status ?? null;
  }
  renderAll();
  setPreviewStatus(options.statusMessage
    ?? `Cleared the project-local runtime override for ${candidate.runtimeRelativePath ?? candidate.runtimeSourceUrl}. Reloading the embedded runtime now; re-open Debug Host if you want to confirm the clean runtime path again.`);
  if (state.runtimeUi.launched) {
    await handleRuntimeReload();
  }
}

async function openRuntimeDebugHostWindow(options = {}) {
  const switchToRuntime = options?.switchToRuntime === true;
  const proofMode = options?.proofMode === true;
  const profileId = typeof options?.profileId === "string" && options.profileId.trim().length > 0
    ? options.profileId.trim()
    : null;
  const candidateHintTokens = Array.isArray(options?.candidateHintTokens)
    ? uniqueStrings(options.candidateHintTokens.filter((value) => typeof value === "string" && value.trim().length > 0))
    : [];
  const statusPrefix = typeof options?.statusPrefix === "string" && options.statusPrefix.trim().length > 0
    ? options.statusPrefix.trim()
    : null;
  const api = window.myideApi;
  if (!api || typeof api.openRuntimeDebugHost !== "function") {
    setPreviewStatus("Runtime Debug Host is not available in this renderer session.");
    return null;
  }

  const result = await api.openRuntimeDebugHost(
    proofMode || profileId || candidateHintTokens.length > 0
      ? {
          proofMode,
          profileId,
          candidateHintTokens
        }
      : undefined
  );
  state.runtimeUi.debugHost = result ?? null;
  await refreshRuntimeResourceMap({ silent: true });
  if (typeof result?.candidateRuntimeSourceUrl === "string" && result.candidateRuntimeSourceUrl.length > 0) {
    state.runtimeUi.workbenchSourceUrl = getRuntimeCanonicalSourceUrl(result.candidateRuntimeSourceUrl) ?? result.candidateRuntimeSourceUrl;
  }
  if (switchToRuntime) {
    setWorkbenchMode("runtime", { silent: true });
    state.workflowUi.activePanel = "runtime";
  }
  renderAll();

  const runtimeSourceLabel = typeof result?.runtimeSourceLabel === "string" ? result.runtimeSourceLabel : "runtime source unknown";
  const candidatePath = result?.candidateRuntimeRelativePath ?? result?.candidateRuntimeSourceUrl ?? "no request-backed static image candidate";
  const hitCount = Number(result?.overrideHitCountAfterReload ?? 0);
  const error = typeof result?.error === "string" ? result.error : null;
  const prefix = statusPrefix ? `${statusPrefix}. ` : "";

  if (error) {
    setPreviewStatus(`${prefix}Opened Runtime Debug Host on ${runtimeSourceLabel}, but it reported: ${error}`);
    return result ?? null;
  }

  setPreviewStatus(`${prefix}Opened Runtime Debug Host on ${runtimeSourceLabel}. Candidate ${candidatePath} recorded ${hitCount} override hit${hitCount === 1 ? "" : "s"} after reload.`);
  return result ?? null;
}

async function runDonorScanCapture(limit = 5, family = null, mode = "ranked-targets") {
  const api = window.myideApi;
  const selectedProject = getSelectedProject();
  const donorId = typeof selectedProject?.donor?.donorId === "string" ? selectedProject.donor.donorId : "";
  if (!api || typeof api.runDonorScanCapture !== "function" || !donorId) {
    setPreviewStatus("Guided donor capture is not available in this renderer session.");
    return;
  }

  const familyLabel = typeof family === "string" && family.trim().length > 0 ? family.trim() : null;
  const requestedMode = mode === "family-sources" ? "family-sources" : "ranked-targets";
  setPreviewStatus(
    requestedMode === "family-sources"
      ? `Running donor family source capture${familyLabel ? ` for ${familyLabel}` : ""} across up to ${limit} grounded source candidate${limit === 1 ? "" : "s"}...`
      : familyLabel
        ? `Running guided donor capture for family ${familyLabel} across up to ${limit} ranked target${limit === 1 ? "" : "s"}...`
        : `Running guided donor capture for the top ${limit} ranked missing target${limit === 1 ? "" : "s"}...`
  );
  try {
    const result = await api.runDonorScanCapture(donorId, limit, familyLabel ?? undefined, requestedMode);
    await reloadWorkspace(false, state.selectedProjectId);

    const status = typeof result?.status === "string" ? result.status : "blocked";
    const attemptedCount = Number(result?.attemptedCount ?? 0);
    const downloadedCount = Number(result?.downloadedCount ?? 0);
    const failedCount = Number(result?.failedCount ?? 0);
    const targetCountAfter = Number(result?.targetCountAfter ?? 0);
    const resultMode = typeof result?.requestedMode === "string" ? result.requestedMode : requestedMode;
    const requestedFamily = typeof result?.requestedFamily === "string" ? result.requestedFamily : familyLabel;
    const familyTargetCountBefore = Number(result?.familyTargetCountBefore ?? 0);
    const familySourceCandidateCountBefore = Number(result?.familySourceCandidateCountBefore ?? 0);
    const nextOperatorAction = typeof result?.nextOperatorAction === "string" ? result.nextOperatorAction : "Review the refreshed donor scan summary.";

    setPreviewStatus(
      `${requestedFamily ? `Family ${requestedFamily}: ` : ""}${resultMode === "family-sources" ? "family source capture" : "guided donor capture"} ${status}. Downloaded ${downloadedCount} of ${attemptedCount} attempted ${resultMode === "family-sources" ? "source candidate" : "target"}${attemptedCount === 1 ? "" : "s"}`
      + `${failedCount > 0 ? ` with ${failedCount} failure${failedCount === 1 ? "" : "s"}` : ""}. `
      + `${requestedFamily && resultMode === "family-sources" && familySourceCandidateCountBefore > 0 ? `${familySourceCandidateCountBefore} grounded source candidate${familySourceCandidateCountBefore === 1 ? "" : "s"} matched that family before the run. ` : ""}`
      + `${requestedFamily && resultMode !== "family-sources" && familyTargetCountBefore > 0 ? `${familyTargetCountBefore} target${familyTargetCountBefore === 1 ? "" : "s"} matched that family before the run. ` : ""}`
      + `${targetCountAfter} ranked target${targetCountAfter === 1 ? "" : "s"} remain. ${nextOperatorAction}`
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    setPreviewStatus(`${familyLabel ? `Family ${familyLabel}: ` : ""}${requestedMode === "family-sources" ? "family source capture" : "guided donor capture"} failed: ${message}`);
  }
}

async function runDonorScanFamilyAction(family, limit = 10) {
  const api = window.myideApi;
  const selectedProject = getSelectedProject();
  const donorId = typeof selectedProject?.donor?.donorId === "string" ? selectedProject.donor.donorId : "";
  const familyLabel = typeof family === "string" && family.trim().length > 0 ? family.trim() : "";
  if (!api || typeof api.runDonorScanFamilyAction !== "function" || !donorId || !familyLabel) {
    setPreviewStatus("Donor family actions are not available in this renderer session.");
    return;
  }

  setPreviewStatus(`Running donor family action for ${familyLabel}...`);
  try {
    const result = await api.runDonorScanFamilyAction(donorId, familyLabel, limit);
    await reloadWorkspace(false, state.selectedProjectId);

    const status = typeof result?.status === "string" ? result.status : "blocked";
    const requestedMode = typeof result?.requestedMode === "string" ? result.requestedMode : "prepare-workset";
    const preparedEvidenceCount = Number(result?.preparedEvidenceCount ?? 0);
    const reconstructionLocalSourceCount = Number(result?.reconstructionLocalSourceCount ?? 0);
    const downloadedCount = Number(result?.downloadedCount ?? 0);
    const failedCount = Number(result?.failedCount ?? 0);
    const attemptedCount = Number(result?.attemptedCount ?? 0);
    const worksetPath = typeof result?.worksetPath === "string" ? result.worksetPath : null;
    const reconstructionBundlePath = typeof result?.reconstructionBundlePath === "string" ? result.reconstructionBundlePath : null;
    const nextOperatorAction = typeof result?.nextOperatorAction === "string" ? result.nextOperatorAction : "Review the donor scan family action queue.";

    if (requestedMode === "prepare-reconstruction-bundle") {
      setPreviewStatus(
        `Family ${familyLabel}: prepared reconstruction bundle with ${reconstructionLocalSourceCount} grounded local source${reconstructionLocalSourceCount === 1 ? "" : "s"}`
        + `${reconstructionBundlePath ? ` at ${reconstructionBundlePath}` : ""}`
        + `${worksetPath ? ` using ${worksetPath}` : ""}. ${nextOperatorAction}`
      );
      return;
    }

    if (requestedMode === "prepare-workset") {
      setPreviewStatus(
        `Family ${familyLabel}: prepared workset with ${preparedEvidenceCount} grounded source or evidence item${preparedEvidenceCount === 1 ? "" : "s"}`
        + `${worksetPath ? ` at ${worksetPath}` : ""}. ${nextOperatorAction}`
      );
      return;
    }

    setPreviewStatus(
      `Family ${familyLabel}: action ${status}. Downloaded ${downloadedCount} of ${attemptedCount} attempted target${attemptedCount === 1 ? "" : "s"}`
      + `${failedCount > 0 ? ` with ${failedCount} failure${failedCount === 1 ? "" : "s"}` : ""}. ${nextOperatorAction}`
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    setPreviewStatus(`Family ${familyLabel}: donor family action failed: ${message}`);
  }
}

function normalizeInvestigationProfileId(profileId) {
  return profileId === "manual-operator-assist" ? "manual-operator" : profileId;
}

function getInvestigationProfileDefinition(profileId) {
  const normalizedProfileId = normalizeInvestigationProfileId(profileId);
  return investigationProfiles.find((profile) => profile.profileId === normalizedProfileId) ?? null;
}

async function runBoundedInvestigationProfile(profile) {
  const runtimeActions = Array.isArray(profile?.runtimeActions) ? profile.runtimeActions : [];
  if (runtimeActions.length === 0) {
    return;
  }

  for (const action of runtimeActions) {
    if (action === "launch") {
      const launched = await handleRuntimeLaunch();
      if (!launched) {
        throw new Error("Runtime launch is blocked for this donor project.");
      }
      await waitForRendererCondition(() => state.runtimeUi.ready, "runtime launch readiness", { timeoutMs: 20000, intervalMs: 100 });
      await sleep(800);
      continue;
    }

    await handleRuntimeAction(action);
    await sleep(action === "spin" ? 1600 : 1200);
  }
}

async function runDonorPromotionQueue() {
  const api = window.myideApi;
  const selectedProject = getSelectedProject();
  const donorId = typeof selectedProject?.donor?.donorId === "string" ? selectedProject.donor.donorId : "";
  const donorName = typeof selectedProject?.donor?.donorName === "string" ? selectedProject.donor.donorName : donorId;
  if (!api || typeof api.runDonorPromotionQueue !== "function" || !donorId) {
    setPreviewStatus("Investigation promotion is not available in this renderer session.");
    return;
  }

  setPreviewStatus("Promoting ready investigation families and sections into the modification queue...");
  try {
    const result = await api.runDonorPromotionQueue(donorId, donorName);
    const promotedCount = Number(result?.promotedCount ?? 0);
    const queueItemCount = Number(result?.queueItemCount ?? 0);
    const nextOperatorAction = typeof result?.nextOperatorAction === "string"
      ? result.nextOperatorAction
      : "Open Modification / Compose and continue from the queued donor families.";
    let handoffMessage = "";
    if (
      queueItemCount > 0
      && selectedProject?.projectId
      && typeof api.prepareProjectModificationHandoff === "function"
    ) {
      try {
        const handoff = await api.prepareProjectModificationHandoff(selectedProject.projectId);
        const readyTaskCount = Number(handoff?.readyTaskCount ?? 0);
        const blockedTaskCount = Number(handoff?.blockedTaskCount ?? 0);
        handoffMessage = ` Modification board prepared with ${readyTaskCount} ready task${readyTaskCount === 1 ? "" : "s"}`
          + `${blockedTaskCount > 0 ? ` and ${blockedTaskCount} blocked item${blockedTaskCount === 1 ? "" : "s"}` : ""}.`;
      } catch (handoffError) {
        const handoffMessageText = handoffError instanceof Error ? handoffError.message : String(handoffError);
        handoffMessage = ` Promotion succeeded, but preparing the project modification board failed: ${handoffMessageText}`;
      }
    }
    await reloadWorkspace(false, state.selectedProjectId);
    setPreviewStatus(
      `Promotion queue updated. Added ${promotedCount} item${promotedCount === 1 ? "" : "s"}; `
      + `${queueItemCount} queued for Modification. ${nextOperatorAction}${handoffMessage}`
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    setPreviewStatus(`Investigation promotion failed: ${message}`);
  }
}

async function prepareProjectModificationBoard() {
  const api = window.myideApi;
  const selectedProject = getSelectedProject();
  const projectId = typeof selectedProject?.projectId === "string" ? selectedProject.projectId : "";
  if (!api || typeof api.prepareProjectModificationHandoff !== "function" || !projectId) {
    setPreviewStatus("Project modification handoff is not available in this renderer session.");
    return;
  }

  setPreviewStatus("Preparing the project modification board from the promoted donor queue...");
  try {
    const result = await api.prepareProjectModificationHandoff(projectId);
    await reloadWorkspace(false, projectId);
    const readyTaskCount = Number(result?.readyTaskCount ?? 0);
    const blockedTaskCount = Number(result?.blockedTaskCount ?? 0);
    const nextOperatorAction = typeof result?.nextOperatorAction === "string"
      ? result.nextOperatorAction
      : "Open Compose or Runtime and continue from the strongest prepared artifact.";
    setPreviewStatus(
      `Modification board prepared for ${projectId}. `
      + `${readyTaskCount} ready task${readyTaskCount === 1 ? "" : "s"}`
      + `${blockedTaskCount > 0 ? `, ${blockedTaskCount} blocked` : ""}. `
      + `${nextOperatorAction}`
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    setPreviewStatus(`Project modification handoff failed: ${message}`);
  }
}

async function runDonorScenarioProfile(profileId, minutes = null) {
  const api = window.myideApi;
  const selectedProject = getSelectedProject();
  const donorId = typeof selectedProject?.donor?.donorId === "string" ? selectedProject.donor.donorId : "";
  const donorName = typeof selectedProject?.donor?.donorName === "string" ? selectedProject.donor.donorName : donorId;
  const normalizedProfileId = normalizeInvestigationProfileId(profileId);
  const profile = getInvestigationProfileDefinition(normalizedProfileId);
  const requestedMinutes = Number.isFinite(minutes) && minutes > 0
    ? minutes
    : profile?.minutes ?? 5;
  if (!api || typeof api.runDonorScenarioProfile !== "function" || !donorId || !normalizedProfileId) {
    setPreviewStatus("Bounded investigation profiles are not available in this renderer session.");
    return;
  }

  setPreviewStatus(`Running investigation profile ${profile?.label ?? normalizedProfileId} for ${requestedMinutes} minute${requestedMinutes === 1 ? "" : "s"}...`);
  try {
    if (profile?.executionMode === "self-bounded") {
      await runBoundedInvestigationProfile(profile);
    } else if (Array.isArray(profile?.runtimeActions) && profile.runtimeActions.length > 0 && state.runtimeUi.launched === false) {
      await handleRuntimeLaunch();
    }

    const result = await api.runDonorScenarioProfile(donorId, normalizedProfileId, requestedMinutes, donorName);
    await reloadWorkspace(false, state.selectedProjectId);
    const runtimeScanState = typeof result?.runtimeScanState === "string" ? result.runtimeScanState : "unknown";
    const lifecycleLane = typeof result?.lifecycleLane === "string" ? result.lifecycleLane : "unknown";
    const readyForReconstructionCount = Number(result?.readyForReconstructionCount ?? 0);
    const blockedScenarioCount = Number(result?.blockedScenarioCount ?? 0);
    const coverageDeltaCount = Number(result?.coverageDeltaCount ?? 0);
    const promotionReadyCount = Number(result?.promotionReadyCount ?? 0);
    const queuedForModificationCount = Number(result?.queuedForModificationCount ?? 0);
    const needsOperatorAssist = Boolean(result?.needsOperatorAssist);
    const nextProfile = typeof result?.nextProfile === "string" ? result.nextProfile : null;
    const nextOperatorAction = typeof result?.nextOperatorAction === "string"
      ? result.nextOperatorAction
      : "Review the refreshed investigation board.";
    setPreviewStatus(
      `Investigation profile ${profile?.label ?? normalizedProfileId} completed. Runtime scan is ${runtimeScanState}; lane ${lifecycleLane}; `
      + `${readyForReconstructionCount} ready scenario${readyForReconstructionCount === 1 ? "" : "s"}; `
      + `${blockedScenarioCount} blocked scenario${blockedScenarioCount === 1 ? "" : "s"}; `
      + `${coverageDeltaCount} coverage change${coverageDeltaCount === 1 ? "" : "s"}; `
      + `${promotionReadyCount} promotion-ready; ${queuedForModificationCount} queued; `
      + `${needsOperatorAssist ? "operator assist needed" : "no manual assist leading"}. `
      + `next profile ${nextProfile ?? "none"}. ${nextOperatorAction}`
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    setPreviewStatus(`Investigation profile ${profile?.label ?? normalizedProfileId} failed: ${message}`);
  }
}

async function runDonorScanSectionAction(sectionKey) {
  const api = window.myideApi;
  const selectedProject = getSelectedProject();
  const donorId = typeof selectedProject?.donor?.donorId === "string" ? selectedProject.donor.donorId : "";
  const normalizedSectionKey = typeof sectionKey === "string" && sectionKey.trim().length > 0 ? sectionKey.trim() : "";
  if (!api || typeof api.runDonorScanSectionAction !== "function" || !donorId || !normalizedSectionKey) {
    setPreviewStatus("Donor reconstruction section actions are not available in this renderer session.");
    return;
  }

  setPreviewStatus(`Preparing donor reconstruction section ${normalizedSectionKey}...`);
  try {
    const result = await api.runDonorScanSectionAction(donorId, normalizedSectionKey);
    await reloadWorkspace(false, state.selectedProjectId);

    const status = typeof result?.status === "string" ? result.status : "blocked";
    const worksetPath = typeof result?.worksetPath === "string" ? result.worksetPath : null;
    const reconstructionBundlePath = typeof result?.reconstructionBundlePath === "string" ? result.reconstructionBundlePath : null;
    const skinBlueprintPath = typeof result?.skinBlueprintPath === "string" ? result.skinBlueprintPath : null;
    const skinRenderPlanPath = typeof result?.skinRenderPlanPath === "string" ? result.skinRenderPlanPath : null;
    const skinMaterialPlanPath = typeof result?.skinMaterialPlanPath === "string" ? result.skinMaterialPlanPath : null;
    const exactLocalSourceCount = Number(result?.exactLocalSourceCount ?? 0);
    const mappedAttachmentCount = Number(result?.mappedAttachmentCount ?? 0);
    const attachmentCount = Number(result?.attachmentCount ?? 0);
    const nextOperatorAction = typeof result?.nextOperatorAction === "string"
      ? result.nextOperatorAction
      : "Review the donor reconstruction section workset.";

    if (status === "prepared") {
      setPreviewStatus(
        `Section ${normalizedSectionKey}: prepared section reconstruction bundle with ${mappedAttachmentCount}/${attachmentCount} mapped attachment${attachmentCount === 1 ? "" : "s"}`
        + `${exactLocalSourceCount > 0 ? ` and ${exactLocalSourceCount} grounded local source${exactLocalSourceCount === 1 ? "" : "s"}` : ""}`
        + `${worksetPath ? ` at ${worksetPath}` : ""}`
        + `${reconstructionBundlePath ? ` using ${reconstructionBundlePath}` : ""}`
        + `${skinBlueprintPath ? ` with ${skinBlueprintPath}` : ""}`
        + `${skinRenderPlanPath ? ` and ${skinRenderPlanPath}` : ""}`
        + `${skinMaterialPlanPath ? ` plus ${skinMaterialPlanPath}` : ""}. ${nextOperatorAction}`
      );
      return;
    }

    setPreviewStatus(`Section ${normalizedSectionKey}: donor section preparation is blocked. ${nextOperatorAction}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    setPreviewStatus(`Section ${normalizedSectionKey}: donor section action failed: ${message}`);
  }
}

async function handleRuntimeAction(action) {
  if (action === "launch") {
    await handleRuntimeLaunch();
    return;
  }

  if (action === "reload") {
    await handleRuntimeReload();
    return;
  }

  if (action === "open-debug-host") {
    await openRuntimeDebugHostWindow();
    return;
  }

  if (action === "inspect-toggle") {
    await setRuntimeRequestStage("inspect");
    const result = await callRuntimeBridge("setInspectEnabled", !state.runtimeUi.inspectEnabled);
    state.runtimeUi.inspectEnabled = Boolean(result?.enabled);
    renderAll();
    setPreviewStatus(state.runtimeUi.inspectEnabled
      ? "Runtime pick mode is armed. Click a live runtime target in the embedded viewport."
      : "Runtime pick mode is off.");
    return;
  }

  if (action === "pause" || action === "resume" || action === "step") {
    const result = await callRuntimeBridge(action);
    state.runtimeUi.lastCommand = action;
    state.runtimeUi.lastCommandStatus = result;
    if (result?.ok) {
      if (action === "pause") {
        state.runtimeUi.diagnostics = {
          ...(state.runtimeUi.diagnostics ?? {}),
          paused: true
        };
      } else if (action === "resume") {
        state.runtimeUi.diagnostics = {
          ...(state.runtimeUi.diagnostics ?? {}),
          paused: false
        };
      }
      setPreviewStatus(`Runtime ${action} executed through the embedded donor runtime bridge.`);
    } else {
      state.runtimeUi.controlBlockers[action] = result?.blocked ?? state.runtimeUi.controlBlockers[action];
      setPreviewStatus(result?.blocked ?? `Runtime ${action} is not available in this donor runtime slice.`);
    }
    renderAll();
    return;
  }

  if (action === "enter") {
    await setRuntimeRequestStage("enter");
    const result = await sendRuntimePointerClick();
    state.runtimeUi.lastCommand = action;
    state.runtimeUi.lastCommandStatus = result;
    if (result.ok) {
      setPreviewStatus(result.detail);
      void (async () => {
        await sleep(1200);
        await refreshRuntimeResourceMap({ silent: true });
        renderAll();
      })();
    } else {
      state.runtimeUi.controlBlockers.enter = result.blocked;
      setPreviewStatus(result.blocked);
    }
    renderAll();
    return;
  }

  if (action === "spin") {
    await setRuntimeRequestStage("spin");
    const result = await sendRuntimeSpaceKey();
    state.runtimeUi.lastCommand = action;
    state.runtimeUi.lastCommandStatus = result;
    if (result.ok) {
      setPreviewStatus(result.detail);
      void (async () => {
        await sleep(1200);
        await refreshRuntimeResourceMap({ silent: true });
        renderAll();
      })();
    } else {
      state.runtimeUi.controlBlockers.spin = result.blocked;
      setPreviewStatus(result.blocked);
    }
    renderAll();
    return;
  }

  if (action === "focus-note") {
    focusEvidenceItem("MG-EV-20260320-LIVE-A-006", { selectedObjectOnly: false });
    setPreviewStatus("Focused the live donor runtime observation note in the Donor Evidence panel.");
    return;
  }

  if (action === "focus-init") {
    focusEvidenceItem("MG-EV-20260320-LIVE-A-005", { selectedObjectOnly: false });
    setPreviewStatus("Focused the live donor runtime init response evidence in the Donor Evidence panel.");
    return;
  }

  if (action === "focus-asset") {
    const donorAsset = getRuntimeWorkflowBridge().donorAsset;
    if (!donorAsset) {
      setPreviewStatus("No grounded donor asset is available for the current runtime trace.");
      return;
    }
    focusDonorAssetCard(donorAsset.assetId);
    setPreviewStatus(`Focused donor asset ${donorAsset.assetId} from the current runtime trace.`);
    return;
  }

  if (action === "focus-evidence") {
    const evidenceItem = getRuntimeWorkflowBridge().evidenceItem;
    if (!evidenceItem) {
      setPreviewStatus("No grounded donor evidence item is available for the current runtime trace.");
      return;
    }
    focusEvidenceItem(evidenceItem.evidenceId, { selectedObjectOnly: false });
    setPreviewStatus(`Focused donor evidence ${evidenceItem.evidenceId} from the current runtime trace.`);
    return;
  }

  if (action === "focus-scene") {
    const sceneObject = getRuntimeWorkflowBridge().sceneObject;
    if (!sceneObject) {
      setPreviewStatus("No related compose object is grounded for the current runtime trace.");
      return;
    }
    focusSceneObjectInWorkflow(sceneObject.id, {
      status: `Focused compose object ${sceneObject.id} from the current runtime trace.`
    });
    return;
  }

  if (action === "create-override") {
    await createRuntimeOverrideFromCurrentBridge();
    return;
  }

  if (action === "clear-override") {
    await clearRuntimeOverrideForCurrentCandidate();
  }
}

function clickRendererElement(element, init = {}) {
  if (!(element instanceof HTMLElement)) {
    throw new Error("Cannot click a missing renderer element.");
  }

  if (!init.shiftKey && !init.ctrlKey && !init.metaKey && !init.altKey && typeof element.click === "function") {
    element.click();
    return;
  }

  element.dispatchEvent(new MouseEvent("click", {
    bubbles: true,
    cancelable: true,
    composed: true,
    shiftKey: Boolean(init.shiftKey),
    ctrlKey: Boolean(init.ctrlKey),
    metaKey: Boolean(init.metaKey),
    altKey: Boolean(init.altKey),
    view: window
  }));
}

function dispatchRendererPointerEvent(target, type, init = {}) {
  if (!target || typeof target.dispatchEvent !== "function") {
    throw new Error(`Cannot dispatch ${type} without a valid renderer event target.`);
  }

  if (typeof PointerEvent !== "function") {
    throw new Error("PointerEvent is unavailable in this renderer session.");
  }

  const event = new PointerEvent(type, {
    bubbles: true,
    cancelable: true,
    composed: true,
    pointerId: Number.isFinite(init.pointerId) ? init.pointerId : 1,
    pointerType: init.pointerType ?? "mouse",
    isPrimary: init.isPrimary ?? true,
    button: Number.isFinite(init.button) ? init.button : (type === "pointerup" ? 0 : 0),
    buttons: Number.isFinite(init.buttons) ? init.buttons : (type === "pointerup" ? 0 : 1),
    clientX: Number.isFinite(init.clientX) ? init.clientX : 0,
    clientY: Number.isFinite(init.clientY) ? init.clientY : 0,
    movementX: Number.isFinite(init.movementX) ? init.movementX : 0,
    movementY: Number.isFinite(init.movementY) ? init.movementY : 0,
    shiftKey: Boolean(init.shiftKey),
    ctrlKey: Boolean(init.ctrlKey),
    metaKey: Boolean(init.metaKey),
    altKey: Boolean(init.altKey),
    pressure: type === "pointerup" ? 0 : 0.5,
    view: window
  });

  target.dispatchEvent(event);
}

function dispatchRendererDragEvent(target, type, init = {}) {
  if (!target || typeof target.dispatchEvent !== "function") {
    throw new Error(`Cannot dispatch ${type} without a valid renderer drag target.`);
  }

  if (typeof DragEvent !== "function") {
    throw new Error("DragEvent is unavailable in this renderer session.");
  }

  const event = new DragEvent(type, {
    bubbles: true,
    cancelable: true,
    composed: true,
    clientX: Number.isFinite(init.clientX) ? init.clientX : 0,
    clientY: Number.isFinite(init.clientY) ? init.clientY : 0,
    dataTransfer: init.dataTransfer ?? null
  });

  if (init.dataTransfer && event.dataTransfer !== init.dataTransfer) {
    try {
      Object.defineProperty(event, "dataTransfer", {
        configurable: true,
        enumerable: true,
        value: init.dataTransfer
      });
    } catch {
      // Best effort only. Synthetic drag/drop still uses the DragEvent constructor path first.
    }
  }

  target.dispatchEvent(event);
}

function updateRendererInputValue(field, nextValue) {
  if (!(field instanceof HTMLInputElement) && !(field instanceof HTMLTextAreaElement) && !(field instanceof HTMLSelectElement)) {
    throw new Error("Cannot update a non-input renderer field.");
  }

  field.focus();
  field.value = String(nextValue);
  field.dispatchEvent(new Event("input", { bubbles: true, cancelable: true }));
  field.dispatchEvent(new Event("change", { bubbles: true, cancelable: true }));
}

function getEditableObjectById(objectId, editorData = state.editorData) {
  if (!editorData || !Array.isArray(editorData.objects)) {
    return null;
  }

  return editorData.objects.find((entry) => entry.id === objectId) ?? null;
}

function getReplayNodeById(objectId, project = state.bundle?.project) {
  const scenes = Array.isArray(project?.scenes) ? project.scenes : [];

  for (const scene of scenes) {
    const layers = Array.isArray(scene?.layers) ? scene.layers : [];
    for (const layer of layers) {
      const nodes = Array.isArray(layer?.nodes) ? layer.nodes : [];
      const match = nodes.find((node) => node?.nodeId === objectId);
      if (match) {
        return match;
      }
    }
  }

  return null;
}

function getReplayLayerIdByNodeId(objectId, project = state.bundle?.project) {
  const scenes = Array.isArray(project?.scenes) ? project.scenes : [];

  for (const scene of scenes) {
    const layers = Array.isArray(scene?.layers) ? scene.layers : [];
    for (const layer of layers) {
      const nodes = Array.isArray(layer?.nodes) ? layer.nodes : [];
      if (nodes.some((node) => node?.nodeId === objectId)) {
        return layer?.layerId ?? null;
      }
    }
  }

  return null;
}

function getReplayLayerNodeOrder(layerId, project = state.bundle?.project) {
  const scenes = Array.isArray(project?.scenes) ? project.scenes : [];

  for (const scene of scenes) {
    const layers = Array.isArray(scene?.layers) ? scene.layers : [];
    const layer = layers.find((entry) => entry?.layerId === layerId);
    if (layer) {
      return Array.isArray(layer.nodes)
        ? layer.nodes.map((node) => node?.nodeId).filter((nodeId) => typeof nodeId === "string")
        : [];
    }
  }

  return [];
}

function getCanvasObjectElementById(objectId) {
  return elements.editorCanvas?.querySelector(`[data-canvas-object-id="${objectId}"]`) ?? null;
}

async function ensureSceneWorkbenchForSmoke(label) {
  setWorkbenchMode("scene");
  await waitForRendererCondition(
    () => state.workbenchMode === "scene" && !elements.sceneWorkbench?.hidden,
    `${label} scene workbench`
  );
}

async function runLivePersistSmoke() {
  const targetProjectId = "project_001";
  const targetObjectId = "node.title";
  const targetField = "x";
  const startedAt = new Date().toISOString();
  const baseResult = {
    startedAt,
    projectId: targetProjectId,
    objectId: targetObjectId,
    field: targetField,
    preloadExecuted: Boolean(window.myideApi),
    myideApiExposed: Boolean(window.myideApi && typeof window.myideApi.loadProjectSlice === "function"),
    projectLoaded: false,
    objectSelected: false,
    editApplied: false,
    saveSucceeded: false,
    reloadSucceeded: false,
    internalPersistVerified: false,
    replaySyncVerified: false,
    repoStatusIntent: "renderer smoke mutates live files temporarily; outer smoke runner must restore them",
    originalValue: null,
    editedValue: null,
    reloadedValue: null,
    replayValue: null,
    syncStatus: null,
    replayPath: null,
    previewStatus: null
  };

  try {
    const api = window.myideApi;
    if (
      !api
      || typeof api.loadProjectSlice !== "function"
      || typeof api.saveProjectEditor !== "function"
      || typeof api.reportRendererReady !== "function"
    ) {
      throw new Error("Renderer live persist smoke could not access the required desktop bridge helpers.");
    }

    await waitForRendererCondition(
      () => Boolean(state.bundle && getWorkspaceProjects().length > 0),
      "workspace discovery"
    );

    if (state.selectedProjectId !== targetProjectId) {
      const projectButton = await waitForRendererCondition(
        () => elements.projectBrowser?.querySelector(`[data-project-id="${targetProjectId}"]`) ?? null,
        `project browser entry for ${targetProjectId}`
      );
      clickRendererElement(projectButton);
    }

    await waitForRendererCondition(
      () => state.selectedProjectId === targetProjectId && Boolean(state.editorData),
      `${targetProjectId} to load in the renderer`
    );
    baseResult.projectLoaded = true;
    await ensureSceneWorkbenchForSmoke("live persist smoke");

    const objectButton = await waitForRendererCondition(
      () => elements.sceneExplorer?.querySelector(`[data-object-id="${targetObjectId}"]`) ?? null,
      `${targetObjectId} in the scene explorer`
    );
    clickRendererElement(objectButton);

    await waitForRendererCondition(
      () => state.selectedObjectId === targetObjectId && Boolean(getSelectedObject()),
      `${targetObjectId} to become selected`
    );
    baseResult.objectSelected = true;

    const selectedObject = getEditableObjectById(targetObjectId);
    const originalValue = Number(selectedObject?.[targetField]);
    if (!Number.isFinite(originalValue)) {
      throw new Error(`Selected object ${targetObjectId} does not expose numeric ${targetField}.`);
    }

    const editedValue = Math.round(originalValue + 17);
    baseResult.originalValue = originalValue;
    baseResult.editedValue = editedValue;

    const inspectorInput = await waitForRendererCondition(
      () => elements.inspector?.querySelector(`input[name="${targetField}"]`) ?? null,
      `inspector input ${targetField}`
    );
    updateRendererInputValue(inspectorInput, editedValue);

    await waitForRendererCondition(
      () => Number(getEditableObjectById(targetObjectId)?.[targetField]) === editedValue && state.dirty,
      `${targetObjectId}.${targetField} edit to apply`
    );
    baseResult.editApplied = true;

    if (!(elements.actionSave instanceof HTMLButtonElement)) {
      throw new Error("Save button is missing from the renderer toolbar.");
    }

    clickRendererElement(elements.actionSave);
    await waitForRendererCondition(
      () => {
        const editedObject = getEditableObjectById(targetObjectId);
        return Boolean(
          !state.dirty
          && state.syncStatus?.status === "synced"
          && Number(editedObject?.[targetField]) === editedValue
        );
      },
      "renderer save and sync completion",
      { timeoutMs: 25000 }
    );
    baseResult.saveSucceeded = true;

    if (!(elements.actionReloadEditor instanceof HTMLButtonElement)) {
      throw new Error("Reload button is missing from the renderer toolbar.");
    }

    clickRendererElement(elements.actionReloadEditor);
    await waitForRendererCondition(
      () => state.selectedProjectId === targetProjectId && Boolean(state.editorData),
      `${targetProjectId} reload`
    );
    await waitForRendererCondition(
      () => Number(getEditableObjectById(targetObjectId)?.[targetField]) === editedValue,
      `${targetObjectId}.${targetField} after reload`
    );
    baseResult.reloadSucceeded = true;

    const reloadedObject = getEditableObjectById(targetObjectId);
    const replayNode = getReplayNodeById(targetObjectId);
    const replayValue = Number(replayNode?.position?.[targetField]);
    const reloadedValue = Number(reloadedObject?.[targetField]);
    baseResult.reloadedValue = Number.isFinite(reloadedValue) ? reloadedValue : null;
    baseResult.replayValue = Number.isFinite(replayValue) ? replayValue : null;
    baseResult.syncStatus = state.syncStatus?.status ?? null;
    baseResult.replayPath = toRepoRelativePath(state.syncStatus?.replayPath ?? getReplayTargetPath() ?? "");

    baseResult.internalPersistVerified = reloadedValue === editedValue;
    baseResult.replaySyncVerified = replayValue === editedValue;

    if (!baseResult.internalPersistVerified) {
      throw new Error(`Reloaded internal value was ${reloadedValue}, expected ${editedValue}.`);
    }

    if (!baseResult.replaySyncVerified) {
      throw new Error(`Replay-facing value was ${replayValue}, expected ${editedValue}.`);
    }

    const successMessage = `Live shell persist smoke passed for ${targetObjectId}: ${targetField} ${originalValue} -> ${editedValue}, saved and reloaded through the Electron bridge.`;
    setPreviewStatus(successMessage);
    baseResult.previewStatus = successMessage;
    document.body.dataset.livePersistSmoke = "pass";

    await emitLivePersistSmoke({
      ...baseResult,
      status: "pass"
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const failureMessage = `Live shell persist smoke failed: ${message}`;
    setPreviewStatus(failureMessage);
    document.body.dataset.livePersistSmoke = "fail";
    await emitLivePersistSmoke({
      ...baseResult,
      status: "fail",
      error: message,
      previewStatus: failureMessage
    });
  }
}

async function runLiveDragSmoke() {
  const targetProjectId = "project_001";
  const targetObjectId = "node.bottom-bar";
  const dragDelta = {
    x: 20,
    y: -12
  };
  const pointerId = 7;
  const startedAt = new Date().toISOString();
  const baseResult = {
    startedAt,
    projectId: targetProjectId,
    objectId: targetObjectId,
    preloadExecuted: Boolean(window.myideApi),
    myideApiExposed: Boolean(window.myideApi && typeof window.myideApi.loadProjectSlice === "function"),
    projectLoaded: false,
    canvasSelectionSucceeded: false,
    dragStarted: false,
    dragMoved: false,
    dragCompleted: false,
    saveSucceeded: false,
    reloadSucceeded: false,
    internalPersistVerified: false,
    replaySyncVerified: false,
    repoStatusIntent: "renderer smoke mutates live files temporarily; outer smoke runner must restore them",
    snapEnabled: null,
    viewportZoom: null,
    viewportPanX: null,
    viewportPanY: null,
    originalX: null,
    originalY: null,
    draggedX: null,
    draggedY: null,
    reloadedX: null,
    reloadedY: null,
    replayX: null,
    replayY: null,
    syncStatus: null,
    replayPath: null,
    previewStatus: null
  };

  try {
    const api = window.myideApi;
    if (
      !api
      || typeof api.loadProjectSlice !== "function"
      || typeof api.saveProjectEditor !== "function"
      || typeof api.reportRendererReady !== "function"
    ) {
      throw new Error("Renderer live drag smoke could not access the required desktop bridge helpers.");
    }

    await waitForRendererCondition(
      () => Boolean(state.bundle && getWorkspaceProjects().length > 0),
      "workspace discovery"
    );

    if (state.selectedProjectId !== targetProjectId) {
      const projectButton = await waitForRendererCondition(
        () => elements.projectBrowser?.querySelector(`[data-project-id="${targetProjectId}"]`) ?? null,
        `project browser entry for ${targetProjectId}`
      );
      clickRendererElement(projectButton);
    }

    await waitForRendererCondition(
      () => state.selectedProjectId === targetProjectId && Boolean(state.editorData),
      `${targetProjectId} to load in the renderer`
    );
    baseResult.projectLoaded = true;
    await ensureSceneWorkbenchForSmoke("live drag smoke");

    if (isSnapEnabled()) {
      if (!(elements.actionToggleSnap instanceof HTMLButtonElement)) {
        throw new Error("Snap toggle button is missing from the renderer toolbar.");
      }
      clickRendererElement(elements.actionToggleSnap);
      await waitForRendererCondition(() => !isSnapEnabled(), "snap toggle to switch off");
    }

    if (isViewportTransformed()) {
      if (!(elements.actionResetView instanceof HTMLButtonElement)) {
        throw new Error("Reset View button is missing from the renderer toolbar.");
      }
      clickRendererElement(elements.actionResetView);
    }

    await waitForRendererCondition(
      () => {
        const view = getViewportState();
        return Math.abs(view.zoom - 1) < 0.001 && Math.abs(view.panX) < 0.001 && Math.abs(view.panY) < 0.001;
      },
      "default viewport state"
    );

    baseResult.snapEnabled = isSnapEnabled();
    baseResult.viewportZoom = getViewportState().zoom;
    baseResult.viewportPanX = getViewportState().panX;
    baseResult.viewportPanY = getViewportState().panY;

    const originalObject = getEditableObjectById(targetObjectId);
    const originalX = Number(originalObject?.x);
    const originalY = Number(originalObject?.y);
    if (!Number.isFinite(originalX) || !Number.isFinite(originalY)) {
      throw new Error(`Selected drag object ${targetObjectId} does not expose numeric x/y.`);
    }
    baseResult.originalX = originalX;
    baseResult.originalY = originalY;

    const objectButton = await waitForRendererCondition(
      () => getCanvasObjectElementById(targetObjectId),
      `${targetObjectId} on the editor canvas`
    );
    const rect = objectButton.getBoundingClientRect();
    const startPoint = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    };
    const endPoint = {
      x: startPoint.x + dragDelta.x,
      y: startPoint.y + dragDelta.y
    };

    dispatchRendererPointerEvent(objectButton, "pointerdown", {
      pointerId,
      button: 0,
      buttons: 1,
      clientX: startPoint.x,
      clientY: startPoint.y
    });

    await waitForRendererCondition(
      () => state.selectedObjectId === targetObjectId && state.canvasDrag?.objectId === targetObjectId,
      `${targetObjectId} to start a canvas drag`
    );
    baseResult.canvasSelectionSucceeded = true;
    baseResult.dragStarted = true;

    dispatchRendererPointerEvent(window, "pointermove", {
      pointerId,
      buttons: 1,
      clientX: endPoint.x,
      clientY: endPoint.y,
      movementX: dragDelta.x,
      movementY: dragDelta.y
    });

    const movedObject = await waitForRendererCondition(
      () => {
        const currentObject = getEditableObjectById(targetObjectId);
        if (!currentObject || !state.canvasDrag?.moved) {
          return null;
        }
        if (Number(currentObject.x) === originalX && Number(currentObject.y) === originalY) {
          return null;
        }
        return currentObject;
      },
      `${targetObjectId} to move through the canvas drag path`
    );
    baseResult.dragMoved = true;
    baseResult.draggedX = Number(movedObject.x);
    baseResult.draggedY = Number(movedObject.y);

    dispatchRendererPointerEvent(window, "pointerup", {
      pointerId,
      button: 0,
      buttons: 0,
      clientX: endPoint.x,
      clientY: endPoint.y,
      movementX: dragDelta.x,
      movementY: dragDelta.y
    });

    await waitForRendererCondition(
      () => state.canvasDrag === null && state.dirty,
      "canvas drag to commit its moved position"
    );
    baseResult.dragCompleted = true;

    if (!(elements.actionSave instanceof HTMLButtonElement)) {
      throw new Error("Save button is missing from the renderer toolbar.");
    }

    clickRendererElement(elements.actionSave);
    await waitForRendererCondition(
      () => {
        const draggedObject = getEditableObjectById(targetObjectId);
        return Boolean(
          !state.dirty
          && state.syncStatus?.status === "synced"
          && Number(draggedObject?.x) === baseResult.draggedX
          && Number(draggedObject?.y) === baseResult.draggedY
        );
      },
      "renderer save and sync completion after live drag",
      { timeoutMs: 25000 }
    );
    baseResult.saveSucceeded = true;

    if (!(elements.actionReloadEditor instanceof HTMLButtonElement)) {
      throw new Error("Reload button is missing from the renderer toolbar.");
    }

    clickRendererElement(elements.actionReloadEditor);
    await waitForRendererCondition(
      () => state.selectedProjectId === targetProjectId && Boolean(state.editorData),
      `${targetProjectId} reload after drag save`
    );
    const reloadedObject = await waitForRendererCondition(
      () => {
        const currentObject = getEditableObjectById(targetObjectId);
        if (!currentObject) {
          return null;
        }
        return Number(currentObject.x) === baseResult.draggedX && Number(currentObject.y) === baseResult.draggedY
          ? currentObject
          : null;
      },
      `${targetObjectId} drag coordinates after reload`
    );
    baseResult.reloadSucceeded = true;
    baseResult.reloadedX = Number(reloadedObject.x);
    baseResult.reloadedY = Number(reloadedObject.y);

    const replayNode = getReplayNodeById(targetObjectId);
    const replayX = Number(replayNode?.position?.x);
    const replayY = Number(replayNode?.position?.y);
    baseResult.replayX = Number.isFinite(replayX) ? replayX : null;
    baseResult.replayY = Number.isFinite(replayY) ? replayY : null;
    baseResult.syncStatus = state.syncStatus?.status ?? null;
    baseResult.replayPath = toRepoRelativePath(state.syncStatus?.replayPath ?? getReplayTargetPath() ?? "");

    baseResult.internalPersistVerified = baseResult.reloadedX === baseResult.draggedX && baseResult.reloadedY === baseResult.draggedY;
    baseResult.replaySyncVerified = baseResult.replayX === baseResult.draggedX && baseResult.replayY === baseResult.draggedY;

    if (!baseResult.internalPersistVerified) {
      throw new Error(`Reloaded internal drag position was (${baseResult.reloadedX}, ${baseResult.reloadedY}), expected (${baseResult.draggedX}, ${baseResult.draggedY}).`);
    }

    if (!baseResult.replaySyncVerified) {
      throw new Error(`Replay-facing drag position was (${baseResult.replayX}, ${baseResult.replayY}), expected (${baseResult.draggedX}, ${baseResult.draggedY}).`);
    }

    const successMessage = `Live shell drag smoke passed for ${targetObjectId}: (${originalX}, ${originalY}) -> (${baseResult.draggedX}, ${baseResult.draggedY}), saved and reloaded through the Electron bridge.`;
    setPreviewStatus(successMessage);
    baseResult.previewStatus = successMessage;
    document.body.dataset.liveDragSmoke = "pass";

    if (shouldKeepLiveDragWindowOpen()) {
      pushLog("Live drag smoke keep-open mode is active for visible proof capture.");
    }

    await emitLiveDragSmoke({
      ...baseResult,
      status: "pass"
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const failureMessage = `Live shell drag smoke failed: ${message}`;
    setPreviewStatus(failureMessage);
    document.body.dataset.liveDragSmoke = "fail";
    await emitLiveDragSmoke({
      ...baseResult,
      status: "fail",
      error: message,
      previewStatus: failureMessage
    });
  }
}

async function runLiveCreateDragSmoke() {
  const targetProjectId = "project_001";
  const presetKey = "banner";
  const presetLabel = "Banner";
  const objectIdPrefix = "node.placeholder.banner-";
  const dragDelta = {
    x: 36,
    y: 24
  };
  const pointerId = 11;
  const startedAt = new Date().toISOString();
  const baseResult = {
    startedAt,
    projectId: targetProjectId,
    presetKey,
    presetLabel,
    objectId: null,
    preloadExecuted: Boolean(window.myideApi),
    myideApiExposed: Boolean(window.myideApi && typeof window.myideApi.loadProjectSlice === "function"),
    projectLoaded: false,
    objectCreated: false,
    objectSelected: false,
    dragStarted: false,
    dragMoved: false,
    dragCompleted: false,
    saveSucceeded: false,
    reloadSucceeded: false,
    internalPersistVerified: false,
    replaySyncVerified: false,
    repoStatusIntent: "renderer smoke mutates live files temporarily; outer smoke runner must restore them",
    objectCountBefore: null,
    objectCountAfterCreate: null,
    objectCountAfterReload: null,
    snapEnabled: null,
    viewportZoom: null,
    viewportPanX: null,
    viewportPanY: null,
    createdX: null,
    createdY: null,
    draggedX: null,
    draggedY: null,
    reloadedX: null,
    reloadedY: null,
    replayX: null,
    replayY: null,
    syncStatus: null,
    replayPath: null,
    previewStatus: null
  };

  try {
    const api = window.myideApi;
    if (
      !api
      || typeof api.loadProjectSlice !== "function"
      || typeof api.saveProjectEditor !== "function"
      || typeof api.reportRendererReady !== "function"
    ) {
      throw new Error("Renderer live create-drag smoke could not access the required desktop bridge helpers.");
    }

    await waitForRendererCondition(
      () => Boolean(state.bundle && getWorkspaceProjects().length > 0),
      "workspace discovery"
    );

    if (state.selectedProjectId !== targetProjectId) {
      const projectButton = await waitForRendererCondition(
        () => elements.projectBrowser?.querySelector(`[data-project-id="${targetProjectId}"]`) ?? null,
        `project browser entry for ${targetProjectId}`
      );
      clickRendererElement(projectButton);
    }

    await waitForRendererCondition(
      () => state.selectedProjectId === targetProjectId && Boolean(state.editorData),
      `${targetProjectId} to load in the renderer`
    );
    baseResult.projectLoaded = true;
    await ensureSceneWorkbenchForSmoke("live create-drag smoke");
    baseResult.objectCountBefore = Array.isArray(state.editorData?.objects) ? state.editorData.objects.length : null;

    if (isSnapEnabled()) {
      if (!(elements.actionToggleSnap instanceof HTMLButtonElement)) {
        throw new Error("Snap toggle button is missing from the renderer toolbar.");
      }
      clickRendererElement(elements.actionToggleSnap);
      await waitForRendererCondition(() => !isSnapEnabled(), "snap toggle to switch off");
    }

    if (isViewportTransformed()) {
      if (!(elements.actionResetView instanceof HTMLButtonElement)) {
        throw new Error("Reset View button is missing from the renderer toolbar.");
      }
      clickRendererElement(elements.actionResetView);
    }

    await waitForRendererCondition(
      () => {
        const view = getViewportState();
        return Math.abs(view.zoom - 1) < 0.001 && Math.abs(view.panX) < 0.001 && Math.abs(view.panY) < 0.001;
      },
      "default viewport state"
    );

    baseResult.snapEnabled = isSnapEnabled();
    baseResult.viewportZoom = getViewportState().zoom;
    baseResult.viewportPanX = getViewportState().panX;
    baseResult.viewportPanY = getViewportState().panY;

    if (!(elements.fieldPlaceholderPreset instanceof HTMLSelectElement)) {
      throw new Error("Placeholder preset selector is missing from the renderer toolbar.");
    }

    updateRendererInputValue(elements.fieldPlaceholderPreset, presetKey);
    await waitForRendererCondition(
      () => state.placeholderPresetKey === presetKey && elements.fieldPlaceholderPreset?.value === presetKey,
      `${presetKey} preset selection`
    );

    if (!(elements.actionNewObject instanceof HTMLButtonElement)) {
      throw new Error("New Placeholder button is missing from the renderer toolbar.");
    }

    clickRendererElement(elements.actionNewObject);

    const createdObject = await waitForRendererCondition(
      () => {
        const selectedObject = getSelectedObject();
        if (!selectedObject || !selectedObject.id.startsWith(objectIdPrefix)) {
          return null;
        }
        return selectedObject;
      },
      `new ${presetLabel} placeholder creation`
    );
    baseResult.objectCreated = true;
    baseResult.objectSelected = true;
    baseResult.objectId = createdObject.id;
    baseResult.objectCountAfterCreate = Array.isArray(state.editorData?.objects) ? state.editorData.objects.length : null;
    baseResult.createdX = Number(createdObject.x);
    baseResult.createdY = Number(createdObject.y);

    const objectButton = await waitForRendererCondition(
      () => getCanvasObjectElementById(createdObject.id),
      `${createdObject.id} on the editor canvas`
    );
    const rect = objectButton.getBoundingClientRect();
    const startPoint = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    };
    const endPoint = {
      x: startPoint.x + dragDelta.x,
      y: startPoint.y + dragDelta.y
    };

    dispatchRendererPointerEvent(objectButton, "pointerdown", {
      pointerId,
      button: 0,
      buttons: 1,
      clientX: startPoint.x,
      clientY: startPoint.y
    });

    await waitForRendererCondition(
      () => state.selectedObjectId === createdObject.id && state.canvasDrag?.objectId === createdObject.id,
      `${createdObject.id} to start a canvas drag`
    );
    baseResult.dragStarted = true;

    dispatchRendererPointerEvent(window, "pointermove", {
      pointerId,
      buttons: 1,
      clientX: endPoint.x,
      clientY: endPoint.y,
      movementX: dragDelta.x,
      movementY: dragDelta.y
    });

    const movedObject = await waitForRendererCondition(
      () => {
        const currentObject = getEditableObjectById(createdObject.id);
        if (!currentObject || !state.canvasDrag?.moved) {
          return null;
        }
        if (Number(currentObject.x) === baseResult.createdX && Number(currentObject.y) === baseResult.createdY) {
          return null;
        }
        return currentObject;
      },
      `${createdObject.id} to move through the live create-drag path`
    );
    baseResult.dragMoved = true;
    baseResult.draggedX = Number(movedObject.x);
    baseResult.draggedY = Number(movedObject.y);

    dispatchRendererPointerEvent(window, "pointerup", {
      pointerId,
      button: 0,
      buttons: 0,
      clientX: endPoint.x,
      clientY: endPoint.y,
      movementX: dragDelta.x,
      movementY: dragDelta.y
    });

    await waitForRendererCondition(
      () => state.canvasDrag === null && state.dirty,
      "create-drag move to commit its position"
    );
    baseResult.dragCompleted = true;

    if (!(elements.actionSave instanceof HTMLButtonElement)) {
      throw new Error("Save button is missing from the renderer toolbar.");
    }

    clickRendererElement(elements.actionSave);
    await waitForRendererCondition(
      () => {
        const draggedObject = getEditableObjectById(createdObject.id);
        return Boolean(
          !state.dirty
          && state.syncStatus?.status === "synced"
          && draggedObject
          && Number(draggedObject.x) === baseResult.draggedX
          && Number(draggedObject.y) === baseResult.draggedY
        );
      },
      "renderer save and sync completion after live create-drag",
      { timeoutMs: 25000 }
    );
    baseResult.saveSucceeded = true;

    if (!(elements.actionReloadEditor instanceof HTMLButtonElement)) {
      throw new Error("Reload button is missing from the renderer toolbar.");
    }

    clickRendererElement(elements.actionReloadEditor);
    await waitForRendererCondition(
      () => state.selectedProjectId === targetProjectId && Boolean(state.editorData),
      `${targetProjectId} reload after create-drag save`
    );
    const reloadedObject = await waitForRendererCondition(
      () => {
        const currentObject = getEditableObjectById(createdObject.id);
        if (!currentObject) {
          return null;
        }
        return Number(currentObject.x) === baseResult.draggedX && Number(currentObject.y) === baseResult.draggedY
          ? currentObject
          : null;
      },
      `${createdObject.id} persisted coordinates after reload`
    );
    baseResult.reloadSucceeded = true;
    baseResult.objectCountAfterReload = Array.isArray(state.editorData?.objects) ? state.editorData.objects.length : null;
    baseResult.reloadedX = Number(reloadedObject.x);
    baseResult.reloadedY = Number(reloadedObject.y);

    const replayNode = getReplayNodeById(createdObject.id);
    const replayX = Number(replayNode?.position?.x);
    const replayY = Number(replayNode?.position?.y);
    baseResult.replayX = Number.isFinite(replayX) ? replayX : null;
    baseResult.replayY = Number.isFinite(replayY) ? replayY : null;
    baseResult.syncStatus = state.syncStatus?.status ?? null;
    baseResult.replayPath = toRepoRelativePath(state.syncStatus?.replayPath ?? getReplayTargetPath() ?? "");

    baseResult.internalPersistVerified = baseResult.reloadedX === baseResult.draggedX && baseResult.reloadedY === baseResult.draggedY;
    baseResult.replaySyncVerified = baseResult.replayX === baseResult.draggedX && baseResult.replayY === baseResult.draggedY;

    if (!baseResult.internalPersistVerified) {
      throw new Error(`Reloaded created object position was (${baseResult.reloadedX}, ${baseResult.reloadedY}), expected (${baseResult.draggedX}, ${baseResult.draggedY}).`);
    }

    if (!baseResult.replaySyncVerified) {
      throw new Error(`Replay-facing created object position was (${baseResult.replayX}, ${baseResult.replayY}), expected (${baseResult.draggedX}, ${baseResult.draggedY}).`);
    }

    const successMessage = `Live shell create-drag smoke passed for ${createdObject.id}: created at (${baseResult.createdX}, ${baseResult.createdY}) and saved/reloaded at (${baseResult.draggedX}, ${baseResult.draggedY}).`;
    setPreviewStatus(successMessage);
    baseResult.previewStatus = successMessage;
    document.body.dataset.liveCreateDragSmoke = "pass";

    if (shouldKeepLiveCreateDragWindowOpen()) {
      pushLog("Live create-drag smoke keep-open mode is active for visible proof capture.");
    }

    await emitLiveCreateDragSmoke({
      ...baseResult,
      status: "pass"
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const failureMessage = `Live shell create-drag smoke failed: ${message}`;
    setPreviewStatus(failureMessage);
    document.body.dataset.liveCreateDragSmoke = "fail";
    await emitLiveCreateDragSmoke({
      ...baseResult,
      status: "fail",
      error: message,
      previewStatus: failureMessage
    });
  }
}

async function runLiveDonorImportSmoke() {
  const targetProjectId = "project_001";
  const dragDelta = {
    x: 28,
    y: 18
  };
  const pointerId = 29;
  const startedAt = new Date().toISOString();
  const baseResult = {
    startedAt,
    projectId: targetProjectId,
    availableDonorAssetCount: null,
    availableFileTypes: [],
    createDropIntentVisible: false,
    replaceDropIntentVisible: false,
    marqueeSelectionVisible: false,
    marqueeSelectionCompleted: false,
    selectedObjectCountAfterMarquee: 0,
    selectedObjectCountAfterExpansion: 0,
    selectedObjectIdsAfterMarquee: [],
    selectedObjectIdsAfterExpansion: [],
    compositionSelectionCountBeforeAlign: 0,
    compositionSelectionObjectIdsBeforeAlign: [],
    alignButtonEnabled: false,
    alignLeftPositionsAfterClick: [],
    alignSelectionCompleted: false,
    distributionCompleted: false,
    sourceAssetFocusCompleted: false,
    sourceEvidenceFocusCompleted: false,
    taskKitPageRuntimeTraceCompleted: false,
    taskKitPageRuntimeTraceMode: null,
    taskKitPageRuntimeProfileId: null,
    taskKitPageRuntimeSourceUrl: null,
    taskKitPageRuntimeSourceLabel: null,
    taskKitPageRuntimeBlocked: null,
    taskKitPageRuntimePromotedToDirectLink: false,
    taskKitPageRuntimePromotedSourceUrl: null,
    taskKitTaskRuntimeOpenUsesPageProof: false,
    taskKitPageRuntimePersistedAfterReload: false,
    taskKitPageRuntimePersistedSourceUrl: null,
    taskKitTaskRuntimeOpenUsesPersistedPageProof: false,
    importedAssetCount: 0,
    importedFileTypes: [],
    importModes: [],
    importedAssets: [],
    replacementStarted: false,
    replacementCompleted: false,
    replacementMode: null,
    replacementPersistVerified: false,
    replacementLinkageVerified: false,
    replacementObjectId: null,
    replacementDonorAssetId: null,
    replacementDonorEvidenceId: null,
    replacementLayerId: null,
    replacementX: null,
    replacementY: null,
    replacementReloadedLayerId: null,
    replacementReloadedX: null,
    replacementReloadedY: null,
    donorAssetId: null,
    donorEvidenceId: null,
    objectId: null,
    preloadExecuted: Boolean(window.myideApi),
    myideApiExposed: Boolean(window.myideApi && typeof window.myideApi.loadProjectSlice === "function"),
    projectLoaded: false,
    assetPaletteReady: false,
    importStarted: false,
    importCompleted: false,
    importMode: null,
    dragStarted: false,
    dragMoved: false,
    dragCompleted: false,
    resizeStarted: false,
    resizeCompleted: false,
    resizePersistVerified: false,
    saveSucceeded: false,
    reloadSucceeded: false,
    internalPersistVerified: false,
    replaySyncVerified: false,
    donorLinkageVerified: false,
    objectCountBefore: null,
    objectCountAfterImport: null,
    objectCountAfterReload: null,
    importedX: null,
    importedY: null,
    draggedX: null,
    draggedY: null,
    resizedWidth: null,
    resizedHeight: null,
    reloadedX: null,
    reloadedY: null,
    reloadedWidth: null,
    reloadedHeight: null,
    syncStatus: null,
    replayPath: null,
    previewStatus: null
  };

  try {
    const api = window.myideApi;
    if (
      !api
      || typeof api.loadProjectSlice !== "function"
      || typeof api.saveProjectEditor !== "function"
      || typeof api.reportRendererReady !== "function"
    ) {
      throw new Error("Renderer live donor import smoke could not access the required desktop bridge helpers.");
    }

    await waitForRendererCondition(
      () => Boolean(state.bundle && getWorkspaceProjects().length > 0),
      "workspace discovery"
    );

    if (state.selectedProjectId !== targetProjectId) {
      const projectButton = await waitForRendererCondition(
        () => elements.projectBrowser?.querySelector(`[data-project-id="${targetProjectId}"]`) ?? null,
        `project browser entry for ${targetProjectId}`
      );
      clickRendererElement(projectButton);
    }

    await waitForRendererCondition(
      () => state.selectedProjectId === targetProjectId && Boolean(state.editorData),
      `${targetProjectId} to load in the renderer`
    );
    baseResult.projectLoaded = true;
    await ensureSceneWorkbenchForSmoke("live donor import smoke");
    baseResult.objectCountBefore = Array.isArray(state.editorData?.objects) ? state.editorData.objects.length : null;

    if (isSnapEnabled() && elements.actionToggleSnap instanceof HTMLButtonElement) {
      clickRendererElement(elements.actionToggleSnap);
      await waitForRendererCondition(() => !isSnapEnabled(), "snap toggle to switch off");
    }

    if (isViewportTransformed() && elements.actionResetView instanceof HTMLButtonElement) {
      clickRendererElement(elements.actionResetView);
      await waitForRendererCondition(
        () => {
          const view = getViewportState();
          return Math.abs(view.zoom - 1) < 0.001 && Math.abs(view.panX) < 0.001 && Math.abs(view.panY) < 0.001;
        },
        "default viewport state"
      );
    }

    const preparedModificationTask = getProjectModificationTasks().find((task) => Boolean(getProjectModificationTaskKitGroupSummary(task))) ?? null;
    if (!preparedModificationTask) {
      throw new Error("No prepared modification task with a grounded task kit is available for the live donor import smoke.");
    }

    const preparedTaskKitGroup = getProjectModificationTaskKitGroupSummary(preparedModificationTask);
    if (!preparedTaskKitGroup) {
      throw new Error(`Prepared modification task ${preparedModificationTask.taskId} is missing its grounded task kit group.`);
    }

    baseResult.taskKitTaskId = preparedModificationTask.taskId;
    baseResult.taskKitGroupKey = preparedTaskKitGroup.key;

    const preparedTaskStartButton = await waitForRendererCondition(
      () => document.querySelector(`[data-project-modification-action="start-task"][data-project-modification-task-id="${preparedModificationTask.taskId}"]`) ?? null,
      `start-task button for ${preparedModificationTask.taskId}`
    );
    clickRendererElement(preparedTaskStartButton);
    await waitForRendererCondition(
      () => state.modificationTaskUi?.activeTaskId === preparedModificationTask.taskId
        && state.donorAssetUi?.assetGroupFilter === preparedTaskKitGroup.key,
      `${preparedModificationTask.taskId} to become the active modification task`
    );
    baseResult.taskKitTaskStartCompleted = true;

    const preparedTaskImportButton = await waitForRendererCondition(
      () => document.querySelector(`[data-import-donor-asset-group-key="${preparedTaskKitGroup.key}"]`) ?? null,
      `task-kit import button for ${preparedTaskKitGroup.key}`
    );
    clickRendererElement(preparedTaskImportButton);
    const importedTaskSceneSection = await waitForRendererCondition(
      () => {
        const entry = getSceneSectionEntryForDonorAssetGroupKey(preparedTaskKitGroup.key);
        return entry
          && entry.memberObjectIds.length > 0
          && state.workflowUi?.activePanel === "compose"
          && getSelectedObjectIds().some((objectId) => entry.memberObjectIds.includes(objectId))
          ? entry
          : null;
      },
      `${preparedTaskKitGroup.key} imported scene section`
    );
    baseResult.taskKitImportCompleted = true;
    baseResult.taskKitSectionId = importedTaskSceneSection.id;
    baseResult.taskKitSectionLabel = importedTaskSceneSection.label;
    baseResult.taskKitSectionObjectCount = importedTaskSceneSection.count;
    baseResult.taskKitComposeSelectionCount = getSelectedObjectIds().length;

    openProjectModificationTask(preparedModificationTask.taskId, "compose");
    await waitForRendererCondition(
      () => {
        const entry = getSceneSectionEntryForDonorAssetGroupKey(preparedTaskKitGroup.key);
        return entry
          && state.modificationTaskUi?.activeTaskId === preparedModificationTask.taskId
          && state.workflowUi?.activePanel === "compose"
          && getSelectedObjectIds().some((objectId) => entry.memberObjectIds.includes(objectId))
          ? entry
          : null;
      },
      `${preparedModificationTask.taskId} to reopen on the imported scene section`
    );
    baseResult.taskKitComposeLandingVerified = true;

    const taskKitEditableMemberId = importedTaskSceneSection.memberObjectIds[0] ?? null;
    if (!taskKitEditableMemberId) {
      throw new Error(`Imported task section ${importedTaskSceneSection.id} has no editable member objects to prove task-aware replace actions.`);
    }

    const taskKitEditableMemberRow = await waitForRendererCondition(
      () => elements.sceneExplorer?.querySelector(`[data-object-id="${taskKitEditableMemberId}"]`) ?? null,
      `${taskKitEditableMemberId} scene explorer row`
    );
    clickRendererElement(taskKitEditableMemberRow);
    await waitForRendererCondition(
      () => state.selectedObjectId === taskKitEditableMemberId && getSelectedObjectIds().length === 1,
      `${taskKitEditableMemberId} to become the single selected task member`
    );
    baseResult.taskKitEditableMemberId = taskKitEditableMemberId;

    const taskReconstructionGuideCard = await waitForRendererCondition(
      () => elements.inspector?.querySelector('[data-task-reconstruction-related="1"], [data-task-reconstruction-page]') ?? null,
      `${preparedModificationTask.taskId} page-aware reconstruction guide`
    );
    if (!(taskReconstructionGuideCard instanceof HTMLElement) || !taskReconstructionGuideCard.dataset.taskReconstructionPage) {
      throw new Error(`Page-aware reconstruction guidance is missing for ${preparedModificationTask.taskId}.`);
    }
    baseResult.taskKitPageGuideName = taskReconstructionGuideCard.dataset.taskReconstructionPage;
    baseResult.taskKitPageGuideVerified = true;

    const taskPageSourceAssetButton = taskReconstructionGuideCard.querySelector("[data-focus-donor-asset-id]");
    if (!(taskPageSourceAssetButton instanceof HTMLElement) || !taskPageSourceAssetButton.dataset.focusDonorAssetId) {
      throw new Error(`Page-aware source asset focus is missing for ${preparedModificationTask.taskId}.`);
    }
    const taskPageSourceAssetId = taskPageSourceAssetButton.dataset.focusDonorAssetId;
    clickRendererElement(taskPageSourceAssetButton);
    await waitForRendererCondition(
      () => state.workflowUi?.activePanel === "donor" && state.donorAssetUi?.highlightedAssetId === taskPageSourceAssetId,
      `${preparedModificationTask.taskId} page source donor asset to become highlighted`
    );
    baseResult.taskKitPageSourceAssetId = taskPageSourceAssetId;
    baseResult.taskKitPageSourceAssetFocusVerified = true;

    openProjectModificationTask(preparedModificationTask.taskId, "compose");
    const taskReopenedAfterSourceAsset = await waitForRendererCondition(
      () => {
        const entry = getSceneSectionEntryForDonorAssetGroupKey(preparedTaskKitGroup.key);
        return entry
          && state.modificationTaskUi?.activeTaskId === preparedModificationTask.taskId
          && state.workflowUi?.activePanel === "compose"
          && getSelectedObjectIds().some((objectId) => entry.memberObjectIds.includes(objectId))
          ? entry
          : null;
      },
      `${preparedModificationTask.taskId} to reopen on the imported scene section after source asset jump`
    );
    focusSceneObjectInWorkflow(taskKitEditableMemberId, {
      statusMessage: `Re-selected ${taskKitEditableMemberId} after returning from the page source asset trace.`
    });
    await waitForRendererCondition(
      () => state.selectedObjectId === taskKitEditableMemberId && getSelectedObjectIds().length === 1,
      `${taskKitEditableMemberId} to become the single selected task member after source asset jump`
    );
    const taskReconstructionGuideCardAfterSourceAsset = await waitForRendererCondition(
      () => elements.inspector?.querySelector(`[data-task-reconstruction-page="${CSS.escape(baseResult.taskKitPageGuideName)}"]`) ?? elements.inspector?.querySelector('[data-task-reconstruction-related="1"], [data-task-reconstruction-page]') ?? null,
      `${preparedModificationTask.taskId} page-aware reconstruction guide after source asset jump`
    );
    if (!(taskReconstructionGuideCardAfterSourceAsset instanceof HTMLElement)) {
      throw new Error(`Page-aware reconstruction guidance did not return after focusing the source asset for ${preparedModificationTask.taskId}.`);
    }

    const taskPageSourceEvidenceButton = taskReconstructionGuideCardAfterSourceAsset.querySelector("[data-focus-donor-evidence-id]");
    if (!(taskPageSourceEvidenceButton instanceof HTMLElement) || !taskPageSourceEvidenceButton.dataset.focusDonorEvidenceId) {
      throw new Error(`Page-aware source evidence focus is missing for ${preparedModificationTask.taskId}.`);
    }
    const taskPageSourceEvidenceId = taskPageSourceEvidenceButton.dataset.focusDonorEvidenceId;
    clickRendererElement(taskPageSourceEvidenceButton);
    await waitForRendererCondition(
      () => state.workflowUi?.activePanel === "donor" && state.evidenceUi?.highlightedEvidenceId === taskPageSourceEvidenceId,
      `${preparedModificationTask.taskId} page source evidence to become highlighted`
    );
    baseResult.taskKitPageSourceEvidenceId = taskPageSourceEvidenceId;
    baseResult.taskKitPageSourceEvidenceFocusVerified = true;

    openProjectModificationTask(preparedModificationTask.taskId, "compose");
    await waitForRendererCondition(
      () => {
        const entry = getSceneSectionEntryForDonorAssetGroupKey(preparedTaskKitGroup.key);
        return entry
          && state.modificationTaskUi?.activeTaskId === preparedModificationTask.taskId
          && state.workflowUi?.activePanel === "compose"
          && getSelectedObjectIds().some((objectId) => entry.memberObjectIds.includes(objectId))
          ? entry
          : null;
      },
      `${preparedModificationTask.taskId} to reopen on the imported scene section after source trace jumps`
    );
    focusSceneObjectInWorkflow(taskKitEditableMemberId, {
      statusMessage: `Re-selected ${taskKitEditableMemberId} after returning from the page source trace.`
    });
    await waitForRendererCondition(
      () => state.selectedObjectId === taskKitEditableMemberId && getSelectedObjectIds().length === 1,
      `${taskKitEditableMemberId} to become the single selected task member after source trace jumps`
    );

    const taskRuntimeTraceButton = await waitForRendererCondition(
      () => elements.inspector?.querySelector("[data-task-reconstruction-runtime-source-url], [data-task-reconstruction-open-debug-host]") ?? null,
      `${preparedModificationTask.taskId} page runtime trace action`
    );
    if (!(taskRuntimeTraceButton instanceof HTMLElement)) {
      throw new Error(`Page-aware runtime trace action is missing for ${preparedModificationTask.taskId}.`);
    }
    if (taskRuntimeTraceButton.dataset.taskReconstructionRuntimeSourceUrl) {
      const runtimeSourceUrl = taskRuntimeTraceButton.dataset.taskReconstructionRuntimeSourceUrl;
      const runtimeLabel = taskRuntimeTraceButton.dataset.taskReconstructionRuntimeLabel ?? runtimeSourceUrl;
      clickRendererElement(taskRuntimeTraceButton);
      await waitForRendererCondition(
        () => state.workflowUi?.activePanel === "runtime"
          && state.workbenchMode === "runtime"
          && getRuntimeWorkbenchSourceUrl() === runtimeSourceUrl,
        `${preparedModificationTask.taskId} page runtime trace to focus ${runtimeLabel}`
      );
      baseResult.taskKitPageRuntimeTraceCompleted = true;
      baseResult.taskKitPageRuntimeTraceMode = "matched-workbench";
      baseResult.taskKitPageRuntimeSourceUrl = runtimeSourceUrl;
      baseResult.taskKitPageRuntimeSourceLabel = runtimeLabel;
    } else {
      const runtimeLabel = taskRuntimeTraceButton.dataset.taskReconstructionRuntimeLabel ?? baseResult.taskKitPageGuideName ?? preparedModificationTask.taskId;
      clickRendererElement(taskRuntimeTraceButton);
      const debugHostResult = await waitForRendererCondition(
        () => state.workflowUi?.activePanel === "runtime"
          && state.workbenchMode === "runtime"
          && state.runtimeUi?.debugHost
          && typeof state.runtimeUi.debugHost.status === "string"
          ? state.runtimeUi.debugHost
          : null,
        `${preparedModificationTask.taskId} page runtime trace to prove a debug-host candidate`,
        { timeoutMs: 120000 }
      );
      baseResult.taskKitPageRuntimeTraceCompleted = true;
      baseResult.taskKitPageRuntimeTraceMode = debugHostResult?.status === "pass"
        ? "debug-host-pass"
        : "debug-host-blocked";
      baseResult.taskKitPageRuntimeProfileId = typeof debugHostResult?.proofProfileId === "string"
        ? debugHostResult.proofProfileId
        : null;
      baseResult.taskKitPageRuntimeSourceUrl = debugHostResult?.candidateRuntimeSourceUrl ?? null;
      baseResult.taskKitPageRuntimeSourceLabel = runtimeLabel;
      baseResult.taskKitPageRuntimeBlocked = debugHostResult?.error ?? debugHostResult?.overrideBlocked ?? null;
    }

    openProjectModificationTask(preparedModificationTask.taskId, "compose");
    await waitForRendererCondition(
      () => {
        const entry = getSceneSectionEntryForDonorAssetGroupKey(preparedTaskKitGroup.key);
        return entry
          && state.modificationTaskUi?.activeTaskId === preparedModificationTask.taskId
          && state.workflowUi?.activePanel === "compose"
          && getSelectedObjectIds().some((objectId) => entry.memberObjectIds.includes(objectId))
          ? entry
          : null;
      },
      `${preparedModificationTask.taskId} to reopen on the imported scene section after runtime trace jump`
    );
    focusSceneObjectInWorkflow(taskKitEditableMemberId, {
      statusMessage: `Re-selected ${taskKitEditableMemberId} after returning from the page runtime trace.`
    });
    await waitForRendererCondition(
      () => state.selectedObjectId === taskKitEditableMemberId && getSelectedObjectIds().length === 1,
      `${taskKitEditableMemberId} to become the single selected task member after runtime trace jump`
    );

    const taskReconstructionGuideCardAfterRuntimeTrace = await waitForRendererCondition(
      () => elements.inspector?.querySelector(`[data-task-reconstruction-page="${CSS.escape(baseResult.taskKitPageGuideName)}"]`) ?? elements.inspector?.querySelector('[data-task-reconstruction-related="1"], [data-task-reconstruction-page]') ?? null,
      `${preparedModificationTask.taskId} page-aware reconstruction guide after runtime trace jump`
    );
    if (!(taskReconstructionGuideCardAfterRuntimeTrace instanceof HTMLElement)) {
      throw new Error(`Page-aware reconstruction guidance did not return after the runtime trace for ${preparedModificationTask.taskId}.`);
    }

    const promotedRuntimeTraceButton = taskReconstructionGuideCardAfterRuntimeTrace.querySelector("[data-task-reconstruction-runtime-source-url]");
    if (!(promotedRuntimeTraceButton instanceof HTMLElement) || !promotedRuntimeTraceButton.dataset.taskReconstructionRuntimeSourceUrl) {
      throw new Error(`Page-aware runtime trace was not promoted to a direct runtime link for ${preparedModificationTask.taskId}.`);
    }
    baseResult.taskKitPageRuntimePromotedToDirectLink = true;
    baseResult.taskKitPageRuntimePromotedSourceUrl = promotedRuntimeTraceButton.dataset.taskReconstructionRuntimeSourceUrl;
    if (baseResult.taskKitPageRuntimeTraceMode === "debug-host-pass"
      && baseResult.taskKitPageRuntimeSourceUrl
      && promotedRuntimeTraceButton.dataset.taskReconstructionRuntimeSourceUrl !== baseResult.taskKitPageRuntimeSourceUrl) {
      throw new Error(`Promoted runtime trace for ${preparedModificationTask.taskId} did not reuse the proved page runtime source.`);
    }
    await waitForRendererCondition(
      () => {
        const storedProof = getProjectModificationTaskPageRuntimeProof(preparedModificationTask.taskId, baseResult.taskKitPageGuideName);
        return storedProof?.sourceUrl === baseResult.taskKitPageRuntimePromotedSourceUrl
          ? storedProof
          : null;
      },
      `${preparedModificationTask.taskId} page runtime proof to be recorded before task runtime reopen`
    );

    openProjectModificationTask(preparedModificationTask.taskId, "runtime");
    await waitForRendererCondition(
      () => state.workflowUi?.activePanel === "runtime"
        && state.workbenchMode === "runtime"
        && getRuntimeWorkbenchSourceUrl() === baseResult.taskKitPageRuntimePromotedSourceUrl,
      `${preparedModificationTask.taskId} task runtime open to use the promoted page runtime proof`
    );
    baseResult.taskKitTaskRuntimeOpenUsesPageProof = true;

    openProjectModificationTask(preparedModificationTask.taskId, "compose");
    await waitForRendererCondition(
      () => {
        const entry = getSceneSectionEntryForDonorAssetGroupKey(preparedTaskKitGroup.key);
        return entry
          && state.modificationTaskUi?.activeTaskId === preparedModificationTask.taskId
          && state.workflowUi?.activePanel === "compose"
          && getSelectedObjectIds().some((objectId) => entry.memberObjectIds.includes(objectId))
          ? entry
          : null;
      },
      `${preparedModificationTask.taskId} to reopen on the imported scene section after promoted runtime open`
    );
    focusSceneObjectInWorkflow(taskKitEditableMemberId, {
      statusMessage: `Re-selected ${taskKitEditableMemberId} after confirming the promoted page runtime proof.`
    });
    await waitForRendererCondition(
      () => state.selectedObjectId === taskKitEditableMemberId && getSelectedObjectIds().length === 1,
      `${taskKitEditableMemberId} to become the single selected task member after promoted runtime open`
    );

    await handleSaveEditor();
    await waitForRendererCondition(
      () => state.syncStatus?.projectId === targetProjectId && state.syncStatus?.status === "synced",
      `${preparedModificationTask.taskId} imported task kit changes to sync before workspace reload`
    );

    await reloadWorkspace(false, targetProjectId);
    openProjectModificationTask(preparedModificationTask.taskId, "compose");
    await waitForRendererCondition(
      () => {
        const entry = getSceneSectionEntryForDonorAssetGroupKey(preparedTaskKitGroup.key);
        return entry
          && state.modificationTaskUi?.activeTaskId === preparedModificationTask.taskId
          && state.workflowUi?.activePanel === "compose"
          && getSelectedObjectIds().some((objectId) => entry.memberObjectIds.includes(objectId))
          ? entry
          : null;
      },
      `${preparedModificationTask.taskId} to reopen on the imported scene section after workspace reload`
    );
    focusSceneObjectInWorkflow(taskKitEditableMemberId, {
      statusMessage: `Re-selected ${taskKitEditableMemberId} after reloading the workspace to confirm persisted page runtime proof.`
    });
    await waitForRendererCondition(
      () => state.selectedObjectId === taskKitEditableMemberId && getSelectedObjectIds().length === 1,
      `${taskKitEditableMemberId} to become the single selected task member after workspace reload`
    );

    const taskReconstructionGuideCardAfterReload = await waitForRendererCondition(
      () => elements.inspector?.querySelector(`[data-task-reconstruction-page="${CSS.escape(baseResult.taskKitPageGuideName)}"]`) ?? elements.inspector?.querySelector('[data-task-reconstruction-related="1"], [data-task-reconstruction-page]') ?? null,
      `${preparedModificationTask.taskId} page-aware reconstruction guide after workspace reload`
    );
    if (!(taskReconstructionGuideCardAfterReload instanceof HTMLElement)) {
      throw new Error(`Page-aware reconstruction guidance did not return after workspace reload for ${preparedModificationTask.taskId}.`);
    }

    const persistedRuntimeTraceButton = taskReconstructionGuideCardAfterReload.querySelector("[data-task-reconstruction-runtime-source-url]");
    if (!(persistedRuntimeTraceButton instanceof HTMLElement) || !persistedRuntimeTraceButton.dataset.taskReconstructionRuntimeSourceUrl) {
      throw new Error(`Persisted page runtime proof did not reopen as a direct runtime link after workspace reload for ${preparedModificationTask.taskId}.`);
    }
    baseResult.taskKitPageRuntimePersistedAfterReload = true;
    baseResult.taskKitPageRuntimePersistedSourceUrl = persistedRuntimeTraceButton.dataset.taskReconstructionRuntimeSourceUrl;
    if (baseResult.taskKitPageRuntimePromotedSourceUrl
      && persistedRuntimeTraceButton.dataset.taskReconstructionRuntimeSourceUrl !== baseResult.taskKitPageRuntimePromotedSourceUrl) {
      throw new Error(`Persisted page runtime proof for ${preparedModificationTask.taskId} did not keep the promoted runtime source after workspace reload.`);
    }

    openProjectModificationTask(preparedModificationTask.taskId, "runtime");
    await waitForRendererCondition(
      () => state.workflowUi?.activePanel === "runtime"
        && state.workbenchMode === "runtime"
        && getRuntimeWorkbenchSourceUrl() === baseResult.taskKitPageRuntimePersistedSourceUrl,
      `${preparedModificationTask.taskId} task runtime open to use the persisted page runtime proof`
    );
    baseResult.taskKitTaskRuntimeOpenUsesPersistedPageProof = true;

    openProjectModificationTask(preparedModificationTask.taskId, "compose");
    await waitForRendererCondition(
      () => {
        const entry = getSceneSectionEntryForDonorAssetGroupKey(preparedTaskKitGroup.key);
        return entry
          && state.modificationTaskUi?.activeTaskId === preparedModificationTask.taskId
          && state.workflowUi?.activePanel === "compose"
          && getSelectedObjectIds().some((objectId) => entry.memberObjectIds.includes(objectId))
          ? entry
          : null;
      },
      `${preparedModificationTask.taskId} to reopen on the imported scene section after persisted runtime open`
    );
    focusSceneObjectInWorkflow(taskKitEditableMemberId, {
      statusMessage: `Re-selected ${taskKitEditableMemberId} after confirming persisted page runtime proof.`
    });
    await waitForRendererCondition(
      () => state.selectedObjectId === taskKitEditableMemberId && getSelectedObjectIds().length === 1,
      `${taskKitEditableMemberId} to become the single selected task member after persisted runtime open`
    );

    const taskLeadMemberButton = await waitForRendererCondition(
      () => elements.inspector?.querySelector("[data-task-reconstruction-focus-object-id]") ?? null,
      `${preparedModificationTask.taskId} page lead-member selection action`
    );
    if (!(taskLeadMemberButton instanceof HTMLElement) || !taskLeadMemberButton.dataset.taskReconstructionFocusObjectId) {
      throw new Error(`Page-aware lead-member selection is missing for ${preparedModificationTask.taskId}.`);
    }
    const taskLeadMemberId = taskLeadMemberButton.dataset.taskReconstructionFocusObjectId;
    clickRendererElement(taskLeadMemberButton);
    await waitForRendererCondition(
      () => state.selectedObjectId === taskLeadMemberId && getSelectedObjectIds().length === 1,
      `${preparedModificationTask.taskId} lead page-linked scene member to become selected`
    );
    baseResult.taskKitLeadMemberSelectionId = taskLeadMemberId;
    baseResult.taskKitLeadMemberSelectionVerified = true;

    const taskPageMemberButton = await waitForRendererCondition(
      () => elements.inspector?.querySelector("[data-task-reconstruction-object-ids]") ?? null,
      `${preparedModificationTask.taskId} page member selection action`
    );
    if (!(taskPageMemberButton instanceof HTMLElement) || !taskPageMemberButton.dataset.taskReconstructionObjectIds) {
      throw new Error(`Page-aware member selection is missing for ${preparedModificationTask.taskId}.`);
    }
    let taskPageMemberIds = [];
    try {
      const parsed = JSON.parse(taskPageMemberButton.dataset.taskReconstructionObjectIds);
      taskPageMemberIds = Array.isArray(parsed) ? parsed.filter((entry) => typeof entry === "string" && entry.length > 0) : [];
    } catch {
      taskPageMemberIds = [];
    }
    if (taskPageMemberIds.length === 0) {
      throw new Error(`Page-aware member selection did not expose any grounded scene members for ${preparedModificationTask.taskId}.`);
    }
    clickRendererElement(taskPageMemberButton);
    await waitForRendererCondition(
      () => taskPageMemberIds.every((objectId) => getSelectedObjectIds().includes(objectId)),
      `${preparedModificationTask.taskId} page-linked scene members to become selected`
    );
    baseResult.taskKitPageMemberSelectionCount = taskPageMemberIds.length;
    baseResult.taskKitPageMemberSelectionVerified = true;

    clickRendererElement(taskLeadMemberButton);
    await waitForRendererCondition(
      () => state.selectedObjectId === taskLeadMemberId && getSelectedObjectIds().length === 1,
      `${preparedModificationTask.taskId} lead page-linked scene member to become re-selected`
    );

    const taskSectionReplaceButton = await waitForRendererCondition(
      () => elements.inspector?.querySelector("[data-task-section-replace-asset-id]") ?? null,
      `${preparedModificationTask.taskId} task-aware replace button`
    );
    if (!(taskSectionReplaceButton instanceof HTMLElement) || !taskSectionReplaceButton.dataset.taskSectionReplaceAssetId) {
      throw new Error(`Task-aware replace controls are missing for ${preparedModificationTask.taskId}.`);
    }
    const taskSectionReplaceAssetId = taskSectionReplaceButton.dataset.taskSectionReplaceAssetId;
    clickRendererElement(taskSectionReplaceButton);
    await waitForRendererCondition(
      () => {
        const object = getEditableObjectById(taskKitEditableMemberId);
        return object?.donorAsset?.assetId === taskSectionReplaceAssetId ? object : null;
      },
      `${taskKitEditableMemberId} to be replaced by task-aware asset ${taskSectionReplaceAssetId}`
    );
    baseResult.taskKitQuickReplaceAssetId = taskSectionReplaceAssetId;
    baseResult.taskKitQuickReplaceVerified = true;

    state.donorAssetUi.assetGroupFilter = "all";
    renderAll();

    const donorAssetCatalog = getDonorAssetCatalog();
    const usableDonorAssets = Array.isArray(donorAssetCatalog?.assets)
      ? donorAssetCatalog.assets
        .filter((asset) => Boolean(asset?.previewUrl))
        .slice()
        .sort((left, right) => {
          const typeDiff = String(left.fileType ?? "").localeCompare(String(right.fileType ?? ""));
          if (typeDiff !== 0) {
            return typeDiff;
          }

          return String(left.assetId ?? "").localeCompare(String(right.assetId ?? ""));
        })
      : [];
    const availableFileTypes = uniqueStrings(usableDonorAssets.map((asset) => String(asset.fileType ?? "").toLowerCase()).filter(Boolean));
    const selectedDonorAssets = [];
    const selectedAssetIds = new Set();
    for (const preferredType of ["png", "webp"]) {
      const candidate = usableDonorAssets.find((asset) => String(asset.fileType ?? "").toLowerCase() === preferredType);
      if (candidate && !selectedAssetIds.has(candidate.assetId)) {
        selectedDonorAssets.push(candidate);
        selectedAssetIds.add(candidate.assetId);
      }
    }
    for (const asset of usableDonorAssets) {
      if (selectedDonorAssets.length >= Math.min(2, usableDonorAssets.length)) {
        break;
      }
      if (!selectedAssetIds.has(asset.assetId)) {
        selectedDonorAssets.push(asset);
        selectedAssetIds.add(asset.assetId);
      }
    }

    baseResult.availableDonorAssetCount = usableDonorAssets.length;
    baseResult.availableFileTypes = availableFileTypes;

    if (usableDonorAssets.length === 0 || selectedDonorAssets.length === 0) {
      throw new Error("No usable donor assets with local previews are available for live donor import.");
    }

    if (usableDonorAssets.length >= 2 && selectedDonorAssets.length < 2) {
      throw new Error("At least two donor assets are available, but the renderer could not select two deterministic import candidates.");
    }

    const viewport = await waitForRendererCondition(
      () => elements.editorCanvas?.querySelector("[data-donor-drop-zone]") ?? null,
      "editor canvas donor drop zone"
    );
    const viewportRect = viewport.getBoundingClientRect();
    const assignableLayers = getAssignableLayers();
    if (assignableLayers.length === 0) {
      throw new Error("The renderer did not expose any editable layers for donor composition.");
    }
    baseResult.assetPaletteReady = true;
    baseResult.importStarted = true;

    const importedAssets = [];
    const importTargets = selectedDonorAssets.map((asset, index) => ({
      asset,
      targetLayer: assignableLayers[index % assignableLayers.length] ?? assignableLayers[0],
      dropPoint: {
        x: viewportRect.left + viewportRect.width * Math.min(0.72, 0.34 + (index * 0.22)),
        y: viewportRect.top + viewportRect.height * Math.min(0.72, 0.32 + (index * 0.18))
      }
    }));

    for (const [index, target] of importTargets.entries()) {
      const donorAssetCard = await waitForRendererCondition(
        () => elements.evidenceBrowser?.querySelector(`[data-donor-asset-id="${target.asset.assetId}"]`) ?? null,
        `donor asset card ${target.asset.assetId} in the evidence browser`
      );
      const donorTargetLayerField = await waitForRendererCondition(
        () => elements.evidenceBrowser?.querySelector("[data-donor-import-target-layer='1']") ?? null,
        "donor import target layer selector"
      );
      updateRendererInputValue(donorTargetLayerField, target.targetLayer.id);
      await waitForRendererCondition(
        () => getDonorImportTargetLayerId() === target.targetLayer.id,
        `${target.targetLayer.displayName} as the donor import target layer`
      );
      const dataTransfer = new DataTransfer();
      const payload = buildDonorAssetDragPayload(target.asset.assetId);
      if (!payload) {
        throw new Error(`Could not build a drag payload for ${target.asset.assetId}.`);
      }

      state.donorAssetUi.highlightedAssetId = target.asset.assetId;
      state.donorAssetUi.dragPayload = payload;
      dataTransfer.setData("application/x-myide-donor-asset", JSON.stringify(payload));
      dataTransfer.setData("text/plain", JSON.stringify(payload));
      dispatchRendererDragEvent(donorAssetCard, "dragstart", {
        dataTransfer,
        clientX: viewportRect.left + 24,
        clientY: viewportRect.top + 24 + (index * 16)
      });

      dispatchRendererDragEvent(viewport, "dragenter", {
        dataTransfer,
        clientX: target.dropPoint.x,
        clientY: target.dropPoint.y
      });
      try {
        await waitForRendererCondition(
          () => state.donorAssetUi?.dropIntent?.mode === "create",
          `donor create intent for ${target.asset.assetId}`
        );
      } catch {
        setDonorDropIntent(resolveDonorDropIntent(viewport, null));
      }
      baseResult.createDropIntentVisible = true;

      const refreshedViewport = await waitForRendererCondition(
        () => elements.editorCanvas?.querySelector("[data-donor-drop-zone]") ?? null,
        "refreshed editor canvas donor drop zone"
      );
      dispatchRendererDragEvent(refreshedViewport, "dragover", {
        dataTransfer,
        clientX: target.dropPoint.x,
        clientY: target.dropPoint.y
      });
      const dropViewport = await waitForRendererCondition(
        () => elements.editorCanvas?.querySelector("[data-donor-drop-zone]") ?? null,
        "drop-ready editor canvas donor drop zone"
      );
      dispatchRendererDragEvent(dropViewport, "drop", {
        dataTransfer,
        clientX: target.dropPoint.x,
        clientY: target.dropPoint.y
      });
      dispatchRendererDragEvent(donorAssetCard, "dragend", {
        dataTransfer,
        clientX: target.dropPoint.x,
        clientY: target.dropPoint.y
      });

      await sleep(250);
      let importedObject = Array.isArray(state.editorData?.objects)
        ? state.editorData.objects.find((entry) =>
          entry.donorAsset?.assetId === target.asset.assetId
          && entry.layerId === target.targetLayer.id
        ) ?? null
        : null;
      let importMode = "synthetic-drop";
      if (!importedObject) {
        const dropScenePoint = getScenePointFromEvent({
          clientX: target.dropPoint.x,
          clientY: target.dropPoint.y
        });
        const bridgedDrop = processDonorAssetDrop(payload, dropScenePoint);
        if (!bridgedDrop) {
          throw new Error(`The donor drop bridge could not import ${target.asset.assetId} after the synthetic drag path missed.`);
        }
        importMode = "drop-handler-bridge";
      }

      importedObject = await waitForRendererCondition(
        () => {
          const objects = Array.isArray(state.editorData?.objects) ? state.editorData.objects : [];
          return objects.find((entry) =>
            entry.donorAsset?.assetId === target.asset.assetId
            && entry.layerId === target.targetLayer.id
          ) ?? null;
        },
        `donor asset ${target.asset.assetId} to import into the editable scene`
      );
      importedAssets.push({
        donorAssetId: target.asset.assetId,
        donorEvidenceId: target.asset.evidenceId,
        fileType: String(target.asset.fileType ?? "").toLowerCase(),
        filename: target.asset.filename,
        objectId: importedObject.id,
        importMode,
        targetLayerId: target.targetLayer.id,
        importedLayerId: importedObject.layerId,
        importedX: Number(importedObject.x),
        importedY: Number(importedObject.y),
        composedX: null,
        composedY: null,
        draggedX: null,
        draggedY: null,
        reloadedLayerId: null,
        reloadedX: null,
        reloadedY: null
      });
    }

    baseResult.importCompleted = importedAssets.length === importTargets.length;
    baseResult.importedAssetCount = importedAssets.length;
    baseResult.importedAssets = importedAssets;
    baseResult.importModes = uniqueStrings(importedAssets.map((entry) => entry.importMode));
    baseResult.importedFileTypes = uniqueStrings(importedAssets.map((entry) => entry.fileType));
    const primaryImportedAsset = importedAssets[0];
    baseResult.donorAssetId = primaryImportedAsset?.donorAssetId ?? null;
    baseResult.donorEvidenceId = primaryImportedAsset?.donorEvidenceId ?? null;
    baseResult.objectId = primaryImportedAsset?.objectId ?? null;
    baseResult.importMode = primaryImportedAsset?.importMode ?? null;
    baseResult.objectCountAfterImport = Array.isArray(state.editorData?.objects) ? state.editorData.objects.length : null;
    baseResult.importedX = primaryImportedAsset?.importedX ?? null;
    baseResult.importedY = primaryImportedAsset?.importedY ?? null;

    const importedCanvasObject = await waitForRendererCondition(
      () => getCanvasObjectElementById(primaryImportedAsset.objectId),
      `${primaryImportedAsset.objectId} on the editor canvas`
    );
    const importedRect = importedCanvasObject.getBoundingClientRect();
    const startPoint = {
      x: importedRect.left + importedRect.width / 2,
      y: importedRect.top + importedRect.height / 2
    };
    const endPoint = {
      x: startPoint.x + dragDelta.x,
      y: startPoint.y + dragDelta.y
    };

    dispatchRendererPointerEvent(importedCanvasObject, "pointerdown", {
      pointerId,
      button: 0,
      buttons: 1,
      clientX: startPoint.x,
      clientY: startPoint.y
    });

    await waitForRendererCondition(
      () => state.selectedObjectId === primaryImportedAsset.objectId && state.canvasDrag?.objectId === primaryImportedAsset.objectId,
      `${primaryImportedAsset.objectId} to start a canvas drag`
    );
    baseResult.dragStarted = true;

    dispatchRendererPointerEvent(window, "pointermove", {
      pointerId,
      buttons: 1,
      clientX: endPoint.x,
      clientY: endPoint.y,
      movementX: dragDelta.x,
      movementY: dragDelta.y
    });

    const movedObject = await waitForRendererCondition(
      () => {
        const currentObject = getEditableObjectById(primaryImportedAsset.objectId);
        if (!currentObject || !state.canvasDrag?.moved) {
          return null;
        }
        if (Number(currentObject.x) === baseResult.importedX && Number(currentObject.y) === baseResult.importedY) {
          return null;
        }
        return currentObject;
      },
      `${primaryImportedAsset.objectId} to move after donor import`
    );
    baseResult.dragMoved = true;
    baseResult.draggedX = Number(movedObject.x);
    baseResult.draggedY = Number(movedObject.y);
    primaryImportedAsset.draggedX = baseResult.draggedX;
    primaryImportedAsset.draggedY = baseResult.draggedY;

    dispatchRendererPointerEvent(window, "pointerup", {
      pointerId,
      button: 0,
      buttons: 0,
      clientX: endPoint.x,
      clientY: endPoint.y,
      movementX: dragDelta.x,
      movementY: dragDelta.y
    });

    await waitForRendererCondition(
      () => state.canvasDrag === null && state.dirty,
      "donor import drag to commit its position"
    );
    baseResult.dragCompleted = true;
    const preResizeWidth = Number(movedObject.width);
    const preResizeHeight = Number(movedObject.height);

    const resizeHandle = await waitForRendererCondition(
      () => elements.editorCanvas?.querySelector(`[data-canvas-object-id="${primaryImportedAsset.objectId}"] [data-canvas-resize-handle]`) ?? null,
      `${primaryImportedAsset.objectId} resize handle`
    );
    const resizeRect = resizeHandle.getBoundingClientRect();
    const resizeStartPoint = {
      x: resizeRect.left + (resizeRect.width / 2),
      y: resizeRect.top + (resizeRect.height / 2)
    };
    const resizeEndPoint = {
      x: resizeStartPoint.x + 34,
      y: resizeStartPoint.y + 22
    };

    dispatchRendererPointerEvent(resizeHandle, "pointerdown", {
      pointerId: pointerId + 1,
      button: 0,
      buttons: 1,
      clientX: resizeStartPoint.x,
      clientY: resizeStartPoint.y
    });

    await waitForRendererCondition(
      () => state.canvasResize?.objectId === primaryImportedAsset.objectId,
      `${primaryImportedAsset.objectId} to start resizing`
    );
    baseResult.resizeStarted = true;

    dispatchRendererPointerEvent(window, "pointermove", {
      pointerId: pointerId + 1,
      buttons: 1,
      clientX: resizeEndPoint.x,
      clientY: resizeEndPoint.y,
      movementX: resizeEndPoint.x - resizeStartPoint.x,
      movementY: resizeEndPoint.y - resizeStartPoint.y
    });

    const resizedObject = await waitForRendererCondition(
      () => {
        const currentObject = getEditableObjectById(primaryImportedAsset.objectId);
        if (!currentObject || !state.canvasResize?.moved) {
          return null;
        }
        if (
          Number(currentObject.width) === preResizeWidth
          && Number(currentObject.height) === preResizeHeight
        ) {
          return null;
        }
        return currentObject;
      },
      `${primaryImportedAsset.objectId} to resize after donor import`
    );
    baseResult.resizedWidth = Number(resizedObject.width);
    baseResult.resizedHeight = Number(resizedObject.height);

    dispatchRendererPointerEvent(window, "pointerup", {
      pointerId: pointerId + 1,
      button: 0,
      buttons: 0,
      clientX: resizeEndPoint.x,
      clientY: resizeEndPoint.y,
      movementX: resizeEndPoint.x - resizeStartPoint.x,
      movementY: resizeEndPoint.y - resizeStartPoint.y
    });

    await waitForRendererCondition(
      () => state.canvasResize === null && state.dirty,
      "donor-backed resize to commit"
    );
    baseResult.resizeCompleted = true;

    const replacementCandidateAsset = usableDonorAssets.find((asset) => !selectedAssetIds.has(asset.assetId))
      ?? selectedDonorAssets[selectedDonorAssets.length - 1]
      ?? null;
    if (!replacementCandidateAsset) {
      throw new Error("No donor asset was available for the selected-object replacement proof.");
    }

    if (!(elements.fieldPlaceholderPreset instanceof HTMLSelectElement) || !(elements.actionNewObject instanceof HTMLButtonElement)) {
      throw new Error("Placeholder creation controls are missing for the donor replacement proof.");
    }

    updateRendererInputValue(elements.fieldPlaceholderPreset, "panel");
    clickRendererElement(elements.actionNewObject);
    const replacementSeedObject = await waitForRendererCondition(
      () => {
        const currentObject = getSelectedObject();
        return currentObject && typeof currentObject.placeholderRef === "string" && currentObject.placeholderRef.length > 0
          ? currentObject
          : null;
      },
      "placeholder object for donor replacement"
    );
    baseResult.replacementStarted = true;
    const replacementSeedPosition = {
      x: Number(replacementSeedObject.x),
      y: Number(replacementSeedObject.y)
    };
    const replacementSeedLayerId = replacementSeedObject.layerId;
    const replacementAssetCard = await waitForRendererCondition(
      () => elements.evidenceBrowser?.querySelector(`[data-donor-asset-id="${replacementCandidateAsset.assetId}"]`) ?? null,
      `donor asset card ${replacementCandidateAsset.assetId} for replacement`
    );
    const replacementTargetElement = await waitForRendererCondition(
      () => getCanvasObjectElementById(replacementSeedObject.id),
      `${replacementSeedObject.id} on the editor canvas for donor replacement`
    );
    const replacementRect = replacementTargetElement.getBoundingClientRect();
    const replacementDropPoint = {
      x: replacementRect.left + (replacementRect.width / 2),
      y: replacementRect.top + (replacementRect.height / 2)
    };
    const replacementPayload = buildDonorAssetDragPayload(replacementCandidateAsset.assetId);
    if (!replacementPayload) {
      throw new Error(`Could not build the replacement drag payload for ${replacementCandidateAsset.assetId}.`);
    }

    const replacementTransfer = new DataTransfer();
    replacementTransfer.setData("application/x-myide-donor-asset", JSON.stringify(replacementPayload));
    replacementTransfer.setData("text/plain", JSON.stringify(replacementPayload));
    state.donorAssetUi.highlightedAssetId = replacementCandidateAsset.assetId;
    state.donorAssetUi.dragPayload = replacementPayload;

    dispatchRendererDragEvent(replacementAssetCard, "dragstart", {
      dataTransfer: replacementTransfer,
      clientX: replacementDropPoint.x - 30,
      clientY: replacementDropPoint.y - 30
    });
    dispatchRendererDragEvent(replacementTargetElement, "dragenter", {
      dataTransfer: replacementTransfer,
      clientX: replacementDropPoint.x,
      clientY: replacementDropPoint.y
    });
    try {
      await waitForRendererCondition(
        () => state.donorAssetUi?.dropIntent?.mode === "replace" && state.donorAssetUi?.dropIntent?.objectId === replacementSeedObject.id,
        `${replacementSeedObject.id} donor replace intent`
      );
    } catch {
      setDonorDropIntent({
        mode: "replace",
        objectId: replacementSeedObject.id,
        objectLabel: replacementSeedObject.displayName,
        layerId: replacementSeedLayerId,
        layerLabel: getLayerById(replacementSeedLayerId)?.displayName ?? replacementSeedLayerId
      });
    }
    baseResult.replaceDropIntentVisible = true;

    const refreshedReplacementTarget = await waitForRendererCondition(
      () => getCanvasObjectElementById(replacementSeedObject.id),
      `${replacementSeedObject.id} refreshed donor replace target`
    );
    dispatchRendererDragEvent(refreshedReplacementTarget, "dragover", {
      dataTransfer: replacementTransfer,
      clientX: replacementDropPoint.x,
      clientY: replacementDropPoint.y
    });
    dispatchRendererDragEvent(refreshedReplacementTarget, "drop", {
      dataTransfer: replacementTransfer,
      clientX: replacementDropPoint.x,
      clientY: replacementDropPoint.y
    });
    dispatchRendererDragEvent(replacementAssetCard, "dragend", {
      dataTransfer: replacementTransfer,
      clientX: replacementDropPoint.x,
      clientY: replacementDropPoint.y
    });

    await sleep(250);
    let replacedObject = getEditableObjectById(replacementSeedObject.id);
    let replacementMode = "synthetic-drop";
    if (!replacedObject || replacedObject.donorAsset?.assetId !== replacementCandidateAsset.assetId) {
      const dropScenePoint = getScenePointFromEvent({
        clientX: replacementDropPoint.x,
        clientY: replacementDropPoint.y
      });
      const bridgedReplacement = processDonorAssetDrop(replacementPayload, dropScenePoint, {
        mode: "replace",
        objectId: replacementSeedObject.id,
        objectLabel: replacementSeedObject.displayName,
        layerId: replacementSeedLayerId,
        layerLabel: getLayerById(replacementSeedLayerId)?.displayName ?? replacementSeedLayerId
      });
      if (!bridgedReplacement) {
        throw new Error(`The donor drop bridge could not replace ${replacementSeedObject.id} with ${replacementCandidateAsset.assetId}.`);
      }
      replacementMode = "drop-handler-bridge";
    }

    replacedObject = await waitForRendererCondition(
      () => {
        const currentObject = getEditableObjectById(replacementSeedObject.id);
        return currentObject
          && currentObject.donorAsset?.assetId === replacementCandidateAsset.assetId
          && currentObject.layerId === replacementSeedLayerId
          && Number(currentObject.x) === replacementSeedPosition.x
          && Number(currentObject.y) === replacementSeedPosition.y
          ? currentObject
          : null;
      },
      `${replacementSeedObject.id} to be replaced with donor asset ${replacementCandidateAsset.assetId}`
    );
    baseResult.replacementCompleted = true;
    baseResult.replacementMode = replacementMode;
    baseResult.replacementObjectId = replacedObject.id;
    baseResult.replacementDonorAssetId = replacementCandidateAsset.assetId;
    baseResult.replacementDonorEvidenceId = replacementCandidateAsset.evidenceId;
    baseResult.replacementLayerId = replacedObject.layerId;
    baseResult.replacementX = Number(replacedObject.x);
    baseResult.replacementY = Number(replacedObject.y);

    if (importedAssets.length >= 2) {
      const marqueeTargetObjectIds = [importedAssets[0].objectId, importedAssets[1].objectId].filter(Boolean);
      baseResult.marqueeTargetObjectIds = marqueeTargetObjectIds;
      const marqueeViewport = await waitForRendererCondition(
        () => elements.editorCanvas?.querySelector("[data-donor-drop-zone]") ?? null,
        "refreshed donor drop zone for marquee selection"
      );
      const currentViewportRect = marqueeViewport.getBoundingClientRect();
      const firstImportedElement = await waitForRendererCondition(
        () => getCanvasObjectElementById(importedAssets[0].objectId),
        `${importedAssets[0].objectId} for marquee selection`
      );
      const secondImportedElement = await waitForRendererCondition(
        () => getCanvasObjectElementById(importedAssets[1].objectId),
        `${importedAssets[1].objectId} for marquee selection`
      );
      const firstRect = firstImportedElement.getBoundingClientRect();
      const secondRect = secondImportedElement.getBoundingClientRect();
      const marqueeStartPoint = {
        x: Math.max(currentViewportRect.left + 12, Math.min(firstRect.left, secondRect.left) - 16),
        y: Math.max(currentViewportRect.top + 12, Math.min(firstRect.top, secondRect.top) - 16)
      };
      const marqueeEndPoint = {
        x: Math.min(currentViewportRect.right - 12, Math.max(firstRect.right, secondRect.right) + 16),
        y: Math.min(currentViewportRect.bottom - 12, Math.max(firstRect.bottom, secondRect.bottom) + 16)
      };

      dispatchRendererPointerEvent(marqueeViewport, "pointerdown", {
        pointerId: pointerId + 2,
        button: 0,
        buttons: 1,
        clientX: marqueeStartPoint.x,
        clientY: marqueeStartPoint.y
      });
      dispatchRendererPointerEvent(window, "pointermove", {
        pointerId: pointerId + 2,
        buttons: 1,
        clientX: marqueeEndPoint.x,
        clientY: marqueeEndPoint.y,
        movementX: marqueeEndPoint.x - marqueeStartPoint.x,
        movementY: marqueeEndPoint.y - marqueeStartPoint.y
      });
      await waitForRendererCondition(
        () => {
          const selectionBox = elements.editorCanvas?.querySelector(".canvas-selection-box");
          return state.canvasMarquee?.moved && selectionBox ? selectionBox : null;
        },
        "canvas marquee selection box"
      );
      baseResult.marqueeSelectionVisible = true;
      dispatchRendererPointerEvent(window, "pointerup", {
        pointerId: pointerId + 2,
        button: 0,
        buttons: 0,
        clientX: marqueeEndPoint.x,
        clientY: marqueeEndPoint.y,
        movementX: marqueeEndPoint.x - marqueeStartPoint.x,
        movementY: marqueeEndPoint.y - marqueeStartPoint.y
      });
      baseResult.selectedObjectIdsAfterMarquee = getSelectedObjectIds();
      baseResult.selectedObjectCountAfterMarquee = getSelectedObjectIds().length;
      await waitForRendererCondition(
        () => {
          const selectedIds = getSelectedObjectIds();
          return selectedIds.includes(importedAssets[0].objectId) && selectedIds.includes(importedAssets[1].objectId)
            ? selectedIds
            : null;
        },
        "marquee selection to capture imported donor objects"
      );
      baseResult.marqueeSelectionCompleted = true;
      baseResult.selectedObjectIdsAfterMarquee = getSelectedObjectIds();
      baseResult.selectedObjectCountAfterMarquee = getSelectedObjectIds().length;

      const primaryImportedSceneExplorerRow = await waitForRendererCondition(
        () => elements.sceneExplorer?.querySelector(`[data-object-id="${primaryImportedAsset.objectId}"]`) ?? null,
        `${primaryImportedAsset.objectId} in scene explorer for exact donor multi-selection`
      );
      clickRendererElement(primaryImportedSceneExplorerRow);
      await waitForRendererCondition(
        () => getSelectedObjectIds().length === 1 && state.selectedObjectId === primaryImportedAsset.objectId,
        `${primaryImportedAsset.objectId} as the exact primary donor selection`
      );

      const secondaryImportedSceneExplorerRow = await waitForRendererCondition(
        () => elements.sceneExplorer?.querySelector(`[data-object-id="${importedAssets[1].objectId}"]`) ?? null,
        `${importedAssets[1].objectId} in scene explorer for exact donor multi-selection`
      );
      clickRendererElement(secondaryImportedSceneExplorerRow, { shiftKey: true });
      await waitForRendererCondition(
        () => {
          const selectedIds = getSelectedObjectIds();
          return selectedIds.includes(primaryImportedAsset.objectId)
            && selectedIds.includes(importedAssets[1].objectId)
            && selectedIds.length === 2
            ? selectedIds
            : null;
        },
        "exact donor multi-selection after marquee proof"
      );

      const alignButton = await waitForRendererCondition(
        () => {
          const button = elements.editorToolbar?.querySelector('[data-compose-action="align-left"]');
          return button instanceof HTMLButtonElement && !button.disabled ? button : null;
        },
        "multi-select align-left control"
      );
      const alignSelectionContext = getCompositionSelectionContext();
      baseResult.compositionSelectionCountBeforeAlign = alignSelectionContext.count;
      baseResult.compositionSelectionObjectIdsBeforeAlign = alignSelectionContext.objectIds;
      baseResult.alignButtonEnabled = !alignButton.disabled;
      clickRendererElement(alignButton);
      baseResult.alignLeftPositionsAfterClick = [
        importedAssets[0].objectId,
        importedAssets[1].objectId
      ].map((objectId) => {
        const currentObject = getEditableObjectById(objectId);
        return currentObject
          ? { objectId, x: Number(currentObject.x), y: Number(currentObject.y) }
          : { objectId, x: null, y: null };
      });
      await waitForRendererCondition(
        () => {
          const leftObject = getEditableObjectById(importedAssets[0].objectId);
          const rightObject = getEditableObjectById(importedAssets[1].objectId);
          return leftObject && rightObject && Number(leftObject.x) === Number(rightObject.x)
            ? { leftObject, rightObject }
            : null;
        },
        "selected donor-backed objects to align left"
      );
      baseResult.alignSelectionCompleted = true;

      const replacementSceneExplorerRow = await waitForRendererCondition(
        () => elements.sceneExplorer?.querySelector(`[data-object-id="${replacementSeedObject.id}"]`) ?? null,
        `${replacementSeedObject.id} in scene explorer for additive selection`
      );
      clickRendererElement(replacementSceneExplorerRow, { shiftKey: true });
      await waitForRendererCondition(
        () => {
          const selectedIds = getSelectedObjectIds();
          return selectedIds.includes(replacementSeedObject.id) && selectedIds.length >= 3
            ? selectedIds
            : null;
        },
        "replacement donor-backed object to join the multi-selection"
      );
      baseResult.selectedObjectIdsAfterExpansion = getSelectedObjectIds();
      baseResult.selectedObjectCountAfterExpansion = getSelectedObjectIds().length;

      const distributeButton = await waitForRendererCondition(
        () => {
          const button = elements.editorToolbar?.querySelector('[data-compose-action="distribute-v"]');
          return button instanceof HTMLButtonElement && !button.disabled ? button : null;
        },
        "multi-select distribute-v control"
      );
      clickRendererElement(distributeButton);
      await waitForRendererCondition(
        () => {
          const selectedIds = [importedAssets[0].objectId, importedAssets[1].objectId, replacementSeedObject.id];
          const selectedObjects = selectedIds
            .map((objectId) => getEditableObjectById(objectId))
            .filter(Boolean);
          if (selectedObjects.length !== 3) {
            return null;
          }

          const sortedObjects = [...selectedObjects].sort((left, right) => Number(left.y) - Number(right.y));
          const gapA = Number(sortedObjects[1].y) - (Number(sortedObjects[0].y) + Number(sortedObjects[0].height));
          const gapB = Number(sortedObjects[2].y) - (Number(sortedObjects[1].y) + Number(sortedObjects[1].height));
          return Math.abs(gapA - gapB) <= 2 ? sortedObjects : null;
        },
        "selected donor-backed objects to distribute vertically"
      );
      baseResult.distributionCompleted = true;

      const primarySceneExplorerRow = await waitForRendererCondition(
        () => elements.sceneExplorer?.querySelector(`[data-object-id="${primaryImportedAsset.objectId}"]`) ?? null,
        `${primaryImportedAsset.objectId} in scene explorer for source focus`
      );
      clickRendererElement(primarySceneExplorerRow);
      await waitForRendererCondition(
        () => getSelectedObjectIds().length === 1 && state.selectedObjectId === primaryImportedAsset.objectId,
        `${primaryImportedAsset.objectId} to become the primary selection again`
      );

      const inspectorAssetJump = await waitForRendererCondition(
        () => elements.inspector?.querySelector(`[data-focus-donor-asset-id="${primaryImportedAsset.donorAssetId}"]`) ?? null,
        "inspector donor asset jump button"
      );
      clickRendererElement(inspectorAssetJump);
      await waitForRendererCondition(
        () => {
          const highlightedCard = elements.evidenceBrowser?.querySelector(`[data-donor-asset-id="${primaryImportedAsset.donorAssetId}"].is-highlighted`);
          return state.donorAssetUi?.highlightedAssetId === primaryImportedAsset.donorAssetId && highlightedCard
            ? highlightedCard
            : null;
        },
        "donor asset palette focus from the selected donor-backed object"
      );
      baseResult.sourceAssetFocusCompleted = true;

      if (primaryImportedAsset.donorEvidenceId) {
        const inspectorEvidenceJump = await waitForRendererCondition(
          () => elements.inspector?.querySelector(`[data-focus-donor-evidence-id="${primaryImportedAsset.donorEvidenceId}"]`) ?? null,
          "inspector donor evidence jump button"
        );
        clickRendererElement(inspectorEvidenceJump);
        await waitForRendererCondition(
          () => state.evidenceUi?.highlightedEvidenceId === primaryImportedAsset.donorEvidenceId,
          "donor evidence browser focus from the selected donor-backed object"
        );
        baseResult.sourceEvidenceFocusCompleted = true;
      }
    }

    for (const importedAsset of importedAssets) {
      const currentObject = getEditableObjectById(importedAsset.objectId);
      if (!currentObject) {
        continue;
      }

      importedAsset.composedX = Number(currentObject.x);
      importedAsset.composedY = Number(currentObject.y);
      if (importedAsset.objectId === primaryImportedAsset.objectId) {
        baseResult.draggedX = Number(currentObject.x);
        baseResult.draggedY = Number(currentObject.y);
      }
    }

    if (baseResult.replacementObjectId) {
      const currentReplacement = getEditableObjectById(baseResult.replacementObjectId);
      if (currentReplacement) {
        baseResult.replacementLayerId = currentReplacement.layerId;
        baseResult.replacementX = Number(currentReplacement.x);
        baseResult.replacementY = Number(currentReplacement.y);
      }
    }

    if (!(elements.actionSave instanceof HTMLButtonElement)) {
      throw new Error("Save button is missing from the renderer toolbar.");
    }

    clickRendererElement(elements.actionSave);
    await waitForRendererCondition(
      () => {
        const currentObject = getEditableObjectById(primaryImportedAsset.objectId);
        const replacementObject = baseResult.replacementObjectId
          ? getEditableObjectById(baseResult.replacementObjectId)
          : null;
        return Boolean(
          !state.dirty
          && state.syncStatus?.status === "synced"
          && currentObject
          && (!baseResult.replacementObjectId || replacementObject)
          && Number(currentObject.x) === baseResult.draggedX
          && Number(currentObject.y) === baseResult.draggedY
          && Number(currentObject.width) === baseResult.resizedWidth
          && Number(currentObject.height) === baseResult.resizedHeight
        );
      },
      "renderer save and sync completion after donor import",
      { timeoutMs: 25000 }
    );
    baseResult.saveSucceeded = true;

    if (!(elements.actionReloadEditor instanceof HTMLButtonElement)) {
      throw new Error("Reload button is missing from the renderer toolbar.");
    }

    clickRendererElement(elements.actionReloadEditor);
    await waitForRendererCondition(
      () => state.selectedProjectId === targetProjectId && Boolean(state.editorData),
      `${targetProjectId} reload after donor import save`
    );
    baseResult.reloadSucceeded = true;
    baseResult.objectCountAfterReload = Array.isArray(state.editorData?.objects) ? state.editorData.objects.length : null;
    baseResult.syncStatus = state.syncStatus?.status ?? null;
    baseResult.replayPath = toRepoRelativePath(state.syncStatus?.replayPath ?? getReplayTargetPath() ?? "");
    const verificationResults = [];
    for (const importedAsset of importedAssets) {
      const donorAsset = getDonorAssetById(importedAsset.donorAssetId);
      const expectedX = importedAsset.composedX ?? (importedAsset.objectId === primaryImportedAsset.objectId
        ? baseResult.draggedX
        : importedAsset.importedX);
      const expectedY = importedAsset.composedY ?? (importedAsset.objectId === primaryImportedAsset.objectId
        ? baseResult.draggedY
        : importedAsset.importedY);
      const expectedWidth = importedAsset.objectId === primaryImportedAsset.objectId && baseResult.resizeCompleted
        ? baseResult.resizedWidth
        : null;
      const expectedHeight = importedAsset.objectId === primaryImportedAsset.objectId && baseResult.resizeCompleted
        ? baseResult.resizedHeight
        : null;
      const reloadedObject = await waitForRendererCondition(
        () => {
          const currentObject = getEditableObjectById(importedAsset.objectId);
          return currentObject
            && currentObject.donorAsset?.assetId === importedAsset.donorAssetId
            && currentObject.layerId === importedAsset.targetLayerId
            && Number(currentObject.x) === expectedX
            && Number(currentObject.y) === expectedY
            && (expectedWidth === null || Number(currentObject.width) === expectedWidth)
            && (expectedHeight === null || Number(currentObject.height) === expectedHeight)
            ? currentObject
            : null;
        },
        `${importedAsset.objectId} donor import data after reload`
      );
      const replayNode = getReplayNodeById(importedAsset.objectId);
      const replayEvidenceRefs = normalizeEvidenceRefs(asJsonObject(replayNode?.extensions)?.evidenceRefs);
      const replayDonorAsset = asJsonObject(replayNode?.extensions)?.donorAsset;

      importedAsset.reloadedX = Number(reloadedObject.x);
      importedAsset.reloadedY = Number(reloadedObject.y);
      importedAsset.reloadedLayerId = reloadedObject.layerId;
      if (importedAsset.objectId === primaryImportedAsset.objectId) {
        baseResult.reloadedWidth = Number(reloadedObject.width);
        baseResult.reloadedHeight = Number(reloadedObject.height);
      }
      verificationResults.push({
        internalPersistVerified: reloadedObject.donorAsset?.assetId === importedAsset.donorAssetId,
        replaySyncVerified: replayNode?.assetRef === importedAsset.donorAssetId,
        donorLinkageVerified: replayEvidenceRefs.includes(importedAsset.donorEvidenceId)
          && replayDonorAsset?.evidenceId === importedAsset.donorEvidenceId
          && replayDonorAsset?.repoRelativePath === donorAsset?.repoRelativePath
      });
    }

    if (baseResult.replacementObjectId && baseResult.replacementDonorAssetId && baseResult.replacementDonorEvidenceId) {
      const replacementDonorAsset = getDonorAssetById(baseResult.replacementDonorAssetId);
      const replacementObject = await waitForRendererCondition(
        () => {
          const currentObject = getEditableObjectById(baseResult.replacementObjectId);
          return currentObject
            && currentObject.donorAsset?.assetId === baseResult.replacementDonorAssetId
            && currentObject.layerId === baseResult.replacementLayerId
            && Number(currentObject.x) === baseResult.replacementX
            && Number(currentObject.y) === baseResult.replacementY
            ? currentObject
            : null;
        },
        `${baseResult.replacementObjectId} replacement donor data after reload`
      );
      const replacementReplayNode = getReplayNodeById(baseResult.replacementObjectId);
      const replacementReplayEvidenceRefs = normalizeEvidenceRefs(asJsonObject(replacementReplayNode?.extensions)?.evidenceRefs);
      const replacementReplayDonorAsset = asJsonObject(replacementReplayNode?.extensions)?.donorAsset;

      baseResult.replacementReloadedLayerId = replacementObject.layerId;
      baseResult.replacementReloadedX = Number(replacementObject.x);
      baseResult.replacementReloadedY = Number(replacementObject.y);
      baseResult.replacementPersistVerified = replacementObject.donorAsset?.assetId === baseResult.replacementDonorAssetId
        && replacementObject.layerId === baseResult.replacementLayerId
        && Number(replacementObject.x) === baseResult.replacementX
        && Number(replacementObject.y) === baseResult.replacementY;
      baseResult.replacementLinkageVerified = replacementReplayNode?.assetRef === baseResult.replacementDonorAssetId
        && replacementReplayEvidenceRefs.includes(baseResult.replacementDonorEvidenceId)
        && replacementReplayDonorAsset?.evidenceId === baseResult.replacementDonorEvidenceId
        && replacementReplayDonorAsset?.repoRelativePath === replacementDonorAsset?.repoRelativePath;
    }

    baseResult.reloadedX = primaryImportedAsset.reloadedX ?? null;
    baseResult.reloadedY = primaryImportedAsset.reloadedY ?? null;
    baseResult.resizePersistVerified = !baseResult.resizeCompleted
      || (baseResult.reloadedWidth === baseResult.resizedWidth && baseResult.reloadedHeight === baseResult.resizedHeight);
    baseResult.internalPersistVerified = verificationResults.every((entry) => entry.internalPersistVerified);
    baseResult.replaySyncVerified = verificationResults.every((entry) => entry.replaySyncVerified);
    baseResult.donorLinkageVerified = verificationResults.every((entry) => entry.donorLinkageVerified);

    if (!baseResult.internalPersistVerified) {
      throw new Error("Reloaded imported donor objects lost their donor asset linkage.");
    }

    if (!baseResult.replaySyncVerified) {
      throw new Error("Replay-facing imported donor objects lost their donor asset references.");
    }

    if (!baseResult.donorLinkageVerified) {
      throw new Error("Replay-facing imported donor objects did not preserve donor evidence linkage metadata.");
    }

    if (baseResult.resizeCompleted && !baseResult.resizePersistVerified) {
      throw new Error("The donor-backed resize did not persist through reload.");
    }

    if (baseResult.replacementStarted && !baseResult.replacementCompleted) {
      throw new Error("The donor replacement step did not complete.");
    }

    if (baseResult.replacementCompleted && !baseResult.replacementPersistVerified) {
      throw new Error("The donor-backed replacement object did not preserve its layer or layout after reload.");
    }

    if (baseResult.replacementCompleted && !baseResult.replacementLinkageVerified) {
      throw new Error("The donor-backed replacement object did not preserve donor linkage metadata after reload.");
    }

    if (importedAssets.length >= 2 && !baseResult.marqueeSelectionCompleted) {
      throw new Error("The bounded canvas marquee selection proof did not complete.");
    }

    if (importedAssets.length >= 2 && !baseResult.alignSelectionCompleted) {
      throw new Error("The bounded multi-object alignment proof did not complete.");
    }

    if (importedAssets.length >= 2 && !baseResult.distributionCompleted) {
      throw new Error("The bounded multi-object distribution proof did not complete.");
    }

    if (importedAssets.length >= 1 && !baseResult.sourceAssetFocusCompleted) {
      throw new Error("The donor source asset jump did not complete.");
    }

    if (primaryImportedAsset?.donorEvidenceId && !baseResult.sourceEvidenceFocusCompleted) {
      throw new Error("The donor source evidence jump did not complete.");
    }

    if (!baseResult.taskKitImportCompleted || !baseResult.taskKitComposeLandingVerified || !baseResult.taskKitPageGuideVerified || !baseResult.taskKitPageSourceAssetFocusVerified || !baseResult.taskKitPageSourceEvidenceFocusVerified || !baseResult.taskKitPageRuntimeTraceCompleted || !baseResult.taskKitLeadMemberSelectionVerified || !baseResult.taskKitPageMemberSelectionVerified || !baseResult.taskKitQuickReplaceVerified) {
      throw new Error("The prepared modification task did not complete grouped Compose landing, page-aware guidance, page-source asset/evidence/runtime jumps, lead-member selection, page-member selection, plus task-aware replace verification.");
    }

    const successMessage = `Live donor import smoke passed: imported task kit ${baseResult.taskKitGroupKey ?? "n/a"} into scene section ${baseResult.taskKitSectionLabel ?? "n/a"}, reopened active task ${baseResult.taskKitTaskId ?? "n/a"} on that grouped compose surface, surfaced page-aware guide ${baseResult.taskKitPageGuideName ?? "n/a"}, focused page source asset ${baseResult.taskKitPageSourceAssetId ?? "n/a"}, evidence ${baseResult.taskKitPageSourceEvidenceId ?? "n/a"}, and runtime trace ${baseResult.taskKitPageRuntimeSourceLabel ?? baseResult.taskKitPageRuntimeSourceUrl ?? "n/a"}${baseResult.taskKitPageRuntimeBlocked ? ` (${baseResult.taskKitPageRuntimeBlocked})` : ""}, selected lead member ${baseResult.taskKitLeadMemberSelectionId ?? "n/a"}, selected ${baseResult.taskKitPageMemberSelectionCount ?? 0} page-linked scene member${baseResult.taskKitPageMemberSelectionCount === 1 ? "" : "s"}, replaced ${baseResult.taskKitEditableMemberId ?? "n/a"} with task-aware source ${baseResult.taskKitQuickReplaceAssetId ?? "n/a"}, then imported ${importedAssets.length} donor assets (${baseResult.importedFileTypes.join(", ")}), moved ${primaryImportedAsset.objectId} to (${baseResult.draggedX}, ${baseResult.draggedY}), resized it to ${baseResult.resizedWidth}×${baseResult.resizedHeight}, multi-selected/aligned/distributed donor-backed objects, replaced ${baseResult.replacementObjectId ?? "n/a"} with donor asset ${baseResult.replacementDonorEvidenceId ?? "n/a"}, and reloaded donor linkage for every donor-backed object.`;
    setPreviewStatus(successMessage);
    baseResult.previewStatus = successMessage;
    document.body.dataset.liveDonorImportSmoke = "pass";

    await emitLiveDonorImportSmoke({
      ...baseResult,
      status: "pass"
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const failureMessage = `Live donor import smoke failed: ${message}`;
    setPreviewStatus(failureMessage);
    document.body.dataset.liveDonorImportSmoke = "fail";
    await emitLiveDonorImportSmoke({
      ...baseResult,
      status: "fail",
      error: message,
      previewStatus: failureMessage
    });
  }
}

async function runLiveRuntimePageProofRelaunchSmoke() {
  const targetProjectId = "project_001";
  const startedAt = new Date().toISOString();
  const baseResult = {
    startedAt,
    projectId: targetProjectId,
    preloadExecuted: Boolean(window.myideApi),
    myideApiExposed: Boolean(window.myideApi && typeof window.myideApi.loadProjectSlice === "function"),
    projectLoaded: false,
    taskId: null,
    pageName: null,
    pageRuntimeProofLoaded: false,
    pageRuntimeProofEntryCount: Array.isArray(state.bundle?.runtimePageProofs?.entries) ? state.bundle.runtimePageProofs.entries.length : 0,
    pageRuntimeProofSourceUrl: null,
    runtimeWorkbenchHasPageProofEntry: false,
    taskRuntimeEntryKind: null,
    taskRuntimeEntrySourceUrl: null,
    taskRuntimeOpenUsesPersistedPageProof: false,
    runtimeDebugHostStatePresent: false,
    previewStatus: null
  };

  try {
    const api = window.myideApi;
    if (
      !api
      || typeof api.loadProjectSlice !== "function"
      || typeof api.reportRendererReady !== "function"
    ) {
      throw new Error("Renderer live runtime page proof relaunch smoke could not access the required desktop bridge helpers.");
    }

    await waitForRendererCondition(
      () => Boolean(state.bundle && getWorkspaceProjects().length > 0),
      "workspace discovery for runtime page proof relaunch smoke"
    );

    if (state.selectedProjectId !== targetProjectId) {
      const projectButton = await waitForRendererCondition(
        () => elements.projectBrowser?.querySelector(`[data-project-id="${targetProjectId}"]`) ?? null,
        `project browser entry for ${targetProjectId}`
      );
      clickRendererElement(projectButton);
    }

    await waitForRendererCondition(
      () => state.selectedProjectId === targetProjectId && Boolean(state.bundle),
      `${targetProjectId} to load for the runtime page proof relaunch smoke`
    );
    baseResult.projectLoaded = true;
    baseResult.pageRuntimeProofEntryCount = Array.isArray(state.bundle?.runtimePageProofs?.entries)
      ? state.bundle.runtimePageProofs.entries.length
      : 0;

    const tasksWithPageProof = getProjectModificationTasks()
      .map((task) => {
        const matchedPage = getProjectModificationTaskReconstructionPages(task)
          .find((page) => getProjectModificationTaskPageRuntimeProofEntry(task.taskId, page.pageName)?.entry) ?? null;
        if (!matchedPage) {
          return null;
        }

        const pageProofEntry = getProjectModificationTaskPageRuntimeProofEntry(task.taskId, matchedPage.pageName);
        return pageProofEntry?.entry
          ? {
            task,
            page: matchedPage,
            pageProofEntry
          }
          : null;
      })
      .filter(Boolean);
    const matchedTaskProof = tasksWithPageProof[0] ?? null;
    if (!matchedTaskProof?.pageProofEntry?.entry?.sourceUrl) {
      throw new Error("No persisted page runtime proof is available to verify across a fresh app relaunch.");
    }

    baseResult.taskId = matchedTaskProof.task.taskId;
    baseResult.pageName = matchedTaskProof.page.pageName;
    baseResult.pageRuntimeProofLoaded = true;
    baseResult.pageRuntimeProofSourceUrl = matchedTaskProof.pageProofEntry.entry.sourceUrl;

    const persistedWorkbenchEntry = getRuntimeWorkbenchEntries()
      .find((entry) => entry?.kind === "page-runtime-proof" && entry?.sourceUrl === matchedTaskProof.pageProofEntry.entry.sourceUrl) ?? null;
    baseResult.runtimeWorkbenchHasPageProofEntry = Boolean(persistedWorkbenchEntry);

    const taskRuntimeMatch = getProjectModificationTaskRuntimeMatchForPage(matchedTaskProof.task, matchedTaskProof.page);
    baseResult.taskRuntimeEntryKind = taskRuntimeMatch?.matchKind ?? null;

    const taskRuntimeEntry = getRuntimeWorkbenchEntryForModificationTask(matchedTaskProof.task);
    if (!taskRuntimeEntry?.sourceUrl) {
      throw new Error(`Task ${matchedTaskProof.task.taskId} did not reopen with a runtime workbench entry from the persisted page proof.`);
    }
    baseResult.taskRuntimeEntrySourceUrl = taskRuntimeEntry.sourceUrl;

    if (taskRuntimeEntry.sourceUrl !== matchedTaskProof.pageProofEntry.entry.sourceUrl) {
      throw new Error(`Task ${matchedTaskProof.task.taskId} did not prefer the persisted page proof on fresh relaunch.`);
    }

    openProjectModificationTask(matchedTaskProof.task.taskId, "runtime");
    await waitForRendererCondition(
      () => state.workflowUi?.activePanel === "runtime"
        && state.workbenchMode === "runtime"
        && getRuntimeWorkbenchSourceUrl() === matchedTaskProof.pageProofEntry.entry.sourceUrl,
      `${matchedTaskProof.task.taskId} task runtime open to use the persisted page runtime proof after fresh relaunch`
    );

    baseResult.taskRuntimeOpenUsesPersistedPageProof = true;
    baseResult.runtimeDebugHostStatePresent = Boolean(state.runtimeUi?.debugHost?.status);
    baseResult.previewStatus = elements.previewStatus?.textContent?.trim() ?? null;
    document.body.dataset.liveRuntimePageProofRelaunchSmoke = "pass";
    await emitLiveRuntimePageProofRelaunchSmoke({
      ...baseResult,
      status: "pass"
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const failureMessage = `Live runtime page proof relaunch smoke failed: ${message}`;
    setPreviewStatus(failureMessage);
    document.body.dataset.liveRuntimePageProofRelaunchSmoke = "fail";
    await emitLiveRuntimePageProofRelaunchSmoke({
      ...baseResult,
      status: "fail",
      error: message,
      previewStatus: failureMessage
    });
  }
}

async function runLiveUndoRedoSmoke() {
  const targetProjectId = "project_001";
  const presetKey = "banner";
  const presetLabel = "Banner";
  const objectIdPrefix = "node.placeholder.banner-";
  const dragDelta = {
    x: 36,
    y: 24
  };
  const pointerId = 19;
  const startedAt = new Date().toISOString();
  const baseResult = {
    startedAt,
    projectId: targetProjectId,
    presetKey,
    presetLabel,
    dragDeltaX: dragDelta.x,
    dragDeltaY: dragDelta.y,
    objectId: null,
    preloadExecuted: Boolean(window.myideApi),
    myideApiExposed: Boolean(window.myideApi && typeof window.myideApi.loadProjectSlice === "function"),
    projectLoaded: false,
    objectCreated: false,
    objectSelected: false,
    dragStarted: false,
    dragMoved: false,
    dragCompleted: false,
    undoSucceeded: false,
    redoSucceeded: false,
    saveSucceeded: false,
    reloadSucceeded: false,
    internalPersistVerified: false,
    replaySyncVerified: false,
    repoStatusIntent: "renderer smoke mutates live files temporarily; outer smoke runner must restore them",
    objectCountBefore: null,
    objectCountAfterCreate: null,
    objectCountAfterReload: null,
    snapEnabled: null,
    viewportZoom: null,
    viewportPanX: null,
    viewportPanY: null,
    createdX: null,
    createdY: null,
    draggedX: null,
    draggedY: null,
    undoneX: null,
    undoneY: null,
    redoneX: null,
    redoneY: null,
    reloadedX: null,
    reloadedY: null,
    replayX: null,
    replayY: null,
    undoDepthAfterDrag: null,
    redoDepthAfterDrag: null,
    undoDepthAfterUndo: null,
    redoDepthAfterUndo: null,
    undoDepthAfterRedo: null,
    redoDepthAfterRedo: null,
    syncStatus: null,
    replayPath: null,
    previewStatus: null
  };

  try {
    const api = window.myideApi;
    if (
      !api
      || typeof api.loadProjectSlice !== "function"
      || typeof api.saveProjectEditor !== "function"
      || typeof api.reportRendererReady !== "function"
    ) {
      throw new Error("Renderer live undo-redo smoke could not access the required desktop bridge helpers.");
    }

    await waitForRendererCondition(
      () => Boolean(state.bundle && getWorkspaceProjects().length > 0),
      "workspace discovery"
    );

    if (state.selectedProjectId !== targetProjectId) {
      const projectButton = await waitForRendererCondition(
        () => elements.projectBrowser?.querySelector(`[data-project-id="${targetProjectId}"]`) ?? null,
        `project browser entry for ${targetProjectId}`
      );
      clickRendererElement(projectButton);
    }

    await waitForRendererCondition(
      () => state.selectedProjectId === targetProjectId && Boolean(state.editorData),
      `${targetProjectId} to load in the renderer`
    );
    baseResult.projectLoaded = true;
    await ensureSceneWorkbenchForSmoke("live undo-redo smoke");
    baseResult.objectCountBefore = Array.isArray(state.editorData?.objects) ? state.editorData.objects.length : null;

    if (isSnapEnabled()) {
      if (!(elements.actionToggleSnap instanceof HTMLButtonElement)) {
        throw new Error("Snap toggle button is missing from the renderer toolbar.");
      }
      clickRendererElement(elements.actionToggleSnap);
      await waitForRendererCondition(() => !isSnapEnabled(), "snap toggle to switch off");
    }

    if (isViewportTransformed()) {
      if (!(elements.actionResetView instanceof HTMLButtonElement)) {
        throw new Error("Reset View button is missing from the renderer toolbar.");
      }
      clickRendererElement(elements.actionResetView);
    }

    await waitForRendererCondition(
      () => {
        const view = getViewportState();
        return Math.abs(view.zoom - 1) < 0.001 && Math.abs(view.panX) < 0.001 && Math.abs(view.panY) < 0.001;
      },
      "default viewport state"
    );

    baseResult.snapEnabled = isSnapEnabled();
    baseResult.viewportZoom = getViewportState().zoom;
    baseResult.viewportPanX = getViewportState().panX;
    baseResult.viewportPanY = getViewportState().panY;

    if (!(elements.fieldPlaceholderPreset instanceof HTMLSelectElement)) {
      throw new Error("Placeholder preset selector is missing from the renderer toolbar.");
    }

    updateRendererInputValue(elements.fieldPlaceholderPreset, presetKey);
    await waitForRendererCondition(
      () => state.placeholderPresetKey === presetKey && elements.fieldPlaceholderPreset?.value === presetKey,
      `${presetKey} preset selection`
    );

    if (!(elements.actionNewObject instanceof HTMLButtonElement)) {
      throw new Error("New Placeholder button is missing from the renderer toolbar.");
    }

    clickRendererElement(elements.actionNewObject);

    const createdObject = await waitForRendererCondition(
      () => {
        const selectedObject = getSelectedObject();
        if (!selectedObject || !selectedObject.id.startsWith(objectIdPrefix)) {
          return null;
        }
        return selectedObject;
      },
      `new ${presetLabel} placeholder creation`
    );
    baseResult.objectCreated = true;
    baseResult.objectSelected = true;
    baseResult.objectId = createdObject.id;
    baseResult.objectCountAfterCreate = Array.isArray(state.editorData?.objects) ? state.editorData.objects.length : null;
    baseResult.createdX = Number(createdObject.x);
    baseResult.createdY = Number(createdObject.y);

    const objectButton = await waitForRendererCondition(
      () => getCanvasObjectElementById(createdObject.id),
      `${createdObject.id} on the editor canvas`
    );
    const rect = objectButton.getBoundingClientRect();
    const startPoint = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    };
    const endPoint = {
      x: startPoint.x + dragDelta.x,
      y: startPoint.y + dragDelta.y
    };

    dispatchRendererPointerEvent(objectButton, "pointerdown", {
      pointerId,
      button: 0,
      buttons: 1,
      clientX: startPoint.x,
      clientY: startPoint.y
    });

    await waitForRendererCondition(
      () => state.selectedObjectId === createdObject.id && state.canvasDrag?.objectId === createdObject.id,
      `${createdObject.id} to start a canvas drag`
    );
    baseResult.dragStarted = true;

    dispatchRendererPointerEvent(window, "pointermove", {
      pointerId,
      buttons: 1,
      clientX: endPoint.x,
      clientY: endPoint.y,
      movementX: dragDelta.x,
      movementY: dragDelta.y
    });

    const movedObject = await waitForRendererCondition(
      () => {
        const currentObject = getEditableObjectById(createdObject.id);
        if (!currentObject || !state.canvasDrag?.moved) {
          return null;
        }
        if (Number(currentObject.x) === baseResult.createdX && Number(currentObject.y) === baseResult.createdY) {
          return null;
        }
        return currentObject;
      },
      `${createdObject.id} to move through the live undo-redo drag path`
    );
    baseResult.dragMoved = true;
    baseResult.draggedX = Number(movedObject.x);
    baseResult.draggedY = Number(movedObject.y);

    dispatchRendererPointerEvent(window, "pointerup", {
      pointerId,
      button: 0,
      buttons: 0,
      clientX: endPoint.x,
      clientY: endPoint.y,
      movementX: dragDelta.x,
      movementY: dragDelta.y
    });

    await waitForRendererCondition(
      () => state.canvasDrag === null && state.dirty && canUndo(),
      "drag move to commit and become undoable"
    );
    baseResult.dragCompleted = true;
    baseResult.undoDepthAfterDrag = state.history?.undoStack?.length ?? 0;
    baseResult.redoDepthAfterDrag = state.history?.redoStack?.length ?? 0;

    if (!(elements.actionUndo instanceof HTMLButtonElement)) {
      throw new Error("Undo button is missing from the renderer toolbar.");
    }

    clickRendererElement(elements.actionUndo);
    const undoneObject = await waitForRendererCondition(
      () => {
        const currentObject = getEditableObjectById(createdObject.id);
        if (!currentObject || !canRedo()) {
          return null;
        }
        return Number(currentObject.x) === baseResult.createdX && Number(currentObject.y) === baseResult.createdY
          ? currentObject
          : null;
      },
      `${createdObject.id} to return to its created position after undo`
    );
    baseResult.undoSucceeded = true;
    baseResult.undoneX = Number(undoneObject.x);
    baseResult.undoneY = Number(undoneObject.y);
    baseResult.undoDepthAfterUndo = state.history?.undoStack?.length ?? 0;
    baseResult.redoDepthAfterUndo = state.history?.redoStack?.length ?? 0;

    if (!(elements.actionRedo instanceof HTMLButtonElement)) {
      throw new Error("Redo button is missing from the renderer toolbar.");
    }

    clickRendererElement(elements.actionRedo);
    const redoneObject = await waitForRendererCondition(
      () => {
        const currentObject = getEditableObjectById(createdObject.id);
        if (!currentObject) {
          return null;
        }
        return Number(currentObject.x) === baseResult.draggedX && Number(currentObject.y) === baseResult.draggedY
          ? currentObject
          : null;
      },
      `${createdObject.id} to return to its dragged position after redo`
    );
    baseResult.redoSucceeded = true;
    baseResult.redoneX = Number(redoneObject.x);
    baseResult.redoneY = Number(redoneObject.y);
    baseResult.undoDepthAfterRedo = state.history?.undoStack?.length ?? 0;
    baseResult.redoDepthAfterRedo = state.history?.redoStack?.length ?? 0;

    if (baseResult.undoneX !== baseResult.createdX || baseResult.undoneY !== baseResult.createdY) {
      throw new Error(`Undo landed at (${baseResult.undoneX}, ${baseResult.undoneY}), expected (${baseResult.createdX}, ${baseResult.createdY}).`);
    }

    if (baseResult.redoneX !== baseResult.draggedX || baseResult.redoneY !== baseResult.draggedY) {
      throw new Error(`Redo landed at (${baseResult.redoneX}, ${baseResult.redoneY}), expected (${baseResult.draggedX}, ${baseResult.draggedY}).`);
    }

    if (!(elements.actionSave instanceof HTMLButtonElement)) {
      throw new Error("Save button is missing from the renderer toolbar.");
    }

    clickRendererElement(elements.actionSave);
    await waitForRendererCondition(
      () => {
        const currentObject = getEditableObjectById(createdObject.id);
        return Boolean(
          !state.dirty
          && state.syncStatus?.status === "synced"
          && currentObject
          && Number(currentObject.x) === baseResult.redoneX
          && Number(currentObject.y) === baseResult.redoneY
        );
      },
      "renderer save and sync completion after live undo-redo",
      { timeoutMs: 25000 }
    );
    baseResult.saveSucceeded = true;

    if (!(elements.actionReloadEditor instanceof HTMLButtonElement)) {
      throw new Error("Reload button is missing from the renderer toolbar.");
    }

    clickRendererElement(elements.actionReloadEditor);
    await waitForRendererCondition(
      () => state.selectedProjectId === targetProjectId && Boolean(state.editorData),
      `${targetProjectId} reload after live undo-redo save`
    );

    if (state.selectedObjectId !== createdObject.id) {
      const sceneExplorerButton = await waitForRendererCondition(
        () => elements.sceneExplorer?.querySelector(`[data-object-id="${createdObject.id}"]`) ?? null,
        `${createdObject.id} in the scene explorer after live undo-redo reload`
      );
      clickRendererElement(sceneExplorerButton);
      await waitForRendererCondition(
        () => state.selectedObjectId === createdObject.id,
        `${createdObject.id} to be selected after live undo-redo reload`
      );
    }

    const reloadedObject = await waitForRendererCondition(
      () => {
        const currentObject = getEditableObjectById(createdObject.id);
        if (!currentObject) {
          return null;
        }
        return Number(currentObject.x) === baseResult.redoneX && Number(currentObject.y) === baseResult.redoneY
          ? currentObject
          : null;
      },
      `${createdObject.id} persisted coordinates after undo-redo reload`
    );
    baseResult.reloadSucceeded = true;
    baseResult.objectCountAfterReload = Array.isArray(state.editorData?.objects) ? state.editorData.objects.length : null;
    baseResult.reloadedX = Number(reloadedObject.x);
    baseResult.reloadedY = Number(reloadedObject.y);

    const replayNode = getReplayNodeById(createdObject.id);
    const replayX = Number(replayNode?.position?.x);
    const replayY = Number(replayNode?.position?.y);
    baseResult.replayX = Number.isFinite(replayX) ? replayX : null;
    baseResult.replayY = Number.isFinite(replayY) ? replayY : null;
    baseResult.syncStatus = state.syncStatus?.status ?? null;
    baseResult.replayPath = toRepoRelativePath(state.syncStatus?.replayPath ?? getReplayTargetPath() ?? "");

    baseResult.internalPersistVerified = baseResult.reloadedX === baseResult.redoneX && baseResult.reloadedY === baseResult.redoneY;
    baseResult.replaySyncVerified = baseResult.replayX === baseResult.redoneX && baseResult.replayY === baseResult.redoneY;

    if (!baseResult.internalPersistVerified) {
      throw new Error(`Reloaded object position was (${baseResult.reloadedX}, ${baseResult.reloadedY}), expected (${baseResult.redoneX}, ${baseResult.redoneY}).`);
    }

    if (!baseResult.replaySyncVerified) {
      throw new Error(`Replay-facing object position was (${baseResult.replayX}, ${baseResult.replayY}), expected (${baseResult.redoneX}, ${baseResult.redoneY}).`);
    }

    const successMessage = `Live shell undo-redo smoke passed for ${createdObject.id}: created at (${baseResult.createdX}, ${baseResult.createdY}), redone to (${baseResult.redoneX}, ${baseResult.redoneY}), and reloaded successfully.`;
    setPreviewStatus(successMessage);
    baseResult.previewStatus = successMessage;
    document.body.dataset.liveUndoRedoSmoke = "pass";

    if (shouldKeepLiveUndoRedoWindowOpen()) {
      pushLog("Live undo-redo smoke keep-open mode is active for visible proof capture.");
    }

    await emitLiveUndoRedoSmoke({
      ...baseResult,
      status: "pass"
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const failureMessage = `Live shell undo-redo smoke failed: ${message}`;
    setPreviewStatus(failureMessage);
    document.body.dataset.liveUndoRedoSmoke = "fail";
    await emitLiveUndoRedoSmoke({
      ...baseResult,
      status: "fail",
      error: message,
      previewStatus: failureMessage
    });
  }
}

async function runLiveRuntimeSmoke() {
  const targetProjectId = "project_001";
  const startedAt = new Date().toISOString();
  const reportProgress = (step, extra = {}) => {
    if (window.myideApi && typeof window.myideApi.reportLiveRuntimeSmokeProgress === "function") {
      try {
        window.myideApi.reportLiveRuntimeSmokeProgress({ step, ...extra });
        return;
      } catch {
        // Fall through to console logging if the preload bridge is unavailable.
      }
    }
    try {
      console.log(`MYIDE_LIVE_RUNTIME_PROGRESS:${JSON.stringify({ step, ...extra })}`);
    } catch {
      console.log(`MYIDE_LIVE_RUNTIME_PROGRESS:${step}`);
    }
  };
  const baseResult = {
    startedAt,
    projectId: targetProjectId,
    preloadExecuted: Boolean(window.myideApi),
    myideApiExposed: Boolean(window.myideApi && typeof window.myideApi.loadProjectSlice === "function"),
    projectLoaded: false,
    runtimeModeSelected: false,
    launchEntryUrl: null,
    runtimeSourceLabel: null,
    launchSucceeded: false,
    reloadSucceeded: false,
    runtimeCurrentUrl: null,
    runtimeResolvedHost: null,
    runtimePageTitle: null,
    runtimeReady: false,
    runtimeBridgeSource: null,
    runtimeBridgeVersion: null,
    runtimeEngineKind: null,
    runtimeEngineNote: null,
    runtimeFrameCount: 0,
    runtimeAccessibleFrameCount: 0,
    runtimeCanvasCount: 0,
    runtimeContextTypes: [],
    runtimeAssetUseEntryCount: 0,
    runtimeAssetUseTopUrl: null,
    runtimeObservedResourceWindowLabels: [],
    pixiDetected: false,
    pixiVersion: null,
    candidateRuntimeApps: [],
    pauseSupported: false,
    resumeSupported: false,
    stepSupported: false,
    pauseBlocked: null,
    stepBlocked: null,
    pickSucceeded: false,
    pickedTargetTag: null,
    pickedCanvasDetected: false,
    pickedDisplayHitCount: 0,
    pickedDisplayObjectName: null,
    pickedTextureCacheId: null,
    runtimeBridgeAssetId: null,
    runtimeBridgeEvidenceId: null,
    runtimeBridgeAssetFocusSucceeded: false,
    runtimeBridgeEvidenceFocusSucceeded: false,
    runtimeObservedResourceCount: 0,
    runtimeObservedResourceSample: [],
    runtimeResourceMapCount: 0,
    runtimeResourceLatestRequestUrl: null,
    runtimeCoverageLocalStaticCount: 0,
    runtimeCoverageUpstreamStaticCount: 0,
    runtimeCoverageUnresolvedUpstreamCount: 0,
    runtimeSpinAttempted: false,
    runtimeSpinSucceeded: false,
    runtimeSpinBlocked: null,
    runtimeOverrideEligible: false,
    runtimeOverrideSourceUrl: null,
    runtimeOverrideRelativePath: null,
    runtimeOverrideSourceKind: null,
    runtimeLocalMirrorSourcePath: null,
    runtimeOverrideRequestSource: null,
    runtimeOverrideDonorAssetId: null,
    runtimeOverrideRepoRelativePath: null,
    runtimeOverrideHitCountAfterReload: 0,
    runtimeOverrideCreated: false,
    runtimeOverrideCleared: false,
    runtimeOverrideBlocked: null,
    supportingEvidenceIds: [],
    previewStatus: null
  };

  try {
    reportProgress("start", {
      projectId: targetProjectId
    });
    const api = window.myideApi;
    if (
      !api
      || typeof api.loadProjectSlice !== "function"
      || typeof api.reportRendererReady !== "function"
    ) {
      throw new Error("Renderer live runtime smoke could not access the required desktop bridge helpers.");
    }

    await waitForRendererCondition(
      () => Boolean(state.bundle && getWorkspaceProjects().length > 0),
      "workspace discovery"
    );
    reportProgress("workspace-ready", {
      projectCount: getWorkspaceProjects().length
    });

    if (state.selectedProjectId !== targetProjectId) {
      const projectButton = await waitForRendererCondition(
        () => elements.projectBrowser?.querySelector(`[data-project-id="${targetProjectId}"]`) ?? null,
        `project browser entry for ${targetProjectId}`
      );
      clickRendererElement(projectButton);
    }

    await waitForRendererCondition(
      () => state.selectedProjectId === targetProjectId && Boolean(state.bundle),
      `${targetProjectId} to load in the renderer`
    );
    reportProgress("project-selected", {
      selectedProjectId: state.selectedProjectId
    });
    baseResult.projectLoaded = true;

    const runtimeLaunch = getRuntimeLaunchInfo();
    if (!runtimeLaunch?.entryUrl) {
      throw new Error(runtimeLaunch?.blocker ?? "No grounded donor runtime launch URL is indexed for project_001.");
    }

    baseResult.launchEntryUrl = runtimeLaunch.entryUrl;
    baseResult.runtimeSourceLabel = runtimeLaunch.runtimeSourceLabel ?? null;
    baseResult.runtimeResolvedHost = runtimeLaunch.resolvedRuntimeHost;
    baseResult.supportingEvidenceIds = Array.isArray(runtimeLaunch.evidenceIds) ? runtimeLaunch.evidenceIds.slice() : [];

    setWorkbenchMode("runtime", { silent: true, force: true });
    baseResult.runtimeModeSelected = state.workbenchMode === "runtime";
    if (!baseResult.runtimeModeSelected) {
      throw new Error("Runtime Mode could not be selected in the workbench.");
    }

    const launched = await handleRuntimeLaunch();
    if (!launched) {
      throw new Error("Runtime launch did not start from the renderer.");
    }
    reportProgress("runtime-launch-requested", {
      entryUrl: runtimeLaunch.entryUrl
    });

    const webview = await waitForRendererCondition(
      () => getRuntimeWebview(),
      "runtime webview"
    );
    reportProgress("runtime-webview-ready", {
      hasWebview: Boolean(webview)
    });
    await waitForRendererCondition(
      () => state.runtimeUi.loading === false && Boolean(state.runtimeUi.currentUrl),
      "runtime webview navigation",
      { timeoutMs: 60000 }
    );
    reportProgress("runtime-navigation-finished", {
      currentUrl: state.runtimeUi.currentUrl
    });
    await sleep(3000);
    await waitForRendererCondition(
      () => Boolean(state.runtimeUi.diagnostics || state.runtimeUi.pageTitle || state.runtimeUi.currentUrl),
      "runtime diagnostics or page metadata",
      { timeoutMs: 20000 }
    );
    reportProgress("runtime-diagnostics-ready", {
      currentUrl: state.runtimeUi.currentUrl,
      pageTitle: state.runtimeUi.pageTitle
    });
    baseResult.launchSucceeded = true;
    baseResult.runtimeCurrentUrl = state.runtimeUi.currentUrl;
    baseResult.runtimePageTitle = state.runtimeUi.pageTitle;
    baseResult.runtimeReady = Boolean(state.runtimeUi.ready);

    const status = await callRuntimeBridge("getStatus");
    if (status && typeof status === "object" && !Array.isArray(status)) {
      applyRuntimeBridgeStatus(status);
      baseResult.runtimeBridgeSource = status.bridgeSource ?? null;
      baseResult.runtimeBridgeVersion = status.bridgeVersion ?? null;
      baseResult.runtimeEngineKind = status.engineKind ?? null;
      baseResult.runtimeEngineNote = status.engineNote ?? null;
      baseResult.runtimeFrameCount = Number.isFinite(status.frameCount) ? Number(status.frameCount) : 0;
      baseResult.runtimeAccessibleFrameCount = Number.isFinite(status.accessibleFrameCount) ? Number(status.accessibleFrameCount) : 0;
      baseResult.runtimeCanvasCount = Number.isFinite(status.canvasCount) ? Number(status.canvasCount) : 0;
      baseResult.runtimeContextTypes = Array.isArray(status.contextTypes) ? status.contextTypes.filter(Boolean) : [];
      baseResult.runtimeAssetUseEntryCount = Array.isArray(status.assetUseEntries) ? status.assetUseEntries.length : 0;
      baseResult.runtimeAssetUseTopUrl = Array.isArray(status.assetUseEntries)
        ? status.assetUseEntries.map((entry) => entry?.canonicalUrl ?? entry?.observedUrl ?? null).find(Boolean) ?? null
        : null;
      baseResult.runtimeObservedResourceWindowLabels = Array.isArray(status.resourceEntries)
        ? Array.from(new Set(status.resourceEntries.map((entry) => entry?.windowLabel).filter(Boolean))).slice(0, 12)
        : [];
      baseResult.pixiDetected = Boolean(status.pixiDetected);
      baseResult.pixiVersion = status.pixiVersion ?? null;
      baseResult.candidateRuntimeApps = Array.isArray(status.candidateApps)
        ? status.candidateApps.map((entry) => entry.key).filter(Boolean)
        : [];
      baseResult.pauseSupported = Boolean(status.support?.pause);
      baseResult.resumeSupported = Boolean(status.support?.resume);
      baseResult.stepSupported = Boolean(status.support?.step);
      baseResult.pauseBlocked = status.support?.blockers?.pause ?? null;
      baseResult.stepBlocked = status.support?.blockers?.step ?? null;
      baseResult.runtimeObservedResourceCount = Array.isArray(status.resourceEntries) ? status.resourceEntries.length : 0;
      baseResult.runtimeObservedResourceSample = Array.isArray(status.resourceEntries)
        ? status.resourceEntries.slice(0, 12).map((entry) => entry?.observedUrl ?? entry?.url ?? null).filter(Boolean)
        : [];
      reportProgress("runtime-status", {
        bridgeSource: status.bridgeSource ?? null,
        engineKind: status.engineKind ?? null,
        contextTypes: Array.isArray(status.contextTypes) ? status.contextTypes.filter(Boolean) : [],
        assetUseEntryCount: Array.isArray(status.assetUseEntries) ? status.assetUseEntries.length : 0
      });
    }
    await refreshRuntimeResourceMap({ silent: true });
    baseResult.runtimeResourceMapCount = Number(getRuntimeResourceMapStatus()?.entryCount ?? 0);
    baseResult.runtimeResourceLatestRequestUrl = getRuntimeResourceMapEntries()?.[0]?.latestRequestUrl ?? null;
    baseResult.runtimeCoverageLocalStaticCount = Number(getRuntimeCoverageStatus()?.localStaticEntryCount ?? 0);
    baseResult.runtimeCoverageUpstreamStaticCount = Number(getRuntimeCoverageStatus()?.upstreamStaticEntryCount ?? 0);
    baseResult.runtimeCoverageUnresolvedUpstreamCount = Number(getRuntimeCoverageStatus()?.unresolvedUpstreamCount ?? 0);
    baseResult.runtimeObservedResourceCount = Math.max(
      baseResult.runtimeObservedResourceCount,
      baseResult.runtimeResourceMapCount
    );

    await handleRuntimeAction("enter");
    reportProgress("runtime-enter-dispatched");
    await sleep(1500);
    await refreshRuntimeResourceMap({ silent: true });
    baseResult.runtimeResourceMapCount = Number(getRuntimeResourceMapStatus()?.entryCount ?? 0);
    baseResult.runtimeResourceLatestRequestUrl = getRuntimeResourceMapEntries()?.[0]?.latestRequestUrl ?? null;
    baseResult.runtimeCoverageLocalStaticCount = Number(getRuntimeCoverageStatus()?.localStaticEntryCount ?? 0);
    baseResult.runtimeCoverageUpstreamStaticCount = Number(getRuntimeCoverageStatus()?.upstreamStaticEntryCount ?? 0);
    baseResult.runtimeCoverageUnresolvedUpstreamCount = Number(getRuntimeCoverageStatus()?.unresolvedUpstreamCount ?? 0);
    baseResult.runtimeObservedResourceCount = Math.max(
      baseResult.runtimeObservedResourceCount,
      baseResult.runtimeResourceMapCount
    );

    baseResult.runtimeSpinAttempted = true;
    const spinResult = await handleRuntimeAction("spin");
    reportProgress("runtime-spin-dispatched", {
      resultOk: spinResult?.ok ?? null,
      blocked: state.runtimeUi.lastCommandStatus?.blocked ?? null
    });
    if (state.runtimeUi.lastCommandStatus?.ok) {
      baseResult.runtimeSpinSucceeded = true;
    } else {
      baseResult.runtimeSpinBlocked = state.runtimeUi.lastCommandStatus?.blocked ?? null;
    }
    await sleep(1500);
    await refreshRuntimeResourceMap({ silent: true });
    baseResult.runtimeResourceMapCount = Number(getRuntimeResourceMapStatus()?.entryCount ?? 0);
    baseResult.runtimeResourceLatestRequestUrl = getRuntimeResourceMapEntries()?.[0]?.latestRequestUrl ?? null;
    baseResult.runtimeCoverageLocalStaticCount = Number(getRuntimeCoverageStatus()?.localStaticEntryCount ?? 0);
    baseResult.runtimeCoverageUpstreamStaticCount = Number(getRuntimeCoverageStatus()?.upstreamStaticEntryCount ?? 0);
    baseResult.runtimeCoverageUnresolvedUpstreamCount = Number(getRuntimeCoverageStatus()?.unresolvedUpstreamCount ?? 0);
    baseResult.runtimeObservedResourceCount = Math.max(
      baseResult.runtimeObservedResourceCount,
      baseResult.runtimeResourceMapCount
    );

    const inspectResult = await callRuntimeBridge("setInspectEnabled", true);
    if (!inspectResult?.enabled) {
      throw new Error("Runtime inspect mode did not arm successfully.");
    }
    reportProgress("runtime-inspect-enabled");
    state.runtimeUi.inspectEnabled = true;

    const pickResult = await callRuntimeBridge("pickAtPoint", 220, 220);
    if (!pickResult || typeof pickResult !== "object") {
      throw new Error("Runtime pick did not return a usable payload.");
    }
    reportProgress("runtime-pick-finished", {
      targetTag: pickResult.targetTag ?? null,
      bridgeSource: pickResult.bridgeSource ?? null,
      engineKind: pickResult.engineKind ?? null,
      assetUseEntryCount: Array.isArray(pickResult.assetUseEntries) ? pickResult.assetUseEntries.length : 0,
      topRuntimeAsset: pickResult.topRuntimeAsset?.canonicalUrl ?? pickResult.topRuntimeAsset?.observedUrl ?? null
    });
    state.runtimeUi.lastPick = pickResult;
    baseResult.runtimeBridgeSource = pickResult.bridgeSource ?? baseResult.runtimeBridgeSource;
    baseResult.runtimeBridgeVersion = pickResult.bridgeVersion ?? baseResult.runtimeBridgeVersion;
    baseResult.runtimeEngineKind = pickResult.engineKind ?? baseResult.runtimeEngineKind;
    baseResult.runtimeEngineNote = pickResult.engineNote ?? baseResult.runtimeEngineNote;
    baseResult.runtimeFrameCount = Number.isFinite(pickResult.frameCount)
      ? Number(pickResult.frameCount)
      : baseResult.runtimeFrameCount;
    baseResult.runtimeAccessibleFrameCount = Number.isFinite(pickResult.accessibleFrameCount)
      ? Number(pickResult.accessibleFrameCount)
      : baseResult.runtimeAccessibleFrameCount;
    baseResult.runtimeCanvasCount = Number.isFinite(pickResult.canvasCount)
      ? Number(pickResult.canvasCount)
      : baseResult.runtimeCanvasCount;
    baseResult.runtimeContextTypes = Array.isArray(pickResult.contextTypes)
      ? pickResult.contextTypes.filter(Boolean)
      : baseResult.runtimeContextTypes;
    baseResult.runtimeAssetUseEntryCount = Array.isArray(pickResult.assetUseEntries)
      ? pickResult.assetUseEntries.length
      : baseResult.runtimeAssetUseEntryCount;
    baseResult.runtimeAssetUseTopUrl = pickResult.topRuntimeAsset?.canonicalUrl
      ?? pickResult.topRuntimeAsset?.observedUrl
      ?? (Array.isArray(pickResult.assetUseEntries)
        ? pickResult.assetUseEntries.map((entry) => entry?.canonicalUrl ?? entry?.observedUrl ?? null).find(Boolean) ?? null
        : baseResult.runtimeAssetUseTopUrl);
    baseResult.runtimeObservedResourceWindowLabels = Array.isArray(pickResult.resourceEntries)
      ? Array.from(new Set(pickResult.resourceEntries.map((entry) => entry?.windowLabel).filter(Boolean))).slice(0, 12)
      : baseResult.runtimeObservedResourceWindowLabels;
    baseResult.pickSucceeded = Boolean(pickResult.targetTag || pickResult.canvasDetected);
    baseResult.pickedTargetTag = pickResult.targetTag ?? null;
    baseResult.pickedCanvasDetected = Boolean(pickResult.canvasDetected);
    baseResult.pickedDisplayHitCount = Number.isFinite(pickResult.displayHitCount) ? Number(pickResult.displayHitCount) : 0;
    baseResult.pickedDisplayObjectName = pickResult.topDisplayObject?.name ?? pickResult.topDisplayObject?.label ?? null;
    baseResult.pickedTextureCacheId = pickResult.topDisplayObject?.texture?.cacheId ?? null;

    if (!baseResult.pickSucceeded) {
      throw new Error("Runtime inspect mode did not capture a target from the live donor surface.");
    }

    const bridgeAssetButton = elements.inspector?.querySelector("[data-focus-donor-asset-id]");
    if (!(bridgeAssetButton instanceof HTMLButtonElement) || !bridgeAssetButton.dataset.focusDonorAssetId) {
      throw new Error("Runtime inspector did not expose a grounded donor asset bridge after picking the live donor surface.");
    }
    baseResult.runtimeBridgeAssetId = bridgeAssetButton.dataset.focusDonorAssetId;
    clickRendererElement(bridgeAssetButton);
    await waitForRendererCondition(
      () => state.workflowUi?.activePanel === "donor" && state.donorAssetUi?.highlightedAssetId === baseResult.runtimeBridgeAssetId,
      "runtime bridge donor asset focus"
    );
    baseResult.runtimeBridgeAssetFocusSucceeded = true;

    const bridgeEvidenceButton = elements.inspector?.querySelector("[data-focus-donor-evidence-id]");
    if (!(bridgeEvidenceButton instanceof HTMLButtonElement) || !bridgeEvidenceButton.dataset.focusDonorEvidenceId) {
      throw new Error("Runtime inspector did not expose a grounded donor evidence bridge after picking the live donor surface.");
    }
    baseResult.runtimeBridgeEvidenceId = bridgeEvidenceButton.dataset.focusDonorEvidenceId;
    clickRendererElement(bridgeEvidenceButton);
    await waitForRendererCondition(
      () => state.workflowUi?.activePanel === "donor" && state.evidenceUi?.highlightedEvidenceId === baseResult.runtimeBridgeEvidenceId,
      "runtime bridge donor evidence focus"
    );
    baseResult.runtimeBridgeEvidenceFocusSucceeded = true;

    setWorkflowPanel("runtime", { silent: true, force: true });
    renderAll();

    const createOverrideButton = await waitForRendererCondition(
      () => {
        const button = elements.inspector?.querySelector('[data-runtime-action="create-override"]');
        return button instanceof HTMLButtonElement ? button : null;
      },
      "runtime override action button"
    );
    const runtimeOverrideCandidate = getRuntimeOverrideCandidate();
    baseResult.runtimeOverrideEligible = Boolean(runtimeOverrideCandidate.eligible);
    baseResult.runtimeOverrideSourceUrl = runtimeOverrideCandidate.runtimeSourceUrl;
    baseResult.runtimeOverrideRelativePath = runtimeOverrideCandidate.runtimeRelativePath;
    baseResult.runtimeOverrideSourceKind = runtimeOverrideCandidate.sourceKind ?? null;
    baseResult.runtimeLocalMirrorSourcePath = runtimeOverrideCandidate.localMirrorEntry?.repoRelativePath ?? null;
    baseResult.runtimeOverrideRequestSource = runtimeOverrideCandidate.resourceMapEntry?.requestSource ?? null;
    baseResult.runtimeOverrideDonorAssetId = runtimeOverrideCandidate.donorAsset?.assetId ?? null;
    if (createOverrideButton.disabled || !runtimeOverrideCandidate.eligible) {
      baseResult.runtimeOverrideBlocked = runtimeOverrideCandidate.note ?? "Runtime inspector did not expose a request-backed static override action after picking the live donor surface.";
      baseResult.reloadSucceeded = true;
    } else {
      clickRendererElement(createOverrideButton);
      await waitForRendererCondition(
        () => Boolean(state.runtimeUi.overrideStatus?.entries?.length),
        "runtime override manifest entry creation",
        { timeoutMs: 20000 }
      );
      baseResult.runtimeOverrideCreated = true;

      await waitForRendererCondition(
        () => state.runtimeUi.loading === false && Boolean(state.runtimeUi.currentUrl),
        "runtime reload to finish",
        { timeoutMs: 60000 }
      );
      await handleRuntimeAction("enter");
      await sleep(1500);
      await refreshRuntimeResourceMap({ silent: true });
      await refreshRuntimeOverrideStatus({ silent: true });
      if (!getRuntimeResourceMapEntry(baseResult.runtimeOverrideSourceUrl)?.overrideRepoRelativePath) {
        await handleRuntimeAction("spin");
        await sleep(1500);
        await refreshRuntimeResourceMap({ silent: true });
        await refreshRuntimeOverrideStatus({ silent: true });
      }
      try {
        await waitForRendererCondition(
          () => {
            const activeEntry = getRuntimeResourceMapEntry(baseResult.runtimeOverrideSourceUrl);
            return activeEntry && activeEntry.overrideRepoRelativePath && activeEntry.hitCount > 0 ? activeEntry : null;
          },
          "runtime override to be applied after reload",
          { timeoutMs: 30000 }
        );
      } catch (error) {
        if (baseResult.runtimeSourceLabel === "Local mirror") {
          baseResult.runtimeOverrideBlocked = "Local mirror launch succeeded, but the runtime did not record a reload-time hit for the current mirrored static asset candidate.";
        } else {
          throw error;
        }
      }
      await refreshRuntimeResourceMap({ silent: true });
      await refreshRuntimeOverrideStatus({ silent: true });
      const activeOverrideEntry = state.runtimeUi.overrideStatus?.entries?.find((entry) => entry.runtimeSourceUrl === baseResult.runtimeOverrideSourceUrl) ?? null;
      const activeResourceEntry = getRuntimeResourceMapEntry(baseResult.runtimeOverrideSourceUrl);
      baseResult.runtimeOverrideRepoRelativePath = activeOverrideEntry?.overrideRepoRelativePath ?? null;
      baseResult.runtimeOverrideHitCountAfterReload = activeResourceEntry?.hitCount ?? activeOverrideEntry?.hitCount ?? 0;
      baseResult.reloadSucceeded = true;

      const clearOverrideButton = elements.runtimeToolbar?.querySelector('[data-runtime-action="clear-override"]')
        ?? elements.inspector?.querySelector('[data-runtime-action="clear-override"]');
      if (!(clearOverrideButton instanceof HTMLButtonElement) || clearOverrideButton.disabled) {
        throw new Error("Runtime inspector did not expose a clear-override action after creating the override.");
      }
      clickRendererElement(clearOverrideButton);
      await waitForRendererCondition(
        () => !state.runtimeUi.overrideStatus?.entries?.some((entry) => entry.runtimeSourceUrl === baseResult.runtimeOverrideSourceUrl),
        "runtime override cleanup",
        { timeoutMs: 20000 }
      );
      await waitForRendererCondition(
        () => state.runtimeUi.loading === false && Boolean(state.runtimeUi.currentUrl),
        "runtime reload after override cleanup",
        { timeoutMs: 60000 }
      );
      baseResult.runtimeOverrideCleared = true;
    }

    const successMessage = baseResult.runtimeOverrideBlocked
      ? `Runtime smoke passed with blocker: launched ${trimRuntimeText(baseResult.runtimeCurrentUrl ?? baseResult.launchEntryUrl, 96)}, captured a runtime pick on ${baseResult.pickedTargetTag ?? "the live surface"}, traced ${baseResult.runtimeOverrideRelativePath ?? "the grounded runtime source"} to ${baseResult.runtimeLocalMirrorSourcePath ?? "the local mirror"}, but the runtime did not confirm a reload-time hit for that mirrored candidate.`
      : `Runtime smoke passed: launched ${trimRuntimeText(baseResult.runtimeCurrentUrl ?? baseResult.launchEntryUrl, 96)}, captured a runtime pick on ${baseResult.pickedTargetTag ?? "the live surface"}, created a project-local override for ${baseResult.runtimeOverrideRelativePath ?? "the grounded runtime source"}, and reloaded the donor runtime inside Runtime Mode.`;
    setPreviewStatus(successMessage);
    baseResult.previewStatus = successMessage;
    document.body.dataset.liveRuntimeSmoke = "pass";

    await emitLiveRuntimeSmoke({
      ...baseResult,
      status: "pass"
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const failureMessage = `Live runtime smoke failed: ${message}`;
    setPreviewStatus(failureMessage);
    document.body.dataset.liveRuntimeSmoke = "fail";
    await emitLiveRuntimeSmoke({
      ...baseResult,
      status: "fail",
      error: message,
      previewStatus: failureMessage
    });
  }
}

async function runLiveDuplicateDeleteSmoke() {
  const targetProjectId = "project_001";
  const presetKey = "banner";
  const presetLabel = "Banner";
  const objectIdPrefix = "node.placeholder.banner-";
  const startedAt = new Date().toISOString();
  const baseResult = {
    startedAt,
    projectId: targetProjectId,
    presetKey,
    presetLabel,
    createdObjectId: null,
    duplicateObjectId: null,
    deletedObjectId: null,
    survivingObjectId: null,
    preloadExecuted: Boolean(window.myideApi),
    myideApiExposed: Boolean(window.myideApi && typeof window.myideApi.loadProjectSlice === "function"),
    projectLoaded: false,
    objectCreated: false,
    duplicateCreated: false,
    deleteCompleted: false,
    survivingObjectSelected: false,
    saveSucceeded: false,
    reloadSucceeded: false,
    internalPersistVerified: false,
    replaySyncVerified: false,
    repoStatusIntent: "renderer smoke mutates live files temporarily; outer smoke runner must restore them",
    objectCountBefore: null,
    objectCountAfterCreate: null,
    objectCountAfterDuplicate: null,
    objectCountAfterDelete: null,
    objectCountAfterReload: null,
    createdX: null,
    createdY: null,
    duplicateX: null,
    duplicateY: null,
    reloadedX: null,
    reloadedY: null,
    replayX: null,
    replayY: null,
    syncStatus: null,
    replayPath: null,
    previewStatus: null
  };

  try {
    const api = window.myideApi;
    if (
      !api
      || typeof api.loadProjectSlice !== "function"
      || typeof api.saveProjectEditor !== "function"
      || typeof api.reportRendererReady !== "function"
    ) {
      throw new Error("Renderer live duplicate-delete smoke could not access the required desktop bridge helpers.");
    }

    await waitForRendererCondition(
      () => Boolean(state.bundle && getWorkspaceProjects().length > 0),
      "workspace discovery"
    );

    if (state.selectedProjectId !== targetProjectId) {
      const projectButton = await waitForRendererCondition(
        () => elements.projectBrowser?.querySelector(`[data-project-id="${targetProjectId}"]`) ?? null,
        `project browser entry for ${targetProjectId}`
      );
      clickRendererElement(projectButton);
    }

    await waitForRendererCondition(
      () => state.selectedProjectId === targetProjectId && Boolean(state.editorData),
      `${targetProjectId} to load in the renderer`
    );
    baseResult.projectLoaded = true;
    await ensureSceneWorkbenchForSmoke("live duplicate-delete smoke");
    baseResult.objectCountBefore = Array.isArray(state.editorData?.objects) ? state.editorData.objects.length : null;

    if (isSnapEnabled()) {
      if (!(elements.actionToggleSnap instanceof HTMLButtonElement)) {
        throw new Error("Snap toggle button is missing from the renderer toolbar.");
      }
      clickRendererElement(elements.actionToggleSnap);
      await waitForRendererCondition(() => !isSnapEnabled(), "snap toggle to switch off");
    }

    if (isViewportTransformed()) {
      if (!(elements.actionResetView instanceof HTMLButtonElement)) {
        throw new Error("Reset View button is missing from the renderer toolbar.");
      }
      clickRendererElement(elements.actionResetView);
    }

    await waitForRendererCondition(
      () => {
        const view = getViewportState();
        return Math.abs(view.zoom - 1) < 0.001 && Math.abs(view.panX) < 0.001 && Math.abs(view.panY) < 0.001;
      },
      "default viewport state"
    );

    if (!(elements.fieldPlaceholderPreset instanceof HTMLSelectElement)) {
      throw new Error("Placeholder preset selector is missing from the renderer toolbar.");
    }
    updateRendererInputValue(elements.fieldPlaceholderPreset, presetKey);
    await waitForRendererCondition(
      () => state.placeholderPresetKey === presetKey && elements.fieldPlaceholderPreset?.value === presetKey,
      `${presetKey} preset selection`
    );

    if (!(elements.actionNewObject instanceof HTMLButtonElement)) {
      throw new Error("New Placeholder button is missing from the renderer toolbar.");
    }
    clickRendererElement(elements.actionNewObject);

    const createdObject = await waitForRendererCondition(
      () => {
        const selectedObject = getSelectedObject();
        if (!selectedObject || !selectedObject.id.startsWith(objectIdPrefix)) {
          return null;
        }
        return selectedObject;
      },
      `new ${presetLabel} placeholder creation`
    );
    baseResult.objectCreated = true;
    baseResult.createdObjectId = createdObject.id;
    baseResult.survivingObjectId = createdObject.id;
    baseResult.createdX = Number(createdObject.x);
    baseResult.createdY = Number(createdObject.y);
    baseResult.objectCountAfterCreate = Array.isArray(state.editorData?.objects) ? state.editorData.objects.length : null;

    if (!(elements.actionDuplicate instanceof HTMLButtonElement)) {
      throw new Error("Duplicate button is missing from the renderer toolbar.");
    }
    clickRendererElement(elements.actionDuplicate);

    const duplicateObject = await waitForRendererCondition(
      () => {
        const selectedObject = getSelectedObject();
        if (!selectedObject || selectedObject.id === createdObject.id || !selectedObject.id.startsWith(`${createdObject.id}-copy`)) {
          return null;
        }
        return selectedObject;
      },
      `${createdObject.id} duplicate creation`
    );
    baseResult.duplicateCreated = true;
    baseResult.duplicateObjectId = duplicateObject.id;
    baseResult.duplicateX = Number(duplicateObject.x);
    baseResult.duplicateY = Number(duplicateObject.y);
    baseResult.objectCountAfterDuplicate = Array.isArray(state.editorData?.objects) ? state.editorData.objects.length : null;

    if (!(elements.actionDelete instanceof HTMLButtonElement)) {
      throw new Error("Delete button is missing from the renderer toolbar.");
    }
    clickRendererElement(elements.actionDelete);

    await waitForRendererCondition(
      () => {
        const survivingObject = getEditableObjectById(createdObject.id);
        const deletedObject = getEditableObjectById(duplicateObject.id);
        return Boolean(
          survivingObject
          && !deletedObject
          && state.dirty
        );
      },
      `${duplicateObject.id} to be deleted while ${createdObject.id} remains`
    );
    baseResult.deleteCompleted = true;
    baseResult.deletedObjectId = duplicateObject.id;
    baseResult.objectCountAfterDelete = Array.isArray(state.editorData?.objects) ? state.editorData.objects.length : null;

    if (state.selectedObjectId !== createdObject.id) {
      const survivingObjectButton = await waitForRendererCondition(
        () => elements.sceneExplorer?.querySelector(`[data-object-id="${createdObject.id}"]`) ?? null,
        `${createdObject.id} in the scene explorer after duplicate delete`
      );
      clickRendererElement(survivingObjectButton);
      await waitForRendererCondition(
        () => state.selectedObjectId === createdObject.id,
        `${createdObject.id} to be selected after duplicate delete`
      );
    }
    baseResult.survivingObjectSelected = state.selectedObjectId === createdObject.id;

    if (!(elements.actionSave instanceof HTMLButtonElement)) {
      throw new Error("Save button is missing from the renderer toolbar.");
    }
    clickRendererElement(elements.actionSave);
    await waitForRendererCondition(
      () => {
        const survivingObject = getEditableObjectById(createdObject.id);
        return Boolean(
          !state.dirty
          && state.syncStatus?.status === "synced"
          && survivingObject
          && !getEditableObjectById(duplicateObject.id)
          && Number(survivingObject.x) === baseResult.createdX
          && Number(survivingObject.y) === baseResult.createdY
        );
      },
      "renderer save and sync completion after live duplicate-delete",
      { timeoutMs: 25000 }
    );
    baseResult.saveSucceeded = true;

    if (!(elements.actionReloadEditor instanceof HTMLButtonElement)) {
      throw new Error("Reload button is missing from the renderer toolbar.");
    }
    clickRendererElement(elements.actionReloadEditor);
    await waitForRendererCondition(
      () => state.selectedProjectId === targetProjectId && Boolean(state.editorData),
      `${targetProjectId} reload after live duplicate-delete save`
    );

    const reloadedObject = await waitForRendererCondition(
      () => {
        const survivingObject = getEditableObjectById(createdObject.id);
        if (!survivingObject || getEditableObjectById(duplicateObject.id)) {
          return null;
        }
        return Number(survivingObject.x) === baseResult.createdX && Number(survivingObject.y) === baseResult.createdY
          ? survivingObject
          : null;
      },
      `${createdObject.id} surviving duplicate-delete reload state`
    );
    baseResult.reloadSucceeded = true;
    baseResult.objectCountAfterReload = Array.isArray(state.editorData?.objects) ? state.editorData.objects.length : null;
    baseResult.reloadedX = Number(reloadedObject.x);
    baseResult.reloadedY = Number(reloadedObject.y);

    const replayNode = getReplayNodeById(createdObject.id);
    const deletedReplayNode = getReplayNodeById(duplicateObject.id);
    const replayX = Number(replayNode?.position?.x);
    const replayY = Number(replayNode?.position?.y);
    baseResult.replayX = Number.isFinite(replayX) ? replayX : null;
    baseResult.replayY = Number.isFinite(replayY) ? replayY : null;
    baseResult.syncStatus = state.syncStatus?.status ?? null;
    baseResult.replayPath = toRepoRelativePath(state.syncStatus?.replayPath ?? getReplayTargetPath() ?? "");

    baseResult.internalPersistVerified = baseResult.reloadedX === baseResult.createdX
      && baseResult.reloadedY === baseResult.createdY
      && !getEditableObjectById(duplicateObject.id);
    baseResult.replaySyncVerified = baseResult.replayX === baseResult.createdX
      && baseResult.replayY === baseResult.createdY
      && !deletedReplayNode;

    if (!baseResult.internalPersistVerified) {
      throw new Error(`Reloaded duplicate-delete state for ${createdObject.id} did not match the expected surviving created-object coordinates.`);
    }

    if (!baseResult.replaySyncVerified) {
      throw new Error(`Replay-facing duplicate-delete state for ${createdObject.id} did not match the expected surviving created-object coordinates.`);
    }

    const successMessage = `Live shell duplicate-delete smoke passed for ${createdObject.id}: duplicated to ${duplicateObject.id}, deleted the copy, and reloaded the surviving object at (${baseResult.createdX}, ${baseResult.createdY}).`;
    setPreviewStatus(successMessage);
    baseResult.previewStatus = successMessage;
    document.body.dataset.liveDuplicateDeleteSmoke = "pass";

    if (shouldKeepLiveDuplicateDeleteWindowOpen()) {
      pushLog("Live duplicate-delete smoke keep-open mode is active for visible proof capture.");
    }

    await emitLiveDuplicateDeleteSmoke({
      ...baseResult,
      status: "pass"
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const failureMessage = `Live shell duplicate-delete smoke failed: ${message}`;
    setPreviewStatus(failureMessage);
    document.body.dataset.liveDuplicateDeleteSmoke = "fail";
    await emitLiveDuplicateDeleteSmoke({
      ...baseResult,
      status: "fail",
      error: message,
      previewStatus: failureMessage
    });
  }
}

async function runLiveReorderSmoke() {
  const targetProjectId = "project_001";
  const presetKey = "banner";
  const presetLabel = "Banner";
  const objectIdPrefix = "node.placeholder.banner-";
  const reorderAction = "send-backward";
  const startedAt = new Date().toISOString();
  const baseResult = {
    startedAt,
    projectId: targetProjectId,
    presetKey,
    presetLabel,
    objectId: null,
    layerId: null,
    layerName: null,
    reorderAction,
    preloadExecuted: Boolean(window.myideApi),
    myideApiExposed: Boolean(window.myideApi && typeof window.myideApi.loadProjectSlice === "function"),
    projectLoaded: false,
    objectCreated: false,
    objectSelected: false,
    reorderApplied: false,
    saveSucceeded: false,
    reloadSucceeded: false,
    internalPersistVerified: false,
    replaySyncVerified: false,
    repoStatusIntent: "renderer smoke mutates live files temporarily; outer smoke runner must restore them",
    objectCountBefore: null,
    objectCountAfterCreate: null,
    objectCountAfterReload: null,
    createdOrderIndex: null,
    createdOrderTotal: null,
    reorderedIndex: null,
    reorderedTotal: null,
    reloadedIndex: null,
    reloadedTotal: null,
    createdOrderIds: [],
    reorderedOrderIds: [],
    reloadedOrderIds: [],
    replayOrderIds: [],
    syncStatus: null,
    replayPath: null,
    previewStatus: null
  };

  try {
    const api = window.myideApi;
    if (
      !api
      || typeof api.loadProjectSlice !== "function"
      || typeof api.saveProjectEditor !== "function"
      || typeof api.reportRendererReady !== "function"
    ) {
      throw new Error("Renderer live reorder smoke could not access the required desktop bridge helpers.");
    }

    await waitForRendererCondition(
      () => Boolean(state.bundle && getWorkspaceProjects().length > 0),
      "workspace discovery"
    );

    if (state.selectedProjectId !== targetProjectId) {
      const projectButton = await waitForRendererCondition(
        () => elements.projectBrowser?.querySelector(`[data-project-id="${targetProjectId}"]`) ?? null,
        `project browser entry for ${targetProjectId}`
      );
      clickRendererElement(projectButton);
    }

    await waitForRendererCondition(
      () => state.selectedProjectId === targetProjectId && Boolean(state.editorData),
      `${targetProjectId} to load in the renderer`
    );
    baseResult.projectLoaded = true;
    await ensureSceneWorkbenchForSmoke("live reorder smoke");
    baseResult.objectCountBefore = Array.isArray(state.editorData?.objects) ? state.editorData.objects.length : null;

    if (isSnapEnabled()) {
      if (!(elements.actionToggleSnap instanceof HTMLButtonElement)) {
        throw new Error("Snap toggle button is missing from the renderer toolbar.");
      }
      clickRendererElement(elements.actionToggleSnap);
      await waitForRendererCondition(() => !isSnapEnabled(), "snap toggle to switch off");
    }

    if (isViewportTransformed()) {
      if (!(elements.actionResetView instanceof HTMLButtonElement)) {
        throw new Error("Reset View button is missing from the renderer toolbar.");
      }
      clickRendererElement(elements.actionResetView);
    }

    await waitForRendererCondition(
      () => {
        const view = getViewportState();
        return Math.abs(view.zoom - 1) < 0.001 && Math.abs(view.panX) < 0.001 && Math.abs(view.panY) < 0.001;
      },
      "default viewport state"
    );

    if (!(elements.fieldPlaceholderPreset instanceof HTMLSelectElement)) {
      throw new Error("Placeholder preset selector is missing from the renderer toolbar.");
    }
    updateRendererInputValue(elements.fieldPlaceholderPreset, presetKey);
    await waitForRendererCondition(
      () => state.placeholderPresetKey === presetKey && elements.fieldPlaceholderPreset?.value === presetKey,
      `${presetKey} preset selection`
    );

    if (!(elements.actionNewObject instanceof HTMLButtonElement)) {
      throw new Error("New Placeholder button is missing from the renderer toolbar.");
    }
    clickRendererElement(elements.actionNewObject);

    const createdObject = await waitForRendererCondition(
      () => {
        const selectedObject = getSelectedObject();
        if (!selectedObject || !selectedObject.id.startsWith(objectIdPrefix)) {
          return null;
        }
        return selectedObject;
      },
      `new ${presetLabel} placeholder creation`
    );
    baseResult.objectCreated = true;
    baseResult.objectSelected = true;
    baseResult.objectId = createdObject.id;
    baseResult.objectCountAfterCreate = Array.isArray(state.editorData?.objects) ? state.editorData.objects.length : null;

    const createdOrderContext = await waitForRendererCondition(
      () => {
        const context = getSelectedObjectOrderContext();
        return context?.objectId === createdObject.id ? context : null;
      },
      `${createdObject.id} order context after creation`
    );
    baseResult.layerId = createdOrderContext.layerId;
    baseResult.layerName = createdOrderContext.layerName;
    baseResult.createdOrderIndex = createdOrderContext.index;
    baseResult.createdOrderTotal = createdOrderContext.total;
    baseResult.createdOrderIds = getLayerObjectsInOrder(createdOrderContext.layerId).map((entry) => entry.id);

    if (!createdOrderContext.canSendBackward) {
      throw new Error(`${createdObject.id} could not move backward within ${createdOrderContext.layerName}.`);
    }

    const orderButton = elements.editorToolbar?.querySelector(`[data-order-action="${reorderAction}"]`) ?? null;
    if (!(orderButton instanceof HTMLButtonElement)) {
      throw new Error(`Order action button for ${reorderAction} is missing from the renderer toolbar.`);
    }
    clickRendererElement(orderButton);

    const reorderedContext = await waitForRendererCondition(
      () => {
        const context = getSelectedObjectOrderContext();
        if (!context || context.objectId !== createdObject.id || !state.dirty) {
          return null;
        }
        return context.index === createdOrderContext.index - 1 ? context : null;
      },
      `${createdObject.id} to move backward within ${createdOrderContext.layerName}`
    );
    baseResult.reorderApplied = true;
    baseResult.reorderedIndex = reorderedContext.index;
    baseResult.reorderedTotal = reorderedContext.total;
    baseResult.reorderedOrderIds = getLayerObjectsInOrder(reorderedContext.layerId).map((entry) => entry.id);

    if (!(elements.actionSave instanceof HTMLButtonElement)) {
      throw new Error("Save button is missing from the renderer toolbar.");
    }
    clickRendererElement(elements.actionSave);
    await waitForRendererCondition(
      () => {
        const currentContext = getSelectedObjectOrderContext();
        if (!currentContext || currentContext.objectId !== createdObject.id) {
          return false;
        }

        const currentOrderIds = getLayerObjectsInOrder(reorderedContext.layerId).map((entry) => entry.id);
        return !state.dirty
          && state.syncStatus?.status === "synced"
          && currentContext.index === reorderedContext.index
          && JSON.stringify(currentOrderIds) === JSON.stringify(baseResult.reorderedOrderIds);
      },
      "renderer save and sync completion after live reorder",
      { timeoutMs: 25000 }
    );
    baseResult.saveSucceeded = true;

    if (!(elements.actionReloadEditor instanceof HTMLButtonElement)) {
      throw new Error("Reload button is missing from the renderer toolbar.");
    }
    clickRendererElement(elements.actionReloadEditor);
    await waitForRendererCondition(
      () => state.selectedProjectId === targetProjectId && Boolean(state.editorData),
      `${targetProjectId} reload after live reorder save`
    );

    if (state.selectedObjectId !== createdObject.id) {
      const sceneExplorerButton = await waitForRendererCondition(
        () => elements.sceneExplorer?.querySelector(`[data-object-id="${createdObject.id}"]`) ?? null,
        `${createdObject.id} in the scene explorer after reorder reload`
      );
      clickRendererElement(sceneExplorerButton);
      await waitForRendererCondition(
        () => state.selectedObjectId === createdObject.id,
        `${createdObject.id} to be selected after reorder reload`
      );
    }

    const reloadedContext = await waitForRendererCondition(
      () => {
        const context = getSelectedObjectOrderContext();
        if (!context || context.objectId !== createdObject.id) {
          return null;
        }
        return context.index === reorderedContext.index ? context : null;
      },
      `${createdObject.id} persisted order context after reload`
    );
    baseResult.reloadSucceeded = true;
    baseResult.objectCountAfterReload = Array.isArray(state.editorData?.objects) ? state.editorData.objects.length : null;
    baseResult.reloadedIndex = reloadedContext.index;
    baseResult.reloadedTotal = reloadedContext.total;
    baseResult.reloadedOrderIds = getLayerObjectsInOrder(reloadedContext.layerId).map((entry) => entry.id);
    baseResult.replayOrderIds = getReplayLayerNodeOrder(reloadedContext.layerId);
    baseResult.syncStatus = state.syncStatus?.status ?? null;
    baseResult.replayPath = toRepoRelativePath(state.syncStatus?.replayPath ?? getReplayTargetPath() ?? "");

    baseResult.internalPersistVerified = JSON.stringify(baseResult.reloadedOrderIds) === JSON.stringify(baseResult.reorderedOrderIds);
    baseResult.replaySyncVerified = JSON.stringify(baseResult.replayOrderIds) === JSON.stringify(baseResult.reorderedOrderIds);

    if (!baseResult.internalPersistVerified) {
      throw new Error(`Reloaded internal order for ${createdObject.id} did not match the saved layer order.`);
    }

    if (!baseResult.replaySyncVerified) {
      throw new Error(`Replay-facing order for ${createdObject.id} did not match the saved layer order.`);
    }

    const successMessage = `Live shell reorder smoke passed for ${createdObject.id}: moved from ${createdOrderContext.index + 1} of ${createdOrderContext.total} to ${reorderedContext.index + 1} of ${reorderedContext.total} in ${reorderedContext.layerName}, saved, and reloaded through the Electron bridge.`;
    setPreviewStatus(successMessage);
    baseResult.previewStatus = successMessage;
    document.body.dataset.liveReorderSmoke = "pass";

    if (shouldKeepLiveReorderWindowOpen()) {
      pushLog("Live reorder smoke keep-open mode is active for visible proof capture.");
    }

    await emitLiveReorderSmoke({
      ...baseResult,
      status: "pass"
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const failureMessage = `Live shell reorder smoke failed: ${message}`;
    setPreviewStatus(failureMessage);
    document.body.dataset.liveReorderSmoke = "fail";
    await emitLiveReorderSmoke({
      ...baseResult,
      status: "fail",
      error: message,
      previewStatus: failureMessage
    });
  }
}

async function runLiveLayerReassignSmoke() {
  const targetProjectId = "project_001";
  const presetKey = "banner";
  const presetLabel = "Banner";
  const objectIdPrefix = "node.placeholder.banner-";
  const targetLayerId = "layer.overlay";
  const startedAt = new Date().toISOString();
  const baseResult = {
    startedAt,
    projectId: targetProjectId,
    presetKey,
    presetLabel,
    objectId: null,
    sourceLayerId: null,
    sourceLayerName: null,
    targetLayerId,
    targetLayerName: null,
    preloadExecuted: Boolean(window.myideApi),
    myideApiExposed: Boolean(window.myideApi && typeof window.myideApi.loadProjectSlice === "function"),
    projectLoaded: false,
    objectCreated: false,
    objectSelected: false,
    layerReassigned: false,
    saveSucceeded: false,
    reloadSucceeded: false,
    internalPersistVerified: false,
    replaySyncVerified: false,
    repoStatusIntent: "renderer smoke mutates live files temporarily; outer smoke runner must restore them",
    objectCountBefore: null,
    objectCountAfterCreate: null,
    objectCountAfterReload: null,
    createdOrderIndex: null,
    createdOrderTotal: null,
    reassignedOrderIndex: null,
    reassignedOrderTotal: null,
    reloadedOrderIndex: null,
    reloadedOrderTotal: null,
    createdOrderIds: [],
    sourceLayerOrderIdsAfterReassign: [],
    sourceLayerOrderIdsAfterReload: [],
    reassignedOrderIds: [],
    reloadedOrderIds: [],
    replayOrderIds: [],
    sourceReplayOrderIds: [],
    syncStatus: null,
    replayPath: null,
    previewStatus: null
  };

  try {
    const api = window.myideApi;
    if (
      !api
      || typeof api.loadProjectSlice !== "function"
      || typeof api.saveProjectEditor !== "function"
      || typeof api.reportRendererReady !== "function"
    ) {
      throw new Error("Renderer live layer-reassign smoke could not access the required desktop bridge helpers.");
    }

    await waitForRendererCondition(
      () => Boolean(state.bundle && getWorkspaceProjects().length > 0),
      "workspace discovery"
    );

    if (state.selectedProjectId !== targetProjectId) {
      const projectButton = await waitForRendererCondition(
        () => elements.projectBrowser?.querySelector(`[data-project-id="${targetProjectId}"]`) ?? null,
        `project browser entry for ${targetProjectId}`
      );
      clickRendererElement(projectButton);
    }

    await waitForRendererCondition(
      () => state.selectedProjectId === targetProjectId && Boolean(state.editorData),
      `${targetProjectId} to load in the renderer`
    );
    baseResult.projectLoaded = true;
    await ensureSceneWorkbenchForSmoke("live layer-reassign smoke");
    baseResult.objectCountBefore = Array.isArray(state.editorData?.objects) ? state.editorData.objects.length : null;

    if (isSnapEnabled()) {
      if (!(elements.actionToggleSnap instanceof HTMLButtonElement)) {
        throw new Error("Snap toggle button is missing from the renderer toolbar.");
      }
      clickRendererElement(elements.actionToggleSnap);
      await waitForRendererCondition(() => !isSnapEnabled(), "snap toggle to switch off");
    }

    if (isViewportTransformed()) {
      if (!(elements.actionResetView instanceof HTMLButtonElement)) {
        throw new Error("Reset View button is missing from the renderer toolbar.");
      }
      clickRendererElement(elements.actionResetView);
    }

    await waitForRendererCondition(
      () => {
        const view = getViewportState();
        return Math.abs(view.zoom - 1) < 0.001 && Math.abs(view.panX) < 0.001 && Math.abs(view.panY) < 0.001;
      },
      "default viewport state"
    );

    if (!(elements.fieldPlaceholderPreset instanceof HTMLSelectElement)) {
      throw new Error("Placeholder preset selector is missing from the renderer toolbar.");
    }
    updateRendererInputValue(elements.fieldPlaceholderPreset, presetKey);
    await waitForRendererCondition(
      () => state.placeholderPresetKey === presetKey && elements.fieldPlaceholderPreset?.value === presetKey,
      `${presetKey} preset selection`
    );

    if (!(elements.actionNewObject instanceof HTMLButtonElement)) {
      throw new Error("New Placeholder button is missing from the renderer toolbar.");
    }
    clickRendererElement(elements.actionNewObject);

    const createdObject = await waitForRendererCondition(
      () => {
        const selectedObject = getSelectedObject();
        if (!selectedObject || !selectedObject.id.startsWith(objectIdPrefix)) {
          return null;
        }
        return selectedObject;
      },
      `new ${presetLabel} placeholder creation`
    );
    baseResult.objectCreated = true;
    baseResult.objectSelected = true;
    baseResult.objectId = createdObject.id;
    baseResult.objectCountAfterCreate = Array.isArray(state.editorData?.objects) ? state.editorData.objects.length : null;

    const createdOrderContext = await waitForRendererCondition(
      () => {
        const context = getSelectedObjectOrderContext();
        return context?.objectId === createdObject.id ? context : null;
      },
      `${createdObject.id} order context after creation`
    );
    baseResult.sourceLayerId = createdOrderContext.layerId;
    baseResult.sourceLayerName = createdOrderContext.layerName;
    baseResult.createdOrderIndex = createdOrderContext.index;
    baseResult.createdOrderTotal = createdOrderContext.total;
    baseResult.createdOrderIds = getLayerObjectsInOrder(createdOrderContext.layerId).map((entry) => entry.id);

    if (createdOrderContext.layerId === targetLayerId) {
      throw new Error(`${createdObject.id} was already created on ${targetLayerId}, so the layer reassignment proof would not be meaningful.`);
    }

    const targetLayer = getLayerById(targetLayerId);
    if (!targetLayer || targetLayer.locked || targetLayer.visible === false) {
      throw new Error(`Target layer ${targetLayerId} is unavailable for live reassignment.`);
    }
    baseResult.targetLayerName = targetLayer.displayName ?? targetLayerId;

    const layerField = await waitForRendererCondition(
      () => elements.inspector?.querySelector('select[name="layerId"]') ?? null,
      "inspector assigned-layer control"
    );
    updateRendererInputValue(layerField, targetLayerId);

    const reassignedContext = await waitForRendererCondition(
      () => {
        const selectedObject = getSelectedObject();
        const context = getSelectedObjectOrderContext();
        if (
          !selectedObject
          || selectedObject.id !== createdObject.id
          || selectedObject.layerId !== targetLayerId
          || !context
          || context.objectId !== createdObject.id
          || context.layerId !== targetLayerId
          || !state.dirty
        ) {
          return null;
        }

        return context;
      },
      `${createdObject.id} reassignment into ${baseResult.targetLayerName}`
    );
    baseResult.layerReassigned = true;
    baseResult.reassignedOrderIndex = reassignedContext.index;
    baseResult.reassignedOrderTotal = reassignedContext.total;
    baseResult.reassignedOrderIds = getLayerObjectsInOrder(reassignedContext.layerId).map((entry) => entry.id);
    baseResult.sourceLayerOrderIdsAfterReassign = getLayerObjectsInOrder(createdOrderContext.layerId).map((entry) => entry.id);

    if (baseResult.sourceLayerOrderIdsAfterReassign.includes(createdObject.id)) {
      throw new Error(`${createdObject.id} still appeared in ${createdOrderContext.layerName} after reassignment.`);
    }

    if (!baseResult.reassignedOrderIds.includes(createdObject.id)) {
      throw new Error(`${createdObject.id} was missing from ${baseResult.targetLayerName} after reassignment.`);
    }

    if (!(elements.actionSave instanceof HTMLButtonElement)) {
      throw new Error("Save button is missing from the renderer toolbar.");
    }
    clickRendererElement(elements.actionSave);
    await waitForRendererCondition(
      () => {
        const selectedObject = getSelectedObject();
        const currentOrderIds = getLayerObjectsInOrder(targetLayerId).map((entry) => entry.id);
        const currentSourceOrderIds = getLayerObjectsInOrder(createdOrderContext.layerId).map((entry) => entry.id);
        return Boolean(
          !state.dirty
          && state.syncStatus?.status === "synced"
          && selectedObject?.id === createdObject.id
          && selectedObject?.layerId === targetLayerId
          && JSON.stringify(currentOrderIds) === JSON.stringify(baseResult.reassignedOrderIds)
          && !currentSourceOrderIds.includes(createdObject.id)
        );
      },
      "renderer save and sync completion after live layer reassignment",
      { timeoutMs: 25000 }
    );
    baseResult.saveSucceeded = true;

    if (!(elements.actionReloadEditor instanceof HTMLButtonElement)) {
      throw new Error("Reload button is missing from the renderer toolbar.");
    }
    clickRendererElement(elements.actionReloadEditor);
    await waitForRendererCondition(
      () => state.selectedProjectId === targetProjectId && Boolean(state.editorData),
      `${targetProjectId} reload after live layer reassignment save`
    );

    if (state.selectedObjectId !== createdObject.id) {
      const sceneExplorerButton = await waitForRendererCondition(
        () => elements.sceneExplorer?.querySelector(`[data-object-id="${createdObject.id}"]`) ?? null,
        `${createdObject.id} in the scene explorer after layer reassignment reload`
      );
      clickRendererElement(sceneExplorerButton);
      await waitForRendererCondition(
        () => state.selectedObjectId === createdObject.id,
        `${createdObject.id} to be selected after layer reassignment reload`
      );
    }

    const reloadedContext = await waitForRendererCondition(
      () => {
        const context = getSelectedObjectOrderContext();
        const selectedObject = getSelectedObject();
        if (
          !context
          || context.objectId !== createdObject.id
          || context.layerId !== targetLayerId
          || selectedObject?.layerId !== targetLayerId
        ) {
          return null;
        }

        return context;
      },
      `${createdObject.id} persisted layer assignment after reload`
    );
    baseResult.reloadSucceeded = true;
    baseResult.objectCountAfterReload = Array.isArray(state.editorData?.objects) ? state.editorData.objects.length : null;
    baseResult.reloadedOrderIndex = reloadedContext.index;
    baseResult.reloadedOrderTotal = reloadedContext.total;
    baseResult.reloadedOrderIds = getLayerObjectsInOrder(reloadedContext.layerId).map((entry) => entry.id);
    baseResult.sourceLayerOrderIdsAfterReload = getLayerObjectsInOrder(createdOrderContext.layerId).map((entry) => entry.id);
    baseResult.replayOrderIds = getReplayLayerNodeOrder(targetLayerId);
    baseResult.sourceReplayOrderIds = getReplayLayerNodeOrder(createdOrderContext.layerId);
    baseResult.syncStatus = state.syncStatus?.status ?? null;
    baseResult.replayPath = toRepoRelativePath(state.syncStatus?.replayPath ?? getReplayTargetPath() ?? "");

    baseResult.internalPersistVerified = JSON.stringify(baseResult.reloadedOrderIds) === JSON.stringify(baseResult.reassignedOrderIds)
      && !baseResult.sourceLayerOrderIdsAfterReload.includes(createdObject.id);
    baseResult.replaySyncVerified = JSON.stringify(baseResult.replayOrderIds) === JSON.stringify(baseResult.reassignedOrderIds)
      && !baseResult.sourceReplayOrderIds.includes(createdObject.id);

    if (!baseResult.internalPersistVerified) {
      throw new Error(`Reloaded internal layer assignment for ${createdObject.id} did not match the saved ${baseResult.targetLayerName} state.`);
    }

    if (!baseResult.replaySyncVerified) {
      throw new Error(`Replay-facing layer assignment for ${createdObject.id} did not match the saved ${baseResult.targetLayerName} state.`);
    }

    const successMessage = `Live shell layer-reassign smoke passed for ${createdObject.id}: moved from ${createdOrderContext.layerName} to ${baseResult.targetLayerName}, saved, and reloaded through the Electron bridge.`;
    setPreviewStatus(successMessage);
    baseResult.previewStatus = successMessage;
    document.body.dataset.liveLayerReassignSmoke = "pass";

    if (shouldKeepLiveLayerReassignWindowOpen()) {
      pushLog("Live layer-reassign smoke keep-open mode is active for visible proof capture.");
    }

    await emitLiveLayerReassignSmoke({
      ...baseResult,
      status: "pass"
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const failureMessage = `Live shell layer-reassign smoke failed: ${message}`;
    setPreviewStatus(failureMessage);
    document.body.dataset.liveLayerReassignSmoke = "fail";
    await emitLiveLayerReassignSmoke({
      ...baseResult,
      status: "fail",
      error: message,
      previewStatus: failureMessage
    });
  }
}

async function runLiveResizeSmoke() {
  const targetProjectId = "project_001";
  const presetKey = "banner";
  const presetLabel = "Banner";
  const objectIdPrefix = "node.placeholder.banner-";
  const startedAt = new Date().toISOString();
  const baseResult = {
    startedAt,
    projectId: targetProjectId,
    presetKey,
    presetLabel,
    objectId: null,
    preloadExecuted: Boolean(window.myideApi),
    myideApiExposed: Boolean(window.myideApi && typeof window.myideApi.loadProjectSlice === "function"),
    projectLoaded: false,
    objectCreated: false,
    objectSelected: false,
    resized: false,
    saveSucceeded: false,
    reloadSucceeded: false,
    internalPersistVerified: false,
    replaySyncVerified: false,
    repoStatusIntent: "renderer smoke mutates live files temporarily; outer smoke runner must restore them",
    objectCountBefore: null,
    objectCountAfterCreate: null,
    objectCountAfterReload: null,
    createdLayerId: null,
    reloadedLayerId: null,
    replayLayerId: null,
    createdX: null,
    createdY: null,
    reloadedX: null,
    reloadedY: null,
    replayX: null,
    replayY: null,
    createdWidth: null,
    createdHeight: null,
    resizedWidth: null,
    resizedHeight: null,
    reloadedWidth: null,
    reloadedHeight: null,
    replayWidth: null,
    replayHeight: null,
    syncStatus: null,
    replayPath: null,
    previewStatus: null
  };

  try {
    const api = window.myideApi;
    if (
      !api
      || typeof api.loadProjectSlice !== "function"
      || typeof api.saveProjectEditor !== "function"
      || typeof api.reportRendererReady !== "function"
    ) {
      throw new Error("Renderer live resize smoke could not access the required desktop bridge helpers.");
    }

    await waitForRendererCondition(
      () => Boolean(state.bundle && getWorkspaceProjects().length > 0),
      "workspace discovery"
    );

    if (state.selectedProjectId !== targetProjectId) {
      const projectButton = await waitForRendererCondition(
        () => elements.projectBrowser?.querySelector(`[data-project-id="${targetProjectId}"]`) ?? null,
        `project browser entry for ${targetProjectId}`
      );
      clickRendererElement(projectButton);
    }

    await waitForRendererCondition(
      () => state.selectedProjectId === targetProjectId && Boolean(state.editorData),
      `${targetProjectId} to load in the renderer`
    );
    baseResult.projectLoaded = true;
    await ensureSceneWorkbenchForSmoke("live resize smoke");
    baseResult.objectCountBefore = Array.isArray(state.editorData?.objects) ? state.editorData.objects.length : null;

    if (isSnapEnabled()) {
      if (!(elements.actionToggleSnap instanceof HTMLButtonElement)) {
        throw new Error("Snap toggle button is missing from the renderer toolbar.");
      }
      clickRendererElement(elements.actionToggleSnap);
      await waitForRendererCondition(() => !isSnapEnabled(), "snap toggle to switch off");
    }

    if (isViewportTransformed()) {
      if (!(elements.actionResetView instanceof HTMLButtonElement)) {
        throw new Error("Reset View button is missing from the renderer toolbar.");
      }
      clickRendererElement(elements.actionResetView);
    }

    await waitForRendererCondition(
      () => {
        const view = getViewportState();
        return Math.abs(view.zoom - 1) < 0.001 && Math.abs(view.panX) < 0.001 && Math.abs(view.panY) < 0.001;
      },
      "default viewport state"
    );

    if (!(elements.fieldPlaceholderPreset instanceof HTMLSelectElement)) {
      throw new Error("Placeholder preset selector is missing from the renderer toolbar.");
    }
    updateRendererInputValue(elements.fieldPlaceholderPreset, presetKey);
    await waitForRendererCondition(
      () => state.placeholderPresetKey === presetKey && elements.fieldPlaceholderPreset?.value === presetKey,
      `${presetKey} preset selection`
    );

    if (!(elements.actionNewObject instanceof HTMLButtonElement)) {
      throw new Error("New Placeholder button is missing from the renderer toolbar.");
    }
    clickRendererElement(elements.actionNewObject);

    const createdObject = await waitForRendererCondition(
      () => {
        const selectedObject = getSelectedObject();
        if (!selectedObject || !selectedObject.id.startsWith(objectIdPrefix)) {
          return null;
        }
        return selectedObject;
      },
      `new ${presetLabel} placeholder creation`
    );
    baseResult.objectCreated = true;
    baseResult.objectSelected = true;
    baseResult.objectId = createdObject.id;
    baseResult.objectCountAfterCreate = Array.isArray(state.editorData?.objects) ? state.editorData.objects.length : null;
    baseResult.createdLayerId = createdObject.layerId ?? null;
    baseResult.createdX = Number(createdObject.x);
    baseResult.createdY = Number(createdObject.y);
    baseResult.createdWidth = Number(createdObject.width);
    baseResult.createdHeight = Number(createdObject.height);

    const targetWidth = Number(baseResult.createdWidth) + 24;
    const targetHeight = Number(baseResult.createdHeight) + 12;
    if (!Number.isFinite(targetWidth) || !Number.isFinite(targetHeight)) {
      throw new Error(`Created ${createdObject.id} did not expose numeric width/height for the live resize proof.`);
    }

    const widthField = await waitForRendererCondition(
      () => elements.inspector?.querySelector('input[name="width"]') ?? null,
      "inspector width control"
    );
    updateRendererInputValue(widthField, targetWidth);

    const heightField = await waitForRendererCondition(
      () => elements.inspector?.querySelector('input[name="height"]') ?? null,
      "inspector height control"
    );
    updateRendererInputValue(heightField, targetHeight);

    const resizedObject = await waitForRendererCondition(
      () => {
        const currentObject = getEditableObjectById(createdObject.id);
        if (
          !currentObject
          || !state.dirty
          || Number(currentObject.width) !== targetWidth
          || Number(currentObject.height) !== targetHeight
        ) {
          return null;
        }

        return currentObject;
      },
      `${createdObject.id} to resize through the live inspector path`
    );
    baseResult.resized = true;
    baseResult.resizedWidth = Number(resizedObject.width);
    baseResult.resizedHeight = Number(resizedObject.height);

    if (!(elements.actionSave instanceof HTMLButtonElement)) {
      throw new Error("Save button is missing from the renderer toolbar.");
    }
    clickRendererElement(elements.actionSave);
    await waitForRendererCondition(
      () => {
        const currentObject = getEditableObjectById(createdObject.id);
        return Boolean(
          !state.dirty
          && state.syncStatus?.status === "synced"
          && currentObject
          && Number(currentObject.width) === baseResult.resizedWidth
          && Number(currentObject.height) === baseResult.resizedHeight
        );
      },
      "renderer save and sync completion after live resize",
      { timeoutMs: 25000 }
    );
    baseResult.saveSucceeded = true;

    if (!(elements.actionReloadEditor instanceof HTMLButtonElement)) {
      throw new Error("Reload button is missing from the renderer toolbar.");
    }
    clickRendererElement(elements.actionReloadEditor);
    await waitForRendererCondition(
      () => state.selectedProjectId === targetProjectId && Boolean(state.editorData),
      `${targetProjectId} reload after live resize save`
    );

    if (state.selectedObjectId !== createdObject.id) {
      const sceneExplorerButton = await waitForRendererCondition(
        () => elements.sceneExplorer?.querySelector(`[data-object-id="${createdObject.id}"]`) ?? null,
        `${createdObject.id} in the scene explorer after live resize reload`
      );
      clickRendererElement(sceneExplorerButton);
      await waitForRendererCondition(
        () => state.selectedObjectId === createdObject.id,
        `${createdObject.id} to be selected after live resize reload`
      );
    }

    const reloadedObject = await waitForRendererCondition(
      () => {
        const currentObject = getEditableObjectById(createdObject.id);
        if (
          !currentObject
          || Number(currentObject.width) !== baseResult.resizedWidth
          || Number(currentObject.height) !== baseResult.resizedHeight
        ) {
          return null;
        }

        return currentObject;
      },
      `${createdObject.id} persisted size after reload`
    );
    baseResult.reloadSucceeded = true;
    baseResult.objectCountAfterReload = Array.isArray(state.editorData?.objects) ? state.editorData.objects.length : null;
    baseResult.reloadedLayerId = reloadedObject.layerId ?? null;
    baseResult.reloadedX = Number(reloadedObject.x);
    baseResult.reloadedY = Number(reloadedObject.y);
    baseResult.reloadedWidth = Number(reloadedObject.width);
    baseResult.reloadedHeight = Number(reloadedObject.height);

    const replayNode = getReplayNodeById(createdObject.id);
    const replayPosition = replayNode?.position ?? {};
    const replayX = Number(replayPosition.x);
    const replayY = Number(replayPosition.y);
    const replayWidth = Number(replayPosition.width);
    const replayHeight = Number(replayPosition.height);
    baseResult.replayX = Number.isFinite(replayX) ? replayX : null;
    baseResult.replayY = Number.isFinite(replayY) ? replayY : null;
    baseResult.replayWidth = Number.isFinite(replayWidth) ? replayWidth : null;
    baseResult.replayHeight = Number.isFinite(replayHeight) ? replayHeight : null;
    baseResult.replayLayerId = getReplayLayerIdByNodeId(createdObject.id);
    baseResult.syncStatus = state.syncStatus?.status ?? null;
    baseResult.replayPath = toRepoRelativePath(state.syncStatus?.replayPath ?? getReplayTargetPath() ?? "");

    baseResult.internalPersistVerified = baseResult.reloadedWidth === baseResult.resizedWidth
      && baseResult.reloadedHeight === baseResult.resizedHeight
      && baseResult.reloadedX === baseResult.createdX
      && baseResult.reloadedY === baseResult.createdY
      && baseResult.reloadedLayerId === baseResult.createdLayerId;
    baseResult.replaySyncVerified = baseResult.replayWidth === baseResult.resizedWidth
      && baseResult.replayHeight === baseResult.resizedHeight
      && baseResult.replayX === baseResult.createdX
      && baseResult.replayY === baseResult.createdY
      && baseResult.replayLayerId === baseResult.createdLayerId;

    if (!baseResult.internalPersistVerified) {
      throw new Error(`Reloaded created object size/state for ${createdObject.id} did not match the saved resize result.`);
    }

    if (!baseResult.replaySyncVerified) {
      throw new Error(`Replay-facing size/state for ${createdObject.id} did not match the saved resize result.`);
    }

    const successMessage = `Live shell resize smoke passed for ${createdObject.id}: resized from ${baseResult.createdWidth}x${baseResult.createdHeight} to ${baseResult.resizedWidth}x${baseResult.resizedHeight}, saved, and reloaded through the Electron bridge.`;
    setPreviewStatus(successMessage);
    baseResult.previewStatus = successMessage;
    document.body.dataset.liveResizeSmoke = "pass";

    if (shouldKeepLiveResizeWindowOpen()) {
      pushLog("Live resize smoke keep-open mode is active for visible proof capture.");
    }

    await emitLiveResizeSmoke({
      ...baseResult,
      status: "pass"
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const failureMessage = `Live shell resize smoke failed: ${message}`;
    setPreviewStatus(failureMessage);
    document.body.dataset.liveResizeSmoke = "fail";
    await emitLiveResizeSmoke({
      ...baseResult,
      status: "fail",
      error: message,
      previewStatus: failureMessage
    });
  }
}

async function runLiveAlignSmoke() {
  const targetProjectId = "project_001";
  const presetKey = "banner";
  const presetLabel = "Banner";
  const objectIdPrefix = "node.placeholder.banner-";
  const alignmentAction = "right";
  const startedAt = new Date().toISOString();
  const baseResult = {
    startedAt,
    projectId: targetProjectId,
    presetKey,
    presetLabel,
    alignmentAction,
    alignmentLabel: getAlignmentLabel(alignmentAction),
    objectId: null,
    preloadExecuted: Boolean(window.myideApi),
    myideApiExposed: Boolean(window.myideApi && typeof window.myideApi.loadProjectSlice === "function"),
    projectLoaded: false,
    objectCreated: false,
    objectSelected: false,
    aligned: false,
    saveSucceeded: false,
    reloadSucceeded: false,
    internalPersistVerified: false,
    replaySyncVerified: false,
    repoStatusIntent: "renderer smoke mutates live files temporarily; outer smoke runner must restore them",
    objectCountBefore: null,
    objectCountAfterCreate: null,
    objectCountAfterReload: null,
    createdLayerId: null,
    reloadedLayerId: null,
    replayLayerId: null,
    createdX: null,
    createdY: null,
    alignedX: null,
    alignedY: null,
    reloadedX: null,
    reloadedY: null,
    replayX: null,
    replayY: null,
    createdWidth: null,
    createdHeight: null,
    reloadedWidth: null,
    reloadedHeight: null,
    replayWidth: null,
    replayHeight: null,
    syncStatus: null,
    replayPath: null,
    previewStatus: null
  };

  try {
    const api = window.myideApi;
    if (
      !api
      || typeof api.loadProjectSlice !== "function"
      || typeof api.saveProjectEditor !== "function"
      || typeof api.reportRendererReady !== "function"
    ) {
      throw new Error("Renderer live align smoke could not access the required desktop bridge helpers.");
    }

    await waitForRendererCondition(
      () => Boolean(state.bundle && getWorkspaceProjects().length > 0),
      "workspace discovery"
    );

    if (state.selectedProjectId !== targetProjectId) {
      const projectButton = await waitForRendererCondition(
        () => elements.projectBrowser?.querySelector(`[data-project-id="${targetProjectId}"]`) ?? null,
        `project browser entry for ${targetProjectId}`
      );
      clickRendererElement(projectButton);
    }

    await waitForRendererCondition(
      () => state.selectedProjectId === targetProjectId && Boolean(state.editorData),
      `${targetProjectId} to load in the renderer`
    );
    baseResult.projectLoaded = true;
    await ensureSceneWorkbenchForSmoke("live align smoke");
    baseResult.objectCountBefore = Array.isArray(state.editorData?.objects) ? state.editorData.objects.length : null;

    if (isSnapEnabled()) {
      if (!(elements.actionToggleSnap instanceof HTMLButtonElement)) {
        throw new Error("Snap toggle button is missing from the renderer toolbar.");
      }
      clickRendererElement(elements.actionToggleSnap);
      await waitForRendererCondition(() => !isSnapEnabled(), "snap toggle to switch off");
    }

    if (isViewportTransformed()) {
      if (!(elements.actionResetView instanceof HTMLButtonElement)) {
        throw new Error("Reset View button is missing from the renderer toolbar.");
      }
      clickRendererElement(elements.actionResetView);
    }

    await waitForRendererCondition(
      () => {
        const view = getViewportState();
        return Math.abs(view.zoom - 1) < 0.001 && Math.abs(view.panX) < 0.001 && Math.abs(view.panY) < 0.001;
      },
      "default viewport state"
    );

    if (!(elements.fieldPlaceholderPreset instanceof HTMLSelectElement)) {
      throw new Error("Placeholder preset selector is missing from the renderer toolbar.");
    }
    updateRendererInputValue(elements.fieldPlaceholderPreset, presetKey);
    await waitForRendererCondition(
      () => state.placeholderPresetKey === presetKey && elements.fieldPlaceholderPreset?.value === presetKey,
      `${presetKey} preset selection`
    );

    if (!(elements.actionNewObject instanceof HTMLButtonElement)) {
      throw new Error("New Placeholder button is missing from the renderer toolbar.");
    }
    clickRendererElement(elements.actionNewObject);

    const createdObject = await waitForRendererCondition(
      () => {
        const selectedObject = getSelectedObject();
        if (!selectedObject || !selectedObject.id.startsWith(objectIdPrefix)) {
          return null;
        }
        return selectedObject;
      },
      `new ${presetLabel} placeholder creation`
    );
    baseResult.objectCreated = true;
    baseResult.objectSelected = true;
    baseResult.objectId = createdObject.id;
    baseResult.objectCountAfterCreate = Array.isArray(state.editorData?.objects) ? state.editorData.objects.length : null;
    baseResult.createdLayerId = createdObject.layerId ?? null;
    baseResult.createdX = Number(createdObject.x);
    baseResult.createdY = Number(createdObject.y);
    baseResult.createdWidth = Number(createdObject.width);
    baseResult.createdHeight = Number(createdObject.height);

    const targetPosition = getViewportAlignmentTarget(createdObject, alignmentAction);
    if (!targetPosition) {
      throw new Error(`Created ${createdObject.id} did not expose a valid viewport alignment target for ${alignmentAction}.`);
    }

    const alignButton = await waitForRendererCondition(
      () => elements.editorToolbar?.querySelector(`[data-align-action="${alignmentAction}"]`) ?? null,
      `${alignmentAction} viewport alignment control`
    );
    clickRendererElement(alignButton);

    const alignedObject = await waitForRendererCondition(
      () => {
        const currentObject = getEditableObjectById(createdObject.id);
        if (
          !currentObject
          || !state.dirty
          || Number(currentObject.x) !== Number(targetPosition.x)
          || Number(currentObject.y) !== Number(targetPosition.y)
        ) {
          return null;
        }

        return currentObject;
      },
      `${createdObject.id} to align through the live toolbar path`
    );
    baseResult.aligned = true;
    baseResult.alignedX = Number(alignedObject.x);
    baseResult.alignedY = Number(alignedObject.y);

    if (!(elements.actionSave instanceof HTMLButtonElement)) {
      throw new Error("Save button is missing from the renderer toolbar.");
    }
    clickRendererElement(elements.actionSave);
    await waitForRendererCondition(
      () => {
        const currentObject = getEditableObjectById(createdObject.id);
        return Boolean(
          !state.dirty
          && state.syncStatus?.status === "synced"
          && currentObject
          && Number(currentObject.x) === baseResult.alignedX
          && Number(currentObject.y) === baseResult.alignedY
        );
      },
      "renderer save and sync completion after live alignment",
      { timeoutMs: 25000 }
    );
    baseResult.saveSucceeded = true;

    if (!(elements.actionReloadEditor instanceof HTMLButtonElement)) {
      throw new Error("Reload button is missing from the renderer toolbar.");
    }
    clickRendererElement(elements.actionReloadEditor);
    await waitForRendererCondition(
      () => state.selectedProjectId === targetProjectId && Boolean(state.editorData),
      `${targetProjectId} reload after live alignment save`
    );

    if (state.selectedObjectId !== createdObject.id) {
      const sceneExplorerButton = await waitForRendererCondition(
        () => elements.sceneExplorer?.querySelector(`[data-object-id="${createdObject.id}"]`) ?? null,
        `${createdObject.id} in the scene explorer after live alignment reload`
      );
      clickRendererElement(sceneExplorerButton);
      await waitForRendererCondition(
        () => state.selectedObjectId === createdObject.id,
        `${createdObject.id} to be selected after live alignment reload`
      );
    }

    const reloadedObject = await waitForRendererCondition(
      () => {
        const currentObject = getEditableObjectById(createdObject.id);
        if (
          !currentObject
          || Number(currentObject.x) !== baseResult.alignedX
          || Number(currentObject.y) !== baseResult.alignedY
        ) {
          return null;
        }

        return currentObject;
      },
      `${createdObject.id} persisted alignment after reload`
    );
    baseResult.reloadSucceeded = true;
    baseResult.objectCountAfterReload = Array.isArray(state.editorData?.objects) ? state.editorData.objects.length : null;
    baseResult.reloadedLayerId = reloadedObject.layerId ?? null;
    baseResult.reloadedX = Number(reloadedObject.x);
    baseResult.reloadedY = Number(reloadedObject.y);
    baseResult.reloadedWidth = Number(reloadedObject.width);
    baseResult.reloadedHeight = Number(reloadedObject.height);

    const replayNode = getReplayNodeById(createdObject.id);
    const replayPosition = replayNode?.position ?? {};
    const replayX = Number(replayPosition.x);
    const replayY = Number(replayPosition.y);
    const replayWidth = Number(replayPosition.width);
    const replayHeight = Number(replayPosition.height);
    baseResult.replayX = Number.isFinite(replayX) ? replayX : null;
    baseResult.replayY = Number.isFinite(replayY) ? replayY : null;
    baseResult.replayWidth = Number.isFinite(replayWidth) ? replayWidth : null;
    baseResult.replayHeight = Number.isFinite(replayHeight) ? replayHeight : null;
    baseResult.replayLayerId = getReplayLayerIdByNodeId(createdObject.id);
    baseResult.syncStatus = state.syncStatus?.status ?? null;
    baseResult.replayPath = toRepoRelativePath(state.syncStatus?.replayPath ?? getReplayTargetPath() ?? "");

    baseResult.internalPersistVerified = baseResult.reloadedX === baseResult.alignedX
      && baseResult.reloadedY === baseResult.alignedY
      && baseResult.reloadedWidth === baseResult.createdWidth
      && baseResult.reloadedHeight === baseResult.createdHeight
      && baseResult.reloadedLayerId === baseResult.createdLayerId;
    baseResult.replaySyncVerified = baseResult.replayX === baseResult.alignedX
      && baseResult.replayY === baseResult.alignedY
      && baseResult.replayWidth === baseResult.createdWidth
      && baseResult.replayHeight === baseResult.createdHeight
      && baseResult.replayLayerId === baseResult.createdLayerId;

    if (!baseResult.internalPersistVerified) {
      throw new Error(`Reloaded created object alignment/state for ${createdObject.id} did not match the saved alignment result.`);
    }

    if (!baseResult.replaySyncVerified) {
      throw new Error(`Replay-facing alignment/state for ${createdObject.id} did not match the saved alignment result.`);
    }

    const successMessage = `Live shell align smoke passed for ${createdObject.id}: aligned to the viewport ${baseResult.alignmentLabel} at (${baseResult.alignedX}, ${baseResult.alignedY}), saved, and reloaded through the Electron bridge.`;
    setPreviewStatus(successMessage);
    baseResult.previewStatus = successMessage;
    document.body.dataset.liveAlignSmoke = "pass";

    if (shouldKeepLiveAlignWindowOpen()) {
      pushLog("Live align smoke keep-open mode is active for visible proof capture.");
    }

    await emitLiveAlignSmoke({
      ...baseResult,
      status: "pass"
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const failureMessage = `Live shell align smoke failed: ${message}`;
    setPreviewStatus(failureMessage);
    document.body.dataset.liveAlignSmoke = "fail";
    await emitLiveAlignSmoke({
      ...baseResult,
      status: "fail",
      error: message,
      previewStatus: failureMessage
    });
  }
}

function setBridgeState(nextState) {
  state.bridge = {
    ...state.bridge,
    ...nextState
  };
}

function formatBridgeDetail(value) {
  return escapeHtml(String(value ?? ""));
}

function shortenBridgePath(filePath) {
  const normalized = String(filePath ?? "").replace(/\\/g, "/");
  const distMarker = "/dist/";
  const distIndex = normalized.lastIndexOf(distMarker);
  if (distIndex >= 0) {
    return normalized.slice(distIndex + 1);
  }

  return normalized;
}

async function captureBridgeHealth() {
  if (!window.myideApi || typeof window.myideApi.bridgeHealth !== "function") {
    return null;
  }

  try {
    return await window.myideApi.bridgeHealth();
  } catch {
    return null;
  }
}

function summarizeBridgeSnapshot(snapshot, projectMessage = null) {
  if (!snapshot) {
    return {
      tone: "warning",
      heading: "Desktop bridge pending",
      message: projectMessage ?? "Checking preload and renderer bridge handshake.",
      details: ["Bridge health data is not available yet."]
    };
  }

  const details = [
    `Preload ${snapshot.preloadExists ? "found" : "missing"}`,
    `Preload executed ${snapshot.preloadExecuted ? "yes" : "no"}`,
    `Renderer ready ${snapshot.rendererReady ? "yes" : "no"}`
  ];

  if (snapshot.preloadPath) {
    details.push(`Path ${shortenBridgePath(snapshot.preloadPath)}`);
  }
  if (snapshot.lastSelectedProjectId) {
    details.push(`Selected ${snapshot.lastSelectedProjectId}`);
  }
  if (snapshot.workspaceProjectCount > 0) {
    details.push(`Workspace ${snapshot.workspaceProjectCount} projects`);
  }
  if (snapshot.lastProjectLoadError) {
    details.push(`Load error ${snapshot.lastProjectLoadError}`);
  }

  let tone = "healthy";
  let heading = "Desktop bridge healthy";
  let message = projectMessage ?? "Preload executed and renderer handshake completed.";

  if (!snapshot.preloadExists || !snapshot.preloadExecuted || !snapshot.bridgeExposed) {
    tone = "error";
    heading = "Desktop bridge unavailable";
    message = "Preload did not expose the desktop bridge in this renderer session.";
  } else if (!snapshot.rendererReady) {
    tone = "warning";
    heading = "Desktop bridge waiting on renderer";
    message = "Preload executed, but the renderer has not completed the bridge handshake yet.";
  } else if (snapshot.lastProjectLoadError) {
    tone = "error";
    heading = "Desktop project load failed";
    message = snapshot.lastProjectLoadError;
  }

  return { tone, heading, message, details };
}

async function checkDesktopBridge() {
  const api = window.myideApi;

  if (!api) {
    setBridgeState({
      tone: "error",
      heading: "Desktop bridge unavailable",
      message: "Preload did not expose window.myideApi in this renderer session.",
      details: ["window.myideApi is missing."]
    });
    renderBridgeStatus();
    throw new Error("Desktop bridge object is missing. Preload may not have executed.");
  }

  if (typeof api.ping !== "function" || typeof api.bridgeHealth !== "function" || typeof api.reportRendererReady !== "function") {
    setBridgeState({
      tone: "error",
      heading: "Desktop bridge incomplete",
      message: "The renderer can see window.myideApi, but the bridge health helpers are missing.",
      details: ["Expected ping, bridgeHealth, and reportRendererReady helpers on window.myideApi."]
    });
    renderBridgeStatus();
    throw new Error("Desktop bridge helpers are missing from window.myideApi.");
  }

  setBridgeState({
    tone: "warning",
    heading: "Desktop bridge checking",
    message: "Confirming preload execution and renderer handshake.",
    details: ["Running bridge ping and health checks."]
  });
  renderBridgeStatus();

  await api.ping();
  await api.reportRendererReady();
  const snapshot = await api.bridgeHealth();
  const summary = summarizeBridgeSnapshot(snapshot);
  setBridgeState({
    ...summary,
    snapshot
  });
  renderBridgeStatus();
}

async function refreshBridgeProjectStatus(projectMessage = null) {
  const snapshot = await captureBridgeHealth();
  const summary = summarizeBridgeSnapshot(snapshot, projectMessage);
  setBridgeState({
    ...summary,
    snapshot
  });
}

function bindActions() {
  elements.actionRescan?.addEventListener("click", () => {
    void reloadWorkspace(false, state.selectedProjectId);
  });
  elements.actionUndo?.addEventListener("click", () => {
    handleUndo();
  });
  elements.actionRedo?.addEventListener("click", () => {
    handleRedo();
  });
  elements.actionZoomOut?.addEventListener("click", () => {
    handleViewportZoom("out");
  });
  elements.actionZoomIn?.addEventListener("click", () => {
    handleViewportZoom("in");
  });
  elements.actionFitView?.addEventListener("click", () => {
    handleFitViewport();
  });
  elements.actionResetView?.addEventListener("click", () => {
    handleResetViewport();
  });
  elements.actionToggleSnap?.addEventListener("click", () => {
    handleToggleSnap();
  });
  elements.actionNewObject?.addEventListener("click", () => {
    handleCreateNewObject();
  });
  elements.fieldPlaceholderPreset?.addEventListener("change", () => {
    if (elements.fieldPlaceholderPreset instanceof HTMLSelectElement) {
      state.placeholderPresetKey = elements.fieldPlaceholderPreset.value || "generic-box";
    }
  });
  elements.actionSelectPrevious?.addEventListener("click", () => {
    handleSelectLayerSibling("previous");
  });
  elements.actionSelectNext?.addEventListener("click", () => {
    handleSelectLayerSibling("next");
  });
  if (elements.fieldPlaceholderPreset instanceof HTMLSelectElement) {
    state.placeholderPresetKey = elements.fieldPlaceholderPreset.value || state.placeholderPresetKey;
  }
  elements.actionDuplicate?.addEventListener("click", () => {
    handleDuplicateSelectedObject();
  });
  elements.actionDelete?.addEventListener("click", () => {
    handleDeleteSelectedObject();
  });
  elements.actionSave?.addEventListener("click", () => {
    void handleSaveEditor();
  });
  elements.actionReloadEditor?.addEventListener("click", () => {
    void reloadWorkspace(false, state.selectedProjectId);
  });
  elements.workflowPanelbar?.addEventListener("click", (event) => {
    handleNavigationClick(event);
  });
  elements.panelInvestigation?.addEventListener("click", (event) => {
    handleNavigationClick(event);
  });
  elements.panelDonor?.addEventListener("click", (event) => {
    handleNavigationClick(event);
  });
  elements.panelCompose?.addEventListener("click", (event) => {
    handleNavigationClick(event);
  });
  elements.workflowVabsPanel?.addEventListener("click", (event) => {
    handleNavigationClick(event);
  });
  elements.workbenchModebar?.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const modeButton = target.closest("[data-workbench-mode]");
    if (!(modeButton instanceof HTMLElement) || !modeButton.dataset.workbenchMode) {
      return;
    }

    event.preventDefault();
    setWorkbenchMode(modeButton.dataset.workbenchMode);
  });
  elements.onboardingCard?.addEventListener("click", (event) => {
    handleNavigationClick(event);
  });
  elements.runtimeToolbar?.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const actionButton = target.closest("[data-runtime-action]");
    if (!(actionButton instanceof HTMLElement) || !actionButton.dataset.runtimeAction) {
      return;
    }

    event.preventDefault();
    closeToolbarMenuFromTarget(target);
    void handleRuntimeAction(actionButton.dataset.runtimeAction);
  });
  if (elements.runtimeWebview) {
    elements.runtimeWebview.addEventListener("did-start-loading", () => {
      state.runtimeUi.loading = true;
      state.runtimeUi.ready = false;
      state.runtimeUi.lastError = null;
      state.runtimeUi.currentUrl = elements.runtimeWebview.getURL?.() || state.runtimeUi.currentUrl;
      renderAll();
    });
    elements.runtimeWebview.addEventListener("did-stop-loading", () => {
      state.runtimeUi.loading = false;
      state.runtimeUi.currentUrl = elements.runtimeWebview.getURL?.() || state.runtimeUi.currentUrl;
      renderAll();
      void refreshRuntimeResourceMap({ silent: true });
      void refreshRuntimeOverrideStatus({ silent: true });
    });
    elements.runtimeWebview.addEventListener("did-fail-load", (event) => {
      state.runtimeUi.loading = false;
      state.runtimeUi.ready = false;
      state.runtimeUi.lastError = `Runtime load failed (${event.errorCode} ${event.errorDescription})`;
      renderAll();
    });
    elements.runtimeWebview.addEventListener("page-title-updated", (event) => {
      state.runtimeUi.pageTitle = event.title ?? state.runtimeUi.pageTitle;
      renderAll();
    });
    elements.runtimeWebview.addEventListener("console-message", (event) => {
      if (!handleRuntimeConsoleMessage(event.message)) {
        recordRuntimeConsoleEvent({
          type: "guest-console",
          level: event.level,
          message: trimRuntimeText(event.message, 240)
        });
      }
    });
    elements.runtimeWebview.addEventListener("dom-ready", () => {
      state.runtimeUi.currentUrl = elements.runtimeWebview.getURL?.() || state.runtimeUi.currentUrl;
      void refreshRuntimeResourceMap({ silent: true });
      void refreshRuntimeOverrideStatus({ silent: true });
      void installRuntimeBridge();
    });
  }
  elements.editorToolbar?.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const orderButton = target.closest("[data-order-action]");
    if (orderButton instanceof HTMLElement) {
      const action = orderButton.dataset.orderAction;
      if (action) {
        closeToolbarMenuFromTarget(target);
        handleOrderSelectedObject(action);
      }
      return;
    }

    const alignButton = target.closest("[data-align-action]");
    if (alignButton instanceof HTMLElement) {
      const alignment = alignButton.dataset.alignAction;
      if (alignment) {
        closeToolbarMenuFromTarget(target);
        handleAlignSelectedObject(alignment);
        return;
      }
    }

    const compositionButton = target.closest("[data-compose-action]");
    if (!(compositionButton instanceof HTMLElement)) {
      return;
    }

    const compositionAction = compositionButton.dataset.composeAction;
    if (!compositionAction) {
      return;
    }

    closeToolbarMenuFromTarget(target);
    if (compositionAction.startsWith("align-")) {
      handleAlignSelection(compositionAction);
    } else if (compositionAction === "distribute-h") {
      handleDistributeSelection("horizontal");
    } else if (compositionAction === "distribute-v") {
      handleDistributeSelection("vertical");
    }
  });
  elements.projectBrowser?.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const button = target.closest("[data-project-id]");
    if (!(button instanceof HTMLElement)) {
      return;
    }

    const projectId = button.dataset.projectId;
    if (projectId) {
      void reloadWorkspace(false, projectId);
    }
  });
  elements.sceneExplorer?.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const layerToggle = target.closest("[data-layer-action]");
    if (layerToggle instanceof HTMLElement) {
      const layerId = layerToggle.dataset.layerId;
      const action = layerToggle.dataset.layerAction;
      if (layerId && action) {
        handleLayerAction(layerId, action);
      }
      return;
    }

    const objectButton = target.closest("[data-object-id]");
    if (!(objectButton instanceof HTMLElement)) {
      return;
    }

    const objectId = objectButton.dataset.objectId;
    if (objectId) {
      setSelectedObject(objectId, {
        additive: isAdditiveSelectionEvent(event),
        toggle: isAdditiveSelectionEvent(event)
      });
      renderAll();
    }
  });
  elements.evidenceBrowser?.addEventListener("click", (event) => {
    if (handleCopyEvent(event)) {
      return;
    }

    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const objectButton = target.closest("[data-select-object-id]");
    if (objectButton instanceof HTMLElement && objectButton.dataset.selectObjectId) {
      event.preventDefault();
      selectObjectFromEvidence(objectButton.dataset.selectObjectId);
      return;
    }

    const replaceButton = target.closest("[data-donor-replace-asset-id]");
    if (replaceButton instanceof HTMLElement && replaceButton.dataset.donorReplaceAssetId) {
      event.preventDefault();
      handleReplaceSelectedObjectWithDonorAsset(replaceButton.dataset.donorReplaceAssetId);
      return;
    }

    const donorAssetTypeFilter = target.closest("[data-donor-asset-type-filter]");
    if (donorAssetTypeFilter instanceof HTMLElement) {
      event.preventDefault();
      state.donorAssetUi.fileTypeFilter = donorAssetTypeFilter.dataset.donorAssetTypeFilter || "all";
      renderAll();
      const filterLabel = state.donorAssetUi.fileTypeFilter === "all"
        ? "all donor image formats"
        : `${state.donorAssetUi.fileTypeFilter.toUpperCase()} donor images`;
      setPreviewStatus(`Showing ${filterLabel} in the donor asset palette.`);
      return;
    }

    const importGroupButton = target.closest("[data-import-donor-asset-group-key]");
    if (importGroupButton instanceof HTMLElement && importGroupButton.dataset.importDonorAssetGroupKey) {
      event.preventDefault();
      handleImportDonorAssetGroup(importGroupButton.dataset.importDonorAssetGroupKey);
      return;
    }

    const donorAssetCard = target.closest("[data-donor-asset-id]");
    if (donorAssetCard instanceof HTMLElement && donorAssetCard.dataset.donorAssetId) {
      state.donorAssetUi.highlightedAssetId = donorAssetCard.dataset.donorAssetId;
      renderAll();
      const donorAsset = getDonorAssetById(donorAssetCard.dataset.donorAssetId);
      setPreviewStatus(`Ready to drag ${donorAsset?.title ?? donorAssetCard.dataset.donorAssetId} into the Editor Canvas.`);
      return;
    }

    const highlightButton = target.closest("[data-highlight-evidence-id]");
    if (highlightButton instanceof HTMLElement && highlightButton.dataset.highlightEvidenceId) {
      event.preventDefault();
      focusEvidenceItem(highlightButton.dataset.highlightEvidenceId);
      return;
    }

    const filterButton = target.closest("[data-evidence-filter-mode]");
    if (filterButton instanceof HTMLElement) {
      event.preventDefault();
      setEvidenceFilterMode(filterButton.dataset.evidenceFilterMode === "selected");
      renderAll();
      setPreviewStatus(state.evidenceUi.selectedObjectOnly
        ? "Showing donor evidence grounded for the selected object."
        : "Showing the full donor evidence catalog.");
      return;
    }

    const clearButton = target.closest("[data-clear-evidence-filter]");
    if (clearButton instanceof HTMLElement) {
      event.preventDefault();
      setEvidenceFilterMode(false);
      renderAll();
      setPreviewStatus("Cleared the donor evidence filter.");
    }
  });
  elements.editorCanvas?.addEventListener("click", (event) => {
    if (consumeViewportSuppressedClick()) {
      event.preventDefault();
      return;
    }

    if (isAdditiveSelectionEvent(event)) {
      return;
    }

    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const objectNode = target.closest("[data-canvas-object-id]");
    if (!(objectNode instanceof HTMLElement)) {
      return;
    }

    const objectId = objectNode.dataset.canvasObjectId;
    if (objectId) {
      setSelectedObject(objectId, {
        additive: isAdditiveSelectionEvent(event),
        toggle: isAdditiveSelectionEvent(event)
      });
      renderAll();
    }
  });
  elements.evidenceBrowser?.addEventListener("input", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) {
      return;
    }

    if (target.dataset.donorAssetSearch !== "1") {
      return;
    }

    state.donorAssetUi.searchQuery = target.value ?? "";
    renderAll();
    window.requestAnimationFrame(() => {
      const nextField = elements.evidenceBrowser?.querySelector("[data-donor-asset-search='1']");
      if (nextField instanceof HTMLInputElement) {
        nextField.focus();
        nextField.setSelectionRange(nextField.value.length, nextField.value.length);
      }
    });
  });
  elements.evidenceBrowser?.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement)) {
      return;
    }

    if (target.dataset.donorImportTargetLayer === "1") {
      state.donorAssetUi.importTargetLayerId = target.value || "auto";
      renderAll();
      setPreviewStatus(`Donor imports now target ${getDonorImportTargetLayerLabel()}.`);
      return;
    }

    if (target.dataset.donorAssetGroupFilter === "1") {
      state.donorAssetUi.assetGroupFilter = target.value || "all";
      renderAll();
      const selectedGroup = getDonorAssetGroupSummary(target.value || "all");
      setPreviewStatus(selectedGroup
        ? `Showing donor asset bundle ${selectedGroup.label}.`
        : "Showing all donor asset bundles in the donor palette.");
    }
  });
  elements.evidenceBrowser?.addEventListener("dragstart", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const donorAssetCard = target.closest("[data-donor-asset-id]");
    if (!(donorAssetCard instanceof HTMLElement) || !donorAssetCard.dataset.donorAssetId || !event.dataTransfer) {
      return;
    }

    const payload = buildDonorAssetDragPayload(donorAssetCard.dataset.donorAssetId);
    if (!payload) {
      return;
    }

    event.dataTransfer.effectAllowed = "copy";
    event.dataTransfer.setData("application/x-myide-donor-asset", JSON.stringify(payload));
    event.dataTransfer.setData("text/plain", JSON.stringify(payload));
    state.donorAssetUi.highlightedAssetId = payload.assetId;
    state.donorAssetUi.dragPayload = payload;
    const donorAsset = getDonorAssetById(payload.assetId);
    setPreviewStatus(`Dragging ${donorAsset?.title ?? payload.assetId}. Drop onto empty canvas to create on ${getDonorImportTargetLayerLabel()}, or drop onto an editable object to replace it directly.`);
  });
  elements.evidenceBrowser?.addEventListener("dragend", () => {
    clearDonorDragState();
  });
  elements.editorCanvas?.addEventListener("dragenter", (event) => {
    const viewport = event.target instanceof HTMLElement
      ? event.target.closest("[data-donor-drop-zone]")
      : null;
    const payload = readDonorAssetDragPayload(event.dataTransfer);
    if (!(viewport instanceof HTMLElement) || !payload) {
      return;
    }

    event.preventDefault();
    setDonorDropIntent(resolveDonorDropIntent(event.target, state.donorAssetUi?.dropIntent ?? null));
  });
  elements.editorCanvas?.addEventListener("dragover", (event) => {
    const viewport = event.target instanceof HTMLElement
      ? event.target.closest("[data-donor-drop-zone]")
      : null;
    const payload = readDonorAssetDragPayload(event.dataTransfer);
    if (!viewport || !payload) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    setDonorDropIntent(resolveDonorDropIntent(event.target, state.donorAssetUi?.dropIntent ?? null));
  });
  elements.editorCanvas?.addEventListener("dragleave", (event) => {
    const viewport = event.target instanceof HTMLElement
      ? event.target.closest("[data-donor-drop-zone]")
      : null;
    if (!(viewport instanceof HTMLElement)) {
      return;
    }

    const nextTarget = event.relatedTarget;
    if (nextTarget instanceof Node && viewport.contains(nextTarget)) {
      return;
    }

    clearDonorDropIntent(viewport);
  });
  elements.editorCanvas?.addEventListener("drop", (event) => {
    const viewport = event.target instanceof HTMLElement
      ? event.target.closest("[data-donor-drop-zone]")
      : null;
    const payload = readDonorAssetDragPayload(event.dataTransfer);
    if (!(viewport instanceof HTMLElement)) {
      return;
    }

    event.preventDefault();
    if (!payload) {
      clearDonorDragState(viewport);
      setPreviewStatus("Drop ignored because the donor payload was missing. Start the drag from a donor asset card again.");
      return;
    }

    const scenePoint = getScenePointFromEvent(event);
    const dropIntent = resolveDonorDropIntent(event.target, state.donorAssetUi?.dropIntent ?? null);
    processDonorAssetDrop(payload, scenePoint, dropIntent);
    clearDonorDragState(viewport);
  });
  elements.editorCanvas?.addEventListener("pointerdown", (event) => {
    handleCanvasPointerDown(event);
  });
  window.addEventListener("pointermove", (event) => {
    handleCanvasPointerMove(event);
  });
  window.addEventListener("pointerup", (event) => {
    handleCanvasPointerUp(event);
  });
  window.addEventListener("pointercancel", (event) => {
    handleCanvasPointerUp(event);
  });
  window.addEventListener("keydown", (event) => {
    handleCanvasKeyboard(event);
  });
  window.addEventListener("keyup", (event) => {
    handleCanvasKeyUp(event);
  });
  window.addEventListener("blur", () => {
    clearViewportInteractionState();
  });
  elements.inspector?.addEventListener("input", (event) => {
    handleInspectorEvent(event);
  });
  elements.inspector?.addEventListener("click", (event) => {
    if (handleNavigationClick(event)) {
      return;
    }

    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const focusLinkageButton = target.closest("[data-focus-linkage-refs]");
    if (focusLinkageButton instanceof HTMLElement) {
      event.preventDefault();
      let refs = [];
      try {
        const parsed = JSON.parse(String(focusLinkageButton.dataset.focusLinkageRefs ?? "[]"));
        refs = Array.isArray(parsed)
          ? parsed.map((value) => String(value).trim()).filter((value) => value.length > 0)
          : [];
      } catch {
        refs = [];
      }
      const label = focusLinkageButton.dataset.focusLinkageLabel ?? "selected object evidence";
      focusSelectedObjectEvidence(refs, label);
      return;
    }

    const clearButton = target.closest("[data-clear-evidence-filter]");
    if (clearButton instanceof HTMLElement) {
      event.preventDefault();
      setEvidenceFilterMode(false);
      renderAll();
      setPreviewStatus("Cleared the donor evidence filter.");
    }
  });
  elements.inspector?.addEventListener("change", (event) => {
    handleInspectorEvent(event);
  });
  elements.newProjectForm?.addEventListener("submit", (event) => {
    void handleCreateProject(event);
  });
  elements.fieldDisplayName?.addEventListener("input", () => {
    if (!(elements.fieldSlug instanceof HTMLInputElement) || elements.fieldSlug.dataset.userEdited === "true") {
      return;
    }

    elements.fieldSlug.value = slugifyValue(elements.fieldDisplayName?.value ?? "");
  });
  elements.fieldSlug?.addEventListener("input", () => {
    if (elements.fieldSlug instanceof HTMLInputElement) {
      elements.fieldSlug.dataset.userEdited = elements.fieldSlug.value.trim().length > 0 ? "true" : "false";
    }
  });
}

function clone(value) {
  return value ? JSON.parse(JSON.stringify(value)) : value;
}

function getEditorStateTools() {
  function createUniqueObjectId(objects, baseId) {
    const existingIds = new Set((Array.isArray(objects) ? objects : []).map((entry) => entry.id));
    const normalizedBaseId = String(baseId ?? "object").trim() || "object";

    if (!existingIds.has(normalizedBaseId)) {
      return normalizedBaseId;
    }

    let suffix = 2;
    let candidate = `${normalizedBaseId}-copy`;

    while (existingIds.has(candidate)) {
      candidate = `${normalizedBaseId}-copy-${suffix}`;
      suffix += 1;
    }

    return candidate;
  }

  return window.MyIDEEditorState ?? {
    clone,
    fingerprint: (editorData) => JSON.stringify(editorData ?? null),
    createHistory: (editorData, limit = 50) => ({
      limit: Math.max(1, Math.floor(limit ?? 50)),
      savedFingerprint: JSON.stringify(editorData ?? null),
      undoStack: [],
      redoStack: []
    }),
    isDirty: (history, editorData) => JSON.stringify(editorData ?? null) !== history?.savedFingerprint,
    markSaved: (history, editorData) => ({
      ...(history ?? { limit: 50, undoStack: [], redoStack: [] }),
      savedFingerprint: JSON.stringify(editorData ?? null)
    }),
    pushUndoSnapshot: (history, snapshot, label) => ({
      ...(history ?? { limit: 50, savedFingerprint: JSON.stringify(snapshot ?? null), undoStack: [], redoStack: [] }),
      undoStack: [...(history?.undoStack ?? []), { label: label ?? "Edit", snapshot: clone(snapshot) }],
      redoStack: []
    }),
    undo: (history, currentEditorData) => {
      if (!history || history.undoStack.length === 0) {
        return null;
      }

      const previous = history.undoStack[history.undoStack.length - 1];
      return {
        history: {
          ...history,
          undoStack: history.undoStack.slice(0, -1),
          redoStack: [...history.redoStack, { label: previous.label, snapshot: clone(currentEditorData) }]
        },
        editorData: clone(previous.snapshot),
        label: previous.label
      };
    },
    redo: (history, currentEditorData) => {
      if (!history || history.redoStack.length === 0) {
        return null;
      }

      const next = history.redoStack[history.redoStack.length - 1];
      return {
        history: {
          ...history,
          redoStack: history.redoStack.slice(0, -1),
          undoStack: [...history.undoStack, { label: next.label, snapshot: clone(currentEditorData) }]
        },
        editorData: clone(next.snapshot),
        label: next.label
      };
    },
    duplicateObject: (editorData, selectedObjectId) => {
      if (!editorData || !Array.isArray(editorData.objects)) {
        return null;
      }

      const source = editorData.objects.find((entry) => entry.id === selectedObjectId);
      if (!source) {
        return null;
      }

      const duplicate = clone(source);
      duplicate.id = createUniqueObjectId(editorData.objects, source.id);
      duplicate.displayName = source.displayName ? `${source.displayName} Copy` : duplicate.id;
      duplicate.x = Number.isFinite(source.x) ? source.x + 24 : 24;
      duplicate.y = Number.isFinite(source.y) ? source.y + 24 : 24;
      duplicate.locked = false;
      editorData.objects.push(duplicate);

      return {
        objectId: duplicate.id,
        label: duplicate.displayName
      };
    },
    deleteObject: (editorData, selectedObjectId) => {
      if (!editorData || !Array.isArray(editorData.objects)) {
        return null;
      }

      const index = editorData.objects.findIndex((entry) => entry.id === selectedObjectId);
      if (index < 0) {
        return null;
      }

      const [removed] = editorData.objects.splice(index, 1);
      const nextSelectedObjectId = editorData.objects[index]?.id
        ?? editorData.objects[index - 1]?.id
        ?? null;

      return {
        objectId: removed.id,
        label: removed.displayName,
        nextSelectedObjectId
      };
    }
  };
}

function resetEditorHistory() {
  const tools = getEditorStateTools();
  state.history = tools.createHistory(state.editorData);
  state.dirty = false;
}

function syncDirtyState() {
  state.dirty = Boolean(state.editorData) && getEditorStateTools().isDirty(state.history, state.editorData);
}

function syncEditorSceneReferences(editorData) {
  if (!editorData?.scene) {
    return;
  }

  if (Array.isArray(editorData.layers)) {
    editorData.scene.layerIds = sortLayers(editorData.layers).map((layer) => layer.id);
  }

  if (Array.isArray(editorData.objects)) {
    editorData.scene.objectIds = editorData.objects.map((object) => object.id);
  }
}

function reconcileSelectedObject(preferredObjectId = state.selectedObjectId, fallbackObjectId = null) {
  if (!state.editorData || !Array.isArray(state.editorData.objects)) {
    state.selectedObjectId = null;
    state.selectedObjectIds = [];
    return;
  }

  const tools = getEditorStateTools();
  const availableIds = new Set(state.editorData.objects.map((entry) => entry.id));
  const preservedSelectionIds = uniqueStrings([
    ...(Array.isArray(state.selectedObjectIds) ? state.selectedObjectIds : []),
    preferredObjectId,
    fallbackObjectId
  ]).filter((objectId) => availableIds.has(objectId));
  if (typeof tools.resolveSelectedObjectId === "function") {
    state.selectedObjectId = tools.resolveSelectedObjectId(state.editorData.objects, preferredObjectId, fallbackObjectId);
  } else {
    const objects = state.editorData.objects;
    const preferred = objects.find((entry) => entry.id === preferredObjectId);
    if (preferred) {
      state.selectedObjectId = preferred.id;
    } else {
      const fallback = objects.find((entry) => entry.id === fallbackObjectId);
      if (fallback) {
        state.selectedObjectId = fallback.id;
      } else {
        const editable = objects.find((entry) => isObjectEditable(entry));
        state.selectedObjectId = editable?.id ?? objects[0]?.id ?? null;
      }
    }
  }

  if (!state.selectedObjectId) {
    state.selectedObjectIds = [];
    return;
  }

  const nextSelectionIds = [
    state.selectedObjectId,
    ...preservedSelectionIds.filter((objectId) => objectId !== state.selectedObjectId)
  ];
  state.selectedObjectIds = nextSelectionIds.length > 0 ? nextSelectionIds : [state.selectedObjectId];
}

function recordUndoSnapshot(beforeSnapshot, label) {
  if (!beforeSnapshot) {
    return;
  }

  state.history = getEditorStateTools().pushUndoSnapshot(state.history, beforeSnapshot, label);
  syncDirtyState();
}

function applyEditorMutation(label, mutate) {
  if (!state.editorData) {
    return false;
  }

  const tools = getEditorStateTools();
  const beforeSnapshot = clone(state.editorData);
  const beforeFingerprint = tools.fingerprint(beforeSnapshot);
  mutate(state.editorData);
  syncEditorSceneReferences(state.editorData);

  if (tools.fingerprint(state.editorData) === beforeFingerprint) {
    return false;
  }

  recordUndoSnapshot(beforeSnapshot, label);
  pushLog(label);
  renderAll();
  return true;
}

function canUndo() {
  return Boolean(state.history?.undoStack?.length);
}

function canRedo() {
  return Boolean(state.history?.redoStack?.length);
}

function getSnapSize() {
  return Number.isFinite(state.snap?.size) && state.snap.size > 0 ? state.snap.size : 10;
}

function isSnapEnabled() {
  return Boolean(state.snap?.enabled);
}

function normalizeObjectPosition(object, x, y) {
  const tools = getEditorStateTools();
  const normalized = isSnapEnabled() && typeof tools.snapPoint === "function"
    ? tools.snapPoint({ x, y }, getSnapSize())
    : {
      x: Math.round(x),
      y: Math.round(y)
    };

  return clampObjectPosition(object, normalized.x, normalized.y);
}

function getSelectedLayerLabel() {
  const selectedObject = getSelectedObject();
  if (!selectedObject) {
    return isLayerIsolationActive()
      ? `${getIsolatedLayer()?.displayName ?? "Solo Layer"} · solo`
      : "No layer";
  }

  const label = getLayerById(selectedObject.layerId)?.displayName ?? selectedObject.layerId;
  return isLayerIsolationActive() ? `${label} · solo` : label;
}

function slugifyValue(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "project";
}

function labelizeStatus(value) {
  return String(value ?? "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function labelizeStage(stageId) {
  return String(stageId ?? "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function toRepoRelativePath(filePath) {
  if (typeof filePath !== "string" || filePath.length === 0) {
    return "";
  }

  const normalized = filePath.replace(/\\/g, "/");
  const repoIndex = normalized.indexOf("40_projects/");
  if (repoIndex >= 0) {
    return normalized.slice(repoIndex);
  }

  const logsIndex = normalized.indexOf("logs/");
  if (logsIndex >= 0) {
    return normalized.slice(logsIndex);
  }

  return normalized.replace(/^\/+/, "");
}

function copyTextWithLegacyFallback(text) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  textarea.style.pointerEvents = "none";
  textarea.style.inset = "0 auto auto -9999px";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  textarea.setSelectionRange(0, textarea.value.length);

  try {
    return document.execCommand("copy");
  } finally {
    textarea.remove();
  }
}

async function writeTextToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return true;
  }

  return copyTextWithLegacyFallback(text);
}

async function handleCopyValue(copyValue, copyLabel = "value") {
  if (typeof copyValue !== "string" || copyValue.trim().length === 0) {
    return;
  }

  try {
    const copied = await writeTextToClipboard(copyValue);
    if (!copied) {
      throw new Error("Clipboard write was unavailable.");
    }

    pushLog(`Copied ${copyLabel}.`);
    setPreviewStatus(`Copied ${copyLabel} to the clipboard.`);
  } catch (error) {
    console.warn("Failed to copy value from donor evidence panel.", error);
    pushLog(`Copy failed for ${copyLabel}.`);
    setPreviewStatus(`Could not copy ${copyLabel}.`);
  }
}

function handleCopyEvent(event) {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const copyButton = target.closest("[data-copy-value]");
  if (!(copyButton instanceof HTMLElement)) {
    return false;
  }

  event.preventDefault();
  const copyValue = copyButton.dataset.copyValue ?? "";
  const copyLabel = copyButton.dataset.copyLabel ?? "value";
  void handleCopyValue(copyValue, copyLabel);
  return true;
}

function setPreviewStatus(text) {
  if (elements.previewStatus) {
    elements.previewStatus.textContent = text;
  }
}

function setCreateProjectStatus(text, isError = false) {
  if (!elements.createProjectStatus) {
    return;
  }

  elements.createProjectStatus.textContent = text;
  elements.createProjectStatus.dataset.tone = isError ? "error" : "default";
}

function formatSyncTimestamp(value) {
  if (typeof value !== "string" || value.length === 0) {
    return "No sync yet this session";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toISOString().replace("T", " ").replace(".000Z", "Z");
}

function getReplayTargetPath(project = getSelectedProject()) {
  return project?.keyPaths?.projectJsonPath ?? null;
}

function setSyncStatus(patch) {
  const selectedProject = getSelectedProject();
  const defaultReplayPath = getReplayTargetPath(selectedProject);
  state.syncStatus = {
    projectId: selectedProject?.projectId ?? state.selectedProjectId ?? null,
    status: "idle",
    replayPath: defaultReplayPath,
    lastSyncedAt: null,
    syncBridge: null,
    message: "No save/sync has run in this session yet.",
    ...state.syncStatus,
    ...patch
  };
}

function ensureSyncStatusForSelectedProject() {
  const selectedProject = getSelectedProject();

  if (!selectedProject) {
    state.syncStatus = null;
    return;
  }

  const replayPath = getReplayTargetPath(selectedProject);
  if (state.syncStatus?.projectId === selectedProject.projectId) {
    state.syncStatus = {
      ...state.syncStatus,
      replayPath: state.syncStatus.replayPath ?? replayPath
    };
    return;
  }

  state.syncStatus = {
    projectId: selectedProject.projectId,
    status: "idle",
    replayPath,
    lastSyncedAt: null,
    syncBridge: null,
    message: "No save/sync has run in this session yet."
  };
}

function pushLog(text) {
  const stamp = new Date().toISOString().slice(11, 19);
  state.activityLog = [{ stamp, text }, ...state.activityLog].slice(0, 10);
}

function getWorkspace() {
  return state.bundle?.workspace ?? null;
}

function getWorkspaceProjects() {
  const workspace = getWorkspace();
  return Array.isArray(workspace?.projects) ? workspace.projects : [];
}

function getSelectedProject() {
  const projects = getWorkspaceProjects();
  if (projects.length === 0) {
    return null;
  }

  return projects.find((entry) => entry.projectId === state.selectedProjectId) ?? projects[0];
}

function getSelectedProjectVabsStatus() {
  return state.bundle?.vabs ?? null;
}

function getProjectModificationHandoff() {
  return state.bundle?.modificationHandoff ?? null;
}

function getProjectModificationTasks() {
  const handoff = getProjectModificationHandoff();
  return Array.isArray(handoff?.topTasks) ? handoff.topTasks : [];
}

function getProjectModificationTask(taskId) {
  if (typeof taskId !== "string" || taskId.length === 0) {
    return null;
  }

  return getProjectModificationTasks().find((task) => task.taskId === taskId) ?? null;
}

function getProjectModificationTaskByKitGroupKey(groupKey) {
  if (typeof groupKey !== "string" || groupKey.length === 0) {
    return null;
  }

  return getProjectModificationTasks().find((task) => getProjectModificationTaskKitGroupKey(task) === groupKey) ?? null;
}

function getActiveProjectModificationTask() {
  return getProjectModificationTask(state.modificationTaskUi?.activeTaskId ?? null);
}

function normalizeRepoLikePath(value) {
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }

  const normalized = value.trim().replace(/\\/g, "/").replace(/^\/+/, "");
  return normalized.length > 0 ? normalized : null;
}

function getPathBasename(value) {
  const normalized = normalizeRepoLikePath(value);
  if (!normalized) {
    return null;
  }

  const segments = normalized.split("/").filter((segment) => segment.length > 0);
  return segments.length > 0 ? segments[segments.length - 1] : null;
}

function getComparablePathNameTokens(value) {
  const basename = getPathBasename(value);
  if (!basename) {
    return [];
  }

  const variants = new Set();
  const pushVariant = (candidate) => {
    if (typeof candidate !== "string") {
      return;
    }
    const normalized = candidate.trim().toLowerCase();
    if (!normalized) {
      return;
    }
    variants.add(normalized);
    variants.add(slugifyValue(normalized));
  };

  pushVariant(basename);
  let current = basename.toLowerCase();
  for (let index = 0; index < 4; index += 1) {
    const withoutFinalExtension = current.replace(/\.[a-z0-9]+$/, "");
    if (withoutFinalExtension === current) {
      break;
    }
    current = withoutFinalExtension;
    pushVariant(current);

    const withoutSizeSuffix = current.replace(/(?:[_-]\d+){2,}$/, "");
    if (withoutSizeSuffix !== current) {
      current = withoutSizeSuffix;
      pushVariant(current);
    }
  }

  return uniqueStrings(Array.from(variants));
}

function getModificationTaskArtifactPaths(task) {
  return uniqueStrings([
    task?.sourceArtifactPath,
    ...(Array.isArray(task?.supportingArtifactPaths) ? task.supportingArtifactPaths : [])
  ].filter((value) => typeof value === "string" && value.length > 0));
}

function getProjectModificationTaskKitGroupKey(task) {
  if (!task?.taskId) {
    return null;
  }

  return `modification-task:${task.taskId}`;
}

function getProjectModificationTaskKitGroupSummary(task) {
  const groupKey = getProjectModificationTaskKitGroupKey(task);
  return groupKey ? getDonorAssetGroupSummary(groupKey) : null;
}

function getSceneSectionEntryForDonorAssetGroupKey(groupKey, editorData = state.editorData) {
  if (typeof groupKey !== "string" || groupKey.length === 0) {
    return null;
  }

  return getSceneSectionEntries(editorData).find((entry) => entry?.provenance?.primaryGroupKey === groupKey) ?? null;
}

function getProjectModificationTaskSceneSection(task, editorData = state.editorData) {
  const groupKey = getProjectModificationTaskKitGroupKey(task);
  return groupKey ? getSceneSectionEntryForDonorAssetGroupKey(groupKey, editorData) : null;
}

function getProjectModificationTaskReconstructionPages(task) {
  return Array.isArray(task?.reconstructionPages)
    ? task.reconstructionPages.filter((page) => page && typeof page.pageName === "string" && page.pageName.length > 0)
    : [];
}

function buildProjectModificationTaskPageRuntimeProofMap(status) {
  const entries = Array.isArray(status?.entries) ? status.entries : [];
  return entries.reduce((accumulator, entry) => {
    const proofKey = getProjectModificationTaskPageRuntimeProofKey(entry?.taskId, entry?.pageName);
    if (!proofKey || typeof entry?.sourceUrl !== "string" || entry.sourceUrl.length === 0) {
      return accumulator;
    }

    accumulator[proofKey] = {
      ...entry,
      sourceUrl: getRuntimeCanonicalSourceUrl(entry.sourceUrl) ?? entry.sourceUrl
    };
    return accumulator;
  }, {});
}

function applyProjectModificationTaskPageRuntimeProofStatus(status, options = {}) {
  if (state.bundle) {
    state.bundle.runtimePageProofs = status ?? null;
  }
  state.modificationTaskUi.pageRuntimeProofs = buildProjectModificationTaskPageRuntimeProofMap(status);
  if (options.render !== false) {
    renderAll();
  }
}

function getProjectModificationTaskPageRuntimeProofKey(taskId, pageName) {
  if (typeof taskId !== "string" || taskId.length === 0 || typeof pageName !== "string" || pageName.length === 0) {
    return null;
  }

  return `${taskId}::${pageName.trim().toLowerCase()}`;
}

function getProjectModificationTaskPageRuntimeProof(taskId, pageName) {
  const proofKey = getProjectModificationTaskPageRuntimeProofKey(taskId, pageName);
  if (!proofKey) {
    return null;
  }

  return state.modificationTaskUi?.pageRuntimeProofs?.[proofKey] ?? null;
}

function setProjectModificationTaskPageRuntimeProof(taskId, pageName, proof, options = {}) {
  const proofKey = getProjectModificationTaskPageRuntimeProofKey(taskId, pageName);
  if (!proofKey) {
    return null;
  }

  const nextProofs = {
    ...(state.modificationTaskUi?.pageRuntimeProofs ?? {})
  };
  if (proof && typeof proof.sourceUrl === "string" && proof.sourceUrl.length > 0) {
    const canonicalSourceUrl = getRuntimeCanonicalSourceUrl(proof.sourceUrl) ?? proof.sourceUrl;
    nextProofs[proofKey] = {
      ...proof,
      sourceUrl: canonicalSourceUrl
    };
  } else {
    delete nextProofs[proofKey];
  }
  state.modificationTaskUi.pageRuntimeProofs = nextProofs;
  if (options.render !== false) {
    renderAll();
  }

  return nextProofs[proofKey] ?? null;
}

async function persistProjectModificationTaskPageRuntimeProof({
  taskId = null,
  pageName = null,
  sourceUrl = null,
  runtimeLabel = null,
  profileId = null,
  requestSource = null,
  requestBacked = true,
  relativePath = null,
  localMirrorRepoRelativePath = null,
  overrideHitCountAfterReload = 0
} = {}) {
  if (!taskId || !pageName || typeof sourceUrl !== "string" || sourceUrl.length === 0) {
    return null;
  }

  const canonicalSourceUrl = getRuntimeCanonicalSourceUrl(sourceUrl) ?? sourceUrl;
  const proof = {
    sourceUrl: canonicalSourceUrl,
    runtimeLabel: runtimeLabel ?? pageName,
    profileId: typeof profileId === "string" && profileId.length > 0 ? profileId : null,
    requestSource: typeof requestSource === "string" && requestSource.length > 0 ? requestSource : null,
    requestBacked: requestBacked !== false,
    relativePath: typeof relativePath === "string" && relativePath.length > 0 ? relativePath : null,
    localMirrorRepoRelativePath: typeof localMirrorRepoRelativePath === "string" && localMirrorRepoRelativePath.length > 0 ? localMirrorRepoRelativePath : null,
    overrideHitCountAfterReload: Number(overrideHitCountAfterReload ?? 0),
    savedAtUtc: new Date().toISOString()
  };

  setProjectModificationTaskPageRuntimeProof(taskId, pageName, proof, { render: false });
  const api = window.myideApi;
  if (api && typeof api.saveRuntimePageProof === "function" && typeof state.selectedProjectId === "string" && state.selectedProjectId.length > 0) {
    try {
      const persistedStatus = await api.saveRuntimePageProof(state.selectedProjectId, {
        taskId,
        pageName,
        sourceUrl: proof.sourceUrl,
        runtimeLabel: proof.runtimeLabel,
        profileId: proof.profileId,
        requestSource: proof.requestSource,
        requestBacked: proof.requestBacked,
        relativePath: proof.relativePath,
        localMirrorRepoRelativePath: proof.localMirrorRepoRelativePath,
        overrideHitCountAfterReload: proof.overrideHitCountAfterReload
      });
      if (persistedStatus) {
        applyProjectModificationTaskPageRuntimeProofStatus(persistedStatus, { render: false });
      }
    } catch (error) {
      pushLog(`Could not persist page runtime proof for ${taskId}/${pageName}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return proof;
}

function getRuntimeWorkbenchEntryBySourceUrl(sourceUrl) {
  const canonicalSourceUrl = typeof sourceUrl === "string" && sourceUrl.length > 0
    ? (getRuntimeCanonicalSourceUrl(sourceUrl) ?? sourceUrl)
    : null;
  if (!canonicalSourceUrl) {
    return null;
  }

  return getRuntimeWorkbenchEntries().find((entry) => {
    const entrySourceUrl = getRuntimeCanonicalSourceUrl(entry?.sourceUrl) ?? entry?.sourceUrl ?? null;
    return entrySourceUrl === canonicalSourceUrl;
  }) ?? null;
}

function getProjectModificationTaskPageRuntimeProofEntry(taskId, pageName) {
  const proof = getProjectModificationTaskPageRuntimeProof(taskId, pageName);
  if (!proof?.sourceUrl) {
    return null;
  }

  const entry = getRuntimeWorkbenchEntryBySourceUrl(proof.sourceUrl);
  if (!entry) {
    return null;
  }

  return {
    proof,
    entry
  };
}

function getProjectModificationTaskPageMatchTokens(page) {
  return uniqueStrings([
    page?.pageName,
    page?.selectedLocalPath,
    page?.topAffectedSlotName,
    page?.topAffectedAttachmentName,
    ...(Array.isArray(page?.affectedSlotNames) ? page.affectedSlotNames : []),
    ...(Array.isArray(page?.affectedAttachmentNames) ? page.affectedAttachmentNames : []),
    ...(Array.isArray(page?.regionNames) ? page.regionNames : []),
    ...getComparablePathNameTokens(page?.pageName),
    ...getComparablePathNameTokens(page?.selectedLocalPath)
  ].map((value) => slugifyValue(value)).filter(Boolean));
}

function getProjectModificationTaskKitAssetForPage(taskKitAssets, page) {
  const pageSourceBasename = getPathBasename(page?.selectedLocalPath);
  if (!pageSourceBasename) {
    return null;
  }

  return taskKitAssets.find((asset) => uniqueStrings([
    getPathBasename(asset?.repoRelativePath),
    getPathBasename(asset?.absolutePath),
    getPathBasename(asset?.filename),
    getPathBasename(asset?.title)
  ].filter(Boolean)).includes(pageSourceBasename)) ?? null;
}

function getProjectModificationTaskPageMatchScore(page, {
  selectedObject = null,
  selectedDonorAsset = null
} = {}) {
  let score = 0;
  const pageSourceBasename = getPathBasename(page?.selectedLocalPath);
  const selectedAssetBasenames = uniqueStrings([
    getPathBasename(selectedDonorAsset?.repoRelativePath),
    getPathBasename(selectedDonorAsset?.absolutePath),
    getPathBasename(selectedDonorAsset?.filename),
    getPathBasename(selectedDonorAsset?.title)
  ].filter(Boolean));

  if (pageSourceBasename && selectedAssetBasenames.includes(pageSourceBasename)) {
    score += 120;
  }

  const objectTokens = uniqueStrings([
    selectedObject?.id,
    selectedObject?.displayName,
    selectedObject?.assetRef,
    selectedObject?.placeholderRef,
    selectedObject?.type,
    selectedDonorAsset?.filename,
    selectedDonorAsset?.title
  ].map((value) => slugifyValue(value)).filter(Boolean));
  const pageTokens = getProjectModificationTaskPageMatchTokens(page);

  if (objectTokens.some((token) => pageTokens.includes(token))) {
    score += 60;
  } else if (objectTokens.some((token) => pageTokens.some((pageToken) => pageToken.includes(token) || token.includes(pageToken)))) {
    score += 25;
  }

  return score;
}

function getProjectModificationTaskSceneMembersForPage(sceneKitContext, page) {
  if (!sceneKitContext || !Array.isArray(sceneKitContext.memberObjects) || sceneKitContext.memberObjects.length === 0) {
    return [];
  }

  const matchedAssetId = page?.matchedTaskKitAsset?.assetId ?? null;
  const pageSourceBasename = getPathBasename(page?.selectedLocalPath);
  return sceneKitContext.memberObjects.filter((entry) => {
    const donorAsset = getDonorAssetForObject(entry);
    if (matchedAssetId && donorAsset?.assetId === matchedAssetId) {
      return true;
    }

    if (!pageSourceBasename) {
      return false;
    }

    return uniqueStrings([
      getPathBasename(donorAsset?.repoRelativePath),
      getPathBasename(donorAsset?.absolutePath),
      getPathBasename(donorAsset?.filename),
      getPathBasename(donorAsset?.title)
    ].filter(Boolean)).includes(pageSourceBasename);
  });
}

function getProjectModificationTaskLeadSceneMemberForPage(page) {
  const matchedSceneMembers = Array.isArray(page?.matchedSceneMembers) ? page.matchedSceneMembers : [];
  if (matchedSceneMembers.length === 0) {
    return null;
  }

  const cueTokens = getProjectModificationTaskPageMatchTokens(page);
  let bestMember = matchedSceneMembers[0] ?? null;
  let bestScore = Number.NEGATIVE_INFINITY;

  for (const member of matchedSceneMembers) {
    const donorAsset = getDonorAssetForObject(member);
    const memberTokens = uniqueStrings([
      member?.id,
      member?.displayName,
      member?.assetRef,
      donorAsset?.filename,
      donorAsset?.title,
      donorAsset?.assetId
    ].map((value) => slugifyValue(value)).filter(Boolean));

    let score = 0;
    if (memberTokens.some((token) => cueTokens.includes(token))) {
      score += 40;
    } else if (memberTokens.some((token) => cueTokens.some((cueToken) => cueToken.includes(token) || token.includes(cueToken)))) {
      score += 15;
    }

    if (member?.id === state.selectedObjectId) {
      score += 10;
    }

    if (score > bestScore) {
      bestScore = score;
      bestMember = member;
    }
  }

  return bestMember;
}

function getProjectModificationTaskRuntimeMatchForPage(task, page) {
  const pageProofEntry = getProjectModificationTaskPageRuntimeProofEntry(task?.taskId, page?.pageName);
  if (pageProofEntry?.entry) {
    return {
      entry: pageProofEntry.entry,
      matchKind: "page-proof",
      matchScore: 240
    };
  }

  const pageSourceBasename = getPathBasename(page?.selectedLocalPath);
  const matchedAssetId = page?.matchedTaskKitAsset?.assetId ?? null;
  const pageTokens = getProjectModificationTaskPageMatchTokens(page);
  const workbenchEntries = getRuntimeWorkbenchEntries();
  let bestEntry = null;
  let bestScore = Number.NEGATIVE_INFINITY;
  let bestKind = null;

  for (const entry of workbenchEntries) {
    const entryBasenames = uniqueStrings([
      getPathBasename(entry?.relativePath),
      getPathBasename(entry?.localMirrorRepoRelativePath),
      getPathBasename(entry?.sourceUrl)
    ].filter(Boolean));
    const entryNameTokens = uniqueStrings([
      ...entryBasenames,
      ...getComparablePathNameTokens(entry?.relativePath),
      ...getComparablePathNameTokens(entry?.localMirrorRepoRelativePath),
      ...getComparablePathNameTokens(entry?.sourceUrl)
    ]);
    const entryHaystack = `${entry?.relativePath ?? ""} ${entry?.localMirrorRepoRelativePath ?? ""} ${entry?.sourceUrl ?? ""}`.toLowerCase();
    const normalizedEntryHaystack = slugifyValue(entryHaystack);
    let score = Number.NEGATIVE_INFINITY;
    let kind = null;

    if (matchedAssetId && entry?.donorAsset?.assetId === matchedAssetId) {
      score = 180;
      kind = "donor-asset";
    } else if (pageTokens.some((token) => entryNameTokens.includes(token))) {
      score = 170;
      kind = "page-name";
    } else if (pageSourceBasename && entryBasenames.includes(pageSourceBasename)) {
      score = 160;
      kind = "page-source";
    } else if (pageTokens.some((token) => token.length >= 3 && (entryHaystack.includes(token) || normalizedEntryHaystack.includes(token)))) {
      score = 90;
      kind = "cue-token";
    }

    if (score > Number.NEGATIVE_INFINITY && entry?.kind === "debug-host-proof") {
      score += 30;
    }
    if (score > Number.NEGATIVE_INFINITY && Number(entry?.overrideHitCountAfterReload ?? 0) > 0) {
      score += 15;
    }
    if (score > Number.NEGATIVE_INFINITY && entry?.requestBacked) {
      score += 10;
    }

    if (score > bestScore) {
      bestScore = score;
      bestEntry = entry;
      bestKind = kind;
    }
  }

  if (bestScore > Number.NEGATIVE_INFINITY) {
    return {
      entry: bestEntry,
      matchKind: bestKind,
      matchScore: bestScore
    };
  }

  const debugHostFallback = workbenchEntries.find((entry) => entry?.kind === "debug-host-proof") ?? null;
  if (debugHostFallback) {
    return {
      entry: debugHostFallback,
      matchKind: "debug-host-fallback",
      matchScore: 0
    };
  }

  return {
    entry: null,
    matchKind: null,
    matchScore: null
  };
}

function getProjectModificationTaskContextForSceneKit(sceneKitContext, {
  selectedObject = getSelectedObject()
} = {}) {
  if (!sceneKitContext?.groupKey) {
    return null;
  }

  const task = getProjectModificationTaskByKitGroupKey(sceneKitContext.groupKey);
  if (!task) {
    return null;
  }

  const activeTask = getActiveProjectModificationTask();
  const taskKitGroupSummary = getProjectModificationTaskKitGroupSummary(task);
  const taskKitAssets = taskKitGroupSummary ? getDonorAssetItemsForGroup(taskKitGroupSummary.key) : [];
  const selectedDonorAsset = getDonorAssetForObject(selectedObject);
  const reconstructionPages = getProjectModificationTaskReconstructionPages(task)
    .map((page) => ({
      ...page,
      matchedTaskKitAsset: getProjectModificationTaskKitAssetForPage(taskKitAssets, page),
      matchedSceneMembers: [],
      matchScore: getProjectModificationTaskPageMatchScore(page, {
        selectedObject,
        selectedDonorAsset
      })
    }))
    .sort((left, right) => {
      const scoreDiff = (right.matchScore ?? 0) - (left.matchScore ?? 0);
      if (scoreDiff !== 0) {
        return scoreDiff;
      }

      return String(left.pageName ?? "").localeCompare(String(right.pageName ?? ""));
    });
  for (const page of reconstructionPages) {
    page.matchedSceneMembers = getProjectModificationTaskSceneMembersForPage(sceneKitContext, page);
    page.leadSceneMember = getProjectModificationTaskLeadSceneMemberForPage(page);
    const runtimeMatch = getProjectModificationTaskRuntimeMatchForPage(task, page);
    page.matchedRuntimeWorkbenchEntry = runtimeMatch.entry;
    page.runtimeMatchKind = runtimeMatch.matchKind;
    page.runtimeMatchScore = runtimeMatch.matchScore;
  }
  const selectedReconstructionPage = reconstructionPages[0]?.matchScore > 0
    ? reconstructionPages[0]
    : null;
  const orderedReconstructionPages = selectedReconstructionPage
    ? [
      selectedReconstructionPage,
      ...reconstructionPages.filter((page) => page.pageName !== selectedReconstructionPage.pageName)
    ]
    : reconstructionPages;
  const visibleReconstructionPages = orderedReconstructionPages.slice(0, 3);
  const preferredReplaceAssets = [];
  const preferredReplaceAssetIds = new Set();
  if (selectedReconstructionPage?.matchedTaskKitAsset?.assetId && selectedReconstructionPage.matchedTaskKitAsset.assetId !== selectedDonorAsset?.assetId) {
    preferredReplaceAssets.push(selectedReconstructionPage.matchedTaskKitAsset);
    preferredReplaceAssetIds.add(selectedReconstructionPage.matchedTaskKitAsset.assetId);
  }
  for (const asset of taskKitAssets) {
    if (!asset?.assetId || asset.assetId === selectedDonorAsset?.assetId || preferredReplaceAssetIds.has(asset.assetId)) {
      continue;
    }

    preferredReplaceAssets.push(asset);
    preferredReplaceAssetIds.add(asset.assetId);
    if (preferredReplaceAssets.length >= 4) {
      break;
    }
  }
  const visibleReplaceAssets = preferredReplaceAssets.length > 0 ? preferredReplaceAssets : taskKitAssets.slice(0, 4);

  return {
    task,
    isActiveTask: activeTask?.taskId === task.taskId,
    taskKitGroupSummary,
    taskKitAssets,
    selectedDonorAsset,
    selectedReconstructionPage,
    visibleReconstructionPages,
    hiddenReconstructionPageCount: Math.max(0, reconstructionPages.length - visibleReconstructionPages.length),
    visibleReplaceAssets,
    hiddenReplaceAssetCount: Math.max(0, taskKitAssets.length - visibleReplaceAssets.length)
  };
}

function getRuntimeWorkbenchEntryForModificationTask(task) {
  if (!task) {
    return null;
  }

  const pageProofEntry = getProjectModificationTaskReconstructionPages(task)
    .map((page) => getProjectModificationTaskPageRuntimeProofEntry(task.taskId, page.pageName))
    .find((entry) => entry?.entry) ?? null;
  if (pageProofEntry?.entry) {
    return pageProofEntry.entry;
  }

  const artifactPaths = getModificationTaskArtifactPaths(task)
    .map((value) => normalizeRepoLikePath(value))
    .filter(Boolean);
  if (artifactPaths.length === 0) {
    return null;
  }

  const artifactBasenames = uniqueStrings(artifactPaths.map((value) => getPathBasename(value)).filter(Boolean));
  const artifactPathSet = new Set(artifactPaths);
  const artifactBasenameSet = new Set(artifactBasenames);
  const familyToken = typeof task.familyName === "string" ? task.familyName.toLowerCase() : "";
  const sectionToken = typeof task.sectionKey === "string" ? task.sectionKey.toLowerCase().replace(/[^a-z0-9]+/g, "") : "";

  let bestEntry = null;
  let bestScore = Number.NEGATIVE_INFINITY;

  for (const entry of getRuntimeWorkbenchEntries()) {
    const localMirrorPath = normalizeRepoLikePath(entry.localMirrorRepoRelativePath);
    const relativePath = normalizeRepoLikePath(entry.relativePath);
    const sourceUrl = normalizeRepoLikePath(entry.sourceUrl);
    const localMirrorBasename = getPathBasename(localMirrorPath);
    const relativeBasename = getPathBasename(relativePath);
    const sourceBasename = getPathBasename(sourceUrl);

    let score = Number.NEGATIVE_INFINITY;
    if (localMirrorPath && artifactPathSet.has(localMirrorPath)) {
      score = 120;
    } else if (relativePath && artifactPaths.some((artifactPath) => artifactPath.endsWith(relativePath))) {
      score = 100;
    } else if (localMirrorBasename && artifactBasenameSet.has(localMirrorBasename)) {
      score = 80;
    } else if (relativeBasename && artifactBasenameSet.has(relativeBasename)) {
      score = 70;
    } else if (sourceBasename && artifactBasenameSet.has(sourceBasename)) {
      score = 60;
    }

    const entryHaystack = `${relativePath ?? ""} ${localMirrorPath ?? ""} ${sourceUrl ?? ""}`.toLowerCase();
    if (score > Number.NEGATIVE_INFINITY && familyToken && entryHaystack.includes(familyToken.replace(/_/g, "-"))) {
      score += 5;
    }
    if (score > Number.NEGATIVE_INFINITY && sectionToken && entryHaystack.replace(/[^a-z0-9]+/g, "").includes(sectionToken)) {
      score += 5;
    }

    if (score > bestScore) {
      bestScore = score;
      bestEntry = entry;
    }
  }

  return bestScore > Number.NEGATIVE_INFINITY ? bestEntry : null;
}

async function proveProjectModificationTaskPageRuntime({
  taskId = null,
  pageName = null,
  runtimeLabel = null,
  runtimeProfileId = null,
  candidateHintTokens = []
} = {}) {
  const result = await openRuntimeDebugHostWindow({
    proofMode: true,
    profileId: runtimeProfileId,
    candidateHintTokens,
      switchToRuntime: true,
      statusPrefix: `${runtimeLabel ?? pageName ?? "Page cue"} requested the stronger Runtime Debug Host proof path using ${labelizeStatus(runtimeProfileId ?? "autoplay")}`
  });
  if (taskId && pageName && typeof result?.candidateRuntimeSourceUrl === "string" && result.candidateRuntimeSourceUrl.length > 0) {
    await persistProjectModificationTaskPageRuntimeProof({
      taskId,
      pageName,
      sourceUrl: result.candidateRuntimeSourceUrl,
      runtimeLabel: runtimeLabel ?? pageName,
      profileId: typeof result?.proofProfileId === "string" ? result.proofProfileId : (runtimeProfileId ?? null),
      requestSource: typeof result?.candidateRequestSource === "string" ? result.candidateRequestSource : null,
      requestBacked: true,
      relativePath: typeof result?.candidateRuntimeRelativePath === "string" ? result.candidateRuntimeRelativePath : null,
      localMirrorRepoRelativePath: typeof result?.localMirrorSourcePath === "string" ? result.localMirrorSourcePath : null,
      overrideHitCountAfterReload: Number(result?.overrideHitCountAfterReload ?? 0)
    });
  }

  return result ?? null;
}

function setActiveProjectModificationTask(taskId, options = {}) {
  const task = getProjectModificationTask(taskId);
  state.modificationTaskUi.activeTaskId = task?.taskId ?? null;
  if (options.render !== false) {
    renderAll();
  }
  return task;
}

function openProjectModificationTask(taskId, mode = "preferred") {
  const task = setActiveProjectModificationTask(taskId, { render: false });
  if (!task) {
    setPreviewStatus("Could not find that prepared modification task in the current project handoff.");
    renderAll();
    return;
  }

  const runtimeEntry = getRuntimeWorkbenchEntryForModificationTask(task);
  const targetMode = mode === "runtime"
    ? "runtime"
    : mode === "compose"
      ? "compose"
      : task.preferredWorkflowPanel === "runtime"
        ? "runtime"
        : "compose";

  if (runtimeEntry?.sourceUrl) {
    setRuntimeWorkbenchSource(runtimeEntry.sourceUrl, { render: false });
  }

  const taskKitGroupSummary = getProjectModificationTaskKitGroupSummary(task);
  const importedSceneSection = getProjectModificationTaskSceneSection(task);
  if (taskKitGroupSummary) {
    state.donorAssetUi.assetGroupFilter = taskKitGroupSummary.key;
    const taskKitAsset = getDonorAssetItemsForGroup(taskKitGroupSummary.key)[0] ?? null;
    state.donorAssetUi.highlightedAssetId = taskKitAsset?.assetId ?? null;
  }

  if (targetMode === "runtime") {
    setWorkbenchMode("runtime", { silent: true });
    state.workflowUi.activePanel = "runtime";
  } else if (importedSceneSection?.memberObjectIds?.length) {
    focusSceneObjectGroupInWorkflow(importedSceneSection.memberObjectIds, {
      label: "scene section",
      statusMessage: runtimeEntry
        ? `Opened ${task.displayName}${task.sectionKey ? ` ${task.sectionKey}` : ""} and selected imported scene section ${importedSceneSection.label} in Compose Mode. Runtime-linked source: ${runtimeEntry.relativePath ?? runtimeEntry.localMirrorRepoRelativePath ?? runtimeEntry.sourceUrl}.`
        : `Opened ${task.displayName}${task.sectionKey ? ` ${task.sectionKey}` : ""} and selected imported scene section ${importedSceneSection.label} in Compose Mode. Continue editing the grouped task kit from source artifact ${task.sourceArtifactPath ?? "pending artifact"}.`
    });
    return;
  } else {
    setWorkbenchMode(task.preferredWorkbenchMode === "runtime" ? "runtime" : "scene", { silent: true });
    state.workflowUi.activePanel = "compose";
  }

  renderAll();
  setPreviewStatus(
    runtimeEntry
      ? `${task.displayName}${task.sectionKey ? ` ${task.sectionKey}` : ""} is now the active modification task. ${targetMode === "runtime" ? "Runtime" : "Compose"} is active with grounded runtime source ${runtimeEntry.relativePath ?? runtimeEntry.localMirrorRepoRelativePath ?? runtimeEntry.sourceUrl}${taskKitGroupSummary ? ` and donor task kit ${taskKitGroupSummary.label} is now filtered in the donor palette.` : "."}`
      : `${task.displayName}${task.sectionKey ? ` ${task.sectionKey}` : ""} is now the active modification task. ${targetMode === "runtime" ? "Runtime" : "Compose"} is active, but no request-backed runtime workbench source is matched yet. Continue from source artifact ${task.sourceArtifactPath ?? "pending artifact"}${taskKitGroupSummary ? ` and donor task kit ${taskKitGroupSummary.label} is now filtered in the donor palette.` : "."}`
  );
}

function renderProjectModificationTaskRow(task) {
  if (!task) {
    return "";
  }

  const runtimeEntry = getRuntimeWorkbenchEntryForModificationTask(task);
  const taskKitGroupSummary = getProjectModificationTaskKitGroupSummary(task);
  const importedSceneSection = getProjectModificationTaskSceneSection(task);
  const reconstructionPages = getProjectModificationTaskReconstructionPages(task);
  const pageGuideSummary = reconstructionPages.length > 0
    ? `${reconstructionPages.length} page cue${reconstructionPages.length === 1 ? "" : "s"} · ${reconstructionPages[0].pageName}${reconstructionPages[0].selectedMode ? ` ${reconstructionPages[0].selectedMode}` : ""}`
    : "page guide · no page-aware reconstruction cues yet";
  const runtimeLabel = runtimeEntry
    ? (runtimeEntry.relativePath ?? runtimeEntry.localMirrorRepoRelativePath ?? runtimeEntry.sourceUrl)
    : "No grounded runtime source matched yet";
  const isActive = state.modificationTaskUi?.activeTaskId === task.taskId;

  return `
    <div class="investigation-row">
      <strong>${escapeHtml(task.displayName)} <code>${escapeHtml(task.taskStatus)}</code>${isActive ? ` <code>active</code>` : ""}</strong>
      <small>${escapeHtml(task.familyName)}${task.sectionKey ? ` · ${escapeHtml(task.sectionKey)}` : ""} · ${escapeHtml(task.sourceArtifactKind)} · ${escapeHtml(task.preferredWorkflowPanel)}</small>
      <small>${escapeHtml(task.nextAction)}</small>
      <small>${task.sourceArtifactPath ? `source artifact · ${escapeHtml(task.sourceArtifactPath)}` : "source artifact · pending"}</small>
      <small>runtime context · ${escapeHtml(runtimeLabel)}</small>
      <small>${escapeHtml(pageGuideSummary)}</small>
      <small>${taskKitGroupSummary ? `task kit · ${escapeHtml(taskKitGroupSummary.label)} (${escapeHtml(String(taskKitGroupSummary.count))} source image${taskKitGroupSummary.count === 1 ? "" : "s"})` : "task kit · no donor-backed import kit yet"}</small>
      <small>${importedSceneSection ? `compose surface · ${escapeHtml(importedSceneSection.label)} (${escapeHtml(String(importedSceneSection.count))} grouped object${importedSceneSection.count === 1 ? "" : "s"})` : "compose surface · import the task kit to create the grouped scene section"}</small>
      <div class="evidence-actions">
        <button
          type="button"
          class="copy-button"
          data-project-modification-action="start-task"
          data-project-modification-task-id="${escapeAttribute(task.taskId)}"
        >Start Task</button>
        <button
          type="button"
          class="copy-button"
          data-project-modification-action="open-compose-task"
          data-project-modification-task-id="${escapeAttribute(task.taskId)}"
          ${task.canOpenCompose ? "" : "disabled"}
        >Open Compose</button>
        <button
          type="button"
          class="copy-button"
          data-project-modification-action="open-runtime-task"
          data-project-modification-task-id="${escapeAttribute(task.taskId)}"
          ${task.canOpenRuntime ? "" : "disabled"}
        >Open Runtime</button>
        ${taskKitGroupSummary ? `<button type="button" class="copy-button" data-focus-donor-asset-group-key="${escapeAttribute(taskKitGroupSummary.key)}">Show Task Kit</button>` : ""}
        ${taskKitGroupSummary ? `<button type="button" class="copy-button" data-import-donor-asset-group-key="${escapeAttribute(taskKitGroupSummary.key)}">Import Task Kit</button>` : ""}
        ${importedSceneSection ? `<button type="button" class="copy-button" data-focus-scene-section-id="${escapeAttribute(importedSceneSection.id)}">Select Imported Kit</button>` : ""}
        ${importedSceneSection ? `<button type="button" class="copy-button" data-frame-scene-section-id="${escapeAttribute(importedSceneSection.id)}">Frame Imported Kit</button>` : ""}
        ${task.sourceArtifactPath ? renderCopyButton(task.sourceArtifactPath, `${task.displayName} source artifact path`, "Copy Source Artifact") : ""}
      </div>
    </div>
  `;
}

function renderActiveProjectModificationTaskCard() {
  const task = getActiveProjectModificationTask();
  if (!task) {
    return "";
  }

  const runtimeEntry = getRuntimeWorkbenchEntryForModificationTask(task);
  const taskKitGroupSummary = getProjectModificationTaskKitGroupSummary(task);
  const importedSceneSection = getProjectModificationTaskSceneSection(task);
  const reconstructionPages = getProjectModificationTaskReconstructionPages(task);
  const pageGuideSummary = reconstructionPages.length > 0
    ? `${reconstructionPages.length} page cue${reconstructionPages.length === 1 ? "" : "s"} ready. Lead page ${reconstructionPages[0].pageName}${reconstructionPages[0].selectedMode ? ` uses ${reconstructionPages[0].selectedMode}` : ""}.`
    : "No page-aware reconstruction guide is available for this task yet.";
  const runtimeSummary = runtimeEntry
    ? (runtimeEntry.relativePath ?? runtimeEntry.localMirrorRepoRelativePath ?? runtimeEntry.sourceUrl)
    : "No request-backed runtime workbench source is matched yet.";

  return `
    <div class="tree-row">
      <strong>Active Modification Task</strong>
      <span>${escapeHtml(task.displayName)}${task.sectionKey ? ` · ${escapeHtml(task.sectionKey)}` : ""} · ${escapeHtml(task.sourceArtifactKind)}</span>
      <div class="chip-row">
        <span>${escapeHtml(task.taskStatus)}</span>
        <span>${escapeHtml(task.preferredWorkflowPanel)}</span>
        <span>${runtimeEntry ? "runtime matched" : "runtime not matched"}</span>
        <span>${taskKitGroupSummary ? `${escapeHtml(String(taskKitGroupSummary.count))} task-kit source${taskKitGroupSummary.count === 1 ? "" : "s"}` : "no task kit"}</span>
        <span>${importedSceneSection ? "scene kit imported" : "scene kit not imported"}</span>
      </div>
      <small>${escapeHtml(task.nextAction)}</small>
      <small>Runtime context · ${escapeHtml(runtimeSummary)}</small>
      <small>${escapeHtml(pageGuideSummary)}</small>
      <small>${taskKitGroupSummary ? `Donor task kit · ${escapeHtml(taskKitGroupSummary.label)} on ${escapeHtml(taskKitGroupSummary.suggestedLayerId)}` : "This task does not yet expose an importable donor-backed task kit."}</small>
      <small>${importedSceneSection ? `Compose surface · ${escapeHtml(importedSceneSection.label)} with ${escapeHtml(String(importedSceneSection.count))} grouped object${importedSceneSection.count === 1 ? "" : "s"}.` : "Compose surface · import the task kit to create a grouped editable scene section."}</small>
      <div class="evidence-actions">
        <button
          type="button"
          class="copy-button"
          data-project-modification-action="open-compose-task"
          data-project-modification-task-id="${escapeAttribute(task.taskId)}"
          ${task.canOpenCompose ? "" : "disabled"}
        >Open Compose</button>
        <button
          type="button"
          class="copy-button"
          data-project-modification-action="open-runtime-task"
          data-project-modification-task-id="${escapeAttribute(task.taskId)}"
          ${task.canOpenRuntime ? "" : "disabled"}
        >Open Runtime</button>
        ${taskKitGroupSummary ? `<button type="button" class="copy-button" data-focus-donor-asset-group-key="${escapeAttribute(taskKitGroupSummary.key)}">Show Task Kit</button>` : ""}
        ${taskKitGroupSummary ? `<button type="button" class="copy-button" data-import-donor-asset-group-key="${escapeAttribute(taskKitGroupSummary.key)}">Import Task Kit</button>` : ""}
        ${importedSceneSection ? `<button type="button" class="copy-button" data-focus-scene-section-id="${escapeAttribute(importedSceneSection.id)}">Select Imported Kit</button>` : ""}
        ${importedSceneSection ? `<button type="button" class="copy-button" data-frame-scene-section-id="${escapeAttribute(importedSceneSection.id)}">Frame Imported Kit</button>` : ""}
        ${task.sourceArtifactPath ? renderCopyButton(task.sourceArtifactPath, `${task.displayName} source artifact path`, "Copy Source Artifact") : ""}
      </div>
    </div>
  `;
}

function getSelectedObject() {
  if (!state.editorData || !Array.isArray(state.editorData.objects)) {
    return null;
  }

  return state.editorData.objects.find((entry) => entry.id === state.selectedObjectId) ?? null;
}

function getSelectedObjectIds() {
  if (!state.editorData || !Array.isArray(state.editorData.objects)) {
    return [];
  }

  const availableIds = new Set(state.editorData.objects.map((entry) => entry.id));
  const nextIds = [];
  const pushId = (value) => {
    if (typeof value !== "string" || !availableIds.has(value) || nextIds.includes(value)) {
      return;
    }
    nextIds.push(value);
  };

  pushId(state.selectedObjectId);
  (Array.isArray(state.selectedObjectIds) ? state.selectedObjectIds : []).forEach(pushId);
  return nextIds;
}

function getSelectedObjects() {
  return getSelectedObjectIds()
    .map((objectId) => getCanvasObjectById(objectId))
    .filter(Boolean);
}

function isObjectSelected(objectId) {
  return typeof objectId === "string" && getSelectedObjectIds().includes(objectId);
}

function hasMultiSelection() {
  return getSelectedObjectIds().length > 1;
}

function asJsonObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : null;
}

function asJsonObjectArray(value) {
  return Array.isArray(value)
    ? value.filter((entry) => entry && typeof entry === "object" && !Array.isArray(entry))
    : [];
}

function asStringList(value) {
  return Array.isArray(value)
    ? value.filter((entry) => typeof entry === "string" && entry.trim().length > 0)
    : [];
}

function normalizeEvidenceRefs(value) {
  if (Array.isArray(value)) {
    return value.filter((entry) => typeof entry === "string" && entry.trim().length > 0);
  }

  if (typeof value === "string" && value.trim().length > 0) {
    return value
      .split(",")
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
  }

  return [];
}

function uniqueStrings(values) {
  return [...new Set(values.filter((entry) => typeof entry === "string" && entry.trim().length > 0))];
}

function getReplayProject() {
  return asJsonObject(state.bundle?.project);
}

function getImportArtifact() {
  return asJsonObject(state.bundle?.importArtifact);
}

function getImportProject() {
  return asJsonObject(getImportArtifact()?.project);
}

function getProjectAssets(projectLike) {
  return asJsonObjectArray(asJsonObject(projectLike)?.assets);
}

function getProjectStates(projectLike) {
  return asJsonObjectArray(asJsonObject(projectLike)?.states);
}

function getProjectAnimations(projectLike) {
  return asJsonObjectArray(asJsonObject(projectLike)?.animations);
}

function collectProjectNodes(projectLike) {
  return asJsonObjectArray(asJsonObject(projectLike)?.scenes).flatMap((scene) =>
    asJsonObjectArray(scene.layers).flatMap((layer) => asJsonObjectArray(layer.nodes))
  );
}

function findProjectNodeByObjectId(projectLike, objectId) {
  return collectProjectNodes(projectLike).find((node) => {
    const extensions = asJsonObject(node.extensions);
    return node.nodeId === objectId || extensions?.editorObjectId === objectId;
  }) ?? null;
}

function findProjectAssetByRef(projectLike, assetRef) {
  if (typeof assetRef !== "string" || assetRef.length === 0) {
    return null;
  }

  return getProjectAssets(projectLike).find((asset) => asset.assetId === assetRef) ?? null;
}

function collectImportNodeEvidenceEntries(projectLike) {
  return collectProjectNodes(projectLike).flatMap((node) => {
    const extensions = asJsonObject(node.extensions);
    const evidenceRefs = normalizeEvidenceRefs(extensions?.evidenceRefs);
    if (evidenceRefs.length === 0) {
      return [];
    }

    return [{
      nodeId: typeof node.nodeId === "string" ? node.nodeId : "unknown-node",
      evidenceRefs,
      notes: typeof extensions?.notes === "string" ? extensions.notes : null
    }];
  });
}

function collectImportAssetEvidenceEntries(projectLike) {
  return getProjectAssets(projectLike).flatMap((asset) => {
    const provenance = asJsonObject(asset.provenance);
    const evidenceRefs = normalizeEvidenceRefs(provenance?.evidenceRef);
    if (evidenceRefs.length === 0) {
      return [];
    }

    return [{
      assetId: typeof asset.assetId === "string" ? asset.assetId : null,
      name: typeof asset.name === "string" ? asset.name : "Unnamed asset",
      origin: typeof provenance?.origin === "string" ? provenance.origin : null,
      donorId: typeof provenance?.donorId === "string" ? provenance.donorId : null,
      evidenceRefs,
      notes: typeof provenance?.notes === "string" ? provenance.notes : null
    }];
  });
}

function getProjectPathSummary(selectedProject) {
  return uniqueStrings([
    selectedProject?.keyPaths?.evidenceRoot,
    selectedProject?.keyPaths?.reportsRoot,
    selectedProject?.keyPaths?.importsRoot,
    selectedProject?.keyPaths?.importArtifactPath
  ].filter((entry) => typeof entry === "string" && entry.length > 0));
}

function collectObjectStateLinkage(projectLike, objectId) {
  return getProjectStates(projectLike).flatMap((stateEntry) => {
    const entryActions = asJsonObjectArray(stateEntry.entryActions);
    const matchingActions = entryActions.filter((action) => action.target === objectId);
    if (matchingActions.length === 0) {
      return [];
    }

    return [{
      stateId: typeof stateEntry.stateId === "string" ? stateEntry.stateId : "unknown-state",
      name: typeof stateEntry.name === "string" ? stateEntry.name : "Unnamed state",
      actionTypes: uniqueStrings(matchingActions.map((action) => String(action.type ?? "action"))),
      evidenceRefs: normalizeEvidenceRefs(asJsonObject(stateEntry.extensions)?.evidenceRefs)
    }];
  });
}

function collectObjectAnimationLinkage(projectLike, objectId) {
  return getProjectAnimations(projectLike).flatMap((animationEntry) => {
    const matchingTracks = asJsonObjectArray(animationEntry.tracks).filter((track) => track.target === objectId);
    if (matchingTracks.length === 0) {
      return [];
    }

    return [{
      animationId: typeof animationEntry.animationId === "string" ? animationEntry.animationId : "unknown-animation",
      name: typeof animationEntry.name === "string" ? animationEntry.name : "Unnamed animation",
      properties: uniqueStrings(matchingTracks.map((track) => String(track.property ?? "property"))),
      evidenceRefs: normalizeEvidenceRefs(asJsonObject(animationEntry.extensions)?.evidenceRefs)
    }];
  });
}

function getDonorEvidenceCatalog() {
  return state.bundle?.evidenceCatalog ?? null;
}

function getDonorAssetCatalog() {
  return state.bundle?.donorAssetCatalog ?? null;
}

function getDonorAssetCatalogItems() {
  const catalog = getDonorAssetCatalog();
  return Array.isArray(catalog?.assets) ? catalog.assets : [];
}

function getDonorAssetById(assetId) {
  if (typeof assetId !== "string" || assetId.length === 0) {
    return null;
  }

  return getDonorAssetCatalogItems().find((item) => item?.assetId === assetId) ?? null;
}

function getSceneObjectsForDonorAssetId(assetId) {
  if (typeof assetId !== "string" || assetId.length === 0 || !state.editorData || !Array.isArray(state.editorData.objects)) {
    return [];
  }

  return state.editorData.objects.filter((object) => getDonorAssetForObject(object)?.assetId === assetId);
}

function getSceneObjectsForDonorAssetGroupKey(groupKey) {
  if (typeof groupKey !== "string" || groupKey.length === 0 || !state.editorData || !Array.isArray(state.editorData.objects)) {
    return [];
  }

  const assetIds = new Set(
    getDonorAssetItemsForGroup(groupKey)
      .map((item) => item?.assetId)
      .filter((assetId) => typeof assetId === "string" && assetId.length > 0)
  );
  if (assetIds.size === 0) {
    return [];
  }

  return state.editorData.objects.filter((object) => {
    const assetId = getDonorAssetForObject(object)?.assetId;
    return typeof assetId === "string" && assetIds.has(assetId);
  });
}

function isDonorSceneKitContainer(object) {
  return Boolean(
    object
    && object.type === "container"
    && object.placeholderRef === "placeholder.container.donor-scene-kit"
  );
}

function getRuntimeReferenceScreens() {
  return runtimeReferenceScreenDefs.map((entry) => ({
    ...entry,
    donorAsset: getDonorAssetCatalogItems().find((asset) => asset.evidenceId === entry.evidenceId) ?? null,
    evidenceItem: getEvidenceItemById(entry.evidenceId),
    sceneObjects: getSceneObjectsForDonorAssetId(
      getDonorAssetCatalogItems().find((asset) => asset.evidenceId === entry.evidenceId)?.assetId ?? ""
    )
  }));
}

function getRuntimePhaseReferenceKey() {
  if (state.runtimeUi.lastCommand === "spin") {
    return "post-spin";
  }

  if (state.runtimeUi.lastCommand === "enter") {
    return "base-idle";
  }

  return "intro";
}

function matchDonorAssetFromRuntimePick(lastPick = state.runtimeUi.lastPick) {
  const signals = uniqueStrings([
    typeof lastPick?.topDisplayObject?.texture?.resourceUrl === "string" ? lastPick.topDisplayObject.texture.resourceUrl : "",
    typeof lastPick?.topDisplayObject?.texture?.cacheId === "string" ? lastPick.topDisplayObject.texture.cacheId : "",
    typeof lastPick?.topDisplayObject?.name === "string" ? lastPick.topDisplayObject.name : "",
    typeof lastPick?.topDisplayObject?.label === "string" ? lastPick.topDisplayObject.label : "",
    typeof lastPick?.topRuntimeAsset?.canonicalUrl === "string" ? lastPick.topRuntimeAsset.canonicalUrl : "",
    typeof lastPick?.topRuntimeAsset?.observedUrl === "string" ? lastPick.topRuntimeAsset.observedUrl : "",
    typeof lastPick?.topRuntimeAsset?.runtimeRelativePath === "string" ? lastPick.topRuntimeAsset.runtimeRelativePath : ""
  ]).map((value) => value.toLowerCase());

  if (signals.length === 0) {
    return null;
  }

  return getDonorAssetCatalogItems().find((asset) => {
    const filename = String(asset.filename ?? "").toLowerCase();
    const stem = filename.replace(/\.[^.]+$/, "");
    const evidenceId = String(asset.evidenceId ?? "").toLowerCase();
    return signals.some((signal) => (
      (filename.length > 0 && signal.includes(filename))
      || (stem.length > 0 && signal.includes(stem))
      || (evidenceId.length > 0 && signal.includes(evidenceId))
    ));
  }) ?? null;
}

function matchDonorAssetFromRuntimeSource(runtimeSourceUrl, runtimeRelativePath = null, explicitAssetId = null) {
  if (typeof explicitAssetId === "string" && explicitAssetId.length > 0) {
    const directAsset = getDonorAssetById(explicitAssetId);
    if (directAsset) {
      return directAsset;
    }
  }

  const signals = uniqueStrings([
    typeof runtimeSourceUrl === "string" ? runtimeSourceUrl : "",
    typeof runtimeRelativePath === "string" ? runtimeRelativePath : "",
    (() => {
      try {
        return typeof runtimeSourceUrl === "string"
          ? String(new URL(runtimeSourceUrl).pathname.split("/").pop() ?? "")
          : "";
      } catch {
        return "";
      }
    })()
  ]).map((value) => value.toLowerCase());

  if (signals.length === 0) {
    return null;
  }

  return getDonorAssetCatalogItems().find((asset) => {
    const filename = String(asset.filename ?? "").toLowerCase();
    const stem = filename.replace(/\.[^.]+$/, "");
    const evidenceId = String(asset.evidenceId ?? "").toLowerCase();
    const assetId = String(asset.assetId ?? "").toLowerCase();
    return signals.some((signal) => (
      (filename.length > 0 && signal.includes(filename))
      || (stem.length > 0 && signal.includes(stem))
      || (evidenceId.length > 0 && signal.includes(evidenceId))
      || (assetId.length > 0 && signal.includes(assetId))
    ));
  }) ?? null;
}

function buildRuntimeSourceBridge(runtimeSourceUrl, options = {}) {
  const runtimeRelativePath = typeof options.runtimeRelativePath === "string" && options.runtimeRelativePath.length > 0
    ? options.runtimeRelativePath
    : getRuntimeResourceRelativePath(runtimeSourceUrl);
  const donorAsset = options.donorAsset
    ?? matchDonorAssetFromRuntimeSource(runtimeSourceUrl, runtimeRelativePath, options.overrideDonorAssetId);
  const evidenceItem = donorAsset?.evidenceId
    ? getEvidenceItemById(donorAsset.evidenceId)
    : null;
  const sceneObject = donorAsset
    ? getSceneObjectsForDonorAssetId(donorAsset.assetId)[0] ?? null
    : null;

  return {
    donorAsset,
    evidenceItem,
    sceneObject
  };
}

function getVisibleDonorAssetItems() {
  const items = getDonorAssetCatalogItems();
  const searchQuery = String(state.donorAssetUi?.searchQuery ?? "").trim().toLowerCase();
  const fileTypeFilter = String(state.donorAssetUi?.fileTypeFilter ?? "all").trim().toLowerCase();
  const assetGroupFilter = String(state.donorAssetUi?.assetGroupFilter ?? "all").trim();

  return items.filter((item) => {
    const matchesSearch = !searchQuery || [
      item.title,
      item.filename,
      item.evidenceId,
      item.captureSessionId,
      item.fileType,
      item.sourceCategory,
      item.assetGroupLabel,
      item.assetGroupDescription,
      item.discoveredFromUrl
    ].some((value) => String(value ?? "").toLowerCase().includes(searchQuery));
    const matchesFileType = fileTypeFilter === "all"
      || String(item.fileType ?? "").toLowerCase() === fileTypeFilter;
    const matchesAssetGroup = assetGroupFilter === "all"
      || String(item.assetGroupKey ?? "") === assetGroupFilter;
    return matchesSearch && matchesFileType && matchesAssetGroup;
  });
}

function getDonorAssetFileTypeOptions() {
  const catalog = getDonorAssetCatalog();
  return Array.isArray(catalog?.availableFileTypes)
    ? catalog.availableFileTypes
    : [];
}

function getDonorAssetFileTypeCount(fileType) {
  const catalog = getDonorAssetCatalog();
  return Number(catalog?.countsByFileType?.[fileType] ?? 0);
}

function getDonorAssetGroupOptions() {
  const catalog = getDonorAssetCatalog();
  return Array.isArray(catalog?.assetGroups)
    ? catalog.assetGroups
    : [];
}

function getDonorAssetGroupSummary(groupKey) {
  if (typeof groupKey !== "string" || groupKey.length === 0 || groupKey === "all") {
    return null;
  }

  return getDonorAssetGroupOptions().find((entry) => entry?.key === groupKey) ?? null;
}

function getDonorAssetGroupSceneKitSummary(groupKey) {
  const groupSummary = getDonorAssetGroupSummary(groupKey);
  if (!groupSummary) {
    return null;
  }

  const layerId = groupSummary.suggestedLayerId || "layer.gameplay";
  const layerLabel = getLayerById(layerId)?.displayName ?? layerId;
  return {
    ...groupSummary,
    layerId,
    layerLabel,
    importLabel: `${labelizeStatus(groupSummary.sceneKitKind)} scene kit`
  };
}

function getDonorAssetItemsForGroup(groupKey) {
  if (typeof groupKey !== "string" || groupKey.length === 0) {
    return [];
  }

  return getDonorAssetCatalogItems()
    .filter((item) => item?.assetGroupKey === groupKey)
    .sort((left, right) => String(left.title ?? left.filename).localeCompare(String(right.title ?? right.filename)));
}

function getSceneKitContextForObject(object) {
  if (!object) {
    return null;
  }

  const donorAsset = getDonorAssetForObject(object);
  const groupKey = typeof donorAsset?.assetGroupKey === "string" ? donorAsset.assetGroupKey : "";
  if (!groupKey) {
    return null;
  }

  const groupSummary = getDonorAssetGroupSceneKitSummary(groupKey);
  if (!groupSummary) {
    return null;
  }

  const containerObject = typeof object.parentId === "string" && object.parentId.length > 0
    ? getEditableObjectById(object.parentId)
    : null;
  const memberObjects = (containerObject
    ? state.editorData?.objects?.filter((entry) => entry?.parentId === containerObject.id)
    : getSceneObjectsForDonorAssetGroupKey(groupKey)) ?? [];

  return {
    groupKey,
    groupSummary,
    donorAsset,
    containerObject,
    memberObjects,
    sectionId: containerObject?.id ?? "",
    sectionLabel: containerObject?.displayName ?? `${groupSummary.label} Scene Kit`
  };
}

function getSceneSectionRuntimeContext(sectionEntry, options = {}) {
  if (!sectionEntry || !Array.isArray(sectionEntry.memberObjects) || sectionEntry.memberObjects.length === 0) {
    return null;
  }

  const donorAssets = [];
  const seenAssetIds = new Set();
  for (const memberObject of sectionEntry.memberObjects) {
    const donorAsset = getDonorAssetForObject(memberObject);
    if (!donorAsset?.assetId || seenAssetIds.has(donorAsset.assetId)) {
      continue;
    }
    seenAssetIds.add(donorAsset.assetId);
    donorAssets.push(donorAsset);
  }

  if (donorAssets.length === 0) {
    return null;
  }

  const assetIds = new Set(donorAssets.map((entry) => entry.assetId));
  const evidenceIds = new Set(
    donorAssets
      .map((entry) => entry.evidenceId)
      .filter((entry) => typeof entry === "string" && entry.length > 0)
  );
  const runtimeWorkbenchEntries = Array.isArray(options.runtimeWorkbenchEntries)
    ? options.runtimeWorkbenchEntries
    : getRuntimeWorkbenchEntries();
  const runtimeReferenceScreens = Array.isArray(options.runtimeReferenceScreens)
    ? options.runtimeReferenceScreens
    : getRuntimeReferenceScreens();
  const linkedWorkbenchEntries = runtimeWorkbenchEntries.filter((entry) => (
    (entry?.donorAsset?.assetId && assetIds.has(entry.donorAsset.assetId))
    || (entry?.evidenceItem?.evidenceId && evidenceIds.has(entry.evidenceItem.evidenceId))
  ));
  const preferredWorkbenchEntry = linkedWorkbenchEntries[0] ?? null;
  const linkedReferenceScreens = runtimeReferenceScreens.filter((entry) => evidenceIds.has(entry.evidenceId));
  const preferredReference = linkedReferenceScreens.find((entry) => entry.key === getRuntimePhaseReferenceKey())
    ?? linkedReferenceScreens[0]
    ?? null;
  const primaryDonorAsset = preferredWorkbenchEntry?.donorAsset
    ?? preferredReference?.donorAsset
    ?? donorAssets[0]
    ?? null;
  const primaryEvidenceItem = preferredWorkbenchEntry?.evidenceItem
    ?? preferredReference?.evidenceItem
    ?? (primaryDonorAsset?.evidenceId ? getEvidenceItemById(primaryDonorAsset.evidenceId) : null);
  const matchingMemberObjects = primaryDonorAsset
    ? sectionEntry.memberObjects.filter((entry) => getDonorAssetForObject(entry)?.assetId === primaryDonorAsset.assetId)
    : [];
  const primarySceneObject = matchingMemberObjects[0] ?? sectionEntry.memberObjects[0] ?? null;
  const overrideCandidate = preferredWorkbenchEntry?.sourceUrl
    ? getRuntimeOverrideCandidate({
        sourceUrl: preferredWorkbenchEntry.sourceUrl,
        donorAsset: primaryDonorAsset
      })
    : null;
  const statusLabel = preferredWorkbenchEntry
    ? preferredWorkbenchEntry.requestBacked
      ? "request-backed runtime source"
      : "runtime workbench source"
    : preferredReference
      ? "supporting runtime evidence"
      : "no grounded runtime link";
  const note = preferredWorkbenchEntry
    ? `This scene section contains donor-backed members that map to ${preferredWorkbenchEntry.relativePath ?? preferredWorkbenchEntry.sourceUrl} through the runtime workbench.`
    : preferredReference
      ? `${preferredReference.label} is the strongest grounded runtime evidence currently supporting this scene section.`
      : "No runtime workbench entry or supporting runtime screenshot currently maps back to this scene section.";

  return {
    donorAssets,
    evidenceIds: Array.from(evidenceIds),
    linkedWorkbenchEntries,
    preferredWorkbenchEntry,
    linkedReferenceScreens,
    preferredReference,
    donorAsset: primaryDonorAsset,
    evidenceItem: primaryEvidenceItem,
    sceneObject: primarySceneObject,
    overrideCandidate,
    statusLabel,
    note
  };
}

function getSceneSectionProvenanceSummary(sectionEntry) {
  if (!sectionEntry || !Array.isArray(sectionEntry.memberObjects) || sectionEntry.memberObjects.length === 0) {
    return null;
  }

  const donorAssets = [];
  const seenAssetIds = new Set();
  for (const memberObject of sectionEntry.memberObjects) {
    const donorAsset = getDonorAssetForObject(memberObject);
    if (!donorAsset?.assetId || seenAssetIds.has(donorAsset.assetId)) {
      continue;
    }
    seenAssetIds.add(donorAsset.assetId);
    donorAssets.push(donorAsset);
  }

  if (donorAssets.length === 0) {
    return null;
  }

  const evidenceIds = uniqueStrings(
    donorAssets
      .map((entry) => entry.evidenceId)
      .filter((entry) => typeof entry === "string" && entry.length > 0)
  );
  const sourceCategories = uniqueStrings(
    donorAssets
      .map((entry) => entry.sourceCategory)
      .filter((entry) => typeof entry === "string" && entry.length > 0)
  );
  const captureSessions = uniqueStrings(
    donorAssets
      .map((entry) => entry.captureSessionId)
      .filter((entry) => typeof entry === "string" && entry.length > 0)
  );
  const fileTypes = uniqueStrings(
    donorAssets
      .map((entry) => entry.fileType)
      .filter((entry) => typeof entry === "string" && entry.length > 0)
  );
  const assetGroupKeys = uniqueStrings(
    donorAssets
      .map((entry) => entry.assetGroupKey)
      .filter((entry) => typeof entry === "string" && entry.length > 0)
  );
  const primaryGroupKey = assetGroupKeys.length === 1 ? assetGroupKeys[0] : null;
  const primaryGroupSummary = primaryGroupKey ? getDonorAssetGroupSceneKitSummary(primaryGroupKey) : null;
  const summaryLines = [
    `Scene section: ${sectionEntry.label}`,
    `Editable objects: ${sectionEntry.count}`,
    `Donor assets: ${donorAssets.length}`,
    `Evidence refs: ${evidenceIds.length}`,
    `Source categories: ${sourceCategories.join(", ") || "none"}`,
    `Capture sessions: ${captureSessions.join(", ") || "none"}`,
    `Asset file types: ${fileTypes.join(", ") || "unknown"}`,
    primaryGroupSummary ? `Scene kit: ${primaryGroupSummary.label} (${primaryGroupSummary.importLabel})` : "Scene kit: mixed or not inferred",
    `Donor asset IDs: ${donorAssets.map((entry) => entry.assetId).join(", ")}`
  ].join("\n");

  return {
    donorAssets,
    donorAssetIds: donorAssets.map((entry) => entry.assetId),
    evidenceIds,
    sourceCategories,
    captureSessions,
    fileTypes,
    assetGroupKeys,
    primaryGroupKey,
    primaryGroupSummary,
    summaryText: summaryLines
  };
}

function getSceneSectionGamePartSummary(sectionEntry) {
  if (!sectionEntry) {
    return null;
  }

  const provenance = sectionEntry.provenance ?? getSceneSectionProvenanceSummary(sectionEntry);
  const runtimeContext = sectionEntry.runtimeContext ?? getSceneSectionRuntimeContext(sectionEntry);
  const sceneKitSummary = provenance?.primaryGroupSummary ?? null;
  const roleLabel = sceneKitSummary?.sceneKitKind
    ? `${labelizeStatus(sceneKitSummary.sceneKitKind)} game-part kit`
    : "Mixed game-part kit";
  const readinessLabels = [
    provenance?.donorAssets?.length ? "donor-backed" : null,
    provenance?.evidenceIds?.length ? "evidence-backed" : null,
    runtimeContext?.preferredWorkbenchEntry ? "runtime-linked" : runtimeContext?.preferredReference ? "runtime-supported" : null,
    runtimeContext?.overrideCandidate?.activeOverride ? "override-active" : runtimeContext?.overrideCandidate?.eligible ? "override-ready" : null
  ].filter(Boolean);
  const readinessLabel = readinessLabels.length > 0 ? readinessLabels.join(" · ") : "grouped visuals only";
  const summaryText = [
    `Game-part section: ${sectionEntry.label}`,
    `Role: ${roleLabel}`,
    `Readiness: ${readinessLabel}`,
    `Editable objects: ${sectionEntry.count}`,
    `Donor assets: ${provenance?.donorAssets?.length ?? 0}`,
    `Evidence refs: ${provenance?.evidenceIds?.length ?? 0}`,
    runtimeContext?.preferredWorkbenchEntry
      ? `Runtime link: ${runtimeContext.preferredWorkbenchEntry.relativePath ?? runtimeContext.preferredWorkbenchEntry.sourceUrl}`
      : runtimeContext?.preferredReference
        ? `Runtime support: ${runtimeContext.preferredReference.label}`
        : "Runtime link: none"
  ].join("\n");

  return {
    sceneKitSummary,
    roleLabel,
    readinessLabel,
    readinessLabels,
    summaryText
  };
}

function getSceneSectionStateSummary(sectionEntry, editorData = state.editorData) {
  if (!sectionEntry || !editorData || !Array.isArray(editorData.objects)) {
    return null;
  }

  const sectionObjectIds = uniqueStrings([sectionEntry.id, ...sectionEntry.memberObjectIds]);
  const sectionObjects = sectionObjectIds
    .map((objectId) => editorData.objects.find((entry) => entry.id === objectId))
    .filter(Boolean);
  const memberObjects = Array.isArray(sectionEntry.memberObjects) && sectionEntry.memberObjects.length > 0
    ? sectionEntry.memberObjects
    : sectionObjects.filter((entry) => entry.id !== sectionEntry.id);
  const hiddenMemberCount = memberObjects.filter((entry) => entry.visible === false).length;
  const lockedObjectCount = sectionObjects.filter((entry) => entry.locked).length;
  const lockedLayerObjectCount = sectionObjects.filter((entry) => getLayerById(entry.layerId)?.locked).length;
  const memberScaleValues = memberObjects.flatMap((entry) => {
    const scaleX = Number.isFinite(entry.scaleX) ? Math.abs(entry.scaleX) : 1;
    const scaleY = Number.isFinite(entry.scaleY) ? Math.abs(entry.scaleY) : 1;
    return [scaleX, scaleY];
  });
  const averageScale = memberScaleValues.length > 0
    ? memberScaleValues.reduce((total, value) => total + value, 0) / memberScaleValues.length
    : 1;
  const allHidden = memberObjects.length > 0 && hiddenMemberCount === memberObjects.length;
  const partiallyHidden = hiddenMemberCount > 0 && !allHidden;
  const allLocked = sectionObjects.length > 0 && lockedObjectCount === sectionObjects.length;
  const partiallyLocked = lockedObjectCount > 0 && !allLocked;
  const sectionIsolated = getIsolatedSceneSectionId() === sectionEntry.id;

  return {
    allHidden,
    partiallyHidden,
    hiddenMemberCount,
    visibilityStatusLabel: allHidden ? "hidden" : partiallyHidden ? `${hiddenMemberCount} hidden` : "visible",
    visibilityButtonLabel: allHidden ? "Show Section" : "Hide Section",
    allLocked,
    partiallyLocked,
    lockedObjectCount,
    lockedLayerObjectCount,
    averageScale,
    scaleStatusLabel: `${Math.round(averageScale * 100)}% scale`,
    lockStatusLabel: lockedLayerObjectCount > 0
      ? "layer-locked"
      : allLocked
        ? "locked"
        : partiallyLocked
          ? `${lockedObjectCount} locked`
          : "editable",
    lockButtonLabel: allLocked ? "Unlock Section" : "Lock Section",
    sectionIsolated,
    isolationStatusLabel: sectionIsolated ? "solo section" : isSceneSectionIsolationActive() ? "not soloed" : null,
    isolationButtonLabel: sectionIsolated ? "Exit Solo Section" : "Solo Section"
  };
}

function getSceneSectionEntries(editorData = state.editorData) {
  if (!editorData || !Array.isArray(editorData.objects)) {
    return [];
  }

  const runtimeWorkbenchEntries = getRuntimeWorkbenchEntries();
  const runtimeReferenceScreens = getRuntimeReferenceScreens();
  return editorData.objects
    .filter((object) => isDonorSceneKitContainer(object))
    .map((containerObject) => {
      const members = editorData.objects.filter((entry) => entry?.parentId === containerObject.id);
      const layerLabels = uniqueStrings(
        members.map((entry) => getLayerById(entry.layerId)?.displayName ?? entry.layerId)
      );
      const baseEntry = {
        id: containerObject.id,
        label: containerObject.displayName,
        memberObjects: members,
        memberObjectIds: members.map((entry) => entry.id),
        count: members.length,
        layerLabels
      };
      return {
        ...baseEntry,
        provenance: getSceneSectionProvenanceSummary(baseEntry),
        gamePartSummary: getSceneSectionGamePartSummary(baseEntry),
        stateSummary: getSceneSectionStateSummary(baseEntry, editorData),
        runtimeContext: getSceneSectionRuntimeContext(baseEntry, {
          runtimeWorkbenchEntries,
          runtimeReferenceScreens
        })
      };
    })
    .filter((entry) => entry.count > 0)
    .sort((left, right) => left.label.localeCompare(right.label));
}

function getSceneSectionEntryById(sectionId, editorData = state.editorData) {
  if (typeof sectionId !== "string" || sectionId.length === 0) {
    return null;
  }

  return getSceneSectionEntries(editorData).find((entry) => entry.id === sectionId) ?? null;
}

function groupVisibleDonorAssets(items) {
  const groups = new Map();
  for (const item of items) {
    const key = String(item.assetGroupKey ?? "ungrouped");
    const current = groups.get(key) ?? [];
    current.push(item);
    groups.set(key, current);
  }

  const preferredOrder = getDonorAssetGroupOptions().map((entry) => entry.key);
  const sortedKeys = Array.from(groups.keys()).sort((left, right) => {
    const leftIndex = preferredOrder.indexOf(left);
    const rightIndex = preferredOrder.indexOf(right);
    if (leftIndex >= 0 && rightIndex >= 0) {
      return leftIndex - rightIndex;
    }
    if (leftIndex >= 0) {
      return -1;
    }
    if (rightIndex >= 0) {
      return 1;
    }
    return left.localeCompare(right);
  });

  return sortedKeys.map((key) => ({
    key,
    label: groups.get(key)?.[0]?.assetGroupLabel ?? key,
    kind: groups.get(key)?.[0]?.assetGroupKind ?? "package-family",
    description: groups.get(key)?.[0]?.assetGroupDescription ?? null,
    count: groups.get(key)?.length ?? 0,
    items: (groups.get(key) ?? []).slice().sort((left, right) => String(left.title ?? left.filename).localeCompare(String(right.title ?? right.filename)))
  }));
}

function getEvidenceCatalogItems() {
  const catalog = getDonorEvidenceCatalog();
  return Array.isArray(catalog?.items) ? catalog.items : [];
}

function getEvidenceItemById(evidenceId) {
  if (typeof evidenceId !== "string" || evidenceId.length === 0) {
    return null;
  }

  return getEvidenceCatalogItems().find((item) => item?.evidenceId === evidenceId) ?? null;
}

function getRuntimeWorkflowBridge() {
  const runtimeLaunch = getRuntimeLaunchInfo();
  const directAssetMatch = matchDonorAssetFromRuntimePick();
  const referenceScreens = getRuntimeReferenceScreens();
  const phaseReference = referenceScreens.find((entry) => entry.key === getRuntimePhaseReferenceKey()) ?? null;
  const matchedAsset = directAssetMatch ?? phaseReference?.donorAsset ?? null;
  const matchedEvidenceId = directAssetMatch?.evidenceId
    ?? phaseReference?.evidenceId
    ?? runtimeLaunch?.evidenceIds?.[0]
    ?? null;
  const matchedEvidence = matchedEvidenceId ? getEvidenceItemById(matchedEvidenceId) : null;
  const relatedSceneObjects = matchedAsset ? getSceneObjectsForDonorAssetId(matchedAsset.assetId) : [];
  const selectedObject = getSelectedObject();
  const selectedObjectMatches = Boolean(
    selectedObject
    && matchedAsset
    && getDonorAssetForObject(selectedObject)?.assetId === matchedAsset.assetId
  );
  const primarySceneObject = selectedObjectMatches
    ? selectedObject
    : relatedSceneObjects[0] ?? null;

  if (!runtimeLaunch?.entryUrl) {
    return {
      strength: "blocked",
      heading: "Runtime launch is blocked",
      note: runtimeLaunch?.blocker ?? "No grounded donor runtime entry is indexed for this project yet.",
      donorAsset: null,
      evidenceItem: null,
      sceneObject: null
    };
  }

  if (directAssetMatch) {
    return {
      strength: "direct",
      heading: "Direct runtime-to-donor asset hint",
      note: `The live runtime exposed a texture or display-object signal that matches donor asset ${directAssetMatch.assetId}.`,
      donorAsset: directAssetMatch,
      evidenceItem: directAssetMatch.evidenceId ? getEvidenceItemById(directAssetMatch.evidenceId) : null,
      sceneObject: primarySceneObject
    };
  }

  if (phaseReference?.donorAsset) {
    return {
      strength: "phase-supporting",
      heading: `Best supporting runtime screenshot: ${phaseReference.label}`,
      note: `${phaseReference.note} This is a grounded runtime-phase inference, not a live display-object id match.`,
      donorAsset: phaseReference.donorAsset,
      evidenceItem: phaseReference.evidenceItem,
      sceneObject: primarySceneObject
    };
  }

  return {
    strength: "evidence-only",
    heading: "Runtime evidence is available",
    note: "The embedded donor runtime does not expose a stable display-object or texture id in this slice, so only runtime notes/init evidence can be focused honestly.",
    donorAsset: null,
    evidenceItem: matchedEvidence,
    sceneObject: null
  };
}

function getRuntimeOverrideCandidate(options = {}) {
  const selectedWorkbenchSourceUrl = options.sourceUrl
    ? (getRuntimeCanonicalSourceUrl(options.sourceUrl) ?? options.sourceUrl)
    : getRuntimeWorkbenchSourceUrl();
  const workflowBridge = selectedWorkbenchSourceUrl ? null : getRuntimeWorkflowBridge();
  const donorAsset = options.donorAsset
    ?? (selectedWorkbenchSourceUrl
    ? (matchDonorAssetFromRuntimeSource(
        selectedWorkbenchSourceUrl,
        getRuntimeResourceRelativePath(selectedWorkbenchSourceUrl),
        state.runtimeUi.debugHost?.candidateRuntimeSourceUrl === selectedWorkbenchSourceUrl
          ? state.runtimeUi.debugHost?.overrideDonorAssetId
          : null
      ) ?? workflowBridge?.donorAsset ?? null)
    : workflowBridge?.donorAsset ?? null);
  const preferredFileType = donorAsset?.fileType ?? null;
  const pickedRuntimeAsset = (() => {
    if (selectedWorkbenchSourceUrl) {
      const selectedAssetUseEntry = getRuntimeAssetUseEntries().find((entry) => entry.url === selectedWorkbenchSourceUrl);
      if (selectedAssetUseEntry && (!preferredFileType || selectedAssetUseEntry.fileType === preferredFileType)) {
        return selectedAssetUseEntry;
      }
    }
    const topRuntimeAsset = normalizeRuntimeAssetUseEntries(
      state.runtimeUi.lastPick?.topRuntimeAsset ? [state.runtimeUi.lastPick.topRuntimeAsset] : []
    )[0] ?? null;
    if (topRuntimeAsset && (!preferredFileType || topRuntimeAsset.fileType === preferredFileType)) {
      return topRuntimeAsset;
    }
    return getRuntimeAssetUseEntries()
      .filter((entry) => !preferredFileType || entry.fileType === preferredFileType)[0] ?? null;
  })();
  const directResourceUrl = selectedWorkbenchSourceUrl
    ?? (typeof state.runtimeUi.lastPick?.topDisplayObject?.texture?.resourceUrl === "string"
      ? getRuntimeCanonicalSourceUrl(state.runtimeUi.lastPick.topDisplayObject.texture.resourceUrl)
      : pickedRuntimeAsset?.url ?? null);
  const directFileType = directResourceUrl ? getRuntimeResourceFileType(directResourceUrl) : null;
  const directEntry = directResourceUrl && directFileType && (!preferredFileType || directFileType === preferredFileType)
    ? {
        url: directResourceUrl,
        fileType: directFileType,
        relativePath: getRuntimeResourceRelativePath(directResourceUrl),
        filename: (() => {
          try {
            return String(new URL(directResourceUrl).pathname.split("/").pop() ?? "");
          } catch {
            return "";
          }
        })(),
        initiatorType: selectedWorkbenchSourceUrl
          ? (pickedRuntimeAsset?.initiatorType ?? "runtime-workbench")
          : (typeof state.runtimeUi.lastPick?.topDisplayObject?.texture?.resourceUrl === "string"
            ? "texture"
            : (pickedRuntimeAsset?.initiatorType ?? "runtime-asset-use")),
        assetUseEntry: pickedRuntimeAsset
      }
    : null;

  const resourceMapResources = getRuntimeResourceMapEntries()
    .filter((entry) => (
      Boolean(entry.canonicalSourceUrl)
      && Boolean(entry.fileType)
      && ["png", "webp", "jpg", "jpeg", "svg"].includes(String(entry.fileType ?? "").toLowerCase())
      && (!preferredFileType || entry.fileType === preferredFileType)
    ))
    .map((entry) => ({
      url: entry.canonicalSourceUrl,
      observedUrl: entry.latestRequestUrl,
      fileType: entry.fileType,
      relativePath: entry.runtimeRelativePath,
      filename: entry.runtimeFilename ?? "",
      initiatorType: "runtime-resource-map",
      resourceMapEntry: entry
    }));
  const requestBackedNonStaticEntry = getRuntimeResourceMapEntries()
    .filter((entry) => (
      Boolean(entry.canonicalSourceUrl)
      && !["png", "webp", "jpg", "jpeg", "svg"].includes(String(entry.fileType ?? "").toLowerCase())
    ))
    .sort((left, right) => {
      const scoreEntry = (entry) => {
        const relativePath = String(entry.runtimeRelativePath ?? "").toLowerCase();
        const canonicalSourceUrl = String(entry.canonicalSourceUrl ?? "").toLowerCase();
        let score = Number(entry.hitCount ?? 0);
        if (entry.requestSource === "local-mirror-asset") {
          score += 120;
        } else if (entry.requestSource === "local-mirror-proxy") {
          score += 60;
        }
        if (relativePath.endsWith("bundle.js") || canonicalSourceUrl.endsWith("/bundle.js")) {
          score += 80;
        } else if (relativePath.endsWith("loader.js") || canonicalSourceUrl.includes("/loader.js")) {
          score += 40;
        }
        if (
          canonicalSourceUrl.includes("analytics")
          || canonicalSourceUrl.includes("googletagmanager")
          || canonicalSourceUrl.includes("google.co.uk/ads")
          || canonicalSourceUrl.includes("gtag")
          || canonicalSourceUrl.includes("amplitude")
        ) {
          score -= 120;
        }
        return score;
      };

      const rightScore = scoreEntry(right);
      const leftScore = scoreEntry(left);
      if (rightScore !== leftScore) {
        return rightScore - leftScore;
      }
      return String(left.runtimeRelativePath ?? left.canonicalSourceUrl).localeCompare(String(right.runtimeRelativePath ?? right.canonicalSourceUrl));
    })[0] ?? null;
  const observedResources = getObservedRuntimeResources()
    .filter((entry) => !preferredFileType || entry.fileType === preferredFileType);
  const assetUseResources = getRuntimeAssetUseEntries()
    .filter((entry) => !preferredFileType || entry.fileType === preferredFileType);
  const mirroredResources = (getRuntimeMirrorStatus()?.entries ?? [])
    .filter((entry) => (
      entry.kind === "static-image"
      && (!preferredFileType || entry.fileType === preferredFileType)
      && ["png", "webp", "jpg", "jpeg", "svg"].includes(String(entry.fileType ?? "").toLowerCase())
    ))
    .map((entry) => ({
      url: entry.sourceUrl,
      observedUrl: buildLocalMirrorObservedUrl(entry.sourceUrl),
      fileType: entry.fileType,
      relativePath: getRuntimeResourceRelativePath(entry.sourceUrl),
      filename: (() => {
        try {
          return String(new URL(entry.sourceUrl).pathname.split("/").pop() ?? "");
        } catch {
          return "";
        }
      })(),
      initiatorType: "local-mirror-manifest"
    }));
  const phaseKey = getRuntimePhaseReferenceKey();
  const phaseMatchers = phaseKey === "intro"
    ? [
        /preloader-assets\/logo-lights\.png/i,
        /preloader-assets\/logo\.png/i,
        /preloader-assets\/logo\.jpg/i,
        /preloader-assets\/split\.png/i,
        /preloader-assets\//i,
        /img\/ui\/brand-logo/i,
        /img\/ui\//i
      ]
    : [/img\/ui\//i, /preloader-assets\//i];
  const requestBackedEntry = directEntry
    ?? phaseMatchers
      .map((matcher) => assetUseResources.find((entry) => matcher.test(entry.relativePath ?? "")))
      .find(Boolean)
    ?? phaseMatchers
      .map((matcher) => resourceMapResources.find((entry) => matcher.test(entry.relativePath ?? "")))
      .find(Boolean)
    ?? phaseMatchers
      .map((matcher) => observedResources.find((entry) => matcher.test(entry.relativePath ?? "")))
      .find(Boolean)
    ?? resourceMapResources[0]
    ?? observedResources[0]
    ?? null;
  const manifestEntry = phaseMatchers
    .map((matcher) => mirroredResources.find((entry) => matcher.test(entry.relativePath ?? "")))
    .find(Boolean)
    ?? mirroredResources[0]
    ?? null;
  const selectedEntry = requestBackedEntry ?? manifestEntry;
  const activeOverride = selectedEntry ? getRuntimeOverrideEntry(selectedEntry.url) : null;
  const localMirrorEntry = selectedEntry ? getRuntimeMirrorEntry(selectedEntry.url) : null;
  const resourceMapEntry = requestBackedEntry?.resourceMapEntry ?? (requestBackedEntry ? getRuntimeResourceMapEntry(requestBackedEntry.url) : null);
  const assetUseEntry = requestBackedEntry?.sourceKinds
    ? requestBackedEntry
    : (directEntry?.assetUseEntry ?? null);

  if (!selectedEntry) {
    return {
      eligible: false,
      sourceKind: "missing",
      runtimeSourceUrl: null,
      runtimeRelativePath: null,
      fileType: preferredFileType,
      donorAsset,
      activeOverride: null,
      localMirrorEntry: null,
      resourceMapEntry: null,
      assetUseEntry: null,
      note: "No grounded runtime-loaded static image resource is available for an override in this slice yet."
    };
  }

  if (!requestBackedEntry) {
    return {
      eligible: false,
      sourceKind: "local-mirror-manifest",
      runtimeSourceUrl: selectedEntry.url,
      runtimeRelativePath: selectedEntry.relativePath,
      fileType: selectedEntry.fileType,
      donorAsset,
      activeOverride,
      localMirrorEntry,
      resourceMapEntry: null,
      assetUseEntry: null,
      note: localMirrorEntry
        ? `The strongest current match is only a local mirror manifest entry at ${localMirrorEntry.repoRelativePath}. No request-backed static image was observed in the current launch/start/spin cycle, so override hit proof is blocked until the runtime actually re-requests one.${requestBackedNonStaticEntry ? ` The strongest embedded request-backed source so far is ${requestBackedNonStaticEntry.runtimeRelativePath ?? requestBackedNonStaticEntry.canonicalSourceUrl} through ${requestBackedNonStaticEntry.requestSource}${Array.isArray(requestBackedNonStaticEntry.captureMethods) && requestBackedNonStaticEntry.captureMethods.length > 0 ? ` (${requestBackedNonStaticEntry.captureMethods.join(", ")})` : ""}.` : ""}`
        : `The strongest current match is only a local mirror manifest entry. No request-backed static image was observed in the current launch/start/spin cycle, so override hit proof is blocked until the runtime actually re-requests one.${requestBackedNonStaticEntry ? ` The strongest embedded request-backed source so far is ${requestBackedNonStaticEntry.runtimeRelativePath ?? requestBackedNonStaticEntry.canonicalSourceUrl} through ${requestBackedNonStaticEntry.requestSource}${Array.isArray(requestBackedNonStaticEntry.captureMethods) && requestBackedNonStaticEntry.captureMethods.length > 0 ? ` (${requestBackedNonStaticEntry.captureMethods.join(", ")})` : ""}.` : ""}`
    };
  }

  if (!donorAsset) {
    return {
      eligible: false,
      sourceKind: directEntry ? "direct-texture" : "observed-resource",
      runtimeSourceUrl: requestBackedEntry.url,
      runtimeRelativePath: requestBackedEntry.relativePath,
      fileType: requestBackedEntry.fileType,
      donorAsset: null,
      activeOverride,
      localMirrorEntry,
      resourceMapEntry,
      assetUseEntry,
      note: localMirrorEntry
        ? assetUseEntry
          ? `The live runtime is actively using this ${requestBackedEntry.fileType} source through ${assetUseEntry.sourceKinds.join(", ")}, and it resolves to local mirror path ${localMirrorEntry.repoRelativePath}, but the current runtime pick does not yet expose a grounded donor asset to use as the override source.`
          : `A runtime-loaded static resource was observed and resolved to local mirror path ${localMirrorEntry.repoRelativePath}, but the current runtime pick does not yet expose a grounded donor asset to use as the override source.`
        : assetUseEntry
          ? `The live runtime is actively using this ${requestBackedEntry.fileType} source through ${assetUseEntry.sourceKinds.join(", ")}, but the current runtime pick does not yet expose a grounded donor asset to use as the override source.`
          : "A runtime-loaded static resource was observed, but the current runtime pick does not yet expose a grounded donor asset to use as the override source."
    };
  }

  return {
    eligible: true,
    sourceKind: directEntry
      ? (directEntry.assetUseEntry ? "runtime-asset-use" : "direct-texture")
      : assetUseEntry
        ? "runtime-asset-use"
      : observedResources.some((entry) => entry.url === requestBackedEntry.url)
        ? "observed-resource"
        : "runtime-resource-map",
    runtimeSourceUrl: requestBackedEntry.url,
    runtimeRelativePath: requestBackedEntry.relativePath,
    fileType: requestBackedEntry.fileType,
    donorAsset,
    activeOverride,
    localMirrorEntry,
    resourceMapEntry,
    assetUseEntry,
    note: directEntry
      ? directEntry.assetUseEntry
        ? localMirrorEntry
          ? `The live runtime is actively using this static image through ${directEntry.assetUseEntry.sourceKinds.join(", ")} at ${directEntry.assetUseEntry.naturalWidth ?? "unknown"}x${directEntry.assetUseEntry.naturalHeight ?? "unknown"}, and that source resolves to local mirror path ${localMirrorEntry.repoRelativePath}.`
          : `The live runtime is actively using this static image through ${directEntry.assetUseEntry.sourceKinds.join(", ")} at ${directEntry.assetUseEntry.naturalWidth ?? "unknown"}x${directEntry.assetUseEntry.naturalHeight ?? "unknown"}.`
        : localMirrorEntry
          ? `The live runtime exposed a direct texture/resource URL for this static image, and that source resolves to local mirror path ${localMirrorEntry.repoRelativePath}.`
          : "The live runtime exposed a direct texture/resource URL for this static image."
      : assetUseEntry
        ? localMirrorEntry
          ? `The live runtime used this ${requestBackedEntry.fileType} source ${assetUseEntry.hitCount} time${assetUseEntry.hitCount === 1 ? "" : "s"} through ${assetUseEntry.sourceKinds.join(", ")} (${assetUseEntry.contexts.join(", ") || "runtime"}) at ${assetUseEntry.naturalWidth ?? "unknown"}x${assetUseEntry.naturalHeight ?? "unknown"}, and it resolves to local mirror path ${localMirrorEntry.repoRelativePath}.`
          : `The live runtime used this ${requestBackedEntry.fileType} source ${assetUseEntry.hitCount} time${assetUseEntry.hitCount === 1 ? "" : "s"} through ${assetUseEntry.sourceKinds.join(", ")} (${assetUseEntry.contexts.join(", ") || "runtime"}) at ${assetUseEntry.naturalWidth ?? "unknown"}x${assetUseEntry.naturalHeight ?? "unknown"}.`
      : resourceMapEntry
        ? localMirrorEntry
          ? `The current runtime cycle requested this ${requestBackedEntry.fileType} source ${resourceMapEntry.hitCount} time${resourceMapEntry.hitCount === 1 ? "" : "s"} through ${resourceMapEntry.requestSource}${Array.isArray(resourceMapEntry.captureMethods) && resourceMapEntry.captureMethods.length > 0 ? ` (${resourceMapEntry.captureMethods.join(", ")})` : ""}, and it resolves to local mirror path ${localMirrorEntry.repoRelativePath}.`
          : `The current runtime cycle requested this ${requestBackedEntry.fileType} source ${resourceMapEntry.hitCount} time${resourceMapEntry.hitCount === 1 ? "" : "s"} through ${resourceMapEntry.requestSource}${Array.isArray(resourceMapEntry.captureMethods) && resourceMapEntry.captureMethods.length > 0 ? ` (${resourceMapEntry.captureMethods.join(", ")})` : ""}.`
      : observedResources.some((entry) => entry.url === requestBackedEntry.url)
        ? localMirrorEntry
          ? `A grounded runtime-loaded ${requestBackedEntry.fileType} resource was observed for the current runtime phase, matches the bridged donor asset file type, and resolves to local mirror path ${localMirrorEntry.repoRelativePath}.`
          : `A grounded runtime-loaded ${requestBackedEntry.fileType} resource was observed for the current runtime phase and matches the bridged donor asset file type.`
      : localMirrorEntry
        ? `The current runtime cycle matched this source through the local runtime mirror at ${localMirrorEntry.repoRelativePath}.`
        : "The current runtime cycle matched this source through the strongest grounded runtime request record."
  };
}

function isAnalyticsLikeRuntimeUrl(sourceUrl) {
  const normalized = String(sourceUrl ?? "").toLowerCase();
  return normalized.includes("analytics")
    || normalized.includes("googletagmanager")
    || normalized.includes("google.co.uk/ads")
    || normalized.includes("/g/collect")
    || normalized.includes("amplitude");
}

function scoreRuntimeWorkbenchEntry(entry) {
  let score = Number(entry.hitCount ?? 0);

  if (entry.kind === "debug-host-proof") {
    score += 6000;
  }
  if (entry.overrideHitCountAfterReload > 0) {
    score += 3000 + Number(entry.overrideHitCountAfterReload);
  }
  if (entry.overrideRepoRelativePath) {
    score += 1800;
  }
  if (entry.isStaticImage) {
    score += 1000;
  }
  if (entry.requestBacked) {
    score += 700;
  }
  if (entry.requestSource === "project-local-override") {
    score += 1200;
  } else if (entry.requestSource === "local-mirror-asset") {
    score += 800;
  } else if (entry.requestSource === "local-mirror-launch") {
    score += 300;
  }
  if (entry.requestCategory === "html-bootstrap") {
    score += 120;
  }
  if ((entry.relativePath ?? "").toLowerCase().endsWith("bundle.js")) {
    score += 150;
  }
  if (isAnalyticsLikeRuntimeUrl(entry.sourceUrl)) {
    score -= 2000;
  }

  return score;
}

function createRuntimeWorkbenchEntry(input) {
  const sourceUrl = getRuntimeCanonicalSourceUrl(input.sourceUrl) ?? input.sourceUrl;
  if (!sourceUrl) {
    return null;
  }

  const relativePath = input.relativePath ?? getRuntimeResourceRelativePath(sourceUrl);
  const fileType = input.fileType ?? getRuntimeResourceFileType(sourceUrl);
  const bridge = buildRuntimeSourceBridge(sourceUrl, {
    runtimeRelativePath: relativePath,
    donorAsset: input.donorAsset,
    overrideDonorAssetId: input.overrideDonorAssetId
  });
  const activeOverride = getRuntimeOverrideEntry(sourceUrl);
  const localMirrorEntry = getRuntimeMirrorEntry(sourceUrl);

  return {
    kind: input.kind,
    sourceUrl,
    relativePath,
    fileType,
    requestBacked: Boolean(input.requestBacked),
    isStaticImage: ["png", "webp", "jpg", "jpeg", "svg"].includes(String(fileType ?? "").toLowerCase()),
    requestSource: input.requestSource ?? null,
    requestCategory: input.requestCategory ?? null,
    captureMethods: Array.isArray(input.captureMethods) ? input.captureMethods : [],
    hitCount: Number(input.hitCount ?? 0),
    overrideHitCountAfterReload: Number(input.overrideHitCountAfterReload ?? 0),
    localMirrorRepoRelativePath: input.localMirrorRepoRelativePath ?? localMirrorEntry?.repoRelativePath ?? null,
    overrideRepoRelativePath: input.overrideRepoRelativePath ?? activeOverride?.overrideRepoRelativePath ?? null,
    donorAsset: bridge.donorAsset,
    evidenceItem: bridge.evidenceItem,
    sceneObject: bridge.sceneObject,
    activeOverride,
    note: input.note ?? "",
    statusLabel: input.statusLabel ?? "",
    requestSummary: input.requestSummary ?? ""
  };
}

function getRuntimeWorkbenchEntries() {
  const entryMap = new Map();
  const pushEntry = (candidate) => {
    if (!candidate || !candidate.sourceUrl) {
      return;
    }

    const existing = entryMap.get(candidate.sourceUrl);
    if (!existing) {
      entryMap.set(candidate.sourceUrl, candidate);
      return;
    }

    const existingScore = scoreRuntimeWorkbenchEntry(existing);
    const nextScore = scoreRuntimeWorkbenchEntry(candidate);
    entryMap.set(candidate.sourceUrl, nextScore >= existingScore
      ? {
          ...existing,
          ...candidate,
          donorAsset: candidate.donorAsset ?? existing.donorAsset,
          evidenceItem: candidate.evidenceItem ?? existing.evidenceItem,
          sceneObject: candidate.sceneObject ?? existing.sceneObject,
          activeOverride: candidate.activeOverride ?? existing.activeOverride,
          localMirrorRepoRelativePath: candidate.localMirrorRepoRelativePath ?? existing.localMirrorRepoRelativePath,
          overrideRepoRelativePath: candidate.overrideRepoRelativePath ?? existing.overrideRepoRelativePath,
          captureMethods: uniqueStrings([...(existing.captureMethods ?? []), ...(candidate.captureMethods ?? [])])
        }
      : {
          ...candidate,
          ...existing,
          donorAsset: existing.donorAsset ?? candidate.donorAsset,
          evidenceItem: existing.evidenceItem ?? candidate.evidenceItem,
          sceneObject: existing.sceneObject ?? candidate.sceneObject,
          activeOverride: existing.activeOverride ?? candidate.activeOverride,
          localMirrorRepoRelativePath: existing.localMirrorRepoRelativePath ?? candidate.localMirrorRepoRelativePath,
          overrideRepoRelativePath: existing.overrideRepoRelativePath ?? candidate.overrideRepoRelativePath,
          captureMethods: uniqueStrings([...(existing.captureMethods ?? []), ...(candidate.captureMethods ?? [])])
        });
  };

  const persistedPageProofs = Array.isArray(state.bundle?.runtimePageProofs?.entries)
    ? state.bundle.runtimePageProofs.entries
    : [];
  persistedPageProofs.forEach((proof) => {
    if (typeof proof?.sourceUrl !== "string" || proof.sourceUrl.length === 0) {
      return;
    }

    pushEntry(createRuntimeWorkbenchEntry({
      kind: "page-runtime-proof",
      sourceUrl: proof.sourceUrl,
      relativePath: proof.relativePath ?? getRuntimeResourceRelativePath(proof.sourceUrl),
      fileType: getRuntimeResourceFileType(proof.sourceUrl),
      requestBacked: proof.requestBacked !== false,
      requestSource: proof.requestSource ?? "upstream-request",
      requestCategory: "static-asset",
      hitCount: 1,
      overrideHitCountAfterReload: Number(proof.overrideHitCountAfterReload ?? 0),
      localMirrorRepoRelativePath: proof.localMirrorRepoRelativePath ?? null,
      statusLabel: "Persisted page runtime proof",
      requestSummary: `${proof.pageName ?? "page"}${proof.profileId ? ` · ${proof.profileId}` : ""}`,
      note: `Persisted page-scoped runtime proof for ${proof.taskId ?? "task"} ${proof.pageName ?? "page"}${proof.savedAtUtc ? ` at ${proof.savedAtUtc}` : ""}.`
    }));
  });

  const debugHost = state.runtimeUi.debugHost;
  if (typeof debugHost?.candidateRuntimeSourceUrl === "string" && debugHost.candidateRuntimeSourceUrl.length > 0) {
    pushEntry(createRuntimeWorkbenchEntry({
      kind: "debug-host-proof",
      sourceUrl: debugHost.candidateRuntimeSourceUrl,
      relativePath: debugHost.candidateRuntimeRelativePath ?? getRuntimeResourceRelativePath(debugHost.candidateRuntimeSourceUrl),
      fileType: getRuntimeResourceFileType(debugHost.candidateRuntimeSourceUrl),
      requestBacked: true,
      requestSource: debugHost.candidateRequestSource ?? "local-mirror-asset",
      requestCategory: "static-asset",
      captureMethods: debugHost.candidateCaptureMethods ?? [],
      hitCount: debugHost.candidateHitCount ?? 0,
      overrideHitCountAfterReload: debugHost.overrideHitCountAfterReload ?? 0,
      localMirrorRepoRelativePath: debugHost.localMirrorSourcePath ?? null,
      overrideDonorAssetId: debugHost.overrideDonorAssetId ?? null,
      statusLabel: debugHost.status === "pass" ? "Debug Host proved override hit" : "Debug Host candidate",
      requestSummary: `${debugHost.candidateRequestSource ?? "request source unknown"} · ${debugHost.candidateHitCount ?? 0} hit${Number(debugHost.candidateHitCount ?? 0) === 1 ? "" : "s"}`,
      note: debugHost.status === "pass"
        ? `Dedicated Runtime Debug Host recorded ${debugHost.overrideHitCountAfterReload ?? 0} override hit${Number(debugHost.overrideHitCountAfterReload ?? 0) === 1 ? "" : "s"} after reload for this request-backed static image.`
        : debugHost.overrideBlocked ?? "Dedicated Runtime Debug Host has not proved an override hit for this source yet."
    }));
  }

  getRuntimeResourceMapEntries().forEach((entry) => {
    pushEntry(createRuntimeWorkbenchEntry({
      kind: "resource-map",
      sourceUrl: entry.canonicalSourceUrl,
      relativePath: entry.runtimeRelativePath,
      fileType: entry.fileType,
      requestBacked: true,
      requestSource: entry.requestSource,
      requestCategory: entry.requestCategory,
      captureMethods: entry.captureMethods,
      hitCount: entry.hitCount,
      localMirrorRepoRelativePath: entry.localMirrorRepoRelativePath,
      overrideRepoRelativePath: entry.overrideRepoRelativePath,
      statusLabel: entry.requestCategory === "static-asset"
        ? "Request-backed runtime asset"
        : "Request-backed runtime dependency",
      requestSummary: `${entry.requestSource} · ${entry.requestCategory} · ${entry.hitCount} hit${entry.hitCount === 1 ? "" : "s"}`,
      note: entry.overrideRepoRelativePath
        ? `This runtime source currently resolves through override ${entry.overrideRepoRelativePath}.`
        : entry.localMirrorRepoRelativePath
          ? `This runtime source currently resolves to local mirror path ${entry.localMirrorRepoRelativePath}.`
          : "This runtime source is currently still upstream-backed."
    }));
  });

  return Array.from(entryMap.values())
    .sort((left, right) => {
      const scoreDiff = scoreRuntimeWorkbenchEntry(right) - scoreRuntimeWorkbenchEntry(left);
      if (scoreDiff !== 0) {
        return scoreDiff;
      }
      return String(left.relativePath ?? left.sourceUrl).localeCompare(String(right.relativePath ?? right.sourceUrl));
    });
}

function getSelectedProjectEvidenceSummary() {
  const selectedProject = getSelectedProject();
  if (!selectedProject) {
    return null;
  }

  const replayProject = getReplayProject();
  const importArtifact = getImportArtifact();
  const importProject = getImportProject();
  const importEvidenceRefs = normalizeEvidenceRefs(importArtifact?.sourceEvidenceRefs);
  const captureSessions = asStringList(selectedProject.donor?.captureSessions);
  const donorEvidenceRefs = asStringList(selectedProject.donor?.evidenceRefs);
  const projectPaths = getProjectPathSummary(selectedProject);
  const replaySources = asJsonObject(replayProject?.sources);
  const rawDonorRoots = asStringList(replaySources?.rawDonorRoots);
  const importNodeEntries = collectImportNodeEvidenceEntries(importProject);
  const importAssetEntries = collectImportAssetEvidenceEntries(importProject);
  const evidenceCatalog = getDonorEvidenceCatalog();
  const donorAssetCatalog = getDonorAssetCatalog();
  const donorScan = state.bundle?.donorScan ?? null;

  return {
    donorName: selectedProject.donor?.donorName ?? "Unknown donor",
    donorId: selectedProject.donor?.donorId ?? "unknown-donor",
    evidenceRoot: selectedProject.keyPaths?.evidenceRoot ?? selectedProject.donor?.evidenceRoot ?? "Not indexed",
    captureSessions,
    donorEvidenceRefs,
    reportsRoot: selectedProject.keyPaths?.reportsRoot ?? null,
    importsRoot: selectedProject.keyPaths?.importsRoot ?? null,
    importArtifactPath: selectedProject.keyPaths?.importArtifactPath ?? null,
    importId: typeof importArtifact?.importId === "string" ? importArtifact.importId : null,
    importSourceDonorId: typeof importArtifact?.sourceDonorId === "string" ? importArtifact.sourceDonorId : null,
    importEvidenceRefs,
    importNodeEntries,
    importAssetEntries,
    donorReportsRoot: selectedProject.keyPaths?.reportsRoot ?? null,
    projectPaths,
    replayDonorEvidenceRoot: asJsonObject(importProject?.sources)?.donorEvidenceRoot ?? replaySources?.donorEvidenceRoot ?? null,
    rawDonorRoots,
    donorStatus: selectedProject.donor?.status ?? "unknown",
    donorLaunchUrl: typeof selectedProject.donor?.launchUrl === "string" ? selectedProject.donor.launchUrl : null,
    donorSourceHost: typeof selectedProject.donor?.sourceHost === "string" ? selectedProject.donor.sourceHost : null,
    donorHarvestStatus: typeof selectedProject.donor?.harvestStatus === "string" ? selectedProject.donor.harvestStatus : null,
    donorHarvestManifestPath: typeof selectedProject.donor?.harvestManifestPath === "string" ? selectedProject.donor.harvestManifestPath : null,
    donorHarvestedAssetCount: typeof selectedProject.donor?.harvestedAssetCount === "number" ? selectedProject.donor.harvestedAssetCount : 0,
    donorFailedAssetCount: typeof selectedProject.donor?.failedAssetCount === "number" ? selectedProject.donor.failedAssetCount : 0,
    donorPackageStatus: typeof selectedProject.donor?.packageStatus === "string" ? selectedProject.donor.packageStatus : null,
    donorPackageManifestPath: typeof selectedProject.donor?.packageManifestPath === "string" ? selectedProject.donor.packageManifestPath : null,
    donorPackageGraphPath: typeof selectedProject.donor?.packageGraphPath === "string" ? selectedProject.donor.packageGraphPath : null,
    donorPackageFamilyCount: typeof selectedProject.donor?.packageFamilyCount === "number" ? selectedProject.donor.packageFamilyCount : 0,
    donorPackageReferencedUrlCount: typeof selectedProject.donor?.packageReferencedUrlCount === "number" ? selectedProject.donor.packageReferencedUrlCount : 0,
    donorPackageGraphNodeCount: typeof selectedProject.donor?.packageGraphNodeCount === "number" ? selectedProject.donor.packageGraphNodeCount : 0,
    donorPackageGraphEdgeCount: typeof selectedProject.donor?.packageGraphEdgeCount === "number" ? selectedProject.donor.packageGraphEdgeCount : 0,
    donorPackageUnresolvedCount: typeof selectedProject.donor?.packageUnresolvedCount === "number" ? selectedProject.donor.packageUnresolvedCount : 0,
    donorScanState: typeof donorScan?.scanState === "string" ? donorScan.scanState : (typeof selectedProject.donor?.scanStatus === "string" ? selectedProject.donor.scanStatus : null),
    donorScanSummaryPath: typeof donorScan?.scanSummaryPath === "string" ? donorScan.scanSummaryPath : (typeof selectedProject.donor?.scanSummaryPath === "string" ? selectedProject.donor.scanSummaryPath : null),
    donorBlockerSummaryPath: typeof donorScan?.blockerSummaryPath === "string" ? donorScan.blockerSummaryPath : (typeof selectedProject.donor?.blockerSummaryPath === "string" ? selectedProject.donor.blockerSummaryPath : null),
    donorRuntimeCandidateCount: typeof donorScan?.runtimeCandidateCount === "number" ? donorScan.runtimeCandidateCount : (typeof selectedProject.donor?.runtimeCandidateCount === "number" ? selectedProject.donor.runtimeCandidateCount : 0),
    donorAtlasManifestCount: typeof donorScan?.atlasManifestCount === "number" ? donorScan.atlasManifestCount : (typeof selectedProject.donor?.atlasManifestCount === "number" ? selectedProject.donor.atlasManifestCount : 0),
    donorBundleAssetMapStatus: typeof donorScan?.bundleAssetMapStatus === "string" ? donorScan.bundleAssetMapStatus : (typeof selectedProject.donor?.bundleAssetMapStatus === "string" ? selectedProject.donor.bundleAssetMapStatus : null),
    donorBundleImageVariantStatus: typeof donorScan?.bundleImageVariantStatus === "string" ? donorScan.bundleImageVariantStatus : "unknown",
    donorBundleImageVariantCount: typeof donorScan?.bundleImageVariantCount === "number" ? donorScan.bundleImageVariantCount : 0,
    donorBundleImageVariantSuffixCount: typeof donorScan?.bundleImageVariantSuffixCount === "number" ? donorScan.bundleImageVariantSuffixCount : 0,
    donorBundleImageVariantUrlBuilderStatus: typeof donorScan?.bundleImageVariantUrlBuilderStatus === "string" ? donorScan.bundleImageVariantUrlBuilderStatus : (typeof selectedProject.donor?.bundleImageVariantUrlBuilderStatus === "string" ? selectedProject.donor.bundleImageVariantUrlBuilderStatus : "unknown"),
    donorBundleImageVariantUrlCount: typeof donorScan?.bundleImageVariantUrlCount === "number" ? donorScan.bundleImageVariantUrlCount : (typeof selectedProject.donor?.bundleImageVariantUrlCount === "number" ? selectedProject.donor.bundleImageVariantUrlCount : 0),
    donorTranslationPayloadStatus: typeof donorScan?.translationPayloadStatus === "string" ? donorScan.translationPayloadStatus : (typeof selectedProject.donor?.translationPayloadStatus === "string" ? selectedProject.donor.translationPayloadStatus : "unknown"),
    donorTranslationPayloadCount: typeof donorScan?.translationPayloadCount === "number" ? donorScan.translationPayloadCount : (typeof selectedProject.donor?.translationPayloadCount === "number" ? selectedProject.donor.translationPayloadCount : 0),
    donorMirrorCandidateStatus: typeof donorScan?.mirrorCandidateStatus === "string" ? donorScan.mirrorCandidateStatus : (typeof selectedProject.donor?.mirrorCandidateStatus === "string" ? selectedProject.donor.mirrorCandidateStatus : null),
    donorRequestBackedStaticHintCount: typeof donorScan?.requestBackedStaticHintCount === "number" ? donorScan.requestBackedStaticHintCount : 0,
    donorRecentlyBlockedCaptureTargetCount: typeof donorScan?.recentlyBlockedCaptureTargetCount === "number" ? donorScan.recentlyBlockedCaptureTargetCount : 0,
    donorCaptureFamilyCount: typeof donorScan?.captureFamilyCount === "number" ? donorScan.captureFamilyCount : 0,
    donorTopCaptureFamilyNames: Array.isArray(donorScan?.topCaptureFamilyNames) ? donorScan.topCaptureFamilyNames : [],
    donorRawPayloadBlockedCaptureTargetCount: typeof donorScan?.rawPayloadBlockedCaptureTargetCount === "number" ? donorScan.rawPayloadBlockedCaptureTargetCount : 0,
    donorRawPayloadBlockedFamilyCount: typeof donorScan?.rawPayloadBlockedFamilyCount === "number" ? donorScan.rawPayloadBlockedFamilyCount : 0,
    donorRawPayloadBlockedFamilyNames: Array.isArray(donorScan?.rawPayloadBlockedFamilyNames) ? donorScan.rawPayloadBlockedFamilyNames : [],
    donorNextCaptureTargetsPath: typeof donorScan?.nextCaptureTargetsPath === "string" ? donorScan.nextCaptureTargetsPath : (typeof selectedProject.donor?.nextCaptureTargetsPath === "string" ? selectedProject.donor.nextCaptureTargetsPath : null),
    donorNextCaptureTargetCount: typeof donorScan?.nextCaptureTargetCount === "number" ? donorScan.nextCaptureTargetCount : (typeof selectedProject.donor?.nextCaptureTargetCount === "number" ? selectedProject.donor.nextCaptureTargetCount : 0),
    donorNextCaptureTargets: Array.isArray(donorScan?.nextCaptureTargets) ? donorScan.nextCaptureTargets : [],
    donorCaptureRunPath: typeof donorScan?.captureRunPath === "string" ? donorScan.captureRunPath : null,
    donorCaptureRunStatus: typeof donorScan?.captureRunStatus === "string" ? donorScan.captureRunStatus : null,
    donorCaptureRunMode: typeof donorScan?.captureRunMode === "string" ? donorScan.captureRunMode : null,
    donorCaptureAttemptedCount: typeof donorScan?.captureAttemptedCount === "number" ? donorScan.captureAttemptedCount : 0,
    donorCaptureDownloadedCount: typeof donorScan?.captureDownloadedCount === "number" ? donorScan.captureDownloadedCount : 0,
    donorCaptureFailedCount: typeof donorScan?.captureFailedCount === "number" ? donorScan.captureFailedCount : 0,
    donorCaptureGeneratedAt: typeof donorScan?.captureGeneratedAt === "string" ? donorScan.captureGeneratedAt : null,
    donorNextOperatorAction: typeof donorScan?.nextOperatorAction === "string" ? donorScan.nextOperatorAction : (typeof selectedProject.donor?.nextOperatorAction === "string" ? selectedProject.donor.nextOperatorAction : null),
    donorBlockerHighlights: Array.isArray(donorScan?.blockerHighlights) ? donorScan.blockerHighlights : [],
    donorNotes: typeof selectedProject.donor?.notes === "string" ? selectedProject.donor.notes : null,
    evidenceCatalog,
    donorAssetCatalog
  };
}

function getObjectEvidenceLinkage(selectedObject) {
  const selectedProject = getSelectedProject();
  if (!selectedObject || !selectedProject) {
    return null;
  }

  const replayProject = getReplayProject();
  const importProject = getImportProject();
  const replayNode = findProjectNodeByObjectId(replayProject, selectedObject.id);
  const importNode = findProjectNodeByObjectId(importProject, selectedObject.id);
  const replayAsset = findProjectAssetByRef(replayProject, selectedObject.assetRef ?? selectedObject.placeholderRef);
  const importAsset = findProjectAssetByRef(importProject, selectedObject.assetRef ?? selectedObject.placeholderRef);
  const localDonorAsset = selectedObject.donorAsset ?? getDonorAssetById(selectedObject.assetRef ?? "");
  const stateLinks = collectObjectStateLinkage(replayProject, selectedObject.id);
  const animationLinks = collectObjectAnimationLinkage(replayProject, selectedObject.id);
  const replayNodeEvidenceRefs = normalizeEvidenceRefs(asJsonObject(replayNode?.extensions)?.evidenceRefs);
  const importNodeEvidenceRefs = normalizeEvidenceRefs(asJsonObject(importNode?.extensions)?.evidenceRefs);
  const replayAssetEvidenceRefs = normalizeEvidenceRefs(asJsonObject(replayAsset?.provenance)?.evidenceRef);
  const importAssetEvidenceRefs = normalizeEvidenceRefs(asJsonObject(importAsset?.provenance)?.evidenceRef);
  const localDonorEvidenceRefs = uniqueStrings([
    typeof localDonorAsset?.evidenceId === "string" ? localDonorAsset.evidenceId : ""
  ]);
  const directEvidenceRefs = uniqueStrings([
    ...replayNodeEvidenceRefs,
    ...importNodeEvidenceRefs,
    ...localDonorEvidenceRefs
  ]);
  const assetEvidenceRefs = uniqueStrings([
    ...replayAssetEvidenceRefs,
    ...importAssetEvidenceRefs
  ]);
  const stateEvidenceRefs = uniqueStrings(stateLinks.flatMap((entry) => entry.evidenceRefs));
  const animationEvidenceRefs = uniqueStrings(animationLinks.flatMap((entry) => entry.evidenceRefs));
  const allEvidenceRefs = uniqueStrings([
    ...directEvidenceRefs,
    ...assetEvidenceRefs,
    ...stateEvidenceRefs,
    ...animationEvidenceRefs
  ]);
  const notes = uniqueStrings([
    typeof localDonorAsset?.repoRelativePath === "string"
      ? `Imported donor asset from ${localDonorAsset.repoRelativePath}.`
      : "",
    typeof asJsonObject(replayNode?.extensions)?.notes === "string" ? asJsonObject(replayNode?.extensions)?.notes : "",
    typeof asJsonObject(importNode?.extensions)?.notes === "string" ? asJsonObject(importNode?.extensions)?.notes : "",
    typeof asJsonObject(replayAsset?.provenance)?.notes === "string" ? asJsonObject(replayAsset?.provenance)?.notes : "",
    typeof asJsonObject(importAsset?.provenance)?.notes === "string" ? asJsonObject(importAsset?.provenance)?.notes : ""
  ]);
  const hasGroundedEvidence = allEvidenceRefs.length > 0;
  const hasStructuralLinkage = Boolean(localDonorAsset || replayNode || importNode || replayAsset || importAsset || stateLinks.length > 0 || animationLinks.length > 0);
  let statusLabel = "No grounded evidence linkage is recorded for this object yet.";

  if (hasGroundedEvidence) {
    statusLabel = "Grounded donor evidence is recorded for this object through replay/import metadata.";
    if (localDonorAsset && !replayNodeEvidenceRefs.length && !importNodeEvidenceRefs.length) {
      statusLabel = "Grounded donor evidence is attached directly to this imported donor image object and will sync into replay metadata on save.";
    }
  } else if (hasStructuralLinkage) {
    statusLabel = "Structural linkage exists for this object, but grounded evidence refs are not recorded yet.";
  }

  const linkageSummary = [
    `Local donor refs ${localDonorEvidenceRefs.length}`,
    `Importer node refs ${importNodeEvidenceRefs.length}`,
    `Replay asset refs ${replayAssetEvidenceRefs.length}`,
    `Importer asset refs ${importAssetEvidenceRefs.length}`,
    `State refs ${stateEvidenceRefs.length}`,
    `Animation refs ${animationEvidenceRefs.length}`
  ].join(" · ");

  return {
    statusLabel,
    linkageSummary,
    objectId: selectedObject.id,
    objectLabel: selectedObject.displayName,
    replayNodeId: typeof replayNode?.nodeId === "string" ? replayNode.nodeId : selectedObject.id,
    importNodeId: typeof importNode?.nodeId === "string" ? importNode.nodeId : null,
    assetRef: selectedObject.assetRef ?? selectedObject.placeholderRef ?? "none",
    replayAssetLabel: typeof replayAsset?.name === "string"
      ? replayAsset.name
      : null,
    importAssetLabel: typeof importAsset?.name === "string"
      ? importAsset.name
      : null,
    donorAssetLabel: typeof localDonorAsset?.title === "string"
      ? localDonorAsset.title
      : null,
    donorAssetId: typeof localDonorAsset?.assetId === "string"
      ? localDonorAsset.assetId
      : null,
    donorAssetFilename: typeof localDonorAsset?.filename === "string"
      ? localDonorAsset.filename
      : null,
    donorAssetFileType: typeof localDonorAsset?.fileType === "string"
      ? localDonorAsset.fileType
      : null,
    donorAssetCaptureSessionId: typeof localDonorAsset?.captureSessionId === "string"
      ? localDonorAsset.captureSessionId
      : null,
    donorAssetPath: typeof localDonorAsset?.repoRelativePath === "string"
      ? localDonorAsset.repoRelativePath
      : null,
    assetLabel: typeof replayAsset?.name === "string"
      ? replayAsset.name
      : typeof importAsset?.name === "string"
        ? importAsset.name
        : null,
    localDonorEvidenceRefs,
    replayNodeEvidenceRefs,
    importNodeEvidenceRefs,
    replayAssetEvidenceRefs,
    importAssetEvidenceRefs,
    directEvidenceRefs,
    assetEvidenceRefs,
    stateLinks,
    stateEvidenceRefs,
    animationLinks,
    animationEvidenceRefs,
    allEvidenceRefs,
    notes
  };
}

function getSelectedObjectEvidenceLinkage() {
  return getObjectEvidenceLinkage(getSelectedObject());
}

function getSelectedObjectOnlyEvidenceRefs() {
  if (!state.evidenceUi.selectedObjectOnly) {
    return [];
  }

  return getSelectedObjectEvidenceLinkage()?.allEvidenceRefs ?? [];
}

function getVisibleEvidenceItems() {
  const catalogItems = getEvidenceCatalogItems();
  const selectedRefs = getSelectedObjectOnlyEvidenceRefs();
  if (selectedRefs.length === 0) {
    return state.evidenceUi.selectedObjectOnly ? [] : catalogItems;
  }

  const visibleRefSet = new Set(selectedRefs);
  return catalogItems.filter((item) => visibleRefSet.has(item.evidenceId));
}

function getVisibleEvidenceRefList() {
  return getVisibleEvidenceItems().map((item) => item.evidenceId);
}

function buildEvidenceToObjectIndex() {
  const objects = Array.isArray(state.editorData?.objects) ? state.editorData.objects : [];
  const index = new Map();

  for (const object of objects) {
    const linkage = getObjectEvidenceLinkage(object);
    if (!linkage) {
      continue;
    }

    const groupedRefs = [
      ["importer node", linkage.importNodeEvidenceRefs],
      ["replay asset", linkage.replayAssetEvidenceRefs],
      ["importer asset", linkage.importAssetEvidenceRefs],
      ["local donor", linkage.localDonorEvidenceRefs],
      ["state", linkage.stateEvidenceRefs],
      ["animation", linkage.animationEvidenceRefs]
    ];

    for (const [kind, refs] of groupedRefs) {
      for (const evidenceRef of refs) {
        const evidenceMap = index.get(evidenceRef) ?? new Map();
        const entry = evidenceMap.get(object.id) ?? {
          objectId: object.id,
          displayName: object.displayName ?? object.id,
          kinds: new Set()
        };
        entry.kinds.add(kind);
        evidenceMap.set(object.id, entry);
        index.set(evidenceRef, evidenceMap);
      }
    }
  }

  return new Map(Array.from(index.entries()).map(([evidenceRef, objectMap]) => [
    evidenceRef,
    Array.from(objectMap.values()).map((entry) => ({
      objectId: entry.objectId,
      displayName: entry.displayName,
      kinds: Array.from(entry.kinds.values()).sort()
    }))
  ]));
}

function setEvidenceFilterMode(selectedObjectOnly) {
  state.evidenceUi.selectedObjectOnly = Boolean(selectedObjectOnly);
  if (!state.evidenceUi.selectedObjectOnly) {
    state.evidenceUi.highlightedEvidenceId = null;
  }
}

function scrollEvidenceCardIntoView(evidenceId) {
  if (typeof evidenceId !== "string" || evidenceId.length === 0) {
    return;
  }

  window.requestAnimationFrame(() => {
    const card = elements.evidenceBrowser?.querySelector(`[data-evidence-card-id="${evidenceId}"]`);
    if (!(card instanceof HTMLElement)) {
      return;
    }

    const details = card.closest("details");
    if (details instanceof HTMLDetailsElement) {
      details.open = true;
    }

    card.scrollIntoView({
      block: "nearest",
      behavior: "smooth"
    });
  });
}

function focusEvidenceItem(evidenceId, {
  selectedObjectOnly = state.evidenceUi.selectedObjectOnly,
  statusMessage = null
} = {}) {
  if (typeof evidenceId !== "string" || evidenceId.length === 0) {
    return;
  }

  state.workflowUi.activePanel = "donor";
  setEvidenceFilterMode(selectedObjectOnly);
  state.evidenceUi.highlightedEvidenceId = evidenceId;
  renderAll();
  scrollEvidenceCardIntoView(evidenceId);

  const evidenceItem = getEvidenceItemById(evidenceId);
  if (statusMessage) {
    setPreviewStatus(statusMessage);
  } else if (evidenceItem) {
    setPreviewStatus(`Focused donor evidence ${evidenceItem.evidenceId}.`);
  }
}

function scrollDonorAssetCardIntoView(assetId) {
  if (typeof assetId !== "string" || assetId.length === 0) {
    return;
  }

  window.requestAnimationFrame(() => {
    const card = elements.evidenceBrowser?.querySelector(`[data-donor-asset-id="${assetId}"]`);
    if (!(card instanceof HTMLElement)) {
      return;
    }

    const details = card.closest("details");
    if (details instanceof HTMLDetailsElement) {
      details.open = true;
    }

    card.scrollIntoView({
      block: "nearest",
      behavior: "smooth"
    });
  });
}

function focusDonorAssetCard(assetId, {
  statusMessage = null
} = {}) {
  if (typeof assetId !== "string" || assetId.length === 0) {
    return;
  }

  state.workflowUi.activePanel = "donor";
  state.donorAssetUi.highlightedAssetId = assetId;
  renderAll();
  scrollDonorAssetCardIntoView(assetId);

  const donorAsset = getDonorAssetById(assetId);
  setPreviewStatus(statusMessage ?? `Focused donor asset ${donorAsset?.title ?? assetId} in the donor asset palette.`);
}

function focusDonorAssetGroup(groupKey, {
  statusMessage = null
} = {}) {
  const groupSummary = getDonorAssetGroupSceneKitSummary(groupKey);
  if (!groupSummary) {
    setPreviewStatus("Could not find that donor scene kit in the donor asset palette.");
    return;
  }

  const sampleAsset = getDonorAssetItemsForGroup(groupKey)[0] ?? null;
  setWorkbenchMode("scene", { silent: true });
  state.workflowUi.activePanel = "donor";
  state.donorAssetUi.assetGroupFilter = groupKey;
  state.donorAssetUi.highlightedAssetId = sampleAsset?.assetId ?? null;
  renderAll();
  if (sampleAsset?.assetId) {
    scrollDonorAssetCardIntoView(sampleAsset.assetId);
  }

  setPreviewStatus(statusMessage ?? `Focused donor scene kit ${groupSummary.label} in the donor asset palette.`);
}

function focusSelectedObjectEvidence(refs, label = "selected object evidence") {
  const normalizedRefs = uniqueStrings(Array.isArray(refs) ? refs : []);
  if (normalizedRefs.length === 0) {
    setEvidenceFilterMode(true);
    renderAll();
    setPreviewStatus(`No grounded ${label} is recorded for the selected object.`);
    return;
  }

  const visibleCatalogRef = normalizedRefs.find((ref) => Boolean(getEvidenceItemById(ref))) ?? normalizedRefs[0];
  focusEvidenceItem(visibleCatalogRef, {
    selectedObjectOnly: true,
    statusMessage: `Showing ${label} for the selected object in the Donor Evidence panel.`
  });
}

function focusSceneObjectInWorkflow(objectId, {
  statusMessage = null
} = {}) {
  if (!getEditableObjectById(objectId)) {
    setPreviewStatus(`Could not find ${objectId} in the current internal scene.`);
    return;
  }

  setWorkbenchMode("scene", { silent: true });
  state.workflowUi.activePanel = "compose";
  setSelectedObject(objectId);
  renderAll();
  window.requestAnimationFrame(() => {
    const row = elements.sceneExplorer?.querySelector(`[data-object-id="${objectId}"]`);
    if (row instanceof HTMLElement) {
      row.scrollIntoView({
        block: "nearest",
        behavior: "smooth"
      });
    }
  });

  const selectedObject = getSelectedObject();
  setPreviewStatus(statusMessage ?? `Selected ${selectedObject?.displayName ?? objectId} in Compose Mode.`);
}

function focusSceneObjectGroupInWorkflow(objectIds, {
  statusMessage = null,
  label = "scene kit"
} = {}) {
  const normalizedIds = uniqueStrings(Array.isArray(objectIds) ? objectIds : [])
    .filter((objectId) => Boolean(getEditableObjectById(objectId)));
  if (normalizedIds.length === 0) {
    setPreviewStatus(`Could not find any editable objects for that ${label} in the current internal scene.`);
    return;
  }

  setWorkbenchMode("scene", { silent: true });
  state.workflowUi.activePanel = "compose";
  setSelectedObjectIds(normalizedIds, normalizedIds[0]);
  renderAll();
  window.requestAnimationFrame(() => {
    const row = elements.sceneExplorer?.querySelector(`[data-object-id="${normalizedIds[0]}"]`);
    if (row instanceof HTMLElement) {
      row.scrollIntoView({
        block: "nearest",
        behavior: "smooth"
      });
    }
  });

  setPreviewStatus(
    statusMessage
      ?? `Selected ${normalizedIds.length} editable object${normalizedIds.length === 1 ? "" : "s"} for the current ${label} in Compose Mode.`
  );
}

function getObjectBounds(object) {
  if (!object) {
    return null;
  }

  const extent = getObjectExtent(object);
  const x = Number.isFinite(object.x) ? object.x : 0;
  const y = Number.isFinite(object.y) ? object.y : 0;
  return {
    x,
    y,
    width: Math.max(1, extent.width),
    height: Math.max(1, extent.height)
  };
}

function getObjectGroupBounds(objects) {
  const normalizedObjects = Array.isArray(objects) ? objects.filter(Boolean) : [];
  if (normalizedObjects.length === 0) {
    return null;
  }

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const object of normalizedObjects) {
    const bounds = getObjectBounds(object);
    if (!bounds) {
      continue;
    }
    minX = Math.min(minX, bounds.x);
    minY = Math.min(minY, bounds.y);
    maxX = Math.max(maxX, bounds.x + bounds.width);
    maxY = Math.max(maxY, bounds.y + bounds.height);
  }

  if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
    return null;
  }

  return {
    x: minX,
    y: minY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY)
  };
}

function frameSceneObjectGroupInWorkflow(objectIds, {
  statusMessage = null,
  label = "scene section"
} = {}) {
  const normalizedIds = uniqueStrings(Array.isArray(objectIds) ? objectIds : [])
    .filter((objectId) => Boolean(getEditableObjectById(objectId)));
  const objects = normalizedIds.map((objectId) => getEditableObjectById(objectId)).filter(Boolean);
  const bounds = getObjectGroupBounds(objects);
  if (normalizedIds.length === 0 || !bounds) {
    setPreviewStatus(`Could not frame that ${label} because no editable scene objects were found.`);
    return;
  }

  setWorkbenchMode("scene", { silent: true });
  state.workflowUi.activePanel = "compose";
  setSelectedObjectIds(normalizedIds, normalizedIds[0]);

  const tools = getViewportTools();
  const viewportSize = getCanvasViewportSize();
  const availableWidth = Math.max(120, viewportSize.width - 144);
  const availableHeight = Math.max(120, viewportSize.height - 144);
  const fitZoom = Math.min(availableWidth / bounds.width, availableHeight / bounds.height);
  const zoom = tools.sanitizeViewZoom(
    Math.max(tools.MIN_VIEW_ZOOM, Math.min(tools.MAX_VIEW_ZOOM, fitZoom)),
    getViewportState().zoom
  );
  const panX = Math.round((viewportSize.width - bounds.width * zoom) / 2 - bounds.x * zoom);
  const panY = Math.round((viewportSize.height - bounds.height * zoom) / 2 - bounds.y * zoom);
  applyViewportState({ zoom, panX, panY }, { render: false });
  renderAll();

  window.requestAnimationFrame(() => {
    const row = elements.sceneExplorer?.querySelector(`[data-object-id="${normalizedIds[0]}"]`);
    if (row instanceof HTMLElement) {
      row.scrollIntoView({
        block: "nearest",
        behavior: "smooth"
      });
    }
  });

  setPreviewStatus(
    statusMessage
      ?? `Framed ${normalizedIds.length} editable object${normalizedIds.length === 1 ? "" : "s"} for the current ${label}. View state is session-only.`
  );
}

function focusSceneSectionEvidence(sectionId) {
  const sectionEntry = getSceneSectionEntryById(sectionId);
  if (!sectionEntry) {
    setPreviewStatus("Could not find that scene section in the current internal scene.");
    return;
  }

  const evidenceIds = sectionEntry.provenance?.evidenceIds ?? [];
  const visibleEvidenceId = evidenceIds.find((entry) => Boolean(getEvidenceItemById(entry))) ?? evidenceIds[0] ?? null;
  if (!visibleEvidenceId) {
    setPreviewStatus(`Scene section ${sectionEntry.label} does not have any grounded donor evidence refs yet.`);
    return;
  }

  focusEvidenceItem(visibleEvidenceId, {
    selectedObjectOnly: false,
    statusMessage: `Showing donor evidence for scene section ${sectionEntry.label}. ${evidenceIds.length} grounded evidence ref${evidenceIds.length === 1 ? "" : "s"} are linked to this reconstruction kit.`
  });
}

function focusSceneSectionAssets(sectionId) {
  const sectionEntry = getSceneSectionEntryById(sectionId);
  if (!sectionEntry) {
    setPreviewStatus("Could not find that scene section in the current internal scene.");
    return;
  }

  const provenance = sectionEntry.provenance ?? null;
  if (provenance?.primaryGroupKey) {
    focusDonorAssetGroup(provenance.primaryGroupKey, {
      statusMessage: `Showing donor assets for scene section ${sectionEntry.label} in the donor asset palette.`
    });
    return;
  }

  const firstAssetId = provenance?.donorAssetIds?.[0] ?? null;
  if (firstAssetId) {
    focusDonorAssetCard(firstAssetId, {
      statusMessage: `Showing donor assets for scene section ${sectionEntry.label} in the donor asset palette.`
    });
    return;
  }

  setPreviewStatus(`Scene section ${sectionEntry.label} does not have any grounded donor assets yet.`);
}

function openSceneSectionRuntimeContext(sectionId) {
  const sectionEntry = getSceneSectionEntryById(sectionId);
  if (!sectionEntry) {
    setPreviewStatus("Could not find that scene section in the current internal scene.");
    return;
  }

  const runtimeContext = sectionEntry.runtimeContext;
  if (!runtimeContext?.preferredWorkbenchEntry && !runtimeContext?.preferredReference) {
    setPreviewStatus(`Scene section ${sectionEntry.label} does not have a grounded runtime link yet.`);
    return;
  }

  if (runtimeContext.preferredWorkbenchEntry?.sourceUrl) {
    setRuntimeWorkbenchSource(runtimeContext.preferredWorkbenchEntry.sourceUrl, { render: false });
  }
  setWorkbenchMode("runtime", { silent: true });
  state.workflowUi.activePanel = "runtime";
  renderAll();
  setPreviewStatus(
    runtimeContext.preferredWorkbenchEntry
      ? `Runtime Mode is active. Scene section ${sectionEntry.label} is linked to ${runtimeContext.preferredWorkbenchEntry.relativePath ?? runtimeContext.preferredWorkbenchEntry.sourceUrl}.`
      : `Runtime Mode is active. Scene section ${sectionEntry.label} is supported by ${runtimeContext.preferredReference?.label ?? "runtime evidence"}.`
  );
}

async function createSceneSectionRuntimeOverride(sectionId) {
  const sectionEntry = getSceneSectionEntryById(sectionId);
  if (!sectionEntry) {
    setPreviewStatus("Could not find that scene section in the current internal scene.");
    return;
  }

  const runtimeContext = sectionEntry.runtimeContext;
  if (!runtimeContext?.preferredWorkbenchEntry?.sourceUrl) {
    setPreviewStatus(`Scene section ${sectionEntry.label} does not have a grounded runtime source for override creation yet.`);
    return;
  }

  await createRuntimeOverrideForSource(runtimeContext.preferredWorkbenchEntry.sourceUrl, {
    donorAsset: runtimeContext.overrideCandidate?.donorAsset ?? runtimeContext.donorAsset ?? null,
    statusMessage: runtimeContext.overrideCandidate?.eligible
      ? `Created a project-local runtime override for scene section ${sectionEntry.label} through ${runtimeContext.preferredWorkbenchEntry.relativePath ?? runtimeContext.preferredWorkbenchEntry.sourceUrl}.`
      : runtimeContext.overrideCandidate?.note ?? `Scene section ${sectionEntry.label} does not yet have an eligible runtime override candidate.`
  });
}

async function clearSceneSectionRuntimeOverride(sectionId) {
  const sectionEntry = getSceneSectionEntryById(sectionId);
  if (!sectionEntry) {
    setPreviewStatus("Could not find that scene section in the current internal scene.");
    return;
  }

  const runtimeContext = sectionEntry.runtimeContext;
  if (!runtimeContext?.preferredWorkbenchEntry?.sourceUrl) {
    setPreviewStatus(`Scene section ${sectionEntry.label} does not have a grounded runtime source for override cleanup yet.`);
    return;
  }

  await clearRuntimeOverrideForSource(runtimeContext.preferredWorkbenchEntry.sourceUrl, {
    donorAsset: runtimeContext.overrideCandidate?.donorAsset ?? runtimeContext.donorAsset ?? null,
    statusMessage: `Cleared the project-local runtime override for scene section ${sectionEntry.label}.`
  });
}

function reorderSceneSectionInLayers(editorData, sectionObjectIds, action) {
  if (!editorData || !Array.isArray(editorData.objects) || !Array.isArray(sectionObjectIds) || sectionObjectIds.length === 0) {
    return { changed: false, layerSummaries: [] };
  }

  const validActions = new Set(["send-backward", "bring-forward", "send-to-back", "bring-to-front"]);
  if (!validActions.has(action)) {
    return { changed: false, layerSummaries: [] };
  }

  const sectionIdSet = new Set(uniqueStrings(sectionObjectIds));
  const layerIds = uniqueStrings(
    editorData.objects
      .filter((entry) => sectionIdSet.has(entry.id))
      .map((entry) => entry.layerId)
      .filter((entry) => typeof entry === "string" && entry.length > 0)
  );
  const layerSummaries = [];

  for (const layerId of layerIds) {
    const layerObjects = editorData.objects.filter((entry) => entry.layerId === layerId);
    const sectionObjectsInLayer = layerObjects.filter((entry) => sectionIdSet.has(entry.id));
    if (layerObjects.length < 2 || sectionObjectsInLayer.length === 0) {
      continue;
    }

    const firstIndex = layerObjects.findIndex((entry) => sectionIdSet.has(entry.id));
    const lastIndex = layerObjects.length - 1 - [...layerObjects].reverse().findIndex((entry) => sectionIdSet.has(entry.id));
    if (firstIndex < 0 || lastIndex < 0) {
      continue;
    }

    const remainingObjects = layerObjects.filter((entry) => !sectionIdSet.has(entry.id));
    const beforeStartIndex = firstIndex;
    let insertIndex = null;

    if (action === "send-to-back") {
      insertIndex = 0;
    } else if (action === "bring-to-front") {
      insertIndex = remainingObjects.length;
    } else if (action === "send-backward") {
      const previousObject = layerObjects[firstIndex - 1] ?? null;
      if (!previousObject) {
        continue;
      }
      const previousIndex = remainingObjects.findIndex((entry) => entry.id === previousObject.id);
      if (previousIndex < 0) {
        continue;
      }
      insertIndex = previousIndex;
    } else if (action === "bring-forward") {
      const nextObject = layerObjects[lastIndex + 1] ?? null;
      if (!nextObject) {
        continue;
      }
      const nextIndex = remainingObjects.findIndex((entry) => entry.id === nextObject.id);
      if (nextIndex < 0) {
        continue;
      }
      insertIndex = nextIndex + 1;
    }

    if (!Number.isInteger(insertIndex)) {
      continue;
    }

    const nextLayerObjects = [
      ...remainingObjects.slice(0, insertIndex),
      ...sectionObjectsInLayer,
      ...remainingObjects.slice(insertIndex)
    ];
    const afterStartIndex = nextLayerObjects.findIndex((entry) => sectionIdSet.has(entry.id));
    if (afterStartIndex === beforeStartIndex) {
      continue;
    }

    const absoluteIndices = [];
    for (let index = 0; index < editorData.objects.length; index += 1) {
      if (editorData.objects[index]?.layerId === layerId) {
        absoluteIndices.push(index);
      }
    }

    absoluteIndices.forEach((absoluteIndex, index) => {
      editorData.objects[absoluteIndex] = nextLayerObjects[index];
    });

    layerSummaries.push({
      layerId,
      layerName: getLayerById(layerId)?.displayName ?? layerId,
      beforeStartIndex,
      afterStartIndex,
      total: layerObjects.length
    });
  }

  return {
    changed: layerSummaries.length > 0,
    layerSummaries
  };
}

function toggleSceneSectionIsolation(sectionId) {
  const sectionEntry = getSceneSectionEntryById(sectionId);
  if (!sectionEntry || !state.editorData) {
    setPreviewStatus("Could not find that scene section in the current internal scene.");
    return;
  }

  if (state.canvasDrag || state.canvasResize || state.viewport.panDrag) {
    setPreviewStatus(`Finish the current edit before changing the solo section view for ${sectionEntry.label}.`);
    return;
  }

  if (getIsolatedSceneSectionId() === sectionId) {
    const restoreSelectionId = state.sceneSectionIsolation.previousSelectedObjectId;
    resetSceneSectionIsolation();
    reconcileSelectedObject(restoreSelectionId, state.selectedObjectId);
    pushLog(`Cleared solo section view for ${sectionEntry.label}.`);
    renderAll();
    setPreviewStatus("Solo section view cleared. Saved visibility and layer rules are active again.");
    return;
  }

  const previousLayerIsolation = getIsolatedLayer();
  if (previousLayerIsolation) {
    resetLayerIsolation();
  }

  state.sceneSectionIsolation = {
    activeSectionId: sectionId,
    previousSelectedObjectId: state.selectedObjectId
  };

  setWorkbenchMode("scene", { silent: true });
  state.workflowUi.activePanel = "compose";
  setSelectedObjectIds(sectionEntry.memberObjectIds, sectionEntry.memberObjectIds[0] ?? null);
  reconcileSelectedObject(state.selectedObjectId, state.sceneSectionIsolation.previousSelectedObjectId);
  pushLog(`Solo section view enabled for ${sectionEntry.label}.`);
  renderAll();
  setPreviewStatus(`Solo section view enabled for ${sectionEntry.label}. This is session-only${previousLayerIsolation ? ` and replaced solo layer view for ${previousLayerIsolation.displayName}` : ""}.`);
}

function reorderSceneSection(sectionId, action) {
  const sectionEntry = getSceneSectionEntryById(sectionId);
  if (!sectionEntry) {
    setPreviewStatus("Could not find that scene section in the current internal scene.");
    return;
  }

  if (state.canvasDrag || state.canvasResize || state.viewport.panDrag) {
    setPreviewStatus(`Finish the current edit before changing order for scene section ${sectionEntry.label}.`);
    return;
  }

  const sectionObjects = uniqueStrings([sectionEntry.id, ...sectionEntry.memberObjectIds])
    .map((objectId) => getEditableObjectById(objectId))
    .filter(Boolean);
  const blockedObjects = sectionObjects.filter((entry) => !isObjectEditable(entry));
  if (blockedObjects.length > 0) {
    setPreviewStatus(`Scene section ${sectionEntry.label} cannot change order while ${blockedObjects.length} grouped object${blockedObjects.length === 1 ? "" : "s"} are locked.`);
    return;
  }

  let reorderResult = null;
  const didChange = applyEditorMutation(`Reordered scene section ${sectionEntry.label}.`, (editorData) => {
    reorderResult = reorderSceneSectionInLayers(editorData, uniqueStrings([sectionEntry.id, ...sectionEntry.memberObjectIds]), action);
  });

  if (!didChange || !reorderResult?.changed) {
    setPreviewStatus(`Scene section ${sectionEntry.label} is already at that ordering boundary in its current layer stack.`);
    return;
  }

  const movedLayerNames = reorderResult.layerSummaries.map((entry) => entry.layerName);
  focusSceneObjectGroupInWorkflow(sectionEntry.memberObjectIds, {
    label: "scene section",
    statusMessage: `${sectionEntry.label} was ${getOrderActionLabel(action)} across ${movedLayerNames.length} layer${movedLayerNames.length === 1 ? "" : "s"}: ${movedLayerNames.join(", ")}. ${sectionEntry.count} grouped object${sectionEntry.count === 1 ? "" : "s"} remain selected in Compose Mode.`
  });
}

function duplicateSceneSection(sectionId) {
  const sectionEntry = getSceneSectionEntryById(sectionId);
  if (!sectionEntry) {
    setPreviewStatus("Could not find that scene section in the current internal scene.");
    return;
  }

  const sourceContainer = getEditableObjectById(sectionEntry.id);
  if (!sourceContainer || !isDonorSceneKitContainer(sourceContainer)) {
    setPreviewStatus(`Scene section ${sectionEntry.label} no longer has a valid grouped container to duplicate.`);
    return;
  }

  const blockedMembers = sectionEntry.memberObjects.filter((entry) => !isObjectEditable(entry));
  if (blockedMembers.length > 0) {
    setPreviewStatus(`Scene section ${sectionEntry.label} cannot be duplicated while ${blockedMembers.length} member object${blockedMembers.length === 1 ? "" : "s"} are locked.`);
    return;
  }

  let duplicateContainerId = null;
  const duplicateMemberIds = [];
  const didChange = applyEditorMutation(`Duplicated scene section ${sectionEntry.label}.`, (editorData) => {
    if (!Array.isArray(editorData.objects)) {
      return;
    }

    const liveSourceContainer = editorData.objects.find((entry) => entry.id === sectionEntry.id);
    if (!liveSourceContainer || !isDonorSceneKitContainer(liveSourceContainer)) {
      return;
    }

    const liveMembers = editorData.objects.filter((entry) => entry?.parentId === liveSourceContainer.id);
    if (liveMembers.length === 0) {
      return;
    }

    const containerDuplicate = cloneEditableObjectForDuplicate(liveSourceContainer, editorData.objects);
    containerDuplicate.displayName = liveSourceContainer.displayName ? `${liveSourceContainer.displayName} Copy` : containerDuplicate.id;
    duplicateContainerId = containerDuplicate.id;
    editorData.objects.push(containerDuplicate);

    liveMembers.forEach((member) => {
      const memberDuplicate = cloneEditableObjectForDuplicate(member, editorData.objects);
      memberDuplicate.parentId = duplicateContainerId;
      duplicateMemberIds.push(memberDuplicate.id);
      editorData.objects.push(memberDuplicate);
    });
  });

  if (!didChange || duplicateMemberIds.length === 0) {
    setPreviewStatus(`Could not duplicate scene section ${sectionEntry.label}.`);
    return;
  }

  focusSceneObjectGroupInWorkflow(duplicateMemberIds, {
    label: "scene section",
    statusMessage: `Duplicated scene section ${sectionEntry.label}. ${duplicateMemberIds.length} editable object${duplicateMemberIds.length === 1 ? "" : "s"} in the copied game-part kit are now selected in Compose Mode.`
  });
}

function deleteSceneSection(sectionId) {
  const sectionEntry = getSceneSectionEntryById(sectionId);
  if (!sectionEntry) {
    setPreviewStatus("Could not find that scene section in the current internal scene.");
    return;
  }

  const blockedMembers = sectionEntry.memberObjects.filter((entry) => !isObjectEditable(entry));
  if (blockedMembers.length > 0) {
    setPreviewStatus(`Scene section ${sectionEntry.label} cannot be deleted while ${blockedMembers.length} member object${blockedMembers.length === 1 ? "" : "s"} are locked.`);
    return;
  }

  const removedObjectIds = [sectionEntry.id, ...sectionEntry.memberObjectIds];
  const preferredLayerIds = sectionEntry.memberObjects.map((entry) => entry.layerId);
  let nextSelectionId = null;
  const didChange = applyEditorMutation(`Deleted scene section ${sectionEntry.label}.`, (editorData) => {
    if (!Array.isArray(editorData.objects)) {
      return;
    }

    nextSelectionId = selectNeighborAfterDeleteGroup(editorData, removedObjectIds, preferredLayerIds);
    editorData.objects = editorData.objects.filter((entry) => !removedObjectIds.includes(entry.id));
  });

  if (!didChange) {
    setPreviewStatus(`Could not delete scene section ${sectionEntry.label}.`);
    return;
  }

  setWorkbenchMode("scene", { silent: true });
  state.workflowUi.activePanel = "compose";
  if (nextSelectionId) {
    setSelectedObject(nextSelectionId);
    ensureSelectedObject();
  } else {
    clearSelectedObjects();
  }
  renderAll();
  setPreviewStatus(`Deleted scene section ${sectionEntry.label}. ${sectionEntry.count} grouped editable object${sectionEntry.count === 1 ? "" : "s"} were removed from Compose Mode.`);
}

function centerSceneSectionInViewport(sectionId) {
  const sectionEntry = getSceneSectionEntryById(sectionId);
  if (!sectionEntry) {
    setPreviewStatus("Could not find that scene section in the current internal scene.");
    return;
  }

  const blockedMembers = sectionEntry.memberObjects.filter((entry) => !isObjectEditable(entry));
  if (blockedMembers.length > 0) {
    setPreviewStatus(`Scene section ${sectionEntry.label} cannot be centered while ${blockedMembers.length} member object${blockedMembers.length === 1 ? "" : "s"} are locked.`);
    return;
  }

  const bounds = getObjectGroupBounds(sectionEntry.memberObjects);
  if (!bounds) {
    setPreviewStatus(`Scene section ${sectionEntry.label} does not have any editable bounds to center.`);
    return;
  }

  const viewport = getSceneViewport();
  const desiredDeltaX = Math.round((viewport.width - bounds.width) / 2 - bounds.x);
  const desiredDeltaY = Math.round((viewport.height - bounds.height) / 2 - bounds.y);
  const deltaX = Math.max(-bounds.x, Math.min(desiredDeltaX, viewport.width - (bounds.x + bounds.width)));
  const deltaY = Math.max(-bounds.y, Math.min(desiredDeltaY, viewport.height - (bounds.y + bounds.height)));

  if (deltaX === 0 && deltaY === 0) {
    setPreviewStatus(`Scene section ${sectionEntry.label} is already centered in the current viewport bounds.`);
    return;
  }

  const transformObjectIds = uniqueStrings([sectionEntry.id, ...sectionEntry.memberObjectIds]);
  const didChange = applyEditorMutation(`Centered scene section ${sectionEntry.label}.`, (editorData) => {
    if (!Array.isArray(editorData.objects)) {
      return;
    }

    editorData.objects.forEach((entry) => {
      if (!transformObjectIds.includes(entry.id)) {
        return;
      }
      entry.x = Math.round((Number.isFinite(entry.x) ? entry.x : 0) + deltaX);
      entry.y = Math.round((Number.isFinite(entry.y) ? entry.y : 0) + deltaY);
    });
  });

  if (!didChange) {
    setPreviewStatus(`Could not center scene section ${sectionEntry.label}.`);
    return;
  }

  focusSceneObjectGroupInWorkflow(sectionEntry.memberObjectIds, {
    label: "scene section",
    statusMessage: `Centered scene section ${sectionEntry.label} in the editable viewport. ${sectionEntry.count} grouped object${sectionEntry.count === 1 ? "" : "s"} remain selected in Compose Mode.`
  });
}

function getSceneKitLayoutDimensions(layoutStyle) {
  return {
    width: layoutStyle === "strip" ? 960 : layoutStyle === "stack" ? 360 : 760,
    height: layoutStyle === "hero" ? 420 : layoutStyle === "stack" ? 520 : 320
  };
}

function resetSceneSectionLayout(sectionId) {
  const sectionEntry = getSceneSectionEntryById(sectionId);
  if (!sectionEntry) {
    setPreviewStatus("Could not find that scene section in the current internal scene.");
    return;
  }

  const sourceContainer = getEditableObjectById(sectionEntry.id);
  const sceneKitSummary = sectionEntry.gamePartSummary?.sceneKitSummary
    ?? sectionEntry.provenance?.primaryGroupSummary
    ?? null;
  if (!sourceContainer || !isDonorSceneKitContainer(sourceContainer) || !sceneKitSummary) {
    setPreviewStatus(`Scene section ${sectionEntry.label} does not have enough scene-kit structure to reset its grouped layout yet.`);
    return;
  }

  const blockedMembers = sectionEntry.memberObjects.filter((entry) => !isObjectEditable(entry));
  if (blockedMembers.length > 0) {
    setPreviewStatus(`Scene section ${sectionEntry.label} cannot reset its layout while ${blockedMembers.length} member object${blockedMembers.length === 1 ? "" : "s"} are locked.`);
    return;
  }

  const didChange = applyEditorMutation(`Reset scene section ${sectionEntry.label} layout.`, (editorData) => {
    if (!Array.isArray(editorData.objects)) {
      return;
    }

    const liveContainer = editorData.objects.find((entry) => entry.id === sectionEntry.id);
    if (!liveContainer || !isDonorSceneKitContainer(liveContainer)) {
      return;
    }

    const liveMembers = editorData.objects.filter((entry) => entry?.parentId === liveContainer.id);
    if (liveMembers.length === 0) {
      return;
    }

    const viewport = getSceneViewport();
    const nextLayoutDimensions = getSceneKitLayoutDimensions(sceneKitSummary.layoutStyle);
    const nextContainerWidth = nextLayoutDimensions.width;
    const nextContainerHeight = nextLayoutDimensions.height;
    liveContainer.width = nextContainerWidth;
    liveContainer.height = nextContainerHeight;

    const containerBounds = {
      x: Number.isFinite(liveContainer.x) ? liveContainer.x : 0,
      y: Number.isFinite(liveContainer.y) ? liveContainer.y : 0,
      width: nextContainerWidth,
      height: nextContainerHeight
    };

    liveMembers.forEach((member, index) => {
      const nextPosition = buildDonorAssetGroupImportPosition(
        index,
        viewport,
        liveMembers.length,
        sceneKitSummary.layoutStyle ?? "grid",
        containerBounds
      );
      member.x = nextPosition.x;
      member.y = nextPosition.y;
    });
  });

  if (!didChange) {
    setPreviewStatus(`Could not reset scene section ${sectionEntry.label} layout.`);
    return;
  }

  focusSceneObjectGroupInWorkflow(sectionEntry.memberObjectIds, {
    label: "scene section",
    statusMessage: `Reset scene section ${sectionEntry.label} to its ${sceneKitSummary.importLabel ?? "scene-kit"} layout. ${sectionEntry.count} grouped object${sectionEntry.count === 1 ? "" : "s"} remain selected in Compose Mode.`
  });
}

function restoreSceneSectionDefaults(sectionId) {
  const sectionEntry = getSceneSectionEntryById(sectionId);
  if (!sectionEntry) {
    setPreviewStatus("Could not find that scene section in the current internal scene.");
    return;
  }

  const sourceContainer = getEditableObjectById(sectionEntry.id);
  const sceneKitSummary = sectionEntry.gamePartSummary?.sceneKitSummary
    ?? sectionEntry.provenance?.primaryGroupSummary
    ?? null;
  if (!sourceContainer || !isDonorSceneKitContainer(sourceContainer) || !sceneKitSummary) {
    setPreviewStatus(`Scene section ${sectionEntry.label} does not have enough scene-kit structure to restore its defaults yet.`);
    return;
  }

  const transformObjectIds = uniqueStrings([sectionEntry.id, ...sectionEntry.memberObjectIds]);
  const transformObjects = transformObjectIds.map((objectId) => getEditableObjectById(objectId)).filter(Boolean);
  const blockedCurrentLayers = transformObjects.filter((entry) => getLayerById(entry.layerId)?.locked);
  if (blockedCurrentLayers.length > 0) {
    setPreviewStatus(`Scene section ${sectionEntry.label} cannot restore defaults while ${blockedCurrentLayers.length} grouped object${blockedCurrentLayers.length === 1 ? "" : "s"} are on locked layers.`);
    return;
  }

  const targetLayer = sceneKitSummary.layerId
    ? getAssignableLayers().find((entry) => entry.id === sceneKitSummary.layerId) ?? null
    : null;
  if (sceneKitSummary.layerId && !targetLayer) {
    setPreviewStatus(`Scene section ${sectionEntry.label} cannot restore defaults because ${sceneKitSummary.layerId} is not editable right now.`);
    return;
  }

  const sectionBounds = getObjectGroupBounds(sectionEntry.memberObjects);
  const anchorX = Math.round(Number.isFinite(sourceContainer.x) ? sourceContainer.x : sectionBounds?.x ?? 0);
  const anchorY = Math.round(Number.isFinite(sourceContainer.y) ? sourceContainer.y : sectionBounds?.y ?? 0);
  const layoutDimensions = getSceneKitLayoutDimensions(sceneKitSummary.layoutStyle);

  const didChange = applyEditorMutation(`Restored scene section ${sectionEntry.label} defaults.`, (editorData) => {
    if (!Array.isArray(editorData.objects)) {
      return;
    }

    const liveContainer = editorData.objects.find((entry) => entry.id === sectionEntry.id);
    if (!liveContainer || !isDonorSceneKitContainer(liveContainer)) {
      return;
    }

    const liveMembers = editorData.objects.filter((entry) => entry?.parentId === liveContainer.id);
    if (liveMembers.length === 0) {
      return;
    }

    const viewport = getSceneViewport();
    const containerBounds = {
      x: anchorX,
      y: anchorY,
      width: layoutDimensions.width,
      height: layoutDimensions.height
    };

    editorData.objects.forEach((entry) => {
      if (!transformObjectIds.includes(entry.id)) {
        return;
      }
      entry.visible = true;
      entry.locked = false;
      entry.scaleX = 1;
      entry.scaleY = 1;
      if (targetLayer) {
        entry.layerId = targetLayer.id;
      }
    });

    liveContainer.x = anchorX;
    liveContainer.y = anchorY;
    liveContainer.width = layoutDimensions.width;
    liveContainer.height = layoutDimensions.height;

    liveMembers.forEach((member, index) => {
      const nextPosition = buildDonorAssetGroupImportPosition(
        index,
        viewport,
        liveMembers.length,
        sceneKitSummary.layoutStyle ?? "grid",
        containerBounds
      );
      member.x = nextPosition.x;
      member.y = nextPosition.y;
    });

    const nextBounds = getObjectGroupBounds(liveMembers);
    if (nextBounds) {
      liveContainer.x = nextBounds.x;
      liveContainer.y = nextBounds.y;
      liveContainer.width = nextBounds.width;
      liveContainer.height = nextBounds.height;
    }
  });

  if (!didChange) {
    setPreviewStatus(`Could not restore defaults for scene section ${sectionEntry.label}.`);
    return;
  }

  focusSceneObjectGroupInWorkflow(sectionEntry.memberObjectIds, {
    label: "scene section",
    statusMessage: `Restored scene section ${sectionEntry.label} defaults. ${sectionEntry.count} grouped object${sectionEntry.count === 1 ? "" : "s"} are visible, unlocked, reset to ${sceneKitSummary.importLabel ?? "scene-kit"} layout, and selected in Compose Mode${targetLayer ? ` on ${targetLayer.displayName}` : ""}.`
  });
}

function toggleSceneSectionVisibility(sectionId) {
  const sectionEntry = getSceneSectionEntryById(sectionId);
  if (!sectionEntry) {
    setPreviewStatus("Could not find that scene section in the current internal scene.");
    return;
  }

  const sectionState = sectionEntry.stateSummary ?? getSceneSectionStateSummary(sectionEntry);
  const transformObjectIds = uniqueStrings([sectionEntry.id, ...sectionEntry.memberObjectIds]);
  const transformObjects = transformObjectIds.map((objectId) => getEditableObjectById(objectId)).filter(Boolean);
  const blockedObjects = transformObjects.filter((entry) => getLayerById(entry.layerId)?.locked);
  if (blockedObjects.length > 0) {
    setPreviewStatus(`Scene section ${sectionEntry.label} cannot change visibility while ${blockedObjects.length} grouped object${blockedObjects.length === 1 ? "" : "s"} are on locked layers.`);
    return;
  }

  const nextVisible = Boolean(sectionState?.allHidden);
  const actionLabel = nextVisible ? "Showed" : "Hid";
  const didChange = applyEditorMutation(`${actionLabel} scene section ${sectionEntry.label}.`, (editorData) => {
    if (!Array.isArray(editorData.objects)) {
      return;
    }

    editorData.objects.forEach((entry) => {
      if (transformObjectIds.includes(entry.id)) {
        entry.visible = nextVisible;
      }
    });
  });

  if (!didChange) {
    setPreviewStatus(`Could not update visibility for scene section ${sectionEntry.label}.`);
    return;
  }

  setWorkbenchMode("scene", { silent: true });
  state.workflowUi.activePanel = "compose";
  if (nextVisible) {
    focusSceneObjectGroupInWorkflow(sectionEntry.memberObjectIds, {
      label: "scene section",
      statusMessage: `Showed scene section ${sectionEntry.label}. ${sectionEntry.count} grouped object${sectionEntry.count === 1 ? "" : "s"} remain selected in Compose Mode.`
    });
    return;
  }

  clearSelectedObjects();
  renderAll();
  setPreviewStatus(`Hid scene section ${sectionEntry.label}. Use Scene Sections to show the grouped game-part kit again.`);
}

function toggleSceneSectionLock(sectionId) {
  const sectionEntry = getSceneSectionEntryById(sectionId);
  if (!sectionEntry) {
    setPreviewStatus("Could not find that scene section in the current internal scene.");
    return;
  }

  const sectionState = sectionEntry.stateSummary ?? getSceneSectionStateSummary(sectionEntry);
  const transformObjectIds = uniqueStrings([sectionEntry.id, ...sectionEntry.memberObjectIds]);
  const transformObjects = transformObjectIds.map((objectId) => getEditableObjectById(objectId)).filter(Boolean);
  const blockedObjects = transformObjects.filter((entry) => getLayerById(entry.layerId)?.locked);
  if (blockedObjects.length > 0) {
    setPreviewStatus(`Scene section ${sectionEntry.label} cannot change object locks while ${blockedObjects.length} grouped object${blockedObjects.length === 1 ? "" : "s"} are on locked layers.`);
    return;
  }

  const nextLocked = !Boolean(sectionState?.allLocked);
  const actionLabel = nextLocked ? "Locked" : "Unlocked";
  const didChange = applyEditorMutation(`${actionLabel} scene section ${sectionEntry.label}.`, (editorData) => {
    if (!Array.isArray(editorData.objects)) {
      return;
    }

    editorData.objects.forEach((entry) => {
      if (transformObjectIds.includes(entry.id)) {
        entry.locked = nextLocked;
      }
    });
  });

  if (!didChange) {
    setPreviewStatus(`Could not update lock state for scene section ${sectionEntry.label}.`);
    return;
  }

  setWorkbenchMode("scene", { silent: true });
  state.workflowUi.activePanel = "compose";
  setSelectedObjectIds(sectionEntry.memberObjectIds, sectionEntry.memberObjectIds[0] ?? null);
  renderAll();
  setPreviewStatus(`${actionLabel} scene section ${sectionEntry.label}. ${sectionEntry.count} grouped object${sectionEntry.count === 1 ? "" : "s"} remain selected in Compose Mode.`);
}

function scaleSceneSection(sectionId, direction) {
  const sectionEntry = getSceneSectionEntryById(sectionId);
  if (!sectionEntry) {
    setPreviewStatus("Could not find that scene section in the current internal scene.");
    return;
  }

  const factor = direction === "up" ? 1.1 : direction === "down" ? 0.9 : null;
  if (!factor) {
    setPreviewStatus(`Scene section ${sectionEntry.label} does not support that scale action.`);
    return;
  }

  const blockedMembers = sectionEntry.memberObjects.filter((entry) => !isObjectEditable(entry));
  if (blockedMembers.length > 0) {
    setPreviewStatus(`Scene section ${sectionEntry.label} cannot scale while ${blockedMembers.length} member object${blockedMembers.length === 1 ? "" : "s"} are locked.`);
    return;
  }

  const memberBounds = getObjectGroupBounds(sectionEntry.memberObjects);
  if (!memberBounds) {
    setPreviewStatus(`Scene section ${sectionEntry.label} does not have any editable bounds to scale.`);
    return;
  }

  const sectionCenterX = memberBounds.x + memberBounds.width / 2;
  const sectionCenterY = memberBounds.y + memberBounds.height / 2;
  const actionLabel = direction === "up" ? "Scaled up" : "Scaled down";
  const didChange = applyEditorMutation(`${actionLabel} scene section ${sectionEntry.label}.`, (editorData) => {
    if (!Array.isArray(editorData.objects)) {
      return;
    }

    const liveContainer = editorData.objects.find((entry) => entry.id === sectionEntry.id);
    const liveMembers = liveContainer
      ? editorData.objects.filter((entry) => entry?.parentId === liveContainer.id)
      : [];
    if (liveMembers.length === 0) {
      return;
    }

    liveMembers.forEach((member) => {
      const currentBounds = getObjectBounds(member);
      if (!currentBounds) {
        return;
      }

      const baseScaleX = Number.isFinite(member.scaleX) ? member.scaleX : 1;
      const baseScaleY = Number.isFinite(member.scaleY) ? member.scaleY : 1;
      const nextScaleX = Number(clamp(baseScaleX * factor, 0.25, 4).toFixed(3));
      const nextScaleY = Number(clamp(baseScaleY * factor, 0.25, 4).toFixed(3));
      const appliedFactorX = baseScaleX !== 0 ? nextScaleX / baseScaleX : factor;
      const appliedFactorY = baseScaleY !== 0 ? nextScaleY / baseScaleY : factor;
      const currentCenterX = currentBounds.x + currentBounds.width / 2;
      const currentCenterY = currentBounds.y + currentBounds.height / 2;
      const offsetCenterX = currentCenterX - sectionCenterX;
      const offsetCenterY = currentCenterY - sectionCenterY;

      member.scaleX = nextScaleX;
      member.scaleY = nextScaleY;

      const nextBounds = getObjectBounds(member);
      if (!nextBounds) {
        return;
      }

      const desiredCenterX = sectionCenterX + offsetCenterX * appliedFactorX;
      const desiredCenterY = sectionCenterY + offsetCenterY * appliedFactorY;
      const desiredX = desiredCenterX - nextBounds.width / 2;
      const desiredY = desiredCenterY - nextBounds.height / 2;
      const bounded = clampObjectPosition(member, desiredX, desiredY);
      member.x = bounded.x;
      member.y = bounded.y;
    });

    if (liveContainer) {
      const nextBounds = getObjectGroupBounds(liveMembers);
      if (nextBounds) {
        liveContainer.x = nextBounds.x;
        liveContainer.y = nextBounds.y;
        liveContainer.width = nextBounds.width;
        liveContainer.height = nextBounds.height;
        liveContainer.scaleX = 1;
        liveContainer.scaleY = 1;
      }
    }
  });

  if (!didChange) {
    setPreviewStatus(`Could not scale scene section ${sectionEntry.label}.`);
    return;
  }

  focusSceneObjectGroupInWorkflow(sectionEntry.memberObjectIds, {
    label: "scene section",
    statusMessage: `${actionLabel} scene section ${sectionEntry.label}. ${sectionEntry.count} grouped object${sectionEntry.count === 1 ? "" : "s"} remain selected in Compose Mode.`
  });
}

function restoreSceneSectionSuggestedLayer(sectionId) {
  const sectionEntry = getSceneSectionEntryById(sectionId);
  if (!sectionEntry) {
    setPreviewStatus("Could not find that scene section in the current internal scene.");
    return;
  }

  const suggestedLayerId = sectionEntry.gamePartSummary?.sceneKitSummary?.layerId
    ?? sectionEntry.provenance?.primaryGroupSummary?.layerId
    ?? null;
  if (!suggestedLayerId) {
    setPreviewStatus(`Scene section ${sectionEntry.label} does not have a suggested layer recorded yet.`);
    return;
  }

  const targetLayer = getAssignableLayers().find((entry) => entry.id === suggestedLayerId);
  if (!targetLayer) {
    setPreviewStatus(`Scene section ${sectionEntry.label} cannot move to ${suggestedLayerId} because that layer is not editable right now.`);
    return;
  }

  const transformObjectIds = uniqueStrings([sectionEntry.id, ...sectionEntry.memberObjectIds]);
  const transformObjects = transformObjectIds.map((objectId) => getEditableObjectById(objectId)).filter(Boolean);
  const blockedObjects = transformObjects.filter((entry) => !isObjectEditable(entry));
  if (blockedObjects.length > 0) {
    setPreviewStatus(`Scene section ${sectionEntry.label} cannot move layers while ${blockedObjects.length} grouped object${blockedObjects.length === 1 ? "" : "s"} are locked.`);
    return;
  }

  if (transformObjects.length > 0 && transformObjects.every((entry) => entry.layerId === targetLayer.id)) {
    setPreviewStatus(`Scene section ${sectionEntry.label} is already on ${targetLayer.displayName}.`);
    return;
  }

  const didChange = applyEditorMutation(`Moved scene section ${sectionEntry.label} to ${targetLayer.displayName}.`, (editorData) => {
    if (!Array.isArray(editorData.objects)) {
      return;
    }

    editorData.objects.forEach((entry) => {
      if (transformObjectIds.includes(entry.id)) {
        entry.layerId = targetLayer.id;
      }
    });
  });

  if (!didChange) {
    setPreviewStatus(`Could not move scene section ${sectionEntry.label} to ${targetLayer.displayName}.`);
    return;
  }

  focusSceneObjectGroupInWorkflow(sectionEntry.memberObjectIds, {
    label: "scene section",
    statusMessage: `Moved scene section ${sectionEntry.label} to ${targetLayer.displayName}. ${sectionEntry.count} grouped object${sectionEntry.count === 1 ? "" : "s"} remain selected in Compose Mode.`
  });
}

function selectObjectFromEvidence(objectId) {
  focusSceneObjectInWorkflow(objectId, {
    statusMessage: `Selected ${getEditableObjectById(objectId)?.displayName ?? objectId} from donor evidence linkage.`
  });
}

function handleNavigationClick(event) {
  if (handleCopyEvent(event)) {
    return true;
  }

  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const workflowPanelButton = target.closest("[data-workflow-panel]");
  if (workflowPanelButton instanceof HTMLElement && workflowPanelButton.dataset.workflowPanel) {
    event.preventDefault();
    setWorkflowPanel(workflowPanelButton.dataset.workflowPanel);
    return true;
  }

  const workbenchButton = target.closest("[data-switch-workbench-mode]");
  if (workbenchButton instanceof HTMLElement && workbenchButton.dataset.switchWorkbenchMode) {
    event.preventDefault();
    setWorkbenchMode(workbenchButton.dataset.switchWorkbenchMode, { silent: true });
    if (workbenchButton.dataset.switchWorkflowPanel) {
      state.workflowUi.activePanel = normalizeWorkflowPanel(workbenchButton.dataset.switchWorkflowPanel);
      renderAll();
    }
    setPreviewStatus(workbenchButton.dataset.switchStatus
      ?? `${getWorkbenchModeLabel(workbenchButton.dataset.switchWorkbenchMode)} Mode is active.`);
    return true;
  }

  const taskRuntimeTraceButton = target.closest("[data-task-reconstruction-runtime-source-url]");
  if (taskRuntimeTraceButton instanceof HTMLElement && taskRuntimeTraceButton.dataset.taskReconstructionRuntimeSourceUrl) {
    event.preventDefault();
    const runtimeSourceUrl = taskRuntimeTraceButton.dataset.taskReconstructionRuntimeSourceUrl;
    const runtimeLabel = taskRuntimeTraceButton.dataset.taskReconstructionRuntimeLabel
      ?? getRuntimeResourceRelativePath(runtimeSourceUrl)
      ?? runtimeSourceUrl;
    const taskId = typeof taskRuntimeTraceButton.dataset.taskReconstructionTaskId === "string"
      && taskRuntimeTraceButton.dataset.taskReconstructionTaskId.length > 0
      ? taskRuntimeTraceButton.dataset.taskReconstructionTaskId
      : null;
    const pageName = typeof taskRuntimeTraceButton.dataset.taskReconstructionPageName === "string"
      && taskRuntimeTraceButton.dataset.taskReconstructionPageName.length > 0
      ? taskRuntimeTraceButton.dataset.taskReconstructionPageName
      : null;
    const runtimeEntry = getRuntimeWorkbenchEntryBySourceUrl(runtimeSourceUrl);
    void persistProjectModificationTaskPageRuntimeProof({
      taskId,
      pageName,
      sourceUrl: runtimeSourceUrl,
      runtimeLabel,
      requestSource: runtimeEntry?.requestSource ?? null,
      requestBacked: runtimeEntry?.requestBacked !== false,
      relativePath: runtimeEntry?.relativePath ?? getRuntimeResourceRelativePath(runtimeSourceUrl),
      localMirrorRepoRelativePath: runtimeEntry?.localMirrorRepoRelativePath ?? null,
      overrideHitCountAfterReload: Number(runtimeEntry?.overrideHitCountAfterReload ?? 0)
    });
    setRuntimeWorkbenchSource(runtimeSourceUrl, { render: false });
    setWorkbenchMode("runtime", { silent: true });
    state.workflowUi.activePanel = "runtime";
    renderAll();
    setPreviewStatus(`Runtime Mode is active. Page cue ${runtimeLabel} is now focused on ${getRuntimeResourceRelativePath(runtimeSourceUrl) ?? runtimeSourceUrl}.`);
    return true;
  }

  const taskDebugHostButton = target.closest("[data-task-reconstruction-open-debug-host]");
  if (taskDebugHostButton instanceof HTMLElement) {
    event.preventDefault();
    const runtimeLabel = taskDebugHostButton.dataset.taskReconstructionRuntimeLabel ?? "Page cue";
    const taskId = typeof taskDebugHostButton.dataset.taskReconstructionTaskId === "string"
      && taskDebugHostButton.dataset.taskReconstructionTaskId.length > 0
      ? taskDebugHostButton.dataset.taskReconstructionTaskId
      : null;
    const pageName = typeof taskDebugHostButton.dataset.taskReconstructionPageName === "string"
      && taskDebugHostButton.dataset.taskReconstructionPageName.length > 0
      ? taskDebugHostButton.dataset.taskReconstructionPageName
      : null;
    const runtimeProfileId = typeof taskDebugHostButton.dataset.taskReconstructionRuntimeProfileId === "string"
      && taskDebugHostButton.dataset.taskReconstructionRuntimeProfileId.length > 0
      ? taskDebugHostButton.dataset.taskReconstructionRuntimeProfileId
      : "autoplay";
    let candidateHintTokens = [];
    if (typeof taskDebugHostButton.dataset.taskReconstructionRuntimeHintTokens === "string"
      && taskDebugHostButton.dataset.taskReconstructionRuntimeHintTokens.length > 0) {
      try {
        const parsed = JSON.parse(taskDebugHostButton.dataset.taskReconstructionRuntimeHintTokens);
        if (Array.isArray(parsed)) {
          candidateHintTokens = parsed.filter((value) => typeof value === "string" && value.trim().length > 0);
        }
      } catch {
        candidateHintTokens = [];
      }
    }
    void proveProjectModificationTaskPageRuntime({
      taskId,
      pageName,
      runtimeLabel,
      runtimeProfileId,
      candidateHintTokens,
    });
    return true;
  }

  const runtimeSourceButton = target.closest("[data-runtime-source-url]");
  if (runtimeSourceButton instanceof HTMLElement && runtimeSourceButton.dataset.runtimeSourceUrl) {
    event.preventDefault();
    const runtimeSourceUrl = runtimeSourceButton.dataset.runtimeSourceUrl;
    const action = runtimeSourceButton.dataset.runtimeSourceAction ?? "select";
    setRuntimeWorkbenchSource(runtimeSourceUrl, { render: false });
    if (action === "select") {
      renderAll();
      setPreviewStatus(`Runtime workbench is now focused on ${getRuntimeResourceRelativePath(runtimeSourceUrl) ?? runtimeSourceUrl}.`);
      return true;
    }
    if (action === "create-override") {
      renderAll();
      void createRuntimeOverrideFromCurrentBridge();
      return true;
    }
    if (action === "clear-override") {
      renderAll();
      void clearRuntimeOverrideForCurrentCandidate();
      return true;
    }
    if (action === "open-debug-host") {
      renderAll();
      void openRuntimeDebugHostWindow();
      return true;
    }
    renderAll();
    return true;
  }

  const runtimeActionButton = target.closest("[data-runtime-action]");
  if (runtimeActionButton instanceof HTMLElement && runtimeActionButton.dataset.runtimeAction) {
    if (runtimeActionButton instanceof HTMLButtonElement && runtimeActionButton.disabled) {
      return true;
    }
    event.preventDefault();
    void handleRuntimeAction(runtimeActionButton.dataset.runtimeAction);
    return true;
  }

  const donorScanActionButton = target.closest("[data-donor-scan-action]");
  if (donorScanActionButton instanceof HTMLElement && donorScanActionButton.dataset.donorScanAction) {
    if (donorScanActionButton instanceof HTMLButtonElement && donorScanActionButton.disabled) {
      return true;
    }
    event.preventDefault();
    if (donorScanActionButton.dataset.donorScanAction === "capture-next") {
      const limit = Number.parseInt(donorScanActionButton.dataset.donorScanCaptureLimit ?? "5", 10);
      const family = typeof donorScanActionButton.dataset.donorScanCaptureFamily === "string"
        && donorScanActionButton.dataset.donorScanCaptureFamily.trim().length > 0
        ? donorScanActionButton.dataset.donorScanCaptureFamily.trim()
        : null;
      const mode = donorScanActionButton.dataset.donorScanCaptureMode === "family-sources"
        ? "family-sources"
        : "ranked-targets";
      void runDonorScanCapture(Number.isFinite(limit) ? limit : 5, family, mode);
      return true;
    }
    if (donorScanActionButton.dataset.donorScanAction === "run-family-action") {
      const limit = Number.parseInt(donorScanActionButton.dataset.donorScanCaptureLimit ?? "10", 10);
      const family = typeof donorScanActionButton.dataset.donorScanCaptureFamily === "string"
        && donorScanActionButton.dataset.donorScanCaptureFamily.trim().length > 0
        ? donorScanActionButton.dataset.donorScanCaptureFamily.trim()
        : "";
      void runDonorScanFamilyAction(family, Number.isFinite(limit) ? limit : 10);
      return true;
    }
    if (donorScanActionButton.dataset.donorScanAction === "run-scenario-profile") {
      const profileId = typeof donorScanActionButton.dataset.donorScanProfile === "string"
        && donorScanActionButton.dataset.donorScanProfile.trim().length > 0
        ? donorScanActionButton.dataset.donorScanProfile.trim()
        : "";
      const minutes = Number.parseInt(donorScanActionButton.dataset.donorScanMinutes ?? "0", 10);
      void runDonorScenarioProfile(profileId, Number.isFinite(minutes) && minutes > 0 ? minutes : null);
      return true;
    }
    if (donorScanActionButton.dataset.donorScanAction === "run-promotion-queue") {
      void runDonorPromotionQueue();
      return true;
    }
    if (donorScanActionButton.dataset.donorScanAction === "run-section-action") {
      const sectionKey = typeof donorScanActionButton.dataset.donorScanSectionKey === "string"
        && donorScanActionButton.dataset.donorScanSectionKey.trim().length > 0
        ? donorScanActionButton.dataset.donorScanSectionKey.trim()
        : "";
      void runDonorScanSectionAction(sectionKey);
      return true;
    }
  }

  const projectModificationActionButton = target.closest("[data-project-modification-action]");
  if (projectModificationActionButton instanceof HTMLElement && projectModificationActionButton.dataset.projectModificationAction) {
    if (projectModificationActionButton instanceof HTMLButtonElement && projectModificationActionButton.disabled) {
      return true;
    }
    event.preventDefault();
    if (projectModificationActionButton.dataset.projectModificationAction === "prepare-handoff") {
      void prepareProjectModificationBoard();
      return true;
    }
    const taskId = typeof projectModificationActionButton.dataset.projectModificationTaskId === "string"
      ? projectModificationActionButton.dataset.projectModificationTaskId.trim()
      : "";
    if (projectModificationActionButton.dataset.projectModificationAction === "start-task") {
      openProjectModificationTask(taskId, "preferred");
      return true;
    }
    if (projectModificationActionButton.dataset.projectModificationAction === "open-compose-task") {
      openProjectModificationTask(taskId, "compose");
      return true;
    }
    if (projectModificationActionButton.dataset.projectModificationAction === "open-runtime-task") {
      openProjectModificationTask(taskId, "runtime");
      return true;
    }
  }

  const taskSectionReplaceButton = target.closest("[data-task-section-replace-asset-id]");
  if (taskSectionReplaceButton instanceof HTMLElement && taskSectionReplaceButton.dataset.taskSectionReplaceAssetId) {
    event.preventDefault();
    const taskId = typeof taskSectionReplaceButton.dataset.taskSectionTaskId === "string"
      ? taskSectionReplaceButton.dataset.taskSectionTaskId.trim()
      : "";
    if (taskId) {
      setActiveProjectModificationTask(taskId, { render: false });
    }
    handleReplaceSelectedObjectWithDonorAsset(taskSectionReplaceButton.dataset.taskSectionReplaceAssetId);
    return true;
  }

  const taskReconstructionObjectsButton = target.closest("[data-task-reconstruction-object-ids]");
  if (taskReconstructionObjectsButton instanceof HTMLElement && taskReconstructionObjectsButton.dataset.taskReconstructionObjectIds) {
    event.preventDefault();
    let objectIds = [];
    try {
      const parsed = JSON.parse(taskReconstructionObjectsButton.dataset.taskReconstructionObjectIds);
      objectIds = Array.isArray(parsed) ? parsed.filter((entry) => typeof entry === "string" && entry.length > 0) : [];
    } catch {
      objectIds = [];
    }
    if (objectIds.length > 0) {
      focusSceneObjectGroupInWorkflow(objectIds, {
        statusMessage: objectIds.length === 1
          ? `Selected the grouped Compose member already tied to this grounded page source.`
          : `Selected ${objectIds.length} grouped Compose members already tied to this grounded page source.`
      });
    }
    return true;
  }

  const taskReconstructionFocusObjectButton = target.closest("[data-task-reconstruction-focus-object-id]");
  if (taskReconstructionFocusObjectButton instanceof HTMLElement && taskReconstructionFocusObjectButton.dataset.taskReconstructionFocusObjectId) {
    event.preventDefault();
    focusSceneObjectInWorkflow(taskReconstructionFocusObjectButton.dataset.taskReconstructionFocusObjectId, {
      statusMessage: "Selected the best single grouped Compose member for this grounded page cue."
    });
    return true;
  }

  const focusSceneObjectButton = target.closest("[data-focus-scene-object-id]");
  if (focusSceneObjectButton instanceof HTMLElement && focusSceneObjectButton.dataset.focusSceneObjectId) {
    event.preventDefault();
    focusSceneObjectInWorkflow(focusSceneObjectButton.dataset.focusSceneObjectId);
    return true;
  }

  const focusSceneObjectIdsButton = target.closest("[data-focus-scene-object-ids]");
  if (focusSceneObjectIdsButton instanceof HTMLElement && focusSceneObjectIdsButton.dataset.focusSceneObjectIds) {
    event.preventDefault();
    let objectIds = [];
    try {
      const parsed = JSON.parse(focusSceneObjectIdsButton.dataset.focusSceneObjectIds);
      objectIds = Array.isArray(parsed) ? parsed.filter((entry) => typeof entry === "string" && entry.length > 0) : [];
    } catch {
      objectIds = [];
    }
    focusSceneObjectGroupInWorkflow(objectIds);
    return true;
  }

  const focusSceneSectionButton = target.closest("[data-focus-scene-section-id]");
  if (focusSceneSectionButton instanceof HTMLElement && focusSceneSectionButton.dataset.focusSceneSectionId) {
    event.preventDefault();
    const sectionEntry = getSceneSectionEntryById(focusSceneSectionButton.dataset.focusSceneSectionId);
    focusSceneObjectGroupInWorkflow(sectionEntry?.memberObjectIds ?? [], {
      label: "scene section",
      statusMessage: sectionEntry
        ? `Selected ${sectionEntry.count} editable object${sectionEntry.count === 1 ? "" : "s"} in scene section ${sectionEntry.label}.${sectionEntry.runtimeContext?.preferredWorkbenchEntry ? ` Runtime-linked source: ${sectionEntry.runtimeContext.preferredWorkbenchEntry.relativePath ?? sectionEntry.runtimeContext.preferredWorkbenchEntry.sourceUrl}.` : sectionEntry.runtimeContext?.preferredReference ? ` Supporting runtime evidence: ${sectionEntry.runtimeContext.preferredReference.label}.` : ""}`
        : null
    });
    return true;
  }

  const focusSceneSectionAssetsButton = target.closest("[data-focus-scene-section-assets-id]");
  if (focusSceneSectionAssetsButton instanceof HTMLElement && focusSceneSectionAssetsButton.dataset.focusSceneSectionAssetsId) {
    event.preventDefault();
    focusSceneSectionAssets(focusSceneSectionAssetsButton.dataset.focusSceneSectionAssetsId);
    return true;
  }

  const frameSceneSectionButton = target.closest("[data-frame-scene-section-id]");
  if (frameSceneSectionButton instanceof HTMLElement && frameSceneSectionButton.dataset.frameSceneSectionId) {
    event.preventDefault();
    const sectionEntry = getSceneSectionEntryById(frameSceneSectionButton.dataset.frameSceneSectionId);
    frameSceneObjectGroupInWorkflow(sectionEntry?.memberObjectIds ?? [], {
      label: "scene section",
      statusMessage: sectionEntry
        ? `Framed scene section ${sectionEntry.label} in Compose Mode. ${sectionEntry.count} editable object${sectionEntry.count === 1 ? "" : "s"} remain selected. View state is session-only.`
        : null
    });
    return true;
  }

  const focusSceneSectionEvidenceButton = target.closest("[data-focus-scene-section-evidence-id]");
  if (focusSceneSectionEvidenceButton instanceof HTMLElement && focusSceneSectionEvidenceButton.dataset.focusSceneSectionEvidenceId) {
    event.preventDefault();
    focusSceneSectionEvidence(focusSceneSectionEvidenceButton.dataset.focusSceneSectionEvidenceId);
    return true;
  }

  const openSceneSectionRuntimeButton = target.closest("[data-open-scene-section-runtime-id]");
  if (openSceneSectionRuntimeButton instanceof HTMLElement && openSceneSectionRuntimeButton.dataset.openSceneSectionRuntimeId) {
    event.preventDefault();
    openSceneSectionRuntimeContext(openSceneSectionRuntimeButton.dataset.openSceneSectionRuntimeId);
    return true;
  }

  const createSceneSectionOverrideButton = target.closest("[data-create-scene-section-override-id]");
  if (createSceneSectionOverrideButton instanceof HTMLElement && createSceneSectionOverrideButton.dataset.createSceneSectionOverrideId) {
    event.preventDefault();
    void createSceneSectionRuntimeOverride(createSceneSectionOverrideButton.dataset.createSceneSectionOverrideId);
    return true;
  }

  const clearSceneSectionOverrideButton = target.closest("[data-clear-scene-section-override-id]");
  if (clearSceneSectionOverrideButton instanceof HTMLElement && clearSceneSectionOverrideButton.dataset.clearSceneSectionOverrideId) {
    event.preventDefault();
    void clearSceneSectionRuntimeOverride(clearSceneSectionOverrideButton.dataset.clearSceneSectionOverrideId);
    return true;
  }

  const duplicateSceneSectionButton = target.closest("[data-duplicate-scene-section-id]");
  if (duplicateSceneSectionButton instanceof HTMLElement && duplicateSceneSectionButton.dataset.duplicateSceneSectionId) {
    event.preventDefault();
    duplicateSceneSection(duplicateSceneSectionButton.dataset.duplicateSceneSectionId);
    return true;
  }

  const deleteSceneSectionButton = target.closest("[data-delete-scene-section-id]");
  if (deleteSceneSectionButton instanceof HTMLElement && deleteSceneSectionButton.dataset.deleteSceneSectionId) {
    event.preventDefault();
    deleteSceneSection(deleteSceneSectionButton.dataset.deleteSceneSectionId);
    return true;
  }

  const centerSceneSectionButton = target.closest("[data-center-scene-section-id]");
  if (centerSceneSectionButton instanceof HTMLElement && centerSceneSectionButton.dataset.centerSceneSectionId) {
    event.preventDefault();
    centerSceneSectionInViewport(centerSceneSectionButton.dataset.centerSceneSectionId);
    return true;
  }

  const resetSceneSectionLayoutButton = target.closest("[data-reset-scene-section-layout-id]");
  if (resetSceneSectionLayoutButton instanceof HTMLElement && resetSceneSectionLayoutButton.dataset.resetSceneSectionLayoutId) {
    event.preventDefault();
    resetSceneSectionLayout(resetSceneSectionLayoutButton.dataset.resetSceneSectionLayoutId);
    return true;
  }

  const toggleSceneSectionVisibilityButton = target.closest("[data-toggle-scene-section-visibility-id]");
  if (toggleSceneSectionVisibilityButton instanceof HTMLElement && toggleSceneSectionVisibilityButton.dataset.toggleSceneSectionVisibilityId) {
    event.preventDefault();
    toggleSceneSectionVisibility(toggleSceneSectionVisibilityButton.dataset.toggleSceneSectionVisibilityId);
    return true;
  }

  const toggleSceneSectionLockButton = target.closest("[data-toggle-scene-section-lock-id]");
  if (toggleSceneSectionLockButton instanceof HTMLElement && toggleSceneSectionLockButton.dataset.toggleSceneSectionLockId) {
    event.preventDefault();
    toggleSceneSectionLock(toggleSceneSectionLockButton.dataset.toggleSceneSectionLockId);
    return true;
  }

  const toggleSceneSectionIsolationButton = target.closest("[data-toggle-scene-section-isolation-id]");
  if (toggleSceneSectionIsolationButton instanceof HTMLElement && toggleSceneSectionIsolationButton.dataset.toggleSceneSectionIsolationId) {
    event.preventDefault();
    toggleSceneSectionIsolation(toggleSceneSectionIsolationButton.dataset.toggleSceneSectionIsolationId);
    return true;
  }

  const reorderSceneSectionButton = target.closest("[data-reorder-scene-section-id]");
  if (
    reorderSceneSectionButton instanceof HTMLElement
    && reorderSceneSectionButton.dataset.reorderSceneSectionId
    && reorderSceneSectionButton.dataset.reorderSceneSectionAction
  ) {
    event.preventDefault();
    reorderSceneSection(
      reorderSceneSectionButton.dataset.reorderSceneSectionId,
      reorderSceneSectionButton.dataset.reorderSceneSectionAction
    );
    return true;
  }

  const scaleSceneSectionUpButton = target.closest("[data-scale-scene-section-up-id]");
  if (scaleSceneSectionUpButton instanceof HTMLElement && scaleSceneSectionUpButton.dataset.scaleSceneSectionUpId) {
    event.preventDefault();
    scaleSceneSection(scaleSceneSectionUpButton.dataset.scaleSceneSectionUpId, "up");
    return true;
  }

  const scaleSceneSectionDownButton = target.closest("[data-scale-scene-section-down-id]");
  if (scaleSceneSectionDownButton instanceof HTMLElement && scaleSceneSectionDownButton.dataset.scaleSceneSectionDownId) {
    event.preventDefault();
    scaleSceneSection(scaleSceneSectionDownButton.dataset.scaleSceneSectionDownId, "down");
    return true;
  }

  const restoreSceneSectionDefaultsButton = target.closest("[data-restore-scene-section-defaults-id]");
  if (restoreSceneSectionDefaultsButton instanceof HTMLElement && restoreSceneSectionDefaultsButton.dataset.restoreSceneSectionDefaultsId) {
    event.preventDefault();
    restoreSceneSectionDefaults(restoreSceneSectionDefaultsButton.dataset.restoreSceneSectionDefaultsId);
    return true;
  }

  const restoreSceneSectionLayerButton = target.closest("[data-restore-scene-section-layer-id]");
  if (restoreSceneSectionLayerButton instanceof HTMLElement && restoreSceneSectionLayerButton.dataset.restoreSceneSectionLayerId) {
    event.preventDefault();
    restoreSceneSectionSuggestedLayer(restoreSceneSectionLayerButton.dataset.restoreSceneSectionLayerId);
    return true;
  }

  const focusSceneObjectGroupButton = target.closest("[data-focus-scene-object-group-key]");
  if (focusSceneObjectGroupButton instanceof HTMLElement && focusSceneObjectGroupButton.dataset.focusSceneObjectGroupKey) {
    event.preventDefault();
    const groupKey = focusSceneObjectGroupButton.dataset.focusSceneObjectGroupKey;
    const linkedGroupObjects = getSceneObjectsForDonorAssetGroupKey(groupKey);
    const groupSummary = getDonorAssetGroupSceneKitSummary(groupKey);
    focusSceneObjectGroupInWorkflow(linkedGroupObjects.map((entry) => entry.id), {
      label: groupSummary?.importLabel ?? "scene kit",
      statusMessage: linkedGroupObjects.length > 0
        ? `Selected ${linkedGroupObjects.length} editable object${linkedGroupObjects.length === 1 ? "" : "s"} for ${groupSummary?.label ?? groupKey} in Compose Mode.`
        : null
    });
    return true;
  }

  const focusDonorAssetButton = target.closest("[data-focus-donor-asset-id]");
  if (focusDonorAssetButton instanceof HTMLElement && focusDonorAssetButton.dataset.focusDonorAssetId) {
    event.preventDefault();
    focusDonorAssetCard(focusDonorAssetButton.dataset.focusDonorAssetId);
    return true;
  }

  const focusDonorAssetGroupButton = target.closest("[data-focus-donor-asset-group-key]");
  if (focusDonorAssetGroupButton instanceof HTMLElement && focusDonorAssetGroupButton.dataset.focusDonorAssetGroupKey) {
    event.preventDefault();
    focusDonorAssetGroup(focusDonorAssetGroupButton.dataset.focusDonorAssetGroupKey);
    return true;
  }

  const focusDonorEvidenceButton = target.closest("[data-focus-donor-evidence-id]");
  if (focusDonorEvidenceButton instanceof HTMLElement && focusDonorEvidenceButton.dataset.focusDonorEvidenceId) {
    event.preventDefault();
    focusEvidenceItem(focusDonorEvidenceButton.dataset.focusDonorEvidenceId, {
      selectedObjectOnly: false
    });
    return true;
  }

  return false;
}

function renderCopyButton(copyValue, copyLabel, buttonText = "Copy") {
  if (typeof copyValue !== "string" || copyValue.trim().length === 0) {
    return "";
  }

  return `
    <button
      type="button"
      class="copy-button"
      data-copy-value="${escapeAttribute(copyValue)}"
      data-copy-label="${escapeAttribute(copyLabel)}"
      title="Copy ${escapeAttribute(copyLabel)}"
    >${buttonText}</button>
  `;
}

function renderEvidenceRefChips(refs, copyLabelPrefix = "evidence ref") {
  if (!Array.isArray(refs) || refs.length === 0) {
    return "";
  }

  return `
    <div class="chip-row evidence-chip-row">
      ${refs.map((refId, index) => `
        <span>
          <code>${escapeHtml(refId)}</code>
          ${renderCopyButton(refId, `${copyLabelPrefix} ${index + 1}`)}
        </span>
      `).join("")}
    </div>
  `;
}

function renderCopyableList(values, {
  labelPrefix,
  emptyMessage,
  displayValue = (value) => value,
  buttonText = "Copy"
}) {
  if (!Array.isArray(values) || values.length === 0) {
    return `<p class="muted-copy">${escapeHtml(emptyMessage)}</p>`;
  }

  return `
    <ul class="evidence-copy-list">
      ${values.map((value, index) => `
        <li class="evidence-copy-item">
          <code>${escapeHtml(displayValue(value))}</code>
          ${renderCopyButton(String(value), `${labelPrefix} ${index + 1}`, buttonText)}
        </li>
      `).join("")}
    </ul>
  `;
}

function renderPathEntries(entries) {
  const usableEntries = Array.isArray(entries)
    ? entries.filter((entry) => typeof entry?.value === "string" && entry.value.length > 0)
    : [];
  if (usableEntries.length === 0) {
    return `<p class="muted-copy">No donor/report paths are recorded yet.</p>`;
  }

  return `
    <div class="evidence-card-list">
      ${usableEntries.map((entry) => `
        <div class="detail-card evidence-detail-card">
          <span>${escapeHtml(entry.label)}</span>
          <strong><code>${escapeHtml(toRepoRelativePath(entry.value))}</code></strong>
          <small>${escapeHtml(entry.note)}</small>
          <div class="evidence-actions">
            ${renderCopyButton(entry.value, entry.label.toLowerCase())}
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

function renderImporterNodeEntries(entries) {
  if (!Array.isArray(entries) || entries.length === 0) {
    return `<p class="muted-copy">No importer node evidence refs are recorded yet.</p>`;
  }

  return `
    <ul class="evidence-record-list">
      ${entries.map((entry, index) => `
        <li class="evidence-record-card">
          <div class="evidence-record-head">
            <strong><code>${escapeHtml(entry.nodeId)}</code></strong>
            ${renderCopyButton(entry.nodeId, `importer node id ${index + 1}`)}
          </div>
          <small class="muted-copy">${entry.evidenceRefs.length} grounded importer node refs.</small>
          ${renderEvidenceRefChips(entry.evidenceRefs, `importer node ref ${entry.nodeId}`)}
          ${entry.notes ? `<small class="muted-copy">${escapeHtml(entry.notes)}</small>` : ""}
        </li>
      `).join("")}
    </ul>
  `;
}

function renderImporterAssetEntries(entries) {
  if (!Array.isArray(entries) || entries.length === 0) {
    return `<p class="muted-copy">No importer asset provenance refs are recorded yet.</p>`;
  }

  return `
    <ul class="evidence-record-list">
      ${entries.map((entry, index) => `
        <li class="evidence-record-card">
          <div class="evidence-record-head">
            <strong>${escapeHtml(entry.name)}</strong>
            ${entry.assetId ? renderCopyButton(entry.assetId, `importer asset id ${index + 1}`) : ""}
          </div>
          <small class="muted-copy">
            ${entry.assetId ? `<code>${escapeHtml(entry.assetId)}</code>` : "No stable importer asset id recorded."}
            ${entry.origin ? ` · ${escapeHtml(entry.origin)}` : ""}
            ${entry.donorId ? ` · ${escapeHtml(entry.donorId)}` : ""}
          </small>
          ${renderEvidenceRefChips(entry.evidenceRefs, `importer asset ref ${entry.name}`)}
          ${entry.notes ? `<small class="muted-copy">${escapeHtml(entry.notes)}</small>` : ""}
        </li>
      `).join("")}
    </ul>
  `;
}

function renderEvidencePreview(item) {
  if (!item) {
    return "";
  }

  if (item.previewKind === "image" && item.previewUrl) {
    return `
      <div class="evidence-preview evidence-preview-image">
        <img src="${escapeAttribute(item.previewUrl)}" alt="${escapeAttribute(item.title || item.evidenceId)} donor evidence preview" loading="lazy" />
      </div>
    `;
  }

  if (item.previewKind === "text" && item.previewText) {
    return `
      <div class="evidence-preview evidence-preview-text">
        <p>${escapeHtml(item.previewText)}</p>
      </div>
    `;
  }

  return `
    <div class="evidence-preview evidence-preview-fallback">
      <span>${escapeHtml(item.previewText ?? "No lightweight preview is available for this evidence item in the current shell.")}</span>
    </div>
  `;
}

function renderDonorAssetFilterBar(donorAssetCatalog, visibleCount) {
  if (!donorAssetCatalog || donorAssetCatalog.assetCount <= 0) {
    return "";
  }

  const selectedFilter = String(state.donorAssetUi?.fileTypeFilter ?? "all").trim().toLowerCase();
  const selectedAssetGroupFilter = String(state.donorAssetUi?.assetGroupFilter ?? "all").trim();
  const filterOptions = [
    {
      key: "all",
      label: "All",
      count: donorAssetCatalog.assetCount
    },
    ...donorAssetCatalog.availableFileTypes.map((fileType) => ({
      key: fileType,
      label: fileType.toUpperCase(),
      count: donorAssetCatalog.countsByFileType?.[fileType] ?? 0
    }))
  ];
  const groupOptions = [
    {
      key: "all",
      label: "All bundles",
      count: donorAssetCatalog.assetCount
    },
    ...((Array.isArray(donorAssetCatalog.assetGroups) ? donorAssetCatalog.assetGroups : []).map((entry) => ({
      key: entry.key,
      label: entry.label,
      count: entry.count
    })))
  ];
  const sourceSummary = Object.entries(donorAssetCatalog.countsBySourceCategory ?? {})
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([label, count]) => `<span>${escapeHtml(label)}: ${count}</span>`)
    .join("");

  return `
    <div class="donor-asset-filter-toolbar">
      <div class="donor-asset-filter-row">
        <div class="donor-asset-filter-buttons" role="toolbar" aria-label="Donor asset type filter">
          ${filterOptions.map((option) => `
            <button
              type="button"
              class="donor-asset-filter-button ${selectedFilter === option.key ? "is-active" : ""}"
              data-donor-asset-type-filter="${escapeAttribute(option.key)}"
              aria-pressed="${selectedFilter === option.key ? "true" : "false"}"
            >
              <span>${escapeHtml(option.label)}</span>
              <strong>${option.count}</strong>
            </button>
          `).join("")}
        </div>
        ${groupOptions.length > 1 ? `
          <label class="toolbar-select donor-asset-group-select" for="field-donor-asset-group-filter">
            <span>Asset Bundle</span>
            <select id="field-donor-asset-group-filter" data-donor-asset-group-filter="1">
              ${groupOptions.map((option) => `
                <option value="${escapeAttribute(option.key)}" ${selectedAssetGroupFilter === option.key ? "selected" : ""}>${escapeHtml(`${option.label} (${option.count})`)}</option>
              `).join("")}
            </select>
          </label>
        ` : ""}
      </div>
      <div class="chip-row donor-asset-summary-chips">
        <span>${visibleCount} visible</span>
        ${sourceSummary || "<span>No grounded source categories indexed.</span>"}
      </div>
    </div>
  `;
}

function renderDonorImportTargetControl() {
  const assignableLayers = getAssignableLayers();
  const selectedValue = String(state.donorAssetUi?.importTargetLayerId ?? "auto").trim() || "auto";
  const replaceableSelectedObject = getReplaceableSelectedObject();

  if (!state.editorData || assignableLayers.length === 0) {
    return `
      <div class="tree-row donor-import-target-card">
        <strong>Donor Composition Target</strong>
        <span>No editable layer is available, so donor import is currently blocked.</span>
      </div>
    `;
  }

  return `
    <div class="tree-row donor-import-target-card">
      <strong>Donor Composition Target</strong>
      <span>New donor drops land on <strong>${escapeHtml(getDonorImportTargetLayerLabel())}</strong>. Dropping over an editable object replaces it while keeping that object's current layer and layout.</span>
      <div class="donor-import-target-controls">
        <label class="toolbar-select donor-import-layer-select" for="field-donor-import-layer">
          <span>Import Target Layer</span>
          <select id="field-donor-import-layer" data-donor-import-target-layer="1">
            <option value="auto" ${selectedValue === "auto" ? "selected" : ""}>Auto: current selected layer</option>
            ${assignableLayers.map((layer) => `
              <option value="${escapeAttribute(layer.id)}" ${selectedValue === layer.id ? "selected" : ""}>${escapeHtml(layer.displayName)}</option>
            `).join("")}
          </select>
        </label>
        <div class="chip-row donor-import-target-chips">
          <span>${assignableLayers.length} editable layer${assignableLayers.length === 1 ? "" : "s"}</span>
          <span>${replaceableSelectedObject ? `replace-ready: ${escapeHtml(replaceableSelectedObject.displayName)}` : "replace-ready: select an editable object"}</span>
        </div>
      </div>
    </div>
  `;
}

function renderDonorAssetCards(items, evidenceObjectIndex = new Map()) {
  const groupedItems = groupVisibleDonorAssets(items);
  if (!Array.isArray(items) || items.length === 0) {
    const searchQuery = String(state.donorAssetUi?.searchQuery ?? "").trim();
    return searchQuery
      ? `<p class="muted-copy">No donor asset matches <code>${escapeHtml(searchQuery)}</code>.</p>`
      : `<p class="muted-copy">No usable donor or harvested runtime/package image bundles are available for this project on this machine yet.</p>`;
  }

  const replaceableSelectedObject = getReplaceableSelectedObject();

  return `
    <div class="donor-asset-groups">
      ${groupedItems.map((group) => `
        ${(() => {
          const sceneKitSummary = getDonorAssetGroupSceneKitSummary(group.key);
          const linkedGroupObjects = getSceneObjectsForDonorAssetGroupKey(group.key);
          return `
        <section class="donor-asset-group">
          <div class="donor-asset-group-head">
            <div class="donor-asset-group-meta">
              <strong>${escapeHtml(group.label)}</strong>
              <span>${group.count} item${group.count === 1 ? "" : "s"}${group.kind === "package-family" ? " in this harvested runtime/package scene kit" : group.kind === "modification-task-kit" ? " in this prepared modification task kit" : ""}</span>
              ${group.description ? `<small>${escapeHtml(group.description)}</small>` : ""}
              ${sceneKitSummary ? `<small>Scene kit target: ${escapeHtml(sceneKitSummary.layerLabel)} · ${escapeHtml(sceneKitSummary.layoutStyle)} layout · ${escapeHtml(sceneKitSummary.importLabel)}</small>` : ""}
            </div>
            <div class="evidence-actions">
              ${group.kind === "package-family" || group.kind === "modification-task-kit"
                ? `<button type="button" class="copy-button" data-import-donor-asset-group-key="${escapeAttribute(group.key)}">Import Scene Kit To Compose</button>`
                : ""}
              ${linkedGroupObjects.length > 0 ? `<button type="button" class="copy-button" data-focus-scene-object-group-key="${escapeAttribute(group.key)}">Select Scene Kit Objects</button>` : ""}
              ${linkedGroupObjects.length > 0 ? renderCopyButton(linkedGroupObjects.map((entry) => entry.id).join("\n"), `scene kit object ids for ${group.label}`, "Copy Linked IDs") : ""}
            </div>
          </div>
          ${linkedGroupObjects.length > 0 ? `
            <div class="chip-row donor-asset-summary-chips">
              <span>${linkedGroupObjects.length} linked scene object${linkedGroupObjects.length === 1 ? "" : "s"}</span>
              <span>${escapeHtml(linkedGroupObjects[0]?.displayName ?? "linked object")}</span>
            </div>
          ` : ""}
          <div class="donor-asset-grid">
            ${group.items.map((item) => {
              const linkedObjects = evidenceObjectIndex.get(item.evidenceId) ?? [];
              return `
              <article
                class="evidence-item-card donor-asset-card ${item.assetId === state.donorAssetUi?.highlightedAssetId ? "is-highlighted" : ""}"
                data-donor-asset-id="${escapeAttribute(item.assetId)}"
                draggable="true"
              >
                <div class="evidence-item-head">
                  <div>
                    <strong>${escapeHtml(item.title)}</strong>
                    <small><code>${escapeHtml(item.evidenceId)}</code></small>
                  </div>
                  <div class="evidence-actions">
                    ${renderCopyButton(item.assetId, `donor asset id ${item.assetId}`)}
                    ${renderCopyButton(item.absolutePath, `donor asset path ${item.assetId}`, "Copy Path")}
                  </div>
                </div>
                <div class="chip-row donor-asset-chip-row">
                  <span class="asset-format-badge">${escapeHtml(item.fileType.toUpperCase())}</span>
                  <span>${escapeHtml(item.sourceCategory)}</span>
                  <span>${escapeHtml(item.captureSessionId)}</span>
                  ${item.assetDepth !== null ? `<span>depth ${escapeHtml(String(item.assetDepth))}</span>` : ""}
                  <span>${item.width && item.height ? `${item.width}×${item.height}` : "size unknown"}</span>
                </div>
                ${item.previewUrl ? `
                  <div class="evidence-preview evidence-preview-image donor-asset-preview">
                    <img src="${escapeAttribute(item.previewUrl)}" alt="${escapeAttribute(item.title)} donor asset preview" loading="lazy" />
                  </div>
                ` : `
                  <div class="evidence-preview evidence-preview-fallback donor-asset-preview">
                    <span>No local preview is available for this donor asset on this machine.</span>
                  </div>
                `}
                <div class="evidence-item-body">
                  <p class="muted-copy">${escapeHtml(item.filename)} · ${escapeHtml(item.previewLabel)}</p>
                  ${item.notes ? `<p class="muted-copy">${escapeHtml(item.notes)}</p>` : ""}
                  ${item.discoveredFromUrl ? `<p class="muted-copy">Parent runtime/package source: <code>${escapeHtml(item.discoveredFromUrl)}</code></p>` : ""}
                  <p class="muted-copy"><code>${escapeHtml(item.repoRelativePath)}</code></p>
                </div>
                <div class="evidence-linked-objects">
                  <div class="evidence-subsection-head">
                    <strong>Drag Into Canvas</strong>
                    <span class="muted-copy">Drop onto empty canvas to create on ${escapeHtml(getDonorImportTargetLayerLabel())}, or drop onto an editable canvas object to replace it directly.</span>
                  </div>
                  <div class="chip-row donor-asset-import-hint">
                    <span>asset id ${escapeHtml(item.assetId)}</span>
                    <span>filename ${escapeHtml(item.filename)}</span>
                  </div>
                  <div class="evidence-subsection-head donor-replace-head">
                    <strong>Replace Selected Object</strong>
                    ${replaceableSelectedObject
                      ? `<button type="button" class="copy-button donor-replace-button" data-donor-replace-asset-id="${escapeAttribute(item.assetId)}" draggable="false">Replace ${escapeHtml(replaceableSelectedObject.displayName)}</button>`
                      : `<span class="muted-copy">Select an editable object to replace it while keeping its layer and layout.</span>`}
                  </div>
                  <div class="evidence-subsection-head">
                    <strong>Imported Scene Objects</strong>
                    ${linkedObjects.length > 0 ? renderCopyButton(linkedObjects.map((entry) => entry.objectId).join("\n"), `linked object ids for donor asset ${item.assetId}`, "Copy IDs") : ""}
                  </div>
                  ${renderEvidenceLinkedObjectButtons(linkedObjects)}
                </div>
              </article>
              `;
            }).join("")}
          </div>
        </section>
      `;
        })()}
      `).join("")}
    </div>
  `;
}

function renderEvidenceLinkedObjectButtons(linkedObjects) {
  if (!Array.isArray(linkedObjects) || linkedObjects.length === 0) {
    return `<p class="muted-copy">No linked internal scene objects are grounded for this evidence item yet.</p>`;
  }

  return `
    <div class="linked-object-list">
      ${linkedObjects.map((entry) => `
        <button
          type="button"
          class="linked-object-button"
          data-select-object-id="${escapeAttribute(entry.objectId)}"
          title="Select ${escapeAttribute(entry.displayName)} in the scene explorer"
        >
          <strong>${escapeHtml(entry.displayName)}</strong>
          <small><code>${escapeHtml(entry.objectId)}</code> · ${escapeHtml(entry.kinds.join(", "))}</small>
        </button>
      `).join("")}
    </div>
  `;
}

function renderEvidenceItemCards(items, evidenceObjectIndex, {
  highlightedEvidenceId = null,
  selectedObjectOnly = false
} = {}) {
  if (!Array.isArray(items) || items.length === 0) {
    return selectedObjectOnly
      ? `<p class="muted-copy">No donor evidence items are currently grounded for the selected object.</p>`
      : `<p class="muted-copy">No donor evidence catalog is available for this project yet.</p>`;
  }

  return `
    <div class="evidence-item-grid">
      ${items.map((item) => {
        const linkedObjects = evidenceObjectIndex.get(item.evidenceId) ?? [];
        const isHighlighted = item.evidenceId === highlightedEvidenceId;
        const relativePath = toRepoRelativePath(item.absolutePath || item.relativePath);
        const previewBadge = item.previewKind === "image"
          ? "image preview"
          : item.previewKind === "text"
            ? "text preview"
            : "metadata only";

        return `
          <article
            class="evidence-item-card ${isHighlighted ? "is-highlighted" : ""}"
            data-evidence-card-id="${escapeAttribute(item.evidenceId)}"
          >
            <div class="evidence-item-head">
              <div>
                <strong><code>${escapeHtml(item.evidenceId)}</code></strong>
                <small>${escapeHtml(item.title)}</small>
              </div>
              <div class="evidence-actions">
                ${renderCopyButton(item.evidenceId, `evidence id ${item.evidenceId}`)}
                <button
                  type="button"
                  class="copy-button"
                  data-highlight-evidence-id="${escapeAttribute(item.evidenceId)}"
                  title="Focus ${escapeAttribute(item.evidenceId)}"
                >Focus</button>
              </div>
            </div>
            <div class="chip-row">
              <span>${escapeHtml(item.sourceCategory)}</span>
              <span>${escapeHtml(item.sourceType)}</span>
              <span>${escapeHtml(item.fileType)}</span>
              <span>${escapeHtml(previewBadge)}</span>
              <span>${item.localExists ? "local file present" : "metadata only"}</span>
            </div>
            ${renderEvidencePreview(item)}
            <div class="detail-grid evidence-item-meta">
              <div class="detail-card">
                <span>Capture Session</span>
                <strong><code>${escapeHtml(item.captureSessionId)}</code></strong>
                <div class="evidence-actions">
                  ${renderCopyButton(item.captureSessionId, `capture session ${item.captureSessionId}`)}
                </div>
              </div>
              <div class="detail-card">
                <span>Local Path</span>
                <strong><code>${escapeHtml(relativePath)}</code></strong>
                <div class="evidence-actions">
                  ${renderCopyButton(item.absolutePath, `evidence path ${item.evidenceId}`)}
                </div>
              </div>
            </div>
            <div class="evidence-item-body">
              ${item.notes ? `<p class="muted-copy">${escapeHtml(item.notes)}</p>` : ""}
              ${item.sourceUrl ? `<p class="muted-copy">Source URL <code>${escapeHtml(item.sourceUrl)}</code></p>` : ""}
              <p class="muted-copy">Captured ${escapeHtml(item.capturedAtUtc ?? "unknown time")} · ${escapeHtml(item.sha256 ?? "no hash")} · ${item.sizeBytes ?? "unknown"} bytes</p>
            </div>
            <div class="evidence-linked-objects">
              <div class="evidence-subsection-head">
                <strong>Linked Scene Objects</strong>
                ${linkedObjects.length > 0 ? renderCopyButton(linkedObjects.map((entry) => entry.objectId).join("\n"), `linked object ids for ${item.evidenceId}`, "Copy IDs") : ""}
              </div>
              ${renderEvidenceLinkedObjectButtons(linkedObjects)}
            </div>
          </article>
        `;
      }).join("")}
    </div>
  `;
}

function renderSelectedObjectEvidenceDrilldown(linkage) {
  if (!linkage) {
    return `
      <div class="evidence-linkage-drilldown">
        <div class="tree-row">
          <strong>Evidence Drill-Down</strong>
          <span>Select an object to inspect grounded donor evidence linkage.</span>
        </div>
      </div>
    `;
  }

  const groups = [
    {
      key: "importer-node",
      title: "Importer Node Refs",
      refs: linkage.importNodeEvidenceRefs,
      detail: linkage.importNodeId ? `<code>${escapeHtml(linkage.importNodeId)}</code>` : "No importer node linkage recorded."
    },
    {
      key: "replay-asset",
      title: "Replay Asset Refs",
      refs: linkage.replayAssetEvidenceRefs,
      detail: linkage.replayAssetLabel ?? "No replay asset provenance recorded."
    },
    {
      key: "importer-asset",
      title: "Importer Asset Refs",
      refs: linkage.importAssetEvidenceRefs,
      detail: linkage.importAssetLabel ?? "No importer asset provenance recorded."
    },
    {
      key: "local-donor",
      title: "Local Donor Import Refs",
      refs: linkage.localDonorEvidenceRefs,
      detail: linkage.donorAssetLabel
        ? `${linkage.donorAssetLabel}${linkage.donorAssetFileType ? ` · ${linkage.donorAssetFileType.toUpperCase()}` : ""}${linkage.donorAssetPath ? ` · ${linkage.donorAssetPath}` : ""}`
        : "No local donor import linkage recorded."
    },
    {
      key: "state",
      title: "Related State Refs",
      refs: linkage.stateEvidenceRefs,
      detail: linkage.stateLinks.length > 0
        ? linkage.stateLinks.map((entry) => `${entry.stateId} (${entry.actionTypes.join(", ")})`).join("; ")
        : "No state linkage recorded."
    },
    {
      key: "animation",
      title: "Related Animation Refs",
      refs: linkage.animationEvidenceRefs,
      detail: linkage.animationLinks.length > 0
        ? linkage.animationLinks.map((entry) => `${entry.animationId} (${entry.properties.join(", ")})`).join("; ")
        : "No animation linkage recorded."
    }
  ];
  const allVisibleRefs = uniqueStrings(groups.flatMap((group) => group.refs));

  return `
    <div class="evidence-linkage-drilldown">
      <div class="tree-row scope-summary">
        <strong>Evidence Drill-Down</strong>
        <span>${escapeHtml(linkage.statusLabel)}</span>
        <div class="chip-row">
          <span>${escapeHtml(linkage.objectLabel)}</span>
          <span>${allVisibleRefs.length} grounded refs</span>
          <span>${state.evidenceUi.selectedObjectOnly ? "selected-object filter on" : "selected-object filter off"}</span>
        </div>
        <div class="evidence-actions">
          ${allVisibleRefs.length > 0 ? `<button type="button" class="copy-button" data-focus-linkage-refs="${escapeAttribute(JSON.stringify(allVisibleRefs))}" data-focus-linkage-label="selected object evidence">Show In Browser</button>` : ""}
          ${allVisibleRefs.length > 0 ? renderCopyButton(allVisibleRefs.join("\n"), `all selected object evidence refs for ${linkage.objectId}`, "Copy All Visible Refs") : ""}
          ${state.evidenceUi.selectedObjectOnly ? `<button type="button" class="copy-button" data-clear-evidence-filter="1">Clear Evidence Filter</button>` : ""}
        </div>
      </div>
      <div class="evidence-linkage-grid">
        ${groups.map((group) => `
          <div class="evidence-linkage-card">
            <div class="evidence-record-head">
              <strong>${escapeHtml(group.title)}</strong>
              <span class="summary-count">${group.refs.length}</span>
            </div>
            <small class="muted-copy">${escapeHtml(group.detail)}</small>
            ${group.refs.length > 0 ? renderEvidenceRefChips(group.refs, `${group.title.toLowerCase()} ref`) : `<p class="muted-copy">No grounded refs recorded for this group yet.</p>`}
            <div class="evidence-actions">
              ${group.refs.length > 0 ? `<button type="button" class="copy-button" data-focus-linkage-refs="${escapeAttribute(JSON.stringify(group.refs))}" data-focus-linkage-label="${escapeAttribute(group.title.toLowerCase())}">Show In Browser</button>` : ""}
              ${group.refs.length > 0 ? renderCopyButton(group.refs.join("\n"), `${group.title.toLowerCase()} refs`, "Copy Group Refs") : ""}
            </div>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

function isObjectEditable(object) {
  const layer = getLayerById(object.layerId);
  return !object.locked && !layer?.locked;
}

function isObjectSizeEditable(object) {
  const tools = getEditorStateTools();
  return Boolean(
    object
    && isObjectEditable(object)
    && typeof tools.isObjectSizeEditable === "function"
    && tools.isObjectSizeEditable(object)
  );
}

function isViewportAlignableObject(object) {
  const tools = getEditorStateTools();
  return Boolean(
    object
    && isObjectEditable(object)
    && typeof tools.isObjectAlignable === "function"
    && tools.isObjectAlignable(object)
  );
}

function isTypingTarget(target) {
  return target instanceof HTMLInputElement
    || target instanceof HTMLTextAreaElement
    || target instanceof HTMLSelectElement
    || Boolean(target && typeof target === "object" && "isContentEditable" in target && target.isContentEditable);
}

function isAdditiveSelectionEvent(event) {
  return Boolean(event?.shiftKey || event?.metaKey || event?.ctrlKey);
}

function getLayerMap() {
  const layerEntries = Array.isArray(state.editorData?.layers) ? state.editorData.layers : [];
  return new Map(layerEntries.map((layer) => [layer.id, layer]));
}

function getLayerById(layerId) {
  return getLayerMap().get(layerId) ?? null;
}

function isLayerIsolationActive() {
  return typeof state.layerIsolation?.activeLayerId === "string" && state.layerIsolation.activeLayerId.length > 0;
}

function getIsolatedLayerId() {
  return isLayerIsolationActive() ? state.layerIsolation.activeLayerId : null;
}

function getIsolatedLayer() {
  const isolatedLayerId = getIsolatedLayerId();
  return isolatedLayerId ? getLayerById(isolatedLayerId) : null;
}

function resetLayerIsolation() {
  state.layerIsolation = {
    activeLayerId: null,
    previousSelectedObjectId: null
  };
}

function isSceneSectionIsolationActive() {
  return typeof state.sceneSectionIsolation?.activeSectionId === "string" && state.sceneSectionIsolation.activeSectionId.length > 0;
}

function getIsolatedSceneSectionId() {
  return isSceneSectionIsolationActive() ? state.sceneSectionIsolation.activeSectionId : null;
}

function resetSceneSectionIsolation() {
  state.sceneSectionIsolation = {
    activeSectionId: null,
    previousSelectedObjectId: null
  };
}

function getRenderableSceneSectionObjectIds(editorData = state.editorData) {
  const isolatedSectionId = getIsolatedSceneSectionId();
  if (!isolatedSectionId || !editorData) {
    return null;
  }

  const sectionEntry = getSceneSectionEntryById(isolatedSectionId, editorData);
  if (!sectionEntry) {
    return null;
  }

  return new Set(uniqueStrings([sectionEntry.id, ...sectionEntry.memberObjectIds]));
}

function sortLayers(layers) {
  return [...layers].sort((left, right) => left.order - right.order || left.displayName.localeCompare(right.displayName));
}

function getRenderableLayerIds(editorData = state.editorData) {
  const tools = getEditorStateTools();
  if (typeof tools.getRenderableLayerIds === "function") {
    return tools.getRenderableLayerIds(editorData, getIsolatedLayerId());
  }

  const layers = sortLayers(Array.isArray(editorData?.layers) ? editorData.layers : []);
  const isolatedLayerId = getIsolatedLayerId();
  if (isolatedLayerId && layers.some((entry) => entry.id === isolatedLayerId)) {
    return [isolatedLayerId];
  }

  return layers.filter((entry) => entry.visible !== false).map((entry) => entry.id);
}

function isLayerVisibleInEditor(layer) {
  return getRenderableLayerIds().includes(layer.id);
}

function getLayerObjectsInOrder(layerId, editorData = state.editorData) {
  return Array.isArray(editorData?.objects)
    ? editorData.objects.filter((entry) => entry.layerId === layerId)
    : [];
}

function getFirstSelectableObjectIdForLayer(layerId) {
  const layerObjects = getLayerObjectsInOrder(layerId);
  const editable = layerObjects.find((entry) => isObjectEditable(entry));
  return editable?.id ?? layerObjects[0]?.id ?? null;
}

function enforceIsolationSelection() {
  if (!state.editorData || !isLayerIsolationActive()) {
    return;
  }

  const isolatedLayerId = getIsolatedLayerId();
  if (!isolatedLayerId) {
    return;
  }

  const isolatedSelectionIds = getSelectedObjectIds().filter((objectId) => {
    const object = getCanvasObjectById(objectId);
    return object?.layerId === isolatedLayerId;
  });
  if (isolatedSelectionIds.length > 0) {
    setSelectedObjectIds(isolatedSelectionIds, isolatedSelectionIds[0]);
    return;
  }

  setSelectedObjectIds([getFirstSelectableObjectIdForLayer(isolatedLayerId)].filter(Boolean));
}

function enforceSceneSectionIsolationSelection() {
  if (!state.editorData || !isSceneSectionIsolationActive()) {
    return;
  }

  const isolatedSectionId = getIsolatedSceneSectionId();
  if (!isolatedSectionId) {
    return;
  }

  const sectionEntry = getSceneSectionEntryById(isolatedSectionId, state.editorData);
  if (!sectionEntry) {
    resetSceneSectionIsolation();
    return;
  }

  const memberIds = uniqueStrings(sectionEntry.memberObjectIds);
  const isolatedSelectionIds = getSelectedObjectIds().filter((objectId) => memberIds.includes(objectId));
  if (isolatedSelectionIds.length > 0) {
    setSelectedObjectIds(isolatedSelectionIds, isolatedSelectionIds[0]);
    return;
  }

  setSelectedObjectIds(memberIds.slice(0, 1));
}

function getSelectedObjectOrderContext() {
  const selectedObject = getSelectedObject();
  if (!selectedObject || !state.editorData) {
    return null;
  }

  const tools = getEditorStateTools();
  if (typeof tools.getObjectOrderContext === "function") {
    return tools.getObjectOrderContext(state.editorData, selectedObject.id);
  }

  const layerObjects = getLayerObjectsInOrder(selectedObject.layerId);
  const index = layerObjects.findIndex((entry) => entry.id === selectedObject.id);
  if (index < 0) {
    return null;
  }

  return {
    objectId: selectedObject.id,
    layerId: selectedObject.layerId,
    layerName: getLayerById(selectedObject.layerId)?.displayName ?? selectedObject.layerId,
    index,
    total: layerObjects.length,
    canSendBackward: index > 0,
    canBringForward: index < layerObjects.length - 1
  };
}

function getLayerNavigableObjectIds(layerId) {
  const objects = getLayerObjectsInOrder(layerId);
  const sectionRenderableIds = getRenderableSceneSectionObjectIds();
  const baseIds = objects
    .map((entry) => entry.id)
    .filter((objectId) => !sectionRenderableIds || sectionRenderableIds.has(objectId));
  if (!isLayerIsolationActive()) {
    return baseIds;
  }

  const renderableIds = new Set(getRenderableLayerIds());
  return renderableIds.has(layerId)
    ? baseIds
    : [];
}

function getSelectedObjectNavigationContext(direction) {
  const selectedObject = getSelectedObject();
  if (!selectedObject || !state.editorData) {
    return null;
  }

  const tools = getEditorStateTools();
  const allowedObjectIds = getLayerNavigableObjectIds(selectedObject.layerId);
  if (typeof tools.getAdjacentObjectInLayer === "function") {
    return tools.getAdjacentObjectInLayer(state.editorData, selectedObject.id, direction, { allowedObjectIds });
  }

  const layerObjects = getLayerObjectsInOrder(selectedObject.layerId).filter((entry) => allowedObjectIds.includes(entry.id));
  const index = layerObjects.findIndex((entry) => entry.id === selectedObject.id);
  if (index < 0) {
    return null;
  }

  const targetIndex = direction === "previous" ? index - 1 : direction === "next" ? index + 1 : index;
  const target = layerObjects[targetIndex] ?? null;

  return {
    objectId: selectedObject.id,
    layerId: selectedObject.layerId,
    layerName: getLayerById(selectedObject.layerId)?.displayName ?? selectedObject.layerId,
    index,
    total: layerObjects.length,
    direction,
    targetObjectId: target?.id ?? null,
    targetLabel: target?.displayName ?? null,
    boundary: !target
  };
}

function ensureSelectedObject() {
  reconcileSelectedObject();
}

function getSceneViewport() {
  const viewport = state.editorData?.scene?.viewport;
  const width = Number.isFinite(viewport?.width) ? viewport.width : 1280;
  const height = Number.isFinite(viewport?.height) ? viewport.height : 720;

  return {
    width: Math.max(1, Math.round(width)),
    height: Math.max(1, Math.round(height))
  };
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getObjectExtent(object) {
  const dimensions = getObjectDimensions(object);
  const scaleX = Number.isFinite(object.scaleX) ? Math.abs(object.scaleX) : 1;
  const scaleY = Number.isFinite(object.scaleY) ? Math.abs(object.scaleY) : 1;

  return {
    width: Math.max(1, Math.round(dimensions.width * scaleX)),
    height: Math.max(1, Math.round(dimensions.height * scaleY))
  };
}

function clampObjectPosition(object, x, y) {
  const viewport = getSceneViewport();
  const extent = getObjectExtent(object);
  const maxX = Math.max(0, viewport.width - extent.width);
  const maxY = Math.max(0, viewport.height - extent.height);

  return {
    x: Math.round(clamp(x, 0, maxX)),
    y: Math.round(clamp(y, 0, maxY))
  };
}

function getCanvasStage() {
  return elements.editorCanvas?.querySelector(".canvas-stage") ?? null;
}

function getCanvasViewportElement() {
  return elements.editorCanvas?.querySelector(".canvas-viewport") ?? null;
}

function getCanvasObjectById(objectId) {
  if (!state.editorData || !Array.isArray(state.editorData.objects)) {
    return null;
  }

  return state.editorData.objects.find((entry) => entry.id === objectId) ?? null;
}

function getCanvasObjectFromTarget(target) {
  if (!(target instanceof HTMLElement)) {
    return null;
  }

  const objectButton = target.closest("[data-canvas-object-id]");
  if (!(objectButton instanceof HTMLElement)) {
    return null;
  }

  const objectId = objectButton.dataset.canvasObjectId;
  return typeof objectId === "string" ? getCanvasObjectById(objectId) : null;
}

function normalizeDonorDropIntent(intent) {
  if (!intent || (intent.mode !== "create" && intent.mode !== "replace")) {
    return null;
  }

  return {
    mode: intent.mode,
    objectId: typeof intent.objectId === "string" ? intent.objectId : null,
    objectLabel: typeof intent.objectLabel === "string" ? intent.objectLabel : null,
    layerId: typeof intent.layerId === "string" ? intent.layerId : null,
    layerLabel: typeof intent.layerLabel === "string" ? intent.layerLabel : null
  };
}

function isSameDonorDropIntent(left, right) {
  const normalizedLeft = normalizeDonorDropIntent(left);
  const normalizedRight = normalizeDonorDropIntent(right);
  if (!normalizedLeft && !normalizedRight) {
    return true;
  }

  if (!normalizedLeft || !normalizedRight) {
    return false;
  }

  return normalizedLeft.mode === normalizedRight.mode
    && normalizedLeft.objectId === normalizedRight.objectId
    && normalizedLeft.objectLabel === normalizedRight.objectLabel
    && normalizedLeft.layerId === normalizedRight.layerId
    && normalizedLeft.layerLabel === normalizedRight.layerLabel;
}

function resolveDonorDropIntent(target, fallbackIntent = null) {
  const hoveredObject = getCanvasObjectFromTarget(target);
  if (hoveredObject && isObjectEditable(hoveredObject)) {
    const layer = getLayerById(hoveredObject.layerId);
    return {
      mode: "replace",
      objectId: hoveredObject.id,
      objectLabel: hoveredObject.displayName,
      layerId: hoveredObject.layerId,
      layerLabel: layer?.displayName ?? hoveredObject.layerId
    };
  }

  const normalizedFallback = normalizeDonorDropIntent(fallbackIntent);
  if (normalizedFallback?.mode === "replace") {
    return normalizedFallback;
  }

  return {
    mode: "create",
    objectId: null,
    objectLabel: null,
    layerId: getDonorImportTargetLayerId(),
    layerLabel: getDonorImportTargetLayerLabel()
  };
}

function setDonorDropIntent(intent) {
  const normalizedIntent = normalizeDonorDropIntent(intent);
  if (isSameDonorDropIntent(state.donorAssetUi?.dropIntent ?? null, normalizedIntent)) {
    return;
  }

  state.donorAssetUi.dropIntent = normalizedIntent;
  renderAll();
}

function clearDonorDropIntent(viewport = null) {
  const hadIntent = Boolean(state.donorAssetUi?.dropIntent);
  state.donorAssetUi.dropIntent = null;

  const dropZone = viewport instanceof HTMLElement ? viewport : getCanvasViewportElement();
  if (dropZone instanceof HTMLElement) {
    dropZone.classList.remove("is-donor-drop-target");
  }

  if (hadIntent) {
    renderAll();
  }
}

function setSelectedObjectIds(objectIds, primaryObjectId = null) {
  const normalizedIds = uniqueStrings(Array.isArray(objectIds) ? objectIds : []);
  const nextIds = normalizedIds.filter((objectId) => Boolean(getCanvasObjectById(objectId)));
  const fallbackPrimaryId = nextIds[0] ?? null;
  const resolvedPrimaryId = typeof primaryObjectId === "string" && nextIds.includes(primaryObjectId)
    ? primaryObjectId
    : fallbackPrimaryId;

  state.selectedObjectId = resolvedPrimaryId;
  state.selectedObjectIds = resolvedPrimaryId
    ? [resolvedPrimaryId, ...nextIds.filter((objectId) => objectId !== resolvedPrimaryId)]
    : [];
}

function clearSelectedObjects() {
  state.selectedObjectId = null;
  state.selectedObjectIds = [];
}

function setSelectedObject(objectId, options = {}) {
  if (typeof objectId !== "string" || objectId.length === 0) {
    clearSelectedObjects();
    return;
  }

  const additive = Boolean(options.additive);
  const toggle = Boolean(options.toggle);
  if (!additive && !toggle) {
    setSelectedObjectIds([objectId], objectId);
    return;
  }

  const currentIds = getSelectedObjectIds();
  if (toggle && currentIds.includes(objectId)) {
    const nextIds = currentIds.filter((entry) => entry !== objectId);
    setSelectedObjectIds(nextIds, nextIds[nextIds.length - 1] ?? null);
    return;
  }

  setSelectedObjectIds([...currentIds, objectId], objectId);
}

function getCanvasMarqueeRect(marquee = state.canvasMarquee) {
  if (!marquee?.startScenePoint || !marquee?.currentScenePoint) {
    return null;
  }

  const left = Math.min(marquee.startScenePoint.x, marquee.currentScenePoint.x);
  const top = Math.min(marquee.startScenePoint.y, marquee.currentScenePoint.y);
  const right = Math.max(marquee.startScenePoint.x, marquee.currentScenePoint.x);
  const bottom = Math.max(marquee.startScenePoint.y, marquee.currentScenePoint.y);

  return {
    left: Math.round(left),
    top: Math.round(top),
    width: Math.max(0, Math.round(right - left)),
    height: Math.max(0, Math.round(bottom - top)),
    right: Math.round(right),
    bottom: Math.round(bottom)
  };
}

function getCanvasMarqueeClientRect(marquee = state.canvasMarquee) {
  if (!marquee?.startClientPoint || !marquee?.currentClientPoint) {
    return null;
  }

  const left = Math.min(marquee.startClientPoint.x, marquee.currentClientPoint.x);
  const top = Math.min(marquee.startClientPoint.y, marquee.currentClientPoint.y);
  const right = Math.max(marquee.startClientPoint.x, marquee.currentClientPoint.x);
  const bottom = Math.max(marquee.startClientPoint.y, marquee.currentClientPoint.y);

  return {
    left,
    top,
    width: Math.max(0, right - left),
    height: Math.max(0, bottom - top),
    right,
    bottom
  };
}

function getCanvasSelectableObjects() {
  if (!state.editorData || !Array.isArray(state.editorData.objects)) {
    return [];
  }

  const renderableLayerIds = new Set(getRenderableLayerIds(state.editorData));
  return state.editorData.objects.filter((object) => renderableLayerIds.has(object.layerId) && isObjectEditable(object));
}

function doesObjectIntersectMarquee(object, marqueeRect) {
  if (!object || !marqueeRect) {
    return false;
  }

  const extent = getObjectExtent(object);
  const left = Number.isFinite(object.x) ? object.x : 0;
  const top = Number.isFinite(object.y) ? object.y : 0;
  const right = left + extent.width;
  const bottom = top + extent.height;

  return !(
    right < marqueeRect.left
    || left > marqueeRect.right
    || bottom < marqueeRect.top
    || top > marqueeRect.bottom
  );
}

function doesCanvasObjectElementIntersectMarquee(objectId, marqueeClientRect) {
  if (typeof objectId !== "string" || !marqueeClientRect) {
    return false;
  }

  const element = getCanvasObjectElementById(objectId);
  if (!(element instanceof HTMLElement)) {
    return false;
  }

  const rect = element.getBoundingClientRect();
  return !(
    rect.right < marqueeClientRect.left
    || rect.left > marqueeClientRect.right
    || rect.bottom < marqueeClientRect.top
    || rect.top > marqueeClientRect.bottom
  );
}

function beginCanvasMarquee(event) {
  const scenePoint = getScenePointFromEvent(event);
  state.canvasMarquee = {
    pointerId: event.pointerId,
    startScenePoint: scenePoint,
    currentScenePoint: scenePoint,
    startClientPoint: {
      x: event.clientX,
      y: event.clientY
    },
    currentClientPoint: {
      x: event.clientX,
      y: event.clientY
    },
    additive: Boolean(event.shiftKey || event.metaKey || event.ctrlKey),
    startSelectedObjectIds: getSelectedObjectIds(),
    moved: false
  };

  if (typeof elements.editorCanvas?.setPointerCapture === "function") {
    try {
      elements.editorCanvas.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture is best-effort only.
    }
  }

  setPreviewStatus(state.canvasMarquee.additive
    ? "Drag a marquee box to add visible editable objects to the current selection."
    : "Drag a marquee box to select visible editable objects on the canvas.");
  renderAll();
}

function updateCanvasMarquee(event) {
  if (!state.canvasMarquee || event.pointerId !== state.canvasMarquee.pointerId) {
    return false;
  }

  state.canvasMarquee.currentScenePoint = getScenePointFromEvent(event);
  state.canvasMarquee.currentClientPoint = {
    x: event.clientX,
    y: event.clientY
  };
  const marqueeRect = getCanvasMarqueeRect();
  const movedDistanceX = Math.abs(state.canvasMarquee.currentScenePoint.x - state.canvasMarquee.startScenePoint.x);
  const movedDistanceY = Math.abs(state.canvasMarquee.currentScenePoint.y - state.canvasMarquee.startScenePoint.y);
  state.canvasMarquee.moved = state.canvasMarquee.moved || movedDistanceX > 6 || movedDistanceY > 6;

  if (marqueeRect && state.canvasMarquee.moved) {
    const intersectedIds = getCanvasSelectableObjects()
      .filter((object) => {
        return doesObjectIntersectMarquee(object, marqueeRect);
      })
      .map((object) => object.id);
    const nextIds = state.canvasMarquee.additive
      ? uniqueStrings([...state.canvasMarquee.startSelectedObjectIds, ...intersectedIds])
      : intersectedIds;
    setSelectedObjectIds(nextIds, intersectedIds[intersectedIds.length - 1] ?? nextIds[nextIds.length - 1] ?? null);
  }

  renderAll();
  return true;
}

function endCanvasMarquee(event) {
  if (!state.canvasMarquee || (event?.pointerId !== undefined && event.pointerId !== state.canvasMarquee.pointerId)) {
    return false;
  }

  try {
    if (typeof elements.editorCanvas?.releasePointerCapture === "function") {
      elements.editorCanvas.releasePointerCapture(state.canvasMarquee.pointerId);
    }
  } catch {
    // Pointer capture release is best-effort only.
  }

  const marquee = state.canvasMarquee;
  state.canvasMarquee = null;

  if (!marquee.moved) {
    if (!marquee.additive) {
      clearSelectedObjects();
      renderAll();
      setPreviewStatus("Canvas selection cleared.");
    }
    return true;
  }

  renderAll();
  const selectedCount = getSelectedObjectIds().length;
  setPreviewStatus(selectedCount > 0
    ? `Selected ${selectedCount} object${selectedCount === 1 ? "" : "s"} with the canvas marquee.`
    : "No editable objects intersected the marquee selection.");
  return true;
}

function getViewportTools() {
  const tools = getEditorStateTools();
  return {
    DEFAULT_VIEW_ZOOM: Number.isFinite(tools.DEFAULT_VIEW_ZOOM) ? tools.DEFAULT_VIEW_ZOOM : 1,
    MIN_VIEW_ZOOM: Number.isFinite(tools.MIN_VIEW_ZOOM) ? tools.MIN_VIEW_ZOOM : 0.25,
    MAX_VIEW_ZOOM: Number.isFinite(tools.MAX_VIEW_ZOOM) ? tools.MAX_VIEW_ZOOM : 4,
    sanitizeViewportState: typeof tools.sanitizeViewportState === "function"
      ? tools.sanitizeViewportState
      : (viewportState) => ({
          zoom: Number.isFinite(viewportState?.zoom) ? viewportState.zoom : 1,
          panX: Number.isFinite(viewportState?.panX) ? viewportState.panX : 0,
          panY: Number.isFinite(viewportState?.panY) ? viewportState.panY : 0
        }),
    clampViewportState: typeof tools.clampViewportState === "function"
      ? tools.clampViewportState
      : (viewportState) => viewportState,
    screenToWorldPoint: typeof tools.screenToWorldPoint === "function"
      ? tools.screenToWorldPoint
      : (screenPoint, viewportState) => {
          const zoom = Number.isFinite(viewportState?.zoom) ? viewportState.zoom : 1;
          const panX = Number.isFinite(viewportState?.panX) ? viewportState.panX : 0;
          const panY = Number.isFinite(viewportState?.panY) ? viewportState.panY : 0;
          return {
            x: (screenPoint.x - panX) / zoom,
            y: (screenPoint.y - panY) / zoom
          };
        },
    zoomViewportAtPoint: typeof tools.zoomViewportAtPoint === "function"
      ? tools.zoomViewportAtPoint
      : null,
    panViewportByDelta: typeof tools.panViewportByDelta === "function"
      ? tools.panViewportByDelta
      : null,
    fitViewportToScene: typeof tools.fitViewportToScene === "function"
      ? tools.fitViewportToScene
      : null,
    sanitizeViewZoom: typeof tools.sanitizeViewZoom === "function"
      ? tools.sanitizeViewZoom
      : (value, fallback = 1) => Number.isFinite(value) ? value : fallback
  };
}

function resetViewportSessionState() {
  const tools = getViewportTools();
  state.viewport = {
    zoom: tools.DEFAULT_VIEW_ZOOM,
    panX: 0,
    panY: 0,
    panDrag: null,
    spacePressed: false,
    suppressNextClick: false
  };
}

function clearViewportInteractionState() {
  state.viewport.panDrag = null;
  state.viewport.spacePressed = false;
  state.canvasMarquee = null;
}

function getViewportSceneSize() {
  const viewport = getSceneViewport();
  return {
    width: viewport.width,
    height: viewport.height
  };
}

function getCanvasViewportSize() {
  const sceneSize = getViewportSceneSize();
  const viewport = getCanvasViewportElement();
  const rect = viewport?.getBoundingClientRect();

  return {
    width: rect?.width && rect.width > 0 ? rect.width : sceneSize.width,
    height: rect?.height && rect.height > 0 ? rect.height : sceneSize.height
  };
}

function applyViewportState(nextViewportState, options = {}) {
  const tools = getViewportTools();
  const clamped = tools.clampViewportState(
    tools.sanitizeViewportState(nextViewportState),
    getCanvasViewportSize(),
    getViewportSceneSize()
  );
  state.viewport.zoom = clamped.zoom;
  state.viewport.panX = clamped.panX;
  state.viewport.panY = clamped.panY;

  if (options.render !== false) {
    renderAll();
  }

  return clamped;
}

function getViewportState() {
  return applyViewportState(state.viewport, { render: false });
}

function getViewportZoomPercent() {
  return Math.round(getViewportState().zoom * 100);
}

function isViewportTransformed() {
  const view = getViewportState();
  return Math.abs(view.zoom - 1) > 0.001 || Math.abs(view.panX) > 0.001 || Math.abs(view.panY) > 0.001;
}

function consumeViewportSuppressedClick() {
  if (!state.viewport.suppressNextClick) {
    return false;
  }

  state.viewport.suppressNextClick = false;
  return true;
}

function getScenePointFromEvent(event) {
  const viewportElement = getCanvasViewportElement();
  if (!viewportElement) {
    return { x: 0, y: 0 };
  }

  const rect = viewportElement.getBoundingClientRect();
  const sceneSize = getSceneViewport();
  const scaleX = rect.width > 0 ? sceneSize.width / rect.width : 1;
  const scaleY = rect.height > 0 ? sceneSize.height / rect.height : 1;
  const tools = getViewportTools();
  const screenPoint = {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY
  };

  return tools.screenToWorldPoint(screenPoint, getViewportState());
}

function getViewportZoomTarget(direction) {
  const current = getViewportState().zoom;
  const factor = direction === "in" ? 1.2 : 1 / 1.2;
  return current * factor;
}

function handleViewportZoom(direction) {
  if (!state.editorData || state.canvasDrag || state.viewport.panDrag) {
    return;
  }

  const tools = getViewportTools();
  const viewportSize = getCanvasViewportSize();
  const sceneSize = getViewportSceneSize();
  const anchor = {
    x: viewportSize.width / 2,
    y: viewportSize.height / 2
  };
  const nextZoom = getViewportZoomTarget(direction);
  const nextState = tools.zoomViewportAtPoint
    ? tools.zoomViewportAtPoint(getViewportState(), {
        zoom: nextZoom,
        anchor,
        viewportSize,
        sceneSize
      })
    : {
        ...getViewportState(),
        zoom: tools.sanitizeViewZoom(nextZoom, getViewportState().zoom)
      };
  const applied = applyViewportState(nextState);
  pushLog(`Viewport ${direction === "in" ? "zoomed in" : "zoomed out"} to ${Math.round(applied.zoom * 100)}%.`);
  setPreviewStatus(`Viewport ${direction === "in" ? "zoomed in" : "zoomed out"} to ${Math.round(applied.zoom * 100)}%. View state is session-only.`);
}

function fitViewportToScene(options = {}) {
  if (!state.editorData) {
    return getViewportState();
  }

  const tools = getViewportTools();
  const viewportSize = getCanvasViewportSize();
  const sceneSize = getViewportSceneSize();
  const nextState = tools.fitViewportToScene
    ? tools.fitViewportToScene(viewportSize, sceneSize, 48)
    : {
        zoom: tools.DEFAULT_VIEW_ZOOM,
        panX: 0,
        panY: 0
      };
  return applyViewportState(nextState, options);
}

function handleFitViewport() {
  if (!state.editorData || state.canvasDrag || state.viewport.panDrag) {
    return;
  }

  const applied = fitViewportToScene();
  pushLog(`Viewport fit scene at ${Math.round(applied.zoom * 100)}%.`);
  setPreviewStatus(`Viewport fit the full scene at ${Math.round(applied.zoom * 100)}%. View state is session-only.`);
}

function handleResetViewport() {
  if (!state.editorData || state.canvasDrag || state.viewport.panDrag) {
    return;
  }

  const tools = getViewportTools();
  const applied = applyViewportState({
    zoom: tools.DEFAULT_VIEW_ZOOM,
    panX: 0,
    panY: 0
  });
  pushLog(`Viewport reset to ${Math.round(applied.zoom * 100)}% at the default origin.`);
  setPreviewStatus("Viewport reset to 100% at the default origin. View state is session-only.");
}

function beginViewportPan(event) {
  if (!state.editorData || state.canvasDrag || state.viewport.panDrag) {
    return false;
  }

  const current = getViewportState();
  state.viewport.panDrag = {
    pointerId: event.pointerId,
    startClientX: event.clientX,
    startClientY: event.clientY,
    startPanX: current.panX,
    startPanY: current.panY,
    moved: false
  };

  if (typeof elements.editorCanvas?.setPointerCapture === "function") {
    try {
      elements.editorCanvas.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture is best-effort only.
    }
  }

  setPreviewStatus("Panning viewport. Release to keep the session-only view.");
  renderAll();
  return true;
}

function updateViewportPan(event) {
  if (!state.viewport.panDrag || event.pointerId !== state.viewport.panDrag.pointerId) {
    return false;
  }

  const tools = getViewportTools();
  const viewportSize = getCanvasViewportSize();
  const sceneSize = getViewportSceneSize();
  const delta = {
    x: event.clientX - state.viewport.panDrag.startClientX,
    y: event.clientY - state.viewport.panDrag.startClientY
  };
  const nextState = tools.panViewportByDelta
    ? tools.panViewportByDelta(
        {
          zoom: getViewportState().zoom,
          panX: state.viewport.panDrag.startPanX,
          panY: state.viewport.panDrag.startPanY
        },
        {
          delta,
          viewportSize,
          sceneSize
        }
      )
    : {
        ...getViewportState(),
        panX: state.viewport.panDrag.startPanX + delta.x,
        panY: state.viewport.panDrag.startPanY + delta.y
      };

  if (Math.abs(delta.x) > 0 || Math.abs(delta.y) > 0) {
    state.viewport.panDrag.moved = true;
  }

  applyViewportState(nextState);
  return true;
}

function endViewportPan(event) {
  if (!state.viewport.panDrag || (event?.pointerId !== undefined && event.pointerId !== state.viewport.panDrag.pointerId)) {
    return false;
  }

  try {
    if (typeof elements.editorCanvas?.releasePointerCapture === "function") {
      elements.editorCanvas.releasePointerCapture(state.viewport.panDrag.pointerId);
    }
  } catch {
    // Pointer capture release is best-effort only.
  }

  const moved = state.viewport.panDrag.moved;
  state.viewport.panDrag = null;
  state.viewport.suppressNextClick = moved;
  renderAll();

  if (moved) {
    const view = getViewportState();
    pushLog(`Viewport panned to (${Math.round(view.panX)}, ${Math.round(view.panY)}) at ${Math.round(view.zoom * 100)}%.`);
    setPreviewStatus(`Viewport pan updated. Current zoom ${Math.round(view.zoom * 100)}%. View state is session-only.`);
  }

  return true;
}

function beginCanvasDrag(object, event) {
  if (!object || !isObjectEditable(object)) {
    return false;
  }
  const scenePoint = getScenePointFromEvent(event);
  const dragObjectIds = isObjectSelected(object.id)
    ? getSelectedObjectIds().filter((objectId) => {
        const selectedObject = getCanvasObjectById(objectId);
        return Boolean(selectedObject && isObjectEditable(selectedObject));
      })
    : [object.id];
  const startPositions = Object.fromEntries(dragObjectIds.map((objectId) => {
    const selectedObject = getCanvasObjectById(objectId);
    return [
      objectId,
      {
        x: Number.isFinite(selectedObject?.x) ? selectedObject.x : 0,
        y: Number.isFinite(selectedObject?.y) ? selectedObject.y : 0
      }
    ];
  }));

  state.canvasDrag = {
    objectId: object.id,
    objectIds: dragObjectIds,
    pointerId: event.pointerId,
    startScenePoint: scenePoint,
    startPositions,
    beforeSnapshot: clone(state.editorData),
    moved: false
  };

  if (typeof elements.editorCanvas?.setPointerCapture === "function") {
    try {
      elements.editorCanvas.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture is best-effort only.
    }
  }

  pushLog(dragObjectIds.length > 1
    ? `Dragging ${dragObjectIds.length} selected objects together.`
    : `Dragging ${object.displayName}. Use arrows or pointer movement to reposition it.`);
  setPreviewStatus(dragObjectIds.length > 1
    ? `Dragging ${dragObjectIds.length} selected objects together. Release to keep the new composition.`
    : `Dragging ${object.displayName}. Release to keep the new position.`);
  return true;
}

function beginCanvasResize(object, event) {
  if (!object || !isObjectSizeEditable(object) || !getDonorAssetForObject(object)) {
    return false;
  }

  const scenePoint = getScenePointFromEvent(event);
  state.canvasResize = {
    objectId: object.id,
    pointerId: event.pointerId,
    startScenePoint: scenePoint,
    beforeSnapshot: clone(state.editorData),
    startWidth: Number.isFinite(object.width) ? object.width : getObjectDimensions(object).width,
    startHeight: Number.isFinite(object.height) ? object.height : getObjectDimensions(object).height,
    moved: false
  };

  if (typeof elements.editorCanvas?.setPointerCapture === "function") {
    try {
      elements.editorCanvas.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture is best-effort only.
    }
  }

  pushLog(`Resizing ${object.displayName}.`);
  setPreviewStatus(`Resizing ${object.displayName}. Release to keep the new donor-backed image size.`);
  return true;
}

function updateCanvasResize(event) {
  if (!state.canvasResize || event.pointerId !== state.canvasResize.pointerId || !state.editorData) {
    return false;
  }

  const object = getCanvasObjectById(state.canvasResize.objectId);
  if (!object || !isObjectSizeEditable(object) || !getDonorAssetForObject(object)) {
    return false;
  }

  const tools = getEditorStateTools();
  const scenePoint = getScenePointFromEvent(event);
  const deltaX = scenePoint.x - state.canvasResize.startScenePoint.x;
  const deltaY = scenePoint.y - state.canvasResize.startScenePoint.y;
  const viewport = getSceneViewport();
  const maxWidth = Math.max(8, viewport.width - object.x);
  const maxHeight = Math.max(8, viewport.height - object.y);
  let nextWidth = state.canvasResize.startWidth + deltaX;
  let nextHeight = state.canvasResize.startHeight + deltaY;

  if (isSnapEnabled()) {
    const snapSize = getSnapSize();
    nextWidth = Math.round(nextWidth / snapSize) * snapSize;
    nextHeight = Math.round(nextHeight / snapSize) * snapSize;
  }

  const sanitizeDimension = typeof tools.sanitizeObjectDimension === "function"
    ? tools.sanitizeObjectDimension
    : (value, fallback) => Math.max(8, Math.round(Number.isFinite(value) ? value : fallback ?? 8));
  const boundedWidth = Math.min(maxWidth, sanitizeDimension(nextWidth, state.canvasResize.startWidth));
  const boundedHeight = Math.min(maxHeight, sanitizeDimension(nextHeight, state.canvasResize.startHeight));

  if (boundedWidth === object.width && boundedHeight === object.height) {
    return true;
  }

  object.width = boundedWidth;
  object.height = boundedHeight;
  state.canvasResize.moved = true;
  syncDirtyState();
  renderAll();
  return true;
}

function endCanvasResize(event) {
  if (!state.canvasResize || (event?.pointerId !== undefined && event.pointerId !== state.canvasResize.pointerId)) {
    return false;
  }

  const object = getCanvasObjectById(state.canvasResize.objectId);
  const beforeSnapshot = state.canvasResize.beforeSnapshot;
  const moved = Boolean(state.canvasResize.moved);

  try {
    if (typeof elements.editorCanvas?.releasePointerCapture === "function") {
      elements.editorCanvas.releasePointerCapture(state.canvasResize.pointerId);
    }
  } catch {
    // Pointer capture release is best-effort only.
  }

  state.canvasResize = null;

  if (object && moved) {
    recordUndoSnapshot(beforeSnapshot, `Resized ${object.displayName}`);
    pushLog(`Committed ${object.displayName} size at ${object.width}×${object.height}.`);
    setPreviewStatus(`Canvas resize completed for ${object.displayName}. Save to persist the new size.`);
    renderAll();
  }

  return true;
}

function applyObjectPosition(object, x, y, sourceLabel) {
  const bounded = normalizeObjectPosition(object, x, y);
  applyEditorMutation(`${sourceLabel ?? "Moved"} ${object.displayName} to ${bounded.x}, ${bounded.y}.`, (editorData) => {
    const editableObject = editorData.objects.find((entry) => entry.id === object.id);
    if (!editableObject) {
      return;
    }

    editableObject.x = bounded.x;
    editableObject.y = bounded.y;
  });
  setPreviewStatus(`Moved ${object.displayName} to ${bounded.x}, ${bounded.y}. Save to persist the change.`);
}

function nudgeSelectedObject(deltaX, deltaY, sourceLabel) {
  const selectedObjects = getSelectedObjects().filter((object) => isObjectEditable(object));
  if (selectedObjects.length === 0) {
    return false;
  }

  if (selectedObjects.length === 1) {
    const selectedObject = selectedObjects[0];
    applyObjectPosition(selectedObject, selectedObject.x + deltaX, selectedObject.y + deltaY, sourceLabel);
    return true;
  }

  applyEditorMutation(`${sourceLabel ?? "Nudged"} ${selectedObjects.length} selected objects.`, (editorData) => {
    for (const selectedObject of selectedObjects) {
      const editableObject = editorData.objects.find((entry) => entry.id === selectedObject.id);
      if (!editableObject) {
        continue;
      }

      const bounded = normalizeObjectPosition(editableObject, editableObject.x + deltaX, editableObject.y + deltaY);
      editableObject.x = bounded.x;
      editableObject.y = bounded.y;
    }
  });
  setPreviewStatus(`Nudged ${selectedObjects.length} selected objects. Save to persist the composition change.`);
  return true;
}

function handleCanvasPointerDown(event) {
  if (!state.editorData) {
    return;
  }

  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  const objectButton = target.closest("[data-canvas-object-id]");
  const canvasStage = target.closest(".canvas-stage");
  const canvasViewport = target.closest(".canvas-viewport");
  const canvasSurface = canvasStage ?? canvasViewport;

  if (!canvasViewport) {
    return;
  }

  const viewportPanGesture = event.button === 1 || (event.button === 0 && state.viewport.spacePressed);
  if (viewportPanGesture) {
    beginViewportPan(event);
    event.preventDefault();
    return;
  }

  if (event.button !== 0 || !canvasSurface) {
    return;
  }

  if (objectButton instanceof HTMLElement) {
    const objectId = objectButton.dataset.canvasObjectId;
    const object = typeof objectId === "string" ? getCanvasObjectById(objectId) : null;
    const resizeHandle = target.closest("[data-canvas-resize-handle]");

    if (!object) {
      return;
    }

    if (isAdditiveSelectionEvent(event)) {
      setSelectedObject(object.id, {
        additive: true,
        toggle: true
      });
      renderAll();
      event.preventDefault();
      return;
    }

    if (!isObjectSelected(object.id)) {
      setSelectedObject(object.id);
    }
    renderAll();
    if (resizeHandle instanceof HTMLElement) {
      beginCanvasResize(object, event);
      event.preventDefault();
      return;
    }
    beginCanvasDrag(object, event);
    event.preventDefault();
    return;
  }

  beginCanvasMarquee(event);
  event.preventDefault();
}

function handleCanvasPointerMove(event) {
  if (updateViewportPan(event)) {
    return;
  }

  if (updateCanvasResize(event)) {
    return;
  }

  if (updateCanvasMarquee(event)) {
    return;
  }

  if (!state.canvasDrag || event.pointerId !== state.canvasDrag.pointerId || !state.editorData) {
    return;
  }

  const scenePoint = getScenePointFromEvent(event);
  const deltaX = scenePoint.x - state.canvasDrag.startScenePoint.x;
  const deltaY = scenePoint.y - state.canvasDrag.startScenePoint.y;
  let changed = false;

  for (const objectId of Array.isArray(state.canvasDrag.objectIds) ? state.canvasDrag.objectIds : [state.canvasDrag.objectId]) {
    const object = getCanvasObjectById(objectId);
    const startPosition = state.canvasDrag.startPositions?.[objectId];
    if (!object || !isObjectEditable(object) || !startPosition) {
      continue;
    }

    const bounded = normalizeObjectPosition(object, startPosition.x + deltaX, startPosition.y + deltaY);
    if (bounded.x === object.x && bounded.y === object.y) {
      continue;
    }

    object.x = bounded.x;
    object.y = bounded.y;
    changed = true;
  }

  if (!changed) {
    return;
  }

  state.canvasDrag.moved = true;
  syncDirtyState();
  renderAll();
}

function handleCanvasPointerUp(event) {
  if (endViewportPan(event)) {
    return;
  }

  if (endCanvasResize(event)) {
    return;
  }

  if (endCanvasMarquee(event)) {
    return;
  }

  if (!state.canvasDrag || (event?.pointerId !== undefined && event.pointerId !== state.canvasDrag.pointerId)) {
    return;
  }

  const object = getCanvasObjectById(state.canvasDrag.objectId);
  const beforeSnapshot = state.canvasDrag.beforeSnapshot;
  const moved = Boolean(state.canvasDrag.moved);
  const draggedObjectIds = Array.isArray(state.canvasDrag.objectIds) ? state.canvasDrag.objectIds : [];

  try {
    if (typeof elements.editorCanvas?.releasePointerCapture === "function") {
      elements.editorCanvas.releasePointerCapture(state.canvasDrag.pointerId);
    }
  } catch {
    // Pointer capture release is best-effort only.
  }

  state.canvasDrag = null;

  if (object && moved) {
    const draggedCount = draggedObjectIds.length > 0 ? draggedObjectIds.length : 1;
    recordUndoSnapshot(beforeSnapshot, draggedCount > 1 ? `Dragged ${draggedCount} objects` : `Dragged ${object.displayName}`);
    pushLog(draggedCount > 1
      ? `Committed ${draggedCount} selected objects after a grouped canvas drag.`
      : `Committed ${object.displayName} at ${object.x}, ${object.y}.`);
    setPreviewStatus(draggedCount > 1
      ? `Grouped canvas move completed for ${draggedCount} selected objects. Save to persist the composition change.`
      : `Canvas move completed for ${object.displayName}. Save to persist the change.`);
    renderAll();
  }
}

function handleCanvasKeyboard(event) {
  if (!state.editorData) {
    return;
  }

  const modifierPressed = event.metaKey || event.ctrlKey;

  if (event.code === "Space" && !isTypingTarget(event.target)) {
    state.viewport.spacePressed = true;
    event.preventDefault();
    return;
  }

  if (modifierPressed && event.key.toLowerCase() === "s") {
    event.preventDefault();
    void handleSaveEditor();
    return;
  }

  if (isTypingTarget(event.target)) {
    return;
  }

  if (modifierPressed && event.key.toLowerCase() === "z") {
    event.preventDefault();
    if (event.shiftKey) {
      handleRedo();
    } else {
      handleUndo();
    }
    return;
  }

  if (modifierPressed && event.key.toLowerCase() === "y") {
    event.preventDefault();
    handleRedo();
    return;
  }

  if (modifierPressed && event.key.toLowerCase() === "d") {
    event.preventDefault();
    handleDuplicateSelectedObject();
    return;
  }

  if (modifierPressed && (event.key === "=" || event.key === "+")) {
    event.preventDefault();
    handleViewportZoom("in");
    return;
  }

  if (modifierPressed && event.key === "-") {
    event.preventDefault();
    handleViewportZoom("out");
    return;
  }

  if (modifierPressed && event.key === "0") {
    event.preventDefault();
    handleResetViewport();
    return;
  }

  if (modifierPressed && event.code === "BracketLeft") {
    event.preventDefault();
    if (event.shiftKey) {
      handleSelectLayerSibling("previous");
    } else {
      handleOrderSelectedObject("send-backward");
    }
    return;
  }

  if (modifierPressed && event.code === "BracketRight") {
    event.preventDefault();
    if (event.shiftKey) {
      handleSelectLayerSibling("next");
    } else {
      handleOrderSelectedObject("bring-forward");
    }
    return;
  }

  if (modifierPressed && event.shiftKey && event.key.toLowerCase() === "g") {
    event.preventDefault();
    handleToggleSnap();
    return;
  }

  if (modifierPressed && event.shiftKey && event.key.toLowerCase() === "n") {
    event.preventDefault();
    handleCreateNewObject();
    return;
  }

  if (event.key === "Delete" || event.key === "Backspace") {
    event.preventDefault();
    handleDeleteSelectedObject();
    return;
  }

  const keyMap = {
    ArrowLeft: [-1, 0],
    ArrowRight: [1, 0],
    ArrowUp: [0, -1],
    ArrowDown: [0, 1]
  };

  const delta = keyMap[event.key];
  if (!delta) {
    return;
  }

  const selectedObject = getSelectedObject();
  if (!selectedObject || !isObjectEditable(selectedObject)) {
    return;
  }

  event.preventDefault();

  const baseStep = isSnapEnabled() ? getSnapSize() : 1;
  const step = event.shiftKey ? baseStep * 5 : baseStep;
  nudgeSelectedObject(delta[0] * step, delta[1] * step, event.shiftKey ? "Keyboard nudge (fast)" : "Keyboard nudge");
}

function handleCanvasKeyUp(event) {
  if (event.code === "Space") {
    state.viewport.spacePressed = false;
  }
}

async function reloadWorkspace(isInitialLoad, requestedProjectId = null) {
  if (!window.myideApi || typeof window.myideApi.loadProjectSlice !== "function") {
    setBridgeState({
      tone: "error",
      heading: "Desktop bridge unavailable",
      message: "window.myideApi.loadProjectSlice is not available in this renderer session.",
      details: ["The preload bridge object is missing or incomplete."]
    });
    throw new Error("MyIDE desktop bridge is unavailable.");
  }

  try {
    state.bundle = await window.myideApi.loadProjectSlice(requestedProjectId ?? state.selectedProjectId ?? undefined);
  } catch (error) {
    await refreshBridgeProjectStatus(error instanceof Error ? error.message : "Desktop project load failed.");
    throw error;
  }

  state.selectedProjectId = state.bundle.selectedProjectId;
  state.editorData = state.bundle.editableProject ? clone(state.bundle.editableProject) : null;
  state.selectedObjectIds = [];
  state.canvasDrag = null;
  state.canvasResize = null;
  state.canvasMarquee = null;
  state.evidenceUi = {
    selectedObjectOnly: false,
    highlightedEvidenceId: null
  };
  state.donorAssetUi = {
    searchQuery: "",
    fileTypeFilter: "all",
    assetGroupFilter: "all",
    highlightedAssetId: null,
    dragPayload: null,
    importTargetLayerId: "auto",
    dropIntent: null
  };
  state.runtimeUi = {
    launched: false,
    loading: false,
    ready: false,
    inspectEnabled: false,
    lastCommand: null,
    lastCommandStatus: null,
    lastError: null,
    currentUrl: null,
    pageTitle: null,
    diagnostics: null,
    resourceMap: state.bundle.runtimeResourceMap ?? null,
    overrideStatus: state.bundle.runtimeOverrides ?? null,
    controlSupport: {
      pause: false,
      resume: false,
      step: false
    },
    controlBlockers: {
      pause: null,
      resume: null,
      step: null,
      spin: "Spin is only an observed Space-key behavior so far; no stable runtime action contract is captured yet.",
      enter: "The live donor runtime still relies on a best-effort real input event to advance the intro."
    },
    lastPick: null,
    lastConsoleEvents: []
  };
  resetViewportSessionState();
  resetLayerIsolation();
  resetSceneSectionIsolation();
  resetEditorHistory();
  state.workbenchMode = getRuntimeLaunchInfo()?.entryUrl ? "runtime" : "scene";
  const investigation = state.bundle?.investigation ?? null;
  const shouldDefaultToInvestigation = investigation?.modificationReadiness === "investigation-only";
  state.workflowUi = {
    activePanel: shouldDefaultToInvestigation
      ? "investigation"
      : state.workbenchMode === "runtime"
        ? "runtime"
        : "compose"
  };
  state.modificationTaskUi = {
    activeTaskId: null,
    pageRuntimeProofs: buildProjectModificationTaskPageRuntimeProofMap(state.bundle?.runtimePageProofs)
  };
  reconcileSelectedObject();
  ensureSyncStatusForSelectedProject();

  if (isInitialLoad) {
    pushLog(`Opened ${state.selectedProjectId}.`);
  } else {
    pushLog(`Reloaded ${state.selectedProjectId} from disk.`);
  }

  await refreshBridgeProjectStatus(`Desktop bridge healthy. Loaded ${state.selectedProjectId} through the Electron preload bridge.`);
  renderAll();

  if (!state.editorData) {
    setPreviewStatus(`No editable scene slice is available yet for ${state.selectedProjectId}.`);
    return;
  }

  if (state.workbenchMode === "runtime" && getRuntimeLaunchInfo()?.entryUrl) {
    setPreviewStatus(isInitialLoad
      ? `Loaded ${state.selectedProjectId}. Runtime Mode is ready to launch the recorded donor runtime inside the shell.`
      : `Reloaded ${state.selectedProjectId}. Runtime Mode is ready to relaunch the recorded donor runtime.`);
    return;
  }

  setPreviewStatus(isInitialLoad
    ? `Loaded ${state.selectedProjectId} editable compose scene from internal files.`
    : `Reloaded ${state.selectedProjectId} editable compose scene from disk.`);
}

async function handleCreateProject(event) {
  event?.preventDefault?.();

  if (!window.myideApi || typeof window.myideApi.createProject !== "function") {
    setCreateProjectStatus("Shell bridge could not create the project scaffold in this environment.", true);
    return;
  }

  const displayName = elements.fieldDisplayName?.value?.trim() ?? "";
  const slug = slugifyValue(elements.fieldSlug?.value || displayName);
  const gameFamily = elements.fieldGameFamily?.value ?? "slot";
  const donorReference = elements.fieldDonorReference?.value?.trim() ?? "";
  const donorLaunchUrl = elements.fieldDonorLaunchUrl?.value?.trim() ?? "";
  const harvestDonorAssets = Boolean(donorLaunchUrl);
  const targetDisplayName = elements.fieldTargetDisplayName?.value?.trim() ?? "";
  const notes = elements.fieldNotes?.value?.trim() ?? "";

  if (!displayName || !slug || !donorReference || !targetDisplayName) {
    setCreateProjectStatus("Display name, slug, donor reference, and target display name are required.", true);
    return;
  }

  if (donorLaunchUrl) {
    try {
      new URL(donorLaunchUrl);
    } catch {
      setCreateProjectStatus("Donor launch URL must be a valid absolute URL when provided.", true);
      return;
    }
  }

  setCreateProjectStatus(donorLaunchUrl
    ? `Creating ${displayName}, scaffolding donor pack ${donorReference}, capturing the donor launch page, harvesting bounded recursive donor assets, and mapping a first donor package graph ...`
    : `Creating ${displayName} under 40_projects/${slug} and scaffolding donor pack ${donorReference} ...`);

  try {
    const created = await window.myideApi.createProject({
      displayName,
      slug,
      gameFamily,
      donorReference,
      donorLaunchUrl,
      harvestDonorAssets,
      targetDisplayName,
      notes
    });

    if (elements.newProjectForm instanceof HTMLFormElement) {
      elements.newProjectForm.reset();
    }
    if (elements.fieldSlug instanceof HTMLInputElement) {
      elements.fieldSlug.dataset.userEdited = "false";
    }

    await reloadWorkspace(false, created.projectId);
    pushLog(`Created project scaffold ${created.projectId} at ${created.projectRoot}.`);
    const donorIntake = created.donorIntake;
    const donorIntakeSummary = donorIntake?.status === "captured"
      ? ` Donor intake captured ${donorIntake.discoveredUrlCount} bounded donor URLs into ${donorIntake.donorRoot.replace(/^.*10_donors\//, "10_donors/")}.${typeof donorIntake.harvestedAssetCount === "number" ? ` Harvested ${donorIntake.harvestedAssetCount} bounded static assets${typeof donorIntake.failedAssetCount === "number" ? ` with ${donorIntake.failedAssetCount} failures` : ""}.` : ""}${typeof donorIntake.packageFamilyCount === "number" ? ` Packaged ${donorIntake.packageFamilyCount} bounded asset families across ${donorIntake.packageReferencedUrlCount ?? 0} referenced URLs.` : ""}${typeof donorIntake.packageGraphNodeCount === "number" ? ` Mapped a donor package graph with ${donorIntake.packageGraphNodeCount} nodes, ${donorIntake.packageGraphEdgeCount ?? 0} edges, and ${donorIntake.packageUnresolvedCount ?? 0} unresolved entries.` : ""}`
      : donorIntake?.status === "blocked"
        ? ` Donor intake was blocked: ${donorIntake.error ?? "unknown error"}.`
        : donorLaunchUrl
          ? " Donor intake was skipped unexpectedly."
          : " Donor pack scaffolded with no launch URL yet.";
    setCreateProjectStatus(`Created ${created.displayName}. The project is now discoverable in the workspace browser.${donorIntakeSummary}`);
    setPreviewStatus(`Created ${created.displayName}. Add internal scene files before editing starts.`);
  } catch (error) {
    setCreateProjectStatus(error instanceof Error ? error.message : "Project creation failed.", true);
  }
}

function handleInspectorEvent(event) {
  const target = event.target;
  if (!(target instanceof HTMLInputElement) && !(target instanceof HTMLTextAreaElement) && !(target instanceof HTMLSelectElement)) {
    return;
  }

  const selectedObject = getSelectedObject();
  if (!selectedObject || !isObjectEditable(selectedObject)) {
    return;
  }

  const field = target.name;
  let nextValue;

  if (field === "visible") {
    nextValue = target instanceof HTMLInputElement ? target.checked : false;
  } else if (field === "layerId") {
    nextValue = target.value;
  } else if (["x", "y", "scaleX", "scaleY", "width", "height"].includes(field)) {
    const numeric = Number(target.value);
    if (!Number.isFinite(numeric)) {
      return;
    }
    if ((field === "width" || field === "height")) {
      if (!isObjectSizeEditable(selectedObject)) {
        return;
      }

      const tools = getEditorStateTools();
      const currentValue = Number(selectedObject[field]);
      nextValue = typeof tools.sanitizeObjectDimension === "function"
        ? tools.sanitizeObjectDimension(numeric, Number.isFinite(currentValue) ? currentValue : undefined)
        : Math.max(8, Math.round(numeric));
    } else {
      nextValue = numeric;
    }
  } else {
    nextValue = target.value;
  }

  let sizeAlignedWithinViewport = false;
  const didChange = applyEditorMutation(
    field === "layerId"
      ? `Moved ${selectedObject.displayName} to a different layer.`
      : `Edited ${selectedObject.displayName} ${field}.`,
    (editorData) => {
      const editableObject = editorData.objects.find((entry) => entry.id === selectedObject.id);
      if (!editableObject) {
        return;
      }

      if (field === "layerId") {
        const tools = getEditorStateTools();
        const reassigned = typeof tools.reassignObjectLayer === "function"
          ? tools.reassignObjectLayer(editorData, selectedObject.id, nextValue)
          : null;
        if (!reassigned?.changed) {
          return;
        }
        return;
      }

      editableObject[field] = nextValue;
      if (field === "width" || field === "height") {
        const boundedPosition = clampObjectPosition(editableObject, editableObject.x, editableObject.y);
        if (boundedPosition.x !== editableObject.x || boundedPosition.y !== editableObject.y) {
          editableObject.x = boundedPosition.x;
          editableObject.y = boundedPosition.y;
          sizeAlignedWithinViewport = true;
        }
      }
    }
  );

  if (didChange) {
    if (field === "layerId") {
      const targetLayer = getLayerById(nextValue);
      const targetName = targetLayer?.displayName ?? nextValue;
      let isolationNote = "";
      if (isLayerIsolationActive() && getIsolatedLayerId() !== nextValue) {
        state.layerIsolation = {
          activeLayerId: nextValue,
          previousSelectedObjectId: selectedObject.id
        };
        isolationNote = " Solo view followed the selected object into the new layer.";
      }
      const visibilityNote = targetLayer?.visible === false ? " The target layer is currently hidden." : "";
      setPreviewStatus(`Moved ${selectedObject.displayName} to ${targetName}.${visibilityNote}${isolationNote} Save to persist the layer change.`);
    } else if (field === "width" || field === "height") {
      const alignmentNote = sizeAlignedWithinViewport ? " The object was kept within the viewport." : "";
      setPreviewStatus(`Edited ${selectedObject.displayName} size.${alignmentNote} Save to persist the change.`);
    } else {
      setPreviewStatus(`Edited ${selectedObject.displayName}. Save to persist the change.`);
    }
  }
}

function handleLayerAction(layerId, action) {
  const layer = getLayerById(layerId);
  if (!layer || !state.editorData) {
    return;
  }

  if (action === "toggle-isolate" || action === "clear-isolation") {
    if (state.canvasDrag) {
      setPreviewStatus("Finish the current drag before changing the solo layer view.");
      return;
    }

    if (action === "clear-isolation" || getIsolatedLayerId() === layerId) {
      const restoreSelectionId = state.layerIsolation.previousSelectedObjectId;
      resetLayerIsolation();
      reconcileSelectedObject(restoreSelectionId, state.selectedObjectId);
      pushLog(`Cleared solo view for ${layer.displayName}.`);
      renderAll();
      setPreviewStatus("Solo layer view cleared. Saved layer visibility rules are active again.");
      return;
    }

    state.layerIsolation = {
      activeLayerId: layerId,
      previousSelectedObjectId: state.selectedObjectId
    };
    if (isSceneSectionIsolationActive()) {
      resetSceneSectionIsolation();
    }

    if (getSelectedObject()?.layerId !== layerId) {
      setSelectedObject(getFirstSelectableObjectIdForLayer(layerId));
    }

    reconcileSelectedObject(state.selectedObjectId, state.layerIsolation.previousSelectedObjectId);
    pushLog(`Solo view enabled for ${layer.displayName}.`);
    renderAll();
    setPreviewStatus(`Solo view enabled for ${layer.displayName}. This is session-only and does not change saved layer visibility.`);
    return;
  }

  const actionLabels = {
    "toggle-visible": layer.visible ? `Hid layer ${layer.displayName}.` : `Showed layer ${layer.displayName}.`,
    "toggle-locked": layer.locked ? `Unlocked layer ${layer.displayName}.` : `Locked layer ${layer.displayName}.`
  };

  const didChange = applyEditorMutation(actionLabels[action] ?? `Updated layer ${layer.displayName}.`, (editorData) => {
    const editableLayer = editorData.layers.find((entry) => entry.id === layerId);
    if (!editableLayer) {
      return;
    }

    if (action === "toggle-visible") {
      editableLayer.visible = !editableLayer.visible;
    }

    if (action === "toggle-locked") {
      editableLayer.locked = !editableLayer.locked;
    }
  });

  if (didChange) {
    setPreviewStatus(`Updated ${layer.displayName}. Save to persist the layer change.`);
  }
}

function handleUndo() {
  if (!state.editorData) {
    return;
  }

  const result = getEditorStateTools().undo(state.history, state.editorData);
  if (!result) {
    setPreviewStatus("Nothing is available to undo.");
    return;
  }

  state.history = result.history;
  state.editorData = result.editorData;
  state.canvasDrag = null;
  reconcileSelectedObject();
  syncDirtyState();
  pushLog(`Undo: ${result.label}`);
  renderAll();
  setPreviewStatus(`Undo applied: ${result.label}`);
}

function handleRedo() {
  if (!state.editorData) {
    return;
  }

  const result = getEditorStateTools().redo(state.history, state.editorData);
  if (!result) {
    setPreviewStatus("Nothing is available to redo.");
    return;
  }

  state.history = result.history;
  state.editorData = result.editorData;
  state.canvasDrag = null;
  reconcileSelectedObject();
  syncDirtyState();
  pushLog(`Redo: ${result.label}`);
  renderAll();
  setPreviewStatus(`Redo applied: ${result.label}`);
}

async function handleSaveEditor() {
  const selectedProject = getSelectedProject();

  if (!selectedProject || !state.editorData) {
    setPreviewStatus("No editable scene data is available for the selected project.");
    return;
  }

  if (!window.myideApi || typeof window.myideApi.saveProjectEditor !== "function") {
    setPreviewStatus("Shell bridge could not save project editor data in this environment.");
    return;
  }

  if (!state.dirty) {
    setPreviewStatus("No scene changes are waiting to be saved.");
    return;
  }

  const selectedObjectId = state.selectedObjectId;

  try {
    const saveResult = await window.myideApi.saveProjectEditor(selectedProject.projectId, state.editorData);
    const replayPath = saveResult.replayProjectPath
      ? toRepoRelativePath(saveResult.replayProjectPath)
      : "40_projects/project_001/project.json";
    pushLog(`Saved ${selectedProject.projectId} and synced replay output to ${replayPath}.`);

    await reloadWorkspace(false, selectedProject.projectId);
    reconcileSelectedObject(selectedObjectId);
    setSyncStatus({
      projectId: selectedProject.projectId,
      status: "synced",
      replayPath,
      lastSyncedAt: saveResult.savedAt,
      syncBridge: saveResult.syncBridge ?? null,
      message: `Replay output synced to ${replayPath}.`
    });
    renderAll();
    state.dirty = false;

    const snapshotMessage = saveResult.snapshotDir ? ` Snapshot: ${toRepoRelativePath(saveResult.snapshotDir)}.` : "";
    const syncMessage = saveResult.replayProjectPath ? ` Replay sync: ${replayPath}.` : "";
    setPreviewStatus(`Saved ${selectedProject.displayName} at ${saveResult.savedAt}.${snapshotMessage}${syncMessage}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Project save failed.";
    setSyncStatus({
      projectId: selectedProject.projectId,
      status: "error",
      replayPath: toRepoRelativePath(getReplayTargetPath(selectedProject) ?? ""),
      message
    });
    renderAll();
    setPreviewStatus(message);
  }
}

function renderSyncStatus() {
  if (!elements.syncStatus) {
    return;
  }

  const selectedProject = getSelectedProject();
  if (!selectedProject || !state.editorData) {
    elements.syncStatus.innerHTML = `
      <div>
        <strong>Sync Status</strong>
        <p>No editable scene is loaded for the selected project.</p>
      </div>
    `;
    elements.syncStatus.dataset.tone = "idle";
    return;
  }

  const syncStatus = state.syncStatus ?? {};
  const replayPath = toRepoRelativePath(syncStatus.replayPath ?? getReplayTargetPath(selectedProject) ?? "");
  const lastSyncedAt = formatSyncTimestamp(syncStatus.lastSyncedAt);
  const message = syncStatus.message ?? "No save/sync has run in this session yet.";
  const bridge = syncStatus.syncBridge ? `Bridge ${syncStatus.syncBridge}` : "Waiting for next save";

  elements.syncStatus.dataset.tone = syncStatus.status ?? "idle";
  elements.syncStatus.innerHTML = `
    <div>
      <strong>Sync Status</strong>
      <p>${message}</p>
    </div>
    <div class="sync-status-meta">
      <span>Replay target <code>${replayPath || "not available"}</code></span>
      <span>Last sync ${lastSyncedAt}</span>
      <span>${bridge}</span>
    </div>
  `;
}

function renderBridgeStatus() {
  if (!elements.bridgeStatus) {
    return;
  }

  const bridge = state.bridge ?? {};
  const details = Array.isArray(bridge.details) ? bridge.details : [];
  const detailMarkup = details.length > 0
    ? `
      <div class="sync-status-meta">
        ${details.map((detail) => `<span>${formatBridgeDetail(detail)}</span>`).join("")}
      </div>
    `
    : "";

  elements.bridgeStatus.dataset.tone = bridge.tone ?? "warning";
  elements.bridgeStatus.innerHTML = `
    <div>
      <strong>${escapeHtml(bridge.heading ?? "Desktop bridge")}</strong>
      <p>${escapeHtml(bridge.message ?? "Bridge status is unavailable.")}</p>
    </div>
    ${detailMarkup}
  `;
}

function renderOnboardingCard() {
  if (!elements.onboardingCard) {
    return;
  }

  const selectedProject = getSelectedProject();
  const runtimeLaunch = getRuntimeLaunchInfo();
  const workflowPanel = getActiveWorkflowPanel();
  const workflowBridge = getRuntimeWorkflowBridge();
  const runtimeOverrideCandidate = getRuntimeOverrideCandidate();
  const workflowFocusSummary = {
    runtime: "Use Debug Host first for trustworthy runtime asset proof, then jump out to donor source or compose context from the same workbench.",
    donor: "Source donor assets, evidence cards, and grounded linked-object context stay together here.",
    compose: "Internal scene composition stays bounded here: select, replace, align, resize, save, reload.",
    vabs: "VABS stays visible as a read-only blocker and readiness module for this project.",
    project: "Project scaffolding and workspace refresh stay separate from the runtime/composer workflow."
  };
  const bridgeActions = [
    `<button type="button" class="copy-button" data-runtime-action="open-debug-host">Use Debug Host</button>`,
    workflowBridge.donorAsset
      ? `<button type="button" class="copy-button" data-focus-donor-asset-id="${escapeAttribute(workflowBridge.donorAsset.assetId)}">Focus Asset</button>`
      : "",
    workflowBridge.evidenceItem
      ? `<button type="button" class="copy-button" data-focus-donor-evidence-id="${escapeAttribute(workflowBridge.evidenceItem.evidenceId)}">Focus Evidence</button>`
      : "",
    workflowBridge.sceneObject
      ? `<button type="button" class="copy-button" data-focus-scene-object-id="${escapeAttribute(workflowBridge.sceneObject.id)}">Focus Scene Object</button>`
      : "",
    `<button type="button" class="copy-button" data-switch-workbench-mode="${escapeAttribute(state.workbenchMode === "runtime" ? "scene" : "runtime")}" data-switch-workflow-panel="${escapeAttribute(state.workbenchMode === "runtime" ? "compose" : "runtime")}" data-switch-status="${escapeAttribute(state.workbenchMode === "runtime" ? "Compose Mode is active. The workflow hub kept the current project context and source bridge." : "Runtime Mode is active again. The workflow hub kept the current project context and source bridge.")}">Switch To ${state.workbenchMode === "runtime" ? "Compose" : "Runtime"}</button>`
  ].filter(Boolean).join("");
  const quickSteps = state.workbenchMode === "runtime"
    ? [
      "Use Debug Host first to run the official runtime trace and override-proof cycle on the local mirror.",
      "From the workbench, jump straight into donor asset, donor evidence, or the related compose object.",
      "Use the embedded runtime only when you need secondary live context, then save/reload in Compose and re-open Debug Host when you want the strongest confirmation."
    ]
    : [
      "Drag or replace donor assets in Compose Mode as needed.",
      "Use marquee, align, distribute, and donor-backed resize on the current internal scene.",
      "Save, reload, then switch back to Runtime Mode when you want live donor context again."
    ];

  elements.onboardingCard.innerHTML = `
    <div class="tree-row scope-summary">
      <strong>Unified Runtime / Compose Flow</strong>
      <p>${escapeHtml(selectedProject?.displayName ?? "project_001")} now runs with <strong>${escapeHtml(getWorkbenchModeLabel())} Mode</strong> as the active workbench and <strong>${escapeHtml(getWorkflowPanelLabel(workflowPanel))}</strong> as the active side panel.</p>
      <p>${escapeHtml(workflowFocusSummary[workflowPanel] ?? workflowFocusSummary.runtime)}</p>
      <div class="chip-row">
        <span>${escapeHtml(getWorkbenchModeLabel())} mode active</span>
        <span>${escapeHtml(getWorkflowPanelLabel(workflowPanel))} panel active</span>
        <span>${runtimeLaunch?.localRuntimePackageAvailable ? "local runtime mirror available" : "public runtime fallback"}</span>
      </div>
    </div>
    <div class="detail-grid">
      <div class="detail-card">
        <span>Runtime Source</span>
        <strong>${escapeHtml(runtimeLaunch?.runtimeSourceLabel ?? "Blocked")}</strong>
        <small>${escapeHtml(runtimeLaunch?.localRuntimePackageAvailable
          ? runtimeLaunch?.blocker ?? "Runtime Debug Host and the embedded runtime both use the grounded local Mystery Garden runtime mirror on this machine."
          : runtimeLaunch?.blocker ?? "No grounded donor runtime package is captured for project_001 yet.")}</small>
      </div>
      <div class="detail-card">
        <span>Bridge Strength</span>
        <strong>${escapeHtml(workflowBridge.heading)}</strong>
        <small>${escapeHtml(workflowBridge.note)}</small>
      </div>
      <div class="detail-card">
        <span>Current Side Focus</span>
        <strong>${escapeHtml(getWorkflowPanelLabel(workflowPanel))}</strong>
        <small>Use the workflow rail above to move between runtime, donor, compose, VABS, and project setup without the old stacked wall of panels.</small>
      </div>
      <div class="detail-card">
        <span>Current Runtime Surface</span>
        <strong>${escapeHtml(state.runtimeUi.pageTitle ?? "Mystery Garden runtime not launched yet")}</strong>
        <small>${escapeHtml(state.runtimeUi.currentUrl ?? runtimeLaunch?.entryUrl ?? "No grounded runtime URL is indexed yet.")}</small>
      </div>
      <div class="detail-card ${runtimeOverrideCandidate.eligible ? "is-positive" : ""}">
        <span>Override Target</span>
        <strong>${escapeHtml(runtimeOverrideCandidate.runtimeRelativePath ?? "No grounded static runtime image selected yet")}</strong>
        <small>${escapeHtml(runtimeOverrideCandidate.note)}</small>
      </div>
    </div>
    <div class="tree-row">
      <strong>Runtime → Source Bridge</strong>
      <span>${escapeHtml(workflowBridge.note)}</span>
      <div class="evidence-actions">
        ${bridgeActions}
      </div>
    </div>
    <div class="tree-row">
      <strong>Next 3 steps</strong>
      <ol class="quickstart-list">
        ${quickSteps.map((step) => `<li>${escapeHtml(step)}</li>`).join("")}
      </ol>
    </div>
    <div class="tree-row">
      <strong>What remains bounded</strong>
      <div class="chip-row">${[
        "project_001 only",
        "static donor images only",
        "donor evidence read-only",
        "compose saves internal scene",
        "no local donor runtime package yet"
      ].map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div>
    </div>
  `;
}

function renderProjectBrowser() {
  if (!elements.projectBrowser) {
    return;
  }

  const workspace = getWorkspace();
  if (!workspace) {
    elements.projectBrowser.innerHTML = `<div class="tree-row"><strong>Workspace</strong><span>Not loaded.</span></div>`;
    return;
  }

  const projects = getWorkspaceProjects();
  const selectedProject = getSelectedProject();
  const projectCards = projects.map((project) => {
    const isSelected = project.projectId === selectedProject?.projectId;
    const lifecycle = project.lifecycle?.currentStage ? labelizeStage(project.lifecycle.currentStage) : "No lifecycle";

    return `
      <button class="project-card ${isSelected ? "is-selected" : ""}" type="button" data-project-id="${project.projectId}">
        <div class="project-card-head">
          <strong>${project.displayName}</strong>
          <span class="status-chip status-${project.status}">${labelizeStatus(project.status)}</span>
        </div>
        <p>${project.donor.donorName} <code>${project.donor.donorId}</code></p>
        <p>${project.targetGame.displayName}</p>
        <p>${lifecycle} · ${labelizeStatus(project.verificationStatus)}</p>
        <p class="project-path"><code>${project.keyPaths.projectRoot}</code></p>
      </button>
    `;
  }).join("");

  const selectedSummary = selectedProject ? `
    <div class="detail-grid">
      <div class="detail-card">
        <span>Selected Project</span>
        <strong>${selectedProject.displayName}</strong>
        <small>${selectedProject.phase}</small>
      </div>
      <div class="detail-card">
        <span>Donor</span>
        <strong>${selectedProject.donor.donorName}</strong>
        <small>${selectedProject.donor.status}</small>
      </div>
      <div class="detail-card">
        <span>Target</span>
        <strong>${selectedProject.targetGame.displayName}</strong>
        <small>${selectedProject.targetGame.status}</small>
      </div>
      <div class="detail-card">
        <span>Lifecycle</span>
        <strong>${labelizeStage(selectedProject.lifecycle.currentStage)}</strong>
        <small>${selectedProject.lifecycle.stages[selectedProject.lifecycle.currentStage]?.notes ?? "Stage notes pending."}</small>
      </div>
    </div>
  ` : `<p class="muted-copy">No projects available.</p>`;

  elements.projectBrowser.innerHTML = `
    <div class="tree-row">
      <strong>${workspace.displayName}</strong>
      <span>${workspace.description}</span>
      <code>${workspace.registryPath}</code>
    </div>
    <div class="project-list">${projectCards}</div>
    ${selectedSummary}
  `;
}

function renderEvidenceBrowser() {
  if (!elements.evidenceBrowser) {
    return;
  }

  const selectedProject = getSelectedProject();
  if (!selectedProject) {
    elements.evidenceBrowser.innerHTML = `<div class="tree-row"><strong>No Project Selected</strong><span>Select a project to inspect donor evidence context.</span></div>`;
    return;
  }

  const summary = getSelectedProjectEvidenceSummary();
  if (!summary) {
    elements.evidenceBrowser.innerHTML = `<div class="tree-row"><strong>No Evidence Summary</strong><span>The selected project does not expose donor evidence metadata yet.</span></div>`;
    return;
  }

  const selectedObject = getSelectedObject();
  const selectedObjectLinkage = getSelectedObjectEvidenceLinkage();
  const selectedObjectRefs = selectedObjectLinkage?.allEvidenceRefs ?? [];
  const evidenceObjectIndex = buildEvidenceToObjectIndex();
  const donorAssetCatalog = getDonorAssetCatalog();
  const visibleDonorAssets = getVisibleDonorAssetItems();
  const visibleEvidenceItems = getVisibleEvidenceItems();
  const visibleEvidenceRefs = getVisibleEvidenceRefList();
  const highlightedEvidenceId = visibleEvidenceRefs.includes(state.evidenceUi.highlightedEvidenceId)
    ? state.evidenceUi.highlightedEvidenceId
    : null;
  const evidenceCatalogCount = summary.evidenceCatalog?.itemCount ?? 0;
  const donorAssetCount = donorAssetCatalog?.assetCount ?? 0;

  const pathEntries = [
    {
      label: "Evidence root",
      value: summary.evidenceRoot,
      note: "Read-only donor capture source indexed for this project."
    },
    {
      label: "Replay donor evidence root",
      value: summary.replayDonorEvidenceRoot,
      note: "Replay-facing provenance root carried forward for context only."
    },
    {
      label: "Reports root",
      value: summary.reportsRoot,
      note: "Derived report/doc root tied to this donor-to-project slice."
    },
    {
      label: "Imports root",
      value: summary.importsRoot,
      note: "Importer manifests and related normalized import outputs."
    },
    {
      label: "Import artifact",
      value: summary.importArtifactPath,
      note: "Read-only importer manifest used to reconstruct the internal model."
    },
    ...summary.rawDonorRoots.map((value, index) => ({
      label: `Raw donor root ${index + 1}`,
      value,
      note: "Raw donor material stays outside the live editable scene model in this build."
    })),
    ...summary.projectPaths
      .filter((value) => ![summary.evidenceRoot, summary.reportsRoot, summary.importsRoot, summary.importArtifactPath].includes(value))
      .map((value, index) => ({
        label: `Known path ${index + 1}`,
        value,
        note: "Additional path discovered through project metadata."
      }))
  ];
  const donorSummaryCopyText = [
    `Donor: ${summary.donorName}`,
    `Donor ID: ${summary.donorId}`,
    `Status: ${summary.donorStatus}`,
    `Launch URL: ${summary.donorLaunchUrl || "none"}`,
    `Source Host: ${summary.donorSourceHost || "unknown"}`,
    `Harvest Status: ${summary.donorHarvestStatus || "unknown"}`,
    `Harvested Assets: ${summary.donorHarvestedAssetCount}`,
    `Failed Harvests: ${summary.donorFailedAssetCount}`,
    `Package Status: ${summary.donorPackageStatus || "unknown"}`,
    `Package Families: ${summary.donorPackageFamilyCount}`,
    `Package Referenced URLs: ${summary.donorPackageReferencedUrlCount}`,
    `Package Graph Nodes: ${summary.donorPackageGraphNodeCount}`,
    `Package Graph Edges: ${summary.donorPackageGraphEdgeCount}`,
    `Package Unresolved Entries: ${summary.donorPackageUnresolvedCount}`,
    `Scan Status: ${summary.donorScanState || "unknown"}`,
    `Runtime Candidates: ${summary.donorRuntimeCandidateCount}`,
    `Atlas Metadata Count: ${summary.donorAtlasManifestCount}`,
    `Bundle Asset Map Status: ${summary.donorBundleAssetMapStatus || "unknown"}`,
    `Translation Payloads: ${summary.donorTranslationPayloadCount} (${summary.donorTranslationPayloadStatus || "unknown"})`,
    `Mirror Candidate Status: ${summary.donorMirrorCandidateStatus || "unknown"}`,
    `Next Capture Targets: ${summary.donorNextCaptureTargetCount}`,
    `Guided Capture Status: ${summary.donorCaptureRunStatus || "idle"}`,
    `Guided Capture Downloaded: ${summary.donorCaptureDownloadedCount}`,
    `Guided Capture Failed: ${summary.donorCaptureFailedCount}`,
    `Next Operator Action: ${summary.donorNextOperatorAction || "not recorded"}`,
    `Evidence Root: ${summary.evidenceRoot}`,
    `Donor Asset Count: ${donorAssetCount}`,
    `Capture Sessions: ${summary.captureSessions.join(", ") || "none"}`,
    `Donor Evidence Refs: ${summary.donorEvidenceRefs.join(", ") || "none"}`,
    `Importer Evidence Refs: ${summary.importEvidenceRefs.join(", ") || "none"}`,
    `Catalog Items: ${evidenceCatalogCount}`
  ].join("\n");
  const importerEntryCount = summary.importNodeEntries.length + summary.importAssetEntries.length;
  const evidenceItemsCountLabel = state.evidenceUi.selectedObjectOnly
    ? `${visibleEvidenceItems.length} of ${evidenceCatalogCount}`
    : String(evidenceCatalogCount);

  elements.evidenceBrowser.innerHTML = `
    <div class="tree-row scope-summary">
      <strong>${escapeHtml(summary.donorName)} evidence (read-only)</strong>
      <span>This panel shows donor capture context and importer metadata for <code>${escapeHtml(selectedProject.projectId)}</code>. Supported donor image assets can be imported from here, but raw donor files still stay read-only and all edits still happen through internal project files.</span>
      <div class="chip-row">
        <span>${escapeHtml(summary.donorId)}</span>
        <span>${donorAssetCount} donor image assets</span>
        <span>${summary.donorHarvestedAssetCount} harvested assets</span>
        <span>${summary.donorPackageFamilyCount} package families</span>
        <span>${summary.donorPackageGraphNodeCount} package graph nodes</span>
        <span>${summary.donorRuntimeCandidateCount} runtime candidates</span>
        <span>${summary.donorAtlasManifestCount} atlas metadata</span>
        <span>${summary.donorBundleAssetMapStatus || "unknown"} bundle map</span>
        <span>${summary.donorMirrorCandidateStatus || "unknown"} mirror status</span>
        <span>${summary.donorNextCaptureTargetCount} next capture targets</span>
        <span>${summary.donorFailedAssetCount} harvest failures</span>
        <span>${summary.captureSessions.length} capture sessions</span>
        <span>${summary.donorEvidenceRefs.length} donor evidence refs</span>
        <span>${summary.importEvidenceRefs.length} importer evidence refs</span>
        <span>${evidenceCatalogCount} catalog items</span>
      </div>
      <div class="evidence-actions">
        ${renderCopyButton(summary.donorId, "donor id")}
        ${renderCopyButton(summary.evidenceRoot, "evidence root path")}
        ${renderCopyButton(donorSummaryCopyText, "donor evidence summary", "Copy Summary")}
        ${selectedObjectRefs.length > 0 ? `<button type="button" class="copy-button" data-evidence-filter-mode="selected">${state.evidenceUi.selectedObjectOnly ? "Showing Selected Object Evidence" : "Show Selected Object Evidence"}</button>` : ""}
        ${state.evidenceUi.selectedObjectOnly ? `<button type="button" class="copy-button" data-clear-evidence-filter="1">Clear Evidence Filter</button>` : ""}
        ${visibleEvidenceRefs.length > 0 ? renderCopyButton(visibleEvidenceRefs.join("\n"), "visible donor evidence refs", "Copy Visible Refs") : ""}
      </div>
    </div>
    ${(state.evidenceUi.selectedObjectOnly || highlightedEvidenceId) ? `
      <div class="tree-row evidence-filter-banner ${state.evidenceUi.selectedObjectOnly ? "is-active" : ""}">
        <strong>${state.evidenceUi.selectedObjectOnly ? "Selected-object evidence view" : "Evidence focus"}</strong>
        <span>${state.evidenceUi.selectedObjectOnly
          ? (selectedObject
            ? `${escapeHtml(selectedObject.displayName)} currently grounds ${selectedObjectRefs.length} donor refs and ${visibleEvidenceItems.length} visible evidence cards.`
            : "Select an object to filter the donor evidence browser.")
          : `Focused evidence item ${escapeHtml(highlightedEvidenceId ?? "n/a")}.`}</span>
      </div>
    ` : ""}
    <details class="evidence-section" open>
      <summary>Donor Summary <span class="summary-count">${summary.donorEvidenceRefs.length + summary.importEvidenceRefs.length}</span></summary>
      <div class="evidence-section-body detail-grid">
        <div class="detail-card">
          <span>Donor</span>
          <strong>${escapeHtml(summary.donorName)}</strong>
          <small><code>${escapeHtml(summary.donorId)}</code></small>
          <div class="evidence-actions">
            ${renderCopyButton(summary.donorId, "donor id")}
          </div>
        </div>
        <div class="detail-card">
          <span>Evidence Root</span>
          <strong><code>${escapeHtml(toRepoRelativePath(summary.evidenceRoot))}</code></strong>
          <small>Read-only donor capture source for this project.</small>
          <div class="evidence-actions">
            ${renderCopyButton(summary.evidenceRoot, "evidence root path")}
          </div>
        </div>
        <div class="detail-card">
          <span>Importer Manifest</span>
          <strong>${summary.importId ? escapeHtml(summary.importId) : "Not indexed"}</strong>
          <small>${summary.importSourceDonorId ? `Source donor ${escapeHtml(summary.importSourceDonorId)}.` : "Importer linkage is not recorded."}</small>
          <div class="evidence-actions">
            ${summary.importId ? renderCopyButton(summary.importId, "import id") : ""}
            ${summary.importSourceDonorId ? renderCopyButton(summary.importSourceDonorId, "import source donor id") : ""}
          </div>
        </div>
        <div class="detail-card">
          <span>Editing Boundary</span>
          <strong>Read-only donor source + bounded import</strong>
          <small>Raw donor files stay read-only. Supported local image assets can be dragged from the donor asset palette into the internal scene.</small>
          <div class="chip-row">
            <span>${escapeHtml(summary.donorStatus)}</span>
            <span>${summary.donorNotes ? escapeHtml(summary.donorNotes) : "No extra donor note recorded."}</span>
          </div>
        </div>
        <div class="detail-card">
          <span>Launch / Harvest</span>
          <strong>${summary.donorLaunchUrl ? escapeHtml(summary.donorLaunchUrl) : "No launch URL recorded"}</strong>
          <small>${summary.donorSourceHost ? `Source host ${escapeHtml(summary.donorSourceHost)}.` : "No source host recorded."}</small>
          <div class="chip-row">
            <span>${summary.donorHarvestStatus ? escapeHtml(summary.donorHarvestStatus) : "unknown"}</span>
            <span>${summary.donorHarvestedAssetCount} harvested</span>
            <span>${summary.donorFailedAssetCount} failed</span>
          </div>
          <div class="evidence-actions">
            ${summary.donorHarvestManifestPath ? renderCopyButton(summary.donorHarvestManifestPath, "donor harvest manifest path", "Copy Harvest Manifest Path") : ""}
          </div>
        </div>
        <div class="detail-card">
          <span>Donor Package</span>
          <strong>${summary.donorPackageStatus ? escapeHtml(summary.donorPackageStatus) : "unknown"}</strong>
          <small>${summary.donorPackageReferencedUrlCount} referenced URLs grouped into ${summary.donorPackageFamilyCount} bounded asset families, then traced into a ${summary.donorPackageGraphNodeCount}-node / ${summary.donorPackageGraphEdgeCount}-edge package graph.</small>
          <div class="chip-row">
            <span>${summary.donorPackageFamilyCount} families</span>
            <span>${summary.donorPackageReferencedUrlCount} referenced URLs</span>
            <span>${summary.donorPackageGraphNodeCount} nodes</span>
            <span>${summary.donorPackageGraphEdgeCount} edges</span>
            <span>${summary.donorPackageUnresolvedCount} unresolved</span>
          </div>
          <div class="evidence-actions">
            ${summary.donorPackageManifestPath ? renderCopyButton(summary.donorPackageManifestPath, "donor package manifest path", "Copy Package Manifest Path") : ""}
            ${summary.donorPackageGraphPath ? renderCopyButton(summary.donorPackageGraphPath, "donor package graph path", "Copy Package Graph Path") : ""}
          </div>
        </div>
        <div class="detail-card">
          <span>Donor Scan</span>
          <strong>${summary.donorScanState ? escapeHtml(summary.donorScanState) : "unknown"}</strong>
          <small>${summary.donorNextOperatorAction
            ? escapeHtml(summary.donorNextOperatorAction)
            : "Run the donor scan to see runtime candidates, atlas metadata, bundle asset-map status, and the next operator step."}</small>
          <div class="chip-row">
            <span>${summary.donorRuntimeCandidateCount} runtime candidates</span>
            <span>${summary.donorAtlasManifestCount} atlas metadata</span>
            <span>${summary.donorBundleAssetMapStatus ? escapeHtml(summary.donorBundleAssetMapStatus) : "unknown"} bundle map</span>
            <span>${escapeHtml(summary.donorBundleImageVariantStatus || "unknown")} bundle image variants</span>
            <span>${summary.donorBundleImageVariantCount} logical image entries</span>
            <span>${summary.donorBundleImageVariantSuffixCount} variant suffixes</span>
            <span>${summary.donorTranslationPayloadCount} translation payloads</span>
            <span>${escapeHtml(summary.donorTranslationPayloadStatus || "unknown")} translation payload status</span>
            <span>${summary.donorMirrorCandidateStatus ? escapeHtml(summary.donorMirrorCandidateStatus) : "unknown"} mirror status</span>
            <span>${summary.donorRequestBackedStaticHintCount} request-backed alternates</span>
            <span>${summary.donorRecentlyBlockedCaptureTargetCount} recently blocked</span>
            <span>${summary.donorCaptureFamilyCount} capture families</span>
            <span>${summary.donorRawPayloadBlockedCaptureTargetCount} raw-payload blocked</span>
            <span>${summary.donorRawPayloadBlockedFamilyCount} blocker families</span>
            <span>${summary.donorNextCaptureTargetCount} next capture targets</span>
          </div>
          <div class="chip-row">
            <span>${summary.donorCaptureRunStatus ? escapeHtml(summary.donorCaptureRunStatus) : "idle"} guided capture</span>
            <span>${summary.donorCaptureAttemptedCount} attempted</span>
            <span>${summary.donorCaptureDownloadedCount} downloaded</span>
            <span>${summary.donorCaptureFailedCount} failed</span>
          </div>
          ${summary.donorBlockerHighlights.length > 0 ? `
            <div class="detail-list">
              ${summary.donorBlockerHighlights.slice(0, 3).map((entry) => `<small>${escapeHtml(entry)}</small>`).join("")}
            </div>
          ` : ""}
          ${summary.donorTopCaptureFamilyNames.length > 0 ? `
            <div class="detail-list">
              <small><strong>Top capture families</strong> · ${summary.donorTopCaptureFamilyNames.map((family) => escapeHtml(family)).join(", ")}</small>
            </div>
          ` : ""}
          ${summary.donorRawPayloadBlockedFamilyNames.length > 0 ? `
            <div class="detail-list">
              <small><strong>Blocked families</strong> · ${summary.donorRawPayloadBlockedFamilyNames.map((family) => escapeHtml(family)).join(", ")}</small>
            </div>
          ` : ""}
          ${summary.donorNextCaptureTargets.length > 0 ? `
            <div class="detail-list">
              ${summary.donorNextCaptureTargets.slice(0, 3).map((target) => `
                <small><strong>${escapeHtml(target.priority)}</strong> · <code>${escapeHtml(target.relativePath || target.url)}</code> · ${escapeHtml(target.reason || "No reason recorded.")}${target.alternateHintCount > 0 ? ` · ${escapeHtml(String(target.alternateHintCount))} grounded alternate${target.alternateHintCount === 1 ? "" : "s"}` : ""}${target.recentCaptureStatus === "blocked" ? ` · latest capture already failed on ${escapeHtml(String(target.recentCaptureAttemptCount || 0))} grounded URL${target.recentCaptureAttemptCount === 1 ? "" : "s"}` : ""}</small>
              `).join("")}
            </div>
          ` : ""}
          <div class="evidence-actions">
            <button
              type="button"
              class="copy-button"
              data-donor-scan-action="capture-next"
              data-donor-scan-capture-limit="5"
              ${summary.donorNextCaptureTargetCount <= 0 ? "disabled" : ""}
            >Run Guided Capture</button>
            ${summary.donorScanSummaryPath ? renderCopyButton(summary.donorScanSummaryPath, "donor scan summary path", "Copy Scan Summary Path") : ""}
            ${summary.donorBlockerSummaryPath ? renderCopyButton(summary.donorBlockerSummaryPath, "donor blocker summary path", "Copy Blocker Summary Path") : ""}
            ${summary.donorNextCaptureTargetsPath ? renderCopyButton(summary.donorNextCaptureTargetsPath, "donor next capture targets path", "Copy Capture Targets Path") : ""}
            ${summary.donorCaptureRunPath ? renderCopyButton(summary.donorCaptureRunPath, "donor guided capture summary path", "Copy Capture Run Path") : ""}
            ${summary.donorNextCaptureTargets.length > 0 ? renderCopyButton(summary.donorNextCaptureTargets.map((target) => `${target.priority}\t${target.kind}\t${target.relativePath || target.url}\t${target.reason || "No reason recorded."}\t${target.alternateHintCount} alternate(s)\t${target.recentCaptureStatus}\t${target.recentCaptureAttemptCount} recent attempt(s)\t${target.recentCaptureFailureReason || ""}\t${target.alternateHintPreview.join(" | ")}`).join("\n"), "donor next capture targets", "Copy Top Targets") : ""}
          </div>
        </div>
      </div>
    </details>
    <details class="evidence-section" open data-donor-asset-palette="1">
      <summary>Donor Asset Palette <span class="summary-count">${visibleDonorAssets.length}${state.donorAssetUi.searchQuery ? ` of ${donorAssetCount}` : ""}</span></summary>
      <div class="evidence-section-body">
        <div class="tree-row scope-summary donor-asset-summary">
          <strong>Local donor image composition</strong>
          <span>${donorAssetCatalog?.blocker
            ? escapeHtml(donorAssetCatalog.blocker)
            : "Drag one supported donor image or harvested runtime/package image onto the Editor Canvas to create an editable donor-backed scene object on the chosen target layer, or replace the selected editable scene object while keeping its layout. Raw donor files remain read-only."}</span>
          <div class="chip-row">
            <span>${donorAssetCatalog?.localIndexExists ? "using cached local index" : "using live local scan"}</span>
            <span>${donorAssetCount} usable editable image assets</span>
            <span>supported: png, webp, jpg, jpeg, svg</span>
          </div>
        </div>
        <label class="donor-asset-search">
          <span>Search donor assets</span>
          <input
            type="search"
            data-donor-asset-search="1"
            placeholder="Search donor asset name, evidence id, or capture session"
            value="${escapeAttribute(state.donorAssetUi.searchQuery ?? "")}"
          />
        </label>
        ${renderDonorAssetFilterBar(donorAssetCatalog, visibleDonorAssets.length)}
        ${renderDonorImportTargetControl()}
        ${renderDonorAssetCards(visibleDonorAssets, evidenceObjectIndex)}
      </div>
    </details>
    <details class="evidence-section" open>
      <summary>Evidence Items <span class="summary-count">${escapeHtml(evidenceItemsCountLabel)}</span></summary>
      <div class="evidence-section-body">
        ${renderEvidenceItemCards(visibleEvidenceItems, evidenceObjectIndex, {
          highlightedEvidenceId,
          selectedObjectOnly: state.evidenceUi.selectedObjectOnly
        })}
      </div>
    </details>
    <details class="evidence-section">
      <summary>Capture Sessions <span class="summary-count">${summary.captureSessions.length}</span></summary>
      <div class="evidence-section-body">
        ${renderCopyableList(summary.captureSessions, {
          labelPrefix: "capture session id",
          emptyMessage: "No capture sessions indexed yet."
        })}
      </div>
    </details>
    <details class="evidence-section">
      <summary>Evidence References <span class="summary-count">${summary.donorEvidenceRefs.length + summary.importEvidenceRefs.length}</span></summary>
      <div class="evidence-section-body evidence-grid">
        <div class="evidence-subsection">
          <div class="evidence-subsection-head">
            <strong>Donor metadata refs</strong>
            ${summary.donorEvidenceRefs.length > 0 ? renderCopyButton(summary.donorEvidenceRefs.join("\n"), "all donor evidence refs", "Copy All") : ""}
          </div>
          ${renderCopyableList(summary.donorEvidenceRefs, {
            labelPrefix: "donor evidence ref",
            emptyMessage: "No donor evidence refs indexed yet."
          })}
        </div>
        <div class="evidence-subsection">
          <div class="evidence-subsection-head">
            <strong>Importer refs</strong>
            ${summary.importEvidenceRefs.length > 0 ? renderCopyButton(summary.importEvidenceRefs.join("\n"), "all importer evidence refs", "Copy All") : ""}
          </div>
          ${renderCopyableList(summary.importEvidenceRefs, {
            labelPrefix: "importer evidence ref",
            emptyMessage: "No importer evidence refs indexed yet."
          })}
        </div>
      </div>
    </details>
    <details class="evidence-section">
      <summary>Importer Evidence <span class="summary-count">${importerEntryCount}</span></summary>
      <div class="evidence-section-body evidence-grid">
        <div class="evidence-subsection">
          <div class="evidence-subsection-head">
            <strong>Importer node refs</strong>
            <span class="muted-copy">${summary.importNodeEntries.length} nodes</span>
          </div>
          ${renderImporterNodeEntries(summary.importNodeEntries)}
        </div>
        <div class="evidence-subsection">
          <div class="evidence-subsection-head">
            <strong>Importer asset provenance</strong>
            <span class="muted-copy">${summary.importAssetEntries.length} assets</span>
          </div>
          ${renderImporterAssetEntries(summary.importAssetEntries)}
        </div>
      </div>
    </details>
    <details class="evidence-section">
      <summary>Reports / Paths <span class="summary-count">${pathEntries.filter((entry) => entry.value).length}</span></summary>
      <div class="evidence-section-body">
        ${renderPathEntries(pathEntries)}
      </div>
    </details>
  `;
}

function renderSceneExplorer() {
  if (!elements.sceneExplorer) {
    return;
  }

  const selectedProject = getSelectedProject();
  const editorData = state.editorData;

  if (!selectedProject) {
    elements.sceneExplorer.innerHTML = `<div class="tree-row"><strong>No Project Selected</strong><span>Choose a project from the browser.</span></div>`;
    return;
  }

  if (!editorData) {
    elements.sceneExplorer.innerHTML = `
      <div class="tree-row">
        <strong>${selectedProject.displayName}</strong>
        <span>No editable scene files are available yet.</span>
        <p class="muted-copy">This project can stay scaffold-only until a future run adds internal scene data.</p>
      </div>
    `;
    return;
  }

  const sortedLayers = sortLayers(editorData.layers);
  const renderableLayerIds = new Set(getRenderableLayerIds(editorData));
  const renderableSectionObjectIds = getRenderableSceneSectionObjectIds(editorData);
  const isolatedLayer = getIsolatedLayer();
  const isolatedSceneSection = getIsolatedSceneSectionId()
    ? getSceneSectionEntryById(getIsolatedSceneSectionId(), editorData)
    : null;
  const displayedLayers = sortedLayers.filter((layer) => renderableLayerIds.has(layer.id));
  const sceneSectionEntries = getSceneSectionEntries(editorData);
  const sceneSectionBanner = sceneSectionEntries.length > 0 ? `
    <div class="tree-row isolate-banner">
      <strong>Scene Sections · Game-Part Kits</strong>
      <span>Imported donor scene kits now appear as named editable sections, and each section now carries grouped donor provenance, whole-section controls, and the strongest grounded runtime link when one exists.</span>
      <div class="detail-grid donor-linkage-grid">
        ${sceneSectionEntries.map((entry) => {
          const runtimeContext = entry.runtimeContext;
          const overrideCandidate = runtimeContext?.overrideCandidate ?? null;
          const provenance = entry.provenance;
          const gamePartSummary = entry.gamePartSummary;
          const sectionState = entry.stateSummary ?? getSceneSectionStateSummary(entry, editorData);
          const runtimeSummary = runtimeContext?.preferredWorkbenchEntry
            ? `Runtime-linked through ${runtimeContext.preferredWorkbenchEntry.relativePath ?? runtimeContext.preferredWorkbenchEntry.sourceUrl}.`
            : runtimeContext?.preferredReference
              ? `Supported by ${runtimeContext.preferredReference.label}.`
              : "No grounded runtime link recorded for this scene section yet.";
          return `
            <div class="detail-card">
              <span>${escapeHtml(entry.label)}</span>
              <strong>${entry.count} object${entry.count === 1 ? "" : "s"}</strong>
              <small>${escapeHtml(runtimeSummary)}</small>
              <div class="chip-row donor-asset-summary-chips">
                ${entry.layerLabels.map((label) => `<span>${escapeHtml(label)}</span>`).join("")}
                ${runtimeContext?.statusLabel ? `<span>${escapeHtml(runtimeContext.statusLabel)}</span>` : ""}
                ${overrideCandidate?.eligible ? `<span>override-ready</span>` : overrideCandidate?.activeOverride ? `<span>override-active</span>` : ""}
                ${provenance?.primaryGroupSummary ? `<span>${escapeHtml(provenance.primaryGroupSummary.importLabel)}</span>` : ""}
                ${gamePartSummary?.roleLabel ? `<span>${escapeHtml(gamePartSummary.roleLabel)}</span>` : ""}
                ${sectionState?.visibilityStatusLabel ? `<span>${escapeHtml(sectionState.visibilityStatusLabel)}</span>` : ""}
                ${sectionState?.lockStatusLabel ? `<span>${escapeHtml(sectionState.lockStatusLabel)}</span>` : ""}
                ${sectionState?.scaleStatusLabel ? `<span>${escapeHtml(sectionState.scaleStatusLabel)}</span>` : ""}
                ${sectionState?.isolationStatusLabel ? `<span>${escapeHtml(sectionState.isolationStatusLabel)}</span>` : ""}
              </div>
              ${provenance ? `
                <small>${escapeHtml(`${provenance.donorAssets.length} donor asset${provenance.donorAssets.length === 1 ? "" : "s"} · ${provenance.evidenceIds.length} evidence ref${provenance.evidenceIds.length === 1 ? "" : "s"} · ${provenance.sourceCategories.join(", ") || "source unknown"}`)}</small>
              ` : ""}
              ${gamePartSummary ? `<small>${escapeHtml(gamePartSummary.readinessLabel)}</small>` : ""}
              <div class="evidence-actions">
                <button type="button" class="copy-button" data-focus-scene-section-id="${escapeAttribute(entry.id)}">Select Section</button>
                <button type="button" class="copy-button" data-focus-scene-section-assets-id="${escapeAttribute(entry.id)}">Show Section Assets</button>
                ${runtimeContext?.preferredWorkbenchEntry || runtimeContext?.preferredReference
                  ? `<button type="button" class="copy-button" data-open-scene-section-runtime-id="${escapeAttribute(entry.id)}">Open Runtime Group</button>`
                  : ""}
                ${overrideCandidate?.eligible
                  ? `<button type="button" class="copy-button" data-create-scene-section-override-id="${escapeAttribute(entry.id)}">Create Override</button>`
                  : ""}
                ${overrideCandidate?.activeOverride
                  ? `<button type="button" class="copy-button" data-clear-scene-section-override-id="${escapeAttribute(entry.id)}">Clear Override</button>`
                  : ""}
                ${runtimeContext?.donorAsset
                  ? `<button type="button" class="copy-button" data-focus-donor-asset-id="${escapeAttribute(runtimeContext.donorAsset.assetId)}">Focus Asset</button>`
                  : ""}
                ${runtimeContext?.evidenceItem
                  ? `<button type="button" class="copy-button" data-focus-donor-evidence-id="${escapeAttribute(runtimeContext.evidenceItem.evidenceId)}">Focus Evidence</button>`
                  : ""}
                <button type="button" class="copy-button" data-toggle-scene-section-visibility-id="${escapeAttribute(entry.id)}">${escapeHtml(sectionState?.visibilityButtonLabel ?? "Hide Section")}</button>
                <button type="button" class="copy-button" data-toggle-scene-section-lock-id="${escapeAttribute(entry.id)}">${escapeHtml(sectionState?.lockButtonLabel ?? "Lock Section")}</button>
                <button type="button" class="copy-button" data-toggle-scene-section-isolation-id="${escapeAttribute(entry.id)}">${escapeHtml(sectionState?.isolationButtonLabel ?? "Solo Section")}</button>
                <button type="button" class="copy-button" data-reorder-scene-section-id="${escapeAttribute(entry.id)}" data-reorder-scene-section-action="send-backward">Send Section Backward</button>
                <button type="button" class="copy-button" data-reorder-scene-section-id="${escapeAttribute(entry.id)}" data-reorder-scene-section-action="bring-forward">Bring Section Forward</button>
                <button type="button" class="copy-button" data-scale-scene-section-up-id="${escapeAttribute(entry.id)}">Scale Section Up</button>
                <button type="button" class="copy-button" data-scale-scene-section-down-id="${escapeAttribute(entry.id)}">Scale Section Down</button>
                <button type="button" class="copy-button" data-restore-scene-section-defaults-id="${escapeAttribute(entry.id)}">Restore Section Defaults</button>
                <button type="button" class="copy-button" data-center-scene-section-id="${escapeAttribute(entry.id)}">Center Section</button>
                ${gamePartSummary?.sceneKitSummary?.layoutStyle ? `<button type="button" class="copy-button" data-reset-scene-section-layout-id="${escapeAttribute(entry.id)}">Reset Section Layout</button>` : ""}
                ${gamePartSummary?.sceneKitSummary?.layerId ? `<button type="button" class="copy-button" data-restore-scene-section-layer-id="${escapeAttribute(entry.id)}">Restore Suggested Layer</button>` : ""}
                <button type="button" class="copy-button" data-duplicate-scene-section-id="${escapeAttribute(entry.id)}">Duplicate Section</button>
                <button type="button" class="copy-button" data-delete-scene-section-id="${escapeAttribute(entry.id)}">Delete Section</button>
                <button type="button" class="copy-button" data-frame-scene-section-id="${escapeAttribute(entry.id)}">Frame Section</button>
                ${provenance?.evidenceIds?.length
                  ? `<button type="button" class="copy-button" data-focus-scene-section-evidence-id="${escapeAttribute(entry.id)}">Show Section Evidence</button>`
                  : ""}
                ${provenance?.primaryGroupKey
                  ? `<button type="button" class="copy-button" data-focus-donor-asset-group-key="${escapeAttribute(provenance.primaryGroupKey)}">Show Scene Kit</button>`
                  : ""}
                ${gamePartSummary?.summaryText ? renderCopyButton(gamePartSummary.summaryText, `game-part summary for ${entry.label}`, "Copy Game-Part Summary") : ""}
                ${provenance?.donorAssetIds?.length ? renderCopyButton(provenance.donorAssetIds.join("\n"), `donor asset ids for ${entry.label}`, "Copy Asset IDs") : ""}
                ${provenance?.evidenceIds?.length ? renderCopyButton(provenance.evidenceIds.join("\n"), `evidence refs for ${entry.label}`, "Copy Evidence Refs") : ""}
                ${provenance?.summaryText ? renderCopyButton(provenance.summaryText, `reconstruction kit summary for ${entry.label}`, "Copy Kit Summary") : ""}
              </div>
            </div>
          `;
        }).join("")}
      </div>
    </div>
  ` : "";
  const sectionIsolationBanner = isolatedSceneSection ? `
    <div class="tree-row isolate-banner">
      <strong>Solo Section View</strong>
      <span>${escapeHtml(isolatedSceneSection.label)} is isolated for this session only. Saved object visibility and layer rules are unchanged.</span>
      <div class="layer-actions">
        <button class="layer-toggle" type="button" data-toggle-scene-section-isolation-id="${escapeAttribute(isolatedSceneSection.id)}" ${state.canvasDrag ? "disabled" : ""}>
          Exit Solo Section
        </button>
      </div>
    </div>
  ` : "";
  const isolationBanner = isolatedLayer ? `
    <div class="tree-row isolate-banner">
      <strong>Solo Layer View</strong>
      <span>${isolatedLayer.displayName} is isolated for this session only. Saved visibility flags are unchanged.</span>
      <div class="layer-actions">
        <button class="layer-toggle" type="button" data-layer-id="${isolatedLayer.id}" data-layer-action="clear-isolation" ${state.canvasDrag ? "disabled" : ""}>
          Exit Solo
        </button>
      </div>
    </div>
  ` : "";
  const layerMarkup = displayedLayers.map((layer) => {
    const objects = getLayerObjectsInOrder(layer.id, editorData)
      .filter((object) => !isDonorSceneKitContainer(object))
      .filter((object) => !renderableSectionObjectIds || renderableSectionObjectIds.has(object.id));
    const objectMarkup = objects.length > 0
      ? objects.map((object, index) => {
        const donorAsset = getDonorAssetForObject(object);
        const sceneKitContext = getSceneKitContextForObject(object);
        const isSelected = isObjectSelected(object.id);
        const isPrimarySelected = object.id === state.selectedObjectId;
        return `
        <button class="object-row ${isSelected ? "is-selected" : ""} ${isSelected && !isPrimarySelected ? "is-secondary-selected" : ""}" type="button" data-object-id="${object.id}">
          <strong>${object.displayName}</strong>
          ${donorAsset ? `
            <div class="chip-row object-row-badges">
              <span class="object-row-badge is-donor">Donor-backed</span>
              ${sceneKitContext ? `<span class="object-row-badge">${escapeHtml(sceneKitContext.sectionLabel)}</span>` : ""}
              ${donorAsset.fileType ? `<span class="asset-format-badge">${escapeHtml(String(donorAsset.fileType).toUpperCase())}</span>` : ""}
              ${donorAsset.evidenceId ? `<span><code>${escapeHtml(donorAsset.evidenceId)}</code></span>` : ""}
            </div>
          ` : ""}
          <span>${object.type}</span>
          <small>${object.visible ? "visible" : "hidden"} · ${object.locked ? "locked" : "editable"} · stack ${index + 1}/${objects.length} · ${isPrimarySelected ? "primary selection" : isSelected ? "selected" : "not selected"} · ${object.id}</small>
        </button>
        `;
      }).join("")
      : `<p class="muted-copy">No objects on this layer.</p>`;

    return `
      <div class="tree-row">
        <div class="layer-row">
          <div>
            <strong>${layer.displayName}</strong>
            <span>order ${layer.order} · ${layer.visible ? "visible" : "hidden"} · ${layer.locked ? "locked" : "editable"}${isolatedLayer?.id === layer.id ? " · solo view" : ""}</span>
          </div>
          <div class="layer-actions">
            <button class="layer-toggle" type="button" data-layer-id="${layer.id}" data-layer-action="toggle-visible" ${state.canvasDrag ? "disabled" : ""}>
              ${layer.visible ? "Hide" : "Show"}
            </button>
            <button class="layer-toggle" type="button" data-layer-id="${layer.id}" data-layer-action="toggle-locked" ${state.canvasDrag ? "disabled" : ""}>
              ${layer.locked ? "Unlock" : "Lock"}
            </button>
            <button class="layer-toggle ${isolatedLayer?.id === layer.id ? "is-active" : ""}" type="button" data-layer-id="${layer.id}" data-layer-action="toggle-isolate" ${state.canvasDrag ? "disabled" : ""}>
              ${isolatedLayer?.id === layer.id ? "Solo On" : "Solo"}
            </button>
          </div>
        </div>
        <div class="object-list">${objectMarkup}</div>
      </div>
    `;
  }).join("");

  elements.sceneExplorer.innerHTML = `
    <div class="tree-row">
      <strong>${editorData.scene.displayName}</strong>
      <span>${editorData.scene.sceneId} · ${editorData.scene.kind}</span>
      <div class="chip-row">
        <span>${sortedLayers.length} layers</span>
        <span>${editorData.objects.length} objects</span>
        <span>${sceneSectionEntries.length} scene section${sceneSectionEntries.length === 1 ? "" : "s"}</span>
        <span>${sceneSectionEntries.filter((entry) => entry.runtimeContext?.preferredWorkbenchEntry || entry.runtimeContext?.preferredReference).length} runtime-linked section${sceneSectionEntries.filter((entry) => entry.runtimeContext?.preferredWorkbenchEntry || entry.runtimeContext?.preferredReference).length === 1 ? "" : "s"}</span>
        <span>${state.dirty ? "unsaved changes" : "saved"}</span>
        <span>${isolatedLayer ? `solo ${isolatedLayer.displayName}` : "no solo layer"}</span>
        <span>${isolatedSceneSection ? `solo ${isolatedSceneSection.label}` : "no solo section"}</span>
      </div>
    </div>
    ${sceneSectionBanner}
    ${sectionIsolationBanner}
    ${isolationBanner}
    ${layerMarkup}
  `;
}

function renderInvestigationPanel() {
  if (!elements.investigationBrowser) {
    return;
  }

  const selectedProject = getSelectedProject();
  const investigation = state.bundle?.investigation ?? null;
  const donorScan = state.bundle?.donorScan ?? null;
  const modificationHandoff = getProjectModificationHandoff();
  const runtimeResourceMap = state.bundle?.runtimeResourceMap ?? null;
  if (!selectedProject) {
    elements.investigationBrowser.innerHTML = `<div class="tree-row"><strong>No Project</strong><span>Select a project to review investigation coverage.</span></div>`;
    return;
  }

  if (!investigation) {
    elements.investigationBrowser.innerHTML = `
      <div class="tree-row">
        <strong>Investigation Not Started</strong>
        <span>No investigation-status artifact exists yet for ${escapeHtml(selectedProject.donor.donorName)}.</span>
        <div class="evidence-actions">
          ${investigationProfiles.map((profile) => `
            <button
              type="button"
              class="copy-button"
              data-donor-scan-action="run-scenario-profile"
              data-donor-scan-profile="${escapeAttribute(profile.profileId)}"
              data-donor-scan-minutes="${escapeAttribute(String(profile.minutes))}"
            >Run ${escapeHtml(profile.label)}</button>
          `).join("")}
        </div>
      </div>
    `;
    return;
  }

  const counts = investigation.countsByState ?? {};
  const coverageRows = Array.isArray(investigation.topScenarioCoverage) ? investigation.topScenarioCoverage : [];
  const nextTargets = Array.isArray(investigation.topScenarioTargets) ? investigation.topScenarioTargets : [];
  const readyCandidates = Array.isArray(investigation.topReadyCandidates) ? investigation.topReadyCandidates : [];
  const modificationQueue = Array.isArray(investigation.topModificationQueue) ? investigation.topModificationQueue : [];
  const handoffTopTasks = Array.isArray(modificationHandoff?.topTasks) ? modificationHandoff.topTasks : [];
  const recommendedProfile = investigation.nextCaptureProfile
    ? getInvestigationProfileDefinition(investigation.nextCaptureProfile)
    : null;
  const canMoveToModification = investigation.modificationReadiness !== "investigation-only";
  const selfInvestigationProfile = investigation.selfInvestigation?.nextAutoProfile
    ? getInvestigationProfileDefinition(investigation.selfInvestigation.nextAutoProfile)
    : null;
  const operatorAssistProfile = investigation.operatorAssist?.suggestedProfile
    ? getInvestigationProfileDefinition(investigation.operatorAssist.suggestedProfile)
    : null;
  const runtimeCoverage = runtimeResourceMap?.coverage ?? null;
  const blockedRawFamilies = Array.isArray(donorScan?.rawPayloadBlockedFamilyNames) ? donorScan.rawPayloadBlockedFamilyNames : [];
  const investigationSummaryPayload = {
    projectId: selectedProject.projectId,
    donorId: investigation.donorId,
    donorName: investigation.donorName,
    generatedAt: investigation.generatedAt,
    stage: {
      currentStage: investigation.currentStage,
      lifecycleLane: investigation.lifecycleLane,
      modificationReadiness: investigation.modificationReadiness,
      recommendedStage: investigation.recommendedStage
    },
    scenarioCoverage: {
      scenarioCount: investigation.scenarioCount,
      readyForReconstructionCount: investigation.readyForReconstructionCount,
      blockedScenarioCount: investigation.blockedScenarioCount,
      countsByState: investigation.countsByState
    },
    runtimeCoverage: runtimeCoverage ? {
      entryCount: runtimeResourceMap.entryCount,
      localStaticEntryCount: runtimeCoverage.localStaticEntryCount,
      upstreamStaticEntryCount: runtimeCoverage.upstreamStaticEntryCount,
      overrideEntryCount: runtimeCoverage.overrideEntryCount,
      unresolvedUpstreamCount: runtimeCoverage.unresolvedUpstreamCount,
      stageCounts: runtimeCoverage.stageCounts
    } : null,
    donorScanCoverage: donorScan ? {
      runtimeCandidateCount: donorScan.runtimeCandidateCount,
      atlasManifestCount: donorScan.atlasManifestCount,
      requestBackedStaticHintCount: donorScan.requestBackedStaticHintCount,
      captureFamilyCount: donorScan.captureFamilyCount,
      familySourceProfileCount: donorScan.familySourceProfileCount,
      familyReconstructionProfileCount: donorScan.familyReconstructionProfileCount,
      familyReconstructionSectionCount: donorScan.familyReconstructionSectionCount,
      rawPayloadBlockedFamilyNames: donorScan.rawPayloadBlockedFamilyNames
    } : null,
    next: {
      nextCaptureProfile: investigation.nextCaptureProfile,
      nextOperatorAction: investigation.nextOperatorAction,
      nextManualAction: investigation.nextManualAction,
      nextScenarioTarget: nextTargets[0] ?? null
    },
    selfInvestigation: investigation.selfInvestigation,
    operatorAssist: investigation.operatorAssist,
    promotion: investigation.promotion,
    readyCandidates,
    modificationQueue
  };

  elements.investigationBrowser.innerHTML = `
    <div class="investigation-grid">
      <div class="detail-grid">
        <div class="detail-card">
          <span>Current Stage</span>
          <strong>${escapeHtml(labelizeStage(investigation.currentStage))}</strong>
          <small>${escapeHtml(labelizeStatus(investigation.lifecycleLane))}</small>
        </div>
        <div class="detail-card">
          <span>Static Scan</span>
          <strong>${escapeHtml(investigation.staticScanState)}</strong>
          <small>${investigation.scenarioCatalogPath ? `<code>${escapeHtml(investigation.scenarioCatalogPath)}</code>` : "No scenario catalog path yet."}</small>
        </div>
        <div class="detail-card">
          <span>Runtime Scan</span>
          <strong>${escapeHtml(investigation.runtimeScanState)}</strong>
          <small>${investigation.scenarioCaptureLogPath ? `<code>${escapeHtml(investigation.scenarioCaptureLogPath)}</code>` : "No scenario capture log yet."}</small>
        </div>
        <div class="detail-card">
          <span>Runtime Coverage</span>
          <strong>${escapeHtml(String(runtimeResourceMap?.entryCount ?? 0))} entries</strong>
          <small>${runtimeCoverage ? `${escapeHtml(String(runtimeCoverage.localStaticEntryCount))} local static · ${escapeHtml(String(runtimeCoverage.upstreamStaticEntryCount))} upstream static · ${escapeHtml(String(runtimeCoverage.overrideEntryCount))} overrides` : "Runtime resource coverage will appear after bounded investigation or manual runtime play."}</small>
        </div>
        <div class="detail-card">
          <span>Stage Handoff</span>
          <strong>${escapeHtml(labelizeStatus(investigation.modificationReadiness))}</strong>
          <small>Recommended stage: ${escapeHtml(labelizeStage(investigation.recommendedStage))}</small>
        </div>
        <div class="detail-card">
          <span>Promotion Queue</span>
          <strong>${escapeHtml(String(investigation.promotion.readyCandidateCount))} ready / ${escapeHtml(String(investigation.promotion.queuedItemCount))} queued</strong>
          <small>${escapeHtml(labelizeStatus(investigation.promotion.promotionReadiness))}</small>
        </div>
      </div>

      <div class="tree-row">
        <strong>Coverage Board</strong>
        <span>Bounded scenario coverage now separates what the IDE can promote into Modification from what must stay in Investigation.</span>
        <div class="chip-row">
          <span>${escapeHtml(String(investigation.scenarioCount))} scenario families</span>
          <span>${escapeHtml(String(investigation.readyForReconstructionCount))} ready for reconstruction</span>
          <span>${escapeHtml(String(investigation.blockedScenarioCount))} blocked</span>
          <span>${escapeHtml(String(counts["observed-in-runtime"] ?? 0))} observed in runtime</span>
          <span>${escapeHtml(String(counts["discovered-in-static-scan"] ?? 0))} discovered in static scan</span>
          <span>${escapeHtml(String(counts["source-material-sufficient"] ?? 0))} source-material sufficient</span>
          <span>${escapeHtml(String(counts["reconstruction-ready"] ?? 0))} reconstruction ready</span>
          <span>${escapeHtml(String(donorScan?.captureFamilyCount ?? 0))} donor families</span>
          <span>${escapeHtml(String(donorScan?.familyReconstructionSectionCount ?? 0))} grounded sections</span>
          <span>${escapeHtml(String(blockedRawFamilies.length))} raw blocker families</span>
        </div>
        <div class="evidence-actions">
          ${renderCopyButton(JSON.stringify(investigationSummaryPayload, null, 2), "investigation summary", "Copy Investigation Summary")}
          ${investigation.investigationStatusPath ? renderCopyButton(investigation.investigationStatusPath, "investigation status path", "Copy Status Path") : ""}
          ${investigation.scenarioBlockerSummaryPath ? renderCopyButton(investigation.scenarioBlockerSummaryPath, "scenario blocker summary path", "Copy Blocker Summary Path") : ""}
        </div>
      </div>

      <div class="tree-row">
        <strong>IDE Self-Investigation</strong>
        <span>${escapeHtml(investigation.selfInvestigation?.rationale ?? "No bounded self-investigation recommendation is available yet.")}</span>
        <div class="evidence-actions">
          ${selfInvestigationProfile && investigation.selfInvestigation?.canRunNextProfile ? `
            <button
              type="button"
              class="copy-button"
              data-donor-scan-action="run-scenario-profile"
              data-donor-scan-profile="${escapeAttribute(selfInvestigationProfile.profileId)}"
              data-donor-scan-minutes="${escapeAttribute(String(selfInvestigationProfile.minutes))}"
            >Run IDE Next Pass</button>
          ` : ""}
          ${investigationProfiles.map((profile) => `
            <button
              type="button"
              class="copy-button"
              data-donor-scan-action="run-scenario-profile"
              data-donor-scan-profile="${escapeAttribute(profile.profileId)}"
              data-donor-scan-minutes="${escapeAttribute(String(profile.minutes))}"
            >${escapeHtml(profile.label)}</button>
          `).join("")}
        </div>
        <small>${investigation.latestRun
          ? `Latest run · ${escapeHtml(investigation.latestRun.profileLabel)} · ${escapeHtml(String(investigation.latestRun.minutesRequested))} min · ${escapeHtml(String(investigation.latestRun.coverageDeltaCount))} coverage change(s)`
          : "No bounded profile has been recorded yet."}</small>
      </div>

      <div class="tree-row">
        <strong>Operator Assist</strong>
        <span>${escapeHtml(investigation.operatorAssist?.nextOperatorAction ?? investigation.nextOperatorAction)}</span>
        <div class="evidence-actions">
          ${operatorAssistProfile ? `
            <button
              type="button"
              class="copy-button"
              data-donor-scan-action="run-scenario-profile"
              data-donor-scan-profile="${escapeAttribute(operatorAssistProfile.profileId)}"
              data-donor-scan-minutes="${escapeAttribute(String(operatorAssistProfile.minutes))}"
            >Run ${escapeHtml(operatorAssistProfile.label)}</button>
          ` : ""}
          <button type="button" class="copy-button" data-runtime-action="launch">Launch Runtime</button>
          <button type="button" class="copy-button" data-runtime-action="enter">Advance Intro</button>
          <button type="button" class="copy-button" data-runtime-action="spin">Spin Once</button>
          <button
            type="button"
            class="copy-button"
            data-switch-workflow-panel="donor"
            data-switch-status="Donor panel is active again so you can review donor scan evidence, capture targets, and blocked families."
          >Open Donor Panel</button>
        </div>
        <small>${investigation.operatorAssist?.evidenceHints?.length > 0
          ? `Evidence hints · ${escapeHtml(investigation.operatorAssist.evidenceHints.join(", "))}`
          : "No specific evidence hint is leading the manual-assist queue yet."}</small>
      </div>

      <div class="tree-row">
        <strong>Promotion To Modification</strong>
        <span>${escapeHtml(investigation.promotion?.promotionReadiness ?? "not-ready")} · ${escapeHtml(String(investigation.promotion?.readyCandidateCount ?? 0))} ready candidate(s) · ${escapeHtml(String(investigation.promotion?.queuedItemCount ?? 0))} queued item(s)</span>
        <div class="evidence-actions">
          ${(investigation.promotion?.readyCandidateCount ?? 0) > 0 ? `
            <button
              type="button"
              class="copy-button"
              data-donor-scan-action="run-promotion-queue"
            >Promote Ready Families</button>
          ` : ""}
          ${(investigation.promotion?.queuedItemCount ?? 0) > 0 ? `
            <button
              type="button"
              class="copy-button"
              data-project-modification-action="prepare-handoff"
            >Prepare Modification Board</button>
          ` : ""}
          ${canMoveToModification ? `
            <button
              type="button"
              class="copy-button"
              data-switch-workbench-mode="scene"
              data-switch-workflow-panel="compose"
              data-switch-status="Compose Mode is active because Investigation has grounded ready families waiting for modification work."
            >Open Modification / Compose</button>
          ` : ""}
          ${investigation.promotion?.readyCandidatesPath ? renderCopyButton(investigation.promotion.readyCandidatesPath, "ready promotion candidates path", "Copy Ready Path") : ""}
          ${investigation.promotion?.modificationQueuePath ? renderCopyButton(investigation.promotion.modificationQueuePath, "modification queue path", "Copy Queue Path") : ""}
          ${modificationHandoff?.reportPath ? renderCopyButton(modificationHandoff.reportPath, "project modification handoff path", "Copy Handoff Path") : ""}
        </div>
        <small>${modificationHandoff
          ? `Prepared board · ${escapeHtml(modificationHandoff.handoffState)} · ${escapeHtml(String(modificationHandoff.readyTaskCount))} ready / ${escapeHtml(String(modificationHandoff.blockedTaskCount))} blocked${modificationHandoff.reportPath ? ` · ${escapeHtml(modificationHandoff.reportPath)}` : ""}`
          : (investigation.nextManualAction ? escapeHtml(investigation.nextManualAction) : "Blocked families stay in Investigation until more runtime evidence or source material is captured.")}</small>
      </div>

      <div class="tree-row">
        <strong>Top Scenario Coverage</strong>
        <span>These rows are the current honest scenario states, not screenshot guesses.</span>
        <div class="investigation-list">
          ${coverageRows.length > 0 ? coverageRows.map((scenario) => `
            <div class="investigation-row">
              <strong>${escapeHtml(scenario.displayName)} <code>${escapeHtml(scenario.state)}</code></strong>
              <small>lane · ${escapeHtml(labelizeStatus(scenario.lane))}${scenario.nextProfile ? ` · next profile ${escapeHtml(scenario.nextProfile)}` : ""}</small>
              <small>${escapeHtml(scenario.nextOperatorAction)}</small>
              <small>${scenario.blockerClasses.length > 0 ? `blockers · ${escapeHtml(scenario.blockerClasses.join(", "))}` : "blockers · none currently leading"}</small>
              <small>${scenario.matchedFamilyNames.length > 0 ? `matched families · ${escapeHtml(scenario.matchedFamilyNames.join(", "))}` : "matched families · none yet"}</small>
            </div>
          `).join("") : `<div class="investigation-row"><strong>No coverage rows</strong><small>Run a static scan or a bounded scenario profile to populate the board.</small></div>`}
        </div>
      </div>

      <div class="tree-row">
        <strong>Next Scenario Targets</strong>
        <span>These are the next bounded investigation targets, in order.</span>
        <div class="investigation-list">
          ${nextTargets.length > 0 ? nextTargets.map((scenario) => `
            <div class="investigation-row">
              <strong>${escapeHtml(scenario.displayName)} <code>${escapeHtml(scenario.state)}</code></strong>
              <small>lane · ${escapeHtml(labelizeStatus(scenario.lane))}${scenario.nextProfile ? ` · next profile ${escapeHtml(scenario.nextProfile)}` : ""}</small>
              <small>${escapeHtml(scenario.nextOperatorAction)}</small>
            </div>
          `).join("") : `<div class="investigation-row"><strong>No queued targets</strong><small>The current investigation state does not expose a next target yet.</small></div>`}
        </div>
      </div>

      <div class="tree-row">
        <strong>Ready For Modification</strong>
        <span>These candidates can leave Investigation and become explicit modification work items.</span>
        <div class="investigation-list">
          ${readyCandidates.length > 0 ? readyCandidates.map((candidate) => `
            <div class="investigation-row">
              <strong>${escapeHtml(candidate.displayName)} <code>${escapeHtml(candidate.promotionKind)}</code></strong>
              <small>${escapeHtml(candidate.familyName)}${candidate.sectionKey ? ` · ${escapeHtml(candidate.sectionKey)}` : ""} · ${escapeHtml(candidate.readinessState)}</small>
              <small>${escapeHtml(candidate.nextAction)}</small>
              <small>${candidate.sourceArtifactPath ? `source bundle · ${escapeHtml(candidate.sourceArtifactPath)}` : "source bundle · pending"}</small>
            </div>
          `).join("") : `<div class="investigation-row"><strong>No ready promotion candidates</strong><small>Families stay in Investigation until source material and runtime evidence are sufficient.</small></div>`}
        </div>
      </div>

      <div class="tree-row">
        <strong>Modification Queue</strong>
        <span>Promotion is explicit and reviewable. Queued items are ready to be worked in Modification / Compose.</span>
        <div class="investigation-list">
          ${modificationQueue.length > 0 ? modificationQueue.map((item) => `
            <div class="investigation-row">
              <strong>${escapeHtml(item.displayName)} <code>${escapeHtml(item.status)}</code></strong>
              <small>${escapeHtml(item.familyName)}${item.sectionKey ? ` · ${escapeHtml(item.sectionKey)}` : ""} · ${escapeHtml(item.promotionKind)}</small>
              <small>${item.sourceArtifactPath ? `source bundle · ${escapeHtml(item.sourceArtifactPath)}` : "source bundle · pending"}</small>
            </div>
          `).join("") : `<div class="investigation-row"><strong>No queued modification items</strong><small>Use Promote Ready Families when enough coverage and source material exist.</small></div>`}
        </div>
      </div>

      <div class="tree-row">
        <strong>Project Modification Board</strong>
        <span>${modificationHandoff
          ? "The project-facing handoff is prepared and turns promoted donor work into explicit compose/runtime tasks."
          : "Prepare the project modification board after promotion so Investigation hands off into concrete compose/runtime work."}</span>
        <div class="evidence-actions">
          ${(investigation.promotion?.queuedItemCount ?? 0) > 0 || modificationHandoff ? `
            <button
              type="button"
              class="copy-button"
              data-project-modification-action="prepare-handoff"
            >${modificationHandoff ? "Refresh Modification Board" : "Prepare Modification Board"}</button>
          ` : ""}
          ${modificationHandoff ? `
            <button
              type="button"
              class="copy-button"
              data-switch-workbench-mode="scene"
              data-switch-workflow-panel="compose"
              data-switch-status="Compose Mode is active so you can continue from the prepared modification task board."
            >Open Modification / Compose</button>
          ` : ""}
          ${modificationHandoff ? `
            <button
              type="button"
              class="copy-button"
              data-runtime-action="launch"
            >Open Runtime</button>
          ` : ""}
          ${modificationHandoff?.sourceQueuePath ? renderCopyButton(modificationHandoff.sourceQueuePath, "modification source queue path", "Copy Queue Source") : ""}
          ${modificationHandoff?.reportPath ? renderCopyButton(modificationHandoff.reportPath, "project modification handoff path", "Copy Report Path") : ""}
        </div>
        ${renderActiveProjectModificationTaskCard()}
        <div class="investigation-list">
          ${handoffTopTasks.length > 0
            ? handoffTopTasks.map((task) => renderProjectModificationTaskRow(task)).join("")
            : `<div class="investigation-row"><strong>No project-facing modification board yet</strong><small>Promote ready investigation items, then prepare the modification board to surface compose/runtime tasks here.</small></div>`}
        </div>
      </div>

      <div class="tree-row">
        <strong>Blocked Families</strong>
        <span>These donor families still need more source material or scenario evidence before they should move forward.</span>
        <div class="investigation-list">
          ${blockedRawFamilies.length > 0 ? blockedRawFamilies.map((familyName) => `
            <div class="investigation-row">
              <strong>${escapeHtml(familyName)}</strong>
              <small>raw donor payload blocker</small>
            </div>
          `).join("") : `<div class="investigation-row"><strong>No raw-only blocker family is currently leading the donor queue.</strong><small>Blocked scenario families are still visible above in coverage and next-target rows.</small></div>`}
        </div>
      </div>
    </div>
  `;
}

function renderProjectSummary() {
  if (!elements.projectSummary) {
    return;
  }

  const selectedProject = getSelectedProject();
  const editorData = state.editorData;

  if (!selectedProject) {
    elements.projectSummary.innerHTML = `<div class="tree-row"><strong>No Project</strong><span>Select a project to begin.</span></div>`;
    return;
  }

  const sceneSummary = editorData
    ? `${editorData.scene.displayName} · ${editorData.layers.length} layers · ${editorData.objects.length} objects`
    : "No editable scene slice yet.";
  const view = getViewportState();
  const viewSummary = `View ${Math.round(view.zoom * 100)}%${Math.abs(view.panX) > 0.001 || Math.abs(view.panY) > 0.001 ? ` pan ${Math.round(view.panX)}, ${Math.round(view.panY)}` : " default origin"}`;
  const editorStatusSummary = `${sceneSummary} · ${isSnapEnabled() ? `Snap ${getSnapSize()}px` : "Snap off"} · ${getSelectedLayerLabel()} · ${isLayerIsolationActive() ? `Solo ${getIsolatedLayer()?.displayName ?? "layer"}` : "No solo layer"} · ${viewSummary}`;
  const captureSessions = Array.isArray(selectedProject.donor?.captureSessions)
    ? selectedProject.donor.captureSessions
    : [];
  const evidenceRefs = Array.isArray(selectedProject.donor?.evidenceRefs)
    ? selectedProject.donor.evidenceRefs
    : [];
  const evidenceRoot = selectedProject.keyPaths?.evidenceRoot
    ?? selectedProject.donor?.evidenceRoot
    ?? "Not indexed";
  const captureSessionSummary = captureSessions.length > 0
    ? `${captureSessions.slice(0, 2).join(", ")}${captureSessions.length > 2 ? ` +${captureSessions.length - 2} more` : ""}`
    : "No capture sessions indexed yet.";
  const evidenceRefSummary = evidenceRefs.length > 0
    ? `${evidenceRefs.length} indexed evidence refs`
    : "No evidence refs indexed yet.";
  const runtimeLaunch = getRuntimeLaunchInfo();
  const donorScan = state.bundle?.donorScan ?? null;
  const investigation = state.bundle?.investigation ?? null;
  const modificationHandoff = getProjectModificationHandoff();
  const vabsStatusMarkup = renderVabsStatusSummary();
  const queuedModificationCount = typeof investigation?.promotion?.queuedItemCount === "number" ? investigation.promotion.queuedItemCount : 0;

  const lifecycleChips = lifecycleStageOrder.map((stageId) => {
    const stage = selectedProject.lifecycle?.stages?.[stageId];
    const status = stage?.status ?? "planned";
    const current = selectedProject.lifecycle?.currentStage === stageId;

    return `<span class="stage-chip stage-${status} ${current ? "is-current" : ""}" title="${stage?.notes ?? labelizeStage(stageId)}">${labelizeStage(stageId)}</span>`;
  }).join("");

  elements.projectSummary.innerHTML = `
    <div class="detail-grid">
      <div class="detail-card">
        <span>Project</span>
        <strong>${selectedProject.displayName}</strong>
        <small>${selectedProject.keyPaths.projectRoot}</small>
      </div>
      <div class="detail-card">
        <span>Donor</span>
        <strong>${selectedProject.donor.donorName}</strong>
        <small>${selectedProject.donor.donorId}</small>
      </div>
      <div class="detail-card">
        <span>Target / Resulting Game</span>
        <strong>${selectedProject.targetGame.displayName}</strong>
        <small>${selectedProject.targetGame.relationship}</small>
      </div>
      <div class="detail-card">
        <span>Current Mode</span>
        <strong>${escapeHtml(getWorkbenchModeLabel())} Mode</strong>
        <small>${state.workbenchMode === "runtime"
          ? `${runtimeLaunch?.entryUrl ? "Recorded donor runtime launch is ready." : "Runtime launch is currently blocked."} ${state.runtimeUi.launched ? "Embedded runtime has been launched in this session." : "Launch the donor runtime to begin."}`
          : editorStatusSummary}</small>
      </div>
      <div class="detail-card">
        <span>Primary Workflow</span>
        <strong>${runtimeLaunch?.entryUrl ? "Runtime-first donor workflow" : "Compose-first fallback"}</strong>
        <small>${runtimeLaunch?.entryUrl
          ? `Runtime Mode launches the recorded public donor runtime URL inside the shell. Compose Mode still edits <code>internal/scene.json</code>, <code>layers.json</code>, and <code>objects.json</code> as the bounded secondary workflow.`
          : "No grounded donor runtime entry is available in this build, so the shell falls back to the bounded internal scene workflow."}</small>
      </div>
      <div class="detail-card">
        <span>Donor Scan</span>
        <strong>${donorScan?.scanState ? escapeHtml(donorScan.scanState) : "unknown"}</strong>
        <small>${donorScan?.nextOperatorAction
          ? escapeHtml(donorScan.nextOperatorAction)
          : "Run donor scan to surface runtime candidates, atlas metadata, bundle asset-map status, and the next operator action."}</small>
        ${Array.isArray(donorScan?.nextCaptureTargets) && donorScan.nextCaptureTargets.length > 0 ? `
          <div class="detail-list">
            ${donorScan.nextCaptureTargets.slice(0, 2).map((target) => `<small><strong>${escapeHtml(target.priority)}</strong> · <code>${escapeHtml(target.relativePath || target.url)}</code>${target.alternateHintCount > 0 ? ` · ${escapeHtml(String(target.alternateHintCount))} grounded alternate${target.alternateHintCount === 1 ? "" : "s"}` : ""}${target.recentCaptureStatus === "blocked" ? ` · latest capture already failed` : ""}</small>`).join("")}
          </div>
        ` : ""}
        <div class="chip-row">
          <span>${typeof donorScan?.bundleImageVariantCount === "number" ? donorScan.bundleImageVariantCount : 0} bundle image entries</span>
          <span>${typeof donorScan?.bundleImageVariantSuffixCount === "number" ? donorScan.bundleImageVariantSuffixCount : 0} variant suffixes</span>
          <span>${typeof donorScan?.bundleImageVariantUrlCount === "number" ? donorScan.bundleImageVariantUrlCount : 0} grounded variant URLs</span>
          <span>bundle image URL rule: ${typeof donorScan?.bundleImageVariantUrlBuilderStatus === "string" ? escapeHtml(donorScan.bundleImageVariantUrlBuilderStatus) : "unknown"}</span>
          <span>${typeof donorScan?.translationPayloadCount === "number" ? donorScan.translationPayloadCount : 0} translation payloads</span>
          <span>translation payload rule: ${typeof donorScan?.translationPayloadStatus === "string" ? escapeHtml(donorScan.translationPayloadStatus) : "unknown"}</span>
          <span>${typeof donorScan?.requestBackedStaticHintCount === "number" ? donorScan.requestBackedStaticHintCount : 0} request-backed alternates</span>
          <span>${typeof donorScan?.recentlyBlockedCaptureTargetCount === "number" ? donorScan.recentlyBlockedCaptureTargetCount : 0} recently blocked</span>
          <span>${typeof donorScan?.captureFamilyCount === "number" ? donorScan.captureFamilyCount : 0} capture families</span>
          <span>${typeof donorScan?.familySourceProfileCount === "number" ? donorScan.familySourceProfileCount : 0} source profiles</span>
          <span>${typeof donorScan?.familyActionCount === "number" ? donorScan.familyActionCount : 0} family actions</span>
          <span>${typeof donorScan?.familyReconstructionProfileCount === "number" ? donorScan.familyReconstructionProfileCount : 0} reconstruction profiles</span>
          <span>${typeof donorScan?.familyReconstructionMapCount === "number" ? donorScan.familyReconstructionMapCount : 0} reconstruction maps</span>
          <span>${typeof donorScan?.familyReconstructionSectionCount === "number" ? donorScan.familyReconstructionSectionCount : 0} reconstruction sections</span>
          <span>${typeof donorScan?.sectionSkinTextureSourcePlanCount === "number" ? donorScan.sectionSkinTextureSourcePlanCount : 0} texture source plans</span>
          <span>${typeof donorScan?.sectionSkinTextureReconstructionBundleCount === "number" ? donorScan.sectionSkinTextureReconstructionBundleCount : 0} texture reconstruction bundles</span>
          <span>${typeof donorScan?.sectionSkinPageLockBundleCount === "number" ? donorScan.sectionSkinPageLockBundleCount : 0} page lock bundles</span>
          <span>${typeof donorScan?.sectionSkinPageLockAuditBundleCount === "number" ? donorScan.sectionSkinPageLockAuditBundleCount : 0} page-lock audits</span>
          <span>${typeof donorScan?.sectionSkinPageLockResolutionBundleCount === "number" ? donorScan.sectionSkinPageLockResolutionBundleCount : 0} page-lock resolutions</span>
          <span>${typeof donorScan?.sectionSkinPageLockDecisionBundleCount === "number" ? donorScan.sectionSkinPageLockDecisionBundleCount : 0} page-lock decisions</span>
          <span>${typeof donorScan?.sectionSkinPageLockReviewBundleCount === "number" ? donorScan.sectionSkinPageLockReviewBundleCount : 0} page-lock reviews</span>
          <span>${typeof donorScan?.sectionSkinPageLockApprovalBundleCount === "number" ? donorScan.sectionSkinPageLockApprovalBundleCount : 0} page-lock approvals</span>
          <span>${typeof donorScan?.sectionSkinPageLockApplyBundleCount === "number" ? donorScan.sectionSkinPageLockApplyBundleCount : 0} page-lock applies</span>
          <span>${typeof donorScan?.sectionSkinTextureLockBundleCount === "number" ? donorScan.sectionSkinTextureLockBundleCount : 0} texture lock bundles</span>
          <span>${typeof donorScan?.sectionSkinTextureAssemblyBundleCount === "number" ? donorScan.sectionSkinTextureAssemblyBundleCount : 0} texture assembly bundles</span>
          <span>${typeof donorScan?.sectionSkinTextureRenderBundleCount === "number" ? donorScan.sectionSkinTextureRenderBundleCount : 0} texture render bundles</span>
          <span>${typeof donorScan?.sectionSkinTextureCanvasBundleCount === "number" ? donorScan.sectionSkinTextureCanvasBundleCount : 0} texture canvas bundles</span>
          <span>${typeof donorScan?.sectionSkinTextureSourceFitBundleCount === "number" ? donorScan.sectionSkinTextureSourceFitBundleCount : 0} texture source-fit bundles</span>
          <span>${typeof donorScan?.sectionSkinTextureFitReviewBundleCount === "number" ? donorScan.sectionSkinTextureFitReviewBundleCount : 0} texture fit-review bundles</span>
          <span>${typeof donorScan?.sectionSkinTextureFitDecisionBundleCount === "number" ? donorScan.sectionSkinTextureFitDecisionBundleCount : 0} texture fit-decision bundles</span>
          <span>${typeof donorScan?.sectionSkinTextureFitApprovalBundleCount === "number" ? donorScan.sectionSkinTextureFitApprovalBundleCount : 0} texture fit-approval bundles</span>
          <span>${typeof donorScan?.sectionSkinTextureFitApplyBundleCount === "number" ? donorScan.sectionSkinTextureFitApplyBundleCount : 0} texture fit-apply bundles</span>
          <span>${typeof donorScan?.sectionSkinTextureInputBundleCount === "number" ? donorScan.sectionSkinTextureInputBundleCount : 0} texture input bundles</span>
          <span>${typeof donorScan?.rawPayloadBlockedCaptureTargetCount === "number" ? donorScan.rawPayloadBlockedCaptureTargetCount : 0} raw-payload blocked</span>
          <span>${typeof donorScan?.rawPayloadBlockedFamilyCount === "number" ? donorScan.rawPayloadBlockedFamilyCount : 0} blocker families</span>
          <span>${typeof donorScan?.nextCaptureTargetCount === "number" ? donorScan.nextCaptureTargetCount : 0} next capture targets</span>
          <span>${typeof donorScan?.captureRunStatus === "string" ? escapeHtml(donorScan.captureRunStatus) : "idle"} ${donorScan?.captureRunMode === "family-sources" ? "family source capture" : "guided capture"}${typeof donorScan?.captureRunRequestedFamily === "string" && donorScan.captureRunRequestedFamily.length > 0 ? ` (${escapeHtml(donorScan.captureRunRequestedFamily)})` : ""}</span>
          <span>${typeof donorScan?.captureDownloadedCount === "number" ? donorScan.captureDownloadedCount : 0} downloaded last run</span>
          <span>${typeof donorScan?.familyActionRunStatus === "string" ? escapeHtml(donorScan.familyActionRunStatus) : "idle"} family action${typeof donorScan?.familyActionRunFamily === "string" && donorScan.familyActionRunFamily.length > 0 ? ` (${escapeHtml(donorScan.familyActionRunFamily)})` : ""}</span>
        </div>
        ${donorScan?.familyActionRunStatus ? `
          <div class="detail-list">
            <small><strong>Latest family action</strong> · ${escapeHtml(donorScan.familyActionRunStatus)} · ${escapeHtml(donorScan.familyActionRunMode || "unknown")}${donorScan.familyActionWorksetPath ? ` · workset <code>${escapeHtml(donorScan.familyActionWorksetPath)}</code>` : ""}${donorScan.familyActionReconstructionBundlePath ? ` · bundle <code>${escapeHtml(donorScan.familyActionReconstructionBundlePath)}</code>` : ""}${donorScan.familyActionPreparedEvidenceCount > 0 ? ` · ${escapeHtml(String(donorScan.familyActionPreparedEvidenceCount))} prepared evidence item${donorScan.familyActionPreparedEvidenceCount === 1 ? "" : "s"}` : ""}${donorScan.familyActionReconstructionLocalSourceCount > 0 ? ` · ${escapeHtml(String(donorScan.familyActionReconstructionLocalSourceCount))} grounded local source${donorScan.familyActionReconstructionLocalSourceCount === 1 ? "" : "s"}` : ""}</small>
          </div>
        ` : ""}
        ${donorScan?.sectionActionRunStatus ? `
          <div class="detail-list">
            <small><strong>Latest section action</strong> · ${escapeHtml(donorScan.sectionActionRunStatus)} · ${escapeHtml(donorScan.sectionActionRunMode || "unknown")}${donorScan.sectionActionRunSectionKey ? ` · ${escapeHtml(donorScan.sectionActionRunSectionKey)}` : ""}${donorScan.sectionActionWorksetPath ? ` · workset <code>${escapeHtml(donorScan.sectionActionWorksetPath)}</code>` : ""}${donorScan.sectionActionReconstructionBundlePath ? ` · bundle <code>${escapeHtml(donorScan.sectionActionReconstructionBundlePath)}</code>` : ""}${donorScan.sectionActionSkinBlueprintPath ? ` · blueprint <code>${escapeHtml(donorScan.sectionActionSkinBlueprintPath)}</code>` : ""}${donorScan.sectionActionSkinRenderPlanPath ? ` · render plan <code>${escapeHtml(donorScan.sectionActionSkinRenderPlanPath)}</code>` : ""}${donorScan.sectionActionSkinMaterialPlanPath ? ` · material plan <code>${escapeHtml(donorScan.sectionActionSkinMaterialPlanPath)}</code>` : ""}${donorScan.sectionActionSkinMaterialReviewBundlePath ? ` · material review <code>${escapeHtml(donorScan.sectionActionSkinMaterialReviewBundlePath)}</code>` : ""}${donorScan.sectionActionSkinPageMatchBundlePath ? ` · page match <code>${escapeHtml(donorScan.sectionActionSkinPageMatchBundlePath)}</code>` : ""}${donorScan.sectionActionSkinPageLockBundlePath ? ` · page lock <code>${escapeHtml(donorScan.sectionActionSkinPageLockBundlePath)}</code>` : ""}${donorScan.sectionActionSkinPageLockAuditBundlePath ? ` · page lock audit <code>${escapeHtml(donorScan.sectionActionSkinPageLockAuditBundlePath)}</code>` : ""}${donorScan.sectionActionSkinPageLockResolutionBundlePath ? ` · page lock resolution <code>${escapeHtml(donorScan.sectionActionSkinPageLockResolutionBundlePath)}</code>` : ""}${donorScan.sectionActionSkinPageLockDecisionBundlePath ? ` · page lock decision <code>${escapeHtml(donorScan.sectionActionSkinPageLockDecisionBundlePath)}</code>` : ""}${donorScan.sectionActionSkinPageLockReviewBundlePath ? ` · page lock review <code>${escapeHtml(donorScan.sectionActionSkinPageLockReviewBundlePath)}</code>` : ""}${donorScan.sectionActionSkinPageLockApprovalBundlePath ? ` · page lock approval <code>${escapeHtml(donorScan.sectionActionSkinPageLockApprovalBundlePath)}</code>` : ""}${donorScan.sectionActionSkinPageLockApplyBundlePath ? ` · page lock apply <code>${escapeHtml(donorScan.sectionActionSkinPageLockApplyBundlePath)}</code>` : ""}${donorScan.sectionActionSkinTextureInputBundlePath ? ` · texture input <code>${escapeHtml(donorScan.sectionActionSkinTextureInputBundlePath)}</code>` : ""}${donorScan.sectionActionSkinTextureSourcePlanPath ? ` · texture sources <code>${escapeHtml(donorScan.sectionActionSkinTextureSourcePlanPath)}</code>` : ""}${donorScan.sectionActionSkinTextureReconstructionBundlePath ? ` · texture reconstruction <code>${escapeHtml(donorScan.sectionActionSkinTextureReconstructionBundlePath)}</code>` : ""}${donorScan.sectionActionSkinTextureLockBundlePath ? ` · texture lock <code>${escapeHtml(donorScan.sectionActionSkinTextureLockBundlePath)}</code>` : ""}${donorScan.sectionActionSkinTextureAssemblyBundlePath ? ` · texture assembly <code>${escapeHtml(donorScan.sectionActionSkinTextureAssemblyBundlePath)}</code>` : ""}${donorScan.sectionActionSkinTextureRenderBundlePath ? ` · texture render <code>${escapeHtml(donorScan.sectionActionSkinTextureRenderBundlePath)}</code>` : ""}${donorScan.sectionActionSkinTextureCanvasBundlePath ? ` · texture canvas <code>${escapeHtml(donorScan.sectionActionSkinTextureCanvasBundlePath)}</code>` : ""}${donorScan.sectionActionSkinTextureSourceFitBundlePath ? ` · texture source fit <code>${escapeHtml(donorScan.sectionActionSkinTextureSourceFitBundlePath)}</code>` : ""}${donorScan.sectionActionSkinTextureFitReviewBundlePath ? ` · texture fit review <code>${escapeHtml(donorScan.sectionActionSkinTextureFitReviewBundlePath)}</code>` : ""}${donorScan.sectionActionSkinTextureFitDecisionBundlePath ? ` · texture fit decision <code>${escapeHtml(donorScan.sectionActionSkinTextureFitDecisionBundlePath)}</code>` : ""}${donorScan.sectionActionSkinTextureFitApprovalBundlePath ? ` · texture fit approval <code>${escapeHtml(donorScan.sectionActionSkinTextureFitApprovalBundlePath)}</code>` : ""}${donorScan.sectionActionSkinTextureFitApplyBundlePath ? ` · texture fit apply <code>${escapeHtml(donorScan.sectionActionSkinTextureFitApplyBundlePath)}</code>` : ""}${donorScan.sectionActionMappedAttachmentCount > 0 ? ` · ${escapeHtml(String(donorScan.sectionActionMappedAttachmentCount))} mapped attachment${donorScan.sectionActionMappedAttachmentCount === 1 ? "" : "s"}` : ""}${donorScan.sectionActionExactLocalSourceCount > 0 ? ` · ${escapeHtml(String(donorScan.sectionActionExactLocalSourceCount))} grounded local source${donorScan.sectionActionExactLocalSourceCount === 1 ? "" : "s"}` : ""}</small>
          </div>
        ` : ""}
        ${Array.isArray(donorScan?.topCaptureFamilies) && donorScan.topCaptureFamilies.length > 0 ? `
          <div class="detail-list">
            <small><strong>Capture by family</strong></small>
            <div class="evidence-actions">
              ${donorScan.topCaptureFamilies.map((family) => `
                <button
                  type="button"
                  class="copy-button"
                  data-donor-scan-action="capture-next"
                  data-donor-scan-capture-limit="10"
                  data-donor-scan-capture-family="${escapeAttribute(family.familyName)}"
                >${escapeHtml(family.familyName)} (${escapeHtml(String(family.untriedTargetCount))} open${family.blockedTargetCount > 0 ? `, ${escapeHtml(String(family.blockedTargetCount))} blocked` : ""})</button>
              `).join("")}
            </div>
          </div>
        ` : ""}
        ${Array.isArray(donorScan?.topFamilySourceProfiles) && donorScan.topFamilySourceProfiles.length > 0 ? `
          <div class="detail-list">
            <small><strong>Family source discovery</strong></small>
            ${donorScan.topFamilySourceProfiles.map((family) => `
              <small><strong>${escapeHtml(family.familyName)}</strong> · ${escapeHtml(family.sourceState)} · atlas ${escapeHtml(String(family.localPageCount))}/${escapeHtml(String(family.atlasPageRefCount))} local pages · ${escapeHtml(String(family.sameFamilyBundleReferenceCount))} same-family bundle ref${family.sameFamilyBundleReferenceCount === 1 ? "" : "s"} · ${escapeHtml(String(family.sameFamilyVariantAssetCount))} same-family variant asset${family.sameFamilyVariantAssetCount === 1 ? "" : "s"} · ${escapeHtml(String((family.localSameFamilyBundleReferenceCount || 0) + (family.localSameFamilyVariantAssetCount || 0) + (family.localRelatedBundleAssetCount || 0) + (family.localRelatedVariantAssetCount || 0)))} captured local source${((family.localSameFamilyBundleReferenceCount || 0) + (family.localSameFamilyVariantAssetCount || 0) + (family.localRelatedBundleAssetCount || 0) + (family.localRelatedVariantAssetCount || 0)) === 1 ? "" : "s"} · ${escapeHtml(family.nextStep)}</small>
              <div class="evidence-actions">
                <button
                  type="button"
                  class="copy-button"
                  data-donor-scan-action="capture-next"
                  data-donor-scan-capture-mode="family-sources"
                  data-donor-scan-capture-limit="10"
                  data-donor-scan-capture-family="${escapeAttribute(family.familyName)}"
                >Capture ${escapeHtml(family.familyName)} sources</button>
              </div>
              ${(() => {
                const evidenceValue = family.sampleMissingPageUrl
                  ?? family.sampleBlockedTargetUrl
                  ?? family.sampleUntriedTargetUrl
                  ?? family.sampleLocalSourceAssetPath
                  ?? family.sampleVariantAsset
                  ?? family.sampleBundleReference
                  ?? family.sampleLocalPagePath;
                const evidenceLabel = family.sampleMissingPageUrl
                  ? "missing page"
                  : family.sampleBlockedTargetUrl
                    ? "blocked target"
                    : family.sampleUntriedTargetUrl
                      ? "next target"
                      : family.sampleLocalSourceAssetPath
                        ? "local source"
                      : family.sampleVariantAsset
                        ? "variant hint"
                        : family.sampleBundleReference
                          ? "bundle hint"
                          : family.sampleLocalPagePath
                            ? "local page"
                            : "";
                return evidenceValue
                  ? `<small>evidence · ${escapeHtml(evidenceLabel)} · <code>${escapeHtml(evidenceValue)}</code>${family.rawPayloadBlockedReason ? ` · ${escapeHtml(family.rawPayloadBlockedReason)}` : ""}</small>`
                  : "";
              })()}
            `).join("")}
          </div>
        ` : ""}
        ${Array.isArray(donorScan?.topFamilyActions) && donorScan.topFamilyActions.length > 0 ? `
          <div class="detail-list">
            <small><strong>Family action queue</strong></small>
            ${donorScan.topFamilyActions.map((family) => `
              <small><strong>${escapeHtml(family.familyName)}</strong> · ${escapeHtml(family.actionClass)} · ${escapeHtml(family.priority)} priority${family.localSourceAssetCount > 0 ? ` · ${escapeHtml(String(family.localSourceAssetCount))} local source${family.localSourceAssetCount === 1 ? "" : "s"}` : ""} · ${escapeHtml(family.reason)}</small>
              ${family.sampleEvidence ? `<small>evidence · <code>${escapeHtml(family.sampleEvidence)}</code></small>` : ""}
              <small>${escapeHtml(family.nextStep)}</small>
              <div class="evidence-actions">
                <button
                  type="button"
                  class="copy-button"
                  data-donor-scan-action="run-family-action"
                  data-donor-scan-capture-limit="10"
                  data-donor-scan-capture-family="${escapeAttribute(family.familyName)}"
                >${escapeHtml(
                  family.actionClass === "capture-family-sources"
                    ? `Capture ${family.familyName} sources`
                    : family.actionClass === "capture-missing-pages"
                      ? `Capture ${family.familyName} pages`
                      : family.actionClass === "use-local-sources"
                        ? `Prepare ${family.familyName} bundle`
                        : `Prepare ${family.familyName} workset`
                )}</button>
              </div>
            `).join("")}
          </div>
        ` : ""}
        ${Array.isArray(donorScan?.topFamilyReconstructionProfiles) && donorScan.topFamilyReconstructionProfiles.length > 0 ? `
          <div class="detail-list">
            <small><strong>Reconstruction-ready families</strong></small>
            ${donorScan.topFamilyReconstructionProfiles.map((family) => `
              <small><strong>${escapeHtml(family.familyName)}</strong> · ${escapeHtml(family.profileState)} · ${escapeHtml(family.readiness)} · ${escapeHtml(String(family.exactLocalSourceCount))} exact local source${family.exactLocalSourceCount === 1 ? "" : "s"}${family.relatedLocalSourceCount > 0 ? ` · ${escapeHtml(String(family.relatedLocalSourceCount))} related local source${family.relatedLocalSourceCount === 1 ? "" : "s"}` : ""}${family.atlasPageCount > 0 ? ` · ${escapeHtml(String(family.atlasPageCount))} atlas page${family.atlasPageCount === 1 ? "" : "s"}` : ""}${family.atlasRegionCount > 0 ? ` · ${escapeHtml(String(family.atlasRegionCount))} atlas region${family.atlasRegionCount === 1 ? "" : "s"}` : ""}${family.spineAnimationCount > 0 ? ` · ${escapeHtml(String(family.spineAnimationCount))} animation${family.spineAnimationCount === 1 ? "" : "s"}` : ""}${family.looseImageCount > 0 ? ` · ${escapeHtml(String(family.looseImageCount))} loose image${family.looseImageCount === 1 ? "" : "s"}` : ""}</small>
              <small>${escapeHtml(family.nextReconstructionStep)}</small>
              <small>bundle · <code>${escapeHtml(family.reconstructionBundlePath)}</code>${family.sampleLocalSourcePath ? ` · local source <code>${escapeHtml(family.sampleLocalSourcePath)}</code>` : ""}</small>
            `).join("")}
          </div>
        ` : ""}
        ${Array.isArray(donorScan?.topFamilyReconstructionMaps) && donorScan.topFamilyReconstructionMaps.length > 0 ? `
          <div class="detail-list">
            <small><strong>Reconstruction coverage</strong></small>
            ${donorScan.topFamilyReconstructionMaps.map((family) => `
              <small><strong>${escapeHtml(family.familyName)}</strong> · ${escapeHtml(family.profileState)} · ${escapeHtml(family.readiness)} · ${escapeHtml(String(family.mappedAttachmentCount))}/${escapeHtml(String(family.spineAttachmentCount))} mapped attachments${family.unmappedAttachmentCount > 0 ? ` · ${escapeHtml(String(family.unmappedAttachmentCount))} unmapped` : ""}${family.atlasPageCount > 0 ? ` · ${escapeHtml(String(family.atlasPageCount))} atlas page${family.atlasPageCount === 1 ? "" : "s"}` : ""}${family.atlasRegionCount > 0 ? ` · ${escapeHtml(String(family.atlasRegionCount))} atlas region${family.atlasRegionCount === 1 ? "" : "s"}` : ""}</small>
              <small>${escapeHtml(family.nextReconstructionStep)}</small>
              <small>bundle · <code>${escapeHtml(family.reconstructionBundlePath)}</code>${family.sampleLocalSourcePath ? ` · local source <code>${escapeHtml(family.sampleLocalSourcePath)}</code>` : ""}</small>
            `).join("")}
          </div>
        ` : ""}
        ${Array.isArray(donorScan?.topFamilyReconstructionSections) && donorScan.topFamilyReconstructionSections.length > 0 ? `
          <div class="detail-list">
            <small><strong>Reconstruction sections</strong></small>
            ${donorScan.topFamilyReconstructionSections.map((section) => `
              <small><strong>${escapeHtml(section.sectionKey)}</strong> · ${escapeHtml(section.sectionState)} · ${escapeHtml(section.bundleState ?? "unknown")} · ${escapeHtml(String(section.mappedAttachmentCount))}/${escapeHtml(String(section.attachmentCount))} mapped attachments${section.unmappedAttachmentCount > 0 ? ` · ${escapeHtml(String(section.unmappedAttachmentCount))} unmapped` : ""}${section.atlasPageCount > 0 ? ` · ${escapeHtml(String(section.atlasPageCount))} atlas page${section.atlasPageCount === 1 ? "" : "s"}` : ""}${section.exactLocalSourceCount > 0 ? ` · ${escapeHtml(String(section.exactLocalSourceCount))} local source${section.exactLocalSourceCount === 1 ? "" : "s"}` : ""}</small>
              <small>${escapeHtml(section.nextSectionStep)}</small>
              <small>${section.sectionBundlePath ? `bundle · <code>${escapeHtml(section.sectionBundlePath)}</code>${section.sampleLocalSourcePath ? " · " : ""}` : ""}${section.sampleLocalSourcePath ? `local source · <code>${escapeHtml(section.sampleLocalSourcePath)}</code>` : ""}</small>
              <div class="evidence-actions">
                <button
                  type="button"
                  class="copy-button"
                  data-donor-scan-action="run-section-action"
                  data-donor-scan-section-key="${escapeHtml(section.sectionKey)}"
                  ${section.bundleState === "ready-with-grounded-attachments" ? "" : "disabled"}
                >Prepare Section</button>
              </div>
            `).join("")}
          </div>
        ` : ""}
        ${Array.isArray(donorScan?.topSectionReconstructionProfiles) && donorScan.topSectionReconstructionProfiles.length > 0 ? `
          <div class="detail-list">
            <small><strong>Prepared section reconstruction bundles</strong></small>
            ${donorScan.topSectionReconstructionProfiles.map((section) => `
              <small><strong>${escapeHtml(section.sectionKey)}</strong> · ${escapeHtml(section.reconstructionState)} · ${escapeHtml(String(section.mappedAttachmentCount))}/${escapeHtml(String(section.attachmentCount))} mapped attachments${section.atlasPageCount > 0 ? ` · ${escapeHtml(String(section.atlasPageCount))} atlas page${section.atlasPageCount === 1 ? "" : "s"}` : ""}${section.exactLocalSourceCount > 0 ? ` · ${escapeHtml(String(section.exactLocalSourceCount))} local source${section.exactLocalSourceCount === 1 ? "" : "s"}` : ""}</small>
              <small>${escapeHtml(section.nextReconstructionStep)}</small>
              <small>bundle · <code>${escapeHtml(section.reconstructionBundlePath)}</code>${section.sampleLocalSourcePath ? ` · local source <code>${escapeHtml(section.sampleLocalSourcePath)}</code>` : ""}</small>
            `).join("")}
          </div>
        ` : ""}
        ${Array.isArray(donorScan?.topSectionSkinBlueprintProfiles) && donorScan.topSectionSkinBlueprintProfiles.length > 0 ? `
          <div class="detail-list">
            <small><strong>Prepared section skin blueprints</strong></small>
            ${donorScan.topSectionSkinBlueprintProfiles.map((section) => `
              <small><strong>${escapeHtml(section.sectionKey)}</strong> · ${escapeHtml(section.blueprintState)} · ${escapeHtml(String(section.slotCount))} slot${section.slotCount === 1 ? "" : "s"} · ${escapeHtml(String(section.mappedAttachmentCount))}/${escapeHtml(String(section.attachmentCount))} mapped attachments${section.atlasPageCount > 0 ? ` · ${escapeHtml(String(section.atlasPageCount))} atlas page${section.atlasPageCount === 1 ? "" : "s"}` : ""}${section.exactLocalSourceCount > 0 ? ` · ${escapeHtml(String(section.exactLocalSourceCount))} local source${section.exactLocalSourceCount === 1 ? "" : "s"}` : ""}</small>
              <small>${escapeHtml(section.nextSkinStep)}</small>
              <small>blueprint · <code>${escapeHtml(section.blueprintPath)}</code>${section.sampleLocalSourcePath ? ` · local source <code>${escapeHtml(section.sampleLocalSourcePath)}</code>` : ""}</small>
            `).join("")}
          </div>
        ` : ""}
        ${Array.isArray(donorScan?.topSectionSkinRenderPlanProfiles) && donorScan.topSectionSkinRenderPlanProfiles.length > 0 ? `
          <div class="detail-list">
            <small><strong>Prepared section skin render plans</strong></small>
            ${donorScan.topSectionSkinRenderPlanProfiles.map((section) => `
              <small><strong>${escapeHtml(section.sectionKey)}</strong> · ${escapeHtml(section.renderState)} · ${escapeHtml(String(section.mappedLayerCount))}/${escapeHtml(String(section.layerCount))} mapped layer${section.layerCount === 1 ? "" : "s"}${section.unmappedLayerCount > 0 ? ` · ${escapeHtml(String(section.unmappedLayerCount))} unmapped` : ""}${section.atlasPageCount > 0 ? ` · ${escapeHtml(String(section.atlasPageCount))} atlas page${section.atlasPageCount === 1 ? "" : "s"}` : ""}${section.exactLocalSourceCount > 0 ? ` · ${escapeHtml(String(section.exactLocalSourceCount))} local source${section.exactLocalSourceCount === 1 ? "" : "s"}` : ""}</small>
              <small>${escapeHtml(section.nextRenderStep)}</small>
              <small>render plan · <code>${escapeHtml(section.renderPlanPath)}</code>${section.atlasSourcePath ? ` · atlas <code>${escapeHtml(section.atlasSourcePath)}</code>` : ""}${section.sampleLocalSourcePath ? ` · local source <code>${escapeHtml(section.sampleLocalSourcePath)}</code>` : ""}</small>
            `).join("")}
          </div>
        ` : ""}
        ${Array.isArray(donorScan?.topSectionSkinMaterialPlanProfiles) && donorScan.topSectionSkinMaterialPlanProfiles.length > 0 ? `
          <div class="detail-list">
            <small><strong>Prepared section skin material plans</strong></small>
            ${donorScan.topSectionSkinMaterialPlanProfiles.map((section) => `
              <small><strong>${escapeHtml(section.sectionKey)}</strong> · ${escapeHtml(section.materialState)} · ${escapeHtml(String(section.exactPageImageCount))}/${escapeHtml(String(section.pageCount))} exact page image${section.pageCount === 1 ? "" : "s"}${section.missingPageImageCount > 0 ? ` · ${escapeHtml(String(section.missingPageImageCount))} missing` : ""}${section.pageCandidateReadyCount > 0 ? ` · ${escapeHtml(String(section.pageCandidateReadyCount))} page${section.pageCandidateReadyCount === 1 ? "" : "s"} with ranked candidates` : ""}${section.relatedImageCandidateCount > 0 ? ` · ${escapeHtml(String(section.relatedImageCandidateCount))} related image candidate${section.relatedImageCandidateCount === 1 ? "" : "s"}` : ""}</small>
              <small>${escapeHtml(section.nextMaterialStep)}</small>
              <small>material plan · <code>${escapeHtml(section.materialPlanPath)}</code>${section.topCandidateLocalPath ? ` · top candidate <code>${escapeHtml(section.topCandidateLocalPath)}</code>` : ""}${section.atlasSourcePath ? ` · atlas <code>${escapeHtml(section.atlasSourcePath)}</code>` : ""}${section.sampleLocalSourcePath ? ` · local source <code>${escapeHtml(section.sampleLocalSourcePath)}</code>` : ""}</small>
            `).join("")}
          </div>
        ` : ""}
        ${Array.isArray(donorScan?.topSectionSkinMaterialReviewBundleProfiles) && donorScan.topSectionSkinMaterialReviewBundleProfiles.length > 0 ? `
          <div class="detail-list">
            <small><strong>Prepared section skin material review bundles</strong></small>
            ${donorScan.topSectionSkinMaterialReviewBundleProfiles.map((section) => `
              <small><strong>${escapeHtml(section.sectionKey)}</strong> · ${escapeHtml(section.reviewState)} · ${escapeHtml(String(section.reviewReadyPageCount))}/${escapeHtml(String(section.pageCount))} review-ready page${section.pageCount === 1 ? "" : "s"}${section.blockedPageCount > 0 ? ` · ${escapeHtml(String(section.blockedPageCount))} blocked` : ""}${section.exactPageImageCount > 0 ? ` · ${escapeHtml(String(section.exactPageImageCount))} exact` : ""}</small>
              <small>${escapeHtml(section.nextReviewStep)}</small>
              <small>material review · <code>${escapeHtml(section.reviewBundlePath)}</code>${section.topCandidateLocalPath ? ` · top candidate <code>${escapeHtml(section.topCandidateLocalPath)}</code>` : ""}${section.atlasSourcePath ? ` · atlas <code>${escapeHtml(section.atlasSourcePath)}</code>` : ""}${section.sampleLocalSourcePath ? ` · local source <code>${escapeHtml(section.sampleLocalSourcePath)}</code>` : ""}</small>
            `).join("")}
          </div>
        ` : ""}
        ${Array.isArray(donorScan?.topSectionSkinPageMatchBundleProfiles) && donorScan.topSectionSkinPageMatchBundleProfiles.length > 0 ? `
          <div class="detail-list">
            <small><strong>Prepared section skin page-match bundles</strong></small>
            ${donorScan.topSectionSkinPageMatchBundleProfiles.map((section) => `
              <small><strong>${escapeHtml(section.sectionKey)}</strong> · ${escapeHtml(section.matchState)} · ${escapeHtml(String(section.proposedMatchCount))}/${escapeHtml(String(section.pageCount))} proposed match${section.pageCount === 1 ? "" : "es"}${section.blockedPageCount > 0 ? ` · ${escapeHtml(String(section.blockedPageCount))} blocked` : ""}${section.exactPageImageCount > 0 ? ` · ${escapeHtml(String(section.exactPageImageCount))} exact` : ""}</small>
              <small>${escapeHtml(section.nextMatchStep)}</small>
              <small>page match · <code>${escapeHtml(section.pageMatchBundlePath)}</code>${section.topProposedMatchLocalPath ? ` · top proposed <code>${escapeHtml(section.topProposedMatchLocalPath)}</code>` : ""}${section.atlasSourcePath ? ` · atlas <code>${escapeHtml(section.atlasSourcePath)}</code>` : ""}${section.sampleLocalSourcePath ? ` · local source <code>${escapeHtml(section.sampleLocalSourcePath)}</code>` : ""}</small>
            `).join("")}
          </div>
        ` : ""}
        ${Array.isArray(donorScan?.topSectionSkinPageLockBundleProfiles) && donorScan.topSectionSkinPageLockBundleProfiles.length > 0 ? `
          <div class="detail-list">
            <small><strong>Prepared section skin page-lock bundles</strong></small>
            ${donorScan.topSectionSkinPageLockBundleProfiles.map((section) => `
              <small><strong>${escapeHtml(section.sectionKey)}</strong> · ${escapeHtml(section.pageLockState)} · ${escapeHtml(String(section.exactPageLockCount))}/${escapeHtml(String(section.pageCount))} exact page lock${section.pageCount === 1 ? "" : "s"}${section.proposedPageLockCount > 0 ? ` · ${escapeHtml(String(section.proposedPageLockCount))} proposed` : ""}${section.missingPageLockCount > 0 ? ` · ${escapeHtml(String(section.missingPageLockCount))} missing` : ""}${section.blockedLayerCount > 0 ? ` · ${escapeHtml(String(section.blockedLayerCount))} blocked layer${section.blockedLayerCount === 1 ? "" : "s"}` : ""}</small>
              <small>${escapeHtml(section.nextPageLockStep)}</small>
              <small>page lock · <code>${escapeHtml(section.pageLockBundlePath)}</code>${section.topLockedLocalPath ? ` · top locked <code>${escapeHtml(section.topLockedLocalPath)}</code>` : ""}${section.atlasSourcePath ? ` · atlas <code>${escapeHtml(section.atlasSourcePath)}</code>` : ""}${section.sampleLocalSourcePath ? ` · local source <code>${escapeHtml(section.sampleLocalSourcePath)}</code>` : ""}</small>
            `).join("")}
          </div>
        ` : ""}
        ${Array.isArray(donorScan?.topSectionSkinPageLockAuditBundleProfiles) && donorScan.topSectionSkinPageLockAuditBundleProfiles.length > 0 ? `
          <div class="detail-list">
            <small><strong>Prepared section skin page-lock audit bundles</strong></small>
            ${donorScan.topSectionSkinPageLockAuditBundleProfiles.map((section) => `
              <small><strong>${escapeHtml(section.sectionKey)}</strong> · ${escapeHtml(section.pageLockAuditState)} · ${escapeHtml(String(section.uniqueSelectedLocalPathCount))} unique source${section.uniqueSelectedLocalPathCount === 1 ? "" : "s"}${section.duplicateSourceGroupCount > 0 ? ` · ${escapeHtml(String(section.duplicateSourceGroupCount))} duplicate group${section.duplicateSourceGroupCount === 1 ? "" : "s"}` : ""}${section.duplicateSourcePageCount > 0 ? ` · ${escapeHtml(String(section.duplicateSourcePageCount))} duplicate page${section.duplicateSourcePageCount === 1 ? "" : "s"}` : ""}${section.proposedPageLockCount > 0 ? ` · ${escapeHtml(String(section.proposedPageLockCount))} proposed page lock${section.proposedPageLockCount === 1 ? "" : "s"}` : ""}</small>
              <small>${escapeHtml(section.nextPageLockAuditStep)}</small>
              <small>page lock audit · <code>${escapeHtml(section.pageLockAuditBundlePath)}</code>${section.topConflictLocalPath ? ` · top conflict <code>${escapeHtml(section.topConflictLocalPath)}</code>` : ""}${section.topLockedLocalPath ? ` · top locked <code>${escapeHtml(section.topLockedLocalPath)}</code>` : ""}${section.atlasSourcePath ? ` · atlas <code>${escapeHtml(section.atlasSourcePath)}</code>` : ""}${section.sampleLocalSourcePath ? ` · local source <code>${escapeHtml(section.sampleLocalSourcePath)}</code>` : ""}</small>
            `).join("")}
          </div>
        ` : ""}
        ${Array.isArray(donorScan?.topSectionSkinPageLockResolutionBundleProfiles) && donorScan.topSectionSkinPageLockResolutionBundleProfiles.length > 0 ? `
          <div class="detail-list">
            <small><strong>Prepared section skin page-lock resolution bundles</strong></small>
            ${donorScan.topSectionSkinPageLockResolutionBundleProfiles.map((section) => `
              <small><strong>${escapeHtml(section.sectionKey)}</strong> · ${escapeHtml(section.pageLockResolutionState)} · ${escapeHtml(String(section.uniqueResolvedLocalPathCount))} unique resolved source${section.uniqueResolvedLocalPathCount === 1 ? "" : "s"}${section.resolvedConflictPageCount > 0 ? ` · ${escapeHtml(String(section.resolvedConflictPageCount))} resolved conflict${section.resolvedConflictPageCount === 1 ? "" : "s"}` : ""}${section.unresolvedConflictPageCount > 0 ? ` · ${escapeHtml(String(section.unresolvedConflictPageCount))} unresolved conflict${section.unresolvedConflictPageCount === 1 ? "" : "s"}` : ""}${section.duplicateSourceGroupCount > 0 ? ` · ${escapeHtml(String(section.duplicateSourceGroupCount))} duplicate group${section.duplicateSourceGroupCount === 1 ? "" : "s"}` : ""}</small>
              <small>${escapeHtml(section.nextPageLockResolutionStep)}</small>
              <small>page lock resolution · <code>${escapeHtml(section.pageLockResolutionBundlePath)}</code>${section.topResolvedLocalPath ? ` · top resolved <code>${escapeHtml(section.topResolvedLocalPath)}</code>` : ""}${section.atlasSourcePath ? ` · atlas <code>${escapeHtml(section.atlasSourcePath)}</code>` : ""}${section.sampleLocalSourcePath ? ` · local source <code>${escapeHtml(section.sampleLocalSourcePath)}</code>` : ""}</small>
            `).join("")}
          </div>
        ` : ""}
        ${Array.isArray(donorScan?.topSectionSkinPageLockDecisionBundleProfiles) && donorScan.topSectionSkinPageLockDecisionBundleProfiles.length > 0 ? `
          <div class="detail-list">
            <small><strong>Prepared section skin page-lock decision bundles</strong></small>
            ${donorScan.topSectionSkinPageLockDecisionBundleProfiles.map((section) => `
              <small><strong>${escapeHtml(section.sectionKey)}</strong> · ${escapeHtml(section.pageLockDecisionState)} · ${escapeHtml(String(section.reviewReadyPageCount))}/${escapeHtml(String(section.pageCount))} review-ready page lock${section.pageCount === 1 ? "" : "s"}${section.exactPageLockCount > 0 ? ` · ${escapeHtml(String(section.exactPageLockCount))} exact` : ""}${section.unresolvedPageLockCount > 0 ? ` · ${escapeHtml(String(section.unresolvedPageLockCount))} unresolved` : ""}${section.resolvedConflictPageCount > 0 ? ` · ${escapeHtml(String(section.resolvedConflictPageCount))} resolved conflict${section.resolvedConflictPageCount === 1 ? "" : "s"}` : ""}${section.uniqueResolvedLocalPathCount > 0 ? ` · ${escapeHtml(String(section.uniqueResolvedLocalPathCount))} unique source${section.uniqueResolvedLocalPathCount === 1 ? "" : "s"}` : ""}</small>
              <small>${escapeHtml(section.nextPageLockDecisionStep)}</small>
              <small>page lock decision · <code>${escapeHtml(section.pageLockDecisionBundlePath)}</code>${section.topDecisionLocalPath ? ` · top decision <code>${escapeHtml(section.topDecisionLocalPath)}</code>` : ""}${section.atlasSourcePath ? ` · atlas <code>${escapeHtml(section.atlasSourcePath)}</code>` : ""}${section.sampleLocalSourcePath ? ` · local source <code>${escapeHtml(section.sampleLocalSourcePath)}</code>` : ""}</small>
            `).join("")}
          </div>
        ` : ""}
        ${Array.isArray(donorScan?.topSectionSkinPageLockReviewBundleProfiles) && donorScan.topSectionSkinPageLockReviewBundleProfiles.length > 0 ? `
          <div class="detail-list">
            <small><strong>Prepared section skin page-lock review bundles</strong></small>
            ${donorScan.topSectionSkinPageLockReviewBundleProfiles.map((section) => `
              <small><strong>${escapeHtml(section.sectionKey)}</strong> · ${escapeHtml(section.pageLockReviewState)} · ${escapeHtml(String(section.reviewReadyPageCount))}/${escapeHtml(String(section.pageCount))} review-ready page lock${section.pageCount === 1 ? "" : "s"}${section.affectedLayerCount > 0 ? ` · ${escapeHtml(String(section.affectedLayerCount))} affected layer${section.affectedLayerCount === 1 ? "" : "s"}` : ""}${section.affectedAttachmentCount > 0 ? ` · ${escapeHtml(String(section.affectedAttachmentCount))} affected attachment${section.affectedAttachmentCount === 1 ? "" : "s"}` : ""}${section.unresolvedPageLockCount > 0 ? ` · ${escapeHtml(String(section.unresolvedPageLockCount))} unresolved` : ""}</small>
              <small>${escapeHtml(section.nextPageLockReviewStep)}</small>
              <small>page lock review · <code>${escapeHtml(section.pageLockReviewBundlePath)}</code>${section.topDecisionLocalPath ? ` · top decision <code>${escapeHtml(section.topDecisionLocalPath)}</code>` : ""}${section.topAffectedSlotName ? ` · top slot <code>${escapeHtml(section.topAffectedSlotName)}</code>` : ""}${section.atlasSourcePath ? ` · atlas <code>${escapeHtml(section.atlasSourcePath)}</code>` : ""}${section.sampleLocalSourcePath ? ` · local source <code>${escapeHtml(section.sampleLocalSourcePath)}</code>` : ""}</small>
            `).join("")}
          </div>
        ` : ""}
        ${Array.isArray(donorScan?.topSectionSkinPageLockApprovalBundleProfiles) && donorScan.topSectionSkinPageLockApprovalBundleProfiles.length > 0 ? `
          <div class="detail-list">
            <small><strong>Prepared section skin page-lock approval bundles</strong></small>
            ${donorScan.topSectionSkinPageLockApprovalBundleProfiles.map((section) => `
              <small><strong>${escapeHtml(section.sectionKey)}</strong> · ${escapeHtml(section.pageLockApprovalState)} · ${escapeHtml(String(section.approvalReadyPageCount))}/${escapeHtml(String(section.pageCount))} approval-ready page lock${section.pageCount === 1 ? "" : "s"}${section.affectedLayerCount > 0 ? ` · ${escapeHtml(String(section.affectedLayerCount))} affected layer${section.affectedLayerCount === 1 ? "" : "s"}` : ""}${section.affectedAttachmentCount > 0 ? ` · ${escapeHtml(String(section.affectedAttachmentCount))} affected attachment${section.affectedAttachmentCount === 1 ? "" : "s"}` : ""}${section.unresolvedPageLockCount > 0 ? ` · ${escapeHtml(String(section.unresolvedPageLockCount))} unresolved` : ""}</small>
              <small>${escapeHtml(section.nextPageLockApprovalStep)}</small>
              <small>page lock approval · <code>${escapeHtml(section.pageLockApprovalBundlePath)}</code>${section.topApprovalLocalPath ? ` · top approval <code>${escapeHtml(section.topApprovalLocalPath)}</code>` : ""}${section.topAffectedSlotName ? ` · top slot <code>${escapeHtml(section.topAffectedSlotName)}</code>` : ""}${section.atlasSourcePath ? ` · atlas <code>${escapeHtml(section.atlasSourcePath)}</code>` : ""}${section.sampleLocalSourcePath ? ` · local source <code>${escapeHtml(section.sampleLocalSourcePath)}</code>` : ""}</small>
            `).join("")}
          </div>
        ` : ""}
        ${Array.isArray(donorScan?.topSectionSkinPageLockApplyBundleProfiles) && donorScan.topSectionSkinPageLockApplyBundleProfiles.length > 0 ? `
          <div class="detail-list">
            <small><strong>Prepared section skin page-lock apply bundles</strong></small>
            ${donorScan.topSectionSkinPageLockApplyBundleProfiles.map((section) => `
              <small><strong>${escapeHtml(section.sectionKey)}</strong> · ${escapeHtml(section.pageLockApplyState)} · ${escapeHtml(String(section.appliedPageLockCount))}/${escapeHtml(String(section.pageCount))} applied page lock${section.pageCount === 1 ? "" : "s"}${section.affectedLayerCount > 0 ? ` · ${escapeHtml(String(section.affectedLayerCount))} affected layer${section.affectedLayerCount === 1 ? "" : "s"}` : ""}${section.affectedAttachmentCount > 0 ? ` · ${escapeHtml(String(section.affectedAttachmentCount))} affected attachment${section.affectedAttachmentCount === 1 ? "" : "s"}` : ""}${section.unresolvedPageLockCount > 0 ? ` · ${escapeHtml(String(section.unresolvedPageLockCount))} unresolved` : ""}</small>
              <small>${escapeHtml(section.nextPageLockApplyStep)}</small>
              <small>page lock apply · <code>${escapeHtml(section.pageLockApplyBundlePath)}</code>${section.topAppliedLocalPath ? ` · top apply <code>${escapeHtml(section.topAppliedLocalPath)}</code>` : ""}${section.topAffectedSlotName ? ` · top slot <code>${escapeHtml(section.topAffectedSlotName)}</code>` : ""}${section.atlasSourcePath ? ` · atlas <code>${escapeHtml(section.atlasSourcePath)}</code>` : ""}${section.sampleLocalSourcePath ? ` · local source <code>${escapeHtml(section.sampleLocalSourcePath)}</code>` : ""}</small>
            `).join("")}
          </div>
        ` : ""}
        ${Array.isArray(donorScan?.topSectionSkinTextureInputBundleProfiles) && donorScan.topSectionSkinTextureInputBundleProfiles.length > 0 ? `
          <div class="detail-list">
            <small><strong>Prepared section skin texture input bundles</strong></small>
            ${donorScan.topSectionSkinTextureInputBundleProfiles.map((section) => `
              <small><strong>${escapeHtml(section.sectionKey)}</strong> · ${escapeHtml(section.textureInputState)} · ${escapeHtml(String(section.readyLayerCount))}/${escapeHtml(String(section.layerCount))} ready layer${section.layerCount === 1 ? "" : "s"}${section.blockedLayerCount > 0 ? ` · ${escapeHtml(String(section.blockedLayerCount))} blocked` : ""}${section.exactPageLockCount > 0 ? ` · ${escapeHtml(String(section.exactPageLockCount))} exact page lock${section.exactPageLockCount === 1 ? "" : "s"}` : ""}${section.proposedPageLockCount > 0 ? ` · ${escapeHtml(String(section.proposedPageLockCount))} proposed page lock${section.proposedPageLockCount === 1 ? "" : "s"}` : ""}</small>
              <small>${escapeHtml(section.nextTextureInputStep)}</small>
              <small>texture input · <code>${escapeHtml(section.textureInputBundlePath)}</code>${section.topLockedLocalPath ? ` · top locked <code>${escapeHtml(section.topLockedLocalPath)}</code>` : ""}${section.atlasSourcePath ? ` · atlas <code>${escapeHtml(section.atlasSourcePath)}</code>` : ""}${section.sampleLocalSourcePath ? ` · local source <code>${escapeHtml(section.sampleLocalSourcePath)}</code>` : ""}</small>
            `).join("")}
          </div>
        ` : ""}
        ${Array.isArray(donorScan?.topSectionSkinTextureSourcePlanProfiles) && donorScan.topSectionSkinTextureSourcePlanProfiles.length > 0 ? `
          <div class="detail-list">
            <small><strong>Prepared section skin texture-source plans</strong></small>
            ${donorScan.topSectionSkinTextureSourcePlanProfiles.map((section) => `
              <small><strong>${escapeHtml(section.sectionKey)}</strong> · ${escapeHtml(section.textureSourceState)} · ${escapeHtml(String(section.exactPageSourceCount))}/${escapeHtml(String(section.pageCount))} exact source${section.pageCount === 1 ? "" : "s"}${section.proposedPageSourceCount > 0 ? ` · ${escapeHtml(String(section.proposedPageSourceCount))} proposed` : ""}${section.missingPageSourceCount > 0 ? ` · ${escapeHtml(String(section.missingPageSourceCount))} missing` : ""}</small>
              <small>${escapeHtml(section.nextTextureStep)}</small>
              <small>texture sources · <code>${escapeHtml(section.textureSourcePlanPath)}</code>${section.topTextureSourceLocalPath ? ` · top source <code>${escapeHtml(section.topTextureSourceLocalPath)}</code>` : ""}${section.atlasSourcePath ? ` · atlas <code>${escapeHtml(section.atlasSourcePath)}</code>` : ""}${section.sampleLocalSourcePath ? ` · local source <code>${escapeHtml(section.sampleLocalSourcePath)}</code>` : ""}</small>
            `).join("")}
          </div>
        ` : ""}
        ${Array.isArray(donorScan?.topSectionSkinTextureReconstructionBundleProfiles) && donorScan.topSectionSkinTextureReconstructionBundleProfiles.length > 0 ? `
          <div class="detail-list">
            <small><strong>Prepared section skin texture reconstruction bundles</strong></small>
            ${donorScan.topSectionSkinTextureReconstructionBundleProfiles.map((section) => `
              <small><strong>${escapeHtml(section.sectionKey)}</strong> · ${escapeHtml(section.textureReconstructionState)} · ${escapeHtml(String(section.reconstructableLayerCount))}/${escapeHtml(String(section.layerCount))} reconstructable layer${section.layerCount === 1 ? "" : "s"}${section.blockedLayerCount > 0 ? ` · ${escapeHtml(String(section.blockedLayerCount))} blocked` : ""}${section.exactPageSourceCount > 0 ? ` · ${escapeHtml(String(section.exactPageSourceCount))} exact page source${section.exactPageSourceCount === 1 ? "" : "s"}` : ""}${section.proposedPageSourceCount > 0 ? ` · ${escapeHtml(String(section.proposedPageSourceCount))} proposed page source${section.proposedPageSourceCount === 1 ? "" : "s"}` : ""}</small>
              <small>${escapeHtml(section.nextTextureReconstructionStep)}</small>
              <small>texture reconstruction · <code>${escapeHtml(section.textureReconstructionBundlePath)}</code>${section.topTextureSourceLocalPath ? ` · top source <code>${escapeHtml(section.topTextureSourceLocalPath)}</code>` : ""}${section.atlasSourcePath ? ` · atlas <code>${escapeHtml(section.atlasSourcePath)}</code>` : ""}${section.sampleLocalSourcePath ? ` · local source <code>${escapeHtml(section.sampleLocalSourcePath)}</code>` : ""}</small>
            `).join("")}
          </div>
        ` : ""}
        ${Array.isArray(donorScan?.topSectionSkinTextureLockBundleProfiles) && donorScan.topSectionSkinTextureLockBundleProfiles.length > 0 ? `
          <div class="detail-list">
            <small><strong>Prepared section skin texture-lock bundles</strong></small>
            ${donorScan.topSectionSkinTextureLockBundleProfiles.map((section) => `
              <small><strong>${escapeHtml(section.sectionKey)}</strong> · ${escapeHtml(section.textureLockState)} · ${escapeHtml(String(section.readyLayerCount))}/${escapeHtml(String(section.layerCount))} ready layer${section.layerCount === 1 ? "" : "s"}${section.blockedLayerCount > 0 ? ` · ${escapeHtml(String(section.blockedLayerCount))} blocked` : ""}${section.appliedPageLockCount > 0 ? ` · ${escapeHtml(String(section.appliedPageLockCount))} applied page lock${section.appliedPageLockCount === 1 ? "" : "s"}` : ""}${section.exactPageLockCount > 0 ? ` · ${escapeHtml(String(section.exactPageLockCount))} exact page lock${section.exactPageLockCount === 1 ? "" : "s"}` : ""}${section.unresolvedPageLockCount > 0 ? ` · ${escapeHtml(String(section.unresolvedPageLockCount))} unresolved` : ""}</small>
              <small>${escapeHtml(section.nextTextureLockStep)}</small>
              <small>texture lock · <code>${escapeHtml(section.textureLockBundlePath)}</code>${section.topLockedLocalPath ? ` · top locked <code>${escapeHtml(section.topLockedLocalPath)}</code>` : ""}${section.atlasSourcePath ? ` · atlas <code>${escapeHtml(section.atlasSourcePath)}</code>` : ""}${section.sampleLocalSourcePath ? ` · local source <code>${escapeHtml(section.sampleLocalSourcePath)}</code>` : ""}</small>
            `).join("")}
          </div>
        ` : ""}
        ${Array.isArray(donorScan?.topSectionSkinTextureAssemblyBundleProfiles) && donorScan.topSectionSkinTextureAssemblyBundleProfiles.length > 0 ? `
          <div class="detail-list">
            <small><strong>Prepared section skin texture assembly bundles</strong></small>
            ${donorScan.topSectionSkinTextureAssemblyBundleProfiles.map((section) => `
              <small><strong>${escapeHtml(section.sectionKey)}</strong> · ${escapeHtml(section.textureAssemblyState)} · ${escapeHtml(String(section.readyPageCount))}/${escapeHtml(String(section.pageCount))} ready page${section.pageCount === 1 ? "" : "s"}${section.blockedPageCount > 0 ? ` · ${escapeHtml(String(section.blockedPageCount))} blocked` : ""}${section.uniqueSelectedLocalPathCount > 0 ? ` · ${escapeHtml(String(section.uniqueSelectedLocalPathCount))} unique source${section.uniqueSelectedLocalPathCount === 1 ? "" : "s"}` : ""}${section.readyLayerCount > 0 ? ` · ${escapeHtml(String(section.readyLayerCount))}/${escapeHtml(String(section.layerCount))} ready layer${section.layerCount === 1 ? "" : "s"}` : ""}${section.unresolvedPageLockCount > 0 ? ` · ${escapeHtml(String(section.unresolvedPageLockCount))} unresolved` : ""}</small>
              <small>${escapeHtml(section.nextTextureAssemblyStep)}</small>
              <small>texture assembly · <code>${escapeHtml(section.textureAssemblyBundlePath)}</code>${section.topAssemblyLocalPath ? ` · top assembly <code>${escapeHtml(section.topAssemblyLocalPath)}</code>` : ""}${section.atlasSourcePath ? ` · atlas <code>${escapeHtml(section.atlasSourcePath)}</code>` : ""}${section.sampleLocalSourcePath ? ` · local source <code>${escapeHtml(section.sampleLocalSourcePath)}</code>` : ""}</small>
            `).join("")}
          </div>
        ` : ""}
        ${Array.isArray(donorScan?.topSectionSkinTextureRenderBundleProfiles) && donorScan.topSectionSkinTextureRenderBundleProfiles.length > 0 ? `
          <div class="detail-list">
            <small><strong>Prepared section skin texture render bundles</strong></small>
            ${donorScan.topSectionSkinTextureRenderBundleProfiles.map((section) => `
              <small><strong>${escapeHtml(section.sectionKey)}</strong> · ${escapeHtml(section.textureRenderState)} · ${escapeHtml(String(section.readyPageCount))}/${escapeHtml(String(section.pageCount))} render-ready page${section.pageCount === 1 ? "" : "s"}${section.pageSizeCount > 0 ? ` · ${escapeHtml(String(section.pageSizeCount))}/${escapeHtml(String(section.pageCount))} sized` : ""}${section.blockedPageCount > 0 ? ` · ${escapeHtml(String(section.blockedPageCount))} blocked` : ""}${section.uniqueSelectedLocalPathCount > 0 ? ` · ${escapeHtml(String(section.uniqueSelectedLocalPathCount))} unique source${section.uniqueSelectedLocalPathCount === 1 ? "" : "s"}` : ""}${section.readyLayerCount > 0 ? ` · ${escapeHtml(String(section.readyLayerCount))}/${escapeHtml(String(section.layerCount))} ready layer${section.layerCount === 1 ? "" : "s"}` : ""}</small>
              <small>${escapeHtml(section.nextTextureRenderStep)}</small>
              <small>texture render · <code>${escapeHtml(section.textureRenderBundlePath)}</code>${section.topRenderLocalPath ? ` · top render <code>${escapeHtml(section.topRenderLocalPath)}</code>` : ""}${section.atlasSourcePath ? ` · atlas <code>${escapeHtml(section.atlasSourcePath)}</code>` : ""}${section.sampleLocalSourcePath ? ` · local source <code>${escapeHtml(section.sampleLocalSourcePath)}</code>` : ""}</small>
            `).join("")}
          </div>
        ` : ""}
        ${Array.isArray(donorScan?.topSectionSkinTextureCanvasBundleProfiles) && donorScan.topSectionSkinTextureCanvasBundleProfiles.length > 0 ? `
          <div class="detail-list">
            <small><strong>Prepared section skin texture canvas bundles</strong></small>
            ${donorScan.topSectionSkinTextureCanvasBundleProfiles.map((section) => `
              <small><strong>${escapeHtml(section.sectionKey)}</strong> · ${escapeHtml(section.textureCanvasState)} · ${escapeHtml(String(section.readyPageCount))}/${escapeHtml(String(section.pageCount))} canvas-ready page${section.pageCount === 1 ? "" : "s"}${section.pageSizeCount > 0 ? ` · ${escapeHtml(String(section.pageSizeCount))}/${escapeHtml(String(section.pageCount))} sized` : ""}${section.blockedPageCount > 0 ? ` · ${escapeHtml(String(section.blockedPageCount))} blocked` : ""}${section.uniqueSelectedLocalPathCount > 0 ? ` · ${escapeHtml(String(section.uniqueSelectedLocalPathCount))} unique source${section.uniqueSelectedLocalPathCount === 1 ? "" : "s"}` : ""}${section.readyDrawOperationCount > 0 ? ` · ${escapeHtml(String(section.readyDrawOperationCount))}/${escapeHtml(String(section.drawOperationCount))} ready draw op${section.drawOperationCount === 1 ? "" : "s"}` : ""}</small>
              <small>${escapeHtml(section.nextTextureCanvasStep)}</small>
              <small>texture canvas · <code>${escapeHtml(section.textureCanvasBundlePath)}</code>${section.topCanvasLocalPath ? ` · top canvas <code>${escapeHtml(section.topCanvasLocalPath)}</code>` : ""}${section.atlasSourcePath ? ` · atlas <code>${escapeHtml(section.atlasSourcePath)}</code>` : ""}${section.sampleLocalSourcePath ? ` · local source <code>${escapeHtml(section.sampleLocalSourcePath)}</code>` : ""}</small>
            `).join("")}
          </div>
        ` : ""}
        ${Array.isArray(donorScan?.topSectionSkinTextureSourceFitBundleProfiles) && donorScan.topSectionSkinTextureSourceFitBundleProfiles.length > 0 ? `
          <div class="detail-list">
            <small><strong>Prepared section skin texture source-fit bundles</strong></small>
            ${donorScan.topSectionSkinTextureSourceFitBundleProfiles.map((section) => `
              <small><strong>${escapeHtml(section.sectionKey)}</strong> · ${escapeHtml(section.textureSourceFitState)} · ${escapeHtml(String(section.readyPageCount))}/${escapeHtml(String(section.pageCount))} fit-ready page${section.pageCount === 1 ? "" : "s"}${section.sourceDimensionCount > 0 ? ` · ${escapeHtml(String(section.sourceDimensionCount))}/${escapeHtml(String(section.pageCount))} source-sized` : ""}${section.exactPageFitCount > 0 ? ` · ${escapeHtml(String(section.exactPageFitCount))} exact fit${section.exactPageFitCount === 1 ? "" : "s"}` : ""}${section.uniformScalePageFitCount > 0 ? ` · ${escapeHtml(String(section.uniformScalePageFitCount))} uniform scale${section.uniformScalePageFitCount === 1 ? "" : "s"}` : ""}${section.nonUniformScalePageFitCount > 0 ? ` · ${escapeHtml(String(section.nonUniformScalePageFitCount))} non-uniform${section.nonUniformScalePageFitCount === 1 ? "" : "s"}` : ""}${section.missingSourceDimensionCount > 0 ? ` · ${escapeHtml(String(section.missingSourceDimensionCount))} missing dimensions` : ""}</small>
              <small>${escapeHtml(section.nextTextureSourceFitStep)}</small>
              <small>texture source fit · <code>${escapeHtml(section.textureSourceFitBundlePath)}</code>${section.topFittedLocalPath ? ` · top source <code>${escapeHtml(section.topFittedLocalPath)}</code>` : ""}${section.atlasSourcePath ? ` · atlas <code>${escapeHtml(section.atlasSourcePath)}</code>` : ""}${section.sampleLocalSourcePath ? ` · local source <code>${escapeHtml(section.sampleLocalSourcePath)}</code>` : ""}</small>
            `).join("")}
          </div>
        ` : ""}
        ${Array.isArray(donorScan?.topSectionSkinTextureFitReviewBundleProfiles) && donorScan.topSectionSkinTextureFitReviewBundleProfiles.length > 0 ? `
          <div class="detail-list">
            <small><strong>Prepared section skin texture fit-review bundles</strong></small>
            ${donorScan.topSectionSkinTextureFitReviewBundleProfiles.map((section) => `
              <small><strong>${escapeHtml(section.sectionKey)}</strong> · ${escapeHtml(section.textureFitReviewState)} · ${escapeHtml(String(section.reviewReadyPageCount))}/${escapeHtml(String(section.pageCount))} review-ready page${section.pageCount === 1 ? "" : "s"}${section.nonUniformScalePageFitCount > 0 ? ` · ${escapeHtml(String(section.nonUniformScalePageFitCount))} non-uniform fit${section.nonUniformScalePageFitCount === 1 ? "" : "s"}` : ""}${section.uniformScalePageFitCount > 0 ? ` · ${escapeHtml(String(section.uniformScalePageFitCount))} uniform fit${section.uniformScalePageFitCount === 1 ? "" : "s"}` : ""}${section.exactPageFitCount > 0 ? ` · ${escapeHtml(String(section.exactPageFitCount))} exact fit${section.exactPageFitCount === 1 ? "" : "s"}` : ""}${typeof section.largestScaleDelta === "number" ? ` · max scale delta ${escapeHtml(section.largestScaleDelta.toFixed(3))}` : ""}</small>
              <small>${escapeHtml(section.nextTextureFitReviewStep)}</small>
              <small>texture fit review · <code>${escapeHtml(section.textureFitReviewBundlePath)}</code>${section.topFitReviewLocalPath ? ` · top source <code>${escapeHtml(section.topFitReviewLocalPath)}</code>` : ""}${section.atlasSourcePath ? ` · atlas <code>${escapeHtml(section.atlasSourcePath)}</code>` : ""}${section.sampleLocalSourcePath ? ` · local source <code>${escapeHtml(section.sampleLocalSourcePath)}</code>` : ""}</small>
            `).join("")}
          </div>
        ` : ""}
        ${Array.isArray(donorScan?.topSectionSkinTextureFitDecisionBundleProfiles) && donorScan.topSectionSkinTextureFitDecisionBundleProfiles.length > 0 ? `
          <div class="detail-list">
            <small><strong>Prepared section skin texture fit-decision bundles</strong></small>
            ${donorScan.topSectionSkinTextureFitDecisionBundleProfiles.map((section) => `
              <small><strong>${escapeHtml(section.sectionKey)}</strong> · ${escapeHtml(section.textureFitDecisionState)} · ${escapeHtml(String(section.reviewReadyPageCount))}/${escapeHtml(String(section.pageCount))} decision-ready page${section.pageCount === 1 ? "" : "s"}${section.proposedContainDecisionCount > 0 ? ` · ${escapeHtml(String(section.proposedContainDecisionCount))} contain` : ""}${section.proposedCoverDecisionCount > 0 ? ` · ${escapeHtml(String(section.proposedCoverDecisionCount))} cover` : ""}${section.proposedStretchDecisionCount > 0 ? ` · ${escapeHtml(String(section.proposedStretchDecisionCount))} stretch` : ""}${typeof section.largestOccupancyCoverageRatio === "number" ? ` · max occupancy ${escapeHtml(section.largestOccupancyCoverageRatio.toFixed(3))}` : ""}${typeof section.largestScaleDelta === "number" ? ` · max scale delta ${escapeHtml(section.largestScaleDelta.toFixed(3))}` : ""}</small>
              <small>${escapeHtml(section.nextTextureFitDecisionStep)}</small>
              <small>texture fit decision · <code>${escapeHtml(section.textureFitDecisionBundlePath)}</code>${section.topDecisionLocalPath ? ` · top source <code>${escapeHtml(section.topDecisionLocalPath)}</code>` : ""}${section.atlasSourcePath ? ` · atlas <code>${escapeHtml(section.atlasSourcePath)}</code>` : ""}${section.sampleLocalSourcePath ? ` · local source <code>${escapeHtml(section.sampleLocalSourcePath)}</code>` : ""}</small>
            `).join("")}
          </div>
        ` : ""}
        ${Array.isArray(donorScan?.topSectionSkinTextureFitApprovalBundleProfiles) && donorScan.topSectionSkinTextureFitApprovalBundleProfiles.length > 0 ? `
          <div class="detail-list">
            <small><strong>Prepared section skin texture fit-approval bundles</strong></small>
            ${donorScan.topSectionSkinTextureFitApprovalBundleProfiles.map((section) => `
              <small><strong>${escapeHtml(section.sectionKey)}</strong> · ${escapeHtml(section.textureFitApprovalState)} · ${escapeHtml(String(section.approvalReadyPageCount))}/${escapeHtml(String(section.pageCount))} approval-ready page${section.pageCount === 1 ? "" : "s"}${section.proposedContainDecisionCount > 0 ? ` · ${escapeHtml(String(section.proposedContainDecisionCount))} contain` : ""}${section.proposedCoverDecisionCount > 0 ? ` · ${escapeHtml(String(section.proposedCoverDecisionCount))} cover` : ""}${section.proposedStretchDecisionCount > 0 ? ` · ${escapeHtml(String(section.proposedStretchDecisionCount))} stretch` : ""}${section.affectedLayerCount > 0 ? ` · ${escapeHtml(String(section.affectedLayerCount))} affected layer${section.affectedLayerCount === 1 ? "" : "s"}` : ""}${section.affectedAttachmentCount > 0 ? ` · ${escapeHtml(String(section.affectedAttachmentCount))} affected attachment${section.affectedAttachmentCount === 1 ? "" : "s"}` : ""}${typeof section.largestScaleDelta === "number" ? ` · max scale delta ${escapeHtml(section.largestScaleDelta.toFixed(3))}` : ""}</small>
              <small>${escapeHtml(section.nextTextureFitApprovalStep)}</small>
              <small>texture fit approval · <code>${escapeHtml(section.textureFitApprovalBundlePath)}</code>${section.topApprovedLocalPath ? ` · top source <code>${escapeHtml(section.topApprovedLocalPath)}</code>` : ""}${section.atlasSourcePath ? ` · atlas <code>${escapeHtml(section.atlasSourcePath)}</code>` : ""}${section.sampleLocalSourcePath ? ` · local source <code>${escapeHtml(section.sampleLocalSourcePath)}</code>` : ""}</small>
            `).join("")}
          </div>
        ` : ""}
        ${Array.isArray(donorScan?.topSectionSkinTextureFitApplyBundleProfiles) && donorScan.topSectionSkinTextureFitApplyBundleProfiles.length > 0 ? `
          <div class="detail-list">
            <small><strong>Prepared section skin texture fit-apply bundles</strong></small>
            ${donorScan.topSectionSkinTextureFitApplyBundleProfiles.map((section) => `
              <small><strong>${escapeHtml(section.sectionKey)}</strong> · ${escapeHtml(section.textureFitApplyState)} · ${escapeHtml(String(section.readyPageCount))}/${escapeHtml(String(section.pageCount))} applied page${section.pageCount === 1 ? "" : "s"}${section.appliedContainFitCount > 0 ? ` · ${escapeHtml(String(section.appliedContainFitCount))} contain` : ""}${section.appliedCoverFitCount > 0 ? ` · ${escapeHtml(String(section.appliedCoverFitCount))} cover` : ""}${section.appliedStretchFitCount > 0 ? ` · ${escapeHtml(String(section.appliedStretchFitCount))} stretch` : ""}${section.affectedLayerCount > 0 ? ` · ${escapeHtml(String(section.affectedLayerCount))} affected layer${section.affectedLayerCount === 1 ? "" : "s"}` : ""}${section.affectedAttachmentCount > 0 ? ` · ${escapeHtml(String(section.affectedAttachmentCount))} affected attachment${section.affectedAttachmentCount === 1 ? "" : "s"}` : ""}${typeof section.largestScaleDelta === "number" ? ` · max scale delta ${escapeHtml(section.largestScaleDelta.toFixed(3))}` : ""}</small>
              <small>${escapeHtml(section.nextTextureFitApplyStep)}</small>
              <small>texture fit apply · <code>${escapeHtml(section.textureFitApplyBundlePath)}</code>${section.topAppliedLocalPath ? ` · top source <code>${escapeHtml(section.topAppliedLocalPath)}</code>` : ""}${section.atlasSourcePath ? ` · atlas <code>${escapeHtml(section.atlasSourcePath)}</code>` : ""}${section.sampleLocalSourcePath ? ` · local source <code>${escapeHtml(section.sampleLocalSourcePath)}</code>` : ""}</small>
            `).join("")}
          </div>
        ` : ""}
        ${Array.isArray(donorScan?.topCaptureFamilyNames) && donorScan.topCaptureFamilyNames.length > 0 ? `
          <div class="detail-list">
            <small><strong>Top capture families</strong> · ${donorScan.topCaptureFamilyNames.map((family) => escapeHtml(family)).join(", ")}</small>
          </div>
        ` : ""}
        ${Array.isArray(donorScan?.rawPayloadBlockedFamilyNames) && donorScan.rawPayloadBlockedFamilyNames.length > 0 ? `
          <div class="detail-list">
            <small><strong>Blocked families</strong> · ${donorScan.rawPayloadBlockedFamilyNames.map((family) => escapeHtml(family)).join(", ")}</small>
          </div>
        ` : ""}
        <div class="evidence-actions">
          <button
            type="button"
            class="copy-button"
            data-donor-scan-action="capture-next"
            data-donor-scan-capture-limit="5"
            ${typeof donorScan?.nextCaptureTargetCount === "number" && donorScan.nextCaptureTargetCount > 0 ? "" : "disabled"}
          >Run Guided Capture</button>
        </div>
      </div>
    </div>
    <div class="tree-row scope-summary">
      <strong>Current Scope</strong>
      <span>This shell now treats Runtime Mode as the primary donor workflow for <code>project_001</code> when a grounded donor runtime entry exists. The Donor Evidence panel still sits in the left column below Project Browser on smaller windows, donor images can still be composed in Compose Mode, and raw donor files remain read-only throughout.</span>
      <div class="chip-row">
        <span>${runtimeLaunch?.entryUrl ? "primary: live donor runtime" : "primary: internal compose fallback"}</span>
        <span>compose mode: bounded compositor</span>
        <span>donor files: read-only</span>
        <span>donor image import: bounded slice</span>
        <span>validated slice: project_001</span>
      </div>
    </div>
    <div class="tree-row">
      <strong>Modification Handoff</strong>
      <span>${modificationHandoff
        ? `${escapeHtml(modificationHandoff.handoffState)} · ${escapeHtml(String(modificationHandoff.readyTaskCount))} ready / ${escapeHtml(String(modificationHandoff.blockedTaskCount))} blocked. Promoted donor work now lands as explicit compose/runtime tasks for this project.`
        : (queuedModificationCount > 0
          ? `This project has ${escapeHtml(String(queuedModificationCount))} promoted investigation item${queuedModificationCount === 1 ? "" : "s"} waiting to be turned into compose/runtime tasks.`
          : "No promoted donor work is queued for this project yet.")}</span>
      <div class="chip-row">
        <span>${escapeHtml(String(queuedModificationCount))} queued from Investigation</span>
        <span>${escapeHtml(String(modificationHandoff?.readyTaskCount ?? 0))} ready for compose/runtime</span>
        <span>${escapeHtml(String(modificationHandoff?.blockedTaskCount ?? 0))} blocked</span>
        <span>${modificationHandoff?.recommendedStage ? escapeHtml(labelizeStage(modificationHandoff.recommendedStage)) : "Investigation"}</span>
      </div>
      <div class="evidence-actions">
        ${(queuedModificationCount > 0 || modificationHandoff) ? `
          <button
            type="button"
            class="copy-button"
            data-project-modification-action="prepare-handoff"
          >${modificationHandoff ? "Refresh Modification Board" : "Prepare Modification Board"}</button>
        ` : ""}
        ${modificationHandoff ? `
          <button
            type="button"
            class="copy-button"
            data-switch-workbench-mode="scene"
            data-switch-workflow-panel="compose"
            data-switch-status="Compose Mode is active so you can continue from the prepared project modification tasks."
          >Open Modification / Compose</button>
        ` : ""}
        ${modificationHandoff ? `
          <button
            type="button"
            class="copy-button"
            data-runtime-action="launch"
          >Open Runtime</button>
        ` : ""}
        ${modificationHandoff?.reportPath ? renderCopyButton(modificationHandoff.reportPath, "project modification handoff path", "Copy Report Path") : ""}
      </div>
      ${renderActiveProjectModificationTaskCard()}
      <div class="investigation-list">
        ${Array.isArray(modificationHandoff?.topTasks) && modificationHandoff.topTasks.length > 0
          ? modificationHandoff.topTasks.slice(0, 4).map((task) => renderProjectModificationTaskRow(task)).join("")
          : `<div class="investigation-row"><strong>No prepared project task rows yet</strong><small>${queuedModificationCount > 0 ? "Prepare the modification board to resolve the strongest compose/runtime-ready artifact per queued item." : "Investigation will surface ready sections here after promotion."}</small></div>`}
      </div>
    </div>
    ${vabsStatusMarkup}
    <div class="tree-row">
      <strong>Read-only Donor Evidence Summary</strong>
      <span>${escapeHtml(selectedProject.donor.donorName)} evidence explains provenance for this project. It is not the live editable source in this build.</span>
      <div class="detail-grid">
        <div class="detail-card">
          <span>Evidence Root</span>
          <strong><code>${escapeHtml(evidenceRoot)}</code></strong>
          <small>Read-only donor capture path for this project.</small>
        </div>
        <div class="detail-card">
          <span>Capture Sessions</span>
          <strong>${captureSessions.length}</strong>
          <small>${escapeHtml(captureSessionSummary)}</small>
        </div>
        <div class="detail-card">
          <span>Evidence Records</span>
          <strong>${evidenceRefs.length}</strong>
          <small>${escapeHtml(evidenceRefSummary)}</small>
        </div>
        <div class="detail-card">
          <span>Editing Surface</span>
          <strong>Internal Scene Files</strong>
          <small>Use the donor asset palette or placeholder tools to create objects, then use the canvas and inspector to edit them and save/reload.</small>
        </div>
      </div>
    </div>
    <div class="tree-row">
      <strong>Lifecycle Summary</strong>
      <span>One project = one donor-to-release cycle.</span>
      <div class="lifecycle-grid">${lifecycleChips}</div>
    </div>
  `;
}

function getVabsCaptureStateLabel(entry) {
  if (!entry) {
    return "missing";
  }

  if (entry.sanitizedExists) {
    return "sanitized captured ready";
  }

  if (entry.rawExists) {
    return "raw local-only present";
  }

  return "missing";
}

function getVabsProofChainLabel(vabsStatus) {
  const checks = [
    ["export", vabsStatus?.commands?.exportPackage],
    ["preview", vabsStatus?.commands?.preview],
    ["mock", vabsStatus?.commands?.mock],
    ["smoke", vabsStatus?.commands?.smoke]
  ];

  const available = checks
    .filter(([, enabled]) => Boolean(enabled))
    .map(([label]) => label);

  return available.length > 0
    ? `${available.join(" + ")} commands present`
    : "no local VABS proof commands indexed";
}

function renderVabsCodeList(items, className) {
  return items
    .map((item) => `<code class="${className}">${escapeHtml(item)}</code>`)
    .join("");
}

function renderVabsStatusSummary() {
  const selectedProject = getSelectedProject();
  if (!selectedProject) {
    return "";
  }

  const vabsStatus = getSelectedProjectVabsStatus();
  if (!vabsStatus) {
    return `
      <div class="tree-row scope-summary vabs-summary" data-vabs-available="no">
        <strong>VABS Module</strong>
        <span>No project-local VABS workspace is indexed for this project yet. The current shell/editor workflow stays unchanged.</span>
        <div class="chip-row">
          <span>vabs: not started</span>
          <span>editor: unchanged</span>
        </div>
      </div>
    `;
  }

  const blockerToneClass = vabsStatus.activeFixtureSource === "captured"
    ? "vabs-detail-card is-positive"
    : "vabs-detail-card is-alert";

  return `
    <div class="tree-row scope-summary vabs-summary" data-vabs-available="yes" data-vabs-fixture-source="${escapeHtml(vabsStatus.activeFixtureSource)}">
      <strong>VABS Module</strong>
      <span>Read-only archived-history status for the selected project. This panel surfaces the current VABS truth without changing the editor/save path.</span>
      <div class="chip-row">
        <span>status: ${escapeHtml(vabsStatus.currentStatus)}</span>
        <span>folder: ${escapeHtml(vabsStatus.targetFolderToken ?? "not decided")}</span>
        <span>fixture: ${escapeHtml(vabsStatus.activeFixtureSummary)}</span>
        <span>selection: ${escapeHtml(vabsStatus.selectionMode)}</span>
      </div>
      <div class="detail-grid">
        <div class="detail-card vabs-detail-card">
          <span>Current VABS Stage</span>
          <strong>${escapeHtml(vabsStatus.currentStatus)}</strong>
          <small>Folder decision: ${escapeHtml(vabsStatus.folderDecisionStatus ?? "not recorded")}. Project-local visibility only. The shell still edits internal scene files and keeps VABS read-only.</small>
        </div>
        <div class="detail-card vabs-detail-card">
          <span>Fixture Provenance</span>
          <strong>${escapeHtml(vabsStatus.activeFixtureSummary)}</strong>
          <small>${vabsStatus.confirmedRoundId ? `Confirmed live ROUND_ID ${escapeHtml(vabsStatus.confirmedRoundId)} from ${escapeHtml(vabsStatus.confirmedRoundEvidence ?? "captured evidence")}.` : "No confirmed live ROUND_ID is indexed yet."}</small>
        </div>
        <div class="detail-card vabs-detail-card">
          <span>Captured Row</span>
          <strong>${escapeHtml(getVabsCaptureStateLabel(vabsStatus.capturedRow))}</strong>
          <small>Raw: ${vabsStatus.capturedRow.rawExists ? "yes" : "no"} · Sanitized: ${vabsStatus.capturedRow.sanitizedExists ? "yes" : "no"}</small>
        </div>
        <div class="detail-card vabs-detail-card">
          <span>Captured Session</span>
          <strong>${escapeHtml(getVabsCaptureStateLabel(vabsStatus.capturedSession))}</strong>
          <small>Raw: ${vabsStatus.capturedSession.rawExists ? "yes" : "no"} · Sanitized: ${vabsStatus.capturedSession.sanitizedExists ? "yes" : "no"}</small>
        </div>
        <div class="detail-card vabs-detail-card">
          <span>Export / Proof Chain</span>
          <strong>${vabsStatus.exportPackageExists ? "local export package present" : "local export package not built yet"}</strong>
          <small>${escapeHtml(getVabsProofChainLabel(vabsStatus))} · ${escapeHtml(vabsStatus.exportPackagePath)}</small>
        </div>
        <div class="detail-card ${blockerToneClass}">
          <span>Current Blocker</span>
          <strong>${vabsStatus.activeFixtureSource === "captured" ? "Captured truth available" : "Real archived data still missing"}</strong>
          <small>${escapeHtml(vabsStatus.currentBlocker)}</small>
        </div>
      </div>
      <div class="tree-row vabs-next-step">
        <strong>Next Operator Action</strong>
        <span>${escapeHtml(vabsStatus.nextRecommendedAction)}</span>
        <div class="vabs-path-list">
          ${renderVabsCodeList(vabsStatus.operatorPaths, "vabs-path")}
        </div>
      </div>
      <div class="tree-row vabs-commands">
        <strong>Copy/Paste Commands</strong>
        <span>Use the existing local VABS tooling. This panel does not execute commands for you.</span>
        <div class="vabs-command-list">
          ${renderVabsCodeList(vabsStatus.operatorCommands, "vabs-command")}
        </div>
      </div>
    </div>
  `;
}

function renderWorkflowVabsPanel() {
  if (!elements.workflowVabsPanel) {
    return;
  }

  const vabsStatus = getSelectedProjectVabsStatus();
  if (!vabsStatus) {
    elements.workflowVabsPanel.innerHTML = `
      <div class="tree-row">
        <strong>VABS Not Indexed</strong>
        <span>No project-local VABS workspace is indexed for the selected project yet.</span>
      </div>
    `;
    return;
  }

  elements.workflowVabsPanel.innerHTML = `
    <div class="detail-grid">
      <div class="detail-card">
        <span>Fixture Truth</span>
        <strong>${escapeHtml(vabsStatus.fixtureProvenanceLabel)}</strong>
        <small>${escapeHtml(vabsStatus.activeFixtureSummary)}</small>
      </div>
      <div class="detail-card">
        <span>Current Blocker</span>
        <strong>${escapeHtml(vabsStatus.activeFixtureSource === "captured" ? "Captured truth available" : "Real archived data still missing")}</strong>
        <small>${escapeHtml(vabsStatus.currentBlocker)}</small>
      </div>
    </div>
    <div class="tree-row">
      <strong>Next Operator Step</strong>
      <span>${escapeHtml(vabsStatus.nextRecommendedAction)}</span>
      <div class="vabs-command-list">
        ${renderVabsCodeList(vabsStatus.operatorCommands.slice(0, 2), "vabs-command")}
      </div>
    </div>
  `;
}

function getObjectDimensions(object) {
  if (Number.isFinite(object.width) && Number.isFinite(object.height)) {
    return { width: object.width, height: object.height };
  }

  return objectSizePresets[object.id]
    ?? objectSizePresets[object.type]
    ?? { width: 160, height: 96 };
}

function getSelectedPlaceholderPreset() {
  const tools = getEditorStateTools();
  const available = typeof tools.getPlaceholderPresets === "function"
    ? tools.getPlaceholderPresets()
    : [];
  const selectedValue = elements.fieldPlaceholderPreset instanceof HTMLSelectElement
    ? elements.fieldPlaceholderPreset.value
    : state.placeholderPresetKey;
  const preset = available.find((entry) => entry.key === selectedValue) ?? available[0] ?? null;
  return preset;
}

function getDonorAssetForObject(object) {
  if (!object) {
    return null;
  }

  if (object.donorAsset?.assetId) {
    return {
      ...object.donorAsset,
      previewUrl: getDonorAssetById(object.donorAsset.assetId)?.previewUrl ?? null
    };
  }

  return getDonorAssetById(object.assetRef ?? "");
}

function getObjectLabel(object) {
  return object.donorAsset?.filename ?? object.donorAsset?.evidenceId ?? object.placeholderRef ?? object.assetRef ?? object.type;
}

function createStableDuplicateId(sourceObject, objects) {
  const baseId = `${sourceObject.id}-copy`;
  const existingIds = new Set(objects.map((entry) => entry.id));
  let suffix = 1;

  while (existingIds.has(`${baseId}-${String(suffix).padStart(2, "0")}`)) {
    suffix += 1;
  }

  return `${baseId}-${String(suffix).padStart(2, "0")}`;
}

function cloneEditableObjectForDuplicate(sourceObject, objects) {
  const duplicate = clone(sourceObject);
  duplicate.id = createStableDuplicateId(sourceObject, objects);
  duplicate.x = sourceObject.x + 24;
  duplicate.y = sourceObject.y + 24;
  return duplicate;
}

function selectNeighborAfterDelete(editorData, removedObjectId, removedLayerId) {
  if (!editorData || !Array.isArray(editorData.objects)) {
    return null;
  }

  const originalObjects = editorData.objects;
  const removedIndex = originalObjects.findIndex((entry) => entry.id === removedObjectId);
  const remainingObjects = originalObjects.filter((entry) => entry.id !== removedObjectId);

  if (remainingObjects.length === 0) {
    return null;
  }

  const sameLayerRemaining = remainingObjects.filter((entry) => entry.layerId === removedLayerId);
  const nextSameLayer = sameLayerRemaining.find((entry) => isObjectEditable(entry) && originalObjects.findIndex((candidate) => candidate.id === entry.id) > removedIndex)
    ?? sameLayerRemaining.find((entry) => isObjectEditable(entry) && originalObjects.findIndex((candidate) => candidate.id === entry.id) < removedIndex);
  if (nextSameLayer) {
    return nextSameLayer.id;
  }

  const previousSameLayer = [...sameLayerRemaining].reverse().find((entry) => isObjectEditable(entry) && originalObjects.findIndex((candidate) => candidate.id === entry.id) < removedIndex);
  if (previousSameLayer) {
    return previousSameLayer.id;
  }

  const firstEditable = remainingObjects.find((entry) => isObjectEditable(entry));
  return firstEditable?.id ?? remainingObjects[0].id;
}

function selectNeighborAfterDeleteGroup(editorData, removedObjectIds, preferredLayerIds = []) {
  if (!editorData || !Array.isArray(editorData.objects)) {
    return null;
  }

  const removedIds = new Set(uniqueStrings(Array.isArray(removedObjectIds) ? removedObjectIds : []));
  if (removedIds.size === 0) {
    return null;
  }

  const originalObjects = editorData.objects;
  const remainingObjects = originalObjects.filter((entry) => !removedIds.has(entry.id));
  if (remainingObjects.length === 0) {
    return null;
  }

  const removedIndices = originalObjects
    .map((entry, index) => (removedIds.has(entry.id) ? index : -1))
    .filter((index) => index >= 0);
  const minRemovedIndex = removedIndices.length > 0 ? Math.min(...removedIndices) : 0;
  const maxRemovedIndex = removedIndices.length > 0 ? Math.max(...removedIndices) : 0;

  for (const layerId of uniqueStrings(Array.isArray(preferredLayerIds) ? preferredLayerIds : [])) {
    const sameLayerRemaining = remainingObjects.filter((entry) => entry.layerId === layerId);
    const nextSameLayer = sameLayerRemaining.find((entry) => (
      isObjectEditable(entry)
      && originalObjects.findIndex((candidate) => candidate.id === entry.id) > maxRemovedIndex
    ));
    if (nextSameLayer) {
      return nextSameLayer.id;
    }

    const previousSameLayer = [...sameLayerRemaining].reverse().find((entry) => (
      isObjectEditable(entry)
      && originalObjects.findIndex((candidate) => candidate.id === entry.id) < minRemovedIndex
    ));
    if (previousSameLayer) {
      return previousSameLayer.id;
    }
  }

  const firstEditable = remainingObjects.find((entry) => isObjectEditable(entry));
  return firstEditable?.id ?? remainingObjects[0].id;
}

function getPreferredCreationLayerId() {
  if (!state.editorData || !Array.isArray(state.editorData.layers)) {
    return null;
  }

  const selectedObject = getSelectedObject();
  if (selectedObject) {
    const selectedLayer = getLayerById(selectedObject.layerId);
    if (selectedLayer && !selectedLayer.locked) {
      return selectedLayer.id;
    }
  }

  const firstEditableVisibleLayer = sortLayers(state.editorData.layers).find((entry) => entry.visible && !entry.locked);
  if (firstEditableVisibleLayer) {
    return firstEditableVisibleLayer.id;
  }

  const firstEditableLayer = sortLayers(state.editorData.layers).find((entry) => !entry.locked);
  return firstEditableLayer?.id ?? null;
}

function canCreateObject() {
  return Boolean(state.editorData && getAssignableLayers().length > 0);
}

function getSelectedLayerIdForCreation() {
  const selectedObject = getSelectedObject();
  if (selectedObject && isObjectEditable(selectedObject)) {
    return selectedObject.layerId;
  }

  return getAssignableLayers()[0]?.id ?? null;
}

function getDonorImportTargetLayerId() {
  const requestedLayerId = String(state.donorAssetUi?.importTargetLayerId ?? "auto").trim();
  if (requestedLayerId && requestedLayerId !== "auto") {
    const explicitLayer = getAssignableLayers().find((entry) => entry.id === requestedLayerId);
    if (explicitLayer) {
      return explicitLayer.id;
    }
  }

  return getSelectedLayerIdForCreation();
}

function getDonorImportTargetLayerLabel() {
  const requestedLayerId = String(state.donorAssetUi?.importTargetLayerId ?? "auto").trim();
  const targetLayerId = getDonorImportTargetLayerId();
  if (!targetLayerId) {
    return "No editable layer";
  }

  const targetLayer = getLayerById(targetLayerId);
  if (requestedLayerId && requestedLayerId !== "auto") {
    return `${targetLayer?.displayName ?? targetLayerId} (chosen target)`;
  }

  const selectedObject = getSelectedObject();
  if (selectedObject && isObjectEditable(selectedObject) && selectedObject.layerId === targetLayerId) {
    return `${targetLayer?.displayName ?? targetLayerId} (selected object layer)`;
  }

  return `${targetLayer?.displayName ?? targetLayerId} (first editable layer)`;
}

function getReplaceableSelectedObject() {
  if (hasMultiSelection()) {
    return null;
  }

  const selectedObject = getSelectedObject();
  if (!selectedObject || !isObjectEditable(selectedObject)) {
    return null;
  }

  const layer = getLayerById(selectedObject.layerId);
  if (selectedObject.locked || layer?.locked) {
    return null;
  }

  return selectedObject;
}

function getAssignableLayers() {
  if (!state.editorData) {
    return [];
  }

  const tools = getEditorStateTools();
  if (typeof tools.getEditableLayers === "function") {
    return tools.getEditableLayers(state.editorData.layers);
  }

  return sortLayers(state.editorData.layers).filter((entry) => !entry.locked);
}

function handleToggleSnap() {
  state.snap.enabled = !state.snap.enabled;
  pushLog(state.snap.enabled ? `Snap enabled at ${getSnapSize()}px.` : "Snap disabled.");
  renderAll();
  setPreviewStatus(state.snap.enabled
    ? `Snap enabled at ${getSnapSize()}px for drag and keyboard nudge.`
    : "Snap disabled. Movement is now freeform again.");
}

function getViewportAlignmentTarget(object, alignment) {
  if (!isViewportAlignableObject(object)) {
    return null;
  }

  const viewport = getSceneViewport();
  const extent = getObjectExtent(object);
  const maxX = Math.max(0, viewport.width - extent.width);
  const maxY = Math.max(0, viewport.height - extent.height);
  const alignments = {
    left: { x: 0, y: object.y },
    "center-h": { x: Math.round(maxX / 2), y: object.y },
    right: { x: maxX, y: object.y },
    top: { x: object.x, y: 0 },
    "middle-v": { x: object.x, y: Math.round(maxY / 2) },
    bottom: { x: object.x, y: maxY }
  };

  const target = alignments[alignment];
  if (!target) {
    return null;
  }

  return clampObjectPosition(object, target.x, target.y);
}

function getAlignmentLabel(alignment) {
  const labels = {
    left: "left",
    "center-h": "center horizontally",
    right: "right",
    top: "top",
    "middle-v": "middle vertically",
    bottom: "bottom"
  };

  return labels[alignment] ?? alignment;
}

function getCompositionSelectionContext() {
  const selectedObjects = getSelectedObjects().filter((object) => isObjectEditable(object) && isViewportAlignableObject(object));
  const donorBackedCount = selectedObjects.filter((object) => Boolean(getDonorAssetForObject(object))).length;
  return {
    objectIds: selectedObjects.map((object) => object.id),
    objects: selectedObjects,
    count: selectedObjects.length,
    donorBackedCount
  };
}

function getCompositionActionLabel(action) {
  const labels = {
    "align-left": "aligned left",
    "align-right": "aligned right",
    "align-top": "aligned top",
    "align-bottom": "aligned bottom",
    "align-center-h": "aligned center horizontally",
    "align-middle-v": "aligned middle vertically",
    "distribute-h": "distributed horizontally",
    "distribute-v": "distributed vertically"
  };

  return labels[action] ?? action;
}

function handleAlignSelection(action) {
  const context = getCompositionSelectionContext();
  if (context.count < 2) {
    setPreviewStatus("Select at least two editable donor-backed or placeholder-backed objects before using selection alignment.");
    return;
  }

  const didChange = applyEditorMutation(`Updated multi-object composition (${action}).`, (editorData) => {
    const tools = getEditorStateTools();
    if (typeof tools.alignSelection === "function") {
      tools.alignSelection(editorData, context.objectIds, action, getSceneViewport());
    }
  });

  if (!didChange) {
    setPreviewStatus("The selected objects are already positioned for that alignment.");
    return;
  }

  setPreviewStatus(`${context.count} selected objects were ${getCompositionActionLabel(action)}. Save to persist the composition update.`);
}

function handleDistributeSelection(axis) {
  const context = getCompositionSelectionContext();
  if (context.count < 3) {
    setPreviewStatus("Select at least three editable donor-backed or placeholder-backed objects before using distribution.");
    return;
  }

  const didChange = applyEditorMutation(`Updated multi-object composition (distribute ${axis}).`, (editorData) => {
    const tools = getEditorStateTools();
    if (typeof tools.distributeSelection === "function") {
      tools.distributeSelection(editorData, context.objectIds, axis, getSceneViewport());
    }
  });

  if (!didChange) {
    setPreviewStatus(`The selected objects are already evenly distributed ${axis === "vertical" ? "vertically" : "horizontally"}.`);
    return;
  }

  setPreviewStatus(`${context.count} selected objects were ${getCompositionActionLabel(axis === "vertical" ? "distribute-v" : "distribute-h")}. Save to persist the composition update.`);
}

function handleAlignSelectedObject(alignment) {
  const selectedObject = getSelectedObject();
  if (!selectedObject) {
    setPreviewStatus("Select a placeholder-backed object before using viewport alignment.");
    return;
  }

  if (!isViewportAlignableObject(selectedObject)) {
    setPreviewStatus("Viewport alignment is available only for editable placeholder-backed objects with explicit width and height.");
    return;
  }

  const target = getViewportAlignmentTarget(selectedObject, alignment);
  if (!target) {
    setPreviewStatus("That viewport alignment action is not available.");
    return;
  }

  if (target.x === selectedObject.x && target.y === selectedObject.y) {
    setPreviewStatus(`${selectedObject.displayName} is already aligned to the viewport ${getAlignmentLabel(alignment)}.`);
    return;
  }

  const didChange = applyEditorMutation(`Aligned ${selectedObject.displayName} to the viewport ${getAlignmentLabel(alignment)}.`, (editorData) => {
    const editableObject = editorData.objects.find((entry) => entry.id === selectedObject.id);
    if (!editableObject) {
      return;
    }

    editableObject.x = target.x;
    editableObject.y = target.y;
  });

  if (didChange) {
    setPreviewStatus(`Aligned ${selectedObject.displayName} to the viewport ${getAlignmentLabel(alignment)}. Save to persist the change.`);
  }
}

function getOrderActionLabel(action) {
  const labels = {
    "send-backward": "sent backward",
    "bring-forward": "brought forward",
    "send-to-back": "sent to the back",
    "bring-to-front": "brought to the front"
  };

  return labels[action] ?? action;
}

function handleOrderSelectedObject(action) {
  const selectedObject = getSelectedObject();
  if (!selectedObject) {
    setPreviewStatus("Select an editable object before changing its order.");
    return;
  }

  if (state.canvasDrag) {
    setPreviewStatus("Finish the current drag before changing object order.");
    return;
  }

  if (!isObjectEditable(selectedObject)) {
    setPreviewStatus("Locked objects cannot be reordered.");
    return;
  }

  const beforeContext = getSelectedObjectOrderContext();
  const didChange = applyEditorMutation(`Reordered ${selectedObject.displayName} within ${beforeContext?.layerName ?? "its layer"}.`, (editorData) => {
    const tools = getEditorStateTools();
    if (typeof tools.reorderObjectInLayer === "function") {
      tools.reorderObjectInLayer(editorData, selectedObject.id, action);
    }
  });

  const afterContext = getSelectedObjectOrderContext();
  if (!didChange) {
    setPreviewStatus(`${selectedObject.displayName} is already at that ordering boundary within ${beforeContext?.layerName ?? "the current layer"}.`);
    return;
  }

  const orderSummary = afterContext
    ? `${afterContext.index + 1} of ${afterContext.total}`
    : "updated order";
  setPreviewStatus(`${selectedObject.displayName} was ${getOrderActionLabel(action)} in ${beforeContext?.layerName ?? "the current layer"} (${orderSummary}). Save to persist the order change.`);
}

function handleSelectLayerSibling(direction) {
  const selectedObject = getSelectedObject();
  if (!selectedObject || !state.editorData) {
    setPreviewStatus("Select an object before navigating within its layer.");
    return;
  }

  if (state.canvasDrag) {
    setPreviewStatus("Finish the current drag before changing layer-local selection.");
    return;
  }

  const directionLabel = direction === "previous" ? "previous" : "next";
  const context = getSelectedObjectNavigationContext(direction);
  if (!context) {
    setPreviewStatus(`Unable to inspect the ${directionLabel} object in the current layer.`);
    return;
  }

  if (!context.targetObjectId) {
    setPreviewStatus(`No ${directionLabel} object exists in ${context.layerName}. Selection stayed on ${selectedObject.displayName}.`);
    return;
  }

  setSelectedObject(context.targetObjectId);
  renderAll();
  const orderLabel = `${context.direction === "previous" ? Math.max(1, context.index) : Math.min(context.total, context.index + 2)} of ${context.total}`;
  pushLog(`Selected ${context.targetLabel ?? context.targetObjectId} via ${directionLabel} in ${context.layerName}.`);
  setPreviewStatus(`Selected ${context.targetLabel ?? context.targetObjectId} as the ${directionLabel} object in ${context.layerName} (${orderLabel}).`);
}

function handleCreateNewObject() {
  if (!state.editorData) {
    setPreviewStatus("No editable scene data is available for the selected project.");
    return;
  }

  if (getAssignableLayers().length === 0) {
    setPreviewStatus("Every layer is locked, so a new object cannot be created yet.");
    return;
  }

  const selectedPreset = getSelectedPlaceholderPreset();
  let createdObjectId = null;
  let createdDisplayName = null;
  let createdLayerName = "unassigned";
  const didChange = applyEditorMutation("Created a new placeholder object.", (editorData) => {
    const tools = getEditorStateTools();
    const nextObject = typeof tools.createPlaceholderObject === "function"
      ? tools.createPlaceholderObject(editorData, {
        viewport: getSceneViewport(),
        presetKey: selectedPreset?.key ?? state.placeholderPresetKey
      })
      : null;

    if (!nextObject) {
      return;
    }

    const layer = editorData.layers.find((entry) => entry.id === nextObject.layerId);
    createdObjectId = nextObject.id;
    createdDisplayName = nextObject.displayName;
    createdLayerName = layer?.displayName ?? nextObject.layerId;
    editorData.objects.push(nextObject);
  });

  if (!didChange || !createdObjectId) {
    return;
  }

  state.placeholderPresetKey = selectedPreset?.key ?? state.placeholderPresetKey;
  if (elements.fieldPlaceholderPreset instanceof HTMLSelectElement) {
    elements.fieldPlaceholderPreset.value = state.placeholderPresetKey;
  }
  setSelectedObject(createdObjectId);
  ensureSelectedObject();
  renderAll();
  setPreviewStatus(`Created ${createdDisplayName} from the ${selectedPreset?.label ?? "Generic Box"} preset. It is selected on ${createdLayerName} and ready to edit.`);
}

function handleImportDonorAsset(assetId, scenePoint = null) {
  if (!state.editorData) {
    setPreviewStatus("No editable scene data is available for donor asset import.");
    return false;
  }

  const donorAsset = getDonorAssetById(assetId);
  if (!donorAsset) {
    setPreviewStatus("That donor asset is not available in the current local donor asset catalog.");
    return false;
  }

  if (!donorAsset.previewUrl) {
    setPreviewStatus("This donor asset does not have a usable local preview path on this machine.");
    return false;
  }

  if (getAssignableLayers().length === 0) {
    setPreviewStatus("Every layer is locked, so a donor asset cannot be imported yet.");
    return false;
  }

  let createdObjectId = null;
  let createdDisplayName = donorAsset.title;
  let createdLayerName = "unassigned";
  const targetLayerId = getDonorImportTargetLayerId();
  const didChange = applyEditorMutation(`Imported donor asset ${donorAsset.evidenceId}.`, (editorData) => {
    const tools = getEditorStateTools();
    const viewport = getSceneViewport();
    const nextObject = typeof tools.createDonorAssetObject === "function"
      ? tools.createDonorAssetObject(editorData, {
        asset: donorAsset,
        viewport,
        position: scenePoint
          ? {
            x: Math.round(scenePoint.x - (Number.isFinite(donorAsset.width) ? Math.min(donorAsset.width, 360) / 2 : 120)),
            y: Math.round(scenePoint.y - (Number.isFinite(donorAsset.height) ? Math.min(donorAsset.height, 240) / 2 : 80))
          }
          : null,
        selectedLayerId: targetLayerId
      })
      : null;

    if (!nextObject) {
      return;
    }

    const layer = editorData.layers.find((entry) => entry.id === nextObject.layerId);
    createdObjectId = nextObject.id;
    createdDisplayName = nextObject.displayName;
    createdLayerName = layer?.displayName ?? nextObject.layerId;
    editorData.objects.push(nextObject);
  });

  if (!didChange || !createdObjectId) {
    return false;
  }

  setSelectedObject(createdObjectId);
  state.donorAssetUi.highlightedAssetId = assetId;
  ensureSelectedObject();
  renderAll();
  setPreviewStatus(`Imported ${createdDisplayName} from donor evidence ${donorAsset.evidenceId} onto ${createdLayerName}. Save to persist the donor-backed object.`);
  return true;
}

function buildDonorAssetGroupImportPosition(index, viewport, assetCount, layoutStyle = "grid", containerBounds = null) {
  const viewportWidth = Number.isFinite(viewport?.width) ? viewport.width : 1280;
  const viewportHeight = Number.isFinite(viewport?.height) ? viewport.height : 720;
  const originX = Number.isFinite(containerBounds?.x) ? containerBounds.x : 72;
  const originY = Number.isFinite(containerBounds?.y) ? containerBounds.y : 96;
  const availableWidth = Number.isFinite(containerBounds?.width) ? containerBounds.width : Math.max(360, viewportWidth - originX * 2);
  const availableHeight = Number.isFinite(containerBounds?.height) ? containerBounds.height : Math.max(240, viewportHeight - originY * 2);

  if (layoutStyle === "hero") {
    return {
      x: Math.min(Math.max(0, Math.round(originX + 32)), Math.max(0, viewportWidth - 220)),
      y: Math.min(Math.max(0, Math.round(originY + 24 + index * 28)), Math.max(0, viewportHeight - 160))
    };
  }

  if (layoutStyle === "strip") {
    return {
      x: Math.min(Math.max(0, Math.round(originX + 24 + index * 196)), Math.max(0, viewportWidth - 220)),
      y: Math.min(Math.max(0, Math.round(originY + availableHeight * 0.5 - 70)), Math.max(0, viewportHeight - 140))
    };
  }

  if (layoutStyle === "stack") {
    return {
      x: Math.min(Math.max(0, Math.round(originX + availableWidth * 0.5 - 110 + (index % 2) * 28)), Math.max(0, viewportWidth - 220)),
      y: Math.min(Math.max(0, Math.round(originY + 24 + index * 92)), Math.max(0, viewportHeight - 140))
    };
  }

  const columns = Math.max(1, Math.min(4, Math.ceil(Math.sqrt(Math.max(1, assetCount)))));
  const horizontalPadding = originX + 24;
  const verticalPadding = originY + 24;
  const horizontalGap = 220;
  const verticalGap = 180;
  const row = Math.floor(index / columns);
  const column = index % columns;
  const baseX = horizontalPadding + column * horizontalGap;
  const baseY = verticalPadding + row * verticalGap;

  return {
    x: Math.min(Math.max(0, baseX), Math.max(0, viewportWidth - 180)),
    y: Math.min(Math.max(0, baseY), Math.max(0, viewportHeight - 120))
  };
}

function resolveDonorSceneKitImportLayerId(sceneKitSummary) {
  const requestedLayerId = String(state.donorAssetUi?.importTargetLayerId ?? "auto").trim();
  if (requestedLayerId && requestedLayerId !== "auto") {
    return requestedLayerId;
  }

  return sceneKitSummary?.layerId ?? "layer.gameplay";
}

function handleImportDonorAssetGroup(groupKey) {
  if (!state.editorData) {
    setPreviewStatus("No editable scene data is available for donor scene-kit import.");
    return false;
  }

  const groupSummary = getDonorAssetGroupSummary(groupKey);
  const sceneKitSummary = getDonorAssetGroupSceneKitSummary(groupKey);
  const donorAssets = getDonorAssetItemsForGroup(groupKey).filter((asset) => Boolean(asset?.previewUrl));
  if (donorAssets.length === 0) {
    setPreviewStatus("That donor scene kit does not have any usable local image assets on this machine.");
    return false;
  }

  if (getAssignableLayers().length === 0) {
    setPreviewStatus("Every layer is locked, so donor scene-kit import is currently blocked.");
    return false;
  }

  const createdObjectIds = [];
  const viewport = getSceneViewport();
  const targetLayerId = resolveDonorSceneKitImportLayerId(sceneKitSummary);
  let createdLayerName = getLayerById(targetLayerId)?.displayName ?? getDonorImportTargetLayerLabel();
  const containerPosition = buildDonorAssetGroupImportPosition(0, viewport, donorAssets.length, sceneKitSummary?.layoutStyle ?? "grid");
  let containerObjectId = null;
  const didChange = applyEditorMutation(`Imported donor scene kit ${groupSummary?.label ?? groupKey}.`, (editorData) => {
    const tools = getEditorStateTools();
    const containerObject = typeof tools.createDonorAssetGroupObject === "function"
      ? tools.createDonorAssetGroupObject(editorData, {
          displayName: `${sceneKitSummary?.label ?? groupSummary?.label ?? groupKey} Scene Kit`,
          selectedLayerId: targetLayerId,
          viewport,
          position: containerPosition,
          width: sceneKitSummary?.layoutStyle === "strip" ? 960 : sceneKitSummary?.layoutStyle === "stack" ? 360 : 760,
          height: sceneKitSummary?.layoutStyle === "hero" ? 420 : sceneKitSummary?.layoutStyle === "stack" ? 520 : 320,
          visible: false,
          notes: `Hidden scene-kit container for ${sceneKitSummary?.label ?? groupSummary?.label ?? groupKey}. Children keep the imported donor-backed visual pieces grouped together.`
        })
      : null;
    if (containerObject) {
      containerObjectId = containerObject.id;
      editorData.objects.push(containerObject);
    }
    donorAssets.forEach((asset, index) => {
      const nextObject = typeof tools.createDonorAssetObject === "function"
        ? tools.createDonorAssetObject(editorData, {
          asset,
          viewport,
          position: buildDonorAssetGroupImportPosition(index, viewport, donorAssets.length, sceneKitSummary?.layoutStyle ?? "grid", containerObject),
          selectedLayerId: targetLayerId,
          parentId: containerObjectId,
          displayName: `${sceneKitSummary?.label ?? groupSummary?.label ?? "Scene Kit"} · ${asset.title ?? asset.filename}`,
          notes: `${sceneKitSummary?.importLabel ?? "Scene kit"} import from donor scene kit ${groupSummary?.label ?? groupKey}.`
        })
        : null;

      if (!nextObject) {
        return;
      }

      const layer = editorData.layers.find((entry) => entry.id === nextObject.layerId);
      if (layer?.displayName) {
        createdLayerName = layer.displayName;
      }
      createdObjectIds.push(nextObject.id);
      editorData.objects.push(nextObject);
    });
  });

  if (!didChange || createdObjectIds.length === 0) {
    setPreviewStatus(`Could not import donor scene kit ${groupSummary?.label ?? groupKey}.`);
    return false;
  }

  const linkedTask = getProjectModificationTaskByKitGroupKey(groupKey);
  if (linkedTask) {
    setActiveProjectModificationTask(linkedTask.taskId, { render: false });
  }

  if (groupSummary?.kind === "modification-task-kit") {
    state.donorAssetUi.assetGroupFilter = groupKey;
  }
  setSelectedObjectIds(createdObjectIds, createdObjectIds[0]);
  state.donorAssetUi.highlightedAssetId = donorAssets[0]?.assetId ?? null;
  const importedSceneSection = containerObjectId ? getSceneSectionEntryById(containerObjectId) : getSceneSectionEntryForDonorAssetGroupKey(groupKey);
  if (importedSceneSection?.memberObjectIds?.length) {
    focusSceneObjectGroupInWorkflow(importedSceneSection.memberObjectIds, {
      label: "scene section",
      statusMessage: linkedTask
        ? `Imported ${createdObjectIds.length} donor-backed objects from task kit ${groupSummary?.label ?? groupKey} onto ${createdLayerName} and selected scene section ${importedSceneSection.label} for active task ${linkedTask.displayName}${linkedTask.sectionKey ? ` ${linkedTask.sectionKey}` : ""} in Compose Mode. Save to persist this grouped task kit import.`
        : `Imported ${createdObjectIds.length} donor-backed objects from ${sceneKitSummary?.importLabel ?? "scene kit"} ${groupSummary?.label ?? groupKey} onto ${createdLayerName} and selected scene section ${importedSceneSection.label} in Compose Mode. Save to persist this grouped kit import.`
    });
    return true;
  }

  ensureSelectedObject();
  renderAll();
  setPreviewStatus(linkedTask
    ? `Imported ${createdObjectIds.length} donor-backed objects from task kit ${groupSummary?.label ?? groupKey} onto ${createdLayerName}. Active task ${linkedTask.displayName}${linkedTask.sectionKey ? ` ${linkedTask.sectionKey}` : ""} is ready for grouped compose work. Save to persist this task kit import.`
    : `Imported ${createdObjectIds.length} donor-backed objects from ${sceneKitSummary?.importLabel ?? "scene kit"} ${groupSummary?.label ?? groupKey} onto ${createdLayerName}. Save to persist this grouped kit import.`);
  return true;
}

function handleReplaceSelectedObjectWithDonorAsset(assetId) {
  const selectedObject = getReplaceableSelectedObject();
  if (!selectedObject) {
    setPreviewStatus("Select an editable scene object before replacing it with a donor asset.");
    return false;
  }

  return handleReplaceObjectWithDonorAsset(selectedObject.id, assetId);
}

function handleReplaceObjectWithDonorAsset(objectId, assetId) {
  const selectedObject = typeof objectId === "string" ? getEditableObjectById(objectId) : null;
  if (!selectedObject || !isObjectEditable(selectedObject)) {
    setPreviewStatus("Drop-to-replace only works on an editable scene object.");
    return false;
  }

  const donorAsset = getDonorAssetById(assetId);
  if (!donorAsset) {
    setPreviewStatus("That donor asset is not available in the current local donor asset catalog.");
    return false;
  }

  if (!donorAsset.previewUrl) {
    setPreviewStatus("This donor asset does not have a usable local preview path on this machine.");
    return false;
  }

  let replacementResult = null;
  const didChange = applyEditorMutation(`Replaced ${selectedObject.displayName} with donor asset ${donorAsset.evidenceId}.`, (editorData) => {
    const tools = getEditorStateTools();
    replacementResult = typeof tools.replaceObjectWithDonorAsset === "function"
      ? tools.replaceObjectWithDonorAsset(editorData, selectedObject.id, {
        asset: donorAsset,
        viewport: getSceneViewport()
      })
      : null;
  });

  if (!didChange || !replacementResult) {
    setPreviewStatus(`Could not replace ${selectedObject.displayName} with donor asset ${donorAsset.evidenceId}.`);
    return false;
  }

  setSelectedObject(replacementResult.objectId);
  state.donorAssetUi.highlightedAssetId = assetId;
  ensureSelectedObject();
  renderAll();
  setPreviewStatus(`Replaced ${replacementResult.previousDisplayName} with ${replacementResult.nextDisplayName} on ${replacementResult.layerName}. Save to persist the donor-backed replacement.`);
  return true;
}

function buildDonorAssetDragPayload(assetId) {
  const donorAsset = getDonorAssetById(assetId);
  if (!donorAsset) {
    return null;
  }

  return {
    kind: "myide-donor-asset",
    assetId: donorAsset.assetId,
    evidenceId: donorAsset.evidenceId,
    filename: donorAsset.filename,
    repoRelativePath: donorAsset.repoRelativePath
  };
}

function readDonorAssetDragPayload(dataTransfer) {
  if (dataTransfer) {
    const rawPayload = dataTransfer.getData("application/x-myide-donor-asset")
      || dataTransfer.getData("text/plain");
    if (rawPayload) {
      try {
        const parsed = JSON.parse(rawPayload);
        if (parsed?.kind === "myide-donor-asset" && typeof parsed.assetId === "string") {
          return parsed;
        }
      } catch {
        // Fall through to the bounded renderer drag-session payload.
      }
    }
  }

  return state.donorAssetUi?.dragPayload?.kind === "myide-donor-asset"
    ? state.donorAssetUi.dragPayload
    : null;
}

function clearDonorDragState(viewport = null) {
  state.donorAssetUi.dragPayload = null;
  clearDonorDropIntent(viewport);
}

function processDonorAssetDrop(payload, scenePoint, intent = state.donorAssetUi?.dropIntent ?? null) {
  if (!payload || payload.kind !== "myide-donor-asset" || typeof payload.assetId !== "string" || payload.assetId.length === 0) {
    setPreviewStatus("Drop ignored because the donor payload was invalid. Start the drag from a donor asset card again.");
    return false;
  }

  const normalizedIntent = normalizeDonorDropIntent(intent);
  if (normalizedIntent?.mode === "replace" && normalizedIntent.objectId) {
    return handleReplaceObjectWithDonorAsset(normalizedIntent.objectId, payload.assetId);
  }

  return handleImportDonorAsset(payload.assetId, scenePoint);
}

function handleDuplicateSelectedObject() {
  const selectedObject = getSelectedObject();
  if (!selectedObject) {
    setPreviewStatus("Select an editable object before duplicating it.");
    return;
  }

  if (!isObjectEditable(selectedObject)) {
    setPreviewStatus("Locked objects cannot be duplicated.");
    return;
  }

  let duplicateId = null;
  const didChange = applyEditorMutation(`Duplicated ${selectedObject.displayName}.`, (editorData) => {
    if (!Array.isArray(editorData.objects)) {
      editorData.objects = [];
    }

    const sourceObject = editorData.objects.find((entry) => entry.id === selectedObject.id);
    if (!sourceObject) {
      return;
    }

    const duplicate = cloneEditableObjectForDuplicate(sourceObject, editorData.objects);
    const boundedPosition = clampObjectPosition(duplicate, duplicate.x, duplicate.y);
    duplicate.x = boundedPosition.x;
    duplicate.y = boundedPosition.y;
    duplicateId = duplicate.id;
    editorData.objects.push(duplicate);
  });

  if (!didChange || !duplicateId) {
    return;
  }

  setSelectedObject(duplicateId);
  ensureSelectedObject();
  renderAll();
  setPreviewStatus(`Duplicated ${selectedObject.displayName}. The new copy is selected and ready to move.`);
}

function handleDeleteSelectedObject() {
  const selectedObject = getSelectedObject();
  if (!selectedObject) {
    setPreviewStatus("Select an editable object before deleting it.");
    return;
  }

  if (!isObjectEditable(selectedObject)) {
    setPreviewStatus("Locked objects cannot be deleted.");
    return;
  }

  const nextSelectionId = selectNeighborAfterDelete(state.editorData, selectedObject.id, selectedObject.layerId);
  const didChange = applyEditorMutation(`Deleted ${selectedObject.displayName}.`, (editorData) => {
    if (!Array.isArray(editorData.objects)) {
      return;
    }

    const index = editorData.objects.findIndex((entry) => entry.id === selectedObject.id);
    if (index < 0) {
      return;
    }

    editorData.objects.splice(index, 1);
  });

  if (!didChange) {
    return;
  }

  setSelectedObject(nextSelectionId);
  ensureSelectedObject();
  renderAll();
  setPreviewStatus(`Deleted ${selectedObject.displayName}. Selection moved to the next available object.`);
}

function renderEditorCanvas() {
  if (!elements.editorCanvas) {
    return;
  }

  const editorData = state.editorData;
  if (!editorData) {
    elements.editorCanvas.innerHTML = `
      <div class="canvas-empty">
        <strong>No Editable Scene</strong>
        <span>This project does not yet have internal scene files under <code>internal/</code>.</span>
      </div>
    `;
    return;
  }

  const sortedLayers = sortLayers(editorData.layers);
  const renderableLayerIds = new Set(getRenderableLayerIds(editorData));
  const renderableSectionObjectIds = getRenderableSceneSectionObjectIds(editorData);
  const objectOrderById = new Map();
  sortedLayers.forEach((layer) => {
    getLayerObjectsInOrder(layer.id, editorData).forEach((object, index) => {
      objectOrderById.set(object.id, index);
    });
  });

  const objectMarkup = editorData.objects
    .filter((object) => renderableLayerIds.has(object.layerId))
    .filter((object) => !renderableSectionObjectIds || renderableSectionObjectIds.has(object.id))
    .map((object) => {
    const layer = getLayerById(object.layerId);
    const visible = object.visible;
    const locked = object.locked || layer?.locked;
    const dragging = state.canvasDrag?.objectId === object.id;
    const donorAsset = getDonorAssetForObject(object);
    const dimensions = getObjectDimensions(object);
    const layerOrder = typeof layer?.order === "number" ? layer.order : 0;
    const layerObjectOrder = objectOrderById.get(object.id) ?? 0;
    const style = [
      `left:${object.x}px`,
      `top:${object.y}px`,
      `width:${dimensions.width}px`,
      `height:${dimensions.height}px`,
      `transform:scale(${object.scaleX}, ${object.scaleY})`,
      `z-index:${layerOrder * 100 + layerObjectOrder + 1}`,
      visible ? "" : "display:none"
    ].filter(Boolean).join("; ");
    const selected = isObjectSelected(object.id);
    const primarySelected = object.id === state.selectedObjectId;
    const donorBacked = Boolean(donorAsset?.assetId);
    const showResizeHandle = primarySelected && donorBacked && isObjectSizeEditable(object);
    const replaceTarget = state.donorAssetUi?.dropIntent?.mode === "replace" && state.donorAssetUi.dropIntent.objectId === object.id;

    return `
      <button
        class="canvas-object object-${object.type} ${selected ? "is-selected" : ""} ${selected && !primarySelected ? "is-secondary-selected" : ""} ${locked ? "is-locked" : "is-draggable"} ${dragging ? "is-dragging" : ""} ${state.canvasResize?.objectId === object.id ? "is-resizing" : ""} ${donorBacked ? "is-donor-backed" : ""} ${replaceTarget ? "is-drop-replace-target" : ""}"
        type="button"
        data-canvas-object-id="${object.id}"
        data-object-x="${object.x}"
        data-object-y="${object.y}"
        data-object-width="${dimensions.width}"
        data-object-height="${dimensions.height}"
        style="${style}"
        title="${object.displayName}"
        aria-pressed="${selected ? "true" : "false"}"
      >
        ${donorAsset?.previewUrl ? `
          <span class="canvas-object-media">
            <img src="${escapeAttribute(donorAsset.previewUrl)}" alt="${escapeAttribute(object.displayName)} donor import preview" draggable="false" />
          </span>
        ` : ""}
        <span class="canvas-object-chrome">
          ${donorBacked ? `<span class="canvas-object-linkage-badge">${escapeHtml(String(donorAsset?.fileType ?? "donor").toUpperCase())} donor</span>` : ""}
          <span class="canvas-object-title">${object.displayName}</span>
          <small>${getObjectLabel(object)}</small>
        </span>
        ${showResizeHandle ? `<span class="canvas-resize-handle" data-canvas-resize-handle="se" title="Resize donor-backed image" aria-hidden="true"></span>` : ""}
      </button>
    `;
  }).join("");
  const selectedObjectIds = getSelectedObjectIds();
  const marqueeRect = getCanvasMarqueeRect();
  const marqueeMarkup = marqueeRect && state.canvasMarquee?.moved ? `
    <div
      class="canvas-selection-box ${state.canvasMarquee.additive ? "is-additive" : ""}"
      style="left:${marqueeRect.left}px; top:${marqueeRect.top}px; width:${marqueeRect.width}px; height:${marqueeRect.height}px;"
      aria-hidden="true"
    ></div>
  ` : "";

  const viewportWidth = editorData.scene.viewport?.width ?? 1280;
  const viewportHeight = editorData.scene.viewport?.height ?? 720;
  const selectedObject = getSelectedObject();
  const donorDropIntent = normalizeDonorDropIntent(state.donorAssetUi?.dropIntent ?? null);
  const selectedLayerLabel = getSelectedLayerLabel();
  const snapLabel = isSnapEnabled() ? `Snap ${getSnapSize()}px on` : "Snap off";
  const isolationLabel = isLayerIsolationActive()
    ? `Solo ${getIsolatedLayer()?.displayName ?? "layer"}`
    : "No solo layer";
  const sectionIsolationLabel = isSceneSectionIsolationActive()
    ? `Solo ${getSceneSectionEntryById(getIsolatedSceneSectionId())?.label ?? "section"}`
    : "No solo section";
  const view = getViewportState();
  const panLabel = `Pan ${Math.round(view.panX)}, ${Math.round(view.panY)}`;
  const viewLabel = `View ${Math.round(view.zoom * 100)}%`;
  const viewportInlineStyle = [
    `--scene-width:${viewportWidth}px`,
    `--scene-height:${viewportHeight}px`,
    `aspect-ratio:${viewportWidth} / ${viewportHeight}`
  ].join("; ");
  const cameraInlineStyle = [
    `width:${viewportWidth}px`,
    `height:${viewportHeight}px`,
    `transform: translate(${view.panX}px, ${view.panY}px) scale(${view.zoom})`
  ].join("; ");
  const stageClassNames = [
    "canvas-stage",
    isSnapEnabled() ? "is-snap-enabled" : "",
    isLayerIsolationActive() ? "is-layer-isolated" : "",
    isViewportTransformed() ? "is-view-transformed" : "",
    state.viewport.panDrag ? "is-panning" : "",
    state.canvasResize ? "is-resizing" : ""
  ].filter(Boolean).join(" ");
  const viewportClassNames = [
    "canvas-viewport",
    isViewportTransformed() ? "is-view-transformed" : "",
    state.viewport.panDrag ? "is-panning" : "",
    donorDropIntent ? "is-donor-drop-target" : "",
    donorDropIntent?.mode === "create" ? "is-donor-drop-create" : "",
    donorDropIntent?.mode === "replace" ? "is-donor-drop-replace" : ""
  ].filter(Boolean).join(" ");
  const dropIntentMarkup = donorDropIntent ? `
    <div class="canvas-drop-intent is-${escapeAttribute(donorDropIntent.mode)}">
      <strong>${donorDropIntent.mode === "replace" ? `Drop to replace ${escapeHtml(donorDropIntent.objectLabel ?? "selected object")}` : "Drop to create donor-backed image"}</strong>
      <span>${donorDropIntent.mode === "replace"
        ? `Keep ${escapeHtml(donorDropIntent.layerLabel ?? donorDropIntent.layerId ?? "current")} layout and donor linkage.`
        : `Create a new donor-backed image object on ${escapeHtml(donorDropIntent.layerLabel ?? donorDropIntent.layerId ?? "the chosen target layer")}.`}</span>
    </div>
  ` : "";

  elements.editorCanvas.innerHTML = `
    <div class="canvas-meta">
      <span>${editorData.scene.sceneId}</span>
      <span>${viewportWidth} × ${viewportHeight}</span>
      <span>Internal files only</span>
      <span>${viewLabel}</span>
      <span>${panLabel}</span>
      <span>${selectedObjectIds.length > 1
        ? `Selected: ${selectedObjectIds.length} objects (${selectedObject?.displayName ?? "multi"})`
        : selectedObject
          ? `Selected: ${selectedObject.displayName}`
          : "No selection"}</span>
      <span>Layer: ${selectedLayerLabel}</span>
      <span>Donor import target: ${escapeHtml(getDonorImportTargetLayerLabel())}</span>
      <span>${snapLabel}</span>
      <span>${isolationLabel}</span>
      <span>${sectionIsolationLabel}</span>
      <span>Space+drag or middle mouse pan</span>
    </div>
    <div class="${viewportClassNames}" tabindex="0" aria-label="Project editor canvas" data-donor-drop-zone="1" style="${viewportInlineStyle}">
      <div class="${stageClassNames}">
        ${dropIntentMarkup}
        <div class="canvas-camera" style="${cameraInlineStyle}">
          ${marqueeMarkup}
          ${objectMarkup}
        </div>
      </div>
    </div>
  `;
}

function renderMultiSelectionInspector(selectedProject, selectedObjects) {
  const primaryObject = getSelectedObject();
  const donorBackedObjects = selectedObjects.filter((object) => Boolean(getDonorAssetForObject(object)));
  const layerNames = uniqueStrings(selectedObjects.map((object) => getLayerById(object.layerId)?.displayName ?? object.layerId));
  const primaryDonorAsset = primaryObject ? getDonorAssetForObject(primaryObject) : null;

  return `
    <div class="tree-row multi-selection-summary">
      <strong>Multi-selection (${selectedObjects.length})</strong>
      <span>${selectedProject.displayName} · ${selectedObjects.length} scene object${selectedObjects.length === 1 ? "" : "s"} are selected for grouped composition actions.</span>
      <div class="chip-row">
        <span>primary ${escapeHtml(primaryObject?.displayName ?? "none")}</span>
        <span>${donorBackedObjects.length} donor-backed</span>
        <span>${layerNames.length} layer${layerNames.length === 1 ? "" : "s"}</span>
      </div>
      <small>Use the composition toolbar for align/distribute. Inspector field editing stays on the primary selection only.</small>
    </div>
    ${primaryDonorAsset ? `
      <div class="donor-linkage-summary">
        <div class="donor-linkage-summary-head">
          <div>
            <strong>Primary Donor Source</strong>
            <small>${escapeHtml(primaryObject?.displayName ?? primaryDonorAsset.title ?? primaryDonorAsset.assetId)} is donor-backed and can jump back to its source asset or evidence.</small>
          </div>
          <div class="evidence-actions">
            <button type="button" class="copy-button" data-focus-donor-asset-id="${escapeAttribute(primaryDonorAsset.assetId)}">Show Asset In Palette</button>
            ${primaryDonorAsset.evidenceId ? `<button type="button" class="copy-button" data-focus-donor-evidence-id="${escapeAttribute(primaryDonorAsset.evidenceId)}">Show Evidence</button>` : ""}
          </div>
        </div>
        <div class="chip-row donor-asset-chip-row">
          <span class="object-row-badge is-donor">Donor-backed</span>
          ${primaryDonorAsset.fileType ? `<span class="asset-format-badge">${escapeHtml(String(primaryDonorAsset.fileType).toUpperCase())}</span>` : ""}
          ${primaryDonorAsset.evidenceId ? `<span><code>${escapeHtml(primaryDonorAsset.evidenceId)}</code></span>` : ""}
          <span>${escapeHtml(primaryDonorAsset.filename ?? primaryDonorAsset.title ?? primaryDonorAsset.assetId)}</span>
        </div>
      </div>
    ` : ""}
    <div class="linked-object-list">
      ${selectedObjects.map((object) => {
        const donorAsset = getDonorAssetForObject(object);
        return `
          <div class="linked-object-button">
            <strong>${escapeHtml(object.displayName)}</strong>
            <small><code>${escapeHtml(object.id)}</code> · ${escapeHtml(getLayerById(object.layerId)?.displayName ?? object.layerId)} · ${donorAsset ? "donor-backed" : object.type}</small>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function renderInspector() {
  if (!elements.inspector) {
    return;
  }

  const selectedProject = getSelectedProject();
  const selectedObject = getSelectedObject();
  const selectedObjects = getSelectedObjects();
  const editorData = state.editorData;

  if (!selectedProject) {
    elements.inspector.innerHTML = `<div class="tree-row"><strong>No Project Selected</strong><span>Choose a project to inspect.</span></div>`;
    return;
  }

  if (state.workbenchMode === "runtime") {
    elements.inspector.innerHTML = renderRuntimeInspector();
    return;
  }

  if (!editorData) {
    elements.inspector.innerHTML = `
      <div class="tree-row">
        <strong>${selectedProject.displayName}</strong>
        <span>No editable scene data is available for this project yet.</span>
      </div>
    `;
    return;
  }

  if (!selectedObject) {
    elements.inspector.innerHTML = `
      <div class="tree-row">
        <strong>${selectedProject.displayName}</strong>
        <span>Select an object from the scene explorer or canvas to edit it.</span>
      </div>
    `;
    return;
  }

  if (selectedObjects.length > 1) {
    elements.inspector.innerHTML = renderMultiSelectionInspector(selectedProject, selectedObjects);
    return;
  }

  const layer = getLayerById(selectedObject.layerId);
  const locked = selectedObject.locked || layer?.locked;
  const sizeEditable = isObjectSizeEditable(selectedObject);
  const viewportAlignable = isViewportAlignableObject(selectedObject);
  const orderContext = getSelectedObjectOrderContext();
  const evidenceLinkage = getSelectedObjectEvidenceLinkage();
  const assignableLayers = getAssignableLayers().map((entry) => ({
    value: entry.id,
    label: `${entry.displayName}${entry.visible === false ? " (hidden)" : ""}`
  }));
  const projectNotes = selectedProject.notes ?? {};
  const inspectorInput = {
    subjectId: selectedObject.id,
    subjectKind: "object",
    title: selectedObject.displayName,
    subtitle: `${selectedProject.displayName} · ${selectedObject.type}`,
    mode: locked ? "inspect" : "edit",
    evidenceRefs: evidenceLinkage?.allEvidenceRefs ?? [],
    facts: [
      `Layer ${layer?.displayName ?? selectedObject.layerId} is ${layer?.visible === false ? "hidden" : "visible"} in the editor.`,
      isLayerIsolationActive() ? `Solo layer view is active for ${getIsolatedLayer()?.displayName ?? "the current layer"}.` : "Solo layer view is off.",
      `Current project lifecycle stage is ${labelizeStage(selectedProject.lifecycle?.currentStage)}.`,
      "Preview rendering and save/reload use internal project files only.",
      evidenceLinkage?.statusLabel ?? "No grounded evidence linkage is recorded for this object yet."
    ],
    assumptions: projectNotes.assumptions ?? [],
    unresolved: projectNotes.unresolvedQuestions ?? [],
    groups: [
      {
        groupId: "group.metadata",
        title: "Metadata",
        description: "Read-only identity and linkage details for the selected object.",
        rows: [
          { key: "id", label: "Object ID", value: selectedObject.id, status: "proven", fieldState: "read-only" },
          { key: "type", label: "Type", value: selectedObject.type, status: "proven", fieldState: "read-only" },
          { key: "layerId", label: "Layer ID", value: selectedObject.layerId, status: "proven", fieldState: "read-only" },
          {
            key: "orderIndex",
            label: "Order in Layer",
            value: orderContext
              ? `${orderContext.index + 1} of ${orderContext.total} in ${orderContext.layerId ?? selectedObject.layerId}`
              : "n/a",
            status: "proven",
            fieldState: "read-only"
          },
          {
            key: "assetRef",
            label: "Asset / Placeholder",
            value: selectedObject.assetRef ?? selectedObject.placeholderRef ?? "none",
            status: "proven",
            fieldState: "read-only"
          },
          {
            key: "donorEvidenceRef",
            label: "Donor Evidence Ref",
            value: selectedObject.donorAsset?.evidenceId ?? "No donor asset import recorded.",
            status: selectedObject.donorAsset?.evidenceId ? "proven" : "todo",
            fieldState: "read-only"
          },
          {
            key: "donorSourcePath",
            label: "Donor Source Path",
            value: selectedObject.donorAsset?.repoRelativePath ?? "No donor asset import path recorded.",
            status: selectedObject.donorAsset?.repoRelativePath ? "proven" : "todo",
            fieldState: "read-only"
          },
          { key: "lockState", label: "Lock State", value: locked ? "locked" : "editable", status: "proven", fieldState: "read-only" }
        ]
      },
      {
        groupId: "group.evidence-linkage",
        title: "Evidence Linkage",
        description: "Read-only donor linkage for the selected object. This build surfaces provenance context but does not edit donor assets directly.",
        rows: [
          {
            key: "linkageSummary",
            label: "Linkage Summary",
            value: evidenceLinkage?.linkageSummary ?? "No grouped linkage counts are recorded for this object yet.",
            status: evidenceLinkage?.allEvidenceRefs?.length ? "proven" : "todo",
            fieldState: "read-only"
          },
          {
            key: "linkageStatus",
            label: "Linkage Status",
            value: evidenceLinkage?.statusLabel ?? "No grounded evidence linkage is recorded for this object yet.",
            status: evidenceLinkage?.allEvidenceRefs?.length ? "proven" : "todo",
            fieldState: "read-only"
          },
          {
            key: "replayNode",
            label: "Replay Node",
            value: evidenceLinkage?.replayNodeId ?? selectedObject.id,
            status: "proven",
            fieldState: "read-only",
            copyValue: evidenceLinkage?.replayNodeId ?? selectedObject.id,
            copyLabel: "replay node id"
          },
          {
            key: "importNode",
            label: "Importer Node",
            value: evidenceLinkage?.importNodeId ?? "No importer node linkage recorded.",
            status: evidenceLinkage?.importNodeId ? "proven" : "todo",
            fieldState: "read-only",
            copyValue: evidenceLinkage?.importNodeId ?? "",
            copyLabel: "importer node id"
          },
          {
            key: "replayAssetLinkage",
            label: "Replay Asset Provenance",
            value: evidenceLinkage?.replayAssetLabel
              ? `${evidenceLinkage.assetRef} · ${evidenceLinkage.replayAssetLabel}`
              : evidenceLinkage?.assetRef ?? "No replay asset provenance recorded.",
            status: evidenceLinkage?.replayAssetLabel ? "proven" : "todo",
            fieldState: "read-only"
          },
          {
            key: "importAssetLinkage",
            label: "Importer Asset Provenance",
            value: evidenceLinkage?.importAssetLabel
              ? `${evidenceLinkage.assetRef} · ${evidenceLinkage.importAssetLabel}`
              : evidenceLinkage?.assetRef ?? "No importer asset provenance recorded.",
            status: evidenceLinkage?.importAssetLabel ? "proven" : "todo",
            fieldState: "read-only"
          },
          {
            key: "importNodeEvidenceRefs",
            label: "Importer Node Refs",
            value: evidenceLinkage?.importNodeEvidenceRefs?.length
              ? `${evidenceLinkage.importNodeEvidenceRefs.length} grounded importer node refs`
              : "No importer node refs recorded.",
            status: evidenceLinkage?.importNodeEvidenceRefs?.length ? "proven" : "todo",
            fieldState: "read-only",
            evidenceRefs: evidenceLinkage?.importNodeEvidenceRefs ?? []
          },
          {
            key: "replayAssetEvidenceRefs",
            label: "Replay Asset Refs",
            value: evidenceLinkage?.replayAssetEvidenceRefs?.length
              ? `${evidenceLinkage.replayAssetEvidenceRefs.length} grounded replay asset refs`
              : "No replay asset refs recorded.",
            status: evidenceLinkage?.replayAssetEvidenceRefs?.length ? "proven" : "todo",
            fieldState: "read-only",
            evidenceRefs: evidenceLinkage?.replayAssetEvidenceRefs ?? []
          },
          {
            key: "importAssetEvidenceRefs",
            label: "Importer Asset Refs",
            value: evidenceLinkage?.importAssetEvidenceRefs?.length
              ? `${evidenceLinkage.importAssetEvidenceRefs.length} grounded importer asset refs`
              : "No importer asset refs recorded.",
            status: evidenceLinkage?.importAssetEvidenceRefs?.length ? "proven" : "todo",
            fieldState: "read-only",
            evidenceRefs: evidenceLinkage?.importAssetEvidenceRefs ?? []
          },
          {
            key: "directEvidenceRefs",
            label: "Any Direct Node Evidence",
            value: evidenceLinkage?.directEvidenceRefs?.length
              ? `${evidenceLinkage.directEvidenceRefs.length} grounded node refs across replay/import metadata`
              : "No direct node evidence refs recorded.",
            status: evidenceLinkage?.directEvidenceRefs?.length ? "proven" : "todo",
            fieldState: "read-only",
            evidenceRefs: evidenceLinkage?.directEvidenceRefs ?? []
          },
          {
            key: "localDonorEvidenceRefs",
            label: "Local Donor Import Refs",
            value: evidenceLinkage?.localDonorEvidenceRefs?.length
              ? `${evidenceLinkage.localDonorEvidenceRefs.length} donor refs attached directly to this imported object`
              : "No local donor import refs recorded.",
            status: evidenceLinkage?.localDonorEvidenceRefs?.length ? "proven" : "todo",
            fieldState: "read-only",
            evidenceRefs: evidenceLinkage?.localDonorEvidenceRefs ?? []
          },
          {
            key: "assetEvidenceRefs",
            label: "Any Asset Evidence",
            value: evidenceLinkage?.assetEvidenceRefs?.length
              ? `${evidenceLinkage.assetEvidenceRefs.length} grounded asset refs across replay/import metadata`
              : "No asset evidence refs recorded.",
            status: evidenceLinkage?.assetEvidenceRefs?.length ? "proven" : "todo",
            fieldState: "read-only",
            evidenceRefs: evidenceLinkage?.assetEvidenceRefs ?? []
          },
          {
            key: "stateEvidence",
            label: "State Linkage",
            value: evidenceLinkage?.stateLinks?.length
              ? evidenceLinkage.stateLinks.map((entry) => `${entry.stateId} (${entry.actionTypes.join(", ")})`).join("; ")
              : "No state linkage recorded for this object.",
            status: evidenceLinkage?.stateLinks?.length ? "proven" : "todo",
            fieldState: "read-only",
            evidenceRefs: evidenceLinkage?.stateEvidenceRefs ?? []
          },
          {
            key: "animationEvidence",
            label: "Animation Linkage",
            value: evidenceLinkage?.animationLinks?.length
              ? evidenceLinkage.animationLinks.map((entry) => `${entry.animationId} (${entry.properties.join(", ")})`).join("; ")
              : "No animation linkage recorded for this object.",
            status: evidenceLinkage?.animationLinks?.length ? "proven" : "todo",
            fieldState: "read-only",
            evidenceRefs: evidenceLinkage?.animationEvidenceRefs ?? []
          },
          {
            key: "linkageNotes",
            label: "Linkage Notes",
            value: evidenceLinkage?.notes?.length
              ? evidenceLinkage.notes.join(" ")
              : "No importer or replay provenance notes are recorded for this object yet.",
            status: evidenceLinkage?.notes?.length ? "proven" : "todo",
            fieldState: "read-only"
          }
        ]
      },
      {
        groupId: "group.transform",
        title: "Editable Properties",
        description: "Core properties for the first save/reload editor slice.",
        rows: [
          {
            key: "displayName",
            label: "Display Name",
            value: selectedObject.displayName,
            status: "proven",
            fieldKind: "text",
            fieldState: locked ? "locked" : "editable",
            path: ["objects", selectedObject.id, "displayName"]
          },
          {
            key: "layerId",
            label: "Assigned Layer",
            value: selectedObject.layerId,
            status: "proven",
            fieldKind: "select",
            fieldState: locked ? "locked" : "editable",
            options: assignableLayers,
            path: ["objects", selectedObject.id, "layerId"],
            notes: "Only unlocked layers are valid reassignment targets."
          },
          {
            key: "x",
            label: "X",
            value: selectedObject.x,
            status: "proven",
            fieldKind: "number",
            fieldState: locked ? "locked" : "editable",
            path: ["objects", selectedObject.id, "x"]
          },
          {
            key: "y",
            label: "Y",
            value: selectedObject.y,
            status: "proven",
            fieldKind: "number",
            fieldState: locked ? "locked" : "editable",
            path: ["objects", selectedObject.id, "y"]
          },
          {
            key: "width",
            label: "Width",
            value: Number.isFinite(selectedObject.width) ? selectedObject.width : getObjectDimensions(selectedObject).width,
            status: "proven",
            fieldKind: "number",
            fieldState: sizeEditable ? "editable" : "locked",
            path: ["objects", selectedObject.id, "width"],
            notes: sizeEditable
              ? "Placeholder-backed objects only. Values are clamped to safe positive bounds."
              : "Width editing is currently limited to editable placeholder-backed objects."
          },
          {
            key: "height",
            label: "Height",
            value: Number.isFinite(selectedObject.height) ? selectedObject.height : getObjectDimensions(selectedObject).height,
            status: "proven",
            fieldKind: "number",
            fieldState: sizeEditable ? "editable" : "locked",
            path: ["objects", selectedObject.id, "height"],
            notes: sizeEditable
              ? "Placeholder-backed objects only. Values are clamped to safe positive bounds."
              : "Height editing is currently limited to editable placeholder-backed objects."
          },
          {
            key: "scaleX",
            label: "Scale X",
            value: selectedObject.scaleX,
            status: "proven",
            fieldKind: "number",
            fieldState: locked ? "locked" : "editable",
            path: ["objects", selectedObject.id, "scaleX"]
          },
          {
            key: "scaleY",
            label: "Scale Y",
            value: selectedObject.scaleY,
            status: "proven",
            fieldKind: "number",
            fieldState: locked ? "locked" : "editable",
            path: ["objects", selectedObject.id, "scaleY"]
          },
          {
            key: "visible",
            label: "Visible",
            value: selectedObject.visible,
            status: "proven",
            fieldKind: "boolean",
            fieldState: locked ? "locked" : "editable",
            path: ["objects", selectedObject.id, "visible"]
          }
        ]
      },
      {
        groupId: "group.notes",
        title: "Notes",
        description: "Object and project notes that keep the editor workflow honest.",
        rows: [
          {
            key: "objectNotes",
            label: "Object Notes",
            value: selectedObject.notes ?? "No object notes yet.",
            status: "proven",
            fieldState: "read-only"
          },
          {
            key: "projectFact",
            label: "Project Fact",
            value: projectNotes.proven?.[0] ?? "Project metadata loaded from the workspace registry.",
            status: "proven",
            fieldState: "read-only"
          },
          {
            key: "projectPlan",
            label: "Planned Work",
            value: projectNotes.planned?.[0] ?? "Keep the editor slice bounded and local-first.",
            status: "todo",
            fieldState: "read-only"
          }
        ]
      }
    ]
  };
  const propertyPanel = typeof window.myideApi?.buildPropertyPanelViewModel === "function"
    ? window.myideApi.buildPropertyPanelViewModel(inspectorInput)
    : inspectorInput;
  const replaceableSelectedObject = getReplaceableSelectedObject();
  const donorAsset = getDonorAssetForObject(selectedObject);
  const sceneKitContext = getSceneKitContextForObject(selectedObject);
  const sceneSectionEntry = sceneKitContext?.sectionId
    ? getSceneSectionEntryById(sceneKitContext.sectionId)
    : null;
  const sceneSectionRuntimeContext = sceneSectionEntry?.runtimeContext ?? null;
  const sceneSectionProvenance = sceneSectionEntry?.provenance ?? null;
  const sceneSectionGamePartSummary = sceneSectionEntry?.gamePartSummary ?? null;
  const sceneSectionState = sceneSectionEntry?.stateSummary ?? null;
  const sceneSectionOverrideCandidate = sceneSectionRuntimeContext?.overrideCandidate ?? null;
  const taskSectionContext = getProjectModificationTaskContextForSceneKit(sceneKitContext, { selectedObject });
  const runtimeReferenceMatch = donorAsset
    ? getRuntimeReferenceScreens().find((entry) => entry.evidenceId === donorAsset.evidenceId) ?? null
    : null;
  const evidenceDrilldownMarkup = renderSelectedObjectEvidenceDrilldown(evidenceLinkage);
  const donorSummaryMarkup = donorAsset
    ? `
      <div class="donor-linkage-summary">
        <div class="donor-linkage-summary-head">
          <div>
            <strong>Imported Donor Asset</strong>
            <small>This object is backed by read-only donor image evidence. Editing still happens on the internal scene object only.</small>
          </div>
          <div class="evidence-actions">
            <button type="button" class="copy-button" data-focus-donor-asset-id="${escapeAttribute(donorAsset.assetId)}">Show Asset In Palette</button>
            ${donorAsset.evidenceId ? `<button type="button" class="copy-button" data-focus-donor-evidence-id="${escapeAttribute(donorAsset.evidenceId)}">Show Evidence</button>` : ""}
            ${runtimeReferenceMatch ? `<button type="button" class="copy-button" data-switch-workbench-mode="runtime" data-switch-workflow-panel="runtime" data-switch-status="${escapeAttribute(`Runtime Mode is active again. ${runtimeReferenceMatch.label} is the strongest grounded runtime context for ${donorAsset.title ?? donorAsset.assetId}.`)}">Open Runtime Context</button>` : ""}
            ${renderCopyButton(donorAsset.assetId, "donor asset id")}
            ${renderCopyButton(donorAsset.absolutePath ?? donorAsset.repoRelativePath ?? "", "donor source path", "Copy Path")}
          </div>
        </div>
        ${donorAsset.previewUrl ? `
          <div class="evidence-preview evidence-preview-image donor-linkage-preview">
            <img src="${escapeAttribute(donorAsset.previewUrl)}" alt="${escapeAttribute(donorAsset.title ?? selectedObject.displayName)} donor import preview" loading="lazy" />
          </div>
        ` : ""}
        <div class="chip-row donor-asset-chip-row">
          <span class="object-row-badge is-donor">Donor-backed object</span>
          ${sceneKitContext ? `<span class="object-row-badge">${escapeHtml(sceneKitContext.sectionLabel)}</span>` : ""}
          ${donorAsset.fileType ? `<span class="asset-format-badge">${escapeHtml(String(donorAsset.fileType).toUpperCase())}</span>` : ""}
          ${donorAsset.captureSessionId ? `<span>${escapeHtml(donorAsset.captureSessionId)}</span>` : ""}
          ${donorAsset.evidenceId ? `<span><code>${escapeHtml(donorAsset.evidenceId)}</code></span>` : ""}
        </div>
        <div class="detail-grid donor-linkage-grid">
          <div class="detail-card">
            <span>Donor Asset ID</span>
            <strong><code>${escapeHtml(donorAsset.assetId ?? selectedObject.assetRef ?? "unknown")}</code></strong>
          </div>
          <div class="detail-card">
            <span>Filename</span>
            <strong>${escapeHtml(donorAsset.filename ?? donorAsset.title ?? "unknown")}</strong>
          </div>
          <div class="detail-card">
            <span>Source Path</span>
            <strong><code>${escapeHtml(donorAsset.repoRelativePath ?? "unknown")}</code></strong>
          </div>
          <div class="detail-card">
            <span>Source Category</span>
            <strong>${escapeHtml(donorAsset.sourceCategory ?? "unknown")}</strong>
          </div>
          <div class="detail-card">
            <span>Placement Layer</span>
            <strong>${escapeHtml(layer?.displayName ?? selectedObject.layerId)}</strong>
          </div>
        </div>
      </div>
    `
    : "";
  const sceneKitSummaryMarkup = sceneKitContext
    ? `
      <div class="donor-linkage-summary">
        <div class="donor-linkage-summary-head">
          <div>
            <strong>Imported Scene Section</strong>
            <small>This donor-backed object belongs to a grouped scene section created from one harvested donor scene kit, not just a one-off image card.</small>
          </div>
          <div class="evidence-actions">
            <button type="button" class="copy-button" data-focus-donor-asset-group-key="${escapeAttribute(sceneKitContext.groupKey)}">Show Scene Kit In Palette</button>
            ${sceneKitContext.sectionId ? `<button type="button" class="copy-button" data-focus-scene-section-id="${escapeAttribute(sceneKitContext.sectionId)}">Select Scene Section</button>` : ""}
            ${sceneKitContext.sectionId ? `<button type="button" class="copy-button" data-focus-scene-section-assets-id="${escapeAttribute(sceneKitContext.sectionId)}">Show Section Assets</button>` : ""}
            ${sceneKitContext.sectionId ? `<button type="button" class="copy-button" data-frame-scene-section-id="${escapeAttribute(sceneKitContext.sectionId)}">Frame Section</button>` : ""}
            ${sceneKitContext.sectionId ? `<button type="button" class="copy-button" data-center-scene-section-id="${escapeAttribute(sceneKitContext.sectionId)}">Center Section</button>` : ""}
            ${sceneKitContext.sectionId ? `<button type="button" class="copy-button" data-toggle-scene-section-visibility-id="${escapeAttribute(sceneKitContext.sectionId)}">${escapeHtml(sceneSectionState?.visibilityButtonLabel ?? "Hide Section")}</button>` : ""}
            ${sceneKitContext.sectionId ? `<button type="button" class="copy-button" data-toggle-scene-section-lock-id="${escapeAttribute(sceneKitContext.sectionId)}">${escapeHtml(sceneSectionState?.lockButtonLabel ?? "Lock Section")}</button>` : ""}
            ${sceneKitContext.sectionId ? `<button type="button" class="copy-button" data-toggle-scene-section-isolation-id="${escapeAttribute(sceneKitContext.sectionId)}">${escapeHtml(sceneSectionState?.isolationButtonLabel ?? "Solo Section")}</button>` : ""}
            ${sceneKitContext.sectionId ? `<button type="button" class="copy-button" data-reorder-scene-section-id="${escapeAttribute(sceneKitContext.sectionId)}" data-reorder-scene-section-action="send-backward">Send Section Backward</button>` : ""}
            ${sceneKitContext.sectionId ? `<button type="button" class="copy-button" data-reorder-scene-section-id="${escapeAttribute(sceneKitContext.sectionId)}" data-reorder-scene-section-action="bring-forward">Bring Section Forward</button>` : ""}
            ${sceneKitContext.sectionId ? `<button type="button" class="copy-button" data-scale-scene-section-up-id="${escapeAttribute(sceneKitContext.sectionId)}">Scale Section Up</button>` : ""}
            ${sceneKitContext.sectionId ? `<button type="button" class="copy-button" data-scale-scene-section-down-id="${escapeAttribute(sceneKitContext.sectionId)}">Scale Section Down</button>` : ""}
            ${sceneKitContext.sectionId ? `<button type="button" class="copy-button" data-restore-scene-section-defaults-id="${escapeAttribute(sceneKitContext.sectionId)}">Restore Section Defaults</button>` : ""}
            ${sceneKitContext.sectionId && sceneSectionGamePartSummary?.sceneKitSummary?.layoutStyle ? `<button type="button" class="copy-button" data-reset-scene-section-layout-id="${escapeAttribute(sceneKitContext.sectionId)}">Reset Section Layout</button>` : ""}
            ${sceneKitContext.sectionId && (sceneSectionRuntimeContext?.preferredWorkbenchEntry || sceneSectionRuntimeContext?.preferredReference) ? `<button type="button" class="copy-button" data-open-scene-section-runtime-id="${escapeAttribute(sceneKitContext.sectionId)}">Open Runtime Group</button>` : ""}
            ${sceneKitContext.sectionId && sceneSectionProvenance?.evidenceIds?.length ? `<button type="button" class="copy-button" data-focus-scene-section-evidence-id="${escapeAttribute(sceneKitContext.sectionId)}">Show Section Evidence</button>` : ""}
            ${sceneKitContext.sectionId && sceneSectionOverrideCandidate?.eligible ? `<button type="button" class="copy-button" data-create-scene-section-override-id="${escapeAttribute(sceneKitContext.sectionId)}">Create Override</button>` : ""}
            ${sceneKitContext.sectionId && sceneSectionOverrideCandidate?.activeOverride ? `<button type="button" class="copy-button" data-clear-scene-section-override-id="${escapeAttribute(sceneKitContext.sectionId)}">Clear Override</button>` : ""}
            ${sceneKitContext.sectionId && sceneSectionGamePartSummary?.sceneKitSummary?.layerId ? `<button type="button" class="copy-button" data-restore-scene-section-layer-id="${escapeAttribute(sceneKitContext.sectionId)}">Restore Suggested Layer</button>` : ""}
            ${sceneKitContext.sectionId ? `<button type="button" class="copy-button" data-duplicate-scene-section-id="${escapeAttribute(sceneKitContext.sectionId)}">Duplicate Section</button>` : ""}
            ${sceneKitContext.sectionId ? `<button type="button" class="copy-button" data-delete-scene-section-id="${escapeAttribute(sceneKitContext.sectionId)}">Delete Section</button>` : ""}
            <button type="button" class="copy-button" data-focus-scene-object-ids="${escapeAttribute(JSON.stringify(sceneKitContext.memberObjects.map((entry) => entry.id)))}">Select This Scene Kit</button>
            ${renderCopyButton(sceneKitContext.memberObjects.map((entry) => entry.id).join("\n"), `scene kit object ids for ${sceneKitContext.groupSummary.label}`, "Copy Kit IDs")}
            ${sceneSectionProvenance?.donorAssetIds?.length ? renderCopyButton(sceneSectionProvenance.donorAssetIds.join("\n"), `donor asset ids for ${sceneKitContext.sectionLabel}`, "Copy Asset IDs") : ""}
            ${sceneSectionProvenance?.evidenceIds?.length ? renderCopyButton(sceneSectionProvenance.evidenceIds.join("\n"), `evidence refs for ${sceneKitContext.sectionLabel}`, "Copy Evidence Refs") : ""}
            ${sceneSectionProvenance?.summaryText ? renderCopyButton(sceneSectionProvenance.summaryText, `reconstruction kit summary for ${sceneKitContext.sectionLabel}`, "Copy Kit Summary") : ""}
            ${sceneSectionGamePartSummary?.summaryText ? renderCopyButton(sceneSectionGamePartSummary.summaryText, `game-part summary for ${sceneKitContext.sectionLabel}`, "Copy Game-Part Summary") : ""}
          </div>
        </div>
        <div class="chip-row donor-asset-chip-row">
          <span class="object-row-badge">${escapeHtml(sceneKitContext.groupSummary.importLabel)}</span>
          <span>${escapeHtml(sceneKitContext.sectionLabel)}</span>
          <span>${escapeHtml(sceneKitContext.groupSummary.layerLabel)}</span>
          <span>${escapeHtml(sceneKitContext.groupSummary.layoutStyle)} layout</span>
          <span>${sceneKitContext.memberObjects.length} object${sceneKitContext.memberObjects.length === 1 ? "" : "s"}</span>
          ${sceneSectionState?.visibilityStatusLabel ? `<span>${escapeHtml(sceneSectionState.visibilityStatusLabel)}</span>` : ""}
          ${sceneSectionState?.lockStatusLabel ? `<span>${escapeHtml(sceneSectionState.lockStatusLabel)}</span>` : ""}
          ${sceneSectionState?.scaleStatusLabel ? `<span>${escapeHtml(sceneSectionState.scaleStatusLabel)}</span>` : ""}
          ${sceneSectionState?.isolationStatusLabel ? `<span>${escapeHtml(sceneSectionState.isolationStatusLabel)}</span>` : ""}
          ${sceneSectionRuntimeContext?.statusLabel ? `<span>${escapeHtml(sceneSectionRuntimeContext.statusLabel)}</span>` : ""}
          ${sceneSectionOverrideCandidate?.eligible ? `<span>override-ready</span>` : sceneSectionOverrideCandidate?.activeOverride ? `<span>override-active</span>` : ""}
          ${sceneSectionProvenance?.sourceCategories?.map((entry) => `<span>${escapeHtml(entry)}</span>`).join("") ?? ""}
        </div>
        <div class="detail-grid donor-linkage-grid">
          <div class="detail-card">
            <span>Scene Section</span>
            <strong>${escapeHtml(sceneKitContext.sectionLabel)}</strong>
          </div>
          <div class="detail-card">
            <span>Scene Kit Label</span>
            <strong>${escapeHtml(sceneKitContext.groupSummary.label)}</strong>
          </div>
          <div class="detail-card">
            <span>Target Layer</span>
            <strong>${escapeHtml(sceneKitContext.groupSummary.layerLabel)}</strong>
          </div>
          <div class="detail-card">
            <span>Layout</span>
            <strong>${escapeHtml(sceneKitContext.groupSummary.layoutStyle)}</strong>
          </div>
          <div class="detail-card">
            <span>Members</span>
            <strong>${sceneKitContext.memberObjects.length}</strong>
          </div>
          <div class="detail-card ${sceneSectionProvenance ? "is-positive" : "is-alert"}">
            <span>Reconstruction Kit Provenance</span>
            <strong>${escapeHtml(sceneSectionProvenance
              ? `${sceneSectionProvenance.donorAssets.length} donor asset${sceneSectionProvenance.donorAssets.length === 1 ? "" : "s"} · ${sceneSectionProvenance.evidenceIds.length} evidence ref${sceneSectionProvenance.evidenceIds.length === 1 ? "" : "s"}`
              : "No grouped donor provenance captured yet")}</strong>
            <small>${escapeHtml(sceneSectionProvenance
              ? `${sceneSectionProvenance.sourceCategories.join(", ") || "source unknown"} · ${sceneSectionProvenance.captureSessions.join(", ") || "session unknown"}${sceneSectionProvenance.primaryGroupSummary ? ` · ${sceneSectionProvenance.primaryGroupSummary.label}` : ""}`
              : "This imported section has not yet resolved back to grouped donor asset provenance.")}</small>
          </div>
          <div class="detail-card ${sceneSectionGamePartSummary ? "is-positive" : "is-alert"}">
            <span>Game-Part Summary</span>
            <strong>${escapeHtml(sceneSectionGamePartSummary?.roleLabel ?? "No grouped game-part summary yet")}</strong>
            <small>${escapeHtml(sceneSectionGamePartSummary
              ? `${sceneSectionGamePartSummary.readinessLabel}${sceneSectionGamePartSummary.sceneKitSummary?.label ? ` · ${sceneSectionGamePartSummary.sceneKitSummary.label}` : ""}`
              : "This imported section has not yet resolved into a grouped game-part summary.")}</small>
          </div>
          <div class="detail-card ${sceneSectionRuntimeContext?.preferredWorkbenchEntry ? "is-positive" : sceneSectionRuntimeContext?.preferredReference ? "" : "is-alert"}">
            <span>Runtime-linked Group</span>
            <strong>${escapeHtml(sceneSectionRuntimeContext?.preferredWorkbenchEntry?.relativePath ?? sceneSectionRuntimeContext?.preferredReference?.label ?? "No grounded runtime link yet")}</strong>
            <small>${escapeHtml(sceneSectionRuntimeContext?.note ?? "This imported scene section does not yet map back to a grounded runtime workbench entry or supporting runtime phase reference.")}</small>
          </div>
          <div class="detail-card">
            <span>Runtime Bridge</span>
            <strong>${escapeHtml(sceneSectionRuntimeContext?.donorAsset?.assetId ?? sceneSectionRuntimeContext?.evidenceItem?.evidenceId ?? "No bridge asset/evidence yet")}</strong>
            <small>${escapeHtml(sceneSectionRuntimeContext?.preferredWorkbenchEntry
              ? `${sceneSectionRuntimeContext.preferredWorkbenchEntry.statusLabel} · ${sceneSectionRuntimeContext.preferredWorkbenchEntry.requestSummary}`
              : sceneSectionRuntimeContext?.preferredReference
                ? sceneSectionRuntimeContext.preferredReference.note
                : "No runtime-facing donor bridge has been recorded for this imported section yet.")}</small>
          </div>
          <div class="detail-card ${sceneSectionOverrideCandidate?.eligible || sceneSectionOverrideCandidate?.activeOverride ? "is-positive" : "is-alert"}">
            <span>Section Override</span>
            <strong>${escapeHtml(sceneSectionOverrideCandidate?.activeOverride?.overrideRepoRelativePath ?? (sceneSectionOverrideCandidate?.eligible ? "Eligible grouped override" : "Override not grounded for this section"))}</strong>
            <small>${escapeHtml(sceneSectionOverrideCandidate?.note ?? "No grouped runtime override candidate is available for this imported section yet.")}</small>
          </div>
        </div>
      </div>
    `
    : "";
  const taskSectionMarkup = taskSectionContext
    ? `
      <div class="donor-linkage-summary">
        <div class="donor-linkage-summary-head">
          <div>
            <strong>Active Task Section Tools</strong>
            <small>This grouped Compose section is backed by a prepared modification task, so task-local edit actions can stay on the current section instead of bouncing back to the donor palette.</small>
          </div>
          <div class="evidence-actions">
            ${taskSectionContext.isActiveTask
              ? `<button type="button" class="copy-button" data-project-modification-action="open-compose-task" data-project-modification-task-id="${escapeAttribute(taskSectionContext.task.taskId)}">Resume Task</button>`
              : `<button type="button" class="copy-button" data-project-modification-action="start-task" data-project-modification-task-id="${escapeAttribute(taskSectionContext.task.taskId)}">Start Task</button>`}
            <button type="button" class="copy-button" data-focus-donor-asset-group-key="${escapeAttribute(taskSectionContext.taskKitGroupSummary?.key ?? sceneKitContext.groupKey)}">Show Task Kit</button>
            <button type="button" class="copy-button" data-project-modification-action="open-runtime-task" data-project-modification-task-id="${escapeAttribute(taskSectionContext.task.taskId)}" ${taskSectionContext.task.canOpenRuntime ? "" : "disabled"}>Open Runtime</button>
            ${taskSectionContext.task.sourceArtifactPath ? renderCopyButton(taskSectionContext.task.sourceArtifactPath, `${taskSectionContext.task.displayName} source artifact path`, "Copy Task Artifact") : ""}
          </div>
        </div>
        <div class="chip-row donor-asset-chip-row">
          <span>${taskSectionContext.isActiveTask ? "active task" : "task available"}</span>
          <span>${escapeHtml(taskSectionContext.task.taskStatus)}</span>
          <span>${escapeHtml(taskSectionContext.task.sourceArtifactKind)}</span>
          <span>${escapeHtml(String(taskSectionContext.taskKitAssets.length))} task source${taskSectionContext.taskKitAssets.length === 1 ? "" : "s"}</span>
        </div>
        <small>${escapeHtml(taskSectionContext.task.nextAction)}</small>
        <small>${escapeHtml(taskSectionContext.task.rationale)}</small>
        ${taskSectionContext.visibleReconstructionPages.length > 0 ? `
          <div class="evidence-linked-objects">
            <div class="evidence-subsection-head donor-replace-head">
              <strong>Page-Aware Reconstruction Guide</strong>
              <span class="muted-copy">${escapeHtml(taskSectionContext.selectedReconstructionPage
                ? `Selected object most likely maps to ${taskSectionContext.selectedReconstructionPage.pageName}. Use that grounded page cue first, then widen out to the rest of the section bundle.`
                : "This task artifact already identifies the grounded page sources, fit modes, and affected slots or attachments for this grouped section.")}</span>
            </div>
            <div class="detail-grid donor-linkage-grid">
              ${taskSectionContext.visibleReconstructionPages.map((page) => {
                const usesSelectedSource = page.matchedTaskKitAsset?.assetId && page.matchedTaskKitAsset.assetId === donorAsset?.assetId;
                const pageRuntimeEntry = page.matchedRuntimeWorkbenchEntry ?? null;
                const leadTarget = page.topAffectedAttachmentName
                  ? `attachment · ${page.topAffectedAttachmentName}`
                  : page.topAffectedSlotName
                    ? `slot · ${page.topAffectedSlotName}`
                    : "No top slot or attachment cue recorded yet";
                const cueSummary = `${page.affectedLayerCount} affected layer${page.affectedLayerCount === 1 ? "" : "s"} · ${page.affectedSlotNames.length} slot cue${page.affectedSlotNames.length === 1 ? "" : "s"} · ${page.affectedAttachmentNames.length} attachment cue${page.affectedAttachmentNames.length === 1 ? "" : "s"}`;
                const runtimeMatchLabel = page?.runtimeMatchKind === "page-proof"
                  ? "page proof"
                  : page?.runtimeMatchKind === "debug-host-fallback"
                  ? "debug host proof (unscoped)"
                  : page?.runtimeMatchKind === "donor-asset"
                    ? "donor asset match"
                    : page?.runtimeMatchKind === "page-source"
                      ? "page source match"
                      : page?.runtimeMatchKind === "cue-token"
                        ? "cue token match"
                        : "";
                const runtimeSummary = pageRuntimeEntry
                  ? `runtime · ${pageRuntimeEntry.relativePath ?? pageRuntimeEntry.localMirrorRepoRelativePath ?? pageRuntimeEntry.sourceUrl}${runtimeMatchLabel ? ` · ${runtimeMatchLabel}` : ""}`
                  : taskSectionContext.task.canOpenRuntime
                    ? "runtime · no page-linked runtime trace is loaded yet; use Debug Host for the stronger request-backed proof path."
                    : "runtime · runtime trace is not available for this task yet.";

                return `
                  <div
                    class="detail-card ${taskSectionContext.selectedReconstructionPage?.pageName === page.pageName ? "is-positive" : ""}"
                    data-task-reconstruction-page="${escapeAttribute(page.pageName)}"
                    data-task-reconstruction-related="${taskSectionContext.selectedReconstructionPage?.pageName === page.pageName ? "1" : "0"}"
                  >
                    <span>${escapeHtml(page.pageName)}${taskSectionContext.selectedReconstructionPage?.pageName === page.pageName ? " · selected object cue" : ""}</span>
                    <strong>${escapeHtml(labelizeStatus(page.selectedMode ?? page.pageState ?? "page"))}${page.topAffectedSlotName || page.topAffectedAttachmentName ? ` · ${escapeHtml(page.topAffectedSlotName ?? page.topAffectedAttachmentName)}` : ""}</strong>
                    <small>${escapeHtml(leadTarget)}</small>
                    <small>${escapeHtml(page.nextReconstructionStep ?? page.selectedReason ?? "Continue using the grounded page source for final section reconstruction.")}</small>
                    <small>${page.selectedLocalPath ? `source · ${escapeHtml(getPathBasename(page.selectedLocalPath) ?? page.selectedLocalPath)}` : "source · pending"}</small>
                    <small>${escapeHtml(runtimeSummary)}</small>
                    <small>${escapeHtml(cueSummary)}</small>
                    <small>${escapeHtml(page.matchedSceneMembers.length > 0
                      ? `${page.matchedSceneMembers.length} grouped member${page.matchedSceneMembers.length === 1 ? "" : "s"} already use this page source`
                      : "No grouped section member is currently tied to this exact page source yet.")}</small>
                    <div class="evidence-actions">
                      ${page.leadSceneMember ? `
                        <button
                          type="button"
                          class="copy-button"
                          data-task-reconstruction-focus-object-id="${escapeAttribute(page.leadSceneMember.id)}"
                          title="Select the strongest single grouped member for ${escapeAttribute(page.pageName)}"
                        >${page.matchedSceneMembers.length > 1 ? "Select Lead Member" : "Select Page Member"}</button>
                      ` : ""}
                      ${page.matchedSceneMembers.length > 0 ? `
                        <button
                          type="button"
                          class="copy-button"
                          data-task-reconstruction-object-ids="${escapeAttribute(JSON.stringify(page.matchedSceneMembers.map((entry) => entry.id)))}"
                          title="Select grouped Compose members already tied to ${escapeAttribute(page.pageName)}"
                        >${page.matchedSceneMembers.length === 1 ? "Select Page Members" : `Select ${page.matchedSceneMembers.length} Page Members`}</button>
                      ` : ""}
                      ${page.matchedTaskKitAsset?.assetId ? `
                        <button
                          type="button"
                          class="copy-button"
                          data-focus-donor-asset-id="${escapeAttribute(page.matchedTaskKitAsset.assetId)}"
                          title="Focus the donor asset card for ${escapeAttribute(page.pageName)}"
                        >Show Page Asset</button>
                      ` : ""}
                      ${page.matchedTaskKitAsset?.evidenceId ? `
                        <button
                          type="button"
                          class="copy-button"
                          data-focus-donor-evidence-id="${escapeAttribute(page.matchedTaskKitAsset.evidenceId)}"
                          title="Focus the donor evidence item for ${escapeAttribute(page.pageName)}"
                        >Show Page Evidence</button>
                      ` : ""}
                      ${pageRuntimeEntry?.sourceUrl ? `
                        <button
                          type="button"
                          class="copy-button"
                          data-task-reconstruction-runtime-source-url="${escapeAttribute(pageRuntimeEntry.sourceUrl)}"
                          data-task-reconstruction-task-id="${escapeAttribute(taskSectionContext.task.taskId)}"
                          data-task-reconstruction-page-name="${escapeAttribute(page.pageName)}"
                          data-task-reconstruction-runtime-label="${escapeAttribute(page.pageName)}"
                          title="${page?.runtimeMatchKind === "debug-host-fallback"
                            ? "Open Runtime Mode on the best available Debug Host proof (not page-specific yet)"
                            : `Open Runtime Mode on the strongest runtime trace for ${escapeAttribute(page.pageName)}`}"
                        >${page?.runtimeMatchKind === "debug-host-fallback" ? "Open Runtime Proof" : "Open Page Runtime"}</button>
                      ` : taskSectionContext.task.canOpenRuntime ? `
                        <button
                          type="button"
                          class="copy-button"
                          data-task-reconstruction-open-debug-host="1"
                          data-task-reconstruction-task-id="${escapeAttribute(taskSectionContext.task.taskId)}"
                          data-task-reconstruction-page-name="${escapeAttribute(page.pageName)}"
                          data-task-reconstruction-runtime-label="${escapeAttribute(page.pageName)}"
                          data-task-reconstruction-runtime-profile-id="${escapeAttribute(taskSectionContext.task.recommendedRuntimeProfile ?? "autoplay")}"
                          data-task-reconstruction-runtime-hint-tokens="${escapeAttribute(JSON.stringify(getProjectModificationTaskPageMatchTokens(page)))}"
                          title="Use the dedicated Runtime Debug Host when this page cue has no loaded runtime trace yet"
                        >Use Debug Host</button>
                      ` : ""}
                      ${replaceableSelectedObject && page.matchedTaskKitAsset && page.matchedTaskKitAsset.assetId !== donorAsset?.assetId ? `
                        <button
                          type="button"
                          class="copy-button"
                          data-task-section-replace-asset-id="${escapeAttribute(page.matchedTaskKitAsset.assetId)}"
                          data-task-section-task-id="${escapeAttribute(taskSectionContext.task.taskId)}"
                          title="Replace ${escapeAttribute(replaceableSelectedObject.displayName)} with the grounded source for ${escapeAttribute(page.pageName)}"
                        >Use This Page Source</button>
                      ` : ""}
                      ${usesSelectedSource ? `<span class="muted-copy">Selected object already uses this grounded page source.</span>` : ""}
                      ${page.selectedLocalPath ? renderCopyButton(page.selectedLocalPath, `${taskSectionContext.task.displayName} ${page.pageName} source path`, "Copy Page Source") : ""}
                    </div>
                  </div>
                `;
              }).join("")}
            </div>
            ${taskSectionContext.hiddenReconstructionPageCount > 0 ? `<p class="muted-copy">+${escapeHtml(String(taskSectionContext.hiddenReconstructionPageCount))} more page cue${taskSectionContext.hiddenReconstructionPageCount === 1 ? "" : "s"} remain in this source artifact. Use Show Task Kit or Copy Task Artifact for the full grounded bundle.</p>` : ""}
          </div>
        ` : ""}
        <div class="evidence-linked-objects">
          <div class="evidence-subsection-head donor-replace-head">
            <strong>Task-Aware Replace</strong>
            ${replaceableSelectedObject
              ? `<span class="muted-copy">Replace ${escapeHtml(replaceableSelectedObject.displayName)} from the active task kit while preserving layer and layout.</span>`
              : sceneKitContext.memberObjects[0]
                ? `<button type="button" class="copy-button" data-focus-scene-object-id="${escapeAttribute(sceneKitContext.memberObjects[0].id)}">Select First Editable Member</button>`
                : `<span class="muted-copy">Select a single editable section member to replace it with one task source while preserving layout.</span>`}
          </div>
          ${replaceableSelectedObject && taskSectionContext.visibleReplaceAssets.length > 0 ? `
            <div class="linked-object-list">
              ${taskSectionContext.visibleReplaceAssets.map((asset) => `
                <button
                  type="button"
                  class="linked-object-button"
                  data-task-section-replace-asset-id="${escapeAttribute(asset.assetId)}"
                  data-task-section-task-id="${escapeAttribute(taskSectionContext.task.taskId)}"
                  title="Replace ${escapeAttribute(replaceableSelectedObject.displayName)} with ${escapeAttribute(asset.title)}"
                >
                  <strong>${escapeHtml(asset.title)}</strong>
                  <small>${escapeHtml(asset.filename)} · replace ${escapeHtml(replaceableSelectedObject.displayName)}</small>
                </button>
              `).join("")}
            </div>
          ` : ""}
          ${!replaceableSelectedObject ? `<p class="muted-copy">The reopened task section starts grouped. Select one editable member first, then use these task-aware replace actions.</p>` : ""}
          ${replaceableSelectedObject && taskSectionContext.visibleReplaceAssets.length === 0 ? `<p class="muted-copy">No alternate grounded task source is available beyond the currently linked donor asset for this object.</p>` : ""}
          ${taskSectionContext.hiddenReplaceAssetCount > 0 ? `<p class="muted-copy">+${escapeHtml(String(taskSectionContext.hiddenReplaceAssetCount))} more grounded task source image${taskSectionContext.hiddenReplaceAssetCount === 1 ? "" : "s"} remain in this task kit. Use Show Task Kit to browse the full set.</p>` : ""}
        </div>
      </div>
    `
    : "";
  const evidenceSummaryMarkup = propertyPanel.evidenceRefs.length > 0
    ? `
      <div class="inspector-evidence-summary">
        <strong>Grounded Evidence Refs</strong>
        ${renderEvidenceRefChips(propertyPanel.evidenceRefs, "selected object grounded ref")}
      </div>
    `
    : `
      <div class="inspector-evidence-summary">
        <strong>Grounded Evidence Refs</strong>
        <p class="muted-copy">No grounded evidence refs are recorded for this object yet. The selected object is still part of the internal scene editor, not a direct donor asset.</p>
      </div>
    `;

  const groupsMarkup = propertyPanel.groups.map((group) => {
    const rowsMarkup = group.rows.map((row) => renderInspectorRow(row)).join("");
    return `
      <section>
        <h4>${group.title}</h4>
        ${group.description ? `<p class="inspector-purpose">${group.description}</p>` : ""}
        <div class="inspector-rows">${rowsMarkup}</div>
      </section>
    `;
  }).join("");

  elements.inspector.innerHTML = `
    <div class="inspector-title">
      <p>${propertyPanel.mode === "edit" ? "Selected Object" : "Selected Object (Locked)"}</p>
      <h3>${propertyPanel.title}</h3>
    </div>
    <p class="inspector-purpose">${propertyPanel.subtitle ?? (selectedObject.notes ?? "First editor slice object.")}</p>
    <div class="chip-row">
      <span>${propertyPanel.editableRowCount} editable</span>
      <span>${propertyPanel.readOnlyRowCount} read-only</span>
      <span>${locked ? "locked by object/layer" : "local-first editor"}</span>
      <span>${viewportAlignable ? "viewport alignable" : "alignment locked"}</span>
    </div>
    ${donorSummaryMarkup}
    ${sceneKitSummaryMarkup}
    ${taskSectionMarkup}
    ${evidenceSummaryMarkup}
    ${evidenceDrilldownMarkup}
    ${groupsMarkup}
  `;
}

function renderInspectorRow(row) {
  const disabled = row.fieldState !== "editable" ? "disabled" : "";
  const noteMarkup = row.notes ? `<small class="muted-copy">${escapeHtml(row.notes)}</small>` : "";
  const evidenceMarkup = Array.isArray(row.evidenceRefs) && row.evidenceRefs.length > 0
    ? renderEvidenceRefChips(row.evidenceRefs, row.label.toLowerCase())
    : "";
  const value = row.value;
  const copyButtonMarkup = row.copyValue ? renderCopyButton(String(row.copyValue), row.copyLabel ?? row.label) : "";

  if (row.fieldKind === "boolean") {
    return `
      <label class="toggle-field">
        <input name="${escapeAttribute(row.key)}" type="checkbox" ${value ? "checked" : ""} ${disabled} />
        <span>${row.label}</span>
      </label>
      ${evidenceMarkup}
      ${noteMarkup}
    `;
  }

  if (row.fieldKind === "multiline") {
    return `
      <label class="form-field">
        <span>${row.label}</span>
        <textarea name="${escapeAttribute(row.key)}" ${disabled}>${escapeHtml(value)}</textarea>
      </label>
      ${evidenceMarkup}
      ${noteMarkup}
    `;
  }

  if (row.fieldKind === "select" && Array.isArray(row.options)) {
    const optionsMarkup = row.options.map((option) => `
      <option value="${escapeAttribute(option.value)}" ${String(option.value) === String(value) ? "selected" : ""}>${option.label}</option>
    `).join("");

    return `
      <label class="form-field">
        <span>${row.label}</span>
        <select name="${escapeAttribute(row.key)}" ${disabled}>${optionsMarkup}</select>
      </label>
      ${evidenceMarkup}
      ${noteMarkup}
    `;
  }

  if (row.fieldKind === "text" || row.fieldKind === "number") {
    return `
      <label class="form-field">
        <span>${row.label}</span>
        <input
          name="${escapeAttribute(row.key)}"
          type="${row.fieldKind === "number" ? "number" : "text"}"
          ${row.fieldKind === "number" ? 'step="0.1"' : ""}
          value="${escapeAttribute(value)}"
          ${disabled}
        />
      </label>
      ${evidenceMarkup}
      ${noteMarkup}
    `;
  }

  return `
    <div class="tree-row copyable-tree-row">
      <div class="copyable-tree-content">
        <strong>${row.label}</strong>
        <span>${escapeHtml(value)}</span>
      </div>
      ${copyButtonMarkup}
    </div>
    ${evidenceMarkup}
    ${noteMarkup}
  `;
}

function renderActivityLog() {
  if (!elements.activityLog) {
    return;
  }

  elements.activityLog.innerHTML = state.activityLog
    .map((entry) => `<li><strong>${entry.stamp}</strong> ${entry.text}</li>`)
    .join("");
}

function renderRuntimeWorkbenchAssetList() {
  const entries = getRuntimeWorkbenchEntries();
  const focusedSourceUrl = getRuntimeWorkbenchSourceUrl()
    ?? getRuntimeOverrideCandidate().runtimeSourceUrl
    ?? entries[0]?.sourceUrl
    ?? null;
  const embeddedRequestBackedImages = getRuntimeResourceMapEntries().filter((entry) => (
    entry.requestCategory === "static-asset"
    && ["png", "webp", "jpg", "jpeg", "svg"].includes(String(entry.fileType ?? "").toLowerCase())
  ));
  const workbenchMessage = entries.length === 0
    ? "Open Debug Host to populate the official runtime workbench. The embedded path has not recorded any usable runtime source entries in this session yet."
    : embeddedRequestBackedImages.length === 0
      ? "No request-backed static image is available from the weaker embedded runtime path yet. The dedicated Runtime Debug Host result is ranked first and should be treated as the official daily runtime path."
      : "Request-backed runtime items are ranked with the strongest debug-host/static candidates first so you can jump quickly into source, evidence, compose, and override actions.";

  const listMarkup = entries.slice(0, 10).map((entry) => {
    const isFocused = focusedSourceUrl === entry.sourceUrl;
    const rowClasses = [
      "runtime-workbench-entry",
      entry.kind === "debug-host-proof" ? "is-proven" : "",
      entry.overrideRepoRelativePath ? "is-override" : "",
      isFocused ? "is-focused" : ""
    ].filter(Boolean).join(" ");
    const actionButtons = [
      `<button type="button" class="copy-button" data-runtime-source-url="${escapeAttribute(entry.sourceUrl)}" data-runtime-source-action="select">${isFocused ? "Focused" : "Use Trace"}</button>`,
      `<button type="button" class="copy-button" data-runtime-source-url="${escapeAttribute(entry.sourceUrl)}" data-runtime-source-action="open-debug-host">Use Debug Host</button>`,
      entry.donorAsset ? `<button type="button" class="copy-button" data-focus-donor-asset-id="${escapeAttribute(entry.donorAsset.assetId)}">Asset</button>` : "",
      entry.evidenceItem ? `<button type="button" class="copy-button" data-focus-donor-evidence-id="${escapeAttribute(entry.evidenceItem.evidenceId)}">Evidence</button>` : "",
      entry.sceneObject ? `<button type="button" class="copy-button" data-focus-scene-object-id="${escapeAttribute(entry.sceneObject.id)}">Compose</button>` : "",
      entry.isStaticImage && entry.donorAsset
        ? `<button type="button" class="copy-button" data-runtime-source-url="${escapeAttribute(entry.sourceUrl)}" data-runtime-source-action="create-override">Create Override</button>`
        : "",
      entry.activeOverride
        ? `<button type="button" class="copy-button" data-runtime-source-url="${escapeAttribute(entry.sourceUrl)}" data-runtime-source-action="clear-override">Clear Override</button>`
        : ""
    ].filter(Boolean).join("");

    return `
      <article class="${rowClasses}">
        <div class="runtime-workbench-entry-head">
          <div class="runtime-workbench-entry-title">
            <strong>${escapeHtml(entry.relativePath ?? entry.sourceUrl)}</strong>
            <small>${escapeHtml(entry.note || entry.requestSummary || "No additional runtime note recorded.")}</small>
          </div>
          <div class="chip-row runtime-workbench-chips">
            <span>${escapeHtml(entry.statusLabel || (entry.isStaticImage ? "Static asset" : "Runtime dependency"))}</span>
            <span>${escapeHtml(entry.requestSource ?? entry.kind)}</span>
            <span>${entry.hitCount} hit${entry.hitCount === 1 ? "" : "s"}</span>
            ${entry.overrideHitCountAfterReload > 0 ? `<span>${entry.overrideHitCountAfterReload} override hit${entry.overrideHitCountAfterReload === 1 ? "" : "s"}</span>` : ""}
          </div>
        </div>
        <div class="runtime-workbench-meta">
          <span><strong>URL</strong> <code>${escapeHtml(entry.sourceUrl)}</code></span>
          <span><strong>Local</strong> ${escapeHtml(entry.localMirrorRepoRelativePath ?? "not mirrored locally")}</span>
          <span><strong>Override</strong> ${escapeHtml(entry.overrideRepoRelativePath ?? "no active override")}</span>
          <span><strong>Source bridge</strong> ${escapeHtml(entry.donorAsset?.assetId ?? entry.evidenceItem?.evidenceId ?? entry.sceneObject?.id ?? "not grounded yet")}</span>
        </div>
        <div class="evidence-actions">
          ${actionButtons}
        </div>
      </article>
    `;
  }).join("");

  return `
    <div class="tree-row runtime-workbench-summary">
      <strong>Runtime Asset Workbench</strong>
      <span>${escapeHtml(workbenchMessage)}</span>
    </div>
    ${entries.length > 0
      ? `<div class="runtime-workbench-list">${listMarkup}</div>`
      : `<div class="tree-row"><strong>No runtime workbench items yet</strong><span>${escapeHtml(workbenchMessage)}</span></div>`}
  `;
}

function renderInspectorSection(title, countLabel, body, options = {}) {
  const open = options.open !== false;
  return `
    <details class="evidence-section inspector-section"${open ? " open" : ""}>
      <summary>
        <span>${escapeHtml(title)}</span>
        ${countLabel ? `<span class="summary-count">${escapeHtml(countLabel)}</span>` : ""}
      </summary>
      <div class="evidence-section-body inspector-section-body">
        ${body}
      </div>
    </details>
  `;
}

function renderRuntimeWorkbench() {
  const runtimeLaunch = getRuntimeLaunchInfo();
  const runtimeModeActive = state.workbenchMode === "runtime";
  const runtimeWebview = getRuntimeWebview();
  const runtimeOverrideStatus = getRuntimeOverrideStatus();
  const runtimeMirrorStatus = getRuntimeMirrorStatus();
  const runtimeResourceMap = getRuntimeResourceMapStatus();
  const runtimeCoverage = getRuntimeCoverageStatus();
  const runtimeAssetUseEntries = getRuntimeAssetUseEntries();
  const latestResourceEntry = getRuntimeResourceMapEntries()[0] ?? null;
  const debugHostResult = state.runtimeUi.debugHost;

  if (elements.runtimeWorkbench) {
    elements.runtimeWorkbench.hidden = !runtimeModeActive;
  }
  if (elements.sceneWorkbench) {
    elements.sceneWorkbench.hidden = runtimeModeActive;
  }
  if (elements.runtimeToolbar) {
    elements.runtimeToolbar.hidden = !runtimeModeActive;
  }
  if (elements.editorToolbar) {
    elements.editorToolbar.hidden = runtimeModeActive;
  }
  if (runtimeWebview && !state.runtimeUi.launched && runtimeWebview.src && runtimeWebview.src !== "about:blank") {
    runtimeWebview.src = "about:blank";
  }

  elements.workbenchModebar?.querySelectorAll("[data-workbench-mode]").forEach((button) => {
    if (!(button instanceof HTMLButtonElement)) {
      return;
    }

    const isActive = button.dataset.workbenchMode === state.workbenchMode;
    button.dataset.tone = isActive ? "active" : "default";
    button.setAttribute("aria-selected", isActive ? "true" : "false");
  });

  if (!elements.runtimeStatus) {
    return;
  }

  if (!runtimeLaunch) {
    elements.runtimeStatus.innerHTML = `
      <div class="tree-row">
        <strong>Runtime Mode Blocked</strong>
        <span>No grounded donor runtime entry is indexed for this project yet.</span>
      </div>
    `;
    return;
  }

  const runtimeUrl = state.runtimeUi.currentUrl ?? runtimeLaunch.entryUrl;
  const support = state.runtimeUi.controlSupport ?? {};
  const blockerSummary = [
    runtimeLaunch.blocker,
    support.pause ? null : state.runtimeUi.controlBlockers.pause,
    support.step ? null : state.runtimeUi.controlBlockers.step
  ].filter((value) => typeof value === "string" && value.trim().length > 0);
  const currentStatus = !state.runtimeUi.launched
    ? "Ready to launch"
    : state.runtimeUi.loading
      ? "Launching live donor runtime"
      : state.runtimeUi.ready
        ? "Runtime bridge attached"
        : "Runtime surface loaded without an inspection bridge yet";
  const commandSummary = state.runtimeUi.lastCommand
    ? `${state.runtimeUi.lastCommand}${state.runtimeUi.lastCommandStatus?.ok ? " completed" : state.runtimeUi.lastCommandStatus?.blocked ? " blocked" : ""}`
    : "No runtime command sent yet";
  const assetGroupSummary = Array.isArray(runtimeLaunch.observedAssetGroups) && runtimeLaunch.observedAssetGroups.length > 0
    ? runtimeLaunch.observedAssetGroups.slice(0, 6).join(", ")
    : "No live asset-group observations indexed yet.";

  elements.runtimeStatus.innerHTML = `
    <div class="tree-row runtime-status-summary">
      <strong>Runtime Workbench</strong>
      <span>${escapeHtml(currentStatus)}. ${runtimeLaunch.localRuntimePackageAvailable
        ? "The grounded local runtime mirror is active on this machine, and the dedicated Runtime Debug Host is the official daily runtime path."
        : "No local donor runtime mirror is captured, so runtime work still falls back to the recorded donor entry."}</span>
      <div class="chip-row">
        <span>${escapeHtml(runtimeLaunch.captureSessionId ?? "runtime session unknown")}</span>
        <span>${escapeHtml(runtimeLaunch.runtimeSourceLabel ?? "Blocked")}</span>
        <span>${debugHostResult?.status === "pass" ? "debug host proved" : "debug host pending"}</span>
        <span>${runtimeLaunch.entryUrl ? "runtime entry ready" : "launch blocked"}</span>
        <span>${state.runtimeUi.inspectEnabled ? "embedded pick armed" : "embedded pick idle"}</span>
        <span>${state.runtimeUi.diagnostics?.pixiVersion ? `Pixi ${escapeHtml(state.runtimeUi.diagnostics.pixiVersion)}` : runtimeLaunch.pixiVersion ? `Pixi ${escapeHtml(runtimeLaunch.pixiVersion)}` : "Pixi version unknown"}</span>
      </div>
    </div>
    <div class="tree-row runtime-workbench-callout">
      <strong>Official daily path</strong>
      <span>${escapeHtml(debugHostResult?.status === "pass"
        ? `Use Debug Host is now the practical runtime workflow for project_001. The latest run proved ${debugHostResult.candidateRuntimeRelativePath ?? debugHostResult.candidateRuntimeSourceUrl ?? "the current request-backed image"} with ${debugHostResult.overrideHitCountAfterReload ?? 0} override hit${Number(debugHostResult.overrideHitCountAfterReload ?? 0) === 1 ? "" : "s"} after reload.`
        : "Use Debug Host to run the official runtime trace and override-proof cycle. The integrated embedded runtime remains available, but it is secondary until it exposes stronger asset truth.")}</span>
      <div class="evidence-actions">
        <button type="button" class="copy-button" data-runtime-action="open-debug-host">Use Debug Host</button>
        <button type="button" class="copy-button" data-runtime-action="launch">Launch Embedded Runtime</button>
        <button type="button" class="copy-button" data-switch-workflow-panel="runtime" data-switch-workbench-mode="scene" data-switch-status="Compose Mode is active. The runtime workbench kept the current project context.">Switch To Compose</button>
      </div>
    </div>
    <div class="detail-grid runtime-detail-grid">
      <div class="detail-card ${debugHostResult?.status === "pass" ? "is-positive" : debugHostResult?.error ? "is-alert" : ""}">
        <span>Runtime Debug Host</span>
        <strong>${escapeHtml(debugHostResult?.status === "pass"
          ? `${debugHostResult.overrideHitCountAfterReload ?? 0} override hit${debugHostResult.overrideHitCountAfterReload === 1 ? "" : "s"} proved`
          : "Open Debug Host to start official runtime work")}</strong>
        <small>${escapeHtml(debugHostResult
          ? debugHostResult.error
            ?? `${debugHostResult.candidateRuntimeRelativePath ?? debugHostResult.candidateRuntimeSourceUrl ?? "No request-backed candidate"} · ${debugHostResult.candidateRequestSource ?? "request source unknown"}`
          : "The dedicated Runtime Debug Host uses the same local mirror, but it is the path that currently proves request-backed static image work.")}</small>
      </div>
      <div class="detail-card">
        <span>Runtime Entry</span>
        <strong>${escapeHtml(runtimeLaunch.runtimeSourceLabel ?? "Blocked")}</strong>
        <small>${runtimeLaunch.entryUrl ? `<code>${escapeHtml(runtimeLaunch.entryUrl)}</code>` : "No grounded launch URL is recorded."}</small>
      </div>
      <div class="detail-card">
        <span>Current Runtime URL</span>
        <strong>${escapeHtml(state.runtimeUi.pageTitle ?? "No live page title yet")}</strong>
        <small>${runtimeUrl ? `<code>${escapeHtml(runtimeUrl)}</code>` : "Runtime has not been launched in this session yet."}</small>
      </div>
      <div class="detail-card">
        <span>Available Actions</span>
        <strong>${runtimeLaunch.availableActions.length > 0 ? escapeHtml(runtimeLaunch.availableActions.join(", ")) : "Not captured"}</strong>
        <small>${runtimeLaunch.roundId ? `ROUND_ID ${escapeHtml(runtimeLaunch.roundId)}` : "No live round id captured."}</small>
      </div>
      <div class="detail-card">
        <span>Last Runtime Command</span>
        <strong>${escapeHtml(commandSummary)}</strong>
        <small>${escapeHtml(state.runtimeUi.lastCommandStatus?.detail ?? state.runtimeUi.lastCommandStatus?.blocked ?? "Launch or inspect the runtime to gather live status.")}</small>
      </div>
      <div class="detail-card">
        <span>Observed Asset Groups</span>
        <strong>${runtimeLaunch.observedAssetGroups.length > 0 ? `${runtimeLaunch.observedAssetGroups.length} runtime asset groups` : "No grouped observation yet"}</strong>
        <small>${escapeHtml(assetGroupSummary)}</small>
      </div>
      <div class="detail-card ${runtimeMirrorStatus?.available ? "is-positive" : "is-alert"}">
        <span>Local Mirror Status</span>
        <strong>${runtimeMirrorStatus?.available ? `${runtimeMirrorStatus.entryCount} mirrored runtime files` : "Local mirror unavailable"}</strong>
        <small>${escapeHtml(runtimeMirrorStatus?.available
          ? `${runtimeMirrorStatus.manifestRepoRelativePath} · ${runtimeMirrorStatus.resourceVersion ? `v${runtimeMirrorStatus.resourceVersion}` : "version unknown"}`
          : runtimeMirrorStatus?.blocker ?? "Capture the local runtime mirror to prefer a local host path.")}</small>
      </div>
      <div class="detail-card ${runtimeResourceMap?.entryCount ? "is-positive" : ""}">
        <span>Runtime Resource Map</span>
        <strong>${runtimeResourceMap?.entryCount ? `${runtimeResourceMap.entryCount} recorded runtime source${runtimeResourceMap.entryCount === 1 ? "" : "s"}` : "No runtime requests recorded yet"}</strong>
        <small>${escapeHtml(latestResourceEntry
          ? `${latestResourceEntry.runtimeRelativePath ?? latestResourceEntry.canonicalSourceUrl} · ${latestResourceEntry.hitCount} hit${latestResourceEntry.hitCount === 1 ? "" : "s"} · ${latestResourceEntry.requestSource}`
          : "Launch or reload Runtime Mode to capture requested URLs, local mirror files, override redirects, and hit counts.")}</small>
      </div>
      <div class="detail-card ${runtimeAssetUseEntries.length > 0 ? "is-positive" : ""}">
        <span>Live Asset-use Map</span>
        <strong>${runtimeAssetUseEntries.length > 0 ? `${runtimeAssetUseEntries.length} live runtime asset hint${runtimeAssetUseEntries.length === 1 ? "" : "s"}` : "No live asset-use hints yet"}</strong>
        <small>${escapeHtml(runtimeAssetUseEntries[0]
          ? `${runtimeAssetUseEntries[0].relativePath ?? runtimeAssetUseEntries[0].url} · ${runtimeAssetUseEntries[0].hitCount} live hit${runtimeAssetUseEntries[0].hitCount === 1 ? "" : "s"} · ${runtimeAssetUseEntries[0].initiatorType}`
          : state.runtimeUi.diagnostics?.engineNote ?? "Launch the runtime and inspect the live surface to populate the asset-use map.")}</small>
      </div>
      <div class="detail-card ${runtimeCoverage?.localStaticEntryCount ? "is-positive" : runtimeCoverage?.upstreamStaticEntryCount ? "is-alert" : ""}">
        <span>Static Asset Coverage</span>
        <strong>${runtimeCoverage ? `${runtimeCoverage.localStaticEntryCount} local · ${runtimeCoverage.upstreamStaticEntryCount} upstream` : "No static runtime coverage yet"}</strong>
        <small>${escapeHtml(runtimeCoverage
          ? runtimeCoverage.unresolvedUpstreamCount > 0
            ? `${runtimeCoverage.unresolvedUpstreamCount} upstream bootstrap/static dependency${runtimeCoverage.unresolvedUpstreamCount === 1 ? "" : "ies"} remain.`
            : "Recorded static/runtime bootstrap requests are currently being served locally in this slice."
          : "Launch or reload Runtime Mode to measure local-vs-upstream static coverage.")}</small>
      </div>
      <div class="detail-card ${runtimeOverrideStatus?.entryCount ? "is-positive" : ""}">
        <span>Project-local Overrides</span>
        <strong>${runtimeOverrideStatus?.entryCount ? `${runtimeOverrideStatus.entryCount} active override${runtimeOverrideStatus.entryCount === 1 ? "" : "s"}` : "No active runtime override"}</strong>
        <small>${escapeHtml(runtimeOverrideStatus?.entries?.[0]
          ? `${runtimeOverrideStatus.entries[0].runtimeRelativePath} -> ${runtimeOverrideStatus.entries[0].donorAssetId} (${runtimeOverrideStatus.entries[0].hitCount} runtime hit${runtimeOverrideStatus.entries[0].hitCount === 1 ? "" : "s"})`
          : "Create a bounded project-local override from the runtime trace when an eligible static image is grounded.")}</small>
      </div>
      <div class="detail-card ${blockerSummary.length > 0 ? "is-alert" : "is-positive"}">
        <span>Current Runtime Blocker</span>
        <strong>${blockerSummary.length > 0 ? "Partial runtime control limits remain" : "No runtime blocker recorded in this slice"}</strong>
        <small>${escapeHtml(blockerSummary[0] ?? "Launch, reload, and inspect are available in the current runtime slice.")}</small>
      </div>
    </div>
  `;
}

function renderRuntimeInspector() {
  const runtimeLaunch = getRuntimeLaunchInfo();
  const lastPick = state.runtimeUi.lastPick;
  const diagnostics = state.runtimeUi.diagnostics;
  const workflowBridge = getRuntimeWorkflowBridge();
  const selectedSceneKitContext = getSceneKitContextForObject(getSelectedObject());
  const selectedSceneSectionEntry = selectedSceneKitContext?.sectionId
    ? getSceneSectionEntryById(selectedSceneKitContext.sectionId)
    : null;
  const selectedSceneSectionRuntimeContext = selectedSceneSectionEntry?.runtimeContext ?? null;
  const selectedSceneSectionProvenance = selectedSceneSectionEntry?.provenance ?? null;
  const selectedSceneSectionGamePartSummary = selectedSceneSectionEntry?.gamePartSummary ?? null;
  const selectedSceneSectionState = selectedSceneSectionEntry?.stateSummary ?? null;
  const selectedSceneSectionOverrideCandidate = selectedSceneSectionRuntimeContext?.overrideCandidate ?? null;
  const runtimeOverrideCandidate = getRuntimeOverrideCandidate();
  const runtimeOverrideStatus = getRuntimeOverrideStatus();
  const runtimeMirrorStatus = getRuntimeMirrorStatus();
  const runtimeResourceMap = getRuntimeResourceMapStatus();
  const runtimeCoverage = getRuntimeCoverageStatus();
  const runtimeAssetUseEntries = getRuntimeAssetUseEntries();
  const activeResourceRecord = runtimeOverrideCandidate.resourceMapEntry ?? null;
  const candidateSummaries = Array.isArray(lastPick?.candidateApps) && lastPick.candidateApps.length > 0
    ? lastPick.candidateApps.map((entry) => `${entry.key}${entry.childCount != null ? ` · ${entry.childCount} stage children` : ""}`).join("; ")
    : Array.isArray(diagnostics?.candidateApps) && diagnostics.candidateApps.length > 0
      ? diagnostics.candidateApps.map((entry) => `${entry.key}${entry.childCount != null ? ` · ${entry.childCount} stage children` : ""}`).join("; ")
      : "No exposed runtime app handles were detected from the embedded donor page.";
  const topDisplayObject = lastPick?.topDisplayObject;
  const supportingEvidenceButtons = (runtimeLaunch?.evidenceIds ?? [])
    .map((evidenceId) => `<button type="button" class="copy-button" data-focus-donor-evidence-id="${escapeAttribute(evidenceId)}">Show ${escapeHtml(evidenceId)}</button>`)
    .join("");
  const sourcePaths = Array.isArray(runtimeLaunch?.sourcePaths) ? runtimeLaunch.sourcePaths : [];
  const topRuntimeAsset = lastPick?.topRuntimeAsset ?? runtimeAssetUseEntries[0] ?? null;
  const workbenchEntries = getRuntimeWorkbenchEntries();
  const activeWorkbenchSourceUrl = getRuntimeWorkbenchSourceUrl()
    ?? runtimeOverrideCandidate.runtimeSourceUrl
    ?? workbenchEntries[0]?.sourceUrl
    ?? null;
  const activeWorkbenchEntry = workbenchEntries.find((entry) => entry.sourceUrl === activeWorkbenchSourceUrl) ?? workbenchEntries[0] ?? null;
  const embeddedRequestBackedImages = getRuntimeResourceMapEntries().filter((entry) => (
    entry.requestCategory === "static-asset"
    && ["png", "webp", "jpg", "jpeg", "svg"].includes(String(entry.fileType ?? "").toLowerCase())
  ));
  const inspectorTitle = activeWorkbenchEntry?.relativePath
    ?? (lastPick?.targetTag
      ? `Picked ${lastPick.targetTag}`
      : runtimeLaunch?.captureSessionId ?? "Runtime Mode");
  const officialPathSection = renderInspectorSection(
    "Official Runtime Path",
    state.runtimeUi.debugHost?.status === "pass" ? "proved" : "ready",
    `
      <div class="tree-row runtime-workbench-summary">
        <strong>Official Runtime Work Mode</strong>
        <span>${escapeHtml(state.runtimeUi.debugHost?.status === "pass"
          ? `Debug Host already proved ${state.runtimeUi.debugHost.candidateRuntimeRelativePath ?? state.runtimeUi.debugHost.candidateRuntimeSourceUrl ?? "the current request-backed candidate"} with ${state.runtimeUi.debugHost.overrideHitCountAfterReload ?? 0} override hit${Number(state.runtimeUi.debugHost.overrideHitCountAfterReload ?? 0) === 1 ? "" : "s"} after reload.`
          : "Use Debug Host first when you need trustworthy runtime asset selection or override proof. The embedded runtime trace below remains secondary until it exposes stronger asset truth.")}</span>
        <div class="evidence-actions">
          <button type="button" class="copy-button" data-runtime-action="open-debug-host">Use Debug Host</button>
          ${activeWorkbenchEntry?.donorAsset ? `<button type="button" class="copy-button" data-focus-donor-asset-id="${escapeAttribute(activeWorkbenchEntry.donorAsset.assetId)}">Focus Asset</button>` : ""}
          ${activeWorkbenchEntry?.evidenceItem ? `<button type="button" class="copy-button" data-focus-donor-evidence-id="${escapeAttribute(activeWorkbenchEntry.evidenceItem.evidenceId)}">Focus Evidence</button>` : ""}
          ${activeWorkbenchEntry?.sceneObject ? `<button type="button" class="copy-button" data-focus-scene-object-id="${escapeAttribute(activeWorkbenchEntry.sceneObject.id)}">Focus Compose Object</button>` : ""}
        </div>
      </div>
      <div class="detail-grid runtime-workbench-grid">
        <div class="detail-card ${state.runtimeUi.debugHost?.status === "pass" ? "is-positive" : "is-alert"}">
          <span>Preferred Candidate</span>
          <strong>${escapeHtml(activeWorkbenchEntry?.relativePath ?? "Open Debug Host to choose a runtime candidate")}</strong>
          <small>${escapeHtml(activeWorkbenchEntry?.note ?? "No request-backed runtime workbench item is selected yet.")}</small>
        </div>
        <div class="detail-card ${activeWorkbenchEntry?.donorAsset ? "is-positive" : "is-alert"}">
          <span>Source Bridge</span>
          <strong>${escapeHtml(activeWorkbenchEntry?.donorAsset?.assetId ?? activeWorkbenchEntry?.evidenceItem?.evidenceId ?? "No grounded donor bridge yet")}</strong>
          <small>${escapeHtml(activeWorkbenchEntry?.sceneObject
            ? `${activeWorkbenchEntry.sceneObject.displayName} · compose-linked`
            : activeWorkbenchEntry?.donorAsset
              ? `${activeWorkbenchEntry.donorAsset.filename} · donor-backed`
              : "This runtime source does not yet map to a grounded donor asset or compose object.")}</small>
        </div>
        <div class="detail-card ${activeWorkbenchEntry?.localMirrorRepoRelativePath ? "is-positive" : "is-alert"}">
          <span>Local Mirror Path</span>
          <strong>${escapeHtml(activeWorkbenchEntry?.localMirrorRepoRelativePath ?? "No grounded local mirror path")}</strong>
          <small>${escapeHtml(activeWorkbenchEntry?.requestSummary ?? "Open Debug Host or capture runtime requests to populate the workbench list.")}</small>
        </div>
        <div class="detail-card ${activeWorkbenchEntry?.overrideRepoRelativePath || state.runtimeUi.debugHost?.overrideHitCountAfterReload > 0 ? "is-positive" : ""}">
          <span>Override Status</span>
          <strong>${escapeHtml(activeWorkbenchEntry?.overrideRepoRelativePath
            ? activeWorkbenchEntry.overrideRepoRelativePath
            : state.runtimeUi.debugHost?.overrideHitCountAfterReload > 0
              ? `${state.runtimeUi.debugHost.overrideHitCountAfterReload} debug-host hit${state.runtimeUi.debugHost.overrideHitCountAfterReload === 1 ? "" : "s"}`
              : "No active override for the selected workbench source")}</strong>
          <small>${escapeHtml(embeddedRequestBackedImages.length > 0
            ? "Embedded runtime has request-backed image evidence in this session."
            : "Embedded runtime still has no request-backed static image in this session; treat Debug Host as the trustworthy override-proof path.")}</small>
        </div>
        <div class="detail-card ${selectedSceneSectionRuntimeContext?.preferredWorkbenchEntry || selectedSceneSectionRuntimeContext?.preferredReference ? "is-positive" : ""}">
          <span>Selected Scene Section</span>
          <strong>${escapeHtml(selectedSceneKitContext?.sectionLabel ?? "No imported scene section selected in Compose")}</strong>
          <small>${escapeHtml(selectedSceneSectionRuntimeContext?.preferredWorkbenchEntry
            ? `Runtime-linked through ${selectedSceneSectionRuntimeContext.preferredWorkbenchEntry.relativePath ?? selectedSceneSectionRuntimeContext.preferredWorkbenchEntry.sourceUrl}.`
            : selectedSceneSectionRuntimeContext?.preferredReference
              ? `Supported by ${selectedSceneSectionRuntimeContext.preferredReference.label}.`
              : "Switch back to Compose and select one imported scene section member to keep the runtime workbench anchored to that grouped game part.")}</small>
        </div>
        <div class="detail-card ${selectedSceneSectionOverrideCandidate?.eligible || selectedSceneSectionOverrideCandidate?.activeOverride ? "is-positive" : ""}">
          <span>Section Override Candidate</span>
          <strong>${escapeHtml(selectedSceneSectionOverrideCandidate?.activeOverride?.overrideRepoRelativePath ?? (selectedSceneSectionOverrideCandidate?.eligible ? "Grouped override ready" : "No grouped override ready"))}</strong>
          <small>${escapeHtml(selectedSceneSectionOverrideCandidate?.note ?? "Select an imported scene section member in Compose to see whether that grouped game part has a grounded override candidate.")}</small>
        </div>
        <div class="detail-card ${selectedSceneSectionProvenance ? "is-positive" : "is-alert"}">
          <span>Selected Section Provenance</span>
          <strong>${escapeHtml(selectedSceneSectionProvenance
            ? `${selectedSceneSectionProvenance.donorAssets.length} donor asset${selectedSceneSectionProvenance.donorAssets.length === 1 ? "" : "s"} · ${selectedSceneSectionProvenance.evidenceIds.length} evidence ref${selectedSceneSectionProvenance.evidenceIds.length === 1 ? "" : "s"}`
            : "Select one imported scene section member in Compose")}</strong>
          <small>${escapeHtml(selectedSceneSectionProvenance
            ? `${selectedSceneSectionProvenance.sourceCategories.join(", ") || "source unknown"} · ${selectedSceneSectionProvenance.captureSessions.join(", ") || "session unknown"}${selectedSceneSectionProvenance.primaryGroupSummary ? ` · ${selectedSceneSectionProvenance.primaryGroupSummary.importLabel}` : ""}`
            : "The runtime workbench can only summarize grouped donor provenance when the current Compose selection belongs to one imported scene section.")}</small>
        </div>
        <div class="detail-card ${selectedSceneSectionGamePartSummary ? "is-positive" : "is-alert"}">
          <span>Selected Game-Part Kit</span>
          <strong>${escapeHtml(selectedSceneSectionGamePartSummary?.roleLabel ?? "Select one imported scene section member in Compose")}</strong>
          <small>${escapeHtml(selectedSceneSectionGamePartSummary
            ? `${selectedSceneSectionGamePartSummary.readinessLabel}${selectedSceneSectionGamePartSummary.sceneKitSummary?.label ? ` · ${selectedSceneSectionGamePartSummary.sceneKitSummary.label}` : ""}`
            : "The runtime workbench can only summarize one grouped game-part kit when the current Compose selection belongs to an imported scene section.")}</small>
        </div>
        <div class="detail-card ${selectedSceneSectionState ? "is-positive" : "is-alert"}">
          <span>Section Edit State</span>
          <strong>${escapeHtml(selectedSceneSectionState
            ? `${selectedSceneSectionState.visibilityStatusLabel} · ${selectedSceneSectionState.lockStatusLabel} · ${selectedSceneSectionState.scaleStatusLabel}`
            : "Select one imported scene section member in Compose")}</strong>
          <small>${escapeHtml(selectedSceneSectionState
            ? `${selectedSceneSectionState.visibilityButtonLabel}, ${selectedSceneSectionState.lockButtonLabel}, ${selectedSceneSectionState.isolationButtonLabel}, and grouped section scaling now work at section level.`
            : "Section-level visibility and lock state appear here when the current Compose selection belongs to an imported scene section.")}</small>
        </div>
      </div>
      ${selectedSceneKitContext?.sectionId ? `
        <div class="tree-row">
          <strong>Selected Section Controls</strong>
          <span>${escapeHtml(selectedSceneSectionProvenance
            ? "Treat the selected imported scene section like one working game-part kit: frame it in Compose, jump to donor evidence, or move back into the runtime group."
            : "Select one imported scene section member in Compose to unlock grouped game-part controls.")}</span>
          <div class="evidence-actions">
            <button type="button" class="copy-button" data-focus-scene-section-id="${escapeAttribute(selectedSceneKitContext.sectionId)}">Select Section</button>
            <button type="button" class="copy-button" data-focus-scene-section-assets-id="${escapeAttribute(selectedSceneKitContext.sectionId)}">Show Section Assets</button>
            <button type="button" class="copy-button" data-frame-scene-section-id="${escapeAttribute(selectedSceneKitContext.sectionId)}">Frame Section</button>
            <button type="button" class="copy-button" data-center-scene-section-id="${escapeAttribute(selectedSceneKitContext.sectionId)}">Center Section</button>
            <button type="button" class="copy-button" data-toggle-scene-section-visibility-id="${escapeAttribute(selectedSceneKitContext.sectionId)}">${escapeHtml(selectedSceneSectionState?.visibilityButtonLabel ?? "Hide Section")}</button>
            <button type="button" class="copy-button" data-toggle-scene-section-lock-id="${escapeAttribute(selectedSceneKitContext.sectionId)}">${escapeHtml(selectedSceneSectionState?.lockButtonLabel ?? "Lock Section")}</button>
            <button type="button" class="copy-button" data-toggle-scene-section-isolation-id="${escapeAttribute(selectedSceneKitContext.sectionId)}">${escapeHtml(selectedSceneSectionState?.isolationButtonLabel ?? "Solo Section")}</button>
            <button type="button" class="copy-button" data-reorder-scene-section-id="${escapeAttribute(selectedSceneKitContext.sectionId)}" data-reorder-scene-section-action="send-backward">Send Section Backward</button>
            <button type="button" class="copy-button" data-reorder-scene-section-id="${escapeAttribute(selectedSceneKitContext.sectionId)}" data-reorder-scene-section-action="bring-forward">Bring Section Forward</button>
            <button type="button" class="copy-button" data-scale-scene-section-up-id="${escapeAttribute(selectedSceneKitContext.sectionId)}">Scale Section Up</button>
            <button type="button" class="copy-button" data-scale-scene-section-down-id="${escapeAttribute(selectedSceneKitContext.sectionId)}">Scale Section Down</button>
            <button type="button" class="copy-button" data-restore-scene-section-defaults-id="${escapeAttribute(selectedSceneKitContext.sectionId)}">Restore Section Defaults</button>
            ${selectedSceneSectionGamePartSummary?.sceneKitSummary?.layoutStyle ? `<button type="button" class="copy-button" data-reset-scene-section-layout-id="${escapeAttribute(selectedSceneKitContext.sectionId)}">Reset Section Layout</button>` : ""}
            ${selectedSceneSectionProvenance?.evidenceIds?.length ? `<button type="button" class="copy-button" data-focus-scene-section-evidence-id="${escapeAttribute(selectedSceneKitContext.sectionId)}">Show Section Evidence</button>` : ""}
            ${selectedSceneSectionRuntimeContext?.preferredWorkbenchEntry || selectedSceneSectionRuntimeContext?.preferredReference ? `<button type="button" class="copy-button" data-open-scene-section-runtime-id="${escapeAttribute(selectedSceneKitContext.sectionId)}">Open Runtime Group</button>` : ""}
            ${selectedSceneSectionGamePartSummary?.sceneKitSummary?.layerId ? `<button type="button" class="copy-button" data-restore-scene-section-layer-id="${escapeAttribute(selectedSceneKitContext.sectionId)}">Restore Suggested Layer</button>` : ""}
            <button type="button" class="copy-button" data-duplicate-scene-section-id="${escapeAttribute(selectedSceneKitContext.sectionId)}">Duplicate Section</button>
            <button type="button" class="copy-button" data-delete-scene-section-id="${escapeAttribute(selectedSceneKitContext.sectionId)}">Delete Section</button>
            ${selectedSceneSectionGamePartSummary?.summaryText ? renderCopyButton(selectedSceneSectionGamePartSummary.summaryText, `game-part summary for ${selectedSceneKitContext.sectionLabel}`, "Copy Game-Part Summary") : ""}
          </div>
        </div>
      ` : ""}
    `
  );

  const assetWorkbenchSection = renderInspectorSection(
    "Runtime Asset Workbench",
    `${Math.min(workbenchEntries.length, 10)} items`,
    renderRuntimeWorkbenchAssetList()
  );

  const liveTraceSection = renderInspectorSection(
    "Live Trace",
    topDisplayObject ? "object-level" : topRuntimeAsset ? "asset-level" : "DOM-level",
    `
      <div class="tree-row">
        <strong>Live Runtime Surface</strong>
        <span>${escapeHtml(state.runtimeUi.currentUrl ?? runtimeLaunch?.entryUrl ?? "No runtime URL loaded yet.")}</span>
        <div class="evidence-actions">
          ${supportingEvidenceButtons || ""}
        </div>
      </div>
      <div class="detail-grid runtime-trace-grid">
        <div class="detail-card">
          <span>Picked Target</span>
          <strong>${escapeHtml(topDisplayObject?.name ?? topDisplayObject?.label ?? topRuntimeAsset?.relativePath ?? lastPick?.targetTag ?? "No runtime target picked yet")}</strong>
          <small>${escapeHtml(lastPick?.targetClassName ?? topDisplayObject?.constructorName ?? topRuntimeAsset?.initiatorType ?? "Click or inspect the live runtime to capture a target.")}</small>
        </div>
        <div class="detail-card">
          <span>Display / Texture Trace</span>
          <strong>${escapeHtml(topDisplayObject?.texture?.cacheId ?? topDisplayObject?.id ?? topRuntimeAsset?.relativePath ?? "No exposed display-object id or texture cache id")}</strong>
          <small>${escapeHtml(topDisplayObject?.texture?.resourceUrl ?? topRuntimeAsset?.url ?? "The donor runtime does not expose a stable texture/source URL in this slice.")}</small>
        </div>
        <div class="detail-card">
          <span>Canvas Pick Coordinates</span>
          <strong>${lastPick?.canvasPoint ? `${lastPick.canvasPoint.x}, ${lastPick.canvasPoint.y}` : "Not captured yet"}</strong>
          <small>${lastPick?.canvasSize ? `${lastPick.canvasSize.width} × ${lastPick.canvasSize.height}` : "Canvas size unavailable until the runtime is live."}</small>
        </div>
        <div class="detail-card">
          <span>Runtime Stack</span>
          <strong>${escapeHtml(runtimeLaunch?.gameVersion ?? "Mystery Garden runtime")}</strong>
          <small>${escapeHtml(runtimeLaunch?.wrapperVersion ? `wrapper ${runtimeLaunch.wrapperVersion}` : runtimeLaunch?.buildVersion ?? "No wrapper/build version indexed yet.")}</small>
        </div>
        <div class="detail-card ${diagnostics?.bridgeSource === "main-world-execute-js" ? "is-positive" : ""}">
          <span>Inspection Bridge</span>
          <strong>${escapeHtml(diagnostics?.bridgeSource ?? "Runtime bridge not attached yet")}</strong>
          <small>${escapeHtml(diagnostics?.bridgeVersion ?? diagnostics?.engineNote ?? "The runtime bridge version will appear after Runtime Mode finishes loading.")}</small>
        </div>
        <div class="detail-card">
          <span>Source Trace Strength</span>
          <strong>${topDisplayObject ? "Canvas pick plus best-effort display-object trace" : topRuntimeAsset ? "Canvas/WebGL asset-use trace plus supporting runtime evidence" : "Runtime URL plus supporting evidence only"}</strong>
          <small>${escapeHtml(topDisplayObject
            ? "The live runtime exposed enough surface to report a candidate display object or texture hint."
            : topRuntimeAsset
              ? `${diagnostics?.engineNote ?? "The embedded donor runtime stays opaque at object level, but the guest bridge captured a live asset-use hint from inside the runtime."}`
              : "The embedded donor runtime is live, but it still does not expose a stable display-object/texture id in this slice.")}</small>
        </div>
        <div class="detail-card">
          <span>Runtime Candidates</span>
          <strong>${escapeHtml(candidateSummaries)}</strong>
          <small>${escapeHtml(state.runtimeUi.controlBlockers.pause ?? state.runtimeUi.controlBlockers.step ?? runtimeLaunch?.blocker ?? "No additional runtime control blocker recorded.")}</small>
        </div>
      </div>
    `,
    { open: false }
  );

  const sourceCoverageSection = renderInspectorSection(
    "Source, Override & Coverage",
    runtimeCoverage ? `${runtimeCoverage.localEntryCount}/${runtimeCoverage.upstreamEntryCount}` : "pending",
    `
      <div class="detail-grid runtime-trace-grid">
        <div class="detail-card">
          <span>Runtime → Source Bridge</span>
          <strong>${escapeHtml(workflowBridge.heading)}</strong>
          <small>${escapeHtml(workflowBridge.note)}</small>
        </div>
        <div class="detail-card">
          <span>Bridged Donor Source</span>
          <strong>${escapeHtml(workflowBridge.donorAsset?.assetId ?? workflowBridge.evidenceItem?.evidenceId ?? "No donor source bridge yet")}</strong>
          <small>${escapeHtml(workflowBridge.donorAsset
            ? `${workflowBridge.donorAsset.filename} · ${workflowBridge.donorAsset.evidenceId}`
            : workflowBridge.evidenceItem?.relativePath ?? "The current runtime trace is still limited to runtime notes/init evidence.")}</small>
        </div>
        <div class="detail-card ${runtimeOverrideCandidate.eligible ? "is-positive" : "is-alert"}">
          <span>Override Eligibility</span>
          <strong>${runtimeOverrideCandidate.eligible ? "Eligible static image override" : "Override not yet grounded"}</strong>
          <small>${escapeHtml(runtimeOverrideCandidate.note)}</small>
        </div>
        <div class="detail-card">
          <span>Runtime Source Path</span>
          <strong>${escapeHtml(runtimeOverrideCandidate.runtimeRelativePath ?? "No grounded runtime image path yet")}</strong>
          <small>${escapeHtml(runtimeOverrideCandidate.runtimeSourceUrl ?? "The current runtime trace has not surfaced a supported static image URL.")}</small>
        </div>
        <div class="detail-card ${topRuntimeAsset ? "is-positive" : runtimeAssetUseEntries.length > 0 ? "is-alert" : ""}">
          <span>Live Asset-use Trace</span>
          <strong>${escapeHtml(topRuntimeAsset ? `${topRuntimeAsset.hitCount} live hit${topRuntimeAsset.hitCount === 1 ? "" : "s"}` : "No picked live asset-use hint yet")}</strong>
          <small>${escapeHtml(topRuntimeAsset
            ? `${topRuntimeAsset.initiatorType} · ${topRuntimeAsset.naturalWidth ?? "unknown"}x${topRuntimeAsset.naturalHeight ?? "unknown"}${topRuntimeAsset.canvasRect ? ` · rect ${topRuntimeAsset.canvasRect.x},${topRuntimeAsset.canvasRect.y} ${topRuntimeAsset.canvasRect.width}x${topRuntimeAsset.canvasRect.height}` : ""}`
            : runtimeAssetUseEntries.length > 0
              ? "Live runtime asset-use hints were captured, but the current pick did not land on a canvas-backed rect."
              : "No live asset-use map entry has been captured yet.")}</small>
        </div>
        <div class="detail-card ${runtimeOverrideCandidate.localMirrorEntry ? "is-positive" : runtimeMirrorStatus?.available ? "is-alert" : ""}">
          <span>Local Runtime Source</span>
          <strong>${escapeHtml(runtimeOverrideCandidate.localMirrorEntry?.repoRelativePath ?? "Current picked source is not mirrored locally")}</strong>
          <small>${escapeHtml(runtimeOverrideCandidate.localMirrorEntry
            ? `Runtime source ${runtimeOverrideCandidate.runtimeRelativePath ?? runtimeOverrideCandidate.runtimeSourceUrl} resolves to a local mirror file on this machine.`
            : runtimeMirrorStatus?.available
              ? "A local mirror exists, but this picked runtime trace has not resolved to one of the mirrored local files yet."
              : runtimeMirrorStatus?.blocker ?? "No local mirror is available yet.")}</small>
        </div>
        <div class="detail-card ${activeResourceRecord ? "is-positive" : runtimeResourceMap?.entryCount ? "is-alert" : ""}">
          <span>Resource Map Record</span>
          <strong>${escapeHtml(activeResourceRecord
            ? `${activeResourceRecord.hitCount} runtime hit${activeResourceRecord.hitCount === 1 ? "" : "s"}`
            : "No recorded runtime request for this source yet")}</strong>
          <small>${escapeHtml(activeResourceRecord
            ? `${activeResourceRecord.latestRequestUrl} · ${activeResourceRecord.requestCategory} · ${activeResourceRecord.requestSource}${Array.isArray(activeResourceRecord.captureMethods) && activeResourceRecord.captureMethods.length > 0 ? ` · tap ${activeResourceRecord.captureMethods.join(", ")}` : ""}${activeResourceRecord.overrideRepoRelativePath ? ` · override ${activeResourceRecord.overrideRepoRelativePath}` : activeResourceRecord.localMirrorRepoRelativePath ? ` · local ${activeResourceRecord.localMirrorRepoRelativePath}` : ""}`
            : runtimeResourceMap?.entryCount
              ? "Runtime requests have been recorded this cycle, but the current picked source has not been matched to one of those records yet."
              : "Launch or reload Runtime Mode to capture requested URLs, local mirror paths, override redirects, and hit counts.")}</small>
        </div>
        <div class="detail-card ${runtimeCoverage?.localStaticEntryCount ? "is-positive" : runtimeCoverage?.upstreamStaticEntryCount ? "is-alert" : ""}">
          <span>Coverage Summary</span>
          <strong>${escapeHtml(runtimeCoverage
            ? `${runtimeCoverage.localEntryCount} local / ${runtimeCoverage.upstreamEntryCount} upstream / ${runtimeCoverage.overrideEntryCount} override`
            : "No runtime coverage summary yet")}</strong>
          <small>${escapeHtml(runtimeCoverage
            ? runtimeCoverage.unresolvedUpstreamSample.length > 0
              ? `Remaining upstream sample: ${runtimeCoverage.unresolvedUpstreamSample.join(" · ")}`
              : "No unresolved upstream bootstrap/static dependency is recorded in the current cycle."
            : "Launch the runtime and inspect a target to populate the current-cycle coverage summary.")}</small>
        </div>
        <div class="detail-card">
          <span>Active Override</span>
          <strong>${escapeHtml(runtimeOverrideCandidate.activeOverride?.donorAssetId ?? "No active override for this runtime source")}</strong>
          <small>${escapeHtml(runtimeOverrideCandidate.activeOverride
            ? `${runtimeOverrideCandidate.activeOverride.overrideRepoRelativePath} · ${runtimeOverrideCandidate.activeOverride.hitCount} runtime hit${runtimeOverrideCandidate.activeOverride.hitCount === 1 ? "" : "s"}`
            : runtimeOverrideStatus?.entryCount
              ? `${runtimeOverrideStatus.entryCount} project-local runtime override${runtimeOverrideStatus.entryCount === 1 ? "" : "s"} recorded.`
              : "Create a bounded override to redirect one grounded static image request to a project-local file.")}</small>
        </div>
        <div class="detail-card">
          <span>Supporting Evidence</span>
          <strong>${runtimeLaunch?.evidenceIds?.length ? `${runtimeLaunch.evidenceIds.length} grounded runtime refs` : "No runtime refs indexed"}</strong>
          <small>${escapeHtml(sourcePaths.length > 0 ? sourcePaths.join(" · ") : "No supporting source paths recorded.")}</small>
        </div>
      </div>
      <div class="tree-row">
        <strong>Embedded Runtime Bridge Actions</strong>
        <span>${escapeHtml(workflowBridge.donorAsset
          ? "Jump straight from the current embedded runtime trace into donor asset, donor evidence, or related compose context."
          : "Jump into the strongest grounded embedded-runtime evidence while the live donor runtime remains partially opaque.")}</span>
        <div class="evidence-actions">
          ${workflowBridge.donorAsset ? `<button type="button" class="copy-button" data-focus-donor-asset-id="${escapeAttribute(workflowBridge.donorAsset.assetId)}">Focus Asset</button>` : ""}
          ${workflowBridge.evidenceItem ? `<button type="button" class="copy-button" data-focus-donor-evidence-id="${escapeAttribute(workflowBridge.evidenceItem.evidenceId)}">Focus Evidence</button>` : ""}
          ${workflowBridge.sceneObject ? `<button type="button" class="copy-button" data-focus-scene-object-id="${escapeAttribute(workflowBridge.sceneObject.id)}">Focus Scene Object</button>` : ""}
        </div>
      </div>
      <div class="tree-row">
        <strong>Override Actions</strong>
        <span>${escapeHtml(runtimeOverrideCandidate.eligible
          ? `Create a project-local ${runtimeOverrideCandidate.fileType} override for ${runtimeOverrideCandidate.runtimeRelativePath ?? "the grounded runtime source"} using donor asset ${runtimeOverrideCandidate.donorAsset?.assetId ?? "unknown"}.`
          : runtimeOverrideCandidate.note)}</span>
        <div class="evidence-actions">
          <button type="button" class="copy-button" data-runtime-action="create-override" ${runtimeOverrideCandidate.eligible ? "" : "disabled"}>Create Override</button>
          <button type="button" class="copy-button" data-runtime-action="clear-override" ${runtimeOverrideCandidate.activeOverride ? "" : "disabled"}>Clear Override</button>
        </div>
      </div>
    `,
    { open: false }
  );

  return `
    <div class="inspector-title">
      <p>Runtime Debug Workbench</p>
      <h3>${escapeHtml(inspectorTitle)}</h3>
    </div>
    <p class="inspector-purpose">The dedicated Runtime Debug Host is the official daily runtime path for <code>project_001</code>. This panel is grouped around the practical work loop: official path first, runtime asset list second, live trace third, and deeper source/override coverage last.</p>
    <div class="chip-row">
      <span>${escapeHtml(runtimeLaunch?.availability ?? "blocked")}</span>
      <span>${escapeHtml(runtimeLaunch?.runtimeSourceLabel ?? "Blocked")}</span>
      <span>${state.runtimeUi.debugHost?.status === "pass" ? "debug host official" : "debug host ready"}</span>
      <span>${state.runtimeUi.inspectEnabled ? "embedded pick armed" : "embedded pick idle"}</span>
      <span>${diagnostics?.pixiVersion ? `Pixi ${escapeHtml(diagnostics.pixiVersion)}` : runtimeLaunch?.pixiVersion ? `Pixi ${escapeHtml(runtimeLaunch.pixiVersion)}` : escapeHtml(diagnostics?.engineKind ?? "Pixi unknown")}</span>
      <span>${topDisplayObject ? "display-object candidate detected" : topRuntimeAsset ? "live asset-use candidate detected" : "canvas / DOM level trace only"}</span>
    </div>
    ${officialPathSection}
    ${assetWorkbenchSection}
    ${liveTraceSection}
    ${sourceCoverageSection}
  `;
}

function renderAll() {
  enforceIsolationSelection();
  enforceSceneSectionIsolationSelection();
  renderWorkflowPanels();
  renderOnboardingCard();
  renderProjectBrowser();
  renderInvestigationPanel();
  renderEvidenceBrowser();
  renderSceneExplorer();
  renderWorkflowVabsPanel();
  renderBridgeStatus();
  renderSyncStatus();
  renderProjectSummary();
  renderRuntimeWorkbench();
  renderEditorCanvas();
  renderInspector();
  renderActivityLog();

  if (elements.actionUndo) {
    elements.actionUndo.disabled = !state.editorData || !canUndo();
  }
  if (elements.actionRedo) {
    elements.actionRedo.disabled = !state.editorData || !canRedo();
  }
  const viewportTools = getViewportTools();
  const currentViewport = getViewportState();
  const canMutateViewport = Boolean(state.editorData && !state.canvasDrag && !state.viewport.panDrag);
  if (elements.actionZoomOut) {
    elements.actionZoomOut.disabled = !canMutateViewport || currentViewport.zoom <= viewportTools.MIN_VIEW_ZOOM + 0.001;
  }
  if (elements.actionZoomIn) {
    elements.actionZoomIn.disabled = !canMutateViewport || currentViewport.zoom >= viewportTools.MAX_VIEW_ZOOM - 0.001;
  }
  if (elements.actionFitView) {
    elements.actionFitView.disabled = !canMutateViewport;
  }
  if (elements.actionResetView) {
    elements.actionResetView.disabled = !canMutateViewport || !isViewportTransformed();
  }
  if (elements.actionToggleSnap) {
    elements.actionToggleSnap.disabled = !state.editorData;
    elements.actionToggleSnap.textContent = isSnapEnabled()
      ? `Snap ${getSnapSize()}px On`
      : `Snap ${getSnapSize()}px Off`;
    elements.actionToggleSnap.dataset.tone = isSnapEnabled() ? "active" : "default";
  }
  if (elements.actionNewObject) {
    elements.actionNewObject.disabled = !canCreateObject() || Boolean(state.canvasDrag);
    elements.actionNewObject.textContent = `New ${getSelectedPlaceholderPreset()?.label ?? "Placeholder"}`;
  }
  const selectedObject = getSelectedObject();
  const selectedObjectIds = getSelectedObjectIds();
  const selectedObjectCount = selectedObjectIds.length;
  const canMutateSelectedObject = Boolean(selectedObject && isObjectEditable(selectedObject) && !state.canvasDrag);
  const orderContext = getSelectedObjectOrderContext();
  const compositionContext = getCompositionSelectionContext();
  const runtimeLaunch = getRuntimeLaunchInfo();
  if (elements.editorToolbar) {
    const canAlignSelectedObject = Boolean(selectedObject && isViewportAlignableObject(selectedObject) && !state.canvasDrag);
    elements.editorToolbar.querySelectorAll("[data-align-action]").forEach((button) => {
      if (button instanceof HTMLButtonElement) {
        button.disabled = !canAlignSelectedObject;
      }
    });
    elements.editorToolbar.querySelectorAll("[data-compose-action]").forEach((button) => {
      if (!(button instanceof HTMLButtonElement)) {
        return;
      }

      const action = button.dataset.composeAction;
      const enabled = action === "distribute-h" || action === "distribute-v"
        ? compositionContext.count >= 3 && !state.canvasDrag
        : compositionContext.count >= 2 && !state.canvasDrag;
      button.disabled = !enabled;
    });
    elements.editorToolbar.querySelectorAll("[data-order-action]").forEach((button) => {
      if (!(button instanceof HTMLButtonElement)) {
        return;
      }

      const action = button.dataset.orderAction;
      const enabled = Boolean(
        canMutateSelectedObject
        && selectedObjectCount <= 1
        && orderContext
        && (
          action === "send-backward"
            ? orderContext.canSendBackward
            : action === "bring-forward"
              ? orderContext.canBringForward
              : action === "send-to-back"
                ? orderContext.canSendBackward
                : action === "bring-to-front"
                  ? orderContext.canBringForward
                  : false
        )
      );
      button.disabled = !enabled;
    });
  }
  if (elements.runtimeToolbar) {
    elements.runtimeToolbar.querySelectorAll("[data-runtime-action]").forEach((button) => {
      if (!(button instanceof HTMLButtonElement)) {
        return;
      }

      const action = button.dataset.runtimeAction;
      if (!action) {
        return;
      }

      let disabled = false;
      const workflowBridge = getRuntimeWorkflowBridge();
      const runtimeOverrideCandidate = getRuntimeOverrideCandidate();
      if (action === "launch") {
        disabled = !Boolean(runtimeLaunch?.entryUrl);
      } else if (action === "open-debug-host") {
        disabled = !Boolean(runtimeLaunch?.entryUrl);
      } else if (action === "reload" || action === "inspect-toggle" || action === "focus-note" || action === "focus-init") {
        disabled = !state.runtimeUi.launched;
      } else if (action === "pause" || action === "resume" || action === "step") {
        disabled = !state.runtimeUi.launched || !Boolean(state.runtimeUi.controlSupport[action]);
      } else if (action === "enter" || action === "spin") {
        disabled = !state.runtimeUi.launched;
      } else if (action === "focus-asset") {
        disabled = !Boolean(workflowBridge.donorAsset);
      } else if (action === "focus-evidence") {
        disabled = !Boolean(workflowBridge.evidenceItem);
      } else if (action === "focus-scene") {
        disabled = !Boolean(workflowBridge.sceneObject);
      } else if (action === "create-override") {
        disabled = !runtimeOverrideCandidate.eligible;
      } else if (action === "clear-override") {
        disabled = !Boolean(runtimeOverrideCandidate.activeOverride);
      }

      button.disabled = disabled;
      if (action === "inspect-toggle") {
        button.dataset.tone = state.runtimeUi.inspectEnabled ? "active" : "default";
        button.textContent = state.runtimeUi.inspectEnabled ? "Inspecting Runtime" : "Pick / Inspect";
      }
    });
  }
  if (elements.runtimeControlNote) {
    const runtimeOverrideCandidate = getRuntimeOverrideCandidate();
    elements.runtimeControlNote.textContent = state.runtimeUi.lastCommandStatus?.blocked
      ?? (runtimeOverrideCandidate.activeOverride
        ? `Active runtime override: ${runtimeOverrideCandidate.activeOverride.runtimeRelativePath} -> ${runtimeOverrideCandidate.activeOverride.donorAssetId}. Reload Runtime Mode after changing it.`
        : null)
      ?? runtimeLaunch?.blocker
      ?? "Launch the donor runtime, inspect a grounded source, and create a project-local static override when the trace is eligible.";
  }
  if (elements.actionDuplicate) {
    elements.actionDuplicate.disabled = !canMutateSelectedObject;
  }
  if (elements.actionDelete) {
    elements.actionDelete.disabled = !canMutateSelectedObject;
  }
  const previousNavigationContext = getSelectedObjectNavigationContext("previous");
  const nextNavigationContext = getSelectedObjectNavigationContext("next");
  if (elements.actionSelectPrevious) {
    elements.actionSelectPrevious.disabled = !Boolean(previousNavigationContext?.targetObjectId && !state.canvasDrag && selectedObjectCount <= 1);
  }
  if (elements.actionSelectNext) {
    elements.actionSelectNext.disabled = !Boolean(nextNavigationContext?.targetObjectId && !state.canvasDrag && selectedObjectCount <= 1);
  }
  if (elements.actionSave) {
    elements.actionSave.disabled = !state.editorData || !state.dirty;
  }
  if (elements.dirtyIndicator) {
    elements.dirtyIndicator.textContent = state.dirty ? "Unsaved changes" : "Saved";
    elements.dirtyIndicator.dataset.tone = state.dirty ? "dirty" : "saved";
  }
  if (elements.viewportIndicator) {
    const panLabel = Math.abs(currentViewport.panX) > 0.001 || Math.abs(currentViewport.panY) > 0.001
      ? ` · pan ${Math.round(currentViewport.panX)}, ${Math.round(currentViewport.panY)}`
      : "";
    elements.viewportIndicator.textContent = `View ${Math.round(currentViewport.zoom * 100)}%${panLabel}`;
    elements.viewportIndicator.dataset.tone = isViewportTransformed() ? "info" : "default";
  }
  if (elements.orderContextIndicator) {
    if (selectedObjectCount > 1) {
      elements.orderContextIndicator.textContent = `${selectedObjectCount} selected · ${compositionContext.donorBackedCount} donor-backed`;
      elements.orderContextIndicator.dataset.tone = "info";
    } else if (orderContext) {
      elements.orderContextIndicator.textContent = `${orderContext.index + 1} of ${orderContext.total} in ${orderContext.layerName}`;
      elements.orderContextIndicator.dataset.tone = "info";
    } else {
      elements.orderContextIndicator.textContent = "Order n/a";
      elements.orderContextIndicator.dataset.tone = "default";
    }
  }
}

function renderFatal(message) {
  setPreviewStatus(message);
  renderBridgeStatus();

  if (elements.projectBrowser) {
    elements.projectBrowser.innerHTML = `<div class="tree-row"><strong>Load Error</strong><span>${message}</span></div>`;
  }
  if (elements.evidenceBrowser) {
    elements.evidenceBrowser.innerHTML = `<div class="tree-row"><strong>Donor Evidence</strong><span>${message}</span></div>`;
  }
  if (elements.sceneExplorer) {
    elements.sceneExplorer.innerHTML = `<div class="tree-row"><strong>Compose Explorer</strong><span>Editor data could not be loaded.</span></div>`;
  }
  if (elements.projectSummary) {
    elements.projectSummary.innerHTML = `<div class="tree-row"><strong>Editor Canvas</strong><span>${message}</span></div>`;
  }
  if (elements.inspector) {
    elements.inspector.innerHTML = `<div class="tree-row"><strong>Inspector</strong><span>${message}</span></div>`;
  }
}

function escapeAttribute(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

window.render_game_to_text = () => JSON.stringify({
  selectedProjectId: state.selectedProjectId,
  selectedObjectId: state.selectedObjectId,
  selectedObjectIds: getSelectedObjectIds(),
  dirty: state.dirty,
  vabs: state.bundle?.vabs ? {
    currentStatus: state.bundle.vabs.currentStatus,
    activeFixtureSource: state.bundle.vabs.activeFixtureSource,
    activeFixtureSummary: state.bundle.vabs.activeFixtureSummary,
    capturedRow: state.bundle.vabs.capturedRow,
    capturedSession: state.bundle.vabs.capturedSession,
    currentBlocker: state.bundle.vabs.currentBlocker,
    nextRecommendedAction: state.bundle.vabs.nextRecommendedAction
  } : null,
  runtimeLaunch: state.bundle?.runtimeLaunch ? {
    availability: state.bundle.runtimeLaunch.availability,
    entryUrl: state.bundle.runtimeLaunch.entryUrl,
    resolvedRuntimeHost: state.bundle.runtimeLaunch.resolvedRuntimeHost,
    availableActions: state.bundle.runtimeLaunch.availableActions,
    roundId: state.bundle.runtimeLaunch.roundId,
    blocker: state.bundle.runtimeLaunch.blocker
  } : null,
  runtimeUi: {
    mode: state.workbenchMode,
    launched: state.runtimeUi.launched,
    loading: state.runtimeUi.loading,
    ready: state.runtimeUi.ready,
    inspectEnabled: state.runtimeUi.inspectEnabled,
    currentUrl: state.runtimeUi.currentUrl,
    pageTitle: state.runtimeUi.pageTitle,
    lastPick: state.runtimeUi.lastPick ? {
      targetTag: state.runtimeUi.lastPick.targetTag,
      canvasDetected: state.runtimeUi.lastPick.canvasDetected,
      canvasPoint: state.runtimeUi.lastPick.canvasPoint,
      displayHitCount: state.runtimeUi.lastPick.displayHitCount,
      topDisplayObject: state.runtimeUi.lastPick.topDisplayObject
    } : null
  },
  undoCount: state.history?.undoStack?.length ?? 0,
  redoCount: state.history?.redoStack?.length ?? 0,
  syncStatus: state.syncStatus ? {
    status: state.syncStatus.status,
    replayPath: state.syncStatus.replayPath,
    lastSyncedAt: state.syncStatus.lastSyncedAt
  } : null,
  layers: Array.isArray(state.editorData?.layers)
    ? state.editorData.layers.map((entry) => ({
      id: entry.id,
      visible: entry.visible,
      locked: entry.locked
    }))
    : [],
  layerIsolation: {
    activeLayerId: getIsolatedLayerId(),
    sessionOnly: true
  },
  sceneSectionIsolation: {
    activeSectionId: getIsolatedSceneSectionId(),
    sessionOnly: true
  },
  editorObjectPositions: Array.isArray(state.editorData?.objects)
    ? state.editorData.objects.map((entry) => ({
      id: entry.id,
      layerId: entry.layerId,
      x: entry.x,
      y: entry.y,
      width: entry.width,
      height: entry.height,
      scaleX: entry.scaleX,
      scaleY: entry.scaleY,
      visible: entry.visible
    }))
    : [],
  layerObjectOrder: Array.isArray(state.editorData?.layers)
    ? sortLayers(state.editorData.layers).map((layer) => ({
      layerId: layer.id,
      objectIds: getLayerObjectsInOrder(layer.id).map((entry) => entry.id)
    }))
    : []
});

window.advanceTime = (ms) => {
  if (typeof ms === "number" && Number.isFinite(ms) && ms > 0) {
    pushLog(`advanceTime(${Math.round(ms)}) observed in editor mode.`);
    renderActivityLog();
  }
};
