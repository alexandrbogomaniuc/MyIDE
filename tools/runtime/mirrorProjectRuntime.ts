import { captureLocalRuntimeMirror } from "../../30_app/runtime/localRuntimeMirror";

async function main(): Promise<void> {
  const projectId = process.argv[2] ?? "project_001";
  const result = await captureLocalRuntimeMirror(projectId);
  console.log("PASS runtime:mirror");
  console.log(`Project: ${projectId}`);
  console.log(`Launch source: ${result.status.publicEntryUrl ?? "unknown"}`);
  console.log(`Final launch URL: ${result.finalLaunchUrl}`);
  console.log(`Mirror launch URL: ${result.status.launchUrl ?? "unavailable"}`);
  console.log(`Mirror entries: ${result.status.entryCount}`);
  console.log(`Manifest: ${result.status.manifestRepoRelativePath}`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`FAIL runtime:mirror - ${message}`);
  process.exitCode = 1;
});
