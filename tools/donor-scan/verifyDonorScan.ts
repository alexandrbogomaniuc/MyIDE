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
    paths.requestBackedStaticHintsPath,
    paths.entryPointsPath,
    paths.urlInventoryPath,
    paths.runtimeCandidatesPath,
    paths.bundleAssetMapPath,
    paths.atlasManifestsPath,
    paths.nextCaptureTargetsPath,
    paths.captureFamilySourceProfilesPath,
    paths.captureFamilyActionsPath,
    paths.familyReconstructionProfilesPath,
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
    bundleImageVariantStatus?: string;
    bundleImageVariantCount?: number;
    bundleImageVariantSuffixCount?: number;
    bundleImageVariantUrlBuilderStatus?: string;
    bundleImageVariantUrlCount?: number;
    translationPayloadStatus?: string;
    translationPayloadCount?: number;
    mirrorCandidateStatus?: string;
    requestBackedStaticHintCount?: number;
    captureFamilyCount?: number;
    topCaptureFamilyNames?: string[];
    familySourceProfileCount?: number;
    topFamilySourceProfileNames?: string[];
    familyActionCount?: number;
    topFamilyActionNames?: string[];
    familyReconstructionProfileCount?: number;
    topFamilyReconstructionProfileNames?: string[];
    rawPayloadBlockedCaptureTargetCount?: number;
    rawPayloadBlockedFamilyCount?: number;
    rawPayloadBlockedFamilyNames?: string[];
    nextCaptureTargetCount?: number;
    nextOperatorAction?: string;
  }>(paths.scanSummaryPath);
  assert.equal(scanSummary.donorId, donorId, "scan summary donor id should match requested donor id");
  assert.ok(typeof scanSummary.scanState === "string", "scan summary should record scan state");
  assert.ok(typeof scanSummary.runtimeCandidateCount === "number", "scan summary should record runtime candidate count");
  assert.ok(typeof scanSummary.atlasManifestCount === "number", "scan summary should record atlas manifest count");
  assert.ok(typeof scanSummary.bundleAssetMapStatus === "string", "scan summary should record bundle asset-map status");
  assert.ok(typeof scanSummary.bundleImageVariantStatus === "string", "scan summary should record bundle image variant status");
  assert.ok(typeof scanSummary.bundleImageVariantCount === "number", "scan summary should record bundle image variant count");
  assert.ok(typeof scanSummary.bundleImageVariantSuffixCount === "number", "scan summary should record bundle image variant suffix count");
  assert.ok(typeof scanSummary.bundleImageVariantUrlBuilderStatus === "string", "scan summary should record bundle image variant URL builder status");
  assert.ok(typeof scanSummary.bundleImageVariantUrlCount === "number", "scan summary should record bundle image variant URL count");
  assert.ok(typeof scanSummary.translationPayloadStatus === "string", "scan summary should record translation payload status");
  assert.ok(typeof scanSummary.translationPayloadCount === "number", "scan summary should record translation payload count");
  assert.ok(typeof scanSummary.mirrorCandidateStatus === "string", "scan summary should record mirror candidate status");
  assert.ok(typeof scanSummary.requestBackedStaticHintCount === "number", "scan summary should record request-backed static hint count");
  assert.ok(typeof scanSummary.captureFamilyCount === "number", "scan summary should record capture family counts");
  assert.ok(Array.isArray(scanSummary.topCaptureFamilyNames), "scan summary should record top capture family names");
  assert.ok(typeof scanSummary.familySourceProfileCount === "number", "scan summary should record family source profile counts");
  assert.ok(Array.isArray(scanSummary.topFamilySourceProfileNames), "scan summary should record top family source profile names");
  assert.ok(typeof scanSummary.familyActionCount === "number", "scan summary should record family action counts");
  assert.ok(Array.isArray(scanSummary.topFamilyActionNames), "scan summary should record top family action names");
  assert.ok(typeof scanSummary.familyReconstructionProfileCount === "number", "scan summary should record family reconstruction profile counts");
  assert.ok(Array.isArray(scanSummary.topFamilyReconstructionProfileNames), "scan summary should record top family reconstruction profile names");
  assert.ok(typeof scanSummary.rawPayloadBlockedCaptureTargetCount === "number", "scan summary should record raw-payload-blocked target counts");
  assert.ok(typeof scanSummary.rawPayloadBlockedFamilyCount === "number", "scan summary should record raw-payload-blocked family counts");
  assert.ok(Array.isArray(scanSummary.rawPayloadBlockedFamilyNames), "scan summary should record raw-payload-blocked family names");
  assert.ok(typeof scanSummary.nextCaptureTargetCount === "number", "scan summary should record next capture target count");
  assert.ok(typeof scanSummary.nextOperatorAction === "string" && scanSummary.nextOperatorAction.length > 0, "scan summary should record the next operator action");

  const blockerSummary = await readOptionalTextFile(paths.blockerSummaryPath);
  assert.ok(blockerSummary && blockerSummary.includes("Next operator step"), "blocker summary should explain the next operator step");

  console.log("PASS donor-scan:verify");
  console.log(`Donor: ${donorId}`);
  console.log(`Scan state: ${scanSummary.scanState}`);
  console.log(`Runtime candidates: ${scanSummary.runtimeCandidateCount}`);
  console.log(`Atlas manifests: ${scanSummary.atlasManifestCount}`);
  console.log(`Bundle image variants: ${scanSummary.bundleImageVariantCount}`);
  console.log(`Bundle variant URLs: ${scanSummary.bundleImageVariantUrlCount} (${scanSummary.bundleImageVariantUrlBuilderStatus})`);
  console.log(`Translation payloads: ${scanSummary.translationPayloadCount} (${scanSummary.translationPayloadStatus})`);
  console.log(`Request-backed alternates: ${scanSummary.requestBackedStaticHintCount}`);
  console.log(`Capture families: ${scanSummary.captureFamilyCount} (${scanSummary.topCaptureFamilyNames.join(", ")})`);
  console.log(`Family source profiles: ${scanSummary.familySourceProfileCount} (${scanSummary.topFamilySourceProfileNames.join(", ")})`);
  console.log(`Family action queue: ${scanSummary.familyActionCount} (${scanSummary.topFamilyActionNames.join(", ")})`);
  console.log(`Family reconstruction profiles: ${scanSummary.familyReconstructionProfileCount} (${scanSummary.topFamilyReconstructionProfileNames.join(", ")})`);
  console.log(`Raw-payload-blocked targets: ${scanSummary.rawPayloadBlockedCaptureTargetCount}`);
  console.log(`Raw-payload-blocked families: ${scanSummary.rawPayloadBlockedFamilyCount} (${scanSummary.rawPayloadBlockedFamilyNames.join(", ")})`);
  console.log(`Next capture targets: ${scanSummary.nextCaptureTargetCount}`);
  console.log(`Next operator action: ${scanSummary.nextOperatorAction}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`FAIL donor-scan:verify - ${message}`);
  process.exitCode = 1;
});
