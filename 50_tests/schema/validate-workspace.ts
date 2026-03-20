import { strict as assert } from "node:assert";
import { promises as fs } from "node:fs";
import path from "node:path";
import Ajv2020 from "ajv/dist/2020";
import type { ErrorObject, ValidateFunction } from "ajv";
import { loadWorkspaceSlice } from "../../30_app/shell/workspaceSlice";
import { buildDerivedRegistry, discoverProjectMetas, isJsonObject, readJsonObject } from "../../30_app/workspace/discoverProjects";

type JsonValue = null | boolean | number | string | JsonObject | JsonValue[];
type JsonObject = { [key: string]: JsonValue };

const workspaceRoot = path.resolve(__dirname, "../../..");
const schemaDir = path.join(workspaceRoot, "20_model", "schemas");
const projectsRoot = path.join(workspaceRoot, "40_projects");
const workspaceRegistryPath = path.join(projectsRoot, "registry.json");
const project001JsonPath = path.join(projectsRoot, "project_001", "project.json");
const project002MetaPath = path.join(projectsRoot, "project_002", "project.meta.json");

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

function getProjectIds(projects: JsonValue | undefined, label: string): string[] {
  assert(Array.isArray(projects) && projects.length > 0, `${label} must contain at least one project`);
  return projects.map((project, index) => getString(getObject(project as JsonValue, `${label}[${index}]`).projectId, `${label}[${index}].projectId`));
}

function assertLifecycle(meta: JsonObject, label: string): void {
  const lifecycle = getObject(meta.lifecycle, `${label}.lifecycle`);
  const stages = getObject(lifecycle.stages, `${label}.lifecycle.stages`);
  const currentStage = getString(lifecycle.currentStage, `${label}.lifecycle.currentStage`);

  assert(
    ["donorEvidence", "donorReport", "importMapping", "internalReplay", "targetConcept", "targetBuild", "integration", "qa", "releasePrep"].includes(currentStage),
    `${label}.lifecycle.currentStage must be a known stage`
  );

  for (const stageId of ["donorEvidence", "donorReport", "importMapping", "internalReplay", "targetConcept", "targetBuild", "integration", "qa", "releasePrep"]) {
    const stage = getObject(stages[stageId], `${label}.lifecycle.stages.${stageId}`);
    const status = getString(stage.status, `${label}.lifecycle.stages.${stageId}.status`);
    assert(
      ["planned", "in-progress", "blocked", "ready-for-review", "verified", "deferred"].includes(status),
      `${label}.lifecycle.stages.${stageId}.status must use the controlled vocabulary`
    );
  }
}

function assertProjectPaths(meta: JsonObject, expectedProjectRoot: string, expectedMetaPath: string): void {
  const paths = getObject(meta.paths, `${expectedMetaPath}.paths`);

  assert(getString(paths.projectRoot, `${expectedMetaPath}.paths.projectRoot`) === expectedProjectRoot, `${expectedMetaPath} projectRoot must match its folder`);
  assert(getString(paths.metaPath, `${expectedMetaPath}.paths.metaPath`) === expectedMetaPath, `${expectedMetaPath} metaPath must match its file path`);
  assert(getString(paths.registryPath, `${expectedMetaPath}.paths.registryPath`) === "40_projects/registry.json", `${expectedMetaPath} registryPath must point to the derived registry`);
}

