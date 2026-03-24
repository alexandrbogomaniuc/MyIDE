import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";

import { getRepoRoot } from "../publication/shared";

export const DEFAULT_PROJECT_ID = "project_001";
const RAW_CAPTURE_GITIGNORE_ENTRY = "40_projects/project_001/vabs/contract/captured-playerBets-row.json";

export type FixtureSelection = "auto" | "derived" | "captured";
export type ResolvedFixtureSelection = "derived" | "captured";
export type FixtureKind = "derived" | "captured-sanitized" | "captured-raw-local";

export type ProjectVabsConfig = {
  projectId: string;
  targetFolderName: string;
  targetFolderDecision: string;
  requiredTopLevelFields: string[];
  requiredBetDataKeys: string[];
  requiredServletDataKeys: string[];
};

export type VerificationProblem = {
  relativePath: string;
  message: string;
};

type ScaffoldFile = {
  relativePath: string;
  contents: (projectId: string) => string;
};

type RowFixture = {
  time?: string;
  stateId?: number;
  stateName?: string;
  bet?: number;
  win?: number;
  balance?: number;
  betData?: string;
  servletData?: string;
  extBetId?: string;
};

export type FixtureResolution = {
  requestedSelection: FixtureSelection;
  actualSelection: ResolvedFixtureSelection;
  actualFixtureKind: FixtureKind;
  fixturePath: string;
  relativeFixturePath: string;
  derivedFixturePath: string;
  relativeDerivedFixturePath: string;
  capturedSanitizedFixturePath: string;
  relativeCapturedSanitizedFixturePath: string;
  capturedRawFixturePath: string;
  relativeCapturedRawFixturePath: string;
  capturedSanitizedFixtureAvailable: boolean;
  capturedRawFixtureAvailable: boolean;
  capturedFixtureAvailable: boolean;
  capturedNotesPath: string;
  relativeCapturedNotesPath: string;
  comparisonPath: string;
  relativeComparisonPath: string;
};

export type ParsedRowFixture = {
  fixture: RowFixture;
  betData: Record<string, string>;
  servletData: Record<string, string>;
  roundId: string;
  fixtureProvenance: string;
  captureStatus: string;
  capturedRoundId: string;
  capturedRoundIdEvidence: string;
  resolution: FixtureResolution;
};

export type LocalReplayRow = {
  getValue: (key: string) => string | null;
  getExtBetId: () => string;
  getStateText: () => string;
  getStateID: () => number | string;
  getBet: () => number;
  getPayout: () => number;
  getBalance: () => number;
  getRoundID: () => string;
  setRoundID: (roundId: string) => void;
};

export type FixtureDifference = {
  field: string;
  derivedValue: string;
  capturedValue: string;
};

export type FixtureComparisonResult = {
  projectId: string;
  targetFolderName: string;
  comparisonMode: "derived-only" | "derived-vs-captured";
  derivedFixturePath: string;
  capturedFixturePath: string | null;
  capturedFixtureKind: FixtureKind | null;
  capturedFixtureAvailable: boolean;
  capturedNotesPath: string;
  confirmedFromCaptured: string[];
  derivedFromGsExamples: string[];
  derivedFromProjectFixture: string[];
  provisionalFields: string[];
  matchingFields: string[];
  differingFields: FixtureDifference[];
  derivedOnlyFields: string[];
  capturedOnlyFields: string[];
  notes: string[];
};

export type ReplaySummary = {
  projectId: string;
  targetFolderName: string;
  requestedFixtureSelection: FixtureSelection;
  actualFixtureSelection: ResolvedFixtureSelection;
  actualFixtureKind: FixtureKind;
  fixturePath: string;
  capturedFixtureAvailable: boolean;
  capturedNotesPath: string;
  comparisonPath: string;
  comparisonMode: "derived-only" | "derived-vs-captured";
  confirmedFromCaptured: string[];
  derivedFromGsExamples: string[];
  derivedFromProjectFixture: string[];
  provisionalFields: string[];
  differingFields: FixtureDifference[];
  roundId: string;
  capturedRoundId: string;
  capturedRoundIdEvidence: string;
  stateId: string;
  stateName: string;
  extBetId: string;
  bet: number;
  win: number;
  balance: number;
  currency: string;
  featureMode: string;
  entryState: string;
  resultState: string;
  followUpState: string;
  awardFreeSpins: string;
  counterFreeSpinsAwarded: string;
  triggerModalText: string;
  followUpCounterText: string;
  symbolGrid: string[][];
  followUpSymbolGrid: string[][];
  evidenceRefs: string[];
  evidenceRefCount: number;
  sourceCapture: string;
  donorId: string;
  fixtureKind: string;
  fixtureProvenance: string;
  captureStatus: string;
  sourceNote: string;
};

const REQUIRED_DIRECTORIES = ["contract", "renderer", "assets", "deploy", "tests"];

