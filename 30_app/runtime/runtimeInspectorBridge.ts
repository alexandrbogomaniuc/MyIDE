import { contextBridge } from "electron";

type RuntimeAssetUseSourceKind =
  | "dom-image-element"
  | "dom-style-image"
  | "canvas-2d-draw"
  | "webgl-texture-upload"
  | "webgl-draw";

interface RuntimeRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface RuntimeTextureSummary {
  cacheId: string | null;
  resourceUrl: string | null;
  frame: RuntimeRect | null;
}

interface RuntimeDisplayObjectSummary {
  id: string | null;
  name: string | null;
  label: string | null;
  constructorName: string | null;
  zIndex: number | null;
  texture: RuntimeTextureSummary | null;
}

interface RuntimeDisplayHitSummary extends RuntimeDisplayObjectSummary {
  bounds: RuntimeRect | null;
}

interface RuntimeCandidateSummary {
  key: string;
  childCount: number | null;
  viewWidth: number | null;
  viewHeight: number | null;
}

interface RuntimeAssetUseEntry {
  observedUrl: string | null;
  canonicalUrl: string | null;
  runtimeRelativePath: string | null;
  fileType: string | null;
  hitCount: number;
  lastUsedAtUtc: string | null;
  sourceKinds: RuntimeAssetUseSourceKind[];
  contexts: string[];
  naturalWidth: number | null;
  naturalHeight: number | null;
  canvasRect: RuntimeRect | null;
}

interface RuntimeResourceEntry {
  url: string | null;
  canonicalUrl: string | null;
  initiatorType: string | null;
  filename: string | null;
  observedUrl: string | null;
  windowLabel?: string | null;
}

interface RuntimeControlSupport {
  pause: boolean;
  resume: boolean;
  step: boolean;
  blockers: {
    pause: string | null;
    resume: string | null;
    step: string | null;
  };
}

interface RuntimeBridgeStatus {
  href: string;
  title: string | null;
  bridgeSource: string;
  bridgeVersion: string;
  frameCount: number;
  accessibleFrameCount: number;
  canvasCount: number;
  pixiDetected: boolean;
  pixiVersion: string | null;
  candidateApps: RuntimeCandidateSummary[];
  inspectEnabled: boolean;
  paused: boolean;
  support: RuntimeControlSupport;
  resourceEntries: RuntimeResourceEntry[];
  assetUseEntries: RuntimeAssetUseEntry[];
  contextTypes: string[];
  engineKind: string;
  engineNote: string;
}

interface RuntimeBridgePickPayload extends RuntimeBridgeStatus {
  clientX: number;
  clientY: number;
  targetTag: string | null;
  targetId: string | null;
  targetClassName: string | null;
  canvasDetected: boolean;
  canvasPoint: { x: number; y: number } | null;
  canvasSize: { width: number | null; height: number | null } | null;
  topDisplayObject: RuntimeDisplayHitSummary | null;
  displayHitCount: number;
  topRuntimeAsset: RuntimeAssetUseEntry | null;
}

interface RuntimeTickerLike {
  stop: () => void;
  start: () => void;
  update?: (time?: number) => void;
}

interface RuntimeTextureBindingState {
  activeTextureUnit: number;
  boundTextures: Map<number, WebGLTexture | null>;
  contextLabel: string;
}

interface RuntimeTextureInfo {
  observedUrl: string | null;
  canonicalUrl: string | null;
  runtimeRelativePath: string | null;
  fileType: string | null;
  naturalWidth: number | null;
  naturalHeight: number | null;
}

interface RuntimeAssetUseRecord extends RuntimeAssetUseEntry {
  key: string;
  lastCanvasRectTimestamp: number | null;
  lastUsedAtMs: number | null;
}

interface RuntimeBridgeState {
  inspectEnabled: boolean;
  lastPick: RuntimeBridgePickPayload | null;
  paused: boolean;
  assetUseRecords: Map<string, RuntimeAssetUseRecord>;
  contextTypes: Set<string>;
  webglBindings: WeakMap<WebGLRenderingContext | WebGL2RenderingContext, RuntimeTextureBindingState>;
  textureInfo: WeakMap<WebGLTexture, RuntimeTextureInfo>;
}

interface InspectableWindowTarget {
  win: Window;
  label: string;
  href: string | null;
  title: string | null;
  depth: number;
  offsetX: number;
  offsetY: number;
}

type RuntimeCandidateObject = Record<string, unknown> & {
  stage?: Record<string, unknown>;
  renderer?: Record<string, unknown> & {
    view?: HTMLCanvasElement | null;
  };
  ticker?: RuntimeTickerLike;
};

type RuntimeGuestBridge = {
  getStatus: () => RuntimeBridgeStatus;
  setInspectEnabled: (flag: boolean) => { enabled: boolean };
  pickAtPoint: (clientX: number, clientY: number) => RuntimeBridgePickPayload;
  pause: () => { ok: boolean; blocked?: string | null; label?: string };
  resume: () => { ok: boolean; blocked?: string | null; label?: string };
  step: () => { ok: boolean; blocked?: string | null; label?: string };
};

declare global {
  interface Window {
    __MYIDE_RUNTIME_BRIDGE__?: RuntimeGuestBridge;
    __MYIDE_RUNTIME_BRIDGE_STATE__?: RuntimeBridgeState;
    PIXI?: {
      VERSION?: string;
      Ticker?: {
        shared?: RuntimeTickerLike;
      };
    };
  }
}

const runtimeConsolePrefix = "__MYIDE_RUNTIME__";
const staticFileTypes = new Set(["png", "webp", "jpg", "jpeg", "svg", "gif"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function normalizeNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? Math.round(value) : null;
}

function nowIso(): string {
  return new Date().toISOString();
}

function nowMs(): number {
  return Date.now();
}

function emit(type: string, payload: Record<string, unknown>): void {
  try {
    console.log(runtimeConsolePrefix + JSON.stringify({ type, ...payload }));
  } catch (error) {
    console.log(runtimeConsolePrefix + JSON.stringify({
      type: "error",
      error: error instanceof Error ? error.message : String(error)
    }));
  }
}

function getBridgeState(): RuntimeBridgeState {
  const existing = window.__MYIDE_RUNTIME_BRIDGE_STATE__;
  if (existing) {
    return existing;
  }

  const created: RuntimeBridgeState = {
    inspectEnabled: false,
    lastPick: null,
    paused: false,
    assetUseRecords: new Map<string, RuntimeAssetUseRecord>(),
    contextTypes: new Set<string>(),
    webglBindings: new WeakMap<WebGLRenderingContext | WebGL2RenderingContext, RuntimeTextureBindingState>(),
    textureInfo: new WeakMap<WebGLTexture, RuntimeTextureInfo>()
  };
  window.__MYIDE_RUNTIME_BRIDGE_STATE__ = created;
  return created;
}

function normalizeContextLabel(value: string | null | undefined): string {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "experimental-webgl") {
    return "webgl";
  }
  return normalized;
}

