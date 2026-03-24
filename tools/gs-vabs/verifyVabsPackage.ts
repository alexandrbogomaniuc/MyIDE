import { getRepoRoot } from "../publication/shared";
import { getProjectConfig, parseProjectIdArg, parseRowFixture, verifyScaffold } from "./shared";
import { runLocalReplayHarness } from "./runLocalReplayHarness";

function main(): void {
  const repoRoot = getRepoRoot();
  const projectId = parseProjectIdArg();
  const config = getProjectConfig(projectId);
  const problems = verifyScaffold(projectId, repoRoot);

  if (problems.length > 0) {
    console.error(`VABS scaffold verification failed for ${projectId}`);
    for (const problem of problems) {
      console.error(`- ${problem.relativePath}: ${problem.message}`);
    }
    process.exit(1);
  }

  console.log(`VABS scaffold verification passed for ${projectId}`);

  const parsed = parseRowFixture(projectId, repoRoot);
  const harness = runLocalReplayHarness(projectId, repoRoot);

  console.log(`- Target folder: ${config.targetFolderName} (${config.targetFolderDecision})`);
  console.log(`- Requested fixture: ${parsed.resolution.requestedSelection}`);
  console.log(`- Actual fixture: ${parsed.resolution.actualSelection}`);
  console.log(`- Fixture path: ${parsed.resolution.relativeFixturePath}`);
  console.log(`- ROUND_ID: ${parsed.roundId}`);
  console.log(`- Captured ROUND_ID: ${parsed.capturedRoundId}`);
  console.log(`- Capture status: ${parsed.captureStatus}`);
  console.log(`- Fixture provenance: ${parsed.fixtureProvenance}`);
  console.log(`- Result state: ${parsed.betData.RESULT_STATE}`);
  console.log(`- Renderer stub: 40_projects/${projectId}/vabs/renderer/${config.targetFolderName}/code.js`);
  console.log(`- Replay harness HTML: ${harness.htmlPath}`);

  if (!parsed.resolution.capturedFixtureAvailable) {
    console.log(`- Captured-row notes: ${parsed.resolution.relativeCapturedNotesPath}`);
  }
}

main();
