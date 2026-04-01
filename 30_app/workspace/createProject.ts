import { promises as fs } from "node:fs";
import path from "node:path";
import { discoverAndWriteRegistry } from "./discoverProjects";
import { bootstrapDonorIntake, sanitizeStoredUrl, type DonorIntakeResult } from "./donorIntake";

type JsonValue = null | boolean | number | string | JsonObject | JsonValue[];
type JsonObject = { [key: string]: JsonValue };

const lifecycleStageIds = [
  "donorEvidence",
  "donorReport",
  "importMapping",
  "internalReplay",
  "targetConcept",
  "targetBuild",
  "integration",
  "qa",
  "releasePrep"
] as const;
const lifecycleStageStatusValues = ["planned", "in-progress", "blocked", "ready-for-review", "verified", "deferred"] as const;
const gameFamilyValues = ["slot", "card", "dice", "crash", "other"] as const;

type LifecycleStageId = typeof lifecycleStageIds[number];
type LifecycleStageStatus = "planned" | "in-progress" | "blocked" | "ready-for-review" | "verified" | "deferred";

export interface ProjectLifecycleStage {
  status: LifecycleStageStatus;
  notes?: string;
}

export interface ProjectLifecycle {
  currentStage: LifecycleStageId;
  stages: Record<LifecycleStageId, ProjectLifecycleStage>;
}

export interface ShellCreateProjectInput {
  displayName: string;
  slug: string;
  gameFamily: ProjectMetaLike["gameFamily"];
  donorReference: string;
  donorLaunchUrl?: string;
  harvestDonorAssets?: boolean;
  targetDisplayName: string;
  notes?: string;
}

export interface ShellCreateProjectResult {
  projectId: string;
  slug: string;
  displayName: string;
  projectRoot: string;
  projectMetaPath: string;
  donorIntake?: DonorIntakeResult;
}

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
  lifecycle: ProjectLifecycle;
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
    launchUrl?: string;
    resolvedLaunchUrl?: string;
    sourceHost?: string;
    intakeReportPath?: string;
    harvestStatus?: "unknown" | "harvested" | "blocked" | "skipped";
    harvestManifestPath?: string;
    harvestedAssetCount?: number;
    failedAssetCount?: number;
    packageStatus?: "unknown" | "packaged" | "blocked" | "skipped";
    packageManifestPath?: string;
    packageFamilyCount?: number;
    packageReferencedUrlCount?: number;
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