function normalizeObservedUrl(resourceUrl: string | null | undefined, baseHref?: string | null): string | null {
  if (typeof resourceUrl !== "string" || resourceUrl.trim().length === 0) {
    return null;
  }

  try {
    const normalizedBaseHref = typeof baseHref === "string" && baseHref.trim().length > 0
      ? baseHref
      : window.location.href;
    return new URL(resourceUrl, normalizedBaseHref).toString();
  } catch {
    return null;
  }
}

function safeLocationHref(targetWindow: Window): string | null {
  try {
    return typeof targetWindow.location?.href === "string" ? targetWindow.location.href : null;
  } catch {
    return null;
  }
}

function safeDocumentTitle(targetWindow: Window): string | null {
  try {
    return typeof targetWindow.document?.title === "string" ? targetWindow.document.title || null : null;
  } catch {
    return null;
  }
}

function collectInspectableWindows(maxDepth = 2, maxFramesPerWindow = 6): InspectableWindowTarget[] {
  const results: InspectableWindowTarget[] = [{
    win: window,
    label: "top",
    href: safeLocationHref(window),
    title: safeDocumentTitle(window),
    depth: 0,
    offsetX: 0,
    offsetY: 0
  }];
  const seen = new WeakSet<object>([window]);
  const queue: Array<InspectableWindowTarget> = [{
    win: window,
    label: "top",
    href: safeLocationHref(window),
    title: safeDocumentTitle(window),
    depth: 0,
    offsetX: 0,
    offsetY: 0
  }];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || current.depth >= maxDepth) {
      continue;
    }

    let frameElements: Element[] = [];
    try {
      frameElements = Array.from(current.win.document.querySelectorAll("iframe, frame")).slice(0, maxFramesPerWindow);
    } catch {
      frameElements = [];
    }

    frameElements.forEach((frameElement, index) => {
      const frameLike = frameElement as Element & { contentWindow?: Window | null };
      const childWindow = frameLike.contentWindow;
      if (!childWindow || seen.has(childWindow)) {
        return;
      }
      seen.add(childWindow);

      try {
        const href = safeLocationHref(childWindow);
        const label = `${current.label}/frame-${index + 1}`;
        const frameRect = typeof frameElement.getBoundingClientRect === "function"
          ? frameElement.getBoundingClientRect()
          : null;
        const target: InspectableWindowTarget = {
          win: childWindow,
          label,
          href,
          title: safeDocumentTitle(childWindow),
          depth: current.depth + 1,
          offsetX: current.offsetX + Math.round(frameRect?.left ?? 0),
          offsetY: current.offsetY + Math.round(frameRect?.top ?? 0)
        };
        results.push(target);
        queue.push(target);
      } catch {
        // Cross-origin frames are not inspectable from the guest preload bridge.
      }
    });
  }

  return results;
}

function getCanonicalResourceUrl(resourceUrl: string | null | undefined, baseHref?: string | null): string | null {
  const observedUrl = normalizeObservedUrl(resourceUrl, baseHref);
  if (!observedUrl) {
    return null;
  }

  try {
    const parsedUrl = new URL(observedUrl);
    const mirroredSourceUrl = parsedUrl.searchParams.get("source");
    if (
      parsedUrl.hostname === "127.0.0.1"
      && /^\/runtime\/[^/]+\/mirror$/.test(parsedUrl.pathname)
      && mirroredSourceUrl
    ) {
      return new URL(mirroredSourceUrl).toString();
    }
    return parsedUrl.toString();
  } catch {
    return null;
  }
}

function getRuntimeRelativePath(resourceUrl: string | null | undefined, baseHref?: string | null): string | null {
  const canonicalUrl = getCanonicalResourceUrl(resourceUrl, baseHref) ?? normalizeObservedUrl(resourceUrl, baseHref);
  if (!canonicalUrl) {
    return null;
  }

  try {
    const parsedUrl = new URL(canonicalUrl);
    if (parsedUrl.pathname.includes("/html/MysteryGarden/")) {
      return parsedUrl.pathname.split("/html/MysteryGarden/")[1] ?? null;
    }
    const assetMatch = parsedUrl.pathname.match(/^\/runtime\/[^/]+\/assets\/(.+)$/);
    if (assetMatch?.[1]) {
      return assetMatch[1];
    }
    return parsedUrl.pathname.replace(/^\/+/, "") || null;
  } catch {
    return null;
  }
}

function getFileType(resourceUrl: string | null | undefined, baseHref?: string | null): string | null {
  const canonicalUrl = getCanonicalResourceUrl(resourceUrl, baseHref) ?? normalizeObservedUrl(resourceUrl, baseHref);
  if (!canonicalUrl) {
    return null;
  }

  try {
    const parsedUrl = new URL(canonicalUrl);
    const extension = parsedUrl.pathname.split(".").pop()?.toLowerCase() ?? null;
    return extension && extension.length > 0 ? extension : null;
  } catch {
    return null;
  }
}

function summarizeRect(rect: DOMRect | DOMRectReadOnly | null): RuntimeRect | null {
  if (!rect) {
    return null;
  }

  return {
    x: Math.round(rect.x),
    y: Math.round(rect.y),
    width: Math.round(rect.width),
    height: Math.round(rect.height)
  };
}

function translateRect(rect: RuntimeRect | null, offsetX: number, offsetY: number): RuntimeRect | null {
  if (!rect) {
    return null;
  }

  return {
    x: rect.x + offsetX,
    y: rect.y + offsetY,
    width: rect.width,
    height: rect.height
  };
}

function getTagName(value: unknown): string | null {
  return isRecord(value) && typeof value.tagName === "string"
    ? value.tagName.toLowerCase()
    : null;
}

function isElementLike(value: unknown): value is Element {
  return Boolean(getTagName(value))
    && isRecord(value)
    && typeof value.getBoundingClientRect === "function";
}

function isCanvasLike(value: unknown): value is HTMLCanvasElement {
  return getTagName(value) === "canvas"
    && isRecord(value)
    && typeof value.getContext === "function";
}

function isRuntimeTickerLike(value: unknown): value is RuntimeTickerLike {
  return isRecord(value)
    && typeof value.stop === "function"
    && typeof value.start === "function";
}

