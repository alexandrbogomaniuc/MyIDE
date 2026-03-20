import { strict as assert } from "node:assert";
import { promises as fs } from "node:fs";
import path from "node:path";
import Ajv2020 from "ajv/dist/2020";
import type { ErrorObject, ValidateFunction } from "ajv";
import { loadWorkspaceSlice } from "../../30_app/shell/workspaceSlice";

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };
type JsonObject = { [key: string]: JsonValue };

const workspaceRoot = path.resolve(__dirname, "../../..");
const schemaDir = path.join(workspaceRoot, "20_model", "schemas");
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

async function createAjv(): Promise<Ajv2020> {
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  const schemaFiles = (await fs.readdir(schemaDir)).filter((file) => file.endsWith(".json")).sort();

  for (const schemaFile of schemaFiles) {
    const schema = await readJsonObject(path.join(schemaDir, schemaFile));
    ajv.addSchema(schema);
  }

  return ajv;
}

function requireSchema(ajv: Ajv2020, schemaId: string): ValidateFunction {
  const validate = ajv.getSchema(schemaId);
  assert(validate, `Missing schema: ${schemaId}`);
  return validate;
}

function formatErrors(errors: ErrorObject[] | null | undefined): string {
  if (!errors || errors.length === 0) {
    return "Unknown AJV validation failure.";
  }

  return errors.map((error) => `${error.instancePath || "/"} ${error.message ?? "is invalid"}`).join("; ");
}

function getObject(value: JsonValue | undefined, label: string): JsonObject {
  assert(isJsonObject(value), `${label} must be a JSON object`);
  return value;
}

function getString(value: JsonValue | undefined, label: string): string {
  assert(typeof value === "string" && value.length > 0, `${label} must be a non-empty string`);
  return value;
}

async function main(): Promise<void> {
  const ajv = await createAjv();
  const validateRegistry = requireSchema(ajv, "https://myide.local/schemas/project-registry.schema.json");
  const validateProjectMeta = requireSchema(ajv, "https://myide.local/schemas/project-metadata.schema.json");
  const validateWorkspace = requireSchema(ajv, "https://myide.local/schemas/workspace.schema.json");

  const registry = await readJsonObject(workspaceRegistryPath);
  const projectMeta = await readJsonObject(projectMetaPath);
  const workspaceBundle = JSON.parse(JSON.stringify(await loadWorkspaceSlice())) as JsonObject;

  const registryIsValid = validateRegistry(registry);
  assert(registryIsValid, `registry.json failed schema validation: ${formatErrors(validateRegistry.errors)}`);

  const projectMetaIsValid = validateProjectMeta(projectMeta);
  assert(projectMetaIsValid, `project.meta.json failed schema validation: ${formatErrors(validateProjectMeta.errors)}`);

  const workspaceIsValid = validateWorkspace(workspaceBundle);
  assert(workspaceIsValid, `workspace slice failed schema validation: ${formatErrors(validateWorkspace.errors)}`);

  const registryProjects = registry.projects;
  assert(Array.isArray(registryProjects) && registryProjects.length > 0, "registry.projects must contain at least one project");
  const registryProject001 = registryProjects.find((entry): entry is JsonObject => isJsonObject(entry) && entry.projectId === "project_001");
  assert(registryProject001, "registry must include project_001");

  const metaPaths = getObject(projectMeta.paths, "project.meta.paths");
  assert(getString(metaPaths.metaPath, "project.meta.paths.metaPath") === "40_projects/project_001/project.meta.json", "project.meta.paths.metaPath must point to project_001 metadata");
  assert(getString(metaPaths.projectRoot, "project.meta.paths.projectRoot") === "40_projects/project_001", "project.meta.paths.projectRoot must point to project_001");

  assert(getString(registry.activeProjectId, "registry.activeProjectId") === "project_001", "registry.activeProjectId must stay on project_001");
  assert(getString(workspaceBundle.selectedProjectId, "workspace.selectedProjectId") === "project_001", "workspace.selectedProjectId must stay on project_001");

  const workspaceProjects = workspaceBundle.projects;
  assert(Array.isArray(workspaceProjects) && workspaceProjects.length > 0, "workspace bundle must expose at least one project");
  const workspaceProject001 = workspaceProjects.find((entry): entry is JsonObject => isJsonObject(entry) && entry.projectId === "project_001");
  assert(workspaceProject001, "workspace bundle must include project_001");

  assert(getString(registryProject001.slug, "registry.project_001.slug") === getString(projectMeta.slug, "project.meta.slug"), "registry and project.meta slugs must match");
  assert(getString(registryProject001.displayName, "registry.project_001.displayName") === getString(projectMeta.displayName, "project.meta.displayName"), "registry and project.meta display names must match");
  assert(getString(workspaceProject001.slug, "workspace.project_001.slug") === getString(projectMeta.slug, "project.meta.slug"), "workspace bundle and project.meta slugs must match");
  assert(getString(workspaceProject001.displayName, "workspace.project_001.displayName") === getString(projectMeta.displayName, "project.meta.displayName"), "workspace bundle and project.meta display names must match");

  console.log("PASS validate:workspace");
  console.log(`Validated workspace registry: ${path.relative(workspaceRoot, workspaceRegistryPath)}`);
  console.log(`Validated project metadata: ${path.relative(workspaceRoot, projectMetaPath)}`);
  console.log("Validated runtime workspace slice against workspace.schema.json.");
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`FAIL validate:workspace - ${message}`);
  process.exitCode = 1;
});
