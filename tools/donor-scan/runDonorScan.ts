import { promises as fs } from "node:fs";
import path from "node:path";
import { buildAssetClassificationSummary } from "./classifyAssets";
import { buildNextCaptureTargets } from "./buildNextCaptureTargets";
import { discoverRequestBackedStaticHints } from "./discoverRequestBackedStaticHints";
import { discoverAtlasMetadata } from "./discoverAtlasMetadata";
import { discoverRuntimeCandidates } from "./discoverRuntimeCandidates";
import { extractBundleAssetMap } from "./extractBundleAssetMap";
import { summarizeCaptureTargetFamilies } from "./summarizeCaptureTargetFamilies";
import { summarizeCaptureBlockerFamilies } from "./summarizeCaptureBlockerFamilies";
import { summarizeCaptureFamilySourceProfiles } from "./summarizeCaptureFamilySourceProfiles";
import { summarizeCaptureFamilyActions } from "./summarizeCaptureFamilyActions";
import { summarizeFamilyReconstructionProfiles } from "./summarizeFamilyReconstructionProfiles";
import { summarizeFamilyReconstructionMaps } from "./summarizeFamilyReconstructionMaps";
import { summarizeFamilyReconstructionSections } from "./summarizeFamilyReconstructionSections";
import { summarizeFamilyReconstructionSectionBundles } from "./summarizeFamilyReconstructionSectionBundles";
import { summarizeSectionSkinMaterialReviewBundleProfiles } from "./summarizeSectionSkinMaterialReviewBundleProfiles";
import { summarizeSectionSkinPageMatchBundleProfiles } from "./summarizeSectionSkinPageMatchBundleProfiles";
import { summarizeSectionSkinPageLockBundleProfiles } from "./summarizeSectionSkinPageLockBundleProfiles";
import { summarizeSectionSkinPageLockAuditBundleProfiles } from "./summarizeSectionSkinPageLockAuditBundleProfiles";
import { summarizeSectionSkinPageLockResolutionBundleProfiles } from "./summarizeSectionSkinPageLockResolutionBundleProfiles";
import { summarizeSectionSkinPageLockDecisionBundleProfiles } from "./summarizeSectionSkinPageLockDecisionBundleProfiles";
import { summarizeSectionSkinPageLockReviewBundleProfiles } from "./summarizeSectionSkinPageLockReviewBundleProfiles";
import { summarizeSectionSkinTextureInputBundleProfiles } from "./summarizeSectionSkinTextureInputBundleProfiles";
import { summarizeSectionSkinTextureSourcePlanProfiles } from "./summarizeSectionSkinTextureSourcePlanProfiles";
import { summarizeSectionSkinTextureReconstructionBundleProfiles } from "./summarizeSectionSkinTextureReconstructionBundleProfiles";
import {
  type CaptureRunFile,
  type DiscoveredDonorUrl,
  type DonorUrlCategory,
  type HarvestManifestFile,
  type HarvestedDonorAssetEntry,
  type DonorScanPaths,
  type DonorScanResult,
  buildDonorScanPaths,
  readOptionalJsonFile,
  toRepoRelativePath,
  writeJsonFile,
  workspaceRoot
} from "./shared";
import { writeBlockerSummary } from "./writeBlockerSummary";

interface RunDonorScanOptions {
  donorId: string;
  donorName: string;
  launchUrl?: string;
  resolvedLaunchUrl?: string;
  sourceHost?: string;
}

interface RuntimeMirrorManifestEntry {
  sourceUrl?: string;
  kind?: string;
  repoRelativePath?: string;
  fileType?: string;
}

interface RuntimeMirrorManifestFile {
  schemaVersion?: string;
  projectId?: string;
  mode?: string;
  generatedAtUtc?: string;
  publicEntryUrl?: string;
  resourceVersion?: string;
  notes?: string[];
  entries?: RuntimeMirrorManifestEntry[];
}

interface RuntimeRequestLogEntry {
  canonicalSourceUrl?: string;
  latestRequestUrl?: string;
  requestSource?: string;
  requestCategory?: string;
  runtimeRelativePath?: string | null;
  fileType?: string | null;
  hitCount?: number | null;
}

interface RuntimeRequestLogFile {
  generatedAtUtc?: string;
  entries?: RuntimeRequestLogEntry[];
}

function sortDiscoveredUrls(entries: readonly DiscoveredDonorUrl[]): DiscoveredDonorUrl[] {
  return [...entries].sort((left, right) => {
    const leftDepth = left.depth ?? 0;
    const rightDepth = right.depth ?? 0;
    if (leftDepth !== rightDepth) {
      return leftDepth - rightDepth;
    }
    if (left.category !== right.category) {
      return left.category.localeCompare(right.category);
    }
    return left.url.localeCompare(right.url);
  });
}

function mapRuntimeMirrorCategory(sourceUrl: string, fileType?: string | null, kind?: string | null): DonorUrlCategory {
  const normalizedType = (fileType ?? "").toLowerCase();
  if (kind === "static-image" || ["png", "jpg", "jpeg", "gif", "svg", "webp"].includes(normalizedType)) {
    return "image";
  }
  if (["ogg", "mp3", "wav", "m4a"].includes(normalizedType)) {
    return "audio";
  }
  if (["woff", "woff2", "ttf", "otf", "fnt"].includes(normalizedType)) {
    return "font";
  }
  if (kind?.includes("script") || normalizedType === "js") {
    return "script";
  }
  if (normalizedType === "css") {
    return "style";
  }
  if (normalizedType === "json" || normalizedType === "atlas" || normalizedType === "plist" || normalizedType === "xml" || normalizedType === "skel") {
    return "json";
  }
  if (/\/api\//i.test(sourceUrl)) {
    return "api";
  }
  if (/\.html?(?:$|\?)/i.test(sourceUrl)) {
    return "html";
  }
  return "other";
}

function buildPackageFamilyKey(urlString: string, category: DonorUrlCategory): string {
  try {
    const parsed = new URL(urlString);
    const segments = parsed.pathname.split("/").filter(Boolean);
    const suffix = segments.slice(0, Math.min(2, segments.length)).join("/") || "(root)";
    return `${category}:${suffix}`;
  } catch {
    return `${category}:(invalid-url)`;
  }
}

