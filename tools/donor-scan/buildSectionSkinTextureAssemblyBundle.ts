import type {
  SectionSkinPageLockApplyPageState,
  SectionSkinTextureAssemblyBundleFile,
  SectionSkinTextureAssemblyPageRecord,
  SectionSkinTextureAssemblyPageState,
  SectionSkinTextureAssemblyRegionRecord,
  SectionSkinTextureAssemblyRegionState,
  SectionSkinTextureAssemblyState,
  SectionSkinTextureLockBundleFile
} from "./shared";

interface BuildSectionSkinTextureAssemblyBundleOptions {
  textureLockBundle: SectionSkinTextureLockBundleFile;
  textureLockBundlePath: string;
}

function sortUnique(values: Iterable<string>): string[] {
  return Array.from(new Set(values)).sort((left, right) => left.localeCompare(right));
}

function buildRegionState(
  layer: SectionSkinTextureLockBundleFile["layers"][number]
): SectionSkinTextureAssemblyRegionState {
  if (layer.layerState === "missing-atlas-geometry" || !layer.bounds) {
    return "missing-atlas-geometry";
  }
  if (layer.layerState === "ready-with-exact-page-lock") {
    return "ready-for-exact-texture-assembly";
  }
  if (layer.layerState === "ready-with-applied-page-lock") {
    return "ready-for-applied-texture-assembly";
  }
  return "needs-page-lock-resolution";
}

function buildPageState(
  sourcePageState: SectionSkinPageLockApplyPageState,
  blockedLayerCount: number
): SectionSkinTextureAssemblyPageState {
  if (blockedLayerCount > 0) {
    return "needs-page-lock-resolution";
  }
  if (sourcePageState === "exact-page-lock") {
    return "ready-for-exact-texture-assembly";
  }
  if (sourcePageState === "applied-page-lock") {
    return "ready-for-applied-texture-assembly";
  }
  return "needs-page-lock-resolution";
}

function buildBundleState(
  pageCount: number,
  exactPageLockCount: number,
  appliedPageLockCount: number,
  unresolvedPageLockCount: number,
  blockedPageCount: number
): SectionSkinTextureAssemblyState {
  if (pageCount > 0 && blockedPageCount === 0 && exactPageLockCount === pageCount) {
    return "ready-for-exact-texture-assembly";
  }
  if (pageCount > 0 && blockedPageCount === 0 && unresolvedPageLockCount === 0 && exactPageLockCount + appliedPageLockCount === pageCount) {
    return "ready-for-applied-texture-assembly";
  }
  return "needs-page-lock-resolution";
}

function buildRegionRecord(
  layer: SectionSkinTextureLockBundleFile["layers"][number]
): SectionSkinTextureAssemblyRegionRecord {
  return {
    orderIndex: layer.orderIndex,
    slotName: layer.slotName,
    attachmentName: layer.attachmentName,
    attachmentPath: layer.attachmentPath,
    pageName: layer.pageName ?? "(unassigned)",
    regionName: layer.regionName,
    regionState: buildRegionState(layer),
    pageState: layer.pageState,
    selectedLocalPath: layer.selectedLocalPath,
    rotated: layer.rotated,
    bounds: layer.bounds,
    offsets: layer.offsets
  };
}

function buildPageRecord(
  page: SectionSkinTextureLockBundleFile["pages"][number],
  pageLayers: SectionSkinTextureLockBundleFile["layers"][number][]
): SectionSkinTextureAssemblyPageRecord {
  const regions = pageLayers
    .slice()
    .sort((left, right) => left.orderIndex - right.orderIndex)
    .map(buildRegionRecord);
  const readyLayerCount = regions.filter((region) =>
    region.regionState === "ready-for-exact-texture-assembly" || region.regionState === "ready-for-applied-texture-assembly"
  ).length;
  const blockedLayerCount = regions.length - readyLayerCount;

  return {
    orderIndex: page.orderIndex,
    pageName: page.pageName,
    pageState: buildPageState(page.pageState, blockedLayerCount),
    sourcePageState: page.pageState,
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
    regions
  };
}

