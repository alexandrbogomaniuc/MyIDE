import { strict as assert } from "node:assert";
import { existsSync, promises as fs } from "node:fs";
import path from "node:path";
import Ajv2020 from "ajv/dist/2020";
import type { ErrorObject, ValidateFunction } from "ajv";
import { loadEditableProjectData } from "../../30_app/workspace/editableProject";
import { loadWorkspaceSlice } from "../../30_app/shell/workspaceSlice";
import { buildDerivedRegistry, discoverProjectMetas, isJsonObject, readJsonObject } from "../../30_app/workspace/discoverProjects";

type JsonValue = null | boolean | number | string | JsonObject | JsonValue[];
type JsonObject = { [key: string]: JsonValue };

function resolveWorkspaceRoot(): string {
  const candidates = [process.cwd(), __dirname, path.resolve(__dirname, ".."), path.resolve(__dirname, "../..")];

  for (const start of candidates) {
    let current = start;
    while (true) {
      if (existsSync(path.join(current, "package.json")) && existsSync(path.join(current, "40_projects"))) {
        return current;
      }

      const parent = path.dirname(current);
      if (parent === current) {
        break;
      }

      current = parent;
    }
  }

  throw new Error(`Unable to locate the MyIDE workspace root from ${__dirname}`);
}

const workspaceRoot = resolveWorkspaceRoot();
const schemaDir = path.join(workspaceRoot, "20_model", "schemas");
const projectsRoot = path.join(workspaceRoot, "40_projects");
const workspaceRegistryPath = path.join(projectsRoot, "registry.json");
const project001JsonPath = path.join(projectsRoot, "project_001", "project.json");
const project002MetaPath = path.join(projectsRoot, "project_002", "project.meta.json");
const project001InternalScenePath = path.join(projectsRoot, "project_001", "internal", "scene.json");
const project001InternalLayersPath = path.join(projectsRoot, "project_001", "internal", "layers.json");
const project001InternalObjectsPath = path.join(projectsRoot, "project_001", "internal", "objects.json");

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

function assertLayerCollectionShape(value: JsonObject, label: string): void {
  const layers = Array.isArray(value.layers) ? value.layers : [];
  assert(layers.length > 0, `${label}.layers must contain at least one layer`);

  for (const [index, layer] of layers.entries()) {
    const layerObject = getObject(layer as JsonValue, `${label}.layers[${index}]`);
    assert(typeof layerObject.id === "string" && layerObject.id.length > 0, `${label}.layers[${index}].id must be a non-empty string`);
    assert(typeof layerObject.displayName === "string" && layerObject.displayName.length > 0, `${label}.layers[${index}].displayName must be a non-empty string`);
    assert(typeof layerObject.visible === "boolean", `${label}.layers[${index}].visible must be an explicit boolean`);
    assert(typeof layerObject.locked === "boolean", `${label}.layers[${index}].locked must be an explicit boolean`);
    assert(typeof layerObject.order === "number", `${label}.layers[${index}].order must be a number`);
  }
}

