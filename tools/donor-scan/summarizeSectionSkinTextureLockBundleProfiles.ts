import { promises as fs } from "node:fs";
import path from "node:path";
import type {
  SectionSkinTextureLockBundleFile,
  SectionSkinTextureLockBundleProfileRecord,
  SectionSkinTextureLockBundleProfilesFile
} from "./shared";
import { readOptionalJsonFile, workspaceRoot } from "./shared";

interface SummarizeSectionSkinTextureLockBundleProfilesOptions {
  donorId: string;
  donorName: string;
  textureLockBundlesRoot: string;
}

function sortProfiles(
  left: SectionSkinTextureLockBundleProfileRecord,
  right: SectionSkinTextureLockBundleProfileRecord
): number {
  if (left.unresolvedPageLockCount !== right.unresolvedPageLockCount) {
    return right.unresolvedPageLockCount - left.unresolvedPageLockCount;
  }
  if (left.readyLayerCount !== right.readyLayerCount) {
    return right.readyLayerCount - left.readyLayerCount;
  }
  if (left.appliedPageLockCount !== right.appliedPageLockCount) {
    return right.appliedPageLockCount - left.appliedPageLockCount;
  }
  return left.sectionKey.localeCompare(right.sectionKey);
}

export async function summarizeSectionSkinTextureLockBundleProfiles(
  options: SummarizeSectionSkinTextureLockBundleProfilesOptions
): Promise<SectionSkinTextureLockBundleProfilesFile> {
  const absoluteRoot = path.isAbsolute(options.textureLockBundlesRoot)
    ? options.textureLockBundlesRoot
    : path.join(workspaceRoot, options.textureLockBundlesRoot);
  let entryNames: string[] = [];
  try {
    entryNames = await fs.readdir(absoluteRoot);
  } catch {
    entryNames = [];
  }

  const sections: SectionSkinTextureLockBundleProfileRecord[] = [];
  for (const entryName of entryNames.filter((value) => value.endsWith(".json")).sort((left, right) => left.localeCompare(right))) {
    const bundlePath = path.join(absoluteRoot, entryName);
    const bundle = await readOptionalJsonFile<SectionSkinTextureLockBundleFile>(bundlePath);
    if (!bundle) {
      continue;
    }
    sections.push({
      familyName: bundle.familyName,
      sectionKey: bundle.sectionKey,
      skinName: bundle.skinName,
      textureLockState: bundle.textureLockState,
      pageCount: bundle.pageCount,
      exactPageLockCount: bundle.exactPageLockCount,
      appliedPageLockCount: bundle.appliedPageLockCount,
      unresolvedPageLockCount: bundle.unresolvedPageLockCount,
      layerCount: bundle.layerCount,
      readyLayerCount: bundle.readyLayerCount,
      blockedLayerCount: bundle.blockedLayerCount,
      topLockedLocalPath: bundle.topLockedLocalPath,
      sampleLocalSourcePath: bundle.sampleLocalSourcePath,
      atlasSourcePath: bundle.atlasSourcePath,
      textureLockBundlePath: path.relative(workspaceRoot, bundlePath),
      nextTextureLockStep: bundle.nextTextureLockStep
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
