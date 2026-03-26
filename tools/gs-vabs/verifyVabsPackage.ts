import { getRepoRoot } from "../publication/shared";
import {
  buildFixtureComparison,
  buildSessionFixture,
  getProjectConfig,
  parseProjectIdArg,
  parseRowFixture,
  verifySessionFixture,
  verifyScaffold
} from "./shared";
import { runBrowserSmoke } from "./browserSmoke";
import { runExportPreview } from "./runExportPreview";
import { runLocalShellMock } from "./runLocalShellMock";
import { verifyExportPackage } from "./verifyExportPackage";
import { runLocalReplayHarness } from "./runLocalReplayHarness";

function main(): void {
  const repoRoot = getRepoRoot();
  const projectId = parseProjectIdArg();
  const config = getProjectConfig(projectId);
  const problems = verifyScaffold(projectId, repoRoot).concat(verifySessionFixture(projectId, repoRoot));

  if (problems.length > 0) {
    console.error(`VABS scaffold verification failed for ${projectId}`);
    for (const problem of problems) {
      console.error(`- ${problem.relativePath}: ${problem.message}`);
    }
    process.exit(1);
  }

  console.log(`VABS scaffold verification passed for ${projectId}`);

  const parsed = parseRowFixture(projectId, repoRoot);
  const comparison = buildFixtureComparison(projectId, repoRoot);
  const session = buildSessionFixture(projectId, repoRoot);
  const harness = runLocalReplayHarness(projectId, repoRoot);
  const exportVerification = verifyExportPackage(projectId, repoRoot);
  const preview = runExportPreview(projectId, repoRoot);
  const shellMock = runLocalShellMock(projectId, repoRoot);
  const browserSmoke = runBrowserSmoke(projectId, repoRoot);

  if (exportVerification.problems.length > 0) {
    console.error(`VABS export verification failed for ${projectId}`);
    for (const problem of exportVerification.problems) {
      console.error(`- ${problem}`);
    }
    process.exit(1);
  }

  if (!browserSmoke.result.smokePassed) {
    console.error(`VABS shell-mock browser smoke failed for ${projectId}`);
    console.error(`- Error: ${browserSmoke.result.error ?? "expected summary markers were missing"}`);
    console.error(`- DOM: ${browserSmoke.result.domPath}`);
    process.exit(1);
  }

  console.log(`- Target folder: ${config.targetFolderName} (${config.targetFolderDecision})`);
  console.log(`- Requested fixture: ${parsed.resolution.requestedSelection}`);
  console.log(`- Actual fixture: ${parsed.resolution.actualSelection}`);
  console.log(`- Actual fixture kind: ${parsed.resolution.actualFixtureKind}`);
  console.log(`- Fixture path: ${parsed.resolution.relativeFixturePath}`);
  console.log(`- Captured sanitized available: ${parsed.resolution.capturedSanitizedFixtureAvailable ? "yes" : "no"}`);
  console.log(`- Captured raw local available: ${parsed.resolution.capturedRawFixtureAvailable ? "yes" : "no"}`);
  console.log(`- ROUND_ID: ${parsed.roundId}`);
  console.log(`- Captured ROUND_ID: ${parsed.capturedRoundId}`);
  console.log(`- Capture status: ${parsed.captureStatus}`);
  console.log(`- Fixture provenance: ${parsed.fixtureProvenance}`);
  console.log(`- Comparison mode: ${comparison.comparisonMode}`);
  console.log(`- Confirmed-from-captured fields: ${comparison.confirmedFromCaptured.join(", ") || "none"}`);
  console.log(`- Provisional fields: ${comparison.provisionalFields.join(", ") || "none"}`);
  console.log(`- Comparison notes: ${comparison.notes.join(" | ")}`);
  console.log(`- Comparison doc: ${parsed.resolution.relativeComparisonPath}`);
  console.log(`- Session fixture: ${session.relativeFixturePath}`);
  console.log(`- Session requested fixture: ${session.requestedSelection}`);
  console.log(`- Session actual fixture: ${session.actualSelection}`);
  console.log(`- Session actual fixture kind: ${session.actualFixtureKind}`);
  console.log(`- Session fixture kind: ${session.sessionFixtureKind}`);
  console.log(`- Session row count: ${session.rows.length}`);
  console.log(`- Session source note: ${session.sourceNote || "-"}`);
  console.log(`- Captured session sanitized available: ${session.capturedSanitizedFixtureAvailable ? "yes" : "no"}`);
  console.log(`- Captured session raw local available: ${session.capturedRawFixtureAvailable ? "yes" : "no"}`);
  console.log(`- Result state: ${parsed.betData.RESULT_STATE}`);
  console.log(`- Renderer stub: 40_projects/${projectId}/vabs/renderer/${config.targetFolderName}/code.js`);
  console.log(`- Replay harness HTML: ${harness.htmlPath}`);
  console.log(`- Export package root: ${exportVerification.result.packageRoot}`);
  console.log(`- Export manifest: ${exportVerification.result.manifestPath}`);
  console.log(`- Export preview HTML: ${preview.htmlPath}`);
  console.log(`- Shell mock HTML: ${shellMock.htmlPath}`);
  console.log(`- Browser smoke JSON: ${browserSmoke.jsonPath}`);
  console.log(`- Browser smoke DOM: ${browserSmoke.result.domPath}`);
  console.log(`- Browser smoke selected row: ${browserSmoke.result.selectedRowIndex}`);
  console.log(`- Browser smoke selected ROUND_ID: ${browserSmoke.result.selectedRoundId}`);
  console.log(`- Browser smoke row click applied: ${browserSmoke.result.rowClickApplied ? "yes" : "no"}`);

  if (!parsed.resolution.capturedFixtureAvailable) {
    console.log(`- Captured-row notes: ${parsed.resolution.relativeCapturedNotesPath}`);
  }
}

main();