async function findProjectRuntimeRequestLogPath(donorId: string): Promise<string | null> {
  const projectsRoot = path.join(workspaceRoot, "40_projects");
  const projectDirs = await fs.readdir(projectsRoot, { withFileTypes: true });

  for (const dirent of projectDirs) {
    if (!dirent.isDirectory()) {
      continue;
    }
    const projectRoot = path.join(projectsRoot, dirent.name);
    const projectMeta = await readOptionalJsonFile<Record<string, unknown>>(path.join(projectRoot, "project.meta.json"));
    const donor = projectMeta && typeof projectMeta.donor === "object" && projectMeta.donor !== null
      ? projectMeta.donor as Record<string, unknown>
      : null;
    if (!donor || donor.donorId !== donorId) {
      continue;
    }

    const requestLogPath = path.join(projectRoot, "runtime", "local-mirror", "request-log.latest.json");
    if (await fs.stat(requestLogPath).then(() => true).catch(() => false)) {
      return requestLogPath;
    }
  }

  return null;
}

async function loadOptionalRuntimeRequestLog(
  donorId: string,
  paths: DonorScanPaths
): Promise<{ evidencePath: string | null; requestLog: RuntimeRequestLogFile | null }> {
  const donorScopedRequestLog = await readOptionalJsonFile<RuntimeRequestLogFile>(paths.runtimeRequestLogPath);
  if (donorScopedRequestLog) {
    return {
      evidencePath: toRepoRelativePath(paths.runtimeRequestLogPath),
      requestLog: donorScopedRequestLog
    };
  }

  const projectRequestLogPath = await findProjectRuntimeRequestLogPath(donorId);
  if (!projectRequestLogPath) {
    return { evidencePath: null, requestLog: null };
  }

  const projectRequestLog = await readOptionalJsonFile<RuntimeRequestLogFile>(projectRequestLogPath);
  if (!projectRequestLog) {
    return { evidencePath: null, requestLog: null };
  }

  await writeJsonFile(paths.runtimeRequestLogPath, projectRequestLog);
  return {
    evidencePath: toRepoRelativePath(paths.runtimeRequestLogPath),
    requestLog: projectRequestLog
  };
}

