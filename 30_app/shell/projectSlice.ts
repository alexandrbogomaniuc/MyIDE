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
  blocker: string | null;
  assets: DonorAssetItem[];
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
}

const workspaceRoot = path.resolve(__dirname, "../../..");
const replayProjectRoot = path.join(workspaceRoot, "40_projects", "project_001");
const importArtifactPath = path.join(replayProjectRoot, "imports", "mystery-garden-import.json");
const donorEvidenceRoot = path.join(workspaceRoot, "10_donors", "donor_001_mystery_garden", "evidence");
const evidenceHashesPath = path.join(donorEvidenceRoot, "HASHES.csv");

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

  return {
    projectId: index.projectId,
    donorId: index.donorId,
    donorName: index.donorName,
    sourceMode: index.sourceMode,
    sourceInventoryPath: index.sourceInventoryPath,
    indexPath: index.indexPath,
    localIndexExists,
    assetCount: assets.length,
    blocker: assets.length > 0
      ? null
      : "No usable local donor image assets are available for this project on this machine.",
    assets
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
    }
  };
}
