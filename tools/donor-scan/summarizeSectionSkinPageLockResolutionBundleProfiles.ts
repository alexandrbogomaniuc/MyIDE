import { promises as fs } from "node:fs";
import path from "node:path";
import type {
  SectionSkinPageLockResolutionBundleFile,
  SectionSkinPageLockResolutionBundleProfileRecord,
  SectionSkinPageLockResolutionBundleProfilesFile
} from "./shared";
import { readOptionalJsonFile, workspaceRoot } from "./shared";

interface SummarizeSectionSkinPageLockResolutionBundleProfilesOptions {
  donorId: string;
  donorName: string;
  pageLockResolutionBundlesRoot: string;
}

function sortProfiles(
  left: SectionSkinPageLockResolutionBundleProfileRecord,
  right: SectionSkinPageLockResolutionBundleProfileRecord
): number {
  if (left.unresolvedConflictPageCount !== right.unresolvedConflictPageCount) {
    return right.unresolvedConflictPageCount - left.unresolvedConflictPageCount;
  }
  if (left.resolvedConflictPageCount !== right.resolvedConflictPageCount) {
    return right.resolvedConflictPageCount - left.resolvedConflictPageCount;
  }
  if (left.uniqueResolvedLocalPathCount !== right.uniqueResolvedLocalPathCount) {
    return right.uniqueResolvedLocalPathCount - left.uniqueResolvedLocalPathCount;
  }
  return left.sectionKey.localeCompare(right.sectionKey);
}

export async function summarizeSectionSkinPageLockResolutionBundleProfiles(
  options: SummarizeSectionSkinPageLockResolutionBundleProfilesOptions
): Promise<SectionSkinPageLockResolutionBundleProfilesFile> {
  const absoluteRoot = path.isAbsolute(options.pageLockResolutionBundlesRoot)
    ? options.pageLockResolutionBundlesRoot
    : path.join(workspaceRoot, options.pageLockResolutionBundlesRoot);
  let entryNames: string[] = [];
  try {
    entryNames = await fs.readdir(absoluteRoot);
  } catch {
    entryNames = [];
  }

  const sections: SectionSkinPageLockResolutionBundleProfileRecord[] = [];
  for (const entryName of entryNames.filter((value) => value.endsWith(".json")).sort((left, right) => left.localeCompare(right))) {
    const bundlePath = path.join(absoluteRoot, entryName);
    const bundle = await readOptionalJsonFile<SectionSkinPageLockResolutionBundleFile>(bundlePath);
    if (!bundle) {
      continue;
    }
    sections.push({
      familyName: bundle.familyName,
      sectionKey: bundle.sectionKey,
      skinName: bundle.skinName,
      pageLockResolutionState: bundle.pageLockResolutionState,
      pageCount: bundle.pageCount,
      exactPageLockCount: bundle.exactPageLockCount,
      proposedPageLockCount: bundle.proposedPageLockCount,
      missingPageLockCount: bundle.missingPageLockCount,
      resolvedConflictPageCount: bundle.resolvedConflictPageCount,
      unresolvedConflictPageCount: bundle.unresolvedConflictPageCount,
      uniqueResolvedLocalPathCount: bundle.uniqueResolvedLocalPathCount,
      duplicateSourceGroupCount: bundle.duplicateSourceGroupCount,
      duplicateSourcePageCount: bundle.duplicateSourcePageCount,
      topResolvedLocalPath: bundle.topResolvedLocalPath,
      sampleLocalSourcePath: bundle.sampleLocalSourcePath,
      atlasSourcePath: bundle.atlasSourcePath,
      pageLockResolutionBundlePath: path.relative(workspaceRoot, bundlePath),
      nextPageLockResolutionStep: bundle.nextPageLockResolutionStep
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
