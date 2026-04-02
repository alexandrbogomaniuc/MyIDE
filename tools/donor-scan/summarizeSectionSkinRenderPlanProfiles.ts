import { promises as fs } from "node:fs";
import path from "node:path";
import type {
  SectionSkinRenderPlanFile,
  SectionSkinRenderPlanProfileRecord,
  SectionSkinRenderPlanProfilesFile
} from "./shared";
import { readOptionalJsonFile, workspaceRoot } from "./shared";

interface SummarizeSectionSkinRenderPlanProfilesOptions {
  donorId: string;
  donorName: string;
  renderPlansRoot: string;
}

function sortProfiles(
  left: SectionSkinRenderPlanProfileRecord,
  right: SectionSkinRenderPlanProfileRecord
): number {
  if (left.mappedLayerCount !== right.mappedLayerCount) {
    return right.mappedLayerCount - left.mappedLayerCount;
  }
  if (left.layerCount !== right.layerCount) {
    return right.layerCount - left.layerCount;
  }
  return left.sectionKey.localeCompare(right.sectionKey);
}

export async function summarizeSectionSkinRenderPlanProfiles(
  options: SummarizeSectionSkinRenderPlanProfilesOptions
): Promise<SectionSkinRenderPlanProfilesFile> {
  const absoluteRoot = path.isAbsolute(options.renderPlansRoot)
    ? options.renderPlansRoot
    : path.join(workspaceRoot, options.renderPlansRoot);
  let entryNames: string[] = [];
  try {
    entryNames = await fs.readdir(absoluteRoot);
  } catch {
    entryNames = [];
  }

  const sections: SectionSkinRenderPlanProfileRecord[] = [];
  for (const entryName of entryNames.filter((value) => value.endsWith(".json")).sort((left, right) => left.localeCompare(right))) {
    const renderPlanPath = path.join(absoluteRoot, entryName);
    const renderPlan = await readOptionalJsonFile<SectionSkinRenderPlanFile>(renderPlanPath);
    if (!renderPlan) {
      continue;
    }
    sections.push({
      familyName: renderPlan.familyName,
      sectionKey: renderPlan.sectionKey,
      skinName: renderPlan.skinName,
      renderState: renderPlan.renderState,
      layerCount: renderPlan.layerCount,
      mappedLayerCount: renderPlan.mappedLayerCount,
      unmappedLayerCount: renderPlan.unmappedLayerCount,
      atlasPageCount: renderPlan.atlasPageCount,
      pageSizeCount: renderPlan.pageSizeCount,
      exactLocalSourceCount: renderPlan.exactLocalSourceCount,
      sampleLocalSourcePath: renderPlan.sampleLocalSourcePath,
      atlasSourcePath: renderPlan.atlasSourcePath,
      renderPlanPath: path.relative(workspaceRoot, renderPlanPath),
      nextRenderStep: renderPlan.nextRenderStep
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
