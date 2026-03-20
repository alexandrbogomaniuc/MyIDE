import { strict as assert } from "node:assert";
import { promises as fs } from "node:fs";
import path from "node:path";
import Ajv2020 from "ajv/dist/2020";
import type { ErrorObject, ValidateFunction } from "ajv";
import { buildMysteryGardenImport, getMysteryGardenImportUnknowns, listMysteryGardenEvidenceRefs } from "../../30_app/importer/mystery-garden/map-evidence-to-project";
import { readMysteryGardenImporterManifest } from "../../30_app/importer/mystery-garden/cli";

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };
type JsonObject = { [key: string]: JsonValue };

const workspaceRoot = path.resolve(__dirname, "../../..");
const schemaDir = path.join(workspaceRoot, "20_model", "schemas");
const projectRoot = path.join(workspaceRoot, "40_projects", "project_001");

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

function validateFixtureShape(name: string, fixture: JsonObject): void {
  assert(typeof fixture.fixtureId === "string" && fixture.fixtureId.length > 0, `${name}: fixtureId is required`);
  assert(typeof fixture.entryStateId === "string", `${name}: entryStateId is required`);
  assert(typeof fixture.resultStateId === "string", `${name}: resultStateId is required`);
  assert(Array.isArray(fixture.evidenceRefs) && fixture.evidenceRefs.length > 0, `${name}: evidenceRefs are required`);

  if (name !== "restart_restore") {
    assert(Array.isArray(fixture.grid) && fixture.grid.length === 5, `${name}: grid must contain 5 columns`);
    fixture.grid.forEach((column, columnIndex) => {
      assert(Array.isArray(column) && column.length === 3, `${name}: grid column ${columnIndex + 1} must contain 3 rows`);
      column.forEach((cell, rowIndex) => {
        assert(typeof cell === "string" && cell.length > 0, `${name}: grid cell ${columnIndex + 1}:${rowIndex + 1} must be a non-empty string`);
      });
    });
  }

  assert(Array.isArray(fixture.validationNotes) && fixture.validationNotes.length > 0, `${name}: validationNotes are required`);

  if (name === "normal_spin") {
    const win = fixture.win;
    assert(isJsonObject(win), "normal_spin: win object is required");
    assert(typeof win.amount === "number", "normal_spin: win.amount must be numeric");
    assert(typeof win.bannerText === "string", "normal_spin: win.bannerText is required");
  }

  if (name === "free_spins_trigger") {
    const award = fixture.award;
    const followUp = fixture.followUp;
    assert(isJsonObject(award), "free_spins_trigger: award object is required");
    assert(isJsonObject(followUp), "free_spins_trigger: followUp object is required");
    assert(typeof award.freeSpins === "number", "free_spins_trigger: award.freeSpins must be numeric");
    assert(Array.isArray(followUp.grid) && followUp.grid.length === 5, "free_spins_trigger: followUp.grid must contain 5 columns");
    assert(Array.isArray(followUp.stickyFrames) && followUp.stickyFrames.length > 0, "free_spins_trigger: followUp.stickyFrames are required");
  }

  if (name === "restart_restore") {
    const expectedUi = fixture.expectedUi;
    assert(isJsonObject(expectedUi), "restart_restore: expectedUi object is required");
    assert(typeof fixture.gameStateFile === "string", "restart_restore: gameStateFile is required");
    assert(typeof fixture.lastActionFile === "string", "restart_restore: lastActionFile is required");
    assert((fixture.gameStateFile as string).startsWith("40_projects/project_001/runtime/"), "restart_restore: gameStateFile must stay inside project_001/runtime");
    assert((fixture.lastActionFile as string).startsWith("40_projects/project_001/runtime/"), "restart_restore: lastActionFile must stay inside project_001/runtime");
    assert(typeof expectedUi.counterText === "string", "restart_restore: expectedUi.counterText is required");
  }
}