function getImageLikeDescriptor(source: unknown, baseHref?: string | null): RuntimeTextureInfo | null {
  if (!source) {
    return null;
  }

  if (source instanceof HTMLImageElement) {
    const observedUrl = normalizeObservedUrl(source.currentSrc || source.src, baseHref);
    return {
      observedUrl,
      canonicalUrl: getCanonicalResourceUrl(observedUrl, baseHref),
      runtimeRelativePath: getRuntimeRelativePath(observedUrl, baseHref),
      fileType: getFileType(observedUrl, baseHref),
      naturalWidth: Number.isFinite(source.naturalWidth) ? Number(source.naturalWidth) : null,
      naturalHeight: Number.isFinite(source.naturalHeight) ? Number(source.naturalHeight) : null
    };
  }

  if (typeof SVGImageElement !== "undefined" && source instanceof SVGImageElement) {
    const observedUrl = normalizeObservedUrl(source.href?.baseVal ?? null, baseHref);
    return {
      observedUrl,
      canonicalUrl: getCanonicalResourceUrl(observedUrl, baseHref),
      runtimeRelativePath: getRuntimeRelativePath(observedUrl, baseHref),
      fileType: getFileType(observedUrl, baseHref),
      naturalWidth: null,
      naturalHeight: null
    };
  }

  if (source instanceof HTMLVideoElement) {
    const observedUrl = normalizeObservedUrl(source.currentSrc || source.src, baseHref);
    return {
      observedUrl,
      canonicalUrl: getCanonicalResourceUrl(observedUrl, baseHref),
      runtimeRelativePath: getRuntimeRelativePath(observedUrl, baseHref),
      fileType: getFileType(observedUrl, baseHref),
      naturalWidth: Number.isFinite(source.videoWidth) ? Number(source.videoWidth) : null,
      naturalHeight: Number.isFinite(source.videoHeight) ? Number(source.videoHeight) : null
    };
  }

  if (source instanceof HTMLCanvasElement) {
    return {
      observedUrl: null,
      canonicalUrl: null,
      runtimeRelativePath: null,
      fileType: null,
      naturalWidth: Number.isFinite(source.width) ? Number(source.width) : null,
      naturalHeight: Number.isFinite(source.height) ? Number(source.height) : null
    };
  }

  if (typeof ImageBitmap !== "undefined" && source instanceof ImageBitmap) {
    return {
      observedUrl: null,
      canonicalUrl: null,
      runtimeRelativePath: null,
      fileType: null,
      naturalWidth: Number.isFinite(source.width) ? Number(source.width) : null,
      naturalHeight: Number.isFinite(source.height) ? Number(source.height) : null
    };
  }

  if (isRecord(source) && getTagName(source) === "img" && typeof source.src === "string") {
    const observedUrl = normalizeObservedUrl(
      typeof source.currentSrc === "string" && source.currentSrc.length > 0 ? source.currentSrc : source.src,
      baseHref
    );
    return {
      observedUrl,
      canonicalUrl: getCanonicalResourceUrl(observedUrl, baseHref),
      runtimeRelativePath: getRuntimeRelativePath(observedUrl, baseHref),
      fileType: getFileType(observedUrl, baseHref),
      naturalWidth: normalizeNumber(source.naturalWidth ?? source.width),
      naturalHeight: normalizeNumber(source.naturalHeight ?? source.height)
    };
  }

  if (isRecord(source) && getTagName(source) === "video" && typeof source.src === "string") {
    const observedUrl = normalizeObservedUrl(
      typeof source.currentSrc === "string" && source.currentSrc.length > 0 ? source.currentSrc : source.src,
      baseHref
    );
    return {
      observedUrl,
      canonicalUrl: getCanonicalResourceUrl(observedUrl, baseHref),
      runtimeRelativePath: getRuntimeRelativePath(observedUrl, baseHref),
      fileType: getFileType(observedUrl, baseHref),
      naturalWidth: normalizeNumber(source.videoWidth ?? source.width),
      naturalHeight: normalizeNumber(source.videoHeight ?? source.height)
    };
  }

  if (isRecord(source) && getTagName(source) === "canvas") {
    return {
      observedUrl: null,
      canonicalUrl: null,
      runtimeRelativePath: null,
      fileType: null,
      naturalWidth: normalizeNumber(source.width),
      naturalHeight: normalizeNumber(source.height)
    };
  }

  if (isRecord(source) && typeof source.src === "string") {
    const observedUrl = normalizeObservedUrl(source.src, baseHref);
    return {
      observedUrl,
      canonicalUrl: getCanonicalResourceUrl(observedUrl, baseHref),
      runtimeRelativePath: getRuntimeRelativePath(observedUrl, baseHref),
      fileType: getFileType(observedUrl, baseHref),
      naturalWidth: normalizeNumber(source.naturalWidth ?? source.width),
      naturalHeight: normalizeNumber(source.naturalHeight ?? source.height)
    };
  }

  return null;
}

function buildAssetUseKey(info: RuntimeTextureInfo): string {
  return info.canonicalUrl
    ?? info.observedUrl
    ?? `inline:${info.naturalWidth ?? 0}x${info.naturalHeight ?? 0}`;
}

function recordAssetUse(
  state: RuntimeBridgeState,
  info: RuntimeTextureInfo,
  sourceKind: RuntimeAssetUseSourceKind,
  contextLabel: string,
  canvasRect: RuntimeRect | null = null
): RuntimeAssetUseRecord | null {
  const fileType = info.fileType?.toLowerCase() ?? null;
  if (!fileType || !staticFileTypes.has(fileType)) {
    return null;
  }

  const key = buildAssetUseKey(info);
  const existing = state.assetUseRecords.get(key);
  const next: RuntimeAssetUseRecord = existing ?? {
    key,
    observedUrl: info.observedUrl,
    canonicalUrl: info.canonicalUrl,
    runtimeRelativePath: info.runtimeRelativePath,
    fileType,
    hitCount: 0,
    lastUsedAtUtc: null,
    sourceKinds: [],
    contexts: [],
    naturalWidth: info.naturalWidth,
    naturalHeight: info.naturalHeight,
    canvasRect: null,
    lastCanvasRectTimestamp: null,
    lastUsedAtMs: null
  };

  next.hitCount += 1;
  next.lastUsedAtUtc = nowIso();
  next.lastUsedAtMs = nowMs();
  if (!next.sourceKinds.includes(sourceKind)) {
    next.sourceKinds.push(sourceKind);
  }
  if (!next.contexts.includes(contextLabel)) {
    next.contexts.push(contextLabel);
  }
  if (info.observedUrl) {
    next.observedUrl = info.observedUrl;
  }
  if (info.canonicalUrl) {
    next.canonicalUrl = info.canonicalUrl;
  }
  if (info.runtimeRelativePath) {
    next.runtimeRelativePath = info.runtimeRelativePath;
  }
  if (info.naturalWidth != null) {
    next.naturalWidth = info.naturalWidth;
  }
  if (info.naturalHeight != null) {
    next.naturalHeight = info.naturalHeight;
  }
  if (canvasRect) {
    next.canvasRect = canvasRect;
    next.lastCanvasRectTimestamp = nowMs();
  }

  state.assetUseRecords.set(key, next);
  return next;
}

