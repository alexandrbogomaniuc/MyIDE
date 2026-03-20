import { strict as assert } from "node:assert";
import { promises as fs } from "node:fs";
import path from "node:path";

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };
type JsonObject = { [key: string]: JsonValue };

const workspaceRoot = path.resolve(__dirname, "../../..");
const projectsRoot = path.join(workspaceRoot, "40_projects");
const workspaceRegistryPath = path.join(projectsRoot, "registry.json");
const projectMetaPath = path.join(projectsRoot, "project_001", "project.meta.json");

function isJsonObject(value: unknown): value is JsonObject {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

async function readJsonObject(filePath: string): Promise<JsonObject> {
  const raw = await fs.readFile(filePath, "utf8");
  const parsed: unknown = JSON.parse(raw);
  assert(isJsonObject(parsed), `${filePath} must contain a JSON object`);
  return parsed;
}

function getString(value: JsonValue | undefined, label: string): string {
  assert(typeof value === "string" && value.length > 0, `${label} must be a non-empty string`);
  return value;
}

function getAliasedString(entry: JsonObject, keys: readonly string[], label: string): string {
  for (const key of keys) {
    const candidate = entry[key];
    if (typeof candidate === "string" && candidate.length > 0) {
      return candidate;
    }
  }

  throw new Error(`${label} must include one of: ${keys.join(", ")}`);
}

function assertVerificationObject(value: JsonValue | undefined, label: string): void {
  assert(isJsonObject(value), `${label} must be a JSON object`);
  getAliasedString(value, ["status", "verificationStatus"], `${label}.status`);
  const checks = value.checks;
  assert(Array.isArray(checks) && checks.length > 0, `${label}.checks must contain at least one item`);
  checks.forEach((check, index) => getString(check, `${label}.checks[${index}]`));
  getOptionalString(value.lastVerifiedAt ?? value.updatedAt ?? value.updatedAtUtc, `${label}.lastVerifiedAt`);
  getOptionalString(value.notes, `${label}.notes`);
}

function getOptionalString(value: JsonValue | undefined, label: string): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  assert(typeof value === "string" && value.length > 0, `${label} must be a non-empty string when present`);
  return value;
}

function getOptionalStringArray(value: JsonValue | undefined, label: string): readonly string[] {
  if (value === undefined || value === null) {
    return [];
  }

  assert(Array.isArray(value), `${label} must be an array when present`);
  return value.map((entry, index) => getString(entry, `${label}[${index}]`));
}

function getObject(value: JsonValue | undefined, label: string): JsonObject {
  assert(isJsonObject(value), `${label} must be a JSON object`);
  return value;
}

function getProjectId(entry: JsonObject, label: string): string {
  return getString(entry.projectId, `${label}.projectId`);
}

function assertProjectLinkShape(entry: JsonObject, label: string): void {
  const donorLink = entry.donorLink ?? entry.donor;
  const targetGame = entry.targetGame ?? entry.resultingGame;
  const status = entry.status ?? entry.phase ?? entry.currentPhase;
  const verification = entry.verification ?? entry.verificationStatus;
  const paths = entry.paths;

  assert(isJsonObject(donorLink), `${label} must include donorLink or donor object`);
  assert(isJsonObject(targetGame), `${label} must include targetGame or resultingGame object`);
  assert(typeof status === "string" && status.length > 0, `${label} must include status or phase`);
  assertVerificationObject(verification, `${label}.verification`);
  assert(isJsonObject(paths), `${label} must include paths object`);

  getString((donorLink as JsonObject).donorId ?? (donorLink as JsonObject).sourceDonorId, `${label}.donorLink.donorId`);
  getString((targetGame as JsonObject).gameFamily ?? (targetGame as JsonObject).family, `${label}.targetGame.gameFamily`);
  getAliasedString(targetGame as JsonObject, ["displayName", "name", "title"], `${label}.targetGame.displayName`);
  getAliasedString(targetGame as JsonObject, ["relationship"], `${label}.targetGame.relationship`);
  getString((paths as JsonObject).projectRoot ?? (paths as JsonObject).workspaceRoot, `${label}.paths.projectRoot`);
}

