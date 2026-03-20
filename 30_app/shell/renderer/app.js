const state = {
  bundle: null,
  selectedProjectId: null,
  activeStateId: "state.idle",
  activeFixtureKey: null,
  currentGrid: [],
  stickyFrames: new Set(),
  balance: 1200,
  bet: 1,
  overlay: null,
  freeSpinsText: "",
  restoreVisible: false,
  log: [],
  isRunning: false
};

const elements = {
  projectBrowser: document.getElementById("project-browser"),
  evidenceBrowser: document.getElementById("evidence-browser"),
  previewStatus: document.getElementById("preview-status"),
  sceneLabel: document.getElementById("scene-label"),
  activeStateChip: document.getElementById("active-state-chip"),
  sceneTitle: document.getElementById("scene-title"),
  sideHeading: document.getElementById("side-heading"),
  sideCopy: document.getElementById("side-copy"),
  balanceLabel: document.getElementById("balance-label"),
  betLabel: document.getElementById("bet-label"),
  reelGrid: document.getElementById("reel-grid"),
  winBanner: document.getElementById("win-banner"),
  freeSpinsPill: document.getElementById("free-spins-pill"),
  restoreChip: document.getElementById("restore-chip"),
  overlayCard: document.getElementById("overlay-card"),
  overlayTitle: document.getElementById("overlay-title"),
  overlayValue: document.getElementById("overlay-value"),
  replayLog: document.getElementById("replay-log"),
  inspector: document.getElementById("inspector"),
  actionIdle: document.getElementById("action-idle"),
  actionSpin: document.getElementById("action-spin"),
  actionFreeSpins: document.getElementById("action-free-spins"),
  actionRestore: document.getElementById("action-restore"),
  actionDemo: document.getElementById("action-demo"),
  actionRescan: document.getElementById("action-rescan"),
  newProjectForm: document.getElementById("new-project-form"),
  createProjectStatus: document.getElementById("create-project-status"),
  fieldDisplayName: document.getElementById("field-display-name"),
  fieldSlug: document.getElementById("field-slug"),
  fieldGameFamily: document.getElementById("field-game-family"),
  fieldDonorReference: document.getElementById("field-donor-reference"),
  fieldTargetDisplayName: document.getElementById("field-target-display-name"),
  fieldNotes: document.getElementById("field-notes")
};

const idleGrid = [
  ["ROSE", "A", "K"],
  ["BOOK", "ROSE", "A"],
  ["KEY", "BOOK", "ROSE"],
  ["A", "ROSE", "BOOK"],
  ["K", "A", "ROSE"]
];

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

document.addEventListener("DOMContentLoaded", () => {
  void init();
});

async function init() {
  bindActions();

  try {
    await reloadWorkspace(true);
  } catch (error) {
    renderFatal(error instanceof Error ? error.message : "Unknown preview error.");
  }
}

function bindActions() {
  elements.actionIdle?.addEventListener("click", () => resetToIdle(false));
  elements.actionSpin?.addEventListener("click", () => {
    void runNormalSpin();
  });
  elements.actionFreeSpins?.addEventListener("click", () => {
    void runFreeSpinsTrigger();
  });
  elements.actionRestore?.addEventListener("click", () => {
    void runRestartRestore();
  });
  elements.actionDemo?.addEventListener("click", () => {
    void playFullDemo();
  });
  elements.actionRescan?.addEventListener("click", () => {
    void reloadWorkspace(false);
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
    if (typeof projectId === "string" && projectId.length > 0) {
      state.selectedProjectId = projectId;
      renderAll();
    }
  });
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

function setCreateProjectStatus(text, isError = false) {
  if (!elements.createProjectStatus) {
    return;
  }

  elements.createProjectStatus.textContent = text;
  elements.createProjectStatus.dataset.tone = isError ? "error" : "default";
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
    renderAll();
    setCreateProjectStatus(`Created ${created.displayName}. The new folder is now discoverable in the workspace browser.`);
    setPreviewStatus(`Created ${created.displayName}. Replay remains bound to project_001 until the new project has an internal slice.`);
  } catch (error) {
    setCreateProjectStatus(error instanceof Error ? error.message : "Project creation failed.", true);
  }
}