export function buildSectionSkinTextureAssemblyBundle(
  options: BuildSectionSkinTextureAssemblyBundleOptions
): SectionSkinTextureAssemblyBundleFile {
  const layersByPageName = new Map<string, SectionSkinTextureLockBundleFile["layers"]>();
  for (const layer of options.textureLockBundle.layers) {
    const pageName = typeof layer.pageName === "string" && layer.pageName.length > 0 ? layer.pageName : "(unassigned)";
    const current = layersByPageName.get(pageName) ?? [];
    current.push(layer);
    layersByPageName.set(pageName, current);
  }

  const pages = options.textureLockBundle.pages.map((page) =>
    buildPageRecord(page, layersByPageName.get(page.pageName) ?? [])
  );
  const readyPageCount = pages.filter((page) =>
    page.pageState === "ready-for-exact-texture-assembly" || page.pageState === "ready-for-applied-texture-assembly"
  ).length;
  const blockedPageCount = pages.length - readyPageCount;
  const readyLayerCount = pages.reduce((total, page) => total + page.readyLayerCount, 0);
  const blockedLayerCount = options.textureLockBundle.layerCount - readyLayerCount;
  const uniqueSelectedLocalPathCount = new Set(
    pages
      .map((page) => page.selectedLocalPath)
      .filter((value): value is string => typeof value === "string" && value.length > 0)
  ).size;
  const textureAssemblyState = buildBundleState(
    options.textureLockBundle.pageCount,
    options.textureLockBundle.exactPageLockCount,
    options.textureLockBundle.appliedPageLockCount,
    options.textureLockBundle.unresolvedPageLockCount,
    blockedPageCount
  );
  const topAssemblyLocalPath = pages.find((page) => typeof page.selectedLocalPath === "string" && page.selectedLocalPath.length > 0)?.selectedLocalPath ?? null;
  const nextTextureAssemblyStep = textureAssemblyState === "ready-for-exact-texture-assembly"
    ? `${options.textureLockBundle.sectionKey}: use the section skin texture-assembly bundle directly for final texture reconstruction because every atlas page already has an exact grounded local source.`
    : textureAssemblyState === "ready-for-applied-texture-assembly"
      ? `${options.textureLockBundle.sectionKey}: use the section skin texture-assembly bundle directly for final texture reconstruction because every atlas page now has one applied locked local source and one per-page assembly record.`
      : `${options.textureLockBundle.sectionKey}: resolve the remaining page-lock conflicts before final texture reconstruction can consume one page-assembly bundle cleanly.`;

  return {
    schemaVersion: "0.1.0",
    donorId: options.textureLockBundle.donorId,
    donorName: options.textureLockBundle.donorName,
    generatedAt: new Date().toISOString(),
    familyName: options.textureLockBundle.familyName,
    sectionKey: options.textureLockBundle.sectionKey,
    skinName: options.textureLockBundle.skinName,
    textureAssemblyState,
    textureLockState: options.textureLockBundle.textureLockState,
    pageLockApplyState: options.textureLockBundle.pageLockApplyState,
    pageLockApprovalState: options.textureLockBundle.pageLockApprovalState,
    textureReconstructionState: options.textureLockBundle.textureReconstructionState,
    textureSourceState: options.textureLockBundle.textureSourceState,
    matchState: options.textureLockBundle.matchState,
    reviewState: options.textureLockBundle.reviewState,
    materialState: options.textureLockBundle.materialState,
    renderState: options.textureLockBundle.renderState,
    blueprintState: options.textureLockBundle.blueprintState,
    reconstructionState: options.textureLockBundle.reconstructionState,
    pageCount: options.textureLockBundle.pageCount,
    exactPageLockCount: options.textureLockBundle.exactPageLockCount,
    appliedPageLockCount: options.textureLockBundle.appliedPageLockCount,
    unresolvedPageLockCount: options.textureLockBundle.unresolvedPageLockCount,
    readyPageCount,
    blockedPageCount,
    uniqueSelectedLocalPathCount,
    layerCount: options.textureLockBundle.layerCount,
    readyLayerCount,
    blockedLayerCount,
    topAssemblyLocalPath,
    sampleLocalSourcePath: options.textureLockBundle.sampleLocalSourcePath,
    atlasSourcePath: options.textureLockBundle.atlasSourcePath,
    textureLockBundlePath: options.textureLockBundlePath,
    nextTextureAssemblyStep,
    pages
  };
}
