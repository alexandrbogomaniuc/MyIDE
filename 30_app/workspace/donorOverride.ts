import { existsSync, promises as fs } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  buildProjectDonorAssetIndex,
  readProjectDonorAssetIndex,
  type IndexedDonorAsset,
  type SupportedDonorAssetType
} from "../../tools/donor-assets/shared";

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

const workspaceRoot = path.resolve(__dirname, "../../..");
const supportedFileTypes = new Set<SupportedDonorAssetType>(["png", "webp", "jpg", "jpeg", "svg"]);

function assertSupportedProject(projectId: string): void {
  if (projectId !== "project_001") {
    throw new Error(`Runtime asset overrides are currently scoped to project_001 only. Received: ${projectId}`);
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

function getRuntimeAssetOverridePaths(projectId: string): RuntimeAssetOverridePaths {
  assertSupportedProject(projectId);
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
  const donorIndex = await readProjectDonorAssetIndex(projectId) ?? await buildProjectDonorAssetIndex(projectId);
  const donorAsset = donorIndex.assets.find((entry) => entry.assetId === donorAssetId);
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
  assertSupportedProject(input.projectId);
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
  assertSupportedProject(projectId);
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
