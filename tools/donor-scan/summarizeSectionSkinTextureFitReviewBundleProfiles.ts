import { promises as fs } from "node:fs";
import path from "node:path";
import type {
  SectionSkinTextureFitReviewBundleFile,
  SectionSkinTextureFitReviewBundleProfileRecord,
  SectionSkinTextureFitReviewBundleProfilesFile
} from "./shared";
import { readOptionalJsonFile, workspaceRoot } from "./shared";

interface SummarizeSectionSkinTextureFitReviewBundleProfilesOptions {
  donorId: string;
  donorName: string;
  textureFitReviewBundlesRoot: string;
}

function sortProfiles(
  left: SectionSkinTextureFitReviewBundleProfileRecord,
  right: SectionSkinTextureFitReviewBundleProfileRecord
): number {
  if (left.nonUniformScalePageFitCount !== right.nonUniformScalePageFitCount) {
    return right.nonUniformScalePageFitCount - left.nonUniformScalePageFitCount;
  }
  if ((left.largestScaleDelta ?? 0) !== (right.largestScaleDelta ?? 0)) {
    return (right.largestScaleDelta ?? 0) - (left.largestScaleDelta ?? 0);
  }
  if (left.reviewReadyPageCount !== right.reviewReadyPageCount) {
    return right.reviewReadyPageCount - left.reviewReadyPageCount;
  }
  if (left.readyDrawOperationCount !== right.readyDrawOperationCount) {
    return right.readyDrawOperationCount - left.readyDrawOperationCount;
  }
  return left.sectionKey.localeCompare(right.sectionKey);
}

export async function summarizeSectionSkinTextureFitReviewBundleProfiles(
  options: SummarizeSectionSkinTextureFitReviewBundleProfilesOptions
): Promise<SectionSkinTextureFitReviewBundleProfilesFile> {
  const absoluteRoot = path.isAbsolute(options.textureFitReviewBundlesRoot)
    ? options.textureFitReviewBundlesRoot
    : path.join(workspaceRoot, options.textureFitReviewBundlesRoot);
  let entryNames: string[] = [];
  try {
    entryNames = await fs.readdir(absoluteRoot);
  } catch {
    entryNames = [];
  }

  const sections: SectionSkinTextureFitReviewBundleProfileRecord[] = [];
  for (const entryName of entryNames.filter((value) => value.endsWith(".json")).sort((left, right) => left.localeCompare(right))) {
    const bundlePath = path.join(absoluteRoot, entryName);
    const bundle = await readOptionalJsonFile<SectionSkinTextureFitReviewBundleFile>(bundlePath);
    if (!bundle) {
      continue;
    }
    sections.push({
      familyName: bundle.familyName,
      sectionKey: bundle.sectionKey,
      skinName: bundle.skinName,
      textureFitReviewState: bundle.textureFitReviewState,
      textureSourceFitState: bundle.textureSourceFitState,
      pageCount: bundle.pageCount,
      pageSizeCount: bundle.pageSizeCount,
      sourceDimensionCount: bundle.sourceDimensionCount,
      missingPageSizeCount: bundle.missingPageSizeCount,
      missingSourceDimensionCount: bundle.missingSourceDimensionCount,
      exactPageLockCount: bundle.exactPageLockCount,
      appliedPageLockCount: bundle.appliedPageLockCount,
      unresolvedPageLockCount: bundle.unresolvedPageLockCount,
      exactPageFitCount: bundle.exactPageFitCount,
      uniformScalePageFitCount: bundle.uniformScalePageFitCount,
      nonUniformScalePageFitCount: bundle.nonUniformScalePageFitCount,
      reviewReadyPageCount: bundle.reviewReadyPageCount,
      blockedPageCount: bundle.blockedPageCount,
      uniqueSelectedLocalPathCount: bundle.uniqueSelectedLocalPathCount,
      drawOperationCount: bundle.drawOperationCount,
      readyDrawOperationCount: bundle.readyDrawOperationCount,
      blockedDrawOperationCount: bundle.blockedDrawOperationCount,
      largestScaleDelta: bundle.largestScaleDelta,
      topFitReviewLocalPath: bundle.topFitReviewLocalPath,
      sampleLocalSourcePath: bundle.sampleLocalSourcePath,
      atlasSourcePath: bundle.atlasSourcePath,
      textureFitReviewBundlePath: path.relative(workspaceRoot, bundlePath),
      nextTextureFitReviewStep: bundle.nextTextureFitReviewStep
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
