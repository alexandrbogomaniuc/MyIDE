import path from "node:path";
import { buildFamilyReconstructionBundle } from "./buildFamilyReconstructionBundle";
import { captureNextTargets } from "./captureNextTargets";
import { summarizeFamilyReconstructionProfiles } from "./summarizeFamilyReconstructionProfiles";
import { summarizeFamilyReconstructionMaps } from "./summarizeFamilyReconstructionMaps";
import { summarizeFamilyReconstructionSections } from "./summarizeFamilyReconstructionSections";
import { summarizeFamilyReconstructionSectionBundles } from "./summarizeFamilyReconstructionSectionBundles";
import {
  type BundleAssetMapFile,
  type CaptureFamilyActionClass,
  type CaptureFamilyActionsFile,
  type CaptureFamilyActionRecord,
  type CaptureFamilySourceProfileRecord,
  type CaptureFamilySourceProfilesFile,
  type FamilyActionRunFile,
  type FamilyActionRunMode,
  type FamilyActionRunStatus,
  type FamilyActionWorksetFile,
  type HarvestManifestFile,
  buildDonorScanPaths,
  readOptionalJsonFile,
  toRepoRelativePath,
  uniqueStrings,
  writeJsonFile
} from "./shared";

interface RunFamilyActionOptions {
  donorId: string;
  family: string;
  limit?: number;
}

export interface RunFamilyActionResult {
  donorId: string;
  donorName: string;
  familyName: string;
  actionClass: CaptureFamilyActionClass;
  requestedMode: FamilyActionRunMode;
  status: FamilyActionRunStatus;
  familyActionRunPath: string;
  worksetPath: string | null;
  reconstructionBundlePath: string | null;
  captureRunPath: string | null;
  preparedEvidenceCount: number;
  reconstructionLocalSourceCount: number;
  localSourceAssetCount: number;
  targetCount: number;
  blockedTargetCount: number;
  attemptedCount: number;
  downloadedCount: number;
  failedCount: number;
  skippedCount: number;
  nextOperatorAction: string;
}

function normalizeFamilyName(value: string): string {
  return value.trim().toLowerCase();
}

function sanitizeFamilySegment(value: string): string {
  const normalized = value.trim().replace(/[^a-z0-9._-]+/gi, "-").replace(/-+/g, "-");
  return normalized.length > 0 ? normalized : "family";
}

function readPreparedEvidenceCount(profile: CaptureFamilySourceProfileRecord | null): number {
  if (!profile) {
    return 0;
  }

  return uniqueStrings([
    ...profile.localSourceAssetPreview,
    ...profile.localPagePaths,
    ...profile.sameFamilyBundleReferencePreview,
    ...profile.sameFamilyVariantAssetPreview,
    ...profile.relatedBundleAssetHints,
    ...profile.relatedVariantAssetHints
  ]).length;
}

function buildPreparedWorkset(
  action: CaptureFamilyActionRecord,
  profile: CaptureFamilySourceProfileRecord | null,
  donorId: string,
  donorName: string,
  familyActionsPath: string,
  sourceProfilesPath: string
): FamilyActionWorksetFile {
  const preparedEvidenceCount = readPreparedEvidenceCount(profile);
  return {
    schemaVersion: "0.1.0",
    donorId,
    donorName,
    generatedAt: new Date().toISOString(),
    familyName: action.familyName,
    actionClass: action.actionClass,
    priority: action.priority,
    reason: action.reason,
    nextStep: action.nextStep,
    sampleEvidence: action.sampleEvidence,
    sourceState: profile?.sourceState ?? "unknown",
    targetCount: action.targetCount,
    blockedTargetCount: action.blockedTargetCount,
    localSourceAssetCount: action.localSourceAssetCount,
    localPageCount: action.localPageCount,
    atlasPageRefCount: action.atlasPageRefCount,
    sameFamilyBundleReferenceCount: action.sameFamilyBundleReferenceCount,
    sameFamilyVariantAssetCount: action.sameFamilyVariantAssetCount,
    localSourceAssetPreview: profile?.localSourceAssetPreview ?? [],
    localPagePaths: profile?.localPagePaths ?? [],
    sameFamilyBundleReferencePreview: profile?.sameFamilyBundleReferencePreview ?? [],
    sameFamilyVariantAssetPreview: profile?.sameFamilyVariantAssetPreview ?? [],
    relatedBundleAssetHints: profile?.relatedBundleAssetHints ?? [],
    relatedVariantAssetHints: profile?.relatedVariantAssetHints ?? [],
    sampleTargetUrls: profile?.sampleTargetUrls ?? [],
    topUntriedTargetUrls: profile?.topUntriedTargetUrls ?? [],
    topBlockedTargetUrls: profile?.topBlockedTargetUrls ?? [],
    rawPayloadBlockedReason: profile?.rawPayloadBlockedReason ?? null,
    preparedEvidenceCount,
    sourceProfilePath: toRepoRelativePath(sourceProfilesPath),
    familyActionsPath: toRepoRelativePath(familyActionsPath)
  };
}

