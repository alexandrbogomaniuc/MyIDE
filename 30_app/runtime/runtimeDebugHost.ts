import path from "node:path";
import type { RuntimeResourceMapEntry, RuntimeResourceMapStatus } from "./runtimeResourceMap";

export interface RuntimeDebugBridgeStatus {
  href: string;
  title: string | null;
  bridgeSource: string;
  bridgeVersion: string;
  frameCount: number;
  accessibleFrameCount: number;
  canvasCount: number;
  pixiDetected: boolean;
  pixiVersion: string | null;
  candidateApps: Array<{
    key: string;
    childCount: number | null;
    viewWidth: number | null;
    viewHeight: number | null;
  }>;
  inspectEnabled: boolean;
  paused: boolean;
  support: {
    pause: boolean;
    resume: boolean;
    step: boolean;
    blockers: {
      pause: string | null;
      resume: string | null;
      step: string | null;
    };
  };
  resourceEntries: Array<{
    url: string | null;
    canonicalUrl: string | null;
    initiatorType: string | null;
    filename: string | null;
    observedUrl: string | null;
    windowLabel?: string | null;
  }>;
  assetUseEntries: Array<{
    observedUrl: string | null;
    canonicalUrl: string | null;
    runtimeRelativePath: string | null;
    fileType: string | null;
    hitCount: number;
    lastUsedAtUtc: string | null;
    sourceKinds: string[];
    contexts: string[];
    naturalWidth: number | null;
    naturalHeight: number | null;
    canvasRect: { x: number; y: number; width: number; height: number } | null;
  }>;
  contextTypes: string[];
  engineKind: string;
  engineNote: string;
}

export interface RuntimeDebugPickPayload extends RuntimeDebugBridgeStatus {
  clientX: number;
  clientY: number;
  targetTag: string | null;
  targetId: string | null;
  targetClassName: string | null;
  canvasDetected: boolean;
  canvasPoint: { x: number; y: number } | null;
  canvasSize: { width: number | null; height: number | null } | null;
  topDisplayObject: {
    id: string | null;
    name: string | null;
    label: string | null;
    constructorName: string | null;
    zIndex: number | null;
    texture: {
      cacheId: string | null;
      resourceUrl: string | null;
      frame: { x: number; y: number; width: number; height: number } | null;
    } | null;
    bounds: { x: number; y: number; width: number; height: number } | null;
  } | null;
  displayHitCount: number;
  topRuntimeAsset: {
    observedUrl: string | null;
    canonicalUrl: string | null;
    runtimeRelativePath: string | null;
    fileType: string | null;
    hitCount: number;
    lastUsedAtUtc: string | null;
    sourceKinds: string[];
    contexts: string[];
    naturalWidth: number | null;
    naturalHeight: number | null;
    canvasRect: { x: number; y: number; width: number; height: number } | null;
  } | null;
}

export interface RuntimeDebugCandidate {
  canonicalSourceUrl: string;
  runtimeRelativePath: string | null;
  fileType: string | null;
  requestSource: string;
  hitCount: number;
  captureMethods: string[];
  localMirrorRepoRelativePath: string | null;
}

interface RuntimeDebugCandidateSelectionOptions {
  preferredTokens?: string[] | null;
}

export interface RuntimeDebugBridgeAssetCandidate {
  canonicalSourceUrl: string;
  observedUrl: string | null;
  runtimeRelativePath: string | null;
  fileType: string | null;
  hitCount: number;
  sourceKinds: string[];
  contexts: string[];
}

function slugifyRuntimeDebugValue(value: string | null | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.toLowerCase().replace(/[^a-z0-9]+/g, "");
  return normalized.length > 0 ? normalized : null;
}

function normalizeRuntimeDebugTokens(tokens: readonly string[] | null | undefined): string[] {
  if (!Array.isArray(tokens)) {
    return [];
  }
  const normalized = new Set<string>();
  for (const token of tokens) {
    const slug = slugifyRuntimeDebugValue(token);
    if (slug && slug.length >= 3) {
      normalized.add(slug);
    }
  }
  return Array.from(normalized);
}

