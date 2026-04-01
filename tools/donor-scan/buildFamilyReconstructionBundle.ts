import path from "node:path";
import type {
  BundleAssetMapFile,
  BundleAssetMapReference,
  BundleImageVariantRecord,
  CaptureFamilyActionRecord,
  CaptureFamilySourceProfileRecord,
  FamilyReconstructionBundleFile,
  FamilyReconstructionLocalSourceRecord,
  HarvestManifestFile
} from "./shared";
import { uniqueStrings } from "./shared";

interface BuildFamilyReconstructionBundleOptions {
  donorId: string;
  donorName: string;
  familyAction: CaptureFamilyActionRecord;
  familyProfile: CaptureFamilySourceProfileRecord | null;
  harvestManifest: HarvestManifestFile;
  bundleAssetMap: BundleAssetMapFile;
  worksetPath: string | null;
  familyActionsPath: string;
  sourceProfilePath: string;
}

function deriveFamilyName(rawPathOrUrl: string): string {
  try {
    const pathname = rawPathOrUrl.includes("://") ? new URL(rawPathOrUrl).pathname : rawPathOrUrl;
    const basename = path.basename(pathname, path.extname(pathname));
    const underscoreStripped = basename.replace(/(?:_\d+)+$/, "");
    const digitStripped = underscoreStripped.replace(/(?<=[A-Za-z_-])\d{3,}$/, "");
    const normalized = digitStripped.replace(/[_-]+$/, "");
    return normalized.length > 0 ? normalized : basename;
  } catch {
    return "(invalid)";
  }
}

function tokenizeFamily(raw: string): string[] {
  return raw
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .map((token) => token.trim())
    .filter((token) => token.length > 1 && !/^\d+$/.test(token));
}

function hasTokenOverlap(left: readonly string[], right: readonly string[]): boolean {
  if (left.length === 0 || right.length === 0) {
    return false;
  }
  const rightSet = new Set(right);
  return left.some((token) => rightSet.has(token));
}

function isSourceMaterialUrl(urlString: string): boolean {
  try {
    const parsed = new URL(urlString);
    const pathname = parsed.pathname.toLowerCase();
    if (!/\.(png|webp|jpg|jpeg|gif|svg|json|atlas|plist|skel)$/i.test(pathname)) {
      return false;
    }
    return [
      "/img/",
      "/spines/",
      "/sprites/",
      "/symbols/",
      "/symbols_blur/",
      "/coins/",
      "/atlases/",
      "/big-win/",
      "/gamble/"
    ].some((segment) => pathname.includes(segment));
  } catch {
    return false;
  }
}

function sortLocalSources(left: FamilyReconstructionLocalSourceRecord, right: FamilyReconstructionLocalSourceRecord): number {
  const relationOrder = (value: FamilyReconstructionLocalSourceRecord["relation"]) => value === "same-family" ? 0 : 1;
  const kindOrder = (value: FamilyReconstructionLocalSourceRecord["sourceKind"]) => {
    switch (value) {
      case "atlas-page":
        return 0;
      case "bundle-image-variant":
        return 1;
      case "bundle-reference":
        return 2;
      default:
        return 3;
    }
  };
  const relationDelta = relationOrder(left.relation) - relationOrder(right.relation);
  if (relationDelta !== 0) {
    return relationDelta;
  }
  const kindDelta = kindOrder(left.sourceKind) - kindOrder(right.sourceKind);
  if (kindDelta !== 0) {
    return kindDelta;
  }
  return left.localPath.localeCompare(right.localPath);
}

function buildReferenceLookup(
  references: readonly BundleAssetMapReference[]
): Map<string, { sourceKind: FamilyReconstructionLocalSourceRecord["sourceKind"]; referenceText: string | null }> {
  const lookup = new Map<string, { sourceKind: FamilyReconstructionLocalSourceRecord["sourceKind"]; referenceText: string | null }>();
  for (const reference of references) {
    if (reference.localStatus !== "downloaded" || !reference.localPath) {
      continue;
    }
    lookup.set(reference.localPath, {
      sourceKind: "bundle-reference",
      referenceText: reference.resolvedUrl ?? reference.referenceText
    });
  }
  return lookup;
}

