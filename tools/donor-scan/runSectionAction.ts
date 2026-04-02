import path from "node:path";
import { buildSectionReconstructionBundle } from "./buildSectionReconstructionBundle";
import { buildSectionSkinBlueprint } from "./buildSectionSkinBlueprint";
import { buildSectionSkinRenderPlan } from "./buildSectionSkinRenderPlan";
import { summarizeSectionReconstructionProfiles } from "./summarizeSectionReconstructionProfiles";
import { summarizeSectionSkinBlueprintProfiles } from "./summarizeSectionSkinBlueprintProfiles";
import { summarizeSectionSkinRenderPlanProfiles } from "./summarizeSectionSkinRenderPlanProfiles";
import type {
  FamilyReconstructionSectionBundleRecord,
  FamilyReconstructionSectionBundlesFile,
  SectionActionRunFile,
  SectionReconstructionWorksetFile
} from "./shared";
import {
  buildDonorScanPaths,
  readOptionalJsonFile,
  toRepoRelativePath,
  writeJsonFile
} from "./shared";

interface RunSectionActionOptions {
  donorId: string;
  sectionKey: string;
}

export interface RunSectionActionResult {
  donorId: string;
  donorName: string;
  familyName: string;
  sectionKey: string;
  requestedMode: "prepare-section-workset" | "prepare-section-reconstruction-bundle";
  status: "prepared" | "blocked";
  sectionActionRunPath: string;
  sectionBundlePath: string;
  worksetPath: string | null;
  reconstructionBundlePath: string | null;
  skinBlueprintPath: string | null;
  skinRenderPlanPath: string | null;
  exactLocalSourceCount: number;
  attachmentCount: number;
  mappedAttachmentCount: number;
  unmappedAttachmentCount: number;
  nextOperatorAction: string;
}

function normalizeSectionKey(value: string): string {
  return value.trim().toLowerCase();
}

function sanitizeSectionSegment(value: string): string {
  const normalized = value.trim().replace(/[^a-z0-9._-]+/gi, "-").replace(/-+/g, "-");
  return normalized.length > 0 ? normalized : "section";
}

function findSectionBundle(
  sectionBundles: FamilyReconstructionSectionBundlesFile,
  requestedSectionKey: string
): FamilyReconstructionSectionBundleRecord | null {
  const normalizedRequested = normalizeSectionKey(requestedSectionKey);
  return sectionBundles.sections.find((section) => normalizeSectionKey(section.sectionKey) === normalizedRequested) ?? null;
}

function buildSectionWorkset(
  donorId: string,
  donorName: string,
  sectionBundle: FamilyReconstructionSectionBundleRecord,
  sectionBundlePath: string
): SectionReconstructionWorksetFile {
  return {
    schemaVersion: "0.1.0",
    donorId,
    donorName,
    generatedAt: new Date().toISOString(),
    familyName: sectionBundle.familyName,
    sectionKey: sectionBundle.sectionKey,
    sectionType: sectionBundle.sectionType,
    skinName: sectionBundle.skinName,
    bundleState: sectionBundle.bundleState,
    readiness: sectionBundle.readiness,
    profileState: sectionBundle.profileState,
    sectionState: sectionBundle.sectionState,
    attachmentCount: sectionBundle.attachmentCount,
    mappedAttachmentCount: sectionBundle.mappedAttachmentCount,
    unmappedAttachmentCount: sectionBundle.unmappedAttachmentCount,
    atlasPageCount: sectionBundle.atlasPageCount,
    atlasPageNames: sectionBundle.atlasPageNames,
    atlasRegionCount: sectionBundle.atlasRegionCount,
    atlasRegionNames: sectionBundle.atlasRegionNames,
    slotNames: sectionBundle.slotNames,
    animationNames: sectionBundle.animationNames,
    exactLocalSourceCount: sectionBundle.exactLocalSourceCount,
    relatedLocalSourceCount: sectionBundle.relatedLocalSourceCount,
    localSources: sectionBundle.localSources,
    sampleLocalSourcePath: sectionBundle.sampleLocalSourcePath,
    sectionBundlePath: toRepoRelativePath(sectionBundlePath),
    reconstructionBundlePath: sectionBundle.reconstructionBundlePath,
    nextSectionStep: sectionBundle.nextSectionStep,
    attachments: sectionBundle.attachments
  };
}

function buildBlockedResult(
  donorId: string,
  donorName: string,
  sectionBundle: FamilyReconstructionSectionBundleRecord,
  sectionBundlePath: string
): SectionActionRunFile {
  return {
    schemaVersion: "0.1.0",
    donorId,
    donorName,
    generatedAt: new Date().toISOString(),
    familyName: sectionBundle.familyName,
    sectionKey: sectionBundle.sectionKey,
    requestedMode: "prepare-section-workset",
    status: "blocked",
    sectionBundlePath: toRepoRelativePath(sectionBundlePath),
    worksetPath: null,
    reconstructionBundlePath: null,
    skinBlueprintPath: null,
    skinRenderPlanPath: null,
    exactLocalSourceCount: sectionBundle.exactLocalSourceCount,
    attachmentCount: sectionBundle.attachmentCount,
    mappedAttachmentCount: sectionBundle.mappedAttachmentCount,
    unmappedAttachmentCount: sectionBundle.unmappedAttachmentCount,
    nextOperatorAction: sectionBundle.nextSectionStep
  };
}

