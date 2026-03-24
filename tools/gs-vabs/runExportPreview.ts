import { mkdirSync, writeFileSync } from "fs";
import path from "path";

import { getRepoRoot } from "../publication/shared";
import { buildReplaySummary, createLocalReplayRow, FixtureSelection, parseFixtureSelectionArg, parseProjectIdArg, ReplaySummary } from "./shared";
import { getExportPreviewArtifactDirectory } from "./exportManifest";
import { ExportPackageResult, runExportPackage } from "./exportPackage";

type RendererModule = {
  start?: () => void;
  createRowEvent?: (row: unknown) => unknown;
  draw?: (row: unknown) => unknown;
  renderSummaryHtml?: (summary: ReplaySummary) => string;
  renderSummaryText?: (summary: ReplaySummary) => string;
};

export type ExportPreviewSummary = {
  projectId: string;
  exportedFolderToken: string;
  staticPackagePath: string;
  requestedFixtureSelection: string;
  actualFixtureSelection: string;
  actualFixtureKind: string;
  fixtureProvenance: string;
  captureStatus: string;
  roundId: string;
  previewUsedExportedPackage: boolean;
  rendererExecuted: boolean;
  packageRoot: string;
  manifestPath: string;
  codePath: string;
  stringsPath: string;
  summary: ReplaySummary;
};

export type ExportPreviewResult = {
  exportResult: ExportPackageResult;
  previewSummary: ExportPreviewSummary;
  artifactDirectory: string;
  jsonPath: string;
  htmlPath: string;
  textPath: string;
};

function resetPreviewGlobals(): void {
  const globalRoot = globalThis as Record<string, unknown>;
  delete globalRoot.game_strings;
  delete globalRoot.project001VabsStub;
  delete globalRoot.start;
  delete globalRoot.createRowEvent;
  delete globalRoot.draw;
}

function loadExportedRenderer(stringsPath: string, codePath: string): RendererModule {
  resetPreviewGlobals();
  const stringsResolved = require.resolve(stringsPath);
  delete require.cache[stringsResolved];
  require(stringsResolved);

  const codeResolved = require.resolve(codePath);
  delete require.cache[codeResolved];
  return require(codeResolved) as RendererModule;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;");
}

