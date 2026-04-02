import { createHash } from "node:crypto";
import { existsSync, promises as fs } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  buildProjectDonorAssetIndex,
  readProjectDonorAssetIndex,
  type IndexedDonorAsset,
  type SupportedDonorAssetType
} from "../../tools/donor-assets/shared";
import { readProjectModificationHandoff, type ProjectModificationTask } from "./modificationHandoff";

export interface RuntimeAssetOverrideEntry {
  overrideId: string;
  runtimeSourceUrl: string;
  runtimeRelativePath: string;
  runtimeFilename: string;
  fileType: SupportedDonorAssetType;
  donorAssetId: string;
  donorEvidenceId: string;
  donorFilename: string;
  donorRepoRelativePath: string;
  overrideRepoRelativePath: string;
  createdAtUtc: string;
  note: string;
}

export interface RuntimeAssetOverrideManifest {
  schemaVersion: "0.1.0";
  projectId: string;
  generatedAtUtc: string;
  entries: RuntimeAssetOverrideEntry[];
}

export interface RuntimeAssetOverrideStatusEntry extends RuntimeAssetOverrideEntry {
  overrideAbsolutePath: string;
  fileExists: boolean;
  hitCount: number;
  lastHitAtUtc: string | null;
}

export interface RuntimeAssetOverrideStatus {
  projectId: string;
  manifestRepoRelativePath: string;
  overrideDirectoryRepoRelativePath: string;
  entryCount: number;
  entries: RuntimeAssetOverrideStatusEntry[];
}

export interface RuntimeAssetOverrideHitInfo {
  count: number;
  lastHitAtUtc: string | null;
}

export interface CreateRuntimeAssetOverrideInput {
  projectId: string;
  runtimeSourceUrl: string;
  donorAssetId: string;
}

interface RuntimeSourceInfo {
  runtimeSourceUrl: string;
  runtimeRelativePath: string;
  runtimeFilename: string;
  fileType: SupportedDonorAssetType;
}

interface RuntimeAssetOverridePaths {
  manifestPath: string;
  overrideDirectoryPath: string;
}

interface ModificationTaskKitCandidate {
  localPath: string;
  title: string;
  notes: string;
  sourceUrl: string | null;
}

const workspaceRoot = path.resolve(__dirname, "../../..");
const supportedFileTypes = new Set<SupportedDonorAssetType>(["png", "webp", "jpg", "jpeg", "svg"]);

function assertValidProjectId(projectId: string): void {
  if (typeof projectId !== "string" || !/^[A-Za-z0-9._-]+$/.test(projectId)) {
    throw new Error(`Runtime asset overrides require a safe projectId. Received: ${String(projectId)}`);
  }
}

function toRepoRelativePath(filePath: string): string {
  return path.relative(workspaceRoot, filePath).replace(/\\/g, "/");
}

function sanitizeSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "runtime-asset";
}

function buildModificationTaskAssetId(projectId: string, taskId: string, localPath: string): string {
  const raw = `${projectId}::${taskId}::${localPath}`;
  const hash = createHash("sha1").update(raw).digest("hex").slice(0, 18);
  return `donor.asset.task-${hash}`;
}

function buildModificationTaskAssetTitle(
  task: Pick<ProjectModificationTask, "displayName" | "sectionKey" | "familyName">,
  suffix: string
): string {
  const prefix = [task.displayName, task.sectionKey ?? task.familyName].filter(Boolean).join(" · ");
  return `${prefix} · ${suffix}`;
}

function getRuntimeAssetOverridePaths(projectId: string): RuntimeAssetOverridePaths {
  assertValidProjectId(projectId);
  const projectRoot = path.join(workspaceRoot, "40_projects", projectId);
  return {
    manifestPath: path.join(projectRoot, "overrides", "runtime-asset-overrides.json"),
    overrideDirectoryPath: path.join(projectRoot, "overrides", "runtime-assets")
  };
}

function buildEmptyManifest(projectId: string): RuntimeAssetOverrideManifest {
  return {
    schemaVersion: "0.1.0",
    projectId,
    generatedAtUtc: new Date().toISOString(),
    entries: []
  };
}

