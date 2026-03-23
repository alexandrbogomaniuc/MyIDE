import { execFileSync } from "child_process";
import { writeFileSync } from "fs";
import path from "path";

import { getRepoRoot } from "../../tools/publication/shared";

const DEMO_ARTIFACT_RELATIVE_PATH = "50_tests/workspace/project_001-demo.md";

function main(): void {
  const repoRoot = getRepoRoot();
  const contents = execFileSync("git", ["-C", repoRoot, "show", `HEAD:${DEMO_ARTIFACT_RELATIVE_PATH}`], {
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024
  });

  writeFileSync(path.join(repoRoot, DEMO_ARTIFACT_RELATIVE_PATH), contents, "utf8");
  console.log(`PASS restore-demo-artifact`);
  console.log(`Restored ${DEMO_ARTIFACT_RELATIVE_PATH} from current HEAD.`);
}

main();
