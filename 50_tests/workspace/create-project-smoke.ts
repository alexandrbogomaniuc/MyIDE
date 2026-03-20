import { strict as assert } from "node:assert";
import { promises as fs } from "node:fs";
import path from "node:path";
import Ajv2020 from "ajv/dist/2020";
import type { ValidateFunction } from "ajv";
import { createProjectFromInput } from "../../30_app/workspace/createProject";
import { buildDerivedRegistry, discoverProjectMetas, readJsonObject, registryPath } from "../../30_app/workspace/discoverProjects";
import { loadWorkspaceSlice } from "../../30_app/shell/workspaceSlice";

type JsonValue = null | boolean | number | string | JsonObject | JsonValue[];
type JsonObject = { [key: string]: JsonValue };

const workspaceRoot = path.resolve(__dirname, "../../..");
const schemaDir = path.join(workspaceRoot, "20_model", "schemas");
const projectsRoot = path.join(workspaceRoot, "40_projects");

function isJsonObject(value: unknown): value is JsonObject {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
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

function formatErrors(errors: ValidateFunction["errors"]): string {
  if (!errors || errors.length === 0) {
    return "Unknown validation failure.";
  }

  return errors.map((error) => `${error.instancePath || "/"} ${error.message ?? "is invalid"}`).join("; ");
}

async function main(): Promise<void> {
  const ajv = await createAjv();
  const validateProjectMeta = requireSchema(ajv, "https://myide.local/schemas/project-metadata.schema.json");
  const validateRegistry = requireSchema(ajv, "https://myide.local/schemas/project-registry.schema.json");
  const validateWorkspace = requireSchema(ajv, "https://myide.local/schemas/workspace.schema.json");

  const originalRegistryRaw = await fs.readFile(registryPath, "utf8");
  const smokeSlug = `smoke-onboarding-${Date.now().toString(36)}`;
  const smokeProjectRoot = path.join(projectsRoot, smokeSlug);
  const smokeProjectMetaPath = path.join(smokeProjectRoot, "project.meta.json");
  const expectedProjectId = `project_${smokeSlug.replace(/-/g, "_")}`;

  await fs.mkdir(projectsRoot, { recursive: true });

  try {
    const created = await createProjectFromInput({
      displayName: "Smoke Onboarding Project",
      slug: smokeSlug,
      gameFamily: "slot",
      donorReference: "donor_smoke_onboarding",
      targetDisplayName: "Smoke Onboarding Resulting Game",
      notes: "Temporary smoke project used to prove create -> discover -> registry -> shell visibility."
    });

    const meta = await readJsonObject(smokeProjectMetaPath);
    const projectMetaValid = validateProjectMeta(meta);
    assert(projectMetaValid, `smoke project meta failed schema validation: ${formatErrors(validateProjectMeta.errors)}`);

    const discoveredProjects = await discoverProjectMetas();
    const smokeProject = discoveredProjects.find((project) => project.projectId === expectedProjectId);
    assert(smokeProject, "smoke project must be discoverable after scaffold creation");

    const derivedRegistry = buildDerivedRegistry(discoveredProjects);
    const registryValid = validateRegistry(derivedRegistry);
    assert(registryValid, `derived registry failed schema validation: ${formatErrors(validateRegistry.errors)}`);

    const writtenRegistry = await readJsonObject(registryPath);
    assert.deepStrictEqual(writtenRegistry, JSON.parse(JSON.stringify(derivedRegistry)), "create-project flow must refresh the derived registry");

    const workspace = await loadWorkspaceSlice();
    const workspaceValid = validateWorkspace(JSON.parse(JSON.stringify(workspace)));
    assert(workspaceValid, `workspace bundle failed schema validation: ${formatErrors(validateWorkspace.errors)}`);

    assert(
      workspace.projects.some((project) => project.projectId === created.projectId),
      "workspace bundle must include the smoke project after rescan"
    );

    assert(
      discoveredProjects.some((project) => project.projectId === "project_001"),
      "project_001 must remain discoverable during the smoke test"
    );

    console.log("PASS smoke:create-project");
    console.log(`Created temporary project: ${path.relative(workspaceRoot, smokeProjectRoot)}`);
    console.log(`Discovered projects: ${discoveredProjects.map((project) => project.projectId).join(", ")}`);
    console.log(`Derived registry: ${path.relative(workspaceRoot, registryPath)}`);
  } finally {
    await fs.writeFile(registryPath, originalRegistryRaw, "utf8");
    await fs.rm(smokeProjectRoot, { recursive: true, force: true });
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`FAIL smoke:create-project - ${message}`);
  process.exitCode = 1;
});
