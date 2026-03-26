import { createHash } from "crypto";
import { existsSync } from "fs";
import path from "path";

import { getManualContext } from "../manual/shared";
import {
  PublicationState,
  collectPublicationState,
  getRepoRoot,
  readJsonFile,
  readText,
  renderGapMarkdown,
  writeText
} from "../publication/shared";

type PackageJson = {
  scripts?: Record<string, string>;
};

type CommandGroups = {
  manualQa: string[];
  vabs: string[];
  publicationHandoff: string[];
};

type PublicArtifactSnapshot = {
  label: string;
  url: string;
  matchesLocal: boolean;
  localSummary: string;
  publicSummary: string;
};

export type AutomationStatusSnapshot = {
  schemaVersion: string;
  generatedAtUtc: string;
  snapshotStateSha: string;
  localStateSha: string;
  publicStateSha: string;
  repoRoot: string;
  snapshotPaths: {
    markdown: string;
    json: string;
    localPublicGap: string;
  };
  localHead: string;
  localHeadMessage: string;
  publicHead: string;
  localPublicMatch: boolean;
  currentPhase: string;
  currentMilestone: string;
  activeScope: string;
  validatedProject: {
    projectId: string;
    displayName: string;
    phase: string;
    status: string;
  };
  latestSubstantiveWorkstreamLabel: string;
  repoClean: boolean;
  trackedTreeClean: boolean;
  untrackedFilesExist: boolean;
  untrackedPaths: string[];
  trackedDirtyPaths: string[];
  statusShort: string;
  gapSummary: string;
  aheadCount: number;
  branchSummary: string;
  remoteSummary: string;
  commandGroups: CommandGroups;
  publicArtifacts: PublicArtifactSnapshot[];
  handoff: {
    bundle: string;
    notes: string;
    bundleExists: boolean;
    notesExists: boolean;
  };
};

type SnapshotBuildSource = {
  publicationState: PublicationState;
  snapshot: AutomationStatusSnapshot;
  jsonPath: string;
  markdownPath: string;
  gapPath: string;
  markdown: string;
};

const SNAPSHOT_SCHEMA_VERSION = "2026-03-26.automation-truth-a";
const SNAPSHOT_JSON_RELATIVE_PATH = "00_control/AUTOMATION_STATUS_SNAPSHOT.json";
const SNAPSHOT_MARKDOWN_RELATIVE_PATH = "00_control/AUTOMATION_STATUS_SNAPSHOT.md";
const LOCAL_PUBLIC_GAP_RELATIVE_PATH = "00_control/LOCAL_PUBLIC_GAP.md";

