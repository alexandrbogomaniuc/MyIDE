import { mkdirSync, promises as fs } from "node:fs";
import path from "node:path";

export interface RuntimePageProofEntry {
  taskId: string;
  pageName: string;
  sourceUrl: string;
  runtimeLabel: string | null;
  profileId: string | null;
  requestSource: string | null;
  requestBacked: boolean;
  relativePath: string | null;
  localMirrorRepoRelativePath: string | null;
  overrideHitCountAfterReload: number;
  savedAtUtc: string;
}

export interface RuntimePageProofStatus {
  projectId: string;
  generatedAtUtc: string;
  snapshotRepoRelativePath: string;
  entryCount: number;
  entries: RuntimePageProofEntry[];
}

export interface SaveRuntimePageProofInput {
  taskId: string;
  pageName: string;
  sourceUrl: string;
  runtimeLabel?: string | null;
  profileId?: string | null;
  requestSource?: string | null;
  requestBacked?: boolean;
  relativePath?: string | null;
  localMirrorRepoRelativePath?: string | null;
  overrideHitCountAfterReload?: number | null;
}

type JsonValue = null | boolean | number | string | JsonObject | JsonValue[];
type JsonObject = { [key: string]: JsonValue | undefined };

const workspaceRoot = path.resolve(__dirname, "../../..");

function assertValidProjectId(projectId: string): void {
  if (typeof projectId !== "string" || !/^[A-Za-z0-9._-]+$/.test(projectId)) {
    throw new Error(`Runtime page proofs require a safe projectId. Received: ${String(projectId)}`);
  }
}

function getProjectRuntimeRoot(projectId: string): string {
  assertValidProjectId(projectId);
  return path.join(workspaceRoot, "40_projects", projectId, "runtime");
}

function getRuntimePageProofSnapshotPath(projectId: string): string {
  return path.join(getProjectRuntimeRoot(projectId), "page-runtime-proofs.latest.json");
}

function getLegacyRuntimePageProofSnapshotPath(projectId: string): string {
  return path.join(getProjectRuntimeRoot(projectId), "local-mirror", "page-runtime-proofs.latest.json");
}

function toRepoRelativePath(filePath: string): string {
  return path.relative(workspaceRoot, filePath).replace(/\\/g, "/");
}

