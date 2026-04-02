import { mkdirSync, promises as fs, writeFileSync } from "node:fs";
import path from "node:path";

export type RuntimeResourceRequestSource =
  | "local-mirror-launch"
  | "local-mirror-asset"
  | "local-mirror-proxy"
  | "project-local-override"
  | "upstream-request";

export type RuntimeResourceCaptureMethod =
  | "server-route"
  | "partition-webrequest";

export type RuntimeRequestCategory =
  | "html-bootstrap"
  | "static-asset"
  | "token-api"
  | "websocket"
  | "other";

export interface RuntimeResourceMapEntry {
  canonicalSourceUrl: string;
  latestRequestUrl: string;
  requestSource: RuntimeResourceRequestSource;
  lastCaptureMethod: RuntimeResourceCaptureMethod | null;
  captureMethods: RuntimeResourceCaptureMethod[];
  requestCategory: RuntimeRequestCategory;
  resourceType: string | null;
  runtimeRelativePath: string | null;
  runtimeFilename: string | null;
  fileType: string | null;
  localMirrorRepoRelativePath: string | null;
  localMirrorAbsolutePath: string | null;
  overrideRepoRelativePath: string | null;
  overrideAbsolutePath: string | null;
  hitCount: number;
  lastHitAtUtc: string | null;
  lastStage: string | null;
  stageHitCounts: Record<string, number>;
}

export interface RuntimeCoverageBucket {
  total: number;
  local: number;
  upstream: number;
  override: number;
}

export interface RuntimeResourceCoverageStatus {
  localEntryCount: number;
  upstreamEntryCount: number;
  overrideEntryCount: number;
  localStaticEntryCount: number;
  upstreamStaticEntryCount: number;
  unresolvedUpstreamCount: number;
  unresolvedUpstreamSample: string[];
  categories: Record<RuntimeRequestCategory, RuntimeCoverageBucket>;
  stageCounts: Record<string, number>;
}

export interface RuntimeResourceMapStatus {
  projectId: string;
  generatedAtUtc: string;
  entryCount: number;
  snapshotRepoRelativePath: string;
  coverage: RuntimeResourceCoverageStatus;
  entries: RuntimeResourceMapEntry[];
}

export interface RecordRuntimeResourceRequestInput {
  projectId: string;
  requestUrl: string;
  canonicalSourceUrl: string;
  requestSource: RuntimeResourceRequestSource;
  captureMethod?: RuntimeResourceCaptureMethod | null;
  localMirrorAbsolutePath?: string | null;
  overrideAbsolutePath?: string | null;
  runtimeRelativePath?: string | null;
  fileType?: string | null;
  resourceType?: string | null;
  requestCategory?: RuntimeRequestCategory | null;
  stage?: string | null;
}

const workspaceRoot = path.resolve(__dirname, "../../..");
const runtimeResourceMaps = new Map<string, Map<string, RuntimeResourceMapEntry>>();

function assertValidProjectId(projectId: string): void {
  if (typeof projectId !== "string" || !/^[A-Za-z0-9._-]+$/.test(projectId)) {
    throw new Error(`Runtime resource map requires a safe projectId. Received: ${String(projectId)}`);
  }
}

function toRepoRelativePath(filePath: string | null | undefined): string | null {
  if (!filePath) {
    return null;
  }

  return path.relative(workspaceRoot, filePath).replace(/\\/g, "/");
}

function getRuntimeResourceMapSnapshotPath(projectId: string): string {
  assertValidProjectId(projectId);
  return path.join(workspaceRoot, "40_projects", projectId, "runtime", "local-mirror", "request-log.latest.json");
}

function normalizeStage(stage: string | null | undefined): string | null {
  if (typeof stage !== "string") {
    return null;
  }

  const normalized = stage.trim().toLowerCase().replace(/[^a-z0-9._-]+/g, "-");
  return normalized.length > 0 ? normalized : null;
}

function isStaticFileType(fileType: string | null | undefined): boolean {
  return ["png", "webp", "jpg", "jpeg", "svg", "gif"].includes(String(fileType ?? "").toLowerCase());
}