async function synthesizeHarvestFromRuntimeMirror(
  donorId: string,
  donorName: string,
  paths: DonorScanPaths
): Promise<HarvestManifestFile | null> {
  const projectsRoot = path.join(workspaceRoot, "40_projects");
  const projectDirs = await fs.readdir(projectsRoot, { withFileTypes: true });

  for (const dirent of projectDirs) {
    if (!dirent.isDirectory()) {
      continue;
    }
    const projectRoot = path.join(projectsRoot, dirent.name);
    const projectMeta = await readOptionalJsonFile<Record<string, unknown>>(path.join(projectRoot, "project.meta.json"));
    const donor = projectMeta && typeof projectMeta.donor === "object" && projectMeta.donor !== null
      ? projectMeta.donor as Record<string, unknown>
      : null;
    if (!donor || donor.donorId !== donorId) {
      continue;
    }

    const runtimeMirrorManifestPath = path.join(projectRoot, "runtime", "local-mirror", "manifest.json");
    const runtimeRequestLogPath = path.join(projectRoot, "runtime", "local-mirror", "request-log.latest.json");
    const runtimeMirrorManifest = await readOptionalJsonFile<RuntimeMirrorManifestFile>(runtimeMirrorManifestPath);
    if (!runtimeMirrorManifest) {
      continue;
    }

    const requestLog = await readOptionalJsonFile<RuntimeRequestLogFile>(runtimeRequestLogPath);
    const discoveredMap = new Map<string, DiscoveredDonorUrl>();
    const entries: HarvestedDonorAssetEntry[] = [];

    if (typeof runtimeMirrorManifest.publicEntryUrl === "string" && runtimeMirrorManifest.publicEntryUrl.length > 0) {
      discoveredMap.set(runtimeMirrorManifest.publicEntryUrl, {
        url: runtimeMirrorManifest.publicEntryUrl,
        category: "html",
        source: "launch-url",
        depth: 0
      });
    }

    for (const manifestEntry of Array.isArray(runtimeMirrorManifest.entries) ? runtimeMirrorManifest.entries : []) {
      if (typeof manifestEntry.sourceUrl !== "string" || typeof manifestEntry.repoRelativePath !== "string") {
        continue;
      }
      const category = mapRuntimeMirrorCategory(manifestEntry.sourceUrl, manifestEntry.fileType, manifestEntry.kind);
      if (!discoveredMap.has(manifestEntry.sourceUrl)) {
        discoveredMap.set(manifestEntry.sourceUrl, {
          url: manifestEntry.sourceUrl,
          category,
          source: "html-inline",
          depth: 1
        });
      }
      entries.push({
        sourceUrl: manifestEntry.sourceUrl,
        resolvedUrl: manifestEntry.sourceUrl,
        category,
        discoverySource: "html-inline",
        depth: 1,
        status: "downloaded",
        localPath: manifestEntry.repoRelativePath,
        contentType: manifestEntry.fileType ? `synthetic/${manifestEntry.fileType}` : undefined
      });
    }

    for (const requestEntry of Array.isArray(requestLog?.entries) ? requestLog?.entries : []) {
      if (typeof requestEntry.canonicalSourceUrl !== "string" || discoveredMap.has(requestEntry.canonicalSourceUrl)) {
        continue;
      }
      discoveredMap.set(requestEntry.canonicalSourceUrl, {
        url: requestEntry.canonicalSourceUrl,
        category: mapRuntimeMirrorCategory(requestEntry.canonicalSourceUrl, requestEntry.fileType, requestEntry.requestCategory),
        source: "html-inline",
        depth: 1
      });
    }

    const discoveredUrls = sortDiscoveredUrls([...discoveredMap.values()]);
    const harvestManifest: HarvestManifestFile = {
      schemaVersion: "0.1.0",
      donorId,
      donorName,
      capturedAt: runtimeMirrorManifest.generatedAtUtc ?? new Date().toISOString(),
      discoveredUrlCount: discoveredUrls.length,
      recursiveDiscoveredUrlCount: 0,
      recursiveHarvestDepthLimit: 0,
      attemptedAssetCount: entries.length,
      harvestedAssetCount: entries.length,
      skippedAssetCount: 0,
      failedAssetCount: 0,
      discoveredUrls,
      entries
    };
    await writeJsonFile(paths.assetManifestPath, harvestManifest);

    const familyMap = new Map<string, { category: DonorUrlCategory; discoveredUrlCount: number; downloadedAssetCount: number; sampleUrl: string }>();
    const hostMap = new Map<string, { discoveredUrlCount: number; downloadedAssetCount: number; failedAssetCount: number }>();
    for (const discoveredUrl of discoveredUrls) {
      let host = "(invalid-url)";
      try {
        host = new URL(discoveredUrl.url).host || "(no-host)";
      } catch {
        // keep invalid marker
      }
      const hostEntry = hostMap.get(host) ?? { discoveredUrlCount: 0, downloadedAssetCount: 0, failedAssetCount: 0 };
      hostEntry.discoveredUrlCount += 1;
      if (entries.some((entry) => entry.sourceUrl === discoveredUrl.url)) {
        hostEntry.downloadedAssetCount += 1;
      }
      hostMap.set(host, hostEntry);

      const familyKey = buildPackageFamilyKey(discoveredUrl.url, discoveredUrl.category);
      const familyEntry = familyMap.get(familyKey) ?? {
        category: discoveredUrl.category,
        discoveredUrlCount: 0,
        downloadedAssetCount: 0,
        sampleUrl: discoveredUrl.url
      };
      familyEntry.discoveredUrlCount += 1;
      if (entries.some((entry) => entry.sourceUrl === discoveredUrl.url)) {
        familyEntry.downloadedAssetCount += 1;
      }
      familyMap.set(familyKey, familyEntry);
    }

    await writeJsonFile(paths.packageManifestPath, {
      schemaVersion: "0.1.0",
      donorId,
      donorName,
      packageStatus: entries.length > 0 ? "packaged" : "blocked",
      generatedAt: new Date().toISOString(),
      launchUrl: runtimeMirrorManifest.publicEntryUrl ?? null,
      resolvedLaunchUrl: runtimeMirrorManifest.publicEntryUrl ?? null,
      discoveredUrlCount: discoveredUrls.length,
      downloadedAssetCount: entries.length,
      failedAssetCount: 0,
      skippedAssetCount: 0,
      downloadedByCategory: Object.fromEntries(
        Object.entries(entries.reduce<Record<string, number>>((counts, entry) => {
          counts[entry.category] = (counts[entry.category] ?? 0) + 1;
          return counts;
        }, {})).sort(([left], [right]) => left.localeCompare(right))
      ),
      entryPoints: {
        scripts: discoveredUrls.filter((entry) => entry.category === "script").map((entry) => entry.url).slice(0, 20),
        styles: discoveredUrls.filter((entry) => entry.category === "style").map((entry) => entry.url).slice(0, 20),
        json: discoveredUrls.filter((entry) => entry.category === "json").map((entry) => entry.url).slice(0, 20)
      },
      hosts: [...hostMap.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([host, stats]) => ({ host, ...stats })),
      assetFamilies: [...familyMap.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([familyKey, stats]) => ({ familyKey, ...stats })),
      packageGraphPath: toRepoRelativePath(paths.packageGraphPath),
      packageGraphNodeCount: discoveredUrls.length,
      packageGraphEdgeCount: 0,
      packageUnresolvedCount: discoveredUrls.length - entries.length,
      unresolvedEntries: discoveredUrls.filter((entry) => !entries.some((candidate) => candidate.sourceUrl === entry.url)).map((entry) => ({
        sourceUrl: entry.url,
        category: entry.category,
        status: "inventory-only",
        depth: entry.depth,
        discoveredFromUrl: entry.discoveredFromUrl
      }))
    });

    await writeJsonFile(paths.packageGraphPath, {
      schemaVersion: "0.1.0",
      donorId,
      donorName,
      packageStatus: entries.length > 0 ? "packaged" : "blocked",
      generatedAt: new Date().toISOString(),
      launchUrl: runtimeMirrorManifest.publicEntryUrl ?? null,
      resolvedLaunchUrl: runtimeMirrorManifest.publicEntryUrl ?? null,
      nodeCount: discoveredUrls.length,
      edgeCount: 0,
      unresolvedNodeCount: discoveredUrls.length - entries.length,
      rootNodeCount: discoveredUrls.filter((entry) => (entry.depth ?? 0) === 0).length,
      nodes: discoveredUrls.map((entry) => {
        const downloadedEntry = entries.find((candidate) => candidate.sourceUrl === entry.url);
        return {
          url: entry.url,
          category: entry.category,
          discoverySource: entry.source,
          depth: entry.depth ?? 0,
          discoveredFromUrl: entry.discoveredFromUrl,
          host: (() => {
            try {
              return new URL(entry.url).host || "(no-host)";
            } catch {
              return "(invalid-url)";
            }
          })(),
          downloadStatus: downloadedEntry ? "downloaded" : "inventory-only",
          localPath: downloadedEntry?.localPath,
          contentType: downloadedEntry?.contentType,
          sizeBytes: downloadedEntry?.sizeBytes,
          sha256: downloadedEntry?.sha256,
          outboundReferenceCount: 0,
          inboundReferenceCount: 0
        };
      }),
      edges: []
    });

    return harvestManifest;
  }

  return null;
}

