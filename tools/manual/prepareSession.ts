import { execFileSync } from "child_process";
import path from "path";

import { getRepoRoot } from "../publication/shared";

const FORCE_UNKNOWN_FLAG = "--force-unknown";

function runNodeScript(repoRoot: string, relativeScriptPath: string, args: string[] = []): void {
  execFileSync(process.execPath, [path.join(repoRoot, "dist", relativeScriptPath), ...args], {
    cwd: repoRoot,
    stdio: "inherit",
    maxBuffer: 10 * 1024 * 1024
  });
}

function main(): void {
  const repoRoot = getRepoRoot();
  const allowUnknown = process.argv.includes(FORCE_UNKNOWN_FLAG);
  const resetArgs = allowUnknown ? [FORCE_UNKNOWN_FLAG] : [];

  console.log("Preparing manual QA session for project_001");
  console.log("- This command resets 40_projects/project_001 to the current tracked HEAD baseline.");
  console.log("- It removes only the known local-only editor log outputs for project_001.");
  if (allowUnknown) {
    console.log("- Because --force-unknown was supplied, unknown untracked files inside project_001 will also be removed.");
  }
  console.log("- It does not touch other projects or unrelated repo paths.");
  console.log("");

  console.log("Current manual status:");
  runNodeScript(repoRoot, "tools/manual/status.js");
  console.log("");

  console.log("Resetting project_001 baseline...");
  runNodeScript(repoRoot, "tools/manual/resetProject001.js", resetArgs);
  console.log("");

  console.log("Refreshing derived workspace registry...");
  runNodeScript(repoRoot, "30_app/workspace/generateRegistry.js");
  console.log("");

  console.log("Refreshing replay-facing project_001 output...");
  runNodeScript(repoRoot, "30_app/workspace/syncProject.js", ["40_projects/project_001"]);
  console.log("");

  console.log("Validating project_001 baseline...");
  runNodeScript(repoRoot, "50_tests/schema/validate-project_001.js");
  console.log("");

  console.log("Manual QA session ready.");
  console.log("Next:");
  console.log("- Run `npm run dev`");
  console.log("- Re-run `npm run manual:status` if you want a quick context check before testing");
  console.log("- If you hit a bug, run `npm run manual:bug-bundle` to create a timestamped report folder");
  console.log("- If you only need a quick text block, run `npm run manual:bug-context` too");
}

main();