function hashValue(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function extractSingleLineValue(markdown: string, label: string): string {
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = markdown.match(new RegExp(`^- ${escapedLabel}: (.+)$`, "m"));
  return match ? match[1].trim() : "unknown";
}

function listStatusLines(statusShort: string): string[] {
  return statusShort
    .split("\n")
    .map((line) => line.trimEnd())
    .filter(Boolean);
}

function normalizeStatusPath(line: string): string {
  const rawPath = line.slice(3).trim();
  if (rawPath.includes(" -> ")) {
    return rawPath.split(" -> ").pop() ?? rawPath;
  }
  return rawPath;
}

function sortUnique(values: string[]): string[] {
  return Array.from(new Set(values)).sort((left, right) => left.localeCompare(right));
}

function collectCommandGroups(scripts: Record<string, string>): CommandGroups {
  const names = Object.keys(scripts).sort((left, right) => left.localeCompare(right));
  return {
    manualQa: names.filter((name) => name.startsWith("manual:")),
    vabs: names.filter((name) => name.startsWith("vabs:")),
    publicationHandoff: names.filter(
      (name) => name.startsWith("publication:") || name.startsWith("handoff:")
    )
  };
}

function renderCommandList(commands: string[]): string {
  return commands.length === 0 ? "- none" : commands.map((command) => `- \`${command}\``).join("\n");
}

function readExistingSnapshot(jsonPath: string): AutomationStatusSnapshot | null {
  if (!existsSync(jsonPath)) {
    return null;
  }

  try {
    return readJsonFile<AutomationStatusSnapshot>(jsonPath);
  } catch {
    return null;
  }
}

export async function collectAutomationSnapshotSource(): Promise<SnapshotBuildSource> {
  const repoRoot = getRepoRoot();
  const publicationState = await collectPublicationState();
  const manualContext = getManualContext(repoRoot);
  const packageJson = readJsonFile<PackageJson>(path.join(repoRoot, "package.json"));
  const statusMarkdown = readText(path.join(repoRoot, "00_control/STATUS.md"));
  const statusLines = listStatusLines(publicationState.statusShort);
  const untrackedPaths = sortUnique(
    statusLines
      .filter((line) => line.startsWith("?? "))
      .map((line) => normalizeStatusPath(line))
  );
  const trackedDirtyPaths = sortUnique(
    statusLines
      .filter((line) => !line.startsWith("?? "))
      .map((line) => normalizeStatusPath(line))
  );
  const commandGroups = collectCommandGroups(packageJson.scripts ?? {});

  const currentMilestone = extractSingleLineValue(statusMarkdown, "Current milestone");
  const activeScope = extractSingleLineValue(statusMarkdown, "Active scope");
  const repoClean = statusLines.length === 0;
  const trackedTreeClean = trackedDirtyPaths.length === 0;
  const publicArtifacts: PublicArtifactSnapshot[] = publicationState.publicArtifacts.map((artifact) => ({
    label: artifact.label,
    url: artifact.url,
    matchesLocal: artifact.matchesLocal,
    localSummary: artifact.localSummary,
    publicSummary: artifact.publicSummary
  }));

  const localState = {
    repoRoot,
    localHead: publicationState.localHead,
    localHeadMessage: publicationState.localHeadMessage,
    currentPhase: manualContext.localPhase,
    currentMilestone,
    activeScope,
    validatedProject: manualContext.validatedProject,
    latestSubstantiveWorkstreamLabel: publicationState.localHeadMessage,
    repoClean,
    trackedTreeClean,
    untrackedFilesExist: untrackedPaths.length > 0,
    untrackedPaths,
    trackedDirtyPaths,
    statusShort: publicationState.statusShort,
    gapSummary: manualContext.gapSummary,
    aheadCount: manualContext.aheadCount,
    branchSummary: publicationState.branchSummary,
    remoteSummary: publicationState.remoteSummary,
    commandGroups,
    handoff: {
      bundle: manualContext.handoff.bundle,
      notes: manualContext.handoff.notes,
      bundleExists: existsSync(manualContext.handoff.bundle),
      notesExists: existsSync(manualContext.handoff.notes)
    }
  };

  const publicState = {
    publicHead: publicationState.publicHead,
    publicArtifacts
  };

  const localStateSha = hashValue(localState);
  const publicStateSha = hashValue(publicState);
  const snapshotStateSha = hashValue({
    localStateSha,
    publicStateSha
  });

  const jsonPath = path.join(repoRoot, SNAPSHOT_JSON_RELATIVE_PATH);
  const markdownPath = path.join(repoRoot, SNAPSHOT_MARKDOWN_RELATIVE_PATH);
  const gapPath = path.join(repoRoot, LOCAL_PUBLIC_GAP_RELATIVE_PATH);
  const existingSnapshot = readExistingSnapshot(jsonPath);
  const generatedAtUtc =
    existingSnapshot?.snapshotStateSha === snapshotStateSha
      ? existingSnapshot.generatedAtUtc
      : new Date().toISOString();

  const snapshot: AutomationStatusSnapshot = {
    schemaVersion: SNAPSHOT_SCHEMA_VERSION,
    generatedAtUtc,
    snapshotStateSha,
    localStateSha,
    publicStateSha,
    repoRoot,
    snapshotPaths: {
      markdown: SNAPSHOT_MARKDOWN_RELATIVE_PATH,
      json: SNAPSHOT_JSON_RELATIVE_PATH,
      localPublicGap: LOCAL_PUBLIC_GAP_RELATIVE_PATH
    },
    localHead: publicationState.localHead,
    localHeadMessage: publicationState.localHeadMessage,
    publicHead: publicationState.publicHead,
    localPublicMatch: publicationState.localHead === publicationState.publicHead,
    currentPhase: manualContext.localPhase,
    currentMilestone,
    activeScope,
    validatedProject: manualContext.validatedProject,
    latestSubstantiveWorkstreamLabel: publicationState.localHeadMessage,
    repoClean,
    trackedTreeClean,
    untrackedFilesExist: untrackedPaths.length > 0,
    untrackedPaths,
    trackedDirtyPaths,
    statusShort: publicationState.statusShort,
    gapSummary: manualContext.gapSummary,
    aheadCount: manualContext.aheadCount,
    branchSummary: publicationState.branchSummary,
    remoteSummary: publicationState.remoteSummary,
    commandGroups,
    publicArtifacts,
    handoff: localState.handoff
  };

  return {
    publicationState,
    snapshot,
    jsonPath,
    markdownPath,
    gapPath,
    markdown: renderAutomationSnapshotMarkdown(snapshot)
  };
}

export function renderAutomationSnapshotMarkdown(snapshot: AutomationStatusSnapshot): string {
  const artifactRows = snapshot.publicArtifacts
    .map(
      (artifact) =>
        `| ${artifact.label} | ${artifact.localSummary} | ${artifact.publicSummary} | ${
          artifact.matchesLocal ? "yes" : "no"
        } |`
    )
    .join("\n");

  return `# Automation Status Snapshot

Generated by \`npm run automation:status-snapshot\` on ${snapshot.generatedAtUtc}.

This is the authoritative repo-local status snapshot for automation reports. Before any automation sends a project update, refresh this snapshot and require \`npm run automation:check-freshness\` to print \`CURRENT\`.

## Truth Summary
- Local HEAD: \`${snapshot.localHead}\`
- Public origin/main HEAD: \`${snapshot.publicHead}\`
- Local/public match: ${snapshot.localPublicMatch ? "yes" : "no"}
- Current phase: \`${snapshot.currentPhase}\`
- Current milestone: ${snapshot.currentMilestone}
- Validated project: \`${snapshot.validatedProject.projectId}\` (${snapshot.validatedProject.displayName})
- Latest substantive workstream: ${snapshot.latestSubstantiveWorkstreamLabel}
- Repo clean: ${snapshot.repoClean ? "yes" : "no"}
- Tracked tree clean: ${snapshot.trackedTreeClean ? "yes" : "no"}
- Untracked files exist: ${snapshot.untrackedFilesExist ? "yes" : "no"}
- Gap summary: ${snapshot.gapSummary}
- Snapshot state SHA: \`${snapshot.snapshotStateSha}\`
- Local state SHA: \`${snapshot.localStateSha}\`
- Public state SHA: \`${snapshot.publicStateSha}\`

## Dirty Paths
### Untracked
${renderCommandList(snapshot.untrackedPaths)}

### Tracked Dirty
${renderCommandList(snapshot.trackedDirtyPaths)}

## Command Groups
### Manual QA
${renderCommandList(snapshot.commandGroups.manualQa)}

### VABS
${renderCommandList(snapshot.commandGroups.vabs)}

### Publication/Handoff
${renderCommandList(snapshot.commandGroups.publicationHandoff)}

## Public Artifact Checks
| Artifact | Local signal | Public signal | Matches local? |
| --- | --- | --- | --- |
${artifactRows}

## Automation Guard
- Refresh now: \`npm run automation:status-snapshot\`
- Verify freshness: \`npm run automation:check-freshness\`
- If freshness is not \`CURRENT\`, do not send a stale report as if it were current.
- If no new substantive workstream has completed since the last outbound report, say \`no new substantive workstream\` plainly.
`;
}

export function writeIfChanged(filePath: string, contents: string): boolean {
  const existing = existsSync(filePath) ? readText(filePath) : null;
  const normalizedContents = contents.endsWith("\n") ? contents : `${contents}\n`;
  if (existing === normalizedContents) {
    return false;
  }
  writeText(filePath, normalizedContents);
  return true;
}

export function writeAutomationSnapshotFiles(source: SnapshotBuildSource): {
  jsonUpdated: boolean;
  markdownUpdated: boolean;
} {
  const jsonUpdated = writeIfChanged(source.jsonPath, JSON.stringify(source.snapshot, null, 2));
  const markdownUpdated = writeIfChanged(source.markdownPath, source.markdown);
  return {
    jsonUpdated,
    markdownUpdated
  };
}

export function readStoredAutomationSnapshot(
  repoRoot = getRepoRoot()
): AutomationStatusSnapshot | null {
  return readExistingSnapshot(path.join(repoRoot, SNAPSHOT_JSON_RELATIVE_PATH));
}
