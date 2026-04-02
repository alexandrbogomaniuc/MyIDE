import { promises as fs } from "node:fs";
import path from "node:path";
import type {
  SectionSkinTextureAssemblyBundleFile,
  SectionSkinTextureAssemblyBundleProfileRecord,
  SectionSkinTextureAssemblyBundleProfilesFile
} from "./shared";
import { readOptionalJsonFile, workspaceRoot } from "./shared";

interface SummarizeSectionSkinTextureAssemblyBundleProfilesOptions {
  donorId: string;
  donorName: string;
  textureAssemblyBundlesRoot: string;
}

function sortProfiles(
  left: SectionSkinTextureAssemblyBundleProfileRecord,
  right: SectionSkinTextureAssemblyBundleProfileRecord
): number {
  if (left.unresolvedPageLockCount !== right.unresolvedPageLockCount) {
    return right.unresolvedPageLockCount - left.unresolvedPageLockCount;
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

export async function summarizeSectionSkinTextureAssemblyBundleProfiles(
  options: SummarizeSectionSkinTextureAssemblyBundleProfilesOptions
): Promise<SectionSkinTextureAssemblyBundleProfilesFile> {
  const absoluteRoot = path.isAbsolute(options.textureAssemblyBundlesRoot)
    ? options.textureAssemblyBundlesRoot
    : path.join(workspaceRoot, options.textureAssemblyBundlesRoot);
  let entryNames: string[] = [];
  try {
    entryNames = await fs.readdir(absoluteRoot);
  } catch {
    entryNames = [];
  }

  const sections: SectionSkinTextureAssemblyBundleProfileRecord[] = [];
  for (const entryName of entryNames.filter((value) => value.endsWith(".json")).sort((left, right) => left.localeCompare(right))) {
    const bundlePath = path.join(absoluteRoot, entryName);
    const bundle = await readOptionalJsonFile<SectionSkinTextureAssemblyBundleFile>(bundlePath);
    if (!bundle) {
      continue;
    }
    sections.push({
      familyName: bundle.familyName,
      sectionKey: bundle.sectionKey,
      skinName: bundle.skinName,
      textureAssemblyState: bundle.textureAssemblyState,
      pageCount: bundle.pageCount,
      exactPageLockCount: bundle.exactPageLockCount,
      appliedPageLockCount: bundle.appliedPageLockCount,
      unresolvedPageLockCount: bundle.unresolvedPageLockCount,
      readyPageCount: bundle.readyPageCount,
      blockedPageCount: bundle.blockedPageCount,
      uniqueSelectedLocalPathCount: bundle.uniqueSelectedLocalPathCount,
      layerCount: bundle.layerCount,
      readyLayerCount: bundle.readyLayerCount,
      blockedLayerCount: bundle.blockedLayerCount,
      topAssemblyLocalPath: bundle.topAssemblyLocalPath,
      sampleLocalSourcePath: bundle.sampleLocalSourcePath,
      atlasSourcePath: bundle.atlasSourcePath,
      textureAssemblyBundlePath: path.relative(workspaceRoot, bundlePath),
      nextTextureAssemblyStep: bundle.nextTextureAssemblyStep
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