function inferRuntimeRelativePath(canonicalSourceUrl: string): string | null {
  try {
    const parsedUrl = new URL(canonicalSourceUrl);
    if (parsedUrl.pathname.includes("/html/MysteryGarden/")) {
      return parsedUrl.pathname.split("/html/MysteryGarden/")[1] ?? null;
    }
    const runtimeAssetMatch = parsedUrl.pathname.match(/^\/runtime\/[^/]+\/assets\/(.+)$/);
    if (runtimeAssetMatch?.[1]) {
      return runtimeAssetMatch[1];
    }
    if (/^\/runtime\/[^/]+\/launch$/.test(parsedUrl.pathname)) {
      return "launch.html";
    }
    return parsedUrl.pathname.replace(/^\/+/, "") || null;
  } catch {
    return null;
  }
}

function inferRuntimeFilename(canonicalSourceUrl: string): string | null {
  try {
    const parsedUrl = new URL(canonicalSourceUrl);
    return path.basename(parsedUrl.pathname) || null;
  } catch {
    return null;
  }
}

function inferFileType(canonicalSourceUrl: string): string | null {
  try {
    const parsedUrl = new URL(canonicalSourceUrl);
    const extension = path.extname(parsedUrl.pathname).replace(/^\./, "").toLowerCase();
    return extension || null;
  } catch {
    return null;
  }
}

function createEmptyCoverageBucket(): RuntimeCoverageBucket {
  return {
    total: 0,
    local: 0,
    upstream: 0,
    override: 0
  };
}

function buildEmptyCoverageStatus(): RuntimeResourceCoverageStatus {
  return {
    localEntryCount: 0,
    upstreamEntryCount: 0,
    overrideEntryCount: 0,
    localStaticEntryCount: 0,
    upstreamStaticEntryCount: 0,
    unresolvedUpstreamCount: 0,
    unresolvedUpstreamSample: [],
    categories: {
      "html-bootstrap": createEmptyCoverageBucket(),
      "static-asset": createEmptyCoverageBucket(),
      "token-api": createEmptyCoverageBucket(),
      websocket: createEmptyCoverageBucket(),
      other: createEmptyCoverageBucket()
    },
    stageCounts: {}
  };
}

function buildRuntimeCoverageStatus(entries: RuntimeResourceMapEntry[]): RuntimeResourceCoverageStatus {
  const coverage = buildEmptyCoverageStatus();

  for (const entry of entries) {
    const bucket = coverage.categories[entry.requestCategory];
    bucket.total += 1;

    if (entry.requestSource === "project-local-override") {
      bucket.override += 1;
      coverage.overrideEntryCount += 1;
      coverage.localEntryCount += 1;
    } else if (entry.requestSource === "upstream-request") {
      bucket.upstream += 1;
      coverage.upstreamEntryCount += 1;
    } else {
      bucket.local += 1;
      coverage.localEntryCount += 1;
    }

    if (entry.requestCategory === "static-asset") {
      if (entry.requestSource === "upstream-request") {
        coverage.upstreamStaticEntryCount += 1;
      } else {
        coverage.localStaticEntryCount += 1;
      }
    }

    for (const [stage, count] of Object.entries(entry.stageHitCounts)) {
      coverage.stageCounts[stage] = (coverage.stageCounts[stage] ?? 0) + count;
    }
  }

  const unresolvedUpstreamEntries = entries
    .filter((entry) => (
      entry.requestSource === "upstream-request"
      && (entry.requestCategory === "static-asset" || entry.requestCategory === "html-bootstrap")
    ))
    .map((entry) => entry.runtimeRelativePath ?? entry.canonicalSourceUrl)
    .filter((value, index, items) => items.indexOf(value) === index)
    .sort((left, right) => left.localeCompare(right));

  coverage.unresolvedUpstreamCount = unresolvedUpstreamEntries.length;
  coverage.unresolvedUpstreamSample = unresolvedUpstreamEntries.slice(0, 12);
  return coverage;
}

