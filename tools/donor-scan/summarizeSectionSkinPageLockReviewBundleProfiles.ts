import { promises as fs } from "node:fs";
import path from "node:path";
import type {
  SectionSkinPageLockReviewBundleFile,
  SectionSkinPageLockReviewBundleProfileRecord,
  SectionSkinPageLockReviewBundleProfilesFile
} from "./shared";
import { readOptionalJsonFile, workspaceRoot } from "./shared";

interface SummarizeSectionSkinPageLockReviewBundleProfilesOptions {
  donorId: string;
  donorName: string;
  pageLockReviewBundlesRoot: string;
}

function sortProfiles(
  left: SectionSkinPageLockReviewBundleProfileRecord,
  right: SectionSkinPageLockReviewBundleProfileRecord
): number {
  if (left.unresolvedPageLockCount !== right.unresolvedPageLockCount) {
    return right.unresolvedPageLockCount - left.unresolvedPageLockCount;
  }
  if (left.reviewReadyPageCount !== right.reviewReadyPageCount) {
    return right.reviewReadyPageCount - left.reviewReadyPageCount;
  }
  if (left.affectedLayerCount !== right.affectedLayerCount) {
    return right.affectedLayerCount - left.affectedLayerCount;
  }
  return left.sectionKey.localeCompare(right.sectionKey);
}

export async function summarizeSectionSkinPageLockReviewBundleProfiles(
  options: SummarizeSectionSkinPageLockReviewBundleProfilesOptions
): Promise<SectionSkinPageLockReviewBundleProfilesFile> {
  const absoluteRoot = path.isAbsolute(options.pageLockReviewBundlesRoot)
    ? options.pageLockReviewBundlesRoot
    : path.join(workspaceRoot, options.pageLockReviewBundlesRoot);
  let entryNames: string[] = [];
  try {
    entryNames = await fs.readdir(absoluteRoot);
  } catch {
    entryNames = [];
  }

  const sections: SectionSkinPageLockReviewBundleProfileRecord[] = [];
  for (const entryName of entryNames.filter((value) => value.endsWith(".json")).sort((left, right) => left.localeCompare(right))) {
    const bundlePath = path.join(absoluteRoot, entryName);
    const bundle = await readOptionalJsonFile<SectionSkinPageLockReviewBundleFile>(bundlePath);
    if (!bundle) {
      continue;
    }
    sections.push({
      familyName: bundle.familyName,
      sectionKey: bundle.sectionKey,
      skinName: bundle.skinName,
      pageLockReviewState: bundle.pageLockReviewState,
      pageCount: bundle.pageCount,
      exactPageLockCount: bundle.exactPageLockCount,
      reviewReadyPageCount: bundle.reviewReadyPageCount,
      unresolvedPageLockCount: bundle.unresolvedPageLockCount,
      resolvedConflictPageCount: bundle.resolvedConflictPageCount,
      uniqueResolvedLocalPathCount: bundle.uniqueResolvedLocalPathCount,
      affectedLayerCount: bundle.affectedLayerCount,
      affectedAttachmentCount: bundle.affectedAttachmentCount,
      topDecisionLocalPath: bundle.topDecisionLocalPath,
      topAffectedSlotName: bundle.topAffectedSlotName,
      sampleLocalSourcePath: bundle.sampleLocalSourcePath,
      atlasSourcePath: bundle.atlasSourcePath,
      pageLockReviewBundlePath: path.relative(workspaceRoot, bundlePath),
      nextPageLockReviewStep: bundle.nextPageLockReviewStep
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
