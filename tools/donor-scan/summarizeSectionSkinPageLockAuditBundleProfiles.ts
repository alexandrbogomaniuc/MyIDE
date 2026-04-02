import { promises as fs } from "node:fs";
import path from "node:path";
import type {
  SectionSkinPageLockAuditBundleFile,
  SectionSkinPageLockAuditBundleProfileRecord,
  SectionSkinPageLockAuditBundleProfilesFile
} from "./shared";
import { readOptionalJsonFile, workspaceRoot } from "./shared";

interface SummarizeSectionSkinPageLockAuditBundleProfilesOptions {
  donorId: string;
  donorName: string;
  pageLockAuditBundlesRoot: string;
}

function sortProfiles(
  left: SectionSkinPageLockAuditBundleProfileRecord,
  right: SectionSkinPageLockAuditBundleProfileRecord
): number {
  if (left.duplicateSourceGroupCount !== right.duplicateSourceGroupCount) {
    return right.duplicateSourceGroupCount - left.duplicateSourceGroupCount;
  }
  if (left.duplicateSourcePageCount !== right.duplicateSourcePageCount) {
    return right.duplicateSourcePageCount - left.duplicateSourcePageCount;
  }
  if (left.exactPageLockCount !== right.exactPageLockCount) {
    return right.exactPageLockCount - left.exactPageLockCount;
  }
  if (left.proposedPageLockCount !== right.proposedPageLockCount) {
    return right.proposedPageLockCount - left.proposedPageLockCount;
  }
  return left.sectionKey.localeCompare(right.sectionKey);
}

export async function summarizeSectionSkinPageLockAuditBundleProfiles(
  options: SummarizeSectionSkinPageLockAuditBundleProfilesOptions
): Promise<SectionSkinPageLockAuditBundleProfilesFile> {
  const absoluteRoot = path.isAbsolute(options.pageLockAuditBundlesRoot)
    ? options.pageLockAuditBundlesRoot
    : path.join(workspaceRoot, options.pageLockAuditBundlesRoot);
  let entryNames: string[] = [];
  try {
    entryNames = await fs.readdir(absoluteRoot);
  } catch {
    entryNames = [];
  }

  const sections: SectionSkinPageLockAuditBundleProfileRecord[] = [];
  for (const entryName of entryNames.filter((value) => value.endsWith(".json")).sort((left, right) => left.localeCompare(right))) {
    const bundlePath = path.join(absoluteRoot, entryName);
    const bundle = await readOptionalJsonFile<SectionSkinPageLockAuditBundleFile>(bundlePath);
    if (!bundle) {
      continue;
    }
    sections.push({
      familyName: bundle.familyName,
      sectionKey: bundle.sectionKey,
      skinName: bundle.skinName,
      pageLockAuditState: bundle.pageLockAuditState,
      pageCount: bundle.pageCount,
      exactPageLockCount: bundle.exactPageLockCount,
      proposedPageLockCount: bundle.proposedPageLockCount,
      missingPageLockCount: bundle.missingPageLockCount,
      uniqueSelectedLocalPathCount: bundle.uniqueSelectedLocalPathCount,
      duplicateSourceGroupCount: bundle.duplicateSourceGroupCount,
      duplicateSourcePageCount: bundle.duplicateSourcePageCount,
      layerCount: bundle.layerCount,
      readyLayerCount: bundle.readyLayerCount,
      blockedLayerCount: bundle.blockedLayerCount,
      topLockedLocalPath: bundle.topLockedLocalPath,
      topConflictLocalPath: bundle.topConflictLocalPath,
      sampleLocalSourcePath: bundle.sampleLocalSourcePath,
      atlasSourcePath: bundle.atlasSourcePath,
      pageLockAuditBundlePath: path.relative(workspaceRoot, bundlePath),
      nextPageLockAuditStep: bundle.nextPageLockAuditStep
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
