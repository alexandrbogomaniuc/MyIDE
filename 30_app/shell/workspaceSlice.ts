import { promises as fs } from "node:fs";
import path from "node:path";
import { discoverAndWriteRegistry, isJsonObject, type JsonObject, type JsonValue } from "../workspace/discoverProjects";

type LifecycleStageId =
  | "donorEvidence"
  | "donorReport"
  | "importMapping"
  | "internalReplay"
  | "targetConcept"
  | "targetBuild"
  | "integration"
  | "qa"
  | "releasePrep";

interface WorkspaceLifecycleStage {
  status: string;
  notes?: string;
}

interface WorkspaceLifecycleSummary {
  currentStage: LifecycleStageId;
  stages: Record<LifecycleStageId, WorkspaceLifecycleStage>;
}

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
  lifecycle: WorkspaceLifecycleSummary;
  keyPaths: {
    workspaceRegistryPath: string;
    projectRoot: string;
    projectJsonPath: string;
    projectMetaPath: string;
    donorRoot?: string;
    reportsRoot?: string;
    importsRoot?: string;
    importArtifactPath?: string;
    internalRoot?: string;
    runtimeRoot?: string;
    fixturesRoot?: string;
    targetRoot?: string;
    releaseRoot?: string;
    logsRoot?: string;
  };
  timestamps: {
    createdAt: string;
    updatedAt: string;
    firstValidatedAt?: string;
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
const projectRoot = path.join(workspaceRoot, "40_projects", "project_001");
const projectJsonPath = path.join(projectRoot, "project.json");
const importArtifactPath = path.join(projectRoot, "imports", "mystery-garden-import.json");

async function readJsonObject(filePath: string): Promise<JsonObject> {
  const raw = await fs.readFile(filePath, "utf8");
  const parsed: unknown = JSON.parse(raw);
  if (!isJsonObject(parsed)) {
    throw new Error(`${filePath} must contain a JSON object.`);
  }

  return parsed;
}

function asString(value: JsonValue | undefined, fallback: string): string {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function asOptionalString(value: JsonValue | undefined): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function toStringArray(value: JsonValue | undefined): readonly string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is string => typeof entry === "string" && entry.length > 0);
}

function getObject(value: JsonValue | undefined): JsonObject {
  return isJsonObject(value) ? value : {};
}

function normalizeLifecycle(entry: JsonObject): WorkspaceLifecycleSummary {
  const lifecycle = getObject(entry.lifecycle);
  const stages = getObject(lifecycle.stages);

  return {
    currentStage: asString(lifecycle.currentStage, "donorEvidence") as LifecycleStageId,
    stages: {
      donorEvidence: {
        status: asString(getObject(stages.donorEvidence).status, "planned"),
        notes: asOptionalString(getObject(stages.donorEvidence).notes)
      },
      donorReport: {
        status: asString(getObject(stages.donorReport).status, "planned"),
        notes: asOptionalString(getObject(stages.donorReport).notes)
      },
      importMapping: {
        status: asString(getObject(stages.importMapping).status, "planned"),
        notes: asOptionalString(getObject(stages.importMapping).notes)
      },
      internalReplay: {
        status: asString(getObject(stages.internalReplay).status, "planned"),
        notes: asOptionalString(getObject(stages.internalReplay).notes)
      },
      targetConcept: {
        status: asString(getObject(stages.targetConcept).status, "planned"),
        notes: asOptionalString(getObject(stages.targetConcept).notes)
      },
      targetBuild: {
        status: asString(getObject(stages.targetBuild).status, "deferred"),
        notes: asOptionalString(getObject(stages.targetBuild).notes)
      },
      integration: {
        status: asString(getObject(stages.integration).status, "deferred"),
        notes: asOptionalString(getObject(stages.integration).notes)
      },
      qa: {
        status: asString(getObject(stages.qa).status, "deferred"),
        notes: asOptionalString(getObject(stages.qa).notes)
      },
      releasePrep: {
        status: asString(getObject(stages.releasePrep).status, "deferred"),
        notes: asOptionalString(getObject(stages.releasePrep).notes)
      }
    }
  };
}

function buildFallbackProject(project: JsonObject): WorkspaceProjectSummary {
  const provenance = getObject(project.provenance);
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
        "Additional donor-backed projects may be added later."
      ]
    },
    phase: "PHASE 3",
    verificationStatus: "verified-replay-slice",
    verificationChecks: ["import:mystery-garden", "validate:project_001", "assert:replay"],
    lifecycle: {
      currentStage: "internalReplay",
      stages: {
        donorEvidence: {
          status: "verified",
          notes: "Mystery Garden evidence pack exists and is indexed."
        },
        donorReport: {
          status: "verified",
          notes: "Evidence-backed donor report exists."
        },
        importMapping: {
          status: "verified",
          notes: "Importer manifest and mapping exist."
        },
        internalReplay: {
          status: "verified",
          notes: "Validated internal replay slice exists."
        },
        targetConcept: {
          status: "planned",
          notes: "Future resulting game direction is not validated yet."
        },
        targetBuild: {
          status: "deferred",
          notes: "Resulting game build work is deferred."
        },
        integration: {
          status: "deferred",
          notes: "Production integration remains deferred."
        },
        qa: {
          status: "planned",
          notes: "Broader QA remains a later phase."
        },
        releasePrep: {
          status: "deferred",
          notes: "Release preparation is not started."
        }
      }
    },
    keyPaths: {
      workspaceRegistryPath: "40_projects/registry.json",
      projectRoot: "40_projects/project_001",
      projectJsonPath: "40_projects/project_001/project.json",
      projectMetaPath: "40_projects/project_001/project.meta.json",
      donorRoot: "40_projects/project_001/donor",
      reportsRoot: "40_projects/project_001/reports",
      importsRoot: "40_projects/project_001/imports",
      importArtifactPath: "40_projects/project_001/imports/mystery-garden-import.json",
      internalRoot: "40_projects/project_001/internal",
      runtimeRoot: "40_projects/project_001/runtime",
      fixturesRoot: "40_projects/project_001/fixtures",
      targetRoot: "40_projects/project_001/target",
      releaseRoot: "40_projects/project_001/release",
      logsRoot: "40_projects/project_001/logs"
    },
    timestamps: {
      createdAt: "2026-03-20T00:00:00Z",
      updatedAt: "2026-03-20T11:08:03Z",
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
      assumptions,
      unresolvedQuestions: todo
    }
  };
}