const PROJECT_CONFIGS: Record<string, ProjectVabsConfig> = {
  project_001: {
    projectId: "project_001",
    targetFolderName: "mysterygarden",
    targetFolderDecision: "provisional but intended",
    requiredTopLevelFields: [
      "time",
      "stateId",
      "stateName",
      "extBetId",
      "bet",
      "win",
      "balance",
      "betData",
      "servletData"
    ],
    requiredBetDataKeys: [
      "BET_TOTAL",
      "BETID",
      "COINSEQ",
      "ENTRY_STATE",
      "RESULT_STATE",
      "FOLLOW_UP_STATE",
      "FEATURE_MODE",
      "AWARD_FREE_SPINS",
      "COUNTER_FREE_SPINS_AWARDED",
      "CURRENCY",
      "TRIGGER_MODAL_TEXT",
      "FOLLOW_UP_COUNTER_TEXT",
      "SYMBOL_GRID",
      "FOLLOW_UP_SYMBOL_GRID",
      "EVIDENCE_REFS"
    ],
    requiredServletDataKeys: [
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
    ]
  }
};

const GS_EXAMPLE_DERIVED_FIELDS = ["FEATURE_MODE", "COUNTER_FREE_SPINS_AWARDED"];
const PROJECT_FIXTURE_DERIVED_FIELDS = [
  "ENTRY_STATE",
  "RESULT_STATE",
  "FOLLOW_UP_STATE",
  "AWARD_FREE_SPINS",
  "TRIGGER_MODAL_TEXT",
  "FOLLOW_UP_COUNTER_TEXT",
  "SYMBOL_GRID",
  "FOLLOW_UP_SYMBOL_GRID",
  "EVIDENCE_REFS"
];
const PROVISIONAL_FIELDS = [
  "time",
  "stateId",
  "stateName",
  "extBetId",
  "bet",
  "win",
  "balance",
  "BET_TOTAL",
  "BETID",
  "COINSEQ",
  "CURRENCY"
];
const COMPARABLE_FIELDS = [
  "time",
  "stateId",
  "stateName",
  "extBetId",
  "bet",
  "win",
  "balance",
  "ROUND_ID",
  "BET_TOTAL",
  "BETID",
  "COINSEQ",
  "ENTRY_STATE",
  "RESULT_STATE",
  "FOLLOW_UP_STATE",
  "FEATURE_MODE",
  "AWARD_FREE_SPINS",
  "COUNTER_FREE_SPINS_AWARDED",
  "CURRENCY",
  "TRIGGER_MODAL_TEXT",
  "FOLLOW_UP_COUNTER_TEXT",
  "SYMBOL_GRID",
  "FOLLOW_UP_SYMBOL_GRID",
  "EVIDENCE_REFS"
];

const REQUIRED_FILES: ScaffoldFile[] = [
  {
    relativePath: "README.md",
    contents: (projectId) =>
      `# ${projectId} VABS Workspace\n\nScaffold-only GS VABS workspace for ${projectId}.\n`
  },
  {
    relativePath: "contract/README.md",
    contents: () => "# VABS Contract Notes\n\nContract scaffold.\n"
  },
  {
    relativePath: "contract/archived-row-contract.md",
    contents: () =>
      "# Archived Row Contract\n\n`ROUND_ID` is mandatory and captured-vs-derived provenance must be documented.\n"
  },
  {
    relativePath: "contract/folder-name-mapping.md",
    contents: () =>
      "# Folder Name Mapping\n\nDocument the intended GS VABS folder-name decision here.\n"
  },
  {
    relativePath: "contract/betData-keys.md",
    contents: () => "# betData Keys\n\nDocument proven keys here.\n"
  },
  {
    relativePath: "contract/servletData-keys.md",
    contents: () => "# servletData Keys\n\nDocument proven keys here.\n"
  },
  {
    relativePath: "contract/captured-row-notes.md",
    contents: () =>
      "# Captured Row Attempt Notes\n\nRecord whether a real archived `playerBets` row was found, or what blocker kept the fixture derived.\n"
  },
  {
    relativePath: "contract/fixture-comparison.md",
    contents: () =>
      "# Fixture Comparison\n\nDocument how captured, sanitized, and derived row truth currently compare.\n"
  },
  {
    relativePath: "contract/sample-playerBets-row.json",
    contents: () =>
      JSON.stringify(
        {
          time: "20 Mar 2026 10:32:56",
          stateId: 317,
          stateName: "Free Spins Trigger",
          bet: 1,
          win: 0,
          balance: 103.5,
          betData:
            "BET_TOTAL=100~BETID=0~COINSEQ=100|100|100~ENTRY_STATE=state.spin~RESULT_STATE=state.free-spins-trigger~FOLLOW_UP_STATE=state.free-spins-active~FEATURE_MODE=FREE_SPINS~AWARD_FREE_SPINS=10~COUNTER_FREE_SPINS_AWARDED=10~CURRENCY=EUR~TRIGGER_MODAL_TEXT=YOU HAVE WON 10 FREE SPINS~FOLLOW_UP_COUNTER_TEXT=Free spins: 9/10~SYMBOL_GRID=KEY,ROSE,A|BOOK,KEY,ROSE|A,ROSE,KEY|BOOK,A,ROSE|ROSE,BOOK,A~FOLLOW_UP_SYMBOL_GRID=BOOK,ROSE,KEY|A,BOOK,ROSE|K,ROSE,BOOK|KEY,BOOK,A|ROSE,K,BOOK~EVIDENCE_REFS=MG-EV-20260320-WEB-A-001|MG-EV-20260320-WEB-A-006|MG-EV-20260320-WEB-A-007|MG-EV-20260320-WEB-A-005",
          servletData:
            "ROUND_ID=14099735306~PROJECT_ID=project_001~DONOR_ID=donor_001_mystery_garden~SOURCE_CAPTURE=MG-CS-20260320-WEB-A~FIXTURE_KIND=derived-contract-fixture~FIXTURE_PROVENANCE=derived-project-fixture-plus-gs-example-plus-captured-round-id~CAPTURE_STATUS=no-captured-playerbets-row__captured-round-id-only~CAPTURED_ROUND_ID=14099735306~CAPTURED_ROUND_ID_EVIDENCE=MG-EV-20260320-LIVE-A-005~SOURCE_NOTE=free-spins-trigger-shaped-from-project-fixture-and-gs-history-example;ROUND_ID-confirmed-from-live-init",
          extBetId: "project001-fs-trigger-0001"
        },
        null,
        2
      ) + "\n"
  },
  {
    relativePath: "contract/parsed-row-example.md",
    contents: () => "# Parsed Row Example\n\nDocument the parsed contract summary here.\n"
  },
  {
    relativePath: "renderer/README.md",
    contents: () => "# Renderer Scaffold\n\nTemplate-only scaffold.\n"
  },
  {
    relativePath: "renderer/code.template.js",
    contents: () =>
      "function start() {\n  console.log(\"Replace with project-local VABS renderer.\");\n}\n"
  },
  {
    relativePath: "renderer/strings_en.template.js",
    contents: () => "var game_strings = {};\n"
  },
  {
    relativePath: "renderer/mysterygarden/README.md",
    contents: () => "# Mystery Garden Renderer Stub\n\nProject-specific stub.\n"
  },
  {
    relativePath: "renderer/mysterygarden/code.js",
    contents: () =>
      "function start() {\n  console.log(\"project_001 mysterygarden stub\");\n}\n"
  },
  {
    relativePath: "renderer/mysterygarden/strings_en.js",
    contents: () => "var game_strings = {};\n"
  },
  {
    relativePath: "assets/README.md",
    contents: () => "# VABS Assets Notes\n\nScaffold-only asset notes.\n"
  },
  {
    relativePath: "deploy/README.md",
    contents: () => "# VABS Deploy Notes\n\nScaffold-only deploy notes.\n"
  },
  {
    relativePath: "deploy/static-host-checklist.md",
    contents: () =>
      "# Static Host Checklist\n\n- [ ] `/common/vabs/<folder>/code.js` is served.\n"
  },
  {
    relativePath: "tests/README.md",
    contents: () => "# VABS Acceptance Notes\n\nScaffold-only acceptance notes.\n"
  },
  {
    relativePath: "tests/acceptance-checklist.md",
    contents: () =>
      "# Acceptance Checklist\n\n- [ ] `ROUND_ID` is documented.\n- [ ] Renderer template exists.\n"
  }
];

