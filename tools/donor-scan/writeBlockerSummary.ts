import type { AssetClassificationSummary } from "./classifyAssets";
import type { AtlasManifestFile, BundleAssetMapFile, CaptureRunFile, DonorScanPaths, NextCaptureTargetsFile, RuntimeCandidatesFile } from "./shared";
import { toRepoRelativePath, writeTextFile } from "./shared";

interface WriteBlockerSummaryOptions {
  donorId: string;
  donorName: string;
  assetSummary: AssetClassificationSummary;
  runtimeCandidates: RuntimeCandidatesFile;
  bundleAssetMap: BundleAssetMapFile;
  atlasManifestFile: AtlasManifestFile;
  nextCaptureTargets: NextCaptureTargetsFile;
  captureRun: CaptureRunFile | null;
  paths: DonorScanPaths;
}

export interface BlockerSummaryResult {
  blockerHighlights: string[];
  nextOperatorAction: string;
}

export async function writeBlockerSummary(options: WriteBlockerSummaryOptions): Promise<BlockerSummaryResult> {
  const blockerHighlights: string[] = [];

  if (!options.runtimeCandidates.partialLocalRuntimePackage) {
    blockerHighlights.push("Local runtime package work is blocked because launch HTML or downloaded runtime scripts are still missing.");
  } else if (!options.runtimeCandidates.fullLocalRuntimePackage) {
    blockerHighlights.push(`A strong partial local runtime package exists, but ${options.runtimeCandidates.unresolvedDependencyCount} runtime dependencies remain unresolved.`);
  }

  if (options.atlasManifestFile.frameManifestCount === 0 && options.atlasManifestFile.spineJsonCount === 0) {
    blockerHighlights.push("Atlas/frame import is blocked because no atlas, sprite-sheet, plist, or spine metadata has been captured locally.");
  } else if (options.atlasManifestFile.missingPageCount > 0) {
    blockerHighlights.push(`Atlas/frame metadata exists locally, but ${options.atlasManifestFile.missingPageCount} referenced page images are still missing.`);
  }

  if (options.bundleAssetMap.status !== "mapped") {
    blockerHighlights.push("Bundle asset-map extraction is blocked because no downloadable JavaScript bundles were available to scan.");
  } else if (options.bundleAssetMap.referenceCount === 0) {
    blockerHighlights.push("Bundle asset-map extraction completed, but it did not find grounded asset references yet.");
  }
  if (options.bundleAssetMap.imageVariantStatus === "mapped" && options.bundleAssetMap.imageVariantUrlBuilderStatus === "mapped") {
    blockerHighlights.push(`Bundle image metadata already proves ${options.bundleAssetMap.imageVariantUrlCount} grounded optimized image URLs, so the next capture lane can try real variant URLs instead of raw suffix tokens.`);
  }
  if (options.bundleAssetMap.translationPayloadStatus === "mapped") {
    blockerHighlights.push(`Bundle/runtime code already proves ${options.bundleAssetMap.translationPayloadCount} grounded translation payload URLs, so translation JSON capture no longer depends on guessing locale roots by hand.`);
  }

  if (blockerHighlights.length === 0) {
    blockerHighlights.push("No major donor-scan blockers were detected in the bounded harvested surface.");
  }

  const recentlyBlockedTargets = options.nextCaptureTargets.targets.filter((target) => target.recentCaptureStatus === "blocked");
  const rawPayloadBlockedTargets = options.nextCaptureTargets.targets.filter((target) => target.blockerClass === "raw-payload-blocked");
  const untriedTargets = options.nextCaptureTargets.targets.filter((target) => target.recentCaptureStatus !== "blocked");
  if (recentlyBlockedTargets.length > 0) {
    blockerHighlights.push(`${recentlyBlockedTargets.length} ranked capture targets were already retried in the latest guided capture run and still failed on every grounded URL attempt.`);
  }
  if (rawPayloadBlockedTargets.length > 0) {
    blockerHighlights.push(`${rawPayloadBlockedTargets.length} ranked image targets are now classified as raw-payload-blocked: donor scan exhausted only raw/direct grounded URLs for them and still has no stronger alternate capture path.`);
  }

  let nextOperatorAction = "Review the donor scan summary and decide whether deeper runtime capture is still needed.";
  if (!options.runtimeCandidates.partialLocalRuntimePackage) {
    nextOperatorAction = "Capture a grounded launch HTML plus runtime bundles so the donor scan has a real local runtime entry surface.";
  } else if (
    rawPayloadBlockedTargets.length >= Math.min(5, Math.max(1, options.nextCaptureTargets.targets.length))
    && untriedTargets.slice(0, 5).every((target) => target.captureStrategy !== "preferred-alternates")
  ) {
    nextOperatorAction = "The current top-ranked targets now only have raw rooted/direct URLs, and donor scan has already proven no stronger grounded alternates for this blocker class. Switch to deeper source discovery or review the raw-payload-blocked targets before repeating guided capture blindly.";
  } else if (recentlyBlockedTargets.length > 0 && untriedTargets.length > 0) {
    nextOperatorAction = "Run guided capture against the refreshed top-ranked targets first; donor scan already demoted the latest grounded dead ends and promoted the next untried URLs.";
  } else if (recentlyBlockedTargets.length >= Math.min(5, Math.max(1, options.nextCaptureTargets.targets.length))) {
    nextOperatorAction = "The latest guided capture already exhausted the current grounded URLs for the top ranked targets, so the next step is deeper source discovery rather than repeating the same capture run.";
  } else if (options.runtimeCandidates.unresolvedDependencyCount > 0) {
    nextOperatorAction = "Use bundle-discovered missing runtime URLs as the next mirror-capture target set until the unresolved dependency count falls.";
  } else if (options.atlasManifestFile.missingPageCount > 0) {
    nextOperatorAction = "Capture the atlas page images referenced by the local atlas/frame manifests before starting atlas import work.";
  } else if (options.atlasManifestFile.frameManifestCount === 0 && options.atlasManifestFile.spineJsonCount === 0) {
    nextOperatorAction = "Hunt runtime metadata files such as atlas, sprite-sheet, plist, or spine JSON before building atlas/frame import tooling.";
  }

  const lines = [
    "# Donor Scan Blocker Summary",
    "",
    `- Donor ID: \`${options.donorId}\``,
    `- Donor name: ${options.donorName}`,
    `- Runtime candidate count: ${options.runtimeCandidates.runtimeCandidateCount}`,
    `- Atlas metadata count: ${options.atlasManifestFile.manifests.length}`,
    `- Bundle asset-map status: \`${options.bundleAssetMap.status}\``,
    `- Bundle image variants: \`${options.bundleAssetMap.imageVariantStatus}\` (${options.bundleAssetMap.imageVariantEntryCount} logical entries / ${options.bundleAssetMap.imageVariantSuffixCount} suffix tokens)`,
    `- Bundle image URL rule: \`${options.bundleAssetMap.imageVariantUrlBuilderStatus}\` (${options.bundleAssetMap.imageVariantUrlCount} grounded variant URLs)`,
    `- Translation payloads: \`${options.bundleAssetMap.translationPayloadStatus}\` (${options.bundleAssetMap.translationPayloadCount} grounded locale JSON URLs)`,
    `- Mirror candidate status: \`${options.runtimeCandidates.mirrorCandidateStatus}\``,
    `- Next capture targets: ${options.nextCaptureTargets.targetCount}`,
    "",
    "## Early blocker answer",
    "",
    ...blockerHighlights.map((entry) => `- ${entry}`),
    "",
    "## Next operator step",
    "",
    `- ${nextOperatorAction}`,
    ...(options.nextCaptureTargets.targets.length > 0
      ? [
          "",
          "## Highest-priority next capture targets",
          "",
          ...options.nextCaptureTargets.targets.slice(0, 5).map((target) =>
            `- [${target.priority}] \`${target.relativePath}\` via \`${target.kind}\` — ${target.reason}${target.recentCaptureStatus === "blocked" ? ` (latest guided capture already tried ${target.recentCaptureAttemptCount} grounded URL${target.recentCaptureAttemptCount === 1 ? "" : "s"}${target.recentCaptureFailureReason ? ` and failed with ${target.recentCaptureFailureReason}` : ""})` : ""}`
          )
        ]
      : []),
    "",
    "## Backing artifacts",
    "",
    `- Entry points: \`${toRepoRelativePath(options.paths.entryPointsPath)}\``,
    `- URL inventory: \`${toRepoRelativePath(options.paths.urlInventoryPath)}\``,
    `- Runtime candidates: \`${toRepoRelativePath(options.paths.runtimeCandidatesPath)}\``,
    `- Bundle asset map: \`${toRepoRelativePath(options.paths.bundleAssetMapPath)}\``,
    `- Atlas manifests: \`${toRepoRelativePath(options.paths.atlasManifestsPath)}\``,
    `- Next capture targets: \`${toRepoRelativePath(options.paths.nextCaptureTargetsPath)}\``,
    `- Latest capture run: \`${toRepoRelativePath(options.paths.captureRunPath)}\``,
    `- Existing asset manifest: \`${toRepoRelativePath(options.paths.assetManifestPath)}\``,
    `- Existing package graph: \`${toRepoRelativePath(options.paths.packageGraphPath)}\``
  ];

  await writeTextFile(options.paths.blockerSummaryPath, `${lines.join("\n")}\n`);
  return {
    blockerHighlights,
    nextOperatorAction
  };
}
