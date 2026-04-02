import { promises as fs } from "node:fs";
import path from "node:path";
import type {
  SectionSkinPageLockApplyBundleFile,
  SectionSkinPageLockApplyBundleProfileRecord,
  SectionSkinPageLockApplyBundleProfilesFile
} from "./shared";
import { readOptionalJsonFile, workspaceRoot } from "./shared";

interface SummarizeSectionSkinPageLockApplyBundleProfilesOptions {
  donorId: string;
  donorName: string;
  pageLockApplyBundlesRoot: string;
}

function sortProfiles(
  left: SectionSkinPageLockApplyBundleProfileRecord,
  right: SectionSkinPageLockApplyBundleProfileRecord
): number {
  if (left.unresolvedPageLockCount !== right.unresolvedPageLockCount) {
    return right.unresolvedPageLockCount - left.unresolvedPageLockCount;
  }
  if (left.appliedPageLockCount !== right.appliedPageLockCount) {
    return right.appliedPageLockCount - left.appliedPageLockCount;
  }
  if (left.affectedLayerCount !== right.affectedLayerCount) {
    return right.affectedLayerCount - left.affectedLayerCount;
  }
  return left.sectionKey.localeCompare(right.sectionKey);
}

export async function summarizeSectionSkinPageLockApplyBundleProfiles(
  options: SummarizeSectionSkinPageLockApplyBundleProfilesOptions
): Promise<SectionSkinPageLockApplyBundleProfilesFile> {
  const absoluteRoot = path.isAbsolute(options.pageLockApplyBundlesRoot)
    ? options.pageLockApplyBundlesRoot
    : path.join(workspaceRoot, options.pageLockApplyBundlesRoot);
  let entryNames: string[] = [];
  try {
    entryNames = await fs.readdir(absoluteRoot);
  } catch {
    entryNames = [];
  }

  const sections: SectionSkinPageLockApplyBundleProfileRecord[] = [];
  for (const entryName of entryNames.filter((value) => value.endsWith(".json")).sort((left, right) => left.localeCompare(right))) {
    const bundlePath = path.join(absoluteRoot, entryName);
    const bundle = await readOptionalJsonFile<SectionSkinPageLockApplyBundleFile>(bundlePath);
    if (!bundle) {
      continue;
    }
    sections.push({
      familyName: bundle.familyName,
      sectionKey: bundle.sectionKey,
      skinName: bundle.skinName,
      pageLockApplyState: bundle.pageLockApplyState,
      pageCount: bundle.pageCount,
      exactPageLockCount: bundle.exactPageLockCount,
      appliedPageLockCount: bundle.appliedPageLockCount,
      unresolvedPageLockCount: bundle.unresolvedPageLockCount,
      resolvedConflictPageCount: bundle.resolvedConflictPageCount,
      uniqueResolvedLocalPathCount: bundle.uniqueResolvedLocalPathCount,
      affectedLayerCount: bundle.affectedLayerCount,
      affectedAttachmentCount: bundle.affectedAttachmentCount,
      topAppliedLocalPath: bundle.topAppliedLocalPath,
      topAffectedSlotName: bundle.topAffectedSlotName,
      sampleLocalSourcePath: bundle.sampleLocalSourcePath,
      atlasSourcePath: bundle.atlasSourcePath,
      pageLockApplyBundlePath: path.relative(workspaceRoot, bundlePath),
      nextPageLockApplyStep: bundle.nextPageLockApplyStep
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
