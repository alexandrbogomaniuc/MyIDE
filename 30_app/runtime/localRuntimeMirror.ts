import { existsSync, promises as fs } from "node:fs";
import path from "node:path";
import { readRuntimeResourceMapSnapshot } from "./runtimeResourceMap";

export interface LocalRuntimeMirrorEntry {
  sourceUrl: string;
  kind: "launch-script" | "runtime-loader" | "runtime-bundle" | "static-image" | "support-script" | "runtime-metadata" | "translation-payload";
  repoRelativePath: string;
  fileType: string;
}

export interface LocalRuntimeMirrorManifest {
  schemaVersion: "0.1.0";
  projectId: string;
  mode: "partial-local-runtime-mirror";
  generatedAtUtc: string;
  publicEntryUrl: string;
  resourceVersion: string | null;
  notes: string[];
  entries: LocalRuntimeMirrorEntry[];
}

export interface LocalRuntimeMirrorStatusEntry extends LocalRuntimeMirrorEntry {
  absolutePath: string;
  fileExists: boolean;
}

export interface LocalRuntimeMirrorStatus {
  projectId: string;
  available: boolean;
  mode: "partial-local-runtime-mirror" | "none";
  blocker: string | null;
  manifestRepoRelativePath: string;
  mirrorRootRepoRelativePath: string;
  launchUrl: string | null;
  publicEntryUrl: string | null;
  resourceVersion: string | null;
  entryCount: number;
  entries: LocalRuntimeMirrorStatusEntry[];
  notes: string[];
}

export interface CapturedRuntimeMirrorResult {
  status: LocalRuntimeMirrorStatus;
  finalLaunchUrl: string;
}

interface MirrorCaptureAttemptResult {
  entry: LocalRuntimeMirrorEntry | null;
  warning: string | null;
}

const workspaceRoot = path.resolve(__dirname, "../../..");
const defaultLocalMirrorPort = 38901;
const configuredLocalMirrorPort = (() => {
  const rawValue = process.env.MYIDE_RUNTIME_LOCAL_MIRROR_PORT;
  const parsedValue = Number.parseInt(rawValue ?? "", 10);
  return Number.isInteger(parsedValue) && parsedValue > 0 && parsedValue < 65536
    ? parsedValue
    : defaultLocalMirrorPort;
})();
const localMirrorPort = configuredLocalMirrorPort;
const donorRuntimeSessionReadme = path.join(
  workspaceRoot,
  "10_donors",
  "donor_001_mystery_garden",
  "evidence",
  "capture_sessions",
  "MG-CS-20260320-LIVE-A",
  "README.md"
);
const supportedHosts = new Set([
  "boost2.bgaming-network.com",
  "cdn.bgaming-network.com",
  "replays.bgaming-network.com",
  "rs-cdn.shared.bgaming-system.com",
  "lobby.bgaming-network.com",
  "drops-fe.bgaming-network.com",
  "www.googletagmanager.com",
  "translations.bgaming-network.com"
]);

function assertSupportedProject(projectId: string): void {
  if (projectId !== "project_001") {
    throw new Error(`Local runtime mirror is currently scoped to project_001 only. Received: ${projectId}`);
  }
}

function toRepoRelativePath(filePath: string): string {
  return path.relative(workspaceRoot, filePath).replace(/\\/g, "/");
}

function getLocalRuntimeMirrorPaths(projectId: string): {
  mirrorRoot: string;
  filesRoot: string;
  manifestPath: string;
} {
  assertSupportedProject(projectId);
  const mirrorRoot = path.join(workspaceRoot, "40_projects", projectId, "runtime", "local-mirror");
  return {
    mirrorRoot,
    filesRoot: path.join(mirrorRoot, "files"),
    manifestPath: path.join(mirrorRoot, "manifest.json")
  };
}