function normalizeProjectMeta(entry: JsonObject, index: number): WorkspaceProjectSummary {
  const donor = getObject(entry.donor);
  const targetGame = getObject(entry.targetGame);
  const verification = getObject(entry.verification);
  const paths = getObject(entry.paths);
  const timestamps = getObject(entry.timestamps);
  const notes = getObject(entry.notes);
  const fallbackProjectRoot = `40_projects/${asString(entry.projectId, `project_${String(index + 1).padStart(3, "0")}`)}`;

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
      displayName: asString(targetGame.displayName, "Target game pending"),
      family: asString(targetGame.gameFamily, asString(targetGame.family, "slot")),
      relationship: asString(targetGame.relationship, "future-target"),
      status: asString(targetGame.status, "planned"),
      notes: asString(targetGame.notes, "Target/resulting game summary pending."),
      provenNotes: toStringArray(targetGame.provenNotes),
      plannedNotes: toStringArray(targetGame.plannedNotes)
    },
    phase: asString(entry.phase, "PHASE 4"),
    verificationStatus: asString(verification.status, "planned"),
    verificationChecks: toStringArray(verification.checks),
    lifecycle: normalizeLifecycle(entry),
    keyPaths: {
      workspaceRegistryPath: asString(paths.registryPath, "40_projects/registry.json"),
      projectRoot: asString(paths.projectRoot, fallbackProjectRoot),
      projectJsonPath: asString(paths.projectJson, `${fallbackProjectRoot}/project.json`),
      projectMetaPath: asString(paths.metaPath, `${fallbackProjectRoot}/project.meta.json`),
      donorRoot: asOptionalString(paths.donorRoot),
      reportsRoot: asOptionalString(paths.reportsRoot),
      importsRoot: asOptionalString(paths.importsRoot),
      importArtifactPath: asOptionalString(paths.importPath),
      internalRoot: asOptionalString(paths.internalRoot),
      runtimeRoot: asOptionalString(paths.runtimeRoot),
      fixturesRoot: asOptionalString(paths.fixturesRoot),
      targetRoot: asOptionalString(paths.targetRoot),
      releaseRoot: asOptionalString(paths.releaseRoot),
      logsRoot: asOptionalString(paths.logsRoot)
    },
    timestamps: {
      createdAt: asString(timestamps.createdAt, "2026-03-20T00:00:00Z"),
      updatedAt: asString(timestamps.updatedAt, "2026-03-20T00:00:00Z"),
      firstValidatedAt: asOptionalString(timestamps.firstValidatedAt) ?? asOptionalString(verification.lastVerifiedAt)
    },
    notes: {
      proven: toStringArray(notes.provenFacts),
      planned: toStringArray(notes.plannedWork),
      assumptions: toStringArray(notes.assumptions),
      unresolvedQuestions: toStringArray(notes.unresolvedQuestions)
    }
  };
}

async function loadDiscoveredWorkspace(): Promise<WorkspaceSliceBundle> {
  const registry = await discoverAndWriteRegistry();
  const projects = registry.projects.filter(isJsonObject).map((entry, index) => normalizeProjectMeta(entry, index));

  return {
    schemaVersion: registry.schemaVersion,
    workspaceId: registry.workspaceId,
    displayName: registry.displayName,
    description: registry.description,
    implementationScope: registry.implementationScope,
    activeProjectId: registry.activeProjectId,
    registryPath: "40_projects/registry.json",
    notes: registry.notes,
    source: {
      registryFound: true,
      note: "Discovered project folders under 40_projects/ and refreshed registry.json as a derived cache."
    },
    selectedProjectId: registry.activeProjectId,
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
      "No discoverable project.meta.json folders were available, so the workspace fell back to project_001."
    ],
    source: {
      registryFound: false,
      note: "No discoverable project.meta.json files were available, so the browser is synthesized from the validated Mystery Garden slice."
    },
    selectedProjectId: fallbackProject.projectId,
    projects: [fallbackProject]
  };
}

export async function loadWorkspaceSlice(): Promise<WorkspaceSliceBundle> {
  try {
    return await loadDiscoveredWorkspace();
  } catch {
    return buildFallbackWorkspace();
  }
}
