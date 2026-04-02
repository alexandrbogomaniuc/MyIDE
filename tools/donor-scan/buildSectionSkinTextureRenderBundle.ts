import type {
  SectionSkinTextureAssemblyBundleFile,
  SectionSkinTextureAssemblyPageState,
  SectionSkinTextureAssemblyRegionRecord,
  SectionSkinTextureRenderBundleFile,
  SectionSkinTextureRenderPageRecord,
  SectionSkinTextureRenderPageState,
  SectionSkinTextureRenderRegionRecord,
  SectionSkinTextureRenderRegionState,
  SectionSkinTextureRenderState,
  SectionSkinRenderPlanFile
} from "./shared";

interface BuildSectionSkinTextureRenderBundleOptions {
  textureAssemblyBundle: SectionSkinTextureAssemblyBundleFile;
  textureAssemblyBundlePath: string;
  renderPlan: SectionSkinRenderPlanFile;
  renderPlanPath: string;
}

function sortUnique(values: Iterable<string>): string[] {
  return Array.from(new Set(values)).sort((left, right) => left.localeCompare(right));
}

function buildRegionState(
  region: SectionSkinTextureAssemblyRegionRecord,
  hasPageSize: boolean
): SectionSkinTextureRenderRegionState {
  if (region.regionState === "missing-atlas-geometry" || !region.bounds) {
    return "missing-atlas-geometry";
  }
  if (!hasPageSize) {
    return "missing-atlas-page-size";
  }
  if (region.regionState === "ready-for-exact-texture-assembly") {
    return "ready-for-exact-page-texture-render";
  }
  if (region.regionState === "ready-for-applied-texture-assembly") {
    return "ready-for-applied-page-texture-render";
  }
  return "needs-page-lock-resolution";
}

function buildRegionRecord(
  region: SectionSkinTextureAssemblyRegionRecord,
  hasPageSize: boolean
): SectionSkinTextureRenderRegionRecord {
  return {
    orderIndex: region.orderIndex,
    slotName: region.slotName,
    attachmentName: region.attachmentName,
    attachmentPath: region.attachmentPath,
    regionName: region.regionName,
    regionState: buildRegionState(region, hasPageSize),
    sourceRegionState: region.regionState,
    selectedLocalPath: region.selectedLocalPath,
    rotated: region.rotated,
    bounds: region.bounds,
    offsets: region.offsets
  };
}

function buildPageState(
  sourcePageState: SectionSkinTextureAssemblyPageState,
  missingPageSizeCount: number,
  manualBlockedLayerCount: number,
  pageLockBlockedLayerCount: number
): SectionSkinTextureRenderPageState {
  if (manualBlockedLayerCount > 0) {
    return "needs-manual-render-review";
  }
  if (missingPageSizeCount > 0) {
    return "missing-atlas-page-size";
  }
  if (pageLockBlockedLayerCount > 0) {
    return "needs-page-lock-resolution";
  }
  if (sourcePageState === "ready-for-exact-texture-assembly") {
    return "ready-for-exact-page-texture-render";
  }
  if (sourcePageState === "ready-for-applied-texture-assembly") {
    return "ready-for-applied-page-texture-render";
  }
  return "needs-page-lock-resolution";
}

function buildBundleState(
  pageCount: number,
  exactPageLockCount: number,
  appliedPageLockCount: number,
  unresolvedPageLockCount: number,
  missingPageSizeCount: number,
  manualBlockedPageCount: number,
  blockedPageCount: number
): SectionSkinTextureRenderState {
  if (pageCount > 0 && blockedPageCount === 0 && exactPageLockCount === pageCount) {
    return "ready-for-exact-page-texture-render";
  }
  if (pageCount > 0 && blockedPageCount === 0 && unresolvedPageLockCount === 0 && exactPageLockCount + appliedPageLockCount === pageCount) {
    return "ready-for-applied-page-texture-render";
  }
  if (manualBlockedPageCount > 0) {
    return "needs-manual-render-review";
  }
  if (missingPageSizeCount > 0) {
    return "needs-atlas-page-size-review";
  }
  return "needs-page-lock-resolution";
}

