import type {
  SectionSkinPageLockApprovalBundleFile,
  SectionSkinPageLockApprovalPageRecord,
  SectionSkinPageLockApprovalPageState,
  SectionSkinPageLockApprovalState,
  SectionSkinPageLockReviewBundleFile
} from "./shared";

interface BuildSectionSkinPageLockApprovalBundleOptions {
  pageLockReviewBundle: SectionSkinPageLockReviewBundleFile;
  pageLockReviewBundlePath: string;
}

function buildApprovalState(
  pageCount: number,
  exactPageLockCount: number,
  unresolvedPageLockCount: number
): SectionSkinPageLockApprovalState {
  if (pageCount > 0 && exactPageLockCount === pageCount) {
    return "ready-with-exact-page-locks";
  }
  if (unresolvedPageLockCount > 0) {
    return "has-unresolved-page-lock-conflicts";
  }
  return "ready-for-page-lock-approval";
}

function buildPageState(
  sourcePageState: SectionSkinPageLockReviewBundleFile["pages"][number]["pageState"]
): SectionSkinPageLockApprovalPageState {
  if (sourcePageState === "exact-page-lock") {
    return "exact-page-lock";
  }
  if (sourcePageState === "ready-for-lock-review") {
    return "ready-for-page-lock-approval";
  }
  return "unresolved-page-lock-conflict";
}

function buildPageRecord(
  page: SectionSkinPageLockReviewBundleFile["pages"][number]
): SectionSkinPageLockApprovalPageRecord {
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

export function buildSectionSkinPageLockApprovalBundle(
  options: BuildSectionSkinPageLockApprovalBundleOptions
): SectionSkinPageLockApprovalBundleFile {
  const pages = options.pageLockReviewBundle.pages.map(buildPageRecord);
  const exactPageLockCount = pages.filter((page) => page.pageState === "exact-page-lock").length;
  const approvalReadyPageCount = pages.filter((page) => page.pageState === "ready-for-page-lock-approval").length;
  const unresolvedPageLockCount = pages.filter((page) => page.pageState === "unresolved-page-lock-conflict").length;
  const pageLockApprovalState = buildApprovalState(
    options.pageLockReviewBundle.pageCount,
    exactPageLockCount,
    unresolvedPageLockCount
  );
  const topApprovalLocalPath = pages.find((page) => typeof page.selectedLocalPath === "string" && page.selectedLocalPath.length > 0)?.selectedLocalPath ?? null;
  const nextPageLockApprovalStep = pageLockApprovalState === "ready-with-exact-page-locks"
    ? `${options.pageLockReviewBundle.sectionKey}: use the exact page locks directly for final texture reconstruction because every atlas page already has an exact grounded local source.`
    : pageLockApprovalState === "ready-for-page-lock-approval"
      ? `${options.pageLockReviewBundle.sectionKey}: approve the selected unique page-image assignments with their affected slots and attachments before final texture reconstruction.`
      : `${options.pageLockReviewBundle.sectionKey}: resolve the remaining page-image conflicts before final texture reconstruction because at least one atlas page still lacks a unique grounded local source.`;

  return {
    schemaVersion: "0.1.0",
    donorId: options.pageLockReviewBundle.donorId,
    donorName: options.pageLockReviewBundle.donorName,
    generatedAt: new Date().toISOString(),
    familyName: options.pageLockReviewBundle.familyName,
    sectionKey: options.pageLockReviewBundle.sectionKey,
    skinName: options.pageLockReviewBundle.skinName,
    pageLockApprovalState,
    pageLockReviewState: options.pageLockReviewBundle.pageLockReviewState,
    pageLockDecisionState: options.pageLockReviewBundle.pageLockDecisionState,
    pageLockResolutionState: options.pageLockReviewBundle.pageLockResolutionState,
    pageLockAuditState: options.pageLockReviewBundle.pageLockAuditState,
    pageLockState: options.pageLockReviewBundle.pageLockState,
    textureInputState: options.pageLockReviewBundle.textureInputState,
    textureReconstructionState: options.pageLockReviewBundle.textureReconstructionState,
    textureSourceState: options.pageLockReviewBundle.textureSourceState,
    matchState: options.pageLockReviewBundle.matchState,
    reviewState: options.pageLockReviewBundle.reviewState,
    materialState: options.pageLockReviewBundle.materialState,
    renderState: options.pageLockReviewBundle.renderState,
    blueprintState: options.pageLockReviewBundle.blueprintState,
    reconstructionState: options.pageLockReviewBundle.reconstructionState,
    pageCount: options.pageLockReviewBundle.pageCount,
    exactPageLockCount,
    approvalReadyPageCount,
    unresolvedPageLockCount,
    resolvedConflictPageCount: options.pageLockReviewBundle.resolvedConflictPageCount,
    uniqueResolvedLocalPathCount: options.pageLockReviewBundle.uniqueResolvedLocalPathCount,
    affectedLayerCount: options.pageLockReviewBundle.affectedLayerCount,
    affectedAttachmentCount: options.pageLockReviewBundle.affectedAttachmentCount,
    topApprovalLocalPath,
    topAffectedSlotName: options.pageLockReviewBundle.topAffectedSlotName,
    sampleLocalSourcePath: options.pageLockReviewBundle.sampleLocalSourcePath,
    atlasSourcePath: options.pageLockReviewBundle.atlasSourcePath,
    pageLockReviewBundlePath: options.pageLockReviewBundlePath,
    nextPageLockApprovalStep,
    pages
  };
}
