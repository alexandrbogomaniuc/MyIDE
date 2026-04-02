import type {
  SectionSkinRenderBounds,
  SectionSkinRenderPlanFile,
  SectionSkinTextureFitApprovalBundleFile,
  SectionSkinTextureFitApprovalPageRecord,
  SectionSkinTextureFitApprovalPageState,
  SectionSkinTextureFitApprovalState,
  SectionSkinTextureFitDecisionBundleFile,
  SectionSkinTextureFitDecisionPageRecord,
  SectionSkinTextureFitTransformOptionRecord
} from "./shared";

interface BuildSectionSkinTextureFitApprovalBundleOptions {
  textureFitDecisionBundle: SectionSkinTextureFitDecisionBundleFile;
  textureFitDecisionBundlePath: string;
  renderPlan: SectionSkinRenderPlanFile;
  renderPlanPath: string;
}

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  const results: string[] = [];
  for (const value of values) {
    if (typeof value !== "string" || value.length === 0 || results.includes(value)) {
      continue;
    }
    results.push(value);
  }
  return results;
}

function buildBundleState(
  sourceState: SectionSkinTextureFitDecisionBundleFile["textureFitDecisionState"],
  pageCount: number,
  approvalReadyPageCount: number,
  blockedPageCount: number
): SectionSkinTextureFitApprovalState {
  if (sourceState === "needs-source-dimension-review") {
    return "needs-source-dimension-review";
  }
  if (sourceState === "needs-atlas-page-size-review") {
    return "needs-atlas-page-size-review";
  }
  if (sourceState === "needs-page-lock-resolution") {
    return "needs-page-lock-resolution";
  }
  if (blockedPageCount > 0 || approvalReadyPageCount !== pageCount) {
    return "needs-fit-decision-review";
  }
  if (sourceState === "ready-with-exact-fit-decisions") {
    return "ready-with-exact-fit-approvals";
  }
  if (sourceState === "ready-with-uniform-fit-decisions") {
    return "ready-with-uniform-fit-approvals";
  }
  return "ready-for-fit-approval";
}

function buildPageState(
  sourcePageState: SectionSkinTextureFitDecisionPageRecord["pageState"],
  selectedTransform: SectionSkinTextureFitTransformOptionRecord | null
): SectionSkinTextureFitApprovalPageState {
  if (sourcePageState === "missing-source-dimensions") {
    return "missing-source-dimensions";
  }
  if (sourcePageState === "missing-atlas-page-size") {
    return "missing-atlas-page-size";
  }
  if (sourcePageState === "needs-page-lock-resolution" || !selectedTransform) {
    return "needs-page-lock-resolution";
  }
  if (sourcePageState === "exact-fit-decision") {
    return "exact-fit-approval";
  }
  if (sourcePageState === "uniform-fit-decision") {
    return "uniform-fit-approval";
  }
  if (sourcePageState === "proposed-contain-fit-decision") {
    return "proposed-contain-fit-approval";
  }
  if (sourcePageState === "proposed-cover-fit-decision") {
    return "proposed-cover-fit-approval";
  }
  return "proposed-stretch-fit-approval";
}

function selectTransform(
  page: SectionSkinTextureFitDecisionPageRecord
): SectionSkinTextureFitTransformOptionRecord | null {
  if (page.selectedMode === "exact") {
    return page.exactTransform;
  }
  if (page.selectedMode === "uniform-scale") {
    return page.containTransform ?? page.coverTransform ?? page.exactTransform;
  }
  if (page.selectedMode === "contain") {
    return page.containTransform;
  }
  if (page.selectedMode === "cover") {
    return page.coverTransform;
  }
  if (page.selectedMode === "stretch") {
    return page.stretchTransform;
  }
  return null;
}

