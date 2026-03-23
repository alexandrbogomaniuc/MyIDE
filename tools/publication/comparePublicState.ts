import path from "path";

import { collectPublicationState, renderGapMarkdown, writeText } from "./shared";

async function main(): Promise<void> {
  const state = await collectPublicationState();
  const gapPath = path.join(state.repoRoot, "00_control/LOCAL_PUBLIC_GAP.md");
  const markdown = renderGapMarkdown(state);
  writeText(gapPath, markdown);
  console.log(`Updated ${gapPath}`);
  console.log(`Local HEAD: ${state.localHead}`);
  console.log(`Public HEAD: ${state.publicHead}`);
  console.log(`Unpublished commit count: ${state.unpublishedCommits.length}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
