import type {
  SectionSkinPageMatchBundleFile,
  SectionSkinRenderPlanFile,
  SectionSkinTextureSourceLayerRecord,
  SectionSkinTextureSourcePageRecord,
  SectionSkinTextureSourcePlanFile,
  SectionSkinTextureSourceSelection,
  SectionSkinTextureSourceState
} from "./shared";

interface BuildSectionSkinTextureSourcePlanOptions {
  pageMatchBundle: SectionSkinPageMatchBundleFile;
  pageMatchBundlePath: string;
  renderPlan: SectionSkinRenderPlanFile;
}

function buildTextureSourceSelection(
  exactPageLocalPath: string | null,
  proposedMatchLocalPath: string | null
): SectionSkinTextureSourceSelection {
  if (typeof exactPageLocalPath === "string" && exactPageLocalPath.length > 0) {
    return "exact-page";
  }
  if (typeof proposedMatchLocalPath === "string" && proposedMatchLocalPath.length > 0) {
    return "proposed-page-match";
  }
  return "missing";
}

function buildTextureSourceState(
  exactPageSourceCount: number,
  proposedPageSourceCount: number,
  missingPageSourceCount: number,
  pageCount: number
): SectionSkinTextureSourceState {
  if (pageCount > 0 && exactPageSourceCount === pageCount) {
    return "ready-with-exact-page-sources";
  }
  if (pageCount > 0 && missingPageSourceCount === 0 && exactPageSourceCount + proposedPageSourceCount === pageCount) {
    return "ready-with-proposed-page-sources";
  }
  return "needs-page-match-lock";
}

function buildPageRecord(
  page: SectionSkinPageMatchBundleFile["pages"][number]
): SectionSkinTextureSourcePageRecord {
  const sourceSelection = buildTextureSourceSelection(page.exactPageLocalPath, page.proposedMatchLocalPath);
  return {
    orderIndex: page.orderIndex,
    pageName: page.pageName,
    sourceSelection,
    layerCount: page.layerCount,
    slotNames: page.slotNames,
    sourceLocalPath: sourceSelection === "exact-page"
      ? page.exactPageLocalPath
      : sourceSelection === "proposed-page-match"
        ? page.proposedMatchLocalPath
        : null
  };
}

function buildLayerRecord(
  layer: SectionSkinRenderPlanFile["layers"][number],
  pageLookup: ReadonlyMap<string, SectionSkinTextureSourcePageRecord>
): SectionSkinTextureSourceLayerRecord {
  const pageRecord = typeof layer.pageName === "string" && layer.pageName.length > 0
    ? pageLookup.get(layer.pageName) ?? null
    : null;
  return {
    orderIndex: layer.orderIndex,
    slotName: layer.slotName,
    attachmentName: layer.attachmentName,
    pageName: layer.pageName,
    layerState: layer.layerState,
    sourceSelection: pageRecord?.sourceSelection ?? "missing",
    sourceLocalPath: pageRecord?.sourceLocalPath ?? null
  };
}

export function buildSectionSkinTextureSourcePlan(
  options: BuildSectionSkinTextureSourcePlanOptions
): SectionSkinTextureSourcePlanFile {
  const pages = options.pageMatchBundle.pages.map(buildPageRecord);
  const pageLookup = new Map(pages.map((page) => [page.pageName, page] as const));
  const layers = options.renderPlan.layers.map((layer) => buildLayerRecord(layer, pageLookup));
  const exactPageSourceCount = pages.filter((page) => page.sourceSelection === "exact-page").length;
  const proposedPageSourceCount = pages.filter((page) => page.sourceSelection === "proposed-page-match").length;
  const missingPageSourceCount = pages.filter((page) => page.sourceSelection === "missing").length;
  const textureSourceState = buildTextureSourceState(
    exactPageSourceCount,
    proposedPageSourceCount,
    missingPageSourceCount,
    options.pageMatchBundle.pageCount
  );
  const topTextureSourceLocalPath = pages.find((page) => typeof page.sourceLocalPath === "string" && page.sourceLocalPath.length > 0)?.sourceLocalPath
    ?? options.pageMatchBundle.topProposedMatchLocalPath
    ?? options.pageMatchBundle.sampleLocalSourcePath
    ?? null;
  const nextTextureStep = textureSourceState === "ready-with-exact-page-sources"
    ? `${options.pageMatchBundle.sectionKey}: use the exact atlas page-image sources directly for texture reconstruction.`
    : textureSourceState === "ready-with-proposed-page-sources"
      ? `${options.pageMatchBundle.sectionKey}: use the prepared section skin texture-source plan as provisional downstream input, but lock the proposed atlas page-image matches before final texture reconstruction.`
      : `${options.pageMatchBundle.sectionKey}: lock or discover atlas page-image matches before texture-source reconstruction can finish.`;

  return {
    schemaVersion: "0.1.0",
    donorId: options.pageMatchBundle.donorId,
    donorName: options.pageMatchBundle.donorName,
    generatedAt: new Date().toISOString(),
    familyName: options.pageMatchBundle.familyName,
    sectionKey: options.pageMatchBundle.sectionKey,
    skinName: options.pageMatchBundle.skinName,
    textureSourceState,
    matchState: options.pageMatchBundle.matchState,
    reviewState: options.pageMatchBundle.reviewState,
    materialState: options.pageMatchBundle.materialState,
    renderState: options.pageMatchBundle.renderState,
    blueprintState: options.pageMatchBundle.blueprintState,
    reconstructionState: options.pageMatchBundle.reconstructionState,
    pageCount: options.pageMatchBundle.pageCount,
    exactPageSourceCount,
    proposedPageSourceCount,
    missingPageSourceCount,
    topTextureSourceLocalPath,
    sampleLocalSourcePath: options.pageMatchBundle.sampleLocalSourcePath,
    atlasSourcePath: options.pageMatchBundle.atlasSourcePath,
    renderPlanPath: options.pageMatchBundle.renderPlanPath,
    materialPlanPath: options.pageMatchBundle.materialPlanPath,
    materialReviewBundlePath: options.pageMatchBundle.materialReviewBundlePath,
    pageMatchBundlePath: options.pageMatchBundlePath,
    nextTextureStep,
    pages,
    layers
  };
}
