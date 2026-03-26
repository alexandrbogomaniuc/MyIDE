import path from "node:path";
import { writeProjectDonorAssetIndex } from "./shared";

async function main(): Promise<void> {
  const projectId = process.argv[2] ?? "project_001";
  const index = await writeProjectDonorAssetIndex(projectId);

  if (index.assetCount === 0) {
    throw new Error(`No usable local donor image assets were found for ${projectId}.`);
  }

  console.log("PASS donor-assets:index");
  console.log(`Project: ${index.projectId}`);
  console.log(`Assets: ${index.assetCount}`);
  console.log(`Index: ${index.indexPath}`);
  console.log(`Source inventory: ${index.sourceInventoryPath}`);
  console.log(`Types: ${[...new Set(index.assets.map((asset) => asset.fileType))].join(", ")}`);
  console.log(`First asset: ${index.assets[0]?.evidenceId ?? "none"} -> ${index.assets[0] ? path.basename(index.assets[0].repoRelativePath) : "none"}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`FAIL donor-assets:index - ${message}`);
  process.exitCode = 1;
});
