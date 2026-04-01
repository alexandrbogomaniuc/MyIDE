import { promises as fs } from "node:fs";
import path from "node:path";

export type DonorUrlCategory =
  | "html"
  | "script"
  | "style"
  | "image"
  | "audio"
  | "video"
  | "font"
  | "json"
  | "api"
  | "other";

export type DonorScanState = "scanned" | "blocked" | "skipped";
export type BundleAssetMapStatus = "mapped" | "blocked" | "skipped";
export type MirrorCandidateStatus = "strong-partial" | "weak-partial" | "blocked";
export type ReferenceConfidence = "confirmed" | "likely" | "provisional";
export type CaptureTargetPriority = "immediate" | "high" | "medium";

export interface DiscoveredDonorUrl {
  url: string;
  category: DonorUrlCategory;
  source: "launch-url" | "html-attribute" | "html-inline" | "harvest-script" | "harvest-style" | "harvest-json";
  depth?: number;
  discoveredFromUrl?: string;
}

export interface HarvestedDonorAssetEntry {
  sourceUrl: string;
  resolvedUrl?: string;
  category: DonorUrlCategory;
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

export interface HarvestManifestFile {
  schemaVersion?: string;
  donorId?: string;
  donorName?: string;
  capturedAt?: string;
  discoveredUrlCount?: number;
  recursiveDiscoveredUrlCount?: number;
  recursiveHarvestDepthLimit?: number;
  attemptedAssetCount?: number;
  harvestedAssetCount?: number;
  skippedAssetCount?: number;
  failedAssetCount?: number;
  discoveredUrls?: DiscoveredDonorUrl[];
  entries?: HarvestedDonorAssetEntry[];
}

export interface DonorPackageGraphNode {
  url?: string;
  category?: string;
  discoverySource?: string;
  depth?: number;
  discoveredFromUrl?: string;
  host?: string;
  downloadStatus?: string;
  localPath?: string;
  contentType?: string;
  sizeBytes?: number;
  sha256?: string;
  outboundReferenceCount?: number;
  inboundReferenceCount?: number;
}

export interface DonorPackageGraphEdge {
  fromUrl?: string;
  toUrl?: string;
  discoverySource?: string;
  depth?: number;
  category?: string;
}

export interface DonorPackageGraphFile {
  schemaVersion?: string;
  donorId?: string;
  donorName?: string;
  packageStatus?: string;
  generatedAt?: string;
  launchUrl?: string;
  resolvedLaunchUrl?: string;
  nodeCount?: number;
  edgeCount?: number;
  unresolvedNodeCount?: number;
  rootNodeCount?: number;
  nodes?: DonorPackageGraphNode[];
  edges?: DonorPackageGraphEdge[];
}

export interface DonorPackageManifestFile {
  schemaVersion?: string;
  donorId?: string;
  donorName?: string;
  packageStatus?: string;
  sourceHost?: string;
  generatedAt?: string;
  launchUrl?: string;
  resolvedLaunchUrl?: string;
  discoveredUrlCount?: number;
  downloadedAssetCount?: number;
  failedAssetCount?: number;
  skippedAssetCount?: number;
  recursiveHarvestDepthLimit?: number;
  downloadedByCategory?: Record<string, number>;
  entryPoints?: {
    scripts?: string[];
    styles?: string[];
    json?: string[];
  };
  hosts?: Array<Record<string, unknown>>;
  assetFamilies?: Array<Record<string, unknown>>;
  packageGraphPath?: string;
  packageGraphNodeCount?: number;
  packageGraphEdgeCount?: number;
  packageUnresolvedCount?: number;
  unresolvedEntries?: Array<Record<string, unknown>>;
}

export interface DonorScanPaths {
  donorRoot: string;
  harvestRoot: string;
  assetManifestPath: string;
  packageManifestPath: string;
  packageGraphPath: string;
  entryPointsPath: string;
  urlInventoryPath: string;
  runtimeCandidatesPath: string;
  bundleAssetMapPath: string;
  atlasManifestsPath: string;
  nextCaptureTargetsPath: string;
  captureRunPath: string;
  blockerSummaryPath: string;
  scanSummaryPath: string;
}

export interface BundleAssetMapReference {
  bundleSourceUrl: string;
  bundleLocalPath: string;
  referenceText: string;
  resolvedUrl: string | null;
  category: string;
  confidence: ReferenceConfidence;
  localStatus: "downloaded" | "inventory-only" | "missing";
  localPath: string | null;
}

export interface BundleAssetMapFile {
  schemaVersion: string;
  donorId: string;
  donorName: string;
  generatedAt: string;
  status: BundleAssetMapStatus;
  bundleCount: number;
  referenceCount: number;
  countsByConfidence: Record<ReferenceConfidence, number>;
  countsByCategory: Record<string, number>;
  bundles: Array<{
    sourceUrl: string;
    localPath: string;
    referenceCount: number;
  }>;
  references: BundleAssetMapReference[];
}

export interface AtlasManifestRecord {
  sourceUrl: string;
  localPath: string;
  kind: "atlas-text" | "sprite-sheet-json" | "spine-json" | "plist";
  frameCount: number | null;
  regionCount: number | null;
  animationCount: number | null;
  pageRefs: string[];
  localPagePaths: string[];
  missingPageUrls: string[];
  notes: string[];
}

export interface AtlasManifestFile {
  schemaVersion: string;
  donorId: string;
  donorName: string;
  generatedAt: string;
  atlasTextCount: number;
  spriteSheetJsonCount: number;
  plistCount: number;
  spineJsonCount: number;
  frameManifestCount: number;
  missingPageCount: number;
  manifests: AtlasManifestRecord[];
}

export interface RuntimeCandidateRecord {
  kind: "launch-html" | "runtime-script" | "runtime-style" | "runtime-metadata" | "bundle-reference" | "host-root";
  url: string;
  confidence: ReferenceConfidence;
  localStatus: "downloaded" | "inventory-only" | "missing";
  localPath: string | null;
  category: string;
  note: string | null;
}

export interface RuntimeCandidatesFile {
  schemaVersion: string;
  donorId: string;
  donorName: string;
  generatedAt: string;
  fullLocalRuntimePackage: boolean;
  partialLocalRuntimePackage: boolean;
  mirrorCandidateStatus: MirrorCandidateStatus;
  entryPointCount: number;
  runtimeCandidateCount: number;
  mirrorCandidateCount: number;
  unresolvedDependencyCount: number;
  hostRoots: string[];
  runtimeEntryPoints: RuntimeCandidateRecord[];
  runtimeCandidates: RuntimeCandidateRecord[];
  unresolvedDependencies: RuntimeCandidateRecord[];
}

export interface DonorScanResult {
  status: DonorScanState;
  donorId: string;
  donorName: string;
  entryPointsPath: string;
  urlInventoryPath: string;
  runtimeCandidatesPath: string;
  bundleAssetMapPath: string;
  atlasManifestsPath: string;
  blockerSummaryPath: string;
  scanSummaryPath: string;
  nextCaptureTargetsPath: string;
  runtimeCandidateCount: number;
  atlasManifestCount: number;
  bundleAssetMapStatus: BundleAssetMapStatus;
  mirrorCandidateStatus: MirrorCandidateStatus;
  nextCaptureTargetCount: number;
  nextOperatorAction: string;
  blockerHighlights: string[];
}

export interface NextCaptureTargetRecord {
  rank: number;
  url: string;
  host: string;
  relativePath: string;
  kind: "atlas-page" | "runtime-metadata" | "runtime-script" | "bundle-asset" | "translation-payload";
  category: string;
  priority: CaptureTargetPriority;
  confidence: ReferenceConfidence;
  score: number;
  sourceCount: number;
  sourceLabels: string[];
  reason: string;
  blockers: string[];
}

export interface NextCaptureTargetsFile {
  schemaVersion: string;
  donorId: string;
  donorName: string;
  generatedAt: string;
  targetCount: number;
  countsByPriority: Record<CaptureTargetPriority, number>;
  targets: NextCaptureTargetRecord[];
}

export type CaptureRunStatus = "captured" | "partial" | "blocked" | "skipped";

export interface CaptureRunTargetResult {
  rank: number;
  url: string;
  relativePath: string;
  kind: string;
  priority: CaptureTargetPriority;
  status: "downloaded" | "failed" | "skipped";
  localPath: string | null;
  contentType: string | null;
  sizeBytes: number | null;
  reason: string | null;
}

export interface CaptureRunFile {
  schemaVersion: string;
  donorId: string;
  donorName: string;
  generatedAt: string;
  status: CaptureRunStatus;
  requestedLimit: number;
  targetCountBefore: number;
  targetCountAfter: number;
  attemptedCount: number;
  downloadedCount: number;
  failedCount: number;
  skippedCount: number;
  refreshedScanSummaryPath: string;
  refreshedNextCaptureTargetsPath: string;
  results: CaptureRunTargetResult[];
}

export interface UrlInventoryEntry {
  url: string;
  category: DonorUrlCategory;
  source: DiscoveredDonorUrl["source"];
  depth: number;
  discoveredFromUrl: string | null;
  localStatus: HarvestedDonorAssetEntry["status"] | "inventory-only";
  localPath: string | null;
  contentType: string | null;
  sizeBytes: number | null;
}

export const workspaceRoot = path.resolve(__dirname, "../../..");

export function buildDonorScanPaths(donorId: string): DonorScanPaths {
  const donorRoot = path.join(workspaceRoot, "10_donors", donorId);
  const harvestRoot = path.join(donorRoot, "evidence", "local_only", "harvest");
  return {
    donorRoot,
    harvestRoot,
    assetManifestPath: path.join(harvestRoot, "asset-manifest.json"),
    packageManifestPath: path.join(harvestRoot, "package-manifest.json"),
    packageGraphPath: path.join(harvestRoot, "package-graph.json"),
    entryPointsPath: path.join(harvestRoot, "entry-points.json"),
    urlInventoryPath: path.join(harvestRoot, "url-inventory.json"),
    runtimeCandidatesPath: path.join(harvestRoot, "runtime-candidates.json"),
    bundleAssetMapPath: path.join(harvestRoot, "bundle-asset-map.json"),
    atlasManifestsPath: path.join(harvestRoot, "atlas-manifests.json"),
    nextCaptureTargetsPath: path.join(harvestRoot, "next-capture-targets.json"),
    captureRunPath: path.join(harvestRoot, "next-capture-run.json"),
    blockerSummaryPath: path.join(harvestRoot, "blocker-summary.md"),
    scanSummaryPath: path.join(harvestRoot, "scan-summary.json")
  };
}

export async function readJsonFile<T>(filePath: string): Promise<T> {
  return JSON.parse(await fs.readFile(filePath, "utf8")) as T;
}

export async function readOptionalJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    return await readJsonFile<T>(filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException | undefined)?.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

export async function readOptionalTextFile(filePath: string): Promise<string | null> {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException | undefined)?.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function writeJsonFile(filePath: string, value: unknown): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export async function writeTextFile(filePath: string, value: string): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, value.endsWith("\n") ? value : `${value}\n`, "utf8");
}

