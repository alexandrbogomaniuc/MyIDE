import { collectPublicationState } from "./shared";

async function main(): Promise<void> {
  const state = await collectPublicationState();
  console.log(`Local HEAD: ${state.localHead}`);
  console.log(`Local HEAD message: ${state.localHeadMessage}`);
  console.log(`Public HEAD: ${state.publicHead}`);
  console.log(`Local phase: ${state.localPhase}`);
  console.log(`Unpublished commit count: ${state.unpublishedCommits.length}`);
  console.log(
    `Public README matches local phase: ${state.publicReadmeMatchesLocalPhase ? "yes" : "no"}`
  );
  console.log(
    `Public registry matches local phase: ${state.publicRegistryMatchesLocalPhase ? "yes" : "no"}`
  );
  console.log(
    `Public shell README mentions live undo/redo scope: ${
      state.publicShellReadmeMentionsUndoRedoScope ? "yes" : "no"
    }`
  );
  console.log(
    `Public package includes all live-shell smoke scripts: ${
      state.publicPackageHasAllLiveShellScripts ? "yes" : "no"
    }`
  );
  if (state.publicPackageMissingLiveShellScripts.length > 0) {
    console.log(
      `Missing public live-shell scripts: ${state.publicPackageMissingLiveShellScripts.join(", ")}`
    );
  }
  console.log("");
  console.log("Branch -vv:");
  console.log(state.branchSummary);
  console.log("");
  console.log("Remote -v:");
  console.log(state.remoteSummary);
  console.log("");
  console.log("Status --short:");
  console.log(state.statusShort || "(clean)");
  console.log("");
  console.log("Unpublished commits:");
  if (state.unpublishedCommits.length === 0) {
    console.log("- none");
  } else {
    for (const commit of state.unpublishedCommits) {
      console.log(`- ${commit.sha} ${commit.message}`);
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