function buildEmptyMirrorStatus(projectId: string, publicEntryUrl: string | null, blocker: string): LocalRuntimeMirrorStatus {
  const { mirrorRoot, manifestPath } = getLocalRuntimeMirrorPaths(projectId);
  return {
    projectId,
    available: false,
    mode: "none",
    blocker,
    manifestRepoRelativePath: toRepoRelativePath(manifestPath),
    mirrorRootRepoRelativePath: toRepoRelativePath(mirrorRoot),
    launchUrl: null,
    publicEntryUrl,
    resourceVersion: null,
    entryCount: 0,
    entries: [],
    notes: [
      blocker
    ]
  };
}

function getMirrorLaunchUrl(projectId: string): string {
  assertSupportedProject(projectId);
  return `http://127.0.0.1:${localMirrorPort}/runtime/${projectId}/launch`;
}

export function getLocalRuntimeMirrorPort(): number {
  return localMirrorPort;
}

export function buildLocalRuntimeMirrorAssetUrl(projectId: string, relativePath: string): string {
  assertSupportedProject(projectId);
  const normalizedRelativePath = relativePath.replace(/^\/+/, "");
  return `http://127.0.0.1:${localMirrorPort}/runtime/${projectId}/assets/${normalizedRelativePath}`;
}

export function buildLocalRuntimeMirrorProxyUrl(projectId: string, sourceUrl: string): string {
  assertSupportedProject(projectId);
  const encoded = encodeURIComponent(sourceUrl);
  return `http://127.0.0.1:${localMirrorPort}/runtime/${projectId}/mirror?source=${encoded}`;
}

function sanitizeFileComponent(value: string): string {
  return value
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96) || "asset";
}

function getMirrorEntryFilePath(projectId: string, sourceUrl: string): string {
  const { filesRoot } = getLocalRuntimeMirrorPaths(projectId);
  const parsed = new URL(sourceUrl);
  const fileType = getFileType(sourceUrl);
  const extension = path.extname(parsed.pathname) || (fileType === "json" ? ".json" : ".bin");
  const baseName = sanitizeFileComponent(path.basename(parsed.pathname, extension) || parsed.hostname);
  const querySuffix = parsed.search
    ? `--q${sanitizeFileComponent(parsed.search.replace(/^\?/, ""))}`
    : "";
  return path.join(
    filesRoot,
    sanitizeFileComponent(parsed.hostname),
    `${baseName}${querySuffix}${extension}`
  );
}

function normalizeMirrorLookupUrl(sourceUrl: string): string {
  const parsed = new URL(sourceUrl);
  if (parsed.pathname.endsWith(".js")) {
    parsed.search = "";
  }
  parsed.hash = "";
  return parsed.toString();
}

function getSourceUrlRelativePath(sourceUrl: string): string | null {
  try {
    const parsedUrl = new URL(sourceUrl);
    if (parsedUrl.pathname.includes("/html/MysteryGarden/")) {
      return `${parsedUrl.pathname.split("/html/MysteryGarden/")[1]}${parsedUrl.search}`;
    }
    return null;
  } catch {
    return null;
  }
}

