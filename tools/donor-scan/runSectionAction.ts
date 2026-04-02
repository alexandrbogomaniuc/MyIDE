import path from "node:path";
import { buildSectionReconstructionBundle } from "./buildSectionReconstructionBundle";
import { buildSectionSkinBlueprint } from "./buildSectionSkinBlueprint";
import { buildSectionSkinRenderPlan } from "./buildSectionSkinRenderPlan";
import { buildSectionSkinMaterialPlan } from "./buildSectionSkinMaterialPlan";
import { buildSectionSkinMaterialReviewBundle } from "./buildSectionSkinMaterialReviewBundle";
import { buildSectionSkinPageMatchBundle } from "./buildSectionSkinPageMatchBundle";
import { buildSectionSkinPageLockBundle } from "./buildSectionSkinPageLockBundle";
import { buildSectionSkinPageLockAuditBundle } from "./buildSectionSkinPageLockAuditBundle";
import { buildSectionSkinPageLockResolutionBundle } from "./buildSectionSkinPageLockResolutionBundle";
import { buildSectionSkinPageLockDecisionBundle } from "./buildSectionSkinPageLockDecisionBundle";
import { buildSectionSkinPageLockReviewBundle } from "./buildSectionSkinPageLockReviewBundle";
import { buildSectionSkinPageLockApprovalBundle } from "./buildSectionSkinPageLockApprovalBundle";
import { buildSectionSkinPageLockApplyBundle } from "./buildSectionSkinPageLockApplyBundle";
import { buildSectionSkinTextureInputBundle } from "./buildSectionSkinTextureInputBundle";
import { buildSectionSkinTextureSourcePlan } from "./buildSectionSkinTextureSourcePlan";
import { buildSectionSkinTextureReconstructionBundle } from "./buildSectionSkinTextureReconstructionBundle";
import { buildSectionSkinTextureLockBundle } from "./buildSectionSkinTextureLockBundle";
import { buildSectionSkinTextureAssemblyBundle } from "./buildSectionSkinTextureAssemblyBundle";
import { buildSectionSkinTextureRenderBundle } from "./buildSectionSkinTextureRenderBundle";
import { buildSectionSkinTextureCanvasBundle } from "./buildSectionSkinTextureCanvasBundle";
import { buildSectionSkinTextureSourceFitBundle } from "./buildSectionSkinTextureSourceFitBundle";
import { buildSectionSkinTextureFitReviewBundle } from "./buildSectionSkinTextureFitReviewBundle";
import { buildSectionSkinTextureFitDecisionBundle } from "./buildSectionSkinTextureFitDecisionBundle";
import { summarizeSectionReconstructionProfiles } from "./summarizeSectionReconstructionProfiles";
import { summarizeSectionSkinBlueprintProfiles } from "./summarizeSectionSkinBlueprintProfiles";
import { summarizeSectionSkinRenderPlanProfiles } from "./summarizeSectionSkinRenderPlanProfiles";
import { summarizeSectionSkinMaterialPlanProfiles } from "./summarizeSectionSkinMaterialPlanProfiles";
import { summarizeSectionSkinMaterialReviewBundleProfiles } from "./summarizeSectionSkinMaterialReviewBundleProfiles";
import { summarizeSectionSkinPageMatchBundleProfiles } from "./summarizeSectionSkinPageMatchBundleProfiles";
import { summarizeSectionSkinPageLockBundleProfiles } from "./summarizeSectionSkinPageLockBundleProfiles";
import { summarizeSectionSkinPageLockAuditBundleProfiles } from "./summarizeSectionSkinPageLockAuditBundleProfiles";
import { summarizeSectionSkinPageLockResolutionBundleProfiles } from "./summarizeSectionSkinPageLockResolutionBundleProfiles";
import { summarizeSectionSkinPageLockDecisionBundleProfiles } from "./summarizeSectionSkinPageLockDecisionBundleProfiles";
import { summarizeSectionSkinPageLockReviewBundleProfiles } from "./summarizeSectionSkinPageLockReviewBundleProfiles";
import { summarizeSectionSkinPageLockApprovalBundleProfiles } from "./summarizeSectionSkinPageLockApprovalBundleProfiles";
import { summarizeSectionSkinPageLockApplyBundleProfiles } from "./summarizeSectionSkinPageLockApplyBundleProfiles";
import { summarizeSectionSkinTextureInputBundleProfiles } from "./summarizeSectionSkinTextureInputBundleProfiles";
import { summarizeSectionSkinTextureSourcePlanProfiles } from "./summarizeSectionSkinTextureSourcePlanProfiles";
import { summarizeSectionSkinTextureReconstructionBundleProfiles } from "./summarizeSectionSkinTextureReconstructionBundleProfiles";
import { summarizeSectionSkinTextureLockBundleProfiles } from "./summarizeSectionSkinTextureLockBundleProfiles";
import { summarizeSectionSkinTextureAssemblyBundleProfiles } from "./summarizeSectionSkinTextureAssemblyBundleProfiles";
import { summarizeSectionSkinTextureRenderBundleProfiles } from "./summarizeSectionSkinTextureRenderBundleProfiles";
import { summarizeSectionSkinTextureCanvasBundleProfiles } from "./summarizeSectionSkinTextureCanvasBundleProfiles";
import { summarizeSectionSkinTextureSourceFitBundleProfiles } from "./summarizeSectionSkinTextureSourceFitBundleProfiles";
import { summarizeSectionSkinTextureFitReviewBundleProfiles } from "./summarizeSectionSkinTextureFitReviewBundleProfiles";
import { summarizeSectionSkinTextureFitDecisionBundleProfiles } from "./summarizeSectionSkinTextureFitDecisionBundleProfiles";
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
  skinMaterialPlanPath: string | null;
  skinMaterialReviewBundlePath: string | null;
  skinPageMatchBundlePath: string | null;
  skinPageLockBundlePath: string | null;
  skinPageLockAuditBundlePath: string | null;
  skinPageLockResolutionBundlePath: string | null;
  skinPageLockDecisionBundlePath: string | null;
  skinPageLockReviewBundlePath: string | null;
  skinPageLockApprovalBundlePath: string | null;
  skinPageLockApplyBundlePath: string | null;
  skinTextureInputBundlePath: string | null;
  skinTextureSourcePlanPath: string | null;
  skinTextureReconstructionBundlePath: string | null;
  skinTextureLockBundlePath: string | null;
  skinTextureAssemblyBundlePath: string | null;
  skinTextureRenderBundlePath: string | null;
  skinTextureCanvasBundlePath: string | null;
  skinTextureSourceFitBundlePath: string | null;
  skinTextureFitReviewBundlePath: string | null;
  skinTextureFitDecisionBundlePath: string | null;
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
    skinMaterialPlanPath: null,
    skinMaterialReviewBundlePath: null,
    skinPageMatchBundlePath: null,
    skinPageLockBundlePath: null,
    skinPageLockAuditBundlePath: null,
    skinPageLockResolutionBundlePath: null,
    skinPageLockDecisionBundlePath: null,
    skinPageLockReviewBundlePath: null,
    skinPageLockApprovalBundlePath: null,
    skinPageLockApplyBundlePath: null,
    skinTextureInputBundlePath: null,
    skinTextureSourcePlanPath: null,
    skinTextureReconstructionBundlePath: null,
    skinTextureLockBundlePath: null,
    skinTextureAssemblyBundlePath: null,
    skinTextureRenderBundlePath: null,
    skinTextureCanvasBundlePath: null,
    skinTextureSourceFitBundlePath: null,
    skinTextureFitReviewBundlePath: null,
    skinTextureFitDecisionBundlePath: null,
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
      skinMaterialPlanPath: null,
      skinMaterialReviewBundlePath: null,
      skinPageMatchBundlePath: null,
      skinPageLockBundlePath: null,
      skinPageLockAuditBundlePath: null,
      skinPageLockResolutionBundlePath: null,
      skinPageLockDecisionBundlePath: null,
      skinPageLockReviewBundlePath: null,
      skinPageLockApprovalBundlePath: null,
      skinPageLockApplyBundlePath: null,
      skinTextureInputBundlePath: null,
      skinTextureSourcePlanPath: null,
      skinTextureReconstructionBundlePath: null,
      skinTextureLockBundlePath: null,
      skinTextureAssemblyBundlePath: null,
      skinTextureRenderBundlePath: null,
      skinTextureCanvasBundlePath: null,
      skinTextureSourceFitBundlePath: null,
      skinTextureFitReviewBundlePath: null,
      skinTextureFitDecisionBundlePath: null,
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
  const skinMaterialPlan = buildSectionSkinMaterialPlan({
    renderPlan: skinRenderPlan,
    renderPlanPath: toRepoRelativePath(skinRenderPlanPath),
    localSources: reconstructionBundle.localSources
  });
  const skinMaterialPlanPath = path.join(
    paths.sectionSkinMaterialPlansRoot,
    `${sanitizeSectionSegment(sectionBundle.familyName)}--${sanitizeSectionSegment(sectionBundle.sectionKey)}.json`
  );
  await writeJsonFile(skinMaterialPlanPath, skinMaterialPlan);
  const skinMaterialReviewBundle = buildSectionSkinMaterialReviewBundle({
    materialPlan: skinMaterialPlan,
    materialPlanPath: toRepoRelativePath(skinMaterialPlanPath)
  });
  const skinMaterialReviewBundlePath = path.join(
    paths.sectionSkinMaterialReviewBundlesRoot,
    `${sanitizeSectionSegment(sectionBundle.familyName)}--${sanitizeSectionSegment(sectionBundle.sectionKey)}.json`
  );
  await writeJsonFile(skinMaterialReviewBundlePath, skinMaterialReviewBundle);
  const skinPageMatchBundle = buildSectionSkinPageMatchBundle({
    materialReviewBundle: skinMaterialReviewBundle,
    materialReviewBundlePath: toRepoRelativePath(skinMaterialReviewBundlePath)
  });
  const skinPageMatchBundlePath = path.join(
    paths.sectionSkinPageMatchBundlesRoot,
    `${sanitizeSectionSegment(sectionBundle.familyName)}--${sanitizeSectionSegment(sectionBundle.sectionKey)}.json`
  );
  await writeJsonFile(skinPageMatchBundlePath, skinPageMatchBundle);
  const skinTextureSourcePlan = buildSectionSkinTextureSourcePlan({
    pageMatchBundle: skinPageMatchBundle,
    pageMatchBundlePath: toRepoRelativePath(skinPageMatchBundlePath),
    renderPlan: skinRenderPlan
  });
  const skinTextureSourcePlanPath = path.join(
    paths.sectionSkinTextureSourcePlansRoot,
    `${sanitizeSectionSegment(sectionBundle.familyName)}--${sanitizeSectionSegment(sectionBundle.sectionKey)}.json`
  );
  await writeJsonFile(skinTextureSourcePlanPath, skinTextureSourcePlan);
  const skinTextureReconstructionBundle = buildSectionSkinTextureReconstructionBundle({
    textureSourcePlan: skinTextureSourcePlan,
    textureSourcePlanPath: toRepoRelativePath(skinTextureSourcePlanPath),
    renderPlan: skinRenderPlan
  });
  const skinTextureReconstructionBundlePath = path.join(
    paths.sectionSkinTextureReconstructionBundlesRoot,
    `${sanitizeSectionSegment(sectionBundle.familyName)}--${sanitizeSectionSegment(sectionBundle.sectionKey)}.json`
  );
  await writeJsonFile(skinTextureReconstructionBundlePath, skinTextureReconstructionBundle);
  const skinPageLockBundle = buildSectionSkinPageLockBundle({
    textureReconstructionBundle: skinTextureReconstructionBundle,
    textureReconstructionBundlePath: toRepoRelativePath(skinTextureReconstructionBundlePath),
    pageMatchBundle: skinPageMatchBundle,
    pageMatchBundlePath: toRepoRelativePath(skinPageMatchBundlePath)
  });
  const skinPageLockBundlePath = path.join(
    paths.sectionSkinPageLockBundlesRoot,
    `${sanitizeSectionSegment(sectionBundle.familyName)}--${sanitizeSectionSegment(sectionBundle.sectionKey)}.json`
  );
  await writeJsonFile(skinPageLockBundlePath, skinPageLockBundle);
  const skinTextureInputBundle = buildSectionSkinTextureInputBundle({
    pageLockBundle: skinPageLockBundle,
    pageLockBundlePath: toRepoRelativePath(skinPageLockBundlePath),
    textureReconstructionBundle: skinTextureReconstructionBundle,
    textureReconstructionBundlePath: toRepoRelativePath(skinTextureReconstructionBundlePath)
  });
  const skinTextureInputBundlePath = path.join(
    paths.sectionSkinTextureInputBundlesRoot,
    `${sanitizeSectionSegment(sectionBundle.familyName)}--${sanitizeSectionSegment(sectionBundle.sectionKey)}.json`
  );
  await writeJsonFile(skinTextureInputBundlePath, skinTextureInputBundle);
  const skinPageLockAuditBundle = buildSectionSkinPageLockAuditBundle({
    pageLockBundle: skinPageLockBundle,
    pageLockBundlePath: toRepoRelativePath(skinPageLockBundlePath),
    textureInputBundle: skinTextureInputBundle,
    textureInputBundlePath: toRepoRelativePath(skinTextureInputBundlePath)
  });
  const skinPageLockAuditBundlePath = path.join(
    paths.sectionSkinPageLockAuditBundlesRoot,
    `${sanitizeSectionSegment(sectionBundle.familyName)}--${sanitizeSectionSegment(sectionBundle.sectionKey)}.json`
  );
  await writeJsonFile(skinPageLockAuditBundlePath, skinPageLockAuditBundle);
  const skinPageLockResolutionBundle = buildSectionSkinPageLockResolutionBundle({
    pageLockAuditBundle: skinPageLockAuditBundle,
    pageLockAuditBundlePath: toRepoRelativePath(skinPageLockAuditBundlePath),
    materialReviewBundle: skinMaterialReviewBundle,
    materialReviewBundlePath: toRepoRelativePath(skinMaterialReviewBundlePath)
  });
  const skinPageLockResolutionBundlePath = path.join(
    paths.sectionSkinPageLockResolutionBundlesRoot,
    `${sanitizeSectionSegment(sectionBundle.familyName)}--${sanitizeSectionSegment(sectionBundle.sectionKey)}.json`
  );
  await writeJsonFile(skinPageLockResolutionBundlePath, skinPageLockResolutionBundle);
  const skinPageLockDecisionBundle = buildSectionSkinPageLockDecisionBundle({
    pageLockResolutionBundle: skinPageLockResolutionBundle,
    pageLockResolutionBundlePath: toRepoRelativePath(skinPageLockResolutionBundlePath),
    materialReviewBundle: skinMaterialReviewBundle,
    materialReviewBundlePath: toRepoRelativePath(skinMaterialReviewBundlePath)
  });
  const skinPageLockDecisionBundlePath = path.join(
    paths.sectionSkinPageLockDecisionBundlesRoot,
    `${sanitizeSectionSegment(sectionBundle.familyName)}--${sanitizeSectionSegment(sectionBundle.sectionKey)}.json`
  );
  await writeJsonFile(skinPageLockDecisionBundlePath, skinPageLockDecisionBundle);
  const skinPageLockReviewBundle = buildSectionSkinPageLockReviewBundle({
    pageLockDecisionBundle: skinPageLockDecisionBundle,
    pageLockDecisionBundlePath: toRepoRelativePath(skinPageLockDecisionBundlePath),
    renderPlan: skinRenderPlan,
    renderPlanPath: toRepoRelativePath(skinRenderPlanPath)
  });
  const skinPageLockReviewBundlePath = path.join(
    paths.sectionSkinPageLockReviewBundlesRoot,
    `${sanitizeSectionSegment(sectionBundle.familyName)}--${sanitizeSectionSegment(sectionBundle.sectionKey)}.json`
  );
  await writeJsonFile(skinPageLockReviewBundlePath, skinPageLockReviewBundle);
  const skinPageLockApprovalBundle = buildSectionSkinPageLockApprovalBundle({
    pageLockReviewBundle: skinPageLockReviewBundle,
    pageLockReviewBundlePath: toRepoRelativePath(skinPageLockReviewBundlePath)
  });
  const skinPageLockApprovalBundlePath = path.join(
    paths.sectionSkinPageLockApprovalBundlesRoot,
    `${sanitizeSectionSegment(sectionBundle.familyName)}--${sanitizeSectionSegment(sectionBundle.sectionKey)}.json`
  );
  await writeJsonFile(skinPageLockApprovalBundlePath, skinPageLockApprovalBundle);
  const skinPageLockApplyBundle = buildSectionSkinPageLockApplyBundle({
    pageLockApprovalBundle: skinPageLockApprovalBundle,
    pageLockApprovalBundlePath: toRepoRelativePath(skinPageLockApprovalBundlePath)
  });
  const skinPageLockApplyBundlePath = path.join(
    paths.sectionSkinPageLockApplyBundlesRoot,
    `${sanitizeSectionSegment(sectionBundle.familyName)}--${sanitizeSectionSegment(sectionBundle.sectionKey)}.json`
  );
  await writeJsonFile(skinPageLockApplyBundlePath, skinPageLockApplyBundle);
  const skinTextureLockBundle = buildSectionSkinTextureLockBundle({
    pageLockApplyBundle: skinPageLockApplyBundle,
    pageLockApplyBundlePath: toRepoRelativePath(skinPageLockApplyBundlePath),
    textureReconstructionBundle: skinTextureReconstructionBundle,
    textureReconstructionBundlePath: toRepoRelativePath(skinTextureReconstructionBundlePath)
  });
  const skinTextureLockBundlePath = path.join(
    paths.sectionSkinTextureLockBundlesRoot,
    `${sanitizeSectionSegment(sectionBundle.familyName)}--${sanitizeSectionSegment(sectionBundle.sectionKey)}.json`
  );
  await writeJsonFile(skinTextureLockBundlePath, skinTextureLockBundle);
  const skinTextureAssemblyBundle = buildSectionSkinTextureAssemblyBundle({
    textureLockBundle: skinTextureLockBundle,
    textureLockBundlePath: toRepoRelativePath(skinTextureLockBundlePath)
  });
  const skinTextureAssemblyBundlePath = path.join(
    paths.sectionSkinTextureAssemblyBundlesRoot,
    `${sanitizeSectionSegment(sectionBundle.familyName)}--${sanitizeSectionSegment(sectionBundle.sectionKey)}.json`
  );
  await writeJsonFile(skinTextureAssemblyBundlePath, skinTextureAssemblyBundle);
  const skinTextureRenderBundle = buildSectionSkinTextureRenderBundle({
    textureAssemblyBundle: skinTextureAssemblyBundle,
    textureAssemblyBundlePath: toRepoRelativePath(skinTextureAssemblyBundlePath),
    renderPlan: skinRenderPlan,
    renderPlanPath: toRepoRelativePath(skinRenderPlanPath)
  });
  const skinTextureRenderBundlePath = path.join(
    paths.sectionSkinTextureRenderBundlesRoot,
    `${sanitizeSectionSegment(sectionBundle.familyName)}--${sanitizeSectionSegment(sectionBundle.sectionKey)}.json`
  );
  await writeJsonFile(skinTextureRenderBundlePath, skinTextureRenderBundle);
  const skinTextureCanvasBundle = buildSectionSkinTextureCanvasBundle({
    textureRenderBundle: skinTextureRenderBundle,
    textureRenderBundlePath: toRepoRelativePath(skinTextureRenderBundlePath)
  });
  const skinTextureCanvasBundlePath = path.join(
    paths.sectionSkinTextureCanvasBundlesRoot,
    `${sanitizeSectionSegment(sectionBundle.familyName)}--${sanitizeSectionSegment(sectionBundle.sectionKey)}.json`
  );
  await writeJsonFile(skinTextureCanvasBundlePath, skinTextureCanvasBundle);
  const skinTextureSourceFitBundle = buildSectionSkinTextureSourceFitBundle({
    textureCanvasBundle: skinTextureCanvasBundle,
    textureCanvasBundlePath: toRepoRelativePath(skinTextureCanvasBundlePath)
  });
  const skinTextureSourceFitBundlePath = path.join(
    paths.sectionSkinTextureSourceFitBundlesRoot,
    `${sanitizeSectionSegment(sectionBundle.familyName)}--${sanitizeSectionSegment(sectionBundle.sectionKey)}.json`
  );
  await writeJsonFile(skinTextureSourceFitBundlePath, skinTextureSourceFitBundle);
  const skinTextureFitReviewBundle = buildSectionSkinTextureFitReviewBundle({
    textureSourceFitBundle: skinTextureSourceFitBundle,
    textureSourceFitBundlePath: toRepoRelativePath(skinTextureSourceFitBundlePath)
  });
  const skinTextureFitReviewBundlePath = path.join(
    paths.sectionSkinTextureFitReviewBundlesRoot,
    `${sanitizeSectionSegment(sectionBundle.familyName)}--${sanitizeSectionSegment(sectionBundle.sectionKey)}.json`
  );
  await writeJsonFile(skinTextureFitReviewBundlePath, skinTextureFitReviewBundle);
  const skinTextureFitDecisionBundle = buildSectionSkinTextureFitDecisionBundle({
    textureFitReviewBundle: skinTextureFitReviewBundle,
    textureFitReviewBundlePath: toRepoRelativePath(skinTextureFitReviewBundlePath),
    textureCanvasBundle: skinTextureCanvasBundle
  });
  const skinTextureFitDecisionBundlePath = path.join(
    paths.sectionSkinTextureFitDecisionBundlesRoot,
    `${sanitizeSectionSegment(sectionBundle.familyName)}--${sanitizeSectionSegment(sectionBundle.sectionKey)}.json`
  );
  await writeJsonFile(skinTextureFitDecisionBundlePath, skinTextureFitDecisionBundle);
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
  const sectionSkinMaterialPlanProfiles = await summarizeSectionSkinMaterialPlanProfiles({
    donorId,
    donorName: sectionBundles.donorName,
    materialPlansRoot: paths.sectionSkinMaterialPlansRoot
  });
  await writeJsonFile(paths.sectionSkinMaterialPlanProfilesPath, sectionSkinMaterialPlanProfiles);
  const sectionSkinMaterialReviewBundleProfiles = await summarizeSectionSkinMaterialReviewBundleProfiles({
    donorId,
    donorName: sectionBundles.donorName,
    reviewBundlesRoot: paths.sectionSkinMaterialReviewBundlesRoot
  });
  await writeJsonFile(paths.sectionSkinMaterialReviewBundleProfilesPath, sectionSkinMaterialReviewBundleProfiles);
  const sectionSkinPageMatchBundleProfiles = await summarizeSectionSkinPageMatchBundleProfiles({
    donorId,
    donorName: sectionBundles.donorName,
    pageMatchBundlesRoot: paths.sectionSkinPageMatchBundlesRoot
  });
  await writeJsonFile(paths.sectionSkinPageMatchBundleProfilesPath, sectionSkinPageMatchBundleProfiles);
  const sectionSkinTextureSourcePlanProfiles = await summarizeSectionSkinTextureSourcePlanProfiles({
    donorId,
    donorName: sectionBundles.donorName,
    textureSourcePlansRoot: paths.sectionSkinTextureSourcePlansRoot
  });
  await writeJsonFile(paths.sectionSkinTextureSourcePlanProfilesPath, sectionSkinTextureSourcePlanProfiles);
  const sectionSkinTextureReconstructionBundleProfiles = await summarizeSectionSkinTextureReconstructionBundleProfiles({
    donorId,
    donorName: sectionBundles.donorName,
    textureReconstructionBundlesRoot: paths.sectionSkinTextureReconstructionBundlesRoot
  });
  await writeJsonFile(paths.sectionSkinTextureReconstructionBundleProfilesPath, sectionSkinTextureReconstructionBundleProfiles);
  const sectionSkinPageLockBundleProfiles = await summarizeSectionSkinPageLockBundleProfiles({
    donorId,
    donorName: sectionBundles.donorName,
    pageLockBundlesRoot: paths.sectionSkinPageLockBundlesRoot
  });
  await writeJsonFile(paths.sectionSkinPageLockBundleProfilesPath, sectionSkinPageLockBundleProfiles);
  const sectionSkinTextureInputBundleProfiles = await summarizeSectionSkinTextureInputBundleProfiles({
    donorId,
    donorName: sectionBundles.donorName,
    textureInputBundlesRoot: paths.sectionSkinTextureInputBundlesRoot
  });
  await writeJsonFile(paths.sectionSkinTextureInputBundleProfilesPath, sectionSkinTextureInputBundleProfiles);
  const sectionSkinPageLockAuditBundleProfiles = await summarizeSectionSkinPageLockAuditBundleProfiles({
    donorId,
    donorName: sectionBundles.donorName,
    pageLockAuditBundlesRoot: paths.sectionSkinPageLockAuditBundlesRoot
  });
  await writeJsonFile(paths.sectionSkinPageLockAuditBundleProfilesPath, sectionSkinPageLockAuditBundleProfiles);
  const sectionSkinPageLockResolutionBundleProfiles = await summarizeSectionSkinPageLockResolutionBundleProfiles({
    donorId,
    donorName: sectionBundles.donorName,
    pageLockResolutionBundlesRoot: paths.sectionSkinPageLockResolutionBundlesRoot
  });
  await writeJsonFile(paths.sectionSkinPageLockResolutionBundleProfilesPath, sectionSkinPageLockResolutionBundleProfiles);
  const sectionSkinPageLockDecisionBundleProfiles = await summarizeSectionSkinPageLockDecisionBundleProfiles({
    donorId,
    donorName: sectionBundles.donorName,
    pageLockDecisionBundlesRoot: paths.sectionSkinPageLockDecisionBundlesRoot
  });
  await writeJsonFile(paths.sectionSkinPageLockDecisionBundleProfilesPath, sectionSkinPageLockDecisionBundleProfiles);
  const sectionSkinPageLockReviewBundleProfiles = await summarizeSectionSkinPageLockReviewBundleProfiles({
    donorId,
    donorName: sectionBundles.donorName,
    pageLockReviewBundlesRoot: paths.sectionSkinPageLockReviewBundlesRoot
  });
  await writeJsonFile(paths.sectionSkinPageLockReviewBundleProfilesPath, sectionSkinPageLockReviewBundleProfiles);
  const sectionSkinPageLockApprovalBundleProfiles = await summarizeSectionSkinPageLockApprovalBundleProfiles({
    donorId,
    donorName: sectionBundles.donorName,
    pageLockApprovalBundlesRoot: paths.sectionSkinPageLockApprovalBundlesRoot
  });
  await writeJsonFile(paths.sectionSkinPageLockApprovalBundleProfilesPath, sectionSkinPageLockApprovalBundleProfiles);
  const sectionSkinPageLockApplyBundleProfiles = await summarizeSectionSkinPageLockApplyBundleProfiles({
    donorId,
    donorName: sectionBundles.donorName,
    pageLockApplyBundlesRoot: paths.sectionSkinPageLockApplyBundlesRoot
  });
  await writeJsonFile(paths.sectionSkinPageLockApplyBundleProfilesPath, sectionSkinPageLockApplyBundleProfiles);
  const sectionSkinTextureLockBundleProfiles = await summarizeSectionSkinTextureLockBundleProfiles({
    donorId,
    donorName: sectionBundles.donorName,
    textureLockBundlesRoot: paths.sectionSkinTextureLockBundlesRoot
  });
  await writeJsonFile(paths.sectionSkinTextureLockBundleProfilesPath, sectionSkinTextureLockBundleProfiles);
  const sectionSkinTextureAssemblyBundleProfiles = await summarizeSectionSkinTextureAssemblyBundleProfiles({
    donorId,
    donorName: sectionBundles.donorName,
    textureAssemblyBundlesRoot: paths.sectionSkinTextureAssemblyBundlesRoot
  });
  await writeJsonFile(paths.sectionSkinTextureAssemblyBundleProfilesPath, sectionSkinTextureAssemblyBundleProfiles);
  const sectionSkinTextureRenderBundleProfiles = await summarizeSectionSkinTextureRenderBundleProfiles({
    donorId,
    donorName: sectionBundles.donorName,
    textureRenderBundlesRoot: paths.sectionSkinTextureRenderBundlesRoot
  });
  await writeJsonFile(paths.sectionSkinTextureRenderBundleProfilesPath, sectionSkinTextureRenderBundleProfiles);
  const sectionSkinTextureCanvasBundleProfiles = await summarizeSectionSkinTextureCanvasBundleProfiles({
    donorId,
    donorName: sectionBundles.donorName,
    textureCanvasBundlesRoot: paths.sectionSkinTextureCanvasBundlesRoot
  });
  await writeJsonFile(paths.sectionSkinTextureCanvasBundleProfilesPath, sectionSkinTextureCanvasBundleProfiles);
  const sectionSkinTextureSourceFitBundleProfiles = await summarizeSectionSkinTextureSourceFitBundleProfiles({
    donorId,
    donorName: sectionBundles.donorName,
    textureSourceFitBundlesRoot: paths.sectionSkinTextureSourceFitBundlesRoot
  });
  await writeJsonFile(paths.sectionSkinTextureSourceFitBundleProfilesPath, sectionSkinTextureSourceFitBundleProfiles);
  const sectionSkinTextureFitReviewBundleProfiles = await summarizeSectionSkinTextureFitReviewBundleProfiles({
    donorId,
    donorName: sectionBundles.donorName,
    textureFitReviewBundlesRoot: paths.sectionSkinTextureFitReviewBundlesRoot
  });
  await writeJsonFile(paths.sectionSkinTextureFitReviewBundleProfilesPath, sectionSkinTextureFitReviewBundleProfiles);
  const sectionSkinTextureFitDecisionBundleProfiles = await summarizeSectionSkinTextureFitDecisionBundleProfiles({
    donorId,
    donorName: sectionBundles.donorName,
    textureFitDecisionBundlesRoot: paths.sectionSkinTextureFitDecisionBundlesRoot
  });
  await writeJsonFile(paths.sectionSkinTextureFitDecisionBundleProfilesPath, sectionSkinTextureFitDecisionBundleProfiles);

  const nextOperatorAction = skinTextureFitDecisionBundle.nextTextureFitDecisionStep;
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
    skinMaterialPlanPath: toRepoRelativePath(skinMaterialPlanPath),
    skinMaterialReviewBundlePath: toRepoRelativePath(skinMaterialReviewBundlePath),
    skinPageMatchBundlePath: toRepoRelativePath(skinPageMatchBundlePath),
    skinPageLockBundlePath: toRepoRelativePath(skinPageLockBundlePath),
    skinPageLockAuditBundlePath: toRepoRelativePath(skinPageLockAuditBundlePath),
    skinPageLockResolutionBundlePath: toRepoRelativePath(skinPageLockResolutionBundlePath),
    skinPageLockDecisionBundlePath: toRepoRelativePath(skinPageLockDecisionBundlePath),
    skinPageLockReviewBundlePath: toRepoRelativePath(skinPageLockReviewBundlePath),
    skinPageLockApprovalBundlePath: toRepoRelativePath(skinPageLockApprovalBundlePath),
    skinPageLockApplyBundlePath: toRepoRelativePath(skinPageLockApplyBundlePath),
    skinTextureInputBundlePath: toRepoRelativePath(skinTextureInputBundlePath),
    skinTextureSourcePlanPath: toRepoRelativePath(skinTextureSourcePlanPath),
    skinTextureReconstructionBundlePath: toRepoRelativePath(skinTextureReconstructionBundlePath),
    skinTextureLockBundlePath: toRepoRelativePath(skinTextureLockBundlePath),
    skinTextureAssemblyBundlePath: toRepoRelativePath(skinTextureAssemblyBundlePath),
    skinTextureRenderBundlePath: toRepoRelativePath(skinTextureRenderBundlePath),
    skinTextureCanvasBundlePath: toRepoRelativePath(skinTextureCanvasBundlePath),
    skinTextureSourceFitBundlePath: toRepoRelativePath(skinTextureSourceFitBundlePath),
    skinTextureFitReviewBundlePath: toRepoRelativePath(skinTextureFitReviewBundlePath),
    skinTextureFitDecisionBundlePath: toRepoRelativePath(skinTextureFitDecisionBundlePath),
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
    skinMaterialPlanPath,
    skinMaterialReviewBundlePath,
    skinPageMatchBundlePath,
    skinPageLockBundlePath,
    skinPageLockAuditBundlePath,
    skinPageLockResolutionBundlePath,
    skinPageLockDecisionBundlePath,
    skinPageLockReviewBundlePath,
    skinPageLockApprovalBundlePath,
    skinPageLockApplyBundlePath,
    skinTextureInputBundlePath,
    skinTextureSourcePlanPath,
    skinTextureReconstructionBundlePath,
    skinTextureLockBundlePath,
    skinTextureAssemblyBundlePath,
    skinTextureRenderBundlePath,
    skinTextureCanvasBundlePath,
    skinTextureSourceFitBundlePath,
    skinTextureFitReviewBundlePath,
    skinTextureFitDecisionBundlePath,
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
  if (result.skinMaterialPlanPath) {
    console.log(`Skin material plan: ${toRepoRelativePath(result.skinMaterialPlanPath)}`);
  }
  if (result.skinMaterialReviewBundlePath) {
    console.log(`Skin material review: ${toRepoRelativePath(result.skinMaterialReviewBundlePath)}`);
  }
  if (result.skinPageMatchBundlePath) {
    console.log(`Skin page match: ${toRepoRelativePath(result.skinPageMatchBundlePath)}`);
  }
  if (result.skinPageLockBundlePath) {
    console.log(`Skin page lock: ${toRepoRelativePath(result.skinPageLockBundlePath)}`);
  }
  if (result.skinPageLockAuditBundlePath) {
    console.log(`Skin page lock audit: ${toRepoRelativePath(result.skinPageLockAuditBundlePath)}`);
  }
  if (result.skinPageLockResolutionBundlePath) {
    console.log(`Skin page lock resolution: ${toRepoRelativePath(result.skinPageLockResolutionBundlePath)}`);
  }
  if (result.skinPageLockDecisionBundlePath) {
    console.log(`Skin page lock decision: ${toRepoRelativePath(result.skinPageLockDecisionBundlePath)}`);
  }
  if (result.skinPageLockReviewBundlePath) {
    console.log(`Skin page lock review: ${toRepoRelativePath(result.skinPageLockReviewBundlePath)}`);
  }
  if (result.skinPageLockApprovalBundlePath) {
    console.log(`Skin page lock approval: ${toRepoRelativePath(result.skinPageLockApprovalBundlePath)}`);
  }
  if (result.skinPageLockApplyBundlePath) {
    console.log(`Skin page lock apply: ${toRepoRelativePath(result.skinPageLockApplyBundlePath)}`);
  }
  if (result.skinTextureInputBundlePath) {
    console.log(`Skin texture input: ${toRepoRelativePath(result.skinTextureInputBundlePath)}`);
  }
  if (result.skinTextureSourcePlanPath) {
    console.log(`Skin texture sources: ${toRepoRelativePath(result.skinTextureSourcePlanPath)}`);
  }
  if (result.skinTextureReconstructionBundlePath) {
    console.log(`Skin texture reconstruction: ${toRepoRelativePath(result.skinTextureReconstructionBundlePath)}`);
  }
  if (result.skinTextureLockBundlePath) {
    console.log(`Skin texture lock: ${toRepoRelativePath(result.skinTextureLockBundlePath)}`);
  }
  if (result.skinTextureAssemblyBundlePath) {
    console.log(`Skin texture assembly: ${toRepoRelativePath(result.skinTextureAssemblyBundlePath)}`);
  }
  if (result.skinTextureRenderBundlePath) {
    console.log(`Skin texture render: ${toRepoRelativePath(result.skinTextureRenderBundlePath)}`);
  }
  if (result.skinTextureCanvasBundlePath) {
    console.log(`Skin texture canvas: ${toRepoRelativePath(result.skinTextureCanvasBundlePath)}`);
  }
  if (result.skinTextureSourceFitBundlePath) {
    console.log(`Skin texture source fit: ${toRepoRelativePath(result.skinTextureSourceFitBundlePath)}`);
  }
  if (result.skinTextureFitReviewBundlePath) {
    console.log(`Skin texture fit review: ${toRepoRelativePath(result.skinTextureFitReviewBundlePath)}`);
  }
  if (result.skinTextureFitDecisionBundlePath) {
    console.log(`Skin texture fit decision: ${toRepoRelativePath(result.skinTextureFitDecisionBundlePath)}`);
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
