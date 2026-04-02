import type {
  SectionSkinPageLockBundleFile,
  SectionSkinTextureInputBundleFile,
  SectionSkinTextureInputLayerRecord,
  SectionSkinTextureInputLayerState,
  SectionSkinTextureInputPageRecord,
  SectionSkinTextureInputState,
  SectionSkinTextureReconstructionBundleFile
} from "./shared";

interface BuildSectionSkinTextureInputBundleOptions {
  pageLockBundle: SectionSkinPageLockBundleFile;
  pageLockBundlePath: string;
  textureReconstructionBundle: SectionSkinTextureReconstructionBundleFile;
  textureReconstructionBundlePath: string;
}

function buildTextureInputState(
  exactPageLockCount: number,
  proposedPageLockCount: number,
  missingPageLockCount: number,
  pageCount: number,
  blockedLayerCount: number
): SectionSkinTextureInputState {
  if (pageCount > 0 && blockedLayerCount === 0 && exactPageLockCount === pageCount) {
    return "ready-with-exact-page-locks";
  }
  if (pageCount > 0 && blockedLayerCount === 0 && missingPageLockCount === 0 && exactPageLockCount + proposedPageLockCount === pageCount) {
    return "ready-with-proposed-page-locks";
  }
  return "needs-page-lock-review";
}

function buildPageRecord(
  page: SectionSkinPageLockBundleFile["pages"][number]
): SectionSkinTextureInputPageRecord {
  return {
    orderIndex: page.orderIndex,
    pageName: page.pageName,
    pageState: page.pageState,
    layerCount: page.layerCount,
    slotNames: page.slotNames,
    selectedLocalPath: page.selectedLocalPath,
    proposedMatchScore: page.proposedMatchScore
  };
}

function buildLayerState(
  layer: SectionSkinTextureReconstructionBundleFile["layers"][number],
  pageState: SectionSkinPageLockBundleFile["pages"][number]["pageState"] | "missing-page-lock"
): SectionSkinTextureInputLayerState {
  if (layer.layerState === "missing-atlas-geometry" || !layer.bounds) {
    return "missing-atlas-geometry";
  }
  if (pageState === "exact-page-lock") {
    return "ready-with-exact-page-lock";
  }
  if (pageState === "proposed-page-lock") {
    return "ready-with-proposed-page-lock";
  }
  return "needs-page-lock-review";
}

function buildLayerRecord(
  layer: SectionSkinTextureReconstructionBundleFile["layers"][number],
  pageRecord: SectionSkinPageLockBundleFile["pages"][number] | undefined
): SectionSkinTextureInputLayerRecord {
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

export function buildSectionSkinTextureInputBundle(
  options: BuildSectionSkinTextureInputBundleOptions
): SectionSkinTextureInputBundleFile {
  const pages = options.pageLockBundle.pages.map(buildPageRecord);
  const pageLookup = new Map(
    options.pageLockBundle.pages.map((page) => [page.pageName, page] as const)
  );
  const layers = options.textureReconstructionBundle.layers.map((layer) =>
    buildLayerRecord(
      layer,
      typeof layer.pageName === "string" && layer.pageName.length > 0 ? pageLookup.get(layer.pageName) : undefined
    )
  );
  const readyLayerCount = layers.filter((layer) =>
    layer.layerState === "ready-with-exact-page-lock" || layer.layerState === "ready-with-proposed-page-lock"
  ).length;
  const blockedLayerCount = layers.length - readyLayerCount;
  const textureInputState = buildTextureInputState(
    options.pageLockBundle.exactPageLockCount,
    options.pageLockBundle.proposedPageLockCount,
    options.pageLockBundle.missingPageLockCount,
    options.pageLockBundle.pageCount,
    blockedLayerCount
  );
  const nextTextureInputStep = textureInputState === "ready-with-exact-page-locks"
    ? `${options.pageLockBundle.sectionKey}: use the section skin texture input bundle directly for final texture reconstruction.`
    : textureInputState === "ready-with-proposed-page-locks"
      ? `${options.pageLockBundle.sectionKey}: use the section skin texture input bundle as provisional downstream input, but confirm the proposed page locks before final texture reconstruction.`
      : `${options.pageLockBundle.sectionKey}: review or lock page-image assignments before final texture reconstruction can proceed cleanly.`;

  return {
    schemaVersion: "0.1.0",
    donorId: options.pageLockBundle.donorId,
    donorName: options.pageLockBundle.donorName,
    generatedAt: new Date().toISOString(),
    familyName: options.pageLockBundle.familyName,
    sectionKey: options.pageLockBundle.sectionKey,
    skinName: options.pageLockBundle.skinName,
    textureInputState,
    pageLockState: options.pageLockBundle.pageLockState,
    textureReconstructionState: options.textureReconstructionBundle.textureReconstructionState,
    textureSourceState: options.textureReconstructionBundle.textureSourceState,
    matchState: options.textureReconstructionBundle.matchState,
    reviewState: options.textureReconstructionBundle.reviewState,
    materialState: options.textureReconstructionBundle.materialState,
    renderState: options.textureReconstructionBundle.renderState,
    blueprintState: options.textureReconstructionBundle.blueprintState,
    reconstructionState: options.textureReconstructionBundle.reconstructionState,
    pageCount: options.pageLockBundle.pageCount,
    exactPageLockCount: options.pageLockBundle.exactPageLockCount,
    proposedPageLockCount: options.pageLockBundle.proposedPageLockCount,
    missingPageLockCount: options.pageLockBundle.missingPageLockCount,
    layerCount: layers.length,
    readyLayerCount,
    blockedLayerCount,
    topLockedLocalPath: options.pageLockBundle.topLockedLocalPath,
    sampleLocalSourcePath: options.pageLockBundle.sampleLocalSourcePath,
    atlasSourcePath: options.pageLockBundle.atlasSourcePath,
    pageLockBundlePath: options.pageLockBundlePath,
    textureReconstructionBundlePath: options.textureReconstructionBundlePath,
    nextTextureInputStep,
    pages,
    layers
  };
}
