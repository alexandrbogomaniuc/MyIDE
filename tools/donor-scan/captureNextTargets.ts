import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { runDonorScan } from "./runDonorScan";
import {
  type BundleAssetMapFile,
  type CaptureRunFile,
  type CaptureRunStatus,
  type DiscoveredDonorUrl,
  type DonorPackageManifestFile,
  type DonorUrlCategory,
  type HarvestManifestFile,
  type HarvestedDonorAssetEntry,
  type NextCaptureTargetRecord,
  type NextCaptureTargetsFile,
  buildDonorScanPaths,
  readOptionalJsonFile,
  rewriteKnownPlaceholderSegments,
  toRepoRelativePath,
  uniqueStrings,
  writeJsonFile,
  workspaceRoot
} from "./shared";

interface CaptureNextTargetsOptions {
  donorId: string;
  limit?: number;
}

interface CaptureNextTargetsResult {
  donorId: string;
  donorName: string;
  status: CaptureRunStatus;
  captureRunPath: string;
  attemptedCount: number;
  downloadedCount: number;
  failedCount: number;
  skippedCount: number;
  targetCountBefore: number;
  targetCountAfter: number;
  nextOperatorAction: string;
}

function sanitizeStoredUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return "";
  }

  const sensitiveQueryKeyPattern = /(token|sid|session|signature|sig|key|auth|password|secret|hash)/i;
  try {
    const parsed = new URL(trimmed);
    for (const key of [...parsed.searchParams.keys()]) {
      if (sensitiveQueryKeyPattern.test(key)) {
        parsed.searchParams.set(key, "<redacted>");
      }
    }
    return parsed.toString();
  } catch {
    return trimmed;
  }
}

function sanitizeFileSegment(value: string): string {
  const normalized = value.trim().replace(/[^a-z0-9._-]+/gi, "_");
  return normalized.length > 0 ? normalized : "item";
}

function buildHarvestFilePath(root: string, assetUrl: string): string {
  const parsed = new URL(assetUrl);
  const host = sanitizeFileSegment(parsed.host);
  const rawPath = parsed.pathname.replace(/^\/+/, "");
  const segments = rawPath.length > 0 ? rawPath.split("/").map((segment) => sanitizeFileSegment(segment)) : ["index"];
  let filename = segments.pop() ?? "index";
  if (!filename.includes(".")) {
    filename = `${filename}.bin`;
  }
  if (parsed.search.length > 1) {
    const suffix = createHash("sha1").update(parsed.search).digest("hex").slice(0, 10);
    const extension = path.extname(filename);
    const stem = extension ? filename.slice(0, -extension.length) : filename;
    filename = extension ? `${stem}__${suffix}${extension}` : `${stem}__${suffix}`;
  }

  return path.join(root, host, ...segments, filename);
}

function sortDiscoveredUrls(entries: readonly DiscoveredDonorUrl[]): DiscoveredDonorUrl[] {
  return [...entries].sort((left, right) => {
    const leftDepth = typeof left.depth === "number" ? left.depth : 0;
    const rightDepth = typeof right.depth === "number" ? right.depth : 0;
    if (leftDepth !== rightDepth) {
      return leftDepth - rightDepth;
    }
    if (left.category === right.category) {
      return left.url.localeCompare(right.url);
    }
    return left.category.localeCompare(right.category);
  });
}

function mapTargetCategory(category: string, urlString: string): DonorUrlCategory {
  const normalized = category.trim().toLowerCase();
  if (normalized === "image" || normalized === "audio" || normalized === "video" || normalized === "font") {
    return normalized as DonorUrlCategory;
  }
  if (normalized === "script") {
    return "script";
  }
  if (normalized === "style") {
    return "style";
  }
  if (normalized === "json") {
    return "json";
  }

  try {
    const pathname = new URL(urlString).pathname.toLowerCase();
    if (pathname.endsWith(".js")) {
      return "script";
    }
    if (pathname.endsWith(".css")) {
      return "style";
    }
    if (pathname.endsWith(".png") || pathname.endsWith(".jpg") || pathname.endsWith(".jpeg") || pathname.endsWith(".gif") || pathname.endsWith(".svg") || pathname.endsWith(".webp")) {
      return "image";
    }
    if (pathname.endsWith(".ogg") || pathname.endsWith(".mp3") || pathname.endsWith(".wav") || pathname.endsWith(".m4a")) {
      return "audio";
    }
    if (pathname.endsWith(".mp4") || pathname.endsWith(".webm") || pathname.endsWith(".mov")) {
      return "video";
    }
    if (pathname.endsWith(".woff") || pathname.endsWith(".woff2") || pathname.endsWith(".ttf") || pathname.endsWith(".otf") || pathname.endsWith(".fnt")) {
      return "font";
    }
    if (pathname.endsWith(".json") || pathname.endsWith(".atlas") || pathname.endsWith(".plist") || pathname.endsWith(".xml") || pathname.endsWith(".skel")) {
      return "json";
    }
  } catch {
    // fall through
  }

  return "other";
}