function buildVariantLookup(
  imageVariants: readonly BundleImageVariantRecord[]
): Map<string, { sourceKind: FamilyReconstructionLocalSourceRecord["sourceKind"]; referenceText: string | null }> {
  const lookup = new Map<string, { sourceKind: FamilyReconstructionLocalSourceRecord["sourceKind"]; referenceText: string | null }>();
  for (const variant of imageVariants) {
    if (variant.localStatus !== "downloaded" || !variant.localPath) {
      continue;
    }
    lookup.set(variant.localPath, {
      sourceKind: "bundle-image-variant",
      referenceText: variant.logicalPath
    });
  }
  return lookup;
}

export function buildFamilyReconstructionBundle(
  options: BuildFamilyReconstructionBundleOptions
): FamilyReconstructionBundleFile {
  const familyName = options.familyAction.familyName;
  const normalizedFamily = familyName.toLowerCase();
  const familyTokens = tokenizeFamily(normalizedFamily);
  const localSourceMap = new Map<string, FamilyReconstructionLocalSourceRecord>();
  const bundleReferenceLookup = buildReferenceLookup(options.bundleAssetMap.references);
  const variantLookup = buildVariantLookup(options.bundleAssetMap.imageVariants);

  for (const localPagePath of options.familyProfile?.localPagePaths ?? []) {
    const key = `atlas:${localPagePath}`;
    localSourceMap.set(key, {
      localPath: localPagePath,
      sourceUrl: null,
      resolvedUrl: null,
      sourceKind: "atlas-page",
      relation: "same-family",
      familyName,
      referenceText: localPagePath
    });
  }

  for (const entry of Array.isArray(options.harvestManifest.entries) ? options.harvestManifest.entries : []) {
    if (entry.status !== "downloaded" || typeof entry.localPath !== "string") {
      continue;
    }
    const sourceUrl = typeof entry.resolvedUrl === "string" && entry.resolvedUrl.length > 0
      ? entry.resolvedUrl
      : entry.sourceUrl;
    if (!sourceUrl || !isSourceMaterialUrl(sourceUrl)) {
      continue;
    }
    const entryFamily = deriveFamilyName(sourceUrl);
    const entryTokens = tokenizeFamily(entryFamily);
    let relation: FamilyReconstructionLocalSourceRecord["relation"] | null = null;
    if (entryFamily.toLowerCase() === normalizedFamily) {
      relation = "same-family";
    } else if (hasTokenOverlap(familyTokens, entryTokens)) {
      relation = "related-family";
    }
    if (!relation) {
      continue;
    }
    const bundleReference = bundleReferenceLookup.get(entry.localPath);
    const variantReference = variantLookup.get(entry.localPath);
    const sourceKind = variantReference?.sourceKind
      ?? bundleReference?.sourceKind
      ?? "harvest-local";
    const referenceText = variantReference?.referenceText
      ?? bundleReference?.referenceText
      ?? sourceUrl;
    const key = `${sourceKind}:${entry.localPath}`;
    if (!localSourceMap.has(key)) {
      localSourceMap.set(key, {
        localPath: entry.localPath,
        sourceUrl: entry.sourceUrl,
        resolvedUrl: typeof entry.resolvedUrl === "string" ? entry.resolvedUrl : null,
        sourceKind,
        relation,
        familyName: entryFamily,
        referenceText
      });
    }
  }

  const sameFamilyBundleReferences = options.bundleAssetMap.references
    .filter((reference) => {
      const candidate = reference.resolvedUrl ?? reference.referenceText;
      return candidate.length > 0 && deriveFamilyName(candidate).toLowerCase() === normalizedFamily;
    })
    .map((reference) => reference.resolvedUrl ?? reference.referenceText);
  const sameFamilyVariantLogicalPaths = options.bundleAssetMap.imageVariants
    .filter((variant) => deriveFamilyName(variant.logicalPath).toLowerCase() === normalizedFamily)
    .map((variant) => variant.logicalPath);
  const relatedBundleHints = options.bundleAssetMap.references
    .map((reference) => reference.resolvedUrl ?? reference.referenceText)
    .filter((candidate) => {
      const candidateFamily = deriveFamilyName(candidate);
      const candidateTokens = tokenizeFamily(candidateFamily);
      return candidate.length > 0
        && candidateFamily.toLowerCase() !== normalizedFamily
        && hasTokenOverlap(familyTokens, candidateTokens);
    });
  const relatedVariantHints = options.bundleAssetMap.imageVariants
    .map((variant) => variant.logicalPath)
    .filter((candidate) => {
      const candidateFamily = deriveFamilyName(candidate);
      const candidateTokens = tokenizeFamily(candidateFamily);
      return candidate.length > 0
        && candidateFamily.toLowerCase() !== normalizedFamily
        && hasTokenOverlap(familyTokens, candidateTokens);
    });

  const localSources = [...localSourceMap.values()].sort(sortLocalSources);
  const exactLocalSourceCount = localSources.filter((entry) => entry.relation === "same-family").length;
  const relatedLocalSourceCount = localSources.filter((entry) => entry.relation === "related-family").length;
  const readiness = exactLocalSourceCount > 0 || (options.familyProfile?.localPageCount ?? 0) > 0
    ? "ready-with-local-sources"
    : "needs-more-source-discovery";

  return {
    schemaVersion: "0.1.0",
    donorId: options.donorId,
    donorName: options.donorName,
    generatedAt: new Date().toISOString(),
    familyName,
    actionClass: options.familyAction.actionClass,
    sourceState: options.familyProfile?.sourceState ?? "unknown",
    readiness,
    reason: options.familyAction.reason,
    nextStep: readiness === "ready-with-local-sources"
      ? `Use the grounded local source bundle for ${familyName} to drive deeper source discovery or reconstruction.`
      : (options.familyProfile?.nextStep ?? options.familyAction.nextStep),
    targetCount: options.familyAction.targetCount,
    blockedTargetCount: options.familyAction.blockedTargetCount,
    atlasPageRefCount: options.familyAction.atlasPageRefCount,
    localPageCount: options.familyAction.localPageCount,
    localSourceAssetCount: options.familyAction.localSourceAssetCount,
    sameFamilyBundleReferenceCount: options.familyAction.sameFamilyBundleReferenceCount,
    sameFamilyVariantAssetCount: options.familyAction.sameFamilyVariantAssetCount,
    exactLocalSourceCount,
    relatedLocalSourceCount,
    localSources,
    sameFamilyBundleReferences: uniqueStrings(sameFamilyBundleReferences).sort((left, right) => left.localeCompare(right)),
    sameFamilyVariantLogicalPaths: uniqueStrings(sameFamilyVariantLogicalPaths).sort((left, right) => left.localeCompare(right)),
    relatedBundleHints: uniqueStrings(relatedBundleHints).sort((left, right) => left.localeCompare(right)).slice(0, 20),
    relatedVariantHints: uniqueStrings(relatedVariantHints).sort((left, right) => left.localeCompare(right)).slice(0, 20),
    openTargetUrls: uniqueStrings(options.familyProfile?.topUntriedTargetUrls ?? []).sort((left, right) => left.localeCompare(right)),
    blockedTargetUrls: uniqueStrings(options.familyProfile?.topBlockedTargetUrls ?? []).sort((left, right) => left.localeCompare(right)),
    worksetPath: options.worksetPath,
    sourceProfilePath: options.sourceProfilePath,
    familyActionsPath: options.familyActionsPath
  };
}
