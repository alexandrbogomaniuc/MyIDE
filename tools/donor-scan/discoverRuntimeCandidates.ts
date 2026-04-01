import type { AssetClassificationSummary, EntryPointRecord } from "./classifyAssets";
import type { AtlasManifestFile, BundleAssetMapFile, MirrorCandidateStatus, RuntimeCandidateRecord, RuntimeCandidatesFile } from "./shared";
import { pathLooksLikeRuntimeMetadata, pathLooksLikeRuntimeScript, uniqueStrings } from "./shared";

interface DiscoverRuntimeCandidatesOptions {
  donorId: string;
  donorName: string;
  assetSummary: AssetClassificationSummary;
  bundleAssetMap: BundleAssetMapFile;
  atlasManifestFile: AtlasManifestFile;
}

function entryPointToCandidate(entryPoint: EntryPointRecord): RuntimeCandidateRecord {
  const kind = entryPoint.category === "html"
    ? "launch-html"
    : entryPoint.category === "style"
      ? "runtime-style"
      : "runtime-script";
  return {
    kind,
    url: entryPoint.url,
    confidence: entryPoint.depth === 0 ? "confirmed" : "likely",
    localStatus: entryPoint.localStatus === "downloaded"
      ? "downloaded"
      : entryPoint.localStatus === "inventory-only"
        ? "inventory-only"
        : "missing",
    localPath: entryPoint.localPath,
    category: entryPoint.category,
    note: entryPoint.depth > 0 ? `Discovered at recursive depth ${entryPoint.depth}.` : "Discovered directly from the launch surface."
  };
}

export function discoverRuntimeCandidates(options: DiscoverRuntimeCandidatesOptions): RuntimeCandidatesFile {
  const runtimeEntryPoints = options.assetSummary.entryPoints
    .filter((entryPoint) => entryPoint.category === "html" || entryPoint.category === "script" || entryPoint.category === "style")
    .map(entryPointToCandidate);

  const runtimeMetadataCandidates = options.bundleAssetMap.references
    .filter((reference) => {
      if (!reference.resolvedUrl) {
        return false;
      }
      return pathLooksLikeRuntimeMetadata(reference.resolvedUrl) || ["json", "atlas", "plist", "translation"].includes(reference.category);
    })
    .map((reference) => ({
      kind: "runtime-metadata" as const,
      url: reference.resolvedUrl ?? reference.referenceText,
      confidence: reference.confidence,
      localStatus: reference.localStatus,
      localPath: reference.localPath,
      category: reference.category,
      note: `Referenced by ${reference.bundleSourceUrl}.`
    }));

  const bundleReferenceCandidates = options.bundleAssetMap.references
    .filter((reference) =>
      reference.resolvedUrl
      && pathLooksLikeRuntimeScript(reference.bundleSourceUrl)
      && ["image", "audio", "font", "video"].includes(reference.category)
    )
    .map((reference) => ({
      kind: "bundle-reference" as const,
      url: reference.resolvedUrl ?? reference.referenceText,
      confidence: reference.confidence,
      localStatus: reference.localStatus,
      localPath: reference.localPath,
      category: reference.category,
      note: `Bundle reference from ${reference.bundleLocalPath}.`
    }));

  const hostRoots = uniqueStrings([
    ...runtimeEntryPoints.map((entry) => {
      try {
        return new URL(entry.url).host;
      } catch {
        return null;
      }
    }),
    ...runtimeMetadataCandidates.map((entry) => {
      try {
        return new URL(entry.url).host;
      } catch {
        return null;
      }
    }),
    ...bundleReferenceCandidates.map((entry) => {
      try {
        return new URL(entry.url).host;
      } catch {
        return null;
      }
    })
  ]).sort((left, right) => left.localeCompare(right));

  const dedupedCandidateMap = new Map<string, RuntimeCandidateRecord>();
  for (const entry of [...runtimeEntryPoints, ...runtimeMetadataCandidates, ...bundleReferenceCandidates]) {
    const key = `${entry.kind}::${entry.url}`;
    const existing = dedupedCandidateMap.get(key);
    if (!existing) {
      dedupedCandidateMap.set(key, entry);
      continue;
    }
    const statusRank = (value: RuntimeCandidateRecord["localStatus"]) => {
      if (value === "downloaded") {
        return 3;
      }
      if (value === "inventory-only") {
        return 2;
      }
      return 1;
    };
    if (statusRank(entry.localStatus) > statusRank(existing.localStatus)) {
      dedupedCandidateMap.set(key, entry);
    }
  }

  const runtimeCandidates = Array.from(dedupedCandidateMap.values())
    .sort((left, right) => {
      if (left.kind !== right.kind) {
        return left.kind.localeCompare(right.kind);
      }
      return left.url.localeCompare(right.url);
    });

  const unresolvedDependencies = runtimeCandidates.filter((candidate) =>
    candidate.localStatus === "missing"
    && !["api", "other"].includes(candidate.category)
  );

  const localLaunchCount = runtimeEntryPoints.filter((candidate) => candidate.kind === "launch-html" && candidate.localStatus === "inventory-only").length
    + runtimeEntryPoints.filter((candidate) => candidate.kind === "launch-html" && candidate.localStatus === "downloaded").length;
  const downloadedRuntimeScriptCount = runtimeEntryPoints.filter((candidate) => candidate.kind === "runtime-script" && candidate.localStatus === "downloaded").length;
  const downloadedRuntimeMetadataCount = runtimeMetadataCandidates.filter((candidate) => candidate.localStatus === "downloaded").length;
  const mirrorCandidateCount = options.assetSummary.downloadedCount;

  let mirrorCandidateStatus: MirrorCandidateStatus = "blocked";
  if (localLaunchCount > 0 && downloadedRuntimeScriptCount > 0 && downloadedRuntimeMetadataCount > 0) {
    mirrorCandidateStatus = "strong-partial";
  } else if (localLaunchCount > 0 && downloadedRuntimeScriptCount > 0) {
    mirrorCandidateStatus = "weak-partial";
  }

  const partialLocalRuntimePackage = localLaunchCount > 0 && downloadedRuntimeScriptCount > 0;
  const atlasReady = options.atlasManifestFile.frameManifestCount > 0 || options.atlasManifestFile.spineJsonCount > 0;
  const fullLocalRuntimePackage = partialLocalRuntimePackage
    && unresolvedDependencies.length === 0
    && atlasReady;

  return {
    schemaVersion: "0.1.0",
    donorId: options.donorId,
    donorName: options.donorName,
    generatedAt: new Date().toISOString(),
    fullLocalRuntimePackage,
    partialLocalRuntimePackage,
    mirrorCandidateStatus,
    entryPointCount: runtimeEntryPoints.length,
    runtimeCandidateCount: runtimeCandidates.length,
    mirrorCandidateCount,
    unresolvedDependencyCount: unresolvedDependencies.length,
    hostRoots,
    runtimeEntryPoints,
    runtimeCandidates,
    unresolvedDependencies
  };
}
