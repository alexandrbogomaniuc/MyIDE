import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

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
  attemptedAssetCount: number;
  harvestedAssetCount: number;
  skippedAssetCount: number;
  failedAssetCount: number;
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
    harvestManifestPath: path.join(donorRoot, "evidence", "local_only", "harvest", "asset-manifest.json")
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

  const quotedPathPattern = /["'`]((?:\/|\.{1,2}\/)[^"'`<>\s\\]+|(?:[a-z0-9._-]+\/)+[a-z0-9._-]+\.(?:js|css|json|png|jpe?g|gif|svg|webp|ogg|mp3|wav|m4a|mp4|webm|mov|woff2?|ttf|otf)(?:\?[^"'`<>\s\\]+)?|\/api\/[^"'`<>\s\\]+)["'`]/gi;
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

  if (result.error) {
    lines.push(`- Error: ${result.error}`);
  }

  lines.push(
    "",
    "## What this proves",
    "",
    result.status === "captured"
      ? (result.harvestStatus === "harvested"
        ? "- The donor entry page was fetched, a donor URL inventory was written locally, and bounded recursive static assets were downloaded into the local-only donor pack."
        : "- The donor entry page was fetched and a first-pass URL inventory was written locally.")
      : result.status === "blocked"
        ? "- The donor pack scaffold exists, but the first donor launch capture failed and needs investigation."
        : "- The donor pack scaffold exists, but no launch URL was supplied yet.",
    "",
    "## Next steps",
    "",
    "- Verify the donor launch URL and add capture sessions under `evidence/capture_sessions/`.",
    "- Review the harvested asset manifest under `evidence/local_only/harvest/` and decide which missing assets still require deeper runtime-aware capture.",
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
      result.harvestStatus = harvestResult.status;
      result.harvestManifestPath = harvestResult.manifestPath;
      result.attemptedAssetCount = harvestResult.attemptedAssetCount;
      result.harvestedAssetCount = harvestResult.harvestedAssetCount;
      result.skippedAssetCount = harvestResult.skippedAssetCount;
      result.failedAssetCount = harvestResult.failedAssetCount;
    } else {
      result.harvestStatus = "skipped";
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
