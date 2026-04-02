import { promises as fs } from "node:fs";
import path from "node:path";
import type {
  SectionSkinTextureReconstructionBundleFile,
  SectionSkinTextureReconstructionBundleProfileRecord,
  SectionSkinTextureReconstructionBundleProfilesFile
} from "./shared";
import { readOptionalJsonFile, workspaceRoot } from "./shared";

interface SummarizeSectionSkinTextureReconstructionBundleProfilesOptions {
  donorId: string;
  donorName: string;
  textureReconstructionBundlesRoot: string;
}

function sortProfiles(
  left: SectionSkinTextureReconstructionBundleProfileRecord,
  right: SectionSkinTextureReconstructionBundleProfileRecord
): number {
  if (left.reconstructableLayerCount !== right.reconstructableLayerCount) {
    return right.reconstructableLayerCount - left.reconstructableLayerCount;
  }
  if (left.exactPageSourceCount !== right.exactPageSourceCount) {
    return right.exactPageSourceCount - left.exactPageSourceCount;
  }
  if (left.proposedPageSourceCount !== right.proposedPageSourceCount) {
    return right.proposedPageSourceCount - left.proposedPageSourceCount;
  }
  if (left.blockedLayerCount !== right.blockedLayerCount) {
    return left.blockedLayerCount - right.blockedLayerCount;
  }
  return left.sectionKey.localeCompare(right.sectionKey);
}

export async function summarizeSectionSkinTextureReconstructionBundleProfiles(
  options: SummarizeSectionSkinTextureReconstructionBundleProfilesOptions
): Promise<SectionSkinTextureReconstructionBundleProfilesFile> {
  const absoluteRoot = path.isAbsolute(options.textureReconstructionBundlesRoot)
    ? options.textureReconstructionBundlesRoot
    : path.join(workspaceRoot, options.textureReconstructionBundlesRoot);
  let entryNames: string[] = [];
  try {
    entryNames = await fs.readdir(absoluteRoot);
  } catch {
    entryNames = [];
  }

  const sections: SectionSkinTextureReconstructionBundleProfileRecord[] = [];
  for (const entryName of entryNames.filter((value) => value.endsWith(".json")).sort((left, right) => left.localeCompare(right))) {
    const bundlePath = path.join(absoluteRoot, entryName);
    const bundle = await readOptionalJsonFile<SectionSkinTextureReconstructionBundleFile>(bundlePath);
    if (!bundle) {
      continue;
    }
    sections.push({
      familyName: bundle.familyName,
      sectionKey: bundle.sectionKey,
      skinName: bundle.skinName,
      textureReconstructionState: bundle.textureReconstructionState,
      pageCount: bundle.pageCount,
      exactPageSourceCount: bundle.exactPageSourceCount,
      proposedPageSourceCount: bundle.proposedPageSourceCount,
      missingPageSourceCount: bundle.missingPageSourceCount,
      layerCount: bundle.layerCount,
      reconstructableLayerCount: bundle.reconstructableLayerCount,
      blockedLayerCount: bundle.blockedLayerCount,
      topTextureSourceLocalPath: bundle.topTextureSourceLocalPath,
      sampleLocalSourcePath: bundle.sampleLocalSourcePath,
      atlasSourcePath: bundle.atlasSourcePath,
      textureReconstructionBundlePath: path.relative(workspaceRoot, bundlePath),
      nextTextureReconstructionStep: bundle.nextTextureReconstructionStep
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
