const state = {
  bundle: null,
  selectedProjectId: null,
  editorData: null,
  selectedObjectId: null,
  history: null,
  canvasDrag: null,
  dirty: false,
  activityLog: []
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
  actionDuplicate: document.getElementById("action-duplicate"),
  actionDelete: document.getElementById("action-delete"),
  actionSave: document.getElementById("action-save"),
  actionReloadEditor: document.getElementById("action-reload-editor"),
  dirtyIndicator: document.getElementById("dirty-indicator"),
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
  void init();
});

async function init() {
  bindActions();

  try {
    await reloadWorkspace(true);
  } catch (error) {
    renderFatal(error instanceof Error ? error.message : "Unknown editor load error.");
  }
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

function sortLayers(layers) {
  return [...layers].sort((left, right) => left.order - right.order || left.displayName.localeCompare(right.displayName));
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

function getCanvasObjectById(objectId) {
  if (!state.editorData || !Array.isArray(state.editorData.objects)) {
    return null;
  }

  return state.editorData.objects.find((entry) => entry.id === objectId) ?? null;
}

function setSelectedObject(objectId) {
  state.selectedObjectId = objectId;
}

function beginCanvasDrag(object, event) {
  if (!object || !isObjectEditable(object)) {
    return false;
  }

  const stage = getCanvasStage();
  if (!stage) {
    return false;
  }

  const rect = stage.getBoundingClientRect();
  const pointerX = event.clientX - rect.left;
  const pointerY = event.clientY - rect.top;

  state.canvasDrag = {
    objectId: object.id,
    pointerId: event.pointerId,
    offsetX: pointerX - object.x,
    offsetY: pointerY - object.y,
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
  const bounded = clampObjectPosition(object, x, y);
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
  if (!state.editorData || event.button !== 0) {
    return;
  }

  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  const objectButton = target.closest("[data-canvas-object-id]");
  const canvasStage = target.closest(".canvas-stage");

  if (!canvasStage) {
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
  if (!state.canvasDrag || event.pointerId !== state.canvasDrag.pointerId || !state.editorData) {
    return;
  }

  const object = getCanvasObjectById(state.canvasDrag.objectId);
  if (!object || !isObjectEditable(object)) {
    return;
  }

  const stage = getCanvasStage();
  if (!stage) {
    return;
  }

  const rect = stage.getBoundingClientRect();
  const pointerX = event.clientX - rect.left;
  const pointerY = event.clientY - rect.top;
  const nextX = pointerX - state.canvasDrag.offsetX;
  const nextY = pointerY - state.canvasDrag.offsetY;
  const bounded = clampObjectPosition(object, nextX, nextY);

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

  const step = event.shiftKey ? 10 : 1;
  nudgeSelectedObject(delta[0] * step, delta[1] * step, event.shiftKey ? "Keyboard nudge (fast)" : "Keyboard nudge");
}

async function reloadWorkspace(isInitialLoad, requestedProjectId = null) {
  if (!window.myideApi || typeof window.myideApi.loadProjectSlice !== "function") {
    throw new Error("MyIDE desktop bridge is unavailable.");
  }

  state.bundle = await window.myideApi.loadProjectSlice(requestedProjectId ?? state.selectedProjectId ?? undefined);
  state.selectedProjectId = state.bundle.selectedProjectId;
  state.editorData = state.bundle.editableProject ? clone(state.bundle.editableProject) : null;
  state.canvasDrag = null;
  resetEditorHistory();
  reconcileSelectedObject();

  if (isInitialLoad) {
    pushLog(`Opened ${state.selectedProjectId}.`);
  } else {
    pushLog(`Reloaded ${state.selectedProjectId} from disk.`);
  }

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
  } else if (["x", "y", "scaleX", "scaleY"].includes(field)) {
    const numeric = Number(target.value);
    if (!Number.isFinite(numeric)) {
      return;
    }
    nextValue = numeric;
  } else {
    nextValue = target.value;
  }

  const didChange = applyEditorMutation(`Edited ${selectedObject.displayName} ${field}.`, (editorData) => {
    const editableObject = editorData.objects.find((entry) => entry.id === selectedObject.id);
    if (!editableObject) {
      return;
    }

    editableObject[field] = nextValue;
  });

  if (didChange) {
    setPreviewStatus(`Edited ${selectedObject.displayName}. Save to persist the change.`);
  }
}

function handleLayerAction(layerId, action) {
  const layer = getLayerById(layerId);
  if (!layer || !state.editorData) {
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
  const saveResult = await window.myideApi.saveProjectEditor(selectedProject.projectId, state.editorData);
  const replayPath = saveResult.replayProjectPath
    ? toRepoRelativePath(saveResult.replayProjectPath)
    : "40_projects/project_001/project.json";
  pushLog(`Saved ${selectedProject.projectId} and synced replay output to ${replayPath}.`);

  await reloadWorkspace(false, selectedProject.projectId);
  reconcileSelectedObject(selectedObjectId);
  renderAll();
  state.dirty = false;

  const snapshotMessage = saveResult.snapshotDir ? ` Snapshot: ${toRepoRelativePath(saveResult.snapshotDir)}.` : "";
  const syncMessage = saveResult.replayProjectPath ? ` Replay sync: ${replayPath}.` : "";
  setPreviewStatus(`Saved ${selectedProject.displayName} at ${saveResult.savedAt}.${snapshotMessage}${syncMessage}`);
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
  const layerMarkup = sortedLayers.map((layer) => {
    const objects = editorData.objects.filter((entry) => entry.layerId === layer.id);
    const objectMarkup = objects.length > 0
      ? objects.map((object) => `
        <button class="object-row ${object.id === state.selectedObjectId ? "is-selected" : ""}" type="button" data-object-id="${object.id}">
          <strong>${object.displayName}</strong>
          <span>${object.type}</span>
          <small>${object.visible ? "visible" : "hidden"} · ${object.locked ? "locked" : "editable"} · ${object.id}</small>
        </button>
      `).join("")
      : `<p class="muted-copy">No objects on this layer.</p>`;

    return `
      <div class="tree-row">
        <div class="layer-row">
          <div>
            <strong>${layer.displayName}</strong>
            <span>order ${layer.order} · ${layer.visible ? "visible" : "hidden"} · ${layer.locked ? "locked" : "editable"}</span>
          </div>
          <div class="layer-actions">
            <button class="layer-toggle" type="button" data-layer-id="${layer.id}" data-layer-action="toggle-visible">
              ${layer.visible ? "Hide" : "Show"}
            </button>
            <button class="layer-toggle" type="button" data-layer-id="${layer.id}" data-layer-action="toggle-locked">
              ${layer.locked ? "Unlock" : "Lock"}
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
      </div>
    </div>
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
        <small>${sceneSummary}</small>
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
  const visibleLayerIds = new Set(sortedLayers.filter((layer) => layer.visible).map((layer) => layer.id));

  const objectMarkup = editorData.objects.map((object) => {
    const layer = getLayerById(object.layerId);
    const visible = object.visible && visibleLayerIds.has(object.layerId);
    const locked = object.locked || layer?.locked;
    const dragging = state.canvasDrag?.objectId === object.id;
    const dimensions = getObjectDimensions(object);
    const layerOrder = typeof layer?.order === "number" ? layer.order : 0;
    const style = [
      `left:${object.x}px`,
      `top:${object.y}px`,
      `width:${dimensions.width}px`,
      `height:${dimensions.height}px`,
      `transform:scale(${object.scaleX}, ${object.scaleY})`,
      `z-index:${layerOrder + 1}`,
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

  elements.editorCanvas.innerHTML = `
    <div class="canvas-meta">
      <span>${editorData.scene.sceneId}</span>
      <span>${viewportWidth} × ${viewportHeight}</span>
      <span>Internal files only</span>
      <span>${selectedObject ? `Selected: ${selectedObject.displayName}` : "No selection"}</span>
      <span>Drag or arrow-nudge to move</span>
    </div>
    <div class="canvas-stage" tabindex="0" aria-label="Project editor canvas" style="width:${viewportWidth}px; height:${viewportHeight}px;">
      ${objectMarkup}
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
  const projectNotes = selectedProject.notes ?? {};
  const inspectorInput = {
    subjectId: selectedObject.id,
    subjectKind: "object",
    title: selectedObject.displayName,
    subtitle: `${selectedProject.displayName} · ${selectedObject.type}`,
    mode: locked ? "inspect" : "edit",
    facts: [
      `Layer ${layer?.displayName ?? selectedObject.layerId} is ${layer?.visible === false ? "hidden" : "visible"} in the editor.`,
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
          { key: "layerId", label: "Layer", value: selectedObject.layerId, status: "proven", fieldState: "read-only" },
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
  renderProjectBrowser();
  renderSceneExplorer();
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
  const selectedObject = getSelectedObject();
  const canMutateSelectedObject = Boolean(selectedObject && isObjectEditable(selectedObject) && !state.canvasDrag);
  if (elements.actionDuplicate) {
    elements.actionDuplicate.disabled = !canMutateSelectedObject;
  }
  if (elements.actionDelete) {
    elements.actionDelete.disabled = !canMutateSelectedObject;
  }
  if (elements.actionSave) {
    elements.actionSave.disabled = !state.editorData || !state.dirty;
  }
  if (elements.dirtyIndicator) {
    elements.dirtyIndicator.textContent = state.dirty ? "Unsaved changes" : "Saved";
    elements.dirtyIndicator.dataset.tone = state.dirty ? "dirty" : "saved";
  }
}

function renderFatal(message) {
  setPreviewStatus(message);

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
  layers: Array.isArray(state.editorData?.layers)
    ? state.editorData.layers.map((entry) => ({
      id: entry.id,
      visible: entry.visible,
      locked: entry.locked
    }))
    : [],
  editorObjectPositions: Array.isArray(state.editorData?.objects)
    ? state.editorData.objects.map((entry) => ({
      id: entry.id,
      x: entry.x,
      y: entry.y,
      scaleX: entry.scaleX,
      scaleY: entry.scaleY,
      visible: entry.visible
    }))
    : []
});

window.advanceTime = (ms) => {
  if (typeof ms === "number" && Number.isFinite(ms) && ms > 0) {
    pushLog(`advanceTime(${Math.round(ms)}) observed in editor mode.`);
    renderActivityLog();
  }
};
