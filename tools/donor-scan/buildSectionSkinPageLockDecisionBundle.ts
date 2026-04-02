import type {
  SectionSkinMaterialCandidateRecord,
  SectionSkinMaterialReviewBundleFile,
  SectionSkinPageLockDecisionBundleFile,
  SectionSkinPageLockDecisionPageRecord,
  SectionSkinPageLockDecisionPageState,
  SectionSkinPageLockDecisionState,
  SectionSkinPageLockResolutionBundleFile
} from "./shared";

interface BuildSectionSkinPageLockDecisionBundleOptions {
  pageLockResolutionBundle: SectionSkinPageLockResolutionBundleFile;
  pageLockResolutionBundlePath: string;
  materialReviewBundle: SectionSkinMaterialReviewBundleFile;
  materialReviewBundlePath: string;
}

function buildDecisionState(
  pageCount: number,
  exactPageLockCount: number,
  unresolvedPageLockCount: number
): SectionSkinPageLockDecisionState {
  if (pageCount > 0 && exactPageLockCount === pageCount) {
    return "ready-with-exact-page-locks";
  }
  if (unresolvedPageLockCount > 0) {
    return "has-unresolved-page-lock-conflicts";
  }
  return "ready-for-lock-review";
}

function buildPageState(
  sourcePageState: SectionSkinPageLockResolutionBundleFile["pages"][number]["pageState"],
  selectedLocalPath: string | null
): SectionSkinPageLockDecisionPageState {
  if (sourcePageState === "exact-page-lock") {
    return "exact-page-lock";
  }
  if (!selectedLocalPath || sourcePageState === "unresolved-page-lock-conflict") {
    return "unresolved-page-lock-conflict";
  }
  return "ready-for-lock-review";
}

function findSelectedCandidate(
  candidates: SectionSkinMaterialCandidateRecord[],
  selectedLocalPath: string | null
): { candidate: SectionSkinMaterialCandidateRecord | null; rank: number | null } {
  if (!selectedLocalPath) {
    return { candidate: null, rank: null };
  }
  const index = candidates.findIndex((candidate) => candidate.localPath === selectedLocalPath);
  if (index < 0) {
    return { candidate: null, rank: null };
  }
  return {
    candidate: candidates[index] ?? null,
    rank: index
  };
}

function buildPageRecord(
  resolutionPage: SectionSkinPageLockResolutionBundleFile["pages"][number],
  materialReviewPage: SectionSkinMaterialReviewBundleFile["pages"][number] | undefined
): SectionSkinPageLockDecisionPageRecord {
  const selectedLocalPath = resolutionPage.resolvedLocalPath;
  const topCandidates = materialReviewPage?.topCandidates ?? [];
  const selectedCandidate = findSelectedCandidate(topCandidates, selectedLocalPath);
  const selectedCandidateRank = resolutionPage.selectedCandidateRank ?? selectedCandidate.rank;
  const selectedCandidateScore = selectedCandidate.candidate?.score
    ?? (
      selectedLocalPath
      && materialReviewPage?.recommendedCandidateLocalPath === selectedLocalPath
        ? materialReviewPage.recommendedCandidateScore
        : null
    );
  const selectedCandidateReasons = selectedCandidate.candidate?.reasons
    ?? (
      selectedLocalPath
      && materialReviewPage?.recommendedCandidateLocalPath === selectedLocalPath
        ? materialReviewPage.recommendedCandidateReasons
        : []
    );
  const selectedCandidateMatchedTokens = selectedCandidate.candidate?.matchedTokens
    ?? (
      selectedLocalPath
      && materialReviewPage?.recommendedCandidateLocalPath === selectedLocalPath
        ? materialReviewPage.recommendedCandidateMatchedTokens
        : []
    );
  const alternativeCandidatePreview = topCandidates
    .filter((candidate) => candidate.localPath !== selectedLocalPath)
    .map((candidate) => candidate.localPath)
    .slice(0, 3);

  return {
    orderIndex: resolutionPage.orderIndex,
    pageName: resolutionPage.pageName,
    pageState: buildPageState(resolutionPage.pageState, selectedLocalPath),
    sourcePageState: resolutionPage.pageState,
    layerCount: resolutionPage.layerCount,
    slotNames: resolutionPage.slotNames,
    selectedLocalPath,
    selectedCandidateRank,
    selectedCandidateScore,
    selectedCandidateReasons,
    selectedCandidateMatchedTokens,
    alternativeCandidateCount: topCandidates.filter((candidate) => candidate.localPath !== selectedLocalPath).length,
    alternativeCandidatePreview,
    duplicateSourcePageCount: resolutionPage.duplicateSourcePageCount,
    duplicateSourcePageNames: resolutionPage.duplicateSourcePageNames
  };
}

