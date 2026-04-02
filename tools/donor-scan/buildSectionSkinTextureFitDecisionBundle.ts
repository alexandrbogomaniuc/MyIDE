import type {
  SectionSkinRenderBounds,
  SectionSkinTextureCanvasBundleFile,
  SectionSkinTextureFitDecisionBundleFile,
  SectionSkinTextureFitDecisionMode,
  SectionSkinTextureFitDecisionPageRecord,
  SectionSkinTextureFitDecisionPageState,
  SectionSkinTextureFitDecisionState,
  SectionSkinTextureFitTransformOptionRecord,
  SectionSkinTextureFitReviewBundleFile
} from "./shared";

interface BuildSectionSkinTextureFitDecisionBundleOptions {
  textureFitReviewBundle: SectionSkinTextureFitReviewBundleFile;
  textureFitReviewBundlePath: string;
  textureCanvasBundle: SectionSkinTextureCanvasBundleFile;
}

function uniqueModes(values: SectionSkinTextureFitDecisionMode[]): SectionSkinTextureFitDecisionMode[] {
  const results: SectionSkinTextureFitDecisionMode[] = [];
  for (const value of values) {
    if (!results.includes(value)) {
      results.push(value);
    }
  }
  return results;
}

function computeOccupiedBounds(
  page: SectionSkinTextureCanvasBundleFile["pages"][number] | undefined
): { bounds: SectionSkinRenderBounds | null; coverageRatio: number | null } {
  if (!page || !Array.isArray(page.operations) || typeof page.canvasWidth !== "number" || typeof page.canvasHeight !== "number") {
    return { bounds: null, coverageRatio: null };
  }
  const xs: number[] = [];
  const ys: number[] = [];
  for (const operation of page.operations) {
    if (
      typeof operation.targetX === "number"
      && typeof operation.targetY === "number"
      && typeof operation.targetWidth === "number"
      && typeof operation.targetHeight === "number"
    ) {
      xs.push(operation.targetX, operation.targetX + operation.targetWidth);
      ys.push(operation.targetY, operation.targetY + operation.targetHeight);
    }
  }
  if (xs.length === 0 || ys.length === 0) {
    return { bounds: null, coverageRatio: null };
  }
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  const width = Math.max(...xs) - x;
  const height = Math.max(...ys) - y;
  const area = width * height;
  const canvasArea = page.canvasWidth * page.canvasHeight;
  return {
    bounds: { x, y, width, height },
    coverageRatio: canvasArea > 0 ? area / canvasArea : null
  };
}

function computeContainPenalty(
  option: SectionSkinTextureFitTransformOptionRecord | null,
  canvasWidth: number | null,
  canvasHeight: number | null
): number | null {
  if (!option || typeof option.outputWidth !== "number" || typeof option.outputHeight !== "number" || typeof canvasWidth !== "number" || typeof canvasHeight !== "number") {
    return null;
  }
  const canvasArea = canvasWidth * canvasHeight;
  const outputArea = option.outputWidth * option.outputHeight;
  if (canvasArea <= 0) {
    return null;
  }
  return Math.max(0, 1 - Math.min(1, outputArea / canvasArea));
}

function computeCoverPenalty(
  option: SectionSkinTextureFitTransformOptionRecord | null,
  canvasWidth: number | null,
  canvasHeight: number | null
): number | null {
  if (!option || typeof option.outputWidth !== "number" || typeof option.outputHeight !== "number" || typeof canvasWidth !== "number" || typeof canvasHeight !== "number") {
    return null;
  }
  const canvasArea = canvasWidth * canvasHeight;
  const outputArea = option.outputWidth * option.outputHeight;
  if (canvasArea <= 0 || outputArea <= 0) {
    return null;
  }
  return Math.max(0, 1 - Math.min(1, canvasArea / outputArea));
}

function computeStretchPenalty(option: SectionSkinTextureFitTransformOptionRecord | null): number | null {
  if (!option || typeof option.scaleX !== "number" || typeof option.scaleY !== "number") {
    return null;
  }
  const denominator = Math.max(option.scaleX, option.scaleY);
  if (denominator <= 0) {
    return null;
  }
  return Math.abs(option.scaleX - option.scaleY) / denominator;
}