function validateWorkspaceRegistry(registry: JsonObject): void {
  getAliasedString(registry, ["workspaceId", "registryId"], "registry.workspaceId");
  assert(typeof registry.schemaVersion === "string" && registry.schemaVersion.length > 0, "registry.schemaVersion is required");
  getAliasedString(registry, ["displayName", "name", "title"], "registry.displayName");
  assert(typeof registry.implementationScope === "string" && registry.implementationScope.length > 0, "registry.implementationScope is required");
  assert(typeof registry.activeProjectId === "string" && registry.activeProjectId.length > 0, "registry.activeProjectId is required");
  assert(Array.isArray(registry.projects) && registry.projects.length > 0, "registry.projects must contain at least one project");
  getOptionalStringArray(registry.notes, "registry.notes");

  const projectIds = new Set<string>();
  let sawProject001 = false;

  registry.projects.forEach((entry, index) => {
    assert(isJsonObject(entry), `registry.projects[${index}] must be an object`);
    const projectId = getProjectId(entry, `registry.projects[${index}]`);
    assert(!projectIds.has(projectId), `registry.projects contains duplicate projectId ${projectId}`);
    projectIds.add(projectId);
    assert(typeof entry.schemaVersion === "string" && entry.schemaVersion.length > 0, `registry.projects[${index}].schemaVersion is required`);
    assert(typeof entry.slug === "string" && entry.slug.length > 0, `registry.projects[${index}].slug is required`);
    getAliasedString(entry, ["displayName", "name", "title"], `registry.projects[${index}].displayName`);
    assert(typeof entry.gameFamily === "string" && entry.gameFamily.length > 0, `registry.projects[${index}].gameFamily is required`);
    assert(typeof entry.implementationScope === "string" && entry.implementationScope.length > 0, `registry.projects[${index}].implementationScope is required`);
    assert(typeof entry.phase === "string" && entry.phase.length > 0, `registry.projects[${index}].phase is required`);
    assert(typeof entry.status === "string" && entry.status.length > 0, `registry.projects[${index}].status is required`);
    assertProjectLinkShape(entry, `registry.projects[${index}]`);
    const entryNotes = getObject(entry.notes, `registry.projects[${index}].notes`);
    getOptionalStringArray(entryNotes.provenFacts ?? entryNotes.proven ?? entryNotes.facts, `registry.projects[${index}].notes.provenFacts`);
    getOptionalStringArray(entryNotes.plannedWork ?? entryNotes.planned ?? entryNotes.todo, `registry.projects[${index}].notes.plannedWork`);
    getOptionalStringArray(entryNotes.assumptions, `registry.projects[${index}].notes.assumptions`);
    getOptionalStringArray(entryNotes.unresolvedQuestions ?? entryNotes.unresolved, `registry.projects[${index}].notes.unresolvedQuestions`);

    const metaPath = entry.paths && isJsonObject(entry.paths) ? entry.paths.metaPath ?? entry.paths.projectMetaPath : undefined;
    if (projectId === "project_001") {
      sawProject001 = true;
      assert(typeof metaPath === "string" && metaPath === "40_projects/project_001/project.meta.json", "project_001 registry entry must point at 40_projects/project_001/project.meta.json");
      assert(getString(registry.activeProjectId, "registry.activeProjectId") === "project_001", "project_001 should be the active project");
    }
  });

  assert(sawProject001, "registry must include project_001");
}