async function reloadWorkspace(isInitialLoad, preferredSelectedProjectId = null) {
  if (!window.myideApi || typeof window.myideApi.loadProjectSlice !== "function") {
    throw new Error("MyIDE desktop bridge is unavailable.");
  }

  const previousSelectedProjectId = preferredSelectedProjectId ?? state.selectedProjectId;
  state.bundle = await window.myideApi.loadProjectSlice();

  const workspaceProjects = getWorkspaceProjects();
  const selectedProjectId =
    workspaceProjects.find((project) => project.projectId === previousSelectedProjectId)?.projectId
    ?? state.bundle.workspace?.selectedProjectId
    ?? workspaceProjects[0]?.projectId
    ?? null;

  state.selectedProjectId = selectedProjectId;

  if (isInitialLoad) {
    resetToIdle(true);
    return;
  }

  renderAll();
  setPreviewStatus(state.bundle.workspace?.source?.registryFound
    ? "Workspace rescanned from disk. Any valid project folders can now appear in the browser."
    : "Workspace reloaded from the validated Mystery Garden slice.");
  pushLog("Workspace rescan completed.");
}

function getProject() {
  return state.bundle.project;
}

function getWorkspace() {
  return state.bundle.workspace;
}

function getWorkspaceProjects() {
  const workspace = getWorkspace();
  return Array.isArray(workspace.projects) ? workspace.projects : [];
}

function getSelectedWorkspaceProject() {
  const projects = getWorkspaceProjects();
  if (projects.length === 0) {
    return null;
  }

  return projects.find((entry) => entry.projectId === state.selectedProjectId) ?? projects[0];
}

function getFixture(key) {
  return state.bundle.fixtures[key];
}

function getActiveStateRecord() {
  const states = Array.isArray(getProject().states) ? getProject().states : [];
  return states.find((entry) => entry.stateId === state.activeStateId) ?? null;
}

function getStrings() {
  const localization = getProject().localization;
  if (!localization || !Array.isArray(localization.locales) || localization.locales.length === 0) {
    return {};
  }

  return localization.locales[0].strings ?? {};
}

function msg(messageId, fallback) {
  const strings = getStrings();
  return strings[messageId] ?? fallback;
}

function autoAdvanceMs() {
  const overlays = getProject().clientConfig?.overlays;
  if (!Array.isArray(overlays) || overlays.length === 0) {
    return 650;
  }

  return Number(overlays[0].settings?.autoAdvanceMs ?? 650);
}