export function buildSectionSkinTextureRenderBundle(
  options: BuildSectionSkinTextureRenderBundleOptions
): SectionSkinTextureRenderBundleFile {
  const renderPagesByName = new Map(
    options.renderPlan.pages.map((page) => [page.pageName, page] as const)
  );

  const pages: SectionSkinTextureRenderPageRecord[] = options.textureAssemblyBundle.pages.map((page) => {
    const renderPage = renderPagesByName.get(page.pageName) ?? null;
    const hasPageSize = renderPage?.pageSize !== null;
    const regions = page.regions
      .slice()
      .sort((left, right) => left.orderIndex - right.orderIndex)
      .map((region) => buildRegionRecord(region, hasPageSize));
    const readyLayerCount = regions.filter((region) =>
      region.regionState === "ready-for-exact-page-texture-render" || region.regionState === "ready-for-applied-page-texture-render"
    ).length;
    const missingPageSizeCount = regions.filter((region) => region.regionState === "missing-atlas-page-size").length;
    const manualBlockedLayerCount = regions.filter((region) => region.regionState === "missing-atlas-geometry").length;
    const pageLockBlockedLayerCount = regions.filter((region) => region.regionState === "needs-page-lock-resolution").length;
    const blockedLayerCount = regions.length - readyLayerCount;

    return {
      orderIndex: page.orderIndex,
      pageName: page.pageName,
      pageState: buildPageState(page.pageState, missingPageSizeCount, manualBlockedLayerCount, pageLockBlockedLayerCount),
      sourcePageState: page.pageState,
      pageWidth: renderPage?.pageSize?.width ?? null,
      pageHeight: renderPage?.pageSize?.height ?? null,
      layerCount: page.layerCount,
      readyLayerCount,
      blockedLayerCount,
      regionCount: regions.length,
      slotNames: sortUnique(regions.map((region) => region.slotName)),
      regionNames: sortUnique(regions.map((region) => region.regionName).filter((value): value is string => typeof value === "string" && value.length > 0)),
      selectedLocalPath: page.selectedLocalPath,
      selectedCandidateRank: page.selectedCandidateRank,
      selectedCandidateScore: page.selectedCandidateScore,
      selectedCandidateReasons: page.selectedCandidateReasons,
      selectedCandidateMatchedTokens: page.selectedCandidateMatchedTokens,
      atlasPageLocalPath: renderPage?.localPagePath ?? null,
      regions
    };
  });

  const pageSizeCount = pages.filter((page) => typeof page.pageWidth === "number" && typeof page.pageHeight === "number").length;
  const missingPageSizeCount = pages.length - pageSizeCount;
  const readyPageCount = pages.filter((page) =>
    page.pageState === "ready-for-exact-page-texture-render" || page.pageState === "ready-for-applied-page-texture-render"
  ).length;
  const manualBlockedPageCount = pages.filter((page) => page.pageState === "needs-manual-render-review").length;
  const blockedPageCount = pages.length - readyPageCount;
  const readyLayerCount = pages.reduce((total, page) => total + page.readyLayerCount, 0);
  const blockedLayerCount = options.textureAssemblyBundle.layerCount - readyLayerCount;
  const uniqueSelectedLocalPathCount = new Set(
    pages
      .map((page) => page.selectedLocalPath)
      .filter((value): value is string => typeof value === "string" && value.length > 0)
  ).size;
  const textureRenderState = buildBundleState(
    options.textureAssemblyBundle.pageCount,
    options.textureAssemblyBundle.exactPageLockCount,
    options.textureAssemblyBundle.appliedPageLockCount,
    options.textureAssemblyBundle.unresolvedPageLockCount,
    missingPageSizeCount,
    manualBlockedPageCount,
    blockedPageCount
  );
  const topRenderLocalPath = pages.find((page) => typeof page.selectedLocalPath === "string" && page.selectedLocalPath.length > 0)?.selectedLocalPath ?? null;
  const nextTextureRenderStep = textureRenderState === "ready-for-exact-page-texture-render"
    ? `${options.textureAssemblyBundle.sectionKey}: use the section skin texture-render bundle directly for final texture reconstruction because every atlas page now has dimensions and an exact grounded local source.`
    : textureRenderState === "ready-for-applied-page-texture-render"
      ? `${options.textureAssemblyBundle.sectionKey}: use the section skin texture-render bundle directly for final texture reconstruction because every atlas page now has dimensions and one applied locked local source.`
      : textureRenderState === "needs-atlas-page-size-review"
        ? `${options.textureAssemblyBundle.sectionKey}: review the atlas page sizes before final texture reconstruction can render one page canvas per locked source cleanly.`
        : textureRenderState === "needs-manual-render-review"
          ? `${options.textureAssemblyBundle.sectionKey}: review the remaining atlas-geometry gaps before final texture reconstruction can render one page canvas per locked source cleanly.`
          : `${options.textureAssemblyBundle.sectionKey}: resolve the remaining page-lock issues before final texture reconstruction can render one page canvas per locked source cleanly.`;

  return {
    schemaVersion: "0.1.0",
    donorId: options.textureAssemblyBundle.donorId,
    donorName: options.textureAssemblyBundle.donorName,
    generatedAt: new Date().toISOString(),
    familyName: options.textureAssemblyBundle.familyName,
    sectionKey: options.textureAssemblyBundle.sectionKey,
    skinName: options.textureAssemblyBundle.skinName,
    textureRenderState,
    textureAssemblyState: options.textureAssemblyBundle.textureAssemblyState,
    textureLockState: options.textureAssemblyBundle.textureLockState,
    pageLockApplyState: options.textureAssemblyBundle.pageLockApplyState,
    pageLockApprovalState: options.textureAssemblyBundle.pageLockApprovalState,
    textureReconstructionState: options.textureAssemblyBundle.textureReconstructionState,
    textureSourceState: options.textureAssemblyBundle.textureSourceState,
    matchState: options.textureAssemblyBundle.matchState,
    reviewState: options.textureAssemblyBundle.reviewState,
    materialState: options.textureAssemblyBundle.materialState,
    renderState: options.textureAssemblyBundle.renderState,
    blueprintState: options.textureAssemblyBundle.blueprintState,
    reconstructionState: options.textureAssemblyBundle.reconstructionState,
    pageCount: options.textureAssemblyBundle.pageCount,
    pageSizeCount,
    missingPageSizeCount,
    exactPageLockCount: options.textureAssemblyBundle.exactPageLockCount,
    appliedPageLockCount: options.textureAssemblyBundle.appliedPageLockCount,
    unresolvedPageLockCount: options.textureAssemblyBundle.unresolvedPageLockCount,
    readyPageCount,
    blockedPageCount,
    uniqueSelectedLocalPathCount,
    layerCount: options.textureAssemblyBundle.layerCount,
    readyLayerCount,
    blockedLayerCount,
    topRenderLocalPath,
    sampleLocalSourcePath: options.textureAssemblyBundle.sampleLocalSourcePath,
    atlasSourcePath: options.textureAssemblyBundle.atlasSourcePath,
    textureAssemblyBundlePath: options.textureAssemblyBundlePath,
    renderPlanPath: options.renderPlanPath,
    nextTextureRenderStep,
    pages
  };
}