async function main(): Promise<void> {
  const ajv = await createAjv();
  const validateProjectSchema = requireSchema(ajv, "https://myide.local/schemas/project.schema.json");
  const validateProjectMetaSchema = requireSchema(ajv, "https://myide.local/schemas/project-metadata.schema.json");
  const validateRegistrySchema = requireSchema(ajv, "https://myide.local/schemas/project-registry.schema.json");
  const validateWorkspaceSchema = requireSchema(ajv, "https://myide.local/schemas/workspace.schema.json");

  const registry = await readJsonObject(workspaceRegistryPath);
  const discoveredProjects = await discoverProjectMetas();
  const derivedRegistry = JSON.parse(JSON.stringify(buildDerivedRegistry(discoveredProjects))) as JsonObject;
  const workspaceBundle = JSON.parse(JSON.stringify(await loadWorkspaceSlice())) as JsonObject;
  const project001Json = await readJsonObject(project001JsonPath);
  const project002Meta = await readJsonObject(project002MetaPath);

  const registryIsValid = validateRegistrySchema(registry);
  assert(registryIsValid, `registry.json failed schema validation: ${formatErrors(validateRegistrySchema.errors)}`);

  const derivedRegistryIsValid = validateRegistrySchema(derivedRegistry);
  assert(derivedRegistryIsValid, `derived folder registry failed schema validation: ${formatErrors(validateRegistrySchema.errors)}`);

  for (const project of discoveredProjects) {
    const metaIsValid = validateProjectMetaSchema(project);
    const metaPath = getString(getObject(project.paths, "project.paths").metaPath, "project.paths.metaPath");
    assert(metaIsValid, `${metaPath} failed schema validation: ${formatErrors(validateProjectMetaSchema.errors)}`);
    assertProjectPaths(project, metaPath.replace(/\/project\.meta\.json$/, ""), metaPath);
    assertLifecycle(project, metaPath);
  }

  const project001JsonIsValid = validateProjectSchema(project001Json);
  assert(project001JsonIsValid, `project_001/project.json failed schema validation: ${formatErrors(validateProjectSchema.errors)}`);

  const workspaceIsValid = validateWorkspaceSchema(workspaceBundle);
  assert(workspaceIsValid, `workspace slice failed schema validation: ${formatErrors(validateWorkspaceSchema.errors)}`);

  assert.deepStrictEqual(registry, derivedRegistry, "registry.json must exactly match the deterministic folder-derived registry");

  const discoveredProjectIds = discoveredProjects.map((project) => getString(project.projectId, "project.projectId"));
  assert(discoveredProjectIds.includes("project_001"), "folder discovery must include project_001");
  assert(discoveredProjectIds.includes("project_002"), "folder discovery must include project_002");

  const registryProjectIds = getProjectIds(registry.projects, "registry.projects");
  const workspaceProjectIds = getProjectIds(workspaceBundle.projects, "workspace.projects");
  assert.deepStrictEqual(registryProjectIds, discoveredProjectIds, "registry project IDs must match discovered project IDs");
  assert.deepStrictEqual(workspaceProjectIds, discoveredProjectIds, "workspace project IDs must match discovered project IDs");

  assert(getString(registry.activeProjectId, "registry.activeProjectId") === "project_001", "registry.activeProjectId must remain project_001");
  assert(getString(workspaceBundle.selectedProjectId, "workspace.selectedProjectId") === "project_001", "workspace.selectedProjectId must remain project_001");

  const project001Meta = discoveredProjects.find((project) => getString(project.projectId, "project.projectId") === "project_001");
  assert(project001Meta, "folder discovery must include project_001 metadata");
  assert(getString(getObject(project001Meta.lifecycle, "project_001.lifecycle").currentStage, "project_001.lifecycle.currentStage") === "internalReplay", "project_001 must remain the internal replay slice");

  assertProjectPaths(project002Meta, "40_projects/project_002", "40_projects/project_002/project.meta.json");
  assertLifecycle(project002Meta, "40_projects/project_002/project.meta.json");
  assert(getString(getObject(project002Meta.lifecycle, "project_002.lifecycle").currentStage, "project_002.lifecycle.currentStage") === "donorEvidence", "project_002 must remain a donor-evidence-stage scaffold");

  console.log("PASS validate:workspace");
  console.log(`Discovered project folders: ${discoveredProjectIds.join(", ")}`);
  console.log(`Validated workspace registry: ${path.relative(workspaceRoot, workspaceRegistryPath)}`);
  console.log(`Validated project metadata: 40_projects/project_001/project.meta.json, 40_projects/project_002/project.meta.json`);
  console.log("Validated folder-based discovery, derived registry consistency, project metadata, and workspace shell bundle.");
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`FAIL validate:workspace - ${message}`);
  process.exitCode = 1;
});
