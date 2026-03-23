import { execFileSync, spawnSync } from "child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync
} from "fs";
import path from "path";

export type CommitInfo = {
  sha: string;
  message: string;
};

export type PublicArtifactState = {
  label: string;
  url: string;
  localPath: string;
  localSummary: string;
  publicSummary: string;
  matchesLocal: boolean;
};

export type PublicationState = {
  generatedAtUtc: string;
  repoRoot: string;
  handoffRoot: string;
  localHead: string;
  localHeadMessage: string;
  branchSummary: string;
  remoteSummary: string;
  statusShort: string;
  localPhase: string;
  publicHead: string;
  unpublishedCommits: CommitInfo[];
  publicArtifacts: PublicArtifactState[];
  publicReadmeMatchesLocalPhase: boolean;
  publicRegistryMatchesLocalPhase: boolean;
  publicPackageHasAllLiveShellScripts: boolean;
  publicShellReadmeMentionsUndoRedoScope: boolean;
  publicPackageMissingLiveShellScripts: string[];
};

type PackageJson = {
  scripts?: Record<string, string>;
};

const RAW_URLS = {
  readme: "https://raw.githubusercontent.com/alexandrbogomaniuc/MyIDE/main/README.md",
  registry:
    "https://raw.githubusercontent.com/alexandrbogomaniuc/MyIDE/main/40_projects/registry.json",
  shellReadme:
    "https://raw.githubusercontent.com/alexandrbogomaniuc/MyIDE/main/30_app/shell/README.md",
  packageJson: "https://raw.githubusercontent.com/alexandrbogomaniuc/MyIDE/main/package.json"
} as const;

function findRepoRoot(startDir: string): string {
  let current = path.resolve(startDir);
  while (true) {
    if (
      existsSync(path.join(current, "package.json")) &&
      existsSync(path.join(current, "00_control")) &&
      existsSync(path.join(current, "40_projects"))
    ) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      throw new Error(`Could not resolve MyIDE repo root from ${startDir}`);
    }
    current = parent;
  }
}

export function getRepoRoot(): string {
  return findRepoRoot(__dirname);
}

export function getHandoffRoot(repoRoot = getRepoRoot()): string {
  return path.resolve(repoRoot, "../MyIDE_handoff");
}

export function readText(filePath: string): string {
  return readFileSync(filePath, "utf8");
}

export function writeText(filePath: string, contents: string): void {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, contents, "utf8");
}

export function formatPhaseLabel(phase: string): string {
  return phase.replace(/\s+/g, "");
}

export function readJsonFile<T>(filePath: string): T {
  return JSON.parse(readText(filePath)) as T;
}

export function git(args: string[], repoRoot = getRepoRoot()): string {
  return execFileSync("git", ["-C", repoRoot, ...args], {
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024
  }).trim();
}

export function gitAllowFailure(
  args: string[],
  repoRoot = getRepoRoot()
): { status: number | null; stdout: string; stderr: string } {
  const result = spawnSync("git", ["-C", repoRoot, ...args], {
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024
  });
  return {
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? ""
  };
}

export async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "MyIDE-Publication-Tooling"
    }
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }
  return response.text();
}

function extractPhaseFromReadme(text: string): string {
  const match = text.match(/PHASE [0-9A-Z]+/);
  return match ? match[0] : "unknown";
}

function readLocalPhase(repoRoot: string): string {
  const registry = readJsonFile<{
    projects: Array<{ projectId: string; phase?: string }>;
  }>(path.join(repoRoot, "40_projects/registry.json"));
  return (
    registry.projects.find((project) => project.projectId === "project_001")?.phase ?? "unknown"
  );
}

function summarizePackageScripts(packageJsonText: string): {
  present: string[];
  missing: string[];
} {
  const localPackage = readJsonFile<PackageJson>(path.join(getRepoRoot(), "package.json"));
  const publicPackage = JSON.parse(packageJsonText) as PackageJson;
  const localLiveShellScripts = Object.keys(localPackage.scripts ?? {}).filter((script) =>
    script.startsWith("smoke:electron-live-")
  );
  const publicScripts = publicPackage.scripts ?? {};
  const present = localLiveShellScripts.filter((script) => script in publicScripts);
  const missing = localLiveShellScripts.filter((script) => !(script in publicScripts));
  return { present, missing };
}

