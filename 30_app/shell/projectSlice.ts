import { promises as fs } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { loadWorkspaceSlice, type WorkspaceProjectSummary, type WorkspaceSliceBundle } from "./workspaceSlice";
import {
  buildProjectDonorAssetIndex,
  readProjectDonorAssetIndex,
  type DonorAssetIndex,
  type IndexedDonorAsset,
  type SupportedDonorAssetType
} from "../../tools/donor-assets/shared";
import {
  buildPreviewSceneFromEditableProject,
  buildReplayProjectFromEditableProject,
  loadEditableProjectData,
  type EditablePreviewScene,
  type EditableProjectData
} from "../workspace/editableProject";
import {
  buildRuntimeAssetOverrideStatus,
  type RuntimeAssetOverrideStatus
} from "../workspace/donorOverride";
import {
  buildLocalRuntimeMirrorStatus,
  type LocalRuntimeMirrorStatus
} from "../runtime/localRuntimeMirror";
import {
  buildRuntimeResourceMapStatus,
  type RuntimeResourceMapStatus
} from "../runtime/runtimeResourceMap";
import { buildProjectVabsStatus, type ProjectVabsStatus } from "./vabsStatus";

type JsonValue = null | boolean | number | string | JsonObject | JsonValue[];
type JsonObject = { [key: string]: JsonValue | undefined };

export interface DonorEvidenceItem {
  evidenceId: string;
  captureSessionId: string;
  relativePath: string;
  absolutePath: string;
  title: string;
  notes: string;
  sourceType: string;
  sourceCategory: string;
  fileType: string;
  sourceUrl: string | null;
  capturedAtUtc: string | null;
  sizeBytes: number | null;
  sha256: string | null;
  localOnly: boolean;
  localExists: boolean;
  previewKind: "image" | "text" | "none";
  previewUrl: string | null;
  previewText: string | null;
}

export interface DonorEvidenceCatalog {
  donorId: string;
  donorName: string;
  evidenceRoot: string;
  importId: string | null;
  modelVersion: string | null;
  itemCount: number;
  items: DonorEvidenceItem[];
}

export interface DonorAssetItem extends IndexedDonorAsset {
  absolutePath: string;
  previewUrl: string | null;
  previewLabel: string;
  assetGroupKey: string;
  assetGroupLabel: string;
  assetGroupKind: "indexed-donor-images" | "package-family";
  assetGroupDescription: string | null;
  assetDepth: number | null;
  discoveredFromUrl: string | null;
}

export interface DonorAssetGroupSummary {
  key: string;
  label: string;
  kind: "indexed-donor-images" | "package-family";
  description: string | null;
  sceneKitKind: "background" | "gameplay" | "ui" | "overlay" | "misc";
  suggestedLayerId: string;
  layoutStyle: "grid" | "strip" | "stack" | "hero";
  count: number;
  sampleAssetId: string;
}

export interface DonorAssetCatalog {
  projectId: string;
  donorId: string;
  donorName: string;
  sourceMode: DonorAssetIndex["sourceMode"];
  sourceInventoryPath: string;
  indexPath: string;
  localIndexExists: boolean;
  assetCount: number;
  availableFileTypes: IndexedDonorAsset["fileType"][];
  countsByFileType: Record<string, number>;
  countsBySourceCategory: Record<string, number>;
  assetGroups: DonorAssetGroupSummary[];
  blocker: string | null;
  assets: DonorAssetItem[];
}

interface HarvestedPackageGraphNode {
  url?: string;
  category?: string;
  discoverySource?: string;
  depth?: number;
  discoveredFromUrl?: string;
  downloadStatus?: string;
  localPath?: string;
  contentType?: string;
  sizeBytes?: number;
}

interface HarvestedPackageGraphFile {
  nodeCount?: number;
  edgeCount?: number;
  nodes?: HarvestedPackageGraphNode[];
}

export interface RuntimeLaunchStatus {
  projectId: string;
  availability: "local-mirror" | "public-demo" | "blocked";
  launchSurface: "integrated-local-runtime" | "integrated-remote-runtime" | "blocked";
  localRuntimePackageAvailable: boolean;
  blocker: string | null;
  entryUrl: string | null;
  resolvedRuntimeHost: string | null;
  runtimeSourceLabel: "Local mirror" | "Public fallback" | "Blocked";
  captureSessionId: string | null;
  evidenceIds: string[];
  sourcePaths: string[];
  availableActions: string[];
  roundId: string | null;
  currencyCode: string | null;
  wrapperVersion: string | null;
  buildVersion: string | null;
  gameVersion: string | null;
  pixiVersion: string | null;
  spineVersion: string | null;
  observedAssetGroups: string[];
  notes: string[];
}

export interface DonorScanStatus {
  donorId: string;
  donorName: string;
  scanState: string;
  scanSummaryPath: string;
  blockerSummaryPath: string | null;
  nextCaptureTargetsPath: string | null;
  captureRunPath: string | null;
  familyActionRunPath: string | null;
  sectionActionRunPath: string | null;
  captureTargetFamiliesPath: string | null;
  captureFamilySourceProfilesPath: string | null;
  captureFamilyActionsPath: string | null;
  familyReconstructionProfilesPath: string | null;
  familyReconstructionMapsPath: string | null;
  familyReconstructionSectionsPath: string | null;
  familyReconstructionSectionBundlesPath: string | null;
  runtimeCandidateCount: number;
  atlasManifestCount: number;
  bundleAssetMapStatus: string;
  bundleImageVariantStatus: string;
  bundleImageVariantCount: number;
  bundleImageVariantSuffixCount: number;
  bundleImageVariantUrlBuilderStatus: string;
  bundleImageVariantUrlCount: number;
  translationPayloadStatus: string;
  translationPayloadCount: number;
  mirrorCandidateStatus: string;
  requestBackedStaticHintCount: number;
  recentlyBlockedCaptureTargetCount: number;
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
  captureRunStatus: string | null;
  captureRunMode: string | null;
  captureRunRequestedFamily: string | null;
  captureAttemptedCount: number;
  captureDownloadedCount: number;
  captureFailedCount: number;
  captureGeneratedAt: string | null;
  familyActionRunStatus: string | null;
  familyActionRunMode: string | null;
  familyActionRunFamily: string | null;
  familyActionPreparedEvidenceCount: number;
  familyActionWorksetPath: string | null;
  familyActionReconstructionBundlePath: string | null;
  familyActionReconstructionLocalSourceCount: number;
  sectionActionRunStatus: string | null;
  sectionActionRunMode: string | null;
  sectionActionRunSectionKey: string | null;
  sectionActionWorksetPath: string | null;
  sectionActionExactLocalSourceCount: number;
  sectionActionMappedAttachmentCount: number;
  nextOperatorAction: string | null;
  blockerHighlights: string[];
  blockerSummaryMarkdown: string | null;
  topCaptureFamilies: Array<{
    familyName: string;
    targetCount: number;
    untriedTargetCount: number;
    blockedTargetCount: number;
  }>;
  topFamilySourceProfiles: Array<{
    familyName: string;
    sourceState: string;
    localPageCount: number;
    atlasPageRefCount: number;
    blockedTargetCount: number;
    targetCount: number;
    sameFamilyBundleReferenceCount: number;
    sameFamilyVariantAssetCount: number;
    localSameFamilyBundleReferenceCount: number;
    localSameFamilyVariantAssetCount: number;
    localRelatedBundleAssetCount: number;
    localRelatedVariantAssetCount: number;
    sampleMissingPageUrl: string | null;
    sampleLocalPagePath: string | null;
    sampleLocalSourceAssetPath: string | null;
    sampleBundleReference: string | null;
    sampleVariantAsset: string | null;
    sampleUntriedTargetUrl: string | null;
    sampleBlockedTargetUrl: string | null;
    rawPayloadBlockedReason: string | null;
    nextStep: string;
  }>;
  topFamilyActions: Array<{
    familyName: string;
    actionClass: string;
    priority: string;
    localSourceAssetCount: number;
    blockedTargetCount: number;
    targetCount: number;
    reason: string;
    nextStep: string;
    sampleEvidence: string | null;
  }>;
  topFamilyReconstructionProfiles: Array<{
    familyName: string;
    profileState: string;
    readiness: string;
    exactLocalSourceCount: number;
    relatedLocalSourceCount: number;
    atlasPageCount: number;
    atlasRegionCount: number;
    spineAnimationCount: number;
    looseImageCount: number;
    sampleLocalSourcePath: string | null;
    reconstructionBundlePath: string;
    nextReconstructionStep: string;
  }>;
  topFamilyReconstructionMaps: Array<{
    familyName: string;
    profileState: string;
    readiness: string;
    spineAttachmentCount: number;
    mappedAttachmentCount: number;
    unmappedAttachmentCount: number;
    atlasPageCount: number;
    atlasRegionCount: number;
    sampleLocalSourcePath: string | null;
    reconstructionBundlePath: string;
    nextReconstructionStep: string;
  }>;
  topFamilyReconstructionSections: Array<{
    familyName: string;
    sectionKey: string;
    skinName: string;
    sectionState: string;
    bundleState: string;
    attachmentCount: number;
    mappedAttachmentCount: number;
    unmappedAttachmentCount: number;
    atlasPageCount: number;
    exactLocalSourceCount: number;
    sampleLocalSourcePath: string | null;
    sectionBundlePath: string | null;
    nextSectionStep: string;
  }>;
  nextCaptureTargets: Array<{
    url: string;
    relativePath: string;
    priority: string;
    kind: string;
    reason: string;
    alternateHintCount: number;
    alternateHintPreview: string[];
    recentCaptureStatus: string;
    recentCaptureAttemptCount: number;
    recentCaptureFailureReason: string | null;
  }>;
}

