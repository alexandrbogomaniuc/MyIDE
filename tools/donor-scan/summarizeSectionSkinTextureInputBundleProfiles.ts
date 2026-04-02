import { promises as fs } from "node:fs";
import path from "node:path";
import type {
  SectionSkinTextureInputBundleFile,
  SectionSkinTextureInputBundleProfileRecord,
  SectionSkinTextureInputBundleProfilesFile
} from "./shared";
import { readOptionalJsonFile, workspaceRoot } from "./shared";

interface SummarizeSectionSkinTextureInputBundleProfilesOptions {
  donorId: string;
  donorName: string;
  textureInputBundlesRoot: string;
}

function sortProfiles(
  left: SectionSkinTextureInputBundleProfileRecord,
  right: SectionSkinTextureInputBundleProfileRecord
): number {
  if (left.exactPageLockCount !== right.exactPageLockCount) {
    return right.exactPageLockCount - left.exactPageLockCount;
  }
  if (left.proposedPageLockCount !== right.proposedPageLockCount) {
    return right.proposedPageLockCount - left.proposedPageLockCount;
  }
  if (left.missingPageLockCount !== right.missingPageLockCount) {
    return left.missingPageLockCount - right.missingPageLockCount;
  }
  if (left.readyLayerCount !== right.readyLayerCount) {
    return right.readyLayerCount - left.readyLayerCount;
  }
  return left.sectionKey.localeCompare(right.sectionKey);
}

export async function summarizeSectionSkinTextureInputBundleProfiles(
  options: SummarizeSectionSkinTextureInputBundleProfilesOptions
): Promise<SectionSkinTextureInputBundleProfilesFile> {
  const absoluteRoot = path.isAbsolute(options.textureInputBundlesRoot)
    ? options.textureInputBundlesRoot
    : path.join(workspaceRoot, options.textureInputBundlesRoot);
  let entryNames: string[] = [];
  try {
    entryNames = await fs.readdir(absoluteRoot);
  } catch {
    entryNames = [];
  }

  const sections: SectionSkinTextureInputBundleProfileRecord[] = [];
  for (const entryName of entryNames.filter((value) => value.endsWith(".json")).sort((left, right) => left.localeCompare(right))) {
    const bundlePath = path.join(absoluteRoot, entryName);
    const bundle = await readOptionalJsonFile<SectionSkinTextureInputBundleFile>(bundlePath);
    if (!bundle) {
      continue;
    }
    sections.push({
      familyName: bundle.familyName,
      sectionKey: bundle.sectionKey,
      skinName: bundle.skinName,
      textureInputState: bundle.textureInputState,
      pageCount: bundle.pageCount,
      exactPageLockCount: bundle.exactPageLockCount,
      proposedPageLockCount: bundle.proposedPageLockCount,
      missingPageLockCount: bundle.missingPageLockCount,
      layerCount: bundle.layerCount,
      readyLayerCount: bundle.readyLayerCount,
      blockedLayerCount: bundle.blockedLayerCount,
      topLockedLocalPath: bundle.topLockedLocalPath,
      sampleLocalSourcePath: bundle.sampleLocalSourcePath,
      atlasSourcePath: bundle.atlasSourcePath,
      textureInputBundlePath: path.relative(workspaceRoot, bundlePath),
      nextTextureInputStep: bundle.nextTextureInputStep
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
