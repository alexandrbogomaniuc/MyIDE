import { promises as fs } from "node:fs";
import path from "node:path";
import type {
  SectionReconstructionBundleFile,
  SectionReconstructionProfileRecord,
  SectionReconstructionProfilesFile
} from "./shared";
import { readOptionalJsonFile, workspaceRoot } from "./shared";

interface SummarizeSectionReconstructionProfilesOptions {
  donorId: string;
  donorName: string;
  bundlesRoot: string;
}

function sortProfiles(
  left: SectionReconstructionProfileRecord,
  right: SectionReconstructionProfileRecord
): number {
  if (left.mappedAttachmentCount !== right.mappedAttachmentCount) {
    return right.mappedAttachmentCount - left.mappedAttachmentCount;
  }
  if (left.attachmentCount !== right.attachmentCount) {
    return right.attachmentCount - left.attachmentCount;
  }
  return left.sectionKey.localeCompare(right.sectionKey);
}

export async function summarizeSectionReconstructionProfiles(
  options: SummarizeSectionReconstructionProfilesOptions
): Promise<SectionReconstructionProfilesFile> {
  const absoluteRoot = path.isAbsolute(options.bundlesRoot)
    ? options.bundlesRoot
    : path.join(workspaceRoot, options.bundlesRoot);
  let entryNames: string[] = [];
  try {
    entryNames = await fs.readdir(absoluteRoot);
  } catch {
    entryNames = [];
  }

  const sections: SectionReconstructionProfileRecord[] = [];
  for (const entryName of entryNames.filter((value) => value.endsWith(".json")).sort((left, right) => left.localeCompare(right))) {
    const bundlePath = path.join(absoluteRoot, entryName);
    const bundle = await readOptionalJsonFile<SectionReconstructionBundleFile>(bundlePath);
    if (!bundle) {
      continue;
    }
    sections.push({
      familyName: bundle.familyName,
      sectionKey: bundle.sectionKey,
      skinName: bundle.skinName,
      reconstructionState: bundle.reconstructionState,
      attachmentCount: bundle.attachmentCount,
      mappedAttachmentCount: bundle.mappedAttachmentCount,
      unmappedAttachmentCount: bundle.unmappedAttachmentCount,
      atlasPageCount: bundle.atlasPageCount,
      atlasRegionCount: bundle.atlasRegionCount,
      slotCount: bundle.slotCount,
      exactLocalSourceCount: bundle.exactLocalSourceCount,
      relatedLocalSourceCount: bundle.relatedLocalSourceCount,
      sampleLocalSourcePath: bundle.sampleLocalSourcePath,
      worksetPath: bundle.worksetPath,
      reconstructionBundlePath: path.relative(workspaceRoot, bundlePath),
      nextReconstructionStep: bundle.nextReconstructionStep
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