function compareTextSummary(localText: string, publicText: string): boolean {
  return localText === publicText;
}

export async function collectPublicationState(): Promise<PublicationState> {
  const repoRoot = getRepoRoot();
  const handoffRoot = getHandoffRoot(repoRoot);
  const localHead = git(["rev-parse", "HEAD"], repoRoot);
  const localHeadMessage = git(["log", "-1", "--pretty=%s"], repoRoot);
  const branchSummary = git(["branch", "-vv"], repoRoot);
  const remoteSummary = git(["remote", "-v"], repoRoot);
  const statusShort = gitAllowFailure(["status", "--short"], repoRoot).stdout.trim();
  const publicHead = git(["ls-remote", "origin", "HEAD"], repoRoot).split(/\s+/)[0] ?? "unknown";
  const unpublishedLines = git(["log", "--format=%H\t%s", `${publicHead}..HEAD`], repoRoot)
    .split("\n")
    .filter(Boolean);
  const unpublishedCommits = unpublishedLines.map((line) => {
    const [sha, ...messageParts] = line.split("\t");
    return {
      sha,
      message: messageParts.join("\t")
    };
  });

  const [publicReadme, publicRegistry, publicShellReadme, publicPackageJson] = await Promise.all([
    fetchText(RAW_URLS.readme),
    fetchText(RAW_URLS.registry),
    fetchText(RAW_URLS.shellReadme),
    fetchText(RAW_URLS.packageJson)
  ]);

  const localReadmePath = path.join(repoRoot, "README.md");
  const localRegistryPath = path.join(repoRoot, "40_projects/registry.json");
  const localShellReadmePath = path.join(repoRoot, "30_app/shell/README.md");
  const localPackageJsonPath = path.join(repoRoot, "package.json");

  const localReadme = readText(localReadmePath);
  const localRegistry = readText(localRegistryPath);
  const localShellReadme = readText(localShellReadmePath);
  const localPackageJson = readText(localPackageJsonPath);
  const localPhase = readLocalPhase(repoRoot);
  const localShellReadmeHasUndoRedo = localShellReadme.includes("live-undo-redo");
  const publicReadmePhase = extractPhaseFromReadme(publicReadme);
  const publicRegistryPhase =
    (JSON.parse(publicRegistry) as { projects?: Array<{ projectId: string; phase?: string }> })
      .projects?.find((project) => project.projectId === "project_001")?.phase ?? "unknown";
  const publicShellReadmeHasUndoRedo = publicShellReadme.includes("live-undo-redo");
  const packageScripts = summarizePackageScripts(publicPackageJson);

  const publicArtifacts: PublicArtifactState[] = [
    {
      label: "README",
      url: RAW_URLS.readme,
      localPath: "README.md",
      localSummary: `Local phase ${localPhase}`,
      publicSummary: `Public phase ${publicReadmePhase}`,
      matchesLocal: publicReadme.includes(localPhase)
    },
    {
      label: "Registry",
      url: RAW_URLS.registry,
      localPath: "40_projects/registry.json",
      localSummary: `Local project_001 phase ${localPhase}`,
      publicSummary: `Public project_001 phase ${publicRegistryPhase}`,
      matchesLocal: publicRegistryPhase === localPhase
    },
    {
      label: "Shell README",
      url: RAW_URLS.shellReadme,
      localPath: "30_app/shell/README.md",
      localSummary: localShellReadmeHasUndoRedo
        ? "Local shell README includes live undo/redo scope"
        : "Local shell README stops before live undo/redo scope",
      publicSummary: publicShellReadmeHasUndoRedo
        ? "Public shell README includes live undo/redo scope"
        : "Public shell README stops before live undo/redo scope",
      matchesLocal: compareTextSummary(localShellReadme, publicShellReadme)
    },
    {
      label: "package.json",
      url: RAW_URLS.packageJson,
      localPath: "package.json",
      localSummary: "Local package includes all live-shell smoke scripts",
      publicSummary:
        packageScripts.missing.length === 0
          ? "Public package includes all live-shell smoke scripts"
          : `Public package missing ${packageScripts.missing.join(", ")}`,
      matchesLocal: compareTextSummary(localPackageJson, publicPackageJson)
    }
  ];

  return {
    generatedAtUtc: new Date().toISOString(),
    repoRoot,
    handoffRoot,
    localHead,
    localHeadMessage,
    branchSummary,
    remoteSummary,
    statusShort,
    localPhase,
    publicHead,
    unpublishedCommits,
    publicArtifacts,
    publicReadmeMatchesLocalPhase: publicReadme.includes(localPhase),
    publicRegistryMatchesLocalPhase: publicRegistryPhase === localPhase,
    publicPackageHasAllLiveShellScripts: packageScripts.missing.length === 0,
    publicShellReadmeMentionsUndoRedoScope: publicShellReadmeHasUndoRedo,
    publicPackageMissingLiveShellScripts: packageScripts.missing
  };
}

