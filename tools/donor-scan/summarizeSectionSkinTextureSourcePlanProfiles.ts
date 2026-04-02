import { promises as fs } from "node:fs";
import path from "node:path";
import type {
  SectionSkinTextureSourcePlanFile,
  SectionSkinTextureSourcePlanProfileRecord,
  SectionSkinTextureSourcePlanProfilesFile
} from "./shared";
import { readOptionalJsonFile, workspaceRoot } from "./shared";

interface SummarizeSectionSkinTextureSourcePlanProfilesOptions {
  donorId: string;
  donorName: string;
  textureSourcePlansRoot: string;
}

function sortProfiles(
  left: SectionSkinTextureSourcePlanProfileRecord,
  right: SectionSkinTextureSourcePlanProfileRecord
): number {
  if (left.exactPageSourceCount !== right.exactPageSourceCount) {
    return right.exactPageSourceCount - left.exactPageSourceCount;
  }
  if (left.proposedPageSourceCount !== right.proposedPageSourceCount) {
    return right.proposedPageSourceCount - left.proposedPageSourceCount;
  }
  if (left.missingPageSourceCount !== right.missingPageSourceCount) {
    return left.missingPageSourceCount - right.missingPageSourceCount;
  }
  return left.sectionKey.localeCompare(right.sectionKey);
}

export async function summarizeSectionSkinTextureSourcePlanProfiles(
  options: SummarizeSectionSkinTextureSourcePlanProfilesOptions
): Promise<SectionSkinTextureSourcePlanProfilesFile> {
  const absoluteRoot = path.isAbsolute(options.textureSourcePlansRoot)
    ? options.textureSourcePlansRoot
    : path.join(workspaceRoot, options.textureSourcePlansRoot);
  let entryNames: string[] = [];
  try {
    entryNames = await fs.readdir(absoluteRoot);
  } catch {
    entryNames = [];
  }

  const sections: SectionSkinTextureSourcePlanProfileRecord[] = [];
  for (const entryName of entryNames.filter((value) => value.endsWith(".json")).sort((left, right) => left.localeCompare(right))) {
    const textureSourcePlanPath = path.join(absoluteRoot, entryName);
    const textureSourcePlan = await readOptionalJsonFile<SectionSkinTextureSourcePlanFile>(textureSourcePlanPath);
    if (!textureSourcePlan) {
      continue;
    }
    sections.push({
      familyName: textureSourcePlan.familyName,
      sectionKey: textureSourcePlan.sectionKey,
      skinName: textureSourcePlan.skinName,
      textureSourceState: textureSourcePlan.textureSourceState,
      pageCount: textureSourcePlan.pageCount,
      exactPageSourceCount: textureSourcePlan.exactPageSourceCount,
      proposedPageSourceCount: textureSourcePlan.proposedPageSourceCount,
      missingPageSourceCount: textureSourcePlan.missingPageSourceCount,
      topTextureSourceLocalPath: textureSourcePlan.topTextureSourceLocalPath,
      sampleLocalSourcePath: textureSourcePlan.sampleLocalSourcePath,
      atlasSourcePath: textureSourcePlan.atlasSourcePath,
      textureSourcePlanPath: path.relative(workspaceRoot, textureSourcePlanPath),
      nextTextureStep: textureSourcePlan.nextTextureStep
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
