import { promises as fs } from "node:fs";
import path from "node:path";

type JsonValue = null | boolean | number | string | JsonObject | JsonValue[];
type JsonObject = { [key: string]: JsonValue };

export interface ProjectScaffoldOptions {
  projectRoot: string;
  meta: ProjectMetaLike;
  overwrite?: boolean;
}

export interface ProjectMetaLike {
  schemaVersion: string;
  projectId: string;
  slug: string;
  displayName: string;
  gameFamily: "slot" | "card" | "dice" | "crash" | "other";
  implementationScope: "slot-first" | "universal-architecture" | "reference-only";
  phase: string;
  status: "planned" | "in-progress" | "validated" | "blocked" | "archived";
  verification: {
    status: "unknown" | "in-progress" | "verified-replay-slice" | "verified-workspace" | "blocked";
    checks: string[];
    lastVerifiedAt?: string;
    notes?: string;
  };
  paths: {
    projectRoot: string;
    projectJson: string;
    metaPath: string;
    registryPath: string;
    evidenceRoot: string;
    donorRoot?: string;
    reportsRoot?: string;
    importsRoot?: string;
    internalRoot?: string;
    importPath?: string;
    runtimeRoot?: string;
    fixturesRoot?: string;
    targetRoot?: string;
    releaseRoot?: string;
    logsRoot?: string;
  };
  donor: {
    donorId: string;
    donorName: string;
    evidenceRoot: string;
    captureSessions: string[];
    evidenceRefs: string[];
    status: "proven" | "planned" | "blocked" | "reference-only";
    notes?: string;
  };
  targetGame: {
    targetGameId: string;
    displayName: string;
    gameFamily: "slot" | "card" | "dice" | "crash" | "other";
    relationship: "donor-source" | "reconstruction-target" | "resulting-game" | "future-target" | "reference-only";
    status: "proven" | "validated" | "planned" | "in-progress" | "blocked" | "reference-only";
    provenNotes: string[];
    plannedNotes: string[];
    notes?: string;
  };
  timestamps: {
    createdAt: string;
    updatedAt: string;
    firstValidatedAt?: string;
  };
  notes: {
    provenFacts: string[];
    plannedWork: string[];
    assumptions?: string[];
    unresolvedQuestions?: string[];
  };
}

const templateSubdirectories = [
  "donor",
  "reports",
  "imports",
  "internal",
  "runtime",
  "fixtures",
  "target",
  "release",
  "logs"
] as const;

const workspaceRoot = path.resolve(__dirname, "../../..");

