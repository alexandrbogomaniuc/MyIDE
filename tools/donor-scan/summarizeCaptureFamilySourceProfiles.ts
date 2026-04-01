import path from "node:path";
import type {
  AtlasManifestFile,
  BundleAssetMapFile,
  CaptureBlockerFamiliesFile,
  CaptureFamilySourceProfileRecord,
  CaptureFamilySourceProfilesFile,
  CaptureFamilySourceState,
  CaptureTargetFamiliesFile
} from "./shared";

interface SummarizeCaptureFamilySourceProfilesOptions {
  donorId: string;
  donorName: string;
  atlasManifestFile: AtlasManifestFile;
  bundleAssetMap: BundleAssetMapFile;
  captureTargetFamilies: CaptureTargetFamiliesFile;
  captureBlockerFamilies: CaptureBlockerFamiliesFile;
}

interface MutableFamilyProfile {
  familyName: string;
  targetCount: number;
  untriedTargetCount: number;
  blockedTargetCount: number;
  atlasManifestKinds: Set<CaptureFamilySourceProfileRecord["atlasManifestKinds"][number]>;
  atlasPageRefCount: number;
  localPageCount: number;
  missingPageCount: number;
  captureStrategies: Set<CaptureFamilySourceProfileRecord["captureStrategies"][number]>;
  locationPrefixes: Set<string>;
  sameFamilyBundleReferenceCount: number;
  sameFamilyVariantAssetCount: number;
  relatedBundleAssetHints: Set<string>;
  relatedVariantAssetHints: Set<string>;
  sampleTargetUrls: string[];
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
    atlasPageRefCount: 0,
    localPageCount: 0,
    missingPageCount: 0,
    captureStrategies: new Set(),
    locationPrefixes: new Set(),
    sameFamilyBundleReferenceCount: 0,
    sameFamilyVariantAssetCount: 0,
    relatedBundleAssetHints: new Set(),
    relatedVariantAssetHints: new Set(),
    sampleTargetUrls: [],
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
    atlasPageRefCount: profile.atlasPageRefCount,
    localPageCount: profile.localPageCount,
    missingPageCount: profile.missingPageCount,
    captureStrategies: [...profile.captureStrategies].sort((left, right) => left.localeCompare(right)),
    locationPrefixes: [...profile.locationPrefixes].sort((left, right) => left.localeCompare(right)),
    sameFamilyBundleReferenceCount: profile.sameFamilyBundleReferenceCount,
    sameFamilyVariantAssetCount: profile.sameFamilyVariantAssetCount,
    relatedBundleAssetHints: [...profile.relatedBundleAssetHints].sort((left, right) => left.localeCompare(right)).slice(0, 5),
    relatedVariantAssetHints: [...profile.relatedVariantAssetHints].sort((left, right) => left.localeCompare(right)).slice(0, 5),
    sampleTargetUrls: [...profile.sampleTargetUrls],
    nextStep: buildNextStep(profile, sourceState)
  };
}

export function summarizeCaptureFamilySourceProfiles(
  options: SummarizeCaptureFamilySourceProfilesOptions
): CaptureFamilySourceProfilesFile {
  const profileMap = new Map<string, MutableFamilyProfile>();

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
  }

  for (const manifest of options.atlasManifestFile.manifests) {
    const familyName = deriveFamilyName(manifest.sourceUrl);
    const profile = getOrCreateProfile(profileMap, familyName);
    profile.atlasManifestKinds.add(manifest.kind);
    profile.atlasPageRefCount += manifest.pageRefs.length;
    profile.localPageCount += manifest.localPagePaths.length;
    profile.missingPageCount += manifest.missingPageUrls.length;
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
      } else if (hasTokenOverlap(tokens, referenceTokens) && profile.relatedBundleAssetHints.size < 5) {
        profile.relatedBundleAssetHints.add(sourcePath);
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
      } else if (hasTokenOverlap(tokens, variantTokens) && profile.relatedVariantAssetHints.size < 5) {
        profile.relatedVariantAssetHints.add(logicalPath);
      }
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