function validateRuntimeMocks(gameState: JsonObject, lastAction: JsonObject): void {
  assert(gameState.stateId === "state.free-spins-active", "mock-game-state must point to state.free-spins-active");
  assert(isJsonObject(gameState.freeSpins), "mock-game-state.freeSpins must be an object");
  assert(Array.isArray(gameState.reelWindow) && gameState.reelWindow.length === 5, "mock-game-state.reelWindow must contain 5 columns");
  assert(lastAction.type === "restart.restore", "mock-last-action.type must be restart.restore");
  assert(lastAction.restoredStateId === "state.free-spins-active", "mock-last-action.restoredStateId must be state.free-spins-active");
}

async function main(): Promise<void> {
  const ajv = await createAjv();
  const validateProject = requireSchema(ajv, "https://myide.local/schemas/project.schema.json");
  const importerManifest = await readMysteryGardenImporterManifest();

  const project = await readJsonObject(path.join(projectRoot, "project.json"));
  const normalSpin = await readJsonObject(path.join(projectRoot, "fixtures", "normal_spin.json"));
  const freeSpinsTrigger = await readJsonObject(path.join(projectRoot, "fixtures", "free_spins_trigger.json"));
  const restartRestore = await readJsonObject(path.join(projectRoot, "fixtures", "restart_restore.json"));
  const mockGameState = await readJsonObject(path.join(projectRoot, "runtime", "mock-game-state.json"));
  const mockLastAction = await readJsonObject(path.join(projectRoot, "runtime", "mock-last-action.json"));
  const importArtifact = await readJsonObject(path.join(workspaceRoot, importerManifest.outputPath));

  const projectIsValid = validateProject(project);
  assert(projectIsValid, `project.json failed schema validation: ${formatErrors(validateProject.errors)}`);

  validateFixtureShape("normal_spin", normalSpin);
  validateFixtureShape("free_spins_trigger", freeSpinsTrigger);
  validateFixtureShape("restart_restore", restartRestore);
  validateRuntimeMocks(mockGameState, mockLastAction);

  const importerRefs = listMysteryGardenEvidenceRefs();
  const importerUnknowns = getMysteryGardenImportUnknowns();
  const importerModel = JSON.parse(JSON.stringify(buildMysteryGardenImport())) as JsonObject;
  const importerProject = importerModel.project;
  assert(isJsonObject(importerProject), "Importer output must contain a project object");

  assert(importerManifest.sourceBoundary.noRawRuntimeReads === true, "Importer manifest must forbid raw runtime reads");
  assert(importerManifest.sourceBoundary.readOnlyEvidenceOnly === true, "Importer manifest must stay evidence-only");
  assert(importerManifest.sourceBoundary.internalProjectOnlyOutput === true, "Importer manifest must write internal project data only");
  importerManifest.inputDocs.forEach((inputDoc) => {
    assert(inputDoc.startsWith("10_donors/donor_001_mystery_garden/"), `Importer input must stay inside donor evidence or reports: ${inputDoc}`);
    assert(!inputDoc.includes("/raw/"), `Importer input must not consume raw donor files: ${inputDoc}`);
    assert(!inputDoc.includes("/local_only/"), `Importer input must not consume local-only artifacts: ${inputDoc}`);
  });
  assert(importerManifest.outputPath === "40_projects/project_001/imports/mystery-garden-import.json", "Importer output path drifted unexpectedly");

  assert(importerRefs.includes("MG-EV-20260320-LIVE-A-002"), "Importer refs must include live idle evidence");
  assert(importerUnknowns.length >= 3, "Importer unknowns should remain explicit");
  assert(importerProject.projectId === "project_001", "Importer projectId must be project_001");
  assert(Array.isArray(importArtifact.sourceEvidenceRefs), "Import artifact must contain sourceEvidenceRefs");
  assert((importArtifact.sourceEvidenceRefs as JsonValue[]).includes("MG-EV-20260320-LIVE-A-002"), "Import artifact must include live idle evidence");
  assert.deepStrictEqual(importArtifact, importerModel, "Import artifact must match the deterministic importer output");
  assert(project.sources && !String((project.sources as JsonObject).notes ?? "").includes("10_donors/"), "Project notes must keep replay runtime internal-only");

  console.log("PASS validate:project_001");
  console.log(`Validated schemas in ${schemaDir}`);
  console.log("Validated project.json, fixture shapes, runtime mock files, importer manifest guardrails, and deterministic importer output.");
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`FAIL validate:project_001 - ${message}`);
  process.exitCode = 1;
});