export async function runSectionAction(options: RunSectionActionOptions): Promise<RunSectionActionResult> {
  const donorId = options.donorId.trim();
  const requestedSectionKey = options.sectionKey.trim();
  if (!donorId) {
    throw new Error("Missing donor id for section action.");
  }
  if (!requestedSectionKey) {
    throw new Error("Missing section key for section action.");
  }

  const paths = buildDonorScanPaths(donorId);
  const sectionBundles = await readOptionalJsonFile<FamilyReconstructionSectionBundlesFile>(paths.familyReconstructionSectionBundlesPath);
  if (!sectionBundles) {
    throw new Error(`Missing donor reconstruction section bundles: ${toRepoRelativePath(paths.familyReconstructionSectionBundlesPath)}`);
  }

  const sectionBundle = findSectionBundle(sectionBundles, requestedSectionKey);
  if (!sectionBundle) {
    throw new Error(`Section ${requestedSectionKey} is not present in the donor reconstruction section bundle summary.`);
  }

  if (sectionBundle.bundleState !== "ready-with-grounded-attachments" || sectionBundle.mappedAttachmentCount <= 0) {
    const blockedRun = buildBlockedResult(donorId, sectionBundles.donorName, sectionBundle, paths.familyReconstructionSectionBundlesPath);
    await writeJsonFile(paths.sectionActionRunPath, blockedRun);
    return {
      donorId,
      donorName: sectionBundles.donorName,
      familyName: sectionBundle.familyName,
      sectionKey: sectionBundle.sectionKey,
      requestedMode: "prepare-section-workset",
      status: "blocked",
      sectionActionRunPath: paths.sectionActionRunPath,
      sectionBundlePath: paths.familyReconstructionSectionBundlesPath,
      worksetPath: null,
      reconstructionBundlePath: null,
      skinBlueprintPath: null,
      skinRenderPlanPath: null,
      exactLocalSourceCount: sectionBundle.exactLocalSourceCount,
      attachmentCount: sectionBundle.attachmentCount,
      mappedAttachmentCount: sectionBundle.mappedAttachmentCount,
      unmappedAttachmentCount: sectionBundle.unmappedAttachmentCount,
      nextOperatorAction: blockedRun.nextOperatorAction
    };
  }

  const workset = buildSectionWorkset(donorId, sectionBundles.donorName, sectionBundle, paths.familyReconstructionSectionBundlesPath);
  const worksetPath = path.join(
    paths.sectionReconstructionWorksetsRoot,
    `${sanitizeSectionSegment(sectionBundle.familyName)}--${sanitizeSectionSegment(sectionBundle.sectionKey)}.json`
  );
  await writeJsonFile(worksetPath, workset);
  const reconstructionBundle = buildSectionReconstructionBundle({
    workset,
    worksetPath: toRepoRelativePath(worksetPath)
  });
  const reconstructionBundlePath = path.join(
    paths.sectionReconstructionBundlesRoot,
    `${sanitizeSectionSegment(sectionBundle.familyName)}--${sanitizeSectionSegment(sectionBundle.sectionKey)}.json`
  );
  await writeJsonFile(reconstructionBundlePath, reconstructionBundle);
  const skinBlueprint = buildSectionSkinBlueprint({
    reconstructionBundle
  });
  const skinBlueprintPath = path.join(
    paths.sectionSkinBlueprintsRoot,
    `${sanitizeSectionSegment(sectionBundle.familyName)}--${sanitizeSectionSegment(sectionBundle.sectionKey)}.json`
  );
  await writeJsonFile(skinBlueprintPath, skinBlueprint);
  const skinRenderPlan = await buildSectionSkinRenderPlan({
    reconstructionBundle,
    skinBlueprint,
    skinBlueprintPath: toRepoRelativePath(skinBlueprintPath)
  });
  const skinRenderPlanPath = path.join(
    paths.sectionSkinRenderPlansRoot,
    `${sanitizeSectionSegment(sectionBundle.familyName)}--${sanitizeSectionSegment(sectionBundle.sectionKey)}.json`
  );
  await writeJsonFile(skinRenderPlanPath, skinRenderPlan);
  const sectionReconstructionProfiles = await summarizeSectionReconstructionProfiles({
    donorId,
    donorName: sectionBundles.donorName,
    bundlesRoot: paths.sectionReconstructionBundlesRoot
  });
  await writeJsonFile(paths.sectionReconstructionProfilesPath, sectionReconstructionProfiles);
  const sectionSkinBlueprintProfiles = await summarizeSectionSkinBlueprintProfiles({
    donorId,
    donorName: sectionBundles.donorName,
    blueprintsRoot: paths.sectionSkinBlueprintsRoot
  });
  await writeJsonFile(paths.sectionSkinBlueprintProfilesPath, sectionSkinBlueprintProfiles);
  const sectionSkinRenderPlanProfiles = await summarizeSectionSkinRenderPlanProfiles({
    donorId,
    donorName: sectionBundles.donorName,
    renderPlansRoot: paths.sectionSkinRenderPlansRoot
  });
  await writeJsonFile(paths.sectionSkinRenderPlanProfilesPath, sectionSkinRenderPlanProfiles);

  const nextOperatorAction = `${sectionBundle.sectionKey}: use the prepared section skin render plan for deeper skin or section reconstruction.`;
  const sectionActionRun: SectionActionRunFile = {
    schemaVersion: "0.1.0",
    donorId,
    donorName: sectionBundles.donorName,
    generatedAt: new Date().toISOString(),
    familyName: sectionBundle.familyName,
    sectionKey: sectionBundle.sectionKey,
    requestedMode: "prepare-section-reconstruction-bundle",
    status: "prepared",
    sectionBundlePath: toRepoRelativePath(paths.familyReconstructionSectionBundlesPath),
    worksetPath: toRepoRelativePath(worksetPath),
    reconstructionBundlePath: toRepoRelativePath(reconstructionBundlePath),
    skinBlueprintPath: toRepoRelativePath(skinBlueprintPath),
    skinRenderPlanPath: toRepoRelativePath(skinRenderPlanPath),
    exactLocalSourceCount: sectionBundle.exactLocalSourceCount,
    attachmentCount: sectionBundle.attachmentCount,
    mappedAttachmentCount: sectionBundle.mappedAttachmentCount,
    unmappedAttachmentCount: sectionBundle.unmappedAttachmentCount,
    nextOperatorAction
  };
  await writeJsonFile(paths.sectionActionRunPath, sectionActionRun);

  return {
    donorId,
    donorName: sectionBundles.donorName,
    familyName: sectionBundle.familyName,
    sectionKey: sectionBundle.sectionKey,
    requestedMode: "prepare-section-reconstruction-bundle",
    status: "prepared",
    sectionActionRunPath: paths.sectionActionRunPath,
    sectionBundlePath: paths.familyReconstructionSectionBundlesPath,
    worksetPath,
    reconstructionBundlePath,
    skinBlueprintPath,
    skinRenderPlanPath,
    exactLocalSourceCount: sectionBundle.exactLocalSourceCount,
    attachmentCount: sectionBundle.attachmentCount,
    mappedAttachmentCount: sectionBundle.mappedAttachmentCount,
    unmappedAttachmentCount: sectionBundle.unmappedAttachmentCount,
    nextOperatorAction
  };
}

