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
  sectionSkinPageLockAuditBundlesRoot: string;
  sectionSkinPageLockAuditBundleProfilesPath: string;
  sectionSkinPageLockResolutionBundlesRoot: string;
  sectionSkinPageLockResolutionBundleProfilesPath: string;
  sectionSkinPageLockDecisionBundlesRoot: string;
  sectionSkinPageLockDecisionBundleProfilesPath: string;
  sectionSkinPageLockReviewBundlesRoot: string;
  sectionSkinPageLockReviewBundleProfilesPath: string;
  sectionSkinPageLockApprovalBundlesRoot: string;
  sectionSkinPageLockApprovalBundleProfilesPath: string;
  sectionSkinPageLockApplyBundlesRoot: string;
  sectionSkinPageLockApplyBundleProfilesPath: string;
  sectionSkinTextureInputBundlesRoot: string;
  sectionSkinTextureInputBundleProfilesPath: string;
  sectionSkinTextureSourcePlansRoot: string;
  sectionSkinTextureSourcePlanProfilesPath: string;
  sectionSkinTextureReconstructionBundlesRoot: string;
  sectionSkinTextureReconstructionBundleProfilesPath: string;
  sectionSkinTextureLockBundlesRoot: string;
  sectionSkinTextureLockBundleProfilesPath: string;
  sectionSkinTextureAssemblyBundlesRoot: string;
  sectionSkinTextureAssemblyBundleProfilesPath: string;
  sectionSkinTextureRenderBundlesRoot: string;
  sectionSkinTextureRenderBundleProfilesPath: string;
  sectionSkinTextureCanvasBundlesRoot: string;
  sectionSkinTextureCanvasBundleProfilesPath: string;
  sectionSkinTextureSourceFitBundlesRoot: string;
  sectionSkinTextureSourceFitBundleProfilesPath: string;
  sectionSkinTextureFitReviewBundlesRoot: string;
  sectionSkinTextureFitReviewBundleProfilesPath: string;
  sectionSkinTextureFitDecisionBundlesRoot: string;
  sectionSkinTextureFitDecisionBundleProfilesPath: string;
  sectionSkinTextureFitApprovalBundlesRoot: string;
  sectionSkinTextureFitApprovalBundleProfilesPath: string;
  sectionSkinTextureFitApplyBundlesRoot: string;
  sectionSkinTextureFitApplyBundleProfilesPath: string;
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

export interface SectionSkinRenderPageSize {
  width: number;
  height: number;
}

