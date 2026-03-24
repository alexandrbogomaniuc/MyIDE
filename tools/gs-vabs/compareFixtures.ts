import { writeFileSync } from "fs";

import { getRepoRoot } from "../publication/shared";
import {
  buildFixtureComparison,
  getFixtureComparisonPath,
  parseProjectIdArg,
  renderFixtureComparisonMarkdown
} from "./shared";

function main(): void {
  const repoRoot = getRepoRoot();
  const projectId = parseProjectIdArg();
  const comparison = buildFixtureComparison(projectId, repoRoot);
  const output = renderFixtureComparisonMarkdown(comparison);
  const outputPath = getFixtureComparisonPath(projectId, repoRoot);

  writeFileSync(outputPath, output, "utf-8");
  console.log(`Updated ${outputPath}`);
  console.log(output.trimEnd());
}

main();
