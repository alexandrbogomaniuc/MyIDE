import { createHash } from "crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";

import { getRepoRoot } from "../publication/shared";
import {
  extractCapturedSessionFixture,
  getCaptureSourceLogPath,
  getCapturedRawSessionFixturePath,
  getCapturedSanitizedSessionFixturePath,
  getProjectConfig,
  getSessionNotesPath,
  parseKeyValueBag,
  parseProjectIdArg,
  serializeKeyValueBag
} from "./shared";

const CAPTURED_REQUIRED_BETDATA_KEYS = ["BET_TOTAL", "BETID", "COINSEQ"];
const CAPTURED_REQUIRED_SERVLETDATA_KEYS = [
  "ROUND_ID",
  "PROJECT_ID",
  "DONOR_ID",
  "SOURCE_CAPTURE",
  "FIXTURE_KIND",
  "FIXTURE_PROVENANCE",
  "CAPTURE_STATUS",
  "CAPTURED_ROUND_ID",
  "CAPTURED_ROUND_ID_EVIDENCE",
  "SOURCE_NOTE"
];

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
  return `captured-session-extbetid-${digest}`;
}

function main(): void {
  const repoRoot = getRepoRoot();
  const projectId = parseProjectIdArg();
  const config = getProjectConfig(projectId);
  const args = process.argv.slice(3);
  const rawPath = getCapturedRawSessionFixturePath(projectId, repoRoot);
  const sanitizedPath = getCapturedSanitizedSessionFixturePath(projectId, repoRoot);
  const sessionNotesPath = getSessionNotesPath(projectId, repoRoot);
  const sourceLogPath = getCaptureSourceLogPath(projectId, repoRoot);

  if (!existsSync(rawPath)) {
    console.log(`No raw captured session is present for ${projectId}.`);
    console.log(`- Expected raw path: ${rawPath}`);
    console.log(`- Session notes: ${path.relative(repoRoot, sessionNotesPath)}`);
    console.log(`- Source log: ${path.relative(repoRoot, sourceLogPath)}`);
    return;
  }

  const raw = JSON.parse(readFileSync(rawPath, "utf8")) as unknown;
  const extracted = extractCapturedSessionFixture(raw, projectId);
  const sourceCapture = parseOption(args, "source-capture") ?? "captured-playerbets-session-intake";
  const evidenceRef = parseOption(args, "evidence-ref") ?? "captured-playerbets-session";
  const sourceNote =
    parseOption(args, "source-note") ??
    `sanitized-from-${extracted.sourceShape};raw-path-local-only;session-rows-preserved`;

  const sanitizedRows = (extracted.fixture.playerBets ?? []).map((fixture, rowIndex) => {
    const betData = parseKeyValueBag(fixture.betData ?? "");
    const servletData = parseKeyValueBag(fixture.servletData ?? "");
    const roundId = servletData.ROUND_ID ?? betData.ROUND_ID ?? "";

    if (!roundId || !/^\d+$/.test(roundId)) {
      throw new Error(`Captured session row ${rowIndex} does not expose a numeric ROUND_ID in betData or servletData.`);
    }

    const preservedBetDataKeys = Array.from(
      new Set([...config.requiredBetDataKeys, ...CAPTURED_REQUIRED_BETDATA_KEYS].filter((key) => key in betData))
    );
    const preservedServletKeys = Array.from(
      new Set([...config.requiredServletDataKeys, ...CAPTURED_REQUIRED_SERVLETDATA_KEYS].filter((key) => key in servletData))
    );

    const sanitizedBetData: Record<string, string> = {};
    for (const key of preservedBetDataKeys) {
      sanitizedBetData[key] = betData[key];
    }

    const sanitizedServletData: Record<string, string> = {};
    for (const key of preservedServletKeys) {
      sanitizedServletData[key] = servletData[key];
    }

    sanitizedServletData.ROUND_ID = sanitizedServletData.ROUND_ID ?? roundId;
    sanitizedServletData.PROJECT_ID = projectId;
    sanitizedServletData.DONOR_ID = "donor_001_mystery_garden";
    sanitizedServletData.SOURCE_CAPTURE = sourceCapture;
    sanitizedServletData.FIXTURE_KIND = "captured-session-row-sanitized";
    sanitizedServletData.FIXTURE_PROVENANCE = "sanitized-captured-playerbets-session";
    sanitizedServletData.CAPTURE_STATUS = "captured-playerbets-session__sanitized";
    sanitizedServletData.CAPTURED_ROUND_ID = roundId;
    sanitizedServletData.CAPTURED_ROUND_ID_EVIDENCE = evidenceRef;
    sanitizedServletData.SOURCE_NOTE = `${sourceNote};row-index=${rowIndex}`;

    return {
      time: fixture.time ?? "",
      stateId: fixture.stateId ?? 0,
      stateName: fixture.stateName ?? "",
      extBetId: redactExtBetId(fixture.extBetId ?? ""),
      bet: fixture.bet ?? 0,
      win: fixture.win ?? 0,
      balance: fixture.balance ?? 0,
      betData: serializeKeyValueBag(sanitizedBetData, config.requiredBetDataKeys),
      servletData: serializeKeyValueBag(sanitizedServletData, config.requiredServletDataKeys)
    };
  });

  const sanitizedSession = {
    sessionId:
      parseOption(args, "session-id") ?? extracted.fixture.sessionId ?? `${projectId}-captured-session-local`,
    sessionFixtureKind: "captured",
    sessionFixtureProvenance: `sanitized-captured-playerbets-session-from-${extracted.sourceShape}`,
    captureStatus: "captured-playerbets-session__sanitized",
    sourceNote,
    playerBets: sanitizedRows
  };

  mkdirSync(path.dirname(sanitizedPath), { recursive: true });
  writeFileSync(sanitizedPath, `${JSON.stringify(sanitizedSession, null, 2)}\n`, "utf8");

  console.log(`Sanitized captured session for ${projectId}`);
  console.log(`- Raw path: ${rawPath}`);
  console.log(`- Sanitized path: ${sanitizedPath}`);
  console.log(`- Source shape: ${extracted.sourceShape}`);
  console.log(`- Candidate rows seen: ${extracted.candidateCount}`);
  console.log(`- Sanitized rows: ${sanitizedRows.length}`);
  console.log(`- Session ID: ${sanitizedSession.sessionId}`);
}

main();