function isJsonObject(value: unknown): value is JsonObject {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

async function readJsonObject(filePath: string): Promise<JsonObject> {
  const raw = await fs.readFile(filePath, "utf8");
  const parsed: unknown = JSON.parse(raw);
  if (!isJsonObject(parsed)) {
    throw new Error(`${filePath} must contain a JSON object.`);
  }

  return parsed;
}

function requireString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${label} must be a non-empty string.`);
  }

  return value;
}

function toStringArray(value: unknown, label: string): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => {
    if (typeof item !== "string" || item.length === 0) {
      throw new Error(`${label} entries must be non-empty strings.`);
    }

    return true;
  });
}

function resolveProjectMeta(meta: JsonObject): ProjectMetaLike {
  const verification = isJsonObject(meta.verification) ? meta.verification : {};
  const paths = isJsonObject(meta.paths) ? meta.paths : {};
  const donor = isJsonObject(meta.donor) ? meta.donor : {};
  const targetGame = isJsonObject(meta.targetGame) ? meta.targetGame : {};
  const timestamps = isJsonObject(meta.timestamps) ? meta.timestamps : {};
  const notes = isJsonObject(meta.notes) ? meta.notes : {};

  return {
    schemaVersion: requireString(meta.schemaVersion, "schemaVersion"),
    projectId: requireString(meta.projectId, "projectId"),
    slug: requireString(meta.slug, "slug"),
    displayName: requireString(meta.displayName, "displayName"),
    gameFamily: requireString(meta.gameFamily, "gameFamily") as ProjectMetaLike["gameFamily"],
    implementationScope: requireString(meta.implementationScope, "implementationScope") as ProjectMetaLike["implementationScope"],
    phase: requireString(meta.phase, "phase"),
    status: requireString(meta.status, "status") as ProjectMetaLike["status"],
    verification: {
      status: requireString(verification.status, "verification.status") as ProjectMetaLike["verification"]["status"],
      checks: toStringArray(verification.checks, "verification.checks"),
      lastVerifiedAt: typeof verification.lastVerifiedAt === "string" ? verification.lastVerifiedAt : undefined,
      notes: typeof verification.notes === "string" ? verification.notes : undefined
    },
    paths: {
      projectRoot: requireString(paths.projectRoot, "paths.projectRoot"),
      projectJson: requireString(paths.projectJson, "paths.projectJson"),
      metaPath: requireString(paths.metaPath, "paths.metaPath"),
      registryPath: requireString(paths.registryPath, "paths.registryPath"),
      evidenceRoot: requireString(paths.evidenceRoot, "paths.evidenceRoot"),
      importPath: typeof paths.importPath === "string" ? paths.importPath : undefined,
      runtimeRoot: typeof paths.runtimeRoot === "string" ? paths.runtimeRoot : undefined,
      fixturesRoot: typeof paths.fixturesRoot === "string" ? paths.fixturesRoot : undefined,
      logsRoot: typeof paths.logsRoot === "string" ? paths.logsRoot : undefined
    },
    donor: {
      donorId: requireString(donor.donorId, "donor.donorId"),
      donorName: requireString(donor.donorName, "donor.donorName"),
      evidenceRoot: requireString(donor.evidenceRoot, "donor.evidenceRoot"),
      captureSessions: toStringArray(donor.captureSessions, "donor.captureSessions"),
      evidenceRefs: toStringArray(donor.evidenceRefs, "donor.evidenceRefs"),
      status: requireString(donor.status, "donor.status") as ProjectMetaLike["donor"]["status"],
      notes: typeof donor.notes === "string" ? donor.notes : undefined
    },
    targetGame: {
      targetGameId: requireString(targetGame.targetGameId, "targetGame.targetGameId"),
      displayName: requireString(targetGame.displayName, "targetGame.displayName"),
      gameFamily: requireString(targetGame.gameFamily, "targetGame.gameFamily") as ProjectMetaLike["targetGame"]["gameFamily"],
      relationship: requireString(targetGame.relationship, "targetGame.relationship") as ProjectMetaLike["targetGame"]["relationship"],
      status: requireString(targetGame.status, "targetGame.status") as ProjectMetaLike["targetGame"]["status"],
      provenNotes: toStringArray(targetGame.provenNotes, "targetGame.provenNotes"),
      plannedNotes: toStringArray(targetGame.plannedNotes, "targetGame.plannedNotes"),
      notes: typeof targetGame.notes === "string" ? targetGame.notes : undefined
    },
    timestamps: {
      createdAt: requireString(timestamps.createdAt, "timestamps.createdAt"),
      updatedAt: requireString(timestamps.updatedAt, "timestamps.updatedAt"),
      firstValidatedAt: typeof timestamps.firstValidatedAt === "string" ? timestamps.firstValidatedAt : undefined
    },
    notes: {
      provenFacts: toStringArray(notes.provenFacts, "notes.provenFacts"),
      plannedWork: toStringArray(notes.plannedWork, "notes.plannedWork"),
      assumptions: Array.isArray(notes.assumptions) ? toStringArray(notes.assumptions, "notes.assumptions") : undefined,
      unresolvedQuestions: Array.isArray(notes.unresolvedQuestions) ? toStringArray(notes.unresolvedQuestions, "notes.unresolvedQuestions") : undefined
    }
  };
}

function formatList(items: readonly string[]): string {
  return items.map((item) => `- ${item}`).join("\n");
}

function toWorkspaceRelative(targetPath: string): string {
  const resolved = path.resolve(targetPath);
  const relative = path.relative(workspaceRoot, resolved);
  return relative.startsWith("..") ? targetPath.replace(/\\/g, "/") : relative.replace(/\\/g, "/");
}

function humanizeProjectName(slug: string): string {
  return slug
    .replace(/^project[_-]/, "Project ")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function rebaseProjectMeta(meta: ProjectMetaLike, projectRoot: string): ProjectMetaLike {
  const relativeProjectRoot = toWorkspaceRelative(projectRoot);
  const projectFolderName = path.basename(relativeProjectRoot);
  const donorRoot = `${relativeProjectRoot}/donor`;
  const reportsRoot = `${relativeProjectRoot}/reports`;
  const importsRoot = `${relativeProjectRoot}/imports`;
  const internalRoot = `${relativeProjectRoot}/internal`;
  const runtimeRoot = `${relativeProjectRoot}/runtime`;
  const fixturesRoot = `${relativeProjectRoot}/fixtures`;
  const targetRoot = `${relativeProjectRoot}/target`;
  const releaseRoot = `${relativeProjectRoot}/release`;
  const logsRoot = `${relativeProjectRoot}/logs`;
  const usesTemplateProjectId = meta.projectId === path.basename(meta.paths.projectRoot) || meta.projectId === "project_003";
  const usesTemplateSlug = meta.slug === path.basename(meta.paths.projectRoot) || meta.slug === "example-project";
  const usesTemplateDisplayName = meta.displayName === "Example Project Scaffold";
  const usesTemplateDonorId = meta.donor.donorId === "donor_planned_example";
  const usesTemplateDonorName = meta.donor.donorName === "Planned donor reference";
  const usesTemplateTargetId = meta.targetGame.targetGameId === "target.example-project.future-target";
  const usesTemplateTargetName = meta.targetGame.displayName === "Example Project Target";

  return {
    ...meta,
    projectId: usesTemplateProjectId ? projectFolderName : meta.projectId,
    slug: usesTemplateSlug ? projectFolderName : meta.slug,
    displayName: usesTemplateDisplayName ? `${humanizeProjectName(projectFolderName)} Scaffold` : meta.displayName,
    paths: {
      ...meta.paths,
      projectRoot: relativeProjectRoot,
      projectJson: `${relativeProjectRoot}/project.json`,
      metaPath: `${relativeProjectRoot}/project.meta.json`,
      registryPath: "40_projects/registry.json",
      evidenceRoot: meta.paths.evidenceRoot.startsWith("40_projects/") ? donorRoot : meta.paths.evidenceRoot,
      donorRoot,
      reportsRoot,
      importsRoot,
      internalRoot,
      importPath: `${importsRoot}/import-manifest.json`,
      runtimeRoot,
      fixturesRoot,
      targetRoot,
      releaseRoot,
      logsRoot
    },
    donor: {
      ...meta.donor,
      donorId: usesTemplateDonorId ? `donor_planned_${projectFolderName}` : meta.donor.donorId,
      donorName: usesTemplateDonorName ? `${humanizeProjectName(projectFolderName)} Donor Placeholder` : meta.donor.donorName,
      evidenceRoot: meta.donor.evidenceRoot.startsWith("40_projects/") ? donorRoot : meta.donor.evidenceRoot
    },
    targetGame: {
      ...meta.targetGame,
      targetGameId: usesTemplateTargetId ? `target.${projectFolderName}.future-target` : meta.targetGame.targetGameId,
      displayName: usesTemplateTargetName ? `${humanizeProjectName(projectFolderName)} Target` : meta.targetGame.displayName
    },
    timestamps: {
      ...meta.timestamps,
      updatedAt: meta.timestamps.updatedAt
    }
  };
}

function buildProjectReadme(meta: ProjectMetaLike): string {
  return [
    `# ${meta.displayName}`,
    "",
    "## Purpose",
    `- ${meta.phase} scaffold for ${meta.gameFamily} project ${meta.projectId}.`,
    `- Current status: ${meta.status}.`,
    "",
    "## Donor Link",
    `- ${meta.donor.donorName} (${meta.donor.donorId}).`,
    `- Donor status: ${meta.donor.status}.`,
    `- Evidence root: \`${meta.donor.evidenceRoot}\`.`,
    "",
    "## Target Game",
    `- ${meta.targetGame.displayName}.`,
    `- Relationship: ${meta.targetGame.relationship}.`,
    `- Target status: ${meta.targetGame.status}.`,
    "",
    "## Notes",
    formatList(meta.notes.provenFacts),
    "",
    formatList(meta.notes.plannedWork)
  ].join("\n");
}

