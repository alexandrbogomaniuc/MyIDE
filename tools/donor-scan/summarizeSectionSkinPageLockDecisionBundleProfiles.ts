import { promises as fs } from "node:fs";
import path from "node:path";
import type {
  SectionSkinPageLockDecisionBundleFile,
  SectionSkinPageLockDecisionBundleProfileRecord,
  SectionSkinPageLockDecisionBundleProfilesFile
} from "./shared";
import { readOptionalJsonFile, workspaceRoot } from "./shared";

interface SummarizeSectionSkinPageLockDecisionBundleProfilesOptions {
  donorId: string;
  donorName: string;
  pageLockDecisionBundlesRoot: string;
}

function sortProfiles(
  left: SectionSkinPageLockDecisionBundleProfileRecord,
  right: SectionSkinPageLockDecisionBundleProfileRecord
): number {
  if (left.unresolvedPageLockCount !== right.unresolvedPageLockCount) {
    return right.unresolvedPageLockCount - left.unresolvedPageLockCount;
  }
  if (left.reviewReadyPageCount !== right.reviewReadyPageCount) {
    return right.reviewReadyPageCount - left.reviewReadyPageCount;
  }
  if (left.uniqueResolvedLocalPathCount !== right.uniqueResolvedLocalPathCount) {
    return right.uniqueResolvedLocalPathCount - left.uniqueResolvedLocalPathCount;
  }
  return left.sectionKey.localeCompare(right.sectionKey);
}

export async function summarizeSectionSkinPageLockDecisionBundleProfiles(
  options: SummarizeSectionSkinPageLockDecisionBundleProfilesOptions
): Promise<SectionSkinPageLockDecisionBundleProfilesFile> {
  const absoluteRoot = path.isAbsolute(options.pageLockDecisionBundlesRoot)
    ? options.pageLockDecisionBundlesRoot
    : path.join(workspaceRoot, options.pageLockDecisionBundlesRoot);
  let entryNames: string[] = [];
  try {
    entryNames = await fs.readdir(absoluteRoot);
  } catch {
    entryNames = [];
  }

  const sections: SectionSkinPageLockDecisionBundleProfileRecord[] = [];
  for (const entryName of entryNames.filter((value) => value.endsWith(".json")).sort((left, right) => left.localeCompare(right))) {
    const bundlePath = path.join(absoluteRoot, entryName);
    const bundle = await readOptionalJsonFile<SectionSkinPageLockDecisionBundleFile>(bundlePath);
    if (!bundle) {
      continue;
    }
    sections.push({
      familyName: bundle.familyName,
      sectionKey: bundle.sectionKey,
      skinName: bundle.skinName,
      pageLockDecisionState: bundle.pageLockDecisionState,
      pageCount: bundle.pageCount,
      exactPageLockCount: bundle.exactPageLockCount,
      reviewReadyPageCount: bundle.reviewReadyPageCount,
      unresolvedPageLockCount: bundle.unresolvedPageLockCount,
      resolvedConflictPageCount: bundle.resolvedConflictPageCount,
      uniqueResolvedLocalPathCount: bundle.uniqueResolvedLocalPathCount,
      topDecisionLocalPath: bundle.topDecisionLocalPath,
      sampleLocalSourcePath: bundle.sampleLocalSourcePath,
      atlasSourcePath: bundle.atlasSourcePath,
      pageLockDecisionBundlePath: path.relative(workspaceRoot, bundlePath),
      nextPageLockDecisionStep: bundle.nextPageLockDecisionStep
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