function buildPageRecord(
  page: SectionSkinTextureFitDecisionPageRecord,
  renderLayers: SectionSkinRenderPlanFile["layers"]
): SectionSkinTextureFitApprovalPageRecord {
  const selectedTransform = selectTransform(page);
  const matchingLayers = renderLayers.filter((layer) => layer.pageName === page.pageName);
  const affectedSlotNames = uniqueStrings(matchingLayers.map((layer) => layer.slotName));
  const affectedAttachmentNames = uniqueStrings(matchingLayers.map((layer) => layer.attachmentName));
  const affectedRegionNames = uniqueStrings(matchingLayers.map((layer) => layer.regionName));
  const sampleLayerBounds: SectionSkinRenderBounds | null = matchingLayers.find((layer) => layer.bounds)?.bounds ?? null;
  const pageState = buildPageState(page.pageState, selectedTransform);
  const nextFitApprovalStep = pageState === "exact-fit-approval"
    ? `${page.pageName}: use the exact selected transform directly because the locked local source already matches the atlas page size.`
    : pageState === "uniform-fit-approval"
      ? `${page.pageName}: approve the selected uniform-scale transform directly because the locked local source already matches the atlas page aspect ratio.`
      : pageState === "proposed-contain-fit-approval" || pageState === "proposed-cover-fit-approval" || pageState === "proposed-stretch-fit-approval"
        ? `${page.pageName}: review and approve the selected ${page.selectedMode} transform with its affected layers before final texture reconstruction.`
        : `${page.pageName}: resolve the remaining fit-decision blocker before donor scan can prepare an approval-ready transform.`;

  return {
    orderIndex: page.orderIndex,
    pageName: page.pageName,
    pageState,
    sourcePageState: page.pageState,
    selectedMode: page.selectedMode,
    selectedReason: page.selectedReason,
    alternativeModePreview: page.alternativeModePreview,
    selectedTransform,
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
    affectedLayerCount: matchingLayers.length,
    affectedSlotNames,
    affectedAttachmentNames,
    affectedRegionNames,
    sampleLayerBounds,
    topAffectedSlotName: affectedSlotNames[0] ?? null,
    topAffectedAttachmentName: affectedAttachmentNames[0] ?? null,
    nextFitApprovalStep
  };
}

