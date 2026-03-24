import { getRepoRoot } from "../publication/shared";
import {
  getProjectConfig,
  parseFixtureSelectionArg,
  parseProjectIdArg,
  parseRowFixture
} from "./shared";

function main(): void {
  const repoRoot = getRepoRoot();
  const projectId = parseProjectIdArg();
  const selection = parseFixtureSelectionArg();
  const config = getProjectConfig(projectId);
  const parsed = parseRowFixture(projectId, repoRoot, selection);

  console.log(`Parsed VABS row fixture for ${projectId}`);
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
  console.log(`- State: ${parsed.fixture.stateName} (${parsed.fixture.stateId})`);
  console.log(`- extBetId: ${parsed.fixture.extBetId}`);
  console.log(`- betData keys: ${Object.keys(parsed.betData).join(", ")}`);
  console.log(`- servletData keys: ${Object.keys(parsed.servletData).join(", ")}`);
}

main();
