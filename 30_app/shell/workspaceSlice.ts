import { promises as fs } from "node:fs";
import path from "node:path";

type JsonValue = null | boolean | number | string | JsonObject | JsonValue[];
type JsonObject = { [key: string]: JsonValue };

export interface WorkspaceProjectSummary {
  projectId: string;
  slug: string;
  displayName: string;
  gameFamily: string;
  implementationScope: string;
  status: string;
  donor: {
    donorId: string;
    donorName: string;
    evidenceRoot: string;
    captureSessions: readonly string[];
    evidenceRefs: readonly string[];
    status: string;
    notes: string;
  };
  targetGame: {
    id: string;
    displayName: string;
    family: string;
    relationship: string;
    status: string;
    notes: string;
    provenNotes: readonly string[];
    plannedNotes: readonly string[];
  };
  phase: string;
  verificationStatus: string;
  verificationChecks: readonly string[];
  keyPaths: {
    workspaceRegistryPath: string;
    projectRoot: string;
    projectJsonPath: string;
    projectMetaPath: string;
    importArtifactPath: string;
    runtimeRoot: string;
    fixturesRoot: string;
    logsRoot: string;
  };
  timestamps: {
    createdAt: string;
    updatedAt: string;
    firstValidatedAt: string;
  };
  notes: {
    proven: readonly string[];
    planned: readonly string[];
    assumptions: readonly string[];
    unresolvedQuestions: readonly string[];
  };
}

export interface WorkspaceSliceBundle {
  schemaVersion: string;
  workspaceId: string;
  displayName: string;
  description: string;
  implementationScope: string;
  activeProjectId: string;
  registryPath: string;
  notes: readonly string[];
  source: {
    registryFound: boolean;
    note: string;
  };
  selectedProjectId: string;
  projects: readonly WorkspaceProjectSummary[];
}

const workspaceRoot = path.resolve(__dirname, "../../..");
const registryPath = path.join(workspaceRoot, "40_projects", "registry.json");
const projectRoot = path.join(workspaceRoot, "40_projects", "project_001");
const projectJsonPath = path.join(projectRoot, "project.json");
const projectMetaPath = path.join(projectRoot, "project.meta.json");
const importArtifactPath = path.join(projectRoot, "imports", "mystery-garden-import.json");

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

async function tryReadJsonObject(filePath: string): Promise<JsonObject | null> {
  try {
    return await readJsonObject(filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }

    throw error;
  }
}

function asString(value: JsonValue | undefined, fallback: string): string {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function toStringArray(value: JsonValue | undefined): readonly string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is string => typeof entry === "string" && entry.length > 0);
}

