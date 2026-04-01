import { strict as assert } from "node:assert";
import { promises as fs } from "node:fs";
import path from "node:path";
import Ajv2020 from "ajv/dist/2020";
import type { ValidateFunction } from "ajv";
import { createProjectFromInput } from "../../30_app/workspace/createProject";
import { buildDerivedRegistry, discoverProjectMetas, readJsonObject, registryPath } from "../../30_app/workspace/discoverProjects";
import { loadWorkspaceSlice } from "../../30_app/shell/workspaceSlice";
import { loadProjectSlice } from "../../30_app/shell/projectSlice";

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
  const donorReference = `donor_smoke_onboarding_${smokeSlug.replace(/-/g, "_")}`;
  let smokeDonorRoot: string | null = null;
  let fixtureServer: import("node:http").Server | null = null;
  let fixturePort: number | null = null;

  await fs.mkdir(projectsRoot, { recursive: true });

  try {
    const http = await import("node:http");
    const fixtureHtml = [
      "<!doctype html>",
      "<html>",
      "<head><link rel=\"stylesheet\" href=\"/styles/app.css\"></head>",
      "<body>",
      "<img src=\"/img/logo.png\" alt=\"logo\" />",
      "<script src=\"/bundle.js\"></script>",
      "</body>",
      "</html>"
    ].join("\n");
    const serverResult = await new Promise<{ server: import("node:http").Server; port: number }>((resolve, reject) => {
      const server = http.createServer((request, response) => {
        if (request.url === "/launch") {
          response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
          response.end(fixtureHtml);
          return;
        }
        if (request.url === "/styles/app.css") {
          response.writeHead(200, { "content-type": "text/css; charset=utf-8" });
          response.end("body { color: #fff; }");
          return;
        }
        if (request.url === "/bundle.js") {
          response.writeHead(200, { "content-type": "application/javascript; charset=utf-8" });
          response.end("console.log('smoke create project bundle');");
          return;
        }
        if (request.url === "/img/logo.png") {
          response.writeHead(200, { "content-type": "image/png" });
          response.end(Buffer.from("89504e470d0a1a0a", "hex"));
          return;
        }
        response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
        response.end("not found");
      });
      server.once("error", reject);
      server.listen(0, "127.0.0.1", () => {
        const address = server.address();
        if (!address || typeof address === "string") {
          reject(new Error("Failed to start create-project smoke donor fixture server."));
          return;
        }
        resolve({ server, port: address.port });
      });
    });
    fixtureServer = serverResult.server;
    fixturePort = serverResult.port;

    const created = await createProjectFromInput({
      displayName: "Smoke Onboarding Project",
      slug: smokeSlug,
      gameFamily: "slot",
      donorReference,
      donorLaunchUrl: `http://127.0.0.1:${fixturePort}/launch`,
      targetDisplayName: "Smoke Onboarding Resulting Game",
      notes: "Temporary smoke project used to prove create -> discover -> registry -> shell visibility."
    });

    const meta = await readJsonObject(smokeProjectMetaPath);
    const donor = isJsonObject(meta.donor) ? meta.donor : {};
    smokeDonorRoot = typeof donor.donorId === "string"
      ? path.join(workspaceRoot, "10_donors", donor.donorId)
      : null;
    assert.equal(donor.harvestStatus, "harvested", "smoke donor harvest should complete");
    assert.equal(typeof donor.harvestManifestPath, "string", "smoke donor harvest manifest path should be recorded");
    assert.equal(typeof donor.harvestedAssetCount, "number", "smoke donor harvest count should be recorded");
    assert.ok((donor.harvestedAssetCount as number) >= 3, "smoke donor harvest should download the fixture assets");
    assert.equal(donor.packageStatus, "packaged", "smoke donor package manifest should complete");
    assert.equal(typeof donor.packageManifestPath, "string", "smoke donor package manifest path should be recorded");
    assert.equal(typeof donor.packageGraphPath, "string", "smoke donor package graph path should be recorded");
    assert.equal(typeof donor.packageFamilyCount, "number", "smoke donor package family count should be recorded");
    assert.ok((donor.packageReferencedUrlCount as number) >= 4, "smoke donor package should summarize referenced URLs");
    assert.ok((donor.packageGraphNodeCount as number) >= 4, "smoke donor package should summarize graph nodes");
    assert.ok(typeof donor.packageGraphEdgeCount === "number", "smoke donor package should record graph edge counts even when the fixture stays first-level only");
    assert.ok(typeof donor.packageUnresolvedCount === "number", "smoke donor package should record unresolved counts even when the fixture stays fully downloadable");
    assert.equal(donor.scanStatus, "scanned", "smoke donor scan should complete");
    assert.equal(typeof donor.scanSummaryPath, "string", "smoke donor scan summary path should be recorded");
    assert.equal(typeof donor.blockerSummaryPath, "string", "smoke donor blocker summary path should be recorded");
    assert.equal(typeof donor.runtimeCandidateCount, "number", "smoke donor scan should record runtime candidate counts");
    assert.equal(typeof donor.atlasManifestCount, "number", "smoke donor scan should record atlas manifest counts");
    assert.equal(typeof donor.bundleAssetMapStatus, "string", "smoke donor scan should record bundle map status");
    assert.equal(typeof donor.mirrorCandidateStatus, "string", "smoke donor scan should record mirror candidate status");
    assert.equal(typeof donor.nextOperatorAction, "string", "smoke donor scan should record the next operator action");
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

    const createdProjectSlice = await loadProjectSlice(created.projectId);
    assert.equal(createdProjectSlice.selectedProjectId, created.projectId, "project slice should load the created project");
    assert.equal(createdProjectSlice.donorScan?.scanState, "scanned", "project slice should expose donor scan state");
    assert.ok((createdProjectSlice.donorScan?.runtimeCandidateCount ?? 0) >= 1, "project slice should expose donor scan runtime candidate counts");
    assert(
      (createdProjectSlice.donorAssetCatalog?.assetCount ?? 0) >= 1,
      "created project slice should expose harvested donor/runtime image assets as editable donor asset cards"
    );
    assert(
      Array.isArray(createdProjectSlice.donorAssetCatalog?.assets)
        && createdProjectSlice.donorAssetCatalog.assets.some((asset) => asset.sourceCategory === "harvested runtime/package image"),
      "created project slice should include harvested runtime/package image sources in the donor asset catalog"
    );
    assert(
      Array.isArray(createdProjectSlice.donorAssetCatalog?.assetGroups)
        && createdProjectSlice.donorAssetCatalog.assetGroups.some((group) => group.kind === "package-family" && group.count >= 1),
      "created project slice should group harvested donor/runtime image assets into package-family bundles"
    );
    assert(
      Array.isArray(createdProjectSlice.donorAssetCatalog?.assets)
        && createdProjectSlice.donorAssetCatalog.assets.some((asset) => asset.assetGroupKind === "package-family" && typeof asset.assetGroupKey === "string" && asset.assetGroupKey.length > 0),
      "created project slice should tag harvested donor/runtime image assets with package-family metadata"
    );
    assert(
      Array.isArray(createdProjectSlice.donorAssetCatalog?.assetGroups)
        && createdProjectSlice.donorAssetCatalog.assetGroups.some((group) => group.kind === "package-family" && typeof group.suggestedLayerId === "string" && typeof group.layoutStyle === "string"),
      "created project slice should infer scene-kit placement hints for harvested package-family bundles"
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
    if (smokeDonorRoot) {
      await fs.rm(smokeDonorRoot, { recursive: true, force: true });
    }
    if (fixtureServer) {
      await new Promise<void>((resolve, reject) => {
        fixtureServer?.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
    }
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`FAIL smoke:create-project - ${message}`);
  process.exitCode = 1;
});