function mapTargetSource(target: NextCaptureTargetRecord): DiscoveredDonorUrl["source"] {
  if (target.kind === "bundle-asset" || target.kind === "runtime-script") {
    return "harvest-script";
  }
  if (target.kind === "atlas-page" || target.kind === "runtime-metadata" || target.kind === "translation-payload") {
    return "harvest-json";
  }
  return "html-inline";
}

function clampCaptureLimit(value: number | undefined): number {
  if (!Number.isFinite(value)) {
    return 10;
  }
  return Math.min(50, Math.max(1, Math.floor(value ?? 10)));
}

function readUrlHost(urlString: string): string | null {
  try {
    return new URL(urlString).host;
  } catch {
    return null;
  }
}

function readUrlBasename(urlString: string): string | null {
  try {
    const pathname = new URL(urlString).pathname;
    const basename = path.posix.basename(pathname);
    return basename.length > 0 ? basename : null;
  } catch {
    return null;
  }
}

function buildCaptureAttemptUrls(
  target: NextCaptureTargetRecord,
  bundleAssetMap: BundleAssetMapFile | null
): string[] {
  const urls: string[] = [target.url];
  const rewrittenPrimaryUrl = rewriteKnownPlaceholderSegments(target.url);
  if (rewrittenPrimaryUrl !== target.url) {
    urls.push(rewrittenPrimaryUrl);
  }

  if (target.kind === "atlas-page" && bundleAssetMap) {
    const targetHost = readUrlHost(target.url);
    const targetBasename = readUrlBasename(target.url)?.toLowerCase();
    if (targetHost && targetBasename) {
      for (const reference of bundleAssetMap.references) {
        if (reference.category !== "image" || !reference.resolvedUrl) {
          continue;
        }
        if (readUrlHost(reference.resolvedUrl) !== targetHost) {
          continue;
        }
        if (readUrlBasename(reference.resolvedUrl)?.toLowerCase() !== targetBasename) {
          continue;
        }
        urls.push(reference.resolvedUrl);
      }
    }
  }

  return uniqueStrings(urls);
}

function readLaunchContext(scanSummary: Record<string, unknown> | null, packageManifest: DonorPackageManifestFile | null): {
  donorName: string;
  launchUrl: string | undefined;
  resolvedLaunchUrl: string | undefined;
  sourceHost: string | undefined;
} {
  const donorName = typeof scanSummary?.donorName === "string" && scanSummary.donorName.length > 0
    ? scanSummary.donorName
    : typeof packageManifest?.donorName === "string" && packageManifest.donorName.length > 0
      ? packageManifest.donorName
      : "Unknown donor";

  return {
    donorName,
    launchUrl: typeof scanSummary?.launchUrl === "string" && scanSummary.launchUrl.length > 0
      ? scanSummary.launchUrl
      : typeof packageManifest?.launchUrl === "string" && packageManifest.launchUrl.length > 0
        ? packageManifest.launchUrl
        : undefined,
    resolvedLaunchUrl: typeof scanSummary?.resolvedLaunchUrl === "string" && scanSummary.resolvedLaunchUrl.length > 0
      ? scanSummary.resolvedLaunchUrl
      : typeof packageManifest?.resolvedLaunchUrl === "string" && packageManifest.resolvedLaunchUrl.length > 0
        ? packageManifest.resolvedLaunchUrl
        : undefined,
    sourceHost: typeof scanSummary?.sourceHost === "string" && scanSummary.sourceHost.length > 0
      ? scanSummary.sourceHost
      : typeof packageManifest?.sourceHost === "string" && packageManifest.sourceHost.length > 0
        ? packageManifest.sourceHost
        : undefined
  };
}

