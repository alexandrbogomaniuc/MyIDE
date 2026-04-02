import type {
  SectionSkinRenderPlanFile,
  SectionSkinTextureReconstructionBundleFile,
  SectionSkinTextureReconstructionLayerRecord,
  SectionSkinTextureReconstructionLayerState,
  SectionSkinTextureReconstructionPageRecord,
  SectionSkinTextureReconstructionState,
  SectionSkinTextureSourcePlanFile
} from "./shared";

interface BuildSectionSkinTextureReconstructionBundleOptions {
  textureSourcePlan: SectionSkinTextureSourcePlanFile;
  textureSourcePlanPath: string;
  renderPlan: SectionSkinRenderPlanFile;
}

function buildLayerState(
  layer: SectionSkinRenderPlanFile["layers"][number],
  sourceSelection: SectionSkinTextureSourcePlanFile["layers"][number]["sourceSelection"]
): SectionSkinTextureReconstructionLayerState {
  if (layer.layerState !== "atlas-region-exact" || !layer.bounds) {
    return "missing-atlas-geometry";
  }
  if (sourceSelection === "exact-page") {
    return "ready-with-exact-page-source";
  }
  if (sourceSelection === "proposed-page-match") {
    return "ready-with-proposed-page-source";
  }
  return "missing-page-source";
}

function buildPageRecord(
  page: SectionSkinTextureSourcePlanFile["pages"][number]
): SectionSkinTextureReconstructionPageRecord {
  return {
    orderIndex: page.orderIndex,
    pageName: page.pageName,
    sourceSelection: page.sourceSelection,
    layerCount: page.layerCount,
    slotNames: page.slotNames,
    sourceLocalPath: page.sourceLocalPath
  };
}

function buildLayerRecord(
  layer: SectionSkinRenderPlanFile["layers"][number],
  layerSource: SectionSkinTextureSourcePlanFile["layers"][number] | undefined
): SectionSkinTextureReconstructionLayerRecord {
  const sourceSelection = layerSource?.sourceSelection ?? "missing";
  return {
    orderIndex: layer.orderIndex,
    slotName: layer.slotName,
    attachmentName: layer.attachmentName,
    attachmentPath: layer.attachmentPath,
    pageName: layer.pageName,
    regionName: layer.regionName,
    layerState: buildLayerState(layer, sourceSelection),
    sourceSelection,
    sourceLocalPath: layerSource?.sourceLocalPath ?? null,
    rotated: layer.rotated,
    bounds: layer.bounds,
    offsets: layer.offsets
  };
}

function buildTextureReconstructionState(
  exactPageSourceCount: number,
  proposedPageSourceCount: number,
  missingPageSourceCount: number,
  pageCount: number,
  blockedLayerCount: number
): SectionSkinTextureReconstructionState {
  if (pageCount > 0 && blockedLayerCount === 0 && exactPageSourceCount === pageCount) {
    return "ready-with-exact-page-sources";
  }
  if (pageCount > 0 && blockedLayerCount === 0 && missingPageSourceCount === 0 && exactPageSourceCount + proposedPageSourceCount === pageCount) {
    return "ready-with-proposed-page-sources";
  }
  return "needs-page-source-lock";
}

export function buildSectionSkinTextureReconstructionBundle(
  options: BuildSectionSkinTextureReconstructionBundleOptions
): SectionSkinTextureReconstructionBundleFile {
  const pages = options.textureSourcePlan.pages.map(buildPageRecord);
  const layerSourceLookup = new Map(
    options.textureSourcePlan.layers.map((layer) => [`${layer.orderIndex}:${layer.slotName}:${layer.pageName ?? ""}`, layer] as const)
  );
  const layers = options.renderPlan.layers.map((layer) =>
    buildLayerRecord(
      layer,
      layerSourceLookup.get(`${layer.orderIndex}:${layer.slotName}:${layer.pageName ?? ""}`)
    )
  );
  const exactPageSourceCount = pages.filter((page) => page.sourceSelection === "exact-page").length;
  const proposedPageSourceCount = pages.filter((page) => page.sourceSelection === "proposed-page-match").length;
  const missingPageSourceCount = pages.filter((page) => page.sourceSelection === "missing").length;
  const reconstructableLayerCount = layers.filter((layer) =>
    layer.layerState === "ready-with-exact-page-source" || layer.layerState === "ready-with-proposed-page-source"
  ).length;
  const blockedLayerCount = layers.length - reconstructableLayerCount;
  const textureReconstructionState = buildTextureReconstructionState(
    exactPageSourceCount,
    proposedPageSourceCount,
    missingPageSourceCount,
    options.textureSourcePlan.pageCount,
    blockedLayerCount
  );
  const nextTextureReconstructionStep = textureReconstructionState === "ready-with-exact-page-sources"
    ? `${options.textureSourcePlan.sectionKey}: use the section skin texture reconstruction bundle directly for deeper texture reconstruction.`
    : textureReconstructionState === "ready-with-proposed-page-sources"
      ? `${options.textureSourcePlan.sectionKey}: use the section skin texture reconstruction bundle as provisional downstream input, but lock the proposed atlas page-image matches before final texture reconstruction.`
      : `${options.textureSourcePlan.sectionKey}: lock page-image sources before texture reconstruction can move forward cleanly.`;

  return {
    schemaVersion: "0.1.0",
    donorId: options.textureSourcePlan.donorId,
    donorName: options.textureSourcePlan.donorName,
    generatedAt: new Date().toISOString(),
    familyName: options.textureSourcePlan.familyName,
    sectionKey: options.textureSourcePlan.sectionKey,
    skinName: options.textureSourcePlan.skinName,
    textureReconstructionState,
    textureSourceState: options.textureSourcePlan.textureSourceState,
    matchState: options.textureSourcePlan.matchState,
    reviewState: options.textureSourcePlan.reviewState,
    materialState: options.textureSourcePlan.materialState,
    renderState: options.textureSourcePlan.renderState,
    blueprintState: options.textureSourcePlan.blueprintState,
    reconstructionState: options.textureSourcePlan.reconstructionState,
    pageCount: options.textureSourcePlan.pageCount,
    exactPageSourceCount,
    proposedPageSourceCount,
    missingPageSourceCount,
    layerCount: layers.length,
    reconstructableLayerCount,
    blockedLayerCount,
    topTextureSourceLocalPath: options.textureSourcePlan.topTextureSourceLocalPath,
    sampleLocalSourcePath: options.textureSourcePlan.sampleLocalSourcePath,
    atlasSourcePath: options.textureSourcePlan.atlasSourcePath,
    textureSourcePlanPath: options.textureSourcePlanPath,
    pageMatchBundlePath: options.textureSourcePlan.pageMatchBundlePath,
    materialReviewBundlePath: options.textureSourcePlan.materialReviewBundlePath,
    materialPlanPath: options.textureSourcePlan.materialPlanPath,
    renderPlanPath: options.textureSourcePlan.renderPlanPath,
    nextTextureReconstructionStep,
    pages,
    layers
  };
}
