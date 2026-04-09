import { promises as fs } from "node:fs";
import path from "node:path";

export type JsonValue = null | boolean | number | string | JsonObject | JsonValue[];
export type JsonObject = { [key: string]: JsonValue };

export interface DerivedProjectRegistry {
  schemaVersion: string;
  workspaceId: string;
  displayName: string;
  description: string;
  implementationScope: string;
  discoveryMode: "folder-scan";
  sourceOfTruth: "project-folders";
  activeProjectId: string;
  projectCount: number;
  projects: JsonObject[];
  notes: string[];
}

const ignoredProjectFolders = new Set(["templates"]);
const lifecycleStageIds = [
  "investigation",
  "modificationComposeRuntime",
  "mathConfig",
  "gsExport"
] as const;
const allowedGameFamilies = new Set(["slot", "card", "dice", "crash", "other"]);
const allowedImplementationScopes = new Set(["slot-first", "universal-architecture", "reference-only"]);
const allowedProjectStatuses = new Set(["planned", "in-progress", "validated", "blocked", "archived"]);
const allowedVerificationStatuses = new Set(["unknown", "in-progress", "verified-replay-slice", "verified-workspace", "blocked"]);
const allowedDonorStatuses = new Set(["proven", "planned", "blocked", "reference-only"]);
const allowedTargetStatuses = new Set(["proven", "validated", "planned", "in-progress", "blocked", "reference-only"]);
const allowedTargetRelationships = new Set(["donor-source", "reconstruction-target", "resulting-game", "future-target", "reference-only"]);
const allowedLifecycleStatuses = new Set(["planned", "in-progress", "blocked", "ready-for-review", "verified", "deferred"]);

export const workspaceRoot = path.resolve(__dirname, "../../..");
export const projectsRoot = path.join(workspaceRoot, "40_projects");
export const registryPath = path.join(projectsRoot, "registry.json");

