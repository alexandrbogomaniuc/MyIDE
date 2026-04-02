import { promises as fs } from "node:fs";
import path from "node:path";
import type {
  SectionSkinMaterialReviewBundleFile,
  SectionSkinMaterialReviewBundleProfileRecord,
  SectionSkinMaterialReviewBundleProfilesFile
} from "./shared";
import { readOptionalJsonFile, workspaceRoot } from "./shared";

interface SummarizeSectionSkinMaterialReviewBundleProfilesOptions {
  donorId: string;
  donorName: string;
  reviewBundlesRoot: string;
}

function sortProfiles(
  left: SectionSkinMaterialReviewBundleProfileRecord,
  right: SectionSkinMaterialReviewBundleProfileRecord
): number {
  if (left.exactPageImageCount !== right.exactPageImageCount) {
    return right.exactPageImageCount - left.exactPageImageCount;
  }
  if (left.reviewReadyPageCount !== right.reviewReadyPageCount) {
    return right.reviewReadyPageCount - left.reviewReadyPageCount;
  }
  if (left.blockedPageCount !== right.blockedPageCount) {
    return left.blockedPageCount - right.blockedPageCount;
  }
  return left.sectionKey.localeCompare(right.sectionKey);
}

export async function summarizeSectionSkinMaterialReviewBundleProfiles(
  options: SummarizeSectionSkinMaterialReviewBundleProfilesOptions
): Promise<SectionSkinMaterialReviewBundleProfilesFile> {
  const absoluteRoot = path.isAbsolute(options.reviewBundlesRoot)
    ? options.reviewBundlesRoot
    : path.join(workspaceRoot, options.reviewBundlesRoot);
  let entryNames: string[] = [];
  try {
    entryNames = await fs.readdir(absoluteRoot);
  } catch {
    entryNames = [];
  }

  const sections: SectionSkinMaterialReviewBundleProfileRecord[] = [];
  for (const entryName of entryNames.filter((value) => value.endsWith(".json")).sort((left, right) => left.localeCompare(right))) {
    const reviewBundlePath = path.join(absoluteRoot, entryName);
    const reviewBundle = await readOptionalJsonFile<SectionSkinMaterialReviewBundleFile>(reviewBundlePath);
    if (!reviewBundle) {
      continue;
    }
    sections.push({
      familyName: reviewBundle.familyName,
      sectionKey: reviewBundle.sectionKey,
      skinName: reviewBundle.skinName,
      reviewState: reviewBundle.reviewState,
      pageCount: reviewBundle.pageCount,
      exactPageImageCount: reviewBundle.exactPageImageCount,
      missingPageImageCount: reviewBundle.missingPageImageCount,
      reviewReadyPageCount: reviewBundle.reviewReadyPageCount,
      blockedPageCount: reviewBundle.blockedPageCount,
      topCandidateLocalPath: reviewBundle.topCandidateLocalPath,
      sampleLocalSourcePath: reviewBundle.sampleLocalSourcePath,
      atlasSourcePath: reviewBundle.atlasSourcePath,
      reviewBundlePath: path.relative(workspaceRoot, reviewBundlePath),
      nextReviewStep: reviewBundle.nextReviewStep
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
