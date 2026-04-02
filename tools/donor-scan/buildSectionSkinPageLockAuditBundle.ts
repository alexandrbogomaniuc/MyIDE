import type {
  SectionSkinPageLockAuditBundleFile,
  SectionSkinPageLockAuditConflictGroupRecord,
  SectionSkinPageLockAuditPageRecord,
  SectionSkinPageLockAuditPageState,
  SectionSkinPageLockAuditState,
  SectionSkinPageLockBundleFile,
  SectionSkinTextureInputBundleFile
} from "./shared";

interface BuildSectionSkinPageLockAuditBundleOptions {
  pageLockBundle: SectionSkinPageLockBundleFile;
  pageLockBundlePath: string;
  textureInputBundle: SectionSkinTextureInputBundleFile;
  textureInputBundlePath: string;
}

function buildAuditState(
  exactPageLockCount: number,
  proposedPageLockCount: number,
  missingPageLockCount: number,
  pageCount: number,
  blockedLayerCount: number,
  duplicateSourceGroupCount: number
): SectionSkinPageLockAuditState {
  if (pageCount > 0 && blockedLayerCount === 0 && duplicateSourceGroupCount === 0 && exactPageLockCount === pageCount) {
    return "ready-with-exact-unique-page-locks";
  }
  if (pageCount > 0 && blockedLayerCount === 0 && duplicateSourceGroupCount === 0 && missingPageLockCount === 0 && exactPageLockCount + proposedPageLockCount === pageCount) {
    return "ready-with-proposed-unique-page-locks";
  }
  if (duplicateSourceGroupCount > 0) {
    return "has-page-lock-conflicts";
  }
  return "needs-page-lock-review";
}

function buildPageAuditState(
  page: SectionSkinPageLockBundleFile["pages"][number],
  duplicateSourcePageNames: string[]
): SectionSkinPageLockAuditPageState {
  if (!page.selectedLocalPath || page.pageState === "missing-page-lock") {
    return "missing-page-lock";
  }
  if (duplicateSourcePageNames.length > 1) {
    return "duplicate-source-conflict";
  }
  if (page.pageState === "exact-page-lock") {
    return "exact-unique-page-lock";
  }
  return "proposed-unique-page-lock";
}

function buildConflictGroupRecord(
  selectedLocalPath: string,
  pages: Array<SectionSkinPageLockBundleFile["pages"][number]>,
  affectedLayerCount: number
): SectionSkinPageLockAuditConflictGroupRecord {
  return {
    selectedLocalPath,
    pageCount: pages.length,
    pageNames: pages.map((page) => page.pageName),
    exactPageCount: pages.filter((page) => page.pageState === "exact-page-lock").length,
    proposedPageCount: pages.filter((page) => page.pageState === "proposed-page-lock").length,
    affectedLayerCount
  };
}