function assertObjectCollectionShape(value: JsonObject, label: string, knownLayerIds: readonly string[]): void {
  const objects = Array.isArray(value.objects) ? value.objects : [];
  assert(objects.length > 0, `${label}.objects must contain at least one object`);

  for (const [index, object] of objects.entries()) {
    const objectRecord = getObject(object as JsonValue, `${label}.objects[${index}]`);
    assert(typeof objectRecord.id === "string" && objectRecord.id.length > 0, `${label}.objects[${index}].id must be a non-empty string`);
    assert(typeof objectRecord.displayName === "string" && objectRecord.displayName.length > 0, `${label}.objects[${index}].displayName must be a non-empty string`);
    assert(typeof objectRecord.type === "string" && objectRecord.type.length > 0, `${label}.objects[${index}].type must be a non-empty string`);
    assert(typeof objectRecord.layerId === "string" && objectRecord.layerId.length > 0, `${label}.objects[${index}].layerId must be a non-empty string`);
    assert(knownLayerIds.includes(objectRecord.layerId), `${label}.objects[${index}].layerId must reference a known layer`);
    assert(typeof objectRecord.x === "number", `${label}.objects[${index}].x must be a number`);
    assert(typeof objectRecord.y === "number", `${label}.objects[${index}].y must be a number`);
    assert(typeof objectRecord.scaleX === "number", `${label}.objects[${index}].scaleX must be a number`);
    assert(typeof objectRecord.scaleY === "number", `${label}.objects[${index}].scaleY must be a number`);
    assert(typeof objectRecord.visible === "boolean", `${label}.objects[${index}].visible must be an explicit boolean`);
    assert(typeof objectRecord.locked === "boolean", `${label}.objects[${index}].locked must be an explicit boolean`);
    if (objectRecord.width !== undefined) {
      assert(typeof objectRecord.width === "number" && objectRecord.width >= 8, `${label}.objects[${index}].width must be a bounded positive number when present`);
    }
    if (objectRecord.height !== undefined) {
      assert(typeof objectRecord.height === "number" && objectRecord.height >= 8, `${label}.objects[${index}].height must be a bounded positive number when present`);
    }
  }
}

