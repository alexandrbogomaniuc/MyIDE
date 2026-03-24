import { mkdirSync, writeFileSync } from "fs";
import path from "path";

import { getRepoRoot } from "../publication/shared";
import {
  buildReplaySummary,
  createLocalReplayRow,
  FixtureSelection,
  getProjectConfig,
  getRendererEntryPath,
  parseFixtureSelectionArg,
  parseProjectIdArg,
  ReplaySummary
} from "./shared";

type RendererModule = {
  start?: () => void;
  createRowEvent?: (row: unknown) => unknown;
  draw?: (row: unknown) => unknown;
  renderSummaryHtml?: (summary: ReplaySummary) => string;
  renderSummaryText?: (summary: ReplaySummary) => string;
};

export type ReplayHarnessResult = {
  summary: ReplaySummary;
  artifactDirectory: string;
  jsonPath: string;
  htmlPath: string;
  textPath: string;
  rendererPath: string;
};

function loadRenderer(rendererPath: string): RendererModule {
  const resolved = require.resolve(rendererPath);
  delete require.cache[resolved];
  return require(resolved) as RendererModule;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;");
}

function wrapHtml(summary: ReplaySummary, innerHtml: string): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(summary.projectId)} replay summary</title>
    <style>
      body {
        margin: 0;
        padding: 24px;
        background: #10131a;
        color: #eef2f7;
        font: 14px/1.45 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      .mg-vabs-stub-panel {
        max-width: 1120px;
        margin: 0 auto;
        padding: 20px;
        border: 1px solid #2b3648;
        border-radius: 18px;
        background: linear-gradient(180deg, #182030 0%, #101620 100%);
        box-shadow: 0 18px 40px rgba(0, 0, 0, 0.35);
      }
      .mg-vabs-stub-header h1 {
        margin: 0 0 6px;
        font-size: 24px;
      }
      .mg-vabs-stub-subtitle {
        margin: 0 0 18px;
        color: #9bb0c9;
      }
      pre {
        margin: 0;
        white-space: pre-wrap;
      }
    </style>
  </head>
  <body>
    ${innerHtml}
  </body>
</html>
`;
}

export function runLocalReplayHarness(
  projectId: string,
  repoRoot = getRepoRoot(),
  selection: FixtureSelection = "auto"
): ReplayHarnessResult {
  const config = getProjectConfig(projectId);
  const rendererPath = getRendererEntryPath(projectId, repoRoot);
  const renderer = loadRenderer(rendererPath);
  const row = createLocalReplayRow(projectId, repoRoot, selection);

  if (typeof renderer.start === "function") {
    renderer.start();
  }

  const rowEvent = typeof renderer.createRowEvent === "function" ? renderer.createRowEvent(row) : row;
  const drawResult = typeof renderer.draw === "function" ? renderer.draw(rowEvent) : null;
  const summary = {
    ...buildReplaySummary(projectId, repoRoot, selection),
    ...(drawResult && typeof drawResult === "object" && !Array.isArray(drawResult) ? drawResult : {})
  } as ReplaySummary;

  if (!summary.roundId) {
    throw new Error(`Replay harness did not resolve ROUND_ID for ${projectId}`);
  }

  const innerHtml =
    typeof renderer.renderSummaryHtml === "function"
      ? renderer.renderSummaryHtml(summary)
      : `<div class="mg-vabs-stub-panel"><pre>${escapeHtml(JSON.stringify(summary, null, 2))}</pre></div>`;
  const text =
    typeof renderer.renderSummaryText === "function"
      ? renderer.renderSummaryText(summary)
      : JSON.stringify(summary, null, 2);

  const artifactDirectory = path.join("/tmp", `myide-vabs-${projectId}-replay`, summary.actualFixtureKind);
  const jsonPath = path.join(artifactDirectory, "replay-summary.json");
  const htmlPath = path.join(artifactDirectory, "replay-summary.html");
  const textPath = path.join(artifactDirectory, "replay-summary.txt");

  mkdirSync(artifactDirectory, { recursive: true });
  writeFileSync(jsonPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  writeFileSync(textPath, `${text}\n`, "utf8");
  writeFileSync(htmlPath, wrapHtml(summary, innerHtml), "utf8");

  return {
    summary,
    artifactDirectory,
    jsonPath,
    htmlPath,
    textPath,
    rendererPath: path.relative(repoRoot, rendererPath)
  };
}

function main(): void {
  const repoRoot = getRepoRoot();
  const projectId = parseProjectIdArg();
  const selection = parseFixtureSelectionArg();
  const result = runLocalReplayHarness(projectId, repoRoot, selection);

  console.log(`Local VABS replay harness passed for ${projectId}`);
  console.log(`- Requested fixture: ${result.summary.requestedFixtureSelection}`);
  console.log(`- Actual fixture: ${result.summary.actualFixtureSelection}`);
  console.log(`- Actual fixture kind: ${result.summary.actualFixtureKind}`);
  console.log(`- Fixture path: ${result.summary.fixturePath}`);
  console.log(`- Comparison mode: ${result.summary.comparisonMode}`);
  console.log(`- Comparison path: ${result.summary.comparisonPath}`);
  console.log(`- Confirmed-from-captured fields: ${result.summary.confirmedFromCaptured.join(", ") || "none"}`);
  console.log(`- Provisional fields: ${result.summary.provisionalFields.join(", ") || "none"}`);
  if (result.summary.differingFields.length > 0) {
    console.log(
      `- Differing fields: ${result.summary.differingFields.map((difference) => difference.field).join(", ")}`
    );
  }
  console.log(`- ROUND_ID: ${result.summary.roundId}`);
  console.log(`- Captured ROUND_ID: ${result.summary.capturedRoundId}`);
  console.log(`- State: ${result.summary.stateName} (${result.summary.stateId})`);
  console.log(`- Renderer: ${result.rendererPath}`);
  console.log(`- JSON summary: ${result.jsonPath}`);
  console.log(`- HTML preview: ${result.htmlPath}`);
  console.log(`- Text summary: ${result.textPath}`);
  if (!result.summary.capturedFixtureAvailable) {
    console.log(`- Captured-row notes: ${result.summary.capturedNotesPath}`);
  }
}

main();