function requireTrimmedString(value: unknown, label: string): string {
  const trimmed = requireString(value, label).trim();
  if (trimmed.length === 0) {
    throw new Error(`${label} must be a non-empty string.`);
  }

  return trimmed;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function getObject(value: unknown): JsonObject {
  return isJsonObject(value) ? value : {};
}

function toStringArray(value: unknown, label: string): string[] {
  if (typeof value === "string") {
    return value.length > 0 ? [value] : [];
  }

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

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "project";
}

function humanizeProjectName(slug: string): string {
  return slug
    .replace(/^project[_-]/, "Project ")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function buildStandardPaths(relativeProjectRoot: string, donorId: string): ProjectMetaLike["paths"] {
  return {
    projectRoot: relativeProjectRoot,
    projectJson: `${relativeProjectRoot}/project.json`,
    metaPath: `${relativeProjectRoot}/project.meta.json`,
    registryPath: "40_projects/registry.json",
    evidenceRoot: `10_donors/${donorId}/evidence`,
    donorRoot: `${relativeProjectRoot}/donor`,
    reportsRoot: `${relativeProjectRoot}/reports`,
    importsRoot: `${relativeProjectRoot}/imports`,
    internalRoot: `${relativeProjectRoot}/internal`,
    importPath: `${relativeProjectRoot}/imports/import-manifest.json`,
    runtimeRoot: `${relativeProjectRoot}/runtime`,
    fixturesRoot: `${relativeProjectRoot}/fixtures`,
    targetRoot: `${relativeProjectRoot}/target`,
    releaseRoot: `${relativeProjectRoot}/release`,
    logsRoot: `${relativeProjectRoot}/logs`
  };
}

function normalizeVerification(value: unknown): ProjectMetaLike["verification"] {
  const verification = isJsonObject(value) ? value : {};

  return {
    status: optionalString(verification.status) as ProjectMetaLike["verification"]["status"] ?? "unknown",
    checks: toStringArray(verification.checks, "verification.checks"),
    lastVerifiedAt: optionalString(verification.lastVerifiedAt),
    notes: optionalString(verification.notes)
  };
}

function normalizeLifecycleStatus(value: unknown, fallback: LifecycleStageStatus): LifecycleStageStatus {
  const candidate = optionalString(value) as LifecycleStageStatus | undefined;
  return candidate && lifecycleStageStatusValues.includes(candidate) ? candidate : fallback;
}

function buildDefaultLifecycle(projectName: string): ProjectLifecycle {
  return {
    currentStage: "donorEvidence",
    stages: {
      donorEvidence: {
        status: "planned",
        notes: `Capture donor evidence for ${projectName} before any importer or replay work is claimed.`
      },
      donorReport: {
        status: "planned",
        notes: "Write evidence-backed donor reports after capture is complete."
      },
      importMapping: {
        status: "planned",
        notes: "Map donor findings into the clean internal project model."
      },
      internalReplay: {
        status: "planned",
        notes: "Build or validate the internal replay slice only after import mapping exists."
      },
      targetConcept: {
        status: "planned",
        notes: "Define the resulting game direction once the donor-backed slice is understood."
      },
      targetBuild: {
        status: "deferred",
        notes: "Do not start target implementation until the project is evidence-backed."
      },
      integration: {
        status: "deferred",
        notes: "Production integration remains deferred until a later phase."
      },
      qa: {
        status: "deferred",
        notes: "QA becomes active only after internal replay or target build exists."
      },
      releasePrep: {
        status: "deferred",
        notes: "Release preparation remains deferred for new scaffolds."
      }
    }
  };
}

function normalizeLifecycle(value: unknown, projectName: string): ProjectLifecycle {
  const lifecycle = isJsonObject(value) ? value : {};
  const lifecycleStages = isJsonObject(lifecycle.stages) ? lifecycle.stages : {};
  const defaults = buildDefaultLifecycle(projectName);

  return {
    currentStage: (optionalString(lifecycle.currentStage) as LifecycleStageId | undefined) && lifecycleStageIds.includes(optionalString(lifecycle.currentStage) as LifecycleStageId)
      ? optionalString(lifecycle.currentStage) as LifecycleStageId
      : defaults.currentStage,
    stages: {
      donorEvidence: {
        status: normalizeLifecycleStatus(getObject(lifecycleStages.donorEvidence).status, defaults.stages.donorEvidence.status),
        notes: optionalString(getObject(lifecycleStages.donorEvidence).notes) ?? defaults.stages.donorEvidence.notes
      },
      donorReport: {
        status: normalizeLifecycleStatus(getObject(lifecycleStages.donorReport).status, defaults.stages.donorReport.status),
        notes: optionalString(getObject(lifecycleStages.donorReport).notes) ?? defaults.stages.donorReport.notes
      },
      importMapping: {
        status: normalizeLifecycleStatus(getObject(lifecycleStages.importMapping).status, defaults.stages.importMapping.status),
        notes: optionalString(getObject(lifecycleStages.importMapping).notes) ?? defaults.stages.importMapping.notes
      },
      internalReplay: {
        status: normalizeLifecycleStatus(getObject(lifecycleStages.internalReplay).status, defaults.stages.internalReplay.status),
        notes: optionalString(getObject(lifecycleStages.internalReplay).notes) ?? defaults.stages.internalReplay.notes
      },
      targetConcept: {
        status: normalizeLifecycleStatus(getObject(lifecycleStages.targetConcept).status, defaults.stages.targetConcept.status),
        notes: optionalString(getObject(lifecycleStages.targetConcept).notes) ?? defaults.stages.targetConcept.notes
      },
      targetBuild: {
        status: normalizeLifecycleStatus(getObject(lifecycleStages.targetBuild).status, defaults.stages.targetBuild.status),
        notes: optionalString(getObject(lifecycleStages.targetBuild).notes) ?? defaults.stages.targetBuild.notes
      },
      integration: {
        status: normalizeLifecycleStatus(getObject(lifecycleStages.integration).status, defaults.stages.integration.status),
        notes: optionalString(getObject(lifecycleStages.integration).notes) ?? defaults.stages.integration.notes
      },
      qa: {
        status: normalizeLifecycleStatus(getObject(lifecycleStages.qa).status, defaults.stages.qa.status),
        notes: optionalString(getObject(lifecycleStages.qa).notes) ?? defaults.stages.qa.notes
      },
      releasePrep: {
        status: normalizeLifecycleStatus(getObject(lifecycleStages.releasePrep).status, defaults.stages.releasePrep.status),
        notes: optionalString(getObject(lifecycleStages.releasePrep).notes) ?? defaults.stages.releasePrep.notes
      }
    }
  };
}

function normalizeNotes(value: unknown, projectName: string): ProjectMetaLike["notes"] {
  const notes = isJsonObject(value) ? value : {};
  const summary = optionalString((notes as JsonObject).summary);

  const provenFacts = toStringArray(notes.provenFacts, "notes.provenFacts");
  const plannedWork = toStringArray(notes.plannedWork, "notes.plannedWork");
  const assumptions = toStringArray(notes.assumptions, "notes.assumptions");
  const unresolvedQuestions = toStringArray(notes.unresolvedQuestions, "notes.unresolvedQuestions");

  return {
    provenFacts: provenFacts.length > 0 ? provenFacts : [`${projectName} scaffold is discoverable from folder metadata.`],
    plannedWork: plannedWork.length > 0 ? plannedWork : summary ? [summary] : [`Replace placeholder metadata with evidence-backed details before validation.`],
    assumptions: assumptions.length > 0 ? assumptions : undefined,
    unresolvedQuestions: unresolvedQuestions.length > 0 ? unresolvedQuestions : undefined
  };
}

function normalizeDonor(value: unknown, relativeProjectRoot: string, projectName: string): ProjectMetaLike["donor"] {
  const donor = isJsonObject(value) ? value : {};
  const donorId = optionalString(donor.donorId) ?? `donor_planned_${path.basename(relativeProjectRoot)}`;
  const donorName = optionalString(donor.donorName) ?? "Planned donor reference";
  const evidenceRoot = optionalString(donor.evidenceRoot) ?? `10_donors/${donorId}/evidence`;

  return {
    donorId,
    donorName,
    evidenceRoot,
    captureSessions: toStringArray(donor.captureSessions, "donor.captureSessions"),
    evidenceRefs: toStringArray(donor.evidenceRefs, "donor.evidenceRefs"),
    status: (optionalString(donor.status) as ProjectMetaLike["donor"]["status"] | undefined) ?? "planned",
    launchUrl: optionalString(donor.launchUrl),
    resolvedLaunchUrl: optionalString(donor.resolvedLaunchUrl),
    sourceHost: optionalString(donor.sourceHost),
    intakeReportPath: optionalString(donor.intakeReportPath),
    harvestStatus: (optionalString(donor.harvestStatus) as ProjectMetaLike["donor"]["harvestStatus"] | undefined) ?? "unknown",
    harvestManifestPath: optionalString(donor.harvestManifestPath),
    harvestedAssetCount: typeof donor.harvestedAssetCount === "number" ? donor.harvestedAssetCount : undefined,
    failedAssetCount: typeof donor.failedAssetCount === "number" ? donor.failedAssetCount : undefined,
    packageStatus: (optionalString(donor.packageStatus) as ProjectMetaLike["donor"]["packageStatus"] | undefined) ?? "unknown",
    packageManifestPath: optionalString(donor.packageManifestPath),
    packageFamilyCount: typeof donor.packageFamilyCount === "number" ? donor.packageFamilyCount : undefined,
    packageReferencedUrlCount: typeof donor.packageReferencedUrlCount === "number" ? donor.packageReferencedUrlCount : undefined,
    notes: optionalString(donor.notes) ?? `${projectName} scaffold only. Replace with evidence-backed donor references before validation.`
  };
}

function normalizeTargetGame(value: unknown, slug: string, projectName: string): ProjectMetaLike["targetGame"] {
  const targetGame = isJsonObject(value) ? value : {};
  const targetGameId = optionalString(targetGame.targetGameId) ?? `target.${slug}.future-target`;
  const displayName = optionalString(targetGame.displayName) ?? `${projectName} Target`;

  return {
    targetGameId,
    displayName,
    gameFamily: (optionalString(targetGame.gameFamily) as ProjectMetaLike["targetGame"]["gameFamily"] | undefined) ?? "slot",
    relationship: (optionalString(targetGame.relationship) as ProjectMetaLike["targetGame"]["relationship"] | undefined) ?? "future-target",
    status: (optionalString(targetGame.status) as ProjectMetaLike["targetGame"]["status"] | undefined) ?? "planned",
    provenNotes: toStringArray(targetGame.provenNotes, "targetGame.provenNotes"),
    plannedNotes: toStringArray(targetGame.plannedNotes, "targetGame.plannedNotes"),
    notes: optionalString(targetGame.notes) ?? "No resulting game implementation is proven yet."
  };
}

function resolveProjectMeta(meta: JsonObject, projectRoot: string): ProjectMetaLike {
  const relativeProjectRoot = toWorkspaceRelative(projectRoot);
  const normalizedProjectRootName = path.basename(relativeProjectRoot);
  const inferredProjectId = optionalString(meta.projectId) ?? normalizedProjectRootName;
  const inferredSlug = optionalString(meta.slug) ?? slugify(optionalString(meta.displayName) ?? inferredProjectId);
  const inferredDisplayName = optionalString(meta.displayName) ?? humanizeProjectName(inferredSlug);
  const projectName = inferredDisplayName;
  const donorRecord = normalizeDonor(meta.donor, relativeProjectRoot, projectName);

  return {
    schemaVersion: optionalString(meta.schemaVersion) ?? "0.1.0",
    projectId: inferredProjectId,
    slug: inferredSlug,
    displayName: inferredDisplayName,
    gameFamily: (optionalString(meta.gameFamily) as ProjectMetaLike["gameFamily"] | undefined) ?? "slot",
    implementationScope: (optionalString(meta.implementationScope) as ProjectMetaLike["implementationScope"] | undefined) ?? "slot-first",
    phase: optionalString(meta.phase) ?? "PHASE TEMPLATE",
    status: (optionalString(meta.status) as ProjectMetaLike["status"] | undefined) ?? "planned",
    verification: normalizeVerification(meta.verification),
    lifecycle: normalizeLifecycle(meta.lifecycle, projectName),
    paths: buildStandardPaths(relativeProjectRoot, donorRecord.donorId),
    donor: donorRecord,
    targetGame: normalizeTargetGame(meta.targetGame, inferredSlug, projectName),
    timestamps: {
      createdAt: optionalString((isJsonObject(meta.timestamps) ? meta.timestamps : {}).createdAt) ?? new Date().toISOString(),
      updatedAt: optionalString((isJsonObject(meta.timestamps) ? meta.timestamps : {}).updatedAt) ?? new Date().toISOString(),
      firstValidatedAt: optionalString((isJsonObject(meta.timestamps) ? meta.timestamps : {}).firstValidatedAt)
    },
    notes: normalizeNotes(meta.notes, projectName)
  };
}

function formatList(items: readonly string[]): string {
  return items.map((item) => `- ${item}`).join("\n");
}

function formatLifecycleList(lifecycle: ProjectLifecycle): string {
  return lifecycleStageIds.map((stageId) => {
    const stage = lifecycle.stages[stageId];
    return `- ${stageId}: ${stage.status}${stage.notes ? ` (${stage.notes})` : ""}`;
  }).join("\n");
}

function toWorkspaceRelative(targetPath: string): string {
  const resolved = path.resolve(targetPath);
  const relative = path.relative(workspaceRoot, resolved);
  return relative.startsWith("..") ? targetPath.replace(/\\/g, "/") : relative.replace(/\\/g, "/");
}

function buildProjectReadme(meta: ProjectMetaLike): string {
  return [
    `# ${meta.displayName}`,
    "",
    "## Purpose",
    `- ${meta.phase} scaffold for ${meta.gameFamily} project ${meta.projectId}.`,
    `- Current status: ${meta.status}.`,
    `- Current lifecycle stage: ${meta.lifecycle.currentStage}.`,
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
    "## Lifecycle",
    formatLifecycleList(meta.lifecycle),
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

async function assertProjectRootAvailable(projectRoot: string, overwrite: boolean): Promise<void> {
  try {
    const entries = await fs.readdir(projectRoot);
    if (entries.length > 0 && !overwrite) {
      throw new Error(`Project folder already exists and is not empty: ${toWorkspaceRelative(projectRoot)}`);
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }
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

  await assertProjectRootAvailable(resolved, overwrite);

  const metaPath = path.join(resolved, "project.meta.json");
  const rootReadmePath = path.join(resolved, "README.md");

  await ensureProjectFolderStructure(resolved, projectRootLabel, overwrite);
  await writeIfMissing(metaPath, `${JSON.stringify(meta, null, 2)}\n`, overwrite);
  await writeIfMissing(rootReadmePath, buildProjectReadme(meta), overwrite);
}

export async function createProjectFromTemplate(configPath: string, projectRoot: string, overwrite = false): Promise<void> {
  const config = await readJsonObject(configPath);
  const normalized = resolveProjectMeta(config, projectRoot);
  await createProjectScaffold({ projectRoot, meta: normalized, overwrite });
  await discoverAndWriteRegistry();
}

export function buildProjectMetaFromInput(input: ShellCreateProjectInput): ProjectMetaLike {
  const displayName = requireTrimmedString(input.displayName, "displayName");
  const slug = slugify(requireTrimmedString(input.slug, "slug"));
  const donorReference = requireTrimmedString(input.donorReference, "donorReference");
  const donorLaunchUrl = optionalString(input.donorLaunchUrl)?.trim();
  const harvestDonorAssets = input.harvestDonorAssets !== false;
  const targetDisplayName = requireTrimmedString(input.targetDisplayName, "targetDisplayName");
  const notesInput = optionalString(input.notes)?.trim();
  const projectRoot = `40_projects/${slug}`;
  const now = new Date().toISOString();
  const donorId = /^[a-z0-9._-]+$/i.test(donorReference) ? donorReference : `donor_manual_${slugify(donorReference)}`;
  const projectId = `project_${slug.replace(/-/g, "_")}`;
  const targetGameId = `target.${slug}.future-target`;
  const gameFamily = gameFamilyValues.includes(input.gameFamily) ? input.gameFamily : "other";
  const implementationScope: ProjectMetaLike["implementationScope"] = gameFamily === "slot" ? "slot-first" : "reference-only";
  const lifecycle = buildDefaultLifecycle(displayName);

  return {
    schemaVersion: "0.1.0",
    projectId,
    slug,
    displayName,
    gameFamily,
    implementationScope,
    phase: "PHASE 4C",
    status: "planned",
    verification: {
      status: "unknown",
      checks: [],
      notes: "Scaffold created from the MyIDE shell. No replay or runtime validation exists yet."
    },
    lifecycle,
    paths: buildStandardPaths(projectRoot, donorId),
    donor: {
      donorId,
      donorName: donorReference,
      evidenceRoot: `10_donors/${donorId}/evidence`,
      captureSessions: [],
      evidenceRefs: [],
      status: "planned",
      launchUrl: donorLaunchUrl ? sanitizeStoredUrl(donorLaunchUrl) : undefined,
      sourceHost: donorLaunchUrl ? (() => {
        try {
          return new URL(donorLaunchUrl).host;
        } catch {
          return undefined;
        }
      })() : undefined,
      intakeReportPath: `10_donors/${donorId}/reports/DONOR_INTAKE_REPORT.md`,
      harvestStatus: donorLaunchUrl ? (harvestDonorAssets ? "unknown" : "skipped") : "unknown",
      harvestManifestPath: donorLaunchUrl && harvestDonorAssets ? `10_donors/${donorId}/evidence/local_only/harvest/asset-manifest.json` : undefined,
      packageStatus: donorLaunchUrl ? (harvestDonorAssets ? "unknown" : "skipped") : "unknown",
      packageManifestPath: donorLaunchUrl && harvestDonorAssets ? `10_donors/${donorId}/evidence/local_only/harvest/package-manifest.json` : undefined,
      notes: donorLaunchUrl
        ? (harvestDonorAssets
          ? "Shell-created donor reference with launch capture plus bounded recursive donor harvest queued. Replace scaffold claims with evidence-backed donor materials before validation."
          : "Shell-created donor reference with a first launch URL queued for intake capture. Replace scaffold claims with evidence-backed donor materials before validation.")
        : "Shell-created donor reference only. Add a donor launch URL or evidence-backed donor materials before validation."
    },
    targetGame: {
      targetGameId,
      displayName: targetDisplayName,
      gameFamily,
      relationship: "future-target",
      status: "planned",
      provenNotes: [],
      plannedNotes: [
        "Confirm the donor-to-target relationship with evidence-backed reports.",
        "Do not claim runtime or target build progress until implementation exists."
      ],
      notes: "Shell-created target/resulting game placeholder only."
    },
    timestamps: {
      createdAt: now,
      updatedAt: now
    },
    notes: {
      provenFacts: [
        "Project scaffold was created through the MyIDE workspace flow.",
        "Folder-based discovery should surface this project after rescan."
      ],
      plannedWork: notesInput
        ? [notesInput]
        : [donorLaunchUrl
        ? (harvestDonorAssets
            ? "Review the donor intake report plus donor package manifests and convert that bounded donor package into evidence-backed donor capture work."
            : "Review the donor intake report and convert first-pass URL discovery into evidence-backed donor capture work.")
          : "Replace scaffold metadata with evidence-backed donor, import, and replay details."],
      assumptions: [
        "This project remains unvalidated until donor evidence and internal replay exist."
      ],
      unresolvedQuestions: [
        "Which donor evidence pack and internal replay slice will validate this project first."
      ]
    }
  };
}

export async function createProjectFromInput(input: ShellCreateProjectInput, overwrite = false): Promise<ShellCreateProjectResult> {
  const meta = buildProjectMetaFromInput(input);
  const donorIntake = await bootstrapDonorIntake({
    donorId: meta.donor.donorId,
    donorName: meta.donor.donorName,
    donorLaunchUrl: input.donorLaunchUrl,
    harvestAssets: input.harvestDonorAssets !== false,
    overwrite
  });
  meta.donor.evidenceRoot = path.relative(workspaceRoot, donorIntake.evidenceRoot).replace(/\\/g, "/");
  meta.donor.intakeReportPath = path.relative(workspaceRoot, donorIntake.reportPath).replace(/\\/g, "/");
  meta.donor.launchUrl = donorIntake.launchUrl;
  meta.donor.resolvedLaunchUrl = donorIntake.resolvedLaunchUrl;
  meta.donor.sourceHost = donorIntake.sourceHost;
  meta.donor.harvestStatus = donorIntake.harvestStatus ?? "unknown";
  meta.donor.harvestManifestPath = donorIntake.harvestManifestPath ? path.relative(workspaceRoot, donorIntake.harvestManifestPath).replace(/\\/g, "/") : undefined;
  meta.donor.harvestedAssetCount = donorIntake.harvestedAssetCount;
  meta.donor.failedAssetCount = donorIntake.failedAssetCount;
  meta.donor.packageStatus = donorIntake.packageStatus ?? "unknown";
  meta.donor.packageManifestPath = donorIntake.packageManifestPath ? path.relative(workspaceRoot, donorIntake.packageManifestPath).replace(/\\/g, "/") : undefined;
  meta.donor.packageFamilyCount = donorIntake.packageFamilyCount;
  meta.donor.packageReferencedUrlCount = donorIntake.packageReferencedUrlCount;
  meta.donor.status = donorIntake.status === "blocked"
    ? "blocked"
    : donorIntake.status === "captured"
      ? "planned"
      : meta.donor.status;
  if (donorIntake.status === "captured") {
    meta.notes.provenFacts.push("Initial donor launch HTML and discovered URL inventory were captured into the shared donor pack.");
    if ((donorIntake.harvestedAssetCount ?? 0) > 0) {
      meta.notes.provenFacts.push(`Bounded donor harvest downloaded ${donorIntake.harvestedAssetCount} static assets into the local-only donor pack.`);
    }
    if ((donorIntake.packageFamilyCount ?? 0) > 0) {
      meta.notes.provenFacts.push(`Donor intake generated a bounded package manifest spanning ${donorIntake.packageFamilyCount} asset families and ${donorIntake.packageReferencedUrlCount ?? 0} referenced URLs.`);
    }
  }
  if (donorIntake.status === "blocked" && donorIntake.error) {
    meta.notes.unresolvedQuestions = [...(meta.notes.unresolvedQuestions ?? []), `Why did donor intake fail: ${donorIntake.error}`];
  }
  meta.paths.evidenceRoot = meta.donor.evidenceRoot;
  const resolvedProjectRoot = path.join(workspaceRoot, meta.paths.projectRoot);

  await createProjectScaffold({
    projectRoot: resolvedProjectRoot,
    meta,
    overwrite
  });
  await discoverAndWriteRegistry();

  return {
    projectId: meta.projectId,
    slug: meta.slug,
    displayName: meta.displayName,
    projectRoot: meta.paths.projectRoot,
    projectMetaPath: meta.paths.metaPath,
    donorIntake
  };
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
