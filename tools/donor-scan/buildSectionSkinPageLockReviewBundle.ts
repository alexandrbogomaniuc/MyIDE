import type {
  SectionSkinPageLockDecisionBundleFile,
  SectionSkinPageLockReviewBundleFile,
  SectionSkinPageLockReviewPageRecord,
  SectionSkinPageLockReviewState,
  SectionSkinRenderBounds,
  SectionSkinRenderPlanFile
} from "./shared";

interface BuildSectionSkinPageLockReviewBundleOptions {
  pageLockDecisionBundle: SectionSkinPageLockDecisionBundleFile;
  pageLockDecisionBundlePath: string;
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

function buildReviewState(
  pageCount: number,
  exactPageLockCount: number,
  unresolvedPageLockCount: number
): SectionSkinPageLockReviewState {
  if (pageCount > 0 && exactPageLockCount === pageCount) {
    return "ready-with-exact-page-locks";
  }
  if (unresolvedPageLockCount > 0) {
    return "has-unresolved-page-lock-conflicts";
  }
  return "ready-for-lock-review";
}

function buildPageRecord(
  page: SectionSkinPageLockDecisionBundleFile["pages"][number],
  renderLayers: SectionSkinRenderPlanFile["layers"]
): SectionSkinPageLockReviewPageRecord {
  const matchingLayers = renderLayers.filter((layer) => layer.pageName === page.pageName);
  const affectedSlotNames = uniqueStrings(matchingLayers.map((layer) => layer.slotName));
  const affectedAttachmentNames = uniqueStrings(matchingLayers.map((layer) => layer.attachmentName));
  const affectedRegionNames = uniqueStrings(matchingLayers.map((layer) => layer.regionName));
  const sampleLayerBounds: SectionSkinRenderBounds | null = matchingLayers.find((layer) => layer.bounds)?.bounds ?? null;

  return {
    orderIndex: page.orderIndex,
    pageName: page.pageName,
    pageState: page.pageState,
    sourcePageState: page.sourcePageState,
    layerCount: page.layerCount,
    slotNames: page.slotNames,
    selectedLocalPath: page.selectedLocalPath,
    selectedCandidateRank: page.selectedCandidateRank,
    selectedCandidateScore: page.selectedCandidateScore,
    selectedCandidateReasons: page.selectedCandidateReasons,
    selectedCandidateMatchedTokens: page.selectedCandidateMatchedTokens,
    affectedLayerCount: matchingLayers.length,
    affectedSlotNames,
    affectedAttachmentNames,
    affectedRegionNames,
    sampleLayerBounds,
    topAffectedSlotName: affectedSlotNames[0] ?? null,
    topAffectedAttachmentName: affectedAttachmentNames[0] ?? null
  };
}

export function buildSectionSkinPageLockReviewBundle(
  options: BuildSectionSkinPageLockReviewBundleOptions
): SectionSkinPageLockReviewBundleFile {
  const pages = options.pageLockDecisionBundle.pages.map((page) =>
    buildPageRecord(page, options.renderPlan.layers)
  );
  const exactPageLockCount = pages.filter((page) => page.pageState === "exact-page-lock").length;
  const reviewReadyPageCount = pages.filter((page) => page.pageState === "ready-for-lock-review").length;
  const unresolvedPageLockCount = pages.filter((page) => page.pageState === "unresolved-page-lock-conflict").length;
  const pageLockReviewState = buildReviewState(
    options.pageLockDecisionBundle.pageCount,
    exactPageLockCount,
    unresolvedPageLockCount
  );
  const affectedLayerCount = pages.reduce((sum, page) => sum + page.affectedLayerCount, 0);
  const affectedAttachmentCount = uniqueStrings(
    pages.flatMap((page) => page.affectedAttachmentNames)
  ).length;
  const topAffectedSlotName = pages.find((page) => page.topAffectedSlotName)?.topAffectedSlotName ?? null;
  const nextPageLockReviewStep = pageLockReviewState === "ready-with-exact-page-locks"
    ? `${options.pageLockDecisionBundle.sectionKey}: use the exact page locks directly for final texture reconstruction because every atlas page already has an exact grounded local source.`
    : pageLockReviewState === "ready-for-lock-review"
      ? `${options.pageLockDecisionBundle.sectionKey}: review and lock the selected unique page-image assignments with their affected slots and attachments before final texture reconstruction.`
      : `${options.pageLockDecisionBundle.sectionKey}: resolve the remaining page-image conflicts before final texture reconstruction because at least one atlas page still lacks a unique grounded local source.`;

  return {
    schemaVersion: "0.1.0",
    donorId: options.pageLockDecisionBundle.donorId,
    donorName: options.pageLockDecisionBundle.donorName,
    generatedAt: new Date().toISOString(),
    familyName: options.pageLockDecisionBundle.familyName,
    sectionKey: options.pageLockDecisionBundle.sectionKey,
    skinName: options.pageLockDecisionBundle.skinName,
    pageLockReviewState,
    pageLockDecisionState: options.pageLockDecisionBundle.pageLockDecisionState,
    pageLockResolutionState: options.pageLockDecisionBundle.pageLockResolutionState,
    pageLockAuditState: options.pageLockDecisionBundle.pageLockAuditState,
    pageLockState: options.pageLockDecisionBundle.pageLockState,
    textureInputState: options.pageLockDecisionBundle.textureInputState,
    textureReconstructionState: options.pageLockDecisionBundle.textureReconstructionState,
    textureSourceState: options.pageLockDecisionBundle.textureSourceState,
    matchState: options.pageLockDecisionBundle.matchState,
    reviewState: options.pageLockDecisionBundle.reviewState,
    materialState: options.pageLockDecisionBundle.materialState,
    renderState: options.pageLockDecisionBundle.renderState,
    blueprintState: options.pageLockDecisionBundle.blueprintState,
    reconstructionState: options.pageLockDecisionBundle.reconstructionState,
    pageCount: options.pageLockDecisionBundle.pageCount,
    exactPageLockCount,
    reviewReadyPageCount,
    unresolvedPageLockCount,
    resolvedConflictPageCount: options.pageLockDecisionBundle.resolvedConflictPageCount,
    uniqueResolvedLocalPathCount: options.pageLockDecisionBundle.uniqueResolvedLocalPathCount,
    affectedLayerCount,
    affectedAttachmentCount,
    topDecisionLocalPath: options.pageLockDecisionBundle.topDecisionLocalPath,
    topAffectedSlotName,
    sampleLocalSourcePath: options.pageLockDecisionBundle.sampleLocalSourcePath,
    atlasSourcePath: options.pageLockDecisionBundle.atlasSourcePath,
    pageLockDecisionBundlePath: options.pageLockDecisionBundlePath,
    renderPlanPath: options.renderPlanPath,
    nextPageLockReviewStep,
    pages
  };
}
