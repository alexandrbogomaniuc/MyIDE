import { promises as fs } from "node:fs";
import path from "node:path";
import type {
  SectionSkinTextureCanvasBundleFile,
  SectionSkinTextureCanvasBundleProfileRecord,
  SectionSkinTextureCanvasBundleProfilesFile
} from "./shared";
import { readOptionalJsonFile, workspaceRoot } from "./shared";

interface SummarizeSectionSkinTextureCanvasBundleProfilesOptions {
  donorId: string;
  donorName: string;
  textureCanvasBundlesRoot: string;
}

function sortProfiles(
  left: SectionSkinTextureCanvasBundleProfileRecord,
  right: SectionSkinTextureCanvasBundleProfileRecord
): number {
  if (left.blockedPageCount !== right.blockedPageCount) {
    return right.blockedPageCount - left.blockedPageCount;
  }
  if (left.readyPageCount !== right.readyPageCount) {
    return right.readyPageCount - left.readyPageCount;
  }
  if (left.readyDrawOperationCount !== right.readyDrawOperationCount) {
    return right.readyDrawOperationCount - left.readyDrawOperationCount;
  }
  if (left.uniqueSelectedLocalPathCount !== right.uniqueSelectedLocalPathCount) {
    return right.uniqueSelectedLocalPathCount - left.uniqueSelectedLocalPathCount;
  }
  return left.sectionKey.localeCompare(right.sectionKey);
}

export async function summarizeSectionSkinTextureCanvasBundleProfiles(
  options: SummarizeSectionSkinTextureCanvasBundleProfilesOptions
): Promise<SectionSkinTextureCanvasBundleProfilesFile> {
  const absoluteRoot = path.isAbsolute(options.textureCanvasBundlesRoot)
    ? options.textureCanvasBundlesRoot
    : path.join(workspaceRoot, options.textureCanvasBundlesRoot);
  let entryNames: string[] = [];
  try {
    entryNames = await fs.readdir(absoluteRoot);
  } catch {
    entryNames = [];
  }

  const sections: SectionSkinTextureCanvasBundleProfileRecord[] = [];
  for (const entryName of entryNames.filter((value) => value.endsWith(".json")).sort((left, right) => left.localeCompare(right))) {
    const bundlePath = path.join(absoluteRoot, entryName);
    const bundle = await readOptionalJsonFile<SectionSkinTextureCanvasBundleFile>(bundlePath);
    if (!bundle) {
      continue;
    }
    sections.push({
      familyName: bundle.familyName,
      sectionKey: bundle.sectionKey,
      skinName: bundle.skinName,
      textureCanvasState: bundle.textureCanvasState,
      pageCount: bundle.pageCount,
      pageSizeCount: bundle.pageSizeCount,
      missingPageSizeCount: bundle.missingPageSizeCount,
      exactPageLockCount: bundle.exactPageLockCount,
      appliedPageLockCount: bundle.appliedPageLockCount,
      unresolvedPageLockCount: bundle.unresolvedPageLockCount,
      readyPageCount: bundle.readyPageCount,
      blockedPageCount: bundle.blockedPageCount,
      uniqueSelectedLocalPathCount: bundle.uniqueSelectedLocalPathCount,
      drawOperationCount: bundle.drawOperationCount,
      readyDrawOperationCount: bundle.readyDrawOperationCount,
      blockedDrawOperationCount: bundle.blockedDrawOperationCount,
      topCanvasLocalPath: bundle.topCanvasLocalPath,
      sampleLocalSourcePath: bundle.sampleLocalSourcePath,
      atlasSourcePath: bundle.atlasSourcePath,
      textureCanvasBundlePath: path.relative(workspaceRoot, bundlePath),
      nextTextureCanvasStep: bundle.nextTextureCanvasStep
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
