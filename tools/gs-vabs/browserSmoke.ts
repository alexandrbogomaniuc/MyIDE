import { existsSync, mkdirSync, writeFileSync } from "fs";
import path from "path";
import { pathToFileURL } from "url";
import { spawnSync } from "child_process";

import { getRepoRoot } from "../publication/shared";
import { FixtureSelection, parseFixtureSelectionArg, parseProjectIdArg } from "./shared";
import { runLocalShellMock } from "./runLocalShellMock";

const BROWSER_CANDIDATES = [
  process.env.CHROME_BIN,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"
].filter((value): value is string => Boolean(value));

export type BrowserSmokeResult = {
  projectId: string;
  requestedFixtureSelection: string;
  actualFixtureSelection: string;
  actualFixtureKind: string;
  fixtureProvenance: string;
  captureStatus: string;
  shellHtmlPath: string;
  packageRoot: string;
  browserBinary: string;
  rendererExecuted: boolean;
  stubPanelPresent: boolean;
  summaryTitlePresent: boolean;
  rowCount: number;
  selectedRowIndex: number | null;
  selectedRoundId: string | null;
  selectedStateName: string | null;
  rowClickAttempted: boolean;
  rowClickApplied: boolean;
  selectionChanged: boolean;
  panelRoundId: string | null;
  panelStateName: string | null;
  panelUpdateSeq: number | null;
  expectedClickedRowIndex: number;
  expectedClickedRoundId: string;
  expectedClickedStateName: string;
  clickedRoundIdPresent: boolean;
  clickedStatePresent: boolean;
  smokePassed: boolean;
  error: string | null;
  textSample: string;
  domPath: string;
};

type BrowserSmokeArtifacts = {
  mockResult: ReturnType<typeof runLocalShellMock>;
  result: BrowserSmokeResult;
  jsonPath: string;
  textPath: string;
};

function resolveBrowserBinary(): string {
  const browserBinary = BROWSER_CANDIDATES.find((candidate) => existsSync(candidate));
  if (!browserBinary) {
    throw new Error("No supported local Chrome/Chromium browser binary was found for GS VABS browser smoke.");
  }
  return browserBinary;
}

function runHeadlessDomDump(browserBinary: string, htmlPath: string, selectedRowIndex: number): { dom: string; stderr: string } {
  const fileUrl = new URL(pathToFileURL(htmlPath).toString());
  fileUrl.searchParams.set("selectRow", String(selectedRowIndex));
  const result = spawnSync(
    browserBinary,
    [
      "--headless=new",
      "--disable-gpu",
      "--allow-file-access-from-files",
      "--virtual-time-budget=3000",
      "--dump-dom",
      fileUrl.toString()
    ],
    {
      encoding: "utf8"
    }
  );

  if (result.status !== 0) {
    const stderr = (result.stderr ?? "").trim();
    const stdout = (result.stdout ?? "").trim();
    throw new Error(
      `Headless browser smoke failed for ${htmlPath}\n${stdout ? `${stdout}\n` : ""}${stderr || "browser exited non-zero"}`
    );
  }

  return {
    dom: result.stdout ?? "",
    stderr: result.stderr ?? ""
  };
}

function parseDataAttribute(dom: string, attribute: string): string | null {
  const match = dom.match(new RegExp(`${attribute}="([^"]*)"`, "i"));
  return match ? match[1] : null;
}