export async function captureNextTargets(options: CaptureNextTargetsOptions): Promise<CaptureNextTargetsResult> {
  const donorId = options.donorId.trim();
  if (!donorId) {
    throw new Error("captureNextTargets requires a donorId.");
  }

  const limit = clampCaptureLimit(options.limit);
  const paths = buildDonorScanPaths(donorId);
  const [nextCaptureTargets, harvestManifest, scanSummary, packageManifest] = await Promise.all([
    readOptionalJsonFile<NextCaptureTargetsFile>(paths.nextCaptureTargetsPath),
    readOptionalJsonFile<HarvestManifestFile>(paths.assetManifestPath),
    readOptionalJsonFile<Record<string, unknown>>(paths.scanSummaryPath),
    readOptionalJsonFile<DonorPackageManifestFile>(paths.packageManifestPath)
  ]);

  if (!nextCaptureTargets || !harvestManifest) {
    throw new Error(`Missing donor scan artifacts for ${donorId}. Run donor scan first.`);
  }

  const bundleAssetMap = await readOptionalJsonFile<BundleAssetMapFile>(paths.bundleAssetMapPath);

  const { donorName, launchUrl, resolvedLaunchUrl, sourceHost } = readLaunchContext(scanSummary, packageManifest);
  const queuedTargets = Array.isArray(nextCaptureTargets.targets) ? nextCaptureTargets.targets.slice(0, limit) : [];
  const discoveredUrlMap = new Map<string, DiscoveredDonorUrl>();
  for (const discovered of Array.isArray(harvestManifest.discoveredUrls) ? harvestManifest.discoveredUrls : []) {
    if (typeof discovered?.url !== "string" || discovered.url.length === 0) {
      continue;
    }
    discoveredUrlMap.set(discovered.url, {
      url: discovered.url,
      category: discovered.category ?? "other",
      source: discovered.source ?? "html-inline",
      depth: typeof discovered.depth === "number" ? discovered.depth : 0,
      discoveredFromUrl: discovered.discoveredFromUrl
    });
  }

  const entries = Array.isArray(harvestManifest.entries) ? [...harvestManifest.entries] : [];
  const entryIndexByUrl = new Map<string, number>();
  entries.forEach((entry, index) => {
    if (typeof entry.sourceUrl === "string" && entry.sourceUrl.length > 0 && !entryIndexByUrl.has(entry.sourceUrl)) {
      entryIndexByUrl.set(entry.sourceUrl, index);
    }
  });

  const results: CaptureRunFile["results"] = [];

  for (const target of queuedTargets) {
    const category = mapTargetCategory(target.category, target.url);
    const discoveredUrl: DiscoveredDonorUrl = {
      url: target.url,
      category,
      source: mapTargetSource(target),
      depth: 1
    };
    if (!discoveredUrlMap.has(discoveredUrl.url)) {
      discoveredUrlMap.set(discoveredUrl.url, discoveredUrl);
    }

    const attemptUrls = buildCaptureAttemptUrls(target, bundleAssetMap);
    let lastFailureReason: string | null = null;
    let downloadedResult: CaptureRunFile["results"][number] | null = null;

    for (const attemptUrl of attemptUrls) {
      try {
        const response = await fetch(attemptUrl, {
          redirect: "follow",
          headers: {
            "user-agent": "MyIDE Donor Scan Capture/0.1"
          },
          signal: AbortSignal.timeout(20000)
        });

        if (!response.ok) {
          lastFailureReason = `HTTP ${response.status}`;
          continue;
        }

        const resolvedUrl = sanitizeStoredUrl(response.url || attemptUrl);
        const buffer = Buffer.from(await response.arrayBuffer());
        const filePath = buildHarvestFilePath(path.join(paths.harvestRoot, "files"), resolvedUrl);
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, buffer);
        const contentType = response.headers.get("content-type");
        const downloadedEntry: HarvestedDonorAssetEntry = {
          sourceUrl: target.url,
          resolvedUrl,
          category,
          discoverySource: discoveredUrl.source,
          depth: discoveredUrl.depth,
          status: "downloaded",
          localPath: toRepoRelativePath(filePath),
          contentType: contentType ?? undefined,
          sizeBytes: buffer.length,
          sha256: createHash("sha256").update(buffer).digest("hex")
        };
        const existingIndex = entryIndexByUrl.get(target.url);
        if (typeof existingIndex === "number") {
          entries[existingIndex] = downloadedEntry;
        } else {
          entryIndexByUrl.set(target.url, entries.push(downloadedEntry) - 1);
        }
        downloadedResult = {
          rank: target.rank,
          url: target.url,
          relativePath: target.relativePath,
          kind: target.kind,
          priority: target.priority,
          status: "downloaded",
          attemptedUrls: attemptUrls,
          downloadedFromUrl: resolvedUrl,
          localPath: downloadedEntry.localPath ?? null,
          contentType,
          sizeBytes: buffer.length,
          reason: target.reason
        };
        break;
      } catch (error) {
        lastFailureReason = error instanceof Error ? error.message : String(error);
      }
    }

    if (downloadedResult) {
      results.push(downloadedResult);
      continue;
    }

    const failedEntry: HarvestedDonorAssetEntry = {
      sourceUrl: target.url,
      category,
      discoverySource: discoveredUrl.source,
      depth: discoveredUrl.depth,
      status: "failed",
      reason: lastFailureReason ?? "No capture attempts were performed."
    };
    const existingIndex = entryIndexByUrl.get(target.url);
    if (typeof existingIndex === "number") {
      entries[existingIndex] = failedEntry;
    } else {
      entryIndexByUrl.set(target.url, entries.push(failedEntry) - 1);
    }
    results.push({
      rank: target.rank,
      url: target.url,
      relativePath: target.relativePath,
      kind: target.kind,
      priority: target.priority,
      status: "failed",
      attemptedUrls: attemptUrls,
      downloadedFromUrl: null,
      localPath: null,
      contentType: null,
      sizeBytes: null,
      reason: lastFailureReason
    });
  }

  const discoveredUrls = sortDiscoveredUrls([...discoveredUrlMap.values()]);
  const harvestedAssetCount = entries.filter((entry) => entry.status === "downloaded").length;
  const failedAssetCount = entries.filter((entry) => entry.status === "failed").length;
  const skippedAssetCount = entries.filter((entry) => entry.status === "skipped").length;
  const attemptedAssetCount = entries.filter((entry) => entry.status !== "skipped").length;
  const recursiveDiscoveredUrlCount = discoveredUrls.filter((entry) => (entry.depth ?? 0) > 0).length;

  await writeJsonFile(paths.assetManifestPath, {
    schemaVersion: "0.1.0",
    donorId,
    donorName,
    capturedAt: new Date().toISOString(),
    discoveredUrlCount: discoveredUrls.length,
    recursiveDiscoveredUrlCount,
    recursiveHarvestDepthLimit: harvestManifest.recursiveHarvestDepthLimit ?? 2,
    attemptedAssetCount,
    harvestedAssetCount,
    skippedAssetCount,
    failedAssetCount,
    discoveredUrls,
    entries
  });

  const refreshedScan = await runDonorScan({
    donorId,
    donorName,
    launchUrl,
    resolvedLaunchUrl,
    sourceHost
  });

  const downloadedCount = results.filter((entry) => entry.status === "downloaded").length;
  const failedCount = results.filter((entry) => entry.status === "failed").length;
  const skippedCount = results.filter((entry) => entry.status === "skipped").length;
  const attemptedCount = results.length - skippedCount;
  const status: CaptureRunStatus = attemptedCount === 0
    ? "skipped"
    : downloadedCount > 0 && failedCount === 0
      ? "captured"
      : downloadedCount > 0
        ? "partial"
        : "blocked";

  const captureRun: CaptureRunFile = {
    schemaVersion: "0.1.0",
    donorId,
    donorName,
    generatedAt: new Date().toISOString(),
    status,
    requestedLimit: limit,
    targetCountBefore: nextCaptureTargets.targetCount,
    targetCountAfter: refreshedScan.nextCaptureTargetCount,
    attemptedCount,
    downloadedCount,
    failedCount,
    skippedCount,
    refreshedScanSummaryPath: toRepoRelativePath(paths.scanSummaryPath),
    refreshedNextCaptureTargetsPath: toRepoRelativePath(paths.nextCaptureTargetsPath),
    results
  };
  await writeJsonFile(paths.captureRunPath, captureRun);

  return {
    donorId,
    donorName,
    status,
    captureRunPath: paths.captureRunPath,
    attemptedCount,
    downloadedCount,
    failedCount,
    skippedCount,
    targetCountBefore: nextCaptureTargets.targetCount,
    targetCountAfter: refreshedScan.nextCaptureTargetCount,
    nextOperatorAction: refreshedScan.nextOperatorAction
  };
}

