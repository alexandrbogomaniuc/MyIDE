import { execFileSync } from "node:child_process";
import { existsSync, promises as fs } from "node:fs";
import path from "node:path";

export type SupportedDonorAssetType = "png" | "webp" | "jpg" | "jpeg" | "svg";

export interface IndexedDonorAsset {
  assetId: string;
  evidenceId: string;
  captureSessionId: string;
  donorId: string;
  donorName: string;
  title: string;
  filename: string;
  fileType: SupportedDonorAssetType;
  sourceCategory: string;
  sourceUrl: string | null;
  notes: string;
  repoRelativePath: string;
  donorRelativePath: string;
  localExists: boolean;
  previewAvailable: boolean;
  width: number | null;
  height: number | null;
}

export interface DonorAssetIndex {
  schemaVersion: "0.1.0";
  projectId: string;
  donorId: string;
  donorName: string;
  sourceInventoryPath: string;
  indexPath: string;
  generatedAt: string;
  sourceMode: "local-donor-images";
  assetCount: number;
  assets: IndexedDonorAsset[];
}

interface ProjectDonorAssetConfig {
  projectId: string;
  donorId: string;
  donorName: string;
  donorEvidenceRoot: string;
  hashesCsvPath: string;
  indexPath: string;
}

type CsvRecord = Record<string, string>;
type JsonValue = null | boolean | number | string | JsonObject | JsonValue[];
type JsonObject = { [key: string]: JsonValue };

const workspaceRoot = path.resolve(__dirname, "../../..");
const supportedExtensions = new Set<SupportedDonorAssetType>(["png", "webp", "jpg", "jpeg", "svg"]);

export function getDonorAssetWorkspaceRoot(): string {
  return workspaceRoot;
}

function isJsonObject(value: unknown): value is JsonObject {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getNonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function assertSafeProjectId(projectId: string): void {
  if (typeof projectId !== "string" || !/^[A-Za-z0-9._-]+$/.test(projectId)) {
    throw new Error(`Donor asset indexing requires a safe project id. Received: ${String(projectId)}`);
  }
}

function resolveWorkspaceScopedPath(requestedPath: string, label: string): string {
  const absolutePath = path.resolve(workspaceRoot, requestedPath);
  const relativePath = path.relative(workspaceRoot, absolutePath);
  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    throw new Error(`${label} must stay inside the workspace. Received: ${requestedPath}`);
  }

  return absolutePath;
}

function buildLegacyProject001DonorAssetConfig(): ProjectDonorAssetConfig {
  const donorEvidenceRoot = path.join(workspaceRoot, "10_donors", "donor_001_mystery_garden", "evidence");
  return {
    projectId: "project_001",
    donorId: "donor_001_mystery_garden",
    donorName: "Mystery Garden",
    donorEvidenceRoot,
    hashesCsvPath: path.join(donorEvidenceRoot, "HASHES.csv"),
    indexPath: path.join(workspaceRoot, "40_projects", "project_001", "donor-assets", "local-index.json")
  };
}

async function readProjectDonorAssetConfigFromMetadata(projectId: string): Promise<ProjectDonorAssetConfig | null> {
  assertSafeProjectId(projectId);
  const metaPath = path.join(workspaceRoot, "40_projects", projectId, "project.meta.json");

  let parsed: unknown;
  try {
    parsed = JSON.parse(await fs.readFile(metaPath, "utf8")) as unknown;
  } catch (error) {
    if ((error as NodeJS.ErrnoException | undefined)?.code === "ENOENT") {
      return null;
    }
    throw error;
  }

  if (!isJsonObject(parsed)) {
    throw new Error(`Project donor asset metadata must be a JSON object: ${path.relative(workspaceRoot, metaPath).replace(/\\/g, "/")}`);
  }

  const donor = isJsonObject(parsed.donor) ? parsed.donor : null;
  const keyPaths = isJsonObject(parsed.paths) ? parsed.paths : null;
  const donorId = getNonEmptyString(donor?.donorId);
  const donorName = getNonEmptyString(donor?.donorName);
  const donorEvidenceRootRelative = getNonEmptyString(donor?.evidenceRoot) ?? getNonEmptyString(keyPaths?.evidenceRoot);
  if (!donorId || !donorName || !donorEvidenceRootRelative) {
    return null;
  }

  const donorEvidenceRoot = resolveWorkspaceScopedPath(donorEvidenceRootRelative, `Project donor evidence root for ${projectId}`);
  return {
    projectId,
    donorId,
    donorName,
    donorEvidenceRoot,
    hashesCsvPath: path.join(donorEvidenceRoot, "HASHES.csv"),
    indexPath: path.join(workspaceRoot, "40_projects", projectId, "donor-assets", "local-index.json")
  };
}

