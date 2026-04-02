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
export type CaptureTargetStrategy = "preferred-alternates" | "raw-root-only" | "direct-only";
export type CaptureTargetBlockerClass = "raw-payload-blocked";

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
  runtimeRequestLogPath: string;
  requestBackedStaticHintsPath: string;
  entryPointsPath: string;
  urlInventoryPath: string;
  runtimeCandidatesPath: string;
  bundleAssetMapPath: string;
  atlasManifestsPath: string;
  nextCaptureTargetsPath: string;
  captureTargetFamiliesPath: string;
  captureBlockerFamiliesPath: string;
  captureFamilySourceProfilesPath: string;
  captureFamilyActionsPath: string;
  familyActionRunPath: string;
  familyActionWorksetsRoot: string;
  familyReconstructionBundlesRoot: string;
  familyReconstructionProfilesPath: string;
  familyReconstructionMapsPath: string;
  familyReconstructionSectionsPath: string;
  familyReconstructionSectionBundlesPath: string;
  sectionActionRunPath: string;
  sectionReconstructionWorksetsRoot: string;
  sectionReconstructionBundlesRoot: string;
  sectionReconstructionProfilesPath: string;
  sectionSkinBlueprintsRoot: string;
  sectionSkinBlueprintProfilesPath: string;
  sectionSkinRenderPlansRoot: string;
  sectionSkinRenderPlanProfilesPath: string;
  sectionSkinMaterialPlansRoot: string;
  sectionSkinMaterialPlanProfilesPath: string;
  sectionSkinMaterialReviewBundlesRoot: string;
  sectionSkinMaterialReviewBundleProfilesPath: string;
  sectionSkinPageMatchBundlesRoot: string;
  sectionSkinPageMatchBundleProfilesPath: string;
  sectionSkinPageLockBundlesRoot: string;
  sectionSkinPageLockBundleProfilesPath: string;
  sectionSkinTextureInputBundlesRoot: string;
  sectionSkinTextureInputBundleProfilesPath: string;
  sectionSkinTextureSourcePlansRoot: string;
  sectionSkinTextureSourcePlanProfilesPath: string;
  sectionSkinTextureReconstructionBundlesRoot: string;
  sectionSkinTextureReconstructionBundleProfilesPath: string;
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

export interface BundleImageVariantRecord {
  bundleSourceUrl: string;
  bundleLocalPath: string;
  logicalPath: string;
  resolvedUrl: string | null;
  requestBaseUrl: string | null;
  confidence: ReferenceConfidence;
  localStatus: "downloaded" | "inventory-only" | "missing";
  localPath: string | null;
  variantKeys: string[];
  variants: Record<string, string>;
  variantUrls: Array<{
    key: string;
    url: string;
    note: string;
  }>;
  variantCount: number;
  note: string;
}

export interface BundleTranslationPayloadRecord {
  bundleSourceUrl: string;
  bundleLocalPath: string;
  rootUrl: string;
  locale: string;
  localeHintSource: "default-language" | "rules-url" | "direct-payload";
  payloadUrl: string;
  confidence: ReferenceConfidence;
  localStatus: "downloaded" | "inventory-only" | "missing";
  localPath: string | null;
  note: string;
}

export interface BundleAssetMapFile {
  schemaVersion: string;
  donorId: string;
  donorName: string;
  generatedAt: string;
  status: BundleAssetMapStatus;
  bundleCount: number;
  referenceCount: number;
  imageVariantStatus: BundleAssetMapStatus;
  imageVariantEntryCount: number;
  imageVariantSuffixCount: number;
  imageVariantUrlBuilderStatus: BundleAssetMapStatus;
  imageVariantUrlCount: number;
  imageVariantFieldCounts: Record<string, number>;
  translationPayloadStatus: BundleAssetMapStatus;
  translationPayloadCount: number;
  translationLocaleHintCount: number;
  countsByConfidence: Record<ReferenceConfidence, number>;
  countsByCategory: Record<string, number>;
  bundles: Array<{
    sourceUrl: string;
    localPath: string;
    referenceCount: number;
  }>;
  imageVariants: BundleImageVariantRecord[];
  translationPayloads: BundleTranslationPayloadRecord[];
  references: BundleAssetMapReference[];
}

export interface AlternateCaptureHintRecord {
  url: string;
  source: string;
  confidence: ReferenceConfidence;
  note: string;
}

export interface RequestBackedStaticHintRecord {
  canonicalSourceUrl: string;
  latestRequestUrl: string;
  alternateUrl: string;
  runtimeRelativePath: string | null;
  requestSource: string;
  requestCategory: "static-asset";
  fileType: string | null;
  category: string;
  hitCount: number;
  hintType: "redirect-target" | "rooted-path-alias";
  confidence: ReferenceConfidence;
  note: string;
  evidencePath: string | null;
}

