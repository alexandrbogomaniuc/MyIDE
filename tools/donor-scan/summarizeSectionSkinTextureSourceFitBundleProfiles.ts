import { promises as fs } from "node:fs";
import path from "node:path";
import type {
  SectionSkinTextureSourceFitBundleFile,
  SectionSkinTextureSourceFitBundleProfileRecord,
  SectionSkinTextureSourceFitBundleProfilesFile
} from "./shared";
import { readOptionalJsonFile, workspaceRoot } from "./shared";

interface SummarizeSectionSkinTextureSourceFitBundleProfilesOptions {
  donorId: string;
  donorName: string;
  textureSourceFitBundlesRoot: string;
}

function sortProfiles(
  left: SectionSkinTextureSourceFitBundleProfileRecord,
  right: SectionSkinTextureSourceFitBundleProfileRecord
): number {
  if (left.missingSourceDimensionCount !== right.missingSourceDimensionCount) {
    return right.missingSourceDimensionCount - left.missingSourceDimensionCount;
  }
  if (left.nonUniformScalePageFitCount !== right.nonUniformScalePageFitCount) {
    return right.nonUniformScalePageFitCount - left.nonUniformScalePageFitCount;
  }
  if (left.readyPageCount !== right.readyPageCount) {
    return right.readyPageCount - left.readyPageCount;
  }
  if (left.readyDrawOperationCount !== right.readyDrawOperationCount) {
    return right.readyDrawOperationCount - left.readyDrawOperationCount;
  }
  return left.sectionKey.localeCompare(right.sectionKey);
}

export async function summarizeSectionSkinTextureSourceFitBundleProfiles(
  options: SummarizeSectionSkinTextureSourceFitBundleProfilesOptions
): Promise<SectionSkinTextureSourceFitBundleProfilesFile> {
  const absoluteRoot = path.isAbsolute(options.textureSourceFitBundlesRoot)
    ? options.textureSourceFitBundlesRoot
    : path.join(workspaceRoot, options.textureSourceFitBundlesRoot);
  let entryNames: string[] = [];
  try {
    entryNames = await fs.readdir(absoluteRoot);
  } catch {
    entryNames = [];
  }

  const sections: SectionSkinTextureSourceFitBundleProfileRecord[] = [];
  for (const entryName of entryNames.filter((value) => value.endsWith(".json")).sort((left, right) => left.localeCompare(right))) {
    const bundlePath = path.join(absoluteRoot, entryName);
    const bundle = await readOptionalJsonFile<SectionSkinTextureSourceFitBundleFile>(bundlePath);
    if (!bundle) {
      continue;
    }
    sections.push({
      familyName: bundle.familyName,
      sectionKey: bundle.sectionKey,
      skinName: bundle.skinName,
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
      readyPageCount: bundle.readyPageCount,
      blockedPageCount: bundle.blockedPageCount,
      uniqueSelectedLocalPathCount: bundle.uniqueSelectedLocalPathCount,
      drawOperationCount: bundle.drawOperationCount,
      readyDrawOperationCount: bundle.readyDrawOperationCount,
      blockedDrawOperationCount: bundle.blockedDrawOperationCount,
      topFittedLocalPath: bundle.topFittedLocalPath,
      sampleLocalSourcePath: bundle.sampleLocalSourcePath,
      atlasSourcePath: bundle.atlasSourcePath,
      textureSourceFitBundlePath: path.relative(workspaceRoot, bundlePath),
      nextTextureSourceFitStep: bundle.nextTextureSourceFitStep
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
