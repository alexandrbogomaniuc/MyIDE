import type {
  SectionSkinTextureFitReviewBundleFile,
  SectionSkinTextureFitReviewPageRecord,
  SectionSkinTextureFitReviewPageState,
  SectionSkinTextureFitReviewState,
  SectionSkinTextureFitTransformMode,
  SectionSkinTextureFitTransformOptionRecord,
  SectionSkinTextureSourceFitBundleFile
} from "./shared";

interface BuildSectionSkinTextureFitReviewBundleOptions {
  textureSourceFitBundle: SectionSkinTextureSourceFitBundleFile;
  textureSourceFitBundlePath: string;
}

function divideOrNull(numerator: number | null, denominator: number | null): number | null {
  if (typeof numerator !== "number" || typeof denominator !== "number" || denominator === 0) {
    return null;
  }
  return numerator / denominator;
}

function buildTransformOption(
  mode: SectionSkinTextureFitTransformMode,
  canvasWidth: number,
  canvasHeight: number,
  sourceWidth: number,
  sourceHeight: number
): SectionSkinTextureFitTransformOptionRecord {
  const scaleX = canvasWidth / sourceWidth;
  const scaleY = canvasHeight / sourceHeight;
  const distortionDelta = Math.abs(scaleX - scaleY);

  if (mode === "exact") {
    return {
      mode,
      aspectPreserving: true,
      scaleX: 1,
      scaleY: 1,
      uniformScale: 1,
      outputWidth: sourceWidth,
      outputHeight: sourceHeight,
      offsetX: 0,
      offsetY: 0,
      paddingX: 0,
      paddingY: 0,
      cropX: 0,
      cropY: 0,
      distortionDelta: 0
    };
  }

  if (mode === "stretch") {
    return {
      mode,
      aspectPreserving: false,
      scaleX,
      scaleY,
      uniformScale: null,
      outputWidth: canvasWidth,
      outputHeight: canvasHeight,
      offsetX: 0,
      offsetY: 0,
      paddingX: 0,
      paddingY: 0,
      cropX: 0,
      cropY: 0,
      distortionDelta
    };
  }

  const uniformScale = mode === "contain" ? Math.min(scaleX, scaleY) : Math.max(scaleX, scaleY);
  const outputWidth = sourceWidth * uniformScale;
  const outputHeight = sourceHeight * uniformScale;
  const offsetX = (canvasWidth - outputWidth) / 2;
  const offsetY = (canvasHeight - outputHeight) / 2;
  const paddingX = mode === "contain" ? Math.max(0, canvasWidth - outputWidth) : 0;
  const paddingY = mode === "contain" ? Math.max(0, canvasHeight - outputHeight) : 0;
  const cropX = mode === "cover" ? Math.max(0, outputWidth - canvasWidth) : 0;
  const cropY = mode === "cover" ? Math.max(0, outputHeight - canvasHeight) : 0;

  return {
    mode,
    aspectPreserving: true,
    scaleX: uniformScale,
    scaleY: uniformScale,
    uniformScale,
    outputWidth,
    outputHeight,
    offsetX,
    offsetY,
    paddingX,
    paddingY,
    cropX,
    cropY,
    distortionDelta: 0
  };
}

function buildPageState(
  sourcePageState: SectionSkinTextureSourceFitBundleFile["pages"][number]["pageState"]
): SectionSkinTextureFitReviewPageState {
  if (sourcePageState === "needs-page-lock-resolution") {
    return "needs-page-lock-resolution";
  }
  if (sourcePageState === "missing-atlas-page-size") {
    return "missing-atlas-page-size";
  }
  if (sourcePageState === "missing-source-dimensions") {
    return "missing-source-dimensions";
  }
  if (sourcePageState === "exact-page-source-fit") {
    return "exact-fit-transform";
  }
  if (sourcePageState === "uniform-scale-page-source-fit") {
    return "uniform-fit-transform";
  }
  return "needs-fit-transform-review";
}

function buildBundleState(
  pageCount: number,
  unresolvedPageLockCount: number,
  missingPageSizeCount: number,
  missingSourceDimensionCount: number,
  exactPageFitCount: number,
  uniformScalePageFitCount: number,
  nonUniformScalePageFitCount: number
): SectionSkinTextureFitReviewState {
  if (unresolvedPageLockCount > 0) {
    return "needs-page-lock-resolution";
  }
  if (missingPageSizeCount > 0) {
    return "needs-atlas-page-size-review";
  }
  if (missingSourceDimensionCount > 0) {
    return "needs-source-dimension-review";
  }
  if (pageCount > 0 && exactPageFitCount === pageCount) {
    return "ready-with-exact-fit-transforms";
  }
  if (pageCount > 0 && exactPageFitCount + uniformScalePageFitCount === pageCount) {
    return "ready-with-uniform-fit-transforms";
  }
  if (pageCount > 0 && exactPageFitCount + uniformScalePageFitCount + nonUniformScalePageFitCount === pageCount) {
    return "ready-for-fit-transform-review";
  }
  return "needs-source-dimension-review";
}

