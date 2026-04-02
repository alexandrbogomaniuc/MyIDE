import type {
  SectionSkinTextureCanvasBundleFile,
  SectionSkinTextureCanvasOperationRecord,
  SectionSkinTextureCanvasOperationState,
  SectionSkinTextureCanvasPageRecord,
  SectionSkinTextureCanvasPageState,
  SectionSkinTextureCanvasState,
  SectionSkinTextureRenderBundleFile,
  SectionSkinTextureRenderPageState,
  SectionSkinTextureRenderRegionRecord
} from "./shared";

interface BuildSectionSkinTextureCanvasBundleOptions {
  textureRenderBundle: SectionSkinTextureRenderBundleFile;
  textureRenderBundlePath: string;
}

function sortUnique(values: Iterable<string>): string[] {
  return Array.from(new Set(values)).sort((left, right) => left.localeCompare(right));
}

function buildOperationState(
  region: SectionSkinTextureRenderRegionRecord
): SectionSkinTextureCanvasOperationState {
  if (region.regionState === "missing-atlas-geometry" || !region.bounds) {
    return "missing-atlas-geometry";
  }
  if (region.regionState === "missing-atlas-page-size") {
    return "missing-atlas-page-size";
  }
  if (region.regionState === "ready-for-exact-page-texture-render") {
    return "ready-for-exact-page-canvas-reconstruction";
  }
  if (region.regionState === "ready-for-applied-page-texture-render") {
    return "ready-for-applied-page-canvas-reconstruction";
  }
  return "needs-page-lock-resolution";
}

function buildOperationRecord(
  region: SectionSkinTextureRenderRegionRecord
): SectionSkinTextureCanvasOperationRecord {
  const operationState = buildOperationState(region);
  return {
    orderIndex: region.orderIndex,
    slotName: region.slotName,
    attachmentName: region.attachmentName,
    attachmentPath: region.attachmentPath,
    regionName: region.regionName,
    operationState,
    sourceRegionState: region.regionState,
    sourceLocalPath: region.selectedLocalPath,
    rotated: region.rotated,
    targetX: region.bounds?.x ?? null,
    targetY: region.bounds?.y ?? null,
    targetWidth: region.bounds?.width ?? null,
    targetHeight: region.bounds?.height ?? null,
    trimOffsetX: region.offsets?.x ?? null,
    trimOffsetY: region.offsets?.y ?? null,
    originalWidth: region.offsets?.originalWidth ?? null,
    originalHeight: region.offsets?.originalHeight ?? null
  };
}

function buildPageState(
  sourcePageState: SectionSkinTextureRenderPageState,
  missingPageSizeCount: number,
  manualBlockedDrawOperationCount: number,
  pageLockBlockedDrawOperationCount: number
): SectionSkinTextureCanvasPageState {
  if (manualBlockedDrawOperationCount > 0) {
    return "needs-manual-render-review";
  }
  if (missingPageSizeCount > 0) {
    return "missing-atlas-page-size";
  }
  if (pageLockBlockedDrawOperationCount > 0) {
    return "needs-page-lock-resolution";
  }
  if (sourcePageState === "ready-for-exact-page-texture-render") {
    return "ready-for-exact-page-canvas-reconstruction";
  }
  if (sourcePageState === "ready-for-applied-page-texture-render") {
    return "ready-for-applied-page-canvas-reconstruction";
  }
  return "needs-page-lock-resolution";
}

function buildBundleState(
  pageCount: number,
  exactPageLockCount: number,
  appliedPageLockCount: number,
  unresolvedPageLockCount: number,
  missingPageSizeCount: number,
  manualBlockedPageCount: number,
  blockedPageCount: number
): SectionSkinTextureCanvasState {
  if (pageCount > 0 && blockedPageCount === 0 && exactPageLockCount === pageCount) {
    return "ready-for-exact-page-canvas-reconstruction";
  }
  if (pageCount > 0 && blockedPageCount === 0 && unresolvedPageLockCount === 0 && exactPageLockCount + appliedPageLockCount === pageCount) {
    return "ready-for-applied-page-canvas-reconstruction";
  }
  if (manualBlockedPageCount > 0) {
    return "needs-manual-render-review";
  }
  if (missingPageSizeCount > 0) {
    return "needs-atlas-page-size-review";
  }
  return "needs-page-lock-resolution";
}

