import path from "path";

import {
  bundleVerify,
  collectPublicationState,
  fileSizeIsNonZero,
  git,
  latestPhaseHandoffPrefix,
  readText
} from "./shared";

function assertIncludes(haystack: string, needle: string, label: string): void {
  if (!haystack.includes(needle)) {
    throw new Error(`Expected ${label} to include: ${needle}`);
  }
}

async function main(): Promise<void> {
  const state = await collectPublicationState();
  const prefix = latestPhaseHandoffPrefix(state);

  const phaseBundle = path.join(state.handoffRoot, `${prefix}.bundle`);
  const phasePatch = path.join(state.handoffRoot, `${prefix}.patch`);
  const phaseChangedFiles = path.join(state.handoffRoot, `${prefix}_CHANGED_FILES.txt`);
  const phaseDiffstat = path.join(state.handoffRoot, `${prefix}_DIFFSTAT.txt`);
  const phaseNotes = path.join(state.handoffRoot, `${prefix}_RECOVERY_NOTES.txt`);

  const currentBundle = path.join(state.handoffRoot, "CURRENT.bundle");
  const currentPatch = path.join(state.handoffRoot, "CURRENT.patch");
  const currentChangedFiles = path.join(state.handoffRoot, "CURRENT_CHANGED_FILES.txt");
  const currentDiffstat = path.join(state.handoffRoot, "CURRENT_DIFFSTAT.txt");
  const currentNotes = path.join(state.handoffRoot, "CURRENT_RECOVERY_NOTES.txt");

  const requiredFiles = [
    phaseBundle,
    phasePatch,
    phaseChangedFiles,
    phaseDiffstat,
    phaseNotes,
    currentBundle,
    currentPatch,
    currentChangedFiles,
    currentDiffstat,
    currentNotes
  ];

  for (const filePath of requiredFiles) {
    if (!fileSizeIsNonZero(filePath)) {
      throw new Error(`Missing or empty handoff artifact: ${filePath}`);
    }
  }

  const verifyOutput = bundleVerify(currentBundle, state.repoRoot);
  const changedFiles = git(["diff", "--name-only", `${state.publicHead}..HEAD`], state.repoRoot);
  const currentChangedFilesText = readText(currentChangedFiles);
  const currentNotesText = readText(currentNotes);

  if (changedFiles.trim().length > 0) {
    assertIncludes(currentChangedFilesText, changedFiles.split("\n")[0], "CURRENT_CHANGED_FILES.txt");
  }
  assertIncludes(currentNotesText, `Local HEAD: ${state.localHead}`, "CURRENT_RECOVERY_NOTES.txt");
  assertIncludes(
    currentNotesText,
    `Public origin/main: ${state.publicHead}`,
    "CURRENT_RECOVERY_NOTES.txt"
  );
  assertIncludes(
    currentNotesText,
    `fetch ${currentBundle} main:handoff-main`,
    "CURRENT_RECOVERY_NOTES.txt"
  );
  assertIncludes(
    currentNotesText,
    "https://raw.githubusercontent.com/alexandrbogomaniuc/MyIDE/main/README.md",
    "CURRENT_RECOVERY_NOTES.txt"
  );

  console.log("PASS handoff:verify");
  console.log(`Verified files under ${state.handoffRoot}`);
  console.log(verifyOutput);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
