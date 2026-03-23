import { execFileSync } from "child_process";
import { mkdirSync, rmSync, writeFileSync } from "fs";
import path from "path";

import { getRepoRoot, gitAllowFailure } from "../publication/shared";
import {
  PROJECT_001_RELATIVE_PATH,
  getProject001Root,
  isPathWithinProject001,
  listDirtyEntries,
  listKnownLogArtifacts,
  listTrackedProject001PathsAtHead,
  listUnexpectedLogArtifacts,
  listUnknownProject001Paths
} from "./shared";

const FORCE_UNKNOWN_FLAG = "--force-unknown";

function restoreTrackedFile(repoRoot: string, relativePath: string): void {
  const contents = execFileSync("git", ["-C", repoRoot, "show", `HEAD:${relativePath}`], {
    maxBuffer: 10 * 1024 * 1024
  });
  const targetPath = path.join(repoRoot, relativePath);
  mkdirSync(path.dirname(targetPath), { recursive: true });
  writeFileSync(targetPath, contents);
}

function main(): void {
  const repoRoot = getRepoRoot();
  const allowUnknown = process.argv.includes(FORCE_UNKNOWN_FLAG);
  const dirtyEntries = listDirtyEntries(repoRoot);
  const blockingOutsideProject001 = dirtyEntries.filter(
    (entry) => !isPathWithinProject001(entry.relativePath) && entry.status !== "??"
  );
  if (blockingOutsideProject001.length > 0) {
    throw new Error(
      `Refusing to reset project_001 because the repo has tracked changes outside ${
        PROJECT_001_RELATIVE_PATH
      }: ${blockingOutsideProject001.map((entry) => entry.relativePath).join(", ")}`
    );
  }

  const unexpectedUntracked = listUnknownProject001Paths(repoRoot);
  if (unexpectedUntracked.length > 0 && !allowUnknown) {
    throw new Error(
      `Refusing to reset project_001 because non-standard untracked files exist inside the project: ${unexpectedUntracked.join(
        ", "
      )}. Re-run with --force-unknown if you intentionally want to remove them.`
    );
  }

  const unexpectedLogArtifacts = listUnexpectedLogArtifacts(repoRoot);
  if (unexpectedLogArtifacts.length > 0) {
    throw new Error(
      `Refusing to reset project_001 because unexpected log paths were found: ${unexpectedLogArtifacts.join(
        ", "
      )}`
    );
  }

  for (const relativePath of listTrackedProject001PathsAtHead(repoRoot)) {
    restoreTrackedFile(repoRoot, relativePath);
  }

  for (const artifactPath of listKnownLogArtifacts(repoRoot)) {
    rmSync(artifactPath, { recursive: true, force: true });
  }

  if (allowUnknown) {
    for (const relativePath of unexpectedUntracked) {
      rmSync(path.join(repoRoot, relativePath), { recursive: true, force: true });
    }
  }

  const after = gitAllowFailure(
    ["status", "--short", "--untracked-files=all", PROJECT_001_RELATIVE_PATH],
    repoRoot
  ).stdout.trim();
  if (after.length > 0) {
    throw new Error(`Reset completed but project_001 is still dirty: ${after}`);
  }

  console.log(`Reset ${getProject001Root(repoRoot)} to the current tracked HEAD baseline.`);
  console.log("Known local-only editor logs were removed.");
  const outsideProject001Untracked = dirtyEntries
    .filter((entry) => !isPathWithinProject001(entry.relativePath) && entry.status === "??")
    .map((entry) => entry.relativePath);
  if (outsideProject001Untracked.length > 0) {
    console.log(
      `Left unrelated untracked repo paths alone: ${outsideProject001Untracked.join(", ")}.`
    );
  }
  if (allowUnknown) {
    console.log("Unknown untracked files inside project_001 were also removed because --force-unknown was set.");
  }
}

main();
