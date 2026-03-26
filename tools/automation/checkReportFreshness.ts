import { collectAutomationSnapshotSource, readStoredAutomationSnapshot } from "./shared";

async function main(): Promise<void> {
  const storedSnapshot = readStoredAutomationSnapshot();
  if (!storedSnapshot) {
    console.log("SNAPSHOT_MISSING");
    console.log("Snapshot path: 00_control/AUTOMATION_STATUS_SNAPSHOT.json");
    process.exit(1);
  }

  const currentSource = await collectAutomationSnapshotSource();
  const currentSnapshot = currentSource.snapshot;

  if (storedSnapshot.localStateSha !== currentSnapshot.localStateSha) {
    console.log("STALE_LOCAL");
    console.log(`Snapshot generated: ${storedSnapshot.generatedAtUtc}`);
    console.log(`Snapshot local HEAD: ${storedSnapshot.localHead}`);
    console.log(`Current local HEAD: ${currentSnapshot.localHead}`);
    console.log(`Snapshot local state SHA: ${storedSnapshot.localStateSha}`);
    console.log(`Current local state SHA: ${currentSnapshot.localStateSha}`);
    process.exit(1);
  }

  if (storedSnapshot.publicHead !== currentSnapshot.publicHead) {
    console.log("STALE_PUBLIC");
    console.log(`Snapshot generated: ${storedSnapshot.generatedAtUtc}`);
    console.log(`Snapshot public HEAD: ${storedSnapshot.publicHead}`);
    console.log(`Current public HEAD: ${currentSnapshot.publicHead}`);
    console.log(`Snapshot public state SHA: ${storedSnapshot.publicStateSha}`);
    console.log(`Current public state SHA: ${currentSnapshot.publicStateSha}`);
    process.exit(1);
  }

  console.log("CURRENT");
  console.log(`Snapshot generated: ${storedSnapshot.generatedAtUtc}`);
  console.log(`Snapshot state SHA: ${storedSnapshot.snapshotStateSha}`);
  console.log(`Local HEAD: ${currentSnapshot.localHead}`);
  console.log(`Public HEAD: ${currentSnapshot.publicHead}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