export interface RequestBackedStaticHintFile {
  schemaVersion: string;
  donorId: string;
  donorName: string;
  generatedAt: string;
  evidencePath: string | null;
  observedStaticRequestCount: number;
  hintCount: number;
  hints: RequestBackedStaticHintRecord[];
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
  bundleImageVariantStatus: BundleAssetMapStatus;
  bundleImageVariantCount: number;
  bundleImageVariantSuffixCount: number;
  bundleImageVariantUrlBuilderStatus: BundleAssetMapStatus;
  bundleImageVariantUrlCount: number;
  translationPayloadStatus: BundleAssetMapStatus;
  translationPayloadCount: number;
  mirrorCandidateStatus: MirrorCandidateStatus;
  captureFamilyCount: number;
  topCaptureFamilyNames: string[];
  familySourceProfileCount: number;
  topFamilySourceProfileNames: string[];
  familyActionCount: number;
  topFamilyActionNames: string[];
  familyReconstructionProfileCount: number;
  topFamilyReconstructionProfileNames: string[];
  familyReconstructionMapCount: number;
  topFamilyReconstructionMapNames: string[];
  familyReconstructionSectionCount: number;
  topFamilyReconstructionSectionKeys: string[];
  familyReconstructionSectionBundleCount: number;
  topFamilyReconstructionSectionBundleKeys: string[];
  rawPayloadBlockedCaptureTargetCount: number;
  rawPayloadBlockedFamilyCount: number;
  rawPayloadBlockedFamilyNames: string[];
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
  alternateCaptureHints: AlternateCaptureHintRecord[];
  captureStrategy: CaptureTargetStrategy;
  recentCaptureStatus: "untried" | "blocked";
  recentCaptureAttemptCount: number;
  recentCaptureFailureReason: string | null;
  blockerClass: CaptureTargetBlockerClass | null;
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

export interface CaptureBlockerFamilyRecord {
  familyName: string;
  blockerClass: CaptureTargetBlockerClass;
  targetCount: number;
  minRank: number;
  targetKinds: string[];
  captureStrategies: CaptureTargetStrategy[];
  locationPrefixes: string[];
  recentCaptureAttemptCountMax: number;
  recentCaptureFailureReasons: string[];
  sampleUrls: string[];
}

export interface CaptureBlockerFamiliesFile {
  schemaVersion: string;
  donorId: string;
  donorName: string;
  generatedAt: string;
  familyCount: number;
  families: CaptureBlockerFamilyRecord[];
}

export interface CaptureTargetFamilyRecord {
  familyName: string;
  targetCount: number;
  untriedTargetCount: number;
  blockedTargetCount: number;
  minRank: number;
  minUntriedRank: number | null;
  targetKinds: string[];
  captureStrategies: CaptureTargetStrategy[];
  locationPrefixes: string[];
  recentCaptureAttemptCountMax: number;
  recentCaptureFailureReasons: string[];
  sampleUrls: string[];
}

export interface CaptureTargetFamiliesFile {
  schemaVersion: string;
  donorId: string;
  donorName: string;
  generatedAt: string;
  familyCount: number;
  families: CaptureTargetFamilyRecord[];
}

export type CaptureFamilySourceState =
  | "local-pages-complete"
  | "partial-local-pages"
  | "variant-backed"
  | "bundle-evidence-only"
  | "raw-only";

export interface CaptureFamilySourceProfileRecord {
  familyName: string;
  sourceState: CaptureFamilySourceState;
  targetCount: number;
  untriedTargetCount: number;
  blockedTargetCount: number;
  atlasManifestKinds: AtlasManifestRecord["kind"][];
  atlasManifestSources: string[];
  atlasPageRefCount: number;
  localPageCount: number;
  missingPageCount: number;
  localPagePaths: string[];
  missingPageUrls: string[];
  captureStrategies: CaptureTargetStrategy[];
  locationPrefixes: string[];
  sameFamilyBundleReferenceCount: number;
  sameFamilyVariantAssetCount: number;
  localSameFamilyBundleReferenceCount: number;
  localSameFamilyVariantAssetCount: number;
  localRelatedBundleAssetCount: number;
  localRelatedVariantAssetCount: number;
  sameFamilyBundleReferencePreview: string[];
  sameFamilyVariantAssetPreview: string[];
  localSourceAssetPreview: string[];
  relatedBundleAssetHints: string[];
  relatedVariantAssetHints: string[];
  sampleTargetUrls: string[];
  topUntriedTargetUrls: string[];
  topBlockedTargetUrls: string[];
  rawPayloadBlockedReason: string | null;
  nextStep: string;
}

export interface CaptureFamilySourceProfilesFile {
  schemaVersion: string;
  donorId: string;
  donorName: string;
  generatedAt: string;
  familyCount: number;
  families: CaptureFamilySourceProfileRecord[];
}

export type CaptureFamilyActionClass =
  | "use-local-sources"
  | "capture-family-sources"
  | "capture-missing-pages"
  | "review-bundle-evidence"
  | "source-discovery-required";

export interface CaptureFamilyActionRecord {
  familyName: string;
  actionClass: CaptureFamilyActionClass;
  priority: "high" | "medium" | "low";
  targetCount: number;
  blockedTargetCount: number;
  localSourceAssetCount: number;
  localPageCount: number;
  atlasPageRefCount: number;
  sameFamilyVariantAssetCount: number;
  sameFamilyBundleReferenceCount: number;
  reason: string;
  nextStep: string;
  sampleEvidence: string | null;
}

export interface CaptureFamilyActionsFile {
  schemaVersion: string;
  donorId: string;
  donorName: string;
  generatedAt: string;
  actionCount: number;
  families: CaptureFamilyActionRecord[];
}

export type CaptureRunStatus = "captured" | "partial" | "blocked" | "skipped";
export type CaptureRunMode = "ranked-targets" | "family-sources";
export type FamilyActionRunStatus = CaptureRunStatus | "prepared";
export type FamilyActionRunMode = CaptureRunMode | "prepare-workset" | "prepare-reconstruction-bundle";

export interface CaptureRunTargetResult {
  rank: number;
  url: string;
  relativePath: string;
  kind: string;
  priority: CaptureTargetPriority;
  status: "downloaded" | "failed" | "skipped";
  attemptedUrls: string[];
  downloadedFromUrl: string | null;
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
  requestedMode: CaptureRunMode;
  requestedLimit: number;
  requestedFamily: string | null;
  familyTargetCountBefore: number | null;
  familySourceCandidateCountBefore: number | null;
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

export interface FamilyActionWorksetFile {
  schemaVersion: string;
  donorId: string;
  donorName: string;
  generatedAt: string;
  familyName: string;
  actionClass: CaptureFamilyActionClass;
  priority: CaptureFamilyActionRecord["priority"];
  reason: string;
  nextStep: string;
  sampleEvidence: string | null;
  sourceState: CaptureFamilySourceProfileRecord["sourceState"] | "unknown";
  targetCount: number;
  blockedTargetCount: number;
  localSourceAssetCount: number;
  localPageCount: number;
  atlasPageRefCount: number;
  sameFamilyBundleReferenceCount: number;
  sameFamilyVariantAssetCount: number;
  localSourceAssetPreview: string[];
  localPagePaths: string[];
  sameFamilyBundleReferencePreview: string[];
  sameFamilyVariantAssetPreview: string[];
  relatedBundleAssetHints: string[];
  relatedVariantAssetHints: string[];
  sampleTargetUrls: string[];
  topUntriedTargetUrls: string[];
  topBlockedTargetUrls: string[];
  rawPayloadBlockedReason: string | null;
  preparedEvidenceCount: number;
  sourceProfilePath: string;
  familyActionsPath: string;
}

export type FamilyReconstructionReadiness =
  | "ready-with-local-sources"
  | "needs-more-source-discovery";

export type FamilyReconstructionLocalSourceKind =
  | "atlas-page"
  | "bundle-reference"
  | "bundle-image-variant"
  | "harvest-local";

export type FamilyReconstructionSourceRelation =
  | "same-family"
  | "related-family";

export interface FamilyReconstructionLocalSourceRecord {
  localPath: string;
  sourceUrl: string | null;
  resolvedUrl: string | null;
  sourceKind: FamilyReconstructionLocalSourceKind;
  relation: FamilyReconstructionSourceRelation;
  familyName: string;
  referenceText: string | null;
}

export interface FamilyReconstructionBundleFile {
  schemaVersion: string;
  donorId: string;
  donorName: string;
  generatedAt: string;
  familyName: string;
  actionClass: CaptureFamilyActionClass;
  sourceState: CaptureFamilySourceProfileRecord["sourceState"] | "unknown";
  readiness: FamilyReconstructionReadiness;
  reason: string;
  nextStep: string;
  targetCount: number;
  blockedTargetCount: number;
  atlasPageRefCount: number;
  localPageCount: number;
  localSourceAssetCount: number;
  sameFamilyBundleReferenceCount: number;
  sameFamilyVariantAssetCount: number;
  exactLocalSourceCount: number;
  relatedLocalSourceCount: number;
  localSources: FamilyReconstructionLocalSourceRecord[];
  sameFamilyBundleReferences: string[];
  sameFamilyVariantLogicalPaths: string[];
  relatedBundleHints: string[];
  relatedVariantHints: string[];
  openTargetUrls: string[];
  blockedTargetUrls: string[];
  worksetPath: string | null;
  sourceProfilePath: string;
  familyActionsPath: string;
}

export type FamilyReconstructionProfileState =
  | "ready-for-spine-atlas-reconstruction"
  | "ready-for-atlas-frame-import"
  | "ready-for-image-reconstruction"
  | "needs-manual-source-review";

export interface FamilyReconstructionProfileRecord {
  familyName: string;
  actionClass: CaptureFamilyActionClass;
  readiness: FamilyReconstructionBundleFile["readiness"];
  profileState: FamilyReconstructionProfileState;
  localSourceCount: number;
  exactLocalSourceCount: number;
  relatedLocalSourceCount: number;
  localSourceKinds: FamilyReconstructionLocalSourceRecord["sourceKind"][];
  atlasFileCount: number;
  atlasPageCount: number;
  atlasRegionCount: number;
  atlasPageNames: string[];
  atlasRegionPreview: string[];
  spineJsonCount: number;
  spineVersion: string | null;
  spineBoneCount: number;
  spineSlotCount: number;
  spineSkinCount: number;
  spineAnimationCount: number;
  spineAnimationNames: string[];
  frameManifestCount: number;
  frameCount: number;
  looseImageCount: number;
  sampleLocalSourcePath: string | null;
  worksetPath: string | null;
  reconstructionBundlePath: string;
  nextReconstructionStep: string;
}

export interface FamilyReconstructionProfilesFile {
  schemaVersion: string;
  donorId: string;
  donorName: string;
  generatedAt: string;
  familyCount: number;
  families: FamilyReconstructionProfileRecord[];
}

export type FamilyReconstructionAttachmentMatchType =
  | "path-exact"
  | "attachment-exact"
  | "slot-exact"
  | "unmapped";

export interface FamilyReconstructionAttachmentRecord {
  skinName: string;
  slotName: string;
  attachmentName: string;
  attachmentPath: string | null;
  matchType: FamilyReconstructionAttachmentMatchType;
  regionName: string | null;
  pageName: string | null;
}

export interface FamilyReconstructionMapRecord {
  familyName: string;
  profileState: FamilyReconstructionProfileState;
  readiness: FamilyReconstructionReadiness;
  atlasPageCount: number;
  atlasRegionCount: number;
  spineSkinCount: number;
  spineSlotCount: number;
  spineAttachmentCount: number;
  mappedAttachmentCount: number;
  unmappedAttachmentCount: number;
  mappedByMatchType: Record<Exclude<FamilyReconstructionAttachmentMatchType, "unmapped">, number>;
  animationNames: string[];
  sampleMappedAttachments: FamilyReconstructionAttachmentRecord[];
  sampleUnmappedAttachments: FamilyReconstructionAttachmentRecord[];
  sampleLocalSourcePath: string | null;
  reconstructionBundlePath: string;
  nextReconstructionStep: string;
  attachments: FamilyReconstructionAttachmentRecord[];
}

export interface FamilyReconstructionMapsFile {
  schemaVersion: string;
  donorId: string;
  donorName: string;
  generatedAt: string;
  familyCount: number;
  families: FamilyReconstructionMapRecord[];
}

export type FamilyReconstructionSectionType = "spine-skin";
export type FamilyReconstructionSectionState =
  | "ready-for-skin-reconstruction"
  | "needs-manual-section-review";

export interface FamilyReconstructionSectionRecord {
  familyName: string;
  sectionKey: string;
  sectionType: FamilyReconstructionSectionType;
  skinName: string;
  readiness: FamilyReconstructionReadiness;
  profileState: FamilyReconstructionProfileState;
  sectionState: FamilyReconstructionSectionState;
  attachmentCount: number;
  mappedAttachmentCount: number;
  unmappedAttachmentCount: number;
  atlasPageCount: number;
  atlasPageNames: string[];
  atlasRegionCount: number;
  regionPreview: string[];
  slotPreview: string[];
  animationNames: string[];
  sampleLocalSourcePath: string | null;
  reconstructionMapPath: string;
  nextSectionStep: string;
}

export interface FamilyReconstructionSectionsFile {
  schemaVersion: string;
  donorId: string;
  donorName: string;
  generatedAt: string;
  sectionCount: number;
  sections: FamilyReconstructionSectionRecord[];
}

export type FamilyReconstructionSectionBundleState =
  | "ready-with-grounded-attachments"
  | "needs-manual-section-review";

export interface FamilyReconstructionSectionBundleRecord {
  familyName: string;
  sectionKey: string;
  sectionType: FamilyReconstructionSectionType;
  skinName: string;
  readiness: FamilyReconstructionReadiness;
  profileState: FamilyReconstructionProfileState;
  sectionState: FamilyReconstructionSectionState;
  bundleState: FamilyReconstructionSectionBundleState;
  attachmentCount: number;
  mappedAttachmentCount: number;
  unmappedAttachmentCount: number;
  atlasPageCount: number;
  atlasPageNames: string[];
  atlasRegionCount: number;
  atlasRegionNames: string[];
  slotNames: string[];
  animationNames: string[];
  exactLocalSourceCount: number;
  relatedLocalSourceCount: number;
  localSources: FamilyReconstructionLocalSourceRecord[];
  sampleLocalSourcePath: string | null;
  reconstructionBundlePath: string;
  reconstructionMapPath: string;
  nextSectionStep: string;
  attachments: FamilyReconstructionAttachmentRecord[];
}

export interface FamilyReconstructionSectionBundlesFile {
  schemaVersion: string;
  donorId: string;
  donorName: string;
  generatedAt: string;
  sectionCount: number;
  sections: FamilyReconstructionSectionBundleRecord[];
}

export interface SectionReconstructionWorksetFile {
  schemaVersion: string;
  donorId: string;
  donorName: string;
  generatedAt: string;
  familyName: string;
  sectionKey: string;
  sectionType: FamilyReconstructionSectionType;
  skinName: string;
  bundleState: FamilyReconstructionSectionBundleState;
  readiness: FamilyReconstructionReadiness;
  profileState: FamilyReconstructionProfileState;
  sectionState: FamilyReconstructionSectionState;
  attachmentCount: number;
  mappedAttachmentCount: number;
  unmappedAttachmentCount: number;
  atlasPageCount: number;
  atlasPageNames: string[];
  atlasRegionCount: number;
  atlasRegionNames: string[];
  slotNames: string[];
  animationNames: string[];
  exactLocalSourceCount: number;
  relatedLocalSourceCount: number;
  localSources: FamilyReconstructionLocalSourceRecord[];
  sampleLocalSourcePath: string | null;
  sectionBundlePath: string;
  reconstructionBundlePath: string;
  nextSectionStep: string;
  attachments: FamilyReconstructionAttachmentRecord[];
}

export type SectionActionRunStatus = "prepared" | "blocked";
export type SectionActionRunMode = "prepare-section-workset" | "prepare-section-reconstruction-bundle";

export interface SectionReconstructionPageGroupRecord {
  pageName: string;
  attachmentCount: number;
  attachmentNames: string[];
  slotNames: string[];
  regionNames: string[];
}

export interface SectionReconstructionSlotGroupRecord {
  slotName: string;
  attachmentCount: number;
  attachmentNames: string[];
  pageNames: string[];
  regionNames: string[];
}

export type SectionReconstructionBundleState =
  | "ready-for-section-skin-reconstruction"
  | "needs-manual-section-reconstruction";

export interface SectionReconstructionBundleFile {
  schemaVersion: string;
  donorId: string;
  donorName: string;
  generatedAt: string;
  familyName: string;
  sectionKey: string;
  sectionType: FamilyReconstructionSectionType;
  skinName: string;
  sourceReadiness: FamilyReconstructionReadiness;
  profileState: FamilyReconstructionProfileState;
  sectionState: FamilyReconstructionSectionState;
  sectionBundleState: FamilyReconstructionSectionBundleState;
  reconstructionState: SectionReconstructionBundleState;
  attachmentCount: number;
  mappedAttachmentCount: number;
  unmappedAttachmentCount: number;
  atlasPageCount: number;
  atlasPageNames: string[];
  atlasRegionCount: number;
  atlasRegionNames: string[];
  slotCount: number;
  slotNames: string[];
  animationNames: string[];
  exactLocalSourceCount: number;
  relatedLocalSourceCount: number;
  localSources: FamilyReconstructionLocalSourceRecord[];
  sampleLocalSourcePath: string | null;
  worksetPath: string;
  sectionBundlePath: string;
  reconstructionBundlePath: string;
  nextReconstructionStep: string;
  pageGroups: SectionReconstructionPageGroupRecord[];
  slotGroups: SectionReconstructionSlotGroupRecord[];
  attachments: FamilyReconstructionAttachmentRecord[];
}

export interface SectionReconstructionProfileRecord {
  familyName: string;
  sectionKey: string;
  skinName: string;
  reconstructionState: SectionReconstructionBundleState;
  attachmentCount: number;
  mappedAttachmentCount: number;
  unmappedAttachmentCount: number;
  atlasPageCount: number;
  atlasRegionCount: number;
  slotCount: number;
  exactLocalSourceCount: number;
  relatedLocalSourceCount: number;
  sampleLocalSourcePath: string | null;
  worksetPath: string;
  reconstructionBundlePath: string;
  nextReconstructionStep: string;
}

export interface SectionReconstructionProfilesFile {
  schemaVersion: string;
  donorId: string;
  donorName: string;
  generatedAt: string;
  sectionCount: number;
  sections: SectionReconstructionProfileRecord[];
}

export type SectionSkinBlueprintState =
  | "ready-for-slot-order-reconstruction"
  | "needs-manual-slot-review";

export interface SectionSkinBlueprintSlotRecord {
  orderIndex: number;
  slotName: string;
  attachmentCount: number;
  attachmentNames: string[];
  attachmentPaths: string[];
  pageNames: string[];
  regionNames: string[];
}

export interface SectionSkinBlueprintPageRecord {
  orderIndex: number;
  pageName: string;
  attachmentCount: number;
  attachmentNames: string[];
  slotNames: string[];
  regionNames: string[];
}

export interface SectionSkinBlueprintFile {
  schemaVersion: string;
  donorId: string;
  donorName: string;
  generatedAt: string;
  familyName: string;
  sectionKey: string;
  skinName: string;
  blueprintState: SectionSkinBlueprintState;
  reconstructionState: SectionReconstructionBundleState;
  attachmentCount: number;
  mappedAttachmentCount: number;
  unmappedAttachmentCount: number;
  atlasPageCount: number;
  atlasPageNames: string[];
  slotCount: number;
  slotOrder: string[];
  exactLocalSourceCount: number;
  relatedLocalSourceCount: number;
  sampleLocalSourcePath: string | null;
  sectionBundlePath: string;
  reconstructionBundlePath: string;
  worksetPath: string;
  nextSkinStep: string;
  slots: SectionSkinBlueprintSlotRecord[];
  pages: SectionSkinBlueprintPageRecord[];
}

export interface SectionSkinBlueprintProfileRecord {
  familyName: string;
  sectionKey: string;
  skinName: string;
  blueprintState: SectionSkinBlueprintState;
  attachmentCount: number;
  mappedAttachmentCount: number;
  unmappedAttachmentCount: number;
  atlasPageCount: number;
  slotCount: number;
  exactLocalSourceCount: number;
  sampleLocalSourcePath: string | null;
  blueprintPath: string;
  nextSkinStep: string;
}

export interface SectionSkinBlueprintProfilesFile {
  schemaVersion: string;
  donorId: string;
  donorName: string;
  generatedAt: string;
  sectionCount: number;
  sections: SectionSkinBlueprintProfileRecord[];
}

export type SectionSkinRenderPlanState =
  | "ready-for-layered-render-reconstruction"
  | "needs-manual-render-review";

export type SectionSkinRenderLayerState =
  | "atlas-region-exact"
  | "missing-atlas-region";

export interface SectionSkinRenderBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SectionSkinRenderOffsets {
  x: number;
  y: number;
  originalWidth: number;
  originalHeight: number;
}

export interface SectionSkinRenderLayerRecord {
  orderIndex: number;
  slotName: string;
  attachmentName: string | null;
  attachmentPath: string | null;
  pageName: string | null;
  regionName: string | null;
  layerState: SectionSkinRenderLayerState;
  rotated: boolean;
  bounds: SectionSkinRenderBounds | null;
  offsets: SectionSkinRenderOffsets | null;
  localPagePath: string | null;
}

export interface SectionSkinRenderPlanFile {
  schemaVersion: string;
  donorId: string;
  donorName: string;
  generatedAt: string;
  familyName: string;
  sectionKey: string;
  skinName: string;
  renderState: SectionSkinRenderPlanState;
  blueprintState: SectionSkinBlueprintState;
  reconstructionState: SectionReconstructionBundleState;
  attachmentCount: number;
  mappedAttachmentCount: number;
  unmappedAttachmentCount: number;
  atlasPageCount: number;
  atlasPageNames: string[];
  slotCount: number;
  exactLocalSourceCount: number;
  relatedLocalSourceCount: number;
  sampleLocalSourcePath: string | null;
  atlasSourcePath: string | null;
  spineSourcePath: string | null;
  sectionBundlePath: string;
  reconstructionBundlePath: string;
  worksetPath: string;
  skinBlueprintPath: string;
  layerCount: number;
  mappedLayerCount: number;
  unmappedLayerCount: number;
  nextRenderStep: string;
  layers: SectionSkinRenderLayerRecord[];
}

export interface SectionSkinRenderPlanProfileRecord {
  familyName: string;
  sectionKey: string;
  skinName: string;
  renderState: SectionSkinRenderPlanState;
  layerCount: number;
  mappedLayerCount: number;
  unmappedLayerCount: number;
  atlasPageCount: number;
  exactLocalSourceCount: number;
  sampleLocalSourcePath: string | null;
  atlasSourcePath: string | null;
  renderPlanPath: string;
  nextRenderStep: string;
}

export interface SectionSkinRenderPlanProfilesFile {
  schemaVersion: string;
  donorId: string;
  donorName: string;
  generatedAt: string;
  sectionCount: number;
  sections: SectionSkinRenderPlanProfileRecord[];
}

export type SectionSkinMaterialState =
  | "ready-with-exact-page-images"
  | "needs-related-image-review"
  | "needs-page-source-discovery";

export interface SectionSkinMaterialCandidateRecord {
  localPath: string;
  sourceKind: FamilyReconstructionLocalSourceRecord["sourceKind"];
  relation: FamilyReconstructionLocalSourceRecord["relation"];
  familyName: string;
  score: number;
  matchedTokens: string[];
  reasons: string[];
}

export interface SectionSkinMaterialPageRecord {
  orderIndex: number;
  pageName: string;
  layerCount: number;
  slotNames: string[];
  exactPageLocalPath: string | null;
  relatedImageCandidateCount: number;
  topRelatedImageCandidates: SectionSkinMaterialCandidateRecord[];
}

export interface SectionSkinMaterialPlanFile {
  schemaVersion: string;
  donorId: string;
  donorName: string;
  generatedAt: string;
  familyName: string;
  sectionKey: string;
  skinName: string;
  materialState: SectionSkinMaterialState;
  renderState: SectionSkinRenderPlanState;
  blueprintState: SectionSkinBlueprintState;
  reconstructionState: SectionReconstructionBundleState;
  pageCount: number;
  exactPageImageCount: number;
  missingPageImageCount: number;
  pageCandidateReadyCount: number;
  relatedImageCandidateCount: number;
  topCandidateLocalPath: string | null;
  exactLocalSourceCount: number;
  relatedLocalSourceCount: number;
  sampleLocalSourcePath: string | null;
  atlasSourcePath: string | null;
  renderPlanPath: string;
  skinBlueprintPath: string;
  reconstructionBundlePath: string;
  nextMaterialStep: string;
  pages: SectionSkinMaterialPageRecord[];
  relatedImageCandidates: SectionSkinMaterialCandidateRecord[];
}

export interface SectionSkinMaterialPlanProfileRecord {
  familyName: string;
  sectionKey: string;
  skinName: string;
  materialState: SectionSkinMaterialState;
  pageCount: number;
  exactPageImageCount: number;
  missingPageImageCount: number;
  pageCandidateReadyCount: number;
  relatedImageCandidateCount: number;
  topCandidateLocalPath: string | null;
  sampleLocalSourcePath: string | null;
  atlasSourcePath: string | null;
  materialPlanPath: string;
  nextMaterialStep: string;
}

export interface SectionSkinMaterialPlanProfilesFile {
  schemaVersion: string;
  donorId: string;
  donorName: string;
  generatedAt: string;
  sectionCount: number;
  sections: SectionSkinMaterialPlanProfileRecord[];
}

export type SectionSkinMaterialReviewState =
  | "ready-with-exact-page-images"
  | "ready-for-candidate-review"
  | "needs-page-source-discovery";

export type SectionSkinMaterialReviewPageState =
  | "ready-with-exact-page-image"
  | "needs-candidate-review"
  | "blocked-missing-page-source";

export interface SectionSkinMaterialReviewPageRecord {
  orderIndex: number;
  pageName: string;
  pageState: SectionSkinMaterialReviewPageState;
  layerCount: number;
  slotNames: string[];
  exactPageLocalPath: string | null;
  candidateCount: number;
  recommendedCandidateLocalPath: string | null;
  recommendedCandidateScore: number | null;
  recommendedCandidateReasons: string[];
  recommendedCandidateMatchedTokens: string[];
  topCandidates: SectionSkinMaterialCandidateRecord[];
}

export interface SectionSkinMaterialReviewBundleFile {
  schemaVersion: string;
  donorId: string;
  donorName: string;
  generatedAt: string;
  familyName: string;
  sectionKey: string;
  skinName: string;
  reviewState: SectionSkinMaterialReviewState;
  materialState: SectionSkinMaterialState;
  renderState: SectionSkinRenderPlanState;
  blueprintState: SectionSkinBlueprintState;
  reconstructionState: SectionReconstructionBundleState;
  pageCount: number;
  exactPageImageCount: number;
  missingPageImageCount: number;
  reviewReadyPageCount: number;
  blockedPageCount: number;
  topCandidateLocalPath: string | null;
  sampleLocalSourcePath: string | null;
  atlasSourcePath: string | null;
  materialPlanPath: string;
  renderPlanPath: string;
  skinBlueprintPath: string;
  reconstructionBundlePath: string;
  nextReviewStep: string;
  pages: SectionSkinMaterialReviewPageRecord[];
}

export interface SectionSkinMaterialReviewBundleProfileRecord {
  familyName: string;
  sectionKey: string;
  skinName: string;
  reviewState: SectionSkinMaterialReviewState;
  pageCount: number;
  exactPageImageCount: number;
  missingPageImageCount: number;
  reviewReadyPageCount: number;
  blockedPageCount: number;
  topCandidateLocalPath: string | null;
  sampleLocalSourcePath: string | null;
  atlasSourcePath: string | null;
  reviewBundlePath: string;
  nextReviewStep: string;
}

export interface SectionSkinMaterialReviewBundleProfilesFile {
  schemaVersion: string;
  donorId: string;
  donorName: string;
  generatedAt: string;
  sectionCount: number;
  sections: SectionSkinMaterialReviewBundleProfileRecord[];
}

export type SectionSkinPageMatchState =
  | "ready-with-exact-page-images"
  | "ready-for-page-match-lock"
  | "needs-page-source-discovery";

export type SectionSkinPageMatchPageState =
  | "ready-with-exact-page-image"
  | "proposed-page-match"
  | "blocked-missing-page-source";

export interface SectionSkinPageMatchPageRecord {
  orderIndex: number;
  pageName: string;
  pageState: SectionSkinPageMatchPageState;
  layerCount: number;
  slotNames: string[];
  exactPageLocalPath: string | null;
  proposedMatchLocalPath: string | null;
  proposedMatchScore: number | null;
  proposedMatchReasons: string[];
  proposedMatchMatchedTokens: string[];
  proposedMatchRelation: SectionSkinMaterialCandidateRecord["relation"] | null;
  proposedMatchSourceKind: SectionSkinMaterialCandidateRecord["sourceKind"] | null;
}

export interface SectionSkinPageMatchBundleFile {
  schemaVersion: string;
  donorId: string;
  donorName: string;
  generatedAt: string;
  familyName: string;
  sectionKey: string;
  skinName: string;
  matchState: SectionSkinPageMatchState;
  reviewState: SectionSkinMaterialReviewState;
  materialState: SectionSkinMaterialState;
  renderState: SectionSkinRenderPlanState;
  blueprintState: SectionSkinBlueprintState;
  reconstructionState: SectionReconstructionBundleState;
  pageCount: number;
  exactPageImageCount: number;
  proposedMatchCount: number;
  blockedPageCount: number;
  topProposedMatchLocalPath: string | null;
  sampleLocalSourcePath: string | null;
  atlasSourcePath: string | null;
  materialReviewBundlePath: string;
  materialPlanPath: string;
  renderPlanPath: string;
  nextMatchStep: string;
  pages: SectionSkinPageMatchPageRecord[];
}

export interface SectionSkinPageMatchBundleProfileRecord {
  familyName: string;
  sectionKey: string;
  skinName: string;
  matchState: SectionSkinPageMatchState;
  pageCount: number;
  exactPageImageCount: number;
  proposedMatchCount: number;
  blockedPageCount: number;
  topProposedMatchLocalPath: string | null;
  sampleLocalSourcePath: string | null;
  atlasSourcePath: string | null;
  pageMatchBundlePath: string;
  nextMatchStep: string;
}

export interface SectionSkinPageMatchBundleProfilesFile {
  schemaVersion: string;
  donorId: string;
  donorName: string;
  generatedAt: string;
  sectionCount: number;
  sections: SectionSkinPageMatchBundleProfileRecord[];
}

export type SectionSkinPageLockState =
  | "ready-with-exact-page-locks"
  | "ready-for-page-lock-review"
  | "needs-page-source-lock";

export type SectionSkinPageLockPageState =
  | "exact-page-lock"
  | "proposed-page-lock"
  | "missing-page-lock";

export interface SectionSkinPageLockPageRecord {
  orderIndex: number;
  pageName: string;
  pageState: SectionSkinPageLockPageState;
  layerCount: number;
  slotNames: string[];
  selectedLocalPath: string | null;
  sourceSelection: SectionSkinTextureSourceSelection;
  proposedMatchScore: number | null;
}

export interface SectionSkinPageLockBundleFile {
  schemaVersion: string;
  donorId: string;
  donorName: string;
  generatedAt: string;
  familyName: string;
  sectionKey: string;
  skinName: string;
  pageLockState: SectionSkinPageLockState;
  textureReconstructionState: SectionSkinTextureReconstructionState;
  textureSourceState: SectionSkinTextureSourceState;
  matchState: SectionSkinPageMatchState;
  reviewState: SectionSkinMaterialReviewState;
  materialState: SectionSkinMaterialState;
  renderState: SectionSkinRenderPlanState;
  blueprintState: SectionSkinBlueprintState;
  reconstructionState: SectionReconstructionBundleState;
  pageCount: number;
  exactPageLockCount: number;
  proposedPageLockCount: number;
  missingPageLockCount: number;
  reconstructableLayerCount: number;
  blockedLayerCount: number;
  topLockedLocalPath: string | null;
  sampleLocalSourcePath: string | null;
  atlasSourcePath: string | null;
  textureReconstructionBundlePath: string;
  pageMatchBundlePath: string;
  nextPageLockStep: string;
  pages: SectionSkinPageLockPageRecord[];
}

export interface SectionSkinPageLockBundleProfileRecord {
  familyName: string;
  sectionKey: string;
  skinName: string;
  pageLockState: SectionSkinPageLockState;
  pageCount: number;
  exactPageLockCount: number;
  proposedPageLockCount: number;
  missingPageLockCount: number;
  reconstructableLayerCount: number;
  blockedLayerCount: number;
  topLockedLocalPath: string | null;
  sampleLocalSourcePath: string | null;
  atlasSourcePath: string | null;
  pageLockBundlePath: string;
  nextPageLockStep: string;
}

export interface SectionSkinPageLockBundleProfilesFile {
  schemaVersion: string;
  donorId: string;
  donorName: string;
  generatedAt: string;
  sectionCount: number;
  sections: SectionSkinPageLockBundleProfileRecord[];
}

export type SectionSkinTextureInputState =
  | "ready-with-exact-page-locks"
  | "ready-with-proposed-page-locks"
  | "needs-page-lock-review";

export type SectionSkinTextureInputLayerState =
  | "ready-with-exact-page-lock"
  | "ready-with-proposed-page-lock"
  | "needs-page-lock-review"
  | "missing-atlas-geometry";

export interface SectionSkinTextureInputPageRecord {
  orderIndex: number;
  pageName: string;
  pageState: SectionSkinPageLockPageState;
  layerCount: number;
  slotNames: string[];
  selectedLocalPath: string | null;
  proposedMatchScore: number | null;
}

export interface SectionSkinTextureInputLayerRecord {
  orderIndex: number;
  slotName: string;
  attachmentName: string | null;
  attachmentPath: string | null;
  pageName: string | null;
  regionName: string | null;
  layerState: SectionSkinTextureInputLayerState;
  pageState: SectionSkinPageLockPageState;
  selectedLocalPath: string | null;
  rotated: boolean;
  bounds: SectionSkinRenderBounds | null;
  offsets: SectionSkinRenderOffsets | null;
}

export interface SectionSkinTextureInputBundleFile {
  schemaVersion: string;
  donorId: string;
  donorName: string;
  generatedAt: string;
  familyName: string;
  sectionKey: string;
  skinName: string;
  textureInputState: SectionSkinTextureInputState;
  pageLockState: SectionSkinPageLockState;
  textureReconstructionState: SectionSkinTextureReconstructionState;
  textureSourceState: SectionSkinTextureSourceState;
  matchState: SectionSkinPageMatchState;
  reviewState: SectionSkinMaterialReviewState;
  materialState: SectionSkinMaterialState;
  renderState: SectionSkinRenderPlanState;
  blueprintState: SectionSkinBlueprintState;
  reconstructionState: SectionReconstructionBundleState;
  pageCount: number;
  exactPageLockCount: number;
  proposedPageLockCount: number;
  missingPageLockCount: number;
  layerCount: number;
  readyLayerCount: number;
  blockedLayerCount: number;
  topLockedLocalPath: string | null;
  sampleLocalSourcePath: string | null;
  atlasSourcePath: string | null;
  pageLockBundlePath: string;
  textureReconstructionBundlePath: string;
  nextTextureInputStep: string;
  pages: SectionSkinTextureInputPageRecord[];
  layers: SectionSkinTextureInputLayerRecord[];
}

export interface SectionSkinTextureInputBundleProfileRecord {
  familyName: string;
  sectionKey: string;
  skinName: string;
  textureInputState: SectionSkinTextureInputState;
  pageCount: number;
  exactPageLockCount: number;
  proposedPageLockCount: number;
  missingPageLockCount: number;
  layerCount: number;
  readyLayerCount: number;
  blockedLayerCount: number;
  topLockedLocalPath: string | null;
  sampleLocalSourcePath: string | null;
  atlasSourcePath: string | null;
  textureInputBundlePath: string;
  nextTextureInputStep: string;
}

export interface SectionSkinTextureInputBundleProfilesFile {
  schemaVersion: string;
  donorId: string;
  donorName: string;
  generatedAt: string;
  sectionCount: number;
  sections: SectionSkinTextureInputBundleProfileRecord[];
}

export type SectionSkinTextureSourceState =
  | "ready-with-exact-page-sources"
  | "ready-with-proposed-page-sources"
  | "needs-page-match-lock";

export type SectionSkinTextureSourceSelection =
  | "exact-page"
  | "proposed-page-match"
  | "missing";

export interface SectionSkinTextureSourcePageRecord {
  orderIndex: number;
  pageName: string;
  sourceSelection: SectionSkinTextureSourceSelection;
  layerCount: number;
  slotNames: string[];
  sourceLocalPath: string | null;
}

export interface SectionSkinTextureSourceLayerRecord {
  orderIndex: number;
  slotName: string;
  attachmentName: string | null;
  pageName: string | null;
  layerState: SectionSkinRenderLayerState;
  sourceSelection: SectionSkinTextureSourceSelection;
  sourceLocalPath: string | null;
}

export interface SectionSkinTextureSourcePlanFile {
  schemaVersion: string;
  donorId: string;
  donorName: string;
  generatedAt: string;
  familyName: string;
  sectionKey: string;
  skinName: string;
  textureSourceState: SectionSkinTextureSourceState;
  matchState: SectionSkinPageMatchState;
  reviewState: SectionSkinMaterialReviewState;
  materialState: SectionSkinMaterialState;
  renderState: SectionSkinRenderPlanState;
  blueprintState: SectionSkinBlueprintState;
  reconstructionState: SectionReconstructionBundleState;
  pageCount: number;
  exactPageSourceCount: number;
  proposedPageSourceCount: number;
  missingPageSourceCount: number;
  topTextureSourceLocalPath: string | null;
  sampleLocalSourcePath: string | null;
  atlasSourcePath: string | null;
  renderPlanPath: string;
  materialPlanPath: string;
  materialReviewBundlePath: string;
  pageMatchBundlePath: string;
  nextTextureStep: string;
  pages: SectionSkinTextureSourcePageRecord[];
  layers: SectionSkinTextureSourceLayerRecord[];
}

export interface SectionSkinTextureSourcePlanProfileRecord {
  familyName: string;
  sectionKey: string;
  skinName: string;
  textureSourceState: SectionSkinTextureSourceState;
  pageCount: number;
  exactPageSourceCount: number;
  proposedPageSourceCount: number;
  missingPageSourceCount: number;
  topTextureSourceLocalPath: string | null;
  sampleLocalSourcePath: string | null;
  atlasSourcePath: string | null;
  textureSourcePlanPath: string;
  nextTextureStep: string;
}

export interface SectionSkinTextureSourcePlanProfilesFile {
  schemaVersion: string;
  donorId: string;
  donorName: string;
  generatedAt: string;
  sectionCount: number;
  sections: SectionSkinTextureSourcePlanProfileRecord[];
}

export type SectionSkinTextureReconstructionState =
  | "ready-with-exact-page-sources"
  | "ready-with-proposed-page-sources"
  | "needs-page-source-lock";

export type SectionSkinTextureReconstructionLayerState =
  | "ready-with-exact-page-source"
  | "ready-with-proposed-page-source"
  | "missing-page-source"
  | "missing-atlas-geometry";

export interface SectionSkinTextureReconstructionPageRecord {
  orderIndex: number;
  pageName: string;
  sourceSelection: SectionSkinTextureSourceSelection;
  layerCount: number;
  slotNames: string[];
  sourceLocalPath: string | null;
}

export interface SectionSkinTextureReconstructionLayerRecord {
  orderIndex: number;
  slotName: string;
  attachmentName: string | null;
  attachmentPath: string | null;
  pageName: string | null;
  regionName: string | null;
  layerState: SectionSkinTextureReconstructionLayerState;
  sourceSelection: SectionSkinTextureSourceSelection;
  sourceLocalPath: string | null;
  rotated: boolean;
  bounds: SectionSkinRenderBounds | null;
  offsets: SectionSkinRenderOffsets | null;
}

export interface SectionSkinTextureReconstructionBundleFile {
  schemaVersion: string;
  donorId: string;
  donorName: string;
  generatedAt: string;
  familyName: string;
  sectionKey: string;
  skinName: string;
  textureReconstructionState: SectionSkinTextureReconstructionState;
  textureSourceState: SectionSkinTextureSourceState;
  matchState: SectionSkinPageMatchState;
  reviewState: SectionSkinMaterialReviewState;
  materialState: SectionSkinMaterialState;
  renderState: SectionSkinRenderPlanState;
  blueprintState: SectionSkinBlueprintState;
  reconstructionState: SectionReconstructionBundleState;
  pageCount: number;
  exactPageSourceCount: number;
  proposedPageSourceCount: number;
  missingPageSourceCount: number;
  layerCount: number;
  reconstructableLayerCount: number;
  blockedLayerCount: number;
  topTextureSourceLocalPath: string | null;
  sampleLocalSourcePath: string | null;
  atlasSourcePath: string | null;
  textureSourcePlanPath: string;
  pageMatchBundlePath: string;
  materialReviewBundlePath: string;
  materialPlanPath: string;
  renderPlanPath: string;
  nextTextureReconstructionStep: string;
  pages: SectionSkinTextureReconstructionPageRecord[];
  layers: SectionSkinTextureReconstructionLayerRecord[];
}

export interface SectionSkinTextureReconstructionBundleProfileRecord {
  familyName: string;
  sectionKey: string;
  skinName: string;
  textureReconstructionState: SectionSkinTextureReconstructionState;
  pageCount: number;
  exactPageSourceCount: number;
  proposedPageSourceCount: number;
  missingPageSourceCount: number;
  layerCount: number;
  reconstructableLayerCount: number;
  blockedLayerCount: number;
  topTextureSourceLocalPath: string | null;
  sampleLocalSourcePath: string | null;
  atlasSourcePath: string | null;
  textureReconstructionBundlePath: string;
  nextTextureReconstructionStep: string;
}

export interface SectionSkinTextureReconstructionBundleProfilesFile {
  schemaVersion: string;
  donorId: string;
  donorName: string;
  generatedAt: string;
  sectionCount: number;
  sections: SectionSkinTextureReconstructionBundleProfileRecord[];
}

export interface SectionActionRunFile {
  schemaVersion: string;
  donorId: string;
  donorName: string;
  generatedAt: string;
  familyName: string;
  sectionKey: string;
  requestedMode: SectionActionRunMode;
  status: SectionActionRunStatus;
  sectionBundlePath: string;
  worksetPath: string | null;
  reconstructionBundlePath: string | null;
  skinBlueprintPath: string | null;
  skinRenderPlanPath: string | null;
  skinMaterialPlanPath: string | null;
  skinMaterialReviewBundlePath: string | null;
  skinPageMatchBundlePath: string | null;
  skinPageLockBundlePath: string | null;
  skinTextureInputBundlePath: string | null;
  skinTextureSourcePlanPath: string | null;
  skinTextureReconstructionBundlePath: string | null;
  exactLocalSourceCount: number;
  attachmentCount: number;
  mappedAttachmentCount: number;
  unmappedAttachmentCount: number;
  nextOperatorAction: string;
}

export interface FamilyActionRunFile {
  schemaVersion: string;
  donorId: string;
  donorName: string;
  generatedAt: string;
  familyName: string;
  actionClass: CaptureFamilyActionClass;
  requestedLimit: number;
  requestedMode: FamilyActionRunMode;
  status: FamilyActionRunStatus;
  worksetPath: string | null;
  reconstructionBundlePath: string | null;
  captureRunPath: string | null;
  preparedEvidenceCount: number;
  reconstructionLocalSourceCount: number;
  localSourceAssetCount: number;
  targetCount: number;
  blockedTargetCount: number;
  attemptedCount: number;
  downloadedCount: number;
  failedCount: number;
  skippedCount: number;
  reason: string;
  nextStep: string;
  nextOperatorAction: string;
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
    runtimeRequestLogPath: path.join(harvestRoot, "runtime-request-log.json"),
    requestBackedStaticHintsPath: path.join(harvestRoot, "request-backed-static-hints.json"),
    entryPointsPath: path.join(harvestRoot, "entry-points.json"),
    urlInventoryPath: path.join(harvestRoot, "url-inventory.json"),
    runtimeCandidatesPath: path.join(harvestRoot, "runtime-candidates.json"),
    bundleAssetMapPath: path.join(harvestRoot, "bundle-asset-map.json"),
    atlasManifestsPath: path.join(harvestRoot, "atlas-manifests.json"),
    nextCaptureTargetsPath: path.join(harvestRoot, "next-capture-targets.json"),
    captureTargetFamiliesPath: path.join(harvestRoot, "capture-target-families.json"),
    captureBlockerFamiliesPath: path.join(harvestRoot, "capture-blocker-families.json"),
    captureFamilySourceProfilesPath: path.join(harvestRoot, "capture-family-source-profiles.json"),
    captureFamilyActionsPath: path.join(harvestRoot, "capture-family-actions.json"),
    familyActionRunPath: path.join(harvestRoot, "family-action-run.json"),
    familyActionWorksetsRoot: path.join(harvestRoot, "family-action-worksets"),
    familyReconstructionBundlesRoot: path.join(harvestRoot, "family-reconstruction-bundles"),
    familyReconstructionProfilesPath: path.join(harvestRoot, "family-reconstruction-profiles.json"),
    familyReconstructionMapsPath: path.join(harvestRoot, "family-reconstruction-maps.json"),
    familyReconstructionSectionsPath: path.join(harvestRoot, "family-reconstruction-sections.json"),
    familyReconstructionSectionBundlesPath: path.join(harvestRoot, "family-reconstruction-section-bundles.json"),
    sectionActionRunPath: path.join(harvestRoot, "section-action-run.json"),
    sectionReconstructionWorksetsRoot: path.join(harvestRoot, "section-reconstruction-worksets"),
    sectionReconstructionBundlesRoot: path.join(harvestRoot, "section-reconstruction-bundles"),
    sectionReconstructionProfilesPath: path.join(harvestRoot, "section-reconstruction-profiles.json"),
    sectionSkinBlueprintsRoot: path.join(harvestRoot, "section-skin-blueprints"),
    sectionSkinBlueprintProfilesPath: path.join(harvestRoot, "section-skin-blueprint-profiles.json"),
    sectionSkinRenderPlansRoot: path.join(harvestRoot, "section-skin-render-plans"),
    sectionSkinRenderPlanProfilesPath: path.join(harvestRoot, "section-skin-render-plan-profiles.json"),
    sectionSkinMaterialPlansRoot: path.join(harvestRoot, "section-skin-material-plans"),
    sectionSkinMaterialPlanProfilesPath: path.join(harvestRoot, "section-skin-material-plan-profiles.json"),
    sectionSkinMaterialReviewBundlesRoot: path.join(harvestRoot, "section-skin-material-review-bundles"),
    sectionSkinMaterialReviewBundleProfilesPath: path.join(harvestRoot, "section-skin-material-review-bundle-profiles.json"),
    sectionSkinPageMatchBundlesRoot: path.join(harvestRoot, "section-skin-page-match-bundles"),
    sectionSkinPageMatchBundleProfilesPath: path.join(harvestRoot, "section-skin-page-match-bundle-profiles.json"),
    sectionSkinPageLockBundlesRoot: path.join(harvestRoot, "section-skin-page-lock-bundles"),
    sectionSkinPageLockBundleProfilesPath: path.join(harvestRoot, "section-skin-page-lock-bundle-profiles.json"),
    sectionSkinTextureInputBundlesRoot: path.join(harvestRoot, "section-skin-texture-input-bundles"),
    sectionSkinTextureInputBundleProfilesPath: path.join(harvestRoot, "section-skin-texture-input-bundle-profiles.json"),
    sectionSkinTextureSourcePlansRoot: path.join(harvestRoot, "section-skin-texture-source-plans"),
    sectionSkinTextureSourcePlanProfilesPath: path.join(harvestRoot, "section-skin-texture-source-plan-profiles.json"),
    sectionSkinTextureReconstructionBundlesRoot: path.join(harvestRoot, "section-skin-texture-reconstruction-bundles"),
    sectionSkinTextureReconstructionBundleProfilesPath: path.join(harvestRoot, "section-skin-texture-reconstruction-bundle-profiles.json"),
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
    const normalizedCandidate = trimmed.startsWith("_resourcesPath_")
      ? trimmed.slice("_resourcesPath_".length)
      : trimmed;
    return rewriteKnownPlaceholderSegments(new URL(normalizedCandidate, baseUrl).toString());
  } catch {
    return null;
  }
}

export function rewriteKnownPlaceholderSegments(urlString: string): string {
  try {
    const parsed = new URL(urlString);
    const nextSegments = parsed.pathname
      .split("/")
      .map((segment) => segment.startsWith("_resourcesPath_") ? segment.slice("_resourcesPath_".length) : segment);
    const nextPathname = nextSegments.join("/").replace(/\/{2,}/g, "/");
    if (nextPathname !== parsed.pathname) {
      parsed.pathname = nextPathname;
    }
    return parsed.toString();
  } catch {
    return urlString.replace(/\/_resourcesPath_/g, "/").replace(/^_resourcesPath_/, "");
  }
}

export function buildAlternateCaptureHints(options: {
  url: string;
  kind: NextCaptureTargetRecord["kind"];
  category: string;
  bundleAssetMap: BundleAssetMapFile | null;
  requestBackedStaticHints?: RequestBackedStaticHintFile | null;
}): AlternateCaptureHintRecord[] {
  const hints: AlternateCaptureHintRecord[] = [];
  const targetHost = readUrlHost(options.url);
  const targetBasename = readUrlBasename(options.url)?.toLowerCase();
  const normalizedTargetUrl = rewriteKnownPlaceholderSegments(options.url);
  const rewrittenPrimaryUrl = rewriteKnownPlaceholderSegments(options.url);
  if (rewrittenPrimaryUrl !== options.url) {
    hints.push({
      url: rewrittenPrimaryUrl,
      source: "placeholder-rewrite",
      confidence: "likely",
      note: "Known placeholder-style path segments were normalized."
    });
  }

  if (options.requestBackedStaticHints) {
    for (const hint of options.requestBackedStaticHints.hints) {
      if (hint.canonicalSourceUrl !== normalizedTargetUrl || hint.alternateUrl === normalizedTargetUrl) {
        continue;
      }
      if (options.category === "image" && hint.category !== "image") {
        continue;
      }
      if (options.category !== "image" && hint.category !== options.category) {
        continue;
      }
      hints.push({
        url: hint.alternateUrl,
        source: `request-log:${hint.hintType}`,
        confidence: hint.confidence,
        note: hint.note
      });
    }
  }

  if (options.bundleAssetMap && targetHost && targetBasename) {
    for (const imageVariant of options.bundleAssetMap.imageVariants) {
      if (!imageVariant.requestBaseUrl || imageVariant.requestBaseUrl !== normalizedTargetUrl) {
        continue;
      }
      for (const variantUrl of imageVariant.variantUrls) {
        if (variantUrl.url === normalizedTargetUrl) {
          continue;
        }
        hints.push({
          url: variantUrl.url,
          source: `bundle-image-variant:${imageVariant.bundleLocalPath}:${variantUrl.key}`,
          confidence: "confirmed",
          note: variantUrl.note
        });
      }
    }

    for (const reference of options.bundleAssetMap.references) {
      if (!reference.resolvedUrl || reference.resolvedUrl === options.url) {
        continue;
      }
      if (readUrlHost(reference.resolvedUrl) !== targetHost) {
        continue;
      }
      if (readUrlBasename(reference.resolvedUrl)?.toLowerCase() !== targetBasename) {
        continue;
      }
      if (options.category === "image" && reference.category !== "image") {
        continue;
      }
      if (options.category !== "image" && reference.category !== options.category) {
        continue;
      }
      hints.push({
        url: reference.resolvedUrl,
        source: `bundle-reference:${reference.bundleLocalPath}`,
        confidence: reference.confidence,
        note: "Bundle asset-map uses the same basename under an alternate rooted path."
      });

      if (options.category !== "image") {
        continue;
      }

      for (const imageVariant of options.bundleAssetMap.imageVariants) {
        if (imageVariant.resolvedUrl !== reference.resolvedUrl) {
          continue;
        }
        for (const variantUrl of imageVariant.variantUrls) {
          if (variantUrl.url === normalizedTargetUrl || variantUrl.url === reference.resolvedUrl) {
            continue;
          }
          hints.push({
            url: variantUrl.url,
            source: `bundle-image-variant:${imageVariant.bundleLocalPath}:${variantUrl.key}`,
            confidence: "confirmed",
            note: `${variantUrl.note} The bundle also maps the current target basename to this alternate rooted family.`
          });
        }
      }
    }
  }

  const dedupedHints = new Map<string, AlternateCaptureHintRecord>();
  for (const hint of hints) {
    if (!dedupedHints.has(hint.url)) {
      dedupedHints.set(hint.url, hint);
    }
  }
  return [...dedupedHints.values()].sort((left, right) => compareAlternateCaptureHints(left, right));
}

export function isPreferredAlternateCaptureSource(source: unknown): boolean {
  if (typeof source !== "string") {
    return false;
  }
  return source.startsWith("request-log:") || source.startsWith("bundle-image-variant:");
}

function compareAlternateCaptureHints(
  left: AlternateCaptureHintRecord,
  right: AlternateCaptureHintRecord
): number {
  const priority = (hint: AlternateCaptureHintRecord): number => {
    if (hint.source.startsWith("request-log:")) {
      return 0;
    }
    if (hint.source.startsWith("bundle-image-variant:")) {
      return 1;
    }
    if (hint.source === "placeholder-rewrite") {
      return 2;
    }
    if (hint.source.startsWith("family-alias:")) {
      return 3;
    }
    if (hint.source.startsWith("bundle-reference:")) {
      return 4;
    }
    return 5;
  };
  const confidenceRank = (confidence: ReferenceConfidence): number => {
    switch (confidence) {
      case "confirmed":
        return 0;
      case "likely":
        return 1;
      default:
        return 2;
    }
  };

  const priorityDelta = priority(left) - priority(right);
  if (priorityDelta !== 0) {
    return priorityDelta;
  }
  const variantKeyRank = (hint: AlternateCaptureHintRecord): number => {
    if (!hint.source.startsWith("bundle-image-variant:")) {
      return 9;
    }
    if (hint.source.endsWith(":e")) {
      return 0;
    }
    if (hint.source.endsWith(":f_e")) {
      return 1;
    }
    return 2;
  };
  const variantDelta = variantKeyRank(left) - variantKeyRank(right);
  if (variantDelta !== 0) {
    return variantDelta;
  }
  const confidenceDelta = confidenceRank(left.confidence) - confidenceRank(right.confidence);
  if (confidenceDelta !== 0) {
    return confidenceDelta;
  }
  return left.url.localeCompare(right.url);
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