export async function getProjectDonorAssetConfig(projectId: string): Promise<ProjectDonorAssetConfig> {
  const metadataConfig = await readProjectDonorAssetConfigFromMetadata(projectId);
  if (metadataConfig) {
    return metadataConfig;
  }

  if (projectId === "project_001") {
    return buildLegacyProject001DonorAssetConfig();
  }

  throw new Error(
    `Donor asset indexing needs donor metadata for ${projectId}. Add donor.donorId, donor.donorName, and donor.evidenceRoot to project.meta.json.`
  );
}

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === "\"") {
      const next = line[index + 1];
      if (inQuotes && next === "\"") {
        current += "\"";
        index += 1;
        continue;
      }

      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      values.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current);
  return values;
}

function getFileExtension(relativePath: string): SupportedDonorAssetType | null {
  const extension = path.extname(relativePath).replace(/^\./, "").toLowerCase();
  return supportedExtensions.has(extension as SupportedDonorAssetType)
    ? extension as SupportedDonorAssetType
    : null;
}

function getSourceCategory(captureSessionId: string): string {
  if (captureSessionId.includes("-LIVE-")) {
    return "live runtime";
  }

  if (captureSessionId.includes("-WEB-")) {
    return "web / published donor";
  }

  return "capture session";
}

function humanizeAssetTitle(relativePath: string, notes: string): string {
  const stem = path.basename(relativePath, path.extname(relativePath));
  const normalized = stem.includes("__") ? stem.split("__")[1] : stem;
  const slugLabel = normalized
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

  const firstSentence = notes.split(".")[0]?.trim();
  return firstSentence && firstSentence.length > 0 ? firstSentence : slugLabel;
}

function toRepoRelativePath(config: ProjectDonorAssetConfig, donorRelativePath: string): string {
  return path.relative(workspaceRoot, path.join(config.donorEvidenceRoot, donorRelativePath)).replace(/\\/g, "/");
}

function toAbsoluteAssetPath(repoRelativePath: string): string {
  return path.join(workspaceRoot, repoRelativePath);
}

async function readCsvRecords(csvPath: string): Promise<CsvRecord[]> {
  const rawCsv = await fs.readFile(csvPath, "utf8");
  const lines = rawCsv.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length <= 1) {
    return [];
  }

  const header = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    return Object.fromEntries(header.map((key, index) => [key, values[index] ?? ""]));
  });
}

function parseSipsDimensions(output: string): { width: number | null; height: number | null } {
  const widthMatch = output.match(/pixelWidth:\s*(\d+)/);
  const heightMatch = output.match(/pixelHeight:\s*(\d+)/);
  return {
    width: widthMatch ? Number.parseInt(widthMatch[1], 10) : null,
    height: heightMatch ? Number.parseInt(heightMatch[1], 10) : null
  };
}

