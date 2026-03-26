import { copyFileSync, mkdirSync, rmSync, writeFileSync } from "fs";
import path from "path";

import { getRepoRoot } from "../publication/shared";
import {
  buildReplaySummary,
  buildSessionFixture,
  FixtureSelection,
  getProjectConfig,
  parseFixtureSelectionArg,
  parseProjectIdArg,
  parseRowIndexArg
} from "./shared";
import { buildExportManifest, ExportManifest, getExportManifestPath, getExportPackageRoot, getExportRoot } from "./exportManifest";

export type ExportPackageResult = {
  projectId: string;
  exportRoot: string;
  packageRoot: string;
  manifestPath: string;
  codePath: string;
  stringsPath: string;
  exportedFiles: string[];
  manifest: ExportManifest;
};

function getRendererSourcePaths(projectId: string, repoRoot: string): { codeSourcePath: string; stringsSourcePath: string } {
  const config = getProjectConfig(projectId);
  const rendererRoot = path.join(repoRoot, "40_projects", projectId, "vabs", "renderer", config.targetFolderName);
  return {
    codeSourcePath: path.join(rendererRoot, "code.js"),
    stringsSourcePath: path.join(rendererRoot, "strings_en.js")
  };
}

export function runExportPackage(
  projectId: string,
  repoRoot = getRepoRoot(),
  selection: FixtureSelection = "auto",
  sessionRowIndex?: number
): ExportPackageResult {
  const summary = buildReplaySummary(projectId, repoRoot, selection, sessionRowIndex);
  const session =
    typeof sessionRowIndex === "number" ? buildSessionFixture(projectId, repoRoot, selection) : undefined;
  const exportRoot = getExportRoot(projectId);
  const packageRoot = getExportPackageRoot(projectId, repoRoot);
  const manifestPath = getExportManifestPath(projectId, repoRoot);
  const codePath = path.join(packageRoot, "code.js");
  const stringsPath = path.join(packageRoot, "strings_en.js");
  const { codeSourcePath, stringsSourcePath } = getRendererSourcePaths(projectId, repoRoot);

  rmSync(packageRoot, { recursive: true, force: true });
  mkdirSync(packageRoot, { recursive: true });

  copyFileSync(codeSourcePath, codePath);
  copyFileSync(stringsSourcePath, stringsPath);

  const exportedFiles = ["code.js", "strings_en.js", "manifest.json"];
  const manifest =
    typeof sessionRowIndex === "number" && session
      ? buildExportManifest(summary, exportedFiles, { session, selectedRowIndex: sessionRowIndex })
      : buildExportManifest(summary, exportedFiles);
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  return {
    projectId,
    exportRoot,
    packageRoot,
    manifestPath,
    codePath,
    stringsPath,
    exportedFiles,
    manifest
  };
}

function main(): void {
  const repoRoot = getRepoRoot();
  const projectId = parseProjectIdArg();
  const selection = parseFixtureSelectionArg();
  const rowIndex = parseRowIndexArg();
  const result = runExportPackage(projectId, repoRoot, selection, rowIndex);

  console.log(`Local GS-style VABS export passed for ${projectId}`);
  console.log(`- Export root: ${result.exportRoot}`);
  console.log(`- Static package path: ${result.manifest.staticPackagePath}`);
  console.log(`- Package root: ${result.packageRoot}`);
  console.log(`- Requested fixture: ${result.manifest.requestedFixtureSelection}`);
  console.log(`- Actual fixture: ${result.manifest.actualFixtureSelection}`);
  console.log(`- Actual fixture kind: ${result.manifest.actualFixtureKind}`);
  console.log(`- Fixture path: ${result.manifest.fixturePath}`);
  console.log(`- ROUND_ID: ${result.manifest.roundId}`);
  console.log(`- Capture status: ${result.manifest.captureStatus}`);
  if (typeof rowIndex === "number") {
    console.log(`- Session row index: ${rowIndex}`);
  }
  console.log(`- Renderer status: ${result.manifest.rendererStatus}`);
  console.log(`- Exported files: ${result.exportedFiles.join(", ")}`);
  console.log(`- Manifest: ${result.manifestPath}`);
}

if (require.main === module) {
  main();
}
