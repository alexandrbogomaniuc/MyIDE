import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { runDonorScan } from "../../tools/donor-scan/runDonorScan";
import type { BundleAssetMapStatus, DonorScanState, MirrorCandidateStatus } from "../../tools/donor-scan/shared";

export interface BootstrapDonorIntakeOptions {
  donorId: string;
  donorName: string;
  donorLaunchUrl?: string;
  harvestAssets?: boolean;
  overwrite?: boolean;
}

export interface DiscoveredDonorUrl {
  url: string;
  category: "html" | "script" | "style" | "image" | "audio" | "video" | "font" | "json" | "api" | "other";
  source: "launch-url" | "html-attribute" | "html-inline" | "harvest-script" | "harvest-style" | "harvest-json";
  depth?: number;
  discoveredFromUrl?: string;
}

export interface DonorIntakeResult {
  status: "captured" | "blocked" | "skipped";
  donorId: string;
  donorRoot: string;
  evidenceRoot: string;
  reportPath: string;
  launchUrl?: string;
  resolvedLaunchUrl?: string;
  sourceHost?: string;
  bootstrapHtmlPath?: string;
  discoveredUrlsPath?: string;
  discoveredUrlCount: number;
  harvestStatus?: "harvested" | "blocked" | "skipped";
  harvestManifestPath?: string;
  attemptedAssetCount?: number;
  harvestedAssetCount?: number;
  skippedAssetCount?: number;
  failedAssetCount?: number;
  packageStatus?: "packaged" | "blocked" | "skipped";
  packageManifestPath?: string;
  packageGraphPath?: string;
  packageFamilyCount?: number;
  packageReferencedUrlCount?: number;
  packageGraphNodeCount?: number;
  packageGraphEdgeCount?: number;
  packageUnresolvedCount?: number;
  scanStatus?: DonorScanState;
  scanSummaryPath?: string;
  blockerSummaryPath?: string;
  nextCaptureTargetsPath?: string;
  runtimeCandidateCount?: number;
  atlasManifestCount?: number;
  bundleAssetMapStatus?: BundleAssetMapStatus;
  bundleImageVariantStatus?: BundleAssetMapStatus;
  bundleImageVariantCount?: number;
  bundleImageVariantSuffixCount?: number;
  mirrorCandidateStatus?: MirrorCandidateStatus;
  nextCaptureTargetCount?: number;
  nextOperatorAction?: string;
  error?: string;
}

export interface HarvestedDonorAssetEntry {
  sourceUrl: string;
  resolvedUrl?: string;
  category: DiscoveredDonorUrl["category"];
  discoverySource: DiscoveredDonorUrl["source"];
  depth?: number;
  discoveredFromUrl?: string;
  status: "downloaded" | "failed" | "skipped";
  localPath?: string;
  contentType?: string;
  sizeBytes?: number;
  sha256?: string;
  reason?: string;
}

interface DonorAssetHarvestResult {
  status: "harvested" | "blocked" | "skipped";
  manifestPath: string;
  discoveredUrls: DiscoveredDonorUrl[];
  entries: HarvestedDonorAssetEntry[];
  attemptedAssetCount: number;
  harvestedAssetCount: number;
  skippedAssetCount: number;
  failedAssetCount: number;
}

interface DonorPackageGraphNode {
  url: string;
  category: DiscoveredDonorUrl["category"];
  discoverySource: DiscoveredDonorUrl["source"];
  depth: number;
  discoveredFromUrl?: string;
  host: string;
  downloadStatus: HarvestedDonorAssetEntry["status"] | "inventory-only";
  localPath?: string;
  contentType?: string;
  sizeBytes?: number;
  sha256?: string;
  outboundReferenceCount: number;
  inboundReferenceCount: number;
}

interface DonorPackageGraphEdge {
  fromUrl: string;
  toUrl: string;
  discoverySource: DiscoveredDonorUrl["source"];
  depth: number;
  category: DiscoveredDonorUrl["category"];
}

const workspaceRoot = path.resolve(__dirname, "../../..");
const sensitiveQueryKeyPattern = /(token|sid|session|signature|sig|key|auth|password|secret|hash)/i;
const recursiveHarvestDepthLimit = 2;

function buildDonorPaths(donorId: string) {
  const donorRoot = path.join(workspaceRoot, "10_donors", donorId);
  return {
    donorRoot,
    evidenceRoot: path.join(donorRoot, "evidence"),
    reportsRoot: path.join(donorRoot, "reports"),
    rawRoot: path.join(donorRoot, "raw"),
    bootstrapRoot: path.join(donorRoot, "raw", "bootstrap"),
    discoveredRoot: path.join(donorRoot, "raw", "discovered"),
    captureSessionsRoot: path.join(donorRoot, "evidence", "capture_sessions"),
    localOnlyRoot: path.join(donorRoot, "evidence", "local_only"),
    localOnlyHarvestRoot: path.join(donorRoot, "evidence", "local_only", "harvest"),
    localOnlyHarvestFilesRoot: path.join(donorRoot, "evidence", "local_only", "harvest", "files"),
    readmePath: path.join(donorRoot, "README.md"),
    evidenceReadmePath: path.join(donorRoot, "evidence", "README.md"),
    reportsReadmePath: path.join(donorRoot, "reports", "README.md"),
    rawReadmePath: path.join(donorRoot, "raw", "README.md"),
    localOnlyReadmePath: path.join(donorRoot, "evidence", "local_only", "README.md"),
    reportPath: path.join(donorRoot, "reports", "DONOR_INTAKE_REPORT.md"),
    requestPath: path.join(donorRoot, "raw", "bootstrap", "launch-request.json"),
    bootstrapHtmlPath: path.join(donorRoot, "raw", "bootstrap", "launch.html"),
    discoveredUrlsPath: path.join(donorRoot, "raw", "discovered", "discovered-urls.json"),
    harvestManifestPath: path.join(donorRoot, "evidence", "local_only", "harvest", "asset-manifest.json"),
    packageManifestPath: path.join(donorRoot, "evidence", "local_only", "harvest", "package-manifest.json"),
    packageGraphPath: path.join(donorRoot, "evidence", "local_only", "harvest", "package-graph.json")
  };
}