function selectMode(
  page: SectionSkinTextureFitReviewBundleFile["pages"][number],
  occupiedCoverageRatio: number | null
): {
  mode: SectionSkinTextureFitDecisionMode | null;
  reason: string;
  alternatives: SectionSkinTextureFitDecisionMode[];
  containPenalty: number | null;
  coverPenalty: number | null;
  stretchPenalty: number | null;
} {
  const containPenalty = computeContainPenalty(page.containTransform, page.canvasWidth, page.canvasHeight);
  const coverPenalty = computeCoverPenalty(page.coverTransform, page.canvasWidth, page.canvasHeight);
  const stretchPenalty = computeStretchPenalty(page.stretchTransform);

  if (page.pageState === "exact-fit-transform") {
    return {
      mode: "exact",
      reason: "The locked local page source already matches the atlas page size exactly.",
      alternatives: [],
      containPenalty,
      coverPenalty,
      stretchPenalty
    };
  }

  if (page.pageState === "uniform-fit-transform") {
    return {
      mode: "uniform-scale",
      reason: "The locked local page source already matches the atlas page aspect ratio, so one uniform scale is sufficient.",
      alternatives: uniqueModes(["contain", "cover"]),
      containPenalty,
      coverPenalty,
      stretchPenalty
    };
  }

  if (page.pageState !== "needs-fit-transform-review") {
    return {
      mode: null,
      reason: "Donor scan cannot propose a fit decision until the page-lock or dimension blockers are resolved.",
      alternatives: [],
      containPenalty,
      coverPenalty,
      stretchPenalty
    };
  }

  const contain = containPenalty ?? Number.POSITIVE_INFINITY;
  const cover = coverPenalty ?? Number.POSITIVE_INFINITY;
  const stretch = stretchPenalty ?? Number.POSITIVE_INFINITY;
  const occupancy = occupiedCoverageRatio ?? 0;

  if (stretch < Number.POSITIVE_INFINITY && stretch + 0.1 < Math.min(contain, cover)) {
    return {
      mode: "stretch",
      reason: `Stretch is the least costly fallback here because its normalized distortion penalty (${stretch.toFixed(3)}) is meaningfully lower than the contain padding (${contain.toFixed(3)}) and cover crop (${cover.toFixed(3)}) penalties.`,
      alternatives: uniqueModes(["contain", "cover"]),
      containPenalty,
      coverPenalty,
      stretchPenalty
    };
  }

  if (occupancy >= 0.75 && cover <= contain + 0.05) {
    return {
      mode: "cover",
      reason: `Cover is the best proposal here because the atlas page occupancy is high (${occupancy.toFixed(3)}) and its crop penalty (${cover.toFixed(3)}) is not materially worse than the contain padding penalty (${contain.toFixed(3)}).`,
      alternatives: uniqueModes(["contain", "stretch"]),
      containPenalty,
      coverPenalty,
      stretchPenalty
    };
  }

  if (contain <= cover + 0.05) {
    return {
      mode: "contain",
      reason: `Contain is the safest proposal here because it preserves the full locked local source without distortion, and its padding penalty (${contain.toFixed(3)}) is not materially worse than the cover crop penalty (${cover.toFixed(3)}).`,
      alternatives: uniqueModes(["cover", "stretch"]),
      containPenalty,
      coverPenalty,
      stretchPenalty
    };
  }

  return {
    mode: "cover",
    reason: `Cover is the best proposal here because its crop penalty (${cover.toFixed(3)}) is lower than the contain padding penalty (${contain.toFixed(3)}), while stretch would still introduce distortion (${stretch.toFixed(3)}).`,
    alternatives: uniqueModes(["contain", "stretch"]),
    containPenalty,
    coverPenalty,
    stretchPenalty
  };
}

function buildPageState(
  sourcePageState: SectionSkinTextureFitReviewBundleFile["pages"][number]["pageState"],
  selectedMode: SectionSkinTextureFitDecisionMode | null
): SectionSkinTextureFitDecisionPageState {
  if (sourcePageState === "missing-source-dimensions") {
    return "missing-source-dimensions";
  }
  if (sourcePageState === "missing-atlas-page-size") {
    return "missing-atlas-page-size";
  }
  if (sourcePageState === "needs-page-lock-resolution") {
    return "needs-page-lock-resolution";
  }
  if (selectedMode === "exact") {
    return "exact-fit-decision";
  }
  if (selectedMode === "uniform-scale") {
    return "uniform-fit-decision";
  }
  if (selectedMode === "contain") {
    return "proposed-contain-fit-decision";
  }
  if (selectedMode === "cover") {
    return "proposed-cover-fit-decision";
  }
  if (selectedMode === "stretch") {
    return "proposed-stretch-fit-decision";
  }
  return "needs-page-lock-resolution";
}