function findFamilyAction(
  captureFamilyActions: CaptureFamilyActionsFile,
  family: string
): CaptureFamilyActionRecord | null {
  const normalizedFamily = normalizeFamilyName(family);
  return captureFamilyActions.families.find((entry) => normalizeFamilyName(entry.familyName) === normalizedFamily) ?? null;
}

function findFamilyProfile(
  captureFamilySourceProfiles: CaptureFamilySourceProfilesFile | null,
  family: string
): CaptureFamilySourceProfileRecord | null {
  if (!captureFamilySourceProfiles) {
    return null;
  }

  const normalizedFamily = normalizeFamilyName(family);
  return captureFamilySourceProfiles.families.find((entry) => normalizeFamilyName(entry.familyName) === normalizedFamily) ?? null;
}

function isCaptureAction(actionClass: CaptureFamilyActionClass): boolean {
  return actionClass === "capture-family-sources" || actionClass === "capture-missing-pages";
}

export async function runFamilyAction(options: RunFamilyActionOptions): Promise<RunFamilyActionResult> {
  const donorId = options.donorId.trim();
  const requestedFamily = options.family.trim();
  if (!donorId) {
    throw new Error("Missing donor id for family action.");
  }
  if (!requestedFamily) {
    throw new Error("Missing family name for family action.");
  }

  const limit = Number.isFinite(options.limit) && typeof options.limit === "number"
    ? Math.max(1, Math.floor(options.limit))
    : 10;
  const paths = buildDonorScanPaths(donorId);

  const captureFamilyActions = await readOptionalJsonFile<CaptureFamilyActionsFile>(paths.captureFamilyActionsPath);
  if (!captureFamilyActions) {
    throw new Error(`Missing donor family action queue: ${toRepoRelativePath(paths.captureFamilyActionsPath)}`);
  }

  const familyAction = findFamilyAction(captureFamilyActions, requestedFamily);
  if (!familyAction) {
    throw new Error(`Family ${requestedFamily} is not present in the donor family action queue.`);
  }

  const familyProfile = findFamilyProfile(
    await readOptionalJsonFile<CaptureFamilySourceProfilesFile>(paths.captureFamilySourceProfilesPath),
    familyAction.familyName
  );

  if (isCaptureAction(familyAction.actionClass)) {
    const requestedMode: FamilyActionRunMode = familyAction.actionClass === "capture-family-sources"
      ? "family-sources"
      : "ranked-targets";
    const capture = await captureNextTargets({
      donorId,
      family: familyAction.familyName,
      limit,
      mode: requestedMode === "family-sources" ? "family-sources" : "ranked-targets"
    });
    const familyActionRun: FamilyActionRunFile = {
      schemaVersion: "0.1.0",
      donorId,
      donorName: capture.donorName,
      generatedAt: new Date().toISOString(),
      familyName: familyAction.familyName,
      actionClass: familyAction.actionClass,
      requestedLimit: limit,
      requestedMode,
      status: capture.status,
      worksetPath: null,
      reconstructionBundlePath: null,
      captureRunPath: toRepoRelativePath(capture.captureRunPath),
      preparedEvidenceCount: 0,
      reconstructionLocalSourceCount: 0,
      localSourceAssetCount: familyAction.localSourceAssetCount,
      targetCount: familyAction.targetCount,
      blockedTargetCount: familyAction.blockedTargetCount,
      attemptedCount: capture.attemptedCount,
      downloadedCount: capture.downloadedCount,
      failedCount: capture.failedCount,
      skippedCount: capture.skippedCount,
      reason: familyAction.reason,
      nextStep: familyAction.nextStep,
      nextOperatorAction: capture.nextOperatorAction
    };
    await writeJsonFile(paths.familyActionRunPath, familyActionRun);
    return {
      donorId,
      donorName: capture.donorName,
      familyName: familyAction.familyName,
      actionClass: familyAction.actionClass,
      requestedMode,
      status: capture.status,
      familyActionRunPath: paths.familyActionRunPath,
      worksetPath: null,
      reconstructionBundlePath: null,
      captureRunPath: capture.captureRunPath,
      preparedEvidenceCount: 0,
      reconstructionLocalSourceCount: 0,
      localSourceAssetCount: familyAction.localSourceAssetCount,
      targetCount: familyAction.targetCount,
      blockedTargetCount: familyAction.blockedTargetCount,
      attemptedCount: capture.attemptedCount,
      downloadedCount: capture.downloadedCount,
      failedCount: capture.failedCount,
      skippedCount: capture.skippedCount,
      nextOperatorAction: capture.nextOperatorAction
    };
  }

  const workset = buildPreparedWorkset(
    familyAction,
    familyProfile,
    donorId,
    captureFamilyActions.donorName,
    paths.captureFamilyActionsPath,
    paths.captureFamilySourceProfilesPath
  );
  const worksetPath = path.join(paths.familyActionWorksetsRoot, `${sanitizeFamilySegment(familyAction.familyName)}.json`);
  await writeJsonFile(worksetPath, workset);
  const harvestManifest = await readOptionalJsonFile<HarvestManifestFile>(paths.assetManifestPath) ?? { entries: [] };
  const bundleAssetMap = await readOptionalJsonFile<BundleAssetMapFile>(paths.bundleAssetMapPath) ?? {
    schemaVersion: "0.1.0",
    donorId,
    donorName: captureFamilyActions.donorName,
    generatedAt: new Date().toISOString(),
    status: "skipped",
    bundleCount: 0,
    referenceCount: 0,
    imageVariantStatus: "skipped",
    imageVariantEntryCount: 0,
    imageVariantSuffixCount: 0,
    imageVariantUrlBuilderStatus: "skipped",
    imageVariantUrlCount: 0,
    imageVariantFieldCounts: {},
    translationPayloadStatus: "skipped",
    translationPayloadCount: 0,
    translationLocaleHintCount: 0,
    countsByConfidence: { confirmed: 0, likely: 0, provisional: 0 },
    countsByCategory: {},
    bundles: [],
    imageVariants: [],
    translationPayloads: [],
    references: []
  };
  const reconstructionBundle = familyAction.actionClass === "use-local-sources"
    ? buildFamilyReconstructionBundle({
        donorId,
        donorName: captureFamilyActions.donorName,
        familyAction,
        familyProfile,
        harvestManifest,
        bundleAssetMap,
        worksetPath: toRepoRelativePath(worksetPath),
        familyActionsPath: toRepoRelativePath(paths.captureFamilyActionsPath),
        sourceProfilePath: toRepoRelativePath(paths.captureFamilySourceProfilesPath)
      })
    : null;
  const reconstructionBundlePath = reconstructionBundle
    ? path.join(paths.familyReconstructionBundlesRoot, `${sanitizeFamilySegment(familyAction.familyName)}.json`)
    : null;
  if (reconstructionBundle && reconstructionBundlePath) {
    await writeJsonFile(reconstructionBundlePath, reconstructionBundle);
    const familyReconstructionProfiles = await summarizeFamilyReconstructionProfiles({
      donorId,
      donorName: captureFamilyActions.donorName,
      bundlesRoot: paths.familyReconstructionBundlesRoot
    });
    await writeJsonFile(paths.familyReconstructionProfilesPath, familyReconstructionProfiles);
    const familyReconstructionMaps = await summarizeFamilyReconstructionMaps({
      donorId,
      donorName: captureFamilyActions.donorName,
      familyReconstructionProfiles
    });
    await writeJsonFile(paths.familyReconstructionMapsPath, familyReconstructionMaps);
    const familyReconstructionSections = summarizeFamilyReconstructionSections({
      donorId,
      donorName: captureFamilyActions.donorName,
      familyReconstructionMaps
    });
    await writeJsonFile(paths.familyReconstructionSectionsPath, familyReconstructionSections);
    const familyReconstructionSectionBundles = await summarizeFamilyReconstructionSectionBundles({
      donorId,
      donorName: captureFamilyActions.donorName,
      familyReconstructionMaps,
      familyReconstructionSections
    });
    await writeJsonFile(paths.familyReconstructionSectionBundlesPath, familyReconstructionSectionBundles);
  }

  const nextOperatorAction = `${familyAction.familyName}: ${familyAction.nextStep}`;
  const familyActionRun: FamilyActionRunFile = {
    schemaVersion: "0.1.0",
    donorId,
    donorName: captureFamilyActions.donorName,
    generatedAt: new Date().toISOString(),
    familyName: familyAction.familyName,
    actionClass: familyAction.actionClass,
    requestedLimit: limit,
    requestedMode: reconstructionBundle ? "prepare-reconstruction-bundle" : "prepare-workset",
    status: "prepared",
    worksetPath: toRepoRelativePath(worksetPath),
    reconstructionBundlePath: reconstructionBundlePath ? toRepoRelativePath(reconstructionBundlePath) : null,
    captureRunPath: null,
    preparedEvidenceCount: workset.preparedEvidenceCount,
    reconstructionLocalSourceCount: reconstructionBundle?.exactLocalSourceCount ?? 0,
    localSourceAssetCount: familyAction.localSourceAssetCount,
    targetCount: familyAction.targetCount,
    blockedTargetCount: familyAction.blockedTargetCount,
    attemptedCount: 0,
    downloadedCount: 0,
    failedCount: 0,
    skippedCount: 0,
    reason: familyAction.reason,
    nextStep: familyAction.nextStep,
    nextOperatorAction
  };
  await writeJsonFile(paths.familyActionRunPath, familyActionRun);

  return {
    donorId,
    donorName: captureFamilyActions.donorName,
    familyName: familyAction.familyName,
    actionClass: familyAction.actionClass,
    requestedMode: reconstructionBundle ? "prepare-reconstruction-bundle" : "prepare-workset",
    status: "prepared",
    familyActionRunPath: paths.familyActionRunPath,
    worksetPath,
    reconstructionBundlePath,
    captureRunPath: null,
    preparedEvidenceCount: workset.preparedEvidenceCount,
    reconstructionLocalSourceCount: reconstructionBundle?.exactLocalSourceCount ?? 0,
    localSourceAssetCount: familyAction.localSourceAssetCount,
    targetCount: familyAction.targetCount,
    blockedTargetCount: familyAction.blockedTargetCount,
    attemptedCount: 0,
    downloadedCount: 0,
    failedCount: 0,
    skippedCount: 0,
    nextOperatorAction
  };
}