export function isJsonObject(value: unknown): value is JsonObject {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export async function readJsonObject(filePath: string): Promise<JsonObject> {
  const raw = await fs.readFile(filePath, "utf8");
  const parsed: unknown = JSON.parse(raw);
  if (!isJsonObject(parsed)) {
    throw new Error(`${filePath} must contain a JSON object.`);
  }

  return parsed;
}

function getString(value: JsonValue | undefined, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string" && entry.length > 0);
}

function hasLifecycleStage(value: unknown): boolean {
  if (!isJsonObject(value)) {
    return false;
  }

  return allowedLifecycleStatuses.has(getString(value.status))
    && (value.notes === undefined || isNonEmptyString(value.notes));
}

function isDiscoverableProjectMeta(meta: JsonObject): boolean {
  const verification = isJsonObject(meta.verification) ? meta.verification : null;
  const lifecycle = isJsonObject(meta.lifecycle) ? meta.lifecycle : null;
  const lifecycleStages = lifecycle && isJsonObject(lifecycle.stages) ? lifecycle.stages : null;
  const paths = isJsonObject(meta.paths) ? meta.paths : null;
  const donor = isJsonObject(meta.donor) ? meta.donor : null;
  const targetGame = isJsonObject(meta.targetGame) ? meta.targetGame : null;
  const timestamps = isJsonObject(meta.timestamps) ? meta.timestamps : null;
  const notes = isJsonObject(meta.notes) ? meta.notes : null;

  return meta.schemaVersion === "0.1.0"
    && isNonEmptyString(meta.projectId)
    && isNonEmptyString(meta.slug)
    && isNonEmptyString(meta.displayName)
    && allowedGameFamilies.has(getString(meta.gameFamily))
    && allowedImplementationScopes.has(getString(meta.implementationScope))
    && isNonEmptyString(meta.phase)
    && allowedProjectStatuses.has(getString(meta.status))
    && Boolean(verification)
    && allowedVerificationStatuses.has(getString(verification?.status))
    && isStringArray(verification?.checks)
    && Boolean(lifecycle)
    && lifecycleStageIds.includes(getString(lifecycle?.currentStage) as typeof lifecycleStageIds[number])
    && Boolean(lifecycleStages)
    && lifecycleStageIds.every((stageId) => hasLifecycleStage(lifecycleStages?.[stageId]))
    && Boolean(paths)
    && isNonEmptyString(paths?.projectRoot)
    && isNonEmptyString(paths?.metaPath)
    && isNonEmptyString(paths?.registryPath)
    && isNonEmptyString(paths?.donorRoot)
    && isNonEmptyString(paths?.reportsRoot)
    && isNonEmptyString(paths?.importsRoot)
    && isNonEmptyString(paths?.internalRoot)
    && isNonEmptyString(paths?.runtimeRoot)
    && isNonEmptyString(paths?.fixturesRoot)
    && isNonEmptyString(paths?.targetRoot)
    && isNonEmptyString(paths?.releaseRoot)
    && isNonEmptyString(paths?.logsRoot)
    && Boolean(donor)
    && isNonEmptyString(donor?.donorId)
    && isNonEmptyString(donor?.donorName)
    && isNonEmptyString(donor?.evidenceRoot)
    && isStringArray(donor?.captureSessions ?? [])
    && isStringArray(donor?.evidenceRefs ?? [])
    && allowedDonorStatuses.has(getString(donor?.status))
    && Boolean(targetGame)
    && isNonEmptyString(targetGame?.targetGameId)
    && isNonEmptyString(targetGame?.displayName)
    && allowedGameFamilies.has(getString(targetGame?.gameFamily))
    && allowedTargetRelationships.has(getString(targetGame?.relationship))
    && allowedTargetStatuses.has(getString(targetGame?.status))
    && isStringArray(targetGame?.provenNotes ?? [])
    && isStringArray(targetGame?.plannedNotes ?? [])
    && Boolean(timestamps)
    && isNonEmptyString(timestamps?.createdAt)
    && isNonEmptyString(timestamps?.updatedAt)
    && Boolean(notes)
    && isStringArray(notes?.provenFacts ?? [])
    && isStringArray(notes?.plannedWork ?? [])
    && (notes?.assumptions === undefined || isStringArray(notes.assumptions))
    && (notes?.unresolvedQuestions === undefined || isStringArray(notes.unresolvedQuestions));
}

function compareProjects(left: JsonObject, right: JsonObject): number {
  const leftId = getString(left.projectId, getString(left.slug, "zzz"));
  const rightId = getString(right.projectId, getString(right.slug, "zzz"));
  return leftId.localeCompare(rightId);
}

function chooseActiveProjectId(projects: readonly JsonObject[]): string {
  const preferred = projects.find((project) => getString(project.projectId) === "project_001");
  if (preferred) {
    return getString(preferred.projectId);
  }

  const validated = projects.find((project) => getString(project.status) === "validated");
  if (validated) {
    return getString(validated.projectId);
  }

  return getString(projects[0]?.projectId, "project_001");
}

function cloneJsonObject(value: JsonObject): JsonObject {
  return JSON.parse(JSON.stringify(value)) as JsonObject;
}

export async function discoverProjectMetas(): Promise<JsonObject[]> {
  const dirents = await fs.readdir(projectsRoot, { withFileTypes: true });
  const projects: JsonObject[] = [];

  for (const dirent of dirents) {
    if (!dirent.isDirectory() || ignoredProjectFolders.has(dirent.name)) {
      continue;
    }

    const metaPath = path.join(projectsRoot, dirent.name, "project.meta.json");
    try {
      await fs.access(metaPath);
    } catch {
      continue;
    }

    try {
      const meta = await readJsonObject(metaPath);
      if (isDiscoverableProjectMeta(meta)) {
        projects.push(meta);
      }
    } catch {
      continue;
    }
  }

  return projects.sort(compareProjects);
}

export function buildDerivedRegistry(projects: readonly JsonObject[]): DerivedProjectRegistry {
  if (projects.length === 0) {
    throw new Error("At least one discoverable project folder is required to build the registry.");
  }

  return {
    schemaVersion: "0.1.0",
    workspaceId: "workspace.myide",
    displayName: "MyIDE Workspace",
    description: "Derived workspace registry generated from discoverable project folders.",
    implementationScope: "universal-local-first",
    discoveryMode: "folder-scan",
    sourceOfTruth: "project-folders",
    activeProjectId: chooseActiveProjectId(projects),
    projectCount: projects.length,
    projects: projects.map((project) => cloneJsonObject(project)),
    notes: [
      "Valid project folders under 40_projects/ are the authoritative source of project existence.",
      "registry.json is a deterministic cache generated from discovered project folders."
    ]
  };
}

export async function writeDerivedRegistry(registry: DerivedProjectRegistry): Promise<void> {
  await fs.writeFile(registryPath, `${JSON.stringify(registry, null, 2)}\n`, "utf8");
}

export async function discoverAndWriteRegistry(): Promise<DerivedProjectRegistry> {
  const projects = await discoverProjectMetas();
  const registry = buildDerivedRegistry(projects);
  await writeDerivedRegistry(registry);
  return registry;
}

function isSafeProjectId(projectId: string): boolean {
  return /^[a-zA-Z0-9_-]+$/.test(projectId);
}

export async function deleteProjectFolder(projectId: string): Promise<DerivedProjectRegistry> {
  if (!projectId || !isSafeProjectId(projectId) || ignoredProjectFolders.has(projectId)) {
    throw new Error("Project id is invalid or protected.");
  }

  const projects = await discoverProjectMetas();
  const matching = projects.find((entry) => getString(entry.projectId) === projectId);
  if (!matching) {
    throw new Error(`Project ${projectId} was not found in the workspace registry.`);
  }

  if (projects.length <= 1) {
    throw new Error("Cannot delete the last remaining project.");
  }

  const projectRoot = path.join(projectsRoot, projectId);
  if (!projectRoot.startsWith(projectsRoot)) {
    throw new Error("Project path is outside the workspace root.");
  }

  await fs.rm(projectRoot, { recursive: true, force: true });
  return discoverAndWriteRegistry();
}