function sortedUnique(values: string[]): string[] {
  return Array.from(new Set(values.filter((value) => value.length > 0))).sort();
}

function normalizeFieldValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "number") {
    return String(value);
  }
  return String(value).trim();
}

function extractComparableFieldValues(parsed: ParsedRowFixture): Record<string, string> {
  return {
    time: normalizeFieldValue(parsed.fixture.time),
    stateId: normalizeFieldValue(parsed.fixture.stateId),
    stateName: normalizeFieldValue(parsed.fixture.stateName),
    extBetId: normalizeFieldValue(parsed.fixture.extBetId),
    bet: normalizeFieldValue(parsed.fixture.bet),
    win: normalizeFieldValue(parsed.fixture.win),
    balance: normalizeFieldValue(parsed.fixture.balance),
    ROUND_ID: normalizeFieldValue(parsed.roundId),
    BET_TOTAL: normalizeFieldValue(parsed.betData.BET_TOTAL),
    BETID: normalizeFieldValue(parsed.betData.BETID),
    COINSEQ: normalizeFieldValue(parsed.betData.COINSEQ),
    ENTRY_STATE: normalizeFieldValue(parsed.betData.ENTRY_STATE),
    RESULT_STATE: normalizeFieldValue(parsed.betData.RESULT_STATE),
    FOLLOW_UP_STATE: normalizeFieldValue(parsed.betData.FOLLOW_UP_STATE),
    FEATURE_MODE: normalizeFieldValue(parsed.betData.FEATURE_MODE),
    AWARD_FREE_SPINS: normalizeFieldValue(parsed.betData.AWARD_FREE_SPINS),
    COUNTER_FREE_SPINS_AWARDED: normalizeFieldValue(parsed.betData.COUNTER_FREE_SPINS_AWARDED),
    CURRENCY: normalizeFieldValue(parsed.betData.CURRENCY),
    TRIGGER_MODAL_TEXT: normalizeFieldValue(parsed.betData.TRIGGER_MODAL_TEXT),
    FOLLOW_UP_COUNTER_TEXT: normalizeFieldValue(parsed.betData.FOLLOW_UP_COUNTER_TEXT),
    SYMBOL_GRID: normalizeFieldValue(parsed.betData.SYMBOL_GRID),
    FOLLOW_UP_SYMBOL_GRID: normalizeFieldValue(parsed.betData.FOLLOW_UP_SYMBOL_GRID),
    EVIDENCE_REFS: normalizeFieldValue(parsed.betData.EVIDENCE_REFS)
  };
}

export function parseProjectIdArg(): string {
  return process.argv[2] ?? DEFAULT_PROJECT_ID;
}

