import { existsSync } from "fs";

import { getRepoRoot, git, gitAllowFailure } from "../publication/shared";
import {
  describeGap,
  getCurrentHandoffPaths,
  getValidatedProjectSummary
} from "./shared";

function tryResolvePublicHead(repoRoot: string): string {
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

function main(): void {
  const repoRoot = getRepoRoot();
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
  const handoff = getCurrentHandoffPaths(repoRoot);

  console.log("Manual QA status");
  console.log(`- Local HEAD: ${localHead}`);
  console.log(`- Local phase: ${validatedProject.phase}`);
  console.log(`- Current validated project: ${validatedProject.projectId} (${validatedProject.displayName})`);
  console.log(`- Validated project status: ${validatedProject.status}`);
  console.log(`- Public origin/main: ${publicHead}`);
  console.log(`- Local vs public: ${gapSummary}`);
  console.log(
    `- Handoff bundle: ${existsSync(handoff.bundle) ? handoff.bundle : "missing CURRENT.bundle"}`
  );
  console.log(
    `- Handoff notes: ${existsSync(handoff.notes) ? handoff.notes : "missing CURRENT_RECOVERY_NOTES.txt"}`
  );
  console.log(`- Reset baseline: current tracked HEAD state of 40_projects/project_001`);
}

main();