function buildBundleState(
  pageCount: number,
  unresolvedPageLockCount: number,
  missingPageSizeCount: number,
  missingSourceDimensionCount: number,
  exactFitDecisionCount: number,
  uniformFitDecisionCount: number,
  proposedContainDecisionCount: number,
  proposedCoverDecisionCount: number,
  proposedStretchDecisionCount: number
): SectionSkinTextureFitDecisionState {
  if (unresolvedPageLockCount > 0) {
    return "needs-page-lock-resolution";
  }
  if (missingPageSizeCount > 0) {
    return "needs-atlas-page-size-review";
  }
  if (missingSourceDimensionCount > 0) {
    return "needs-source-dimension-review";
  }
  if (pageCount > 0 && exactFitDecisionCount === pageCount) {
    return "ready-with-exact-fit-decisions";
  }
  if (pageCount > 0 && exactFitDecisionCount + uniformFitDecisionCount === pageCount) {
    return "ready-with-uniform-fit-decisions";
  }
  if (pageCount > 0 && exactFitDecisionCount + uniformFitDecisionCount + proposedContainDecisionCount + proposedCoverDecisionCount + proposedStretchDecisionCount === pageCount) {
    return "ready-for-fit-decision-review";
  }
  return "needs-source-dimension-review";
}

