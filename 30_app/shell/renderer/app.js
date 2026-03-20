const state = {
  bundle: null,
  selectedProjectId: null,
  editorData: null,
  selectedObjectId: null,
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
  actionSave: document.getElementById("action-save"),
  actionReloadEditor: document.getElementById("action-reload-editor"),
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
  const objects = Array.isArray(state.editorData?.objects) ? state.editorData.objects : [];
  if (objects.length === 0) {
    state.selectedObjectId = null;
    return;
  }

  const selected = objects.find((entry) => entry.id === state.selectedObjectId);
  if (!selected) {
    state.selectedObjectId = objects.find((entry) => isObjectEditable(entry))?.id ?? objects[0].id;
  }
}

async function reloadWorkspace(isInitialLoad, requestedProjectId = null) {
  if (!window.myideApi || typeof window.myideApi.loadProjectSlice !== "function") {
    throw new Error("MyIDE desktop bridge is unavailable.");
  }

  state.bundle = await window.myideApi.loadProjectSlice(requestedProjectId ?? state.selectedProjectId ?? undefined);
  state.selectedProjectId = state.bundle.selectedProjectId;
  state.editorData = state.bundle.editableProject ? clone(state.bundle.editableProject) : null;
  state.dirty = false;
  ensureSelectedObject();

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
  if (!selectedObject || selectedObject.locked) {
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

  selectedObject[field] = nextValue;
  state.dirty = true;
  renderAll();
  setPreviewStatus(`Edited ${selectedObject.displayName}. Save to persist the change.`);
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
  pushLog(`Saved ${selectedProject.projectId} to internal scene files.`);

  await reloadWorkspace(false, selectedProject.projectId);
  state.selectedObjectId = selectedObjectId;
  ensureSelectedObject();
  renderAll();
  state.dirty = false;

  const snapshotMessage = saveResult.snapshotDir ? ` Snapshot: ${saveResult.snapshotDir}.` : "";
  setPreviewStatus(`Saved ${selectedProject.displayName} at ${saveResult.savedAt}.${snapshotMessage}`);
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
          <small>${object.visible ? "visible" : "hidden"} · ${object.locked ? "locked" : "editable"}</small>
        </button>
      `).join("")
      : `<p class="muted-copy">No objects on this layer.</p>`;

    return `
      <div class="tree-row">
        <strong>${layer.displayName}</strong>
        <span>order ${layer.order} · ${layer.visible ? "visible" : "hidden"} · ${layer.locked ? "locked" : "editable"}</span>
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

    return `
      <button
        class="canvas-object object-${object.type} ${object.id === state.selectedObjectId ? "is-selected" : ""} ${locked ? "is-locked" : ""}"
        type="button"
        data-canvas-object-id="${object.id}"
        style="${style}"
        title="${object.displayName}"
      >
        <span class="canvas-object-title">${object.displayName}</span>
        <small>${getObjectLabel(object)}</small>
      </button>
    `;
  }).join("");

  const viewportWidth = editorData.scene.viewport?.width ?? 1280;
  const viewportHeight = editorData.scene.viewport?.height ?? 720;

  elements.editorCanvas.innerHTML = `
    <div class="canvas-meta">
      <span>${editorData.scene.sceneId}</span>
      <span>${viewportWidth} × ${viewportHeight}</span>
      <span>Internal files only</span>
    </div>
    <div class="canvas-stage" style="width:${viewportWidth}px; height:${viewportHeight}px;">
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

  if (elements.actionSave) {
    elements.actionSave.disabled = !state.editorData || !state.dirty;
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
