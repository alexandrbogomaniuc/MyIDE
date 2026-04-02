import { promises as fs } from "node:fs";
import path from "node:path";
import type {
  SectionSkinTextureRenderBundleFile,
  SectionSkinTextureRenderBundleProfileRecord,
  SectionSkinTextureRenderBundleProfilesFile
} from "./shared";
import { readOptionalJsonFile, workspaceRoot } from "./shared";

interface SummarizeSectionSkinTextureRenderBundleProfilesOptions {
  donorId: string;
  donorName: string;
  textureRenderBundlesRoot: string;
}

function sortProfiles(
  left: SectionSkinTextureRenderBundleProfileRecord,
  right: SectionSkinTextureRenderBundleProfileRecord
): number {
  if (left.blockedPageCount !== right.blockedPageCount) {
    return right.blockedPageCount - left.blockedPageCount;
  }
  if (left.readyPageCount !== right.readyPageCount) {
    return right.readyPageCount - left.readyPageCount;
  }
  if (left.readyLayerCount !== right.readyLayerCount) {
    return right.readyLayerCount - left.readyLayerCount;
  }
  if (left.uniqueSelectedLocalPathCount !== right.uniqueSelectedLocalPathCount) {
    return right.uniqueSelectedLocalPathCount - left.uniqueSelectedLocalPathCount;
  }
  return left.sectionKey.localeCompare(right.sectionKey);
}

export async function summarizeSectionSkinTextureRenderBundleProfiles(
  options: SummarizeSectionSkinTextureRenderBundleProfilesOptions
): Promise<SectionSkinTextureRenderBundleProfilesFile> {
  const absoluteRoot = path.isAbsolute(options.textureRenderBundlesRoot)
    ? options.textureRenderBundlesRoot
    : path.join(workspaceRoot, options.textureRenderBundlesRoot);
  let entryNames: string[] = [];
  try {
    entryNames = await fs.readdir(absoluteRoot);
  } catch {
    entryNames = [];
  }

  const sections: SectionSkinTextureRenderBundleProfileRecord[] = [];
  for (const entryName of entryNames.filter((value) => value.endsWith(".json")).sort((left, right) => left.localeCompare(right))) {
    const bundlePath = path.join(absoluteRoot, entryName);
    const bundle = await readOptionalJsonFile<SectionSkinTextureRenderBundleFile>(bundlePath);
    if (!bundle) {
      continue;
    }
    sections.push({
      familyName: bundle.familyName,
      sectionKey: bundle.sectionKey,
      skinName: bundle.skinName,
      textureRenderState: bundle.textureRenderState,
      pageCount: bundle.pageCount,
      pageSizeCount: bundle.pageSizeCount,
      missingPageSizeCount: bundle.missingPageSizeCount,
      exactPageLockCount: bundle.exactPageLockCount,
      appliedPageLockCount: bundle.appliedPageLockCount,
      unresolvedPageLockCount: bundle.unresolvedPageLockCount,
      readyPageCount: bundle.readyPageCount,
      blockedPageCount: bundle.blockedPageCount,
      uniqueSelectedLocalPathCount: bundle.uniqueSelectedLocalPathCount,
      layerCount: bundle.layerCount,
      readyLayerCount: bundle.readyLayerCount,
      blockedLayerCount: bundle.blockedLayerCount,
      topRenderLocalPath: bundle.topRenderLocalPath,
      sampleLocalSourcePath: bundle.sampleLocalSourcePath,
      atlasSourcePath: bundle.atlasSourcePath,
      textureRenderBundlePath: path.relative(workspaceRoot, bundlePath),
      nextTextureRenderStep: bundle.nextTextureRenderStep
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
