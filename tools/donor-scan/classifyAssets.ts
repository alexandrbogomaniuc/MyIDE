import type { DiscoveredDonorUrl, HarvestManifestFile, HarvestedDonorAssetEntry, UrlInventoryEntry } from "./shared";
import { sanitizeCountRecord } from "./shared";

export interface EntryPointRecord {
  url: string;
  category: DiscoveredDonorUrl["category"];
  source: DiscoveredDonorUrl["source"];
  depth: number;
  localStatus: HarvestedDonorAssetEntry["status"] | "inventory-only";
  localPath: string | null;
}

export interface AssetClassificationSummary {
  urlInventory: UrlInventoryEntry[];
  entryPoints: EntryPointRecord[];
  discoveredCount: number;
  downloadedCount: number;
  failedCount: number;
  skippedCount: number;
  inventoryOnlyCount: number;
  countsByCategory: Record<string, number>;
  downloadedCountsByCategory: Record<string, number>;
}

function sortInventory(entries: readonly UrlInventoryEntry[]): UrlInventoryEntry[] {
  return [...entries].sort((left, right) => {
    if (left.depth !== right.depth) {
      return left.depth - right.depth;
    }
    if (left.category !== right.category) {
      return left.category.localeCompare(right.category);
    }
    return left.url.localeCompare(right.url);
  });
}

function sortEntryPoints(entries: readonly EntryPointRecord[]): EntryPointRecord[] {
  return [...entries].sort((left, right) => {
    if (left.depth !== right.depth) {
      return left.depth - right.depth;
    }
    if (left.category !== right.category) {
      return left.category.localeCompare(right.category);
    }
    return left.url.localeCompare(right.url);
  });
}

export function buildAssetClassificationSummary(harvestManifest: HarvestManifestFile): AssetClassificationSummary {
  const discoveredUrls = Array.isArray(harvestManifest.discoveredUrls) ? harvestManifest.discoveredUrls : [];
  const harvestedEntries = Array.isArray(harvestManifest.entries) ? harvestManifest.entries : [];
  const harvestedEntryMap = new Map(harvestedEntries.map((entry) => [entry.sourceUrl, entry]));

  const countsByCategory: Record<string, number> = {};
  const downloadedCountsByCategory: Record<string, number> = {};
  const urlInventory: UrlInventoryEntry[] = [];
  let downloadedCount = 0;
  let failedCount = 0;
  let skippedCount = 0;
  let inventoryOnlyCount = 0;

  for (const discoveredUrl of discoveredUrls) {
    countsByCategory[discoveredUrl.category] = (countsByCategory[discoveredUrl.category] ?? 0) + 1;
    const harvestedEntry = harvestedEntryMap.get(discoveredUrl.url);
    const localStatus = harvestedEntry?.status ?? "inventory-only";
    if (localStatus === "downloaded") {
      downloadedCount += 1;
      downloadedCountsByCategory[discoveredUrl.category] = (downloadedCountsByCategory[discoveredUrl.category] ?? 0) + 1;
    } else if (localStatus === "failed") {
      failedCount += 1;
    } else if (localStatus === "skipped") {
      skippedCount += 1;
    } else {
      inventoryOnlyCount += 1;
    }

    urlInventory.push({
      url: discoveredUrl.url,
      category: discoveredUrl.category,
      source: discoveredUrl.source,
      depth: discoveredUrl.depth ?? 0,
      discoveredFromUrl: discoveredUrl.discoveredFromUrl ?? null,
      localStatus,
      localPath: harvestedEntry?.localPath ?? null,
      contentType: harvestedEntry?.contentType ?? null,
      sizeBytes: typeof harvestedEntry?.sizeBytes === "number" ? harvestedEntry.sizeBytes : null
    });
  }

  const entryPoints = discoveredUrls
    .filter((entry) => entry.category === "html" || entry.category === "script" || entry.category === "style" || entry.category === "json")
    .map((entry) => {
      const harvestedEntry = harvestedEntryMap.get(entry.url);
      return {
        url: entry.url,
        category: entry.category,
        source: entry.source,
        depth: entry.depth ?? 0,
        localStatus: harvestedEntry?.status ?? "inventory-only",
        localPath: harvestedEntry?.localPath ?? null
      } satisfies EntryPointRecord;
    });

  return {
    urlInventory: sortInventory(urlInventory),
    entryPoints: sortEntryPoints(entryPoints),
    discoveredCount: discoveredUrls.length,
    downloadedCount,
    failedCount,
    skippedCount,
    inventoryOnlyCount,
    countsByCategory: sanitizeCountRecord(countsByCategory),
    downloadedCountsByCategory: sanitizeCountRecord(downloadedCountsByCategory)
  };
}
