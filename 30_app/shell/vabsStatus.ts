import { promises as fs } from "node:fs";
import path from "node:path";

interface PackageJsonShape {
  scripts?: Record<string, string>;
}

export interface ProjectVabsStatus {
  projectId: string;
  relativeRoot: string;
  currentStatus: string;
  targetFolderToken: string | null;
  folderDecisionStatus: string | null;
  selectionMode: "auto";
  activeFixtureSource: "captured" | "derived";
  activeFixtureSummary: string;
  capturedRow: {
    rawExists: boolean;
    sanitizedExists: boolean;
  };
  capturedSession: {
    rawExists: boolean;
    sanitizedExists: boolean;
  };
  exportPackagePath: string;
  exportPackageExists: boolean;
  commands: {
    replay: boolean;
    compare: boolean;
    exportPackage: boolean;
    preview: boolean;
    mock: boolean;
    smoke: boolean;
    intakeRow: boolean;
    sanitizeRow: boolean;
    verifyCapturedRow: boolean;
    intakeSession: boolean;
    sanitizeSession: boolean;
    verifyCapturedSession: boolean;
  };
  currentBlocker: string;
  nextRecommendedAction: string;
  operatorCommands: readonly string[];
  operatorPaths: readonly string[];
  confirmedRoundId: string | null;
  confirmedRoundEvidence: string | null;
}

interface BuildProjectVabsStatusOptions {
  workspaceRoot: string;
  projectId: string;
  projectRoot: string;
}

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function readOptionalTextFile(filePath: string): Promise<string | null> {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException | undefined)?.code === "ENOENT") {
      return null;
    }

    throw error;
  }
}

async function readPackageScripts(workspaceRoot: string): Promise<Record<string, string>> {
  const packagePath = path.join(workspaceRoot, "package.json");
  const raw = await fs.readFile(packagePath, "utf8");
  const parsed = JSON.parse(raw) as PackageJsonShape;
  return typeof parsed.scripts === "object" && parsed.scripts
    ? parsed.scripts
    : {};
}

function extractMarkdownValue(markdown: string | null, pattern: RegExp): string | null {
  if (!markdown) {
    return null;
  }

  const match = markdown.match(pattern);
  return match?.[1]?.trim() ?? null;
}

function getActiveFixtureState(options: {
  rawRowExists: boolean;
  sanitizedRowExists: boolean;
  rawSessionExists: boolean;
  sanitizedSessionExists: boolean;
}): Pick<ProjectVabsStatus, "activeFixtureSource" | "activeFixtureSummary"> {
  if (options.sanitizedSessionExists) {
    return {
      activeFixtureSource: "captured",
      activeFixtureSummary: "auto -> sanitized captured session"
    };
  }

  if (options.sanitizedRowExists) {
    return {
      activeFixtureSource: "captured",
      activeFixtureSummary: "auto -> sanitized captured row"
    };
  }

  if (options.rawSessionExists || options.rawRowExists) {
    return {
      activeFixtureSource: "derived",
      activeFixtureSummary: "auto -> derived fixtures (raw captured data still waiting for sanitize)"
    };
  }

  return {
    activeFixtureSource: "derived",
    activeFixtureSummary: "auto -> derived row + derived session fixtures"
  };
}

function buildCurrentBlocker(options: {
  rawRowExists: boolean;
  sanitizedRowExists: boolean;
  rawSessionExists: boolean;
  sanitizedSessionExists: boolean;
}): string {
  if (options.sanitizedSessionExists) {
    return "No current real-data blocker. A sanitized captured archived session is available for replay/export/mock proof.";
  }

  if (options.sanitizedRowExists) {
    return "A sanitized captured archived row is available, but no sanitized archived session is available yet.";
  }

  if (options.rawSessionExists) {
    return "A raw local-only archived session exists, but the sanitized commit-safe session is still missing.";
  }

  if (options.rawRowExists) {
    return "A raw local-only archived row exists, but the sanitized commit-safe row is still missing.";
  }

  return "No real Mystery Garden archived playerBets row or playerBets[] session is available in the accessible donor/canonical material yet.";
}