function wrapHtml(preview: ExportPreviewSummary, innerHtml: string): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(preview.projectId)} export preview</title>
    <style>
      body {
        margin: 0;
        padding: 24px;
        background: #09101a;
        color: #eef2f7;
        font: 14px/1.45 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      .preview-shell {
        max-width: 1180px;
        margin: 0 auto;
      }
      .preview-meta {
        margin: 0 0 20px;
        padding: 18px;
        border: 1px solid #214066;
        border-radius: 16px;
        background: linear-gradient(180deg, #0f2136 0%, #0b1725 100%);
      }
      .preview-meta h1 {
        margin: 0 0 8px;
        font-size: 24px;
      }
      .preview-meta p {
        margin: 6px 0;
      }
      .preview-label {
        display: inline-block;
        min-width: 190px;
        color: #8fb0d4;
      }
    </style>
  </head>
  <body>
    <div class="preview-shell">
      <section class="preview-meta">
        <h1>GS-Style Export Preview</h1>
        <p><span class="preview-label">Package</span>${escapeHtml(preview.staticPackagePath)}</p>
        <p><span class="preview-label">Requested Fixture</span>${escapeHtml(preview.requestedFixtureSelection)}</p>
        <p><span class="preview-label">Actual Fixture</span>${escapeHtml(preview.actualFixtureSelection)} / ${escapeHtml(preview.actualFixtureKind)}</p>
        <p><span class="preview-label">Fixture Provenance</span>${escapeHtml(preview.fixtureProvenance)}</p>
        <p><span class="preview-label">Capture Status</span>${escapeHtml(preview.captureStatus)}</p>
        <p><span class="preview-label">ROUND_ID</span>${escapeHtml(preview.roundId)}</p>
        <p><span class="preview-label">Renderer Executed</span>${escapeHtml(preview.rendererExecuted ? "yes" : "no")}</p>
      </section>
      ${innerHtml}
    </div>
  </body>
</html>
`;
}

export function runExportPreview(
  projectId: string,
  repoRoot = getRepoRoot(),
  selection: FixtureSelection = "auto"
): ExportPreviewResult {
  const exportResult = runExportPackage(projectId, repoRoot, selection);
  const renderer = loadExportedRenderer(exportResult.stringsPath, exportResult.codePath);
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
  const rendererExecuted = Boolean(drawResult);

  const previewSummary: ExportPreviewSummary = {
    projectId,
    exportedFolderToken: exportResult.manifest.targetFolderName,
    staticPackagePath: exportResult.manifest.staticPackagePath,
    requestedFixtureSelection: exportResult.manifest.requestedFixtureSelection,
    actualFixtureSelection: exportResult.manifest.actualFixtureSelection,
    actualFixtureKind: exportResult.manifest.actualFixtureKind,
    fixtureProvenance: exportResult.manifest.fixtureProvenance,
    captureStatus: exportResult.manifest.captureStatus,
    roundId: exportResult.manifest.roundId,
    previewUsedExportedPackage: true,
    rendererExecuted,
    packageRoot: exportResult.packageRoot,
    manifestPath: exportResult.manifestPath,
    codePath: exportResult.codePath,
    stringsPath: exportResult.stringsPath,
    summary
  };

  const innerHtml =
    typeof renderer.renderSummaryHtml === "function"
      ? renderer.renderSummaryHtml(summary)
      : `<pre>${escapeHtml(JSON.stringify(summary, null, 2))}</pre>`;
  const text =
    typeof renderer.renderSummaryText === "function"
      ? renderer.renderSummaryText(summary)
      : JSON.stringify(summary, null, 2);

  const artifactDirectory = getExportPreviewArtifactDirectory(projectId, summary.actualFixtureKind);
  const jsonPath = path.join(artifactDirectory, "preview-summary.json");
  const htmlPath = path.join(artifactDirectory, "preview-summary.html");
  const textPath = path.join(artifactDirectory, "preview-summary.txt");

  mkdirSync(artifactDirectory, { recursive: true });
  writeFileSync(jsonPath, `${JSON.stringify(previewSummary, null, 2)}\n`, "utf8");
  writeFileSync(textPath, `GS-Style Export Preview\nPackage: ${previewSummary.staticPackagePath}\nRequested Fixture: ${previewSummary.requestedFixtureSelection}\nActual Fixture: ${previewSummary.actualFixtureSelection} / ${previewSummary.actualFixtureKind}\nFixture Provenance: ${previewSummary.fixtureProvenance}\nCapture Status: ${previewSummary.captureStatus}\nROUND_ID: ${previewSummary.roundId}\nRenderer Executed: ${previewSummary.rendererExecuted ? "yes" : "no"}\nManifest: ${previewSummary.manifestPath}\n\n${text}\n`, "utf8");
  writeFileSync(htmlPath, wrapHtml(previewSummary, innerHtml), "utf8");

  return {
    exportResult,
    previewSummary,
    artifactDirectory,
    jsonPath,
    htmlPath,
    textPath
  };
}

function main(): void {
  const repoRoot = getRepoRoot();
  const projectId = parseProjectIdArg();
  const selection = parseFixtureSelectionArg();
  const result = runExportPreview(projectId, repoRoot, selection);

  console.log(`Local GS-style export preview passed for ${projectId}`);
  console.log(`- Export root: ${result.exportResult.exportRoot}`);
  console.log(`- Exported folder token: ${result.previewSummary.exportedFolderToken}`);
  console.log(`- Static package path: ${result.previewSummary.staticPackagePath}`);
  console.log(`- Requested fixture: ${result.previewSummary.requestedFixtureSelection}`);
  console.log(`- Actual fixture: ${result.previewSummary.actualFixtureSelection}`);
  console.log(`- Actual fixture kind: ${result.previewSummary.actualFixtureKind}`);
  console.log(`- Fixture provenance: ${result.previewSummary.fixtureProvenance}`);
  console.log(`- Renderer executed: ${result.previewSummary.rendererExecuted ? "yes" : "no"}`);
  console.log(`- Preview JSON: ${result.jsonPath}`);
  console.log(`- Preview HTML: ${result.htmlPath}`);
  console.log(`- Preview text: ${result.textPath}`);
}

if (require.main === module) {
  main();
}
