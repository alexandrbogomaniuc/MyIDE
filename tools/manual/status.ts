import { existsSync } from "fs";

import { getManualContext } from "./shared";

function main(): void {
  const context = getManualContext();

  console.log("Manual QA status");
  console.log(`- Local HEAD: ${context.localHead}`);
  console.log(`- Local phase: ${context.localPhase}`);
  console.log(
    `- Current validated project: ${context.validatedProject.projectId} (${context.validatedProject.displayName})`
  );
  console.log(`- Validated project status: ${context.validatedProject.status}`);
  console.log(`- Public origin/main: ${context.publicHead}`);
  console.log(`- Local vs public: ${context.gapSummary}`);
  console.log(
    `- Handoff bundle: ${
      existsSync(context.handoff.bundle) ? context.handoff.bundle : "missing CURRENT.bundle"
    }`
  );
  console.log(
    `- Handoff notes: ${
      existsSync(context.handoff.notes) ? context.handoff.notes : "missing CURRENT_RECOVERY_NOTES.txt"
    }`
  );
  console.log(`- Reset baseline: current tracked HEAD state of 40_projects/project_001`);
}

main();