export async function runDonorScan(options: RunDonorScanOptions): Promise<DonorScanResult> {
  const paths = buildDonorScanPaths(options.donorId);
  const harvestManifest = await readOptionalJsonFile<HarvestManifestFile>(paths.assetManifestPath)
    ?? await synthesizeHarvestFromRuntimeMirror(options.donorId, options.donorName, paths);
  if (!harvestManifest) {
    const skippedSummary = {
      schemaVersion: "0.1.0",
      donorId: options.donorId,
      donorName: options.donorName,
      generatedAt: new Date().toISOString(),
      scanState: "skipped",
      launchUrl: options.launchUrl ?? null,
      resolvedLaunchUrl: options.resolvedLaunchUrl ?? null,
      sourceHost: options.sourceHost ?? null,
      entryPointsPath: toRepoRelativePath(paths.entryPointsPath),
      urlInventoryPath: toRepoRelativePath(paths.urlInventoryPath),
      runtimeCandidatesPath: toRepoRelativePath(paths.runtimeCandidatesPath),
      bundleAssetMapPath: toRepoRelativePath(paths.bundleAssetMapPath),
      atlasManifestsPath: toRepoRelativePath(paths.atlasManifestsPath),
      blockerSummaryPath: toRepoRelativePath(paths.blockerSummaryPath),
      nextCaptureTargetsPath: toRepoRelativePath(paths.nextCaptureTargetsPath),
      nextOperatorAction: "Run donor URL intake or provide a harvested donor package before scanning.",
      blockerHighlights: ["No harvested donor asset manifest exists yet."],
      runtimeCandidateCount: 0,
      atlasManifestCount: 0,
      bundleAssetMapStatus: "skipped",
      bundleImageVariantStatus: "skipped",
      bundleImageVariantCount: 0,
      bundleImageVariantSuffixCount: 0,
      bundleImageVariantUrlBuilderStatus: "skipped",
      bundleImageVariantUrlCount: 0,
      translationPayloadStatus: "skipped",
      translationPayloadCount: 0,
      mirrorCandidateStatus: "blocked",
      captureFamilyCount: 0,
      topCaptureFamilyNames: [],
      familySourceProfileCount: 0,
      topFamilySourceProfileNames: [],
      familyActionCount: 0,
      topFamilyActionNames: [],
      familyReconstructionProfileCount: 0,
      topFamilyReconstructionProfileNames: [],
      familyReconstructionMapCount: 0,
      topFamilyReconstructionMapNames: [],
      familyReconstructionSectionCount: 0,
      topFamilyReconstructionSectionKeys: [],
      familyReconstructionSectionBundleCount: 0,
      topFamilyReconstructionSectionBundleKeys: [],
      nextCaptureTargetCount: 0,
      rawPayloadBlockedCaptureTargetCount: 0,
      rawPayloadBlockedFamilyCount: 0,
      rawPayloadBlockedFamilyNames: [],
      fullLocalRuntimePackage: false,
      partialLocalRuntimePackage: false,
      entryPointCount: 0,
      urlInventoryCount: 0,
      bundleReferenceCount: 0,
      mirrorCandidateCount: 0
    };
    await writeJsonFile(paths.scanSummaryPath, skippedSummary);
    return {
      status: "skipped",
      donorId: options.donorId,
      donorName: options.donorName,
      entryPointsPath: paths.entryPointsPath,
      urlInventoryPath: paths.urlInventoryPath,
      runtimeCandidatesPath: paths.runtimeCandidatesPath,
      bundleAssetMapPath: paths.bundleAssetMapPath,
      atlasManifestsPath: paths.atlasManifestsPath,
      blockerSummaryPath: paths.blockerSummaryPath,
      scanSummaryPath: paths.scanSummaryPath,
      nextCaptureTargetsPath: paths.nextCaptureTargetsPath,
      runtimeCandidateCount: 0,
      atlasManifestCount: 0,
      bundleAssetMapStatus: "skipped",
      bundleImageVariantStatus: "skipped",
      bundleImageVariantCount: 0,
      bundleImageVariantSuffixCount: 0,
      bundleImageVariantUrlBuilderStatus: "skipped",
      bundleImageVariantUrlCount: 0,
      translationPayloadStatus: "skipped",
      translationPayloadCount: 0,
      mirrorCandidateStatus: "blocked",
      captureFamilyCount: 0,
      topCaptureFamilyNames: [],
      familySourceProfileCount: 0,
      topFamilySourceProfileNames: [],
      familyActionCount: 0,
      topFamilyActionNames: [],
      familyReconstructionProfileCount: 0,
      topFamilyReconstructionProfileNames: [],
      familyReconstructionMapCount: 0,
      topFamilyReconstructionMapNames: [],
      familyReconstructionSectionCount: 0,
      topFamilyReconstructionSectionKeys: [],
      familyReconstructionSectionBundleCount: 0,
      topFamilyReconstructionSectionBundleKeys: [],
      nextCaptureTargetCount: 0,
      rawPayloadBlockedCaptureTargetCount: 0,
      rawPayloadBlockedFamilyCount: 0,
      rawPayloadBlockedFamilyNames: [],
      nextOperatorAction: "Run donor URL intake or provide a harvested donor package before scanning.",
      blockerHighlights: ["No harvested donor asset manifest exists yet."]
    };
  }

  const assetSummary = buildAssetClassificationSummary(harvestManifest);
  const runtimeRequestEvidence = await loadOptionalRuntimeRequestLog(options.donorId, paths);
  const captureRun = await readOptionalJsonFile<CaptureRunFile>(paths.captureRunPath);
  const bundleAssetMap = await extractBundleAssetMap({
    donorId: options.donorId,
    donorName: options.donorName,
    harvestManifest
  });
  const atlasManifestFile = await discoverAtlasMetadata({
    donorId: options.donorId,
    donorName: options.donorName,
    harvestManifest
  });
  const runtimeCandidates = discoverRuntimeCandidates({
    donorId: options.donorId,
    donorName: options.donorName,
    assetSummary,
    bundleAssetMap,
    atlasManifestFile
  });
  const requestBackedStaticHints = discoverRequestBackedStaticHints({
    donorId: options.donorId,
    donorName: options.donorName,
    requestLog: runtimeRequestEvidence.requestLog,
    evidencePath: runtimeRequestEvidence.evidencePath
  });
  const nextCaptureTargets = buildNextCaptureTargets({
    donorId: options.donorId,
    donorName: options.donorName,
    runtimeCandidates,
    bundleAssetMap,
    atlasManifestFile,
    requestBackedStaticHints,
    captureRun
  });

  await writeJsonFile(paths.entryPointsPath, {
    schemaVersion: "0.1.0",
    donorId: options.donorId,
    donorName: options.donorName,
    generatedAt: new Date().toISOString(),
    entryPointCount: assetSummary.entryPoints.length,
    entryPoints: assetSummary.entryPoints
  });

  await writeJsonFile(paths.urlInventoryPath, {
    schemaVersion: "0.1.0",
    donorId: options.donorId,
    donorName: options.donorName,
    generatedAt: new Date().toISOString(),
    discoveredCount: assetSummary.discoveredCount,
    downloadedCount: assetSummary.downloadedCount,
    failedCount: assetSummary.failedCount,
    skippedCount: assetSummary.skippedCount,
    inventoryOnlyCount: assetSummary.inventoryOnlyCount,
    countsByCategory: assetSummary.countsByCategory,
    downloadedCountsByCategory: assetSummary.downloadedCountsByCategory,
    inventory: assetSummary.urlInventory
  });

  await writeJsonFile(paths.bundleAssetMapPath, bundleAssetMap);
  await writeJsonFile(paths.atlasManifestsPath, atlasManifestFile);
  await writeJsonFile(paths.runtimeCandidatesPath, runtimeCandidates);
  await writeJsonFile(paths.requestBackedStaticHintsPath, requestBackedStaticHints);
  await writeJsonFile(paths.nextCaptureTargetsPath, nextCaptureTargets);
  const captureTargetFamilies = summarizeCaptureTargetFamilies({
    donorId: options.donorId,
    donorName: options.donorName,
    nextCaptureTargets
  });
  await writeJsonFile(paths.captureTargetFamiliesPath, captureTargetFamilies);
  const captureBlockerFamilies = summarizeCaptureBlockerFamilies({
    donorId: options.donorId,
    donorName: options.donorName,
    nextCaptureTargets
  });
  await writeJsonFile(paths.captureBlockerFamiliesPath, captureBlockerFamilies);
  const captureFamilySourceProfiles = summarizeCaptureFamilySourceProfiles({
    donorId: options.donorId,
    donorName: options.donorName,
    atlasManifestFile,
    bundleAssetMap,
    captureTargetFamilies,
    captureBlockerFamilies,
    nextCaptureTargets,
    harvestManifest
  });
  await writeJsonFile(paths.captureFamilySourceProfilesPath, captureFamilySourceProfiles);
  const captureFamilyActions = summarizeCaptureFamilyActions({
    donorId: options.donorId,
    donorName: options.donorName,
    captureFamilySourceProfiles
  });
  await writeJsonFile(paths.captureFamilyActionsPath, captureFamilyActions);
  const familyReconstructionProfiles = await summarizeFamilyReconstructionProfiles({
    donorId: options.donorId,
    donorName: options.donorName,
    bundlesRoot: paths.familyReconstructionBundlesRoot
  });
  await writeJsonFile(paths.familyReconstructionProfilesPath, familyReconstructionProfiles);
  const familyReconstructionMaps = await summarizeFamilyReconstructionMaps({
    donorId: options.donorId,
    donorName: options.donorName,
    familyReconstructionProfiles
  });
  await writeJsonFile(paths.familyReconstructionMapsPath, familyReconstructionMaps);
  const familyReconstructionSections = summarizeFamilyReconstructionSections({
    donorId: options.donorId,
    donorName: options.donorName,
    familyReconstructionMaps
  });
  await writeJsonFile(paths.familyReconstructionSectionsPath, familyReconstructionSections);
  const familyReconstructionSectionBundles = await summarizeFamilyReconstructionSectionBundles({
    donorId: options.donorId,
    donorName: options.donorName,
    familyReconstructionMaps,
    familyReconstructionSections
  });
  await writeJsonFile(paths.familyReconstructionSectionBundlesPath, familyReconstructionSectionBundles);
  const prioritizedFamilySourceProfiles = captureFamilySourceProfiles.families.filter((family) =>
    family.blockedTargetCount > 0
    || family.atlasManifestKinds.length > 0
    || family.sameFamilyVariantAssetCount > 0
    || family.localSameFamilyBundleReferenceCount > 0
    || family.localSameFamilyVariantAssetCount > 0
    || family.localRelatedBundleAssetCount > 0
    || family.localRelatedVariantAssetCount > 0
    || family.targetCount >= 3
  );
  const prioritizedFamilyActions = captureFamilyActions.families.filter((family) =>
    family.priority === "high"
    || family.localSourceAssetCount > 0
    || family.blockedTargetCount > 0
    || family.targetCount >= 3
  );
  const prioritizedFamilyReconstructionProfiles = familyReconstructionProfiles.families.filter((family) =>
    family.profileState !== "needs-manual-source-review"
    || family.exactLocalSourceCount > 0
    || family.localSourceCount > 0
  );
  const prioritizedFamilyReconstructionMaps = familyReconstructionMaps.families.filter((family) =>
    family.mappedAttachmentCount > 0
    || family.spineAttachmentCount > 0
    || family.atlasRegionCount > 0
  );
  const prioritizedFamilyReconstructionSections = familyReconstructionSections.sections.filter((section) =>
    section.mappedAttachmentCount > 0
    || section.attachmentCount > 0
  );
  const prioritizedFamilyReconstructionSectionBundles = familyReconstructionSectionBundles.sections.filter((section) =>
    section.mappedAttachmentCount > 0
    || section.attachmentCount > 0
    || section.exactLocalSourceCount > 0
  );
  const sectionSkinMaterialReviewBundleProfiles = await summarizeSectionSkinMaterialReviewBundleProfiles({
    donorId: options.donorId,
    donorName: options.donorName,
    reviewBundlesRoot: paths.sectionSkinMaterialReviewBundlesRoot
  });
  await writeJsonFile(paths.sectionSkinMaterialReviewBundleProfilesPath, sectionSkinMaterialReviewBundleProfiles);
  const prioritizedSectionSkinMaterialReviewBundleProfiles = sectionSkinMaterialReviewBundleProfiles.sections.filter((section) =>
    section.reviewReadyPageCount > 0
    || section.exactPageImageCount > 0
  );
  const sectionSkinPageMatchBundleProfiles = await summarizeSectionSkinPageMatchBundleProfiles({
    donorId: options.donorId,
    donorName: options.donorName,
    pageMatchBundlesRoot: paths.sectionSkinPageMatchBundlesRoot
  });
  await writeJsonFile(paths.sectionSkinPageMatchBundleProfilesPath, sectionSkinPageMatchBundleProfiles);
  const prioritizedSectionSkinPageMatchBundleProfiles = sectionSkinPageMatchBundleProfiles.sections.filter((section) =>
    section.proposedMatchCount > 0
    || section.exactPageImageCount > 0
  );
  const sectionSkinTextureSourcePlanProfiles = await summarizeSectionSkinTextureSourcePlanProfiles({
    donorId: options.donorId,
    donorName: options.donorName,
    textureSourcePlansRoot: paths.sectionSkinTextureSourcePlansRoot
  });
  await writeJsonFile(paths.sectionSkinTextureSourcePlanProfilesPath, sectionSkinTextureSourcePlanProfiles);
  const prioritizedSectionSkinTextureSourcePlanProfiles = sectionSkinTextureSourcePlanProfiles.sections.filter((section) =>
    section.proposedPageSourceCount > 0
    || section.exactPageSourceCount > 0
  );
  const sectionSkinTextureReconstructionBundleProfiles = await summarizeSectionSkinTextureReconstructionBundleProfiles({
    donorId: options.donorId,
    donorName: options.donorName,
    textureReconstructionBundlesRoot: paths.sectionSkinTextureReconstructionBundlesRoot
  });
  await writeJsonFile(paths.sectionSkinTextureReconstructionBundleProfilesPath, sectionSkinTextureReconstructionBundleProfiles);
  const prioritizedSectionSkinTextureReconstructionBundleProfiles = sectionSkinTextureReconstructionBundleProfiles.sections.filter((section) =>
    section.reconstructableLayerCount > 0
    || section.exactPageSourceCount > 0
    || section.proposedPageSourceCount > 0
  );
  const sectionSkinPageLockBundleProfiles = await summarizeSectionSkinPageLockBundleProfiles({
    donorId: options.donorId,
    donorName: options.donorName,
    pageLockBundlesRoot: paths.sectionSkinPageLockBundlesRoot
  });
  await writeJsonFile(paths.sectionSkinPageLockBundleProfilesPath, sectionSkinPageLockBundleProfiles);
  const prioritizedSectionSkinPageLockBundleProfiles = sectionSkinPageLockBundleProfiles.sections.filter((section) =>
    section.exactPageLockCount > 0
    || section.proposedPageLockCount > 0
    || section.reconstructableLayerCount > 0
  );
  const sectionSkinTextureInputBundleProfiles = await summarizeSectionSkinTextureInputBundleProfiles({
    donorId: options.donorId,
    donorName: options.donorName,
    textureInputBundlesRoot: paths.sectionSkinTextureInputBundlesRoot
  });
  await writeJsonFile(paths.sectionSkinTextureInputBundleProfilesPath, sectionSkinTextureInputBundleProfiles);
  const prioritizedSectionSkinTextureInputBundleProfiles = sectionSkinTextureInputBundleProfiles.sections.filter((section) =>
    section.exactPageLockCount > 0
    || section.proposedPageLockCount > 0
    || section.readyLayerCount > 0
  );
  const sectionSkinPageLockAuditBundleProfiles = await summarizeSectionSkinPageLockAuditBundleProfiles({
    donorId: options.donorId,
    donorName: options.donorName,
    pageLockAuditBundlesRoot: paths.sectionSkinPageLockAuditBundlesRoot
  });
  await writeJsonFile(paths.sectionSkinPageLockAuditBundleProfilesPath, sectionSkinPageLockAuditBundleProfiles);
  const prioritizedSectionSkinPageLockAuditBundleProfiles = sectionSkinPageLockAuditBundleProfiles.sections.filter((section) =>
    section.duplicateSourceGroupCount > 0
    || section.exactPageLockCount > 0
    || section.proposedPageLockCount > 0
  );
  const sectionSkinPageLockResolutionBundleProfiles = await summarizeSectionSkinPageLockResolutionBundleProfiles({
    donorId: options.donorId,
    donorName: options.donorName,
    pageLockResolutionBundlesRoot: paths.sectionSkinPageLockResolutionBundlesRoot
  });
  await writeJsonFile(paths.sectionSkinPageLockResolutionBundleProfilesPath, sectionSkinPageLockResolutionBundleProfiles);
  const prioritizedSectionSkinPageLockResolutionBundleProfiles = sectionSkinPageLockResolutionBundleProfiles.sections.filter((section) =>
    section.unresolvedConflictPageCount > 0
    || section.resolvedConflictPageCount > 0
    || section.exactPageLockCount > 0
  );
  const sectionSkinPageLockDecisionBundleProfiles = await summarizeSectionSkinPageLockDecisionBundleProfiles({
    donorId: options.donorId,
    donorName: options.donorName,
    pageLockDecisionBundlesRoot: paths.sectionSkinPageLockDecisionBundlesRoot
  });
  await writeJsonFile(paths.sectionSkinPageLockDecisionBundleProfilesPath, sectionSkinPageLockDecisionBundleProfiles);
  const prioritizedSectionSkinPageLockDecisionBundleProfiles = sectionSkinPageLockDecisionBundleProfiles.sections.filter((section) =>
    section.unresolvedPageLockCount > 0
    || section.reviewReadyPageCount > 0
    || section.exactPageLockCount > 0
  );
  const sectionSkinPageLockReviewBundleProfiles = await summarizeSectionSkinPageLockReviewBundleProfiles({
    donorId: options.donorId,
    donorName: options.donorName,
    pageLockReviewBundlesRoot: paths.sectionSkinPageLockReviewBundlesRoot
  });
  await writeJsonFile(paths.sectionSkinPageLockReviewBundleProfilesPath, sectionSkinPageLockReviewBundleProfiles);
  const prioritizedSectionSkinPageLockReviewBundleProfiles = sectionSkinPageLockReviewBundleProfiles.sections.filter((section) =>
    section.unresolvedPageLockCount > 0
    || section.reviewReadyPageCount > 0
    || section.exactPageLockCount > 0
  );
  const rawPayloadBlockedFamilies = captureBlockerFamilies.families
    .filter((family) => family.blockerClass === "raw-payload-blocked");

  const blockerSummary = await writeBlockerSummary({
    donorId: options.donorId,
    donorName: options.donorName,
    assetSummary,
    runtimeCandidates,
    bundleAssetMap,
    atlasManifestFile,
    nextCaptureTargets,
    captureTargetFamilies,
    captureBlockerFamilies,
    captureFamilySourceProfiles,
    captureFamilyActions,
    captureRun,
    paths
  });

  const status: DonorScanResult["status"] = runtimeCandidates.entryPointCount > 0
    ? "scanned"
    : "blocked";

  const scanSummary = {
    schemaVersion: "0.1.0",
    donorId: options.donorId,
    donorName: options.donorName,
    generatedAt: new Date().toISOString(),
    scanState: status,
    launchUrl: options.launchUrl ?? null,
    resolvedLaunchUrl: options.resolvedLaunchUrl ?? null,
    sourceHost: options.sourceHost ?? null,
    entryPointsPath: toRepoRelativePath(paths.entryPointsPath),
    urlInventoryPath: toRepoRelativePath(paths.urlInventoryPath),
    runtimeCandidatesPath: toRepoRelativePath(paths.runtimeCandidatesPath),
    bundleAssetMapPath: toRepoRelativePath(paths.bundleAssetMapPath),
    atlasManifestsPath: toRepoRelativePath(paths.atlasManifestsPath),
    blockerSummaryPath: toRepoRelativePath(paths.blockerSummaryPath),
    nextCaptureTargetsPath: toRepoRelativePath(paths.nextCaptureTargetsPath),
    countsByCategory: assetSummary.countsByCategory,
    downloadedCountsByCategory: assetSummary.downloadedCountsByCategory,
    entryPointCount: assetSummary.entryPoints.length,
    urlInventoryCount: assetSummary.urlInventory.length,
    runtimeCandidateCount: runtimeCandidates.runtimeCandidateCount,
    atlasManifestCount: atlasManifestFile.manifests.length,
    atlasFrameManifestCount: atlasManifestFile.frameManifestCount,
    atlasMissingPageCount: atlasManifestFile.missingPageCount,
    requestBackedStaticHintCount: requestBackedStaticHints.hintCount,
    requestBackedObservedStaticCount: requestBackedStaticHints.observedStaticRequestCount,
    recentlyBlockedCaptureTargetCount: nextCaptureTargets.targets.filter((target) => target.recentCaptureStatus === "blocked").length,
    captureFamilyCount: captureTargetFamilies.familyCount,
    topCaptureFamilyNames: captureTargetFamilies.families
      .filter((family) => family.untriedTargetCount > 0)
      .slice(0, 8)
      .map((family) => family.familyName),
    familySourceProfileCount: captureFamilySourceProfiles.familyCount,
    topFamilySourceProfileNames: prioritizedFamilySourceProfiles
      .slice(0, 8)
      .map((family) => family.familyName),
    familyActionCount: captureFamilyActions.actionCount,
    topFamilyActionNames: prioritizedFamilyActions
      .slice(0, 8)
      .map((family) => family.familyName),
    familyReconstructionProfileCount: familyReconstructionProfiles.familyCount,
    topFamilyReconstructionProfileNames: prioritizedFamilyReconstructionProfiles
      .slice(0, 8)
      .map((family) => family.familyName),
    familyReconstructionMapCount: familyReconstructionMaps.familyCount,
    topFamilyReconstructionMapNames: prioritizedFamilyReconstructionMaps
      .slice(0, 8)
      .map((family) => family.familyName),
    familyReconstructionSectionCount: familyReconstructionSections.sectionCount,
    topFamilyReconstructionSectionKeys: prioritizedFamilyReconstructionSections
      .slice(0, 8)
      .map((section) => section.sectionKey),
    familyReconstructionSectionBundleCount: familyReconstructionSectionBundles.sectionCount,
    topFamilyReconstructionSectionBundleKeys: prioritizedFamilyReconstructionSectionBundles
      .slice(0, 8)
      .map((section) => section.sectionKey),
    sectionSkinMaterialReviewBundleCount: sectionSkinMaterialReviewBundleProfiles.sectionCount,
    topSectionSkinMaterialReviewBundleKeys: prioritizedSectionSkinMaterialReviewBundleProfiles
      .slice(0, 8)
      .map((section) => section.sectionKey),
    sectionSkinPageMatchBundleCount: sectionSkinPageMatchBundleProfiles.sectionCount,
    topSectionSkinPageMatchBundleKeys: prioritizedSectionSkinPageMatchBundleProfiles
      .slice(0, 8)
      .map((section) => section.sectionKey),
    sectionSkinTextureSourcePlanCount: sectionSkinTextureSourcePlanProfiles.sectionCount,
    topSectionSkinTextureSourcePlanKeys: prioritizedSectionSkinTextureSourcePlanProfiles
      .slice(0, 8)
      .map((section) => section.sectionKey),
    sectionSkinTextureReconstructionBundleCount: sectionSkinTextureReconstructionBundleProfiles.sectionCount,
    topSectionSkinTextureReconstructionBundleKeys: prioritizedSectionSkinTextureReconstructionBundleProfiles
      .slice(0, 8)
      .map((section) => section.sectionKey),
    sectionSkinPageLockBundleCount: sectionSkinPageLockBundleProfiles.sectionCount,
    topSectionSkinPageLockBundleKeys: prioritizedSectionSkinPageLockBundleProfiles
      .slice(0, 8)
      .map((section) => section.sectionKey),
    sectionSkinPageLockAuditBundleCount: sectionSkinPageLockAuditBundleProfiles.sectionCount,
    topSectionSkinPageLockAuditBundleKeys: prioritizedSectionSkinPageLockAuditBundleProfiles
      .slice(0, 8)
      .map((section) => section.sectionKey),
    sectionSkinPageLockResolutionBundleCount: sectionSkinPageLockResolutionBundleProfiles.sectionCount,
    topSectionSkinPageLockResolutionBundleKeys: prioritizedSectionSkinPageLockResolutionBundleProfiles
      .slice(0, 8)
      .map((section) => section.sectionKey),
    sectionSkinPageLockDecisionBundleCount: sectionSkinPageLockDecisionBundleProfiles.sectionCount,
    topSectionSkinPageLockDecisionBundleKeys: prioritizedSectionSkinPageLockDecisionBundleProfiles
      .slice(0, 8)
      .map((section) => section.sectionKey),
    sectionSkinPageLockReviewBundleCount: sectionSkinPageLockReviewBundleProfiles.sectionCount,
    topSectionSkinPageLockReviewBundleKeys: prioritizedSectionSkinPageLockReviewBundleProfiles
      .slice(0, 8)
      .map((section) => section.sectionKey),
    sectionSkinTextureInputBundleCount: sectionSkinTextureInputBundleProfiles.sectionCount,
    topSectionSkinTextureInputBundleKeys: prioritizedSectionSkinTextureInputBundleProfiles
      .slice(0, 8)
      .map((section) => section.sectionKey),
    rawPayloadBlockedCaptureTargetCount: nextCaptureTargets.targets.filter((target) => target.blockerClass === "raw-payload-blocked").length,
    rawPayloadBlockedFamilyCount: rawPayloadBlockedFamilies.length,
    rawPayloadBlockedFamilyNames: rawPayloadBlockedFamilies.slice(0, 8).map((family) => family.familyName),
    bundleAssetMapStatus: bundleAssetMap.status,
    bundleReferenceCount: bundleAssetMap.referenceCount,
    bundleImageVariantStatus: bundleAssetMap.imageVariantStatus,
    bundleImageVariantCount: bundleAssetMap.imageVariantEntryCount,
    bundleImageVariantSuffixCount: bundleAssetMap.imageVariantSuffixCount,
    bundleImageVariantUrlBuilderStatus: bundleAssetMap.imageVariantUrlBuilderStatus,
    bundleImageVariantUrlCount: bundleAssetMap.imageVariantUrlCount,
    translationPayloadStatus: bundleAssetMap.translationPayloadStatus,
    translationPayloadCount: bundleAssetMap.translationPayloadCount,
    translationLocaleHintCount: bundleAssetMap.translationLocaleHintCount,
    mirrorCandidateStatus: runtimeCandidates.mirrorCandidateStatus,
    mirrorCandidateCount: runtimeCandidates.mirrorCandidateCount,
    nextCaptureTargetCount: nextCaptureTargets.targetCount,
    nextCaptureTargetPreview: nextCaptureTargets.targets.slice(0, 3).map((target) => ({
      url: target.url,
      priority: target.priority,
      kind: target.kind,
      reason: target.reason
    })),
    fullLocalRuntimePackage: runtimeCandidates.fullLocalRuntimePackage,
    partialLocalRuntimePackage: runtimeCandidates.partialLocalRuntimePackage,
    unresolvedRuntimeDependencyCount: runtimeCandidates.unresolvedDependencyCount,
    blockerHighlights: blockerSummary.blockerHighlights,
    nextOperatorAction: blockerSummary.nextOperatorAction
  };
  await writeJsonFile(paths.scanSummaryPath, scanSummary);

  return {
    status,
    donorId: options.donorId,
    donorName: options.donorName,
    entryPointsPath: paths.entryPointsPath,
    urlInventoryPath: paths.urlInventoryPath,
    runtimeCandidatesPath: paths.runtimeCandidatesPath,
    bundleAssetMapPath: paths.bundleAssetMapPath,
    atlasManifestsPath: paths.atlasManifestsPath,
    blockerSummaryPath: paths.blockerSummaryPath,
    scanSummaryPath: paths.scanSummaryPath,
    nextCaptureTargetsPath: paths.nextCaptureTargetsPath,
    runtimeCandidateCount: runtimeCandidates.runtimeCandidateCount,
    atlasManifestCount: atlasManifestFile.manifests.length,
    bundleAssetMapStatus: bundleAssetMap.status,
    bundleImageVariantStatus: bundleAssetMap.imageVariantStatus,
    bundleImageVariantCount: bundleAssetMap.imageVariantEntryCount,
    bundleImageVariantSuffixCount: bundleAssetMap.imageVariantSuffixCount,
    bundleImageVariantUrlBuilderStatus: bundleAssetMap.imageVariantUrlBuilderStatus,
    bundleImageVariantUrlCount: bundleAssetMap.imageVariantUrlCount,
    translationPayloadStatus: bundleAssetMap.translationPayloadStatus,
    translationPayloadCount: bundleAssetMap.translationPayloadCount,
    mirrorCandidateStatus: runtimeCandidates.mirrorCandidateStatus,
    captureFamilyCount: captureTargetFamilies.familyCount,
    topCaptureFamilyNames: captureTargetFamilies.families
      .filter((family) => family.untriedTargetCount > 0)
      .slice(0, 8)
      .map((family) => family.familyName),
    familySourceProfileCount: captureFamilySourceProfiles.familyCount,
    topFamilySourceProfileNames: prioritizedFamilySourceProfiles
      .slice(0, 8)
      .map((family) => family.familyName),
    familyActionCount: captureFamilyActions.actionCount,
    topFamilyActionNames: prioritizedFamilyActions
      .slice(0, 8)
      .map((family) => family.familyName),
    familyReconstructionProfileCount: familyReconstructionProfiles.familyCount,
    topFamilyReconstructionProfileNames: prioritizedFamilyReconstructionProfiles
      .slice(0, 8)
      .map((family) => family.familyName),
    familyReconstructionMapCount: familyReconstructionMaps.familyCount,
    topFamilyReconstructionMapNames: prioritizedFamilyReconstructionMaps
      .slice(0, 8)
      .map((family) => family.familyName),
    familyReconstructionSectionCount: familyReconstructionSections.sectionCount,
    topFamilyReconstructionSectionKeys: prioritizedFamilyReconstructionSections
      .slice(0, 8)
      .map((section) => section.sectionKey),
    familyReconstructionSectionBundleCount: familyReconstructionSectionBundles.sectionCount,
    topFamilyReconstructionSectionBundleKeys: prioritizedFamilyReconstructionSectionBundles
      .slice(0, 8)
      .map((section) => section.sectionKey),
    rawPayloadBlockedCaptureTargetCount: nextCaptureTargets.targets.filter((target) => target.blockerClass === "raw-payload-blocked").length,
    rawPayloadBlockedFamilyCount: rawPayloadBlockedFamilies.length,
    rawPayloadBlockedFamilyNames: rawPayloadBlockedFamilies.slice(0, 8).map((family) => family.familyName),
    nextCaptureTargetCount: nextCaptureTargets.targetCount,
    nextOperatorAction: blockerSummary.nextOperatorAction,
    blockerHighlights: blockerSummary.blockerHighlights
  };
}