function parseArgs(argv: readonly string[]): RunFamilyActionOptions {
  let donorId = "";
  let family = "";
  let limit: number | undefined;

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    const next = argv[index + 1];
    if (token === "--donor-id" && next) {
      donorId = next;
      index += 1;
      continue;
    }
    if (token === "--family" && next) {
      family = next;
      index += 1;
      continue;
    }
    if (token === "--limit" && next) {
      limit = Number.parseInt(next, 10);
      index += 1;
    }
  }

  if (!donorId) {
    throw new Error("Missing required --donor-id argument.");
  }
  if (!family) {
    throw new Error("Missing required --family argument.");
  }

  return { donorId, family, limit };
}

async function main(): Promise<void> {
  const result = await runFamilyAction(parseArgs(process.argv.slice(2)));
  console.log("PASS donor-scan:run-family-action");
  console.log(`Donor: ${result.donorId}`);
  console.log(`Family: ${result.familyName}`);
  console.log(`Action class: ${result.actionClass}`);
  console.log(`Mode: ${result.requestedMode}`);
  console.log(`Status: ${result.status}`);
  if (result.worksetPath) {
    console.log(`Prepared workset: ${toRepoRelativePath(result.worksetPath)}`);
    console.log(`Prepared evidence count: ${result.preparedEvidenceCount}`);
  }
  if (result.reconstructionBundlePath) {
    console.log(`Reconstruction bundle: ${toRepoRelativePath(result.reconstructionBundlePath)}`);
    console.log(`Reconstruction local sources: ${result.reconstructionLocalSourceCount}`);
  }
  if (result.captureRunPath) {
    console.log(`Capture summary: ${toRepoRelativePath(result.captureRunPath)}`);
    console.log(`Downloaded: ${result.downloadedCount}`);
    console.log(`Failed: ${result.failedCount}`);
  }
  console.log(`Family action run: ${toRepoRelativePath(result.familyActionRunPath)}`);
  console.log(`Next operator action: ${result.nextOperatorAction}`);
}

if (require.main === module) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`FAIL donor-scan:run-family-action - ${message}`);
    process.exitCode = 1;
  });
}