export function buildSectionSkinPageLockDecisionBundle(
  options: BuildSectionSkinPageLockDecisionBundleOptions
): SectionSkinPageLockDecisionBundleFile {
  const materialReviewByPage = new Map(
    options.materialReviewBundle.pages.map((page) => [page.pageName, page] as const)
  );
  const pages = options.pageLockResolutionBundle.pages.map((page) =>
    buildPageRecord(page, materialReviewByPage.get(page.pageName))
  );
  const exactPageLockCount = pages.filter((page) => page.pageState === "exact-page-lock").length;
  const reviewReadyPageCount = pages.filter((page) => page.pageState === "ready-for-lock-review").length;
  const unresolvedPageLockCount = pages.filter((page) => page.pageState === "unresolved-page-lock-conflict").length;
  const pageLockDecisionState = buildDecisionState(
    options.pageLockResolutionBundle.pageCount,
    exactPageLockCount,
    unresolvedPageLockCount
  );
  const topDecisionLocalPath = pages.find((page) => typeof page.selectedLocalPath === "string" && page.selectedLocalPath.length > 0)?.selectedLocalPath ?? null;
  const nextPageLockDecisionStep = pageLockDecisionState === "ready-with-exact-page-locks"
    ? `${options.pageLockResolutionBundle.sectionKey}: use the exact page locks directly for final texture reconstruction.`
    : pageLockDecisionState === "ready-for-lock-review"
      ? `${options.pageLockResolutionBundle.sectionKey}: review and lock the selected unique page-image assignments before final texture reconstruction.`
      : `${options.pageLockResolutionBundle.sectionKey}: resolve the remaining page-image conflicts before final texture reconstruction because at least one atlas page still lacks a unique grounded local source.`;

  return {
    schemaVersion: "0.1.0",
    donorId: options.pageLockResolutionBundle.donorId,
    donorName: options.pageLockResolutionBundle.donorName,
    generatedAt: new Date().toISOString(),
    familyName: options.pageLockResolutionBundle.familyName,
    sectionKey: options.pageLockResolutionBundle.sectionKey,
    skinName: options.pageLockResolutionBundle.skinName,
    pageLockDecisionState,
    pageLockResolutionState: options.pageLockResolutionBundle.pageLockResolutionState,
    pageLockAuditState: options.pageLockResolutionBundle.pageLockAuditState,
    pageLockState: options.pageLockResolutionBundle.pageLockState,
    textureInputState: options.pageLockResolutionBundle.textureInputState,
    textureReconstructionState: options.pageLockResolutionBundle.textureReconstructionState,
    textureSourceState: options.pageLockResolutionBundle.textureSourceState,
    matchState: options.pageLockResolutionBundle.matchState,
    reviewState: options.pageLockResolutionBundle.reviewState,
    materialState: options.pageLockResolutionBundle.materialState,
    renderState: options.pageLockResolutionBundle.renderState,
    blueprintState: options.pageLockResolutionBundle.blueprintState,
    reconstructionState: options.pageLockResolutionBundle.reconstructionState,
    pageCount: options.pageLockResolutionBundle.pageCount,
    exactPageLockCount,
    reviewReadyPageCount,
    unresolvedPageLockCount,
    resolvedConflictPageCount: options.pageLockResolutionBundle.resolvedConflictPageCount,
    uniqueResolvedLocalPathCount: options.pageLockResolutionBundle.uniqueResolvedLocalPathCount,
    topDecisionLocalPath,
    sampleLocalSourcePath: options.pageLockResolutionBundle.sampleLocalSourcePath,
    atlasSourcePath: options.pageLockResolutionBundle.atlasSourcePath,
    pageLockResolutionBundlePath: options.pageLockResolutionBundlePath,
    materialReviewBundlePath: options.materialReviewBundlePath,
    nextPageLockDecisionStep,
    pages
  };
}