function getSupportedFileType(value: string): SupportedDonorAssetType | null {
  const extension = path.extname(value).replace(/^\./, "").toLowerCase();
  return supportedFileTypes.has(extension as SupportedDonorAssetType)
    ? extension as SupportedDonorAssetType
    : null;
}

async function readOptionalJsonFile(filePath: string): Promise<unknown | null> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw) as unknown;
  } catch (error) {
    if ((error as NodeJS.ErrnoException | undefined)?.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

function collectImageStrings(value: unknown, sink: Set<string>): void {
  if (typeof value === "string") {
    if (getSupportedFileType(value)) {
      sink.add(value);
    }
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((entry) => collectImageStrings(entry, sink));
    return;
  }

  if (value && typeof value === "object") {
    Object.values(value).forEach((entry) => collectImageStrings(entry, sink));
  }
}

function collectModificationTaskKitCandidatesFromBundle(
  task: Pick<ProjectModificationTask, "displayName" | "sectionKey" | "familyName">,
  bundle: unknown
): ModificationTaskKitCandidate[] {
  const candidates: ModificationTaskKitCandidate[] = [];
  const seen = new Set<string>();
  const pushCandidate = (localPath: string | null, title: string, notes: string, sourceUrl: string | null = null) => {
    if (typeof localPath !== "string" || !getSupportedFileType(localPath) || seen.has(localPath)) {
      return;
    }
    seen.add(localPath);
    candidates.push({
      localPath,
      title,
      notes,
      sourceUrl
    });
  };

  const pages = Array.isArray((bundle as { pages?: unknown[] } | null)?.pages)
    ? ((bundle as { pages: Array<Record<string, unknown>> }).pages)
    : [];
  pages.forEach((page, index) => {
    const localPath = typeof page.selectedLocalPath === "string"
      ? page.selectedLocalPath
      : typeof page.atlasPageLocalPath === "string"
        ? page.atlasPageLocalPath
        : null;
    const pageLabel = typeof page.pageName === "string" && page.pageName.length > 0
      ? page.pageName
      : `page-${index + 1}`;
    const selectedMode = typeof page.selectedMode === "string" && page.selectedMode.length > 0
      ? ` · ${page.selectedMode}`
      : "";
    const pageState = typeof page.pageState === "string" ? page.pageState : "task page source";
    pushCandidate(
      localPath,
      buildModificationTaskAssetTitle(task, pageLabel),
      `${pageState}${selectedMode}`,
      null
    );
  });

  const localSources = Array.isArray((bundle as { localSources?: unknown[] } | null)?.localSources)
    ? ((bundle as { localSources: Array<Record<string, unknown>> }).localSources)
    : [];
  localSources.forEach((source, index) => {
    const localPath = typeof source.localPath === "string" ? source.localPath : null;
    const familyLabel = typeof source.familyName === "string" && source.familyName.length > 0
      ? source.familyName
      : path.basename(localPath ?? "", path.extname(localPath ?? "")) || `source-${index + 1}`;
    const sourceKind = typeof source.sourceKind === "string" ? source.sourceKind : "local-source";
    const relation = typeof source.relation === "string" ? ` · ${source.relation}` : "";
    pushCandidate(
      localPath,
      buildModificationTaskAssetTitle(task, familyLabel),
      `${sourceKind}${relation}`,
      typeof source.sourceUrl === "string" ? source.sourceUrl : null
    );
  });

  if (candidates.length > 0) {
    return candidates;
  }

  const fallbackPaths = new Set<string>();
  collectImageStrings(bundle, fallbackPaths);
  Array.from(fallbackPaths).forEach((localPath) => {
    pushCandidate(
      localPath,
      buildModificationTaskAssetTitle(task, path.basename(localPath)),
      "task bundle local image",
      null
    );
  });

  return candidates;
}

function resolveCanonicalRuntimeSourceUrl(runtimeSourceUrl: string): string {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(runtimeSourceUrl);
  } catch {
    throw new Error(`Runtime source URL is invalid: ${runtimeSourceUrl}`);
  }

  const mirroredSourceUrl = parsedUrl.searchParams.get("source");
  if (
    parsedUrl.hostname === "127.0.0.1"
    && /^\/runtime\/[^/]+\/mirror$/.test(parsedUrl.pathname)
    && mirroredSourceUrl
  ) {
    return new URL(mirroredSourceUrl).toString();
  }

  return parsedUrl.toString();
}

function parseRuntimeSourceInfo(runtimeSourceUrl: string): RuntimeSourceInfo {
  const canonicalRuntimeSourceUrl = resolveCanonicalRuntimeSourceUrl(runtimeSourceUrl);
  const parsedUrl = new URL(canonicalRuntimeSourceUrl);

  const fileType = getSupportedFileType(parsedUrl.pathname);
  if (!fileType) {
    throw new Error(`Runtime source URL does not point to a supported static image: ${canonicalRuntimeSourceUrl}`);
  }

  const runtimeFilename = path.basename(parsedUrl.pathname);
  const runtimeRelativePath = parsedUrl.pathname.includes("/html/MysteryGarden/")
    ? parsedUrl.pathname.split("/html/MysteryGarden/")[1]
    : parsedUrl.pathname.replace(/^\/+/, "");

  return {
    runtimeSourceUrl: parsedUrl.toString(),
    runtimeRelativePath,
    runtimeFilename,
    fileType
  };
}

function buildOverrideFileName(sourceInfo: RuntimeSourceInfo, donorAsset: IndexedDonorAsset): string {
  const runtimeStem = sanitizeSlug(sourceInfo.runtimeFilename.replace(/\.[^.]+$/, ""));
  const donorStem = sanitizeSlug(donorAsset.assetId);
  return `${runtimeStem}--${donorStem}.${sourceInfo.fileType}`;
}

async function readManifest(projectId: string): Promise<RuntimeAssetOverrideManifest> {
  const { manifestPath } = getRuntimeAssetOverridePaths(projectId);
  try {
    const raw = await fs.readFile(manifestPath, "utf8");
    const parsed = JSON.parse(raw) as RuntimeAssetOverrideManifest;
    if (!parsed || parsed.projectId !== projectId || !Array.isArray(parsed.entries)) {
      throw new Error(`Runtime asset override manifest is invalid for ${projectId}.`);
    }
    return parsed;
  } catch (error) {
    if ((error as NodeJS.ErrnoException | undefined)?.code === "ENOENT") {
      return buildEmptyManifest(projectId);
    }
    throw error;
  }
}

async function writeManifest(projectId: string, manifest: RuntimeAssetOverrideManifest): Promise<void> {
  const { manifestPath, overrideDirectoryPath } = getRuntimeAssetOverridePaths(projectId);
  await fs.mkdir(path.dirname(manifestPath), { recursive: true });
  await fs.mkdir(overrideDirectoryPath, { recursive: true });
  await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

async function loadDonorAsset(projectId: string, donorAssetId: string): Promise<IndexedDonorAsset> {
  let donorAsset: IndexedDonorAsset | null = null;

  try {
    const donorIndex = await readProjectDonorAssetIndex(projectId) ?? await buildProjectDonorAssetIndex(projectId);
    donorAsset = donorIndex.assets.find((entry) => entry.assetId === donorAssetId) ?? null;
  } catch (error) {
    if (projectId === "project_001") {
      throw error;
    }
  }

  if (!donorAsset) {
    const handoff = await readProjectModificationHandoff(projectId);
    const donorId = handoff?.donorId ?? projectId;
    const donorName = handoff?.donorName ?? projectId;
    const tasks = Array.isArray(handoff?.tasks) ? handoff.tasks : [];

    for (const task of tasks) {
      const artifactPaths = [
        task.sourceArtifactPath,
        ...(Array.isArray(task.supportingArtifactPaths) ? task.supportingArtifactPaths : [])
      ].filter((value): value is string => typeof value === "string" && value.length > 0);
      const candidates: ModificationTaskKitCandidate[] = [];
      const seenCandidatePaths = new Set<string>();
      const pushCandidates = (nextCandidates: readonly ModificationTaskKitCandidate[]) => {
        nextCandidates.forEach((candidate) => {
          if (seenCandidatePaths.has(candidate.localPath)) {
            return;
          }
          seenCandidatePaths.add(candidate.localPath);
          candidates.push(candidate);
        });
      };

      for (const artifactPath of artifactPaths) {
        const normalizedPath = artifactPath.replace(/\\/g, "/");
        if (getSupportedFileType(normalizedPath)) {
          pushCandidates([{
            localPath: normalizedPath,
            title: buildModificationTaskAssetTitle(task, path.basename(normalizedPath)),
            notes: "task-local grounded image",
            sourceUrl: null
          }]);
          continue;
        }
        if (path.extname(normalizedPath).toLowerCase() !== ".json") {
          continue;
        }

        const bundle = await readOptionalJsonFile(path.join(workspaceRoot, normalizedPath));
        if (!bundle) {
          continue;
        }
        pushCandidates(collectModificationTaskKitCandidatesFromBundle(task, bundle));
      }

      const matchedCandidate = candidates.find(
        (candidate) => buildModificationTaskAssetId(projectId, task.taskId, candidate.localPath) === donorAssetId
      );
      if (!matchedCandidate) {
        continue;
      }

      const fileType = getSupportedFileType(matchedCandidate.localPath);
      const donorAbsolutePath = path.join(workspaceRoot, matchedCandidate.localPath);
      if (!fileType || !existsSync(donorAbsolutePath)) {
        continue;
      }

      donorAsset = {
        assetId: donorAssetId,
        evidenceId: `modification-task:${task.taskId}`,
        captureSessionId: `modification-task:${task.taskId}`,
        donorId,
        donorName,
        title: matchedCandidate.title,
        filename: path.basename(matchedCandidate.localPath),
        fileType,
        sourceCategory: "modification task kit",
        sourceUrl: matchedCandidate.sourceUrl,
        notes: matchedCandidate.notes,
        repoRelativePath: matchedCandidate.localPath,
        donorRelativePath: matchedCandidate.localPath,
        localExists: true,
        previewAvailable: true,
        width: null,
        height: null
      };
      break;
    }
  }

  if (!donorAsset) {
    throw new Error(`Unknown donor asset for runtime override: ${donorAssetId}`);
  }

  const donorAbsolutePath = path.join(workspaceRoot, donorAsset.repoRelativePath);
  if (!existsSync(donorAbsolutePath)) {
    throw new Error(`The donor asset file is missing locally: ${donorAsset.repoRelativePath}`);
  }

  return donorAsset;
}

async function removeOverrideFileIfUnused(projectId: string, overrideRepoRelativePath: string, manifest: RuntimeAssetOverrideManifest): Promise<void> {
  const stillReferenced = manifest.entries.some((entry) => entry.overrideRepoRelativePath === overrideRepoRelativePath);
  if (stillReferenced) {
    return;
  }

  const absolutePath = path.join(workspaceRoot, overrideRepoRelativePath);
  await fs.rm(absolutePath, { force: true });
  const { overrideDirectoryPath } = getRuntimeAssetOverridePaths(projectId);

  try {
    const remaining = await fs.readdir(overrideDirectoryPath);
    if (remaining.length === 0) {
      await fs.rmdir(overrideDirectoryPath);
    }
  } catch {
    // Directory cleanup is best-effort only.
  }
}

export async function buildRuntimeAssetOverrideStatus(
  projectId: string,
  hitInfo: ReadonlyMap<string, RuntimeAssetOverrideHitInfo> | undefined = undefined
): Promise<RuntimeAssetOverrideStatus> {
  const manifest = await readManifest(projectId);
  const { manifestPath, overrideDirectoryPath } = getRuntimeAssetOverridePaths(projectId);

  return {
    projectId,
    manifestRepoRelativePath: toRepoRelativePath(manifestPath),
    overrideDirectoryRepoRelativePath: toRepoRelativePath(overrideDirectoryPath),
    entryCount: manifest.entries.length,
    entries: manifest.entries.map((entry) => {
      const overrideAbsolutePath = path.join(workspaceRoot, entry.overrideRepoRelativePath);
      const hits = hitInfo?.get(entry.runtimeSourceUrl);
      return {
        ...entry,
        overrideAbsolutePath,
        fileExists: existsSync(overrideAbsolutePath),
        hitCount: hits?.count ?? 0,
        lastHitAtUtc: hits?.lastHitAtUtc ?? null
      };
    })
  };
}

export function buildRuntimeAssetOverrideRedirectMap(status: RuntimeAssetOverrideStatus): Map<string, string> {
  const redirectMap = new Map<string, string>();
  for (const entry of status.entries) {
    if (!entry.fileExists) {
      continue;
    }
    redirectMap.set(entry.runtimeSourceUrl, pathToFileURL(entry.overrideAbsolutePath).href);
  }
  return redirectMap;
}

export async function createRuntimeAssetOverride(input: CreateRuntimeAssetOverrideInput): Promise<RuntimeAssetOverrideStatus> {
  assertValidProjectId(input.projectId);
  const sourceInfo = parseRuntimeSourceInfo(input.runtimeSourceUrl);
  const donorAsset = await loadDonorAsset(input.projectId, input.donorAssetId);
  if (donorAsset.fileType !== sourceInfo.fileType) {
    throw new Error(
      `Runtime override file type mismatch: runtime source requires ${sourceInfo.fileType}, donor asset is ${donorAsset.fileType}.`
    );
  }

  const donorAbsolutePath = path.join(workspaceRoot, donorAsset.repoRelativePath);
  const { overrideDirectoryPath } = getRuntimeAssetOverridePaths(input.projectId);
  await fs.mkdir(overrideDirectoryPath, { recursive: true });

  const overrideFileName = buildOverrideFileName(sourceInfo, donorAsset);
  const overrideAbsolutePath = path.join(overrideDirectoryPath, overrideFileName);
  await fs.copyFile(donorAbsolutePath, overrideAbsolutePath);

  const manifest = await readManifest(input.projectId);
  const previousEntry = manifest.entries.find((entry) => entry.runtimeSourceUrl === sourceInfo.runtimeSourceUrl) ?? null;
  const nextEntry: RuntimeAssetOverrideEntry = {
    overrideId: `runtime.override.${sanitizeSlug(sourceInfo.runtimeFilename)}.${sourceInfo.fileType}`,
    runtimeSourceUrl: sourceInfo.runtimeSourceUrl,
    runtimeRelativePath: sourceInfo.runtimeRelativePath,
    runtimeFilename: sourceInfo.runtimeFilename,
    fileType: sourceInfo.fileType,
    donorAssetId: donorAsset.assetId,
    donorEvidenceId: donorAsset.evidenceId,
    donorFilename: donorAsset.filename,
    donorRepoRelativePath: donorAsset.repoRelativePath,
    overrideRepoRelativePath: toRepoRelativePath(overrideAbsolutePath),
    createdAtUtc: new Date().toISOString(),
    note: `Project-local override for ${sourceInfo.runtimeRelativePath} created from donor asset ${donorAsset.assetId}. Raw donor files remain untouched.`
  };

  manifest.entries = manifest.entries
    .filter((entry) => entry.runtimeSourceUrl !== sourceInfo.runtimeSourceUrl)
    .concat(nextEntry)
    .sort((left, right) => left.runtimeRelativePath.localeCompare(right.runtimeRelativePath));
  manifest.generatedAtUtc = new Date().toISOString();
  await writeManifest(input.projectId, manifest);

  if (previousEntry && previousEntry.overrideRepoRelativePath !== nextEntry.overrideRepoRelativePath) {
    await removeOverrideFileIfUnused(input.projectId, previousEntry.overrideRepoRelativePath, manifest);
  }

  return buildRuntimeAssetOverrideStatus(input.projectId);
}

export async function clearRuntimeAssetOverride(projectId: string, runtimeSourceUrl: string): Promise<RuntimeAssetOverrideStatus> {
  assertValidProjectId(projectId);
  const normalizedUrl = new URL(runtimeSourceUrl).toString();
  const manifest = await readManifest(projectId);
  const removedEntry = manifest.entries.find((entry) => entry.runtimeSourceUrl === normalizedUrl) ?? null;
  if (!removedEntry) {
    return buildRuntimeAssetOverrideStatus(projectId);
  }

  manifest.entries = manifest.entries.filter((entry) => entry.runtimeSourceUrl !== normalizedUrl);
  manifest.generatedAtUtc = new Date().toISOString();
  await writeManifest(projectId, manifest);
  await removeOverrideFileIfUnused(projectId, removedEntry.overrideRepoRelativePath, manifest);
  return buildRuntimeAssetOverrideStatus(projectId);
}
