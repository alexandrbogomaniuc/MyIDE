import { promises as fs } from "node:fs";
import path from "node:path";
import type {
  SectionSkinTextureFitApprovalBundleFile,
  SectionSkinTextureFitApprovalBundleProfileRecord,
  SectionSkinTextureFitApprovalBundleProfilesFile
} from "./shared";
import { readOptionalJsonFile, workspaceRoot } from "./shared";

interface SummarizeSectionSkinTextureFitApprovalBundleProfilesOptions {
  donorId: string;
  donorName: string;
  textureFitApprovalBundlesRoot: string;
}

function sortProfiles(
  left: SectionSkinTextureFitApprovalBundleProfileRecord,
  right: SectionSkinTextureFitApprovalBundleProfileRecord
): number {
  if (left.blockedPageCount !== right.blockedPageCount) {
    return right.blockedPageCount - left.blockedPageCount;
  }
  if (left.proposedCoverDecisionCount !== right.proposedCoverDecisionCount) {
    return right.proposedCoverDecisionCount - left.proposedCoverDecisionCount;
  }
  if (left.proposedContainDecisionCount !== right.proposedContainDecisionCount) {
    return right.proposedContainDecisionCount - left.proposedContainDecisionCount;
  }
  if ((left.largestScaleDelta ?? 0) !== (right.largestScaleDelta ?? 0)) {
    return (right.largestScaleDelta ?? 0) - (left.largestScaleDelta ?? 0);
  }
  return left.sectionKey.localeCompare(right.sectionKey);
}

export async function summarizeSectionSkinTextureFitApprovalBundleProfiles(
  options: SummarizeSectionSkinTextureFitApprovalBundleProfilesOptions
): Promise<SectionSkinTextureFitApprovalBundleProfilesFile> {
  const absoluteRoot = path.isAbsolute(options.textureFitApprovalBundlesRoot)
    ? options.textureFitApprovalBundlesRoot
    : path.join(workspaceRoot, options.textureFitApprovalBundlesRoot);
  let entryNames: string[] = [];
  try {
    entryNames = await fs.readdir(absoluteRoot);
  } catch {
    entryNames = [];
  }

  const sections: SectionSkinTextureFitApprovalBundleProfileRecord[] = [];
  for (const entryName of entryNames.filter((value) => value.endsWith(".json")).sort((left, right) => left.localeCompare(right))) {
    const bundlePath = path.join(absoluteRoot, entryName);
    const bundle = await readOptionalJsonFile<SectionSkinTextureFitApprovalBundleFile>(bundlePath);
    if (!bundle) {
      continue;
    }
    sections.push({
      familyName: bundle.familyName,
      sectionKey: bundle.sectionKey,
      skinName: bundle.skinName,
      textureFitApprovalState: bundle.textureFitApprovalState,
      textureFitDecisionState: bundle.textureFitDecisionState,
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
      proposedContainDecisionCount: bundle.proposedContainDecisionCount,
      proposedCoverDecisionCount: bundle.proposedCoverDecisionCount,
      proposedStretchDecisionCount: bundle.proposedStretchDecisionCount,
      approvalReadyPageCount: bundle.approvalReadyPageCount,
      blockedPageCount: bundle.blockedPageCount,
      uniqueSelectedLocalPathCount: bundle.uniqueSelectedLocalPathCount,
      drawOperationCount: bundle.drawOperationCount,
      readyDrawOperationCount: bundle.readyDrawOperationCount,
      blockedDrawOperationCount: bundle.blockedDrawOperationCount,
      affectedLayerCount: bundle.affectedLayerCount,
      affectedAttachmentCount: bundle.affectedAttachmentCount,
      largestOccupancyCoverageRatio: bundle.largestOccupancyCoverageRatio,
      largestScaleDelta: bundle.largestScaleDelta,
      topApprovedLocalPath: bundle.topApprovedLocalPath,
      sampleLocalSourcePath: bundle.sampleLocalSourcePath,
      atlasSourcePath: bundle.atlasSourcePath,
      textureFitDecisionBundlePath: bundle.textureFitDecisionBundlePath,
      textureFitApprovalBundlePath: path.relative(workspaceRoot, bundlePath),
      nextTextureFitApprovalStep: bundle.nextTextureFitApprovalStep
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