function buildRuntimeDebugEntryTokenSet(values: Array<string | null | undefined>): Set<string> {
  const tokens = new Set<string>();
  const addComparablePathVariants = (value: string) => {
    const basename = path.basename(value);
    let current = basename.toLowerCase();
    for (let index = 0; index < 4; index += 1) {
      const currentSlug = slugifyRuntimeDebugValue(current);
      if (currentSlug) {
        tokens.add(currentSlug);
      }
      const withoutFinalExtension = current.replace(/\.[a-z0-9]+$/, "");
      if (withoutFinalExtension === current) {
        break;
      }
      current = withoutFinalExtension;
      const extensionStrippedSlug = slugifyRuntimeDebugValue(current);
      if (extensionStrippedSlug) {
        tokens.add(extensionStrippedSlug);
      }
      const withoutSizeSuffix = current.replace(/(?:[_-]\d+){2,}$/, "");
      if (withoutSizeSuffix !== current) {
        current = withoutSizeSuffix;
        const sizeStrippedSlug = slugifyRuntimeDebugValue(current);
        if (sizeStrippedSlug) {
          tokens.add(sizeStrippedSlug);
        }
      }
    }
  };

  for (const value of values) {
    if (typeof value !== "string" || value.length === 0) {
      continue;
    }
    const slug = slugifyRuntimeDebugValue(value);
    if (slug) {
      tokens.add(slug);
    }
    const basename = path.basename(value);
    const basenameSlug = slugifyRuntimeDebugValue(basename);
    if (basenameSlug) {
      tokens.add(basenameSlug);
    }
    addComparablePathVariants(value);
    for (const part of value.split(/[^a-zA-Z0-9]+/g)) {
      const partSlug = slugifyRuntimeDebugValue(part);
      if (partSlug) {
        tokens.add(partSlug);
      }
    }
  }
  return tokens;
}

function scorePreferredTokenMatch(
  entryTokens: Set<string>,
  entryHaystack: string,
  preferredTokens: readonly string[]
): number {
  let score = 0;
  for (const token of preferredTokens) {
    if (entryTokens.has(token)) {
      score += 900 + token.length;
      continue;
    }
    if (entryHaystack.includes(token)) {
      score += 450 + token.length;
      continue;
    }
    for (const entryToken of entryTokens) {
      if (entryToken.includes(token) || token.includes(entryToken)) {
        score += 180 + Math.min(entryToken.length, token.length);
        break;
      }
    }
  }
  return score;
}

function scoreDebugCandidate(entry: RuntimeResourceMapEntry, preferredTokens: readonly string[] = []): number {
  const relativePath = String(entry.runtimeRelativePath ?? "").toLowerCase();
  let score = Number(entry.hitCount ?? 0);
  const entryTokenSet = buildRuntimeDebugEntryTokenSet([
    entry.runtimeRelativePath,
    entry.localMirrorRepoRelativePath,
    entry.canonicalSourceUrl,
    entry.runtimeFilename
  ]);
  const entryHaystack = Array.from(entryTokenSet).join(" ");

  if (entry.requestSource === "project-local-override") {
    score += 300;
  } else if (entry.requestSource === "local-mirror-asset") {
    score += 160;
  } else if (entry.requestSource === "local-mirror-proxy") {
    score += 120;
  }

  if (relativePath.includes("preloader-assets/")) {
    score += 80;
  }
  if (relativePath.endsWith("logo-lights.png")) {
    score += 60;
  } else if (relativePath.endsWith("logo.png") || relativePath.endsWith("logo.jpg")) {
    score += 50;
  } else if (relativePath.endsWith("split.png")) {
    score += 40;
  } else if (relativePath.endsWith("a.png")) {
    score += 30;
  }

  if (preferredTokens.length > 0) {
    score += scorePreferredTokenMatch(entryTokenSet, entryHaystack, preferredTokens);
  }

  return score;
}