export function parseFixtureSelectionArg(args = process.argv.slice(2)): FixtureSelection {
  const selectionArgs = args.slice(1);
  for (const arg of selectionArgs) {
    if (arg === "auto" || arg === "derived" || arg === "captured") {
      return arg;
    }
    if (arg.startsWith("--fixture=")) {
      const value = arg.slice("--fixture=".length);
      if (value === "auto" || value === "derived" || value === "captured") {
        return value;
      }
      throw new Error(`Unknown fixture selection: ${value}`);
    }
  }
  return "auto";
}

export function getProjectConfig(projectId: string): ProjectVabsConfig {
  const config = PROJECT_CONFIGS[projectId];
  if (!config) {
    throw new Error(`No GS VABS config is defined yet for ${projectId}`);
  }
  return config;
}

export function getProjectRoot(projectId: string, repoRoot = getRepoRoot()): string {
  return path.join(repoRoot, "40_projects", projectId);
}

export function getVabsRoot(projectId: string, repoRoot = getRepoRoot()): string {
  return path.join(getProjectRoot(projectId, repoRoot), "vabs");
}

export function getDerivedFixturePath(projectId: string, repoRoot = getRepoRoot()): string {
  return path.join(getVabsRoot(projectId, repoRoot), "contract", "sample-playerBets-row.json");
}

export function getCapturedSanitizedFixturePath(projectId: string, repoRoot = getRepoRoot()): string {
  return path.join(getVabsRoot(projectId, repoRoot), "contract", "captured-playerBets-row.sanitized.json");
}

export function getCapturedRawFixturePath(projectId: string, repoRoot = getRepoRoot()): string {
  return path.join(getVabsRoot(projectId, repoRoot), "contract", "captured-playerBets-row.json");
}

export function getCapturedNotesPath(projectId: string, repoRoot = getRepoRoot()): string {
  return path.join(getVabsRoot(projectId, repoRoot), "contract", "captured-row-notes.md");
}

export function getFixtureComparisonPath(projectId: string, repoRoot = getRepoRoot()): string {
  return path.join(getVabsRoot(projectId, repoRoot), "contract", "fixture-comparison.md");
}

export function getRowFixturePath(
  projectId: string,
  repoRoot = getRepoRoot(),
  selection: FixtureSelection = "auto"
): string {
  return resolveFixtureSelection(projectId, repoRoot, selection).fixturePath;
}

export function getRendererEntryPath(projectId: string, repoRoot = getRepoRoot()): string {
  const config = getProjectConfig(projectId);
  return path.join(getVabsRoot(projectId, repoRoot), "renderer", config.targetFolderName, "code.js");
}

export function resolveFixtureSelection(
  projectId: string,
  repoRoot = getRepoRoot(),
  selection: FixtureSelection = "auto"
): FixtureResolution {
  const derivedPath = getDerivedFixturePath(projectId, repoRoot);
  const capturedSanitizedPath = getCapturedSanitizedFixturePath(projectId, repoRoot);
  const capturedRawPath = getCapturedRawFixturePath(projectId, repoRoot);
  const capturedNotesPath = getCapturedNotesPath(projectId, repoRoot);
  const comparisonPath = getFixtureComparisonPath(projectId, repoRoot);
  const capturedSanitizedFixtureAvailable = existsSync(capturedSanitizedPath);
  const capturedRawFixtureAvailable = existsSync(capturedRawPath);
  const capturedFixtureAvailable = capturedSanitizedFixtureAvailable || capturedRawFixtureAvailable;

  if (selection === "captured" && !capturedFixtureAvailable) {
    throw new Error(
      `No captured playerBets row is available yet for ${projectId}; see ${path.relative(repoRoot, capturedNotesPath)}`
    );
  }

  let actualFixtureKind: FixtureKind = "derived";
  if (selection === "captured" || (selection === "auto" && capturedFixtureAvailable)) {
    actualFixtureKind = capturedSanitizedFixtureAvailable ? "captured-sanitized" : "captured-raw-local";
  }

  const actualSelection: ResolvedFixtureSelection = actualFixtureKind === "derived" ? "derived" : "captured";
  const fixturePath =
    actualFixtureKind === "captured-sanitized"
      ? capturedSanitizedPath
      : actualFixtureKind === "captured-raw-local"
        ? capturedRawPath
        : derivedPath;

  return {
    requestedSelection: selection,
    actualSelection,
    actualFixtureKind,
    fixturePath,
    relativeFixturePath: path.relative(repoRoot, fixturePath),
    derivedFixturePath: derivedPath,
    relativeDerivedFixturePath: path.relative(repoRoot, derivedPath),
    capturedSanitizedFixturePath: capturedSanitizedPath,
    relativeCapturedSanitizedFixturePath: path.relative(repoRoot, capturedSanitizedPath),
    capturedRawFixturePath: capturedRawPath,
    relativeCapturedRawFixturePath: path.relative(repoRoot, capturedRawPath),
    capturedSanitizedFixtureAvailable,
    capturedRawFixtureAvailable,
    capturedFixtureAvailable,
    capturedNotesPath,
    relativeCapturedNotesPath: path.relative(repoRoot, capturedNotesPath),
    comparisonPath,
    relativeComparisonPath: path.relative(repoRoot, comparisonPath)
  };
}