export function buildSectionSkinPageLockAuditBundle(
  options: BuildSectionSkinPageLockAuditBundleOptions
): SectionSkinPageLockAuditBundleFile {
  const pathGroups = new Map<string, Array<SectionSkinPageLockBundleFile["pages"][number]>>();
  for (const page of options.pageLockBundle.pages) {
    if (!page.selectedLocalPath || page.selectedLocalPath.length === 0) {
      continue;
    }
    const existing = pathGroups.get(page.selectedLocalPath);
    if (existing) {
      existing.push(page);
    } else {
      pathGroups.set(page.selectedLocalPath, [page]);
    }
  }

  const layerCountsByPage = new Map<string, number>();
  for (const layer of options.textureInputBundle.layers) {
    if (!layer.pageName) {
      continue;
    }
    layerCountsByPage.set(layer.pageName, (layerCountsByPage.get(layer.pageName) ?? 0) + 1);
  }

  const duplicateSourceGroups = Array.from(pathGroups.entries())
    .filter(([, pages]) => pages.length > 1)
    .map(([selectedLocalPath, pages]) =>
      buildConflictGroupRecord(
        selectedLocalPath,
        pages,
        pages.reduce((total, page) => total + (layerCountsByPage.get(page.pageName) ?? 0), 0)
      )
    )
    .sort((left, right) => {
      if (left.pageCount !== right.pageCount) {
        return right.pageCount - left.pageCount;
      }
      if (left.affectedLayerCount !== right.affectedLayerCount) {
        return right.affectedLayerCount - left.affectedLayerCount;
      }
      return left.selectedLocalPath.localeCompare(right.selectedLocalPath);
    });

  const duplicateSourceNamesByPage = new Map<string, string[]>();
  for (const group of duplicateSourceGroups) {
    for (const pageName of group.pageNames) {
      duplicateSourceNamesByPage.set(pageName, group.pageNames);
    }
  }

  const pages: SectionSkinPageLockAuditPageRecord[] = options.pageLockBundle.pages.map((page) => {
    const duplicateSourcePageNames = duplicateSourceNamesByPage.get(page.pageName) ?? [];
    return {
      orderIndex: page.orderIndex,
      pageName: page.pageName,
      pageState: buildPageAuditState(page, duplicateSourcePageNames),
      sourcePageState: page.pageState,
      layerCount: page.layerCount,
      affectedLayerCount: layerCountsByPage.get(page.pageName) ?? page.layerCount,
      slotNames: page.slotNames,
      selectedLocalPath: page.selectedLocalPath,
      proposedMatchScore: page.proposedMatchScore,
      duplicateSourcePageCount: duplicateSourcePageNames.length,
      duplicateSourcePageNames
    };
  });

  const uniqueSelectedLocalPathCount = pathGroups.size;
  const duplicateSourcePageCount = duplicateSourceGroups.reduce((total, group) => total + group.pageCount, 0);
  const pageLockAuditState = buildAuditState(
    options.pageLockBundle.exactPageLockCount,
    options.pageLockBundle.proposedPageLockCount,
    options.pageLockBundle.missingPageLockCount,
    options.pageLockBundle.pageCount,
    options.textureInputBundle.blockedLayerCount,
    duplicateSourceGroups.length
  );
  const topConflictLocalPath = duplicateSourceGroups[0]?.selectedLocalPath ?? null;
  const nextPageLockAuditStep = pageLockAuditState === "ready-with-exact-unique-page-locks"
    ? `${options.pageLockBundle.sectionKey}: use the unique exact page locks directly for final texture reconstruction.`
    : pageLockAuditState === "ready-with-proposed-unique-page-locks"
      ? `${options.pageLockBundle.sectionKey}: the proposed page locks are unique, so you can review them once and then move into final texture reconstruction.`
      : pageLockAuditState === "has-page-lock-conflicts"
        ? `${options.pageLockBundle.sectionKey}: review duplicate page-image assignments before final texture reconstruction because multiple atlas pages currently point at the same local source.`
        : `${options.pageLockBundle.sectionKey}: review or lock page-image assignments before final texture reconstruction can proceed cleanly.`;

  return {
    schemaVersion: "0.1.0",
    donorId: options.pageLockBundle.donorId,
    donorName: options.pageLockBundle.donorName,
    generatedAt: new Date().toISOString(),
    familyName: options.pageLockBundle.familyName,
    sectionKey: options.pageLockBundle.sectionKey,
    skinName: options.pageLockBundle.skinName,
    pageLockAuditState,
    textureInputState: options.textureInputBundle.textureInputState,
    pageLockState: options.pageLockBundle.pageLockState,
    textureReconstructionState: options.pageLockBundle.textureReconstructionState,
    textureSourceState: options.pageLockBundle.textureSourceState,
    matchState: options.pageLockBundle.matchState,
    reviewState: options.pageLockBundle.reviewState,
    materialState: options.pageLockBundle.materialState,
    renderState: options.pageLockBundle.renderState,
    blueprintState: options.pageLockBundle.blueprintState,
    reconstructionState: options.pageLockBundle.reconstructionState,
    pageCount: options.pageLockBundle.pageCount,
    exactPageLockCount: options.pageLockBundle.exactPageLockCount,
    proposedPageLockCount: options.pageLockBundle.proposedPageLockCount,
    missingPageLockCount: options.pageLockBundle.missingPageLockCount,
    uniqueSelectedLocalPathCount,
    duplicateSourceGroupCount: duplicateSourceGroups.length,
    duplicateSourcePageCount,
    layerCount: options.textureInputBundle.layerCount,
    readyLayerCount: options.textureInputBundle.readyLayerCount,
    blockedLayerCount: options.textureInputBundle.blockedLayerCount,
    topLockedLocalPath: options.pageLockBundle.topLockedLocalPath,
    topConflictLocalPath,
    sampleLocalSourcePath: options.pageLockBundle.sampleLocalSourcePath,
    atlasSourcePath: options.pageLockBundle.atlasSourcePath,
    pageLockBundlePath: options.pageLockBundlePath,
    textureInputBundlePath: options.textureInputBundlePath,
    nextPageLockAuditStep,
    pages,
    duplicateSourceGroups
  };
}
