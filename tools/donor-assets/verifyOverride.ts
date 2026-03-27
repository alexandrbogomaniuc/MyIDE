import { strict as assert } from "node:assert";
import { existsSync } from "node:fs";
import path from "node:path";
import { buildRuntimeAssetOverrideStatus } from "../../30_app/workspace/donorOverride";

const workspaceRoot = path.resolve(__dirname, "../../..");

async function main(): Promise<void> {
  const projectId = process.argv[2] ?? "project_001";
  const status = await buildRuntimeAssetOverrideStatus(projectId);

  for (const entry of status.entries) {
    assert.equal(entry.fileExists, true, `Override file is missing for ${entry.runtimeSourceUrl}: ${entry.overrideRepoRelativePath}`);
    assert.ok(entry.overrideRepoRelativePath.startsWith(`40_projects/${projectId}/overrides/`), `Override path escaped the project-local overrides folder: ${entry.overrideRepoRelativePath}`);
    assert.ok(entry.donorRepoRelativePath.startsWith("10_donors/"), `Donor source path is not donor-rooted: ${entry.donorRepoRelativePath}`);
    assert.equal(existsSync(path.join(workspaceRoot, entry.donorRepoRelativePath)), true, `Donor source file is missing for ${entry.donorAssetId}: ${entry.donorRepoRelativePath}`);
  }

  console.log("PASS donor-assets:verify-override");
  console.log(`Project: ${projectId}`);
  console.log(`Overrides: ${status.entryCount}`);
  console.log(`Manifest: ${status.manifestRepoRelativePath}`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`FAIL donor-assets:verify-override - ${message}`);
  process.exitCode = 1;
});
