import { existsSync, readdirSync } from "fs";
import path from "path";

import { getHandoffRoot, getRepoRoot, git, gitAllowFailure, readJsonFile } from "../publication/shared";

export const PROJECT_001_RELATIVE_PATH = "40_projects/project_001";
export const MANUAL_REPORTS_ROOT_NAME = "MyIDE_manual_reports";
export const KNOWN_LOCAL_ONLY_RESET_PATHS = [
  "40_projects/project_001/logs/editor-snapshots",
  "40_projects/project_001/logs/editor-save-history.jsonl"
];

export type DirtyPathEntry = {
  status: string;
  relativePath: string;
};

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

export function getManualReportsRoot(repoRoot = getRepoRoot()): string {
  return path.resolve(repoRoot, `../${MANUAL_REPORTS_ROOT_NAME}`);
}

export function tryResolvePublicHead(repoRoot = getRepoRoot()): string {
  const lsRemote = gitAllowFailure(["ls-remote", "origin", "HEAD"], repoRoot);
  if (lsRemote.status === 0 && lsRemote.stdout.trim().length > 0) {
    return lsRemote.stdout.trim().split(/\s+/)[0] ?? "unavailable";
  }

  const cachedRemote = gitAllowFailure(["rev-parse", "origin/main"], repoRoot);
  if (cachedRemote.status === 0 && cachedRemote.stdout.trim().length > 0) {
    return `${cachedRemote.stdout.trim()} (cached origin/main)`;
  }

  return "unavailable";
}

export function describeGap(localHead: string, publicHead: string, aheadCount: number): string {
  if (localHead === publicHead) {
    return "in sync";
  }
  return `ahead by ${aheadCount} commit${aheadCount === 1 ? "" : "s"}`;
}

export function getManualContext(repoRoot = getRepoRoot()): {
  localHead: string;
  publicHead: string;
  localPhase: string;
  gapSummary: string;
  aheadCount: number;
  validatedProject: {
    projectId: string;
    displayName: string;
    phase: string;
    status: string;
  };
  handoff: {
    bundle: string;
    notes: string;
  };
} {
  const localHead = git(["rev-parse", "HEAD"], repoRoot);
  const validatedProject = getValidatedProjectSummary(repoRoot);
  const publicHead = tryResolvePublicHead(repoRoot);
  const aheadCount =
    publicHead !== "unavailable" && !publicHead.endsWith("(cached origin/main)")
      ? Number.parseInt(git(["rev-list", "--count", `${publicHead}..HEAD`], repoRoot), 10)
      : 0;
  const gapSummary =
    publicHead === "unavailable" || publicHead.endsWith("(cached origin/main)")
      ? "public HEAD unavailable"
      : describeGap(localHead, publicHead, aheadCount);

  return {
    localHead,
    publicHead,
    localPhase: validatedProject.phase,
    gapSummary,
    aheadCount,
    validatedProject,
    handoff: getCurrentHandoffPaths(repoRoot)
  };
}

export function formatManualBugContext(
  context: ReturnType<typeof getManualContext>,
  timestampUtc = new Date().toISOString()
): string {
  return [
    "Manual bug context",
    `Date/time: ${timestampUtc}`,
    `Local commit SHA: ${context.localHead}`,
    `Local phase: ${context.localPhase}`,
    `Public/main SHA: ${context.publicHead}`,
    `Local/public status: ${context.gapSummary}`,
    `Validated project: ${context.validatedProject.projectId} (${context.validatedProject.displayName})`,
    `Validated project status: ${context.validatedProject.status}`,
    `Handoff bundle: ${existsSync(context.handoff.bundle) ? context.handoff.bundle : "missing CURRENT.bundle"}`,
    `Handoff notes: ${existsSync(context.handoff.notes) ? context.handoff.notes : "missing CURRENT_RECOVERY_NOTES.txt"}`
  ].join("\n");
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

export function listDirtyEntries(repoRoot = getRepoRoot()): DirtyPathEntry[] {
  const output = gitAllowFailure(
    ["status", "--porcelain=v1", "--untracked-files=all"],
    repoRoot
  ).stdout;
  return output
    .split("\n")
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .map((line) => ({
      status: line.slice(0, 2),
      relativePath: normalizePorcelainPath(line.slice(3).trim())
    }));
}

export function listDirtyPaths(repoRoot = getRepoRoot()): string[] {
  return listDirtyEntries(repoRoot).map((entry) => entry.relativePath);
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
