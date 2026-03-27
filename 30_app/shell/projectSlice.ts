import { promises as fs } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { loadWorkspaceSlice, type WorkspaceSliceBundle } from "./workspaceSlice";
import {
  buildProjectDonorAssetIndex,
  readProjectDonorAssetIndex,
  type DonorAssetIndex,
  type IndexedDonorAsset
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
  blocker: string | null;
  assets: DonorAssetItem[];
}

export interface RuntimeLaunchStatus {
  projectId: string;
  availability: "public-demo" | "blocked";
  launchSurface: "integrated-remote-runtime" | "blocked";
  localRuntimePackageAvailable: boolean;
  blocker: string | null;
  entryUrl: string | null;
  resolvedRuntimeHost: string | null;
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
  runtimeOverrides: RuntimeAssetOverrideStatus | null;
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

async function loadDonorAssetCatalog(selectedProjectId: string): Promise<DonorAssetCatalog | null> {
  if (selectedProjectId !== "project_001") {
    return null;
  }

  let index = await readProjectDonorAssetIndex(selectedProjectId);
  const localIndexExists = Boolean(index);

  if (!index) {
    try {
      index = await buildProjectDonorAssetIndex(selectedProjectId);
    } catch {
      index = null;
    }
  }

  if (!index) {
    return {
      projectId: selectedProjectId,
      donorId: "donor_001_mystery_garden",
      donorName: "Mystery Garden",
      sourceMode: "local-donor-images",
      sourceInventoryPath: "10_donors/donor_001_mystery_garden/evidence/HASHES.csv",
      indexPath: "40_projects/project_001/donor-assets/local-index.json",
      localIndexExists: false,
      assetCount: 0,
      availableFileTypes: [],
      countsByFileType: {},
      countsBySourceCategory: {},
      blocker: "No local donor asset index is available yet. Run npm run donor-assets:index:project_001 on this machine first.",
      assets: []
    };
  }

  const assets = index.assets.map((asset) => {
    const absolutePath = path.join(workspaceRoot, asset.repoRelativePath);
    return {
      ...asset,
      absolutePath,
      previewUrl: asset.localExists ? pathToFileURL(absolutePath).href : null,
      previewLabel: asset.localExists
        ? "drag to import"
        : "local file missing"
    };
  });
  const countsByFileType = assets.reduce<Record<string, number>>((counts, asset) => {
    counts[asset.fileType] = (counts[asset.fileType] ?? 0) + 1;
    return counts;
  }, {});
  const countsBySourceCategory = assets.reduce<Record<string, number>>((counts, asset) => {
    counts[asset.sourceCategory] = (counts[asset.sourceCategory] ?? 0) + 1;
    return counts;
  }, {});
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
    projectId: index.projectId,
    donorId: index.donorId,
    donorName: index.donorName,
    sourceMode: index.sourceMode,
    sourceInventoryPath: index.sourceInventoryPath,
    indexPath: index.indexPath,
    localIndexExists,
    assetCount: assets.length,
    availableFileTypes,
    countsByFileType,
    countsBySourceCategory,
    blocker: assets.length > 0
      ? null
      : "No usable local donor image assets are available for this project on this machine.",
    assets
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

async function buildRuntimeLaunchStatus(selectedProjectId: string): Promise<RuntimeLaunchStatus | null> {
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

  if (!entryUrl) {
    return {
      projectId: selectedProjectId,
      availability: "blocked",
      launchSurface: "blocked",
      localRuntimePackageAvailable: false,
      blocker: "The donor runtime session is documented, but no grounded launch URL is indexed for this project.",
      entryUrl: null,
      resolvedRuntimeHost,
      captureSessionId: donorRuntimeSessionId,
      evidenceIds,
      sourcePaths: [
        path.relative(workspaceRoot, donorRuntimeReadmePath),
        path.relative(workspaceRoot, donorRuntimeObservationPath)
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

  return {
    projectId: selectedProjectId,
    availability: "public-demo",
    launchSurface: "integrated-remote-runtime",
    localRuntimePackageAvailable: false,
    blocker: "No local donor runtime package is captured for project_001 yet; Runtime Mode uses the recorded public donor demo entry instead.",
    entryUrl,
    resolvedRuntimeHost,
    captureSessionId: donorRuntimeSessionId,
    evidenceIds,
    sourcePaths: [
      path.relative(workspaceRoot, donorRuntimeReadmePath),
      path.relative(workspaceRoot, donorRuntimeObservationPath),
      path.relative(workspaceRoot, donorRuntimeInitResponsePath)
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
  const donorAssetCatalog = await loadDonorAssetCatalog(selectedProjectId);
  const runtimeLaunch = await buildRuntimeLaunchStatus(selectedProjectId);
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
    runtimeOverrides
  };
}
