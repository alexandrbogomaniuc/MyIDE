import { copyFileSync, mkdirSync, rmSync, writeFileSync } from "fs";
import path from "path";

import { getRepoRoot } from "../publication/shared";
import {
  buildReplaySummary,
  buildSerializableReplayRow,
  FixtureSelection,
  FixtureKind,
  parseFixtureSelectionArg,
  parseProjectIdArg,
  ReplaySummary,
  SerializableReplayRow
} from "./shared";
import { runExportPackage } from "./exportPackage";

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
};

export type ShellMockResult = {
  shellSummary: ShellMockSummary;
  summary: ReplaySummary;
  rowSnapshot: SerializableReplayRow;
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

export function getShellMockRoot(projectId: string): string {
  return path.join("/tmp", `myide-vabs-${projectId}-shell-mock`);
}

export function getShellMockArtifactDirectory(projectId: string, fixtureKind: FixtureKind): string {
  return path.join(getShellMockRoot(projectId), fixtureKind);
}

function renderShellMockHtml(shellSummary: ShellMockSummary, summary: ReplaySummary, rowSnapshot: SerializableReplayRow): string {
  const bootParameters = {
    scheme: "file",
    backendHost: "local-shell-mock",
    staticAssetBase: "./common/vabs",
    folderToken: shellSummary.exportedFolderToken,
    title: `${summary.targetFolderName} local VABS shell mock`,
    gameName: "Mystery Garden",
    sessionId: "local-shell-mock-session",
    roundId: summary.roundId,
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
        max-width: 1400px;
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
        grid-template-columns: minmax(320px, 390px) minmax(0, 1fr);
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
      window.__MYIDE_VABS_ROW_SNAPSHOT__ = ${serializeForInlineScript(rowSnapshot)};
      window.__MYIDE_VABS_SHELL_RESULT__ = {
        rendererExecuted: false,
        error: null,
        roundId: ${serializeForInlineScript(summary.roundId)}
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
        <h1>Local VABS Page-Shell Mock</h1>
        <p>This page approximates the GS <code>/vabs/show.jsp</code> boot flow with a local static package and a local row fixture.</p>
        <p>It is closer to real GS usage than the raw preview harness, but it is still not live JSP deployment proof.</p>
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
              <tr><td>ROUND_ID</td><td>${escapeHtml(shellSummary.roundId)}</td></tr>
              <tr><td>Captured ROUND_ID</td><td>${escapeHtml(shellSummary.capturedRoundId)}</td></tr>
              <tr><td>Fixture Provenance</td><td>${escapeHtml(shellSummary.fixtureProvenance)}</td></tr>
              <tr><td>Capture Status</td><td>${escapeHtml(shellSummary.captureStatus)}</td></tr>
            </table>
          </article>
          <article class="shell-card">
            <h2>What This Mock Emulates</h2>
            <ul class="shell-list">
              <li>static asset base + normalized folder token</li>
              <li>page-title + round/session boot metadata</li>
              <li>per-game <code>strings_en.js</code> and <code>code.js</code> loading</li>
              <li>renderer boot through <code>start()</code>, <code>createRowEvent()</code>, and <code>draw()</code></li>
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
            <h2>Renderer Mount</h2>
            <p>The exported <code>mysterygarden</code> stub renders below inside a browser-facing local shell.</p>
            <div id="mg-vabs-stub-summary"></div>
          </article>
        </section>
      </section>
    </main>
    <script>
      window.addEventListener("DOMContentLoaded", function () {
        var statusNode = document.getElementById("shell-status");
        try {
          var api = window.project001VabsStub || {};
          if (typeof api.start === "function") {
            api.start();
          }
          var row = createReplayRow(window.__MYIDE_VABS_ROW_SNAPSHOT__);
          var rowEvent = typeof api.createRowEvent === "function" ? api.createRowEvent(row) : row;
          var drawResult = typeof api.draw === "function" ? api.draw(rowEvent) : null;
          var result = window.__MYIDE_VABS_SHELL_RESULT__;
          result.rendererExecuted = Boolean(drawResult);
          result.roundId = row.getRoundID();
          result.stubPanelPresent = Boolean(document.querySelector(".mg-vabs-stub-panel"));
          result.summaryTitlePresent = document.body.innerText.indexOf("Mystery Garden Replay Summary (Stub)") !== -1;
          document.documentElement.setAttribute("data-renderer-executed", result.rendererExecuted ? "yes" : "no");
          document.documentElement.setAttribute("data-actual-fixture-kind", window.__MYIDE_VABS_SHELL_MOCK__.actualFixtureKind);
          if (statusNode) {
            statusNode.textContent = result.rendererExecuted ? "Renderer booted inside the local mock shell." : "Renderer script loaded, but no draw result was returned.";
            statusNode.setAttribute("data-state", result.rendererExecuted ? "ready" : "error");
          }
        } catch (error) {
          var result = window.__MYIDE_VABS_SHELL_RESULT__;
          result.error = error && error.stack ? error.stack : String(error);
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

export function runLocalShellMock(
  projectId: string,
  repoRoot = getRepoRoot(),
  selection: FixtureSelection = "auto"
): ShellMockResult {
  const exportResult = runExportPackage(projectId, repoRoot, selection);
  const summary = buildReplaySummary(projectId, repoRoot, selection);
  const { rowSnapshot } = buildSerializableReplayRow(projectId, repoRoot, selection);
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
    roundId: exportResult.manifest.roundId,
    capturedRoundId: exportResult.manifest.capturedRoundId,
    comparisonMode: exportResult.manifest.comparisonMode,
    provisionalFields: exportResult.manifest.provisionalFields,
    comparisonNotes: summary.comparisonNotes,
    shellPurpose: "local-vabs-show-jsp-boot-approximation",
    shellLimitations: [
      "Local file-backed shell only.",
      "No live JSP or servlet boot path is exercised here.",
      "No finished production GS renderer is claimed here."
    ],
    mockHtmlPath: htmlPath,
    packageRoot,
    manifestPath,
    codePath,
    stringsPath
  };

  writeFileSync(htmlPath, renderShellMockHtml(shellSummary, summary, rowSnapshot), "utf8");
  writeFileSync(jsonPath, `${JSON.stringify({ shellSummary, summary, rowSnapshot }, null, 2)}\n`, "utf8");
  writeFileSync(
    textPath,
    `Local VABS Page-Shell Mock\nPackage: ${shellSummary.staticPackagePath}\nRequested Fixture: ${shellSummary.requestedFixtureSelection}\nActual Fixture: ${shellSummary.actualFixtureSelection} / ${shellSummary.actualFixtureKind}\nFixture Provenance: ${shellSummary.fixtureProvenance}\nCapture Status: ${shellSummary.captureStatus}\nROUND_ID: ${shellSummary.roundId}\nComparison Mode: ${shellSummary.comparisonMode}\nProvisional Fields: ${shellSummary.provisionalFields.join(", ") || "none"}\nMock HTML: ${htmlPath}\nPackage Root: ${packageRoot}\n\nThis artifact approximates show.jsp boot with a local static package and a local fixture. It does not prove live JSP deployment.\n`,
    "utf8"
  );

  return {
    shellSummary,
    summary,
    rowSnapshot,
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
  console.log(`- Shell HTML: ${result.htmlPath}`);
  console.log(`- Shell JSON: ${result.jsonPath}`);
  console.log(`- Shell text: ${result.textPath}`);
}

if (require.main === module) {
  main();
}