function buildFallbackProject(project: JsonObject): WorkspaceProjectSummary {
  const provenance = isJsonObject(project.provenance) ? project.provenance : {};
  const assumptions = toStringArray(provenance.assumptions);
  const todo = toStringArray(provenance.todo);

  return {
    projectId: asString(project.projectId, "project_001"),
    slug: asString(project.slug, "mystery-garden"),
    displayName: asString(project.name, "Mystery Garden Replay Slice"),
    gameFamily: "slot",
    implementationScope: "slot-first",
    status: "validated",
    donor: {
      donorId: asString(provenance.primaryDonorId, "donor_001_mystery_garden"),
      donorName: "Mystery Garden",
      evidenceRoot: "10_donors/donor_001_mystery_garden/evidence",
      captureSessions: ["MG-CS-20260320-WEB-A", "MG-CS-20260320-LIVE-A"],
      evidenceRefs: [
        "MG-EV-20260320-WEB-A-001",
        "MG-EV-20260320-WEB-A-002",
        "MG-EV-20260320-WEB-A-003",
        "MG-EV-20260320-WEB-A-004",
        "MG-EV-20260320-WEB-A-005",
        "MG-EV-20260320-WEB-A-006",
        "MG-EV-20260320-WEB-A-007",
        "MG-EV-20260320-WEB-A-008",
        "MG-EV-20260320-LIVE-A-001",
        "MG-EV-20260320-LIVE-A-002",
        "MG-EV-20260320-LIVE-A-003",
        "MG-EV-20260320-LIVE-A-004",
        "MG-EV-20260320-LIVE-A-005",
        "MG-EV-20260320-LIVE-A-006"
      ],
      status: "proven",
      notes: "Only validated donor slice currently present in the workspace."
    },
    targetGame: {
      id: "target.mystery-garden.replay-slice",
      displayName: "Mystery Garden Replay Slice",
      family: "slot",
      relationship: "reconstruction-target",
      status: "validated",
      notes: "Validated internal slice only; not the final resulting game.",
      provenNotes: [
        "Internal replay runs from clean project data only.",
        "The donor-to-replay path is verified without production integration."
      ],
      plannedNotes: [
        "Future reskinning is deferred.",
        "Additional donor slices may be added later."
      ]
    },
    phase: "PHASE 3",
    verificationStatus: "verified-replay-slice",
    verificationChecks: ["import:mystery-garden", "validate:project_001", "assert:replay"],
    keyPaths: {
      workspaceRegistryPath: "40_projects/registry.json",
      projectRoot: "40_projects/project_001",
      projectJsonPath: "40_projects/project_001/project.json",
      projectMetaPath: "40_projects/project_001/project.meta.json",
      importArtifactPath: "40_projects/project_001/imports/mystery-garden-import.json",
      runtimeRoot: "40_projects/project_001/runtime",
      fixturesRoot: "40_projects/project_001/fixtures",
      logsRoot: "40_projects/project_001/logs"
    },
    timestamps: {
      createdAt: "2026-03-20T00:00:00Z",
      updatedAt: "2026-03-20T10:32:56Z",
      firstValidatedAt: "2026-03-20T10:32:56Z"
    },
    notes: {
      proven: [
        "MyIDE has one validated donor-backed slot slice.",
        "The replay slice uses internal project data only."
      ],
      planned: [
        "Add more donor-backed projects over time.",
        "Keep future result games explicit and evidence-linked."
      ],
      assumptions: [
        "Workspace listing can stay file-backed until more projects exist."
      ],
      unresolvedQuestions: [
        "How many project entries the shell should show before pagination becomes necessary."
      ]
    }
  };
}

function normalizeRegistryProject(entry: JsonObject, index: number): WorkspaceProjectSummary {
  const donor = isJsonObject(entry.donor) ? entry.donor : {};
  const targetGame = isJsonObject(entry.targetGame) ? entry.targetGame : {};
  const verification = isJsonObject(entry.verification) ? entry.verification : {};
  const paths = isJsonObject(entry.paths) ? entry.paths : {};
  const timestamps = isJsonObject(entry.timestamps) ? entry.timestamps : {};
  const notes = isJsonObject(entry.notes) ? entry.notes : {};

  return {
    projectId: asString(entry.projectId, `project_${String(index + 1).padStart(3, "0")}`),
    slug: asString(entry.slug, `project-${index + 1}`),
    displayName: asString(entry.displayName, asString(entry.projectName, `Project ${index + 1}`)),
    gameFamily: asString(entry.gameFamily, "slot"),
    implementationScope: asString(entry.implementationScope, "slot-first"),
    status: asString(entry.status, "planned"),
    donor: {
      donorId: asString(donor.donorId, "unknown-donor"),
      donorName: asString(donor.donorName, "Unknown donor"),
      evidenceRoot: asString(donor.evidenceRoot, "10_donors"),
      captureSessions: toStringArray(donor.captureSessions),
      evidenceRefs: toStringArray(donor.evidenceRefs),
      status: asString(donor.status, "unknown"),
      notes: asString(donor.notes, "")
    },
    targetGame: {
      id: asString(targetGame.targetGameId, asString(targetGame.id, `target.${String(index + 1).padStart(3, "0")}`)),
      displayName: asString(targetGame.displayName, asString(targetGame.name, "Target game pending")),
      family: asString(targetGame.gameFamily, asString(targetGame.family, "slot")),
      relationship: asString(targetGame.relationship, "reconstruction-target"),
      status: asString(targetGame.status, "planned"),
      notes: asString(targetGame.notes, "Target/resulting game summary pending registry normalization."),
      provenNotes: toStringArray(targetGame.provenNotes),
      plannedNotes: toStringArray(targetGame.plannedNotes)
    },
    phase: asString(entry.phase, "PHASE 3"),
    verificationStatus: asString(verification.status, "planned"),
    verificationChecks: toStringArray(verification.checks),
    keyPaths: {
      workspaceRegistryPath: asString(paths.registryPath, "40_projects/registry.json"),
      projectRoot: asString(paths.projectRoot, `40_projects/${asString(entry.projectId, `project_${index + 1}`)}`),
      projectJsonPath: asString(paths.projectJson, `40_projects/${asString(entry.projectId, `project_${index + 1}`)}/project.json`),
      projectMetaPath: asString(paths.metaPath, `40_projects/${asString(entry.projectId, `project_${index + 1}`)}/project.meta.json`),
      importArtifactPath: asString(paths.importPath, `40_projects/${asString(entry.projectId, `project_${index + 1}`)}/imports/project-import.json`),
      runtimeRoot: asString(paths.runtimeRoot, `40_projects/${asString(entry.projectId, `project_${index + 1}`)}/runtime`),
      fixturesRoot: asString(paths.fixturesRoot, `40_projects/${asString(entry.projectId, `project_${index + 1}`)}/fixtures`),
      logsRoot: asString(paths.logsRoot, `40_projects/${asString(entry.projectId, `project_${index + 1}`)}/logs`)
    },
    timestamps: {
      createdAt: asString(timestamps.createdAt, "2026-03-20T00:00:00Z"),
      updatedAt: asString(timestamps.updatedAt, "2026-03-20T00:00:00Z"),
      firstValidatedAt: asString(timestamps.firstValidatedAt, asString(verification.lastVerifiedAt, "2026-03-20T00:00:00Z"))
    },
    notes: {
      proven: toStringArray(notes.provenFacts),
      planned: toStringArray(notes.plannedWork),
      assumptions: toStringArray(notes.assumptions),
      unresolvedQuestions: toStringArray(notes.unresolvedQuestions)
    }
  };
}

