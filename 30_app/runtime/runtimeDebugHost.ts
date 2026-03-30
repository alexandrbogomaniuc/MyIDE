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
