import { promises as fs } from "node:fs";
import path from "node:path";
import type {
  SectionSkinMaterialPlanFile,
  SectionSkinMaterialPlanProfileRecord,
  SectionSkinMaterialPlanProfilesFile
} from "./shared";
import { readOptionalJsonFile, workspaceRoot } from "./shared";

interface SummarizeSectionSkinMaterialPlanProfilesOptions {
  donorId: string;
  donorName: string;
  materialPlansRoot: string;
}

function sortProfiles(
  left: SectionSkinMaterialPlanProfileRecord,
  right: SectionSkinMaterialPlanProfileRecord
): number {
  if (left.exactPageImageCount !== right.exactPageImageCount) {
    return right.exactPageImageCount - left.exactPageImageCount;
  }
  if (left.relatedImageCandidateCount !== right.relatedImageCandidateCount) {
    return right.relatedImageCandidateCount - left.relatedImageCandidateCount;
  }
  return left.sectionKey.localeCompare(right.sectionKey);
}

export async function summarizeSectionSkinMaterialPlanProfiles(
  options: SummarizeSectionSkinMaterialPlanProfilesOptions
): Promise<SectionSkinMaterialPlanProfilesFile> {
  const absoluteRoot = path.isAbsolute(options.materialPlansRoot)
    ? options.materialPlansRoot
    : path.join(workspaceRoot, options.materialPlansRoot);
  let entryNames: string[] = [];
  try {
    entryNames = await fs.readdir(absoluteRoot);
  } catch {
    entryNames = [];
  }

  const sections: SectionSkinMaterialPlanProfileRecord[] = [];
  for (const entryName of entryNames.filter((value) => value.endsWith(".json")).sort((left, right) => left.localeCompare(right))) {
    const materialPlanPath = path.join(absoluteRoot, entryName);
    const materialPlan = await readOptionalJsonFile<SectionSkinMaterialPlanFile>(materialPlanPath);
    if (!materialPlan) {
      continue;
    }
    sections.push({
      familyName: materialPlan.familyName,
      sectionKey: materialPlan.sectionKey,
      skinName: materialPlan.skinName,
      materialState: materialPlan.materialState,
      pageCount: materialPlan.pageCount,
      exactPageImageCount: materialPlan.exactPageImageCount,
      missingPageImageCount: materialPlan.missingPageImageCount,
      pageCandidateReadyCount: materialPlan.pageCandidateReadyCount,
      relatedImageCandidateCount: materialPlan.relatedImageCandidateCount,
      topCandidateLocalPath: materialPlan.topCandidateLocalPath,
      sampleLocalSourcePath: materialPlan.sampleLocalSourcePath,
      atlasSourcePath: materialPlan.atlasSourcePath,
      materialPlanPath: path.relative(workspaceRoot, materialPlanPath),
      nextMaterialStep: materialPlan.nextMaterialStep
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