function buildPageRecord(
  page: SectionSkinTextureSourceFitBundleFile["pages"][number]
): SectionSkinTextureFitReviewPageRecord {
  const pageState = buildPageState(page.pageState);
  const canvasAspectRatio = divideOrNull(page.canvasWidth, page.canvasHeight);
  const sourceAspectRatio = divideOrNull(page.sourceWidth, page.sourceHeight);
  const aspectRatioDelta = canvasAspectRatio !== null && sourceAspectRatio !== null
    ? Math.abs(canvasAspectRatio - sourceAspectRatio)
    : null;
  const canvasWidth = typeof page.canvasWidth === "number" ? page.canvasWidth : null;
  const canvasHeight = typeof page.canvasHeight === "number" ? page.canvasHeight : null;
  const sourceWidth = typeof page.sourceWidth === "number" ? page.sourceWidth : null;
  const sourceHeight = typeof page.sourceHeight === "number" ? page.sourceHeight : null;
  const hasDimensions = canvasWidth !== null && canvasHeight !== null && sourceWidth !== null && sourceHeight !== null;
  const exactTransform = hasDimensions && pageState === "exact-fit-transform"
    ? buildTransformOption("exact", canvasWidth, canvasHeight, sourceWidth, sourceHeight)
    : null;
  const containTransform = hasDimensions
    ? buildTransformOption("contain", canvasWidth, canvasHeight, sourceWidth, sourceHeight)
    : null;
  const coverTransform = hasDimensions
    ? buildTransformOption("cover", canvasWidth, canvasHeight, sourceWidth, sourceHeight)
    : null;
  const stretchTransform = hasDimensions
    ? buildTransformOption("stretch", canvasWidth, canvasHeight, sourceWidth, sourceHeight)
    : null;
  const nextFitReviewStep = pageState === "exact-fit-transform"
    ? `${page.pageName}: use the exact page-source transform directly because the locked local source already matches the atlas page size.`
    : pageState === "uniform-fit-transform"
      ? `${page.pageName}: use one uniform page-source scale directly because the locked local source already matches the atlas page aspect ratio.`
      : pageState === "needs-fit-transform-review"
        ? `${page.pageName}: review the contain, cover, and stretch transform options because the locked local source does not match the atlas page aspect ratio.`
        : pageState === "missing-atlas-page-size"
          ? `${page.pageName}: review the atlas page size before donor scan can prepare fit-transform options.`
          : pageState === "needs-page-lock-resolution"
            ? `${page.pageName}: resolve the remaining page-lock issue before donor scan can prepare fit-transform options.`
            : `${page.pageName}: review or replace the selected local page source because donor scan could not read its dimensions.`;

  return {
    orderIndex: page.orderIndex,
    pageName: page.pageName,
    pageState,
    sourcePageState: page.pageState,
    canvasWidth: page.canvasWidth,
    canvasHeight: page.canvasHeight,
    sourceWidth: page.sourceWidth,
    sourceHeight: page.sourceHeight,
    canvasAspectRatio,
    sourceAspectRatio,
    aspectRatioDelta,
    selectedLocalPath: page.selectedLocalPath,
    selectedCandidateRank: page.selectedCandidateRank,
    selectedCandidateScore: page.selectedCandidateScore,
    selectedCandidateReasons: page.selectedCandidateReasons,
    selectedCandidateMatchedTokens: page.selectedCandidateMatchedTokens,
    atlasPageLocalPath: page.atlasPageLocalPath,
    drawOperationCount: page.drawOperationCount,
    readyDrawOperationCount: page.readyDrawOperationCount,
    blockedDrawOperationCount: page.blockedDrawOperationCount,
    scaleX: page.scaleX,
    scaleY: page.scaleY,
    scaleDelta: page.scaleDelta,
    slotNames: page.slotNames,
    regionNames: page.regionNames,
    exactTransform,
    containTransform,
    coverTransform,
    stretchTransform,
    nextFitReviewStep
  };
}

