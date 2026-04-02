import { promises as fs } from "node:fs";
import path from "node:path";
import type {
  SectionSkinTextureFitDecisionBundleFile,
  SectionSkinTextureFitDecisionBundleProfileRecord,
  SectionSkinTextureFitDecisionBundleProfilesFile
} from "./shared";
import { readOptionalJsonFile, workspaceRoot } from "./shared";

interface SummarizeSectionSkinTextureFitDecisionBundleProfilesOptions {
  donorId: string;
  donorName: string;
  textureFitDecisionBundlesRoot: string;
}

function sortProfiles(
  left: SectionSkinTextureFitDecisionBundleProfileRecord,
  right: SectionSkinTextureFitDecisionBundleProfileRecord
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

export async function summarizeSectionSkinTextureFitDecisionBundleProfiles(
  options: SummarizeSectionSkinTextureFitDecisionBundleProfilesOptions
): Promise<SectionSkinTextureFitDecisionBundleProfilesFile> {
  const absoluteRoot = path.isAbsolute(options.textureFitDecisionBundlesRoot)
    ? options.textureFitDecisionBundlesRoot
    : path.join(workspaceRoot, options.textureFitDecisionBundlesRoot);
  let entryNames: string[] = [];
  try {
    entryNames = await fs.readdir(absoluteRoot);
  } catch {
    entryNames = [];
  }

  const sections: SectionSkinTextureFitDecisionBundleProfileRecord[] = [];
  for (const entryName of entryNames.filter((value) => value.endsWith(".json")).sort((left, right) => left.localeCompare(right))) {
    const bundlePath = path.join(absoluteRoot, entryName);
    const bundle = await readOptionalJsonFile<SectionSkinTextureFitDecisionBundleFile>(bundlePath);
    if (!bundle) {
      continue;
    }
    sections.push({
      familyName: bundle.familyName,
      sectionKey: bundle.sectionKey,
      skinName: bundle.skinName,
      textureFitDecisionState: bundle.textureFitDecisionState,
      textureFitReviewState: bundle.textureFitReviewState,
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
      reviewReadyPageCount: bundle.reviewReadyPageCount,
      blockedPageCount: bundle.blockedPageCount,
      uniqueSelectedLocalPathCount: bundle.uniqueSelectedLocalPathCount,
      drawOperationCount: bundle.drawOperationCount,
      readyDrawOperationCount: bundle.readyDrawOperationCount,
      blockedDrawOperationCount: bundle.blockedDrawOperationCount,
      largestOccupancyCoverageRatio: bundle.largestOccupancyCoverageRatio,
      largestScaleDelta: bundle.largestScaleDelta,
      topDecisionLocalPath: bundle.topDecisionLocalPath,
      sampleLocalSourcePath: bundle.sampleLocalSourcePath,
      atlasSourcePath: bundle.atlasSourcePath,
      textureFitDecisionBundlePath: path.relative(workspaceRoot, bundlePath),
      nextTextureFitDecisionStep: bundle.nextTextureFitDecisionStep
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
