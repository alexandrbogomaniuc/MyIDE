import { strict as assert } from "node:assert";
import path from "node:path";
import {
  buildDonorScanPaths,
  fileExists,
  readJsonFile,
  readOptionalTextFile,
  workspaceRoot
} from "./shared";

function parseArgs(argv: readonly string[]): { donorId: string } {
  let donorId = "";
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    const next = argv[index + 1];
    if (token === "--donor-id" && next) {
      donorId = next;
      index += 1;
    }
  }

  if (!donorId) {
    throw new Error("Missing required --donor-id argument.");
  }

  return { donorId };
}

async function main(): Promise<void> {
  const { donorId } = parseArgs(process.argv.slice(2));
  const paths = buildDonorScanPaths(donorId);
  const requiredPaths = [
    paths.assetManifestPath,
    paths.packageGraphPath,
    paths.entryPointsPath,
    paths.urlInventoryPath,
    paths.runtimeCandidatesPath,
    paths.bundleAssetMapPath,
    paths.atlasManifestsPath,
    paths.blockerSummaryPath,
    paths.scanSummaryPath
  ];

  for (const filePath of requiredPaths) {
    assert(await fileExists(filePath), `Expected donor scan artifact: ${path.relative(workspaceRoot, filePath)}`);
  }

  const scanSummary = await readJsonFile<{
    donorId?: string;
    scanState?: string;
    runtimeCandidateCount?: number;
    atlasManifestCount?: number;
    bundleAssetMapStatus?: string;
    mirrorCandidateStatus?: string;
    nextOperatorAction?: string;
  }>(paths.scanSummaryPath);
  assert.equal(scanSummary.donorId, donorId, "scan summary donor id should match requested donor id");
  assert.ok(typeof scanSummary.scanState === "string", "scan summary should record scan state");
  assert.ok(typeof scanSummary.runtimeCandidateCount === "number", "scan summary should record runtime candidate count");
  assert.ok(typeof scanSummary.atlasManifestCount === "number", "scan summary should record atlas manifest count");
  assert.ok(typeof scanSummary.bundleAssetMapStatus === "string", "scan summary should record bundle asset-map status");
  assert.ok(typeof scanSummary.mirrorCandidateStatus === "string", "scan summary should record mirror candidate status");
  assert.ok(typeof scanSummary.nextOperatorAction === "string" && scanSummary.nextOperatorAction.length > 0, "scan summary should record the next operator action");

  const blockerSummary = await readOptionalTextFile(paths.blockerSummaryPath);
  assert.ok(blockerSummary && blockerSummary.includes("Next operator step"), "blocker summary should explain the next operator step");

  console.log("PASS donor-scan:verify");
  console.log(`Donor: ${donorId}`);
  console.log(`Scan state: ${scanSummary.scanState}`);
  console.log(`Runtime candidates: ${scanSummary.runtimeCandidateCount}`);
  console.log(`Atlas manifests: ${scanSummary.atlasManifestCount}`);
  console.log(`Next operator action: ${scanSummary.nextOperatorAction}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`FAIL donor-scan:verify - ${message}`);
  process.exitCode = 1;
});