async function main(): Promise<void> {
  const ajv = await createAjv();
  const validateProjectSchema = requireSchema(ajv, "https://myide.local/schemas/project.schema.json");
  const validateProjectMetaSchema = requireSchema(ajv, "https://myide.local/schemas/project-metadata.schema.json");
  const validateRegistrySchema = requireSchema(ajv, "https://myide.local/schemas/project-registry.schema.json");
  const validateWorkspaceSchema = requireSchema(ajv, "https://myide.local/schemas/workspace.schema.json");
  const validateSceneSchema = requireSchema(ajv, "https://myide.local/schemas/scene.schema.json");

  const registry = await readJsonObject(workspaceRegistryPath);
  const discoveredProjects = await discoverProjectMetas();
  const derivedRegistry = JSON.parse(JSON.stringify(buildDerivedRegistry(discoveredProjects))) as JsonObject;
  const workspaceBundle = JSON.parse(JSON.stringify(await loadWorkspaceSlice())) as JsonObject;
  const editableProject = await loadEditableProjectData(path.join(projectsRoot, "project_001"));
  const project001Json = await readJsonObject(project001JsonPath);
  const project002Meta = await readJsonObject(project002MetaPath);
  const project001InternalScene = await readJsonObject(project001InternalScenePath);
  const project001InternalLayers = await readJsonObject(project001InternalLayersPath);
  const project001InternalObjects = await readJsonObject(project001InternalObjectsPath);

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

  const project001InternalSceneIsValid = validateSceneSchema(project001InternalScene);
  assert(project001InternalSceneIsValid, `project_001/internal/scene.json failed schema validation: ${formatErrors(validateSceneSchema.errors)}`);

  assertLayerCollectionShape(project001InternalLayers, "project_001/internal/layers.json");
  assertObjectCollectionShape(project001InternalObjects, "project_001/internal/objects.json", Array.isArray(project001InternalLayers.layers)
    ? project001InternalLayers.layers.map((entry, index) => getString(getObject(entry as JsonValue, `project_001/internal/layers.json.layers[${index}]`).id, `project_001/internal/layers.json.layers[${index}].id`))
    : []);

  assert(editableProject, "project_001 editable project data must be loadable.");
  assert.deepStrictEqual(
    JSON.parse(JSON.stringify(editableProject.layers)),
    JSON.parse(JSON.stringify(Array.isArray(project001InternalLayers.layers) ? project001InternalLayers.layers : [])),
    "loadEditableProjectData must preserve explicit layer visibility and lock state"
  );
  assert.deepStrictEqual(
    JSON.parse(JSON.stringify(editableProject.objects)),
    JSON.parse(JSON.stringify(Array.isArray(project001InternalObjects.objects) ? project001InternalObjects.objects : [])),
    "loadEditableProjectData must preserve internal object placement data"
  );
  const layerBackground = editableProject.layers.find((entry) => entry.id === "layer.background");
  assert(layerBackground, "project_001 editable project data must include the background layer.");
  assert.equal(layerBackground.visible, true, "project_001 background layer must remain visible in the validated slice.");
  assert.equal(layerBackground.locked, true, "project_001 background layer must remain locked in the validated slice.");

  const layerUi = editableProject.layers.find((entry) => entry.id === "layer.ui");
  assert(layerUi, "project_001 editable project data must include the UI layer.");
  assert.equal(layerUi.visible, true, "project_001 UI layer must remain visible in the validated slice.");
  assert.equal(layerUi.locked, false, "project_001 UI layer must remain unlocked in the validated slice.");

  const titleObject = editableProject.objects.find((entry) => entry.id === "node.title");
  assert(titleObject, "project_001 editable project data must include the title object.");
  assert.equal(titleObject.visible, true, "project_001 title object must remain visible in the validated slice.");
  assert.equal(titleObject.locked, false, "project_001 title object must remain unlocked in the validated slice.");

  const bottomHudObject = editableProject.objects.find((entry) => entry.id === "node.bottom-bar");
  assert(bottomHudObject, "project_001 editable project data must include the bottom HUD object.");
  assert.equal(bottomHudObject.width, 1152, "project_001 bottom HUD width must remain explicit in the validated slice.");
  assert.equal(bottomHudObject.height, 76, "project_001 bottom HUD height must remain explicit in the validated slice.");

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

  const sceneLayerIds = Array.isArray(project001InternalScene.layerIds) ? project001InternalScene.layerIds : [];
  const sceneObjectIds = Array.isArray(project001InternalScene.objectIds) ? project001InternalScene.objectIds : [];
  const layerEntries = Array.isArray(project001InternalLayers.layers) ? project001InternalLayers.layers : [];
  const objectEntries = Array.isArray(project001InternalObjects.objects) ? project001InternalObjects.objects : [];
  const layerIds = layerEntries.map((entry, index) => getString(getObject(entry as JsonValue, `project_001/internal/layers.json.layers[${index}]`).id, `project_001/internal/layers.json.layers[${index}].id`));
  const objectIds = objectEntries.map((entry, index) => getString(getObject(entry as JsonValue, `project_001/internal/objects.json.objects[${index}]`).id, `project_001/internal/objects.json.objects[${index}].id`));

  assert.deepStrictEqual(sceneLayerIds, layerIds, "project_001/internal/scene.json layerIds must match layers.json order");
  assert.deepStrictEqual(sceneObjectIds, objectIds, "project_001/internal/scene.json objectIds must match objects.json order");
  for (const [index, object] of objectEntries.entries()) {
    const objectEntry = getObject(object as JsonValue, `project_001/internal/objects.json.objects[${index}]`);
    const layerId = getString(objectEntry.layerId, `project_001/internal/objects.json.objects[${index}].layerId`);
    assert(layerIds.includes(layerId), `project_001/internal/objects.json.objects[${index}] must reference a known layerId`);
  }

  console.log("PASS validate:workspace");
  console.log(`Discovered project folders: ${discoveredProjectIds.join(", ")}`);
  console.log(`Validated workspace registry: ${path.relative(workspaceRoot, workspaceRegistryPath)}`);
  console.log(`Validated project metadata: 40_projects/project_001/project.meta.json, 40_projects/project_002/project.meta.json`);
  console.log("Validated folder-based discovery, derived registry consistency, project metadata, workspace shell bundle, and project_001 internal editor scene files.");
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`FAIL validate:workspace - ${message}`);
  process.exitCode = 1;
});
