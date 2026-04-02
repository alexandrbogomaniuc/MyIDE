import type {
  SectionSkinMaterialReviewBundleFile,
  SectionSkinPageLockAuditBundleFile,
  SectionSkinPageLockResolutionBundleFile,
  SectionSkinPageLockResolutionPageRecord,
  SectionSkinPageLockResolutionPageState,
  SectionSkinPageLockResolutionState
} from "./shared";

interface BuildSectionSkinPageLockResolutionBundleOptions {
  pageLockAuditBundle: SectionSkinPageLockAuditBundleFile;
  pageLockAuditBundlePath: string;
  materialReviewBundle: SectionSkinMaterialReviewBundleFile;
  materialReviewBundlePath: string;
}

interface CandidatePage {
  pageName: string;
  orderIndex: number;
  sourcePageState: SectionSkinPageLockAuditBundleFile["pages"][number]["sourcePageState"];
  originalSelectedLocalPath: string | null;
  duplicateSourcePageCount: number;
  duplicateSourcePageNames: string[];
  candidatePaths: string[];
}

function buildResolutionState(
  pageCount: number,
  exactPageLockCount: number,
  unresolvedConflictPageCount: number
): SectionSkinPageLockResolutionState {
  if (pageCount > 0 && exactPageLockCount === pageCount) {
    return "ready-with-exact-page-locks";
  }
  if (unresolvedConflictPageCount === 0) {
    return "ready-with-unique-proposed-page-locks";
  }
  return "has-unresolved-page-lock-conflicts";
}

function buildPageState(
  sourcePageState: CandidatePage["sourcePageState"],
  resolvedLocalPath: string | null,
  originalSelectedLocalPath: string | null,
  duplicateSourcePageCount: number
): SectionSkinPageLockResolutionPageState {
  if (sourcePageState === "exact-page-lock") {
    return "exact-page-lock";
  }
  if (!resolvedLocalPath) {
    return "unresolved-page-lock-conflict";
  }
  if (duplicateSourcePageCount > 1 || resolvedLocalPath !== originalSelectedLocalPath) {
    return "resolved-page-lock-conflict";
  }
  return "unique-proposed-page-lock";
}

function buildCandidatePage(
  page: SectionSkinPageLockAuditBundleFile["pages"][number],
  materialReviewPage: SectionSkinMaterialReviewBundleFile["pages"][number] | undefined
): CandidatePage {
  const candidatePaths = new Set<string>();
  if (typeof page.selectedLocalPath === "string" && page.selectedLocalPath.length > 0) {
    candidatePaths.add(page.selectedLocalPath);
  }
  for (const candidate of materialReviewPage?.topCandidates ?? []) {
    if (typeof candidate?.localPath === "string" && candidate.localPath.length > 0) {
      candidatePaths.add(candidate.localPath);
    }
  }
  return {
    pageName: page.pageName,
    orderIndex: page.orderIndex,
    sourcePageState: page.sourcePageState,
    originalSelectedLocalPath: page.selectedLocalPath,
    duplicateSourcePageCount: page.duplicateSourcePageCount,
    duplicateSourcePageNames: page.duplicateSourcePageNames,
    candidatePaths: Array.from(candidatePaths)
  };
}

function tryAssign(
  pageIndex: number,
  pages: CandidatePage[],
  pathToPageIndex: Map<string, number>,
  pageToPath: Map<number, string>,
  seen: Set<string>
): boolean {
  for (const candidatePath of pages[pageIndex].candidatePaths) {
    if (seen.has(candidatePath)) {
      continue;
    }
    seen.add(candidatePath);
    const assignedPageIndex = pathToPageIndex.get(candidatePath);
    if (assignedPageIndex === undefined || tryAssign(assignedPageIndex, pages, pathToPageIndex, pageToPath, seen)) {
      pathToPageIndex.set(candidatePath, pageIndex);
      pageToPath.set(pageIndex, candidatePath);
      return true;
    }
  }
  return false;
}