export interface ProjectSliceBundle {
  workspace: WorkspaceSliceBundle;
  selectedProjectId: string;
  project: JsonObject;
  importArtifact: JsonObject | null;
  evidenceCatalog: DonorEvidenceCatalog | null;
  donorAssetCatalog: DonorAssetCatalog | null;
  previewScene: EditablePreviewScene | null;
  editableProject: EditableProjectData | null;
  vabs: ProjectVabsStatus | null;
  fixtures: {
    normalSpin: JsonObject;
    freeSpinsTrigger: JsonObject;
    restartRestore: JsonObject;
  };
  runtime: {
    mockedGameState: JsonObject;
    mockedLastAction: JsonObject;
  };
  runtimeLaunch: RuntimeLaunchStatus | null;
  runtimeMirror: LocalRuntimeMirrorStatus | null;
  runtimeResourceMap: RuntimeResourceMapStatus | null;
  runtimeOverrides: RuntimeAssetOverrideStatus | null;
  donorScan: DonorScanStatus | null;
}

const workspaceRoot = path.resolve(__dirname, "../../..");
const replayProjectRoot = path.join(workspaceRoot, "40_projects", "project_001");
const importArtifactPath = path.join(replayProjectRoot, "imports", "mystery-garden-import.json");
const donorEvidenceRoot = path.join(workspaceRoot, "10_donors", "donor_001_mystery_garden", "evidence");
const evidenceHashesPath = path.join(donorEvidenceRoot, "HASHES.csv");
const donorRuntimeSessionId = "MG-CS-20260320-LIVE-A";
const donorRuntimeSessionRoot = path.join(donorEvidenceRoot, "capture_sessions", donorRuntimeSessionId);
const donorRuntimeReadmePath = path.join(donorRuntimeSessionRoot, "README.md");
const donorRuntimeObservationPath = path.join(
  donorRuntimeSessionRoot,
  "MG-EV-20260320-LIVE-A-006__runtime_observation_notes.md"
);
const donorRuntimeInitResponsePath = path.join(
  donorEvidenceRoot,
  "local_only",
  "capture_sessions",
  donorRuntimeSessionId,
  "downloads",
  "MG-EV-20260320-LIVE-A-005__runtime_init_response.json"
);

export function getProjectSlicePaths(): readonly string[] {
  return [
    path.join(replayProjectRoot, "project.json"),
    path.join(replayProjectRoot, "fixtures", "normal_spin.json"),
    path.join(replayProjectRoot, "fixtures", "free_spins_trigger.json"),
    path.join(replayProjectRoot, "fixtures", "restart_restore.json"),
    path.join(replayProjectRoot, "runtime", "mock-game-state.json"),
    path.join(replayProjectRoot, "runtime", "mock-last-action.json")
  ];
}

function assertJsonObject(value: unknown, label: string): asserts value is JsonObject {
  if (!value || Array.isArray(value) || typeof value !== "object") {
    throw new Error(`${label} must be a JSON object.`);
  }
}

async function readJsonFile(filePath: string): Promise<JsonObject> {
  const raw = await fs.readFile(filePath, "utf8");
  const parsed: unknown = JSON.parse(raw);
  assertJsonObject(parsed, filePath);
  return parsed;
}

async function readOptionalJsonFile(filePath: string): Promise<JsonObject | null> {
  try {
    return await readJsonFile(filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException | undefined)?.code === "ENOENT") {
      return null;
    }

    throw error;
  }
}

async function readOptionalTextFile(filePath: string): Promise<string | null> {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException | undefined)?.code === "ENOENT") {
      return null;
    }

    throw error;
  }
}

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === "\"") {
      const next = line[index + 1];
      if (inQuotes && next === "\"") {
        current += "\"";
        index += 1;
        continue;
      }

      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      values.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current);
  return values;
}

function humanizeEvidenceSlug(relativePath: string, notes: string): string {
  const firstSentence = notes.split(".")[0]?.trim();
  if (firstSentence) {
    return firstSentence;
  }

  const stem = path.basename(relativePath, path.extname(relativePath));
  const slug = stem.includes("__") ? stem.split("__")[1] : stem;
  return slug
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getEvidenceSourceCategory(captureSessionId: string): string {
  if (captureSessionId.includes("-LIVE-")) {
    return "live runtime";
  }

  if (captureSessionId.includes("-WEB-")) {
    return "web / published donor";
  }

  return "capture session";
}

function getEvidenceFileType(relativePath: string): string {
  const extension = path.extname(relativePath).toLowerCase();
  if ([".png", ".jpg", ".jpeg", ".webp", ".gif"].includes(extension)) {
    return "image";
  }

  if (extension === ".json") {
    return "json";
  }

  if (extension === ".md") {
    return "markdown";
  }

  if (extension === ".csv") {
    return "csv";
  }

  return extension.replace(/^\./, "") || "file";
}

function getPreviewKind(relativePath: string): DonorEvidenceItem["previewKind"] {
  const fileType = getEvidenceFileType(relativePath);
  if (fileType === "image") {
    return "image";
  }

  if (fileType === "markdown") {
    return "text";
  }

  return "none";
}

function getEvidenceSourceType(relativePath: string): string {
  const fileType = getEvidenceFileType(relativePath);
  switch (fileType) {
    case "image":
      return "screenshot / image capture";
    case "json":
      return "json capture";
    case "markdown":
      return "notes / report";
    default:
      return `${fileType} evidence`;
  }
}

function buildPreviewText(raw: string): string {
  return raw
    .replace(/\r/g, "")
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 220);
}

async function buildDonorEvidenceItem(record: Record<string, string>): Promise<DonorEvidenceItem> {
  const relativePath = record.relative_path ?? "";
  const absolutePath = path.join(donorEvidenceRoot, relativePath);
  const localOnly = relativePath.startsWith("local_only/");
  const localExists = await fs.access(absolutePath).then(() => true).catch(() => false);
  const previewKind = getPreviewKind(relativePath);
  const notes = record.notes ?? "";
  let previewUrl: string | null = null;
  let previewText: string | null = null;

  if (localExists && previewKind === "image") {
    previewUrl = pathToFileURL(absolutePath).href;
  } else if (localExists && previewKind === "text") {
    const rawText = await readOptionalTextFile(absolutePath);
    previewText = rawText ? buildPreviewText(rawText) : null;
  }

  if (!previewUrl && !previewText && localOnly) {
    previewText = "Local-only donor artifact is available on this machine, but this shell keeps it read-only.";
  } else if (!previewUrl && !previewText) {
    previewText = "No lightweight preview is available for this evidence item in the current shell.";
  }

  return {
    evidenceId: record.evidence_id ?? "unknown-evidence",
    captureSessionId: record.capture_session_id ?? "unknown-session",
    relativePath,
    absolutePath,
    title: humanizeEvidenceSlug(relativePath, notes),
    notes,
    sourceType: getEvidenceSourceType(relativePath),
    sourceCategory: getEvidenceSourceCategory(record.capture_session_id ?? ""),
    fileType: getEvidenceFileType(relativePath),
    sourceUrl: record.source_url || null,
    capturedAtUtc: record.captured_at_utc || null,
    sizeBytes: record.size_bytes ? Number.parseInt(record.size_bytes, 10) : null,
    sha256: record.sha256 || null,
    localOnly,
    localExists,
    previewKind,
    previewUrl,
    previewText
  };
}

async function loadDonorEvidenceCatalog(importArtifact: JsonObject | null): Promise<DonorEvidenceCatalog | null> {
  const rawCsv = await readOptionalTextFile(evidenceHashesPath);
  if (!rawCsv) {
    return null;
  }

  const lines = rawCsv.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length <= 1) {
    return null;
  }

  const header = parseCsvLine(lines[0]);
  const records = lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    return Object.fromEntries(header.map((key, index) => [key, values[index] ?? ""]));
  });
  const items = await Promise.all(records.map((record) => buildDonorEvidenceItem(record)));

  return {
    donorId: typeof importArtifact?.sourceDonorId === "string" ? importArtifact.sourceDonorId : "donor_001_mystery_garden",
    donorName: "Mystery Garden",
    evidenceRoot: donorEvidenceRoot,
    importId: typeof importArtifact?.importId === "string" ? importArtifact.importId : null,
    modelVersion: typeof importArtifact?.modelVersion === "string" ? importArtifact.modelVersion : null,
    itemCount: items.length,
    items
  };
}

