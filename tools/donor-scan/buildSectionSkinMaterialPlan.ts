import path from "node:path";
import type {
  FamilyReconstructionLocalSourceRecord,
  SectionSkinMaterialCandidateRecord,
  SectionSkinMaterialPageRecord,
  SectionSkinMaterialPlanFile,
  SectionSkinRenderPlanFile
} from "./shared";

interface BuildSectionSkinMaterialPlanOptions {
  renderPlan: SectionSkinRenderPlanFile;
  renderPlanPath: string;
  localSources: readonly FamilyReconstructionLocalSourceRecord[];
}

function isImagePath(filePath: string): boolean {
  return /\.(png|webp|jpg|jpeg|gif|svg)$/i.test(filePath);
}

function toCandidateRecord(localSource: FamilyReconstructionLocalSourceRecord): SectionSkinMaterialCandidateRecord {
  return {
    localPath: localSource.localPath,
    sourceKind: localSource.sourceKind,
    relation: localSource.relation,
    familyName: localSource.familyName,
    score: 0,
    matchedTokens: [],
    reasons: []
  };
}

function sortCandidates(
  left: SectionSkinMaterialCandidateRecord,
  right: SectionSkinMaterialCandidateRecord
): number {
  if (left.score !== right.score) {
    return right.score - left.score;
  }
  if (left.relation !== right.relation) {
    return left.relation === "same-family" ? -1 : 1;
  }
  if (left.sourceKind !== right.sourceKind) {
    return left.sourceKind.localeCompare(right.sourceKind);
  }
  return left.localPath.localeCompare(right.localPath);
}

function tokenize(value: string | null | undefined): string[] {
  if (!value) {
    return [];
  }
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2 && !/^\d+$/.test(token));
}

function uniqueSorted(values: readonly string[]): string[] {
  return Array.from(new Set(values)).sort((left, right) => left.localeCompare(right));
}

function buildPageTokens(renderPlan: SectionSkinRenderPlanFile, pageName: string): string[] {
  const layers = renderPlan.layers.filter((layer) => layer.pageName === pageName);
  return uniqueSorted([
    ...tokenize(renderPlan.familyName),
    ...tokenize(renderPlan.sectionKey),
    ...tokenize(renderPlan.skinName),
    ...tokenize(pageName),
    ...layers.flatMap((layer) => [
      ...tokenize(layer.slotName),
      ...tokenize(layer.attachmentName),
      ...tokenize(layer.attachmentPath),
      ...tokenize(layer.regionName)
    ])
  ]);
}

function scoreCandidateForPage(
  candidate: SectionSkinMaterialCandidateRecord,
  pageTokens: readonly string[]
): SectionSkinMaterialCandidateRecord {
  const candidateTokens = uniqueSorted([
    ...tokenize(candidate.familyName),
    ...tokenize(path.basename(candidate.localPath)),
    ...tokenize(candidate.localPath)
  ]);
  const matchedTokens = pageTokens.filter((token) => candidateTokens.includes(token));
  const reasons: string[] = [];
  let score = 0;

  if (candidate.relation === "same-family") {
    score += 40;
    reasons.push("same-family image source");
  } else {
    score += 15;
    reasons.push("related-family image source");
  }

  if (candidate.sourceKind === "harvest-local" || candidate.sourceKind === "bundle-image-variant") {
    score += 10;
    reasons.push("grounded local image payload");
  }

  if (matchedTokens.length > 0) {
    score += matchedTokens.length * 12;
    reasons.push(`shares tokens: ${matchedTokens.join(", ")}`);
  }

  return {
    ...candidate,
    score,
    matchedTokens,
    reasons
  };
}

function buildMaterialState(
  exactPageImageCount: number,
  missingPageImageCount: number,
  relatedImageCandidateCount: number
): SectionSkinMaterialPlanFile["materialState"] {
  if (missingPageImageCount === 0 && exactPageImageCount > 0) {
    return "ready-with-exact-page-images";
  }
  if (relatedImageCandidateCount > 0) {
    return "needs-related-image-review";
  }
  return "needs-page-source-discovery";
}