async function collectObservedRuntimeRequestUrls(projectId: string): Promise<string[]> {
  const snapshot = await readRuntimeResourceMapSnapshot(projectId);
  if (!snapshot?.entries?.length) {
    return [];
  }

  return snapshot.entries
    .filter((entry) => Boolean(normalizeHostCandidate(entry.canonicalSourceUrl)))
    .filter((entry) => (
      entry.requestCategory === "static-asset"
      || entry.requestCategory === "html-bootstrap"
    ))
    .map((entry) => entry.canonicalSourceUrl);
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

async function readManifest(projectId: string): Promise<LocalRuntimeMirrorManifest | null> {
  const { manifestPath } = getLocalRuntimeMirrorPaths(projectId);
  try {
    const raw = await fs.readFile(manifestPath, "utf8");
    const parsed = JSON.parse(raw) as LocalRuntimeMirrorManifest;
    if (!parsed || parsed.projectId !== projectId || !Array.isArray(parsed.entries)) {
      throw new Error(`Local runtime mirror manifest is invalid for ${projectId}.`);
    }
    return parsed;
  } catch (error) {
    if ((error as NodeJS.ErrnoException | undefined)?.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

function normalizeHostCandidate(sourceUrl: string): string | null {
  try {
    const parsed = new URL(normalizeMirrorLookupUrl(sourceUrl));
    return supportedHosts.has(parsed.hostname) ? parsed.hostname : null;
  } catch {
    return null;
  }
}

function classifyMirrorEntry(sourceUrl: string): LocalRuntimeMirrorEntry["kind"] {
  if (sourceUrl.startsWith("https://translations.bgaming-network.com/")) {
    return "translation-payload";
  }
  if (sourceUrl.includes("/wrapper.js") || sourceUrl.includes("/lobby-bundle.js") || sourceUrl.includes("/replays.js")) {
    return "support-script";
  }
  if (sourceUrl.includes("/loader.js")) {
    return "runtime-loader";
  }
  if (sourceUrl.includes("/bundle.js")) {
    return "runtime-bundle";
  }
  if (/\.(json|atlas|plist|xml|fnt|skel)$/i.test(sourceUrl)) {
    return "runtime-metadata";
  }
  if (/\.(png|webp|jpg|jpeg|svg|gif)$/i.test(sourceUrl)) {
    return "static-image";
  }
  return "launch-script";
}

function getFileType(sourceUrl: string): string {
  const parsed = new URL(sourceUrl);
  if (parsed.hostname === "translations.bgaming-network.com" && path.extname(parsed.pathname).length === 0) {
    return "json";
  }
  const extension = path.extname(parsed.pathname).replace(/^\./, "").toLowerCase();
  return extension || "file";
}

async function fetchRemoteText(url: string): Promise<{ finalUrl: string; text: string }> {
  const response = await fetch(url, {
    headers: {
      "user-agent": "Mozilla/5.0 (MyIDE local runtime mirror)"
    },
    redirect: "follow"
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }
  return {
    finalUrl: response.url,
    text: await response.text()
  };
}

async function fetchRemoteBytes(url: string): Promise<Uint8Array> {
  const response = await fetch(url, {
    headers: {
      "user-agent": "Mozilla/5.0 (MyIDE local runtime mirror)"
    },
    redirect: "follow"
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }
  return new Uint8Array(await response.arrayBuffer());
}

function extractPublicEntryUrl(raw: string): string | null {
  const match = raw.match(/Entry URL used:\s*`([^`]+)`/);
  const value = match?.[1]?.trim() ?? "";
  return value.length > 0 ? value : null;
}

function extractWindowOptionsJson(html: string): Record<string, unknown> | null {
  const assignmentIndex = html.indexOf("window.__OPTIONS__");
  if (assignmentIndex < 0) {
    return null;
  }

  const equalsIndex = html.indexOf("=", assignmentIndex);
  if (equalsIndex < 0) {
    return null;
  }

  const objectStartIndex = html.indexOf("{", equalsIndex);
  if (objectStartIndex < 0) {
    return null;
  }

  let depth = 0;
  let inString: "\"" | "'" | null = null;
  let escaped = false;
  let objectEndIndex = -1;

  for (let index = objectStartIndex; index < html.length; index += 1) {
    const character = html[index];

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (character === "\\") {
        escaped = true;
        continue;
      }
      if (character === inString) {
        inString = null;
      }
      continue;
    }

    if (character === "\"" || character === "'") {
      inString = character as "\"" | "'";
      continue;
    }

    if (character === "{") {
      depth += 1;
      continue;
    }

    if (character === "}") {
      depth -= 1;
      if (depth === 0) {
        objectEndIndex = index + 1;
        break;
      }
    }
  }

  if (objectEndIndex < 0) {
    return null;
  }

  try {
    return JSON.parse(html.slice(objectStartIndex, objectEndIndex)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function replaceWindowOptionsJson(html: string, nextOptions: Record<string, unknown>): string {
  const assignmentIndex = html.indexOf("window.__OPTIONS__");
  if (assignmentIndex < 0) {
    return html;
  }

  const equalsIndex = html.indexOf("=", assignmentIndex);
  if (equalsIndex < 0) {
    return html;
  }

  const objectStartIndex = html.indexOf("{", equalsIndex);
  if (objectStartIndex < 0) {
    return html;
  }

  let depth = 0;
  let inString: "\"" | "'" | null = null;
  let escaped = false;
  let objectEndIndex = -1;

  for (let index = objectStartIndex; index < html.length; index += 1) {
    const character = html[index];

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (character === "\\") {
        escaped = true;
        continue;
      }
      if (character === inString) {
        inString = null;
      }
      continue;
    }

    if (character === "\"" || character === "'") {
      inString = character as "\"" | "'";
      continue;
    }

    if (character === "{") {
      depth += 1;
      continue;
    }

    if (character === "}") {
      depth -= 1;
      if (depth === 0) {
        objectEndIndex = index + 1;
        break;
      }
    }
  }

  if (objectEndIndex < 0) {
    return html;
  }

  return `${html.slice(0, objectStartIndex)}${JSON.stringify(nextOptions, null, 2)}${html.slice(objectEndIndex)}`;
}

function extractMirrorScriptUrls(html: string): string[] {
  const urls = new Set<string>();
  const pattern = /(?:src|href)=["']([^"']+)["']/g;
  for (const match of html.matchAll(pattern)) {
    const candidate = match[1]?.trim() ?? "";
    if (!candidate.startsWith("http")) {
      continue;
    }
    if (!normalizeHostCandidate(candidate)) {
      continue;
    }
    urls.add(candidate);
  }
  return Array.from(urls);
}

function extractResourceVersion(loaderText: string): string | null {
  const match = loaderText.match(/game:\s*v([^,\)]+)/);
  return match?.[1]?.trim() ?? null;
}

function extractBundleRuntimeCandidates(bundleText: string, resourceVersion: string): string[] {
  const urls = new Set<string>();
  const prefix = `https://cdn.bgaming-network.com/html/MysteryGarden/v${resourceVersion}/`;
  for (const match of bundleText.matchAll(/preloader-assets\/[A-Za-z0-9._-]+/g)) {
    urls.add(`${prefix}${match[0]}`);
  }
  for (const match of bundleText.matchAll(/img\/ui\/[A-Za-z0-9_./-]+\.(?:png|webp|jpg|jpeg|svg)/g)) {
    urls.add(`${prefix}${match[0]}`);
  }
  for (const match of bundleText.matchAll(/img\/spines\/[A-Za-z0-9_./-]+\.json/g)) {
    urls.add(`${prefix}${match[0]}`);
  }
  for (const match of bundleText.matchAll(/img\/coins\/[A-Za-z0-9_./-]+\.json/g)) {
    urls.add(`${prefix}${match[0]}`);
  }
  for (const match of bundleText.matchAll(/https:\/\/translations\.bgaming-network\.com\/[A-Za-z0-9._/-]+/g)) {
    urls.add(match[0]);
  }
  urls.add(`${prefix}preloader-assets/logo-lights.png`);
  return Array.from(urls).slice(0, 160);
}

function resolveRelativeAssetUrl(sourceUrl: string, candidate: string): string | null {
  const trimmed = candidate.trim();
  if (trimmed.length === 0) {
    return null;
  }
  try {
    return new URL(trimmed, sourceUrl).toString();
  } catch {
    return null;
  }
}

function extractAtlasPageCandidates(atlasText: string, sourceUrl: string): string[] {
  const urls = new Set<string>();
  const lines = atlasText.split(/\r?\n/);
  let expectingPage = true;
  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (trimmed.length === 0) {
      expectingPage = true;
      continue;
    }
    if (!expectingPage) {
      continue;
    }
    if (trimmed.includes(":")) {
      expectingPage = false;
      continue;
    }
    if (!/\.(png|webp|jpg|jpeg|svg)$/i.test(trimmed)) {
      expectingPage = false;
      continue;
    }
    const resolved = resolveRelativeAssetUrl(sourceUrl, trimmed);
    if (resolved) {
      urls.add(resolved);
    }
    expectingPage = false;
  }
  return Array.from(urls);
}

async function discoverNestedMirrorCandidates(entry: LocalRuntimeMirrorEntry): Promise<string[]> {
  const filePath = path.join(workspaceRoot, entry.repoRelativePath);
  let text: string;
  try {
    text = await fs.readFile(filePath, "utf8");
  } catch {
    return [];
  }

  const urls = new Set<string>();
  if (entry.fileType === "json") {
    try {
      const parsed = JSON.parse(text) as Record<string, unknown>;
      const meta = typeof parsed.meta === "object" && parsed.meta ? parsed.meta as Record<string, unknown> : null;
      if (typeof meta?.image === "string") {
        const resolved = resolveRelativeAssetUrl(entry.sourceUrl, meta.image);
        if (resolved) {
          urls.add(resolved);
        }
      }
    } catch {
      // Ignore JSON parsing failures and fall through to path-based heuristics.
    }

    if (/\/img\/spines\/[^/]+\.json$/i.test(new URL(entry.sourceUrl).pathname)) {
      const atlasUrl = entry.sourceUrl.replace(/\.json$/i, ".atlas");
      urls.add(atlasUrl);
    }
  }

  if (entry.fileType === "atlas") {
    for (const candidate of extractAtlasPageCandidates(text, entry.sourceUrl)) {
      urls.add(candidate);
    }
  }

  return Array.from(urls).filter((candidate) => Boolean(normalizeHostCandidate(candidate)));
}

async function writeMirrorEntry(projectId: string, sourceUrl: string): Promise<LocalRuntimeMirrorEntry> {
  const absolutePath = getMirrorEntryFilePath(projectId, sourceUrl);
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  const content = await fetchRemoteBytes(sourceUrl);
  await fs.writeFile(absolutePath, content);
  return {
    sourceUrl,
    kind: classifyMirrorEntry(sourceUrl),
    repoRelativePath: toRepoRelativePath(absolutePath),
    fileType: getFileType(sourceUrl)
  };
}

async function writeMirrorEntryIfAvailable(projectId: string, sourceUrl: string): Promise<MirrorCaptureAttemptResult> {
  try {
    return {
      entry: await writeMirrorEntry(projectId, sourceUrl),
      warning: null
    };
  } catch (error) {
    return {
      entry: null,
      warning: `Skipped unavailable runtime mirror candidate ${sourceUrl}: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

export async function captureLocalRuntimeMirror(projectId: string): Promise<CapturedRuntimeMirrorResult> {
  assertSupportedProject(projectId);
  const sessionReadme = await readOptionalTextFile(donorRuntimeSessionReadme);
  const publicEntryUrl = sessionReadme ? extractPublicEntryUrl(sessionReadme) : null;
  if (!publicEntryUrl) {
    throw new Error("Cannot capture a local runtime mirror because no grounded public entry URL is indexed in donor runtime evidence.");
  }

  const launchFetch = await fetchRemoteText(publicEntryUrl);
  const windowOptions = extractWindowOptionsJson(launchFetch.text);
  const scriptUrls = extractMirrorScriptUrls(launchFetch.text);
  const loaderUrl = typeof windowOptions?.games_loader_source === "string"
    ? String(windowOptions.games_loader_source)
    : scriptUrls.find((entry) => entry.includes("/loader.js")) ?? null;
  if (!loaderUrl) {
    throw new Error("Cannot capture a local runtime mirror because the live donor launch page did not expose a grounded loader.js source.");
  }

  const loaderFetch = await fetchRemoteText(loaderUrl);
  const resourceVersion = extractResourceVersion(loaderFetch.text);
  if (!resourceVersion) {
    throw new Error("Cannot capture a local runtime mirror because the loader did not expose a grounded Mystery Garden resource version.");
  }

  const bundleUrl = `https://cdn.bgaming-network.com/html/MysteryGarden/v${resourceVersion}/bundle.js`;
  const bundleFetch = await fetchRemoteText(bundleUrl);
  const runtimeCandidateUrls = extractBundleRuntimeCandidates(bundleFetch.text, resourceVersion);
  const manifestBeforeCapture = await readManifest(projectId);
  const observedRuntimeRequestUrls = await collectObservedRuntimeRequestUrls(projectId);

  const candidateUrls = Array.from(new Set([
    ...scriptUrls,
    loaderUrl,
    bundleUrl,
    ...runtimeCandidateUrls,
    ...observedRuntimeRequestUrls,
    ...(manifestBeforeCapture?.entries ?? []).map((entry) => entry.sourceUrl)
  ])).filter((entry) => Boolean(normalizeHostCandidate(entry)));

  const entries: LocalRuntimeMirrorEntry[] = [];
  const warnings: string[] = [];
  const queue = [...candidateUrls];
  const queued = new Set(queue);
  const processed = new Set<string>();
  while (queue.length > 0) {
    const sourceUrl = queue.shift();
    if (!sourceUrl || processed.has(sourceUrl)) {
      continue;
    }
    processed.add(sourceUrl);
    const result = await writeMirrorEntryIfAvailable(projectId, sourceUrl);
    if (result.entry) {
      entries.push(result.entry);
      const nestedCandidates = await discoverNestedMirrorCandidates(result.entry);
      for (const nestedCandidate of nestedCandidates) {
        if (processed.has(nestedCandidate) || queued.has(nestedCandidate)) {
          continue;
        }
        queued.add(nestedCandidate);
        queue.push(nestedCandidate);
      }
    }
    if (result.warning) {
      warnings.push(result.warning);
    }
  }

  const { mirrorRoot, manifestPath } = getLocalRuntimeMirrorPaths(projectId);
  await fs.mkdir(mirrorRoot, { recursive: true });
  const manifest: LocalRuntimeMirrorManifest = {
    schemaVersion: "0.1.0",
    projectId,
    mode: "partial-local-runtime-mirror",
    generatedAtUtc: new Date().toISOString(),
    publicEntryUrl,
    resourceVersion,
    notes: [
      "Partial local runtime mirror captured from the strongest grounded live Mystery Garden donor runtime entry.",
      "Launch HTML still refreshes from the public donor demo entry at runtime so a current launch token and live APIs/websocket URLs remain valid.",
      "Mirrored files are local-only and gitignored; raw donor files remain untouched.",
      `Bundle-derived runtime candidate hunt contributed ${runtimeCandidateUrls.length} direct URL candidate${runtimeCandidateUrls.length === 1 ? "" : "s"}, including deeper runtime metadata paths when present.`,
      observedRuntimeRequestUrls.length > 0
        ? `Observed runtime request snapshot contributed ${observedRuntimeRequestUrls.length} grounded launch/runtime candidate URL${observedRuntimeRequestUrls.length === 1 ? "" : "s"} to this mirror refresh.`
        : "No observed runtime request snapshot was available, so this refresh used bundle/loader-derived candidates only.",
      ...warnings
    ],
    entries: entries.sort((left, right) => left.sourceUrl.localeCompare(right.sourceUrl))
  };
  await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  return {
    status: await buildLocalRuntimeMirrorStatus(projectId),
    finalLaunchUrl: launchFetch.finalUrl
  };
}

export async function buildLocalRuntimeMirrorStatus(projectId: string): Promise<LocalRuntimeMirrorStatus> {
  assertSupportedProject(projectId);
  const sessionReadme = await readOptionalTextFile(donorRuntimeSessionReadme);
  const publicEntryUrl = sessionReadme ? extractPublicEntryUrl(sessionReadme) : null;
  const manifest = await readManifest(projectId);
  if (!manifest) {
    return buildEmptyMirrorStatus(projectId, publicEntryUrl, "No local runtime mirror has been captured for project_001 yet.");
  }

  const { mirrorRoot, manifestPath } = getLocalRuntimeMirrorPaths(projectId);
  const entries = manifest.entries.map((entry) => {
    const absolutePath = path.join(workspaceRoot, entry.repoRelativePath);
    return {
      ...entry,
      absolutePath,
      fileExists: existsSync(absolutePath)
    };
  });
  const hasLoader = entries.some((entry) => entry.kind === "runtime-loader" && entry.fileExists);
  const hasBundle = entries.some((entry) => entry.kind === "runtime-bundle" && entry.fileExists);
  const hasStaticImage = entries.some((entry) => entry.kind === "static-image" && entry.fileExists);
  const available = hasLoader && hasBundle && hasStaticImage;

  return {
    projectId,
    available,
    mode: available ? "partial-local-runtime-mirror" : "none",
    blocker: available
      ? null
      : "A local runtime mirror manifest exists, but it is missing one or more essential mirrored files (loader, bundle, or static image).",
    manifestRepoRelativePath: toRepoRelativePath(manifestPath),
    mirrorRootRepoRelativePath: toRepoRelativePath(mirrorRoot),
    launchUrl: available ? getMirrorLaunchUrl(projectId) : null,
    publicEntryUrl: manifest.publicEntryUrl || publicEntryUrl,
    resourceVersion: manifest.resourceVersion,
    entryCount: entries.length,
    entries,
    notes: manifest.notes.slice()
  };
}

export function findLocalRuntimeMirrorEntry(
  status: LocalRuntimeMirrorStatus | null | undefined,
  sourceUrl: string | null | undefined
): LocalRuntimeMirrorStatusEntry | null {
  if (!status?.entries?.length || typeof sourceUrl !== "string" || sourceUrl.length === 0) {
    return null;
  }

  const exactMatch = status.entries.find((entry) => entry.sourceUrl === sourceUrl);
  if (exactMatch) {
    return exactMatch;
  }

  let normalizedSourceUrl: string;
  try {
    normalizedSourceUrl = normalizeMirrorLookupUrl(sourceUrl);
  } catch {
    return null;
  }

  return status.entries.find((entry) => {
    try {
      return normalizeMirrorLookupUrl(entry.sourceUrl) === normalizedSourceUrl;
    } catch {
      return false;
    }
  }) ?? (() => {
    try {
      const parsed = new URL(normalizedSourceUrl);
      if (
        parsed.hostname === "cdn.bgaming-network.com"
        && parsed.pathname === "/html/MysteryGarden/bundle.js"
        && typeof status.resourceVersion === "string"
        && status.resourceVersion.length > 0
      ) {
        const versionedBundleUrl = `https://cdn.bgaming-network.com/html/MysteryGarden/v${status.resourceVersion}/bundle.js`;
        return status.entries.find((entry) => entry.sourceUrl === versionedBundleUrl) ?? null;
      }
    } catch {
      return null;
    }

    return null;
  })();
}

export function findLocalRuntimeMirrorEntryByRelativePath(
  status: LocalRuntimeMirrorStatus | null | undefined,
  relativePath: string | null | undefined
): LocalRuntimeMirrorStatusEntry | null {
  if (!status?.entries?.length || typeof relativePath !== "string" || relativePath.length === 0) {
    return null;
  }

  const normalizedRelativePath = relativePath.replace(/^\/+/, "");
  return status.entries.find((entry) => getSourceUrlRelativePath(entry.sourceUrl) === normalizedRelativePath) ?? null;
}

export function buildLocalRuntimeMirrorRedirectMap(status: LocalRuntimeMirrorStatus | null | undefined): Map<string, string> {
  const redirectMap = new Map<string, string>();
  if (!status?.available) {
    return redirectMap;
  }

  for (const entry of status.entries) {
    if (!entry.fileExists) {
      continue;
    }
    redirectMap.set(entry.sourceUrl, buildLocalRuntimeMirrorProxyUrl(status.projectId, entry.sourceUrl));
  }
  return redirectMap;
}

export async function readLocalRuntimeMirrorFile(
  projectId: string,
  sourceUrl: string
): Promise<{ absolutePath: string; fileType: string; content: Uint8Array } | null> {
  const status = await buildLocalRuntimeMirrorStatus(projectId);
  const entry = findLocalRuntimeMirrorEntry(status, sourceUrl);
  if (!entry?.fileExists) {
    return null;
  }

  return {
    absolutePath: entry.absolutePath,
    fileType: entry.fileType,
    content: new Uint8Array(await fs.readFile(entry.absolutePath))
  };
}

export async function readLocalRuntimeMirrorFileByRelativePath(
  projectId: string,
  relativePath: string
): Promise<{ sourceUrl: string; absolutePath: string; fileType: string; content: Uint8Array } | null> {
  const status = await buildLocalRuntimeMirrorStatus(projectId);
  const entry = findLocalRuntimeMirrorEntryByRelativePath(status, relativePath);
  if (!entry?.fileExists) {
    return null;
  }

  return {
    sourceUrl: entry.sourceUrl,
    absolutePath: entry.absolutePath,
    fileType: entry.fileType,
    content: new Uint8Array(await fs.readFile(entry.absolutePath))
  };
}

export async function buildLocalRuntimeLaunchHtml(projectId: string): Promise<{
  html: string;
  finalUrl: string;
  publicEntryUrl: string;
}> {
  assertSupportedProject(projectId);
  const status = await buildLocalRuntimeMirrorStatus(projectId);
  const publicEntryUrl = status.publicEntryUrl;
  if (!publicEntryUrl) {
    throw new Error("Cannot build the local runtime launch proxy because no grounded public Mystery Garden entry URL is indexed.");
  }

  const launchFetch = await fetchRemoteText(publicEntryUrl);
  let html = launchFetch.text.includes("myide-runtime-source")
    ? launchFetch.text
    : launchFetch.text.replace(
      "<head>",
      `<head>\n<meta name="myide-runtime-source" content="${status.available ? "local-mirror" : "public-fallback"}">`
    );

  if (status.available) {
    const options = extractWindowOptionsJson(html);
    if (options) {
      const rewrittenOptions = { ...options } as Record<string, unknown>;
      if (typeof rewrittenOptions.games_loader_source === "string") {
        rewrittenOptions.games_loader_source = buildLocalRuntimeMirrorProxyUrl(projectId, rewrittenOptions.games_loader_source);
      }
      if (typeof rewrittenOptions.game_bundle_source === "string") {
        const bundleRelativePath = getSourceUrlRelativePath(rewrittenOptions.game_bundle_source);
        if (bundleRelativePath) {
          rewrittenOptions.game_bundle_source = buildLocalRuntimeMirrorAssetUrl(projectId, bundleRelativePath);
        }
      }
      if (typeof rewrittenOptions.resources_path === "string") {
        rewrittenOptions.resources_path = buildLocalRuntimeMirrorAssetUrl(projectId, "");
      }

      html = replaceWindowOptionsJson(html, rewrittenOptions);
    }

    for (const entry of status.entries) {
      const replacement = entry.kind === "static-image" || entry.kind === "runtime-bundle"
        ? (() => {
            const relativePath = getSourceUrlRelativePath(entry.sourceUrl);
            return relativePath ? buildLocalRuntimeMirrorAssetUrl(projectId, relativePath) : buildLocalRuntimeMirrorProxyUrl(projectId, entry.sourceUrl);
          })()
        : buildLocalRuntimeMirrorProxyUrl(projectId, entry.sourceUrl);
      html = html.split(entry.sourceUrl).join(replacement);
    }
  }

  return {
    html,
    finalUrl: launchFetch.finalUrl,
    publicEntryUrl
  };
}