function wait(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function toFixedAmount(value) {
  return Number(value).toFixed(2);
}

function collectEvidenceRefs(value, refs = new Set()) {
  if (Array.isArray(value)) {
    value.forEach((item) => collectEvidenceRefs(item, refs));
    return refs;
  }

  if (!value || typeof value !== "object") {
    return refs;
  }

  Object.entries(value).forEach(([key, entry]) => {
    if (key === "evidenceRefs" && Array.isArray(entry)) {
      entry.forEach((ref) => {
        if (typeof ref === "string") {
          refs.add(ref);
        }
      });
      return;
    }

    if (key === "evidenceRef" && typeof entry === "string") {
      entry.split(",").map((part) => part.trim()).filter(Boolean).forEach((ref) => refs.add(ref));
      return;
    }

    collectEvidenceRefs(entry, refs);
  });

  return refs;
}

function pushLog(text) {
  const stamp = new Date().toISOString().slice(11, 19);
  state.log = [{ stamp, text }, ...state.log].slice(0, 8);
}

function setPreviewStatus(text) {
  if (elements.previewStatus) {
    elements.previewStatus.textContent = text;
  }
}

function resetToIdle(isInitialLoad) {
  state.activeStateId = "state.idle";
  state.activeFixtureKey = null;
  state.currentGrid = idleGrid;
  state.stickyFrames = new Set();
  state.balance = 1200;
  state.bet = 1;
  state.overlay = null;
  state.freeSpinsText = "";
  state.restoreVisible = false;
  state.log = [];
  pushLog(isInitialLoad ? "Loaded project_001 replay slice from internal JSON." : "Returned to idle state.");
  renderAll();
  setPreviewStatus("Idle scene ready. Preview is using project_001 internal data only.");
}

async function runNormalSpin() {
  if (!state.bundle || state.isRunning) {
    return;
  }

  state.isRunning = true;
  state.activeStateId = "state.spin";
  state.activeFixtureKey = null;
  state.overlay = null;
  state.restoreVisible = false;
  state.freeSpinsText = "";
  state.currentGrid = [
    ["...", "...", "..."],
    ["...", "...", "..."],
    ["...", "...", "..."],
    ["...", "...", "..."],
    ["...", "...", "..."]
  ];
  pushLog("Spin requested from idle.");
  renderAll();
  setPreviewStatus(msg("msg.spin.running", "Running deterministic internal spin replay."));

  await wait(autoAdvanceMs());

  const fixture = getFixture("normalSpin");
  state.activeStateId = "state.base-win";
  state.activeFixtureKey = "normalSpin";
  state.currentGrid = fixture.grid;
  state.balance = 1203;
  state.stickyFrames = new Set();
  state.overlay = null;
  pushLog(`Base win resolved with ${fixture.win.bannerText}.`);
  renderAll();
  setPreviewStatus("Normal spin replay completed. Base win shown from internal fixture.");
  state.isRunning = false;
}

async function runFreeSpinsTrigger() {
  if (!state.bundle || state.isRunning) {
    return;
  }

  state.isRunning = true;
  state.activeStateId = "state.spin";
  state.activeFixtureKey = null;
  state.restoreVisible = false;
  state.overlay = null;
  state.freeSpinsText = "";
  state.currentGrid = [
    ["...", "...", "..."],
    ["...", "...", "..."],
    ["...", "...", "..."],
    ["...", "...", "..."],
    ["...", "...", "..."]
  ];
  pushLog("Scatter trigger replay started.");
  renderAll();
  setPreviewStatus(msg("msg.spin.running", "Running deterministic internal spin replay."));

  await wait(autoAdvanceMs());

  const fixture = getFixture("freeSpinsTrigger");
  state.activeStateId = "state.free-spins-trigger";
  state.activeFixtureKey = "freeSpinsTrigger";
  state.currentGrid = fixture.grid;
  state.overlay = {
    title: "YOU HAVE WON",
    value: "10 FREE SPINS"
  };
  pushLog("Free spins trigger modal displayed.");
  renderAll();
  setPreviewStatus("Free spins trigger reached from the internal fixture.");

  await wait(autoAdvanceMs());

  state.activeStateId = "state.free-spins-active";
  state.currentGrid = fixture.followUp.grid;
  state.stickyFrames = new Set(fixture.followUp.stickyFrames);
  state.freeSpinsText = fixture.followUp.counterText;
  state.overlay = null;
  pushLog("Free spins active state restored from the follow-up fixture.");
  renderAll();
  setPreviewStatus("Free spins replay active. Sticky frame placeholders are internal only.");
  state.isRunning = false;
}

async function runRestartRestore() {
  if (!state.bundle || state.isRunning) {
    return;
  }

  state.isRunning = true;
  const gameState = state.bundle.runtime.mockedGameState;

  state.activeStateId = "state.restore.free-spins-active";
  state.activeFixtureKey = "restartRestore";
  state.currentGrid = gameState.reelWindow;
  state.stickyFrames = new Set(gameState.freeSpins.stickyFrames);
  state.balance = gameState.balance;
  state.bet = gameState.bet;
  state.freeSpinsText = `Free spins: ${gameState.freeSpins.remaining}/${gameState.freeSpins.awarded}`;
  state.restoreVisible = true;
  state.overlay = null;
  pushLog("Loaded mocked gameState and lastAction for restart recovery.");
  renderAll();
  setPreviewStatus("Mocked restart data loaded. Settling into the active bonus state.");

  await wait(Math.max(240, Math.round(autoAdvanceMs() / 2)));

  state.activeStateId = "state.free-spins-active";
  pushLog("Restart recovery settled into free spins active.");
  renderAll();
  setPreviewStatus("Restart recovery completed from mocked gameState.");
  state.isRunning = false;
}

async function playFullDemo() {
  if (state.isRunning) {
    return;
  }

  resetToIdle(false);
  await wait(300);
  await runNormalSpin();
  await wait(450);
  await runFreeSpinsTrigger();
  await wait(450);
  await runRestartRestore();
}

function renderProjectBrowser() {
  if (!elements.projectBrowser) {
    return;
  }

  const workspace = getWorkspace();
  const projects = getWorkspaceProjects();
  const selectedProject = getSelectedWorkspaceProject();
  const registryLabel = workspace.source.registryFound
    ? "Derived from discovered project folders"
    : "Synthesized from validated project_001";
  const renderLifecycleChips = (project, compact = false) => lifecycleStageOrder.map((stageId) => {
    const stage = project?.lifecycle?.stages?.[stageId];
    const status = stage?.status ?? "planned";
    const current = project?.lifecycle?.currentStage === stageId;

    return `<span class="stage-chip stage-${status} ${current ? "is-current" : ""}" title="${stage?.notes ?? labelizeStage(stageId)}">${compact ? labelizeStage(stageId).replace(" ", " ") : `${labelizeStage(stageId)}: ${labelizeStatus(status)}`}</span>`;
  }).join("");
  const projectCards = projects.map((project) => {
    const isSelected = project.projectId === selectedProject?.projectId;
    const statusLabel = labelizeStatus(project.status);
    const verificationLabel = project.verificationStatus === "verified-replay-slice" || project.verificationStatus === "verified-workspace"
      ? "Verified"
      : labelizeStatus(project.verificationStatus);

    return `
      <button class="project-card ${isSelected ? "is-selected" : ""}" type="button" data-project-id="${project.projectId}">
        <div class="project-card-head">
          <strong>${project.displayName}</strong>
          <span class="status-chip status-${project.status}">${statusLabel}</span>
        </div>
        <p>${project.donor.donorName} <code>${project.donor.donorId}</code></p>
        <p>${project.targetGame.displayName}</p>
        <p>${labelizeStage(project.lifecycle.currentStage)} · ${verificationLabel}</p>
        <p class="project-path"><code>${project.keyPaths.projectRoot}</code></p>
        <div class="chip-row">
          <span>${project.phase}</span>
          <span>${project.gameFamily}</span>
          <span>${project.implementationScope}</span>
        </div>
      </button>
    `;
  }).join("");

  const selectedNotes = selectedProject ? `
    <div class="detail-grid">
      <div class="detail-card">
        <span>Donor</span>
        <strong>${selectedProject.donor.donorName}</strong>
        <small>${selectedProject.donor.donorId}</small>
      </div>
      <div class="detail-card">
        <span>Target / Resulting Game</span>
        <strong>${selectedProject.targetGame.displayName}</strong>
        <small>${selectedProject.targetGame.notes}</small>
      </div>
      <div class="detail-card">
        <span>Phase</span>
        <strong>${selectedProject.phase}</strong>
        <small>${selectedProject.gameFamily} / ${selectedProject.implementationScope}</small>
      </div>
      <div class="detail-card">
        <span>Verification</span>
        <strong>${labelizeStatus(selectedProject.verificationStatus)}</strong>
        <small>${workspace.source.registryFound ? "Folder-discovery workspace view backed by the derived registry cache." : "Synthesized from validated project_001."}</small>
      </div>
      <div class="detail-card">
        <span>Lifecycle Stage</span>
        <strong>${labelizeStage(selectedProject.lifecycle.currentStage)}</strong>
        <small>${selectedProject.lifecycle.stages[selectedProject.lifecycle.currentStage]?.notes ?? "Stage notes pending."}</small>
      </div>
      <div class="detail-card">
        <span>Project Folder</span>
        <strong>${selectedProject.keyPaths.projectRoot}</strong>
        <small>${selectedProject.status === "validated" ? "Validated replay metadata exists for this project." : "Scaffold/planned metadata only until verification exists."}</small>
      </div>
    </div>
    <div class="tree-row">
      <strong>Lifecycle Summary</strong>
      <span>One project = one donor-to-release cycle.</span>
      <div class="lifecycle-grid">${renderLifecycleChips(selectedProject)}</div>
    </div>
  ` : `<p class="muted-copy">No projects available.</p>`;

  elements.projectBrowser.innerHTML = `
    <div class="tree-row">
      <strong>${workspace.displayName}</strong>
      <span>${workspace.description}</span>
      <code>${workspace.registryPath}</code>
    </div>
    <div class="tree-row">
      <strong>Registry Source</strong>
      <span>${registryLabel}</span>
      <p class="muted-copy">${workspace.source.registryFound ? "Rescan reloads the workspace bundle from disk so newly added valid project folders can appear after discovery refreshes the derived registry cache." : workspace.source.note}</p>
    </div>
    <div class="project-list">
      ${projectCards}
    </div>
    <div class="tree-row">
      <strong>Selected Project</strong>
      <span>${selectedProject ? selectedProject.displayName : "No selection"}</span>
    </div>
    ${selectedNotes}
  `;
}

function renderEvidenceBrowser() {
  if (!elements.evidenceBrowser) {
    return;
  }

  const refs = Array.from(collectEvidenceRefs(getProject())).sort();
  elements.evidenceBrowser.innerHTML = `
    <div class="tree-row">
      <strong>Referenced Evidence IDs</strong>
      <span>The preview shows these references without loading donor files.</span>
      <div class="chip-row">${refs.map((ref) => `<span>${ref}</span>`).join("")}</div>
    </div>
    <div class="tree-row">
      <strong>Runtime Boundary</strong>
      <span>Only internal files under <code>40_projects/project_001</code> are read during replay.</span>
    </div>
  `;
}

function renderGrid() {
  if (!elements.reelGrid) {
    return;
  }

  const cells = [];
  state.currentGrid.forEach((column, columnIndex) => {
    column.forEach((symbol, rowIndex) => {
      const cellKey = `r${columnIndex + 1}c${rowIndex + 1}`;
      const classes = ["symbol"];

      if (state.stickyFrames.has(cellKey)) {
        classes.push("is-sticky");
      }
      if (symbol === "KEY") {
        classes.push("is-key");
      }
      if (symbol === "BOOK") {
        classes.push("is-book");
      }

      cells.push(`<div class="${classes.join(" ")}">${symbol}</div>`);
    });
  });

  elements.reelGrid.innerHTML = cells.join("");
}

function renderStage() {
  const activeState = getActiveStateRecord();
  const fixture = state.activeFixtureKey ? getFixture(state.activeFixtureKey) : null;
  const selectedProject = getSelectedWorkspaceProject();

  if (elements.sceneLabel) {
    elements.sceneLabel.textContent = "scene.main";
  }
  if (elements.activeStateChip) {
    elements.activeStateChip.textContent = state.activeStateId;
  }
  if (elements.sceneTitle) {
    elements.sceneTitle.textContent = selectedProject?.targetGame.displayName ?? "MYSTERY GARDEN";
  }
  if (elements.sideHeading) {
    elements.sideHeading.textContent = selectedProject?.displayName ?? (state.activeStateId === "state.free-spins-active" ? "Bonus Active Panel" : "Buy Bonus Panel");
  }
  if (elements.sideCopy) {
    elements.sideCopy.textContent = selectedProject?.notes?.proven?.[0] ?? (state.activeStateId === "state.free-spins-active"
      ? "Sticky frame placeholders stay highlighted while the local replay remains in bonus mode."
      : "This bounded replay mirrors the visible donor layout with clean internal placeholders.");
  }
  if (elements.balanceLabel) {
    elements.balanceLabel.textContent = toFixedAmount(state.balance);
  }
  if (elements.betLabel) {
    elements.betLabel.textContent = toFixedAmount(state.bet);
  }

  renderGrid();

  if (elements.winBanner) {
    const showWinBanner = state.activeStateId === "state.base-win";
    elements.winBanner.classList.toggle("is-hidden", !showWinBanner);
    elements.winBanner.textContent = fixture?.win?.bannerText ?? msg("msg.win.banner", "3.00 EUR");
  }

  if (elements.freeSpinsPill) {
    const showFreeSpins = Boolean(state.freeSpinsText);
    elements.freeSpinsPill.classList.toggle("is-hidden", !showFreeSpins);
    elements.freeSpinsPill.textContent = state.freeSpinsText;
  }

  if (elements.restoreChip) {
    elements.restoreChip.classList.toggle("is-hidden", !state.restoreVisible);
    elements.restoreChip.textContent = msg("msg.restore.ready", "Recovered from mocked gameState");
  }

  if (elements.overlayCard && elements.overlayTitle && elements.overlayValue) {
    const hasOverlay = Boolean(state.overlay);
    elements.overlayCard.classList.toggle("is-hidden", !hasOverlay);
    elements.overlayTitle.textContent = state.overlay?.title ?? "";
    elements.overlayValue.textContent = state.overlay?.value ?? "";
  }

  if (activeState?.extensions?.classification) {
    setPreviewStatus(`Active state ${state.activeStateId} (${activeState.extensions.classification}).`);
  }
}

function renderLog() {
  if (!elements.replayLog) {
    return;
  }

  elements.replayLog.innerHTML = state.log.map((entry) => `<li><strong>${entry.stamp}</strong> ${entry.text}</li>`).join("");
}

function renderInspector() {
  if (!elements.inspector || !state.bundle) {
    return;
  }

  const project = getProject();
  const selectedProject = getSelectedWorkspaceProject();
  const activeState = getActiveStateRecord();
  const fixture = state.activeFixtureKey ? getFixture(state.activeFixtureKey) : null;
  const evidenceRefs = Array.from(new Set([
    ...(Array.isArray(activeState?.extensions?.evidenceRefs) ? activeState.extensions.evidenceRefs : []),
    ...(Array.isArray(fixture?.evidenceRefs) ? fixture.evidenceRefs : [])
  ]));
  const assumptions = Array.isArray(project.provenance?.assumptions) ? project.provenance.assumptions : [];
  const unresolved = Array.isArray(project.provenance?.todo) ? project.provenance.todo : [];
  const lifecycleRows = lifecycleStageOrder.map((stageId) => {
    const stage = selectedProject?.lifecycle?.stages?.[stageId];
    return `<li><code>${labelizeStage(stageId)}</code>: ${labelizeStatus(stage?.status ?? "planned")}${stage?.notes ? ` — ${stage.notes}` : ""}</li>`;
  }).join("");

  elements.inspector.innerHTML = `
    <div class="inspector-title">
      <p>Workspace + Replay State</p>
      <h3>${selectedProject?.displayName ?? project.projectId}</h3>
    </div>
    <p class="inspector-purpose">${selectedProject?.donor.donorName ?? "Unknown project"} mapped to a bounded local replay.</p>
    <section>
      <h4>Project Metadata</h4>
      <ul>
        <li>Project ID: <code>${selectedProject?.projectId ?? "unknown"}</code></li>
        <li>Project folder: <code>${selectedProject?.keyPaths.projectRoot ?? "unknown"}</code></li>
        <li>Status: <code>${selectedProject?.status ?? "unknown"}</code></li>
        <li>Target / Resulting game: <code>${selectedProject?.targetGame.displayName ?? "unknown"}</code></li>
        <li>Phase: <code>${selectedProject?.phase ?? "unknown"}</code></li>
        <li>Implementation scope: <code>${selectedProject?.implementationScope ?? "unknown"}</code></li>
        <li>Verification: <code>${selectedProject?.verificationStatus ?? "unknown"}</code></li>
        <li>Lifecycle current stage: <code>${selectedProject?.lifecycle?.currentStage ?? "unknown"}</code></li>
        <li>Workspace active project: <code>${state.bundle.workspace.activeProjectId ?? "unknown"}</code></li>
      </ul>
    </section>
    <section>
      <h4>Lifecycle Stages</h4>
      <ul>${lifecycleRows}</ul>
    </section>
    <section>
      <h4>Proven Facts</h4>
      <ul>
        <li>Preview data is loaded from <code>40_projects/project_001</code> only.</li>
        <li>Current fixture: <code>${fixture?.fixtureId ?? "idle-only"}</code>.</li>
        <li>Selected project metadata is registry-backed; replay runtime still uses the validated internal slice only.</li>
        <li>Evidence refs on the active donor-backed state are shown below.</li>
      </ul>
    </section>
    <section>
      <h4>Evidence Refs</h4>
      <div class="chip-row">${evidenceRefs.length > 0 ? evidenceRefs.map((ref) => `<span>${ref}</span>`).join("") : "<span>Internal-only state</span>"}</div>
    </section>
    <section>
      <h4>Assumptions</h4>
      <ul>${assumptions.map((item) => `<li>${item}</li>`).join("")}</ul>
    </section>
    <section>
      <h4>Unresolved</h4>
      <ul>${unresolved.map((item) => `<li>${item}</li>`).join("")}</ul>
    </section>
    <section>
      <h4>Notes</h4>
      <ul>
        <li>${selectedProject?.notes?.proven?.[0] ?? "Validated slice remains intact."}</li>
        <li>${selectedProject?.notes?.planned?.[0] ?? "Workspace registry will expand over time."}</li>
      </ul>
    </section>
  `;
}

function renderAll() {
  renderProjectBrowser();
  renderEvidenceBrowser();
  renderStage();
  renderLog();
  renderInspector();
}

function renderFatal(message) {
  setPreviewStatus(message);

  if (elements.projectBrowser) {
    elements.projectBrowser.innerHTML = `<div class="tree-row"><strong>Load Error</strong><span>${message}</span></div>`;
  }
  if (elements.evidenceBrowser) {
    elements.evidenceBrowser.innerHTML = `<div class="tree-row"><strong>Bridge Status</strong><span>Preview could not load project_001.</span></div>`;
  }
  if (elements.inspector) {
    elements.inspector.innerHTML = `
      <div class="inspector-title">
        <p>Preview Error</p>
        <h3>Load Failed</h3>
      </div>
      <p class="inspector-purpose">${message}</p>
    `;
  }
}

window.render_game_to_text = () => JSON.stringify({
  activeStateId: state.activeStateId,
  activeFixtureKey: state.activeFixtureKey,
  balance: state.balance,
  bet: state.bet,
  grid: state.currentGrid,
  stickyFrames: Array.from(state.stickyFrames),
  overlay: state.overlay,
  freeSpinsText: state.freeSpinsText,
  restoreVisible: state.restoreVisible,
  log: state.log.slice(0, 4)
});

window.advanceTime = (ms) => {
  if (typeof ms === "number" && Number.isFinite(ms) && ms > 0) {
    pushLog(`advanceTime(${Math.round(ms)}) observed in deterministic replay.`);
    renderAll();
  }
};
