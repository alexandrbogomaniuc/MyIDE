import { promises as fs } from "node:fs";
import path from "node:path";
import { buildMysteryGardenImport } from "./map-evidence-to-project";

interface MysteryGardenImporterManifest {
  importerId: string;
  modelVersion: string;
  sourceDonorId: string;
  sourceEvidenceRefs: string[];
  inputDocs: string[];
  outputPath: string;
  sourceBoundary: {
    noRawRuntimeReads: boolean;
    readOnlyEvidenceOnly: boolean;
    internalProjectOnlyOutput: boolean;
  };
}

const workspaceRoot = path.resolve(__dirname, "../../../..");
const importerRoot = path.join(workspaceRoot, "30_app", "importer", "mystery-garden");

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function assertPathInside(root: string, targetPath: string, label: string): void {
  const normalizedRoot = path.resolve(root);
  const normalizedTarget = path.resolve(targetPath);

  if (normalizedTarget !== normalizedRoot && !normalizedTarget.startsWith(`${normalizedRoot}${path.sep}`)) {
    throw new Error(`${label} must stay inside ${normalizedRoot}: ${normalizedTarget}`);
  }
}

function assertManifest(value: unknown): asserts value is MysteryGardenImporterManifest {
  if (!isObject(value)) {
    throw new Error("Importer manifest must be a JSON object.");
  }

  if (typeof value.importerId !== "string" || value.importerId.length === 0) {
    throw new Error("Importer manifest requires importerId.");
  }

  if (typeof value.outputPath !== "string" || value.outputPath.length === 0) {
    throw new Error("Importer manifest requires outputPath.");
  }

  if (!isStringArray(value.inputDocs) || value.inputDocs.length === 0) {
    throw new Error("Importer manifest requires at least one inputDoc.");
  }

  if (!isStringArray(value.sourceEvidenceRefs) || value.sourceEvidenceRefs.length === 0) {
    throw new Error("Importer manifest requires sourceEvidenceRefs.");
  }

  if (!isObject(value.sourceBoundary)) {
    throw new Error("Importer manifest requires sourceBoundary.");
  }

  if (value.sourceBoundary.noRawRuntimeReads !== true || value.sourceBoundary.readOnlyEvidenceOnly !== true || value.sourceBoundary.internalProjectOnlyOutput !== true) {
    throw new Error("Importer manifest sourceBoundary must preserve the MyIDE importer guardrails.");
  }
}

export function getMysteryGardenImporterPaths(): { manifestPath: string; importerRoot: string; workspaceRoot: string } {
  return {
    manifestPath: path.join(importerRoot, "importer-manifest.json"),
    importerRoot,
    workspaceRoot
  };
}

export async function readMysteryGardenImporterManifest(): Promise<MysteryGardenImporterManifest> {
  const { manifestPath } = getMysteryGardenImporterPaths();
  const raw = await fs.readFile(manifestPath, "utf8");
  const parsed: unknown = JSON.parse(raw);
  assertManifest(parsed);
  return parsed;
}

async function verifyInputDocs(manifest: MysteryGardenImporterManifest): Promise<void> {
  for (const inputDoc of manifest.inputDocs) {
    if (!inputDoc.startsWith("10_donors/donor_001_mystery_garden/")) {
      throw new Error(`Importer input must stay inside donor evidence or reports: ${inputDoc}`);
    }

    if (inputDoc.includes("/raw/") || inputDoc.includes("/local_only/")) {
      throw new Error(`Importer input must not consume raw or local-only artifacts: ${inputDoc}`);
    }

    const absolutePath = path.join(workspaceRoot, inputDoc);
    assertPathInside(workspaceRoot, absolutePath, "Importer input");
    await fs.access(absolutePath);
  }
}

export async function writeMysteryGardenImportArtifact(): Promise<{ outputPath: string; manifest: MysteryGardenImporterManifest }> {
  const manifest = await readMysteryGardenImporterManifest();
  await verifyInputDocs(manifest);

  const outputPath = path.join(workspaceRoot, manifest.outputPath);
  assertPathInside(path.join(workspaceRoot, "40_projects"), outputPath, "Importer output");

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(buildMysteryGardenImport(), null, 2)}\n`, "utf8");

  return { outputPath, manifest };
}

async function main(): Promise<void> {
  const { outputPath, manifest } = await writeMysteryGardenImportArtifact();
  console.log("PASS import:mystery-garden");
  console.log(`Importer: ${manifest.importerId}`);
  console.log(`Input docs: ${manifest.inputDocs.length}`);
  console.log(`Output: ${path.relative(workspaceRoot, outputPath)}`);
}

if (require.main === module) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`FAIL import:mystery-garden - ${message}`);
    process.exitCode = 1;
  });
}
