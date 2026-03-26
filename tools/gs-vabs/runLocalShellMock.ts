import { copyFileSync, mkdirSync, rmSync, writeFileSync } from "fs";
import path from "path";

import { getRepoRoot } from "../publication/shared";
import {
  buildSessionFixture,
  FixtureKind,
  FixtureSelection,
  parseFixtureSelectionArg,
  parseProjectIdArg,
  ReplaySummary,
  SerializableReplayRow
} from "./shared";
import { runExportPackage } from "./exportPackage";

export type ShellMockRow = {
  rowIndex: number;
  roundId: string;
  stateName: string;
  stateId: string;
  bet: number;
  win: number;
  balance: number;
  captureStatus: string;
  fixtureProvenance: string;
  rowSnapshot: SerializableReplayRow;
  summary: ReplaySummary;
};

export type ShellMockSummary = {
  projectId: string;
  exportedFolderToken: string;
  staticPackagePath: string;
  requestedFixtureSelection: string;
  actualFixtureSelection: string;
  actualFixtureKind: FixtureKind;
  fixtureProvenance: string;
  captureStatus: string;
  roundId: string;
  capturedRoundId: string;
  comparisonMode: string;
  provisionalFields: string[];
  comparisonNotes: string[];
  shellPurpose: string;
  shellLimitations: string[];
  mockHtmlPath: string;
  packageRoot: string;
  manifestPath: string;
  codePath: string;
  stringsPath: string;
  sessionId: string;
  sessionFixturePath: string;
  sessionFixtureKind: string;
  sessionFixtureProvenance: string;
  sessionCaptureStatus: string;
  sessionSourceNote: string;
  rowCount: number;
  defaultSelectedRowIndex: number;
};

export type ShellMockResult = {
  shellSummary: ShellMockSummary;
  summary: ReplaySummary;
  sessionRows: ShellMockRow[];
  artifactDirectory: string;
  htmlPath: string;
  jsonPath: string;
  textPath: string;
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;");
}

function serializeForInlineScript(value: unknown): string {
  return JSON.stringify(value)
    .replaceAll("<", "\\u003c")
    .replaceAll("-->", "--\\u003e");
}

function buildShellMockRows(projectId: string, repoRoot: string, selection: FixtureSelection): ShellMockRow[] {
  const session = buildSessionFixture(projectId, repoRoot, selection);
  return session.rows.map((row) => ({
    rowIndex: row.rowIndex,
    roundId: row.summary.roundId,
    stateName: row.summary.stateName,
    stateId: row.summary.stateId,
    bet: row.summary.bet,
    win: row.summary.win,
    balance: row.summary.balance,
    captureStatus: row.summary.captureStatus,
    fixtureProvenance: row.summary.fixtureProvenance,
    rowSnapshot: row.rowSnapshot,
    summary: row.summary
  }));
}

function renderRowTable(rows: ShellMockRow[]): string {
  const tableRows = rows
    .map(
      (row) => `<tr class="shell-row-button" data-row-index="${row.rowIndex}" data-round-id="${escapeHtml(
        row.roundId
      )}" data-state-name="${escapeHtml(row.stateName)}" data-selected="no">
          <td>${escapeHtml(row.roundId)}</td>
          <td>${escapeHtml(row.stateName)}</td>
          <td>${escapeHtml(String(row.bet))}</td>
          <td>${escapeHtml(String(row.win))}</td>
          <td>${escapeHtml(String(row.balance))}</td>
        </tr>`
    )
    .join("");

  return `<table class="shell-row-table">
      <thead>
        <tr>
          <th>ROUND_ID</th>
          <th>State</th>
          <th>Bet</th>
          <th>Win</th>
          <th>Balance</th>
        </tr>
      </thead>
      <tbody>
        ${tableRows}
      </tbody>
    </table>`;
}

