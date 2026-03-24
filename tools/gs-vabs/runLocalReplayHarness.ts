import { mkdirSync, writeFileSync } from "fs";
import path from "path";

import { getRepoRoot } from "../publication/shared";
import {
  buildReplaySummary,
  createLocalReplayRow,
  getProjectConfig,
  getRendererEntryPath,
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
      .mg-vabs-stub-grid {
        display: grid;
        gap: 12px;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      }
      .mg-vabs-stub-card {
        padding: 14px;
        border-radius: 14px;
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.08);
      }
      .mg-vabs-stub-card h2 {
        margin: 0 0 8px;
        font-size: 15px;
      }
      .mg-vabs-stub-label {
        display: inline-block;
        min-width: 110px;
        color: #9bb0c9;
      }
      .mg-vabs-stub-sequence {
        margin-top: 18px;
        padding: 12px 14px;
        border-radius: 12px;
        background: rgba(88, 145, 255, 0.12);
        color: #d9e7ff;
      }
      .mg-vabs-stub-board {
        margin-top: 18px;
      }
      .mg-vabs-stub-board table {
        border-collapse: collapse;
        margin-top: 8px;
      }
      .mg-vabs-stub-board td {
        min-width: 52px;
        padding: 8px 10px;
        text-align: center;
        border: 1px solid rgba(255, 255, 255, 0.12);
        background: rgba(255, 255, 255, 0.03);
      }
      .mg-vabs-stub-list {
        margin: 8px 0 0;
        padding-left: 18px;
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

export function runLocalReplayHarness(projectId: string, repoRoot = getRepoRoot()): ReplayHarnessResult {
  const config = getProjectConfig(projectId);
  const rendererPath = getRendererEntryPath(projectId, repoRoot);
  const renderer = loadRenderer(rendererPath);
  const row = createLocalReplayRow(projectId, repoRoot);

  if (typeof renderer.start === "function") {
    renderer.start();
  }

  const rowEvent = typeof renderer.createRowEvent === "function" ? renderer.createRowEvent(row) : row;
  const drawResult = typeof renderer.draw === "function" ? renderer.draw(rowEvent) : null;
  const summary = {
    ...buildReplaySummary(projectId, repoRoot),
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

  const artifactDirectory = path.join("/tmp", `myide-vabs-${projectId}-replay`);
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
  const result = runLocalReplayHarness(projectId, repoRoot);

  console.log(`Local VABS replay harness passed for ${projectId}`);
  console.log(`- ROUND_ID: ${result.summary.roundId}`);
  console.log(`- State: ${result.summary.stateName} (${result.summary.stateId})`);
  console.log(`- Renderer: ${result.rendererPath}`);
  console.log(`- JSON summary: ${result.jsonPath}`);
  console.log(`- HTML preview: ${result.htmlPath}`);
  console.log(`- Text summary: ${result.textPath}`);
}

main();
