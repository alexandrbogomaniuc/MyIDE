import type {
  SectionSkinMaterialCandidateRecord,
  SectionSkinMaterialPlanFile,
  SectionSkinMaterialReviewBundleFile,
  SectionSkinMaterialReviewPageRecord,
  SectionSkinMaterialReviewPageState,
  SectionSkinMaterialReviewState
} from "./shared";

interface BuildSectionSkinMaterialReviewBundleOptions {
  materialPlan: SectionSkinMaterialPlanFile;
  materialPlanPath: string;
}

function buildPageState(
  exactPageLocalPath: string | null,
  candidateCount: number
): SectionSkinMaterialReviewPageState {
  if (typeof exactPageLocalPath === "string" && exactPageLocalPath.length > 0) {
    return "ready-with-exact-page-image";
  }
  if (candidateCount > 0) {
    return "needs-candidate-review";
  }
  return "blocked-missing-page-source";
}

function buildReviewState(
  exactPageImageCount: number,
  pageCount: number,
  blockedPageCount: number,
  reviewReadyPageCount: number
): SectionSkinMaterialReviewState {
  if (pageCount > 0 && exactPageImageCount === pageCount) {
    return "ready-with-exact-page-images";
  }
  if (reviewReadyPageCount > 0 && blockedPageCount === 0) {
    return "ready-for-candidate-review";
  }
  return "needs-page-source-discovery";
}

function buildPageRecord(
  page: SectionSkinMaterialPlanFile["pages"][number]
): SectionSkinMaterialReviewPageRecord {
  const topCandidates = page.topRelatedImageCandidates.slice(0, 3);
  const recommendedCandidate: SectionSkinMaterialCandidateRecord | null = topCandidates[0] ?? null;
  const pageState = buildPageState(page.exactPageLocalPath, topCandidates.length);
  return {
    orderIndex: page.orderIndex,
    pageName: page.pageName,
    pageState,
    layerCount: page.layerCount,
    slotNames: page.slotNames,
    exactPageLocalPath: page.exactPageLocalPath,
    candidateCount: topCandidates.length,
    recommendedCandidateLocalPath: recommendedCandidate?.localPath ?? null,
    recommendedCandidateScore: typeof recommendedCandidate?.score === "number" ? recommendedCandidate.score : null,
    recommendedCandidateReasons: Array.isArray(recommendedCandidate?.reasons) ? recommendedCandidate.reasons : [],
    recommendedCandidateMatchedTokens: Array.isArray(recommendedCandidate?.matchedTokens) ? recommendedCandidate.matchedTokens : [],
    topCandidates
  };
}

export function buildSectionSkinMaterialReviewBundle(
  options: BuildSectionSkinMaterialReviewBundleOptions
): SectionSkinMaterialReviewBundleFile {
  const pages = options.materialPlan.pages.map(buildPageRecord);
  const reviewReadyPageCount = pages.filter((page) => page.pageState !== "blocked-missing-page-source").length;
  const blockedPageCount = pages.filter((page) => page.pageState === "blocked-missing-page-source").length;
  const reviewState = buildReviewState(
    options.materialPlan.exactPageImageCount,
    options.materialPlan.pageCount,
    blockedPageCount,
    reviewReadyPageCount
  );
  const nextReviewStep = reviewState === "ready-with-exact-page-images"
    ? `${options.materialPlan.sectionKey}: use the exact atlas page images directly for texture reconstruction.`
    : reviewState === "ready-for-candidate-review"
      ? `${options.materialPlan.sectionKey}: review the recommended per-page image candidates and lock the best local page match for each missing atlas page.`
      : `${options.materialPlan.sectionKey}: capture or mirror the missing atlas page images before page review can finish.`;

  return {
    schemaVersion: "0.1.0",
    donorId: options.materialPlan.donorId,
    donorName: options.materialPlan.donorName,
    generatedAt: new Date().toISOString(),
    familyName: options.materialPlan.familyName,
    sectionKey: options.materialPlan.sectionKey,
    skinName: options.materialPlan.skinName,
    reviewState,
    materialState: options.materialPlan.materialState,
    renderState: options.materialPlan.renderState,
    blueprintState: options.materialPlan.blueprintState,
    reconstructionState: options.materialPlan.reconstructionState,
    pageCount: options.materialPlan.pageCount,
    exactPageImageCount: options.materialPlan.exactPageImageCount,
    missingPageImageCount: options.materialPlan.missingPageImageCount,
    reviewReadyPageCount,
    blockedPageCount,
    topCandidateLocalPath: options.materialPlan.topCandidateLocalPath,
    sampleLocalSourcePath: options.materialPlan.sampleLocalSourcePath,
    atlasSourcePath: options.materialPlan.atlasSourcePath,
    materialPlanPath: options.materialPlanPath,
    renderPlanPath: options.materialPlan.renderPlanPath,
    skinBlueprintPath: options.materialPlan.skinBlueprintPath,
    reconstructionBundlePath: options.materialPlan.reconstructionBundlePath,
    nextReviewStep,
    pages
  };
}
