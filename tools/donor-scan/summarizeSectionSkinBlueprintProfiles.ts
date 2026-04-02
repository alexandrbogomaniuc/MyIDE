import { promises as fs } from "node:fs";
import path from "node:path";
import type {
  SectionSkinBlueprintFile,
  SectionSkinBlueprintProfileRecord,
  SectionSkinBlueprintProfilesFile
} from "./shared";
import { readOptionalJsonFile, workspaceRoot } from "./shared";

interface SummarizeSectionSkinBlueprintProfilesOptions {
  donorId: string;
  donorName: string;
  blueprintsRoot: string;
}

function sortProfiles(
  left: SectionSkinBlueprintProfileRecord,
  right: SectionSkinBlueprintProfileRecord
): number {
  if (left.mappedAttachmentCount !== right.mappedAttachmentCount) {
    return right.mappedAttachmentCount - left.mappedAttachmentCount;
  }
  if (left.attachmentCount !== right.attachmentCount) {
    return right.attachmentCount - left.attachmentCount;
  }
  return left.sectionKey.localeCompare(right.sectionKey);
}

export async function summarizeSectionSkinBlueprintProfiles(
  options: SummarizeSectionSkinBlueprintProfilesOptions
): Promise<SectionSkinBlueprintProfilesFile> {
  const absoluteRoot = path.isAbsolute(options.blueprintsRoot)
    ? options.blueprintsRoot
    : path.join(workspaceRoot, options.blueprintsRoot);
  let entryNames: string[] = [];
  try {
    entryNames = await fs.readdir(absoluteRoot);
  } catch {
    entryNames = [];
  }

  const sections: SectionSkinBlueprintProfileRecord[] = [];
  for (const entryName of entryNames.filter((value) => value.endsWith(".json")).sort((left, right) => left.localeCompare(right))) {
    const blueprintPath = path.join(absoluteRoot, entryName);
    const blueprint = await readOptionalJsonFile<SectionSkinBlueprintFile>(blueprintPath);
    if (!blueprint) {
      continue;
    }
    sections.push({
      familyName: blueprint.familyName,
      sectionKey: blueprint.sectionKey,
      skinName: blueprint.skinName,
      blueprintState: blueprint.blueprintState,
      attachmentCount: blueprint.attachmentCount,
      mappedAttachmentCount: blueprint.mappedAttachmentCount,
      unmappedAttachmentCount: blueprint.unmappedAttachmentCount,
      atlasPageCount: blueprint.atlasPageCount,
      slotCount: blueprint.slotCount,
      exactLocalSourceCount: blueprint.exactLocalSourceCount,
      sampleLocalSourcePath: blueprint.sampleLocalSourcePath,
      blueprintPath: path.relative(workspaceRoot, blueprintPath),
      nextSkinStep: blueprint.nextSkinStep
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