async function loadRegistryFromDisk(): Promise<WorkspaceSliceBundle | null> {
  const registry = await tryReadJsonObject(registryPath);
  if (!registry || !Array.isArray(registry.projects)) {
    return null;
  }

  const projects = registry.projects.filter(isJsonObject).map((entry, index) => normalizeRegistryProject(entry, index));
  if (projects.length === 0) {
    return null;
  }

  return {
    schemaVersion: asString(registry.schemaVersion, "0.1.0"),
    workspaceId: asString(registry.workspaceId, "workspace.myide"),
    displayName: asString(registry.displayName, "MyIDE Workspace"),
    description: asString(registry.description, "Universal multi-project workspace with slot-first implementation slices."),
    implementationScope: asString(registry.implementationScope, "universal-local-first"),
    activeProjectId: asString(registry.activeProjectId, projects[0].projectId),
    registryPath: "40_projects/registry.json",
    notes: toStringArray(registry.notes),
    source: {
      registryFound: true,
      note: "Loaded from workspace registry."
    },
    selectedProjectId: asString(registry.activeProjectId, projects[0].projectId),
    projects
  };
}

async function buildFallbackWorkspace(): Promise<WorkspaceSliceBundle> {
  const project = await readJsonObject(projectJsonPath);
  await readJsonObject(importArtifactPath);

  const fallbackProject = buildFallbackProject(project);

  return {
    schemaVersion: "0.1.0",
    workspaceId: "workspace.myide",
    displayName: "MyIDE Workspace",
    description: "Universal multi-project workspace with one validated slot-first slice so far.",
    implementationScope: "universal-local-first",
    activeProjectId: fallbackProject.projectId,
    registryPath: "40_projects/registry.json",
    notes: [
      "MyIDE is a universal local-first IDE with a slot-first implementation slice.",
      "Only Mystery Garden is validated so far."
    ],
    source: {
      registryFound: false,
      note: "registry.json is not present yet, so the browser is synthesized from the validated Mystery Garden slice."
    },
    selectedProjectId: fallbackProject.projectId,
    projects: [fallbackProject]
  };
}

export async function loadWorkspaceSlice(): Promise<WorkspaceSliceBundle> {
  return (await loadRegistryFromDisk()) ?? buildFallbackWorkspace();
}
