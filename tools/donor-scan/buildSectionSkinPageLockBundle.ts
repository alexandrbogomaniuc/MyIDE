import type {
  SectionSkinPageLockBundleFile,
  SectionSkinPageLockPageRecord,
  SectionSkinPageLockPageState,
  SectionSkinPageLockState,
  SectionSkinPageMatchBundleFile,
  SectionSkinTextureReconstructionBundleFile
} from "./shared";

interface BuildSectionSkinPageLockBundleOptions {
  textureReconstructionBundle: SectionSkinTextureReconstructionBundleFile;
  textureReconstructionBundlePath: string;
  pageMatchBundle: SectionSkinPageMatchBundleFile;
  pageMatchBundlePath: string;
}

function buildPageState(
  sourceSelection: SectionSkinTextureReconstructionBundleFile["pages"][number]["sourceSelection"]
): SectionSkinPageLockPageState {
  if (sourceSelection === "exact-page") {
    return "exact-page-lock";
  }
  if (sourceSelection === "proposed-page-match") {
    return "proposed-page-lock";
  }
  return "missing-page-lock";
}

function buildPageLockState(
  exactPageLockCount: number,
  proposedPageLockCount: number,
  missingPageLockCount: number,
  pageCount: number
): SectionSkinPageLockState {
  if (pageCount > 0 && exactPageLockCount === pageCount) {
    return "ready-with-exact-page-locks";
  }
  if (pageCount > 0 && missingPageLockCount === 0 && exactPageLockCount + proposedPageLockCount === pageCount) {
    return "ready-for-page-lock-review";
  }
  return "needs-page-source-lock";
}

function buildPageRecord(
  page: SectionSkinTextureReconstructionBundleFile["pages"][number],
  pageMatchRecord: SectionSkinPageMatchBundleFile["pages"][number] | undefined
): SectionSkinPageLockPageRecord {
  return {
    orderIndex: page.orderIndex,
    pageName: page.pageName,
    pageState: buildPageState(page.sourceSelection),
    layerCount: page.layerCount,
    slotNames: page.slotNames,
    selectedLocalPath: page.sourceLocalPath,
    sourceSelection: page.sourceSelection,
    proposedMatchScore: page.sourceSelection === "proposed-page-match"
      ? (typeof pageMatchRecord?.proposedMatchScore === "number" ? pageMatchRecord.proposedMatchScore : null)
      : null
  };
}

export function buildSectionSkinPageLockBundle(
  options: BuildSectionSkinPageLockBundleOptions
): SectionSkinPageLockBundleFile {
  const pageMatchLookup = new Map(
    options.pageMatchBundle.pages.map((page) => [page.pageName, page] as const)
  );
  const pages = options.textureReconstructionBundle.pages.map((page) =>
    buildPageRecord(page, pageMatchLookup.get(page.pageName))
  );
  const exactPageLockCount = pages.filter((page) => page.pageState === "exact-page-lock").length;
  const proposedPageLockCount = pages.filter((page) => page.pageState === "proposed-page-lock").length;
  const missingPageLockCount = pages.filter((page) => page.pageState === "missing-page-lock").length;
  const pageLockState = buildPageLockState(
    exactPageLockCount,
    proposedPageLockCount,
    missingPageLockCount,
    options.textureReconstructionBundle.pageCount
  );
  const topLockedLocalPath = pages.find((page) => typeof page.selectedLocalPath === "string" && page.selectedLocalPath.length > 0)?.selectedLocalPath
    ?? options.textureReconstructionBundle.topTextureSourceLocalPath
    ?? null;
  const nextPageLockStep = pageLockState === "ready-with-exact-page-locks"
    ? `${options.textureReconstructionBundle.sectionKey}: use the prepared section skin page-lock bundle directly for final texture reconstruction.`
    : pageLockState === "ready-for-page-lock-review"
      ? `${options.textureReconstructionBundle.sectionKey}: review and lock the proposed atlas page-image assignments before final texture reconstruction.`
      : `${options.textureReconstructionBundle.sectionKey}: keep gathering or locking atlas page-image sources before final texture reconstruction.`;

  return {
    schemaVersion: "0.1.0",
    donorId: options.textureReconstructionBundle.donorId,
    donorName: options.textureReconstructionBundle.donorName,
    generatedAt: new Date().toISOString(),
    familyName: options.textureReconstructionBundle.familyName,
    sectionKey: options.textureReconstructionBundle.sectionKey,
    skinName: options.textureReconstructionBundle.skinName,
    pageLockState,
    textureReconstructionState: options.textureReconstructionBundle.textureReconstructionState,
    textureSourceState: options.textureReconstructionBundle.textureSourceState,
    matchState: options.textureReconstructionBundle.matchState,
    reviewState: options.textureReconstructionBundle.reviewState,
    materialState: options.textureReconstructionBundle.materialState,
    renderState: options.textureReconstructionBundle.renderState,
    blueprintState: options.textureReconstructionBundle.blueprintState,
    reconstructionState: options.textureReconstructionBundle.reconstructionState,
    pageCount: options.textureReconstructionBundle.pageCount,
    exactPageLockCount,
    proposedPageLockCount,
    missingPageLockCount,
    reconstructableLayerCount: options.textureReconstructionBundle.reconstructableLayerCount,
    blockedLayerCount: options.textureReconstructionBundle.blockedLayerCount,
    topLockedLocalPath,
    sampleLocalSourcePath: options.textureReconstructionBundle.sampleLocalSourcePath,
    atlasSourcePath: options.textureReconstructionBundle.atlasSourcePath,
    textureReconstructionBundlePath: options.textureReconstructionBundlePath,
    pageMatchBundlePath: options.pageMatchBundlePath,
    nextPageLockStep,
    pages
  };
}
