import type {
  SectionSkinPageLockApplyBundleFile,
  SectionSkinTextureLockBundleFile,
  SectionSkinTextureLockLayerRecord,
  SectionSkinTextureLockLayerState,
  SectionSkinTextureLockPageRecord,
  SectionSkinTextureLockState,
  SectionSkinTextureReconstructionBundleFile
} from "./shared";

interface BuildSectionSkinTextureLockBundleOptions {
  pageLockApplyBundle: SectionSkinPageLockApplyBundleFile;
  pageLockApplyBundlePath: string;
  textureReconstructionBundle: SectionSkinTextureReconstructionBundleFile;
  textureReconstructionBundlePath: string;
}

function buildTextureLockState(
  exactPageLockCount: number,
  appliedPageLockCount: number,
  unresolvedPageLockCount: number,
  pageCount: number,
  blockedLayerCount: number
): SectionSkinTextureLockState {
  if (pageCount > 0 && blockedLayerCount === 0 && exactPageLockCount === pageCount) {
    return "ready-with-exact-page-locks";
  }
  if (pageCount > 0 && blockedLayerCount === 0 && unresolvedPageLockCount === 0 && exactPageLockCount + appliedPageLockCount === pageCount) {
    return "ready-with-applied-page-locks";
  }
  return "needs-page-lock-resolution";
}

function buildPageRecord(
  page: SectionSkinPageLockApplyBundleFile["pages"][number]
): SectionSkinTextureLockPageRecord {
  return {
    orderIndex: page.orderIndex,
    pageName: page.pageName,
    pageState: page.pageState,
    sourcePageState: page.pageState,
    layerCount: page.layerCount,
    slotNames: page.slotNames,
    selectedLocalPath: page.selectedLocalPath,
    selectedCandidateRank: page.selectedCandidateRank,
    selectedCandidateScore: page.selectedCandidateScore,
    selectedCandidateReasons: page.selectedCandidateReasons,
    selectedCandidateMatchedTokens: page.selectedCandidateMatchedTokens
  };
}

function buildLayerState(
  layer: SectionSkinTextureReconstructionBundleFile["layers"][number],
  pageState: SectionSkinPageLockApplyBundleFile["pages"][number]["pageState"] | "missing-page-lock"
): SectionSkinTextureLockLayerState {
  if (layer.layerState === "missing-atlas-geometry" || !layer.bounds) {
    return "missing-atlas-geometry";
  }
  if (pageState === "exact-page-lock") {
    return "ready-with-exact-page-lock";
  }
  if (pageState === "applied-page-lock") {
    return "ready-with-applied-page-lock";
  }
  return "needs-page-lock-resolution";
}

function buildLayerRecord(
  layer: SectionSkinTextureReconstructionBundleFile["layers"][number],
  pageRecord: SectionSkinPageLockApplyBundleFile["pages"][number] | undefined
): SectionSkinTextureLockLayerRecord {
  const pageState = pageRecord?.pageState ?? "missing-page-lock";
  return {
    orderIndex: layer.orderIndex,
    slotName: layer.slotName,
    attachmentName: layer.attachmentName,
    attachmentPath: layer.attachmentPath,
    pageName: layer.pageName,
    regionName: layer.regionName,
    layerState: buildLayerState(layer, pageState),
    pageState,
    selectedLocalPath: pageRecord?.selectedLocalPath ?? null,
    rotated: layer.rotated,
    bounds: layer.bounds,
    offsets: layer.offsets
  };
}

export function buildSectionSkinTextureLockBundle(
  options: BuildSectionSkinTextureLockBundleOptions
): SectionSkinTextureLockBundleFile {
  const pages = options.pageLockApplyBundle.pages.map(buildPageRecord);
  const pageLookup = new Map(
    options.pageLockApplyBundle.pages.map((page) => [page.pageName, page] as const)
  );
  const layers = options.textureReconstructionBundle.layers.map((layer) =>
    buildLayerRecord(
      layer,
      typeof layer.pageName === "string" && layer.pageName.length > 0 ? pageLookup.get(layer.pageName) : undefined
    )
  );
  const readyLayerCount = layers.filter((layer) =>
    layer.layerState === "ready-with-exact-page-lock" || layer.layerState === "ready-with-applied-page-lock"
  ).length;
  const blockedLayerCount = layers.length - readyLayerCount;
  const textureLockState = buildTextureLockState(
    options.pageLockApplyBundle.exactPageLockCount,
    options.pageLockApplyBundle.appliedPageLockCount,
    options.pageLockApplyBundle.unresolvedPageLockCount,
    options.pageLockApplyBundle.pageCount,
    blockedLayerCount
  );
  const topLockedLocalPath = pages.find((page) => typeof page.selectedLocalPath === "string" && page.selectedLocalPath.length > 0)?.selectedLocalPath ?? null;
  const nextTextureLockStep = textureLockState === "ready-with-exact-page-locks"
    ? `${options.pageLockApplyBundle.sectionKey}: use the section skin texture-lock bundle directly for final texture reconstruction because every atlas page already has an exact grounded local source.`
    : textureLockState === "ready-with-applied-page-locks"
      ? `${options.pageLockApplyBundle.sectionKey}: use the section skin texture-lock bundle directly for final texture reconstruction because the page-lock set has already been applied cleanly.`
      : `${options.pageLockApplyBundle.sectionKey}: resolve the remaining page-lock conflicts before final texture reconstruction can consume one locked texture bundle cleanly.`;

  return {
    schemaVersion: "0.1.0",
    donorId: options.pageLockApplyBundle.donorId,
    donorName: options.pageLockApplyBundle.donorName,
    generatedAt: new Date().toISOString(),
    familyName: options.pageLockApplyBundle.familyName,
    sectionKey: options.pageLockApplyBundle.sectionKey,
    skinName: options.pageLockApplyBundle.skinName,
    textureLockState,
    pageLockApplyState: options.pageLockApplyBundle.pageLockApplyState,
    pageLockApprovalState: options.pageLockApplyBundle.pageLockApprovalState,
    textureReconstructionState: options.textureReconstructionBundle.textureReconstructionState,
    textureSourceState: options.textureReconstructionBundle.textureSourceState,
    matchState: options.textureReconstructionBundle.matchState,
    reviewState: options.textureReconstructionBundle.reviewState,
    materialState: options.textureReconstructionBundle.materialState,
    renderState: options.textureReconstructionBundle.renderState,
    blueprintState: options.textureReconstructionBundle.blueprintState,
    reconstructionState: options.textureReconstructionBundle.reconstructionState,
    pageCount: options.pageLockApplyBundle.pageCount,
    exactPageLockCount: options.pageLockApplyBundle.exactPageLockCount,
    appliedPageLockCount: options.pageLockApplyBundle.appliedPageLockCount,
    unresolvedPageLockCount: options.pageLockApplyBundle.unresolvedPageLockCount,
    layerCount: layers.length,
    readyLayerCount,
    blockedLayerCount,
    topLockedLocalPath,
    sampleLocalSourcePath: options.pageLockApplyBundle.sampleLocalSourcePath,
    atlasSourcePath: options.pageLockApplyBundle.atlasSourcePath,
    pageLockApplyBundlePath: options.pageLockApplyBundlePath,
    textureReconstructionBundlePath: options.textureReconstructionBundlePath,
    nextTextureLockStep,
    pages,
    layers
  };
}
