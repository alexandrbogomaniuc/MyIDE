import { promises as fs } from "node:fs";
import path from "node:path";
import {
  type BundleAssetMapFile,
  type BundleImageVariantRecord,
  type BundleAssetMapReference,
  type HarvestManifestFile,
  type ReferenceConfidence,
  classifyReferenceCategory,
  collectReferenceCandidates,
  normalizeCandidateUrl,
  sanitizeCountRecord,
  toRepoRelativePath,
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

function extractNamedObjectLiteral(rawText: string, marker: string): string | null {
  const markerIndex = rawText.indexOf(marker);
  if (markerIndex < 0) {
    return null;
  }

  const objectStart = markerIndex + marker.length - 1;
  if (rawText[objectStart] !== "{") {
    return null;
  }

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = objectStart; index < rawText.length; index += 1) {
    const character = rawText[index];
    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (character === "\\") {
        escaped = true;
        continue;
      }
      if (character === "\"") {
        inString = false;
      }
      continue;
    }

    if (character === "\"") {
      inString = true;
      continue;
    }

    if (character === "{") {
      depth += 1;
    } else if (character === "}") {
      depth -= 1;
      if (depth === 0) {
        return rawText.slice(objectStart, index + 1);
      }
    }
  }

  return null;
}

function extractBundleImageVariants(options: {
  bundleText: string;
  bundleSourceUrl: string;
  bundleLocalPath: string;
  downloadedLookup: Map<string, string>;
}): BundleImageVariantRecord[] {
  const imagesObjectText = extractNamedObjectLiteral(options.bundleText, "images:{");
  if (!imagesObjectText) {
    return [];
  }

  const variants: BundleImageVariantRecord[] = [];
  const entryPattern = /"([^"]+)":\{([^{}]*)\}/g;
  let entryMatch: RegExpExecArray | null;
  while ((entryMatch = entryPattern.exec(imagesObjectText)) !== null) {
    const logicalPath = entryMatch[1];
    const fieldsText = entryMatch[2];
    const variantEntries = Array.from(fieldsText.matchAll(/([A-Za-z_][A-Za-z0-9_]*)\s*:\s*"([^"]*)"/g))
      .map((match) => [match[1], match[2]] as const)
      .filter(([, value]) => value.length > 0);
    if (variantEntries.length === 0) {
      continue;
    }

    const variantKeys = variantEntries.map(([key]) => key).sort((left, right) => left.localeCompare(right));
    const variantMap = Object.fromEntries(
      [...variantEntries].sort(([left], [right]) => left.localeCompare(right))
    );
    const resolvedUrl = normalizeCandidateUrl(logicalPath, options.bundleSourceUrl);
    const localPath = resolvedUrl ? (options.downloadedLookup.get(resolvedUrl) ?? null) : null;
    const localStatus = resolvedUrl
      ? (localPath ? "downloaded" : "missing")
      : "inventory-only";
    variants.push({
      bundleSourceUrl: options.bundleSourceUrl,
      bundleLocalPath: options.bundleLocalPath,
      logicalPath,
      resolvedUrl,
      confidence: inferConfidence(logicalPath, resolvedUrl),
      localStatus,
      localPath,
      variantKeys,
      variants: variantMap,
      variantCount: variantKeys.length,
      note: "Bundle images table entry; variant values are suffix tokens from the bundle, not reconstructed URLs."
    });
  }

  return variants;
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
  const imageVariants: BundleImageVariantRecord[] = [];
  const bundleSummaries: Array<{ sourceUrl: string; localPath: string; referenceCount: number }> = [];

  for (const entry of bundleEntries) {
    const absolutePath = path.join(workspaceRoot, entry.localPath!);
    const bundleText = await fs.readFile(absolutePath, "utf8");
    const rawCandidates = collectReferenceCandidates(bundleText);
    const seenForBundle = new Set<string>();
    const normalizedSourceUrl = entry.resolvedUrl ?? entry.sourceUrl;
    let referenceCount = 0;

    imageVariants.push(...extractBundleImageVariants({
      bundleText,
      bundleSourceUrl: normalizedSourceUrl,
      bundleLocalPath: entry.localPath!,
      downloadedLookup
    }));

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

  const dedupedImageVariants = [...imageVariants]
    .sort((left, right) => {
      if (left.bundleLocalPath !== right.bundleLocalPath) {
        return left.bundleLocalPath.localeCompare(right.bundleLocalPath);
      }
      return left.logicalPath.localeCompare(right.logicalPath);
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

  const imageVariantFieldCounts: Record<string, number> = {};
  let imageVariantSuffixCount = 0;
  for (const entry of dedupedImageVariants) {
    imageVariantSuffixCount += entry.variantCount;
    for (const key of entry.variantKeys) {
      imageVariantFieldCounts[key] = (imageVariantFieldCounts[key] ?? 0) + 1;
    }
  }

  const bundleCount = bundleSummaries.length;
  const referenceCount = dedupedReferences.length;
  const status: BundleAssetMapFile["status"] = bundleCount === 0
    ? "skipped"
    : referenceCount > 0
      ? "mapped"
      : "blocked";
  const imageVariantStatus: BundleAssetMapFile["imageVariantStatus"] = bundleCount === 0
    ? "skipped"
    : dedupedImageVariants.length > 0
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
    imageVariantStatus,
    imageVariantEntryCount: dedupedImageVariants.length,
    imageVariantSuffixCount,
    imageVariantFieldCounts: sanitizeCountRecord(imageVariantFieldCounts),
    countsByConfidence,
    countsByCategory: sanitizeCountRecord(countsByCategory),
    bundles: bundleSummaries.map((bundle) => ({
      sourceUrl: bundle.sourceUrl,
      localPath: bundle.localPath,
      referenceCount: bundle.referenceCount
    })),
    imageVariants: dedupedImageVariants.map((entry) => ({
      ...entry,
      bundleLocalPath: toRepoRelativePath(path.join(workspaceRoot, entry.bundleLocalPath)),
      localPath: entry.localPath
    })),
    references: dedupedReferences.map((reference) => ({
      ...reference,
      bundleLocalPath: toRepoRelativePath(path.join(workspaceRoot, reference.bundleLocalPath)),
      localPath: reference.localPath
    }))
  };
}