export function buildSectionSkinPageLockResolutionBundle(
  options: BuildSectionSkinPageLockResolutionBundleOptions
): SectionSkinPageLockResolutionBundleFile {
  const materialReviewByPage = new Map(
    options.materialReviewBundle.pages.map((page) => [page.pageName, page] as const)
  );
  const candidatePages = options.pageLockAuditBundle.pages.map((page) =>
    buildCandidatePage(page, materialReviewByPage.get(page.pageName))
  );

  const pageToPath = new Map<number, string>();
  const pathToPageIndex = new Map<string, number>();
  const exactAssignedPaths = new Set<string>();

  for (const page of candidatePages) {
    if (page.sourcePageState !== "exact-page-lock" || !page.originalSelectedLocalPath) {
      continue;
    }
    exactAssignedPaths.add(page.originalSelectedLocalPath);
  }

  const matchablePages = candidatePages
    .map((page, index) => ({ page, index }))
    .filter(({ page }) => page.sourcePageState !== "exact-page-lock")
    .map(({ page, index }) => ({
      index,
      candidatePaths: page.candidatePaths.filter((candidatePath) => !exactAssignedPaths.has(candidatePath))
    }))
    .sort((left, right) => {
      if (left.candidatePaths.length !== right.candidatePaths.length) {
        return left.candidatePaths.length - right.candidatePaths.length;
      }
      return candidatePages[left.index].orderIndex - candidatePages[right.index].orderIndex;
    });

  const normalizedPages = candidatePages.map((page, index) => ({
    ...page,
    candidatePaths: page.sourcePageState === "exact-page-lock"
      ? (page.originalSelectedLocalPath ? [page.originalSelectedLocalPath] : [])
      : (matchablePages.find((entry) => entry.index === index)?.candidatePaths ?? [])
  }));

  for (const { index } of matchablePages) {
    tryAssign(index, normalizedPages, pathToPageIndex, pageToPath, new Set<string>());
  }

  const pages: SectionSkinPageLockResolutionPageRecord[] = normalizedPages.map((page, index) => {
    const resolvedLocalPath = page.sourcePageState === "exact-page-lock"
      ? page.originalSelectedLocalPath
      : (pageToPath.get(index) ?? null);
    const selectedCandidateRank = resolvedLocalPath
      ? page.candidatePaths.findIndex((candidatePath) => candidatePath === resolvedLocalPath)
      : -1;
    return {
      orderIndex: page.orderIndex,
      pageName: page.pageName,
      pageState: buildPageState(page.sourcePageState, resolvedLocalPath, page.originalSelectedLocalPath, page.duplicateSourcePageCount),
      sourcePageState: page.sourcePageState,
      layerCount: options.pageLockAuditBundle.pages[index]?.layerCount ?? 0,
      slotNames: options.pageLockAuditBundle.pages[index]?.slotNames ?? [],
      originalSelectedLocalPath: page.originalSelectedLocalPath,
      resolvedLocalPath,
      candidateCount: page.candidatePaths.length,
      selectedCandidateRank: selectedCandidateRank >= 0 ? selectedCandidateRank : null,
      duplicateSourcePageCount: page.duplicateSourcePageCount,
      duplicateSourcePageNames: page.duplicateSourcePageNames
    };
  });

  const resolvedConflictPageCount = pages.filter((page) => page.pageState === "resolved-page-lock-conflict").length;
  const unresolvedConflictPageCount = pages.filter((page) => page.pageState === "unresolved-page-lock-conflict").length;
  const uniqueResolvedLocalPathCount = new Set(
    pages
      .map((page) => page.resolvedLocalPath)
      .filter((value): value is string => typeof value === "string" && value.length > 0)
  ).size;
  const pageLockResolutionState = buildResolutionState(
    options.pageLockAuditBundle.pageCount,
    options.pageLockAuditBundle.exactPageLockCount,
    unresolvedConflictPageCount
  );
  const topResolvedLocalPath = pages.find((page) => typeof page.resolvedLocalPath === "string" && page.resolvedLocalPath.length > 0)?.resolvedLocalPath ?? null;
  const nextPageLockResolutionStep = pageLockResolutionState === "ready-with-exact-page-locks"
    ? `${options.pageLockAuditBundle.sectionKey}: use the exact page locks directly for final texture reconstruction.`
    : pageLockResolutionState === "ready-with-unique-proposed-page-locks"
      ? `${options.pageLockAuditBundle.sectionKey}: review and lock the unique proposed page-image assignments before final texture reconstruction.`
      : `${options.pageLockAuditBundle.sectionKey}: resolve duplicate page-image assignments before final texture reconstruction because at least one atlas page still lacks a unique local source.`;

  return {
    schemaVersion: "0.1.0",
    donorId: options.pageLockAuditBundle.donorId,
    donorName: options.pageLockAuditBundle.donorName,
    generatedAt: new Date().toISOString(),
    familyName: options.pageLockAuditBundle.familyName,
    sectionKey: options.pageLockAuditBundle.sectionKey,
    skinName: options.pageLockAuditBundle.skinName,
    pageLockResolutionState,
    pageLockAuditState: options.pageLockAuditBundle.pageLockAuditState,
    pageLockState: options.pageLockAuditBundle.pageLockState,
    textureInputState: options.pageLockAuditBundle.textureInputState,
    textureReconstructionState: options.pageLockAuditBundle.textureReconstructionState,
    textureSourceState: options.pageLockAuditBundle.textureSourceState,
    matchState: options.pageLockAuditBundle.matchState,
    reviewState: options.pageLockAuditBundle.reviewState,
    materialState: options.pageLockAuditBundle.materialState,
    renderState: options.pageLockAuditBundle.renderState,
    blueprintState: options.pageLockAuditBundle.blueprintState,
    reconstructionState: options.pageLockAuditBundle.reconstructionState,
    pageCount: options.pageLockAuditBundle.pageCount,
    exactPageLockCount: options.pageLockAuditBundle.exactPageLockCount,
    proposedPageLockCount: options.pageLockAuditBundle.proposedPageLockCount,
    missingPageLockCount: options.pageLockAuditBundle.missingPageLockCount,
    resolvedConflictPageCount,
    unresolvedConflictPageCount,
    uniqueResolvedLocalPathCount,
    duplicateSourceGroupCount: options.pageLockAuditBundle.duplicateSourceGroupCount,
    duplicateSourcePageCount: options.pageLockAuditBundle.duplicateSourcePageCount,
    topResolvedLocalPath,
    sampleLocalSourcePath: options.pageLockAuditBundle.sampleLocalSourcePath,
    atlasSourcePath: options.pageLockAuditBundle.atlasSourcePath,
    pageLockAuditBundlePath: options.pageLockAuditBundlePath,
    materialReviewBundlePath: options.materialReviewBundlePath,
    nextPageLockResolutionStep,
    pages
  };
}