async function writeFileConditionally(filePath: string, content: string, overwrite: boolean): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  if (!overwrite) {
    try {
      await fs.access(filePath);
      return;
    } catch {
      // fall through
    }
  }

  await fs.writeFile(filePath, content, "utf8");
}

async function writeBufferConditionally(filePath: string, content: Buffer, overwrite: boolean): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  if (!overwrite) {
    try {
      await fs.access(filePath);
      return;
    } catch {
      // fall through
    }
  }

  await fs.writeFile(filePath, content);
}

async function ensureDonorScaffold(donorId: string, donorName: string, overwrite: boolean): Promise<ReturnType<typeof buildDonorPaths>> {
  const paths = buildDonorPaths(donorId);
  await Promise.all([
    fs.mkdir(paths.evidenceRoot, { recursive: true }),
    fs.mkdir(paths.reportsRoot, { recursive: true }),
    fs.mkdir(paths.rawRoot, { recursive: true }),
    fs.mkdir(paths.bootstrapRoot, { recursive: true }),
    fs.mkdir(paths.discoveredRoot, { recursive: true }),
    fs.mkdir(paths.captureSessionsRoot, { recursive: true }),
    fs.mkdir(paths.localOnlyRoot, { recursive: true }),
    fs.mkdir(paths.localOnlyHarvestRoot, { recursive: true }),
    fs.mkdir(paths.localOnlyHarvestFilesRoot, { recursive: true })
  ]);

  await Promise.all([
    writeFileConditionally(paths.readmePath, [
      `# ${donorId}`,
      "",
      `Shared donor capture pack for ${donorName}.`,
      "",
      "- `raw/` keeps donor-facing bootstrap material read-only once captured.",
      "- `evidence/` holds capture sessions, indexes, and local-only runtime notes.",
      "- `reports/` holds derived reports and intake summaries."
    ].join("\n"), overwrite),
    writeFileConditionally(paths.evidenceReadmePath, [
      "# Evidence",
      "",
      "Use this folder for evidence indexes, capture sessions, and local-only runtime observations.",
      "",
      "Do not claim proof until the evidence pack is populated."
    ].join("\n"), overwrite),
    writeFileConditionally(paths.reportsReadmePath, [
      "# Reports",
      "",
      "Derived donor reports and capture summaries live here."
    ].join("\n"), overwrite),
    writeFileConditionally(paths.rawReadmePath, [
      "# Raw Bootstrap",
      "",
      "Captured donor bootstrap material lives here.",
      "",
      "Treat these files as read-only donor inputs after capture."
    ].join("\n"), overwrite),
    writeFileConditionally(paths.localOnlyReadmePath, [
      "# Local Only",
      "",
      "This folder holds local-only donor artifacts such as downloaded runtime files.",
      "",
      "These files are intentionally gitignored and should not be treated as public-safe evidence."
    ].join("\n"), overwrite)
  ]);

  return paths;
}

export function sanitizeStoredUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return "";
  }

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

