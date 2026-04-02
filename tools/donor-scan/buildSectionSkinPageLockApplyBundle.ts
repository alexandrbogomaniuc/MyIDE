import type {
  SectionSkinPageLockApplyBundleFile,
  SectionSkinPageLockApplyPageRecord,
  SectionSkinPageLockApplyPageState,
  SectionSkinPageLockApplyState,
  SectionSkinPageLockApprovalBundleFile
} from "./shared";

interface BuildSectionSkinPageLockApplyBundleOptions {
  pageLockApprovalBundle: SectionSkinPageLockApprovalBundleFile;
  pageLockApprovalBundlePath: string;
}

function buildApplyState(
  pageCount: number,
  exactPageLockCount: number,
  unresolvedPageLockCount: number
): SectionSkinPageLockApplyState {
  if (pageCount > 0 && exactPageLockCount === pageCount) {
    return "ready-with-exact-page-locks";
  }
  if (unresolvedPageLockCount > 0) {
    return "has-unresolved-page-lock-conflicts";
  }
  return "ready-with-applied-page-locks";
}

function buildPageState(
  sourcePageState: SectionSkinPageLockApprovalBundleFile["pages"][number]["pageState"]
): SectionSkinPageLockApplyPageState {
  if (sourcePageState === "exact-page-lock") {
    return "exact-page-lock";
  }
  if (sourcePageState === "ready-for-page-lock-approval") {
    return "applied-page-lock";
  }
  return "unresolved-page-lock-conflict";
}

function buildPageRecord(
  page: SectionSkinPageLockApprovalBundleFile["pages"][number]
): SectionSkinPageLockApplyPageRecord {
  return {
    orderIndex: page.orderIndex,
    pageName: page.pageName,
    pageState: buildPageState(page.pageState),
    sourcePageState: page.pageState,
    layerCount: page.layerCount,
    slotNames: page.slotNames,
    selectedLocalPath: page.selectedLocalPath,
    selectedCandidateRank: page.selectedCandidateRank,
    selectedCandidateScore: page.selectedCandidateScore,
    selectedCandidateReasons: page.selectedCandidateReasons,
    selectedCandidateMatchedTokens: page.selectedCandidateMatchedTokens,
    affectedLayerCount: page.affectedLayerCount,
    affectedSlotNames: page.affectedSlotNames,
    affectedAttachmentNames: page.affectedAttachmentNames,
    affectedRegionNames: page.affectedRegionNames,
    sampleLayerBounds: page.sampleLayerBounds,
    topAffectedSlotName: page.topAffectedSlotName,
    topAffectedAttachmentName: page.topAffectedAttachmentName
  };
}

export function buildSectionSkinPageLockApplyBundle(
  options: BuildSectionSkinPageLockApplyBundleOptions
): SectionSkinPageLockApplyBundleFile {
  const pages = options.pageLockApprovalBundle.pages.map(buildPageRecord);
  const exactPageLockCount = pages.filter((page) => page.pageState === "exact-page-lock").length;
  const appliedPageLockCount = pages.filter((page) => page.pageState === "applied-page-lock").length;
  const unresolvedPageLockCount = pages.filter((page) => page.pageState === "unresolved-page-lock-conflict").length;
  const pageLockApplyState = buildApplyState(
    options.pageLockApprovalBundle.pageCount,
    exactPageLockCount,
    unresolvedPageLockCount
  );
  const topAppliedLocalPath = pages.find((page) => typeof page.selectedLocalPath === "string" && page.selectedLocalPath.length > 0)?.selectedLocalPath ?? null;
  const nextPageLockApplyStep = pageLockApplyState === "ready-with-exact-page-locks"
    ? `${options.pageLockApprovalBundle.sectionKey}: use the exact page locks directly for final texture reconstruction because every atlas page already has an exact grounded local source.`
    : pageLockApplyState === "ready-with-applied-page-locks"
      ? `${options.pageLockApprovalBundle.sectionKey}: use the applied page-lock set as the downstream lock surface for final texture reconstruction.`
      : `${options.pageLockApprovalBundle.sectionKey}: resolve the remaining page-image conflicts before a downstream lock surface can be applied cleanly.`;

  return {
    schemaVersion: "0.1.0",
    donorId: options.pageLockApprovalBundle.donorId,
    donorName: options.pageLockApprovalBundle.donorName,
    generatedAt: new Date().toISOString(),
    familyName: options.pageLockApprovalBundle.familyName,
    sectionKey: options.pageLockApprovalBundle.sectionKey,
    skinName: options.pageLockApprovalBundle.skinName,
    pageLockApplyState,
    pageLockApprovalState: options.pageLockApprovalBundle.pageLockApprovalState,
    pageLockReviewState: options.pageLockApprovalBundle.pageLockReviewState,
    pageLockDecisionState: options.pageLockApprovalBundle.pageLockDecisionState,
    pageLockResolutionState: options.pageLockApprovalBundle.pageLockResolutionState,
    pageLockAuditState: options.pageLockApprovalBundle.pageLockAuditState,
    pageLockState: options.pageLockApprovalBundle.pageLockState,
    textureInputState: options.pageLockApprovalBundle.textureInputState,
    textureReconstructionState: options.pageLockApprovalBundle.textureReconstructionState,
    textureSourceState: options.pageLockApprovalBundle.textureSourceState,
    matchState: options.pageLockApprovalBundle.matchState,
    reviewState: options.pageLockApprovalBundle.reviewState,
    materialState: options.pageLockApprovalBundle.materialState,
    renderState: options.pageLockApprovalBundle.renderState,
    blueprintState: options.pageLockApprovalBundle.blueprintState,
    reconstructionState: options.pageLockApprovalBundle.reconstructionState,
    pageCount: options.pageLockApprovalBundle.pageCount,
    exactPageLockCount,
    appliedPageLockCount,
    unresolvedPageLockCount,
    resolvedConflictPageCount: options.pageLockApprovalBundle.resolvedConflictPageCount,
    uniqueResolvedLocalPathCount: options.pageLockApprovalBundle.uniqueResolvedLocalPathCount,
    affectedLayerCount: options.pageLockApprovalBundle.affectedLayerCount,
    affectedAttachmentCount: options.pageLockApprovalBundle.affectedAttachmentCount,
    topAppliedLocalPath,
    topAffectedSlotName: options.pageLockApprovalBundle.topAffectedSlotName,
    sampleLocalSourcePath: options.pageLockApprovalBundle.sampleLocalSourcePath,
    atlasSourcePath: options.pageLockApprovalBundle.atlasSourcePath,
    pageLockApprovalBundlePath: options.pageLockApprovalBundlePath,
    nextPageLockApplyStep,
    pages
  };
}
