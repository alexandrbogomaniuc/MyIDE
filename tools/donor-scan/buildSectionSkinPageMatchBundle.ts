import type {
  SectionSkinPageMatchBundleFile,
  SectionSkinPageMatchPageRecord,
  SectionSkinPageMatchPageState,
  SectionSkinPageMatchState,
  SectionSkinMaterialReviewBundleFile
} from "./shared";

interface BuildSectionSkinPageMatchBundleOptions {
  materialReviewBundle: SectionSkinMaterialReviewBundleFile;
  materialReviewBundlePath: string;
}

function buildPageState(
  exactPageLocalPath: string | null,
  proposedMatchLocalPath: string | null
): SectionSkinPageMatchPageState {
  if (typeof exactPageLocalPath === "string" && exactPageLocalPath.length > 0) {
    return "ready-with-exact-page-image";
  }
  if (typeof proposedMatchLocalPath === "string" && proposedMatchLocalPath.length > 0) {
    return "proposed-page-match";
  }
  return "blocked-missing-page-source";
}

function buildMatchState(
  exactPageImageCount: number,
  pageCount: number,
  blockedPageCount: number
): SectionSkinPageMatchState {
  if (pageCount > 0 && exactPageImageCount === pageCount) {
    return "ready-with-exact-page-images";
  }
  if (blockedPageCount === 0) {
    return "ready-for-page-match-lock";
  }
  return "needs-page-source-discovery";
}

function buildPageRecord(
  page: SectionSkinMaterialReviewBundleFile["pages"][number]
): SectionSkinPageMatchPageRecord {
  const proposedMatch = page.topCandidates[0] ?? null;
  const proposedMatchLocalPath = proposedMatch?.localPath ?? null;
  return {
    orderIndex: page.orderIndex,
    pageName: page.pageName,
    pageState: buildPageState(page.exactPageLocalPath, proposedMatchLocalPath),
    layerCount: page.layerCount,
    slotNames: page.slotNames,
    exactPageLocalPath: page.exactPageLocalPath,
    proposedMatchLocalPath,
    proposedMatchScore: typeof proposedMatch?.score === "number" ? proposedMatch.score : null,
    proposedMatchReasons: Array.isArray(proposedMatch?.reasons) ? proposedMatch.reasons : [],
    proposedMatchMatchedTokens: Array.isArray(proposedMatch?.matchedTokens) ? proposedMatch.matchedTokens : [],
    proposedMatchRelation: proposedMatch?.relation ?? null,
    proposedMatchSourceKind: proposedMatch?.sourceKind ?? null
  };
}

export function buildSectionSkinPageMatchBundle(
  options: BuildSectionSkinPageMatchBundleOptions
): SectionSkinPageMatchBundleFile {
  const pages = options.materialReviewBundle.pages.map(buildPageRecord);
  const proposedMatchCount = pages.filter((page) => typeof page.proposedMatchLocalPath === "string" && page.proposedMatchLocalPath.length > 0).length;
  const blockedPageCount = pages.filter((page) => page.pageState === "blocked-missing-page-source").length;
  const matchState = buildMatchState(options.materialReviewBundle.exactPageImageCount, options.materialReviewBundle.pageCount, blockedPageCount);
  const nextMatchStep = matchState === "ready-with-exact-page-images"
    ? `${options.materialReviewBundle.sectionKey}: use the exact local atlas page images directly for texture reconstruction.`
    : matchState === "ready-for-page-match-lock"
      ? `${options.materialReviewBundle.sectionKey}: review and lock the proposed atlas page-image matches before texture reconstruction.`
      : `${options.materialReviewBundle.sectionKey}: continue page-source discovery before page-image matching can be locked.`;

  return {
    schemaVersion: "0.1.0",
    donorId: options.materialReviewBundle.donorId,
    donorName: options.materialReviewBundle.donorName,
    generatedAt: new Date().toISOString(),
    familyName: options.materialReviewBundle.familyName,
    sectionKey: options.materialReviewBundle.sectionKey,
    skinName: options.materialReviewBundle.skinName,
    matchState,
    reviewState: options.materialReviewBundle.reviewState,
    materialState: options.materialReviewBundle.materialState,
    renderState: options.materialReviewBundle.renderState,
    blueprintState: options.materialReviewBundle.blueprintState,
    reconstructionState: options.materialReviewBundle.reconstructionState,
    pageCount: options.materialReviewBundle.pageCount,
    exactPageImageCount: options.materialReviewBundle.exactPageImageCount,
    proposedMatchCount,
    blockedPageCount,
    topProposedMatchLocalPath: pages.find((page) => page.proposedMatchLocalPath)?.proposedMatchLocalPath ?? null,
    sampleLocalSourcePath: options.materialReviewBundle.sampleLocalSourcePath,
    atlasSourcePath: options.materialReviewBundle.atlasSourcePath,
    materialReviewBundlePath: options.materialReviewBundlePath,
    materialPlanPath: options.materialReviewBundle.materialPlanPath,
    renderPlanPath: options.materialReviewBundle.renderPlanPath,
    nextMatchStep,
    pages
  };
}
