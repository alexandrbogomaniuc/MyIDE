import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";

import { getRepoRoot } from "../publication/shared";
import {
  extractCapturedSessionFixture,
  getCaptureSourceLogPath,
  getCapturedRawSessionFixturePath,
  getCapturedSanitizedSessionFixturePath,
  getSessionNotesPath,
  parseProjectIdArg
} from "./shared";

function parseSourceArg(args = process.argv.slice(2)): string | null {
  const sourceArgs = args.slice(1);
  for (let index = 0; index < sourceArgs.length; index += 1) {
    const arg = sourceArgs[index];
    if (arg.startsWith("--source=")) {
      return arg.slice("--source=".length);
    }
    if (arg === "--source") {
      return sourceArgs[index + 1] ?? null;
    }
  }
  return null;
}

function main(): void {
  const repoRoot = getRepoRoot();
  const projectId = parseProjectIdArg();
  const sourceArg = parseSourceArg();
  const rawPath = getCapturedRawSessionFixturePath(projectId, repoRoot);
  const sanitizedPath = getCapturedSanitizedSessionFixturePath(projectId, repoRoot);
  const sessionNotesPath = getSessionNotesPath(projectId, repoRoot);
  const sourceLogPath = getCaptureSourceLogPath(projectId, repoRoot);

  if (sourceArg) {
    const sourcePath = path.resolve(sourceArg);
    if (!existsSync(sourcePath)) {
      throw new Error(`Source path does not exist: ${sourcePath}`);
    }

    const text = readFileSync(sourcePath, "utf8");
    const json = JSON.parse(text) as unknown;
    const extracted = extractCapturedSessionFixture(json, projectId);

    mkdirSync(path.dirname(rawPath), { recursive: true });
    writeFileSync(rawPath, `${JSON.stringify(json, null, 2)}\n`, "utf8");

    console.log(`Intook raw captured-session candidate for ${projectId}`);
    console.log(`- Source: ${sourcePath}`);
    console.log(`- Raw local-only path: ${rawPath}`);
    console.log(`- Source shape: ${extracted.sourceShape}`);
    console.log(`- Candidate rows: ${extracted.candidateCount}`);
    console.log(
      "- Next: run `npm run vabs:sanitize:session:project_001` to produce a public-safe captured session fixture if this source is valid."
    );
  } else {
    console.log(`No source path was provided for ${projectId}; reporting captured-session intake status only.`);
  }

  console.log(`- Raw local-only session path exists: ${existsSync(rawPath) ? "yes" : "no"}`);
  console.log(`- Sanitized captured session path exists: ${existsSync(sanitizedPath) ? "yes" : "no"}`);
  console.log(`- Session notes: ${path.relative(repoRoot, sessionNotesPath)}`);
  console.log(`- Capture source log: ${path.relative(repoRoot, sourceLogPath)}`);
  console.log("- Auto session selection will stay on derived unless a sanitized captured session exists.");
}

main();