function scoreDebugBridgeAssetCandidate(
  entry: RuntimeDebugBridgeStatus["assetUseEntries"][number],
  preferredTokens: readonly string[] = []
): number {
  const relativePath = String(entry.runtimeRelativePath ?? "").toLowerCase();
  let score = Number(entry.hitCount ?? 0);
  const entryTokenSet = buildRuntimeDebugEntryTokenSet([
    entry.runtimeRelativePath,
    entry.canonicalUrl,
    entry.observedUrl
  ]);
  const entryHaystack = Array.from(entryTokenSet).join(" ");

  if (entry.sourceKinds.includes("webgl-draw")) {
    score += 70;
  } else if (entry.sourceKinds.includes("webgl-texture-upload")) {
    score += 55;
  } else if (entry.sourceKinds.includes("canvas-2d-draw")) {
    score += 45;
  } else if (entry.sourceKinds.includes("dom-image-element")) {
    score += 35;
  } else if (entry.sourceKinds.includes("dom-style-image")) {
    score += 20;
  }

  if (relativePath.includes("preloader-assets/")) {
    score += 80;
  }
  if (relativePath.endsWith("logo-lights.png")) {
    score += 60;
  } else if (relativePath.endsWith("logo.png") || relativePath.endsWith("logo.jpg")) {
    score += 50;
  } else if (relativePath.endsWith("split.png")) {
    score += 40;
  } else if (relativePath.endsWith("a.png")) {
    score += 30;
  }

  if (preferredTokens.length > 0) {
    score += scorePreferredTokenMatch(entryTokenSet, entryHaystack, preferredTokens);
  }

  return score;
}

export function selectRuntimeDebugCandidate(
  resourceMap: RuntimeResourceMapStatus | null,
  options: RuntimeDebugCandidateSelectionOptions = {}
): RuntimeDebugCandidate | null {
  if (!resourceMap) {
    return null;
  }
  const preferredTokens = normalizeRuntimeDebugTokens(options.preferredTokens);

  const candidates = resourceMap.entries
    .filter((entry) => ["png", "jpg", "jpeg", "webp", "svg", "gif"].includes(String(entry.fileType ?? "").toLowerCase()))
    .sort((left, right) => {
      const scoreDelta = scoreDebugCandidate(right, preferredTokens) - scoreDebugCandidate(left, preferredTokens);
      if (scoreDelta !== 0) {
        return scoreDelta;
      }
      return String(left.runtimeRelativePath ?? left.canonicalSourceUrl).localeCompare(String(right.runtimeRelativePath ?? right.canonicalSourceUrl));
    });

  const winner = candidates[0];
  if (!winner) {
    return null;
  }

  return {
    canonicalSourceUrl: winner.canonicalSourceUrl,
    runtimeRelativePath: winner.runtimeRelativePath,
    fileType: winner.fileType,
    requestSource: winner.requestSource,
    hitCount: winner.hitCount,
    captureMethods: winner.captureMethods,
    localMirrorRepoRelativePath: winner.localMirrorRepoRelativePath
  };
}

export function preferUpstreamRuntimeDebugCandidate(
  resourceMap: RuntimeResourceMapStatus | null,
  candidate: RuntimeDebugCandidate | null
): RuntimeDebugCandidate | null {
  if (!resourceMap || !candidate || candidate.requestSource === "upstream-request") {
    return candidate;
  }

  const upstreamMatch = resourceMap.entries.find((entry) => (
    entry.requestSource === "upstream-request"
    && entry.runtimeRelativePath === candidate.runtimeRelativePath
    && entry.fileType === candidate.fileType
  ));
  if (!upstreamMatch) {
    return candidate;
  }

  return {
    canonicalSourceUrl: upstreamMatch.canonicalSourceUrl,
    runtimeRelativePath: upstreamMatch.runtimeRelativePath,
    fileType: upstreamMatch.fileType,
    requestSource: upstreamMatch.requestSource,
    hitCount: Math.max(Number(candidate.hitCount ?? 0), Number(upstreamMatch.hitCount ?? 0)),
    captureMethods: Array.from(new Set([...(candidate.captureMethods ?? []), ...(upstreamMatch.captureMethods ?? [])])),
    localMirrorRepoRelativePath: candidate.localMirrorRepoRelativePath ?? upstreamMatch.localMirrorRepoRelativePath
  };
}

