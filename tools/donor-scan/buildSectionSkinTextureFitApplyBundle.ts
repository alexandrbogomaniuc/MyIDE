import type {
  SectionSkinTextureFitApprovalBundleFile,
  SectionSkinTextureFitApplyBundleFile,
  SectionSkinTextureFitApplyPageRecord,
  SectionSkinTextureFitApplyPageState,
  SectionSkinTextureFitApplyState
} from "./shared";

interface BuildSectionSkinTextureFitApplyBundleOptions {
  textureFitApprovalBundle: SectionSkinTextureFitApprovalBundleFile;
  textureFitApprovalBundlePath: string;
}

function buildBundleState(
  sourceState: SectionSkinTextureFitApprovalBundleFile["textureFitApprovalState"],
  pageCount: number,
  readyPageCount: number,
  blockedPageCount: number
): SectionSkinTextureFitApplyState {
  if (sourceState === "needs-source-dimension-review") {
    return "needs-source-dimension-review";
  }
  if (sourceState === "needs-atlas-page-size-review") {
    return "needs-atlas-page-size-review";
  }
  if (sourceState === "needs-page-lock-resolution") {
    return "needs-page-lock-resolution";
  }
  if (blockedPageCount > 0 || readyPageCount !== pageCount) {
    return "needs-fit-approval";
  }
  if (sourceState === "ready-with-exact-fit-approvals") {
    return "ready-with-exact-fit-transforms";
  }
  if (sourceState === "ready-with-uniform-fit-approvals") {
    return "ready-with-uniform-fit-transforms";
  }
  return "ready-with-applied-fit-transforms";
}

function buildPageState(
  sourcePageState: SectionSkinTextureFitApprovalBundleFile["pages"][number]["pageState"]
): SectionSkinTextureFitApplyPageState {
  if (sourcePageState === "missing-source-dimensions") {
    return "missing-source-dimensions";
  }
  if (sourcePageState === "missing-atlas-page-size") {
    return "missing-atlas-page-size";
  }
  if (sourcePageState === "needs-page-lock-resolution") {
    return "needs-page-lock-resolution";
  }
  if (sourcePageState === "exact-fit-approval") {
    return "exact-fit-transform";
  }
  if (sourcePageState === "uniform-fit-approval") {
    return "uniform-fit-transform";
  }
  if (sourcePageState === "proposed-contain-fit-approval") {
    return "applied-contain-fit-transform";
  }
  if (sourcePageState === "proposed-cover-fit-approval") {
    return "applied-cover-fit-transform";
  }
  return "applied-stretch-fit-transform";
}

function buildPageRecord(
  page: SectionSkinTextureFitApprovalBundleFile["pages"][number]
): SectionSkinTextureFitApplyPageRecord {
  const pageState = buildPageState(page.pageState);
  const nextFitApplyStep = pageState === "exact-fit-transform"
    ? `${page.pageName}: use the exact applied transform directly because the locked local source already matches the atlas page size.`
    : pageState === "uniform-fit-transform"
      ? `${page.pageName}: use the applied uniform transform directly because the locked local source already matches the atlas page aspect ratio.`
      : pageState === "applied-contain-fit-transform" || pageState === "applied-cover-fit-transform" || pageState === "applied-stretch-fit-transform"
        ? `${page.pageName}: use the applied ${page.selectedMode} transform as the downstream fit surface for final texture reconstruction.`
        : `${page.pageName}: resolve the remaining fit-approval blocker before donor scan can apply a final transform cleanly.`;

  return {
    orderIndex: page.orderIndex,
    pageName: page.pageName,
    pageState,
    sourcePageState: page.pageState,
    selectedMode: page.selectedMode,
    selectedReason: page.selectedReason,
    alternativeModePreview: page.alternativeModePreview,
    appliedTransform: page.selectedTransform,
    canvasWidth: page.canvasWidth,
    canvasHeight: page.canvasHeight,
    sourceWidth: page.sourceWidth,
    sourceHeight: page.sourceHeight,
    canvasAspectRatio: page.canvasAspectRatio,
    sourceAspectRatio: page.sourceAspectRatio,
    aspectRatioDelta: page.aspectRatioDelta,
    selectedLocalPath: page.selectedLocalPath,
    selectedCandidateRank: page.selectedCandidateRank,
    selectedCandidateScore: page.selectedCandidateScore,
    selectedCandidateReasons: page.selectedCandidateReasons,
    selectedCandidateMatchedTokens: page.selectedCandidateMatchedTokens,
    atlasPageLocalPath: page.atlasPageLocalPath,
    drawOperationCount: page.drawOperationCount,
    readyDrawOperationCount: page.readyDrawOperationCount,
    blockedDrawOperationCount: page.blockedDrawOperationCount,
    occupiedBounds: page.occupiedBounds,
    occupiedCoverageRatio: page.occupiedCoverageRatio,
    containPenalty: page.containPenalty,
    coverPenalty: page.coverPenalty,
    stretchPenalty: page.stretchPenalty,
    scaleX: page.scaleX,
    scaleY: page.scaleY,
    scaleDelta: page.scaleDelta,
    slotNames: page.slotNames,
    regionNames: page.regionNames,
    affectedLayerCount: page.affectedLayerCount,
    affectedSlotNames: page.affectedSlotNames,
    affectedAttachmentNames: page.affectedAttachmentNames,
    affectedRegionNames: page.affectedRegionNames,
    sampleLayerBounds: page.sampleLayerBounds,
    topAffectedSlotName: page.topAffectedSlotName,
    topAffectedAttachmentName: page.topAffectedAttachmentName,
    nextFitApplyStep
  };
}

