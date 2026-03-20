const state = {
  bundle: null,
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
  actionDemo: document.getElementById("action-demo")
};

const idleGrid = [
  ["ROSE", "A", "K"],
  ["BOOK", "ROSE", "A"],
  ["KEY", "BOOK", "ROSE"],
  ["A", "ROSE", "BOOK"],
  ["K", "A", "ROSE"]
];

document.addEventListener("DOMContentLoaded", () => {
  void init();
});

async function init() {
  bindActions();

  try {
    if (!window.myideApi || typeof window.myideApi.loadProjectSlice !== "function") {
      throw new Error("MyIDE desktop bridge is unavailable.");
    }

    state.bundle = await window.myideApi.loadProjectSlice();
    resetToIdle(true);
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
}

function getProject() {
  return state.bundle.project;
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

  const project = getProject();
  const assumptions = Array.isArray(project.provenance?.assumptions) ? project.provenance.assumptions : [];
  const todos = Array.isArray(project.provenance?.todo) ? project.provenance.todo : [];

  elements.projectBrowser.innerHTML = `
    <div class="tree-row">
      <strong>${project.projectId}</strong>
      <span>${project.description}</span>
      <code>${project.sources.editableRoot}</code>
    </div>
    <div class="tree-row">
      <strong>Replay Scope</strong>
      <span>Idle, base win, free spins trigger, free spins active, mocked restart recovery.</span>
    </div>
    <div class="tree-row">
      <strong>Assumptions</strong>
      <ul>${assumptions.map((item) => `<li>${item}</li>`).join("")}</ul>
    </div>
    <div class="tree-row">
      <strong>Next Proof Gaps</strong>
      <ul>${todos.map((item) => `<li>${item}</li>`).join("")}</ul>
    </div>
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

  if (elements.sceneLabel) {
    elements.sceneLabel.textContent = "scene.main";
  }
  if (elements.activeStateChip) {
    elements.activeStateChip.textContent = state.activeStateId;
  }
  if (elements.sceneTitle) {
    elements.sceneTitle.textContent = "MYSTERY GARDEN";
  }
  if (elements.sideHeading) {
    elements.sideHeading.textContent = state.activeStateId === "state.free-spins-active" ? "Bonus Active Panel" : "Buy Bonus Panel";
  }
  if (elements.sideCopy) {
    elements.sideCopy.textContent = state.activeStateId === "state.free-spins-active"
      ? "Sticky frame placeholders stay highlighted while the local replay remains in bonus mode."
      : "This bounded replay mirrors the visible donor layout with clean internal placeholders.";
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
  const activeState = getActiveStateRecord();
  const fixture = state.activeFixtureKey ? getFixture(state.activeFixtureKey) : null;
  const evidenceRefs = Array.from(new Set([
    ...(Array.isArray(activeState?.extensions?.evidenceRefs) ? activeState.extensions.evidenceRefs : []),
    ...(Array.isArray(fixture?.evidenceRefs) ? fixture.evidenceRefs : [])
  ]));
  const assumptions = Array.isArray(project.provenance?.assumptions) ? project.provenance.assumptions : [];
  const unresolved = Array.isArray(project.provenance?.todo) ? project.provenance.todo : [];

  elements.inspector.innerHTML = `
    <div class="inspector-title">
      <p>Replay State</p>
      <h3>${state.activeStateId}</h3>
    </div>
    <p class="inspector-purpose">${activeState?.name ?? "Unknown state"} mapped to a bounded PHASE 3 local replay.</p>
    <section>
      <h4>Proven Facts</h4>
      <ul>
        <li>Preview data is loaded from <code>40_projects/project_001</code> only.</li>
        <li>Current fixture: <code>${fixture?.fixtureId ?? "idle-only"}</code>.</li>
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