export function buildSectionSkinTextureCanvasBundle(
  options: BuildSectionSkinTextureCanvasBundleOptions
): SectionSkinTextureCanvasBundleFile {
  const pages: SectionSkinTextureCanvasPageRecord[] = options.textureRenderBundle.pages.map((page) => {
    const operations = page.regions
      .slice()
      .sort((left, right) => left.orderIndex - right.orderIndex)
      .map(buildOperationRecord);
    const readyDrawOperationCount = operations.filter((operation) =>
      operation.operationState === "ready-for-exact-page-canvas-reconstruction" || operation.operationState === "ready-for-applied-page-canvas-reconstruction"
    ).length;
    const missingPageSizeCount = operations.filter((operation) => operation.operationState === "missing-atlas-page-size").length;
    const manualBlockedDrawOperationCount = operations.filter((operation) => operation.operationState === "missing-atlas-geometry").length;
    const pageLockBlockedDrawOperationCount = operations.filter((operation) => operation.operationState === "needs-page-lock-resolution").length;
    const blockedDrawOperationCount = operations.length - readyDrawOperationCount;

    return {
      orderIndex: page.orderIndex,
      pageName: page.pageName,
      pageState: buildPageState(page.pageState, missingPageSizeCount, manualBlockedDrawOperationCount, pageLockBlockedDrawOperationCount),
      sourcePageState: page.pageState,
      canvasWidth: page.pageWidth,
      canvasHeight: page.pageHeight,
      selectedLocalPath: page.selectedLocalPath,
      selectedCandidateRank: page.selectedCandidateRank,
      selectedCandidateScore: page.selectedCandidateScore,
      selectedCandidateReasons: page.selectedCandidateReasons,
      selectedCandidateMatchedTokens: page.selectedCandidateMatchedTokens,
      atlasPageLocalPath: page.atlasPageLocalPath,
      drawOperationCount: operations.length,
      readyDrawOperationCount,
      blockedDrawOperationCount,
      slotNames: sortUnique(operations.map((operation) => operation.slotName)),
      regionNames: sortUnique(operations.map((operation) => operation.regionName).filter((value): value is string => typeof value === "string" && value.length > 0)),
      operations
    };
  });

  const pageSizeCount = pages.filter((page) => typeof page.canvasWidth === "number" && typeof page.canvasHeight === "number").length;
  const missingPageSizeCount = pages.length - pageSizeCount;
  const readyPageCount = pages.filter((page) =>
    page.pageState === "ready-for-exact-page-canvas-reconstruction" || page.pageState === "ready-for-applied-page-canvas-reconstruction"
  ).length;
  const manualBlockedPageCount = pages.filter((page) => page.pageState === "needs-manual-render-review").length;
  const blockedPageCount = pages.length - readyPageCount;
  const drawOperationCount = pages.reduce((total, page) => total + page.drawOperationCount, 0);
  const readyDrawOperationCount = pages.reduce((total, page) => total + page.readyDrawOperationCount, 0);
  const blockedDrawOperationCount = drawOperationCount - readyDrawOperationCount;
  const uniqueSelectedLocalPathCount = new Set(
    pages
      .map((page) => page.selectedLocalPath)
      .filter((value): value is string => typeof value === "string" && value.length > 0)
  ).size;
  const textureCanvasState = buildBundleState(
    options.textureRenderBundle.pageCount,
    options.textureRenderBundle.exactPageLockCount,
    options.textureRenderBundle.appliedPageLockCount,
    options.textureRenderBundle.unresolvedPageLockCount,
    missingPageSizeCount,
    manualBlockedPageCount,
    blockedPageCount
  );
  const topCanvasLocalPath = pages.find((page) => typeof page.selectedLocalPath === "string" && page.selectedLocalPath.length > 0)?.selectedLocalPath ?? null;
  const nextTextureCanvasStep = textureCanvasState === "ready-for-exact-page-canvas-reconstruction"
    ? `${options.textureRenderBundle.sectionKey}: use the section skin texture-canvas bundle directly for final texture reconstruction because every atlas page now has dimensions and exact grounded draw operations.`
    : textureCanvasState === "ready-for-applied-page-canvas-reconstruction"
      ? `${options.textureRenderBundle.sectionKey}: use the section skin texture-canvas bundle directly for final texture reconstruction because every atlas page now has dimensions and one applied locked source plus ordered draw operations.`
      : textureCanvasState === "needs-atlas-page-size-review"
        ? `${options.textureRenderBundle.sectionKey}: review the atlas page sizes before final texture reconstruction can apply page-canvas draw operations cleanly.`
        : textureCanvasState === "needs-manual-render-review"
          ? `${options.textureRenderBundle.sectionKey}: review the remaining atlas-geometry gaps before final texture reconstruction can apply page-canvas draw operations cleanly.`
          : `${options.textureRenderBundle.sectionKey}: resolve the remaining page-lock issues before final texture reconstruction can apply page-canvas draw operations cleanly.`;

  return {
    schemaVersion: "0.1.0",
    donorId: options.textureRenderBundle.donorId,
    donorName: options.textureRenderBundle.donorName,
    generatedAt: new Date().toISOString(),
    familyName: options.textureRenderBundle.familyName,
    sectionKey: options.textureRenderBundle.sectionKey,
    skinName: options.textureRenderBundle.skinName,
    textureCanvasState,
    textureRenderState: options.textureRenderBundle.textureRenderState,
    textureAssemblyState: options.textureRenderBundle.textureAssemblyState,
    textureLockState: options.textureRenderBundle.textureLockState,
    pageLockApplyState: options.textureRenderBundle.pageLockApplyState,
    pageLockApprovalState: options.textureRenderBundle.pageLockApprovalState,
    textureReconstructionState: options.textureRenderBundle.textureReconstructionState,
    textureSourceState: options.textureRenderBundle.textureSourceState,
    matchState: options.textureRenderBundle.matchState,
    reviewState: options.textureRenderBundle.reviewState,
    materialState: options.textureRenderBundle.materialState,
    renderState: options.textureRenderBundle.renderState,
    blueprintState: options.textureRenderBundle.blueprintState,
    reconstructionState: options.textureRenderBundle.reconstructionState,
    pageCount: options.textureRenderBundle.pageCount,
    pageSizeCount,
    missingPageSizeCount,
    exactPageLockCount: options.textureRenderBundle.exactPageLockCount,
    appliedPageLockCount: options.textureRenderBundle.appliedPageLockCount,
    unresolvedPageLockCount: options.textureRenderBundle.unresolvedPageLockCount,
    readyPageCount,
    blockedPageCount,
    uniqueSelectedLocalPathCount,
    drawOperationCount,
    readyDrawOperationCount,
    blockedDrawOperationCount,
    topCanvasLocalPath,
    sampleLocalSourcePath: options.textureRenderBundle.sampleLocalSourcePath,
    atlasSourcePath: options.textureRenderBundle.atlasSourcePath,
    textureRenderBundlePath: options.textureRenderBundlePath,
    nextTextureCanvasStep,
    pages
  };
}