export function selectRuntimeDebugBridgeAssetCandidate(
  status: RuntimeDebugBridgeStatus | null,
  options: RuntimeDebugCandidateSelectionOptions = {}
): RuntimeDebugBridgeAssetCandidate | null {
  if (!status?.assetUseEntries?.length) {
    return null;
  }
  const preferredTokens = normalizeRuntimeDebugTokens(options.preferredTokens);

  const candidates = status.assetUseEntries
    .filter((entry) => (
      typeof entry.canonicalUrl === "string"
      && entry.canonicalUrl.length > 0
      && ["png", "jpg", "jpeg", "webp", "svg", "gif"].includes(String(entry.fileType ?? "").toLowerCase())
    ))
    .sort((left, right) => {
      const scoreDelta = scoreDebugBridgeAssetCandidate(right, preferredTokens) - scoreDebugBridgeAssetCandidate(left, preferredTokens);
      if (scoreDelta !== 0) {
        return scoreDelta;
      }
      return String(left.runtimeRelativePath ?? left.canonicalUrl ?? left.observedUrl)
        .localeCompare(String(right.runtimeRelativePath ?? right.canonicalUrl ?? right.observedUrl));
    });

  const winner = candidates[0];
  if (!winner?.canonicalUrl) {
    return null;
  }

  return {
    canonicalSourceUrl: winner.canonicalUrl,
    observedUrl: winner.observedUrl,
    runtimeRelativePath: winner.runtimeRelativePath,
    fileType: winner.fileType,
    hitCount: winner.hitCount,
    sourceKinds: winner.sourceKinds.slice(),
    contexts: winner.contexts.slice()
  };
}

export function buildRuntimeDebugStatusScript(): string {
  return `(() => {
    const bridge = window.__MYIDE_RUNTIME_BRIDGE__;
    if (!bridge || typeof bridge.getStatus !== "function") {
      return null;
    }
    return bridge.getStatus();
  })()`;
}

export function buildRuntimeDebugCenterPickScript(): string {
  return `(() => {
    const bridge = window.__MYIDE_RUNTIME_BRIDGE__;
    if (!bridge || typeof bridge.pickAtPoint !== "function") {
      return null;
    }
    const x = Math.round(window.innerWidth / 2);
    const y = Math.round(window.innerHeight / 2);
    return bridge.pickAtPoint(x, y);
  })()`;
}

export function buildRuntimeDebugPrimeAssetRequestScript(requestUrl: string): string {
  const serializedUrl = JSON.stringify(requestUrl);
  return `(() => (async () => {
    const baseUrl = ${serializedUrl};
    const requestUrl = baseUrl + (baseUrl.includes("?") ? "&" : "?") + "__myide_runtime_prime__=" + Date.now();
    const serializeError = (value) => {
      if (!value) {
        return null;
      }
      if (value instanceof Error) {
        return value.message;
      }
      return String(value);
    };

    try {
      await new Promise((resolve, reject) => {
        const img = new Image();
        img.decoding = "async";
        img.referrerPolicy = "no-referrer";
        img.onload = () => {
          try {
            img.remove();
          } catch {}
          resolve(true);
        };
        img.onerror = (error) => {
          try {
            img.remove();
          } catch {}
          reject(error);
        };
        img.style.position = "fixed";
        img.style.left = "-10000px";
        img.style.top = "-10000px";
        img.style.width = "1px";
        img.style.height = "1px";
        document.body.appendChild(img);
        img.src = requestUrl;
      });
      return {
        ok: true,
        via: "image",
        requestUrl
      };
    } catch (imageError) {
      try {
        const response = await fetch(requestUrl, {
          cache: "reload",
          credentials: "omit"
        });
        return {
          ok: response.ok,
          via: "fetch",
          requestUrl,
          status: response.status,
          error: response.ok ? null : "HTTP " + response.status
        };
      } catch (fetchError) {
        return {
          ok: false,
          via: "fetch",
          requestUrl,
          error: serializeError(fetchError) ?? serializeError(imageError)
        };
      }
    }
  })())()`;
}