export function buildSectionSkinTextureFitDecisionBundle(
  options: BuildSectionSkinTextureFitDecisionBundleOptions
): SectionSkinTextureFitDecisionBundleFile {
  const canvasPagesByName = new Map(
    options.textureCanvasBundle.pages.map((page) => [page.pageName, page] as const)
  );
  const pages: SectionSkinTextureFitDecisionPageRecord[] = options.textureFitReviewBundle.pages.map((page) => {
    const canvasPage = canvasPagesByName.get(page.pageName);
    const occupied = computeOccupiedBounds(canvasPage);
    const selection = selectMode(page, occupied.coverageRatio);
    const pageState = buildPageState(page.pageState, selection.mode);
    const nextFitDecisionStep = pageState === "exact-fit-decision"
      ? `${page.pageName}: use the exact fit directly because the locked local source already matches the atlas page size.`
      : pageState === "uniform-fit-decision"
        ? `${page.pageName}: use the uniform-scale fit directly because the locked local source already matches the atlas page aspect ratio.`
        : pageState === "proposed-contain-fit-decision" || pageState === "proposed-cover-fit-decision" || pageState === "proposed-stretch-fit-decision"
          ? `${page.pageName}: review the proposed ${selection.mode} fit decision before final texture reconstruction.`
          : `${page.pageName}: resolve the remaining dimension or page-lock blocker before donor scan can propose a fit decision.`;

    return {
      orderIndex: page.orderIndex,
      pageName: page.pageName,
      pageState,
      sourcePageState: page.pageState,
      selectedMode: selection.mode,
      selectedReason: selection.reason,
      alternativeModePreview: selection.alternatives,
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
      occupiedBounds: occupied.bounds,
      occupiedCoverageRatio: occupied.coverageRatio,
      containPenalty: selection.containPenalty,
      coverPenalty: selection.coverPenalty,
      stretchPenalty: selection.stretchPenalty,
      scaleX: page.scaleX,
      scaleY: page.scaleY,
      scaleDelta: page.scaleDelta,
      slotNames: page.slotNames,
      regionNames: page.regionNames,
      exactTransform: page.exactTransform,
      containTransform: page.containTransform,
      coverTransform: page.coverTransform,
      stretchTransform: page.stretchTransform,
      nextFitDecisionStep
    };
  });

  const exactFitDecisionCount = pages.filter((page) => page.pageState === "exact-fit-decision").length;
  const uniformFitDecisionCount = pages.filter((page) => page.pageState === "uniform-fit-decision").length;
  const proposedContainDecisionCount = pages.filter((page) => page.pageState === "proposed-contain-fit-decision").length;
  const proposedCoverDecisionCount = pages.filter((page) => page.pageState === "proposed-cover-fit-decision").length;
  const proposedStretchDecisionCount = pages.filter((page) => page.pageState === "proposed-stretch-fit-decision").length;
  const reviewReadyPageCount = exactFitDecisionCount + uniformFitDecisionCount + proposedContainDecisionCount + proposedCoverDecisionCount + proposedStretchDecisionCount;
  const blockedPageCount = pages.length - reviewReadyPageCount;
  const largestOccupancyCoverageRatio = pages.reduce<number | null>((largest, page) => {
    if (typeof page.occupiedCoverageRatio !== "number") {
      return largest;
    }
    return largest === null || page.occupiedCoverageRatio > largest ? page.occupiedCoverageRatio : largest;
  }, null);
  const largestScaleDelta = pages.reduce<number | null>((largest, page) => {
    if (typeof page.scaleDelta !== "number") {
      return largest;
    }
    return largest === null || page.scaleDelta > largest ? page.scaleDelta : largest;
  }, null);
  const textureFitDecisionState = buildBundleState(
    options.textureFitReviewBundle.pageCount,
    options.textureFitReviewBundle.unresolvedPageLockCount,
    options.textureFitReviewBundle.missingPageSizeCount,
    options.textureFitReviewBundle.missingSourceDimensionCount,
    exactFitDecisionCount,
    uniformFitDecisionCount,
    proposedContainDecisionCount,
    proposedCoverDecisionCount,
    proposedStretchDecisionCount
  );
  const topDecisionLocalPath = pages.find((page) => typeof page.selectedLocalPath === "string" && page.selectedLocalPath.length > 0)?.selectedLocalPath ?? null;
  const nextTextureFitDecisionStep = textureFitDecisionState === "ready-with-exact-fit-decisions"
    ? `${options.textureFitReviewBundle.sectionKey}: use the exact fit decisions directly for final texture reconstruction because every locked page source already matches the atlas page size.`
    : textureFitDecisionState === "ready-with-uniform-fit-decisions"
      ? `${options.textureFitReviewBundle.sectionKey}: use the uniform fit decisions directly for final texture reconstruction because every locked page source already matches the atlas page aspect ratio.`
      : textureFitDecisionState === "ready-for-fit-decision-review"
        ? `${options.textureFitReviewBundle.sectionKey}: review the proposed per-page fit decisions before final texture reconstruction because at least one locked page source still needs a chosen contain, cover, or stretch mode.`
        : textureFitDecisionState === "needs-atlas-page-size-review"
          ? `${options.textureFitReviewBundle.sectionKey}: review the atlas page sizes before donor scan can propose fit decisions cleanly.`
          : textureFitDecisionState === "needs-page-lock-resolution"
            ? `${options.textureFitReviewBundle.sectionKey}: resolve the remaining page-lock issues before donor scan can propose fit decisions cleanly.`
            : `${options.textureFitReviewBundle.sectionKey}: review or replace the selected local page sources because donor scan could not read dimensions for every locked source.`;

  return {
    schemaVersion: "0.1.0",
    donorId: options.textureFitReviewBundle.donorId,
    donorName: options.textureFitReviewBundle.donorName,
    generatedAt: new Date().toISOString(),
    familyName: options.textureFitReviewBundle.familyName,
    sectionKey: options.textureFitReviewBundle.sectionKey,
    skinName: options.textureFitReviewBundle.skinName,
    textureFitDecisionState,
    textureFitReviewState: options.textureFitReviewBundle.textureFitReviewState,
    textureSourceFitState: options.textureFitReviewBundle.textureSourceFitState,
    textureCanvasState: options.textureFitReviewBundle.textureCanvasState,
    textureRenderState: options.textureFitReviewBundle.textureRenderState,
    textureAssemblyState: options.textureFitReviewBundle.textureAssemblyState,
    textureLockState: options.textureFitReviewBundle.textureLockState,
    pageLockApplyState: options.textureFitReviewBundle.pageLockApplyState,
    pageLockApprovalState: options.textureFitReviewBundle.pageLockApprovalState,
    textureReconstructionState: options.textureFitReviewBundle.textureReconstructionState,
    textureSourceState: options.textureFitReviewBundle.textureSourceState,
    matchState: options.textureFitReviewBundle.matchState,
    reviewState: options.textureFitReviewBundle.reviewState,
    materialState: options.textureFitReviewBundle.materialState,
    renderState: options.textureFitReviewBundle.renderState,
    blueprintState: options.textureFitReviewBundle.blueprintState,
    reconstructionState: options.textureFitReviewBundle.reconstructionState,
    pageCount: options.textureFitReviewBundle.pageCount,
    pageSizeCount: options.textureFitReviewBundle.pageSizeCount,
    sourceDimensionCount: options.textureFitReviewBundle.sourceDimensionCount,
    missingPageSizeCount: options.textureFitReviewBundle.missingPageSizeCount,
    missingSourceDimensionCount: options.textureFitReviewBundle.missingSourceDimensionCount,
    exactPageLockCount: options.textureFitReviewBundle.exactPageLockCount,
    appliedPageLockCount: options.textureFitReviewBundle.appliedPageLockCount,
    unresolvedPageLockCount: options.textureFitReviewBundle.unresolvedPageLockCount,
    exactFitDecisionCount,
    uniformFitDecisionCount,
    proposedContainDecisionCount,
    proposedCoverDecisionCount,
    proposedStretchDecisionCount,
    reviewReadyPageCount,
    blockedPageCount,
    uniqueSelectedLocalPathCount: options.textureFitReviewBundle.uniqueSelectedLocalPathCount,
    drawOperationCount: options.textureFitReviewBundle.drawOperationCount,
    readyDrawOperationCount: options.textureFitReviewBundle.readyDrawOperationCount,
    blockedDrawOperationCount: options.textureFitReviewBundle.blockedDrawOperationCount,
    topDecisionLocalPath,
    largestOccupancyCoverageRatio,
    largestScaleDelta,
    sampleLocalSourcePath: options.textureFitReviewBundle.sampleLocalSourcePath,
    atlasSourcePath: options.textureFitReviewBundle.atlasSourcePath,
    textureFitReviewBundlePath: options.textureFitReviewBundlePath,
    nextTextureFitDecisionStep,
    pages
  };
}
