import path from "node:path";
import type {
  FamilyReconstructionLocalSourceRecord,
  SectionSkinMaterialCandidateRecord,
  SectionSkinMaterialPageRecord,
  SectionSkinMaterialPlanFile,
  SectionSkinRenderPlanFile
} from "./shared";

interface BuildSectionSkinMaterialPlanOptions {
  renderPlan: SectionSkinRenderPlanFile;
  renderPlanPath: string;
  localSources: readonly FamilyReconstructionLocalSourceRecord[];
}

function isImagePath(filePath: string): boolean {
  return /\.(png|webp|jpg|jpeg|gif|svg)$/i.test(filePath);
}

function toCandidateRecord(localSource: FamilyReconstructionLocalSourceRecord): SectionSkinMaterialCandidateRecord {
  return {
    localPath: localSource.localPath,
    sourceKind: localSource.sourceKind,
    relation: localSource.relation,
    familyName: localSource.familyName
  };
}

function sortCandidates(
  left: SectionSkinMaterialCandidateRecord,
  right: SectionSkinMaterialCandidateRecord
): number {
  if (left.relation !== right.relation) {
    return left.relation === "same-family" ? -1 : 1;
  }
  if (left.sourceKind !== right.sourceKind) {
    return left.sourceKind.localeCompare(right.sourceKind);
  }
  return left.localPath.localeCompare(right.localPath);
}

function buildMaterialState(
  exactPageImageCount: number,
  missingPageImageCount: number,
  relatedImageCandidateCount: number
): SectionSkinMaterialPlanFile["materialState"] {
  if (missingPageImageCount === 0 && exactPageImageCount > 0) {
    return "ready-with-exact-page-images";
  }
  if (relatedImageCandidateCount > 0) {
    return "needs-related-image-review";
  }
  return "needs-page-source-discovery";
}

export function buildSectionSkinMaterialPlan(
  options: BuildSectionSkinMaterialPlanOptions
): SectionSkinMaterialPlanFile {
  const imageCandidates = options.localSources
    .filter((localSource) => isImagePath(localSource.localPath))
    .map(toCandidateRecord)
    .sort(sortCandidates);

  const pageNames = Array.from(new Set(options.renderPlan.layers.map((layer) => layer.pageName).filter((value): value is string => typeof value === "string" && value.length > 0)));
  const pages: SectionSkinMaterialPageRecord[] = pageNames.map((pageName, orderIndex) => {
    const layers = options.renderPlan.layers.filter((layer) => layer.pageName === pageName);
    const exactPageLocalPath = layers.find((layer) => typeof layer.localPagePath === "string" && layer.localPagePath.length > 0)?.localPagePath ?? null;
    return {
      orderIndex,
      pageName,
      layerCount: layers.length,
      slotNames: Array.from(new Set(layers.map((layer) => layer.slotName))),
      exactPageLocalPath,
      relatedImageCandidateCount: imageCandidates.length,
      relatedImageCandidates: imageCandidates
    };
  });

  const exactPageImageCount = pages.filter((page) => page.exactPageLocalPath).length;
  const missingPageImageCount = pages.length - exactPageImageCount;
  const relatedImageCandidateCount = imageCandidates.length;
  const materialState = buildMaterialState(exactPageImageCount, missingPageImageCount, relatedImageCandidateCount);
  const nextMaterialStep = materialState === "ready-with-exact-page-images"
    ? `${options.renderPlan.sectionKey}: use the exact local page images plus atlas geometry for texture reconstruction.`
    : materialState === "needs-related-image-review"
      ? `${options.renderPlan.sectionKey}: review the related local image candidates and map them to the missing atlas pages before texture reconstruction.`
      : `${options.renderPlan.sectionKey}: capture or mirror the missing atlas page images before texture reconstruction.`;

  return {
    schemaVersion: "0.1.0",
    donorId: options.renderPlan.donorId,
    donorName: options.renderPlan.donorName,
    generatedAt: new Date().toISOString(),
    familyName: options.renderPlan.familyName,
    sectionKey: options.renderPlan.sectionKey,
    skinName: options.renderPlan.skinName,
    materialState,
    renderState: options.renderPlan.renderState,
    blueprintState: options.renderPlan.blueprintState,
    reconstructionState: options.renderPlan.reconstructionState,
    pageCount: pages.length,
    exactPageImageCount,
    missingPageImageCount,
    relatedImageCandidateCount,
    exactLocalSourceCount: options.renderPlan.exactLocalSourceCount,
    relatedLocalSourceCount: options.renderPlan.relatedLocalSourceCount,
    sampleLocalSourcePath: options.renderPlan.sampleLocalSourcePath,
    atlasSourcePath: options.renderPlan.atlasSourcePath,
    renderPlanPath: options.renderPlanPath,
    skinBlueprintPath: options.renderPlan.skinBlueprintPath,
    reconstructionBundlePath: options.renderPlan.reconstructionBundlePath,
    nextMaterialStep,
    pages,
    relatedImageCandidates: imageCandidates
  };
}