function renderShellMockHtml(shellSummary: ShellMockSummary, rows: ShellMockRow[]): string {
  const defaultRow = rows[shellSummary.defaultSelectedRowIndex] ?? rows[0];
  if (!defaultRow) {
    throw new Error(`Shell mock HTML requires at least one session row for ${shellSummary.projectId}.`);
  }
  const bootParameters = {
    scheme: "file",
    backendHost: "local-shell-mock",
    staticAssetBase: "./common/vabs",
    folderToken: shellSummary.exportedFolderToken,
    title: `${shellSummary.exportedFolderToken} local VABS shell mock`,
    gameName: "Mystery Garden",
    sessionId: shellSummary.sessionId,
    roundId: defaultRow.roundId,
    hideBalance: false,
    showExtBetId: true
  };

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(shellSummary.projectId)} local VABS shell mock</title>
    <style>
      :root {
        color-scheme: dark;
        --bg: #09111a;
        --panel: #122033;
        --panel-alt: #17293f;
        --line: #284462;
        --text: #edf3fb;
        --muted: #9bb5d0;
        --accent: #f6c85f;
        --selected: rgba(246, 200, 95, 0.16);
      }
      * {
        box-sizing: border-box;
      }
      body {
        margin: 0;
        background: radial-gradient(circle at top, #15243a 0%, var(--bg) 68%);
        color: var(--text);
        font: 14px/1.45 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      .shell {
        max-width: 1460px;
        margin: 0 auto;
        padding: 20px;
      }
      .shell-banner {
        margin-bottom: 18px;
        padding: 16px 18px;
        border: 1px solid var(--line);
        border-radius: 16px;
        background: linear-gradient(180deg, rgba(28, 48, 74, 0.94), rgba(15, 27, 43, 0.94));
      }
      .shell-banner h1 {
        margin: 0 0 8px;
        font-size: 24px;
      }
      .shell-banner p {
        margin: 4px 0;
        color: var(--muted);
      }
      .shell-grid {
        display: grid;
        grid-template-columns: minmax(360px, 430px) minmax(0, 1fr);
        gap: 18px;
      }
      .shell-card {
        border: 1px solid var(--line);
        border-radius: 16px;
        background: rgba(13, 24, 39, 0.92);
        padding: 16px 18px;
        margin-bottom: 16px;
      }
      .shell-card h2 {
        margin: 0 0 10px;
        font-size: 16px;
      }
      .shell-list {
        margin: 0;
        padding-left: 18px;
      }
      .shell-table {
        width: 100%;
        border-collapse: collapse;
      }
      .shell-table td {
        padding: 6px 0;
        border-bottom: 1px solid rgba(40, 68, 98, 0.45);
        vertical-align: top;
      }
      .shell-table td:first-child {
        width: 42%;
        color: var(--muted);
      }
      .shell-code {
        display: block;
        margin-top: 8px;
        padding: 12px;
        border-radius: 12px;
        background: rgba(8, 14, 22, 0.92);
        color: #d4e2f2;
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        white-space: pre-wrap;
        word-break: break-word;
      }
      .shell-row-table {
        width: 100%;
        border-collapse: collapse;
      }
      .shell-row-table th,
      .shell-row-table td {
        padding: 8px 10px;
        border-bottom: 1px solid rgba(40, 68, 98, 0.45);
        text-align: left;
      }
      .shell-row-table th {
        color: var(--muted);
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }
      .shell-row-button {
        cursor: pointer;
      }
      .shell-row-button[data-selected="yes"] {
        background: var(--selected);
      }
      .shell-selection {
        margin-top: 12px;
        padding: 12px 14px;
        border-radius: 12px;
        background: rgba(18, 32, 51, 0.78);
      }
      .shell-selection strong {
        display: block;
        margin-bottom: 4px;
      }
      #mg-vabs-stub-summary {
        min-height: 420px;
      }
      .shell-status {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        margin-top: 10px;
        padding: 8px 12px;
        border-radius: 999px;
        background: rgba(18, 32, 51, 0.88);
        color: var(--muted);
      }
      .shell-status[data-state="ready"] {
        color: #b9f5c1;
      }
      .shell-status[data-state="error"] {
        color: #ffb4b4;
      }
      @media (max-width: 980px) {
        .shell-grid {
          grid-template-columns: 1fr;
        }
      }
    </style>
    <script>
      window.__MYIDE_VABS_SHELL_MOCK__ = ${serializeForInlineScript(shellSummary)};
      window.__MYIDE_VABS_BOOT__ = ${serializeForInlineScript(bootParameters)};
      window.__MYIDE_VABS_SESSION_ROWS__ = ${serializeForInlineScript(rows)};
      window.__MYIDE_VABS_SHELL_RESULT__ = {
        rendererExecuted: false,
        error: null,
        rowCount: ${rows.length},
        initialRowIndex: ${shellSummary.defaultSelectedRowIndex},
        initialRoundId: ${serializeForInlineScript(defaultRow.roundId)},
        selectedRowIndex: ${shellSummary.defaultSelectedRowIndex},
        selectedRoundId: ${serializeForInlineScript(defaultRow.roundId)},
        selectedStateName: ${serializeForInlineScript(defaultRow.stateName)},
        rowClickAttempted: false,
        rowClickApplied: false,
        selectionChanged: false,
        clickedRowIndex: null,
        clickedRowRoundId: null,
        panelUpdateSeq: 0
      };
      window.addEventListener("error", function (event) {
        window.__MYIDE_VABS_SHELL_RESULT__.error = event && event.message ? event.message : "shell mock boot error";
      });
      function createReplayRow(snapshot) {
        var currentRoundId = snapshot.roundId;
        return {
          getValue: function (key) {
            return Object.prototype.hasOwnProperty.call(snapshot.valueMap, key) ? snapshot.valueMap[key] : null;
          },
          getExtBetId: function () {
            return snapshot.extBetId || "";
          },
          getStateText: function () {
            return snapshot.stateName || "";
          },
          getStateID: function () {
            return snapshot.stateId || "";
          },
          getBet: function () {
            return Number(snapshot.bet || 0);
          },
          getPayout: function () {
            return Number(snapshot.payout || 0);
          },
          getBalance: function () {
            return Number(snapshot.balance || 0);
          },
          getRoundID: function () {
            return currentRoundId;
          },
          setRoundID: function (roundId) {
            currentRoundId = roundId;
          }
        };
      }
    </script>
    <script src="./common/vabs/${escapeHtml(shellSummary.exportedFolderToken)}/strings_en.js"></script>
    <script src="./common/vabs/${escapeHtml(shellSummary.exportedFolderToken)}/code.js"></script>
  </head>
  <body>
    <main class="shell">
      <section class="shell-banner">
        <h1>Local VABS Session Shell Mock</h1>
        <p>This page approximates the GS <code>/vabs/show.jsp</code> boot flow with a local static package, a local session-level <code>playerBets[]</code> fixture, and a row-click replay panel.</p>
        <p>It is closer to real GS support/history usage than the single-row preview, but it is still not live JSP deployment proof.</p>
        <div id="shell-status" class="shell-status" data-state="booting">Waiting for renderer boot...</div>
      </section>
      <section class="shell-grid">
        <aside>
          <article class="shell-card">
            <h2>Mock Boot Parameters</h2>
            <table class="shell-table">
              <tr><td>Package</td><td>${escapeHtml(shellSummary.staticPackagePath)}</td></tr>
              <tr><td>Folder Token</td><td>${escapeHtml(shellSummary.exportedFolderToken)}</td></tr>
              <tr><td>Requested Fixture</td><td>${escapeHtml(shellSummary.requestedFixtureSelection)}</td></tr>
              <tr><td>Actual Fixture</td><td>${escapeHtml(shellSummary.actualFixtureSelection)} / ${escapeHtml(shellSummary.actualFixtureKind)}</td></tr>
              <tr><td>Session Fixture</td><td>${escapeHtml(shellSummary.sessionFixtureKind)} / ${escapeHtml(shellSummary.sessionFixturePath)}</td></tr>
              <tr><td>Session ID</td><td>${escapeHtml(shellSummary.sessionId)}</td></tr>
              <tr><td>Rows</td><td>${escapeHtml(String(shellSummary.rowCount))}</td></tr>
              <tr><td>Default ROUND_ID</td><td>${escapeHtml(shellSummary.roundId)}</td></tr>
              <tr><td>Captured ROUND_ID</td><td>${escapeHtml(shellSummary.capturedRoundId)}</td></tr>
              <tr><td>Fixture Provenance</td><td>${escapeHtml(shellSummary.fixtureProvenance)}</td></tr>
              <tr><td>Capture Status</td><td>${escapeHtml(shellSummary.captureStatus)}</td></tr>
            </table>
          </article>
          <article class="shell-card">
            <h2>Session Rows</h2>
            <p>This list is local-only support/history scaffolding. It is not the real JSP history table.</p>
            ${renderRowTable(rows)}
            <div id="shell-selection-detail" class="shell-selection">
              <strong>Selected row</strong>
              <div>Waiting for row selection...</div>
            </div>
          </article>
          <article class="shell-card">
            <h2>What This Mock Emulates</h2>
            <ul class="shell-list">
              <li>static asset base + normalized folder token</li>
              <li>page-title + round/session boot metadata</li>
              <li>per-game <code>strings_en.js</code> and <code>code.js</code> loading</li>
              <li>a support/history-style row list that can update the replay panel on selection</li>
            </ul>
          </article>
          <article class="shell-card">
            <h2>What This Mock Does Not Claim</h2>
            <ul class="shell-list">
              <li>no real JSP rendering or servlet session lookup</li>
              <li>no live <code>GETINFO</code>/<code>GETHISTORY</code> fetch loop</li>
              <li>no finished production GS renderer</li>
              <li>no archived-row proof beyond the current fixture provenance</li>
            </ul>
          </article>
          <article class="shell-card">
            <h2>Provisional Fields</h2>
            <div class="shell-code">${escapeHtml(shellSummary.provisionalFields.join(", ") || "none")}</div>
          </article>
        </aside>
        <section>
          <article class="shell-card">
            <h2>Replay Panel</h2>
            <p>Click a row in the local table to re-run the exported <code>mysterygarden</code> stub against that row snapshot.</p>
            <div id="mg-vabs-stub-summary"></div>
          </article>
        </section>
      </section>
    </main>
    <script>
      window.addEventListener("DOMContentLoaded", function () {
        var statusNode = document.getElementById("shell-status");
        var selectionDetailNode = document.getElementById("shell-selection-detail");
        try {
          var api = window.project001VabsStub || {};
          var sessionRows = window.__MYIDE_VABS_SESSION_ROWS__ || [];
          var result = window.__MYIDE_VABS_SHELL_RESULT__;
          result.rowCount = sessionRows.length;
          document.documentElement.setAttribute("data-row-count", String(sessionRows.length));

          if (typeof api.start === "function") {
            api.start();
          }

          function updateSelectionDetail(entry) {
            if (!selectionDetailNode) {
              return;
            }
            selectionDetailNode.innerHTML =
              "<strong>Selected row</strong>" +
              "<div>Index " + entry.rowIndex + " • ROUND_ID " + entry.roundId + "</div>" +
              "<div>" + entry.stateName + " • Bet " + entry.bet + " • Win " + entry.win + " • Balance " + entry.balance + "</div>" +
              "<div>Provenance: " + entry.fixtureProvenance + "</div>";
          }

          function updateSelectedRowUi(selectedIndex) {
            var rowNodes = document.querySelectorAll(".shell-row-button");
            rowNodes.forEach(function (node) {
              var isSelected = Number(node.getAttribute("data-row-index")) === selectedIndex;
              node.setAttribute("data-selected", isSelected ? "yes" : "no");
            });
          }

          function renderRowSelection(rowIndex, reason) {
            var entry = sessionRows[rowIndex];
            if (!entry) {
              throw new Error("Session row " + rowIndex + " is unavailable in the local shell mock.");
            }
            var row = createReplayRow(entry.rowSnapshot);
            var rowEvent = typeof api.createRowEvent === "function" ? api.createRowEvent(row) : row;
            var drawResult = typeof api.draw === "function" ? api.draw(rowEvent) : null;
            var panelNode = document.getElementById("mg-vabs-stub-summary");
            result.rendererExecuted = Boolean(drawResult);
            result.selectedRowIndex = entry.rowIndex;
            result.selectedRoundId = row.getRoundID();
            result.selectedStateName = entry.stateName;
            if (reason === "click") {
              result.rowClickApplied = true;
              result.selectionChanged = entry.rowIndex !== result.initialRowIndex;
              result.clickedRowIndex = entry.rowIndex;
              result.clickedRowRoundId = row.getRoundID();
            }
            result.panelUpdateSeq += 1;
            document.documentElement.setAttribute("data-renderer-executed", result.rendererExecuted ? "yes" : "no");
            document.documentElement.setAttribute("data-selected-row-index", String(entry.rowIndex));
            document.documentElement.setAttribute("data-selected-round-id", row.getRoundID());
            document.documentElement.setAttribute("data-selected-state-name", entry.stateName);
            document.documentElement.setAttribute("data-row-click-attempted", result.rowClickAttempted ? "yes" : "no");
            document.documentElement.setAttribute("data-row-click-applied", result.rowClickApplied ? "yes" : "no");
            document.documentElement.setAttribute("data-selection-changed", result.selectionChanged ? "yes" : "no");
            document.documentElement.setAttribute("data-panel-update-seq", String(result.panelUpdateSeq));
            if (panelNode) {
              panelNode.setAttribute("data-panel-row-index", String(entry.rowIndex));
              panelNode.setAttribute("data-panel-round-id", row.getRoundID());
              panelNode.setAttribute("data-panel-state-name", entry.stateName);
              panelNode.setAttribute("data-panel-update-seq", String(result.panelUpdateSeq));
            }
            updateSelectedRowUi(entry.rowIndex);
            updateSelectionDetail(entry);
            if (statusNode) {
              statusNode.textContent = result.rendererExecuted
                ? "Renderer booted inside the local mock shell."
                : "Renderer script loaded, but no draw result was returned.";
              statusNode.setAttribute("data-state", result.rendererExecuted ? "ready" : "error");
            }
          }

          var rowNodes = document.querySelectorAll(".shell-row-button");
          rowNodes.forEach(function (node) {
            node.addEventListener("click", function () {
              renderRowSelection(Number(node.getAttribute("data-row-index")), "click");
            });
          });

          renderRowSelection(result.initialRowIndex, "initial");

          var params = new URLSearchParams(window.location.search);
          var requestedRowIndex = Number(params.get("selectRow"));
          if (Number.isInteger(requestedRowIndex) && requestedRowIndex >= 0 && requestedRowIndex < sessionRows.length && requestedRowIndex !== result.initialRowIndex) {
            result.rowClickAttempted = true;
            document.documentElement.setAttribute("data-row-click-attempted", "yes");
            var requestedNode = document.querySelector('.shell-row-button[data-row-index="' + requestedRowIndex + '"]');
            if (requestedNode && typeof requestedNode.click === "function") {
              requestedNode.click();
            } else {
              renderRowSelection(requestedRowIndex, "click");
            }
          }
        } catch (error) {
          var result = window.__MYIDE_VABS_SHELL_RESULT__;
          result.error = error && error.stack ? error.stack : String(error);
          document.documentElement.setAttribute("data-renderer-executed", "no");
          if (statusNode) {
            statusNode.textContent = "Renderer boot failed: " + result.error;
            statusNode.setAttribute("data-state", "error");
          }
        }
      });
    </script>
  </body>
</html>
`;
}

export function getShellMockRoot(projectId: string): string {
  return path.join("/tmp", `myide-vabs-${projectId}-shell-mock`);
}

export function getShellMockArtifactDirectory(projectId: string, fixtureKind: FixtureKind): string {
  return path.join(getShellMockRoot(projectId), fixtureKind);
}

export function runLocalShellMock(
  projectId: string,
  repoRoot = getRepoRoot(),
  selection: FixtureSelection = "auto"
): ShellMockResult {
  const session = buildSessionFixture(projectId, repoRoot, selection);
  const defaultSelectedRowIndex = 0;
  const exportResult = runExportPackage(projectId, repoRoot, selection, defaultSelectedRowIndex);
  const sessionRows = buildShellMockRows(projectId, repoRoot, selection);
  const firstRow = sessionRows[0];
  if (!firstRow) {
    throw new Error(`Session shell mock requires at least one row for ${projectId}.`);
  }
  const summary = firstRow.summary;
  const artifactDirectory = getShellMockArtifactDirectory(projectId, summary.actualFixtureKind);
  const packageRoot = path.join(artifactDirectory, exportResult.manifest.staticPackagePath);
  const htmlPath = path.join(artifactDirectory, "shell-mock.html");
  const jsonPath = path.join(artifactDirectory, "shell-mock.json");
  const textPath = path.join(artifactDirectory, "shell-mock.txt");
  const codePath = path.join(packageRoot, "code.js");
  const stringsPath = path.join(packageRoot, "strings_en.js");
  const manifestPath = path.join(packageRoot, "manifest.json");

  rmSync(artifactDirectory, { recursive: true, force: true });
  mkdirSync(packageRoot, { recursive: true });

  copyFileSync(exportResult.codePath, codePath);
  copyFileSync(exportResult.stringsPath, stringsPath);
  copyFileSync(exportResult.manifestPath, manifestPath);

  const shellSummary: ShellMockSummary = {
    projectId,
    exportedFolderToken: exportResult.manifest.targetFolderName,
    staticPackagePath: exportResult.manifest.staticPackagePath,
    requestedFixtureSelection: exportResult.manifest.requestedFixtureSelection,
    actualFixtureSelection: exportResult.manifest.actualFixtureSelection,
    actualFixtureKind: exportResult.manifest.actualFixtureKind,
    fixtureProvenance: exportResult.manifest.fixtureProvenance,
    captureStatus: exportResult.manifest.captureStatus,
    roundId: summary.roundId,
    capturedRoundId: exportResult.manifest.capturedRoundId,
    comparisonMode: exportResult.manifest.comparisonMode,
    provisionalFields: exportResult.manifest.provisionalFields,
    comparisonNotes: summary.comparisonNotes,
    shellPurpose: "local-vabs-show-jsp-boot-approximation-with-session-row-click-replay",
    shellLimitations: [
      "Local file-backed shell only.",
      "No live JSP or servlet boot path is exercised here.",
      "No finished production GS renderer is claimed here."
    ],
    mockHtmlPath: htmlPath,
    packageRoot,
    manifestPath,
    codePath,
    stringsPath,
    sessionId: session.sessionId,
    sessionFixturePath: session.relativeFixturePath,
    sessionFixtureKind: session.sessionFixtureKind,
    sessionFixtureProvenance: session.sessionFixtureProvenance,
    sessionCaptureStatus: session.captureStatus,
    sessionSourceNote: session.sourceNote,
    rowCount: sessionRows.length,
    defaultSelectedRowIndex
  };

  writeFileSync(htmlPath, renderShellMockHtml(shellSummary, sessionRows), "utf8");
  writeFileSync(
    jsonPath,
    `${JSON.stringify(
      {
        shellSummary,
        summary,
        sessionFixture: {
          sessionId: session.sessionId,
          fixturePath: session.relativeFixturePath,
          sessionFixtureKind: session.sessionFixtureKind,
          sessionFixtureProvenance: session.sessionFixtureProvenance,
          captureStatus: session.captureStatus,
          sourceNote: session.sourceNote
        },
        sessionRows
      },
      null,
      2
    )}\n`,
    "utf8"
  );
  writeFileSync(
    textPath,
    `Local VABS Session Shell Mock\nPackage: ${shellSummary.staticPackagePath}\nRequested Fixture: ${shellSummary.requestedFixtureSelection}\nActual Fixture: ${shellSummary.actualFixtureSelection} / ${shellSummary.actualFixtureKind}\nFixture Provenance: ${shellSummary.fixtureProvenance}\nCapture Status: ${shellSummary.captureStatus}\nSession Fixture: ${shellSummary.sessionFixturePath}\nSession Kind: ${shellSummary.sessionFixtureKind}\nSession Provenance: ${shellSummary.sessionFixtureProvenance}\nRow Count: ${shellSummary.rowCount}\nDefault Selected Row: ${shellSummary.defaultSelectedRowIndex}\nDefault ROUND_ID: ${shellSummary.roundId}\nComparison Mode: ${shellSummary.comparisonMode}\nProvisional Fields: ${shellSummary.provisionalFields.join(", ") || "none"}\nMock HTML: ${htmlPath}\nPackage Root: ${packageRoot}\n\nThis artifact approximates show.jsp boot with a local static package, a ${shellSummary.sessionFixtureKind} session-level playerBets list, and row-click replay behavior. It does not prove live JSP deployment.\n`,
    "utf8"
  );

  return {
    shellSummary,
    summary,
    sessionRows,
    artifactDirectory,
    htmlPath,
    jsonPath,
    textPath
  };
}

function main(): void {
  const repoRoot = getRepoRoot();
  const projectId = parseProjectIdArg();
  const selection = parseFixtureSelectionArg();
  const result = runLocalShellMock(projectId, repoRoot, selection);

  console.log(`Local VABS shell mock built for ${projectId}`);
  console.log(`- Package: ${result.shellSummary.staticPackagePath}`);
  console.log(`- Requested fixture: ${result.shellSummary.requestedFixtureSelection}`);
  console.log(`- Actual fixture: ${result.shellSummary.actualFixtureSelection}`);
  console.log(`- Actual fixture kind: ${result.shellSummary.actualFixtureKind}`);
  console.log(`- Fixture provenance: ${result.shellSummary.fixtureProvenance}`);
  console.log(`- Session fixture: ${result.shellSummary.sessionFixturePath}`);
  console.log(`- Session row count: ${result.shellSummary.rowCount}`);
  console.log(`- Shell HTML: ${result.htmlPath}`);
  console.log(`- Shell JSON: ${result.jsonPath}`);
  console.log(`- Shell text: ${result.textPath}`);
}

if (require.main === module) {
  main();
}
