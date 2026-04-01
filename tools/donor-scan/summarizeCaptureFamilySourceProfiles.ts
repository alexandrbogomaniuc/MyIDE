import path from "node:path";
import type {
  AtlasManifestFile,
  BundleAssetMapFile,
  CaptureBlockerFamiliesFile,
  CaptureFamilySourceProfileRecord,
  CaptureFamilySourceProfilesFile,
  CaptureFamilySourceState,
  CaptureTargetFamiliesFile,
  HarvestManifestFile,
  NextCaptureTargetsFile
} from "./shared";

interface SummarizeCaptureFamilySourceProfilesOptions {
  donorId: string;
  donorName: string;
  atlasManifestFile: AtlasManifestFile;
  bundleAssetMap: BundleAssetMapFile;
  captureTargetFamilies: CaptureTargetFamiliesFile;
  captureBlockerFamilies: CaptureBlockerFamiliesFile;
  nextCaptureTargets: NextCaptureTargetsFile;
  harvestManifest: HarvestManifestFile;
}

interface MutableFamilyProfile {
  familyName: string;
  targetCount: number;
  untriedTargetCount: number;
  blockedTargetCount: number;
  atlasManifestKinds: Set<CaptureFamilySourceProfileRecord["atlasManifestKinds"][number]>;
  atlasManifestSources: Set<string>;
  atlasPageRefCount: number;
  localPageCount: number;
  missingPageCount: number;
  localPagePaths: Set<string>;
  missingPageUrls: Set<string>;
  captureStrategies: Set<CaptureFamilySourceProfileRecord["captureStrategies"][number]>;
  locationPrefixes: Set<string>;
  sameFamilyBundleReferenceCount: number;
  sameFamilyVariantAssetCount: number;
  localSameFamilyBundleReferenceCount: number;
  localSameFamilyVariantAssetCount: number;
  localRelatedBundleAssetCount: number;
  localRelatedVariantAssetCount: number;
  sameFamilyBundleReferencePreview: Set<string>;
  sameFamilyVariantAssetPreview: Set<string>;
  localSourceAssetPreview: Set<string>;
  relatedBundleAssetHints: Set<string>;
  relatedVariantAssetHints: Set<string>;
  sampleTargetUrls: string[];
  topUntriedTargetUrls: string[];
  topBlockedTargetUrls: string[];
  rawPayloadBlockedReason: string | null;
  rawPayloadBlocked: boolean;
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

function getOrCreateProfile(
  profileMap: Map<string, MutableFamilyProfile>,
  familyName: string
): MutableFamilyProfile {
  const existing = profileMap.get(familyName);
  if (existing) {
    return existing;
  }

  const profile: MutableFamilyProfile = {
    familyName,
    targetCount: 0,
    untriedTargetCount: 0,
    blockedTargetCount: 0,
    atlasManifestKinds: new Set(),
    atlasManifestSources: new Set(),
    atlasPageRefCount: 0,
    localPageCount: 0,
    missingPageCount: 0,
    localPagePaths: new Set(),
    missingPageUrls: new Set(),
    captureStrategies: new Set(),
    locationPrefixes: new Set(),
    sameFamilyBundleReferenceCount: 0,
    sameFamilyVariantAssetCount: 0,
    localSameFamilyBundleReferenceCount: 0,
    localSameFamilyVariantAssetCount: 0,
    localRelatedBundleAssetCount: 0,
    localRelatedVariantAssetCount: 0,
    sameFamilyBundleReferencePreview: new Set(),
    sameFamilyVariantAssetPreview: new Set(),
    localSourceAssetPreview: new Set(),
    relatedBundleAssetHints: new Set(),
    relatedVariantAssetHints: new Set(),
    sampleTargetUrls: [],
    topUntriedTargetUrls: [],
    topBlockedTargetUrls: [],
    rawPayloadBlockedReason: null,
    rawPayloadBlocked: false
  };
  profileMap.set(familyName, profile);
  return profile;
}

function inferSourceState(profile: MutableFamilyProfile): CaptureFamilySourceState {
  if (profile.atlasPageRefCount > 0 && profile.localPageCount >= profile.atlasPageRefCount && profile.localPageCount > 0) {
    return "local-pages-complete";
  }
  if (profile.localPageCount > 0) {
    return "partial-local-pages";
  }
  if (profile.sameFamilyVariantAssetCount > 0 || profile.relatedVariantAssetHints.size > 0) {
    return "variant-backed";
  }
  if (profile.sameFamilyBundleReferenceCount > 0 || profile.relatedBundleAssetHints.size > 0) {
    return "bundle-evidence-only";
  }
  return "raw-only";
}

function buildNextStep(profile: MutableFamilyProfile, state: CaptureFamilySourceState): string {
  if (state === "local-pages-complete") {
    return "Family already has local atlas pages; move to atlas/frame import or deeper runtime linkage.";
  }
  const localSourceAssetCount =
    profile.localSameFamilyBundleReferenceCount
    + profile.localSameFamilyVariantAssetCount
    + profile.localRelatedBundleAssetCount
    + profile.localRelatedVariantAssetCount;
  if (localSourceAssetCount > 0) {
    return "Family already has grounded local source assets captured; use them for deeper source discovery or reconstruction before adding more URL heuristics.";
  }
  if (state === "partial-local-pages") {
    return "Capture the remaining missing page images or review the related variant-backed assets before repeating raw capture.";
  }
  if (state === "variant-backed") {
    return "Review the same-family or related variant-backed bundle assets before retrying raw atlas-page URLs.";
  }
  if (state === "bundle-evidence-only") {
    return "Review bundle image paths and rooted asset families for this family before retrying raw capture.";
  }
  if (profile.rawPayloadBlocked || profile.blockedTargetCount > 0) {
    return "Current grounded data only proves raw/direct URLs for this family, and recent capture already failed. Deeper source discovery is required.";
  }
  return "Current grounded data only proves raw/direct URLs for this family. Deeper source discovery is the next step.";
}

function finalizeProfile(profile: MutableFamilyProfile): CaptureFamilySourceProfileRecord {
  const sourceState = inferSourceState(profile);
  return {
    familyName: profile.familyName,
    sourceState,
    targetCount: profile.targetCount,
    untriedTargetCount: profile.untriedTargetCount,
    blockedTargetCount: profile.blockedTargetCount,
    atlasManifestKinds: [...profile.atlasManifestKinds].sort((left, right) => left.localeCompare(right)),
    atlasManifestSources: [...profile.atlasManifestSources].sort((left, right) => left.localeCompare(right)).slice(0, 5),
    atlasPageRefCount: profile.atlasPageRefCount,
    localPageCount: profile.localPageCount,
    missingPageCount: profile.missingPageCount,
    localPagePaths: [...profile.localPagePaths].sort((left, right) => left.localeCompare(right)).slice(0, 5),
    missingPageUrls: [...profile.missingPageUrls].sort((left, right) => left.localeCompare(right)).slice(0, 5),
    captureStrategies: [...profile.captureStrategies].sort((left, right) => left.localeCompare(right)),
    locationPrefixes: [...profile.locationPrefixes].sort((left, right) => left.localeCompare(right)),
    sameFamilyBundleReferenceCount: profile.sameFamilyBundleReferenceCount,
    sameFamilyVariantAssetCount: profile.sameFamilyVariantAssetCount,
    localSameFamilyBundleReferenceCount: profile.localSameFamilyBundleReferenceCount,
    localSameFamilyVariantAssetCount: profile.localSameFamilyVariantAssetCount,
    localRelatedBundleAssetCount: profile.localRelatedBundleAssetCount,
    localRelatedVariantAssetCount: profile.localRelatedVariantAssetCount,
    sameFamilyBundleReferencePreview: [...profile.sameFamilyBundleReferencePreview].sort((left, right) => left.localeCompare(right)).slice(0, 5),
    sameFamilyVariantAssetPreview: [...profile.sameFamilyVariantAssetPreview].sort((left, right) => left.localeCompare(right)).slice(0, 5),
    localSourceAssetPreview: [...profile.localSourceAssetPreview].sort((left, right) => left.localeCompare(right)).slice(0, 5),
    relatedBundleAssetHints: [...profile.relatedBundleAssetHints].sort((left, right) => left.localeCompare(right)).slice(0, 5),
    relatedVariantAssetHints: [...profile.relatedVariantAssetHints].sort((left, right) => left.localeCompare(right)).slice(0, 5),
    sampleTargetUrls: [...profile.sampleTargetUrls],
    topUntriedTargetUrls: [...profile.topUntriedTargetUrls],
    topBlockedTargetUrls: [...profile.topBlockedTargetUrls],
    rawPayloadBlockedReason: profile.rawPayloadBlockedReason,
    nextStep: buildNextStep(profile, sourceState)
  };
}

export function summarizeCaptureFamilySourceProfiles(
  options: SummarizeCaptureFamilySourceProfilesOptions
): CaptureFamilySourceProfilesFile {
  const profileMap = new Map<string, MutableFamilyProfile>();
  const downloadedLookup = new Map<string, string>();
  for (const entry of Array.isArray(options.harvestManifest.entries) ? options.harvestManifest.entries : []) {
    if (entry.status !== "downloaded" || typeof entry.localPath !== "string") {
      continue;
    }
    if (typeof entry.sourceUrl === "string" && entry.sourceUrl.length > 0) {
      downloadedLookup.set(entry.sourceUrl, entry.localPath);
    }
    if (typeof entry.resolvedUrl === "string" && entry.resolvedUrl.length > 0) {
      downloadedLookup.set(entry.resolvedUrl, entry.localPath);
    }
  }

  for (const family of options.captureTargetFamilies.families) {
    if (family.familyName.length === 0 || !family.sampleUrls.some(isSourceMaterialUrl)) {
      continue;
    }
    const profile = getOrCreateProfile(profileMap, family.familyName);
    profile.targetCount = family.targetCount;
    profile.untriedTargetCount = family.untriedTargetCount;
    profile.blockedTargetCount = family.blockedTargetCount;
    for (const strategy of family.captureStrategies) {
      profile.captureStrategies.add(strategy);
    }
    for (const prefix of family.locationPrefixes) {
      profile.locationPrefixes.add(prefix);
    }
    for (const sampleUrl of family.sampleUrls.slice(0, 3)) {
      if (!profile.sampleTargetUrls.includes(sampleUrl) && profile.sampleTargetUrls.length < 5) {
        profile.sampleTargetUrls.push(sampleUrl);
      }
    }
  }

  for (const blockerFamily of options.captureBlockerFamilies.families) {
    if (blockerFamily.blockerClass !== "raw-payload-blocked") {
      continue;
    }
    const profile = getOrCreateProfile(profileMap, blockerFamily.familyName);
    profile.rawPayloadBlocked = true;
    profile.blockedTargetCount = Math.max(profile.blockedTargetCount, blockerFamily.targetCount);
    profile.rawPayloadBlockedReason = blockerFamily.recentCaptureFailureReasons[0] ?? "Blocked by the latest grounded capture attempts.";
  }

  for (const manifest of options.atlasManifestFile.manifests) {
    const familyName = deriveFamilyName(manifest.sourceUrl);
    const profile = getOrCreateProfile(profileMap, familyName);
    profile.atlasManifestKinds.add(manifest.kind);
    profile.atlasManifestSources.add(manifest.sourceUrl);
    profile.atlasPageRefCount += manifest.pageRefs.length;
    profile.localPageCount += manifest.localPagePaths.length;
    profile.missingPageCount += manifest.missingPageUrls.length;
    for (const localPagePath of manifest.localPagePaths) {
      profile.localPagePaths.add(localPagePath);
    }
    for (const missingPageUrl of manifest.missingPageUrls) {
      profile.missingPageUrls.add(missingPageUrl);
    }
  }

  const familyTokens = new Map<string, string[]>();
  for (const familyName of profileMap.keys()) {
    familyTokens.set(familyName, tokenizeFamily(familyName));
  }

  for (const reference of options.bundleAssetMap.references) {
    if (reference.category !== "image") {
      continue;
    }
    const sourcePath = reference.resolvedUrl ?? reference.referenceText;
    if (!sourcePath) {
      continue;
    }
    const referenceFamily = deriveFamilyName(sourcePath);
    const referenceTokens = tokenizeFamily(referenceFamily);
    for (const [familyName, tokens] of familyTokens.entries()) {
      const profile = getOrCreateProfile(profileMap, familyName);
      if (referenceFamily === familyName) {
        profile.sameFamilyBundleReferenceCount += 1;
        if (profile.sameFamilyBundleReferencePreview.size < 5) {
          profile.sameFamilyBundleReferencePreview.add(sourcePath);
        }
        if (reference.localStatus === "downloaded") {
          profile.localSameFamilyBundleReferenceCount += 1;
          if (reference.localPath && profile.localSourceAssetPreview.size < 5) {
            profile.localSourceAssetPreview.add(reference.localPath);
          }
        }
      } else if (hasTokenOverlap(tokens, referenceTokens) && profile.relatedBundleAssetHints.size < 5) {
        profile.relatedBundleAssetHints.add(sourcePath);
        if (reference.localStatus === "downloaded") {
          profile.localRelatedBundleAssetCount += 1;
          if (reference.localPath && profile.localSourceAssetPreview.size < 5) {
            profile.localSourceAssetPreview.add(reference.localPath);
          }
        }
      }
    }
  }

  for (const variant of options.bundleAssetMap.imageVariants) {
    const logicalPath = variant.logicalPath;
    const variantFamily = deriveFamilyName(logicalPath);
    const variantTokens = tokenizeFamily(variantFamily);
    for (const [familyName, tokens] of familyTokens.entries()) {
      const profile = getOrCreateProfile(profileMap, familyName);
      if (variantFamily === familyName) {
        profile.sameFamilyVariantAssetCount += 1;
        if (profile.sameFamilyVariantAssetPreview.size < 5) {
          profile.sameFamilyVariantAssetPreview.add(logicalPath);
        }
        const localVariantPaths = variant.variantUrls
          .map((variantUrl) => downloadedLookup.get(variantUrl.url))
          .filter((value): value is string => typeof value === "string" && value.length > 0);
        if (localVariantPaths.length > 0) {
          profile.localSameFamilyVariantAssetCount += localVariantPaths.length;
          for (const localPath of localVariantPaths) {
            if (profile.localSourceAssetPreview.size < 5) {
              profile.localSourceAssetPreview.add(localPath);
            }
          }
        }
      } else if (hasTokenOverlap(tokens, variantTokens) && profile.relatedVariantAssetHints.size < 5) {
        profile.relatedVariantAssetHints.add(logicalPath);
        const localVariantPaths = variant.variantUrls
          .map((variantUrl) => downloadedLookup.get(variantUrl.url))
          .filter((value): value is string => typeof value === "string" && value.length > 0);
        if (localVariantPaths.length > 0) {
          profile.localRelatedVariantAssetCount += localVariantPaths.length;
          for (const localPath of localVariantPaths) {
            if (profile.localSourceAssetPreview.size < 5) {
              profile.localSourceAssetPreview.add(localPath);
            }
          }
        }
      }
    }
  }

  for (const target of options.nextCaptureTargets.targets) {
    if (!isSourceMaterialUrl(target.url)) {
      continue;
    }
    const familyName = deriveFamilyName(target.url);
    const profile = profileMap.get(familyName);
    if (!profile) {
      continue;
    }
    if (target.recentCaptureStatus === "blocked") {
      if (profile.topBlockedTargetUrls.length < 5 && !profile.topBlockedTargetUrls.includes(target.url)) {
        profile.topBlockedTargetUrls.push(target.url);
      }
      if (!profile.rawPayloadBlockedReason && typeof target.recentCaptureFailureReason === "string" && target.recentCaptureFailureReason.length > 0) {
        profile.rawPayloadBlockedReason = target.recentCaptureFailureReason;
      }
    } else if (profile.topUntriedTargetUrls.length < 5 && !profile.topUntriedTargetUrls.includes(target.url)) {
      profile.topUntriedTargetUrls.push(target.url);
    }
  }

  const families = [...profileMap.values()]
    .map(finalizeProfile)
    .sort((left, right) => {
      const stateOrder = (value: CaptureFamilySourceProfileRecord["sourceState"]) => {
        switch (value) {
          case "raw-only":
            return 0;
          case "bundle-evidence-only":
            return 1;
          case "variant-backed":
            return 2;
          case "partial-local-pages":
            return 3;
          default:
            return 4;
        }
      };
      const leftOrder = stateOrder(left.sourceState);
      const rightOrder = stateOrder(right.sourceState);
      if (leftOrder !== rightOrder) {
        return leftOrder - rightOrder;
      }
      if (left.blockedTargetCount !== right.blockedTargetCount) {
        return right.blockedTargetCount - left.blockedTargetCount;
      }
      if (left.targetCount !== right.targetCount) {
        return right.targetCount - left.targetCount;
      }
      if (left.missingPageCount !== right.missingPageCount) {
        return right.missingPageCount - left.missingPageCount;
      }
      return left.familyName.localeCompare(right.familyName);
    });

  return {
    schemaVersion: "0.1.0",
    donorId: options.donorId,
    donorName: options.donorName,
    generatedAt: new Date().toISOString(),
    familyCount: families.length,
    families
  };
}
