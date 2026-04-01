import type { AssetClassificationSummary } from "./classifyAssets";
import type { AtlasManifestFile, BundleAssetMapFile, DonorScanPaths, RuntimeCandidatesFile } from "./shared";
import { toRepoRelativePath, writeTextFile } from "./shared";

interface WriteBlockerSummaryOptions {
  donorId: string;
  donorName: string;
  assetSummary: AssetClassificationSummary;
  runtimeCandidates: RuntimeCandidatesFile;
  bundleAssetMap: BundleAssetMapFile;
  atlasManifestFile: AtlasManifestFile;
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

  if (blockerHighlights.length === 0) {
    blockerHighlights.push("No major donor-scan blockers were detected in the bounded harvested surface.");
  }

  let nextOperatorAction = "Review the donor scan summary and decide whether deeper runtime capture is still needed.";
  if (!options.runtimeCandidates.partialLocalRuntimePackage) {
    nextOperatorAction = "Capture a grounded launch HTML plus runtime bundles so the donor scan has a real local runtime entry surface.";
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
    `- Mirror candidate status: \`${options.runtimeCandidates.mirrorCandidateStatus}\``,
    "",
    "## Early blocker answer",
    "",
    ...blockerHighlights.map((entry) => `- ${entry}`),
    "",
    "## Next operator step",
    "",
    `- ${nextOperatorAction}`,
    "",
    "## Backing artifacts",
    "",
    `- Entry points: \`${toRepoRelativePath(options.paths.entryPointsPath)}\``,
    `- URL inventory: \`${toRepoRelativePath(options.paths.urlInventoryPath)}\``,
    `- Runtime candidates: \`${toRepoRelativePath(options.paths.runtimeCandidatesPath)}\``,
    `- Bundle asset map: \`${toRepoRelativePath(options.paths.bundleAssetMapPath)}\``,
    `- Atlas manifests: \`${toRepoRelativePath(options.paths.atlasManifestsPath)}\``,
    `- Existing asset manifest: \`${toRepoRelativePath(options.paths.assetManifestPath)}\``,
    `- Existing package graph: \`${toRepoRelativePath(options.paths.packageGraphPath)}\``
  ];

  await writeTextFile(options.paths.blockerSummaryPath, `${lines.join("\n")}\n`);
  return {
    blockerHighlights,
    nextOperatorAction
  };
}
