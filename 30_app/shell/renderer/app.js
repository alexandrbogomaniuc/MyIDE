const state = {
  bundle: null,
  selectedProjectId: null,
  editorData: null,
  selectedObjectId: null,
  history: null,
  canvasDrag: null,
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
  layerIsolation: {
    activeLayerId: null,
    previousSelectedObjectId: null
  }
};

const lifecycleStageOrder = [
  "donorEvidence",
  "donorReport",
  "importMapping",
  "internalReplay",
  "targetConcept",
  "targetBuild",
  "integration",
  "qa",
  "releasePrep"
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

const elements = {
  projectBrowser: document.getElementById("project-browser"),
  sceneExplorer: document.getElementById("scene-explorer"),
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
    const propertyPanelApiReady = typeof api.buildPropertyPanelViewModel === "function";

    if (!projectShapeValid) {
      throw new Error("project slice returned an invalid project object.");
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
  renderBridgeStatus();

  try {
    await checkDesktopBridge();
    await reloadWorkspace(true);
  } catch (error) {
    renderFatal(error instanceof Error ? error.message : "Unknown editor load error.");
  }
}

async function bootRenderer() {
  await init();

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

function clickRendererElement(element) {
  if (!(element instanceof HTMLElement)) {
    throw new Error("Cannot click a missing renderer element.");
  }

  element.dispatchEvent(new MouseEvent("click", {
    bubbles: true,
    cancelable: true,
    composed: true,
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
    pressure: type === "pointerup" ? 0 : 0.5,
    view: window
  });

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

function getCanvasObjectElementById(objectId) {
  return elements.editorCanvas?.querySelector(`[data-canvas-object-id="${objectId}"]`) ?? null;
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
  elements.editorToolbar?.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const orderButton = target.closest("[data-order-action]");
    if (orderButton instanceof HTMLElement) {
      const action = orderButton.dataset.orderAction;
      if (action) {
        handleOrderSelectedObject(action);
      }
      return;
    }

    const alignButton = target.closest("[data-align-action]");
    if (!(alignButton instanceof HTMLElement)) {
      return;
    }

    const alignment = alignButton.dataset.alignAction;
    if (alignment) {
      handleAlignSelectedObject(alignment);
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
      state.selectedObjectId = objectId;
      renderAll();
    }
  });
  elements.editorCanvas?.addEventListener("click", (event) => {
    if (consumeViewportSuppressedClick()) {
      event.preventDefault();
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
      state.selectedObjectId = objectId;
      renderAll();
    }
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
    return;
  }

  const tools = getEditorStateTools();
  if (typeof tools.resolveSelectedObjectId === "function") {
    state.selectedObjectId = tools.resolveSelectedObjectId(state.editorData.objects, preferredObjectId, fallbackObjectId);
    return;
  }

  const objects = state.editorData.objects;
  const preferred = objects.find((entry) => entry.id === preferredObjectId);
  if (preferred) {
    state.selectedObjectId = preferred.id;
    return;
  }

  const fallback = objects.find((entry) => entry.id === fallbackObjectId);
  if (fallback) {
    state.selectedObjectId = fallback.id;
    return;
  }

  const editable = objects.find((entry) => isObjectEditable(entry));
  state.selectedObjectId = editable?.id ?? objects[0]?.id ?? null;
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

function getSelectedObject() {
  if (!state.editorData || !Array.isArray(state.editorData.objects)) {
    return null;
  }

  return state.editorData.objects.find((entry) => entry.id === state.selectedObjectId) ?? null;
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

  const selectedObject = getSelectedObject();
  if (selectedObject?.layerId === isolatedLayerId) {
    return;
  }

  state.selectedObjectId = getFirstSelectableObjectIdForLayer(isolatedLayerId);
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
  if (!isLayerIsolationActive()) {
    return objects.map((entry) => entry.id);
  }

  const renderableIds = new Set(getRenderableLayerIds());
  return renderableIds.has(layerId)
    ? objects.map((entry) => entry.id)
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

function setSelectedObject(objectId) {
  state.selectedObjectId = objectId;
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
  const tools = getViewportTools();
  const screenPoint = {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
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

  state.canvasDrag = {
    objectId: object.id,
    pointerId: event.pointerId,
    offsetX: scenePoint.x - object.x,
    offsetY: scenePoint.y - object.y,
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

  pushLog(`Dragging ${object.displayName}. Use arrows or pointer movement to reposition it.`);
  setPreviewStatus(`Dragging ${object.displayName}. Release to keep the new position.`);
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
  const selectedObject = getSelectedObject();
  if (!selectedObject || !isObjectEditable(selectedObject)) {
    return false;
  }

  applyObjectPosition(selectedObject, selectedObject.x + deltaX, selectedObject.y + deltaY, sourceLabel);
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

  if (!canvasViewport) {
    return;
  }

  const viewportPanGesture = event.button === 1 || (event.button === 0 && state.viewport.spacePressed);
  if (viewportPanGesture) {
    beginViewportPan(event);
    event.preventDefault();
    return;
  }

  if (event.button !== 0 || !canvasStage) {
    return;
  }

  if (objectButton instanceof HTMLElement) {
    const objectId = objectButton.dataset.canvasObjectId;
    const object = typeof objectId === "string" ? getCanvasObjectById(objectId) : null;

    if (!object) {
      return;
    }

    setSelectedObject(object.id);
    renderAll();
    beginCanvasDrag(object, event);
    event.preventDefault();
    return;
  }

  if (state.selectedObjectId !== null) {
    state.selectedObjectId = null;
    renderAll();
    setPreviewStatus("Canvas selection cleared.");
  }
}

function handleCanvasPointerMove(event) {
  if (updateViewportPan(event)) {
    return;
  }

  if (!state.canvasDrag || event.pointerId !== state.canvasDrag.pointerId || !state.editorData) {
    return;
  }

  const object = getCanvasObjectById(state.canvasDrag.objectId);
  if (!object || !isObjectEditable(object)) {
    return;
  }

  const scenePoint = getScenePointFromEvent(event);
  const nextX = scenePoint.x - state.canvasDrag.offsetX;
  const nextY = scenePoint.y - state.canvasDrag.offsetY;
  const bounded = normalizeObjectPosition(object, nextX, nextY);

  if (bounded.x === object.x && bounded.y === object.y) {
    return;
  }

  object.x = bounded.x;
  object.y = bounded.y;
  state.canvasDrag.moved = true;
  syncDirtyState();
  renderAll();
}

function handleCanvasPointerUp(event) {
  if (endViewportPan(event)) {
    return;
  }

  if (!state.canvasDrag || (event?.pointerId !== undefined && event.pointerId !== state.canvasDrag.pointerId)) {
    return;
  }

  const object = getCanvasObjectById(state.canvasDrag.objectId);
  const beforeSnapshot = state.canvasDrag.beforeSnapshot;
  const moved = Boolean(state.canvasDrag.moved);

  try {
    if (typeof elements.editorCanvas?.releasePointerCapture === "function") {
      elements.editorCanvas.releasePointerCapture(state.canvasDrag.pointerId);
    }
  } catch {
    // Pointer capture release is best-effort only.
  }

  state.canvasDrag = null;

  if (object && moved) {
    recordUndoSnapshot(beforeSnapshot, `Dragged ${object.displayName}`);
    pushLog(`Committed ${object.displayName} at ${object.x}, ${object.y}.`);
    setPreviewStatus(`Canvas move completed for ${object.displayName}. Save to persist the change.`);
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
  state.canvasDrag = null;
  resetViewportSessionState();
  resetLayerIsolation();
  resetEditorHistory();
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

  setPreviewStatus(isInitialLoad
    ? `Loaded ${state.selectedProjectId} editable scene from internal files.`
    : `Reloaded ${state.selectedProjectId} editable scene from disk.`);
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
  const targetDisplayName = elements.fieldTargetDisplayName?.value?.trim() ?? "";
  const notes = elements.fieldNotes?.value?.trim() ?? "";

  if (!displayName || !slug || !donorReference || !targetDisplayName) {
    setCreateProjectStatus("Display name, slug, donor reference, and target display name are required.", true);
    return;
  }

  setCreateProjectStatus(`Creating ${displayName} under 40_projects/${slug} ...`);

  try {
    const created = await window.myideApi.createProject({
      displayName,
      slug,
      gameFamily,
      donorReference,
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
    setCreateProjectStatus(`Created ${created.displayName}. The project is now discoverable in the workspace browser.`);
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

    if (getSelectedObject()?.layerId !== layerId) {
      state.selectedObjectId = getFirstSelectableObjectIdForLayer(layerId);
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
  const isolatedLayer = getIsolatedLayer();
  const displayedLayers = sortedLayers.filter((layer) => renderableLayerIds.has(layer.id));
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
    const objects = getLayerObjectsInOrder(layer.id, editorData);
    const objectMarkup = objects.length > 0
      ? objects.map((object, index) => `
        <button class="object-row ${object.id === state.selectedObjectId ? "is-selected" : ""}" type="button" data-object-id="${object.id}">
          <strong>${object.displayName}</strong>
          <span>${object.type}</span>
          <small>${object.visible ? "visible" : "hidden"} · ${object.locked ? "locked" : "editable"} · stack ${index + 1}/${objects.length} · ${object.id}</small>
        </button>
      `).join("")
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
        <span>${state.dirty ? "unsaved changes" : "saved"}</span>
        <span>${isolatedLayer ? `solo ${isolatedLayer.displayName}` : "no solo layer"}</span>
      </div>
    </div>
    ${isolationBanner}
    ${layerMarkup}
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
        <span>Editor State</span>
        <strong>${state.dirty ? "Unsaved Changes" : "Saved"}</strong>
        <small>${editorStatusSummary}</small>
      </div>
      <div class="detail-card">
        <span>Preview Source</span>
        <strong>Editable Internal Scene</strong>
        <small>The shell preview is driven from <code>internal/scene.json</code>, <code>layers.json</code>, and <code>objects.json</code>, and save deterministically syncs replay-facing <code>project.json</code>.</small>
      </div>
    </div>
    <div class="tree-row">
      <strong>Lifecycle Summary</strong>
      <span>One project = one donor-to-release cycle.</span>
      <div class="lifecycle-grid">${lifecycleChips}</div>
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

function getObjectLabel(object) {
  return object.placeholderRef ?? object.assetRef ?? object.type;
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

  state.selectedObjectId = context.targetObjectId;
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
  state.selectedObjectId = createdObjectId;
  ensureSelectedObject();
  renderAll();
  setPreviewStatus(`Created ${createdDisplayName} from the ${selectedPreset?.label ?? "Generic Box"} preset. It is selected on ${createdLayerName} and ready to edit.`);
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

  state.selectedObjectId = duplicateId;
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

  state.selectedObjectId = nextSelectionId;
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
  const objectOrderById = new Map();
  sortedLayers.forEach((layer) => {
    getLayerObjectsInOrder(layer.id, editorData).forEach((object, index) => {
      objectOrderById.set(object.id, index);
    });
  });

  const objectMarkup = editorData.objects.filter((object) => renderableLayerIds.has(object.layerId)).map((object) => {
    const layer = getLayerById(object.layerId);
    const visible = object.visible;
    const locked = object.locked || layer?.locked;
    const dragging = state.canvasDrag?.objectId === object.id;
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
    const selected = object.id === state.selectedObjectId;

    return `
      <button
        class="canvas-object object-${object.type} ${selected ? "is-selected" : ""} ${locked ? "is-locked" : "is-draggable"} ${dragging ? "is-dragging" : ""}"
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
        <span class="canvas-object-title">${object.displayName}</span>
        <small>${getObjectLabel(object)}</small>
      </button>
    `;
  }).join("");

  const viewportWidth = editorData.scene.viewport?.width ?? 1280;
  const viewportHeight = editorData.scene.viewport?.height ?? 720;
  const selectedObject = getSelectedObject();
  const selectedLayerLabel = getSelectedLayerLabel();
  const snapLabel = isSnapEnabled() ? `Snap ${getSnapSize()}px on` : "Snap off";
  const isolationLabel = isLayerIsolationActive()
    ? `Solo ${getIsolatedLayer()?.displayName ?? "layer"}`
    : "No solo layer";
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
    state.viewport.panDrag ? "is-panning" : ""
  ].filter(Boolean).join(" ");
  const viewportClassNames = [
    "canvas-viewport",
    isViewportTransformed() ? "is-view-transformed" : "",
    state.viewport.panDrag ? "is-panning" : ""
  ].filter(Boolean).join(" ");

  elements.editorCanvas.innerHTML = `
    <div class="canvas-meta">
      <span>${editorData.scene.sceneId}</span>
      <span>${viewportWidth} × ${viewportHeight}</span>
      <span>Internal files only</span>
      <span>${viewLabel}</span>
      <span>${panLabel}</span>
      <span>${selectedObject ? `Selected: ${selectedObject.displayName}` : "No selection"}</span>
      <span>Layer: ${selectedLayerLabel}</span>
      <span>${snapLabel}</span>
      <span>${isolationLabel}</span>
      <span>Space+drag or middle mouse pan</span>
    </div>
    <div class="${viewportClassNames}" tabindex="0" aria-label="Project editor canvas" style="${viewportInlineStyle}">
      <div class="${stageClassNames}">
        <div class="canvas-camera" style="${cameraInlineStyle}">
          ${objectMarkup}
        </div>
      </div>
    </div>
  `;
}

function renderInspector() {
  if (!elements.inspector) {
    return;
  }

  const selectedProject = getSelectedProject();
  const selectedObject = getSelectedObject();
  const editorData = state.editorData;

  if (!selectedProject) {
    elements.inspector.innerHTML = `<div class="tree-row"><strong>No Project Selected</strong><span>Choose a project to inspect.</span></div>`;
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

  const layer = getLayerById(selectedObject.layerId);
  const locked = selectedObject.locked || layer?.locked;
  const sizeEditable = isObjectSizeEditable(selectedObject);
  const viewportAlignable = isViewportAlignableObject(selectedObject);
  const orderContext = getSelectedObjectOrderContext();
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
    facts: [
      `Layer ${layer?.displayName ?? selectedObject.layerId} is ${layer?.visible === false ? "hidden" : "visible"} in the editor.`,
      isLayerIsolationActive() ? `Solo layer view is active for ${getIsolatedLayer()?.displayName ?? "the current layer"}.` : "Solo layer view is off.",
      `Current project lifecycle stage is ${labelizeStage(selectedProject.lifecycle?.currentStage)}.`,
      "Preview rendering and save/reload use internal project files only."
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
          { key: "lockState", label: "Lock State", value: locked ? "locked" : "editable", status: "proven", fieldState: "read-only" }
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
    ${groupsMarkup}
  `;
}

function renderInspectorRow(row) {
  const disabled = row.fieldState !== "editable" ? "disabled" : "";
  const noteMarkup = row.notes ? `<small class="muted-copy">${escapeHtml(row.notes)}</small>` : "";
  const value = row.value;

  if (row.fieldKind === "boolean") {
    return `
      <label class="toggle-field">
        <input name="${escapeAttribute(row.key)}" type="checkbox" ${value ? "checked" : ""} ${disabled} />
        <span>${row.label}</span>
      </label>
      ${noteMarkup}
    `;
  }

  if (row.fieldKind === "multiline") {
    return `
      <label class="form-field">
        <span>${row.label}</span>
        <textarea name="${escapeAttribute(row.key)}" ${disabled}>${escapeHtml(value)}</textarea>
      </label>
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
      ${noteMarkup}
    `;
  }

  return `
    <div class="tree-row">
      <strong>${row.label}</strong>
      <span>${escapeHtml(value)}</span>
    </div>
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

function renderAll() {
  enforceIsolationSelection();
  renderProjectBrowser();
  renderSceneExplorer();
  renderBridgeStatus();
  renderSyncStatus();
  renderProjectSummary();
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
  const canMutateSelectedObject = Boolean(selectedObject && isObjectEditable(selectedObject) && !state.canvasDrag);
  const orderContext = getSelectedObjectOrderContext();
  if (elements.editorToolbar) {
    const canAlignSelectedObject = Boolean(selectedObject && isViewportAlignableObject(selectedObject) && !state.canvasDrag);
    elements.editorToolbar.querySelectorAll("[data-align-action]").forEach((button) => {
      if (button instanceof HTMLButtonElement) {
        button.disabled = !canAlignSelectedObject;
      }
    });
    elements.editorToolbar.querySelectorAll("[data-order-action]").forEach((button) => {
      if (!(button instanceof HTMLButtonElement)) {
        return;
      }

      const action = button.dataset.orderAction;
      const enabled = Boolean(
        canMutateSelectedObject
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
  if (elements.actionDuplicate) {
    elements.actionDuplicate.disabled = !canMutateSelectedObject;
  }
  if (elements.actionDelete) {
    elements.actionDelete.disabled = !canMutateSelectedObject;
  }
  const previousNavigationContext = getSelectedObjectNavigationContext("previous");
  const nextNavigationContext = getSelectedObjectNavigationContext("next");
  if (elements.actionSelectPrevious) {
    elements.actionSelectPrevious.disabled = !Boolean(previousNavigationContext?.targetObjectId && !state.canvasDrag);
  }
  if (elements.actionSelectNext) {
    elements.actionSelectNext.disabled = !Boolean(nextNavigationContext?.targetObjectId && !state.canvasDrag);
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
    if (orderContext) {
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
  if (elements.sceneExplorer) {
    elements.sceneExplorer.innerHTML = `<div class="tree-row"><strong>Scene Explorer</strong><span>Editor data could not be loaded.</span></div>`;
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
  dirty: state.dirty,
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