export function ensureScaffold(projectId: string, repoRoot = getRepoRoot()): {
  createdDirectories: string[];
  createdFiles: string[];
} {
  const vabsRoot = getVabsRoot(projectId, repoRoot);
  const createdDirectories: string[] = [];
  const createdFiles: string[] = [];

  if (!existsSync(vabsRoot)) {
    mkdirSync(vabsRoot, { recursive: true });
    createdDirectories.push(path.relative(repoRoot, vabsRoot));
  }

  for (const directory of REQUIRED_DIRECTORIES) {
    const directoryPath = path.join(vabsRoot, directory);
    if (!existsSync(directoryPath)) {
      mkdirSync(directoryPath, { recursive: true });
      createdDirectories.push(path.relative(repoRoot, directoryPath));
    }
  }

  for (const file of REQUIRED_FILES) {
    const filePath = path.join(vabsRoot, file.relativePath);
    if (!existsSync(filePath)) {
      mkdirSync(path.dirname(filePath), { recursive: true });
      writeFileSync(filePath, file.contents(projectId), "utf8");
      createdFiles.push(path.relative(repoRoot, filePath));
    }
  }

  return { createdDirectories, createdFiles };
}

export function parseKeyValueBag(text: string): Record<string, string> {
  if (!text) {
    return {};
  }

  const result: Record<string, string> = {};
  for (const entry of text.split("~")) {
    const trimmed = entry.trim();
    if (trimmed.length === 0) {
      continue;
    }
    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) {
      result[trimmed] = "";
      continue;
    }
    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1);
    result[key] = value;
  }
  return result;
}