async function readSvgDimensions(filePath: string): Promise<{ width: number | null; height: number | null }> {
  const raw = await fs.readFile(filePath, "utf8");
  const widthMatch = raw.match(/\bwidth=["']?([\d.]+)/i);
  const heightMatch = raw.match(/\bheight=["']?([\d.]+)/i);
  if (widthMatch && heightMatch) {
    return {
      width: Math.round(Number.parseFloat(widthMatch[1])),
      height: Math.round(Number.parseFloat(heightMatch[1]))
    };
  }

  const viewBoxMatch = raw.match(/\bviewBox=["'][^"']*?([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)["']/i);
  if (viewBoxMatch) {
    return {
      width: Math.round(Number.parseFloat(viewBoxMatch[3])),
      height: Math.round(Number.parseFloat(viewBoxMatch[4]))
    };
  }

  return { width: null, height: null };
}

async function readImageDimensions(filePath: string): Promise<{ width: number | null; height: number | null }> {
  try {
    const output = execFileSync("/usr/bin/sips", ["-g", "pixelWidth", "-g", "pixelHeight", filePath], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    });
    const parsed = parseSipsDimensions(output);
    if (parsed.width || parsed.height) {
      return parsed;
    }
  } catch {
    // Fall through to SVG-only parsing below.
  }

  if (filePath.toLowerCase().endsWith(".svg")) {
    return readSvgDimensions(filePath);
  }

  return { width: null, height: null };
}

async function buildIndexedAsset(config: ProjectDonorAssetConfig, record: CsvRecord): Promise<IndexedDonorAsset | null> {
  const donorRelativePath = record.relative_path ?? "";
  const fileType = getFileExtension(donorRelativePath);
  if (!fileType) {
    return null;
  }

  const repoRelativePath = toRepoRelativePath(config, donorRelativePath);
  const absolutePath = toAbsoluteAssetPath(repoRelativePath);
  const localExists = existsSync(absolutePath);
  if (!localExists) {
    return null;
  }

  const { width, height } = await readImageDimensions(absolutePath);
  const evidenceId = record.evidence_id ?? "unknown-evidence";

  return {
    assetId: `donor.asset.${evidenceId.toLowerCase()}`,
    evidenceId,
    captureSessionId: record.capture_session_id ?? "unknown-session",
    donorId: config.donorId,
    donorName: config.donorName,
    title: humanizeAssetTitle(donorRelativePath, record.notes ?? ""),
    filename: path.basename(donorRelativePath),
    fileType,
    sourceCategory: getSourceCategory(record.capture_session_id ?? ""),
    sourceUrl: record.source_url || null,
    notes: record.notes ?? "",
    repoRelativePath,
    donorRelativePath,
    localExists,
    previewAvailable: true,
    width,
    height
  };
}

async function buildProjectDonorAssetIndexFromConfig(config: ProjectDonorAssetConfig): Promise<DonorAssetIndex> {
  const records = await readCsvRecords(config.hashesCsvPath);
  const assets = (await Promise.all(records.map((record) => buildIndexedAsset(config, record))))
    .filter((asset): asset is IndexedDonorAsset => Boolean(asset))
    .sort((left, right) => left.evidenceId.localeCompare(right.evidenceId));

  return {
    schemaVersion: "0.1.0",
    projectId: config.projectId,
    donorId: config.donorId,
    donorName: config.donorName,
    sourceInventoryPath: path.relative(workspaceRoot, config.hashesCsvPath).replace(/\\/g, "/"),
    indexPath: path.relative(workspaceRoot, config.indexPath).replace(/\\/g, "/"),
    generatedAt: new Date().toISOString(),
    sourceMode: "local-donor-images",
    assetCount: assets.length,
    assets
  };
}

export async function buildProjectDonorAssetIndex(projectId: string): Promise<DonorAssetIndex> {
  const config = await getProjectDonorAssetConfig(projectId);
  return buildProjectDonorAssetIndexFromConfig(config);
}

export async function writeProjectDonorAssetIndex(projectId: string): Promise<DonorAssetIndex> {
  const config = await getProjectDonorAssetConfig(projectId);
  const index = await buildProjectDonorAssetIndexFromConfig(config);
  await fs.mkdir(path.dirname(config.indexPath), { recursive: true });
  await fs.writeFile(config.indexPath, `${JSON.stringify(index, null, 2)}\n`, "utf8");
  return index;
}

export async function readProjectDonorAssetIndex(projectId: string): Promise<DonorAssetIndex | null> {
  const config = await getProjectDonorAssetConfig(projectId);
  try {
    const raw = await fs.readFile(config.indexPath, "utf8");
    return JSON.parse(raw) as DonorAssetIndex;
  } catch (error) {
    if ((error as NodeJS.ErrnoException | undefined)?.code === "ENOENT") {
      return null;
    }

    throw error;
  }
}
