import path from "path";

import {
  bundleVerify,
  collectPublicationState,
  copyToCurrentVariant,
  ensureHandoffRoot,
  fileSizeIsNonZero,
  git,
  latestPhaseHandoffPrefix,
  verificationUrls,
  writeText
} from "./shared";

function joinLines(lines: string[]): string {
  return `${lines.join("\n")}\n`;
}

async function main(): Promise<void> {
  const state = await collectPublicationState();
  ensureHandoffRoot(state.handoffRoot);

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

  const hasUnpublishedCommits = state.unpublishedCommits.length > 0;
  const bundleArgs = hasUnpublishedCommits
    ? ["bundle", "create", phaseBundle, "main", `^${state.publicHead}`]
    : ["bundle", "create", phaseBundle, "main"];
  git(bundleArgs, state.repoRoot);

  const patch = hasUnpublishedCommits
    ? git(["format-patch", "--stdout", `${state.publicHead}..HEAD`], state.repoRoot)
    : "No unpublished patches.\n";
  writeText(phasePatch, patch.endsWith("\n") ? patch : `${patch}\n`);

  const changedFiles = hasUnpublishedCommits
    ? git(["diff", "--name-only", `${state.publicHead}..HEAD`], state.repoRoot)
    : "";
  const diffstat = hasUnpublishedCommits
    ? git(["diff", "--stat", `${state.publicHead}..HEAD`], state.repoRoot)
    : "";
  writeText(phaseChangedFiles, changedFiles ? `${changedFiles}\n` : "No unpublished files.\n");
  writeText(phaseDiffstat, diffstat ? `${diffstat}\n` : "No unpublished diffstat.\n");

  const unpublishedLines =
    state.unpublishedCommits.length === 0
      ? ["- none"]
      : state.unpublishedCommits.map((commit) => `- ${commit.sha} ${commit.message}`);
  const verifyUrls = verificationUrls();

  writeText(
    phaseNotes,
    joinLines([
      `Generated at UTC: ${state.generatedAtUtc}`,
      `Repo root: ${state.repoRoot}`,
      `Handoff root: ${state.handoffRoot}`,
      `Local phase: ${state.localPhase}`,
      `Local HEAD: ${state.localHead}`,
      `Local commit message: ${state.localHeadMessage}`,
      `Public origin/main: ${state.publicHead}`,
      `Unpublished commit count: ${state.unpublishedCommits.length}`,
      "Unpublished commits:",
      ...unpublishedLines,
      "Phase-specific files:",
      `- ${phaseBundle}`,
      `- ${phasePatch}`,
      `- ${phaseChangedFiles}`,
      `- ${phaseDiffstat}`,
      `- ${phaseNotes}`,
      "Stable current files:",
      `- ${currentBundle}`,
      `- ${currentPatch}`,
      `- ${currentChangedFiles}`,
      `- ${currentDiffstat}`,
      `- ${currentNotes}`,
      "Publish from another authenticated environment:",
      `1. git -C /path/to/authenticated/MyIDE fetch origin`,
      `2. git -C /path/to/authenticated/MyIDE rev-parse origin/main`,
      `   Expected public base: ${state.publicHead}`,
      `3. git -C /path/to/authenticated/MyIDE fetch ${currentBundle} main:handoff-main`,
      `4. git -C /path/to/authenticated/MyIDE log --oneline origin/main..handoff-main`,
      `5. git -C /path/to/authenticated/MyIDE push origin handoff-main:main`,
      "Verify public raw files after publish:",
      ...verifyUrls.map((url) => `- ${url}`)
    ])
  );

  copyToCurrentVariant(phaseBundle, currentBundle);
  copyToCurrentVariant(phasePatch, currentPatch);
  copyToCurrentVariant(phaseChangedFiles, currentChangedFiles);
  copyToCurrentVariant(phaseDiffstat, currentDiffstat);
  copyToCurrentVariant(phaseNotes, currentNotes);

  const verifyOutput = bundleVerify(currentBundle, state.repoRoot);
  const currentFiles = [
    currentBundle,
    currentPatch,
    currentChangedFiles,
    currentDiffstat,
    currentNotes
  ];
  for (const filePath of currentFiles) {
    if (!fileSizeIsNonZero(filePath)) {
      throw new Error(`Expected non-empty handoff artifact at ${filePath}`);
    }
  }

  console.log(`Refreshed phase-specific handoff bundle: ${phaseBundle}`);
  console.log(`Refreshed stable handoff bundle: ${currentBundle}`);
  console.log(verifyOutput);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