export function buildSectionSkinTextureFitApprovalBundle(
  options: BuildSectionSkinTextureFitApprovalBundleOptions
): SectionSkinTextureFitApprovalBundleFile {
  const pages = options.textureFitDecisionBundle.pages.map((page) =>
    buildPageRecord(page, options.renderPlan.layers)
  );
  const approvalReadyPageCount = pages.filter((page) =>
    page.pageState === "exact-fit-approval"
    || page.pageState === "uniform-fit-approval"
    || page.pageState === "proposed-contain-fit-approval"
    || page.pageState === "proposed-cover-fit-approval"
    || page.pageState === "proposed-stretch-fit-approval"
  ).length;
  const blockedPageCount = pages.length - approvalReadyPageCount;
  const affectedLayerCount = pages.reduce((sum, page) => sum + page.affectedLayerCount, 0);
  const affectedAttachmentCount = uniqueStrings(
    pages.flatMap((page) => page.affectedAttachmentNames)
  ).length;
  const textureFitApprovalState = buildBundleState(
    options.textureFitDecisionBundle.textureFitDecisionState,
    options.textureFitDecisionBundle.pageCount,
    approvalReadyPageCount,
    blockedPageCount
  );
  const topApprovedLocalPath = pages.find((page) => typeof page.selectedLocalPath === "string" && page.selectedLocalPath.length > 0)?.selectedLocalPath ?? null;
  const nextTextureFitApprovalStep = textureFitApprovalState === "ready-with-exact-fit-approvals"
    ? `${options.textureFitDecisionBundle.sectionKey}: use the exact selected transforms directly for final texture reconstruction because every locked page source already matches the atlas page size.`
    : textureFitApprovalState === "ready-with-uniform-fit-approvals"
      ? `${options.textureFitDecisionBundle.sectionKey}: use the selected uniform-scale transforms directly for final texture reconstruction because every locked page source already matches the atlas page aspect ratio.`
      : textureFitApprovalState === "ready-for-fit-approval"
        ? `${options.textureFitDecisionBundle.sectionKey}: review and approve the selected per-page fit transforms with their affected layers before final texture reconstruction.`
        : textureFitApprovalState === "needs-atlas-page-size-review"
          ? `${options.textureFitDecisionBundle.sectionKey}: review the atlas page sizes before donor scan can prepare fit approvals cleanly.`
          : textureFitApprovalState === "needs-page-lock-resolution"
            ? `${options.textureFitDecisionBundle.sectionKey}: resolve the remaining page-lock issues before donor scan can prepare fit approvals cleanly.`
            : textureFitApprovalState === "needs-source-dimension-review"
              ? `${options.textureFitDecisionBundle.sectionKey}: review or replace the selected local page sources because donor scan could not read dimensions for every locked source.`
              : `${options.textureFitDecisionBundle.sectionKey}: review the remaining fit decisions before donor scan can prepare fit approvals cleanly.`;

  return {
    schemaVersion: "0.1.0",
    donorId: options.textureFitDecisionBundle.donorId,
    donorName: options.textureFitDecisionBundle.donorName,
    generatedAt: new Date().toISOString(),
    familyName: options.textureFitDecisionBundle.familyName,
    sectionKey: options.textureFitDecisionBundle.sectionKey,
    skinName: options.textureFitDecisionBundle.skinName,
    textureFitApprovalState,
    textureFitDecisionState: options.textureFitDecisionBundle.textureFitDecisionState,
    textureFitReviewState: options.textureFitDecisionBundle.textureFitReviewState,
    textureSourceFitState: options.textureFitDecisionBundle.textureSourceFitState,
    textureCanvasState: options.textureFitDecisionBundle.textureCanvasState,
    textureRenderState: options.textureFitDecisionBundle.textureRenderState,
    textureAssemblyState: options.textureFitDecisionBundle.textureAssemblyState,
    textureLockState: options.textureFitDecisionBundle.textureLockState,
    pageLockApplyState: options.textureFitDecisionBundle.pageLockApplyState,
    pageLockApprovalState: options.textureFitDecisionBundle.pageLockApprovalState,
    textureReconstructionState: options.textureFitDecisionBundle.textureReconstructionState,
    textureSourceState: options.textureFitDecisionBundle.textureSourceState,
    matchState: options.textureFitDecisionBundle.matchState,
    reviewState: options.textureFitDecisionBundle.reviewState,
    materialState: options.textureFitDecisionBundle.materialState,
    renderState: options.textureFitDecisionBundle.renderState,
    blueprintState: options.textureFitDecisionBundle.blueprintState,
    reconstructionState: options.textureFitDecisionBundle.reconstructionState,
    pageCount: options.textureFitDecisionBundle.pageCount,
    pageSizeCount: options.textureFitDecisionBundle.pageSizeCount,
    sourceDimensionCount: options.textureFitDecisionBundle.sourceDimensionCount,
    missingPageSizeCount: options.textureFitDecisionBundle.missingPageSizeCount,
    missingSourceDimensionCount: options.textureFitDecisionBundle.missingSourceDimensionCount,
    exactPageLockCount: options.textureFitDecisionBundle.exactPageLockCount,
    appliedPageLockCount: options.textureFitDecisionBundle.appliedPageLockCount,
    unresolvedPageLockCount: options.textureFitDecisionBundle.unresolvedPageLockCount,
    exactFitDecisionCount: options.textureFitDecisionBundle.exactFitDecisionCount,
    uniformFitDecisionCount: options.textureFitDecisionBundle.uniformFitDecisionCount,
    proposedContainDecisionCount: options.textureFitDecisionBundle.proposedContainDecisionCount,
    proposedCoverDecisionCount: options.textureFitDecisionBundle.proposedCoverDecisionCount,
    proposedStretchDecisionCount: options.textureFitDecisionBundle.proposedStretchDecisionCount,
    approvalReadyPageCount,
    blockedPageCount,
    uniqueSelectedLocalPathCount: options.textureFitDecisionBundle.uniqueSelectedLocalPathCount,
    drawOperationCount: options.textureFitDecisionBundle.drawOperationCount,
    readyDrawOperationCount: options.textureFitDecisionBundle.readyDrawOperationCount,
    blockedDrawOperationCount: options.textureFitDecisionBundle.blockedDrawOperationCount,
    affectedLayerCount,
    affectedAttachmentCount,
    topApprovedLocalPath,
    largestOccupancyCoverageRatio: options.textureFitDecisionBundle.largestOccupancyCoverageRatio,
    largestScaleDelta: options.textureFitDecisionBundle.largestScaleDelta,
    sampleLocalSourcePath: options.textureFitDecisionBundle.sampleLocalSourcePath,
    atlasSourcePath: options.textureFitDecisionBundle.atlasSourcePath,
    textureFitDecisionBundlePath: options.textureFitDecisionBundlePath,
    renderPlanPath: options.renderPlanPath,
    nextTextureFitApprovalStep,
    pages
  };
}