function getSupportedDonorAssetTypeForPath(filePath: string): SupportedDonorAssetType | null {
  const extension = path.extname(filePath).replace(/^\./, "").toLowerCase();
  if (["png", "webp", "jpg", "jpeg", "svg"].includes(extension)) {
    return extension as SupportedDonorAssetType;
  }

  return null;
}

function toPackageGraphAssetId(projectId: string, localPath: string, sourceUrl: string | null): string {
  const raw = `${projectId}::${localPath}::${sourceUrl ?? "no-source-url"}`;
  const hash = Buffer.from(raw).toString("base64url").slice(0, 18).toLowerCase();
  return `donor.asset.graph-${hash}`;
}

function buildPackageGraphTitle(localPath: string, sourceUrl: string | null): string {
  const filename = path.basename(localPath);
  const stem = path.basename(filename, path.extname(filename));
  const normalizedStem = stem
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());

  if (sourceUrl) {
    try {
      const parsed = new URL(sourceUrl);
      const pathLabel = parsed.pathname.split("/").filter(Boolean).slice(-2).join(" / ");
      if (pathLabel) {
        return `${normalizedStem} (${pathLabel})`;
      }
    } catch {
      // Keep the filename-derived title.
    }
  }

  return normalizedStem || filename;
}

function toTitleWords(raw: string): string {
  return raw
    .split(/[\s/_:-]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function buildPackageGraphAssetGroupKey(
  sourceUrl: string,
  category: NonNullable<HarvestedPackageGraphNode["category"]>
): string {
  try {
    const parsed = new URL(sourceUrl);
    const segments = parsed.pathname.split("/").filter(Boolean);
    const suffix = segments.slice(0, Math.min(2, segments.length)).join("/") || "(root)";
    return `${category}:${suffix}`;
  } catch {
    return `${category}:(invalid-url)`;
  }
}

function buildPackageGraphAssetGroupLabel(groupKey: string): string {
  const separatorIndex = groupKey.indexOf(":");
  if (separatorIndex < 0) {
    return toTitleWords(groupKey);
  }

  const category = groupKey.slice(0, separatorIndex);
  const rawSuffix = groupKey.slice(separatorIndex + 1);
  const suffix = rawSuffix === "(root)"
    ? "Root"
    : rawSuffix
        .split("/")
        .map((segment) => toTitleWords(segment))
        .join(" / ");
  return `${toTitleWords(category)} Bundle · ${suffix}`;
}

function buildPackageGraphAssetGroupDescription(node: HarvestedPackageGraphNode): string | null {
  if (typeof node.discoveredFromUrl === "string" && node.discoveredFromUrl.length > 0) {
    try {
      const parsed = new URL(node.discoveredFromUrl);
      const pathLabel = parsed.pathname.split("/").filter(Boolean).slice(-2).join(" / ") || parsed.host;
      return `Discovered from ${pathLabel}.`;
    } catch {
      return `Discovered from ${node.discoveredFromUrl}.`;
    }
  }

  if (typeof node.url === "string" && node.url.length > 0) {
    try {
      const parsed = new URL(node.url);
      return `Harvested from ${parsed.host}.`;
    } catch {
      return "Harvested from the donor package graph.";
    }
  }

  return "Harvested from the donor package graph.";
}

function inferSceneKitKind(
  groupLabel: string,
  assets: readonly Pick<DonorAssetItem, "title" | "filename" | "sourceUrl" | "discoveredFromUrl">[]
): DonorAssetGroupSummary["sceneKitKind"] {
  const haystack = [
    groupLabel,
    ...assets.flatMap((asset) => [
      asset.title,
      asset.filename,
      asset.sourceUrl ?? "",
      asset.discoveredFromUrl ?? ""
    ])
  ].join(" ").toLowerCase();

  if (/(modal|overlay|popup|intro|loading|award|transition|splash)/.test(haystack)) {
    return "overlay";
  }
  if (/(hud|ui|button|counter|bar|badge|panel|label|control|menu)/.test(haystack)) {
    return "ui";
  }
  if (/(background|backdrop|wallpaper|landscape|forest|garden-bg|scene-bg)/.test(haystack)) {
    return "background";
  }
  if (/(board|reel|symbol|book|logo|title|flower|key|scatter|frame|tile)/.test(haystack)) {
    return "gameplay";
  }

  return "misc";
}

function getSceneKitSuggestedLayerId(sceneKitKind: DonorAssetGroupSummary["sceneKitKind"]): string {
  if (sceneKitKind === "ui") {
    return "layer.ui";
  }
  if (sceneKitKind === "overlay") {
    return "layer.overlay";
  }

  return "layer.gameplay";
}

function getSceneKitLayoutStyle(sceneKitKind: DonorAssetGroupSummary["sceneKitKind"]): DonorAssetGroupSummary["layoutStyle"] {
  if (sceneKitKind === "background") {
    return "hero";
  }
  if (sceneKitKind === "ui") {
    return "strip";
  }
  if (sceneKitKind === "overlay") {
    return "stack";
  }

  return "grid";
}

async function loadPackageGraphAssets(
  selectedProject: WorkspaceProjectSummary | null,
  selectedProjectId: string
): Promise<DonorAssetItem[]> {
  const donor = selectedProject?.donor ?? null;
  const donorId = donor?.donorId ?? "donor_unknown";
  const donorName = donor?.donorName ?? selectedProjectId;
  const packageGraphPath = donor?.packageGraphPath ?? null;
  if (!packageGraphPath) {
    return [];
  }

  const packageGraph = await readOptionalJsonFile(path.join(workspaceRoot, packageGraphPath)) as HarvestedPackageGraphFile | null;
  const nodes = Array.isArray(packageGraph?.nodes) ? packageGraph.nodes : [];
  const assets: DonorAssetItem[] = [];
  const seenLocalPaths = new Set<string>();

  for (const node of nodes) {
    if (node?.downloadStatus !== "downloaded" || typeof node.localPath !== "string" || typeof node.url !== "string") {
      continue;
    }
    const fileType = getSupportedDonorAssetTypeForPath(node.localPath);
    if (!fileType || seenLocalPaths.has(node.localPath)) {
      continue;
    }

    const absolutePath = path.join(workspaceRoot, node.localPath);
    try {
      await fs.access(absolutePath);
    } catch {
      continue;
    }

    seenLocalPaths.add(node.localPath);
    const filename = path.basename(node.localPath);
    const discoveredFrom = typeof node.discoveredFromUrl === "string" ? node.discoveredFromUrl : null;
    const sourceUrl = typeof node.url === "string" ? node.url : null;
    const sourceCategory = typeof node.category === "string" ? node.category : "other";
    const assetGroupKey = sourceUrl
      ? buildPackageGraphAssetGroupKey(sourceUrl, sourceCategory)
      : `package-family:${filename}`;
    assets.push({
      assetId: toPackageGraphAssetId(selectedProjectId, node.localPath, sourceUrl),
      evidenceId: `package-graph:${filename}`,
      captureSessionId: "donor-package-graph",
      donorId,
      donorName,
      title: buildPackageGraphTitle(node.localPath, sourceUrl),
      filename,
      fileType,
      sourceCategory: "harvested runtime/package image",
      sourceUrl,
      assetGroupKey,
      assetGroupLabel: buildPackageGraphAssetGroupLabel(assetGroupKey),
      assetGroupKind: "package-family",
      assetGroupDescription: buildPackageGraphAssetGroupDescription(node),
      assetDepth: typeof node.depth === "number" ? node.depth : null,
      discoveredFromUrl: discoveredFrom,
      notes: discoveredFrom
        ? `Harvested via donor package graph from ${discoveredFrom}.`
        : "Harvested via donor package graph.",
      repoRelativePath: node.localPath,
      donorRelativePath: node.localPath,
      localExists: true,
      previewAvailable: true,
      width: null,
      height: null,
      absolutePath,
      previewUrl: pathToFileURL(absolutePath).href,
      previewLabel: discoveredFrom ? "harvested runtime image" : "harvested package image"
    });
  }

  return assets.sort((left, right) => left.filename.localeCompare(right.filename));
}

async function loadDonorAssetCatalog(selectedProject: WorkspaceProjectSummary | null, selectedProjectId: string): Promise<DonorAssetCatalog | null> {
  let index: DonorAssetIndex | null = null;
  if (selectedProjectId === "project_001") {
    index = await readProjectDonorAssetIndex(selectedProjectId);
    if (!index) {
      try {
        index = await buildProjectDonorAssetIndex(selectedProjectId);
      } catch {
        index = null;
      }
    }
  }
  const localIndexExists = Boolean(index);
  const indexedAssets = index ? index.assets.map((asset) => {
    const absolutePath = path.join(workspaceRoot, asset.repoRelativePath);
    return {
      ...asset,
      absolutePath,
      previewUrl: asset.localExists ? pathToFileURL(absolutePath).href : null,
      previewLabel: asset.localExists
        ? "drag to import"
        : "local file missing",
      assetGroupKey: "indexed-donor-images",
      assetGroupLabel: "Indexed donor images",
      assetGroupKind: "indexed-donor-images" as const,
      assetGroupDescription: "Hand-indexed local donor images already grounded for this project.",
      assetDepth: null,
      discoveredFromUrl: null
    };
  }) : [];
  const packageGraphAssets = await loadPackageGraphAssets(selectedProject, selectedProjectId);
  const assetMap = new Map<string, DonorAssetItem>();
  [...indexedAssets, ...packageGraphAssets].forEach((asset) => {
    const dedupeKey = asset.repoRelativePath || asset.assetId;
    if (!assetMap.has(dedupeKey)) {
      assetMap.set(dedupeKey, asset);
    }
  });
  const assets = [...assetMap.values()].sort((left, right) => left.assetId.localeCompare(right.assetId));
  const countsByFileType = assets.reduce<Record<string, number>>((counts, asset) => {
    counts[asset.fileType] = (counts[asset.fileType] ?? 0) + 1;
    return counts;
  }, {});
  const countsBySourceCategory = assets.reduce<Record<string, number>>((counts, asset) => {
    counts[asset.sourceCategory] = (counts[asset.sourceCategory] ?? 0) + 1;
    return counts;
  }, {});
  const assetGroupMap = new Map<string, DonorAssetGroupSummary>();
  for (const asset of assets) {
    const current = assetGroupMap.get(asset.assetGroupKey);
    if (current) {
      current.count += 1;
      continue;
    }
    const sceneKitKind = inferSceneKitKind(asset.assetGroupLabel, assets.filter((entry) => entry.assetGroupKey === asset.assetGroupKey));
    assetGroupMap.set(asset.assetGroupKey, {
      key: asset.assetGroupKey,
      label: asset.assetGroupLabel,
      kind: asset.assetGroupKind,
      description: asset.assetGroupDescription,
      sceneKitKind,
      suggestedLayerId: getSceneKitSuggestedLayerId(sceneKitKind),
      layoutStyle: getSceneKitLayoutStyle(sceneKitKind),
      count: 1,
      sampleAssetId: asset.assetId
    });
  }
  const assetGroups = [...assetGroupMap.values()].sort((left, right) => {
    if (left.kind !== right.kind) {
      return left.kind === "indexed-donor-images" ? -1 : 1;
    }
    return left.label.localeCompare(right.label);
  });
  const fileTypeOrder = ["png", "webp", "jpg", "jpeg", "svg"];
  const availableFileTypes = Object.keys(countsByFileType).sort((left, right) => {
    const leftIndex = fileTypeOrder.indexOf(left);
    const rightIndex = fileTypeOrder.indexOf(right);
    if (leftIndex >= 0 && rightIndex >= 0) {
      return leftIndex - rightIndex;
    }
    if (leftIndex >= 0) {
      return -1;
    }
    if (rightIndex >= 0) {
      return 1;
    }
    return left.localeCompare(right);
  }) as IndexedDonorAsset["fileType"][];

  return {
    projectId: index?.projectId ?? selectedProjectId,
    donorId: index?.donorId ?? selectedProject?.donor?.donorId ?? "donor_unknown",
    donorName: index?.donorName ?? selectedProject?.donor?.donorName ?? selectedProjectId,
    sourceMode: index?.sourceMode ?? "local-donor-images",
    sourceInventoryPath: index?.sourceInventoryPath ?? selectedProject?.donor?.packageGraphPath ?? "",
    indexPath: index?.indexPath ?? "",
    localIndexExists,
    assetCount: assets.length,
    availableFileTypes,
    countsByFileType,
    countsBySourceCategory,
    assetGroups,
    blocker: assets.length > 0
      ? null
      : selectedProjectId === "project_001"
        ? "No usable local donor image assets are available for this project on this machine."
        : "No harvested donor/runtime image assets are available for this project yet. Start from a donor launch URL first.",
    assets
  };
}

async function loadDonorScanStatus(selectedProject: WorkspaceProjectSummary | null): Promise<DonorScanStatus | null> {
  const donor = selectedProject?.donor ?? null;
  const donorId = donor?.donorId;
  if (!donorId) {
    return null;
  }

  const scanSummaryPath = donor.scanSummaryPath
    ?? `10_donors/${donorId}/evidence/local_only/harvest/scan-summary.json`;
  const blockerSummaryPath = donor.blockerSummaryPath
    ?? `10_donors/${donorId}/evidence/local_only/harvest/blocker-summary.md`;
  const nextCaptureTargetsPath = donor.nextCaptureTargetsPath
    ?? `10_donors/${donorId}/evidence/local_only/harvest/next-capture-targets.json`;
  const captureTargetFamiliesPath = `10_donors/${donorId}/evidence/local_only/harvest/capture-target-families.json`;
  const captureFamilySourceProfilesPath = `10_donors/${donorId}/evidence/local_only/harvest/capture-family-source-profiles.json`;
  const captureFamilyActionsPath = `10_donors/${donorId}/evidence/local_only/harvest/capture-family-actions.json`;
  const familyReconstructionProfilesPath = `10_donors/${donorId}/evidence/local_only/harvest/family-reconstruction-profiles.json`;
  const familyReconstructionMapsPath = `10_donors/${donorId}/evidence/local_only/harvest/family-reconstruction-maps.json`;
  const familyReconstructionSectionsPath = `10_donors/${donorId}/evidence/local_only/harvest/family-reconstruction-sections.json`;
  const familyReconstructionSectionBundlesPath = `10_donors/${donorId}/evidence/local_only/harvest/family-reconstruction-section-bundles.json`;
  const captureRunPath = `10_donors/${donorId}/evidence/local_only/harvest/next-capture-run.json`;
  const familyActionRunPath = `10_donors/${donorId}/evidence/local_only/harvest/family-action-run.json`;
  const sectionActionRunPath = `10_donors/${donorId}/evidence/local_only/harvest/section-action-run.json`;
  const [scanSummary, blockerSummaryMarkdown, nextCaptureTargetsFile, captureRunSummary, captureTargetFamiliesFile, captureFamilySourceProfilesFile, captureFamilyActionsFile, familyReconstructionProfilesFile, familyReconstructionMapsFile, familyReconstructionSectionsFile, familyReconstructionSectionBundlesFile, familyActionRunSummary, sectionActionRunSummary] = await Promise.all([
    readOptionalJsonFile(path.join(workspaceRoot, scanSummaryPath)) as Promise<JsonObject | null>,
    readOptionalTextFile(path.join(workspaceRoot, blockerSummaryPath)),
    readOptionalJsonFile(path.join(workspaceRoot, nextCaptureTargetsPath)) as Promise<JsonObject | null>,
    readOptionalJsonFile(path.join(workspaceRoot, captureRunPath)) as Promise<JsonObject | null>,
    readOptionalJsonFile(path.join(workspaceRoot, captureTargetFamiliesPath)) as Promise<JsonObject | null>,
    readOptionalJsonFile(path.join(workspaceRoot, captureFamilySourceProfilesPath)) as Promise<JsonObject | null>,
    readOptionalJsonFile(path.join(workspaceRoot, captureFamilyActionsPath)) as Promise<JsonObject | null>,
    readOptionalJsonFile(path.join(workspaceRoot, familyReconstructionProfilesPath)) as Promise<JsonObject | null>,
    readOptionalJsonFile(path.join(workspaceRoot, familyReconstructionMapsPath)) as Promise<JsonObject | null>,
    readOptionalJsonFile(path.join(workspaceRoot, familyReconstructionSectionsPath)) as Promise<JsonObject | null>,
    readOptionalJsonFile(path.join(workspaceRoot, familyReconstructionSectionBundlesPath)) as Promise<JsonObject | null>,
    readOptionalJsonFile(path.join(workspaceRoot, familyActionRunPath)) as Promise<JsonObject | null>,
    readOptionalJsonFile(path.join(workspaceRoot, sectionActionRunPath)) as Promise<JsonObject | null>
  ]);

  if (!scanSummary) {
    return null;
  }

  const blockerHighlights = Array.isArray(scanSummary.blockerHighlights)
    ? scanSummary.blockerHighlights.filter((value): value is string => typeof value === "string")
    : [];
  const nextCaptureTargets = Array.isArray(nextCaptureTargetsFile?.targets)
    ? nextCaptureTargetsFile.targets
        .filter((value): value is JsonObject => Boolean(value) && typeof value === "object" && !Array.isArray(value))
        .map((target) => ({
          url: typeof target.url === "string" ? target.url : "",
          relativePath: typeof target.relativePath === "string" ? target.relativePath : "",
          priority: typeof target.priority === "string" ? target.priority : "unknown",
          kind: typeof target.kind === "string" ? target.kind : "unknown",
          reason: typeof target.reason === "string" ? target.reason : "No reason recorded.",
          alternateHintCount: Array.isArray(target.alternateCaptureHints) ? target.alternateCaptureHints.length : 0,
          alternateHintPreview: Array.isArray(target.alternateCaptureHints)
            ? target.alternateCaptureHints
                .filter((value): value is JsonObject => Boolean(value) && typeof value === "object" && !Array.isArray(value))
                .map((value) => typeof value.url === "string" ? value.url : "")
                .filter((value) => value.length > 0)
                .slice(0, 2)
            : [],
          recentCaptureStatus: typeof target.recentCaptureStatus === "string" ? target.recentCaptureStatus : "untried",
          recentCaptureAttemptCount: typeof target.recentCaptureAttemptCount === "number" ? target.recentCaptureAttemptCount : 0,
          recentCaptureFailureReason: typeof target.recentCaptureFailureReason === "string" ? target.recentCaptureFailureReason : null
        }))
        .filter((target) => target.url.length > 0)
        .slice(0, 5)
    : [];

  const topCaptureFamilies = Array.isArray(captureTargetFamiliesFile?.families)
    ? captureTargetFamiliesFile.families
        .filter((value): value is JsonObject => Boolean(value) && typeof value === "object" && !Array.isArray(value))
        .map((family) => ({
          familyName: typeof family.familyName === "string" ? family.familyName : "",
          targetCount: typeof family.targetCount === "number" ? family.targetCount : 0,
          untriedTargetCount: typeof family.untriedTargetCount === "number" ? family.untriedTargetCount : 0,
          blockedTargetCount: typeof family.blockedTargetCount === "number" ? family.blockedTargetCount : 0
        }))
        .filter((family) => family.familyName.length > 0)
        .slice(0, 5)
    : [];
  const topFamilySourceProfiles = Array.isArray(captureFamilySourceProfilesFile?.families)
    ? captureFamilySourceProfilesFile.families
        .filter((value): value is JsonObject => Boolean(value) && typeof value === "object" && !Array.isArray(value))
        .map((family) => ({
          familyName: typeof family.familyName === "string" ? family.familyName : "",
          sourceState: typeof family.sourceState === "string" ? family.sourceState : "unknown",
          localPageCount: typeof family.localPageCount === "number" ? family.localPageCount : 0,
          atlasPageRefCount: typeof family.atlasPageRefCount === "number" ? family.atlasPageRefCount : 0,
          blockedTargetCount: typeof family.blockedTargetCount === "number" ? family.blockedTargetCount : 0,
          targetCount: typeof family.targetCount === "number" ? family.targetCount : 0,
          atlasManifestKindCount: Array.isArray(family.atlasManifestKinds) ? family.atlasManifestKinds.length : 0,
          sameFamilyBundleReferenceCount: typeof family.sameFamilyBundleReferenceCount === "number" ? family.sameFamilyBundleReferenceCount : 0,
          sameFamilyVariantAssetCount: typeof family.sameFamilyVariantAssetCount === "number" ? family.sameFamilyVariantAssetCount : 0,
          localSameFamilyBundleReferenceCount: typeof family.localSameFamilyBundleReferenceCount === "number" ? family.localSameFamilyBundleReferenceCount : 0,
          localSameFamilyVariantAssetCount: typeof family.localSameFamilyVariantAssetCount === "number" ? family.localSameFamilyVariantAssetCount : 0,
          localRelatedBundleAssetCount: typeof family.localRelatedBundleAssetCount === "number" ? family.localRelatedBundleAssetCount : 0,
          localRelatedVariantAssetCount: typeof family.localRelatedVariantAssetCount === "number" ? family.localRelatedVariantAssetCount : 0,
          sampleMissingPageUrl: Array.isArray(family.missingPageUrls) && typeof family.missingPageUrls[0] === "string" ? family.missingPageUrls[0] : null,
          sampleLocalPagePath: Array.isArray(family.localPagePaths) && typeof family.localPagePaths[0] === "string" ? family.localPagePaths[0] : null,
          sampleLocalSourceAssetPath: Array.isArray(family.localSourceAssetPreview) && typeof family.localSourceAssetPreview[0] === "string" ? family.localSourceAssetPreview[0] : null,
          sampleBundleReference: Array.isArray(family.sameFamilyBundleReferencePreview) && typeof family.sameFamilyBundleReferencePreview[0] === "string" ? family.sameFamilyBundleReferencePreview[0] : null,
          sampleVariantAsset: Array.isArray(family.sameFamilyVariantAssetPreview) && typeof family.sameFamilyVariantAssetPreview[0] === "string" ? family.sameFamilyVariantAssetPreview[0] : null,
          sampleUntriedTargetUrl: Array.isArray(family.topUntriedTargetUrls) && typeof family.topUntriedTargetUrls[0] === "string" ? family.topUntriedTargetUrls[0] : null,
          sampleBlockedTargetUrl: Array.isArray(family.topBlockedTargetUrls) && typeof family.topBlockedTargetUrls[0] === "string" ? family.topBlockedTargetUrls[0] : null,
          rawPayloadBlockedReason: typeof family.rawPayloadBlockedReason === "string" ? family.rawPayloadBlockedReason : null,
          nextStep: typeof family.nextStep === "string" ? family.nextStep : "Review the donor scan family source profile."
        }))
        .filter((family) =>
          family.familyName.length > 0
          && (
            family.blockedTargetCount > 0
            || family.atlasManifestKindCount > 0
            || family.sameFamilyVariantAssetCount > 0
            || family.localSameFamilyBundleReferenceCount > 0
            || family.localSameFamilyVariantAssetCount > 0
            || family.localRelatedBundleAssetCount > 0
            || family.localRelatedVariantAssetCount > 0
            || family.targetCount >= 3
          )
        )
        .slice(0, 5)
    : [];
  const topFamilyActions = Array.isArray(captureFamilyActionsFile?.families)
    ? captureFamilyActionsFile.families
        .filter((value): value is JsonObject => Boolean(value) && typeof value === "object" && !Array.isArray(value))
        .map((family) => ({
          familyName: typeof family.familyName === "string" ? family.familyName : "",
          actionClass: typeof family.actionClass === "string" ? family.actionClass : "unknown",
          priority: typeof family.priority === "string" ? family.priority : "low",
          localSourceAssetCount: typeof family.localSourceAssetCount === "number" ? family.localSourceAssetCount : 0,
          blockedTargetCount: typeof family.blockedTargetCount === "number" ? family.blockedTargetCount : 0,
          targetCount: typeof family.targetCount === "number" ? family.targetCount : 0,
          reason: typeof family.reason === "string" ? family.reason : "Review the donor scan family action queue.",
          nextStep: typeof family.nextStep === "string" ? family.nextStep : "Review the donor scan family action queue.",
          sampleEvidence: typeof family.sampleEvidence === "string" ? family.sampleEvidence : null
        }))
        .filter((family) => family.familyName.length > 0)
        .slice(0, 5)
    : [];
  const topFamilyReconstructionProfiles = Array.isArray(familyReconstructionProfilesFile?.families)
    ? familyReconstructionProfilesFile.families
        .filter((value): value is JsonObject => Boolean(value) && typeof value === "object" && !Array.isArray(value))
        .map((family) => ({
          familyName: typeof family.familyName === "string" ? family.familyName : "",
          profileState: typeof family.profileState === "string" ? family.profileState : "unknown",
          readiness: typeof family.readiness === "string" ? family.readiness : "unknown",
          exactLocalSourceCount: typeof family.exactLocalSourceCount === "number" ? family.exactLocalSourceCount : 0,
          relatedLocalSourceCount: typeof family.relatedLocalSourceCount === "number" ? family.relatedLocalSourceCount : 0,
          atlasPageCount: typeof family.atlasPageCount === "number" ? family.atlasPageCount : 0,
          atlasRegionCount: typeof family.atlasRegionCount === "number" ? family.atlasRegionCount : 0,
          spineAnimationCount: typeof family.spineAnimationCount === "number" ? family.spineAnimationCount : 0,
          looseImageCount: typeof family.looseImageCount === "number" ? family.looseImageCount : 0,
          sampleLocalSourcePath: typeof family.sampleLocalSourcePath === "string" ? family.sampleLocalSourcePath : null,
          reconstructionBundlePath: typeof family.reconstructionBundlePath === "string" ? family.reconstructionBundlePath : "",
          nextReconstructionStep: typeof family.nextReconstructionStep === "string" ? family.nextReconstructionStep : "Review the family reconstruction profile."
        }))
        .filter((family) =>
          family.familyName.length > 0
          && (
            family.profileState !== "needs-manual-source-review"
            || family.exactLocalSourceCount > 0
            || family.relatedLocalSourceCount > 0
          )
        )
        .slice(0, 5)
    : [];
  const topFamilyReconstructionMaps = Array.isArray(familyReconstructionMapsFile?.families)
    ? familyReconstructionMapsFile.families
        .filter((value): value is JsonObject => Boolean(value) && typeof value === "object" && !Array.isArray(value))
        .map((family) => ({
          familyName: typeof family.familyName === "string" ? family.familyName : "",
          profileState: typeof family.profileState === "string" ? family.profileState : "unknown",
          readiness: typeof family.readiness === "string" ? family.readiness : "unknown",
          spineAttachmentCount: typeof family.spineAttachmentCount === "number" ? family.spineAttachmentCount : 0,
          mappedAttachmentCount: typeof family.mappedAttachmentCount === "number" ? family.mappedAttachmentCount : 0,
          unmappedAttachmentCount: typeof family.unmappedAttachmentCount === "number" ? family.unmappedAttachmentCount : 0,
          atlasPageCount: typeof family.atlasPageCount === "number" ? family.atlasPageCount : 0,
          atlasRegionCount: typeof family.atlasRegionCount === "number" ? family.atlasRegionCount : 0,
          sampleLocalSourcePath: typeof family.sampleLocalSourcePath === "string" ? family.sampleLocalSourcePath : null,
          reconstructionBundlePath: typeof family.reconstructionBundlePath === "string" ? family.reconstructionBundlePath : "",
          nextReconstructionStep: typeof family.nextReconstructionStep === "string" ? family.nextReconstructionStep : "Review the family reconstruction map."
        }))
        .filter((family) =>
          family.familyName.length > 0
          && (
            family.mappedAttachmentCount > 0
            || family.spineAttachmentCount > 0
            || family.atlasRegionCount > 0
          )
        )
        .slice(0, 5)
    : [];
  const sectionBundleLookup = new Map<string, {
    bundleState: string;
    exactLocalSourceCount: number;
    sectionBundlePath: string | null;
  }>(
    Array.isArray(familyReconstructionSectionBundlesFile?.sections)
      ? familyReconstructionSectionBundlesFile.sections
          .filter((value): value is JsonObject => Boolean(value) && typeof value === "object" && !Array.isArray(value))
          .map((section): [string, { bundleState: string; exactLocalSourceCount: number; sectionBundlePath: string | null }] => [
            typeof section.sectionKey === "string" ? section.sectionKey : "",
            {
              bundleState: typeof section.bundleState === "string" ? section.bundleState : "unknown",
              exactLocalSourceCount: typeof section.exactLocalSourceCount === "number" ? section.exactLocalSourceCount : 0,
              sectionBundlePath: typeof section.reconstructionBundlePath === "string" ? section.reconstructionBundlePath : null
            }
          ])
          .filter((entry): entry is [string, { bundleState: string; exactLocalSourceCount: number; sectionBundlePath: string | null }] => entry[0].length > 0)
      : []
  );
  const topFamilyReconstructionSections = Array.isArray(familyReconstructionSectionsFile?.sections)
    ? familyReconstructionSectionsFile.sections
        .filter((value): value is JsonObject => Boolean(value) && typeof value === "object" && !Array.isArray(value))
        .map((section) => {
          const sectionKey = typeof section.sectionKey === "string" ? section.sectionKey : "";
          const sectionBundle = sectionBundleLookup.get(sectionKey);
          return {
            familyName: typeof section.familyName === "string" ? section.familyName : "",
            sectionKey,
            skinName: typeof section.skinName === "string" ? section.skinName : "",
            sectionState: typeof section.sectionState === "string" ? section.sectionState : "unknown",
            bundleState: sectionBundle?.bundleState ?? "unknown",
            attachmentCount: typeof section.attachmentCount === "number" ? section.attachmentCount : 0,
            mappedAttachmentCount: typeof section.mappedAttachmentCount === "number" ? section.mappedAttachmentCount : 0,
            unmappedAttachmentCount: typeof section.unmappedAttachmentCount === "number" ? section.unmappedAttachmentCount : 0,
            atlasPageCount: typeof section.atlasPageCount === "number" ? section.atlasPageCount : 0,
            exactLocalSourceCount: sectionBundle?.exactLocalSourceCount ?? 0,
            sampleLocalSourcePath: typeof section.sampleLocalSourcePath === "string" ? section.sampleLocalSourcePath : null,
            sectionBundlePath: sectionBundle?.sectionBundlePath ?? null,
            nextSectionStep: typeof section.nextSectionStep === "string" ? section.nextSectionStep : "Review the reconstruction section."
          };
        })
        .filter((section) =>
          section.sectionKey.length > 0
          && (
            section.mappedAttachmentCount > 0
            || section.attachmentCount > 0
          )
        )
        .slice(0, 6)
    : [];

  return {
    donorId,
    donorName: donor?.donorName ?? donorId,
    scanState: typeof scanSummary.scanState === "string" ? scanSummary.scanState : (donor.scanStatus ?? "unknown"),
    scanSummaryPath,
    blockerSummaryPath: blockerSummaryMarkdown ? blockerSummaryPath : null,
    nextCaptureTargetsPath: nextCaptureTargetsFile ? nextCaptureTargetsPath : null,
    captureRunPath: captureRunSummary ? captureRunPath : null,
    familyActionRunPath: familyActionRunSummary ? familyActionRunPath : null,
    sectionActionRunPath: sectionActionRunSummary ? sectionActionRunPath : null,
    captureTargetFamiliesPath: captureTargetFamiliesFile ? captureTargetFamiliesPath : null,
    captureFamilySourceProfilesPath: captureFamilySourceProfilesFile ? captureFamilySourceProfilesPath : null,
    captureFamilyActionsPath: captureFamilyActionsFile ? captureFamilyActionsPath : null,
    familyReconstructionProfilesPath: familyReconstructionProfilesFile ? familyReconstructionProfilesPath : null,
    familyReconstructionMapsPath: familyReconstructionMapsFile ? familyReconstructionMapsPath : null,
    familyReconstructionSectionsPath: familyReconstructionSectionsFile ? familyReconstructionSectionsPath : null,
    familyReconstructionSectionBundlesPath: familyReconstructionSectionBundlesFile ? familyReconstructionSectionBundlesPath : null,
    runtimeCandidateCount: typeof scanSummary.runtimeCandidateCount === "number" ? scanSummary.runtimeCandidateCount : (donor.runtimeCandidateCount ?? 0),
    atlasManifestCount: typeof scanSummary.atlasManifestCount === "number" ? scanSummary.atlasManifestCount : (donor.atlasManifestCount ?? 0),
    bundleAssetMapStatus: typeof scanSummary.bundleAssetMapStatus === "string" ? scanSummary.bundleAssetMapStatus : (donor.bundleAssetMapStatus ?? "unknown"),
    bundleImageVariantStatus: typeof scanSummary.bundleImageVariantStatus === "string" ? scanSummary.bundleImageVariantStatus : "unknown",
    bundleImageVariantCount: typeof scanSummary.bundleImageVariantCount === "number" ? scanSummary.bundleImageVariantCount : 0,
    bundleImageVariantSuffixCount: typeof scanSummary.bundleImageVariantSuffixCount === "number" ? scanSummary.bundleImageVariantSuffixCount : 0,
    bundleImageVariantUrlBuilderStatus: typeof scanSummary.bundleImageVariantUrlBuilderStatus === "string" ? scanSummary.bundleImageVariantUrlBuilderStatus : (donor.bundleImageVariantUrlBuilderStatus ?? "unknown"),
    bundleImageVariantUrlCount: typeof scanSummary.bundleImageVariantUrlCount === "number" ? scanSummary.bundleImageVariantUrlCount : (donor.bundleImageVariantUrlCount ?? 0),
    translationPayloadStatus: typeof scanSummary.translationPayloadStatus === "string" ? scanSummary.translationPayloadStatus : (donor.translationPayloadStatus ?? "unknown"),
    translationPayloadCount: typeof scanSummary.translationPayloadCount === "number" ? scanSummary.translationPayloadCount : (donor.translationPayloadCount ?? 0),
    mirrorCandidateStatus: typeof scanSummary.mirrorCandidateStatus === "string" ? scanSummary.mirrorCandidateStatus : (donor.mirrorCandidateStatus ?? "unknown"),
    requestBackedStaticHintCount: typeof scanSummary.requestBackedStaticHintCount === "number" ? scanSummary.requestBackedStaticHintCount : 0,
    recentlyBlockedCaptureTargetCount: typeof scanSummary.recentlyBlockedCaptureTargetCount === "number" ? scanSummary.recentlyBlockedCaptureTargetCount : nextCaptureTargets.filter((target) => target.recentCaptureStatus === "blocked").length,
    captureFamilyCount: typeof scanSummary.captureFamilyCount === "number" ? scanSummary.captureFamilyCount : 0,
    topCaptureFamilyNames: Array.isArray(scanSummary.topCaptureFamilyNames)
      ? scanSummary.topCaptureFamilyNames.filter((value): value is string => typeof value === "string")
      : [],
    familySourceProfileCount: typeof scanSummary.familySourceProfileCount === "number" ? scanSummary.familySourceProfileCount : 0,
    topFamilySourceProfileNames: Array.isArray(scanSummary.topFamilySourceProfileNames)
      ? scanSummary.topFamilySourceProfileNames.filter((value): value is string => typeof value === "string")
      : [],
    familyActionCount: typeof scanSummary.familyActionCount === "number" ? scanSummary.familyActionCount : 0,
    topFamilyActionNames: Array.isArray(scanSummary.topFamilyActionNames)
      ? scanSummary.topFamilyActionNames.filter((value): value is string => typeof value === "string")
      : [],
    familyReconstructionProfileCount: typeof scanSummary.familyReconstructionProfileCount === "number" ? scanSummary.familyReconstructionProfileCount : 0,
    topFamilyReconstructionProfileNames: Array.isArray(scanSummary.topFamilyReconstructionProfileNames)
      ? scanSummary.topFamilyReconstructionProfileNames.filter((value): value is string => typeof value === "string")
      : [],
    familyReconstructionMapCount: typeof scanSummary.familyReconstructionMapCount === "number" ? scanSummary.familyReconstructionMapCount : 0,
    topFamilyReconstructionMapNames: Array.isArray(scanSummary.topFamilyReconstructionMapNames)
      ? scanSummary.topFamilyReconstructionMapNames.filter((value): value is string => typeof value === "string")
      : [],
    familyReconstructionSectionCount: typeof scanSummary.familyReconstructionSectionCount === "number" ? scanSummary.familyReconstructionSectionCount : 0,
    topFamilyReconstructionSectionKeys: Array.isArray(scanSummary.topFamilyReconstructionSectionKeys)
      ? scanSummary.topFamilyReconstructionSectionKeys.filter((value): value is string => typeof value === "string")
      : [],
    familyReconstructionSectionBundleCount: typeof scanSummary.familyReconstructionSectionBundleCount === "number" ? scanSummary.familyReconstructionSectionBundleCount : 0,
    topFamilyReconstructionSectionBundleKeys: Array.isArray(scanSummary.topFamilyReconstructionSectionBundleKeys)
      ? scanSummary.topFamilyReconstructionSectionBundleKeys.filter((value): value is string => typeof value === "string")
      : [],
    rawPayloadBlockedCaptureTargetCount: typeof scanSummary.rawPayloadBlockedCaptureTargetCount === "number" ? scanSummary.rawPayloadBlockedCaptureTargetCount : 0,
    rawPayloadBlockedFamilyCount: typeof scanSummary.rawPayloadBlockedFamilyCount === "number" ? scanSummary.rawPayloadBlockedFamilyCount : 0,
    rawPayloadBlockedFamilyNames: Array.isArray(scanSummary.rawPayloadBlockedFamilyNames)
      ? scanSummary.rawPayloadBlockedFamilyNames.filter((value): value is string => typeof value === "string")
      : [],
    nextCaptureTargetCount: typeof scanSummary.nextCaptureTargetCount === "number" ? scanSummary.nextCaptureTargetCount : (donor.nextCaptureTargetCount ?? nextCaptureTargets.length),
    captureRunStatus: typeof captureRunSummary?.status === "string" ? captureRunSummary.status : null,
    captureRunMode: typeof captureRunSummary?.requestedMode === "string" ? captureRunSummary.requestedMode : null,
    captureRunRequestedFamily: typeof captureRunSummary?.requestedFamily === "string" ? captureRunSummary.requestedFamily : null,
    captureAttemptedCount: typeof captureRunSummary?.attemptedCount === "number" ? captureRunSummary.attemptedCount : 0,
    captureDownloadedCount: typeof captureRunSummary?.downloadedCount === "number" ? captureRunSummary.downloadedCount : 0,
    captureFailedCount: typeof captureRunSummary?.failedCount === "number" ? captureRunSummary.failedCount : 0,
    captureGeneratedAt: typeof captureRunSummary?.generatedAt === "string" ? captureRunSummary.generatedAt : null,
    familyActionRunStatus: typeof familyActionRunSummary?.status === "string" ? familyActionRunSummary.status : null,
    familyActionRunMode: typeof familyActionRunSummary?.requestedMode === "string" ? familyActionRunSummary.requestedMode : null,
    familyActionRunFamily: typeof familyActionRunSummary?.familyName === "string" ? familyActionRunSummary.familyName : null,
    familyActionPreparedEvidenceCount: typeof familyActionRunSummary?.preparedEvidenceCount === "number" ? familyActionRunSummary.preparedEvidenceCount : 0,
    familyActionWorksetPath: typeof familyActionRunSummary?.worksetPath === "string" ? familyActionRunSummary.worksetPath : null,
    familyActionReconstructionBundlePath: typeof familyActionRunSummary?.reconstructionBundlePath === "string" ? familyActionRunSummary.reconstructionBundlePath : null,
    familyActionReconstructionLocalSourceCount: typeof familyActionRunSummary?.reconstructionLocalSourceCount === "number" ? familyActionRunSummary.reconstructionLocalSourceCount : 0,
    sectionActionRunStatus: typeof sectionActionRunSummary?.status === "string" ? sectionActionRunSummary.status : null,
    sectionActionRunMode: typeof sectionActionRunSummary?.requestedMode === "string" ? sectionActionRunSummary.requestedMode : null,
    sectionActionRunSectionKey: typeof sectionActionRunSummary?.sectionKey === "string" ? sectionActionRunSummary.sectionKey : null,
    sectionActionWorksetPath: typeof sectionActionRunSummary?.worksetPath === "string" ? sectionActionRunSummary.worksetPath : null,
    sectionActionExactLocalSourceCount: typeof sectionActionRunSummary?.exactLocalSourceCount === "number" ? sectionActionRunSummary.exactLocalSourceCount : 0,
    sectionActionMappedAttachmentCount: typeof sectionActionRunSummary?.mappedAttachmentCount === "number" ? sectionActionRunSummary.mappedAttachmentCount : 0,
    nextOperatorAction: typeof scanSummary.nextOperatorAction === "string" ? scanSummary.nextOperatorAction : (donor.nextOperatorAction ?? null),
    blockerHighlights,
    blockerSummaryMarkdown,
    topCaptureFamilies,
    topFamilySourceProfiles,
    topFamilyActions,
    topFamilyReconstructionProfiles,
    topFamilyReconstructionMaps,
    topFamilyReconstructionSections,
    nextCaptureTargets
  };
}

function extractBacktickValues(raw: string): string[] {
  return [...raw.matchAll(/`([^`]+)`/g)]
    .map((match) => match[1]?.trim() ?? "")
    .filter((value) => value.length > 0);
}

function extractSingleMatch(raw: string, pattern: RegExp): string | null {
  const match = raw.match(pattern);
  const value = match?.[1]?.trim() ?? "";
  return value.length > 0 ? value : null;
}

async function buildRuntimeLaunchStatus(
  selectedProjectId: string,
  runtimeMirror: LocalRuntimeMirrorStatus | null
): Promise<RuntimeLaunchStatus | null> {
  if (selectedProjectId !== "project_001") {
    return null;
  }

  const [sessionReadme, observationNotes, initResponse] = await Promise.all([
    readOptionalTextFile(donorRuntimeReadmePath),
    readOptionalTextFile(donorRuntimeObservationPath),
    readOptionalJsonFile(donorRuntimeInitResponsePath)
  ]);

  if (!sessionReadme && !observationNotes && !initResponse) {
    return {
      projectId: selectedProjectId,
      availability: "blocked",
      launchSurface: "blocked",
      localRuntimePackageAvailable: false,
      blocker: "No grounded donor runtime entry is indexed for this project yet.",
      entryUrl: null,
      resolvedRuntimeHost: null,
      runtimeSourceLabel: "Blocked",
      captureSessionId: null,
      evidenceIds: [],
      sourcePaths: [],
      availableActions: [],
      roundId: null,
      currencyCode: null,
      wrapperVersion: null,
      buildVersion: null,
      gameVersion: null,
      pixiVersion: null,
      spineVersion: null,
      observedAssetGroups: [],
      notes: [
        "The shell has no grounded donor runtime entry to launch for this project yet."
      ]
    };
  }

  const entryUrl = extractSingleMatch(sessionReadme ?? "", /Entry URL used:\s*`([^`]+)`/);
  const resolvedRuntimeHost = extractSingleMatch(sessionReadme ?? "", /Observed resolved runtime host:\s*`([^`]+)`/)
    ?? extractSingleMatch(observationNotes ?? "", /Resolved runtime host:\s*`([^`]+)`/);
  const availableActions = Array.isArray((initResponse?.flow as JsonObject | undefined)?.available_actions)
    ? ((initResponse?.flow as JsonObject).available_actions as JsonValue[])
      .filter((value): value is string => typeof value === "string")
    : [];
  const roundIdValue = (initResponse?.flow as JsonObject | undefined)?.round_id;
  const roundId = typeof roundIdValue === "number" || typeof roundIdValue === "string"
    ? String(roundIdValue)
    : null;
  const currencyCode = typeof (((initResponse?.options as JsonObject | undefined)?.currency as JsonObject | undefined)?.code) === "string"
    ? String((((initResponse?.options as JsonObject).currency as JsonObject).code))
    : null;
  const wrapperVersion = extractSingleMatch(observationNotes ?? "", /wrapper\s+`([^`]+)`/);
  const buildVersion = extractSingleMatch(observationNotes ?? "", /build\s+`([^`]+)`/);
  const gameVersion = extractSingleMatch(observationNotes ?? "", /`Mystery Garden\s+([^`]+)`/);
  const pixiVersion = extractSingleMatch(observationNotes ?? "", /PixiJS\s+`([^`]+)`/);
  const spineVersion = extractSingleMatch(observationNotes ?? "", /Spine package\s+`([^`]+)`/);
  const observedAssetGroups = observationNotes
    ? Array.from(new Set(extractBacktickValues(
      observationNotes
        .split(/\r?\n/)
        .find((line) => line.includes("Visible network asset names")) ?? ""
    ))).slice(0, 20)
    : [];
  const evidenceIds = [
    "MG-EV-20260320-LIVE-A-004",
    "MG-EV-20260320-LIVE-A-005",
    "MG-EV-20260320-LIVE-A-006"
  ];
  const notes = [
    "Runtime Mode launches the recorded public donor runtime URL inside the shell when available.",
    "No local donor HTML/runtime package is present under the project_001 donor local-only roots."
  ];

  const runtimeMirrorSourcePaths = runtimeMirror?.available
    ? [
      runtimeMirror.manifestRepoRelativePath,
      runtimeMirror.mirrorRootRepoRelativePath
    ]
    : [];

  if (!entryUrl) {
    return {
      projectId: selectedProjectId,
      availability: "blocked",
      launchSurface: "blocked",
      localRuntimePackageAvailable: false,
      blocker: "The donor runtime session is documented, but no grounded launch URL is indexed for this project.",
      entryUrl: null,
      resolvedRuntimeHost,
      runtimeSourceLabel: "Blocked",
      captureSessionId: donorRuntimeSessionId,
      evidenceIds,
      sourcePaths: [
        path.relative(workspaceRoot, donorRuntimeReadmePath),
        path.relative(workspaceRoot, donorRuntimeObservationPath),
        ...runtimeMirrorSourcePaths
      ],
      availableActions,
      roundId,
      currencyCode,
      wrapperVersion,
      buildVersion,
      gameVersion,
      pixiVersion,
      spineVersion,
      observedAssetGroups,
      notes
    };
  }

  if (runtimeMirror?.available && runtimeMirror.launchUrl) {
    return {
      projectId: selectedProjectId,
      availability: "local-mirror",
      launchSurface: "integrated-local-runtime",
      localRuntimePackageAvailable: true,
      blocker: "No full local donor runtime package is captured for project_001 yet; Runtime Mode is using a partial local runtime mirror that still refreshes live launch HTML/API state from the recorded donor runtime entry.",
      entryUrl: runtimeMirror.launchUrl,
      resolvedRuntimeHost,
      runtimeSourceLabel: "Local mirror",
      captureSessionId: donorRuntimeSessionId,
      evidenceIds,
      sourcePaths: [
        path.relative(workspaceRoot, donorRuntimeReadmePath),
        path.relative(workspaceRoot, donorRuntimeObservationPath),
        path.relative(workspaceRoot, donorRuntimeInitResponsePath),
        ...runtimeMirrorSourcePaths
      ],
      availableActions,
      roundId,
      currencyCode,
      wrapperVersion,
      buildVersion,
      gameVersion,
      pixiVersion,
      spineVersion,
      observedAssetGroups,
      notes: [
        "Runtime Mode is preferring the local Mystery Garden runtime mirror on this machine.",
        "The local mirror is partial: launch HTML still refreshes from the recorded donor runtime entry to keep live token/API state valid."
      ]
    };
  }

  return {
    projectId: selectedProjectId,
    availability: "public-demo",
    launchSurface: "integrated-remote-runtime",
    localRuntimePackageAvailable: false,
    blocker: "No local donor runtime package is captured for project_001 yet; Runtime Mode uses the recorded public donor demo entry instead.",
    entryUrl,
    resolvedRuntimeHost,
    runtimeSourceLabel: "Public fallback",
    captureSessionId: donorRuntimeSessionId,
    evidenceIds,
    sourcePaths: [
      path.relative(workspaceRoot, donorRuntimeReadmePath),
      path.relative(workspaceRoot, donorRuntimeObservationPath),
      path.relative(workspaceRoot, donorRuntimeInitResponsePath),
      ...runtimeMirrorSourcePaths
    ],
    availableActions,
    roundId,
    currencyCode,
    wrapperVersion,
    buildVersion,
    gameVersion,
    pixiVersion,
    spineVersion,
    observedAssetGroups,
    notes
  };
}

function getObjectArray(value: JsonValue | undefined): JsonObject[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is JsonObject => Boolean(item) && typeof item === "object" && !Array.isArray(item));
}

function assertPreviewAssetsStayInternal(project: JsonObject): void {
  const assets = getObjectArray(project.assets);

  for (const asset of assets) {
    const source = asset.source;
    if (!source || Array.isArray(source) || typeof source !== "object") {
      continue;
    }

    const sourcePath = source.path;
    if (typeof sourcePath === "string" && sourcePath.startsWith("10_donors/")) {
      throw new Error(`Preview asset path must stay internal to project_001: ${sourcePath}`);
    }
  }
}

function resolveSelectedProjectId(workspace: WorkspaceSliceBundle, requestedProjectId?: string): string {
  return requestedProjectId
    ?? workspace.selectedProjectId
    ?? workspace.activeProjectId
    ?? workspace.projects[0]?.projectId
    ?? "project_001";
}

async function loadSelectedEditableProject(workspace: WorkspaceSliceBundle, selectedProjectId: string): Promise<EditableProjectData | null> {
  const selectedProject = workspace.projects.find((entry) => entry.projectId === selectedProjectId);
  if (!selectedProject) {
    return null;
  }

  return loadEditableProjectData(path.join(workspaceRoot, selectedProject.keyPaths.projectRoot));
}

export async function loadProjectSlice(requestedProjectId?: string): Promise<ProjectSliceBundle> {
  const [projectPath, normalSpinPath, freeSpinsTriggerPath, restartRestorePath, mockedGameStatePath, mockedLastActionPath] = getProjectSlicePaths();
  const [workspace, project, importArtifact, normalSpin, freeSpinsTrigger, restartRestore, mockedGameState, mockedLastAction] = await Promise.all([
    loadWorkspaceSlice(),
    readJsonFile(projectPath),
    readOptionalJsonFile(importArtifactPath),
    readJsonFile(normalSpinPath),
    readJsonFile(freeSpinsTriggerPath),
    readJsonFile(restartRestorePath),
    readJsonFile(mockedGameStatePath),
    readJsonFile(mockedLastActionPath)
  ]);

  assertPreviewAssetsStayInternal(project);

  const selectedProjectId = resolveSelectedProjectId(workspace, requestedProjectId);
  const selectedProject = workspace.projects.find((entry) => entry.projectId === selectedProjectId) ?? null;
  const evidenceCatalog = await loadDonorEvidenceCatalog(importArtifact);
  const donorAssetCatalog = await loadDonorAssetCatalog(selectedProject, selectedProjectId);
  const donorScan = await loadDonorScanStatus(selectedProject);
  const runtimeMirror = selectedProjectId === "project_001"
    ? await buildLocalRuntimeMirrorStatus(selectedProjectId)
    : null;
  const runtimeLaunch = await buildRuntimeLaunchStatus(selectedProjectId, runtimeMirror);
  const runtimeResourceMap = selectedProjectId === "project_001"
    ? buildRuntimeResourceMapStatus(selectedProjectId)
    : null;
  const runtimeOverrides = selectedProjectId === "project_001"
    ? await buildRuntimeAssetOverrideStatus(selectedProjectId)
    : null;
  const editableProject = await loadSelectedEditableProject(workspace, selectedProjectId);
  const vabs = selectedProject
    ? await buildProjectVabsStatus({
      workspaceRoot,
      projectId: selectedProjectId,
      projectRoot: path.join(workspaceRoot, selectedProject.keyPaths.projectRoot)
    })
    : null;
  const previewScene = editableProject ? buildPreviewSceneFromEditableProject(editableProject) : null;
  const replayProject = editableProject
    ? buildReplayProjectFromEditableProject(project as Parameters<typeof buildReplayProjectFromEditableProject>[0], editableProject)
    : project;

  return {
    workspace,
    selectedProjectId,
    project: replayProject as unknown as JsonObject,
    importArtifact,
    evidenceCatalog,
    donorAssetCatalog,
    previewScene,
    editableProject,
    vabs,
    fixtures: {
      normalSpin,
      freeSpinsTrigger,
      restartRestore
    },
    runtime: {
      mockedGameState,
      mockedLastAction
    },
    runtimeLaunch,
    runtimeMirror,
    runtimeResourceMap,
    runtimeOverrides,
    donorScan
  };
}