function buildNextRecommendedAction(projectId: string, options: {
  rawRowExists: boolean;
  sanitizedRowExists: boolean;
  rawSessionExists: boolean;
  sanitizedSessionExists: boolean;
}): string {
  if (options.sanitizedSessionExists) {
    return `Re-run compare/export/preview/mock/smoke against the sanitized captured session for ${projectId}.`;
  }

  if (options.sanitizedRowExists) {
    return `Use the sanitized captured row to rerun compare/replay/export/preview/mock/smoke for ${projectId}, or capture a real archived session next.`;
  }

  if (options.rawSessionExists) {
    return `Sanitize the local raw session, verify it, then rerun compare/export/preview/mock/smoke for ${projectId}.`;
  }

  if (options.rawRowExists) {
    return `Sanitize the local raw row, verify it, then rerun compare/replay/export/preview/mock/smoke for ${projectId}.`;
  }

  return `Capture one real sanitized archived row or session for ${projectId} and push it through the existing intake flow before doing more VABS renderer work.`;
}

function buildOperatorCommands(projectId: string, options: {
  rawRowExists: boolean;
  sanitizedRowExists: boolean;
  rawSessionExists: boolean;
  sanitizedSessionExists: boolean;
}): readonly string[] {
  if (options.sanitizedSessionExists) {
    return [
      `npm run vabs:verify:captured-session:${projectId}`,
      `npm run vabs:compare:${projectId}`,
      `npm run vabs:export:${projectId} -- --row-index 1`,
      `npm run vabs:preview:${projectId} -- --row-index 1`,
      `npm run vabs:mock:${projectId}`,
      `npm run vabs:smoke:${projectId}`
    ];
  }

  if (options.sanitizedRowExists) {
    return [
      `npm run vabs:verify:captured:${projectId}`,
      `npm run vabs:compare:${projectId}`,
      `npm run vabs:replay:${projectId}`,
      `npm run vabs:export:${projectId}`,
      `npm run vabs:preview:${projectId}`,
      `npm run vabs:mock:${projectId}`
    ];
  }

  if (options.rawSessionExists) {
    return [
      `npm run vabs:sanitize:session:${projectId}`,
      `npm run vabs:verify:captured-session:${projectId}`,
      `npm run vabs:compare:${projectId}`,
      `npm run vabs:preview:${projectId} -- --row-index 1`,
      `npm run vabs:mock:${projectId}`,
      `npm run vabs:smoke:${projectId}`
    ];
  }

  if (options.rawRowExists) {
    return [
      `npm run vabs:sanitize:${projectId}`,
      `npm run vabs:verify:captured:${projectId}`,
      `npm run vabs:compare:${projectId}`,
      `npm run vabs:replay:${projectId}`,
      `npm run vabs:export:${projectId}`,
      `npm run vabs:mock:${projectId}`
    ];
  }

  return [
    `npm run vabs:intake:${projectId} -- --source <path-to-raw-row.json>`,
    `npm run vabs:sanitize:${projectId}`,
    `npm run vabs:verify:captured:${projectId}`,
    `npm run vabs:intake:session:${projectId} -- --source <path-to-raw-session.json>`,
    `npm run vabs:sanitize:session:${projectId}`,
    `npm run vabs:compare:${projectId}`,
    `npm run vabs:mock:${projectId}`
  ];
}