export interface SectionSkinRenderPageRecord {
  orderIndex: number;
  pageName: string;
  pageSize: SectionSkinRenderPageSize | null;
  localPagePath: string | null;
  regionCount: number;
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
  pageSizeCount: number;
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
  pages: SectionSkinRenderPageRecord[];
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
  pageSizeCount: number;
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

export type SectionSkinPageLockAuditState =
  | "ready-with-exact-unique-page-locks"
  | "ready-with-proposed-unique-page-locks"
  | "has-page-lock-conflicts"
  | "needs-page-lock-review";

export type SectionSkinPageLockAuditPageState =
  | "exact-unique-page-lock"
  | "proposed-unique-page-lock"
  | "duplicate-source-conflict"
  | "missing-page-lock";

export interface SectionSkinPageLockAuditPageRecord {
  orderIndex: number;
  pageName: string;
  pageState: SectionSkinPageLockAuditPageState;
  sourcePageState: SectionSkinPageLockPageState;
  layerCount: number;
  affectedLayerCount: number;
  slotNames: string[];
  selectedLocalPath: string | null;
  proposedMatchScore: number | null;
  duplicateSourcePageCount: number;
  duplicateSourcePageNames: string[];
}

export interface SectionSkinPageLockAuditConflictGroupRecord {
  selectedLocalPath: string;
  pageCount: number;
  pageNames: string[];
  exactPageCount: number;
  proposedPageCount: number;
  affectedLayerCount: number;
}

export interface SectionSkinPageLockAuditBundleFile {
  schemaVersion: string;
  donorId: string;
  donorName: string;
  generatedAt: string;
  familyName: string;
  sectionKey: string;
  skinName: string;
  pageLockAuditState: SectionSkinPageLockAuditState;
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
  uniqueSelectedLocalPathCount: number;
  duplicateSourceGroupCount: number;
  duplicateSourcePageCount: number;
  layerCount: number;
  readyLayerCount: number;
  blockedLayerCount: number;
  topLockedLocalPath: string | null;
  topConflictLocalPath: string | null;
  sampleLocalSourcePath: string | null;
  atlasSourcePath: string | null;
  pageLockBundlePath: string;
  textureInputBundlePath: string;
  nextPageLockAuditStep: string;
  pages: SectionSkinPageLockAuditPageRecord[];
  duplicateSourceGroups: SectionSkinPageLockAuditConflictGroupRecord[];
}

export interface SectionSkinPageLockAuditBundleProfileRecord {
  familyName: string;
  sectionKey: string;
  skinName: string;
  pageLockAuditState: SectionSkinPageLockAuditState;
  pageCount: number;
  exactPageLockCount: number;
  proposedPageLockCount: number;
  missingPageLockCount: number;
  uniqueSelectedLocalPathCount: number;
  duplicateSourceGroupCount: number;
  duplicateSourcePageCount: number;
  layerCount: number;
  readyLayerCount: number;
  blockedLayerCount: number;
  topLockedLocalPath: string | null;
  topConflictLocalPath: string | null;
  sampleLocalSourcePath: string | null;
  atlasSourcePath: string | null;
  pageLockAuditBundlePath: string;
  nextPageLockAuditStep: string;
}

export interface SectionSkinPageLockAuditBundleProfilesFile {
  schemaVersion: string;
  donorId: string;
  donorName: string;
  generatedAt: string;
  sectionCount: number;
  sections: SectionSkinPageLockAuditBundleProfileRecord[];
}

export type SectionSkinPageLockResolutionState =
  | "ready-with-exact-page-locks"
  | "ready-with-unique-proposed-page-locks"
  | "has-unresolved-page-lock-conflicts";

export type SectionSkinPageLockResolutionPageState =
  | "exact-page-lock"
  | "unique-proposed-page-lock"
  | "resolved-page-lock-conflict"
  | "unresolved-page-lock-conflict";

export interface SectionSkinPageLockResolutionPageRecord {
  orderIndex: number;
  pageName: string;
  pageState: SectionSkinPageLockResolutionPageState;
  sourcePageState: SectionSkinPageLockPageState;
  layerCount: number;
  slotNames: string[];
  originalSelectedLocalPath: string | null;
  resolvedLocalPath: string | null;
  candidateCount: number;
  selectedCandidateRank: number | null;
  duplicateSourcePageCount: number;
  duplicateSourcePageNames: string[];
}

export interface SectionSkinPageLockResolutionBundleFile {
  schemaVersion: string;
  donorId: string;
  donorName: string;
  generatedAt: string;
  familyName: string;
  sectionKey: string;
  skinName: string;
  pageLockResolutionState: SectionSkinPageLockResolutionState;
  pageLockAuditState: SectionSkinPageLockAuditState;
  pageLockState: SectionSkinPageLockState;
  textureInputState: SectionSkinTextureInputState;
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
  resolvedConflictPageCount: number;
  unresolvedConflictPageCount: number;
  uniqueResolvedLocalPathCount: number;
  duplicateSourceGroupCount: number;
  duplicateSourcePageCount: number;
  topResolvedLocalPath: string | null;
  sampleLocalSourcePath: string | null;
  atlasSourcePath: string | null;
  pageLockAuditBundlePath: string;
  materialReviewBundlePath: string;
  nextPageLockResolutionStep: string;
  pages: SectionSkinPageLockResolutionPageRecord[];
}

export interface SectionSkinPageLockResolutionBundleProfileRecord {
  familyName: string;
  sectionKey: string;
  skinName: string;
  pageLockResolutionState: SectionSkinPageLockResolutionState;
  pageCount: number;
  exactPageLockCount: number;
  proposedPageLockCount: number;
  missingPageLockCount: number;
  resolvedConflictPageCount: number;
  unresolvedConflictPageCount: number;
  uniqueResolvedLocalPathCount: number;
  duplicateSourceGroupCount: number;
  duplicateSourcePageCount: number;
  topResolvedLocalPath: string | null;
  sampleLocalSourcePath: string | null;
  atlasSourcePath: string | null;
  pageLockResolutionBundlePath: string;
  nextPageLockResolutionStep: string;
}

export interface SectionSkinPageLockResolutionBundleProfilesFile {
  schemaVersion: string;
  donorId: string;
  donorName: string;
  generatedAt: string;
  sectionCount: number;
  sections: SectionSkinPageLockResolutionBundleProfileRecord[];
}

export type SectionSkinPageLockDecisionState =
  | "ready-with-exact-page-locks"
  | "ready-for-lock-review"
  | "has-unresolved-page-lock-conflicts";

export type SectionSkinPageLockDecisionPageState =
  | "exact-page-lock"
  | "ready-for-lock-review"
  | "unresolved-page-lock-conflict";

export interface SectionSkinPageLockDecisionPageRecord {
  orderIndex: number;
  pageName: string;
  pageState: SectionSkinPageLockDecisionPageState;
  sourcePageState: SectionSkinPageLockResolutionPageState;
  layerCount: number;
  slotNames: string[];
  selectedLocalPath: string | null;
  selectedCandidateRank: number | null;
  selectedCandidateScore: number | null;
  selectedCandidateReasons: string[];
  selectedCandidateMatchedTokens: string[];
  alternativeCandidateCount: number;
  alternativeCandidatePreview: string[];
  duplicateSourcePageCount: number;
  duplicateSourcePageNames: string[];
}

export interface SectionSkinPageLockDecisionBundleFile {
  schemaVersion: string;
  donorId: string;
  donorName: string;
  generatedAt: string;
  familyName: string;
  sectionKey: string;
  skinName: string;
  pageLockDecisionState: SectionSkinPageLockDecisionState;
  pageLockResolutionState: SectionSkinPageLockResolutionState;
  pageLockAuditState: SectionSkinPageLockAuditState;
  pageLockState: SectionSkinPageLockState;
  textureInputState: SectionSkinTextureInputState;
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
  reviewReadyPageCount: number;
  unresolvedPageLockCount: number;
  resolvedConflictPageCount: number;
  uniqueResolvedLocalPathCount: number;
  topDecisionLocalPath: string | null;
  sampleLocalSourcePath: string | null;
  atlasSourcePath: string | null;
  pageLockResolutionBundlePath: string;
  materialReviewBundlePath: string;
  nextPageLockDecisionStep: string;
  pages: SectionSkinPageLockDecisionPageRecord[];
}

export interface SectionSkinPageLockDecisionBundleProfileRecord {
  familyName: string;
  sectionKey: string;
  skinName: string;
  pageLockDecisionState: SectionSkinPageLockDecisionState;
  pageCount: number;
  exactPageLockCount: number;
  reviewReadyPageCount: number;
  unresolvedPageLockCount: number;
  resolvedConflictPageCount: number;
  uniqueResolvedLocalPathCount: number;
  topDecisionLocalPath: string | null;
  sampleLocalSourcePath: string | null;
  atlasSourcePath: string | null;
  pageLockDecisionBundlePath: string;
  nextPageLockDecisionStep: string;
}

export interface SectionSkinPageLockDecisionBundleProfilesFile {
  schemaVersion: string;
  donorId: string;
  donorName: string;
  generatedAt: string;
  sectionCount: number;
  sections: SectionSkinPageLockDecisionBundleProfileRecord[];
}

export type SectionSkinPageLockReviewState =
  | "ready-with-exact-page-locks"
  | "ready-for-lock-review"
  | "has-unresolved-page-lock-conflicts";

export type SectionSkinPageLockReviewPageState =
  | "exact-page-lock"
  | "ready-for-lock-review"
  | "unresolved-page-lock-conflict";

export interface SectionSkinPageLockReviewPageRecord {
  orderIndex: number;
  pageName: string;
  pageState: SectionSkinPageLockReviewPageState;
  sourcePageState: SectionSkinPageLockResolutionPageState;
  layerCount: number;
  slotNames: string[];
  selectedLocalPath: string | null;
  selectedCandidateRank: number | null;
  selectedCandidateScore: number | null;
  selectedCandidateReasons: string[];
  selectedCandidateMatchedTokens: string[];
  affectedLayerCount: number;
  affectedSlotNames: string[];
  affectedAttachmentNames: string[];
  affectedRegionNames: string[];
  sampleLayerBounds: SectionSkinRenderBounds | null;
  topAffectedSlotName: string | null;
  topAffectedAttachmentName: string | null;
}

export interface SectionSkinPageLockReviewBundleFile {
  schemaVersion: string;
  donorId: string;
  donorName: string;
  generatedAt: string;
  familyName: string;
  sectionKey: string;
  skinName: string;
  pageLockReviewState: SectionSkinPageLockReviewState;
  pageLockDecisionState: SectionSkinPageLockDecisionState;
  pageLockResolutionState: SectionSkinPageLockResolutionState;
  pageLockAuditState: SectionSkinPageLockAuditState;
  pageLockState: SectionSkinPageLockState;
  textureInputState: SectionSkinTextureInputState;
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
  reviewReadyPageCount: number;
  unresolvedPageLockCount: number;
  resolvedConflictPageCount: number;
  uniqueResolvedLocalPathCount: number;
  affectedLayerCount: number;
  affectedAttachmentCount: number;
  topDecisionLocalPath: string | null;
  topAffectedSlotName: string | null;
  sampleLocalSourcePath: string | null;
  atlasSourcePath: string | null;
  pageLockDecisionBundlePath: string;
  renderPlanPath: string;
  nextPageLockReviewStep: string;
  pages: SectionSkinPageLockReviewPageRecord[];
}

export interface SectionSkinPageLockReviewBundleProfileRecord {
  familyName: string;
  sectionKey: string;
  skinName: string;
  pageLockReviewState: SectionSkinPageLockReviewState;
  pageCount: number;
  exactPageLockCount: number;
  reviewReadyPageCount: number;
  unresolvedPageLockCount: number;
  resolvedConflictPageCount: number;
  uniqueResolvedLocalPathCount: number;
  affectedLayerCount: number;
  affectedAttachmentCount: number;
  topDecisionLocalPath: string | null;
  topAffectedSlotName: string | null;
  sampleLocalSourcePath: string | null;
  atlasSourcePath: string | null;
  pageLockReviewBundlePath: string;
  nextPageLockReviewStep: string;
}

export interface SectionSkinPageLockReviewBundleProfilesFile {
  schemaVersion: string;
  donorId: string;
  donorName: string;
  generatedAt: string;
  sectionCount: number;
  sections: SectionSkinPageLockReviewBundleProfileRecord[];
}

export type SectionSkinPageLockApprovalState =
  | "ready-with-exact-page-locks"
  | "ready-for-page-lock-approval"
  | "has-unresolved-page-lock-conflicts";

export type SectionSkinPageLockApprovalPageState =
  | "exact-page-lock"
  | "ready-for-page-lock-approval"
  | "unresolved-page-lock-conflict";

export interface SectionSkinPageLockApprovalPageRecord {
  orderIndex: number;
  pageName: string;
  pageState: SectionSkinPageLockApprovalPageState;
  sourcePageState: SectionSkinPageLockReviewPageState;
  layerCount: number;
  slotNames: string[];
  selectedLocalPath: string | null;
  selectedCandidateRank: number | null;
  selectedCandidateScore: number | null;
  selectedCandidateReasons: string[];
  selectedCandidateMatchedTokens: string[];
  affectedLayerCount: number;
  affectedSlotNames: string[];
  affectedAttachmentNames: string[];
  affectedRegionNames: string[];
  sampleLayerBounds: SectionSkinRenderBounds | null;
  topAffectedSlotName: string | null;
  topAffectedAttachmentName: string | null;
}

export interface SectionSkinPageLockApprovalBundleFile {
  schemaVersion: string;
  donorId: string;
  donorName: string;
  generatedAt: string;
  familyName: string;
  sectionKey: string;
  skinName: string;
  pageLockApprovalState: SectionSkinPageLockApprovalState;
  pageLockReviewState: SectionSkinPageLockReviewState;
  pageLockDecisionState: SectionSkinPageLockDecisionState;
  pageLockResolutionState: SectionSkinPageLockResolutionState;
  pageLockAuditState: SectionSkinPageLockAuditState;
  pageLockState: SectionSkinPageLockState;
  textureInputState: SectionSkinTextureInputState;
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
  approvalReadyPageCount: number;
  unresolvedPageLockCount: number;
  resolvedConflictPageCount: number;
  uniqueResolvedLocalPathCount: number;
  affectedLayerCount: number;
  affectedAttachmentCount: number;
  topApprovalLocalPath: string | null;
  topAffectedSlotName: string | null;
  sampleLocalSourcePath: string | null;
  atlasSourcePath: string | null;
  pageLockReviewBundlePath: string;
  nextPageLockApprovalStep: string;
  pages: SectionSkinPageLockApprovalPageRecord[];
}

export interface SectionSkinPageLockApprovalBundleProfileRecord {
  familyName: string;
  sectionKey: string;
  skinName: string;
  pageLockApprovalState: SectionSkinPageLockApprovalState;
  pageCount: number;
  exactPageLockCount: number;
  approvalReadyPageCount: number;
  unresolvedPageLockCount: number;
  resolvedConflictPageCount: number;
  uniqueResolvedLocalPathCount: number;
  affectedLayerCount: number;
  affectedAttachmentCount: number;
  topApprovalLocalPath: string | null;
  topAffectedSlotName: string | null;
  sampleLocalSourcePath: string | null;
  atlasSourcePath: string | null;
  pageLockApprovalBundlePath: string;
  nextPageLockApprovalStep: string;
}

export interface SectionSkinPageLockApprovalBundleProfilesFile {
  schemaVersion: string;
  donorId: string;
  donorName: string;
  generatedAt: string;
  sectionCount: number;
  sections: SectionSkinPageLockApprovalBundleProfileRecord[];
}

export type SectionSkinPageLockApplyState =
  | "ready-with-exact-page-locks"
  | "ready-with-applied-page-locks"
  | "has-unresolved-page-lock-conflicts";

export type SectionSkinPageLockApplyPageState =
  | "exact-page-lock"
  | "applied-page-lock"
  | "unresolved-page-lock-conflict";

export interface SectionSkinPageLockApplyPageRecord {
  orderIndex: number;
  pageName: string;
  pageState: SectionSkinPageLockApplyPageState;
  sourcePageState: SectionSkinPageLockApprovalPageState;
  layerCount: number;
  slotNames: string[];
  selectedLocalPath: string | null;
  selectedCandidateRank: number | null;
  selectedCandidateScore: number | null;
  selectedCandidateReasons: string[];
  selectedCandidateMatchedTokens: string[];
  affectedLayerCount: number;
  affectedSlotNames: string[];
  affectedAttachmentNames: string[];
  affectedRegionNames: string[];
  sampleLayerBounds: SectionSkinRenderBounds | null;
  topAffectedSlotName: string | null;
  topAffectedAttachmentName: string | null;
}

export interface SectionSkinPageLockApplyBundleFile {
  schemaVersion: string;
  donorId: string;
  donorName: string;
  generatedAt: string;
  familyName: string;
  sectionKey: string;
  skinName: string;
  pageLockApplyState: SectionSkinPageLockApplyState;
  pageLockApprovalState: SectionSkinPageLockApprovalState;
  pageLockReviewState: SectionSkinPageLockReviewState;
  pageLockDecisionState: SectionSkinPageLockDecisionState;
  pageLockResolutionState: SectionSkinPageLockResolutionState;
  pageLockAuditState: SectionSkinPageLockAuditState;
  pageLockState: SectionSkinPageLockState;
  textureInputState: SectionSkinTextureInputState;
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
  appliedPageLockCount: number;
  unresolvedPageLockCount: number;
  resolvedConflictPageCount: number;
  uniqueResolvedLocalPathCount: number;
  affectedLayerCount: number;
  affectedAttachmentCount: number;
  topAppliedLocalPath: string | null;
  topAffectedSlotName: string | null;
  sampleLocalSourcePath: string | null;
  atlasSourcePath: string | null;
  pageLockApprovalBundlePath: string;
  nextPageLockApplyStep: string;
  pages: SectionSkinPageLockApplyPageRecord[];
}

export interface SectionSkinPageLockApplyBundleProfileRecord {
  familyName: string;
  sectionKey: string;
  skinName: string;
  pageLockApplyState: SectionSkinPageLockApplyState;
  pageCount: number;
  exactPageLockCount: number;
  appliedPageLockCount: number;
  unresolvedPageLockCount: number;
  resolvedConflictPageCount: number;
  uniqueResolvedLocalPathCount: number;
  affectedLayerCount: number;
  affectedAttachmentCount: number;
  topAppliedLocalPath: string | null;
  topAffectedSlotName: string | null;
  sampleLocalSourcePath: string | null;
  atlasSourcePath: string | null;
  pageLockApplyBundlePath: string;
  nextPageLockApplyStep: string;
}

export interface SectionSkinPageLockApplyBundleProfilesFile {
  schemaVersion: string;
  donorId: string;
  donorName: string;
  generatedAt: string;
  sectionCount: number;
  sections: SectionSkinPageLockApplyBundleProfileRecord[];
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

export type SectionSkinTextureLockState =
  | "ready-with-exact-page-locks"
  | "ready-with-applied-page-locks"
  | "needs-page-lock-resolution";

export type SectionSkinTextureLockLayerState =
  | "ready-with-exact-page-lock"
  | "ready-with-applied-page-lock"
  | "needs-page-lock-resolution"
  | "missing-atlas-geometry";

export interface SectionSkinTextureLockPageRecord {
  orderIndex: number;
  pageName: string;
  pageState: SectionSkinPageLockApplyPageState;
  sourcePageState: SectionSkinPageLockApplyPageState;
  layerCount: number;
  slotNames: string[];
  selectedLocalPath: string | null;
  selectedCandidateRank: number | null;
  selectedCandidateScore: number | null;
  selectedCandidateReasons: string[];
  selectedCandidateMatchedTokens: string[];
}

export interface SectionSkinTextureLockLayerRecord {
  orderIndex: number;
  slotName: string;
  attachmentName: string | null;
  attachmentPath: string | null;
  pageName: string | null;
  regionName: string | null;
  layerState: SectionSkinTextureLockLayerState;
  pageState: SectionSkinPageLockApplyPageState | "missing-page-lock";
  selectedLocalPath: string | null;
  rotated: boolean;
  bounds: SectionSkinRenderBounds | null;
  offsets: SectionSkinRenderOffsets | null;
}

export interface SectionSkinTextureLockBundleFile {
  schemaVersion: string;
  donorId: string;
  donorName: string;
  generatedAt: string;
  familyName: string;
  sectionKey: string;
  skinName: string;
  textureLockState: SectionSkinTextureLockState;
  pageLockApplyState: SectionSkinPageLockApplyState;
  pageLockApprovalState: SectionSkinPageLockApprovalState;
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
  appliedPageLockCount: number;
  unresolvedPageLockCount: number;
  layerCount: number;
  readyLayerCount: number;
  blockedLayerCount: number;
  topLockedLocalPath: string | null;
  sampleLocalSourcePath: string | null;
  atlasSourcePath: string | null;
  pageLockApplyBundlePath: string;
  textureReconstructionBundlePath: string;
  nextTextureLockStep: string;
  pages: SectionSkinTextureLockPageRecord[];
  layers: SectionSkinTextureLockLayerRecord[];
}

export interface SectionSkinTextureLockBundleProfileRecord {
  familyName: string;
  sectionKey: string;
  skinName: string;
  textureLockState: SectionSkinTextureLockState;
  pageCount: number;
  exactPageLockCount: number;
  appliedPageLockCount: number;
  unresolvedPageLockCount: number;
  layerCount: number;
  readyLayerCount: number;
  blockedLayerCount: number;
  topLockedLocalPath: string | null;
  sampleLocalSourcePath: string | null;
  atlasSourcePath: string | null;
  textureLockBundlePath: string;
  nextTextureLockStep: string;
}

export interface SectionSkinTextureLockBundleProfilesFile {
  schemaVersion: string;
  donorId: string;
  donorName: string;
  generatedAt: string;
  sectionCount: number;
  sections: SectionSkinTextureLockBundleProfileRecord[];
}

export type SectionSkinTextureAssemblyState =
  | "ready-for-exact-texture-assembly"
  | "ready-for-applied-texture-assembly"
  | "needs-page-lock-resolution";

export type SectionSkinTextureAssemblyPageState =
  | "ready-for-exact-texture-assembly"
  | "ready-for-applied-texture-assembly"
  | "needs-page-lock-resolution";

export type SectionSkinTextureAssemblyRegionState =
  | "ready-for-exact-texture-assembly"
  | "ready-for-applied-texture-assembly"
  | "needs-page-lock-resolution"
  | "missing-atlas-geometry";

export interface SectionSkinTextureAssemblyRegionRecord {
  orderIndex: number;
  slotName: string;
  attachmentName: string | null;
  attachmentPath: string | null;
  pageName: string;
  regionName: string | null;
  regionState: SectionSkinTextureAssemblyRegionState;
  pageState: SectionSkinPageLockApplyPageState | "missing-page-lock";
  selectedLocalPath: string | null;
  rotated: boolean;
  bounds: SectionSkinRenderBounds | null;
  offsets: SectionSkinRenderOffsets | null;
}

export interface SectionSkinTextureAssemblyPageRecord {
  orderIndex: number;
  pageName: string;
  pageState: SectionSkinTextureAssemblyPageState;
  sourcePageState: SectionSkinPageLockApplyPageState;
  layerCount: number;
  readyLayerCount: number;
  blockedLayerCount: number;
  regionCount: number;
  slotNames: string[];
  regionNames: string[];
  selectedLocalPath: string | null;
  selectedCandidateRank: number | null;
  selectedCandidateScore: number | null;
  selectedCandidateReasons: string[];
  selectedCandidateMatchedTokens: string[];
  regions: SectionSkinTextureAssemblyRegionRecord[];
}

export interface SectionSkinTextureAssemblyBundleFile {
  schemaVersion: string;
  donorId: string;
  donorName: string;
  generatedAt: string;
  familyName: string;
  sectionKey: string;
  skinName: string;
  textureAssemblyState: SectionSkinTextureAssemblyState;
  textureLockState: SectionSkinTextureLockState;
  pageLockApplyState: SectionSkinPageLockApplyState;
  pageLockApprovalState: SectionSkinPageLockApprovalState;
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
  appliedPageLockCount: number;
  unresolvedPageLockCount: number;
  readyPageCount: number;
  blockedPageCount: number;
  uniqueSelectedLocalPathCount: number;
  layerCount: number;
  readyLayerCount: number;
  blockedLayerCount: number;
  topAssemblyLocalPath: string | null;
  sampleLocalSourcePath: string | null;
  atlasSourcePath: string | null;
  textureLockBundlePath: string;
  nextTextureAssemblyStep: string;
  pages: SectionSkinTextureAssemblyPageRecord[];
}

export interface SectionSkinTextureAssemblyBundleProfileRecord {
  familyName: string;
  sectionKey: string;
  skinName: string;
  textureAssemblyState: SectionSkinTextureAssemblyState;
  pageCount: number;
  exactPageLockCount: number;
  appliedPageLockCount: number;
  unresolvedPageLockCount: number;
  readyPageCount: number;
  blockedPageCount: number;
  uniqueSelectedLocalPathCount: number;
  layerCount: number;
  readyLayerCount: number;
  blockedLayerCount: number;
  topAssemblyLocalPath: string | null;
  sampleLocalSourcePath: string | null;
  atlasSourcePath: string | null;
  textureAssemblyBundlePath: string;
  nextTextureAssemblyStep: string;
}

export interface SectionSkinTextureAssemblyBundleProfilesFile {
  schemaVersion: string;
  donorId: string;
  donorName: string;
  generatedAt: string;
  sectionCount: number;
  sections: SectionSkinTextureAssemblyBundleProfileRecord[];
}

export type SectionSkinTextureRenderState =
  | "ready-for-exact-page-texture-render"
  | "ready-for-applied-page-texture-render"
  | "needs-atlas-page-size-review"
  | "needs-page-lock-resolution"
  | "needs-manual-render-review";

export type SectionSkinTextureRenderPageState =
  | "ready-for-exact-page-texture-render"
  | "ready-for-applied-page-texture-render"
  | "missing-atlas-page-size"
  | "needs-page-lock-resolution"
  | "needs-manual-render-review";

export type SectionSkinTextureRenderRegionState =
  | "ready-for-exact-page-texture-render"
  | "ready-for-applied-page-texture-render"
  | "missing-atlas-page-size"
  | "missing-atlas-geometry"
  | "needs-page-lock-resolution";

export interface SectionSkinTextureRenderRegionRecord {
  orderIndex: number;
  slotName: string;
  attachmentName: string | null;
  attachmentPath: string | null;
  regionName: string | null;
  regionState: SectionSkinTextureRenderRegionState;
  sourceRegionState: SectionSkinTextureAssemblyRegionState;
  selectedLocalPath: string | null;
  rotated: boolean;
  bounds: SectionSkinRenderBounds | null;
  offsets: SectionSkinRenderOffsets | null;
}

export interface SectionSkinTextureRenderPageRecord {
  orderIndex: number;
  pageName: string;
  pageState: SectionSkinTextureRenderPageState;
  sourcePageState: SectionSkinTextureAssemblyPageState;
  pageWidth: number | null;
  pageHeight: number | null;
  layerCount: number;
  readyLayerCount: number;
  blockedLayerCount: number;
  regionCount: number;
  slotNames: string[];
  regionNames: string[];
  selectedLocalPath: string | null;
  selectedCandidateRank: number | null;
  selectedCandidateScore: number | null;
  selectedCandidateReasons: string[];
  selectedCandidateMatchedTokens: string[];
  atlasPageLocalPath: string | null;
  regions: SectionSkinTextureRenderRegionRecord[];
}

export interface SectionSkinTextureRenderBundleFile {
  schemaVersion: string;
  donorId: string;
  donorName: string;
  generatedAt: string;
  familyName: string;
  sectionKey: string;
  skinName: string;
  textureRenderState: SectionSkinTextureRenderState;
  textureAssemblyState: SectionSkinTextureAssemblyState;
  textureLockState: SectionSkinTextureLockState;
  pageLockApplyState: SectionSkinPageLockApplyState;
  pageLockApprovalState: SectionSkinPageLockApprovalState;
  textureReconstructionState: SectionSkinTextureReconstructionState;
  textureSourceState: SectionSkinTextureSourceState;
  matchState: SectionSkinPageMatchState;
  reviewState: SectionSkinMaterialReviewState;
  materialState: SectionSkinMaterialState;
  renderState: SectionSkinRenderPlanState;
  blueprintState: SectionSkinBlueprintState;
  reconstructionState: SectionReconstructionBundleState;
  pageCount: number;
  pageSizeCount: number;
  missingPageSizeCount: number;
  exactPageLockCount: number;
  appliedPageLockCount: number;
  unresolvedPageLockCount: number;
  readyPageCount: number;
  blockedPageCount: number;
  uniqueSelectedLocalPathCount: number;
  layerCount: number;
  readyLayerCount: number;
  blockedLayerCount: number;
  topRenderLocalPath: string | null;
  sampleLocalSourcePath: string | null;
  atlasSourcePath: string | null;
  textureAssemblyBundlePath: string;
  renderPlanPath: string;
  nextTextureRenderStep: string;
  pages: SectionSkinTextureRenderPageRecord[];
}

export interface SectionSkinTextureRenderBundleProfileRecord {
  familyName: string;
  sectionKey: string;
  skinName: string;
  textureRenderState: SectionSkinTextureRenderState;
  pageCount: number;
  pageSizeCount: number;
  missingPageSizeCount: number;
  exactPageLockCount: number;
  appliedPageLockCount: number;
  unresolvedPageLockCount: number;
  readyPageCount: number;
  blockedPageCount: number;
  uniqueSelectedLocalPathCount: number;
  layerCount: number;
  readyLayerCount: number;
  blockedLayerCount: number;
  topRenderLocalPath: string | null;
  sampleLocalSourcePath: string | null;
  atlasSourcePath: string | null;
  textureRenderBundlePath: string;
  nextTextureRenderStep: string;
}

export interface SectionSkinTextureRenderBundleProfilesFile {
  schemaVersion: string;
  donorId: string;
  donorName: string;
  generatedAt: string;
  sectionCount: number;
  sections: SectionSkinTextureRenderBundleProfileRecord[];
}

export type SectionSkinTextureCanvasState =
  | "ready-for-exact-page-canvas-reconstruction"
  | "ready-for-applied-page-canvas-reconstruction"
  | "needs-atlas-page-size-review"
  | "needs-page-lock-resolution"
  | "needs-manual-render-review";

export type SectionSkinTextureCanvasPageState =
  | "ready-for-exact-page-canvas-reconstruction"
  | "ready-for-applied-page-canvas-reconstruction"
  | "missing-atlas-page-size"
  | "needs-page-lock-resolution"
  | "needs-manual-render-review";

export type SectionSkinTextureCanvasOperationState =
  | "ready-for-exact-page-canvas-reconstruction"
  | "ready-for-applied-page-canvas-reconstruction"
  | "missing-atlas-page-size"
  | "missing-atlas-geometry"
  | "needs-page-lock-resolution";

export interface SectionSkinTextureCanvasOperationRecord {
  orderIndex: number;
  slotName: string;
  attachmentName: string | null;
  attachmentPath: string | null;
  regionName: string | null;
  operationState: SectionSkinTextureCanvasOperationState;
  sourceRegionState: SectionSkinTextureRenderRegionState;
  sourceLocalPath: string | null;
  rotated: boolean;
  targetX: number | null;
  targetY: number | null;
  targetWidth: number | null;
  targetHeight: number | null;
  trimOffsetX: number | null;
  trimOffsetY: number | null;
  originalWidth: number | null;
  originalHeight: number | null;
}

export interface SectionSkinTextureCanvasPageRecord {
  orderIndex: number;
  pageName: string;
  pageState: SectionSkinTextureCanvasPageState;
  sourcePageState: SectionSkinTextureRenderPageState;
  canvasWidth: number | null;
  canvasHeight: number | null;
  selectedLocalPath: string | null;
  selectedCandidateRank: number | null;
  selectedCandidateScore: number | null;
  selectedCandidateReasons: string[];
  selectedCandidateMatchedTokens: string[];
  atlasPageLocalPath: string | null;
  drawOperationCount: number;
  readyDrawOperationCount: number;
  blockedDrawOperationCount: number;
  slotNames: string[];
  regionNames: string[];
  operations: SectionSkinTextureCanvasOperationRecord[];
}

export interface SectionSkinTextureCanvasBundleFile {
  schemaVersion: string;
  donorId: string;
  donorName: string;
  generatedAt: string;
  familyName: string;
  sectionKey: string;
  skinName: string;
  textureCanvasState: SectionSkinTextureCanvasState;
  textureRenderState: SectionSkinTextureRenderState;
  textureAssemblyState: SectionSkinTextureAssemblyState;
  textureLockState: SectionSkinTextureLockState;
  pageLockApplyState: SectionSkinPageLockApplyState;
  pageLockApprovalState: SectionSkinPageLockApprovalState;
  textureReconstructionState: SectionSkinTextureReconstructionState;
  textureSourceState: SectionSkinTextureSourceState;
  matchState: SectionSkinPageMatchState;
  reviewState: SectionSkinMaterialReviewState;
  materialState: SectionSkinMaterialState;
  renderState: SectionSkinRenderPlanState;
  blueprintState: SectionSkinBlueprintState;
  reconstructionState: SectionReconstructionBundleState;
  pageCount: number;
  pageSizeCount: number;
  missingPageSizeCount: number;
  exactPageLockCount: number;
  appliedPageLockCount: number;
  unresolvedPageLockCount: number;
  readyPageCount: number;
  blockedPageCount: number;
  uniqueSelectedLocalPathCount: number;
  drawOperationCount: number;
  readyDrawOperationCount: number;
  blockedDrawOperationCount: number;
  topCanvasLocalPath: string | null;
  sampleLocalSourcePath: string | null;
  atlasSourcePath: string | null;
  textureRenderBundlePath: string;
  nextTextureCanvasStep: string;
  pages: SectionSkinTextureCanvasPageRecord[];
}

export interface SectionSkinTextureCanvasBundleProfileRecord {
  familyName: string;
  sectionKey: string;
  skinName: string;
  textureCanvasState: SectionSkinTextureCanvasState;
  pageCount: number;
  pageSizeCount: number;
  missingPageSizeCount: number;
  exactPageLockCount: number;
  appliedPageLockCount: number;
  unresolvedPageLockCount: number;
  readyPageCount: number;
  blockedPageCount: number;
  uniqueSelectedLocalPathCount: number;
  drawOperationCount: number;
  readyDrawOperationCount: number;
  blockedDrawOperationCount: number;
  topCanvasLocalPath: string | null;
  sampleLocalSourcePath: string | null;
  atlasSourcePath: string | null;
  textureCanvasBundlePath: string;
  nextTextureCanvasStep: string;
}

export interface SectionSkinTextureCanvasBundleProfilesFile {
  schemaVersion: string;
  donorId: string;
  donorName: string;
  generatedAt: string;
  sectionCount: number;
  sections: SectionSkinTextureCanvasBundleProfileRecord[];
}

export type SectionSkinTextureSourceFitState =
  | "ready-with-exact-page-source-fits"
  | "ready-with-uniform-page-source-fits"
  | "ready-with-non-uniform-page-source-fits"
  | "needs-source-dimension-review"
  | "needs-atlas-page-size-review"
  | "needs-page-lock-resolution";

export type SectionSkinTextureSourceFitPageState =
  | "exact-page-source-fit"
  | "uniform-scale-page-source-fit"
  | "non-uniform-scale-page-source-fit"
  | "missing-source-dimensions"
  | "missing-atlas-page-size"
  | "needs-page-lock-resolution";

export interface SectionSkinTextureSourceFitPageRecord {
  orderIndex: number;
  pageName: string;
  pageState: SectionSkinTextureSourceFitPageState;
  sourcePageState: SectionSkinTextureRenderPageState;
  canvasWidth: number | null;
  canvasHeight: number | null;
  sourceWidth: number | null;
  sourceHeight: number | null;
  selectedLocalPath: string | null;
  selectedCandidateRank: number | null;
  selectedCandidateScore: number | null;
  selectedCandidateReasons: string[];
  selectedCandidateMatchedTokens: string[];
  atlasPageLocalPath: string | null;
  drawOperationCount: number;
  readyDrawOperationCount: number;
  blockedDrawOperationCount: number;
  exactFit: boolean;
  uniformScaleFit: boolean;
  nonUniformScaleFit: boolean;
  scaleX: number | null;
  scaleY: number | null;
  scaleDelta: number | null;
  slotNames: string[];
  regionNames: string[];
}

export interface SectionSkinTextureSourceFitBundleFile {
  schemaVersion: string;
  donorId: string;
  donorName: string;
  generatedAt: string;
  familyName: string;
  sectionKey: string;
  skinName: string;
  textureSourceFitState: SectionSkinTextureSourceFitState;
  textureCanvasState: SectionSkinTextureCanvasState;
  textureRenderState: SectionSkinTextureRenderState;
  textureAssemblyState: SectionSkinTextureAssemblyState;
  textureLockState: SectionSkinTextureLockState;
  pageLockApplyState: SectionSkinPageLockApplyState;
  pageLockApprovalState: SectionSkinPageLockApprovalState;
  textureReconstructionState: SectionSkinTextureReconstructionState;
  textureSourceState: SectionSkinTextureSourceState;
  matchState: SectionSkinPageMatchState;
  reviewState: SectionSkinMaterialReviewState;
  materialState: SectionSkinMaterialState;
  renderState: SectionSkinRenderPlanState;
  blueprintState: SectionSkinBlueprintState;
  reconstructionState: SectionReconstructionBundleState;
  pageCount: number;
  pageSizeCount: number;
  sourceDimensionCount: number;
  missingPageSizeCount: number;
  missingSourceDimensionCount: number;
  exactPageLockCount: number;
  appliedPageLockCount: number;
  unresolvedPageLockCount: number;
  exactPageFitCount: number;
  uniformScalePageFitCount: number;
  nonUniformScalePageFitCount: number;
  readyPageCount: number;
  blockedPageCount: number;
  uniqueSelectedLocalPathCount: number;
  drawOperationCount: number;
  readyDrawOperationCount: number;
  blockedDrawOperationCount: number;
  topFittedLocalPath: string | null;
  sampleLocalSourcePath: string | null;
  atlasSourcePath: string | null;
  textureCanvasBundlePath: string;
  nextTextureSourceFitStep: string;
  pages: SectionSkinTextureSourceFitPageRecord[];
}

export interface SectionSkinTextureSourceFitBundleProfileRecord {
  familyName: string;
  sectionKey: string;
  skinName: string;
  textureSourceFitState: SectionSkinTextureSourceFitState;
  pageCount: number;
  pageSizeCount: number;
  sourceDimensionCount: number;
  missingPageSizeCount: number;
  missingSourceDimensionCount: number;
  exactPageLockCount: number;
  appliedPageLockCount: number;
  unresolvedPageLockCount: number;
  exactPageFitCount: number;
  uniformScalePageFitCount: number;
  nonUniformScalePageFitCount: number;
  readyPageCount: number;
  blockedPageCount: number;
  uniqueSelectedLocalPathCount: number;
  drawOperationCount: number;
  readyDrawOperationCount: number;
  blockedDrawOperationCount: number;
  topFittedLocalPath: string | null;
  sampleLocalSourcePath: string | null;
  atlasSourcePath: string | null;
  textureSourceFitBundlePath: string;
  nextTextureSourceFitStep: string;
}

export interface SectionSkinTextureSourceFitBundleProfilesFile {
  schemaVersion: string;
  donorId: string;
  donorName: string;
  generatedAt: string;
  sectionCount: number;
  sections: SectionSkinTextureSourceFitBundleProfileRecord[];
}

export type SectionSkinTextureFitReviewState =
  | "ready-with-exact-fit-transforms"
  | "ready-with-uniform-fit-transforms"
  | "ready-for-fit-transform-review"
  | "needs-source-dimension-review"
  | "needs-atlas-page-size-review"
  | "needs-page-lock-resolution";

export type SectionSkinTextureFitReviewPageState =
  | "exact-fit-transform"
  | "uniform-fit-transform"
  | "needs-fit-transform-review"
  | "missing-source-dimensions"
  | "missing-atlas-page-size"
  | "needs-page-lock-resolution";

export type SectionSkinTextureFitTransformMode = "exact" | "contain" | "cover" | "stretch";

export interface SectionSkinTextureFitTransformOptionRecord {
  mode: SectionSkinTextureFitTransformMode;
  aspectPreserving: boolean;
  scaleX: number | null;
  scaleY: number | null;
  uniformScale: number | null;
  outputWidth: number | null;
  outputHeight: number | null;
  offsetX: number | null;
  offsetY: number | null;
  paddingX: number | null;
  paddingY: number | null;
  cropX: number | null;
  cropY: number | null;
  distortionDelta: number | null;
}

export interface SectionSkinTextureFitReviewPageRecord {
  orderIndex: number;
  pageName: string;
  pageState: SectionSkinTextureFitReviewPageState;
  sourcePageState: SectionSkinTextureSourceFitPageState;
  canvasWidth: number | null;
  canvasHeight: number | null;
  sourceWidth: number | null;
  sourceHeight: number | null;
  canvasAspectRatio: number | null;
  sourceAspectRatio: number | null;
  aspectRatioDelta: number | null;
  selectedLocalPath: string | null;
  selectedCandidateRank: number | null;
  selectedCandidateScore: number | null;
  selectedCandidateReasons: string[];
  selectedCandidateMatchedTokens: string[];
  atlasPageLocalPath: string | null;
  drawOperationCount: number;
  readyDrawOperationCount: number;
  blockedDrawOperationCount: number;
  scaleX: number | null;
  scaleY: number | null;
  scaleDelta: number | null;
  slotNames: string[];
  regionNames: string[];
  exactTransform: SectionSkinTextureFitTransformOptionRecord | null;
  containTransform: SectionSkinTextureFitTransformOptionRecord | null;
  coverTransform: SectionSkinTextureFitTransformOptionRecord | null;
  stretchTransform: SectionSkinTextureFitTransformOptionRecord | null;
  nextFitReviewStep: string;
}

export interface SectionSkinTextureFitReviewBundleFile {
  schemaVersion: string;
  donorId: string;
  donorName: string;
  generatedAt: string;
  familyName: string;
  sectionKey: string;
  skinName: string;
  textureFitReviewState: SectionSkinTextureFitReviewState;
  textureSourceFitState: SectionSkinTextureSourceFitState;
  textureCanvasState: SectionSkinTextureCanvasState;
  textureRenderState: SectionSkinTextureRenderState;
  textureAssemblyState: SectionSkinTextureAssemblyState;
  textureLockState: SectionSkinTextureLockState;
  pageLockApplyState: SectionSkinPageLockApplyState;
  pageLockApprovalState: SectionSkinPageLockApprovalState;
  textureReconstructionState: SectionSkinTextureReconstructionState;
  textureSourceState: SectionSkinTextureSourceState;
  matchState: SectionSkinPageMatchState;
  reviewState: SectionSkinMaterialReviewState;
  materialState: SectionSkinMaterialState;
  renderState: SectionSkinRenderPlanState;
  blueprintState: SectionSkinBlueprintState;
  reconstructionState: SectionReconstructionBundleState;
  pageCount: number;
  pageSizeCount: number;
  sourceDimensionCount: number;
  missingPageSizeCount: number;
  missingSourceDimensionCount: number;
  exactPageLockCount: number;
  appliedPageLockCount: number;
  unresolvedPageLockCount: number;
  exactPageFitCount: number;
  uniformScalePageFitCount: number;
  nonUniformScalePageFitCount: number;
  reviewReadyPageCount: number;
  blockedPageCount: number;
  uniqueSelectedLocalPathCount: number;
  drawOperationCount: number;
  readyDrawOperationCount: number;
  blockedDrawOperationCount: number;
  topFitReviewLocalPath: string | null;
  largestScaleDelta: number | null;
  sampleLocalSourcePath: string | null;
  atlasSourcePath: string | null;
  textureSourceFitBundlePath: string;
  nextTextureFitReviewStep: string;
  pages: SectionSkinTextureFitReviewPageRecord[];
}

export interface SectionSkinTextureFitReviewBundleProfileRecord {
  familyName: string;
  sectionKey: string;
  skinName: string;
  textureFitReviewState: SectionSkinTextureFitReviewState;
  textureSourceFitState: SectionSkinTextureSourceFitState;
  pageCount: number;
  pageSizeCount: number;
  sourceDimensionCount: number;
  missingPageSizeCount: number;
  missingSourceDimensionCount: number;
  exactPageLockCount: number;
  appliedPageLockCount: number;
  unresolvedPageLockCount: number;
  exactPageFitCount: number;
  uniformScalePageFitCount: number;
  nonUniformScalePageFitCount: number;
  reviewReadyPageCount: number;
  blockedPageCount: number;
  uniqueSelectedLocalPathCount: number;
  drawOperationCount: number;
  readyDrawOperationCount: number;
  blockedDrawOperationCount: number;
  largestScaleDelta: number | null;
  topFitReviewLocalPath: string | null;
  sampleLocalSourcePath: string | null;
  atlasSourcePath: string | null;
  textureFitReviewBundlePath: string;
  nextTextureFitReviewStep: string;
}

export interface SectionSkinTextureFitReviewBundleProfilesFile {
  schemaVersion: string;
  donorId: string;
  donorName: string;
  generatedAt: string;
  sectionCount: number;
  sections: SectionSkinTextureFitReviewBundleProfileRecord[];
}

export type SectionSkinTextureFitDecisionState =
  | "ready-with-exact-fit-decisions"
  | "ready-with-uniform-fit-decisions"
  | "ready-for-fit-decision-review"
  | "needs-source-dimension-review"
  | "needs-atlas-page-size-review"
  | "needs-page-lock-resolution";

export type SectionSkinTextureFitDecisionPageState =
  | "exact-fit-decision"
  | "uniform-fit-decision"
  | "proposed-contain-fit-decision"
  | "proposed-cover-fit-decision"
  | "proposed-stretch-fit-decision"
  | "missing-source-dimensions"
  | "missing-atlas-page-size"
  | "needs-page-lock-resolution";

export type SectionSkinTextureFitDecisionMode =
  | "exact"
  | "uniform-scale"
  | "contain"
  | "cover"
  | "stretch";

export interface SectionSkinTextureFitDecisionPageRecord {
  orderIndex: number;
  pageName: string;
  pageState: SectionSkinTextureFitDecisionPageState;
  sourcePageState: SectionSkinTextureFitReviewPageState;
  selectedMode: SectionSkinTextureFitDecisionMode | null;
  selectedReason: string;
  alternativeModePreview: SectionSkinTextureFitDecisionMode[];
  canvasWidth: number | null;
  canvasHeight: number | null;
  sourceWidth: number | null;
  sourceHeight: number | null;
  canvasAspectRatio: number | null;
  sourceAspectRatio: number | null;
  aspectRatioDelta: number | null;
  selectedLocalPath: string | null;
  selectedCandidateRank: number | null;
  selectedCandidateScore: number | null;
  selectedCandidateReasons: string[];
  selectedCandidateMatchedTokens: string[];
  atlasPageLocalPath: string | null;
  drawOperationCount: number;
  readyDrawOperationCount: number;
  blockedDrawOperationCount: number;
  occupiedBounds: SectionSkinRenderBounds | null;
  occupiedCoverageRatio: number | null;
  containPenalty: number | null;
  coverPenalty: number | null;
  stretchPenalty: number | null;
  scaleX: number | null;
  scaleY: number | null;
  scaleDelta: number | null;
  slotNames: string[];
  regionNames: string[];
  exactTransform: SectionSkinTextureFitTransformOptionRecord | null;
  containTransform: SectionSkinTextureFitTransformOptionRecord | null;
  coverTransform: SectionSkinTextureFitTransformOptionRecord | null;
  stretchTransform: SectionSkinTextureFitTransformOptionRecord | null;
  nextFitDecisionStep: string;
}

export interface SectionSkinTextureFitDecisionBundleFile {
  schemaVersion: string;
  donorId: string;
  donorName: string;
  generatedAt: string;
  familyName: string;
  sectionKey: string;
  skinName: string;
  textureFitDecisionState: SectionSkinTextureFitDecisionState;
  textureFitReviewState: SectionSkinTextureFitReviewState;
  textureSourceFitState: SectionSkinTextureSourceFitState;
  textureCanvasState: SectionSkinTextureCanvasState;
  textureRenderState: SectionSkinTextureRenderState;
  textureAssemblyState: SectionSkinTextureAssemblyState;
  textureLockState: SectionSkinTextureLockState;
  pageLockApplyState: SectionSkinPageLockApplyState;
  pageLockApprovalState: SectionSkinPageLockApprovalState;
  textureReconstructionState: SectionSkinTextureReconstructionState;
  textureSourceState: SectionSkinTextureSourceState;
  matchState: SectionSkinPageMatchState;
  reviewState: SectionSkinMaterialReviewState;
  materialState: SectionSkinMaterialState;
  renderState: SectionSkinRenderPlanState;
  blueprintState: SectionSkinBlueprintState;
  reconstructionState: SectionReconstructionBundleState;
  pageCount: number;
  pageSizeCount: number;
  sourceDimensionCount: number;
  missingPageSizeCount: number;
  missingSourceDimensionCount: number;
  exactPageLockCount: number;
  appliedPageLockCount: number;
  unresolvedPageLockCount: number;
  exactFitDecisionCount: number;
  uniformFitDecisionCount: number;
  proposedContainDecisionCount: number;
  proposedCoverDecisionCount: number;
  proposedStretchDecisionCount: number;
  reviewReadyPageCount: number;
  blockedPageCount: number;
  uniqueSelectedLocalPathCount: number;
  drawOperationCount: number;
  readyDrawOperationCount: number;
  blockedDrawOperationCount: number;
  topDecisionLocalPath: string | null;
  largestOccupancyCoverageRatio: number | null;
  largestScaleDelta: number | null;
  sampleLocalSourcePath: string | null;
  atlasSourcePath: string | null;
  textureFitReviewBundlePath: string;
  nextTextureFitDecisionStep: string;
  pages: SectionSkinTextureFitDecisionPageRecord[];
}

export interface SectionSkinTextureFitDecisionBundleProfileRecord {
  familyName: string;
  sectionKey: string;
  skinName: string;
  textureFitDecisionState: SectionSkinTextureFitDecisionState;
  textureFitReviewState: SectionSkinTextureFitReviewState;
  pageCount: number;
  pageSizeCount: number;
  sourceDimensionCount: number;
  missingPageSizeCount: number;
  missingSourceDimensionCount: number;
  exactPageLockCount: number;
  appliedPageLockCount: number;
  unresolvedPageLockCount: number;
  exactFitDecisionCount: number;
  uniformFitDecisionCount: number;
  proposedContainDecisionCount: number;
  proposedCoverDecisionCount: number;
  proposedStretchDecisionCount: number;
  reviewReadyPageCount: number;
  blockedPageCount: number;
  uniqueSelectedLocalPathCount: number;
  drawOperationCount: number;
  readyDrawOperationCount: number;
  blockedDrawOperationCount: number;
  largestOccupancyCoverageRatio: number | null;
  largestScaleDelta: number | null;
  topDecisionLocalPath: string | null;
  sampleLocalSourcePath: string | null;
  atlasSourcePath: string | null;
  textureFitDecisionBundlePath: string;
  nextTextureFitDecisionStep: string;
}

export interface SectionSkinTextureFitDecisionBundleProfilesFile {
  schemaVersion: string;
  donorId: string;
  donorName: string;
  generatedAt: string;
  sectionCount: number;
  sections: SectionSkinTextureFitDecisionBundleProfileRecord[];
}

export type SectionSkinTextureFitApprovalState =
  | "ready-with-exact-fit-approvals"
  | "ready-with-uniform-fit-approvals"
  | "ready-for-fit-approval"
  | "needs-fit-decision-review"
  | "needs-source-dimension-review"
  | "needs-atlas-page-size-review"
  | "needs-page-lock-resolution";

export type SectionSkinTextureFitApprovalPageState =
  | "exact-fit-approval"
  | "uniform-fit-approval"
  | "proposed-contain-fit-approval"
  | "proposed-cover-fit-approval"
  | "proposed-stretch-fit-approval"
  | "missing-source-dimensions"
  | "missing-atlas-page-size"
  | "needs-page-lock-resolution";

export interface SectionSkinTextureFitApprovalPageRecord {
  orderIndex: number;
  pageName: string;
  pageState: SectionSkinTextureFitApprovalPageState;
  sourcePageState: SectionSkinTextureFitDecisionPageState;
  selectedMode: SectionSkinTextureFitDecisionMode | null;
  selectedReason: string;
  alternativeModePreview: SectionSkinTextureFitDecisionMode[];
  selectedTransform: SectionSkinTextureFitTransformOptionRecord | null;
  canvasWidth: number | null;
  canvasHeight: number | null;
  sourceWidth: number | null;
  sourceHeight: number | null;
  canvasAspectRatio: number | null;
  sourceAspectRatio: number | null;
  aspectRatioDelta: number | null;
  selectedLocalPath: string | null;
  selectedCandidateRank: number | null;
  selectedCandidateScore: number | null;
  selectedCandidateReasons: string[];
  selectedCandidateMatchedTokens: string[];
  atlasPageLocalPath: string | null;
  drawOperationCount: number;
  readyDrawOperationCount: number;
  blockedDrawOperationCount: number;
  occupiedBounds: SectionSkinRenderBounds | null;
  occupiedCoverageRatio: number | null;
  containPenalty: number | null;
  coverPenalty: number | null;
  stretchPenalty: number | null;
  scaleX: number | null;
  scaleY: number | null;
  scaleDelta: number | null;
  slotNames: string[];
  regionNames: string[];
  affectedLayerCount: number;
  affectedSlotNames: string[];
  affectedAttachmentNames: string[];
  affectedRegionNames: string[];
  sampleLayerBounds: SectionSkinRenderBounds | null;
  topAffectedSlotName: string | null;
  topAffectedAttachmentName: string | null;
  nextFitApprovalStep: string;
}

export interface SectionSkinTextureFitApprovalBundleFile {
  schemaVersion: string;
  donorId: string;
  donorName: string;
  generatedAt: string;
  familyName: string;
  sectionKey: string;
  skinName: string;
  textureFitApprovalState: SectionSkinTextureFitApprovalState;
  textureFitDecisionState: SectionSkinTextureFitDecisionState;
  textureFitReviewState: SectionSkinTextureFitReviewState;
  textureSourceFitState: SectionSkinTextureSourceFitState;
  textureCanvasState: SectionSkinTextureCanvasState;
  textureRenderState: SectionSkinTextureRenderState;
  textureAssemblyState: SectionSkinTextureAssemblyState;
  textureLockState: SectionSkinTextureLockState;
  pageLockApplyState: SectionSkinPageLockApplyState;
  pageLockApprovalState: SectionSkinPageLockApprovalState;
  textureReconstructionState: SectionSkinTextureReconstructionState;
  textureSourceState: SectionSkinTextureSourceState;
  matchState: SectionSkinPageMatchState;
  reviewState: SectionSkinMaterialReviewState;
  materialState: SectionSkinMaterialState;
  renderState: SectionSkinRenderPlanState;
  blueprintState: SectionSkinBlueprintState;
  reconstructionState: SectionReconstructionBundleState;
  pageCount: number;
  pageSizeCount: number;
  sourceDimensionCount: number;
  missingPageSizeCount: number;
  missingSourceDimensionCount: number;
  exactPageLockCount: number;
  appliedPageLockCount: number;
  unresolvedPageLockCount: number;
  exactFitDecisionCount: number;
  uniformFitDecisionCount: number;
  proposedContainDecisionCount: number;
  proposedCoverDecisionCount: number;
  proposedStretchDecisionCount: number;
  approvalReadyPageCount: number;
  blockedPageCount: number;
  uniqueSelectedLocalPathCount: number;
  drawOperationCount: number;
  readyDrawOperationCount: number;
  blockedDrawOperationCount: number;
  affectedLayerCount: number;
  affectedAttachmentCount: number;
  topApprovedLocalPath: string | null;
  largestOccupancyCoverageRatio: number | null;
  largestScaleDelta: number | null;
  sampleLocalSourcePath: string | null;
  atlasSourcePath: string | null;
  textureFitDecisionBundlePath: string;
  renderPlanPath: string;
  nextTextureFitApprovalStep: string;
  pages: SectionSkinTextureFitApprovalPageRecord[];
}

export interface SectionSkinTextureFitApprovalBundleProfileRecord {
  familyName: string;
  sectionKey: string;
  skinName: string;
  textureFitApprovalState: SectionSkinTextureFitApprovalState;
  textureFitDecisionState: SectionSkinTextureFitDecisionState;
  pageCount: number;
  pageSizeCount: number;
  sourceDimensionCount: number;
  missingPageSizeCount: number;
  missingSourceDimensionCount: number;
  exactPageLockCount: number;
  appliedPageLockCount: number;
  unresolvedPageLockCount: number;
  exactFitDecisionCount: number;
  uniformFitDecisionCount: number;
  proposedContainDecisionCount: number;
  proposedCoverDecisionCount: number;
  proposedStretchDecisionCount: number;
  approvalReadyPageCount: number;
  blockedPageCount: number;
  uniqueSelectedLocalPathCount: number;
  drawOperationCount: number;
  readyDrawOperationCount: number;
  blockedDrawOperationCount: number;
  affectedLayerCount: number;
  affectedAttachmentCount: number;
  largestOccupancyCoverageRatio: number | null;
  largestScaleDelta: number | null;
  topApprovedLocalPath: string | null;
  sampleLocalSourcePath: string | null;
  atlasSourcePath: string | null;
  textureFitDecisionBundlePath: string;
  textureFitApprovalBundlePath: string;
  nextTextureFitApprovalStep: string;
}

export interface SectionSkinTextureFitApprovalBundleProfilesFile {
  schemaVersion: string;
  donorId: string;
  donorName: string;
  generatedAt: string;
  sectionCount: number;
  sections: SectionSkinTextureFitApprovalBundleProfileRecord[];
}

export type SectionSkinTextureFitApplyState =
  | "ready-with-exact-fit-transforms"
  | "ready-with-uniform-fit-transforms"
  | "ready-with-applied-fit-transforms"
  | "needs-fit-approval"
  | "needs-source-dimension-review"
  | "needs-atlas-page-size-review"
  | "needs-page-lock-resolution";

export type SectionSkinTextureFitApplyPageState =
  | "exact-fit-transform"
  | "uniform-fit-transform"
  | "applied-contain-fit-transform"
  | "applied-cover-fit-transform"
  | "applied-stretch-fit-transform"
  | "missing-source-dimensions"
  | "missing-atlas-page-size"
  | "needs-page-lock-resolution";

export interface SectionSkinTextureFitApplyPageRecord {
  orderIndex: number;
  pageName: string;
  pageState: SectionSkinTextureFitApplyPageState;
  sourcePageState: SectionSkinTextureFitApprovalPageState;
  selectedMode: SectionSkinTextureFitDecisionMode | null;
  selectedReason: string;
  alternativeModePreview: SectionSkinTextureFitDecisionMode[];
  appliedTransform: SectionSkinTextureFitTransformOptionRecord | null;
  canvasWidth: number | null;
  canvasHeight: number | null;
  sourceWidth: number | null;
  sourceHeight: number | null;
  canvasAspectRatio: number | null;
  sourceAspectRatio: number | null;
  aspectRatioDelta: number | null;
  selectedLocalPath: string | null;
  selectedCandidateRank: number | null;
  selectedCandidateScore: number | null;
  selectedCandidateReasons: string[];
  selectedCandidateMatchedTokens: string[];
  atlasPageLocalPath: string | null;
  drawOperationCount: number;
  readyDrawOperationCount: number;
  blockedDrawOperationCount: number;
  occupiedBounds: SectionSkinRenderBounds | null;
  occupiedCoverageRatio: number | null;
  containPenalty: number | null;
  coverPenalty: number | null;
  stretchPenalty: number | null;
  scaleX: number | null;
  scaleY: number | null;
  scaleDelta: number | null;
  slotNames: string[];
  regionNames: string[];
  affectedLayerCount: number;
  affectedSlotNames: string[];
  affectedAttachmentNames: string[];
  affectedRegionNames: string[];
  sampleLayerBounds: SectionSkinRenderBounds | null;
  topAffectedSlotName: string | null;
  topAffectedAttachmentName: string | null;
  nextFitApplyStep: string;
}

export interface SectionSkinTextureFitApplyBundleFile {
  schemaVersion: string;
  donorId: string;
  donorName: string;
  generatedAt: string;
  familyName: string;
  sectionKey: string;
  skinName: string;
  textureFitApplyState: SectionSkinTextureFitApplyState;
  textureFitApprovalState: SectionSkinTextureFitApprovalState;
  textureFitDecisionState: SectionSkinTextureFitDecisionState;
  textureFitReviewState: SectionSkinTextureFitReviewState;
  textureSourceFitState: SectionSkinTextureSourceFitState;
  textureCanvasState: SectionSkinTextureCanvasState;
  textureRenderState: SectionSkinTextureRenderState;
  textureAssemblyState: SectionSkinTextureAssemblyState;
  textureLockState: SectionSkinTextureLockState;
  pageLockApplyState: SectionSkinPageLockApplyState;
  pageLockApprovalState: SectionSkinPageLockApprovalState;
  textureReconstructionState: SectionSkinTextureReconstructionState;
  textureSourceState: SectionSkinTextureSourceState;
  matchState: SectionSkinPageMatchState;
  reviewState: SectionSkinMaterialReviewState;
  materialState: SectionSkinMaterialState;
  renderState: SectionSkinRenderPlanState;
  blueprintState: SectionSkinBlueprintState;
  reconstructionState: SectionReconstructionBundleState;
  pageCount: number;
  pageSizeCount: number;
  sourceDimensionCount: number;
  missingPageSizeCount: number;
  missingSourceDimensionCount: number;
  exactPageLockCount: number;
  appliedPageLockCount: number;
  unresolvedPageLockCount: number;
  exactFitDecisionCount: number;
  uniformFitDecisionCount: number;
  appliedContainFitCount: number;
  appliedCoverFitCount: number;
  appliedStretchFitCount: number;
  readyPageCount: number;
  blockedPageCount: number;
  uniqueSelectedLocalPathCount: number;
  drawOperationCount: number;
  readyDrawOperationCount: number;
  blockedDrawOperationCount: number;
  affectedLayerCount: number;
  affectedAttachmentCount: number;
  topAppliedLocalPath: string | null;
  largestOccupancyCoverageRatio: number | null;
  largestScaleDelta: number | null;
  sampleLocalSourcePath: string | null;
  atlasSourcePath: string | null;
  textureFitApprovalBundlePath: string;
  renderPlanPath: string;
  nextTextureFitApplyStep: string;
  pages: SectionSkinTextureFitApplyPageRecord[];
}

export interface SectionSkinTextureFitApplyBundleProfileRecord {
  familyName: string;
  sectionKey: string;
  skinName: string;
  textureFitApplyState: SectionSkinTextureFitApplyState;
  textureFitApprovalState: SectionSkinTextureFitApprovalState;
  pageCount: number;
  pageSizeCount: number;
  sourceDimensionCount: number;
  missingPageSizeCount: number;
  missingSourceDimensionCount: number;
  exactPageLockCount: number;
  appliedPageLockCount: number;
  unresolvedPageLockCount: number;
  exactFitDecisionCount: number;
  uniformFitDecisionCount: number;
  appliedContainFitCount: number;
  appliedCoverFitCount: number;
  appliedStretchFitCount: number;
  readyPageCount: number;
  blockedPageCount: number;
  uniqueSelectedLocalPathCount: number;
  drawOperationCount: number;
  readyDrawOperationCount: number;
  blockedDrawOperationCount: number;
  affectedLayerCount: number;
  affectedAttachmentCount: number;
  largestOccupancyCoverageRatio: number | null;
  largestScaleDelta: number | null;
  topAppliedLocalPath: string | null;
  sampleLocalSourcePath: string | null;
  atlasSourcePath: string | null;
  textureFitApprovalBundlePath: string;
  textureFitApplyBundlePath: string;
  nextTextureFitApplyStep: string;
}

export interface SectionSkinTextureFitApplyBundleProfilesFile {
  schemaVersion: string;
  donorId: string;
  donorName: string;
  generatedAt: string;
  sectionCount: number;
  sections: SectionSkinTextureFitApplyBundleProfileRecord[];
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
  skinPageLockAuditBundlePath: string | null;
  skinPageLockResolutionBundlePath: string | null;
  skinPageLockDecisionBundlePath: string | null;
  skinPageLockReviewBundlePath: string | null;
  skinPageLockApprovalBundlePath: string | null;
  skinPageLockApplyBundlePath: string | null;
  skinTextureInputBundlePath: string | null;
  skinTextureSourcePlanPath: string | null;
  skinTextureReconstructionBundlePath: string | null;
  skinTextureLockBundlePath: string | null;
  skinTextureAssemblyBundlePath: string | null;
  skinTextureRenderBundlePath: string | null;
  skinTextureCanvasBundlePath: string | null;
  skinTextureSourceFitBundlePath: string | null;
  skinTextureFitReviewBundlePath: string | null;
  skinTextureFitDecisionBundlePath: string | null;
  skinTextureFitApprovalBundlePath: string | null;
  skinTextureFitApplyBundlePath: string | null;
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
    sectionSkinPageLockAuditBundlesRoot: path.join(harvestRoot, "section-skin-page-lock-audit-bundles"),
    sectionSkinPageLockAuditBundleProfilesPath: path.join(harvestRoot, "section-skin-page-lock-audit-bundle-profiles.json"),
    sectionSkinPageLockResolutionBundlesRoot: path.join(harvestRoot, "section-skin-page-lock-resolution-bundles"),
    sectionSkinPageLockResolutionBundleProfilesPath: path.join(harvestRoot, "section-skin-page-lock-resolution-bundle-profiles.json"),
    sectionSkinPageLockDecisionBundlesRoot: path.join(harvestRoot, "section-skin-page-lock-decision-bundles"),
    sectionSkinPageLockDecisionBundleProfilesPath: path.join(harvestRoot, "section-skin-page-lock-decision-bundle-profiles.json"),
    sectionSkinPageLockReviewBundlesRoot: path.join(harvestRoot, "section-skin-page-lock-review-bundles"),
    sectionSkinPageLockReviewBundleProfilesPath: path.join(harvestRoot, "section-skin-page-lock-review-bundle-profiles.json"),
    sectionSkinPageLockApprovalBundlesRoot: path.join(harvestRoot, "section-skin-page-lock-approval-bundles"),
    sectionSkinPageLockApprovalBundleProfilesPath: path.join(harvestRoot, "section-skin-page-lock-approval-bundle-profiles.json"),
    sectionSkinPageLockApplyBundlesRoot: path.join(harvestRoot, "section-skin-page-lock-apply-bundles"),
    sectionSkinPageLockApplyBundleProfilesPath: path.join(harvestRoot, "section-skin-page-lock-apply-bundle-profiles.json"),
    sectionSkinTextureInputBundlesRoot: path.join(harvestRoot, "section-skin-texture-input-bundles"),
    sectionSkinTextureInputBundleProfilesPath: path.join(harvestRoot, "section-skin-texture-input-bundle-profiles.json"),
    sectionSkinTextureSourcePlansRoot: path.join(harvestRoot, "section-skin-texture-source-plans"),
    sectionSkinTextureSourcePlanProfilesPath: path.join(harvestRoot, "section-skin-texture-source-plan-profiles.json"),
    sectionSkinTextureReconstructionBundlesRoot: path.join(harvestRoot, "section-skin-texture-reconstruction-bundles"),
    sectionSkinTextureReconstructionBundleProfilesPath: path.join(harvestRoot, "section-skin-texture-reconstruction-bundle-profiles.json"),
    sectionSkinTextureLockBundlesRoot: path.join(harvestRoot, "section-skin-texture-lock-bundles"),
    sectionSkinTextureLockBundleProfilesPath: path.join(harvestRoot, "section-skin-texture-lock-bundle-profiles.json"),
    sectionSkinTextureAssemblyBundlesRoot: path.join(harvestRoot, "section-skin-texture-assembly-bundles"),
    sectionSkinTextureAssemblyBundleProfilesPath: path.join(harvestRoot, "section-skin-texture-assembly-bundle-profiles.json"),
    sectionSkinTextureRenderBundlesRoot: path.join(harvestRoot, "section-skin-texture-render-bundles"),
    sectionSkinTextureRenderBundleProfilesPath: path.join(harvestRoot, "section-skin-texture-render-bundle-profiles.json"),
    sectionSkinTextureCanvasBundlesRoot: path.join(harvestRoot, "section-skin-texture-canvas-bundles"),
    sectionSkinTextureCanvasBundleProfilesPath: path.join(harvestRoot, "section-skin-texture-canvas-bundle-profiles.json"),
    sectionSkinTextureSourceFitBundlesRoot: path.join(harvestRoot, "section-skin-texture-source-fit-bundles"),
    sectionSkinTextureSourceFitBundleProfilesPath: path.join(harvestRoot, "section-skin-texture-source-fit-bundle-profiles.json"),
    sectionSkinTextureFitReviewBundlesRoot: path.join(harvestRoot, "section-skin-texture-fit-review-bundles"),
    sectionSkinTextureFitReviewBundleProfilesPath: path.join(harvestRoot, "section-skin-texture-fit-review-bundle-profiles.json"),
    sectionSkinTextureFitDecisionBundlesRoot: path.join(harvestRoot, "section-skin-texture-fit-decision-bundles"),
    sectionSkinTextureFitDecisionBundleProfilesPath: path.join(harvestRoot, "section-skin-texture-fit-decision-bundle-profiles.json"),
    sectionSkinTextureFitApprovalBundlesRoot: path.join(harvestRoot, "section-skin-texture-fit-approval-bundles"),
    sectionSkinTextureFitApprovalBundleProfilesPath: path.join(harvestRoot, "section-skin-texture-fit-approval-bundle-profiles.json"),
    sectionSkinTextureFitApplyBundlesRoot: path.join(harvestRoot, "section-skin-texture-fit-apply-bundles"),
    sectionSkinTextureFitApplyBundleProfilesPath: path.join(harvestRoot, "section-skin-texture-fit-apply-bundle-profiles.json"),
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