function parseArgs(argv: readonly string[]): RunSectionActionOptions {
  let donorId = "";
  let sectionKey = "";

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    const next = argv[index + 1];
    if (token === "--donor-id" && next) {
      donorId = next;
      index += 1;
      continue;
    }
    if (token === "--section" && next) {
      sectionKey = next;
      index += 1;
    }
  }

  if (!donorId) {
    throw new Error("Missing required --donor-id argument.");
  }
  if (!sectionKey) {
    throw new Error("Missing required --section argument.");
  }

  return { donorId, sectionKey };
}

async function main(): Promise<void> {
  const result = await runSectionAction(parseArgs(process.argv.slice(2)));
  console.log("PASS donor-scan:run-section-action");
  console.log(`Donor: ${result.donorId}`);
  console.log(`Section: ${result.sectionKey}`);
  console.log(`Status: ${result.status}`);
  console.log(`Section bundles: ${toRepoRelativePath(result.sectionBundlePath)}`);
  if (result.worksetPath) {
    console.log(`Prepared workset: ${toRepoRelativePath(result.worksetPath)}`);
  }
  if (result.reconstructionBundlePath) {
    console.log(`Reconstruction bundle: ${toRepoRelativePath(result.reconstructionBundlePath)}`);
  }
  if (result.skinBlueprintPath) {
    console.log(`Skin blueprint: ${toRepoRelativePath(result.skinBlueprintPath)}`);
  }
  if (result.skinRenderPlanPath) {
    console.log(`Skin render plan: ${toRepoRelativePath(result.skinRenderPlanPath)}`);
  }
  console.log(`Mapped attachments: ${result.mappedAttachmentCount}/${result.attachmentCount}`);
  console.log(`Grounded local sources: ${result.exactLocalSourceCount}`);
  console.log(`Next action: ${result.nextOperatorAction}`);
}

if (require.main === module) {
  void main().catch((error) => {
    console.error("FAIL donor-scan:run-section-action");
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