function validateProjectMeta(projectMeta: JsonObject): void {
  assert(typeof projectMeta.projectId === "string" && projectMeta.projectId.length > 0, "project.meta.projectId is required");
  assert(typeof projectMeta.slug === "string" && projectMeta.slug.length > 0, "project.meta.slug is required");
  getAliasedString(projectMeta, ["displayName", "name", "title"], "project.meta.displayName");
  assert(typeof projectMeta.gameFamily === "string" && projectMeta.gameFamily.length > 0, "project.meta.gameFamily is required");
  getAliasedString(projectMeta, ["implementationScope"], "project.meta.implementationScope");
  getAliasedString(projectMeta, ["currentPhase", "phase", "status"], "project.meta.currentPhase");
  assertVerificationObject(projectMeta.verification, "project.meta.verification");

  const donorLink = getObject(projectMeta.donorLink ?? projectMeta.donor, "project.meta donorLink/donor");
  const targetGame = getObject(projectMeta.targetGame ?? projectMeta.resultingGame, "project.meta targetGame/resultingGame");
  const paths = getObject(projectMeta.paths, "project.meta.paths");
  const timestamps = getObject(projectMeta.timestamps, "project.meta.timestamps");
  const notes = getObject(projectMeta.notes, "project.meta.notes");

  getString(donorLink.donorId ?? donorLink.sourceDonorId, "project.meta donorLink.donorId");
  getString(targetGame.gameFamily ?? targetGame.family, "project.meta targetGame.gameFamily");
  getAliasedString(targetGame, ["displayName", "name", "title"], "project.meta targetGame.displayName");
  getAliasedString(targetGame, ["relationship"], "project.meta targetGame.relationship");
  getString(paths.projectRoot, "project.meta.paths.projectRoot");
  getString(paths.projectJsonPath ?? paths.projectJson ?? paths.projectMetaPath, "project.meta.paths.projectJsonPath/projectJson/projectMetaPath");

  const createdAt = getOptionalString(projectMeta.createdAt ?? projectMeta.createdAtUtc ?? timestamps.createdAt, "project.meta.createdAt");
  const updatedAt = getOptionalString(projectMeta.updatedAt ?? projectMeta.updatedAtUtc ?? timestamps.updatedAt, "project.meta.updatedAt");
  const provenFacts = getOptionalStringArray(notes.provenFacts ?? notes.proven ?? notes.facts, "project.meta.notes.provenFacts");
  const plannedWork = getOptionalStringArray(notes.plannedWork ?? notes.planned ?? notes.todo, "project.meta.notes.plannedWork");
  const assumptions = getOptionalStringArray(notes.assumptions, "project.meta.notes.assumptions");
  const unresolved = getOptionalStringArray(notes.unresolvedQuestions ?? notes.unresolved, "project.meta.notes.unresolvedQuestions");

  assert(createdAt !== undefined || updatedAt !== undefined, "project.meta should include createdAt or updatedAt");
  assert(provenFacts.length > 0, "project.meta notes must include proven facts");
  assert(plannedWork.length > 0, "project.meta notes must include planned work");
  assert(assumptions.length > 0, "project.meta notes must include assumptions");
  assert(unresolved.length > 0, "project.meta notes must include unresolved questions");
}

async function main(): Promise<void> {
  const registry = await readJsonObject(workspaceRegistryPath);
  const projectMeta = await readJsonObject(projectMetaPath);

  validateWorkspaceRegistry(registry);
  validateProjectMeta(projectMeta);

  const registryProject = Array.isArray(registry.projects)
    ? registry.projects.find((entry): entry is JsonObject => isJsonObject(entry) && entry.projectId === "project_001")
    : undefined;
  assert(registryProject, "registry must expose a project_001 entry");
  getAliasedString(registryProject, ["displayName", "name", "title"], "registry.project_001.displayName");
  assert(getString(registryProject.slug, "registry.project_001.slug") === getString(projectMeta.slug, "project.meta.slug"), "registry and project.meta slugs must match");
  assert(
    getAliasedString(registryProject, ["displayName", "name", "title"], "registry.project_001.displayName") === getAliasedString(projectMeta, ["displayName", "name", "title"], "project.meta.displayName"),
    "registry and project.meta display names must match"
  );

  console.log("PASS validate:workspace");
  console.log(`Validated workspace registry: ${path.relative(workspaceRoot, workspaceRegistryPath)}`);
  console.log(`Validated project metadata: ${path.relative(workspaceRoot, projectMetaPath)}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`FAIL validate:workspace - ${message}`);
  process.exitCode = 1;
});