export function inferRuntimeRequestCategory(
  requestUrl: string,
  canonicalSourceUrl: string,
  resourceType?: string | null,
  fileType?: string | null
): RuntimeRequestCategory {
  const candidate = canonicalSourceUrl || requestUrl;
  const normalizedResourceType = String(resourceType ?? "").toLowerCase();
  const normalizedFileType = String(fileType ?? inferFileType(candidate) ?? "").toLowerCase();

  try {
    const parsedUrl = new URL(candidate);
    const pathname = parsedUrl.pathname.toLowerCase();
    const protocol = parsedUrl.protocol.toLowerCase();
    const host = parsedUrl.hostname.toLowerCase();

    if (protocol === "ws:" || protocol === "wss:" || normalizedResourceType === "websocket") {
      return "websocket";
    }

    if (isStaticFileType(normalizedFileType)) {
      return "static-asset";
    }

    if (
      normalizedResourceType === "script"
      || normalizedResourceType === "stylesheet"
      || normalizedResourceType === "mainframe"
      || normalizedResourceType === "subframe"
      || pathname.endsWith(".js")
      || pathname.endsWith(".css")
      || pathname.endsWith(".html")
      || pathname.endsWith(".htm")
      || pathname.includes("/loader")
      || pathname.includes("/bundle")
      || pathname.includes("/launch")
    ) {
      return "html-bootstrap";
    }

    if (
      normalizedResourceType === "xhr"
      || normalizedResourceType === "fetch"
      || host.includes("api")
      || pathname.includes("/token")
      || pathname.includes("/auth")
      || pathname.includes("/init")
      || pathname.includes("/open")
      || pathname.includes("/history")
      || pathname.includes("/balance")
      || pathname.includes("/bet")
      || pathname.includes("/session")
      || pathname.includes("/graphql")
    ) {
      return "token-api";
    }
  } catch {
    // Fall back to file type and resource type inference below.
  }

  if (normalizedResourceType === "xhr" || normalizedResourceType === "fetch") {
    return "token-api";
  }

  if (isStaticFileType(normalizedFileType)) {
    return "static-asset";
  }

  return "other";
}

function getProjectRuntimeResourceMap(projectId: string): Map<string, RuntimeResourceMapEntry> {
  const existing = runtimeResourceMaps.get(projectId);
  if (existing) {
    return existing;
  }

  const created = new Map<string, RuntimeResourceMapEntry>();
  runtimeResourceMaps.set(projectId, created);
  return created;
}

export function getRuntimeResourceMapSnapshotRepoRelativePath(projectId: string): string {
  return toRepoRelativePath(getRuntimeResourceMapSnapshotPath(projectId)) ?? `40_projects/${projectId}/runtime/local-mirror/request-log.latest.json`;
}

export function resetRuntimeResourceMap(projectId: string): RuntimeResourceMapStatus {
  assertValidProjectId(projectId);
  runtimeResourceMaps.set(projectId, new Map<string, RuntimeResourceMapEntry>());
  return buildRuntimeResourceMapStatus(projectId);
}

export function recordRuntimeResourceRequest(input: RecordRuntimeResourceRequestInput): RuntimeResourceMapEntry {
  assertValidProjectId(input.projectId);
  const resourceMap = getProjectRuntimeResourceMap(input.projectId);
  const canonicalSourceUrl = String(input.canonicalSourceUrl || input.requestUrl);
  const existing = resourceMap.get(canonicalSourceUrl);
  const stage = normalizeStage(input.stage) ?? existing?.lastStage ?? "unscoped";
  const fileType = input.fileType ?? existing?.fileType ?? inferFileType(canonicalSourceUrl);
  const requestCategory = input.requestCategory
    ?? existing?.requestCategory
    ?? inferRuntimeRequestCategory(input.requestUrl, canonicalSourceUrl, input.resourceType, fileType);
  const nextStageHitCounts = {
    ...(existing?.stageHitCounts ?? {})
  };
  nextStageHitCounts[stage] = (nextStageHitCounts[stage] ?? 0) + 1;

  const nextEntry: RuntimeResourceMapEntry = {
    canonicalSourceUrl,
    latestRequestUrl: String(input.requestUrl),
    requestSource: input.requestSource,
    lastCaptureMethod: input.captureMethod ?? existing?.lastCaptureMethod ?? null,
    captureMethods: Array.from(new Set([
      ...(existing?.captureMethods ?? []),
      ...(input.captureMethod ? [input.captureMethod] : [])
    ])),
    requestCategory,
    resourceType: input.resourceType ?? existing?.resourceType ?? null,
    runtimeRelativePath: input.runtimeRelativePath ?? existing?.runtimeRelativePath ?? inferRuntimeRelativePath(canonicalSourceUrl),
    runtimeFilename: existing?.runtimeFilename ?? inferRuntimeFilename(canonicalSourceUrl),
    fileType,
    localMirrorRepoRelativePath: toRepoRelativePath(input.localMirrorAbsolutePath) ?? existing?.localMirrorRepoRelativePath ?? null,
    localMirrorAbsolutePath: input.localMirrorAbsolutePath ?? existing?.localMirrorAbsolutePath ?? null,
    overrideRepoRelativePath: toRepoRelativePath(input.overrideAbsolutePath) ?? existing?.overrideRepoRelativePath ?? null,
    overrideAbsolutePath: input.overrideAbsolutePath ?? existing?.overrideAbsolutePath ?? null,
    hitCount: (existing?.hitCount ?? 0) + 1,
    lastHitAtUtc: new Date().toISOString(),
    lastStage: stage,
    stageHitCounts: nextStageHitCounts
  };
  resourceMap.set(canonicalSourceUrl, nextEntry);
  return nextEntry;
}

