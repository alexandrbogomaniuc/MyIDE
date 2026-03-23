import { existsSync } from "fs";

import { getManualContext } from "./shared";

function main(): void {
  const context = getManualContext();
  const timestampUtc = new Date().toISOString();

  console.log("Manual bug context");
  console.log(`Date/time: ${timestampUtc}`);
  console.log(`Local commit SHA: ${context.localHead}`);
  console.log(`Local phase: ${context.localPhase}`);
  console.log(`Public/main SHA: ${context.publicHead}`);
  console.log(`Local/public status: ${context.gapSummary}`);
  console.log(
    `Validated project: ${context.validatedProject.projectId} (${context.validatedProject.displayName})`
  );
  console.log(`Validated project status: ${context.validatedProject.status}`);
  console.log(
    `Handoff bundle: ${
      existsSync(context.handoff.bundle) ? context.handoff.bundle : "missing CURRENT.bundle"
    }`
  );
  console.log(
    `Handoff notes: ${
      existsSync(context.handoff.notes) ? context.handoff.notes : "missing CURRENT_RECOVERY_NOTES.txt"
    }`
  );
}

main();
