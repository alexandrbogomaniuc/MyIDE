import { promises as fs } from "node:fs";
import path from "node:path";
import type {
  SectionSkinPageLockBundleFile,
  SectionSkinPageLockBundleProfileRecord,
  SectionSkinPageLockBundleProfilesFile
} from "./shared";
import { readOptionalJsonFile, workspaceRoot } from "./shared";

interface SummarizeSectionSkinPageLockBundleProfilesOptions {
  donorId: string;
  donorName: string;
  pageLockBundlesRoot: string;
}

function sortProfiles(
  left: SectionSkinPageLockBundleProfileRecord,
  right: SectionSkinPageLockBundleProfileRecord
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
  if (left.reconstructableLayerCount !== right.reconstructableLayerCount) {
    return right.reconstructableLayerCount - left.reconstructableLayerCount;
  }
  return left.sectionKey.localeCompare(right.sectionKey);
}

export async function summarizeSectionSkinPageLockBundleProfiles(
  options: SummarizeSectionSkinPageLockBundleProfilesOptions
): Promise<SectionSkinPageLockBundleProfilesFile> {
  const absoluteRoot = path.isAbsolute(options.pageLockBundlesRoot)
    ? options.pageLockBundlesRoot
    : path.join(workspaceRoot, options.pageLockBundlesRoot);
  let entryNames: string[] = [];
  try {
    entryNames = await fs.readdir(absoluteRoot);
  } catch {
    entryNames = [];
  }

  const sections: SectionSkinPageLockBundleProfileRecord[] = [];
  for (const entryName of entryNames.filter((value) => value.endsWith(".json")).sort((left, right) => left.localeCompare(right))) {
    const bundlePath = path.join(absoluteRoot, entryName);
    const bundle = await readOptionalJsonFile<SectionSkinPageLockBundleFile>(bundlePath);
    if (!bundle) {
      continue;
    }
    sections.push({
      familyName: bundle.familyName,
      sectionKey: bundle.sectionKey,
      skinName: bundle.skinName,
      pageLockState: bundle.pageLockState,
      pageCount: bundle.pageCount,
      exactPageLockCount: bundle.exactPageLockCount,
      proposedPageLockCount: bundle.proposedPageLockCount,
      missingPageLockCount: bundle.missingPageLockCount,
      reconstructableLayerCount: bundle.reconstructableLayerCount,
      blockedLayerCount: bundle.blockedLayerCount,
      topLockedLocalPath: bundle.topLockedLocalPath,
      sampleLocalSourcePath: bundle.sampleLocalSourcePath,
      atlasSourcePath: bundle.atlasSourcePath,
      pageLockBundlePath: path.relative(workspaceRoot, bundlePath),
      nextPageLockStep: bundle.nextPageLockStep
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