export function runBrowserSmoke(
  projectId: string,
  repoRoot = getRepoRoot(),
  selection: FixtureSelection = "auto"
): BrowserSmokeArtifacts {
  const mockResult = runLocalShellMock(projectId, repoRoot, selection);
  const browserBinary = resolveBrowserBinary();
  const expectedClickedRowIndex = mockResult.sessionRows.length > 1 ? 1 : 0;
  const expectedClickedRow = mockResult.sessionRows[expectedClickedRowIndex] ?? mockResult.sessionRows[0];
  if (!expectedClickedRow) {
    throw new Error(`Browser smoke requires at least one session row for ${projectId}.`);
  }
  const { dom, stderr } = runHeadlessDomDump(browserBinary, mockResult.htmlPath, expectedClickedRowIndex);
  const domPath = path.join(mockResult.artifactDirectory, "browser-smoke.dom.html");
  const jsonPath = path.join(mockResult.artifactDirectory, "browser-smoke.json");
  const textPath = path.join(mockResult.artifactDirectory, "browser-smoke.txt");
  const rendererExecuted = dom.includes('data-renderer-executed="yes"');
  const stubPanelPresent = dom.includes("mg-vabs-stub-panel");
  const summaryTitlePresent = dom.includes("Mystery Garden Replay Summary (Stub)");
  const rowCount = Number(parseDataAttribute(dom, "data-row-count") ?? "0");
  const selectedRowIndexText = parseDataAttribute(dom, "data-selected-row-index");
  const selectedRoundId = parseDataAttribute(dom, "data-selected-round-id");
  const selectedStateName = parseDataAttribute(dom, "data-selected-state-name");
  const rowClickAttempted = parseDataAttribute(dom, "data-row-click-attempted") === "yes";
  const rowClickApplied = parseDataAttribute(dom, "data-row-click-applied") === "yes";
  const selectionChanged = parseDataAttribute(dom, "data-selection-changed") === "yes";
  const panelRoundId = parseDataAttribute(dom, "data-panel-round-id");
  const panelStateName = parseDataAttribute(dom, "data-panel-state-name");
  const panelUpdateSeqText = parseDataAttribute(dom, "data-panel-update-seq");
  const selectedRowIndex =
    selectedRowIndexText !== null && selectedRowIndexText.length > 0 ? Number(selectedRowIndexText) : null;
  const panelUpdateSeq =
    panelUpdateSeqText !== null && panelUpdateSeqText.length > 0 ? Number(panelUpdateSeqText) : null;
  const clickedRoundIdPresent = dom.includes(expectedClickedRow.roundId);
  const clickedStatePresent = dom.includes(expectedClickedRow.stateName);
  const errorMatch = dom.match(/Renderer boot failed:([^<]+)/);
  const smokePassed =
    rendererExecuted &&
    stubPanelPresent &&
    summaryTitlePresent &&
    rowCount >= 2 &&
    selectedRowIndex === expectedClickedRowIndex &&
    selectedRoundId === expectedClickedRow.roundId &&
    selectedStateName === expectedClickedRow.stateName &&
    rowClickAttempted &&
    rowClickApplied &&
    selectionChanged &&
    panelRoundId === expectedClickedRow.roundId &&
    panelStateName === expectedClickedRow.stateName &&
    panelUpdateSeq !== null &&
    panelUpdateSeq >= 2 &&
    clickedRoundIdPresent &&
    clickedStatePresent;
  const result: BrowserSmokeResult = {
    projectId,
    requestedFixtureSelection: mockResult.shellSummary.requestedFixtureSelection,
    actualFixtureSelection: mockResult.shellSummary.actualFixtureSelection,
    actualFixtureKind: mockResult.shellSummary.actualFixtureKind,
    fixtureProvenance: mockResult.shellSummary.fixtureProvenance,
    captureStatus: mockResult.shellSummary.captureStatus,
    shellHtmlPath: mockResult.htmlPath,
    packageRoot: mockResult.shellSummary.packageRoot,
    browserBinary,
    rendererExecuted,
    stubPanelPresent,
    summaryTitlePresent,
    rowCount,
    selectedRowIndex,
    selectedRoundId,
    selectedStateName,
    rowClickAttempted,
    rowClickApplied,
    selectionChanged,
    panelRoundId,
    panelStateName,
    panelUpdateSeq,
    expectedClickedRowIndex,
    expectedClickedRoundId: expectedClickedRow.roundId,
    expectedClickedStateName: expectedClickedRow.stateName,
    clickedRoundIdPresent,
    clickedStatePresent,
    smokePassed,
    error: smokePassed ? null : errorMatch ? errorMatch[1].trim() : stderr.trim() || null,
    textSample: dom.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 1400),
    domPath
  };

  mkdirSync(mockResult.artifactDirectory, { recursive: true });
  writeFileSync(domPath, dom, "utf8");
  writeFileSync(jsonPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  writeFileSync(
    textPath,
    `Local VABS Browser Smoke\nBrowser: ${result.browserBinary}\nRequested Fixture: ${result.requestedFixtureSelection}\nActual Fixture: ${result.actualFixtureSelection} / ${result.actualFixtureKind}\nFixture Provenance: ${result.fixtureProvenance}\nCapture Status: ${result.captureStatus}\nRow Count: ${result.rowCount}\nExpected Clicked Row: ${result.expectedClickedRowIndex}\nExpected Clicked ROUND_ID: ${result.expectedClickedRoundId}\nExpected Clicked State: ${result.expectedClickedStateName}\nSelected Row Index: ${result.selectedRowIndex ?? "-"}\nSelected ROUND_ID: ${result.selectedRoundId ?? "-"}\nSelected State: ${result.selectedStateName ?? "-"}\nPanel ROUND_ID: ${result.panelRoundId ?? "-"}\nPanel State: ${result.panelStateName ?? "-"}\nPanel Update Seq: ${result.panelUpdateSeq ?? "-"}\nRenderer Executed: ${result.rendererExecuted ? "yes" : "no"}\nStub Panel Present: ${result.stubPanelPresent ? "yes" : "no"}\nSummary Title Present: ${result.summaryTitlePresent ? "yes" : "no"}\nRow Click Attempted: ${result.rowClickAttempted ? "yes" : "no"}\nRow Click Applied: ${result.rowClickApplied ? "yes" : "no"}\nSelection Changed: ${result.selectionChanged ? "yes" : "no"}\nClicked Round Present: ${result.clickedRoundIdPresent ? "yes" : "no"}\nClicked State Present: ${result.clickedStatePresent ? "yes" : "no"}\nSmoke Passed: ${result.smokePassed ? "yes" : "no"}\nError: ${result.error ?? "-"}\nShell HTML: ${result.shellHtmlPath}\nRendered DOM: ${result.domPath}\nPackage Root: ${result.packageRoot}\n`,
    "utf8"
  );

  return {
    mockResult,
    result,
    jsonPath,
    textPath
  };
}