export async function buildProjectVabsStatus(options: BuildProjectVabsStatusOptions): Promise<ProjectVabsStatus | null> {
  const vabsRoot = path.join(options.projectRoot, "vabs");
  if (!(await pathExists(vabsRoot))) {
    return null;
  }

  const contractRoot = path.join(vabsRoot, "contract");
  const folderMappingPath = path.join(contractRoot, "folder-name-mapping.md");
  const vabsReadmePath = path.join(vabsRoot, "README.md");
  const capturedRowNotesPath = path.join(contractRoot, "captured-row-notes.md");
  const capturedRowPath = path.join(contractRoot, "captured-playerBets-row.json");
  const capturedRowSanitizedPath = path.join(contractRoot, "captured-playerBets-row.sanitized.json");
  const capturedSessionPath = path.join(contractRoot, "captured-playerBets-session.json");
  const capturedSessionSanitizedPath = path.join(contractRoot, "captured-playerBets-session.sanitized.json");

  const [
    folderMappingText,
    vabsReadmeText,
    capturedRowNotesText,
    scripts,
    rawRowExists,
    sanitizedRowExists,
    rawSessionExists,
    sanitizedSessionExists
  ] = await Promise.all([
    readOptionalTextFile(folderMappingPath),
    readOptionalTextFile(vabsReadmePath),
    readOptionalTextFile(capturedRowNotesPath),
    readPackageScripts(options.workspaceRoot),
    pathExists(capturedRowPath),
    pathExists(capturedRowSanitizedPath),
    pathExists(capturedSessionPath),
    pathExists(capturedSessionSanitizedPath)
  ]);

  const targetFolderToken = extractMarkdownValue(folderMappingText, /Intended GS VABS folder name(?: for `[^`]+`)?: `([^`]+)`/);
  const folderDecisionStatus = extractMarkdownValue(folderMappingText, /Decision status: ([^\n]+)/);
  const currentStatus = extractMarkdownValue(vabsReadmeText, /## Current Status\s+- ([^\n]+)/) ?? "Project-specific concrete slice, still stub-only.";
  const confirmedRoundId = extractMarkdownValue(capturedRowNotesText, /flow\.round_id=([0-9]+)/);
  const confirmedRoundEvidence = extractMarkdownValue(capturedRowNotesText, /Evidence item: `([^`]+)`/);
  const exportPackagePath = path.join("/tmp", `myide-vabs-${options.projectId}-export`, "common", "vabs", targetFolderToken ?? "unknown");
  const exportManifestPath = path.join(exportPackagePath, "manifest.json");
  const exportPackageExists = await pathExists(exportManifestPath);
  const activeFixtureState = getActiveFixtureState({
    rawRowExists,
    sanitizedRowExists,
    rawSessionExists,
    sanitizedSessionExists
  });

  return {
    projectId: options.projectId,
    relativeRoot: path.relative(options.workspaceRoot, vabsRoot),
    currentStatus,
    targetFolderToken,
    folderDecisionStatus,
    selectionMode: "auto",
    activeFixtureSource: activeFixtureState.activeFixtureSource,
    activeFixtureSummary: activeFixtureState.activeFixtureSummary,
    capturedRow: {
      rawExists: rawRowExists,
      sanitizedExists: sanitizedRowExists
    },
    capturedSession: {
      rawExists: rawSessionExists,
      sanitizedExists: sanitizedSessionExists
    },
    exportPackagePath,
    exportPackageExists,
    commands: {
      replay: Boolean(scripts[`vabs:replay:${options.projectId}`]),
      compare: Boolean(scripts[`vabs:compare:${options.projectId}`]),
      exportPackage: Boolean(scripts[`vabs:export:${options.projectId}`]),
      preview: Boolean(scripts[`vabs:preview:${options.projectId}`]),
      mock: Boolean(scripts[`vabs:mock:${options.projectId}`]),
      smoke: Boolean(scripts[`vabs:smoke:${options.projectId}`]),
      intakeRow: Boolean(scripts[`vabs:intake:${options.projectId}`]),
      sanitizeRow: Boolean(scripts[`vabs:sanitize:${options.projectId}`]),
      verifyCapturedRow: Boolean(scripts[`vabs:verify:captured:${options.projectId}`]),
      intakeSession: Boolean(scripts[`vabs:intake:session:${options.projectId}`]),
      sanitizeSession: Boolean(scripts[`vabs:sanitize:session:${options.projectId}`]),
      verifyCapturedSession: Boolean(scripts[`vabs:verify:captured-session:${options.projectId}`])
    },
    currentBlocker: buildCurrentBlocker({
      rawRowExists,
      sanitizedRowExists,
      rawSessionExists,
      sanitizedSessionExists
    }),
    nextRecommendedAction: buildNextRecommendedAction(options.projectId, {
      rawRowExists,
      sanitizedRowExists,
      rawSessionExists,
      sanitizedSessionExists
    }),
    operatorCommands: buildOperatorCommands(options.projectId, {
      rawRowExists,
      sanitizedRowExists,
      rawSessionExists,
      sanitizedSessionExists
    }),
    operatorPaths: [
      path.relative(options.workspaceRoot, capturedRowPath),
      path.relative(options.workspaceRoot, capturedRowSanitizedPath),
      path.relative(options.workspaceRoot, capturedSessionPath),
      path.relative(options.workspaceRoot, capturedSessionSanitizedPath)
    ],
    confirmedRoundId,
    confirmedRoundEvidence
  };
}
