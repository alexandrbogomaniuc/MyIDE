import path from "node:path";

export type RuntimeResourceRequestSource =
  | "local-mirror-asset"
  | "local-mirror-proxy"
  | "project-local-override"
  | "upstream-request";

export interface RuntimeResourceMapEntry {
  canonicalSourceUrl: string;
  latestRequestUrl: string;
  requestSource: RuntimeResourceRequestSource;
  runtimeRelativePath: string | null;
  runtimeFilename: string | null;
  fileType: string | null;
  localMirrorRepoRelativePath: string | null;
  localMirrorAbsolutePath: string | null;
  overrideRepoRelativePath: string | null;
  overrideAbsolutePath: string | null;
  hitCount: number;
  lastHitAtUtc: string | null;
}

export interface RuntimeResourceMapStatus {
  projectId: string;
  generatedAtUtc: string;
  entryCount: number;
  entries: RuntimeResourceMapEntry[];
}

export interface RecordRuntimeResourceRequestInput {
  projectId: string;
  requestUrl: string;
  canonicalSourceUrl: string;
  requestSource: RuntimeResourceRequestSource;
  localMirrorAbsolutePath?: string | null;
  overrideAbsolutePath?: string | null;
  runtimeRelativePath?: string | null;
  fileType?: string | null;
}

const workspaceRoot = path.resolve(__dirname, "../../..");
const runtimeResourceMaps = new Map<string, Map<string, RuntimeResourceMapEntry>>();

function assertSupportedProject(projectId: string): void {
  if (projectId !== "project_001") {
    throw new Error(`Runtime resource map is currently scoped to project_001 only. Received: ${projectId}`);
  }
}

function toRepoRelativePath(filePath: string | null | undefined): string | null {
  if (!filePath) {
    return null;
  }

  return path.relative(workspaceRoot, filePath).replace(/\\/g, "/");
}

function inferRuntimeRelativePath(canonicalSourceUrl: string): string | null {
  try {
    const parsedUrl = new URL(canonicalSourceUrl);
    if (parsedUrl.pathname.includes("/html/MysteryGarden/")) {
      return parsedUrl.pathname.split("/html/MysteryGarden/")[1] ?? null;
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

function getProjectRuntimeResourceMap(projectId: string): Map<string, RuntimeResourceMapEntry> {
  const existing = runtimeResourceMaps.get(projectId);
  if (existing) {
    return existing;
  }

  const created = new Map<string, RuntimeResourceMapEntry>();
  runtimeResourceMaps.set(projectId, created);
  return created;
}

export function resetRuntimeResourceMap(projectId: string): RuntimeResourceMapStatus {
  assertSupportedProject(projectId);
  runtimeResourceMaps.set(projectId, new Map<string, RuntimeResourceMapEntry>());
  return buildRuntimeResourceMapStatus(projectId);
}

export function recordRuntimeResourceRequest(input: RecordRuntimeResourceRequestInput): RuntimeResourceMapEntry {
  assertSupportedProject(input.projectId);
  const resourceMap = getProjectRuntimeResourceMap(input.projectId);
  const canonicalSourceUrl = String(input.canonicalSourceUrl);
  const existing = resourceMap.get(canonicalSourceUrl);
  const nextEntry: RuntimeResourceMapEntry = {
    canonicalSourceUrl,
    latestRequestUrl: String(input.requestUrl),
    requestSource: input.requestSource,
    runtimeRelativePath: input.runtimeRelativePath ?? existing?.runtimeRelativePath ?? inferRuntimeRelativePath(canonicalSourceUrl),
    runtimeFilename: existing?.runtimeFilename ?? inferRuntimeFilename(canonicalSourceUrl),
    fileType: input.fileType ?? existing?.fileType ?? inferFileType(canonicalSourceUrl),
    localMirrorRepoRelativePath: toRepoRelativePath(input.localMirrorAbsolutePath) ?? existing?.localMirrorRepoRelativePath ?? null,
    localMirrorAbsolutePath: input.localMirrorAbsolutePath ?? existing?.localMirrorAbsolutePath ?? null,
    overrideRepoRelativePath: toRepoRelativePath(input.overrideAbsolutePath) ?? existing?.overrideRepoRelativePath ?? null,
    overrideAbsolutePath: input.overrideAbsolutePath ?? existing?.overrideAbsolutePath ?? null,
    hitCount: (existing?.hitCount ?? 0) + 1,
    lastHitAtUtc: new Date().toISOString()
  };
  resourceMap.set(canonicalSourceUrl, nextEntry);
  return nextEntry;
}

export function buildRuntimeResourceMapStatus(projectId: string): RuntimeResourceMapStatus {
  assertSupportedProject(projectId);
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
    entries
  };
}