function main(): void {
  const repoRoot = getRepoRoot();
  const projectId = parseProjectIdArg();
  const selection = parseFixtureSelectionArg();
  const smoke = runBrowserSmoke(projectId, repoRoot, selection);

  if (!smoke.result.smokePassed) {
    console.error(`Local VABS browser smoke failed for ${projectId}`);
    console.error(`- Error: ${smoke.result.error ?? "expected session-row markers were missing"}`);
    console.error(`- Rendered DOM: ${smoke.result.domPath}`);
    console.error(`- Smoke JSON: ${smoke.jsonPath}`);
    process.exit(1);
  }

  console.log(`Local VABS browser smoke passed for ${projectId}`);
  console.log(`- Browser: ${smoke.result.browserBinary}`);
  console.log(`- Requested fixture: ${smoke.result.requestedFixtureSelection}`);
  console.log(`- Actual fixture: ${smoke.result.actualFixtureSelection}`);
  console.log(`- Actual fixture kind: ${smoke.result.actualFixtureKind}`);
  console.log(`- Fixture provenance: ${smoke.result.fixtureProvenance}`);
  console.log(`- Row count: ${smoke.result.rowCount}`);
  console.log(`- Selected row index: ${smoke.result.selectedRowIndex}`);
  console.log(`- Selected ROUND_ID: ${smoke.result.selectedRoundId}`);
  console.log(`- Selected state: ${smoke.result.selectedStateName}`);
  console.log(`- Row click attempted: ${smoke.result.rowClickAttempted ? "yes" : "no"}`);
  console.log(`- Row click applied: ${smoke.result.rowClickApplied ? "yes" : "no"}`);
  console.log(`- Selection changed: ${smoke.result.selectionChanged ? "yes" : "no"}`);
  console.log(`- Rendered DOM: ${smoke.result.domPath}`);
  console.log(`- Smoke JSON: ${smoke.jsonPath}`);
  console.log(`- Smoke text: ${smoke.textPath}`);
}

if (require.main === module) {
  main();
}