export function buildSectionSkinTextureFitReviewBundle(
  options: BuildSectionSkinTextureFitReviewBundleOptions
): SectionSkinTextureFitReviewBundleFile {
  const pages = options.textureSourceFitBundle.pages.map(buildPageRecord);
  const reviewReadyPageCount = pages.filter((page) =>
    page.pageState === "exact-fit-transform"
    || page.pageState === "uniform-fit-transform"
    || page.pageState === "needs-fit-transform-review"
  ).length;
  const blockedPageCount = pages.length - reviewReadyPageCount;
  const largestScaleDelta = pages.reduce<number | null>((largest, page) => {
    if (typeof page.scaleDelta !== "number") {
      return largest;
    }
    return largest === null || page.scaleDelta > largest ? page.scaleDelta : largest;
  }, null);
  const textureFitReviewState = buildBundleState(
    options.textureSourceFitBundle.pageCount,
    options.textureSourceFitBundle.unresolvedPageLockCount,
    options.textureSourceFitBundle.missingPageSizeCount,
    options.textureSourceFitBundle.missingSourceDimensionCount,
    options.textureSourceFitBundle.exactPageFitCount,
    options.textureSourceFitBundle.uniformScalePageFitCount,
    options.textureSourceFitBundle.nonUniformScalePageFitCount
  );
  const topFitReviewLocalPath = pages.find((page) => typeof page.selectedLocalPath === "string" && page.selectedLocalPath.length > 0)?.selectedLocalPath ?? null;
  const nextTextureFitReviewStep = textureFitReviewState === "ready-with-exact-fit-transforms"
    ? `${options.textureSourceFitBundle.sectionKey}: use the fit-review bundle directly for final texture reconstruction because every locked page source already matches the atlas page size.`
    : textureFitReviewState === "ready-with-uniform-fit-transforms"
      ? `${options.textureSourceFitBundle.sectionKey}: use the fit-review bundle directly for final texture reconstruction and apply one uniform scale per page because every locked page source already matches the atlas page aspect ratio.`
      : textureFitReviewState === "ready-for-fit-transform-review"
        ? `${options.textureSourceFitBundle.sectionKey}: review the contain, cover, and stretch page-source transform options before final texture reconstruction because at least one locked page source still mismatches the atlas page aspect ratio.`
        : textureFitReviewState === "needs-atlas-page-size-review"
          ? `${options.textureSourceFitBundle.sectionKey}: review the atlas page sizes before donor scan can prepare fit-transform options cleanly.`
          : textureFitReviewState === "needs-page-lock-resolution"
            ? `${options.textureSourceFitBundle.sectionKey}: resolve the remaining page-lock issues before donor scan can prepare fit-transform options cleanly.`
            : `${options.textureSourceFitBundle.sectionKey}: review or replace the selected local page sources because donor scan could not read dimensions for every locked source.`;

  return {
    schemaVersion: "0.1.0",
    donorId: options.textureSourceFitBundle.donorId,
    donorName: options.textureSourceFitBundle.donorName,
    generatedAt: new Date().toISOString(),
    familyName: options.textureSourceFitBundle.familyName,
    sectionKey: options.textureSourceFitBundle.sectionKey,
    skinName: options.textureSourceFitBundle.skinName,
    textureFitReviewState,
    textureSourceFitState: options.textureSourceFitBundle.textureSourceFitState,
    textureCanvasState: options.textureSourceFitBundle.textureCanvasState,
    textureRenderState: options.textureSourceFitBundle.textureRenderState,
    textureAssemblyState: options.textureSourceFitBundle.textureAssemblyState,
    textureLockState: options.textureSourceFitBundle.textureLockState,
    pageLockApplyState: options.textureSourceFitBundle.pageLockApplyState,
    pageLockApprovalState: options.textureSourceFitBundle.pageLockApprovalState,
    textureReconstructionState: options.textureSourceFitBundle.textureReconstructionState,
    textureSourceState: options.textureSourceFitBundle.textureSourceState,
    matchState: options.textureSourceFitBundle.matchState,
    reviewState: options.textureSourceFitBundle.reviewState,
    materialState: options.textureSourceFitBundle.materialState,
    renderState: options.textureSourceFitBundle.renderState,
    blueprintState: options.textureSourceFitBundle.blueprintState,
    reconstructionState: options.textureSourceFitBundle.reconstructionState,
    pageCount: options.textureSourceFitBundle.pageCount,
    pageSizeCount: options.textureSourceFitBundle.pageSizeCount,
    sourceDimensionCount: options.textureSourceFitBundle.sourceDimensionCount,
    missingPageSizeCount: options.textureSourceFitBundle.missingPageSizeCount,
    missingSourceDimensionCount: options.textureSourceFitBundle.missingSourceDimensionCount,
    exactPageLockCount: options.textureSourceFitBundle.exactPageLockCount,
    appliedPageLockCount: options.textureSourceFitBundle.appliedPageLockCount,
    unresolvedPageLockCount: options.textureSourceFitBundle.unresolvedPageLockCount,
    exactPageFitCount: options.textureSourceFitBundle.exactPageFitCount,
    uniformScalePageFitCount: options.textureSourceFitBundle.uniformScalePageFitCount,
    nonUniformScalePageFitCount: options.textureSourceFitBundle.nonUniformScalePageFitCount,
    reviewReadyPageCount,
    blockedPageCount,
    uniqueSelectedLocalPathCount: options.textureSourceFitBundle.uniqueSelectedLocalPathCount,
    drawOperationCount: options.textureSourceFitBundle.drawOperationCount,
    readyDrawOperationCount: options.textureSourceFitBundle.readyDrawOperationCount,
    blockedDrawOperationCount: options.textureSourceFitBundle.blockedDrawOperationCount,
    topFitReviewLocalPath,
    largestScaleDelta,
    sampleLocalSourcePath: options.textureSourceFitBundle.sampleLocalSourcePath,
    atlasSourcePath: options.textureSourceFitBundle.atlasSourcePath,
    textureSourceFitBundlePath: options.textureSourceFitBundlePath,
    nextTextureFitReviewStep,
    pages
  };
}