function assertJsonObject(value: unknown, label: string): asserts value is JsonObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be a JSON object.`);
  }
}

async function readOptionalJsonFile(filePath: string): Promise<JsonObject | null> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed: unknown = JSON.parse(raw);
    assertJsonObject(parsed, filePath);
    return parsed;
  } catch (error) {
    if ((error as NodeJS.ErrnoException | undefined)?.code === "ENOENT") {
      return null;
    }

    throw error;
  }
}

function normalizeString(value: JsonValue | undefined): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function normalizeBoolean(value: JsonValue | undefined, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function normalizeNumber(value: JsonValue | undefined, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function normalizeEntry(entry: JsonValue | undefined): RuntimePageProofEntry | null {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    return null;
  }

  const taskId = normalizeString(entry.taskId);
  const pageName = normalizeString(entry.pageName);
  const sourceUrl = normalizeString(entry.sourceUrl);
  if (!taskId || !pageName || !sourceUrl) {
    return null;
  }

  return {
    taskId,
    pageName,
    sourceUrl,
    runtimeLabel: normalizeString(entry.runtimeLabel),
    profileId: normalizeString(entry.profileId),
    requestSource: normalizeString(entry.requestSource),
    requestBacked: normalizeBoolean(entry.requestBacked, true),
    relativePath: normalizeString(entry.relativePath),
    localMirrorRepoRelativePath: normalizeString(entry.localMirrorRepoRelativePath),
    overrideHitCountAfterReload: normalizeNumber(entry.overrideHitCountAfterReload, 0),
    savedAtUtc: normalizeString(entry.savedAtUtc) ?? new Date(0).toISOString()
  };
}

function sortEntries(entries: RuntimePageProofEntry[]): RuntimePageProofEntry[] {
  return [...entries].sort((left, right) => {
    const taskDiff = left.taskId.localeCompare(right.taskId);
    if (taskDiff !== 0) {
      return taskDiff;
    }

    return left.pageName.localeCompare(right.pageName);
  });
}

function buildStatus(projectId: string, entries: RuntimePageProofEntry[], snapshotPath = getRuntimePageProofSnapshotPath(projectId)): RuntimePageProofStatus {
  return {
    projectId,
    generatedAtUtc: new Date().toISOString(),
    snapshotRepoRelativePath: toRepoRelativePath(snapshotPath),
    entryCount: entries.length,
    entries: sortEntries(entries)
  };
}

export async function buildRuntimePageProofStatus(projectId: string): Promise<RuntimePageProofStatus | null> {
  const snapshotPath = getRuntimePageProofSnapshotPath(projectId);
  const legacySnapshotPath = getLegacyRuntimePageProofSnapshotPath(projectId);
  const raw = await readOptionalJsonFile(snapshotPath) ?? await readOptionalJsonFile(legacySnapshotPath);
  if (!raw) {
    return null;
  }

  const entries = Array.isArray(raw.entries)
    ? raw.entries.map((entry) => normalizeEntry(entry)).filter((entry): entry is RuntimePageProofEntry => Boolean(entry))
    : [];
  const resolvedSnapshotPath = await readOptionalJsonFile(snapshotPath)
    ? snapshotPath
    : legacySnapshotPath;
  return buildStatus(projectId, entries, resolvedSnapshotPath);
}

export async function saveRuntimePageProof(projectId: string, input: SaveRuntimePageProofInput): Promise<RuntimePageProofStatus> {
  assertValidProjectId(projectId);
  if (typeof input.taskId !== "string" || input.taskId.trim().length === 0) {
    throw new Error("Runtime page proof save requires a taskId.");
  }
  if (typeof input.pageName !== "string" || input.pageName.trim().length === 0) {
    throw new Error("Runtime page proof save requires a pageName.");
  }
  if (typeof input.sourceUrl !== "string" || input.sourceUrl.trim().length === 0) {
    throw new Error("Runtime page proof save requires a sourceUrl.");
  }

  const existingStatus = await buildRuntimePageProofStatus(projectId);
  const existingEntries = existingStatus?.entries ?? [];
  const proofKey = `${input.taskId.trim().toLowerCase()}::${input.pageName.trim().toLowerCase()}`;
  const nextEntry: RuntimePageProofEntry = {
    taskId: input.taskId.trim(),
    pageName: input.pageName.trim(),
    sourceUrl: input.sourceUrl.trim(),
    runtimeLabel: typeof input.runtimeLabel === "string" && input.runtimeLabel.trim().length > 0 ? input.runtimeLabel.trim() : null,
    profileId: typeof input.profileId === "string" && input.profileId.trim().length > 0 ? input.profileId.trim() : null,
    requestSource: typeof input.requestSource === "string" && input.requestSource.trim().length > 0 ? input.requestSource.trim() : null,
    requestBacked: input.requestBacked !== false,
    relativePath: typeof input.relativePath === "string" && input.relativePath.trim().length > 0 ? input.relativePath.trim() : null,
    localMirrorRepoRelativePath: typeof input.localMirrorRepoRelativePath === "string" && input.localMirrorRepoRelativePath.trim().length > 0 ? input.localMirrorRepoRelativePath.trim() : null,
    overrideHitCountAfterReload: Number.isFinite(input.overrideHitCountAfterReload) ? Number(input.overrideHitCountAfterReload) : 0,
    savedAtUtc: new Date().toISOString()
  };
  const nextEntries = existingEntries
    .filter((entry) => `${entry.taskId.toLowerCase()}::${entry.pageName.toLowerCase()}` !== proofKey)
    .concat(nextEntry);
  const snapshotPath = getRuntimePageProofSnapshotPath(projectId);
  const status = buildStatus(projectId, nextEntries, snapshotPath);
  mkdirSync(path.dirname(snapshotPath), { recursive: true });
  await fs.writeFile(snapshotPath, `${JSON.stringify(status, null, 2)}\n`, "utf8");
  return status;
}