function parseArgs(argv: readonly string[]): CaptureNextTargetsOptions {
  let donorId = "";
  let limit: number | undefined;

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    const next = argv[index + 1];
    if (token === "--donor-id" && next) {
      donorId = next;
      index += 1;
      continue;
    }
    if (token === "--limit" && next) {
      limit = Number.parseInt(next, 10);
      index += 1;
    }
  }

  if (!donorId) {
    throw new Error("Missing required --donor-id argument.");
  }

  return { donorId, limit };
}

async function main(): Promise<void> {
  const result = await captureNextTargets(parseArgs(process.argv.slice(2)));
  console.log("PASS donor-scan:capture-next");
  console.log(`Donor: ${result.donorId}`);
  console.log(`Status: ${result.status}`);
  console.log(`Attempted: ${result.attemptedCount}`);
  console.log(`Downloaded: ${result.downloadedCount}`);
  console.log(`Failed: ${result.failedCount}`);
  console.log(`Targets before: ${result.targetCountBefore}`);
  console.log(`Targets after: ${result.targetCountAfter}`);
  console.log(`Capture summary: ${toRepoRelativePath(result.captureRunPath)}`);
  console.log(`Next operator action: ${result.nextOperatorAction}`);
}

if (require.main === module) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`FAIL donor-scan:capture-next - ${message}`);
    process.exitCode = 1;
  });
}
