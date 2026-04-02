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

export interface RuntimeDebugBridgeAssetCandidate {
  canonicalSourceUrl: string;
  observedUrl: string | null;
  runtimeRelativePath: string | null;
  fileType: string | null;
  hitCount: number;
  sourceKinds: string[];
  contexts: string[];
}

function scoreDebugCandidate(entry: RuntimeResourceMapEntry): number {
  const relativePath = String(entry.runtimeRelativePath ?? "").toLowerCase();
  let score = Number(entry.hitCount ?? 0);

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

  return score;
}

function scoreDebugBridgeAssetCandidate(entry: RuntimeDebugBridgeStatus["assetUseEntries"][number]): number {
  const relativePath = String(entry.runtimeRelativePath ?? "").toLowerCase();
  let score = Number(entry.hitCount ?? 0);

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

  return score;
}

export function selectRuntimeDebugCandidate(resourceMap: RuntimeResourceMapStatus | null): RuntimeDebugCandidate | null {
  if (!resourceMap) {
    return null;
  }

  const candidates = resourceMap.entries
    .filter((entry) => ["png", "jpg", "jpeg", "webp", "svg", "gif"].includes(String(entry.fileType ?? "").toLowerCase()))
    .sort((left, right) => {
      const scoreDelta = scoreDebugCandidate(right) - scoreDebugCandidate(left);
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

export function selectRuntimeDebugBridgeAssetCandidate(
  status: RuntimeDebugBridgeStatus | null
): RuntimeDebugBridgeAssetCandidate | null {
  if (!status?.assetUseEntries?.length) {
    return null;
  }

  const candidates = status.assetUseEntries
    .filter((entry) => (
      typeof entry.canonicalUrl === "string"
      && entry.canonicalUrl.length > 0
      && ["png", "jpg", "jpeg", "webp", "svg", "gif"].includes(String(entry.fileType ?? "").toLowerCase())
    ))
    .sort((left, right) => {
      const scoreDelta = scoreDebugBridgeAssetCandidate(right) - scoreDebugBridgeAssetCandidate(left);
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