export function renderGapMarkdown(state: PublicationState): string {
  const commitLines =
    state.unpublishedCommits.length === 0
      ? "- None."
      : state.unpublishedCommits
          .map((commit) => `- \`${commit.sha}\` ${commit.message}`)
          .join("\n");

  const artifactRows = state.publicArtifacts
    .map(
      (artifact) =>
        `| ${artifact.label} | ${artifact.localSummary} | ${artifact.publicSummary} | ${
          artifact.matchesLocal ? "yes" : "no"
        } |`
    )
    .join("\n");

  return `# Local/Public Gap

Generated by \`npm run publication:compare\` on ${state.generatedAtUtc}.

This file is a tracked snapshot of the last measured local/public gap. Refresh it with \`npm run publication:compare\` whenever local commits or public publication state changes.

## Summary
- Local HEAD: \`${state.localHead}\`
- Public origin/main HEAD: \`${state.publicHead}\`
- Current local phase: \`${state.localPhase}\`
- Unpublished commit count: \`${state.unpublishedCommits.length}\`
- Public README reflects local phase: ${state.publicReadmeMatchesLocalPhase ? "yes" : "no"}
- Public registry reflects local phase: ${state.publicRegistryMatchesLocalPhase ? "yes" : "no"}
- Public shell README mentions live undo/redo scope: ${
    state.publicShellReadmeMentionsUndoRedoScope ? "yes" : "no"
  }
- Public package includes all local live-shell smoke scripts: ${
    state.publicPackageHasAllLiveShellScripts ? "yes" : "no"
  }

## Unpublished Commits
${commitLines}

## Public Artifact Checks
| Artifact | Local signal | Public signal | Matches local? |
| --- | --- | --- | --- |
${artifactRows}

## Verification URLs
- ${RAW_URLS.readme}
- ${RAW_URLS.registry}
- ${RAW_URLS.shellReadme}
- ${RAW_URLS.packageJson}
`;
}

export function ensureHandoffRoot(handoffRoot = getHandoffRoot()): void {
  mkdirSync(handoffRoot, { recursive: true });
}

export function latestPhaseHandoffPrefix(state: PublicationState): string {
  return `${formatPhaseLabel(state.localPhase)}_or_later`;
}

export function bundleVerify(bundlePath: string, repoRoot = getRepoRoot()): string {
  const result = spawnSync("git", ["-C", repoRoot, "bundle", "verify", bundlePath], {
    encoding: "utf8"
  });
  const combined = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
  if (result.status !== 0) {
    throw new Error(combined || `git bundle verify failed for ${bundlePath}`);
  }
  return combined;
}

export function fileSizeIsNonZero(filePath: string): boolean {
  return existsSync(filePath) && statSync(filePath).size > 0;
}

export function copyToCurrentVariant(sourcePath: string, currentPath: string): void {
  copyFileSync(sourcePath, currentPath);
}

export function verificationUrls(): string[] {
  return [RAW_URLS.readme, RAW_URLS.registry, RAW_URLS.shellReadme, RAW_URLS.packageJson];
}
