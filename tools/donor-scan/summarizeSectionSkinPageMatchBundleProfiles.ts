import { promises as fs } from "node:fs";
import path from "node:path";
import type {
  SectionSkinPageMatchBundleFile,
  SectionSkinPageMatchBundleProfileRecord,
  SectionSkinPageMatchBundleProfilesFile
} from "./shared";
import { readOptionalJsonFile, workspaceRoot } from "./shared";

interface SummarizeSectionSkinPageMatchBundleProfilesOptions {
  donorId: string;
  donorName: string;
  pageMatchBundlesRoot: string;
}

function sortProfiles(
  left: SectionSkinPageMatchBundleProfileRecord,
  right: SectionSkinPageMatchBundleProfileRecord
): number {
  if (left.exactPageImageCount !== right.exactPageImageCount) {
    return right.exactPageImageCount - left.exactPageImageCount;
  }
  if (left.proposedMatchCount !== right.proposedMatchCount) {
    return right.proposedMatchCount - left.proposedMatchCount;
  }
  if (left.blockedPageCount !== right.blockedPageCount) {
    return left.blockedPageCount - right.blockedPageCount;
  }
  return left.sectionKey.localeCompare(right.sectionKey);
}

export async function summarizeSectionSkinPageMatchBundleProfiles(
  options: SummarizeSectionSkinPageMatchBundleProfilesOptions
): Promise<SectionSkinPageMatchBundleProfilesFile> {
  const absoluteRoot = path.isAbsolute(options.pageMatchBundlesRoot)
    ? options.pageMatchBundlesRoot
    : path.join(workspaceRoot, options.pageMatchBundlesRoot);
  let entryNames: string[] = [];
  try {
    entryNames = await fs.readdir(absoluteRoot);
  } catch {
    entryNames = [];
  }

  const sections: SectionSkinPageMatchBundleProfileRecord[] = [];
  for (const entryName of entryNames.filter((value) => value.endsWith(".json")).sort((left, right) => left.localeCompare(right))) {
    const pageMatchBundlePath = path.join(absoluteRoot, entryName);
    const pageMatchBundle = await readOptionalJsonFile<SectionSkinPageMatchBundleFile>(pageMatchBundlePath);
    if (!pageMatchBundle) {
      continue;
    }
    sections.push({
      familyName: pageMatchBundle.familyName,
      sectionKey: pageMatchBundle.sectionKey,
      skinName: pageMatchBundle.skinName,
      matchState: pageMatchBundle.matchState,
      pageCount: pageMatchBundle.pageCount,
      exactPageImageCount: pageMatchBundle.exactPageImageCount,
      proposedMatchCount: pageMatchBundle.proposedMatchCount,
      blockedPageCount: pageMatchBundle.blockedPageCount,
      topProposedMatchLocalPath: pageMatchBundle.topProposedMatchLocalPath,
      sampleLocalSourcePath: pageMatchBundle.sampleLocalSourcePath,
      atlasSourcePath: pageMatchBundle.atlasSourcePath,
      pageMatchBundlePath: path.relative(workspaceRoot, pageMatchBundlePath),
      nextMatchStep: pageMatchBundle.nextMatchStep
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