export function toRepoRelativePath(filePath: string): string {
  return path.relative(workspaceRoot, filePath).replace(/\\/g, "/");
}

export function sanitizeCountRecord(record: Record<string, number>): Record<string, number> {
  return Object.fromEntries(
    Object.entries(record)
      .sort(([left], [right]) => left.localeCompare(right))
  );
}

export function uniqueStrings(values: readonly (string | null | undefined)[]): string[] {
  return Array.from(new Set(values.filter((value): value is string => typeof value === "string" && value.length > 0)));
}

export function normalizeCandidateUrl(candidate: string, baseUrl: string): string | null {
  const trimmed = candidate.trim();
  if (!trimmed || trimmed.startsWith("data:") || trimmed.startsWith("javascript:") || trimmed.startsWith("mailto:") || trimmed.startsWith("#")) {
    return null;
  }

  try {
    return new URL(trimmed, baseUrl).toString();
  } catch {
    return null;
  }
}

export function collectReferenceCandidates(rawText: string): string[] {
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

  const frameKeyPattern = /["'`]([a-z0-9_-]+\.(?:png|jpe?g|gif|svg|webp))["'`]/gi;
  let frameMatch: RegExpExecArray | null;
  while ((frameMatch = frameKeyPattern.exec(rawText)) !== null) {
    candidates.add(frameMatch[1]);
  }

  return [...candidates];
}

export function classifyReferenceCategory(urlString: string | null): string {
  if (!urlString) {
    return "other";
  }

  try {
    const parsed = new URL(urlString);
    const pathname = parsed.pathname.toLowerCase();
    if (parsed.host === "translations.bgaming-network.com") {
      return "translation";
    }
    if (pathname.endsWith(".js")) {
      return "script";
    }
    if (pathname.endsWith(".css")) {
      return "style";
    }
    if (pathname.endsWith(".json")) {
      return "json";
    }
    if (pathname.endsWith(".atlas")) {
      return "atlas";
    }
    if (pathname.endsWith(".plist")) {
      return "plist";
    }
    if (pathname.endsWith(".png") || pathname.endsWith(".jpg") || pathname.endsWith(".jpeg") || pathname.endsWith(".gif") || pathname.endsWith(".svg") || pathname.endsWith(".webp")) {
      return "image";
    }
    if (pathname.endsWith(".ogg") || pathname.endsWith(".mp3") || pathname.endsWith(".wav") || pathname.endsWith(".m4a")) {
      return "audio";
    }
    if (pathname.endsWith(".woff") || pathname.endsWith(".woff2") || pathname.endsWith(".ttf") || pathname.endsWith(".otf") || pathname.endsWith(".fnt")) {
      return "font";
    }
    if (pathname.endsWith(".xml") || pathname.endsWith(".skel")) {
      return "runtime-metadata";
    }
    if (pathname.includes("/api/")) {
      return "api";
    }
    return "other";
  } catch {
    const normalized = urlString.toLowerCase();
    if (/\.(png|jpe?g|gif|svg|webp)$/.test(normalized)) {
      return "image";
    }
    if (/\.(atlas|plist|json|xml|skel|fnt)$/.test(normalized)) {
      return "runtime-metadata";
    }
    return "other";
  }
}

export function pathLooksLikeRuntimeScript(urlString: string): boolean {
  return /(bundle|loader|wrapper|lobby|launch|runtime|replay)/i.test(urlString);
}

export function pathLooksLikeRuntimeMetadata(urlString: string): boolean {
  return /(spines?|atlas|coin|translations|ui\/|manifest)/i.test(urlString);
}