export function buildSectionSkinTextureFitApplyBundle(
  options: BuildSectionSkinTextureFitApplyBundleOptions
): SectionSkinTextureFitApplyBundleFile {
  const pages = options.textureFitApprovalBundle.pages.map(buildPageRecord);
  const exactFitCount = pages.filter((page) => page.pageState === "exact-fit-transform").length;
  const uniformFitCount = pages.filter((page) => page.pageState === "uniform-fit-transform").length;
  const appliedContainFitCount = pages.filter((page) => page.pageState === "applied-contain-fit-transform").length;
  const appliedCoverFitCount = pages.filter((page) => page.pageState === "applied-cover-fit-transform").length;
  const appliedStretchFitCount = pages.filter((page) => page.pageState === "applied-stretch-fit-transform").length;
  const readyPageCount = exactFitCount + uniformFitCount + appliedContainFitCount + appliedCoverFitCount + appliedStretchFitCount;
  const blockedPageCount = pages.length - readyPageCount;
  const textureFitApplyState = buildBundleState(
    options.textureFitApprovalBundle.textureFitApprovalState,
    options.textureFitApprovalBundle.pageCount,
    readyPageCount,
    blockedPageCount
  );
  const topAppliedLocalPath = pages.find((page) => typeof page.selectedLocalPath === "string" && page.selectedLocalPath.length > 0)?.selectedLocalPath ?? null;
  const nextTextureFitApplyStep = textureFitApplyState === "ready-with-exact-fit-transforms"
    ? `${options.textureFitApprovalBundle.sectionKey}: use the exact applied fit transforms directly for final texture reconstruction because every locked page source already matches the atlas page size.`
    : textureFitApplyState === "ready-with-uniform-fit-transforms"
      ? `${options.textureFitApprovalBundle.sectionKey}: use the uniform applied fit transforms directly for final texture reconstruction because every locked page source already matches the atlas page aspect ratio.`
      : textureFitApplyState === "ready-with-applied-fit-transforms"
        ? `${options.textureFitApprovalBundle.sectionKey}: use the applied per-page fit transforms as the downstream handoff for final texture reconstruction.`
        : textureFitApplyState === "needs-atlas-page-size-review"
          ? `${options.textureFitApprovalBundle.sectionKey}: review the atlas page sizes before donor scan can apply the fit transforms cleanly.`
          : textureFitApplyState === "needs-page-lock-resolution"
            ? `${options.textureFitApprovalBundle.sectionKey}: resolve the remaining page-lock issues before donor scan can apply the fit transforms cleanly.`
            : textureFitApplyState === "needs-source-dimension-review"
              ? `${options.textureFitApprovalBundle.sectionKey}: review or replace the selected local page sources because donor scan could not read dimensions for every locked source.`
              : `${options.textureFitApprovalBundle.sectionKey}: review and approve the selected fit transforms before donor scan can apply them cleanly.`;

  return {
    schemaVersion: "0.1.0",
    donorId: options.textureFitApprovalBundle.donorId,
    donorName: options.textureFitApprovalBundle.donorName,
    generatedAt: new Date().toISOString(),
    familyName: options.textureFitApprovalBundle.familyName,
    sectionKey: options.textureFitApprovalBundle.sectionKey,
    skinName: options.textureFitApprovalBundle.skinName,
    textureFitApplyState,
    textureFitApprovalState: options.textureFitApprovalBundle.textureFitApprovalState,
    textureFitDecisionState: options.textureFitApprovalBundle.textureFitDecisionState,
    textureFitReviewState: options.textureFitApprovalBundle.textureFitReviewState,
    textureSourceFitState: options.textureFitApprovalBundle.textureSourceFitState,
    textureCanvasState: options.textureFitApprovalBundle.textureCanvasState,
    textureRenderState: options.textureFitApprovalBundle.textureRenderState,
    textureAssemblyState: options.textureFitApprovalBundle.textureAssemblyState,
    textureLockState: options.textureFitApprovalBundle.textureLockState,
    pageLockApplyState: options.textureFitApprovalBundle.pageLockApplyState,
    pageLockApprovalState: options.textureFitApprovalBundle.pageLockApprovalState,
    textureReconstructionState: options.textureFitApprovalBundle.textureReconstructionState,
    textureSourceState: options.textureFitApprovalBundle.textureSourceState,
    matchState: options.textureFitApprovalBundle.matchState,
    reviewState: options.textureFitApprovalBundle.reviewState,
    materialState: options.textureFitApprovalBundle.materialState,
    renderState: options.textureFitApprovalBundle.renderState,
    blueprintState: options.textureFitApprovalBundle.blueprintState,
    reconstructionState: options.textureFitApprovalBundle.reconstructionState,
    pageCount: options.textureFitApprovalBundle.pageCount,
    pageSizeCount: options.textureFitApprovalBundle.pageSizeCount,
    sourceDimensionCount: options.textureFitApprovalBundle.sourceDimensionCount,
    missingPageSizeCount: options.textureFitApprovalBundle.missingPageSizeCount,
    missingSourceDimensionCount: options.textureFitApprovalBundle.missingSourceDimensionCount,
    exactPageLockCount: options.textureFitApprovalBundle.exactPageLockCount,
    appliedPageLockCount: options.textureFitApprovalBundle.appliedPageLockCount,
    unresolvedPageLockCount: options.textureFitApprovalBundle.unresolvedPageLockCount,
    exactFitDecisionCount: options.textureFitApprovalBundle.exactFitDecisionCount,
    uniformFitDecisionCount: options.textureFitApprovalBundle.uniformFitDecisionCount,
    appliedContainFitCount,
    appliedCoverFitCount,
    appliedStretchFitCount,
    readyPageCount,
    blockedPageCount,
    uniqueSelectedLocalPathCount: options.textureFitApprovalBundle.uniqueSelectedLocalPathCount,
    drawOperationCount: options.textureFitApprovalBundle.drawOperationCount,
    readyDrawOperationCount: options.textureFitApprovalBundle.readyDrawOperationCount,
    blockedDrawOperationCount: options.textureFitApprovalBundle.blockedDrawOperationCount,
    affectedLayerCount: options.textureFitApprovalBundle.affectedLayerCount,
    affectedAttachmentCount: options.textureFitApprovalBundle.affectedAttachmentCount,
    topAppliedLocalPath,
    largestOccupancyCoverageRatio: options.textureFitApprovalBundle.largestOccupancyCoverageRatio,
    largestScaleDelta: options.textureFitApprovalBundle.largestScaleDelta,
    sampleLocalSourcePath: options.textureFitApprovalBundle.sampleLocalSourcePath,
    atlasSourcePath: options.textureFitApprovalBundle.atlasSourcePath,
    textureFitApprovalBundlePath: options.textureFitApprovalBundlePath,
    renderPlanPath: options.textureFitApprovalBundle.renderPlanPath,
    nextTextureFitApplyStep,
    pages
  };
}