export function buildSectionSkinMaterialPlan(
  options: BuildSectionSkinMaterialPlanOptions
): SectionSkinMaterialPlanFile {
  const imageCandidates = options.localSources
    .filter((localSource) => isImagePath(localSource.localPath))
    .map(toCandidateRecord)
    .sort(sortCandidates);

  const pageNames = Array.from(new Set(options.renderPlan.layers.map((layer) => layer.pageName).filter((value): value is string => typeof value === "string" && value.length > 0)));
  const pages: SectionSkinMaterialPageRecord[] = pageNames.map((pageName, orderIndex) => {
    const layers = options.renderPlan.layers.filter((layer) => layer.pageName === pageName);
    const exactPageLocalPath = layers.find((layer) => typeof layer.localPagePath === "string" && layer.localPagePath.length > 0)?.localPagePath ?? null;
    const pageTokens = buildPageTokens(options.renderPlan, pageName);
    const rankedCandidates = imageCandidates
      .map((candidate) => scoreCandidateForPage(candidate, pageTokens))
      .sort(sortCandidates);
    return {
      orderIndex,
      pageName,
      layerCount: layers.length,
      slotNames: Array.from(new Set(layers.map((layer) => layer.slotName))),
      exactPageLocalPath,
      relatedImageCandidateCount: imageCandidates.length,
      topRelatedImageCandidates: rankedCandidates.slice(0, 6)
    };
  });

  const exactPageImageCount = pages.filter((page) => page.exactPageLocalPath).length;
  const missingPageImageCount = pages.length - exactPageImageCount;
  const pageCandidateReadyCount = pages.filter((page) => page.topRelatedImageCandidates.length > 0).length;
  const relatedImageCandidateCount = imageCandidates.length;
  const topCandidateLocalPath = pages.flatMap((page) => page.topRelatedImageCandidates).sort(sortCandidates)[0]?.localPath ?? null;
  const materialState = buildMaterialState(exactPageImageCount, missingPageImageCount, relatedImageCandidateCount);
  const nextMaterialStep = materialState === "ready-with-exact-page-images"
    ? `${options.renderPlan.sectionKey}: use the exact local page images plus atlas geometry for texture reconstruction.`
    : materialState === "needs-related-image-review"
      ? `${options.renderPlan.sectionKey}: review the ranked related local image candidates and map them to the missing atlas pages before texture reconstruction.`
      : `${options.renderPlan.sectionKey}: capture or mirror the missing atlas page images before texture reconstruction.`;

  return {
    schemaVersion: "0.1.0",
    donorId: options.renderPlan.donorId,
    donorName: options.renderPlan.donorName,
    generatedAt: new Date().toISOString(),
    familyName: options.renderPlan.familyName,
    sectionKey: options.renderPlan.sectionKey,
    skinName: options.renderPlan.skinName,
    materialState,
    renderState: options.renderPlan.renderState,
    blueprintState: options.renderPlan.blueprintState,
    reconstructionState: options.renderPlan.reconstructionState,
    pageCount: pages.length,
    exactPageImageCount,
    missingPageImageCount,
    pageCandidateReadyCount,
    relatedImageCandidateCount,
    topCandidateLocalPath,
    exactLocalSourceCount: options.renderPlan.exactLocalSourceCount,
    relatedLocalSourceCount: options.renderPlan.relatedLocalSourceCount,
    sampleLocalSourcePath: options.renderPlan.sampleLocalSourcePath,
    atlasSourcePath: options.renderPlan.atlasSourcePath,
    renderPlanPath: options.renderPlanPath,
    skinBlueprintPath: options.renderPlan.skinBlueprintPath,
    reconstructionBundlePath: options.renderPlan.reconstructionBundlePath,
    nextMaterialStep,
    pages,
    relatedImageCandidates: imageCandidates
  };
}
