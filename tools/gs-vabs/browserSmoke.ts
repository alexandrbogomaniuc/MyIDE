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
  roundId: string;
  shellHtmlPath: string;
  packageRoot: string;
  browserBinary: string;
  rendererExecuted: boolean;
  stubPanelPresent: boolean;
  summaryTitlePresent: boolean;
  roundIdPresent: boolean;
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

function runHeadlessDomDump(browserBinary: string, htmlPath: string): { dom: string; stderr: string } {
  const fileUrl = pathToFileURL(htmlPath).toString();
  const result = spawnSync(
    browserBinary,
    [
      "--headless=new",
      "--disable-gpu",
      "--allow-file-access-from-files",
      "--virtual-time-budget=3000",
      "--dump-dom",
      fileUrl
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

export function runBrowserSmoke(
  projectId: string,
  repoRoot = getRepoRoot(),
  selection: FixtureSelection = "auto"
): BrowserSmokeArtifacts {
  const mockResult = runLocalShellMock(projectId, repoRoot, selection);
  const browserBinary = resolveBrowserBinary();
  const { dom, stderr } = runHeadlessDomDump(browserBinary, mockResult.htmlPath);
  const domPath = path.join(mockResult.artifactDirectory, "browser-smoke.dom.html");
  const jsonPath = path.join(mockResult.artifactDirectory, "browser-smoke.json");
  const textPath = path.join(mockResult.artifactDirectory, "browser-smoke.txt");
  const rendererExecuted = dom.includes('data-renderer-executed="yes"');
  const stubPanelPresent = dom.includes("mg-vabs-stub-panel");
  const summaryTitlePresent = dom.includes("Mystery Garden Replay Summary (Stub)");
  const roundIdPresent = dom.includes(mockResult.shellSummary.roundId);
  const errorMatch = dom.match(/Renderer boot failed:([^<]+)/);
  const smokePassed = rendererExecuted && stubPanelPresent && summaryTitlePresent && roundIdPresent;
  const result: BrowserSmokeResult = {
    projectId,
    requestedFixtureSelection: mockResult.shellSummary.requestedFixtureSelection,
    actualFixtureSelection: mockResult.shellSummary.actualFixtureSelection,
    actualFixtureKind: mockResult.shellSummary.actualFixtureKind,
    fixtureProvenance: mockResult.shellSummary.fixtureProvenance,
    captureStatus: mockResult.shellSummary.captureStatus,
    roundId: mockResult.shellSummary.roundId,
    shellHtmlPath: mockResult.htmlPath,
    packageRoot: mockResult.shellSummary.packageRoot,
    browserBinary,
    rendererExecuted,
    stubPanelPresent,
    summaryTitlePresent,
    roundIdPresent,
    smokePassed,
    error: smokePassed ? null : errorMatch ? errorMatch[1].trim() : stderr.trim() || null,
    textSample: dom.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 1200),
    domPath
  };

  mkdirSync(mockResult.artifactDirectory, { recursive: true });
  writeFileSync(domPath, dom, "utf8");
  writeFileSync(jsonPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  writeFileSync(
    textPath,
    `Local VABS Browser Smoke\nBrowser: ${result.browserBinary}\nRequested Fixture: ${result.requestedFixtureSelection}\nActual Fixture: ${result.actualFixtureSelection} / ${result.actualFixtureKind}\nFixture Provenance: ${result.fixtureProvenance}\nCapture Status: ${result.captureStatus}\nROUND_ID: ${result.roundId}\nRenderer Executed: ${result.rendererExecuted ? "yes" : "no"}\nStub Panel Present: ${result.stubPanelPresent ? "yes" : "no"}\nSummary Title Present: ${result.summaryTitlePresent ? "yes" : "no"}\nRound ID Present: ${result.roundIdPresent ? "yes" : "no"}\nSmoke Passed: ${result.smokePassed ? "yes" : "no"}\nError: ${result.error ?? "-"}\nShell HTML: ${result.shellHtmlPath}\nRendered DOM: ${result.domPath}\nPackage Root: ${result.packageRoot}\n`,
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
    console.error(`- Error: ${smoke.result.error ?? "expected summary markers were missing"}`);
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
  console.log(`- Renderer executed: ${smoke.result.rendererExecuted ? "yes" : "no"}`);
  console.log(`- Stub panel present: ${smoke.result.stubPanelPresent ? "yes" : "no"}`);
  console.log(`- Round ID present: ${smoke.result.roundIdPresent ? "yes" : "no"}`);
  console.log(`- Rendered DOM: ${smoke.result.domPath}`);
  console.log(`- Smoke JSON: ${smoke.jsonPath}`);
  console.log(`- Smoke text: ${smoke.textPath}`);

}

if (require.main === module) {
  main();
}
