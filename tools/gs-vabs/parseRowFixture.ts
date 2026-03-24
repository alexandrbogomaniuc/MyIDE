import { getRepoRoot } from "../publication/shared";
import { getProjectConfig, parseProjectIdArg, parseRowFixture } from "./shared";

function main(): void {
  const repoRoot = getRepoRoot();
  const projectId = parseProjectIdArg();
  const config = getProjectConfig(projectId);
  const parsed = parseRowFixture(projectId, repoRoot);

  console.log(`Parsed VABS row fixture for ${projectId}`);
  console.log(`- Target folder: ${config.targetFolderName} (${config.targetFolderDecision})`);
  console.log(`- ROUND_ID: ${parsed.roundId}`);
  console.log(`- State: ${parsed.fixture.stateName} (${parsed.fixture.stateId})`);
  console.log(`- extBetId: ${parsed.fixture.extBetId}`);
  console.log(`- betData keys: ${Object.keys(parsed.betData).join(", ")}`);
  console.log(`- servletData keys: ${Object.keys(parsed.servletData).join(", ")}`);
}

main();