export function parseDelimitedList(text: string, delimiter = "|"): string[] {
  if (!text) {
    return [];
  }

  return text
    .split(delimiter)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

export function parseSymbolGrid(text: string): string[][] {
  return parseDelimitedList(text).map((column) =>
    column
      .split(",")
      .map((cell) => cell.trim())
      .filter((cell) => cell.length > 0)
  );
}

export function readRowFixture(
  projectId: string,
  repoRoot = getRepoRoot(),
  selection: FixtureSelection = "auto"
): { fixture: RowFixture; resolution: FixtureResolution } {
  const resolution = resolveFixtureSelection(projectId, repoRoot, selection);
  return {
    fixture: JSON.parse(readFileSync(resolution.fixturePath, "utf8")) as RowFixture,
    resolution
  };
}

export function parseRowFixture(
  projectId: string,
  repoRoot = getRepoRoot(),
  selection: FixtureSelection = "auto"
): ParsedRowFixture {
  const { fixture, resolution } = readRowFixture(projectId, repoRoot, selection);
  const betData = parseKeyValueBag(fixture.betData ?? "");
  const servletData = parseKeyValueBag(fixture.servletData ?? "");
  const roundId = servletData.ROUND_ID ?? betData.ROUND_ID ?? "";

  return {
    fixture,
    betData,
    servletData,
    roundId,
    fixtureProvenance: servletData.FIXTURE_PROVENANCE ?? servletData.FIXTURE_KIND ?? resolution.actualFixtureKind,
    captureStatus:
      servletData.CAPTURE_STATUS ??
      (resolution.actualSelection === "captured" ? "captured-playerbets-row" : "derived-contract-fixture"),
    capturedRoundId: servletData.CAPTURED_ROUND_ID ?? roundId,
    capturedRoundIdEvidence: servletData.CAPTURED_ROUND_ID_EVIDENCE ?? "",
    resolution
  };
}

export function createLocalReplayRow(
  projectId: string,
  repoRoot = getRepoRoot(),
  selection: FixtureSelection = "auto"
): LocalReplayRow {
  const parsed = parseRowFixture(projectId, repoRoot, selection);
  let currentRoundId = parsed.roundId;

  return {
    getValue(key: string): string | null {
      if (key in parsed.betData) {
        return parsed.betData[key];
      }
      if (key in parsed.servletData) {
        return parsed.servletData[key];
      }
      return null;
    },
    getExtBetId(): string {
      return parsed.fixture.extBetId ?? "";
    },
    getStateText(): string {
      return parsed.fixture.stateName ?? "";
    },
    getStateID(): number | string {
      return parsed.fixture.stateId ?? "";
    },
    getBet(): number {
      return Number(parsed.fixture.bet ?? 0);
    },
    getPayout(): number {
      return Number(parsed.fixture.win ?? 0);
    },
    getBalance(): number {
      return Number(parsed.fixture.balance ?? 0);
    },
    getRoundID(): string {
      return currentRoundId;
    },
    setRoundID(roundId: string): void {
      currentRoundId = roundId;
    }
  };
}

export function buildFixtureComparison(
  projectId: string,
  repoRoot = getRepoRoot()
): FixtureComparisonResult {
  const config = getProjectConfig(projectId);
  const derived = parseRowFixture(projectId, repoRoot, "derived");
  const resolution = resolveFixtureSelection(projectId, repoRoot, "auto");
  const notes = [
    "The compare lane is deterministic and local-first.",
    "A captured raw fixture should stay local-only and is expected at contract/captured-playerBets-row.json.",
    "A public-safe sanitized captured fixture should be committed only at contract/captured-playerBets-row.sanitized.json."
  ];

  if (!resolution.capturedFixtureAvailable) {
    return {
      projectId,
      targetFolderName: config.targetFolderName,
      comparisonMode: "derived-only",
      derivedFixturePath: resolution.relativeDerivedFixturePath,
      capturedFixturePath: null,
      capturedFixtureKind: null,
      capturedFixtureAvailable: false,
      capturedNotesPath: resolution.relativeCapturedNotesPath,
      confirmedFromCaptured: ["ROUND_ID"],
      derivedFromGsExamples: GS_EXAMPLE_DERIVED_FIELDS,
      derivedFromProjectFixture: PROJECT_FIXTURE_DERIVED_FIELDS,
      provisionalFields: PROVISIONAL_FIELDS,
      matchingFields: [],
      differingFields: [],
      derivedOnlyFields: sortedUnique(COMPARABLE_FIELDS.filter((field) => extractComparableFieldValues(derived)[field])),
      capturedOnlyFields: [],
      notes: notes.concat([
        "No captured archived playerBets row is available yet.",
        "The strongest grounded capture is MG-EV-20260320-LIVE-A-005, which confirms ROUND_ID=14099735306 from a live init response rather than a history row.",
        "That same live init response reports currency code FUN, while the current derived fixture still uses CURRENCY=EUR until a captured archived row confirms the transport value."
      ])
    };
  }

  const captured = parseRowFixture(projectId, repoRoot, "captured");
  const derivedValues = extractComparableFieldValues(derived);
  const capturedValues = extractComparableFieldValues(captured);
  const matchingFields: string[] = [];
  const differingFields: FixtureDifference[] = [];
  const derivedOnlyFields: string[] = [];
  const capturedOnlyFields: string[] = [];
  const confirmedFromCaptured: string[] = [];

  for (const field of COMPARABLE_FIELDS) {
    const derivedValue = derivedValues[field] ?? "";
    const capturedValue = capturedValues[field] ?? "";

    if (capturedValue) {
      confirmedFromCaptured.push(field);
    }

    if (derivedValue && capturedValue) {
      if (derivedValue === capturedValue) {
        matchingFields.push(field);
      } else {
        differingFields.push({ field, derivedValue, capturedValue });
      }
      continue;
    }

    if (derivedValue && !capturedValue) {
      derivedOnlyFields.push(field);
    }
    if (!derivedValue && capturedValue) {
      capturedOnlyFields.push(field);
    }
  }

  return {
    projectId,
    targetFolderName: config.targetFolderName,
    comparisonMode: "derived-vs-captured",
    derivedFixturePath: resolution.relativeDerivedFixturePath,
    capturedFixturePath: captured.resolution.relativeFixturePath,
    capturedFixtureKind: captured.resolution.actualFixtureKind,
    capturedFixtureAvailable: true,
    capturedNotesPath: resolution.relativeCapturedNotesPath,
    confirmedFromCaptured: sortedUnique(confirmedFromCaptured),
    derivedFromGsExamples: GS_EXAMPLE_DERIVED_FIELDS,
    derivedFromProjectFixture: PROJECT_FIXTURE_DERIVED_FIELDS,
    provisionalFields: PROVISIONAL_FIELDS.filter((field) => !(capturedValues[field] ?? "").length),
    matchingFields: sortedUnique(matchingFields),
    differingFields,
    derivedOnlyFields: sortedUnique(derivedOnlyFields),
    capturedOnlyFields: sortedUnique(capturedOnlyFields),
    notes: notes.concat([
      "Auto fixture selection prefers a sanitized captured fixture over a local raw captured fixture.",
      "Any differing fields must be treated as comparison signals, not automatic errors."
    ])
  };
}

export function renderFixtureComparisonMarkdown(comparison: FixtureComparisonResult): string {
  const lines: string[] = [
    "# Fixture Comparison",
    "",
    `This file tracks captured-vs-derived truth for \`${comparison.projectId}\`.`,
    "",
    "## Fixture Inputs",
    `- Derived fixture: \`${comparison.derivedFixturePath}\``,
    comparison.capturedFixturePath
      ? `- Captured fixture: \`${comparison.capturedFixturePath}\``
      : "- Captured fixture: none committed yet",
    comparison.capturedFixtureKind
      ? `- Captured fixture kind: \`${comparison.capturedFixtureKind}\``
      : "- Captured fixture kind: none",
    `- Comparison mode: \`${comparison.comparisonMode}\``,
    `- Captured-row notes: \`${comparison.capturedNotesPath}\``,
    "",
    "## Confirmed From Captured Data",
    ...(comparison.confirmedFromCaptured.length
      ? comparison.confirmedFromCaptured.map((field) => `- \`${field}\``)
      : ["- none"]),
    "",
    "## Derived From GS Examples",
    ...comparison.derivedFromGsExamples.map((field) => `- \`${field}\``),
    "",
    "## Derived From Project Fixture",
    ...comparison.derivedFromProjectFixture.map((field) => `- \`${field}\``),
    "",
    "## Provisional For Project 001",
    ...(comparison.provisionalFields.length
      ? comparison.provisionalFields.map((field) => `- \`${field}\``)
      : ["- none"]),
    ""
  ];

  if (comparison.comparisonMode === "derived-vs-captured") {
    lines.push(
      "## Matching Fields",
      ...(comparison.matchingFields.length
        ? comparison.matchingFields.map((field) => `- \`${field}\``)
        : ["- none"]),
      "",
      "## Differing Fields",
      ...(comparison.differingFields.length
        ? comparison.differingFields.map(
            (difference) =>
              `- \`${difference.field}\`: derived=\`${difference.derivedValue || "-"}\`, captured=\`${difference.capturedValue || "-"}\``
          )
        : ["- none"]),
      "",
      "## Derived-Only Fields",
      ...(comparison.derivedOnlyFields.length
        ? comparison.derivedOnlyFields.map((field) => `- \`${field}\``)
        : ["- none"]),
      "",
      "## Captured-Only Fields",
      ...(comparison.capturedOnlyFields.length
        ? comparison.capturedOnlyFields.map((field) => `- \`${field}\``)
        : ["- none"]),
      ""
    );
  } else {
    lines.push(
      "## Current Blocker",
      "- No full captured archived `playerBets` row is available yet, so field-by-field archived-row comparison cannot run yet.",
      "- The current compare lane therefore anchors only the confirmed `ROUND_ID` plus the documented derived/provisional buckets.",
      "- Captured live init evidence reports currency code `FUN`, while the derived fixture still uses `CURRENCY=EUR`; that mismatch remains provisional until a captured archived row is available.",
      ""
    );
  }

  lines.push(
    "## Notes",
    ...comparison.notes.map((note) => `- ${note}`),
    ""
  );

  return `${lines.join("\n")}\n`;
}

export function buildReplaySummary(
  projectId: string,
  repoRoot = getRepoRoot(),
  selection: FixtureSelection = "auto"
): ReplaySummary {
  const config = getProjectConfig(projectId);
  const parsed = parseRowFixture(projectId, repoRoot, selection);
  const comparison = buildFixtureComparison(projectId, repoRoot);
  const symbolGrid = parseSymbolGrid(parsed.betData.SYMBOL_GRID ?? "");
  const followUpSymbolGrid = parseSymbolGrid(parsed.betData.FOLLOW_UP_SYMBOL_GRID ?? "");
  const evidenceRefs = parseDelimitedList(parsed.betData.EVIDENCE_REFS ?? "");

  return {
    projectId,
    targetFolderName: config.targetFolderName,
    requestedFixtureSelection: parsed.resolution.requestedSelection,
    actualFixtureSelection: parsed.resolution.actualSelection,
    actualFixtureKind: parsed.resolution.actualFixtureKind,
    fixturePath: parsed.resolution.relativeFixturePath,
    capturedFixtureAvailable: parsed.resolution.capturedFixtureAvailable,
    capturedNotesPath: parsed.resolution.relativeCapturedNotesPath,
    comparisonPath: parsed.resolution.relativeComparisonPath,
    comparisonMode: comparison.comparisonMode,
    confirmedFromCaptured: comparison.confirmedFromCaptured,
    derivedFromGsExamples: comparison.derivedFromGsExamples,
    derivedFromProjectFixture: comparison.derivedFromProjectFixture,
    provisionalFields: comparison.provisionalFields,
    differingFields: comparison.differingFields,
    roundId: parsed.roundId,
    capturedRoundId: parsed.capturedRoundId,
    capturedRoundIdEvidence: parsed.capturedRoundIdEvidence,
    stateId: String(parsed.fixture.stateId ?? ""),
    stateName: parsed.fixture.stateName ?? "",
    extBetId: parsed.fixture.extBetId ?? "",
    bet: Number(parsed.fixture.bet ?? 0),
    win: Number(parsed.fixture.win ?? 0),
    balance: Number(parsed.fixture.balance ?? 0),
    currency: parsed.betData.CURRENCY ?? "",
    featureMode: parsed.betData.FEATURE_MODE ?? "",
    entryState: parsed.betData.ENTRY_STATE ?? "",
    resultState: parsed.betData.RESULT_STATE ?? "",
    followUpState: parsed.betData.FOLLOW_UP_STATE ?? "",
    awardFreeSpins: parsed.betData.AWARD_FREE_SPINS ?? "",
    counterFreeSpinsAwarded: parsed.betData.COUNTER_FREE_SPINS_AWARDED ?? "",
    triggerModalText: parsed.betData.TRIGGER_MODAL_TEXT ?? "",
    followUpCounterText: parsed.betData.FOLLOW_UP_COUNTER_TEXT ?? "",
    symbolGrid,
    followUpSymbolGrid,
    evidenceRefs,
    evidenceRefCount: evidenceRefs.length,
    sourceCapture: parsed.servletData.SOURCE_CAPTURE ?? "",
    donorId: parsed.servletData.DONOR_ID ?? "",
    fixtureKind: parsed.servletData.FIXTURE_KIND ?? "",
    fixtureProvenance: parsed.fixtureProvenance,
    captureStatus: parsed.captureStatus,
    sourceNote: parsed.servletData.SOURCE_NOTE ?? ""
  };
}

function verifyRowFixture(
  projectId: string,
  repoRoot: string,
  problems: VerificationProblem[],
  selection: ResolvedFixtureSelection
): void {
  const config = getProjectConfig(projectId);
  const parsed = parseRowFixture(projectId, repoRoot, selection);
  const label = parsed.resolution.relativeFixturePath;

  for (const field of config.requiredTopLevelFields) {
    if (!(field in parsed.fixture)) {
      problems.push({
        relativePath: label,
        message: `${selection} row is missing top-level field ${field}`
      });
    }
  }

  if (!parsed.roundId || !/^\d+$/.test(parsed.roundId)) {
    problems.push({
      relativePath: label,
      message: "ROUND_ID is missing or not numeric"
    });
  }

  for (const key of config.requiredBetDataKeys) {
    if (!(key in parsed.betData)) {
      problems.push({
        relativePath: label,
        message: `betData is missing ${key}`
      });
    }
  }

  for (const key of config.requiredServletDataKeys) {
    if (!(key in parsed.servletData)) {
      problems.push({
        relativePath: label,
        message: `servletData is missing ${key}`
      });
    }
  }
}

export function verifyScaffold(projectId: string, repoRoot = getRepoRoot()): VerificationProblem[] {
  const config = getProjectConfig(projectId);
  const vabsRoot = getVabsRoot(projectId, repoRoot);
  const problems: VerificationProblem[] = [];

  for (const directory of REQUIRED_DIRECTORIES) {
    const directoryPath = path.join(vabsRoot, directory);
    if (!existsSync(directoryPath)) {
      problems.push({
        relativePath: path.relative(repoRoot, directoryPath),
        message: "Required directory is missing"
      });
    }
  }

  for (const file of REQUIRED_FILES) {
    const filePath = path.join(vabsRoot, file.relativePath);
    if (!existsSync(filePath)) {
      problems.push({
        relativePath: path.relative(repoRoot, filePath),
        message: "Required scaffold file is missing"
      });
    }
  }

  const roundIdDocs = [
    "contract/archived-row-contract.md",
    "contract/captured-row-notes.md",
    "contract/fixture-comparison.md",
    "tests/acceptance-checklist.md"
  ];
  for (const relativePath of roundIdDocs) {
    const filePath = path.join(vabsRoot, relativePath);
    if (!existsSync(filePath)) {
      continue;
    }
    const text = readFileSync(filePath, "utf8");
    if (!text.includes("ROUND_ID")) {
      problems.push({
        relativePath: path.relative(repoRoot, filePath),
        message: "ROUND_ID is not documented"
      });
    }
  }

  const capturedNotesPath = getCapturedNotesPath(projectId, repoRoot);
  if (existsSync(capturedNotesPath)) {
    const text = readFileSync(capturedNotesPath, "utf8");
    if (!text.toLowerCase().includes("captured")) {
      problems.push({
        relativePath: path.relative(repoRoot, capturedNotesPath),
        message: "Captured-row notes do not describe captured evidence status"
      });
    }
    if (!text.toLowerCase().includes("derived")) {
      problems.push({
        relativePath: path.relative(repoRoot, capturedNotesPath),
        message: "Captured-row notes do not distinguish derived fixture status"
      });
    }
    if (!text.includes("captured-playerBets-row.sanitized.json")) {
      problems.push({
        relativePath: path.relative(repoRoot, capturedNotesPath),
        message: "Captured-row notes do not mention the sanitized captured intake path"
      });
    }
    if (!text.includes("captured-playerBets-row.json")) {
      problems.push({
        relativePath: path.relative(repoRoot, capturedNotesPath),
        message: "Captured-row notes do not mention the local raw captured intake path"
      });
    }
  }

  const comparisonPath = getFixtureComparisonPath(projectId, repoRoot);
  if (existsSync(comparisonPath)) {
    const text = readFileSync(comparisonPath, "utf8");
    if (!text.includes("Confirmed From Captured Data")) {
      problems.push({
        relativePath: path.relative(repoRoot, comparisonPath),
        message: "Fixture comparison file does not include confirmed captured fields"
      });
    }
    if (!text.includes("Provisional For Project 001")) {
      problems.push({
        relativePath: path.relative(repoRoot, comparisonPath),
        message: "Fixture comparison file does not include provisional fields"
      });
    }
  }

  const gitignorePath = path.join(repoRoot, ".gitignore");
  if (existsSync(gitignorePath)) {
    const text = readFileSync(gitignorePath, "utf8");
    if (!text.includes(RAW_CAPTURE_GITIGNORE_ENTRY)) {
      problems.push({
        relativePath: path.relative(repoRoot, gitignorePath),
        message: "Raw captured row intake path is not gitignored"
      });
    }
  }

  const derivedRowPath = getDerivedFixturePath(projectId, repoRoot);
  if (existsSync(derivedRowPath)) {
    verifyRowFixture(projectId, repoRoot, problems, "derived");
  }

  if (resolveFixtureSelection(projectId, repoRoot, "auto").capturedFixtureAvailable) {
    verifyRowFixture(projectId, repoRoot, problems, "captured");
  }

  const folderNameMappingPath = path.join(vabsRoot, "contract", "folder-name-mapping.md");
  if (existsSync(folderNameMappingPath)) {
    const text = readFileSync(folderNameMappingPath, "utf8");
    if (!text.includes(config.targetFolderName)) {
      problems.push({
        relativePath: path.relative(repoRoot, folderNameMappingPath),
        message: `Folder-name mapping does not mention ${config.targetFolderName}`
      });
    }
    if (!text.toLowerCase().includes(config.targetFolderDecision)) {
      problems.push({
        relativePath: path.relative(repoRoot, folderNameMappingPath),
        message: `Folder-name mapping does not mention decision status ${config.targetFolderDecision}`
      });
    }
  }

  const stubFiles = [
    `renderer/${config.targetFolderName}/README.md`,
    `renderer/${config.targetFolderName}/code.js`,
    `renderer/${config.targetFolderName}/strings_en.js`
  ];
  for (const relativePath of stubFiles) {
    const filePath = path.join(vabsRoot, relativePath);
    if (!existsSync(filePath)) {
      problems.push({
        relativePath: path.relative(repoRoot, filePath),
        message: "Project-specific renderer stub file is missing"
      });
    }
  }

  return problems;
}
