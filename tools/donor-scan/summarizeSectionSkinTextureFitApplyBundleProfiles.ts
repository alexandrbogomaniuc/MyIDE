import { promises as fs } from "node:fs";
import path from "node:path";
import type {
  SectionSkinTextureFitApplyBundleFile,
  SectionSkinTextureFitApplyBundleProfileRecord,
  SectionSkinTextureFitApplyBundleProfilesFile
} from "./shared";
import { readOptionalJsonFile, workspaceRoot } from "./shared";

interface SummarizeSectionSkinTextureFitApplyBundleProfilesOptions {
  donorId: string;
  donorName: string;
  textureFitApplyBundlesRoot: string;
}

function sortProfiles(
  left: SectionSkinTextureFitApplyBundleProfileRecord,
  right: SectionSkinTextureFitApplyBundleProfileRecord
): number {
  if (left.blockedPageCount !== right.blockedPageCount) {
    return right.blockedPageCount - left.blockedPageCount;
  }
  if (left.appliedCoverFitCount !== right.appliedCoverFitCount) {
    return right.appliedCoverFitCount - left.appliedCoverFitCount;
  }
  if (left.appliedContainFitCount !== right.appliedContainFitCount) {
    return right.appliedContainFitCount - left.appliedContainFitCount;
  }
  if (left.affectedLayerCount !== right.affectedLayerCount) {
    return right.affectedLayerCount - left.affectedLayerCount;
  }
  if ((left.largestScaleDelta ?? -1) !== (right.largestScaleDelta ?? -1)) {
    return (right.largestScaleDelta ?? -1) - (left.largestScaleDelta ?? -1);
  }
  return left.sectionKey.localeCompare(right.sectionKey);
}

export async function summarizeSectionSkinTextureFitApplyBundleProfiles(
  options: SummarizeSectionSkinTextureFitApplyBundleProfilesOptions
): Promise<SectionSkinTextureFitApplyBundleProfilesFile> {
  const absoluteRoot = path.isAbsolute(options.textureFitApplyBundlesRoot)
    ? options.textureFitApplyBundlesRoot
    : path.join(workspaceRoot, options.textureFitApplyBundlesRoot);
  let entryNames: string[] = [];
  try {
    entryNames = await fs.readdir(absoluteRoot);
  } catch {
    entryNames = [];
  }

  const sections: SectionSkinTextureFitApplyBundleProfileRecord[] = [];
  for (const entryName of entryNames.filter((value) => value.endsWith(".json")).sort((left, right) => left.localeCompare(right))) {
    const bundlePath = path.join(absoluteRoot, entryName);
    const bundle = await readOptionalJsonFile<SectionSkinTextureFitApplyBundleFile>(bundlePath);
    if (!bundle) {
      continue;
    }
    sections.push({
      familyName: bundle.familyName,
      sectionKey: bundle.sectionKey,
      skinName: bundle.skinName,
      textureFitApplyState: bundle.textureFitApplyState,
      textureFitApprovalState: bundle.textureFitApprovalState,
      pageCount: bundle.pageCount,
      pageSizeCount: bundle.pageSizeCount,
      sourceDimensionCount: bundle.sourceDimensionCount,
      missingPageSizeCount: bundle.missingPageSizeCount,
      missingSourceDimensionCount: bundle.missingSourceDimensionCount,
      exactPageLockCount: bundle.exactPageLockCount,
      appliedPageLockCount: bundle.appliedPageLockCount,
      unresolvedPageLockCount: bundle.unresolvedPageLockCount,
      exactFitDecisionCount: bundle.exactFitDecisionCount,
      uniformFitDecisionCount: bundle.uniformFitDecisionCount,
      appliedContainFitCount: bundle.appliedContainFitCount,
      appliedCoverFitCount: bundle.appliedCoverFitCount,
      appliedStretchFitCount: bundle.appliedStretchFitCount,
      readyPageCount: bundle.readyPageCount,
      blockedPageCount: bundle.blockedPageCount,
      uniqueSelectedLocalPathCount: bundle.uniqueSelectedLocalPathCount,
      drawOperationCount: bundle.drawOperationCount,
      readyDrawOperationCount: bundle.readyDrawOperationCount,
      blockedDrawOperationCount: bundle.blockedDrawOperationCount,
      affectedLayerCount: bundle.affectedLayerCount,
      affectedAttachmentCount: bundle.affectedAttachmentCount,
      largestOccupancyCoverageRatio: bundle.largestOccupancyCoverageRatio,
      largestScaleDelta: bundle.largestScaleDelta,
      topAppliedLocalPath: bundle.topAppliedLocalPath,
      sampleLocalSourcePath: bundle.sampleLocalSourcePath,
      atlasSourcePath: bundle.atlasSourcePath,
      textureFitApprovalBundlePath: bundle.textureFitApprovalBundlePath,
      textureFitApplyBundlePath: path.relative(workspaceRoot, bundlePath),
      nextTextureFitApplyStep: bundle.nextTextureFitApplyStep
    });
  }

  sections.sort(sortProfiles);
  return {
    schemaVersion: "0.1.0",
    donorId: options.donorId,
    donorName: options.donorName,
    generatedAt: new Date().toISOString(),
    sectionCount: sections.length,
    sections
  };
}
