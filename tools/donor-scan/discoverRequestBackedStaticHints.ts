import path from "node:path";
import {
  type ReferenceConfidence,
  type RequestBackedStaticHintFile,
  type RequestBackedStaticHintRecord,
  rewriteKnownPlaceholderSegments,
  uniqueStrings
} from "./shared";

interface RuntimeRequestLogEntry {
  canonicalSourceUrl?: string;
  latestRequestUrl?: string;
  requestSource?: string;
  requestCategory?: string;
  runtimeRelativePath?: string | null;
  fileType?: string | null;
  hitCount?: number | null;
}

interface RuntimeRequestLogFile {
  generatedAtUtc?: string;
  entries?: RuntimeRequestLogEntry[];
}

interface DiscoverRequestBackedStaticHintsOptions {
  donorId: string;
  donorName: string;
  requestLog: RuntimeRequestLogFile | null;
  evidencePath: string | null;
}

function normalizeUrl(rawUrl: string | null | undefined): string | null {
  const trimmed = String(rawUrl ?? "").trim();
  if (!trimmed) {
    return null;
  }
  try {
    return rewriteKnownPlaceholderSegments(new URL(trimmed).toString());
  } catch {
    return null;
  }
}

function inferFileTypeFromUrl(urlString: string | null | undefined): string | null {
  try {
    const pathname = new URL(String(urlString ?? "")).pathname;
    const extension = path.extname(pathname).replace(/^\./, "").toLowerCase();
    return extension || null;
  } catch {
    return null;
  }
}

function classifyStaticCategory(fileType: string | null | undefined): string | null {
  const normalized = String(fileType ?? "").toLowerCase();
  if (["png", "jpg", "jpeg", "gif", "svg", "webp"].includes(normalized)) {
    return "image";
  }
  if (["ogg", "mp3", "wav", "m4a"].includes(normalized)) {
    return "audio";
  }
  if (["woff", "woff2", "ttf", "otf", "fnt"].includes(normalized)) {
    return "font";
  }
  if (["mp4", "webm", "mov"].includes(normalized)) {
    return "video";
  }
  return null;
}

function isLocalRuntimeCaptureUrl(urlString: string | null | undefined): boolean {
  try {
    const parsed = new URL(String(urlString ?? ""));
    if (["127.0.0.1", "localhost"].includes(parsed.hostname.toLowerCase())) {
      return true;
    }
    return /^\/runtime\/[^/]+\//.test(parsed.pathname);
  } catch {
    return false;
  }
}

function buildHintRecord(
  entry: RuntimeRequestLogEntry,
  evidencePath: string | null
): RequestBackedStaticHintRecord | null {
  const canonicalSourceUrl = normalizeUrl(entry.canonicalSourceUrl);
  const latestRequestUrl = normalizeUrl(entry.latestRequestUrl ?? entry.canonicalSourceUrl);
  if (!canonicalSourceUrl || !latestRequestUrl) {
    return null;
  }
  if (canonicalSourceUrl === latestRequestUrl) {
    return null;
  }
  if (String(entry.requestCategory ?? "").toLowerCase() !== "static-asset") {
    return null;
  }

  const inferredFileType = String(entry.fileType ?? inferFileTypeFromUrl(entry.runtimeRelativePath) ?? inferFileTypeFromUrl(canonicalSourceUrl) ?? "").toLowerCase();
  const category = classifyStaticCategory(inferredFileType);
  if (!category) {
    return null;
  }

  const requestSource = String(entry.requestSource ?? "");
  if (
    ["local-mirror-asset", "local-mirror-proxy", "project-local-override"].includes(requestSource)
    && isLocalRuntimeCaptureUrl(latestRequestUrl)
  ) {
    return null;
  }

  let hintType: RequestBackedStaticHintRecord["hintType"] = "rooted-path-alias";
  let confidence: ReferenceConfidence = "confirmed";
  let note = "Runtime request log observed the same static asset under an alternate rooted path.";
  try {
    const canonicalParsed = new URL(canonicalSourceUrl);
    const latestParsed = new URL(latestRequestUrl);
    if (canonicalParsed.host !== latestParsed.host) {
      hintType = "redirect-target";
      note = "Runtime request log observed this static asset on an alternate host or redirect target.";
    } else if (canonicalParsed.pathname === latestParsed.pathname) {
      return null;
    }
  } catch {
    return null;
  }

  return {
    canonicalSourceUrl,
    latestRequestUrl,
    alternateUrl: latestRequestUrl,
    runtimeRelativePath: typeof entry.runtimeRelativePath === "string" ? entry.runtimeRelativePath : null,
    requestSource: requestSource || "unknown",
    requestCategory: "static-asset",
    fileType: inferredFileType || null,
    category,
    hitCount: Math.max(1, Number(entry.hitCount ?? 1) || 1),
    hintType,
    confidence,
    note,
    evidencePath
  };
}

export function discoverRequestBackedStaticHints(
  options: DiscoverRequestBackedStaticHintsOptions
): RequestBackedStaticHintFile {
  const records = Array.isArray(options.requestLog?.entries) ? options.requestLog.entries : [];
  const deduped = new Map<string, RequestBackedStaticHintRecord>();

  for (const entry of records) {
    const hint = buildHintRecord(entry, options.evidencePath);
    if (!hint) {
      continue;
    }
    const key = `${hint.canonicalSourceUrl}\t${hint.alternateUrl}`;
    const existing = deduped.get(key);
    if (!existing || hint.hitCount > existing.hitCount) {
      deduped.set(key, hint);
    }
  }

  const hints = [...deduped.values()].sort((left, right) => {
    if (left.hintType !== right.hintType) {
      return left.hintType.localeCompare(right.hintType);
    }
    return left.canonicalSourceUrl.localeCompare(right.canonicalSourceUrl);
  });

  const observedStaticRequestCount = uniqueStrings(
    records
      .filter((entry) => String(entry.requestCategory ?? "").toLowerCase() === "static-asset")
      .map((entry) => normalizeUrl(entry.canonicalSourceUrl))
  ).length;

  return {
    schemaVersion: "0.1.0",
    donorId: options.donorId,
    donorName: options.donorName,
    generatedAt: new Date().toISOString(),
    evidencePath: options.evidencePath,
    observedStaticRequestCount,
    hintCount: hints.length,
    hints
  };
}
