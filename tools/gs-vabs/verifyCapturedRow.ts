import { existsSync, readFileSync } from "fs";
import path from "path";

import { getRepoRoot } from "../publication/shared";
import {
  extractCapturedRowFixture,
  getCaptureSourceLogPath,
  getCapturedNotesPath,
  getCapturedRawFixturePath,
  getCapturedSanitizedFixturePath,
  parseKeyValueBag,
  parseProjectIdArg,
  parseRowFixture,
  verifyFixtureSelection
} from "./shared";
import { runLocalReplayHarness } from "./runLocalReplayHarness";

function main(): void {
  const repoRoot = getRepoRoot();
  const projectId = parseProjectIdArg();
  const rawPath = getCapturedRawFixturePath(projectId, repoRoot);
  const sanitizedPath = getCapturedSanitizedFixturePath(projectId, repoRoot);
  const notesPath = getCapturedNotesPath(projectId, repoRoot);
  const sourceLogPath = getCaptureSourceLogPath(projectId, repoRoot);
  const rawExists = existsSync(rawPath);
  const sanitizedExists = existsSync(sanitizedPath);

  if (!rawExists && !sanitizedExists) {
    console.log(`No captured row is present yet for ${projectId}.`);
    console.log(`- Raw local-only path: ${rawPath}`);
    console.log(`- Sanitized path: ${sanitizedPath}`);
    console.log(`- Notes: ${path.relative(repoRoot, notesPath)}`);
    console.log(`- Source log: ${path.relative(repoRoot, sourceLogPath)}`);
    return;
  }

  if (rawExists) {
    const raw = JSON.parse(readFileSync(rawPath, "utf8")) as unknown;
    const extracted = extractCapturedRowFixture(raw, projectId);
    const betData = parseKeyValueBag(extracted.fixture.betData ?? "");
    const servletData = parseKeyValueBag(extracted.fixture.servletData ?? "");
    const roundId = servletData.ROUND_ID ?? betData.ROUND_ID ?? "";

    console.log(`Raw captured-row candidate found for ${projectId}`);
    console.log(`- Raw path: ${rawPath}`);
    console.log(`- Source shape: ${extracted.sourceShape}`);
    console.log(`- Candidate rows seen: ${extracted.candidateCount}`);
    console.log(`- Extracted index: ${extracted.extractedIndex}`);
    console.log(`- ROUND_ID: ${roundId || "missing"}`);
  }

  if (!sanitizedExists) {
    console.log(`No sanitized captured row is committed yet for ${projectId}.`);
    console.log("- Run `npm run vabs:sanitize:project_001` after placing a valid raw captured row in the local-only intake path.");
    return;
  }

  const problems = verifyFixtureSelection(projectId, repoRoot, "captured");
  if (problems.length > 0) {
    console.error(`Sanitized captured row verification failed for ${projectId}`);
    for (const problem of problems) {
      console.error(`- ${problem.relativePath}: ${problem.message}`);
    }
    process.exit(1);
  }

  const parsed = parseRowFixture(projectId, repoRoot, "captured");
  const harness = runLocalReplayHarness(projectId, repoRoot, "captured");

  console.log(`Sanitized captured row verification passed for ${projectId}`);
  console.log(`- Sanitized path: ${sanitizedPath}`);
  console.log(`- ROUND_ID: ${parsed.roundId}`);
  console.log(`- Capture status: ${parsed.captureStatus}`);
  console.log(`- Fixture provenance: ${parsed.fixtureProvenance}`);
  console.log(`- Replay harness HTML: ${harness.htmlPath}`);
}

main();
