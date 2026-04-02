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
    paths.familyReconstructionMapsPath,
    paths.familyReconstructionSectionsPath,
    paths.familyReconstructionSectionBundlesPath,
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
    familyReconstructionMapCount?: number;
    topFamilyReconstructionMapNames?: string[];
    familyReconstructionSectionCount?: number;
    topFamilyReconstructionSectionKeys?: string[];
    familyReconstructionSectionBundleCount?: number;
    topFamilyReconstructionSectionBundleKeys?: string[];
    sectionSkinMaterialReviewBundleCount?: number;
    topSectionSkinMaterialReviewBundleKeys?: string[];
    sectionSkinPageMatchBundleCount?: number;
    topSectionSkinPageMatchBundleKeys?: string[];
    sectionSkinTextureSourcePlanCount?: number;
    topSectionSkinTextureSourcePlanKeys?: string[];
    sectionSkinTextureReconstructionBundleCount?: number;
    topSectionSkinTextureReconstructionBundleKeys?: string[];
    sectionSkinPageLockBundleCount?: number;
    topSectionSkinPageLockBundleKeys?: string[];
    sectionSkinPageLockAuditBundleCount?: number;
    topSectionSkinPageLockAuditBundleKeys?: string[];
    sectionSkinPageLockResolutionBundleCount?: number;
    topSectionSkinPageLockResolutionBundleKeys?: string[];
    sectionSkinPageLockDecisionBundleCount?: number;
    topSectionSkinPageLockDecisionBundleKeys?: string[];
    sectionSkinPageLockReviewBundleCount?: number;
    topSectionSkinPageLockReviewBundleKeys?: string[];
    sectionSkinPageLockApprovalBundleCount?: number;
    topSectionSkinPageLockApprovalBundleKeys?: string[];
    sectionSkinPageLockApplyBundleCount?: number;
    topSectionSkinPageLockApplyBundleKeys?: string[];
    sectionSkinTextureLockBundleCount?: number;
    topSectionSkinTextureLockBundleKeys?: string[];
    sectionSkinTextureAssemblyBundleCount?: number;
    topSectionSkinTextureAssemblyBundleKeys?: string[];
    sectionSkinTextureInputBundleCount?: number;
    topSectionSkinTextureInputBundleKeys?: string[];
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
  assert.ok(typeof scanSummary.familyReconstructionMapCount === "number", "scan summary should record family reconstruction map counts");
  assert.ok(Array.isArray(scanSummary.topFamilyReconstructionMapNames), "scan summary should record top family reconstruction map names");
  assert.ok(typeof scanSummary.familyReconstructionSectionCount === "number", "scan summary should record family reconstruction section counts");
  assert.ok(Array.isArray(scanSummary.topFamilyReconstructionSectionKeys), "scan summary should record top family reconstruction section keys");
  assert.ok(typeof scanSummary.familyReconstructionSectionBundleCount === "number", "scan summary should record family reconstruction section bundle counts");
  assert.ok(Array.isArray(scanSummary.topFamilyReconstructionSectionBundleKeys), "scan summary should record top family reconstruction section bundle keys");
  assert.ok(typeof scanSummary.rawPayloadBlockedCaptureTargetCount === "number", "scan summary should record raw-payload-blocked target counts");
  assert.ok(typeof scanSummary.rawPayloadBlockedFamilyCount === "number", "scan summary should record raw-payload-blocked family counts");
  assert.ok(Array.isArray(scanSummary.rawPayloadBlockedFamilyNames), "scan summary should record raw-payload-blocked family names");
  assert.ok(typeof scanSummary.sectionSkinMaterialReviewBundleCount === "number", "scan summary should record section skin material review bundle counts");
  assert.ok(Array.isArray(scanSummary.topSectionSkinMaterialReviewBundleKeys), "scan summary should record top section skin material review bundle keys");
  assert.ok(typeof scanSummary.sectionSkinPageMatchBundleCount === "number", "scan summary should record section skin page match bundle counts");
  assert.ok(Array.isArray(scanSummary.topSectionSkinPageMatchBundleKeys), "scan summary should record top section skin page match bundle keys");
  assert.ok(typeof scanSummary.sectionSkinTextureSourcePlanCount === "number", "scan summary should record section skin texture source plan counts");
  assert.ok(Array.isArray(scanSummary.topSectionSkinTextureSourcePlanKeys), "scan summary should record top section skin texture source plan keys");
  assert.ok(typeof scanSummary.sectionSkinTextureReconstructionBundleCount === "number", "scan summary should record section skin texture reconstruction bundle counts");
  assert.ok(Array.isArray(scanSummary.topSectionSkinTextureReconstructionBundleKeys), "scan summary should record top section skin texture reconstruction bundle keys");
  assert.ok(typeof scanSummary.sectionSkinPageLockBundleCount === "number", "scan summary should record section skin page lock bundle counts");
  assert.ok(Array.isArray(scanSummary.topSectionSkinPageLockBundleKeys), "scan summary should record top section skin page lock bundle keys");
  assert.ok(typeof scanSummary.sectionSkinPageLockAuditBundleCount === "number", "scan summary should record section skin page lock audit bundle counts");
  assert.ok(Array.isArray(scanSummary.topSectionSkinPageLockAuditBundleKeys), "scan summary should record top section skin page lock audit bundle keys");
  assert.ok(typeof scanSummary.sectionSkinPageLockResolutionBundleCount === "number", "scan summary should record section skin page lock resolution bundle counts");
  assert.ok(Array.isArray(scanSummary.topSectionSkinPageLockResolutionBundleKeys), "scan summary should record section skin page lock resolution bundle keys");
  assert.ok(typeof scanSummary.sectionSkinPageLockDecisionBundleCount === "number", "scan summary should record section skin page lock decision bundle counts");
  assert.ok(Array.isArray(scanSummary.topSectionSkinPageLockDecisionBundleKeys), "scan summary should record section skin page lock decision bundle keys");
  assert.ok(typeof scanSummary.sectionSkinPageLockReviewBundleCount === "number", "scan summary should record section skin page lock review bundle counts");
  assert.ok(Array.isArray(scanSummary.topSectionSkinPageLockReviewBundleKeys), "scan summary should record section skin page lock review bundle keys");
  assert.ok(typeof scanSummary.sectionSkinPageLockApprovalBundleCount === "number", "scan summary should record section skin page lock approval bundle counts");
  assert.ok(Array.isArray(scanSummary.topSectionSkinPageLockApprovalBundleKeys), "scan summary should record section skin page lock approval bundle keys");
  assert.ok(typeof scanSummary.sectionSkinPageLockApplyBundleCount === "number", "scan summary should record section skin page lock apply bundle counts");
  assert.ok(Array.isArray(scanSummary.topSectionSkinPageLockApplyBundleKeys), "scan summary should record section skin page lock apply bundle keys");
  assert.ok(typeof scanSummary.sectionSkinTextureLockBundleCount === "number", "scan summary should record section skin texture lock bundle counts");
  assert.ok(Array.isArray(scanSummary.topSectionSkinTextureLockBundleKeys), "scan summary should record section skin texture lock bundle keys");
  assert.ok(typeof scanSummary.sectionSkinTextureAssemblyBundleCount === "number", "scan summary should record section skin texture assembly bundle counts");
  assert.ok(Array.isArray(scanSummary.topSectionSkinTextureAssemblyBundleKeys), "scan summary should record section skin texture assembly bundle keys");
  assert.ok(typeof scanSummary.sectionSkinTextureInputBundleCount === "number", "scan summary should record section skin texture input bundle counts");
  assert.ok(Array.isArray(scanSummary.topSectionSkinTextureInputBundleKeys), "scan summary should record top section skin texture input bundle keys");
  assert.ok(typeof scanSummary.nextCaptureTargetCount === "number", "scan summary should record next capture target count");
  assert.ok(typeof scanSummary.nextOperatorAction === "string" && scanSummary.nextOperatorAction.length > 0, "scan summary should record the next operator action");

  const blockerSummary = await readOptionalTextFile(paths.blockerSummaryPath);
  assert.ok(blockerSummary && blockerSummary.includes("Next operator step"), "blocker summary should explain the next operator step");
  const hasSectionReconstructionProfiles = await fileExists(paths.sectionReconstructionProfilesPath);
  let sectionReconstructionProfilesCount: number | null = null;
  let topSectionReconstructionKeys: string[] = [];
  if (hasSectionReconstructionProfiles) {
    const sectionReconstructionProfiles = await readJsonFile<{
      sectionCount?: number;
      sections?: Array<{ sectionKey?: string }>;
    }>(paths.sectionReconstructionProfilesPath);
    assert.ok(typeof sectionReconstructionProfiles.sectionCount === "number", "section reconstruction profiles should record section counts");
    sectionReconstructionProfilesCount = sectionReconstructionProfiles.sectionCount ?? 0;
    topSectionReconstructionKeys = Array.isArray(sectionReconstructionProfiles.sections)
      ? sectionReconstructionProfiles.sections
          .map((section) => typeof section?.sectionKey === "string" ? section.sectionKey : "")
          .filter((value) => value.length > 0)
          .slice(0, 6)
      : [];
  }
  const hasSectionSkinBlueprintProfiles = await fileExists(paths.sectionSkinBlueprintProfilesPath);
  let sectionSkinBlueprintProfilesCount: number | null = null;
  let topSectionSkinBlueprintKeys: string[] = [];
  if (hasSectionSkinBlueprintProfiles) {
    const sectionSkinBlueprintProfiles = await readJsonFile<{
      sectionCount?: number;
      sections?: Array<{ sectionKey?: string }>;
    }>(paths.sectionSkinBlueprintProfilesPath);
    assert.ok(typeof sectionSkinBlueprintProfiles.sectionCount === "number", "section skin blueprint profiles should record section counts");
    sectionSkinBlueprintProfilesCount = sectionSkinBlueprintProfiles.sectionCount ?? 0;
    topSectionSkinBlueprintKeys = Array.isArray(sectionSkinBlueprintProfiles.sections)
      ? sectionSkinBlueprintProfiles.sections
          .map((section) => typeof section?.sectionKey === "string" ? section.sectionKey : "")
          .filter((value) => value.length > 0)
          .slice(0, 6)
      : [];
  }
  const hasSectionSkinRenderPlanProfiles = await fileExists(paths.sectionSkinRenderPlanProfilesPath);
  let sectionSkinRenderPlanProfilesCount: number | null = null;
  let topSectionSkinRenderPlanKeys: string[] = [];
  if (hasSectionSkinRenderPlanProfiles) {
    const sectionSkinRenderPlanProfiles = await readJsonFile<{
      sectionCount?: number;
      sections?: Array<{ sectionKey?: string }>;
    }>(paths.sectionSkinRenderPlanProfilesPath);
    assert.ok(typeof sectionSkinRenderPlanProfiles.sectionCount === "number", "section skin render plan profiles should record section counts");
    sectionSkinRenderPlanProfilesCount = sectionSkinRenderPlanProfiles.sectionCount ?? 0;
    topSectionSkinRenderPlanKeys = Array.isArray(sectionSkinRenderPlanProfiles.sections)
      ? sectionSkinRenderPlanProfiles.sections
          .map((section) => typeof section?.sectionKey === "string" ? section.sectionKey : "")
          .filter((value) => value.length > 0)
          .slice(0, 6)
      : [];
  }
  const hasSectionSkinMaterialPlanProfiles = await fileExists(paths.sectionSkinMaterialPlanProfilesPath);
  let sectionSkinMaterialPlanProfilesCount: number | null = null;
  let topSectionSkinMaterialPlanKeys: string[] = [];
  if (hasSectionSkinMaterialPlanProfiles) {
    const sectionSkinMaterialPlanProfiles = await readJsonFile<{
      sectionCount?: number;
      sections?: Array<{ sectionKey?: string }>;
    }>(paths.sectionSkinMaterialPlanProfilesPath);
    assert.ok(typeof sectionSkinMaterialPlanProfiles.sectionCount === "number", "section skin material plan profiles should record section counts");
    sectionSkinMaterialPlanProfilesCount = sectionSkinMaterialPlanProfiles.sectionCount ?? 0;
    topSectionSkinMaterialPlanKeys = Array.isArray(sectionSkinMaterialPlanProfiles.sections)
      ? sectionSkinMaterialPlanProfiles.sections
          .map((section) => typeof section?.sectionKey === "string" ? section.sectionKey : "")
          .filter((value) => value.length > 0)
          .slice(0, 6)
      : [];
  }
  const hasSectionSkinMaterialReviewBundleProfiles = await fileExists(paths.sectionSkinMaterialReviewBundleProfilesPath);
  let sectionSkinMaterialReviewBundleProfilesCount: number | null = null;
  let topSectionSkinMaterialReviewBundleKeys: string[] = [];
  if (hasSectionSkinMaterialReviewBundleProfiles) {
    const sectionSkinMaterialReviewBundleProfiles = await readJsonFile<{
      sectionCount?: number;
      sections?: Array<{ sectionKey?: string }>;
    }>(paths.sectionSkinMaterialReviewBundleProfilesPath);
    assert.ok(typeof sectionSkinMaterialReviewBundleProfiles.sectionCount === "number", "section skin material review bundle profiles should record section counts");
    sectionSkinMaterialReviewBundleProfilesCount = sectionSkinMaterialReviewBundleProfiles.sectionCount ?? 0;
    topSectionSkinMaterialReviewBundleKeys = Array.isArray(sectionSkinMaterialReviewBundleProfiles.sections)
      ? sectionSkinMaterialReviewBundleProfiles.sections
          .map((section) => typeof section?.sectionKey === "string" ? section.sectionKey : "")
          .filter((value) => value.length > 0)
          .slice(0, 6)
      : [];
  }
  const hasSectionSkinPageMatchBundleProfiles = await fileExists(paths.sectionSkinPageMatchBundleProfilesPath);
  let sectionSkinPageMatchBundleProfilesCount: number | null = null;
  let topSectionSkinPageMatchBundleKeys: string[] = [];
  if (hasSectionSkinPageMatchBundleProfiles) {
    const sectionSkinPageMatchBundleProfiles = await readJsonFile<{
      sectionCount?: number;
      sections?: Array<{ sectionKey?: string }>;
    }>(paths.sectionSkinPageMatchBundleProfilesPath);
    assert.ok(typeof sectionSkinPageMatchBundleProfiles.sectionCount === "number", "section skin page match bundle profiles should record section counts");
    sectionSkinPageMatchBundleProfilesCount = sectionSkinPageMatchBundleProfiles.sectionCount ?? 0;
    topSectionSkinPageMatchBundleKeys = Array.isArray(sectionSkinPageMatchBundleProfiles.sections)
      ? sectionSkinPageMatchBundleProfiles.sections
          .map((section) => typeof section?.sectionKey === "string" ? section.sectionKey : "")
          .filter((value) => value.length > 0)
          .slice(0, 6)
      : [];
  }
  const hasSectionSkinTextureSourcePlanProfiles = await fileExists(paths.sectionSkinTextureSourcePlanProfilesPath);
  let sectionSkinTextureSourcePlanProfilesCount: number | null = null;
  let topSectionSkinTextureSourcePlanKeys: string[] = [];
  if (hasSectionSkinTextureSourcePlanProfiles) {
    const sectionSkinTextureSourcePlanProfiles = await readJsonFile<{
      sectionCount?: number;
      sections?: Array<{ sectionKey?: string }>;
    }>(paths.sectionSkinTextureSourcePlanProfilesPath);
    assert.ok(typeof sectionSkinTextureSourcePlanProfiles.sectionCount === "number", "section skin texture source plan profiles should record section counts");
    sectionSkinTextureSourcePlanProfilesCount = sectionSkinTextureSourcePlanProfiles.sectionCount ?? 0;
    topSectionSkinTextureSourcePlanKeys = Array.isArray(sectionSkinTextureSourcePlanProfiles.sections)
      ? sectionSkinTextureSourcePlanProfiles.sections
          .map((section) => typeof section?.sectionKey === "string" ? section.sectionKey : "")
          .filter((value) => value.length > 0)
          .slice(0, 6)
      : [];
  }
  const hasSectionSkinTextureReconstructionBundleProfiles = await fileExists(paths.sectionSkinTextureReconstructionBundleProfilesPath);
  let sectionSkinTextureReconstructionBundleProfilesCount: number | null = null;
  let topSectionSkinTextureReconstructionBundleKeys: string[] = [];
  if (hasSectionSkinTextureReconstructionBundleProfiles) {
    const sectionSkinTextureReconstructionBundleProfiles = await readJsonFile<{
      sectionCount?: number;
      sections?: Array<{ sectionKey?: string }>;
    }>(paths.sectionSkinTextureReconstructionBundleProfilesPath);
    assert.ok(typeof sectionSkinTextureReconstructionBundleProfiles.sectionCount === "number", "section skin texture reconstruction bundle profiles should record section counts");
    sectionSkinTextureReconstructionBundleProfilesCount = sectionSkinTextureReconstructionBundleProfiles.sectionCount ?? 0;
    topSectionSkinTextureReconstructionBundleKeys = Array.isArray(sectionSkinTextureReconstructionBundleProfiles.sections)
      ? sectionSkinTextureReconstructionBundleProfiles.sections
          .map((section) => typeof section?.sectionKey === "string" ? section.sectionKey : "")
          .filter((value) => value.length > 0)
          .slice(0, 6)
      : [];
  }
  const hasSectionSkinPageLockBundleProfiles = await fileExists(paths.sectionSkinPageLockBundleProfilesPath);
  let sectionSkinPageLockBundleProfilesCount: number | null = null;
  let topSectionSkinPageLockBundleKeys: string[] = [];
  if (hasSectionSkinPageLockBundleProfiles) {
    const sectionSkinPageLockBundleProfiles = await readJsonFile<{
      sectionCount?: number;
      sections?: Array<{ sectionKey?: string }>;
    }>(paths.sectionSkinPageLockBundleProfilesPath);
    assert.ok(typeof sectionSkinPageLockBundleProfiles.sectionCount === "number", "section skin page lock bundle profiles should record section counts");
    sectionSkinPageLockBundleProfilesCount = sectionSkinPageLockBundleProfiles.sectionCount ?? 0;
    topSectionSkinPageLockBundleKeys = Array.isArray(sectionSkinPageLockBundleProfiles.sections)
      ? sectionSkinPageLockBundleProfiles.sections
          .map((section) => typeof section?.sectionKey === "string" ? section.sectionKey : "")
          .filter((value) => value.length > 0)
          .slice(0, 6)
      : [];
  }
  const hasSectionSkinTextureInputBundleProfiles = await fileExists(paths.sectionSkinTextureInputBundleProfilesPath);
  let sectionSkinTextureInputBundleProfilesCount: number | null = null;
  let topSectionSkinTextureInputBundleKeys: string[] = [];
  if (hasSectionSkinTextureInputBundleProfiles) {
    const sectionSkinTextureInputBundleProfiles = await readJsonFile<{
      sectionCount?: number;
      sections?: Array<{ sectionKey?: string }>;
    }>(paths.sectionSkinTextureInputBundleProfilesPath);
    assert.ok(typeof sectionSkinTextureInputBundleProfiles.sectionCount === "number", "section skin texture input bundle profiles should record section counts");
    sectionSkinTextureInputBundleProfilesCount = sectionSkinTextureInputBundleProfiles.sectionCount ?? 0;
    topSectionSkinTextureInputBundleKeys = Array.isArray(sectionSkinTextureInputBundleProfiles.sections)
      ? sectionSkinTextureInputBundleProfiles.sections
          .map((section) => typeof section?.sectionKey === "string" ? section.sectionKey : "")
          .filter((value) => value.length > 0)
          .slice(0, 6)
      : [];
  }
  const hasSectionSkinPageLockAuditBundleProfiles = await fileExists(paths.sectionSkinPageLockAuditBundleProfilesPath);
  let sectionSkinPageLockAuditBundleProfilesCount: number | null = null;
  let topSectionSkinPageLockAuditBundleKeys: string[] = [];
  if (hasSectionSkinPageLockAuditBundleProfiles) {
    const sectionSkinPageLockAuditBundleProfiles = await readJsonFile<{
      sectionCount?: number;
      sections?: Array<{ sectionKey?: string }>;
    }>(paths.sectionSkinPageLockAuditBundleProfilesPath);
    assert.ok(typeof sectionSkinPageLockAuditBundleProfiles.sectionCount === "number", "section skin page lock audit bundle profiles should record section counts");
    sectionSkinPageLockAuditBundleProfilesCount = sectionSkinPageLockAuditBundleProfiles.sectionCount ?? 0;
    topSectionSkinPageLockAuditBundleKeys = Array.isArray(sectionSkinPageLockAuditBundleProfiles.sections)
      ? sectionSkinPageLockAuditBundleProfiles.sections
          .map((section) => typeof section?.sectionKey === "string" ? section.sectionKey : "")
          .filter((value) => value.length > 0)
          .slice(0, 6)
      : [];
  }
  const hasSectionSkinPageLockResolutionBundleProfiles = await fileExists(paths.sectionSkinPageLockResolutionBundleProfilesPath);
  let sectionSkinPageLockResolutionBundleProfilesCount: number | null = null;
  let topSectionSkinPageLockResolutionBundleKeys: string[] = [];
  if (hasSectionSkinPageLockResolutionBundleProfiles) {
    const sectionSkinPageLockResolutionBundleProfiles = await readJsonFile<{
      sectionCount?: number;
      sections?: Array<{ sectionKey?: string }>;
    }>(paths.sectionSkinPageLockResolutionBundleProfilesPath);
    assert.ok(typeof sectionSkinPageLockResolutionBundleProfiles.sectionCount === "number", "section skin page lock resolution bundle profiles should record section counts");
    sectionSkinPageLockResolutionBundleProfilesCount = sectionSkinPageLockResolutionBundleProfiles.sectionCount ?? 0;
    topSectionSkinPageLockResolutionBundleKeys = Array.isArray(sectionSkinPageLockResolutionBundleProfiles.sections)
      ? sectionSkinPageLockResolutionBundleProfiles.sections
          .map((section) => typeof section?.sectionKey === "string" ? section.sectionKey : "")
          .filter((value) => value.length > 0)
          .slice(0, 6)
      : [];
  }
  const hasSectionSkinPageLockDecisionBundleProfiles = await fileExists(paths.sectionSkinPageLockDecisionBundleProfilesPath);
  let sectionSkinPageLockDecisionBundleProfilesCount: number | null = null;
  let topSectionSkinPageLockDecisionBundleKeys: string[] = [];
  if (hasSectionSkinPageLockDecisionBundleProfiles) {
    const sectionSkinPageLockDecisionBundleProfiles = await readJsonFile<{
      sectionCount?: number;
      sections?: Array<{ sectionKey?: string }>;
    }>(paths.sectionSkinPageLockDecisionBundleProfilesPath);
    assert.ok(typeof sectionSkinPageLockDecisionBundleProfiles.sectionCount === "number", "section skin page lock decision bundle profiles should record section counts");
    sectionSkinPageLockDecisionBundleProfilesCount = sectionSkinPageLockDecisionBundleProfiles.sectionCount ?? 0;
    topSectionSkinPageLockDecisionBundleKeys = Array.isArray(sectionSkinPageLockDecisionBundleProfiles.sections)
      ? sectionSkinPageLockDecisionBundleProfiles.sections
          .map((section) => typeof section?.sectionKey === "string" ? section.sectionKey : "")
          .filter((value) => value.length > 0)
          .slice(0, 6)
      : [];
  }
  const hasSectionSkinPageLockReviewBundleProfiles = await fileExists(paths.sectionSkinPageLockReviewBundleProfilesPath);
  let sectionSkinPageLockReviewBundleProfilesCount: number | null = null;
  let topSectionSkinPageLockReviewBundleKeys: string[] = [];
  if (hasSectionSkinPageLockReviewBundleProfiles) {
    const sectionSkinPageLockReviewBundleProfiles = await readJsonFile<{
      sectionCount?: number;
      sections?: Array<{ sectionKey?: string }>;
    }>(paths.sectionSkinPageLockReviewBundleProfilesPath);
    assert.ok(typeof sectionSkinPageLockReviewBundleProfiles.sectionCount === "number", "section skin page lock review bundle profiles should record section counts");
    sectionSkinPageLockReviewBundleProfilesCount = sectionSkinPageLockReviewBundleProfiles.sectionCount ?? 0;
    topSectionSkinPageLockReviewBundleKeys = Array.isArray(sectionSkinPageLockReviewBundleProfiles.sections)
      ? sectionSkinPageLockReviewBundleProfiles.sections
          .map((section) => typeof section?.sectionKey === "string" ? section.sectionKey : "")
          .filter((value) => value.length > 0)
          .slice(0, 6)
      : [];
  }
  const hasSectionSkinPageLockApprovalBundleProfiles = await fileExists(paths.sectionSkinPageLockApprovalBundleProfilesPath);
  let sectionSkinPageLockApprovalBundleProfilesCount: number | null = null;
  let topSectionSkinPageLockApprovalBundleKeys: string[] = [];
  if (hasSectionSkinPageLockApprovalBundleProfiles) {
    const sectionSkinPageLockApprovalBundleProfiles = await readJsonFile<{
      sectionCount?: number;
      sections?: Array<{ sectionKey?: string }>;
    }>(paths.sectionSkinPageLockApprovalBundleProfilesPath);
    assert.ok(typeof sectionSkinPageLockApprovalBundleProfiles.sectionCount === "number", "section skin page lock approval bundle profiles should record section counts");
    sectionSkinPageLockApprovalBundleProfilesCount = sectionSkinPageLockApprovalBundleProfiles.sectionCount ?? 0;
    topSectionSkinPageLockApprovalBundleKeys = Array.isArray(sectionSkinPageLockApprovalBundleProfiles.sections)
      ? sectionSkinPageLockApprovalBundleProfiles.sections
          .map((section) => typeof section?.sectionKey === "string" ? section.sectionKey : "")
          .filter((value) => value.length > 0)
          .slice(0, 6)
      : [];
  }
  const hasSectionSkinPageLockApplyBundleProfiles = await fileExists(paths.sectionSkinPageLockApplyBundleProfilesPath);
  let sectionSkinPageLockApplyBundleProfilesCount: number | null = null;
  let topSectionSkinPageLockApplyBundleKeys: string[] = [];
  if (hasSectionSkinPageLockApplyBundleProfiles) {
    const sectionSkinPageLockApplyBundleProfiles = await readJsonFile<{
      sectionCount?: number;
      sections?: Array<{ sectionKey?: string }>;
    }>(paths.sectionSkinPageLockApplyBundleProfilesPath);
    assert.ok(typeof sectionSkinPageLockApplyBundleProfiles.sectionCount === "number", "section skin page lock apply bundle profiles should record section counts");
    sectionSkinPageLockApplyBundleProfilesCount = sectionSkinPageLockApplyBundleProfiles.sectionCount ?? 0;
    topSectionSkinPageLockApplyBundleKeys = Array.isArray(sectionSkinPageLockApplyBundleProfiles.sections)
      ? sectionSkinPageLockApplyBundleProfiles.sections
          .map((section) => typeof section?.sectionKey === "string" ? section.sectionKey : "")
          .filter((value) => value.length > 0)
          .slice(0, 6)
      : [];
  }
  const hasSectionSkinTextureLockBundleProfiles = await fileExists(paths.sectionSkinTextureLockBundleProfilesPath);
  let sectionSkinTextureLockBundleProfilesCount: number | null = null;
  let topSectionSkinTextureLockBundleKeys: string[] = [];
  if (hasSectionSkinTextureLockBundleProfiles) {
    const sectionSkinTextureLockBundleProfiles = await readJsonFile<{
      sectionCount?: number;
      sections?: Array<{ sectionKey?: string }>;
    }>(paths.sectionSkinTextureLockBundleProfilesPath);
    assert.ok(typeof sectionSkinTextureLockBundleProfiles.sectionCount === "number", "section skin texture lock bundle profiles should record section counts");
    sectionSkinTextureLockBundleProfilesCount = sectionSkinTextureLockBundleProfiles.sectionCount ?? 0;
    topSectionSkinTextureLockBundleKeys = Array.isArray(sectionSkinTextureLockBundleProfiles.sections)
      ? sectionSkinTextureLockBundleProfiles.sections
          .map((section) => typeof section?.sectionKey === "string" ? section.sectionKey : "")
          .filter((value) => value.length > 0)
          .slice(0, 6)
      : [];
  }
  const hasSectionSkinTextureAssemblyBundleProfiles = await fileExists(paths.sectionSkinTextureAssemblyBundleProfilesPath);
  let sectionSkinTextureAssemblyBundleProfilesCount: number | null = null;
  let topSectionSkinTextureAssemblyBundleKeys: string[] = [];
  if (hasSectionSkinTextureAssemblyBundleProfiles) {
    const sectionSkinTextureAssemblyBundleProfiles = await readJsonFile<{
      sectionCount?: number;
      sections?: Array<{ sectionKey?: string }>;
    }>(paths.sectionSkinTextureAssemblyBundleProfilesPath);
    assert.ok(typeof sectionSkinTextureAssemblyBundleProfiles.sectionCount === "number", "section skin texture assembly bundle profiles should record section counts");
    sectionSkinTextureAssemblyBundleProfilesCount = sectionSkinTextureAssemblyBundleProfiles.sectionCount ?? 0;
    topSectionSkinTextureAssemblyBundleKeys = Array.isArray(sectionSkinTextureAssemblyBundleProfiles.sections)
      ? sectionSkinTextureAssemblyBundleProfiles.sections
          .map((section) => typeof section?.sectionKey === "string" ? section.sectionKey : "")
          .filter((value) => value.length > 0)
          .slice(0, 6)
      : [];
  }

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
  console.log(`Family reconstruction maps: ${scanSummary.familyReconstructionMapCount} (${scanSummary.topFamilyReconstructionMapNames.join(", ")})`);
  console.log(`Family reconstruction sections: ${scanSummary.familyReconstructionSectionCount} (${scanSummary.topFamilyReconstructionSectionKeys.join(", ")})`);
  console.log(`Family reconstruction section bundles: ${scanSummary.familyReconstructionSectionBundleCount} (${scanSummary.topFamilyReconstructionSectionBundleKeys.join(", ")})`);
  if (sectionReconstructionProfilesCount !== null) {
    console.log(`Section reconstruction profiles: ${sectionReconstructionProfilesCount} (${topSectionReconstructionKeys.join(", ")})`);
  }
  if (sectionSkinBlueprintProfilesCount !== null) {
    console.log(`Section skin blueprint profiles: ${sectionSkinBlueprintProfilesCount} (${topSectionSkinBlueprintKeys.join(", ")})`);
  }
  if (sectionSkinRenderPlanProfilesCount !== null) {
    console.log(`Section skin render plan profiles: ${sectionSkinRenderPlanProfilesCount} (${topSectionSkinRenderPlanKeys.join(", ")})`);
  }
  if (sectionSkinMaterialPlanProfilesCount !== null) {
    console.log(`Section skin material plan profiles: ${sectionSkinMaterialPlanProfilesCount} (${topSectionSkinMaterialPlanKeys.join(", ")})`);
  }
  if (sectionSkinMaterialReviewBundleProfilesCount !== null) {
    console.log(`Section skin material review bundle profiles: ${sectionSkinMaterialReviewBundleProfilesCount} (${topSectionSkinMaterialReviewBundleKeys.join(", ")})`);
  }
  if (sectionSkinPageMatchBundleProfilesCount !== null) {
    console.log(`Section skin page match bundle profiles: ${sectionSkinPageMatchBundleProfilesCount} (${topSectionSkinPageMatchBundleKeys.join(", ")})`);
  }
  if (sectionSkinTextureSourcePlanProfilesCount !== null) {
    console.log(`Section skin texture source plan profiles: ${sectionSkinTextureSourcePlanProfilesCount} (${topSectionSkinTextureSourcePlanKeys.join(", ")})`);
  }
  if (sectionSkinTextureReconstructionBundleProfilesCount !== null) {
    console.log(`Section skin texture reconstruction bundle profiles: ${sectionSkinTextureReconstructionBundleProfilesCount} (${topSectionSkinTextureReconstructionBundleKeys.join(", ")})`);
  }
  if (sectionSkinPageLockBundleProfilesCount !== null) {
    console.log(`Section skin page lock bundle profiles: ${sectionSkinPageLockBundleProfilesCount} (${topSectionSkinPageLockBundleKeys.join(", ")})`);
  }
  if (sectionSkinPageLockAuditBundleProfilesCount !== null) {
    console.log(`Section skin page lock audit bundle profiles: ${sectionSkinPageLockAuditBundleProfilesCount} (${topSectionSkinPageLockAuditBundleKeys.join(", ")})`);
  }
  if (sectionSkinPageLockResolutionBundleProfilesCount !== null) {
    console.log(`Section skin page lock resolution bundle profiles: ${sectionSkinPageLockResolutionBundleProfilesCount} (${topSectionSkinPageLockResolutionBundleKeys.join(", ")})`);
  }
  if (sectionSkinPageLockDecisionBundleProfilesCount !== null) {
    console.log(`Section skin page lock decision bundle profiles: ${sectionSkinPageLockDecisionBundleProfilesCount} (${topSectionSkinPageLockDecisionBundleKeys.join(", ")})`);
  }
  if (sectionSkinPageLockReviewBundleProfilesCount !== null) {
    console.log(`Section skin page lock review bundle profiles: ${sectionSkinPageLockReviewBundleProfilesCount} (${topSectionSkinPageLockReviewBundleKeys.join(", ")})`);
  }
  if (sectionSkinPageLockApprovalBundleProfilesCount !== null) {
    console.log(`Section skin page lock approval bundle profiles: ${sectionSkinPageLockApprovalBundleProfilesCount} (${topSectionSkinPageLockApprovalBundleKeys.join(", ")})`);
  }
  if (sectionSkinPageLockApplyBundleProfilesCount !== null) {
    console.log(`Section skin page lock apply bundle profiles: ${sectionSkinPageLockApplyBundleProfilesCount} (${topSectionSkinPageLockApplyBundleKeys.join(", ")})`);
  }
  if (sectionSkinTextureLockBundleProfilesCount !== null) {
    console.log(`Section skin texture lock bundle profiles: ${sectionSkinTextureLockBundleProfilesCount} (${topSectionSkinTextureLockBundleKeys.join(", ")})`);
  }
  if (sectionSkinTextureAssemblyBundleProfilesCount !== null) {
    console.log(`Section skin texture assembly bundle profiles: ${sectionSkinTextureAssemblyBundleProfilesCount} (${topSectionSkinTextureAssemblyBundleKeys.join(", ")})`);
  }
  if (sectionSkinTextureInputBundleProfilesCount !== null) {
    console.log(`Section skin texture input bundle profiles: ${sectionSkinTextureInputBundleProfilesCount} (${topSectionSkinTextureInputBundleKeys.join(", ")})`);
  }
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
