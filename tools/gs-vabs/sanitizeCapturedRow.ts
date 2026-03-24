import { createHash } from "crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";

import { getRepoRoot } from "../publication/shared";
import {
  extractCapturedRowFixture,
  getCaptureSourceLogPath,
  getCapturedNotesPath,
  getCapturedRawFixturePath,
  getCapturedSanitizedFixturePath,
  getProjectConfig,
  parseKeyValueBag,
  parseProjectIdArg,
  serializeKeyValueBag
} from "./shared";

function parseOption(args: string[], name: string): string | null {
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg.startsWith(`--${name}=`)) {
      return arg.slice(name.length + 3);
    }
    if (arg === `--${name}`) {
      return args[index + 1] ?? null;
    }
  }
  return null;
}

function redactExtBetId(value: string): string {
  if (!value) {
    return "";
  }
  const digest = createHash("sha256").update(value).digest("hex").slice(0, 12);
  return `captured-extbetid-${digest}`;
}

function main(): void {
  const repoRoot = getRepoRoot();
  const projectId = parseProjectIdArg();
  const config = getProjectConfig(projectId);
  const args = process.argv.slice(3);
  const rawPath = getCapturedRawFixturePath(projectId, repoRoot);
  const sanitizedPath = getCapturedSanitizedFixturePath(projectId, repoRoot);
  const notesPath = getCapturedNotesPath(projectId, repoRoot);
  const sourceLogPath = getCaptureSourceLogPath(projectId, repoRoot);

  if (!existsSync(rawPath)) {
    console.log(`No raw captured row is present for ${projectId}.`);
    console.log(`- Expected raw path: ${rawPath}`);
    console.log(`- Notes: ${path.relative(repoRoot, notesPath)}`);
    console.log(`- Source log: ${path.relative(repoRoot, sourceLogPath)}`);
    return;
  }

  const raw = JSON.parse(readFileSync(rawPath, "utf8")) as unknown;
  const extracted = extractCapturedRowFixture(raw, projectId);
  const betData = parseKeyValueBag(extracted.fixture.betData ?? "");
  const servletData = parseKeyValueBag(extracted.fixture.servletData ?? "");
  const roundId = servletData.ROUND_ID ?? betData.ROUND_ID ?? "";

  if (!roundId || !/^\d+$/.test(roundId)) {
    throw new Error("Captured row candidate does not expose a numeric ROUND_ID in betData or servletData.");
  }

  const sourceCapture =
    parseOption(args, "source-capture") ?? servletData.SOURCE_CAPTURE ?? "captured-playerbets-intake";
  const evidenceRef =
    parseOption(args, "evidence-ref") ?? servletData.CAPTURED_ROUND_ID_EVIDENCE ?? "captured-playerbets-row";
  const sourceNote =
    parseOption(args, "source-note") ??
    `sanitized-from-${extracted.sourceShape};raw-path-local-only;round-id-preserved`;

  const sanitizedBetData: Record<string, string> = {};
  for (const key of config.requiredBetDataKeys) {
    if (key in betData) {
      sanitizedBetData[key] = betData[key];
    }
  }

  const sanitizedServletData: Record<string, string> = {};
  if (servletData.ROUND_ID || roundId) {
    sanitizedServletData.ROUND_ID = servletData.ROUND_ID ?? roundId;
  }
  sanitizedServletData.PROJECT_ID = projectId;
  sanitizedServletData.DONOR_ID = "donor_001_mystery_garden";
  sanitizedServletData.SOURCE_CAPTURE = sourceCapture;
  sanitizedServletData.FIXTURE_KIND = "captured-playerbets-row-sanitized";
  sanitizedServletData.FIXTURE_PROVENANCE = "sanitized-captured-playerbets-row";
  sanitizedServletData.CAPTURE_STATUS = "captured-playerbets-row__sanitized";
  sanitizedServletData.CAPTURED_ROUND_ID = roundId;
  sanitizedServletData.CAPTURED_ROUND_ID_EVIDENCE = evidenceRef;
  sanitizedServletData.SOURCE_NOTE = sourceNote;

  const sanitizedFixture = {
    time: extracted.fixture.time ?? "",
    stateId: extracted.fixture.stateId ?? 0,
    stateName: extracted.fixture.stateName ?? "",
    extBetId: redactExtBetId(extracted.fixture.extBetId ?? ""),
    bet: extracted.fixture.bet ?? 0,
    win: extracted.fixture.win ?? 0,
    balance: extracted.fixture.balance ?? 0,
    betData: serializeKeyValueBag(sanitizedBetData, config.requiredBetDataKeys),
    servletData: serializeKeyValueBag(sanitizedServletData, config.requiredServletDataKeys)
  };

  mkdirSync(path.dirname(sanitizedPath), { recursive: true });
  writeFileSync(sanitizedPath, `${JSON.stringify(sanitizedFixture, null, 2)}\n`, "utf8");

  console.log(`Sanitized captured row for ${projectId}`);
  console.log(`- Raw path: ${rawPath}`);
  console.log(`- Sanitized path: ${sanitizedPath}`);
  console.log(`- Source shape: ${extracted.sourceShape}`);
  console.log(`- Candidate rows seen: ${extracted.candidateCount}`);
  console.log(`- Extracted index: ${extracted.extractedIndex}`);
  console.log(`- ROUND_ID: ${roundId}`);
  console.log(`- Preserved betData keys: ${Object.keys(sanitizedBetData).join(", ") || "none"}`);
  console.log(`- Injected provenance keys: ${Object.keys(sanitizedServletData).join(", ")}`);
}

main();