function extractCssUrls(value: string | null | undefined): string[] {
  if (typeof value !== "string" || value.length === 0) {
    return [];
  }

  return Array.from(value.matchAll(/url\((['"]?)([^'")]+)\1\)/gi))
    .map((match) => normalizeObservedUrl(match[2]))
    .filter((entry): entry is string => typeof entry === "string" && entry.length > 0);
}

function recordElementAssetUse(
  state: RuntimeBridgeState,
  targetWindow: InspectableWindowTarget,
  element: Element,
  sourceKind: RuntimeAssetUseSourceKind
): void {
  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    return;
  }

  if (getTagName(element) === "img") {
    const info = getImageLikeDescriptor(element, targetWindow.href);
    if (info) {
      recordAssetUse(
        state,
        info,
        sourceKind,
        `${targetWindow.label}:dom`,
        translateRect(summarizeRect(rect), targetWindow.offsetX, targetWindow.offsetY)
      );
    }
  }

  const style = targetWindow.win.getComputedStyle(element);
  for (const url of [
    ...extractCssUrls(style.backgroundImage),
    ...extractCssUrls(style.maskImage),
    ...extractCssUrls(style.listStyleImage),
    ...extractCssUrls(style.content)
  ]) {
    recordAssetUse(
      state,
      {
        observedUrl: url,
        canonicalUrl: getCanonicalResourceUrl(url, targetWindow.href),
        runtimeRelativePath: getRuntimeRelativePath(url, targetWindow.href),
        fileType: getFileType(url, targetWindow.href),
        naturalWidth: null,
        naturalHeight: null
      },
      sourceKind,
      `${targetWindow.label}:dom`,
      translateRect(summarizeRect(rect), targetWindow.offsetX, targetWindow.offsetY)
    );
  }
}

function scanDomAssetUse(state: RuntimeBridgeState): void {
  const inspectableWindows = collectInspectableWindows();
  for (const targetWindow of inspectableWindows) {
    let elements: Element[] = [];
    try {
      elements = Array.from(targetWindow.win.document.querySelectorAll("*")).slice(0, 512);
    } catch {
      elements = [];
    }

    for (const element of elements) {
      if (!isElementLike(element)) {
        continue;
      }

      if (getTagName(element) === "img") {
        recordElementAssetUse(state, targetWindow, element, "dom-image-element");
        continue;
      }

      recordElementAssetUse(state, targetWindow, element, "dom-style-image");
    }
  }
}

function buildAssetUseEntries(state: RuntimeBridgeState): RuntimeAssetUseEntry[] {
  return Array.from(state.assetUseRecords.values())
    .sort((left, right) => {
      const rightMs = right.lastUsedAtMs ?? 0;
      const leftMs = left.lastUsedAtMs ?? 0;
      if (rightMs !== leftMs) {
        return rightMs - leftMs;
      }
      if (right.hitCount !== left.hitCount) {
        return right.hitCount - left.hitCount;
      }
      return String(left.runtimeRelativePath ?? left.canonicalUrl ?? left.observedUrl)
        .localeCompare(String(right.runtimeRelativePath ?? right.canonicalUrl ?? right.observedUrl));
    })
    .slice(0, 80)
    .map((entry) => ({
      observedUrl: entry.observedUrl,
      canonicalUrl: entry.canonicalUrl,
      runtimeRelativePath: entry.runtimeRelativePath,
      fileType: entry.fileType,
      hitCount: entry.hitCount,
      lastUsedAtUtc: entry.lastUsedAtUtc,
      sourceKinds: entry.sourceKinds.slice(),
      contexts: entry.contexts.slice(),
      naturalWidth: entry.naturalWidth,
      naturalHeight: entry.naturalHeight,
      canvasRect: entry.canvasRect ? { ...entry.canvasRect } : null
    }));
}

function pointInsideRect(point: { x: number; y: number }, rect: RuntimeRect | null | undefined): boolean {
  if (!rect) {
    return false;
  }

  return (
    point.x >= rect.x
    && point.x <= rect.x + rect.width
    && point.y >= rect.y
    && point.y <= rect.y + rect.height
  );
}

function selectTopAssetForPoint(
  state: RuntimeBridgeState,
  point: { x: number; y: number } | null
): RuntimeAssetUseEntry | null {
  const entries = buildAssetUseEntries(state);
  if (entries.length === 0) {
    return null;
  }

  if (point) {
    const directMatch = entries.find((entry) => pointInsideRect(point, entry.canvasRect));
    if (directMatch) {
      return directMatch;
    }
  }

  return entries[0] ?? null;
}

function isCanvasElement(value: unknown): value is HTMLCanvasElement {
  return value instanceof HTMLCanvasElement;
}

function getCanvasPoint(canvas: HTMLCanvasElement | null, clientX: number, clientY: number): { x: number; y: number } | null {
  if (!canvas) {
    return null;
  }

  const rect = canvas.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    return null;
  }

  const internalWidth = Number.isFinite(canvas.width) ? Number(canvas.width) : rect.width;
  const internalHeight = Number.isFinite(canvas.height) ? Number(canvas.height) : rect.height;
  return {
    x: Math.round((clientX - rect.left) * (internalWidth / rect.width)),
    y: Math.round((clientY - rect.top) * (internalHeight / rect.height))
  };
}

function applyCanvasTransform(ctx: CanvasRenderingContext2D, rect: RuntimeRect): RuntimeRect {
  if (typeof ctx.getTransform !== "function") {
    return rect;
  }

  try {
    const matrix = ctx.getTransform();
    const points = [
      new DOMPoint(rect.x, rect.y).matrixTransform(matrix),
      new DOMPoint(rect.x + rect.width, rect.y).matrixTransform(matrix),
      new DOMPoint(rect.x, rect.y + rect.height).matrixTransform(matrix),
      new DOMPoint(rect.x + rect.width, rect.y + rect.height).matrixTransform(matrix)
    ];
    const xs = points.map((point) => point.x);
    const ys = points.map((point) => point.y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const maxX = Math.max(...xs);
    const maxY = Math.max(...ys);
    return {
      x: Math.round(minX),
      y: Math.round(minY),
      width: Math.round(maxX - minX),
      height: Math.round(maxY - minY)
    };
  } catch {
    return rect;
  }
}

function installCanvasInstrumentationForWindow(
  state: RuntimeBridgeState,
  targetWindow: InspectableWindowTarget
): void {
  const runtimeWindow = targetWindow.win as typeof window;
  const anyWindow = runtimeWindow as typeof window & { __MYIDE_RUNTIME_CANVAS_PATCHED__?: boolean };
  if (anyWindow.__MYIDE_RUNTIME_CANVAS_PATCHED__) {
    return;
  }
  anyWindow.__MYIDE_RUNTIME_CANVAS_PATCHED__ = true;

  const canvasConstructor = runtimeWindow.HTMLCanvasElement;
  const canvas2dConstructor = runtimeWindow.CanvasRenderingContext2D;
  if (!canvasConstructor || !canvas2dConstructor) {
    return;
  }

  const originalGetContext = canvasConstructor.prototype.getContext;
  const patchedGetContext = function (
    this: HTMLCanvasElement,
    contextId: string,
    options?: unknown
  ): RenderingContext | null {
    const contextLabel = normalizeContextLabel(contextId);
    if (contextLabel.length > 0) {
      state.contextTypes.add(contextLabel);
    }
    return originalGetContext.call(this, contextId, options);
  };
  canvasConstructor.prototype.getContext = patchedGetContext as typeof canvasConstructor.prototype.getContext;

  const originalDrawImage = canvas2dConstructor.prototype.drawImage;
  canvas2dConstructor.prototype.drawImage = function (
    this: CanvasRenderingContext2D,
    image: CanvasImageSource,
    ...rest: number[]
  ): void {
    const info = getImageLikeDescriptor(image, targetWindow.href);
    if (info) {
      let rect: RuntimeRect | null = null;
      if (rest.length === 2) {
        rect = {
          x: Math.round(rest[0]),
          y: Math.round(rest[1]),
          width: info.naturalWidth ?? 0,
          height: info.naturalHeight ?? 0
        };
      } else if (rest.length === 4) {
        rect = {
          x: Math.round(rest[0]),
          y: Math.round(rest[1]),
          width: Math.round(rest[2]),
          height: Math.round(rest[3])
        };
      } else if (rest.length >= 8) {
        rect = {
          x: Math.round(rest[4]),
          y: Math.round(rest[5]),
          width: Math.round(rest[6]),
          height: Math.round(rest[7])
        };
      }
      recordAssetUse(
        state,
        info,
        "canvas-2d-draw",
        `${targetWindow.label}:2d`,
        rect
          ? translateRect(applyCanvasTransform(this, rect), targetWindow.offsetX, targetWindow.offsetY)
          : null
      );
    }

    Reflect.apply(originalDrawImage, this, [image, ...rest]);
  } as unknown as typeof canvas2dConstructor.prototype.drawImage;
}

function getOrCreateTextureBindingState(
  state: RuntimeBridgeState,
  context: WebGLRenderingContext | WebGL2RenderingContext,
  contextLabel: string
): RuntimeTextureBindingState {
  const existing = state.webglBindings.get(context);
  if (existing) {
    return existing;
  }

  const created: RuntimeTextureBindingState = {
    activeTextureUnit: 0,
    boundTextures: new Map<number, WebGLTexture | null>(),
    contextLabel
  };
  state.webglBindings.set(context, created);
  return created;
}

function installWebGlInstrumentationForPrototype(
  state: RuntimeBridgeState,
  targetWindow: InspectableWindowTarget,
  canvasConstructor: typeof HTMLCanvasElement,
  prototype: WebGLRenderingContext | WebGL2RenderingContext,
  contextLabel: "webgl" | "webgl2",
  patchMarker: "__MYIDE_RUNTIME_WEBGL_PATCHED__" | "__MYIDE_RUNTIME_WEBGL2_PATCHED__"
): void {
  const protoRecord = prototype as unknown as Record<string, unknown>;
  if (protoRecord[patchMarker] === true) {
    return;
  }
  protoRecord[patchMarker] = true;

  const originalGetContext = canvasConstructor.prototype.getContext;
  const patchedGetContext = function (
    this: HTMLCanvasElement,
    requestedContextId: string,
    options?: unknown
  ): RenderingContext | null {
    const context = originalGetContext.call(this, requestedContextId, options);
    const normalized = normalizeContextLabel(requestedContextId);
    if (
      context
      && (
        normalized === contextLabel
        || (contextLabel === "webgl" && normalized === "experimental-webgl")
      )
    ) {
      state.contextTypes.add(contextLabel);
      getOrCreateTextureBindingState(state, context as WebGLRenderingContext | WebGL2RenderingContext, contextLabel);
    }
    return context;
  };
  canvasConstructor.prototype.getContext = patchedGetContext as typeof canvasConstructor.prototype.getContext;

  const originalActiveTexture = prototype.activeTexture;
  prototype.activeTexture = function (this: WebGLRenderingContext | WebGL2RenderingContext, texture: GLenum): void {
    const bindingState = getOrCreateTextureBindingState(state, this, contextLabel);
    bindingState.activeTextureUnit = Number(texture) - Number(this.TEXTURE0);
    Reflect.apply(originalActiveTexture, this, [texture]);
  } as typeof prototype.activeTexture;

  const originalBindTexture = prototype.bindTexture;
  prototype.bindTexture = function (
    this: WebGLRenderingContext | WebGL2RenderingContext,
    target: GLenum,
    texture: WebGLTexture | null
  ): void {
    const bindingState = getOrCreateTextureBindingState(state, this, contextLabel);
    if (target === this.TEXTURE_2D) {
      bindingState.boundTextures.set(bindingState.activeTextureUnit, texture);
    }
    Reflect.apply(originalBindTexture, this, [target, texture]);
  } as typeof prototype.bindTexture;

  const protoMethods = prototype as unknown as Record<string, unknown>;
  const texImageHandlers = ["texImage2D", "texSubImage2D"] as const;
  for (const methodName of texImageHandlers) {
    const originalMethod = prototype[methodName] as (...args: unknown[]) => void;
    protoMethods[methodName] = function (this: WebGLRenderingContext | WebGL2RenderingContext, ...args: unknown[]): void {
      const bindingState = getOrCreateTextureBindingState(state, this, contextLabel);
      const boundTexture = bindingState.boundTextures.get(bindingState.activeTextureUnit) ?? null;
      if (boundTexture) {
        const sourceArgument = args.find((value) => getImageLikeDescriptor(value) !== null);
        const info = getImageLikeDescriptor(sourceArgument, targetWindow.href);
        if (info) {
          state.textureInfo.set(boundTexture, info);
          recordAssetUse(state, info, "webgl-texture-upload", `${targetWindow.label}:${contextLabel}`, null);
        }
      }

      Reflect.apply(originalMethod, this, args);
    } as unknown as typeof originalMethod;
  }

  const drawHandlers = ["drawArrays", "drawElements"] as const;
  for (const methodName of drawHandlers) {
    const originalMethod = prototype[methodName] as (...args: unknown[]) => void;
    protoMethods[methodName] = function (this: WebGLRenderingContext | WebGL2RenderingContext, ...args: unknown[]): void {
      const bindingState = getOrCreateTextureBindingState(state, this, contextLabel);
      for (const texture of bindingState.boundTextures.values()) {
        if (!texture) {
          continue;
        }
        const info = state.textureInfo.get(texture);
        if (info) {
          recordAssetUse(state, info, "webgl-draw", `${targetWindow.label}:${contextLabel}`, null);
        }
      }

      Reflect.apply(originalMethod, this, args);
    } as unknown as typeof originalMethod;
  }
}

function installWebGlInstrumentationForWindow(
  state: RuntimeBridgeState,
  targetWindow: InspectableWindowTarget
): void {
  const runtimeWindow = targetWindow.win as typeof window;
  const canvasConstructor = runtimeWindow.HTMLCanvasElement;
  if (!canvasConstructor) {
    return;
  }

  if (typeof runtimeWindow.WebGLRenderingContext !== "undefined") {
    installWebGlInstrumentationForPrototype(
      state,
      targetWindow,
      canvasConstructor,
      runtimeWindow.WebGLRenderingContext.prototype,
      "webgl",
      "__MYIDE_RUNTIME_WEBGL_PATCHED__"
    );
  }

  if (typeof runtimeWindow.WebGL2RenderingContext !== "undefined") {
    installWebGlInstrumentationForPrototype(
      state,
      targetWindow,
      canvasConstructor,
      runtimeWindow.WebGL2RenderingContext.prototype,
      "webgl2",
      "__MYIDE_RUNTIME_WEBGL2_PATCHED__"
    );
  }
}

function installInspectableWindowInstrumentation(state: RuntimeBridgeState): void {
  for (const targetWindow of collectInspectableWindows()) {
    installCanvasInstrumentationForWindow(state, targetWindow);
    installWebGlInstrumentationForWindow(state, targetWindow);
  }
}

function safeWindowValue(targetWindow: Window, key: string): unknown {
  try {
    return (targetWindow as unknown as Record<string, unknown>)[key];
  } catch {
    return undefined;
  }
}

function summarizeTexture(texture: unknown): RuntimeTextureSummary | null {
  if (!isRecord(texture)) {
    return null;
  }

  const baseTexture = isRecord(texture.baseTexture) ? texture.baseTexture : null;
  const resource = baseTexture && isRecord(baseTexture.resource) ? baseTexture.resource : null;
  const frame = isRecord(texture.frame) ? texture.frame : null;
  const cacheIds = Array.isArray(texture.textureCacheIds) ? texture.textureCacheIds : [];
  const resourceUrl = typeof resource?.url === "string"
    ? resource.url
    : typeof baseTexture?.imageUrl === "string"
      ? baseTexture.imageUrl
      : null;

  return {
    cacheId: typeof cacheIds[0] === "string" ? cacheIds[0] : null,
    resourceUrl: resourceUrl ? getCanonicalResourceUrl(resourceUrl) ?? resourceUrl : null,
    frame: frame
      ? {
          x: normalizeNumber(frame.x) ?? 0,
          y: normalizeNumber(frame.y) ?? 0,
          width: normalizeNumber(frame.width) ?? 0,
          height: normalizeNumber(frame.height) ?? 0
        }
      : null
  };
}

function summarizeDisplayObject(displayObject: unknown): RuntimeDisplayObjectSummary | null {
  if (!isRecord(displayObject)) {
    return null;
  }

  return {
    id: typeof displayObject.id === "string" ? displayObject.id : null,
    name: typeof displayObject.name === "string" ? displayObject.name : null,
    label: typeof displayObject.label === "string" ? displayObject.label : null,
    constructorName: displayObject.constructor && isRecord(displayObject.constructor) && typeof displayObject.constructor.name === "string"
      ? displayObject.constructor.name
      : null,
    zIndex: typeof displayObject.zIndex === "number" && Number.isFinite(displayObject.zIndex)
      ? Number(displayObject.zIndex)
      : null,
    texture: summarizeTexture(displayObject.texture)
  };
}

function isRuntimeCandidateObject(value: unknown): value is RuntimeCandidateObject {
  return isRecord(value)
    && isRecord(value.stage)
    && isRecord(value.renderer);
}

function collectRuntimeCandidates(): Array<{
  key: string;
  object: RuntimeCandidateObject;
  summary: RuntimeCandidateSummary;
  windowTarget: InspectableWindowTarget;
}> {
  const results: Array<{
    key: string;
    object: RuntimeCandidateObject;
    summary: RuntimeCandidateSummary;
    windowTarget: InspectableWindowTarget;
  }> = [];
  const visited = new WeakSet<object>();
  const queue: Array<{ key: string; value: unknown; depth: number; windowTarget: InspectableWindowTarget }> =
    collectInspectableWindows()
      .flatMap((targetWindow) => Object.getOwnPropertyNames(targetWindow.win)
        .slice(0, 256)
        .map((key) => ({
          key: `${targetWindow.label}.${key}`,
          value: safeWindowValue(targetWindow.win, key),
          depth: 0,
          windowTarget: targetWindow
        })));

  while (queue.length > 0 && results.length < 12) {
    const current = queue.shift();
    if (!current || !isRecord(current.value)) {
      continue;
    }
    if (visited.has(current.value)) {
      continue;
    }
    visited.add(current.value);

    if (isRuntimeCandidateObject(current.value)) {
      const renderer = isRecord(current.value.renderer) ? current.value.renderer : null;
      const view = renderer && isCanvasElement(renderer.view) ? renderer.view : null;
      const childCount = Array.isArray((current.value.stage as Record<string, unknown>).children)
        ? ((current.value.stage as Record<string, unknown>).children as unknown[]).length
        : null;
      results.push({
        key: current.key,
        object: current.value,
        windowTarget: current.windowTarget,
        summary: {
          key: current.key,
          childCount,
          viewWidth: view ? normalizeNumber(view.width) : null,
          viewHeight: view ? normalizeNumber(view.height) : null
        }
      });
      continue;
    }

    if (current.depth >= 2) {
      continue;
    }

    for (const childKey of Object.getOwnPropertyNames(current.value).slice(0, 24)) {
      let childValue: unknown;
      try {
        childValue = (current.value as Record<string, unknown>)[childKey];
      } catch {
        childValue = undefined;
      }
      if (!isRecord(childValue) || visited.has(childValue)) {
        continue;
      }
      queue.push({
        key: `${current.key}.${childKey}`,
        value: childValue,
        depth: current.depth + 1,
        windowTarget: current.windowTarget
      });
    }
  }

  results.sort((left, right) => (right.summary.childCount ?? 0) - (left.summary.childCount ?? 0));
  return results.slice(0, 8);
}

function getTickerTarget(): { label: string; ticker: RuntimeTickerLike } | null {
  const candidates = collectRuntimeCandidates();
  for (const candidate of candidates) {
    const ticker = candidate.object.ticker;
    if (ticker && typeof ticker.stop === "function" && typeof ticker.start === "function") {
      return {
        label: candidate.summary.key,
        ticker
      };
    }
  }

  for (const targetWindow of collectInspectableWindows()) {
    const pixi = safeWindowValue(targetWindow.win, "PIXI");
    const sharedTicker = isRecord(pixi) && isRecord(pixi.Ticker) ? pixi.Ticker.shared : null;
    if (isRuntimeTickerLike(sharedTicker)) {
      return {
        label: `${targetWindow.label}.PIXI.Ticker.shared`,
        ticker: sharedTicker
      };
    }
  }

  return null;
}

function buildSupport(): RuntimeControlSupport {
  const tickerTarget = getTickerTarget();
  const pauseResumeBlocked = tickerTarget ? null : "No exposed Pixi ticker or application handle is available in the live donor runtime.";
  const stepBlocked = tickerTarget && typeof tickerTarget.ticker.update === "function"
    ? null
    : "No stable ticker update hook is exposed for single-step runtime control.";
  return {
    pause: Boolean(tickerTarget),
    resume: Boolean(tickerTarget),
    step: Boolean(tickerTarget && typeof tickerTarget.ticker.update === "function"),
    blockers: {
      pause: pauseResumeBlocked,
      resume: pauseResumeBlocked,
      step: stepBlocked
    }
  };
}

function summarizeLoadedResources(): RuntimeResourceEntry[] {
  const entries: RuntimeResourceEntry[] = [];

  for (const targetWindow of collectInspectableWindows()) {
    try {
      const resourceEntries = targetWindow.win.performance.getEntriesByType("resource");
      for (const entry of resourceEntries) {
        const resourceEntry = entry as PerformanceResourceTiming;
        const url = typeof resourceEntry.name === "string" ? resourceEntry.name : null;
        if (!url) {
          continue;
        }
        entries.push({
          url,
          canonicalUrl: getCanonicalResourceUrl(url, targetWindow.href),
          observedUrl: url,
          initiatorType: typeof resourceEntry.initiatorType === "string" ? resourceEntry.initiatorType : null,
          filename: url.split("?")[0].split("/").pop() ?? null,
          windowLabel: targetWindow.label
        });
      }
    } catch {
      // Cross-frame resource reads are best-effort only.
    }
  }

  return entries
    .filter((entry) => Boolean(entry.url))
    .slice(0, 120);
}

function collectDisplayHits(
  displayObject: RuntimeCandidateObject["stage"],
  point: { x: number; y: number },
  hits: RuntimeDisplayHitSummary[],
  depth: number
): void {
  if (!isRecord(displayObject) || hits.length >= 12 || depth > 40) {
    return;
  }

  const children = Array.isArray(displayObject.children) ? displayObject.children : [];
  for (let index = children.length - 1; index >= 0; index -= 1) {
    collectDisplayHits(children[index] as RuntimeCandidateObject["stage"], point, hits, depth + 1);
  }

  if (displayObject.visible === false || typeof displayObject.getBounds !== "function") {
    return;
  }

  try {
    const boundsValue = displayObject.getBounds();
    if (!isRecord(boundsValue)) {
      return;
    }
    const bounds: RuntimeRect = {
      x: normalizeNumber(boundsValue.x) ?? 0,
      y: normalizeNumber(boundsValue.y) ?? 0,
      width: normalizeNumber(boundsValue.width) ?? 0,
      height: normalizeNumber(boundsValue.height) ?? 0
    };
    if (
      point.x >= bounds.x
      && point.x <= bounds.x + bounds.width
      && point.y >= bounds.y
      && point.y <= bounds.y + bounds.height
    ) {
      hits.push({
        ...(summarizeDisplayObject(displayObject) ?? {
          id: null,
          name: null,
          label: null,
          constructorName: null,
          zIndex: null,
          texture: null
        }),
        bounds
      });
    }
  } catch {
    // Bounds checks are best-effort only.
  }
}

function getEngineKind(
  state: RuntimeBridgeState,
  candidateApps: ReturnType<typeof collectRuntimeCandidates>,
  inspectableWindows: InspectableWindowTarget[],
  totalCanvasCount: number
): { kind: string; note: string; pixiVersion: string | null } {
  const contextTypes = Array.from(state.contextTypes.values()).sort();
  for (const targetWindow of inspectableWindows) {
    const pixi = safeWindowValue(targetWindow.win, "PIXI");
    if (isRecord(pixi) && typeof pixi.VERSION === "string") {
      return {
        kind: "pixi-global",
        note: `${targetWindow.label} exposes window.PIXI with version ${pixi.VERSION}.`,
        pixiVersion: pixi.VERSION
      };
    }
  }
  if (window.PIXI && typeof window.PIXI.VERSION === "string") {
    return {
      kind: "pixi-global",
      note: `window.PIXI is exposed with version ${window.PIXI.VERSION}.`,
      pixiVersion: window.PIXI.VERSION
    };
  }
  if (candidateApps.length > 0) {
    return {
      kind: "pixi-handle-scan",
      note: `A stage/renderer candidate is exposed through ${candidateApps[0].summary.key}.`,
      pixiVersion: null
    };
  }
  if (contextTypes.some((entry) => entry.startsWith("webgl"))) {
    return {
      kind: "bundled-webgl-runtime",
      note: "The donor runtime requested a WebGL context, but no stable global app handle is exposed.",
      pixiVersion: null
    };
  }
  if (contextTypes.includes("2d")) {
    return {
      kind: "canvas-2d-runtime",
      note: "The donor runtime requested a 2D canvas context, but no stable global app handle is exposed.",
      pixiVersion: null
    };
  }
  if (totalCanvasCount > 0) {
    return {
      kind: "canvas-runtime-in-accessible-frame",
      note: `The donor runtime exposes ${totalCanvasCount} canvas surface${totalCanvasCount === 1 ? "" : "s"} across ${Math.max(1, inspectableWindows.length)} accessible window context${inspectableWindows.length === 1 ? "" : "s"}, but no stable app handle is exposed.`,
      pixiVersion: null
    };
  }
  return {
    kind: "dom-only-or-hidden-runtime",
    note: "No stable canvas/WebGL runtime handle has been exposed yet.",
    pixiVersion: null
  };
}

function buildStatus(state: RuntimeBridgeState): RuntimeBridgeStatus {
  const candidateApps = collectRuntimeCandidates();
  const inspectableWindows = collectInspectableWindows();
  const totalCanvasCount = inspectableWindows.reduce((count, targetWindow) => {
    try {
      return count + targetWindow.win.document.querySelectorAll("canvas").length;
    } catch {
      return count;
    }
  }, 0);
  const engine = getEngineKind(state, candidateApps, inspectableWindows, totalCanvasCount);
  return {
    href: window.location.href,
    title: document.title || null,
    bridgeSource: "guest-preload",
    bridgeVersion: "runtime-inspector-preload-v1",
    frameCount: Math.max(0, inspectableWindows.length - 1),
    accessibleFrameCount: Math.max(0, inspectableWindows.length - 1),
    canvasCount: totalCanvasCount,
    pixiDetected: engine.kind === "pixi-global" || candidateApps.length > 0,
    pixiVersion: engine.pixiVersion,
    candidateApps: candidateApps.map((candidate) => candidate.summary),
    inspectEnabled: state.inspectEnabled,
    paused: state.paused,
    support: buildSupport(),
    resourceEntries: summarizeLoadedResources(),
    assetUseEntries: buildAssetUseEntries(state),
    contextTypes: Array.from(state.contextTypes.values()).sort(),
    engineKind: engine.kind,
    engineNote: engine.note
  };
}

function setInspectEnabled(state: RuntimeBridgeState, flag: boolean): { enabled: boolean } {
  state.inspectEnabled = Boolean(flag);
  emit("inspect", { enabled: state.inspectEnabled });
  return { enabled: state.inspectEnabled };
}

function pause(state: RuntimeBridgeState): { ok: boolean; blocked?: string | null; label?: string } {
  const target = getTickerTarget();
  if (!target) {
    return { ok: false, blocked: buildSupport().blockers.pause };
  }

  try {
    target.ticker.stop();
    state.paused = true;
    emit("control", { action: "pause", ok: true, label: target.label });
    return { ok: true, label: target.label };
  } catch (error) {
    return {
      ok: false,
      blocked: error instanceof Error ? error.message : String(error)
    };
  }
}

function resume(state: RuntimeBridgeState): { ok: boolean; blocked?: string | null; label?: string } {
  const target = getTickerTarget();
  if (!target) {
    return { ok: false, blocked: buildSupport().blockers.resume };
  }

  try {
    target.ticker.start();
    state.paused = false;
    emit("control", { action: "resume", ok: true, label: target.label });
    return { ok: true, label: target.label };
  } catch (error) {
    return {
      ok: false,
      blocked: error instanceof Error ? error.message : String(error)
    };
  }
}

function step(state: RuntimeBridgeState): { ok: boolean; blocked?: string | null; label?: string } {
  const target = getTickerTarget();
  if (!target || typeof target.ticker.update !== "function") {
    return { ok: false, blocked: buildSupport().blockers.step };
  }

  try {
    target.ticker.update(performance.now());
    emit("control", { action: "step", ok: true, label: target.label });
    return { ok: true, label: target.label };
  } catch (error) {
    return {
      ok: false,
      blocked: error instanceof Error ? error.message : String(error)
    };
  }
}

function pickAtPoint(state: RuntimeBridgeState, clientX: number, clientY: number): RuntimeBridgePickPayload {
  const inspectableWindows = collectInspectableWindows()
    .sort((left, right) => right.depth - left.depth);
  const pickedWindowTarget = inspectableWindows.find((targetWindow) => {
    if (targetWindow.label === "top") {
      return true;
    }

    try {
      const localX = clientX - targetWindow.offsetX;
      const localY = clientY - targetWindow.offsetY;
      return (
        localX >= 0
        && localY >= 0
        && localX <= targetWindow.win.innerWidth
        && localY <= targetWindow.win.innerHeight
      );
    } catch {
      return false;
    }
  }) ?? inspectableWindows[inspectableWindows.length - 1] ?? {
    win: window,
    label: "top",
    href: safeLocationHref(window),
    title: safeDocumentTitle(window),
    depth: 0,
    offsetX: 0,
    offsetY: 0
  };
  const localClientX = Math.round(clientX - pickedWindowTarget.offsetX);
  const localClientY = Math.round(clientY - pickedWindowTarget.offsetY);
  let target: Element | null = null;
  try {
    target = pickedWindowTarget.win.document.elementFromPoint(localClientX, localClientY);
  } catch {
    target = null;
  }
  if (!target && pickedWindowTarget.label !== "top") {
    target = document.elementFromPoint(clientX, clientY);
  }
  const canvasElement = target && typeof (target as Element).closest === "function"
    ? ((target as Element).closest("canvas") as HTMLCanvasElement | null)
    : null;
  const canvas = canvasElement ?? (isCanvasLike(target) ? target : null);
  const canvasPoint = getCanvasPoint(canvas, localClientX, localClientY);
  const candidates = collectRuntimeCandidates();
  const displayHits: RuntimeDisplayHitSummary[] = [];
  const candidateForWindow = candidates.find((candidate) => candidate.windowTarget.label === pickedWindowTarget.label)
    ?? candidates[0]
    ?? null;

  if (canvasPoint && candidateForWindow) {
    collectDisplayHits(candidateForWindow.object.stage, canvasPoint, displayHits, 0);
  }

  const topRuntimeAsset = selectTopAssetForPoint(state, { x: clientX, y: clientY });
  const status = buildStatus(state);
  const payload: RuntimeBridgePickPayload = {
    ...status,
    clientX: Math.round(clientX),
    clientY: Math.round(clientY),
    targetTag: target && "tagName" in target && typeof target.tagName === "string"
      ? target.tagName.toLowerCase()
      : null,
    targetId: target instanceof HTMLElement && typeof target.id === "string" && target.id.length > 0 ? target.id : null,
    targetClassName: target instanceof HTMLElement && typeof target.className === "string" ? target.className : null,
    canvasDetected: Boolean(canvas),
    canvasPoint,
    canvasSize: canvas ? {
      width: normalizeNumber(canvas.width),
      height: normalizeNumber(canvas.height)
    } : null,
    topDisplayObject: displayHits[0] ?? null,
    displayHitCount: displayHits.length,
    topRuntimeAsset
  };

  state.lastPick = payload;
  emit("pick", payload as unknown as Record<string, unknown>);
  return payload;
}

function installInspectPointerListener(state: RuntimeBridgeState): void {
  const anyWindow = window as typeof window & { __MYIDE_RUNTIME_POINTER_LISTENER__?: boolean };
  if (anyWindow.__MYIDE_RUNTIME_POINTER_LISTENER__) {
    return;
  }
  anyWindow.__MYIDE_RUNTIME_POINTER_LISTENER__ = true;

  window.addEventListener("pointerdown", (event) => {
    if (!state.inspectEnabled) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    pickAtPoint(state, event.clientX, event.clientY);
  }, true);
}

function installDomAssetScanner(state: RuntimeBridgeState): void {
  const anyWindow = window as typeof window & {
    __MYIDE_RUNTIME_DOM_SCAN__?: number;
    __MYIDE_RUNTIME_DOM_MUTATION__?: MutationObserver;
    __MYIDE_RUNTIME_DOM_OBSERVER_READY__?: boolean;
  };
  if (typeof anyWindow.__MYIDE_RUNTIME_DOM_SCAN__ === "number") {
    return;
  }

  const runScan = () => {
    try {
      installInspectableWindowInstrumentation(state);
      scanDomAssetUse(state);
    } catch {
      // DOM asset scans are best-effort only.
    }
  };

  runScan();
  window.addEventListener("load", runScan, { once: true });
  anyWindow.__MYIDE_RUNTIME_DOM_SCAN__ = window.setInterval(runScan, 750);

  const attachObserver = () => {
    if (anyWindow.__MYIDE_RUNTIME_DOM_OBSERVER_READY__) {
      return;
    }

    const root = document.documentElement;
    if (!(root instanceof HTMLElement)) {
      return;
    }

    const observer = new MutationObserver(() => runScan());
    observer.observe(root, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["class", "style", "src"]
    });
    anyWindow.__MYIDE_RUNTIME_DOM_MUTATION__ = observer;
    anyWindow.__MYIDE_RUNTIME_DOM_OBSERVER_READY__ = true;
  };

  attachObserver();
  if (!anyWindow.__MYIDE_RUNTIME_DOM_OBSERVER_READY__) {
    window.addEventListener("DOMContentLoaded", attachObserver, { once: true });
  }
}

function installBridge(): RuntimeGuestBridge {
  const state = getBridgeState();
  installInspectableWindowInstrumentation(state);
  installInspectPointerListener(state);
  installDomAssetScanner(state);

  const bridge: RuntimeGuestBridge = {
    getStatus: () => buildStatus(state),
    setInspectEnabled: (flag) => setInspectEnabled(state, flag),
    pickAtPoint: (clientX, clientY) => pickAtPoint(state, clientX, clientY),
    pause: () => pause(state),
    resume: () => resume(state),
    step: () => step(state)
  };

  return bridge;
}

try {
  const bridge = installBridge();
  contextBridge.exposeInMainWorld("__MYIDE_RUNTIME_BRIDGE__", bridge);
  window.__MYIDE_RUNTIME_BRIDGE__ = bridge;
  emit("ready", bridge.getStatus() as unknown as Record<string, unknown>);
} catch (error) {
  emit("error", {
    stage: "preload-install",
    error: error instanceof Error ? error.message : String(error)
  });
}
