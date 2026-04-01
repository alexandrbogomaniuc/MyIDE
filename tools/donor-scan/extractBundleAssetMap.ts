import { promises as fs } from "node:fs";
import path from "node:path";
import {
  type BundleAssetMapFile,
  type BundleImageVariantRecord,
  type BundleTranslationPayloadRecord,
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

interface BundleImageUrlBuilderRule {
  status: "mapped" | "blocked";
  note: string;
}

interface BundleTranslationPayloadRule {
  status: "mapped" | "blocked";
  note: string;
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

function detectBundleImageUrlBuilderRule(bundleText: string): BundleImageUrlBuilderRule {
  const texturePathRuleFound = /_textureNameToPath\s*=\s*[A-Za-z_$][A-Za-z0-9_$]*/.test(bundleText)
    && /resourcesPath\+"img\/"\+t/.test(bundleText);
  const imageMetadataRuleFound = /getImageMetadata\s*=\s*t=>[A-Za-z_$][A-Za-z0-9_$]*\.images\[t\]\|\|\{\}/.test(bundleText);

  if (texturePathRuleFound && imageMetadataRuleFound) {
    return {
      status: "mapped",
      note: "Bundle proves _textureNameToPath = resourcesPath + \"img/\" + logicalPath and getImageMetadata = images[logicalPath] || {}."
    };
  }

  return {
    status: "blocked",
    note: "Bundle images table exists, but the runtime request-path builder or image-metadata lookup rule was not proven in this bundle."
  };
}

function buildBundleImageRequestBaseUrl(logicalPath: string, bundleSourceUrl: string, urlBuilderRule: BundleImageUrlBuilderRule): string | null {
  if (urlBuilderRule.status !== "mapped") {
    return null;
  }

  try {
    const bundleDirectoryUrl = new URL("./", bundleSourceUrl);
    return new URL(`img/${logicalPath}`, bundleDirectoryUrl).toString();
  } catch {
    return null;
  }
}

function replaceTrailingExtensionWithVariantSuffix(baseRequestUrl: string, variantSuffix: string): string | null {
  if (!variantSuffix) {
    return null;
  }
  if (!/\.[^.]+$/i.test(baseRequestUrl)) {
    return null;
  }
  return baseRequestUrl.replace(/\.[^.]+$/i, variantSuffix);
}

function describeVariantUrl(key: string): string {
  if (key === "e") {
    return "Primary optimized request URL proven by the bundle images table.";
  }
  if (key === "f_e") {
    return "Fallback optimized request URL proven by the bundle images table; runtime switches to this when WebP is unavailable.";
  }
  return `Optimized request URL proven by bundle images table key ${key}.`;
}

function normalizeLocaleHint(rawLocale: string): string | null {
  const trimmed = rawLocale.trim().toLowerCase();
  if (!/^[a-z]{2,3}(?:[-_][a-z0-9]{2,8})*$/i.test(trimmed)) {
    return null;
  }
  return trimmed.replace(/_/g, "-");
}

function readTranslationRoot(urlString: string): string | null {
  try {
    const parsed = new URL(urlString);
    if (parsed.host !== "translations.bgaming-network.com") {
      return null;
    }
    if (/\.json$/i.test(parsed.pathname)) {
      parsed.pathname = parsed.pathname.replace(/\/[^/]+\.json$/i, "");
    }
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString().replace(/\/+$/g, "");
  } catch {
    return null;
  }
}

function detectBundleTranslationPayloadRule(bundleText: string): BundleTranslationPayloadRule {
  const loadLanguagesRuleFound = /loadLanguages=function\([^)]*\)\{[^]*?fetchResource\(/.test(bundleText)
    && /[A-Za-z_$][A-Za-z0-9_$]*\+[\"']\/[\"']\+[A-Za-z_$][A-Za-z0-9_$]*\+[\"']\.json[\"']/.test(bundleText);

  if (loadLanguagesRuleFound) {
    return {
      status: "mapped",
      note: "Bundle proves translation payload loading through loadLanguages(base + \"/\" + locale + \".json\") backed by fetchResource."
    };
  }

  return {
    status: "blocked",
    note: "Bundle references translation resources, but the locale JSON payload loading rule was not proven in this bundle."
  };
}

function extractTranslationPayloads(options: {
  bundleText: string;
  bundleSourceUrl: string;
  bundleLocalPath: string;
  rawCandidates: readonly string[];
  downloadedLookup: Map<string, string>;
}): BundleTranslationPayloadRecord[] {
  const translationRule = detectBundleTranslationPayloadRule(options.bundleText);
  const translationRoots = new Set<string>();
  const localeHints = new Map<string, BundleTranslationPayloadRecord["localeHintSource"]>();

  for (const candidate of options.rawCandidates) {
    const resolvedUrl = normalizeCandidateUrl(candidate, options.bundleSourceUrl);
    if (!resolvedUrl) {
      continue;
    }

    const translationRoot = readTranslationRoot(resolvedUrl);
    if (translationRoot) {
      translationRoots.add(translationRoot);
      const directPayloadMatch = resolvedUrl.match(/\/([a-z]{2,3}(?:[-_][a-z0-9]{2,8})*)\.json$/i);
      const directLocale = directPayloadMatch?.[1] ? normalizeLocaleHint(directPayloadMatch[1]) : null;
      if (directLocale && !localeHints.has(directLocale)) {
        localeHints.set(directLocale, "direct-payload");
      }
    }

    try {
      const parsed = new URL(resolvedUrl);
      if (parsed.host === "rules.bgaming-network.com") {
        const locale = normalizeLocaleHint(parsed.pathname.split("/").filter(Boolean)[0] ?? "");
        if (locale && !localeHints.has(locale)) {
          localeHints.set(locale, "rules-url");
        }
      }
    } catch {
      // ignore invalid URL candidates
    }
  }

  for (const match of options.bundleText.matchAll(/defaultLanguage\s*:\s*"([^"]+)"/g)) {
    const locale = normalizeLocaleHint(match[1] ?? "");
    if (locale && !localeHints.has(locale)) {
      localeHints.set(locale, "default-language");
    }
  }

  if (translationRule.status !== "mapped" || translationRoots.size === 0 || localeHints.size === 0) {
    return [];
  }

  const payloads: BundleTranslationPayloadRecord[] = [];
  for (const rootUrl of [...translationRoots].sort((left, right) => left.localeCompare(right))) {
    for (const [locale, localeHintSource] of [...localeHints.entries()].sort(([left], [right]) => left.localeCompare(right))) {
      const payloadUrl = `${rootUrl.replace(/\/+$/g, "")}/${locale}.json`;
      const localPath = options.downloadedLookup.get(payloadUrl) ?? null;
      payloads.push({
        bundleSourceUrl: options.bundleSourceUrl,
        bundleLocalPath: options.bundleLocalPath,
        rootUrl,
        locale,
        localeHintSource,
        payloadUrl,
        confidence: "confirmed",
        localStatus: localPath ? "downloaded" : "missing",
        localPath,
        note: `${translationRule.note} Locale hint came from ${localeHintSource}.`
      });
    }
  }

  return payloads;
}

function extractBundleImageVariants(options: {
  bundleText: string;
  bundleSourceUrl: string;
  bundleLocalPath: string;
  downloadedLookup: Map<string, string>;
}): BundleImageVariantRecord[] {
  const urlBuilderRule = detectBundleImageUrlBuilderRule(options.bundleText);
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
    const requestBaseUrl = buildBundleImageRequestBaseUrl(logicalPath, options.bundleSourceUrl, urlBuilderRule);
    const variantUrls = requestBaseUrl
      ? variantEntries
          .map(([key, suffix]) => {
            const url = replaceTrailingExtensionWithVariantSuffix(requestBaseUrl, suffix);
            if (!url) {
              return null;
            }
            return {
              key,
              url,
              note: describeVariantUrl(key)
            };
          })
          .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
          .sort((left, right) => left.key.localeCompare(right.key))
      : [];
    const localStatus = resolvedUrl
      ? (localPath ? "downloaded" : "missing")
      : "inventory-only";
    variants.push({
      bundleSourceUrl: options.bundleSourceUrl,
      bundleLocalPath: options.bundleLocalPath,
      logicalPath,
      resolvedUrl,
      requestBaseUrl,
      confidence: inferConfidence(logicalPath, resolvedUrl),
      localStatus,
      localPath,
      variantKeys,
      variants: variantMap,
      variantUrls,
      variantCount: variantKeys.length,
      note: requestBaseUrl
        ? `${urlBuilderRule.note} Variant URLs were generated by replacing the trailing extension on the request-base URL.`
        : `${urlBuilderRule.note} Variant values are still metadata-only because the request-base URL was not proven.`
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
  const translationPayloads: BundleTranslationPayloadRecord[] = [];
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
    translationPayloads.push(...extractTranslationPayloads({
      bundleText,
      bundleSourceUrl: normalizedSourceUrl,
      bundleLocalPath: entry.localPath!,
      rawCandidates,
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
  const dedupedTranslationPayloads = Array.from(
    new Map(translationPayloads.map((entry) => [`${entry.payloadUrl}::${entry.locale}`, entry] as const)).values()
  )
    .sort((left, right) => {
      if (left.bundleLocalPath !== right.bundleLocalPath) {
        return left.bundleLocalPath.localeCompare(right.bundleLocalPath);
      }
      if (left.payloadUrl !== right.payloadUrl) {
        return left.payloadUrl.localeCompare(right.payloadUrl);
      }
      return left.locale.localeCompare(right.locale);
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
  let imageVariantUrlCount = 0;
  const translationLocaleHints = new Set<string>();
  for (const entry of dedupedImageVariants) {
    imageVariantSuffixCount += entry.variantCount;
    imageVariantUrlCount += entry.variantUrls.length;
    for (const key of entry.variantKeys) {
      imageVariantFieldCounts[key] = (imageVariantFieldCounts[key] ?? 0) + 1;
    }
  }
  for (const entry of dedupedTranslationPayloads) {
    translationLocaleHints.add(entry.locale);
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
  const imageVariantUrlBuilderStatus: BundleAssetMapFile["imageVariantUrlBuilderStatus"] = bundleCount === 0
    ? "skipped"
    : dedupedImageVariants.some((entry) => typeof entry.requestBaseUrl === "string" && entry.requestBaseUrl.length > 0)
      ? "mapped"
      : "blocked";
  const translationPayloadStatus: BundleAssetMapFile["translationPayloadStatus"] = bundleCount === 0
    ? "skipped"
    : dedupedTranslationPayloads.length > 0
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
    imageVariantUrlBuilderStatus,
    imageVariantUrlCount,
    imageVariantFieldCounts: sanitizeCountRecord(imageVariantFieldCounts),
    translationPayloadStatus,
    translationPayloadCount: dedupedTranslationPayloads.length,
    translationLocaleHintCount: translationLocaleHints.size,
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
    translationPayloads: dedupedTranslationPayloads.map((entry) => ({
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
