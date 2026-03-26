import { existsSync, readFileSync } from "fs";
import path from "path";

import { getRepoRoot } from "../publication/shared";
import {
  buildSessionFixture,
  extractCapturedSessionFixture,
  getCaptureSourceLogPath,
  getCapturedRawSessionFixturePath,
  getCapturedSanitizedSessionFixturePath,
  getSessionNotesPath,
  parseProjectIdArg
} from "./shared";
import { runBrowserSmoke } from "./browserSmoke";
import { runExportPreview } from "./runExportPreview";
import { runLocalReplayHarness } from "./runLocalReplayHarness";
import { runLocalShellMock } from "./runLocalShellMock";
import { verifyExportPackage } from "./verifyExportPackage";

function main(): void {
  const repoRoot = getRepoRoot();
  const projectId = parseProjectIdArg();
  const rawPath = getCapturedRawSessionFixturePath(projectId, repoRoot);
  const sanitizedPath = getCapturedSanitizedSessionFixturePath(projectId, repoRoot);
  const sessionNotesPath = getSessionNotesPath(projectId, repoRoot);
  const sourceLogPath = getCaptureSourceLogPath(projectId, repoRoot);
  const rawExists = existsSync(rawPath);
  const sanitizedExists = existsSync(sanitizedPath);

  if (!rawExists && !sanitizedExists) {
    console.log(`No captured session is present yet for ${projectId}.`);
    console.log(`- Raw local-only path: ${rawPath}`);
    console.log(`- Sanitized path: ${sanitizedPath}`);
    console.log(`- Session notes: ${path.relative(repoRoot, sessionNotesPath)}`);
    console.log(`- Source log: ${path.relative(repoRoot, sourceLogPath)}`);
    return;
  }

  if (rawExists) {
    const raw = JSON.parse(readFileSync(rawPath, "utf8")) as unknown;
    const extracted = extractCapturedSessionFixture(raw, projectId);
    console.log(`Raw captured-session candidate found for ${projectId}`);
    console.log(`- Raw path: ${rawPath}`);
    console.log(`- Source shape: ${extracted.sourceShape}`);
    console.log(`- Candidate rows seen: ${extracted.candidateCount}`);
  }

  if (!sanitizedExists) {
    console.log(`No sanitized captured session is committed yet for ${projectId}.`);
    console.log(
      "- Run `npm run vabs:sanitize:session:project_001` after placing a valid raw captured session in the local-only intake path."
    );
    return;
  }

  const session = buildSessionFixture(projectId, repoRoot, "captured");
  const selectedRowIndex = session.rows.length > 1 ? 1 : 0;
  const selectedRow = session.rows[selectedRowIndex];
  if (!selectedRow) {
    throw new Error(`Sanitized captured session did not yield a usable row for ${projectId}.`);
  }

  const harness = runLocalReplayHarness(projectId, repoRoot, "captured", selectedRowIndex);
  const exportVerification = verifyExportPackage(projectId, repoRoot, "captured", selectedRowIndex);
  const preview = runExportPreview(projectId, repoRoot, "captured", selectedRowIndex);
  const shellMock = runLocalShellMock(projectId, repoRoot, "captured");
  const browserSmoke = runBrowserSmoke(projectId, repoRoot, "captured");

  if (exportVerification.problems.length > 0) {
    console.error(`Captured session export verification failed for ${projectId}`);
    for (const problem of exportVerification.problems) {
      console.error(`- ${problem}`);
    }
    process.exit(1);
  }

  if (!browserSmoke.result.smokePassed) {
    console.error(`Captured session browser smoke failed for ${projectId}`);
    console.error(`- Error: ${browserSmoke.result.error ?? "expected shell markers were missing"}`);
    console.error(`- DOM: ${browserSmoke.result.domPath}`);
    process.exit(1);
  }

  console.log(`Sanitized captured session verification passed for ${projectId}`);
  console.log(`- Sanitized path: ${sanitizedPath}`);
  console.log(`- Session ID: ${session.sessionId}`);
  console.log(`- Session fixture kind: ${session.sessionFixtureKind}`);
  console.log(`- Session rows: ${session.rows.length}`);
  console.log(`- Selected row index: ${selectedRowIndex}`);
  console.log(`- Selected ROUND_ID: ${selectedRow.summary.roundId}`);
  console.log(`- Replay harness HTML: ${harness.htmlPath}`);
  console.log(`- Export manifest: ${exportVerification.result.manifestPath}`);
  console.log(`- Preview HTML: ${preview.htmlPath}`);
  console.log(`- Shell mock HTML: ${shellMock.htmlPath}`);
  console.log(`- Browser smoke JSON: ${browserSmoke.jsonPath}`);
}

main();
