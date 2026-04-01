import { promises as fs } from "node:fs";
import path from "node:path";
import {
  type BundleAssetMapFile,
  type BundleAssetMapReference,
  type HarvestManifestFile,
  type ReferenceConfidence,
  classifyReferenceCategory,
  collectReferenceCandidates,
  normalizeCandidateUrl,
  sanitizeCountRecord,
  toRepoRelativePath,
  uniqueStrings,
  workspaceRoot
} from "./shared";

interface ExtractBundleAssetMapOptions {
  donorId: string;
  donorName: string;
  harvestManifest: HarvestManifestFile;
}

function hasFileExtension(value: string): boolean {
  return /\.(js|css|json|atlas|plist|png|jpe?g|gif|svg|webp|ogg|mp3|wav|m4a|mp4|webm|mov|woff2?|ttf|otf|fnt|xml|skel)(?:[?#]|$)/i.test(value);
}

function inferConfidence(referenceText: string, resolvedUrl: string | null): ReferenceConfidence {
  if (resolvedUrl && (/^https?:\/\//i.test(referenceText) || hasFileExtension(referenceText))) {
    return "confirmed";
  }
  if (resolvedUrl) {
    return "likely";
  }
  return "provisional";
}

export async function extractBundleAssetMap(options: ExtractBundleAssetMapOptions): Promise<BundleAssetMapFile> {
  const harvestedEntries = Array.isArray(options.harvestManifest.entries) ? options.harvestManifest.entries : [];
  const downloadedLookup = new Map<string, string>();
  for (const entry of harvestedEntries) {
    if (entry.status !== "downloaded" || typeof entry.localPath !== "string") {
      continue;
    }
    if (typeof entry.sourceUrl === "string") {
      downloadedLookup.set(entry.sourceUrl, entry.localPath);
    }
    if (typeof entry.resolvedUrl === "string") {
      downloadedLookup.set(entry.resolvedUrl, entry.localPath);
    }
  }

  const bundleEntries = harvestedEntries.filter((entry) => entry.status === "downloaded" && typeof entry.localPath === "string" && /\.(?:js)(?:$|\?)/i.test(entry.localPath));
  const references: BundleAssetMapReference[] = [];
  const bundleSummaries: Array<{ sourceUrl: string; localPath: string; referenceCount: number }> = [];

  for (const entry of bundleEntries) {
    const absolutePath = path.join(workspaceRoot, entry.localPath!);
    const bundleText = await fs.readFile(absolutePath, "utf8");
    const rawCandidates = collectReferenceCandidates(bundleText);
    const seenForBundle = new Set<string>();
    const normalizedSourceUrl = entry.resolvedUrl ?? entry.sourceUrl;
    let referenceCount = 0;

    for (const candidate of rawCandidates) {
      const resolvedUrl = normalizeCandidateUrl(candidate, normalizedSourceUrl);
      const category = classifyReferenceCategory(resolvedUrl ?? candidate);
      const dedupeKey = `${resolvedUrl ?? candidate}::${category}`;
      if (seenForBundle.has(dedupeKey)) {
        continue;
      }
      seenForBundle.add(dedupeKey);

      const localPath = resolvedUrl ? (downloadedLookup.get(resolvedUrl) ?? null) : null;
      const localStatus = localPath
        ? "downloaded"
        : resolvedUrl && downloadedLookup.has(resolvedUrl)
          ? "downloaded"
          : resolvedUrl
            ? "missing"
            : "inventory-only";
      references.push({
        bundleSourceUrl: normalizedSourceUrl,
        bundleLocalPath: entry.localPath!,
        referenceText: candidate,
        resolvedUrl,
        category,
        confidence: inferConfidence(candidate, resolvedUrl),
        localStatus,
        localPath
      });
      referenceCount += 1;
    }

    bundleSummaries.push({
      sourceUrl: normalizedSourceUrl,
      localPath: entry.localPath!,
      referenceCount
    });
  }

  const dedupedReferences = [...references]
    .sort((left, right) => {
      if (left.bundleLocalPath !== right.bundleLocalPath) {
        return left.bundleLocalPath.localeCompare(right.bundleLocalPath);
      }
      if ((left.resolvedUrl ?? left.referenceText) !== (right.resolvedUrl ?? right.referenceText)) {
        return (left.resolvedUrl ?? left.referenceText).localeCompare(right.resolvedUrl ?? right.referenceText);
      }
      return left.category.localeCompare(right.category);
    });

  const countsByConfidence: Record<ReferenceConfidence, number> = {
    confirmed: 0,
    likely: 0,
    provisional: 0
  };
  const countsByCategory: Record<string, number> = {};
  for (const reference of dedupedReferences) {
    countsByConfidence[reference.confidence] += 1;
    countsByCategory[reference.category] = (countsByCategory[reference.category] ?? 0) + 1;
  }

  const bundleCount = bundleSummaries.length;
  const referenceCount = dedupedReferences.length;
  const status: BundleAssetMapFile["status"] = bundleCount === 0
    ? "skipped"
    : referenceCount > 0
      ? "mapped"
      : "blocked";

  return {
    schemaVersion: "0.1.0",
    donorId: options.donorId,
    donorName: options.donorName,
    generatedAt: new Date().toISOString(),
    status,
    bundleCount,
    referenceCount,
    countsByConfidence,
    countsByCategory: sanitizeCountRecord(countsByCategory),
    bundles: bundleSummaries.map((bundle) => ({
      sourceUrl: bundle.sourceUrl,
      localPath: bundle.localPath,
      referenceCount: bundle.referenceCount
    })),
    references: dedupedReferences.map((reference) => ({
      ...reference,
      bundleLocalPath: toRepoRelativePath(path.join(workspaceRoot, reference.bundleLocalPath)),
      localPath: reference.localPath
    }))
  };
}
