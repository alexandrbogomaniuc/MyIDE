import { existsSync, readdirSync } from "fs";
import path from "path";

import { getHandoffRoot, getRepoRoot, git, gitAllowFailure, readJsonFile } from "../publication/shared";

export const PROJECT_001_RELATIVE_PATH = "40_projects/project_001";
export const KNOWN_LOCAL_ONLY_RESET_PATHS = [
  "40_projects/project_001/logs/editor-snapshots",
  "40_projects/project_001/logs/editor-save-history.jsonl"
];

type RegistryProject = {
  projectId: string;
  displayName?: string;
  phase?: string;
  status?: string;
};

type WorkspaceRegistry = {
  activeProjectId?: string;
  projects: RegistryProject[];
};

export function getProject001Root(repoRoot = getRepoRoot()): string {
  return path.join(repoRoot, PROJECT_001_RELATIVE_PATH);
}

export function readWorkspaceRegistry(repoRoot = getRepoRoot()): WorkspaceRegistry {
  return readJsonFile<WorkspaceRegistry>(path.join(repoRoot, "40_projects/registry.json"));
}

export function getValidatedProjectSummary(repoRoot = getRepoRoot()): {
  projectId: string;
  displayName: string;
  phase: string;
  status: string;
} {
  const registry = readWorkspaceRegistry(repoRoot);
  const project =
    registry.projects.find((candidate) => candidate.projectId === "project_001") ??
    registry.projects[0];
  return {
    projectId: project?.projectId ?? "project_001",
    displayName: project?.displayName ?? "Project 001",
    phase: project?.phase ?? "unknown",
    status: project?.status ?? "unknown"
  };
}

export function getCurrentHandoffPaths(repoRoot = getRepoRoot()): {
  bundle: string;
  notes: string;
} {
  const handoffRoot = getHandoffRoot(repoRoot);
  return {
    bundle: path.join(handoffRoot, "CURRENT.bundle"),
    notes: path.join(handoffRoot, "CURRENT_RECOVERY_NOTES.txt")
  };
}

export function describeGap(localHead: string, publicHead: string, aheadCount: number): string {
  if (localHead === publicHead) {
    return "in sync";
  }
  return `ahead by ${aheadCount} commit${aheadCount === 1 ? "" : "s"}`;
}

export function listTrackedProject001PathsAtHead(repoRoot = getRepoRoot()): string[] {
  return git(["ls-tree", "-r", "--name-only", "HEAD", PROJECT_001_RELATIVE_PATH], repoRoot)
    .split("\n")
    .filter(Boolean);
}

export function listUnknownProject001Paths(repoRoot = getRepoRoot()): string[] {
  const output = gitAllowFailure(
    ["ls-files", "--others", "--exclude-standard", PROJECT_001_RELATIVE_PATH],
    repoRoot
  ).stdout;
  return output
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function normalizePorcelainPath(rawPath: string): string {
  if (rawPath.includes(" -> ")) {
    return rawPath.split(" -> ").pop() ?? rawPath;
  }
  return rawPath;
}

export function listDirtyPaths(repoRoot = getRepoRoot()): string[] {
  const output = gitAllowFailure(
    ["status", "--porcelain=v1", "--untracked-files=all"],
    repoRoot
  ).stdout;
  return output
    .split("\n")
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .map((line) => normalizePorcelainPath(line.slice(3).trim()));
}

export function isPathWithinProject001(relativePath: string): boolean {
  return (
    relativePath === PROJECT_001_RELATIVE_PATH ||
    relativePath.startsWith(`${PROJECT_001_RELATIVE_PATH}/`)
  );
}

export function listKnownLogArtifacts(repoRoot = getRepoRoot()): string[] {
  const projectRoot = getProject001Root(repoRoot);
  const logRoot = path.join(projectRoot, "logs");
  if (!existsSync(logRoot)) {
    return [];
  }

  const candidates = [
    path.join(logRoot, "editor-save-history.jsonl"),
    path.join(logRoot, "editor-snapshots")
  ];

  return candidates.filter((candidate) => existsSync(candidate));
}

export function listUnexpectedLogArtifacts(repoRoot = getRepoRoot()): string[] {
  const projectRoot = getProject001Root(repoRoot);
  const logRoot = path.join(projectRoot, "logs");
  if (!existsSync(logRoot)) {
    return [];
  }

  return readdirSync(logRoot)
    .filter((entry) => entry !== "README.md" && entry !== "editor-save-history.jsonl" && entry !== "editor-snapshots")
    .map((entry) => path.join(logRoot, entry));
}