export function buildRuntimeResourceMapStatus(projectId: string): RuntimeResourceMapStatus {
  assertValidProjectId(projectId);
  const entries = Array.from(getProjectRuntimeResourceMap(projectId).values())
    .sort((left, right) => {
      const rightStamp = right.lastHitAtUtc ?? "";
      const leftStamp = left.lastHitAtUtc ?? "";
      if (rightStamp !== leftStamp) {
        return rightStamp.localeCompare(leftStamp);
      }
      return (left.runtimeRelativePath ?? left.canonicalSourceUrl).localeCompare(right.runtimeRelativePath ?? right.canonicalSourceUrl);
    });

  return {
    projectId,
    generatedAtUtc: new Date().toISOString(),
    entryCount: entries.length,
    snapshotRepoRelativePath: getRuntimeResourceMapSnapshotRepoRelativePath(projectId),
    coverage: buildRuntimeCoverageStatus(entries),
    entries
  };
}

export async function loadRuntimeResourceMapStatus(projectId: string): Promise<RuntimeResourceMapStatus> {
  assertValidProjectId(projectId);
  const resourceMap = getProjectRuntimeResourceMap(projectId);
  if (resourceMap.size === 0) {
    const snapshot = await readRuntimeResourceMapSnapshot(projectId);
    for (const entry of snapshot?.entries ?? []) {
      resourceMap.set(entry.canonicalSourceUrl, {
        ...entry,
        captureMethods: [...entry.captureMethods],
        stageHitCounts: { ...entry.stageHitCounts }
      });
    }
  }

  return buildRuntimeResourceMapStatus(projectId);
}

export async function exportRuntimeResourceMapSnapshot(projectId: string): Promise<RuntimeResourceMapStatus> {
  assertValidProjectId(projectId);
  const snapshotPath = getRuntimeResourceMapSnapshotPath(projectId);
  const status = buildRuntimeResourceMapStatus(projectId);
  await fs.mkdir(path.dirname(snapshotPath), { recursive: true });
  await fs.writeFile(snapshotPath, `${JSON.stringify(status, null, 2)}\n`, "utf8");
  return status;
}

export function exportRuntimeResourceMapSnapshotSync(projectId: string): RuntimeResourceMapStatus {
  assertValidProjectId(projectId);
  const snapshotPath = getRuntimeResourceMapSnapshotPath(projectId);
  const status = buildRuntimeResourceMapStatus(projectId);
  mkdirSync(path.dirname(snapshotPath), { recursive: true });
  writeFileSync(snapshotPath, `${JSON.stringify(status, null, 2)}\n`, "utf8");
  return status;
}

export async function readRuntimeResourceMapSnapshot(projectId: string): Promise<RuntimeResourceMapStatus | null> {
  assertValidProjectId(projectId);
  const snapshotPath = getRuntimeResourceMapSnapshotPath(projectId);

  try {
    const raw = await fs.readFile(snapshotPath, "utf8");
    const parsed = JSON.parse(raw) as RuntimeResourceMapStatus;
    if (!parsed || parsed.projectId !== projectId || !Array.isArray(parsed.entries)) {
      throw new Error(`Runtime resource map snapshot is invalid for ${projectId}.`);
    }
    return parsed;
  } catch (error) {
    if ((error as NodeJS.ErrnoException | undefined)?.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}
