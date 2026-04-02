import { promises as fs } from "node:fs";
import path from "node:path";
import type {
  SectionSkinPageLockApprovalBundleFile,
  SectionSkinPageLockApprovalBundleProfileRecord,
  SectionSkinPageLockApprovalBundleProfilesFile
} from "./shared";
import { readOptionalJsonFile, workspaceRoot } from "./shared";

interface SummarizeSectionSkinPageLockApprovalBundleProfilesOptions {
  donorId: string;
  donorName: string;
  pageLockApprovalBundlesRoot: string;
}

function sortProfiles(
  left: SectionSkinPageLockApprovalBundleProfileRecord,
  right: SectionSkinPageLockApprovalBundleProfileRecord
): number {
  if (left.unresolvedPageLockCount !== right.unresolvedPageLockCount) {
    return right.unresolvedPageLockCount - left.unresolvedPageLockCount;
  }
  if (left.approvalReadyPageCount !== right.approvalReadyPageCount) {
    return right.approvalReadyPageCount - left.approvalReadyPageCount;
  }
  if (left.affectedLayerCount !== right.affectedLayerCount) {
    return right.affectedLayerCount - left.affectedLayerCount;
  }
  return left.sectionKey.localeCompare(right.sectionKey);
}

export async function summarizeSectionSkinPageLockApprovalBundleProfiles(
  options: SummarizeSectionSkinPageLockApprovalBundleProfilesOptions
): Promise<SectionSkinPageLockApprovalBundleProfilesFile> {
  const absoluteRoot = path.isAbsolute(options.pageLockApprovalBundlesRoot)
    ? options.pageLockApprovalBundlesRoot
    : path.join(workspaceRoot, options.pageLockApprovalBundlesRoot);
  let entryNames: string[] = [];
  try {
    entryNames = await fs.readdir(absoluteRoot);
  } catch {
    entryNames = [];
  }

  const sections: SectionSkinPageLockApprovalBundleProfileRecord[] = [];
  for (const entryName of entryNames.filter((value) => value.endsWith(".json")).sort((left, right) => left.localeCompare(right))) {
    const bundlePath = path.join(absoluteRoot, entryName);
    const bundle = await readOptionalJsonFile<SectionSkinPageLockApprovalBundleFile>(bundlePath);
    if (!bundle) {
      continue;
    }
    sections.push({
      familyName: bundle.familyName,
      sectionKey: bundle.sectionKey,
      skinName: bundle.skinName,
      pageLockApprovalState: bundle.pageLockApprovalState,
      pageCount: bundle.pageCount,
      exactPageLockCount: bundle.exactPageLockCount,
      approvalReadyPageCount: bundle.approvalReadyPageCount,
      unresolvedPageLockCount: bundle.unresolvedPageLockCount,
      resolvedConflictPageCount: bundle.resolvedConflictPageCount,
      uniqueResolvedLocalPathCount: bundle.uniqueResolvedLocalPathCount,
      affectedLayerCount: bundle.affectedLayerCount,
      affectedAttachmentCount: bundle.affectedAttachmentCount,
      topApprovalLocalPath: bundle.topApprovalLocalPath,
      topAffectedSlotName: bundle.topAffectedSlotName,
      sampleLocalSourcePath: bundle.sampleLocalSourcePath,
      atlasSourcePath: bundle.atlasSourcePath,
      pageLockApprovalBundlePath: path.relative(workspaceRoot, bundlePath),
      nextPageLockApprovalStep: bundle.nextPageLockApprovalStep
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