function sanitizeUrlsInText(rawText: string): string {
  return rawText.replace(/https?:\/\/[^\s"'<>\\)]+/gi, (matched) => sanitizeStoredUrl(matched));
}

function classifyUrl(candidate: URL): DiscoveredDonorUrl["category"] {
  const pathname = candidate.pathname.toLowerCase();
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
  if (pathname.endsWith(".woff") || pathname.endsWith(".woff2") || pathname.endsWith(".ttf") || pathname.endsWith(".otf")) {
    return "font";
  }
  if (pathname.endsWith(".json")) {
    return "json";
  }
  if (pathname.endsWith(".atlas") || pathname.endsWith(".plist") || pathname.endsWith(".xml") || pathname.endsWith(".skel") || pathname.endsWith(".fnt")) {
    return "json";
  }
  if (pathname.includes("/api/")) {
    return "api";
  }
  return "other";
}

function normalizeDiscoveredUrl(value: string, baseUrl: URL): URL | null {
  const trimmed = value.trim();
  if (!trimmed || trimmed.startsWith("data:") || trimmed.startsWith("javascript:") || trimmed.startsWith("mailto:") || trimmed.startsWith("#")) {
    return null;
  }

  try {
    return new URL(trimmed, baseUrl);
  } catch {
    return null;
  }
}

function extractDiscoveredUrls(html: string, launchUrl: string, resolvedUrl: string): DiscoveredDonorUrl[] {
  const result = new Map<string, DiscoveredDonorUrl>();
  const baseUrl = new URL(resolvedUrl);
  const normalizedLaunchUrl = sanitizeStoredUrl(launchUrl);
  result.set(normalizedLaunchUrl, {
    url: normalizedLaunchUrl,
    category: "html",
    source: "launch-url",
    depth: 0
  });

  const attributePattern = /\b(?:src|href|poster|data-src|data-url)=["']([^"'<>]+)["']/gi;
  let attributeMatch: RegExpExecArray | null;
  while ((attributeMatch = attributePattern.exec(html)) !== null) {
    const normalized = normalizeDiscoveredUrl(attributeMatch[1], baseUrl);
    if (!normalized) {
      continue;
    }
    const sanitized = sanitizeStoredUrl(normalized.toString());
    result.set(sanitized, {
      url: sanitized,
      category: classifyUrl(normalized),
      source: "html-attribute",
      depth: 0
    });
  }

  const inlineUrlPattern = /https?:\/\/[^\s"'<>\\)]+/gi;
  let inlineMatch: RegExpExecArray | null;
  while ((inlineMatch = inlineUrlPattern.exec(html)) !== null) {
    const normalized = normalizeDiscoveredUrl(inlineMatch[0], baseUrl);
    if (!normalized) {
      continue;
    }
    const sanitized = sanitizeStoredUrl(normalized.toString());
    if (!result.has(sanitized)) {
        result.set(sanitized, {
          url: sanitized,
          category: classifyUrl(normalized),
          source: "html-inline",
          depth: 0
        });
      }
    }

  return sortDiscoveredUrls([...result.values()]);
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

function shouldHarvestDiscoveredUrl(entry: DiscoveredDonorUrl): boolean {
  return ["script", "style", "image", "audio", "video", "font", "json"].includes(entry.category);
}

function categorizeDownloadedEntries(entries: readonly HarvestedDonorAssetEntry[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const entry of entries) {
    if (entry.status !== "downloaded") {
      continue;
    }
    counts[entry.category] = (counts[entry.category] ?? 0) + 1;
  }
  return counts;
}

function sortRecordByKey(record: Record<string, number>): Record<string, number> {
  return Object.fromEntries(Object.entries(record).sort(([left], [right]) => left.localeCompare(right)));
}

function buildPackageFamilyKey(urlString: string, category: DiscoveredDonorUrl["category"]): string {
  try {
    const parsed = new URL(urlString);
    const segments = parsed.pathname.split("/").filter(Boolean);
    const suffix = segments.slice(0, Math.min(2, segments.length)).join("/") || "(root)";
    return `${category}:${suffix}`;
  } catch {
    return `${category}:(invalid-url)`;
  }
}

function buildEntryPointList(discoveredUrls: readonly DiscoveredDonorUrl[], category: DiscoveredDonorUrl["category"]): string[] {
  return discoveredUrls
    .filter((entry) => entry.category === category && (entry.depth ?? 0) <= 1)
    .map((entry) => entry.url)
    .slice(0, 20);
}

async function writeDonorPackageManifest(
  donorId: string,
  donorName: string,
  sourceHost: string | undefined,
  launchUrl: string,
  resolvedLaunchUrl: string,
  paths: ReturnType<typeof buildDonorPaths>,
  discoveredUrls: readonly DiscoveredDonorUrl[],
  entries: readonly HarvestedDonorAssetEntry[],
  overwrite: boolean
): Promise<{
  status: "packaged" | "blocked" | "skipped";
  packageManifestPath: string;
  packageGraphPath: string;
  packageFamilyCount: number;
  packageReferencedUrlCount: number;
  packageGraphNodeCount: number;
  packageGraphEdgeCount: number;
  packageUnresolvedCount: number;
}> {
  const hostStats = new Map<string, { discoveredUrlCount: number; downloadedAssetCount: number; failedAssetCount: number }>();
  const familyStats = new Map<string, { category: DiscoveredDonorUrl["category"]; discoveredUrlCount: number; downloadedAssetCount: number; sampleUrl: string }>();
  const downloadedSourceUrls = new Set(entries.filter((entry) => entry.status === "downloaded").map((entry) => entry.sourceUrl));

  for (const discoveredUrl of discoveredUrls) {
    let host = "(invalid-url)";
    try {
      host = new URL(discoveredUrl.url).host || "(no-host)";
    } catch {
      // keep invalid marker
    }

    const hostEntry = hostStats.get(host) ?? { discoveredUrlCount: 0, downloadedAssetCount: 0, failedAssetCount: 0 };
    hostEntry.discoveredUrlCount += 1;
    if (downloadedSourceUrls.has(discoveredUrl.url)) {
      hostEntry.downloadedAssetCount += 1;
    }
    hostStats.set(host, hostEntry);

    const familyKey = buildPackageFamilyKey(discoveredUrl.url, discoveredUrl.category);
    const familyEntry = familyStats.get(familyKey) ?? {
      category: discoveredUrl.category,
      discoveredUrlCount: 0,
      downloadedAssetCount: 0,
      sampleUrl: discoveredUrl.url
    };
    familyEntry.discoveredUrlCount += 1;
    if (downloadedSourceUrls.has(discoveredUrl.url)) {
      familyEntry.downloadedAssetCount += 1;
    }
    familyStats.set(familyKey, familyEntry);
  }

  for (const entry of entries) {
    if (entry.status !== "failed") {
      continue;
    }
    let host = "(invalid-url)";
    try {
      host = new URL(entry.resolvedUrl ?? entry.sourceUrl).host || "(no-host)";
    } catch {
      // keep invalid marker
    }
    const hostEntry = hostStats.get(host) ?? { discoveredUrlCount: 0, downloadedAssetCount: 0, failedAssetCount: 0 };
    hostEntry.failedAssetCount += 1;
    hostStats.set(host, hostEntry);
  }

  const downloadedAssetCount = entries.filter((entry) => entry.status === "downloaded").length;
  const failedAssetCount = entries.filter((entry) => entry.status === "failed").length;
  const skippedAssetCount = entries.filter((entry) => entry.status === "skipped").length;
  const packageStatus: "packaged" | "blocked" | "skipped" = entries.length === 0
    ? "skipped"
    : downloadedAssetCount > 0
      ? "packaged"
      : "blocked";

  const hostSummary = [...hostStats.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([host, stats]) => ({ host, ...stats }));
  const familySummary = [...familyStats.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([familyKey, stats]) => ({ familyKey, ...stats }));
  const graphEntryMap = new Map(entries.map((entry) => [entry.sourceUrl, entry]));
  const graphEdges = discoveredUrls
    .filter((entry) => typeof entry.discoveredFromUrl === "string" && entry.discoveredFromUrl.length > 0)
    .map((entry) => ({
      fromUrl: entry.discoveredFromUrl as string,
      toUrl: entry.url,
      discoverySource: entry.source,
      depth: entry.depth ?? 0,
      category: entry.category
    }))
    .sort((left, right) => {
      if (left.fromUrl === right.fromUrl) {
        return left.toUrl.localeCompare(right.toUrl);
      }
      return left.fromUrl.localeCompare(right.fromUrl);
    });
  const outboundReferenceCounts = new Map<string, number>();
  const inboundReferenceCounts = new Map<string, number>();
  for (const edge of graphEdges) {
    outboundReferenceCounts.set(edge.fromUrl, (outboundReferenceCounts.get(edge.fromUrl) ?? 0) + 1);
    inboundReferenceCounts.set(edge.toUrl, (inboundReferenceCounts.get(edge.toUrl) ?? 0) + 1);
  }
  const graphNodes: DonorPackageGraphNode[] = discoveredUrls.map((discoveredUrl) => {
    const graphEntry = graphEntryMap.get(discoveredUrl.url);
    let host = "(invalid-url)";
    try {
      host = new URL(discoveredUrl.url).host || "(no-host)";
    } catch {
      // keep invalid marker
    }
    return {
      url: discoveredUrl.url,
      category: discoveredUrl.category,
      discoverySource: discoveredUrl.source,
      depth: discoveredUrl.depth ?? 0,
      discoveredFromUrl: discoveredUrl.discoveredFromUrl,
      host,
      downloadStatus: graphEntry?.status ?? "inventory-only",
      localPath: graphEntry?.localPath,
      contentType: graphEntry?.contentType,
      sizeBytes: graphEntry?.sizeBytes,
      sha256: graphEntry?.sha256,
      outboundReferenceCount: outboundReferenceCounts.get(discoveredUrl.url) ?? 0,
      inboundReferenceCount: inboundReferenceCounts.get(discoveredUrl.url) ?? 0
    };
  });
  const unresolvedEntries = entries
    .filter((entry) => entry.status !== "downloaded")
    .map((entry) => ({
      sourceUrl: entry.sourceUrl,
      resolvedUrl: entry.resolvedUrl,
      category: entry.category,
      status: entry.status,
      reason: entry.reason,
      depth: entry.depth,
      discoveredFromUrl: entry.discoveredFromUrl
    }))
    .slice(0, 50);

  await writeFileConditionally(paths.packageManifestPath, `${JSON.stringify({
    schemaVersion: "0.1.0",
    donorId,
    donorName,
    packageStatus,
    sourceHost,
    generatedAt: new Date().toISOString(),
    launchUrl,
    resolvedLaunchUrl,
    discoveredUrlCount: discoveredUrls.length,
    downloadedAssetCount,
    failedAssetCount,
    skippedAssetCount,
    recursiveHarvestDepthLimit,
    downloadedByCategory: sortRecordByKey(categorizeDownloadedEntries(entries)),
    entryPoints: {
      scripts: buildEntryPointList(discoveredUrls, "script"),
      styles: buildEntryPointList(discoveredUrls, "style"),
      json: buildEntryPointList(discoveredUrls, "json")
    },
    hosts: hostSummary,
    assetFamilies: familySummary,
    packageGraphPath: path.relative(workspaceRoot, paths.packageGraphPath).replace(/\\/g, "/"),
    packageGraphNodeCount: graphNodes.length,
    packageGraphEdgeCount: graphEdges.length,
    packageUnresolvedCount: unresolvedEntries.length,
    unresolvedEntries
  }, null, 2)}\n`, overwrite);
  await writeFileConditionally(paths.packageGraphPath, `${JSON.stringify({
    schemaVersion: "0.1.0",
    donorId,
    donorName,
    packageStatus,
    generatedAt: new Date().toISOString(),
    launchUrl,
    resolvedLaunchUrl,
    nodeCount: graphNodes.length,
    edgeCount: graphEdges.length,
    unresolvedNodeCount: unresolvedEntries.length,
    rootNodeCount: graphNodes.filter((node) => node.depth === 0).length,
    nodes: graphNodes,
    edges: graphEdges
  }, null, 2)}\n`, overwrite);

  return {
    status: packageStatus,
    packageManifestPath: paths.packageManifestPath,
    packageGraphPath: paths.packageGraphPath,
    packageFamilyCount: familySummary.length,
    packageReferencedUrlCount: discoveredUrls.length,
    packageGraphNodeCount: graphNodes.length,
    packageGraphEdgeCount: graphEdges.length,
    packageUnresolvedCount: unresolvedEntries.length
  };
}

function shouldExtractRecursiveReferences(entry: DiscoveredDonorUrl, contentType?: string | null): boolean {
  if (["script", "style", "json"].includes(entry.category)) {
    return true;
  }

  if (!contentType) {
    return false;
  }

  return /(javascript|ecmascript|json|css)/i.test(contentType);
}

function mapRecursiveSource(category: DiscoveredDonorUrl["category"]): DiscoveredDonorUrl["source"] {
  if (category === "script") {
    return "harvest-script";
  }
  if (category === "style") {
    return "harvest-style";
  }
  return "harvest-json";
}

function collectReferenceCandidates(rawText: string): string[] {
  const candidates = new Set<string>();

  const absoluteUrlPattern = /https?:\/\/[^\s"'<>\\)]+/gi;
  let absoluteMatch: RegExpExecArray | null;
  while ((absoluteMatch = absoluteUrlPattern.exec(rawText)) !== null) {
    candidates.add(absoluteMatch[0]);
  }

  const cssUrlPattern = /url\((['"]?)([^"'()]+)\1\)/gi;
  let cssMatch: RegExpExecArray | null;
  while ((cssMatch = cssUrlPattern.exec(rawText)) !== null) {
    candidates.add(cssMatch[2]);
  }

  const quotedPathPattern = /["'`]((?:\/|\.{1,2}\/)[^"'`<>\s\\]+|(?:[a-z0-9._-]+\/)+[a-z0-9._-]+\.(?:js|css|json|atlas|plist|png|jpe?g|gif|svg|webp|ogg|mp3|wav|m4a|mp4|webm|mov|woff2?|ttf|otf|skel|xml|fnt)(?:\?[^"'`<>\s\\]+)?|\/api\/[^"'`<>\s\\]+)["'`]/gi;
  let quotedMatch: RegExpExecArray | null;
  while ((quotedMatch = quotedPathPattern.exec(rawText)) !== null) {
    candidates.add(quotedMatch[1]);
  }

  return [...candidates];
}

function extractReferencedUrlsFromText(
  rawText: string,
  resolvedAssetUrl: string,
  entry: DiscoveredDonorUrl
): DiscoveredDonorUrl[] {
  const baseUrl = new URL(resolvedAssetUrl);
  const sanitizedParentUrl = sanitizeStoredUrl(resolvedAssetUrl);
  const result = new Map<string, DiscoveredDonorUrl>();
  const nextDepth = (entry.depth ?? 0) + 1;

  for (const candidateValue of collectReferenceCandidates(rawText)) {
    const normalized = normalizeDiscoveredUrl(candidateValue, baseUrl);
    if (!normalized) {
      continue;
    }

    const sanitized = sanitizeStoredUrl(normalized.toString());
    if (!sanitized || sanitized === sanitizedParentUrl) {
      continue;
    }

    if (!result.has(sanitized)) {
      result.set(sanitized, {
        url: sanitized,
        category: classifyUrl(normalized),
        source: mapRecursiveSource(entry.category),
        depth: nextDepth,
        discoveredFromUrl: sanitizedParentUrl
      });
    }
  }

  return sortDiscoveredUrls([...result.values()]);
}

async function harvestDiscoveredAssets(
  donorId: string,
  donorName: string,
  discoveredUrls: readonly DiscoveredDonorUrl[],
  paths: ReturnType<typeof buildDonorPaths>,
  overwrite: boolean
): Promise<DonorAssetHarvestResult> {
  const entries: HarvestedDonorAssetEntry[] = [];
  const discoveredUrlMap = new Map<string, DiscoveredDonorUrl>();
  const queue: DiscoveredDonorUrl[] = [];
  const seenQueueUrls = new Set<string>();

  for (const entry of discoveredUrls) {
    if (!discoveredUrlMap.has(entry.url)) {
      discoveredUrlMap.set(entry.url, {
        ...entry,
        depth: entry.depth ?? 0
      });
      queue.push({
        ...entry,
        depth: entry.depth ?? 0
      });
      seenQueueUrls.add(entry.url);
    }
  }

  while (queue.length > 0) {
    const entry = queue.shift()!;
    if (!shouldHarvestDiscoveredUrl(entry)) {
      entries.push({
        sourceUrl: entry.url,
        category: entry.category,
        discoverySource: entry.source,
        depth: entry.depth,
        discoveredFromUrl: entry.discoveredFromUrl,
        status: "skipped",
        reason: "Only bounded static asset categories are downloaded. API and other references stay inventory-only."
      });
      continue;
    }

    try {
      const response = await fetch(entry.url, {
        redirect: "follow",
        headers: {
          "user-agent": "MyIDE Donor Harvest/0.1"
        },
        signal: AbortSignal.timeout(20000)
      });

      if (!response.ok) {
        entries.push({
          sourceUrl: entry.url,
          resolvedUrl: sanitizeStoredUrl(response.url || entry.url),
          category: entry.category,
          discoverySource: entry.source,
          depth: entry.depth,
          discoveredFromUrl: entry.discoveredFromUrl,
          status: "failed",
          reason: `HTTP ${response.status}`
        });
        continue;
      }

      const resolvedUrl = sanitizeStoredUrl(response.url || entry.url);
      const buffer = Buffer.from(await response.arrayBuffer());
      const filePath = buildHarvestFilePath(paths.localOnlyHarvestFilesRoot, resolvedUrl);
      await writeBufferConditionally(filePath, buffer, overwrite);
      const contentType = response.headers.get("content-type") ?? undefined;
      entries.push({
        sourceUrl: entry.url,
        resolvedUrl,
        category: entry.category,
        discoverySource: entry.source,
        depth: entry.depth,
        discoveredFromUrl: entry.discoveredFromUrl,
        status: "downloaded",
        localPath: path.relative(workspaceRoot, filePath).replace(/\\/g, "/"),
        contentType,
        sizeBytes: buffer.length,
        sha256: createHash("sha256").update(buffer).digest("hex")
      });

      if (typeof entry.depth === "number" && entry.depth >= recursiveHarvestDepthLimit) {
        continue;
      }

      if (!shouldExtractRecursiveReferences(entry, contentType)) {
        continue;
      }

      const nestedDiscoveredUrls = extractReferencedUrlsFromText(buffer.toString("utf8"), response.url || entry.url, entry);
      for (const nestedEntry of nestedDiscoveredUrls) {
        if (discoveredUrlMap.has(nestedEntry.url)) {
          continue;
        }

        discoveredUrlMap.set(nestedEntry.url, nestedEntry);
        if (!seenQueueUrls.has(nestedEntry.url)) {
          queue.push(nestedEntry);
          seenQueueUrls.add(nestedEntry.url);
        }
      }
    } catch (error) {
      entries.push({
        sourceUrl: entry.url,
        category: entry.category,
        discoverySource: entry.source,
        depth: entry.depth,
        discoveredFromUrl: entry.discoveredFromUrl,
        status: "failed",
        reason: error instanceof Error ? error.message : String(error)
      });
    }
  }

  const harvestedAssetCount = entries.filter((entry) => entry.status === "downloaded").length;
  const failedAssetCount = entries.filter((entry) => entry.status === "failed").length;
  const skippedAssetCount = entries.filter((entry) => entry.status === "skipped").length;
  const attemptedAssetCount = entries.filter((entry) => entry.status !== "skipped").length;
  const status: DonorAssetHarvestResult["status"] = attemptedAssetCount === 0
    ? "skipped"
    : harvestedAssetCount > 0
      ? "harvested"
      : "blocked";
  const allDiscoveredUrls = sortDiscoveredUrls([...discoveredUrlMap.values()]);
  const recursiveDiscoveredUrlCount = allDiscoveredUrls.filter((entry) => (entry.depth ?? 0) > 0).length;

  await writeFileConditionally(paths.harvestManifestPath, `${JSON.stringify({
    schemaVersion: "0.1.0",
    donorId,
    donorName,
    capturedAt: new Date().toISOString(),
    discoveredUrlCount: allDiscoveredUrls.length,
    recursiveDiscoveredUrlCount,
    recursiveHarvestDepthLimit,
    attemptedAssetCount,
    harvestedAssetCount,
    skippedAssetCount,
    failedAssetCount,
    discoveredUrls: allDiscoveredUrls,
    entries
  }, null, 2)}\n`, overwrite);

  return {
    status,
    manifestPath: paths.harvestManifestPath,
    discoveredUrls: allDiscoveredUrls,
    entries,
    attemptedAssetCount,
    harvestedAssetCount,
    skippedAssetCount,
    failedAssetCount
  };
}

function buildIntakeReport(result: DonorIntakeResult, donorName: string): string {
  const lines = [
    "# Donor Intake Report",
    "",
    `- Donor ID: \`${result.donorId}\``,
    `- Donor name: ${donorName}`,
    `- Intake status: \`${result.status}\``
  ];

  if (result.launchUrl) {
    lines.push(`- Launch URL (sanitized): \`${result.launchUrl}\``);
  }
  if (result.resolvedLaunchUrl) {
    lines.push(`- Resolved launch URL (sanitized): \`${result.resolvedLaunchUrl}\``);
  }
  if (result.sourceHost) {
    lines.push(`- Source host: \`${result.sourceHost}\``);
  }

  lines.push(`- Discovered URL count: ${result.discoveredUrlCount}`);
  lines.push(`- Evidence root: \`${path.relative(workspaceRoot, result.evidenceRoot)}\``);
  lines.push(`- Bootstrap HTML path: \`${result.bootstrapHtmlPath ? path.relative(workspaceRoot, result.bootstrapHtmlPath) : "not captured"}\``);
  lines.push(`- URL inventory path: \`${result.discoveredUrlsPath ? path.relative(workspaceRoot, result.discoveredUrlsPath) : "not captured"}\``);
  if (result.harvestStatus) {
    lines.push(`- Harvest status: \`${result.harvestStatus}\``);
    lines.push(`- Harvest manifest path: \`${result.harvestManifestPath ? path.relative(workspaceRoot, result.harvestManifestPath) : "not captured"}\``);
    lines.push(`- Harvest attempted assets: ${result.attemptedAssetCount ?? 0}`);
    lines.push(`- Harvested assets: ${result.harvestedAssetCount ?? 0}`);
    lines.push(`- Failed assets: ${result.failedAssetCount ?? 0}`);
    lines.push(`- Skipped assets: ${result.skippedAssetCount ?? 0}`);
  }
  if (result.packageStatus) {
    lines.push(`- Package status: \`${result.packageStatus}\``);
    lines.push(`- Package manifest path: \`${result.packageManifestPath ? path.relative(workspaceRoot, result.packageManifestPath) : "not captured"}\``);
    lines.push(`- Package graph path: \`${result.packageGraphPath ? path.relative(workspaceRoot, result.packageGraphPath) : "not captured"}\``);
    lines.push(`- Package families: ${result.packageFamilyCount ?? 0}`);
    lines.push(`- Package referenced URLs: ${result.packageReferencedUrlCount ?? 0}`);
    lines.push(`- Package graph nodes: ${result.packageGraphNodeCount ?? 0}`);
    lines.push(`- Package graph edges: ${result.packageGraphEdgeCount ?? 0}`);
    lines.push(`- Package unresolved entries: ${result.packageUnresolvedCount ?? 0}`);
  }
  if (result.scanStatus) {
    lines.push(`- Scan status: \`${result.scanStatus}\``);
    lines.push(`- Scan summary path: \`${result.scanSummaryPath ? path.relative(workspaceRoot, result.scanSummaryPath) : "not captured"}\``);
    lines.push(`- Blocker summary path: \`${result.blockerSummaryPath ? path.relative(workspaceRoot, result.blockerSummaryPath) : "not captured"}\``);
    lines.push(`- Next capture targets path: \`${result.nextCaptureTargetsPath ? path.relative(workspaceRoot, result.nextCaptureTargetsPath) : "not captured"}\``);
    lines.push(`- Runtime candidate count: ${result.runtimeCandidateCount ?? 0}`);
    lines.push(`- Atlas metadata count: ${result.atlasManifestCount ?? 0}`);
    lines.push(`- Bundle asset-map status: \`${result.bundleAssetMapStatus ?? "unknown"}\``);
    lines.push(`- Bundle image variants: \`${result.bundleImageVariantStatus ?? "unknown"}\` (${result.bundleImageVariantCount ?? 0} logical entries / ${result.bundleImageVariantSuffixCount ?? 0} suffix tokens)`);
    lines.push(`- Mirror candidate status: \`${result.mirrorCandidateStatus ?? "unknown"}\``);
    lines.push(`- Next capture target count: ${result.nextCaptureTargetCount ?? 0}`);
    lines.push(`- Next operator action: ${result.nextOperatorAction ?? "not recorded"}`);
  }

  if (result.error) {
    lines.push(`- Error: ${result.error}`);
  }

  lines.push(
    "",
    "## What this proves",
    "",
    result.status === "captured"
      ? (result.harvestStatus === "harvested"
        ? "- The donor entry page was fetched, a donor URL inventory was written locally, bounded recursive static assets were downloaded into the local-only donor pack, and a package-level manifest now summarizes the captured donor surface."
        : "- The donor entry page was fetched and a first-pass URL inventory was written locally.")
      : result.status === "blocked"
        ? "- The donor pack scaffold exists, but the first donor launch capture failed and needs investigation."
        : "- The donor pack scaffold exists, but no launch URL was supplied yet.",
    "",
    "## Next steps",
    "",
    "- Verify the donor launch URL and add capture sessions under `evidence/capture_sessions/`.",
    "- Review the donor scan summary under `evidence/local_only/harvest/` to see runtime candidates, atlas metadata, bundle asset-map status, and the next operator action.",
    "- Promote grounded findings into donor reports before claiming runtime parity.",
    "- Keep raw donor bootstrap files read-only once captured."
  );

  return `${lines.join("\n")}\n`;
}

export async function bootstrapDonorIntake(options: BootstrapDonorIntakeOptions): Promise<DonorIntakeResult> {
  const donorId = options.donorId.trim();
  const donorName = options.donorName.trim() || donorId;
  const donorLaunchUrl = options.donorLaunchUrl?.trim() ?? "";
  const harvestAssets = options.harvestAssets !== false;
  const overwrite = Boolean(options.overwrite);
  const paths = await ensureDonorScaffold(donorId, donorName, overwrite);

  const baseResult: DonorIntakeResult = {
    status: donorLaunchUrl ? "blocked" : "skipped",
    donorId,
    donorRoot: paths.donorRoot,
    evidenceRoot: paths.evidenceRoot,
    reportPath: paths.reportPath,
    launchUrl: donorLaunchUrl ? sanitizeStoredUrl(donorLaunchUrl) : undefined,
    sourceHost: donorLaunchUrl ? (() => {
      try {
        return new URL(donorLaunchUrl).host;
      } catch {
        return undefined;
      }
    })() : undefined,
    bootstrapHtmlPath: donorLaunchUrl ? paths.bootstrapHtmlPath : undefined,
    discoveredUrlsPath: donorLaunchUrl ? paths.discoveredUrlsPath : undefined,
    discoveredUrlCount: 0,
    harvestStatus: donorLaunchUrl && harvestAssets ? "blocked" : "skipped",
    harvestManifestPath: donorLaunchUrl && harvestAssets ? paths.harvestManifestPath : undefined,
    packageStatus: donorLaunchUrl && harvestAssets ? "blocked" : "skipped",
    packageManifestPath: donorLaunchUrl && harvestAssets ? paths.packageManifestPath : undefined,
    packageGraphPath: donorLaunchUrl && harvestAssets ? paths.packageGraphPath : undefined,
    packageFamilyCount: 0,
    packageReferencedUrlCount: 0,
    packageGraphNodeCount: 0,
    packageGraphEdgeCount: 0,
    packageUnresolvedCount: 0,
    scanStatus: donorLaunchUrl && harvestAssets ? "blocked" : "skipped",
    scanSummaryPath: donorLaunchUrl && harvestAssets ? path.join(paths.localOnlyHarvestRoot, "scan-summary.json") : undefined,
    blockerSummaryPath: donorLaunchUrl && harvestAssets ? path.join(paths.localOnlyHarvestRoot, "blocker-summary.md") : undefined,
    nextCaptureTargetsPath: donorLaunchUrl && harvestAssets ? path.join(paths.localOnlyHarvestRoot, "next-capture-targets.json") : undefined,
    runtimeCandidateCount: 0,
    atlasManifestCount: 0,
    bundleAssetMapStatus: donorLaunchUrl && harvestAssets ? "blocked" : "skipped",
    bundleImageVariantStatus: donorLaunchUrl && harvestAssets ? "blocked" : "skipped",
    bundleImageVariantCount: 0,
    bundleImageVariantSuffixCount: 0,
    mirrorCandidateStatus: donorLaunchUrl && harvestAssets ? "blocked" : "blocked",
    nextCaptureTargetCount: 0,
    attemptedAssetCount: 0,
    harvestedAssetCount: 0,
    skippedAssetCount: 0,
    failedAssetCount: 0
  };

  if (!donorLaunchUrl) {
    await writeFileConditionally(paths.reportPath, buildIntakeReport(baseResult, donorName), overwrite);
    return baseResult;
  }

  try {
    const response = await fetch(donorLaunchUrl, {
      redirect: "follow",
      headers: {
        "user-agent": "MyIDE Donor Intake/0.1"
      }
    });

    const html = await response.text();
    if (!response.ok) {
      throw new Error(`Launch fetch failed with HTTP ${response.status}`);
    }

    const resolvedLaunchUrl = sanitizeStoredUrl(response.url || donorLaunchUrl);
    let discoveredUrls = extractDiscoveredUrls(html, donorLaunchUrl, response.url || donorLaunchUrl);
    const result: DonorIntakeResult = {
      ...baseResult,
      status: "captured",
      resolvedLaunchUrl,
      sourceHost: (() => {
        try {
          return new URL(response.url || donorLaunchUrl).host;
        } catch {
          return baseResult.sourceHost;
        }
      })(),
      discoveredUrlCount: discoveredUrls.length
    };

    let harvestResult: DonorAssetHarvestResult | null = null;
    if (harvestAssets) {
      harvestResult = await harvestDiscoveredAssets(donorId, donorName, discoveredUrls, paths, overwrite);
      discoveredUrls = harvestResult.discoveredUrls;
      result.discoveredUrlCount = discoveredUrls.length;
      const packageResult = await writeDonorPackageManifest(
        donorId,
        donorName,
        result.sourceHost,
        sanitizeStoredUrl(donorLaunchUrl),
        resolvedLaunchUrl,
        paths,
        discoveredUrls,
        harvestResult.entries,
        overwrite
      );
      result.harvestStatus = harvestResult.status;
      result.harvestManifestPath = harvestResult.manifestPath;
      result.packageStatus = packageResult.status;
      result.packageManifestPath = packageResult.packageManifestPath;
      result.packageGraphPath = packageResult.packageGraphPath;
      result.packageFamilyCount = packageResult.packageFamilyCount;
      result.packageReferencedUrlCount = packageResult.packageReferencedUrlCount;
      result.packageGraphNodeCount = packageResult.packageGraphNodeCount;
      result.packageGraphEdgeCount = packageResult.packageGraphEdgeCount;
      result.packageUnresolvedCount = packageResult.packageUnresolvedCount;
      const scanResult = await runDonorScan({
        donorId,
        donorName,
        launchUrl: sanitizeStoredUrl(donorLaunchUrl),
        resolvedLaunchUrl,
        sourceHost: result.sourceHost
      });
      result.scanStatus = scanResult.status;
      result.scanSummaryPath = scanResult.scanSummaryPath;
      result.blockerSummaryPath = scanResult.blockerSummaryPath;
      result.nextCaptureTargetsPath = scanResult.nextCaptureTargetsPath;
      result.runtimeCandidateCount = scanResult.runtimeCandidateCount;
      result.atlasManifestCount = scanResult.atlasManifestCount;
      result.bundleAssetMapStatus = scanResult.bundleAssetMapStatus;
      result.bundleImageVariantStatus = scanResult.bundleImageVariantStatus;
      result.bundleImageVariantCount = scanResult.bundleImageVariantCount;
      result.bundleImageVariantSuffixCount = scanResult.bundleImageVariantSuffixCount;
      result.mirrorCandidateStatus = scanResult.mirrorCandidateStatus;
      result.nextCaptureTargetCount = scanResult.nextCaptureTargetCount;
      result.nextOperatorAction = scanResult.nextOperatorAction;
      result.attemptedAssetCount = harvestResult.attemptedAssetCount;
      result.harvestedAssetCount = harvestResult.harvestedAssetCount;
      result.skippedAssetCount = harvestResult.skippedAssetCount;
      result.failedAssetCount = harvestResult.failedAssetCount;
    } else {
      result.harvestStatus = "skipped";
      result.packageStatus = "skipped";
      result.scanStatus = "skipped";
    }

    await Promise.all([
      writeFileConditionally(paths.requestPath, `${JSON.stringify({
        requestedUrl: sanitizeStoredUrl(donorLaunchUrl),
        resolvedUrl: resolvedLaunchUrl,
        status: response.status,
        ok: response.ok,
        capturedAt: new Date().toISOString(),
        contentType: response.headers.get("content-type")
      }, null, 2)}\n`, overwrite),
      writeFileConditionally(paths.bootstrapHtmlPath, `${sanitizeUrlsInText(html)}\n`, overwrite),
      writeFileConditionally(paths.discoveredUrlsPath, `${JSON.stringify({
        schemaVersion: "0.1.0",
        donorId,
        donorName,
        launchUrl: sanitizeStoredUrl(donorLaunchUrl),
        resolvedLaunchUrl,
        discoveredUrls
      }, null, 2)}\n`, overwrite),
      writeFileConditionally(paths.reportPath, buildIntakeReport(result, donorName), overwrite)
    ]);

    return result;
  } catch (error) {
    const failedResult: DonorIntakeResult = {
      ...baseResult,
      status: "blocked",
      error: error instanceof Error ? error.message : String(error)
    };
    await writeFileConditionally(paths.reportPath, buildIntakeReport(failedResult, donorName), overwrite);
    return failedResult;
  }
}
