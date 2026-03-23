import { promises as fs } from "node:fs";
import path from "node:path";
import { loadWorkspaceSlice, type WorkspaceSliceBundle } from "./workspaceSlice";
import {
  buildPreviewSceneFromEditableProject,
  buildReplayProjectFromEditableProject,
  loadEditableProjectData,
  type EditablePreviewScene,
  type EditableProjectData
} from "../workspace/editableProject";

type JsonValue = null | boolean | number | string | JsonObject | JsonValue[];
type JsonObject = { [key: string]: JsonValue | undefined };

export interface ProjectSliceBundle {
  workspace: WorkspaceSliceBundle;
  selectedProjectId: string;
  project: JsonObject;
  importArtifact: JsonObject | null;
  previewScene: EditablePreviewScene | null;
  editableProject: EditableProjectData | null;
  fixtures: {
    normalSpin: JsonObject;
    freeSpinsTrigger: JsonObject;
    restartRestore: JsonObject;
  };
  runtime: {
    mockedGameState: JsonObject;
    mockedLastAction: JsonObject;
  };
}

const workspaceRoot = path.resolve(__dirname, "../../..");
const replayProjectRoot = path.join(workspaceRoot, "40_projects", "project_001");
const importArtifactPath = path.join(replayProjectRoot, "imports", "mystery-garden-import.json");

export function getProjectSlicePaths(): readonly string[] {
  return [
    path.join(replayProjectRoot, "project.json"),
    importArtifactPath,
    path.join(replayProjectRoot, "fixtures", "normal_spin.json"),
    path.join(replayProjectRoot, "fixtures", "free_spins_trigger.json"),
    path.join(replayProjectRoot, "fixtures", "restart_restore.json"),
    path.join(replayProjectRoot, "runtime", "mock-game-state.json"),
    path.join(replayProjectRoot, "runtime", "mock-last-action.json")
  ];
}

function assertJsonObject(value: unknown, label: string): asserts value is JsonObject {
  if (!value || Array.isArray(value) || typeof value !== "object") {
    throw new Error(`${label} must be a JSON object.`);
  }
}

async function readJsonFile(filePath: string): Promise<JsonObject> {
  const raw = await fs.readFile(filePath, "utf8");
  const parsed: unknown = JSON.parse(raw);
  assertJsonObject(parsed, filePath);
  return parsed;
}

async function readOptionalJsonFile(filePath: string): Promise<JsonObject | null> {
  try {
    return await readJsonFile(filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException | undefined)?.code === "ENOENT") {
      return null;
    }

    throw error;
  }
}

function getObjectArray(value: JsonValue | undefined): JsonObject[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is JsonObject => Boolean(item) && typeof item === "object" && !Array.isArray(item));
}

function assertPreviewAssetsStayInternal(project: JsonObject): void {
  const assets = getObjectArray(project.assets);

  for (const asset of assets) {
    const source = asset.source;
    if (!source || Array.isArray(source) || typeof source !== "object") {
      continue;
    }

    const sourcePath = source.path;
    if (typeof sourcePath === "string" && sourcePath.startsWith("10_donors/")) {
      throw new Error(`Preview asset path must stay internal to project_001: ${sourcePath}`);
    }
  }
}

function resolveSelectedProjectId(workspace: WorkspaceSliceBundle, requestedProjectId?: string): string {
  return requestedProjectId
    ?? workspace.selectedProjectId
    ?? workspace.activeProjectId
    ?? workspace.projects[0]?.projectId
    ?? "project_001";
}

async function loadSelectedEditableProject(workspace: WorkspaceSliceBundle, selectedProjectId: string): Promise<EditableProjectData | null> {
  const selectedProject = workspace.projects.find((entry) => entry.projectId === selectedProjectId);
  if (!selectedProject) {
    return null;
  }

  return loadEditableProjectData(path.join(workspaceRoot, selectedProject.keyPaths.projectRoot));
}

export async function loadProjectSlice(requestedProjectId?: string): Promise<ProjectSliceBundle> {
  const [projectPath, importPath, normalSpinPath, freeSpinsTriggerPath, restartRestorePath, mockedGameStatePath, mockedLastActionPath] = getProjectSlicePaths();
  const [workspace, project, importArtifact, normalSpin, freeSpinsTrigger, restartRestore, mockedGameState, mockedLastAction] = await Promise.all([
    loadWorkspaceSlice(),
    readJsonFile(projectPath),
    readOptionalJsonFile(importPath),
    readJsonFile(normalSpinPath),
    readJsonFile(freeSpinsTriggerPath),
    readJsonFile(restartRestorePath),
    readJsonFile(mockedGameStatePath),
    readJsonFile(mockedLastActionPath)
  ]);

  assertPreviewAssetsStayInternal(project);

  const selectedProjectId = resolveSelectedProjectId(workspace, requestedProjectId);
  const editableProject = await loadSelectedEditableProject(workspace, selectedProjectId);
  const previewScene = editableProject ? buildPreviewSceneFromEditableProject(editableProject) : null;
  const replayProject = editableProject
    ? buildReplayProjectFromEditableProject(project as Parameters<typeof buildReplayProjectFromEditableProject>[0], editableProject)
    : project;

  return {
    workspace,
    selectedProjectId,
    project: replayProject as unknown as JsonObject,
    importArtifact,
    previewScene,
    editableProject,
    fixtures: {
      normalSpin,
      freeSpinsTrigger,
      restartRestore
    },
    runtime: {
      mockedGameState,
      mockedLastAction
    }
  };
}
