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

    const meta = await readJsonObject(metaPath);
    projects.push(meta);
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
    projects: projects.map((project) => JSON.parse(JSON.stringify(project)) as JsonObject),
    notes: [
      "Project folders under 40_projects/ are the authoritative source of project existence.",
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
