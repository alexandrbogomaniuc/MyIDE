import { existsSync, readFileSync } from "fs";

import { getRepoRoot } from "../publication/shared";
import { FixtureSelection, getProjectConfig, parseFixtureSelectionArg, parseProjectIdArg } from "./shared";
import { ExportManifest } from "./exportManifest";
import { ExportPackageResult, runExportPackage } from "./exportPackage";

export type ExportVerificationResult = {
  result: ExportPackageResult;
  manifest: ExportManifest;
  problems: string[];
};

export function verifyExportPackage(
  projectId: string,
  repoRoot = getRepoRoot(),
  selection: FixtureSelection = "auto"
): ExportVerificationResult {
  const config = getProjectConfig(projectId);
  const result = runExportPackage(projectId, repoRoot, selection);
  const problems: string[] = [];

  if (!existsSync(result.codePath)) {
    problems.push("Missing exported code.js");
  }
  if (!existsSync(result.stringsPath)) {
    problems.push("Missing exported strings_en.js");
  }
  if (!existsSync(result.manifestPath)) {
    problems.push("Missing exported manifest.json");
  }

  const manifest = JSON.parse(readFileSync(result.manifestPath, "utf8")) as ExportManifest;
  if (manifest.targetFolderName !== config.targetFolderName) {
    problems.push(`Manifest target folder mismatch: expected ${config.targetFolderName}, got ${manifest.targetFolderName}`);
  }
  if (manifest.staticPackagePath !== `common/vabs/${config.targetFolderName}`) {
    problems.push(`Manifest staticPackagePath mismatch: ${manifest.staticPackagePath}`);
  }
  if (manifest.rendererStatus !== "stub-only-non-production") {
    problems.push(`Manifest rendererStatus mismatch: ${manifest.rendererStatus}`);
  }
  if (!manifest.roundId) {
    problems.push("Manifest does not report ROUND_ID");
  }
  if (!manifest.fixturePath) {
    problems.push("Manifest does not report fixturePath");
  }
  if (!manifest.exportedFiles.includes("manifest.json")) {
    problems.push("Manifest exportedFiles does not include manifest.json");
  }

  return { result, manifest, problems };
}

function main(): void {
  const repoRoot = getRepoRoot();
  const projectId = parseProjectIdArg();
  const selection = parseFixtureSelectionArg();
  const verification = verifyExportPackage(projectId, repoRoot, selection);

  if (verification.problems.length > 0) {
    console.error(`VABS export verification failed for ${projectId}`);
    for (const problem of verification.problems) {
      console.error(`- ${problem}`);
    }
    process.exit(1);
  }

  console.log(`VABS export verification passed for ${projectId}`);
  console.log(`- Static package path: ${verification.manifest.staticPackagePath}`);
  console.log(`- Package root: ${verification.result.packageRoot}`);
  console.log(`- Requested fixture: ${verification.manifest.requestedFixtureSelection}`);
  console.log(`- Actual fixture: ${verification.manifest.actualFixtureSelection}`);
  console.log(`- Actual fixture kind: ${verification.manifest.actualFixtureKind}`);
  console.log(`- ROUND_ID: ${verification.manifest.roundId}`);
  console.log(`- Capture status: ${verification.manifest.captureStatus}`);
  console.log(`- Manifest: ${verification.result.manifestPath}`);
}

if (require.main === module) {
  main();
}
