import { collectAutomationSnapshotSource, writeAutomationSnapshotFiles } from "./shared";

async function main(): Promise<void> {
  const source = await collectAutomationSnapshotSource();
  const writeResult = writeAutomationSnapshotFiles(source);

  console.log(`Snapshot JSON: ${source.jsonPath}`);
  console.log(`Snapshot Markdown: ${source.markdownPath}`);
  console.log(`Tracked Local/Public Gap reference: ${source.gapPath}`);
  console.log(`Snapshot state SHA: ${source.snapshot.snapshotStateSha}`);
  console.log(`Local HEAD: ${source.snapshot.localHead}`);
  console.log(`Public HEAD: ${source.snapshot.publicHead}`);
  console.log(`Local/Public match: ${source.snapshot.localPublicMatch ? "yes" : "no"}`);
  console.log(`Repo clean: ${source.snapshot.repoClean ? "yes" : "no"}`);
  console.log(`Untracked files exist: ${source.snapshot.untrackedFilesExist ? "yes" : "no"}`);
  console.log(
    `Files updated: json=${writeResult.jsonUpdated ? "yes" : "no"}, markdown=${
      writeResult.markdownUpdated ? "yes" : "no"
    }`
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