function buildFolderReadme(title: string, purpose: string, items: string[]): string {
  return [
    `# ${title}`,
    "",
    "## Purpose",
    `- ${purpose}`,
    "",
    "## Contents",
    formatList(items)
  ].join("\n");
}

async function writeIfMissing(filePath: string, contents: string, overwrite: boolean): Promise<void> {
  try {
    await fs.stat(filePath);
    if (!overwrite) {
      return;
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }

  await fs.writeFile(filePath, contents, "utf8");
}

async function ensureProjectFolderStructure(projectRoot: string, projectRootLabel: string, overwrite: boolean): Promise<void> {
  await fs.mkdir(projectRoot, { recursive: true });
  await Promise.all(templateSubdirectories.map(async (folder) => {
    const folderPath = path.join(projectRoot, folder);
    await fs.mkdir(folderPath, { recursive: true });
    const readmePath = path.join(folderPath, "README.md");
    const title = folder === "donor"
      ? "Donor"
      : folder === "reports"
        ? "Reports"
        : folder === "imports"
          ? "Imports"
          : folder === "internal"
            ? "Internal"
            : folder === "runtime"
              ? "Runtime"
              : folder === "fixtures"
                ? "Fixtures"
                : folder === "target"
                  ? "Target"
                  : folder === "release"
                    ? "Release"
                    : "Logs";
    const purpose = folder === "donor"
      ? "Project-local donor investigation notes and evidence references."
      : folder === "reports"
        ? "Evidence-backed reports, maps, and claims for this project."
        : folder === "imports"
          ? "Import manifests and notes that bridge donor findings into clean internal data."
          : folder === "internal"
            ? "Clean internal source-of-truth data for this project."
            : folder === "runtime"
              ? "Mocked or replay runtime state used by the local preview."
              : folder === "fixtures"
                ? "Test fixtures for replay, validation, and screenshots."
                : folder === "target"
                  ? "Target or resulting game planning and implementation notes."
                  : folder === "release"
                    ? "Release preparation notes and packaging assets."
                    : "Logs, run notes, and verification history.";

    await writeIfMissing(
      readmePath,
      buildFolderReadme(title, purpose, [`Created by the MyIDE scaffold helper for ${projectRootLabel}.`]),
      overwrite
    );
  }));
}

export async function createProjectScaffold(options: ProjectScaffoldOptions): Promise<void> {
  const { projectRoot, meta, overwrite = false } = options;
  const resolved = path.resolve(projectRoot);
  const projectRootLabel = toWorkspaceRelative(resolved);

  const metaPath = path.join(resolved, "project.meta.json");
  const rootReadmePath = path.join(resolved, "README.md");

  await ensureProjectFolderStructure(resolved, projectRootLabel, overwrite);
  await writeIfMissing(metaPath, `${JSON.stringify(meta, null, 2)}\n`, overwrite);
  await writeIfMissing(rootReadmePath, buildProjectReadme(meta), overwrite);
}

export async function createProjectFromTemplate(configPath: string, projectRoot: string, overwrite = false): Promise<void> {
  const config = resolveProjectMeta(await readJsonObject(configPath));
  const rebased = rebaseProjectMeta(config, projectRoot);
  await createProjectScaffold({ projectRoot, meta: rebased, overwrite });
}

function parseArgs(argv: readonly string[]): { configPath?: string; projectRoot?: string; overwrite: boolean } {
  let configPath: string | undefined;
  let projectRoot: string | undefined;
  let overwrite = false;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--config") {
      configPath = argv[index + 1];
      index += 1;
    } else if (arg === "--project-root") {
      projectRoot = argv[index + 1];
      index += 1;
    } else if (arg === "--overwrite") {
      overwrite = true;
    } else if (arg === "--help" || arg === "-h") {
      return { overwrite };
    }
  }

  return { configPath, projectRoot, overwrite };
}

async function main(): Promise<void> {
  const { configPath, projectRoot, overwrite } = parseArgs(process.argv.slice(2));

  if (!configPath || !projectRoot) {
    const script = path.relative(process.cwd(), __filename);
    console.log([
      "Usage:",
      `  node ${script} --config <template-meta.json> --project-root <workspace/project_slug> [--overwrite]`,
      "",
      "The config file must match the MyIDE project metadata shape and is written directly to project.meta.json."
    ].join("\n"));
    return;
  }

  await createProjectFromTemplate(configPath, projectRoot, overwrite);
  console.log(`Created project scaffold at ${path.resolve(projectRoot)}`);
}

if (require.main === module) {
  void main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
