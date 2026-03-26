import { promises as fs } from "node:fs";
import path from "node:path";

type JsonValue = null | boolean | number | string | JsonObject | JsonValue[];
type JsonObject = { [key: string]: JsonValue | undefined };

export interface EditableSceneDocument {
  schemaVersion: "0.1.0";
  sceneId: string;
  displayName: string;
  kind: string;
  layerIds: string[];
  objectIds: string[];
  viewport?: {
    width: number;
    height: number;
  };
  notes?: string;
}

export interface EditableLayer {
  id: string;
  displayName: string;
  visible: boolean;
  locked: boolean;
  order: number;
  notes?: string;
}

export interface EditableObject {
  id: string;
  displayName: string;
  type: string;
  layerId: string;
  parentId?: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  scaleX: number;
  scaleY: number;
  visible: boolean;
  locked: boolean;
  assetRef?: string;
  placeholderRef?: string;
  donorAsset?: EditableDonorAssetLink;
  notes?: string;
}

export interface EditableDonorAssetLink {
  assetId: string;
  evidenceId: string;
  captureSessionId: string;
  donorId: string;
  donorName: string;
  title: string;
  filename: string;
  fileType: string;
  sourceCategory: string;
  repoRelativePath: string;
  width?: number | null;
  height?: number | null;
}

export interface EditableLayerCollection {
  schemaVersion: "0.1.0";
  sceneId: string;
  layers: EditableLayer[];
}

export interface EditableObjectCollection {
  schemaVersion: "0.1.0";
  sceneId: string;
  objects: EditableObject[];
}

export interface EditableProjectData {
  scene: EditableSceneDocument;
  layers: EditableLayer[];
  objects: EditableObject[];
  paths: {
    scenePath: string;
    layersPath: string;
    objectsPath: string;
    replayProjectPath: string;
    snapshotRoot: string;
    historyPath: string;
  };
}

export interface EditablePreviewLayer extends EditableLayer {
  objectIds: string[];
}

export interface EditablePreviewScene {
  bridgeVersion: "editable-scene-direct-v1";
  source: "editable-internal";
  scene: EditableSceneDocument;
  layers: EditablePreviewLayer[];
  objects: EditableObject[];
}

export interface SaveEditableProjectResult {
  savedAt: string;
  snapshotDir?: string;
  historyPath?: string;
  replayProjectPath?: string;
  syncBridge?: string;
}

export interface SyncReplayProjectResult {
  replayProjectPath: string;
  sceneId: string;
  layerCount: number;
  objectCount: number;
  bridgeVersion: "editable-to-project.v1";
}

function isJsonObject(value: unknown): value is JsonObject {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function assertJsonObject(value: unknown, label: string): asserts value is JsonObject {
  if (!isJsonObject(value)) {
    throw new Error(`${label} must be a JSON object.`);
  }
}

async function readJsonObject(filePath: string): Promise<JsonObject> {
  const raw = await fs.readFile(filePath, "utf8");
  const parsed: unknown = JSON.parse(raw);
  assertJsonObject(parsed, filePath);
  return parsed;
}

function stringifyJson(value: JsonValue): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function toInternalRoot(projectRoot: string): string {
  return path.join(projectRoot, "internal");
}

export function getEditableProjectPaths(projectRoot: string): EditableProjectData["paths"] {
  const internalRoot = toInternalRoot(projectRoot);
  return {
    scenePath: path.join(internalRoot, "scene.json"),
    layersPath: path.join(internalRoot, "layers.json"),
    objectsPath: path.join(internalRoot, "objects.json"),
    replayProjectPath: path.join(projectRoot, "project.json"),
    snapshotRoot: path.join(projectRoot, "logs", "editor-snapshots"),
    historyPath: path.join(projectRoot, "logs", "editor-save-history.jsonl")
  };
}

export async function loadEditableProjectData(projectRoot: string): Promise<EditableProjectData | null> {
  const paths = getEditableProjectPaths(projectRoot);

  try {
    await Promise.all([
      fs.access(paths.scenePath),
      fs.access(paths.layersPath),
      fs.access(paths.objectsPath)
    ]);
  } catch {
    return null;
  }

  const [sceneRaw, layersRaw, objectsRaw] = await Promise.all([
    readJsonObject(paths.scenePath),
    readJsonObject(paths.layersPath),
    readJsonObject(paths.objectsPath)
  ]);

  const scene = sceneRaw as unknown as EditableSceneDocument;
  const layersDocument = layersRaw as unknown as EditableLayerCollection;
  const objectsDocument = objectsRaw as unknown as EditableObjectCollection;

  return {
    scene,
    layers: Array.isArray(layersDocument.layers) ? layersDocument.layers : [],
    objects: Array.isArray(objectsDocument.objects) ? objectsDocument.objects : [],
    paths
  };
}

export function buildPreviewSceneFromEditableProject(data: EditableProjectData): EditablePreviewScene {
  const layers = data.layers
    .slice()
    .sort((left, right) => left.order - right.order || left.displayName.localeCompare(right.displayName));
  const objectOrder = new Map(data.objects.map((object, index) => [object.id, index]));
  const objects = data.objects
    .slice()
    .sort((left, right) => {
      const leftLayer = layers.findIndex((layer) => layer.id === left.layerId);
      const rightLayer = layers.findIndex((layer) => layer.id === right.layerId);
      const layerDiff = leftLayer - rightLayer;
      if (layerDiff !== 0) {
        return layerDiff;
      }

      return (objectOrder.get(left.id) ?? 0) - (objectOrder.get(right.id) ?? 0);
    });

  const layersWithObjects: EditablePreviewLayer[] = layers.map((layer) => ({
    ...layer,
    objectIds: objects.filter((object) => object.layerId === layer.id).map((object) => object.id)
  }));

  return {
    bridgeVersion: "editable-scene-direct-v1",
    source: "editable-internal",
    scene: {
      ...data.scene,
      layerIds: layersWithObjects.map((layer) => layer.id),
      objectIds: objects.map((object) => object.id)
    },
    layers: layersWithObjects,
    objects
  };
}

type LegacySceneRole = "background" | "midground" | "foreground" | "ui" | "fx" | "debug";

interface LegacyScenePosition {
  x: number;
  y: number;
  width?: number;
  height?: number;
  scaleX?: number;
  scaleY?: number;
}

interface LegacySceneNode {
  nodeId: string;
  name: string;
  type: "sprite" | "text" | "container" | "shape" | "video" | "particle" | "hotspot" | "webview";
  assetRef?: string;
  position: LegacyScenePosition;
  visible: boolean;
  children?: string[];
  bindings?: string[];
  tags?: string[];
  extensions?: JsonObject;
}

interface LegacySceneLayer {
  layerId: string;
  name: string;
  role: LegacySceneRole;
  nodes: LegacySceneNode[];
}

function toLegacySceneRole(layer: EditableLayer, index: number): LegacySceneRole {
  const key = `${layer.id} ${layer.displayName}`.toLowerCase();

  if (key.includes("background")) {
    return "background";
  }

  if (key.includes("overlay")) {
    return "fx";
  }

  if (key.includes("ui")) {
    return "ui";
  }

  if (key.includes("gameplay") || key.includes("play") || key.includes("board")) {
    return "foreground";
  }

  if (index === 0) {
    return "background";
  }

  if (index === 1) {
    return "foreground";
  }

  return index === 2 ? "ui" : "fx";
}

function toLegacyNodeType(type: string): LegacySceneNode["type"] {
  if (type === "image") {
    return "sprite";
  }

  if (type === "group") {
    return "container";
  }

  return (["sprite", "text", "container", "shape", "video", "particle", "hotspot", "webview"].includes(type)
    ? type
    : "shape") as LegacySceneNode["type"];
}

function toLegacyNodePosition(object: EditableObject): LegacyScenePosition {
  const position: LegacyScenePosition = {
    x: object.x,
    y: object.y
  };

  if (Number.isFinite(object.width)) {
    position.width = object.width;
  }

  if (Number.isFinite(object.height)) {
    position.height = object.height;
  }

  if (Number.isFinite(object.scaleX)) {
    position.scaleX = object.scaleX;
  }

  if (Number.isFinite(object.scaleY)) {
    position.scaleY = object.scaleY;
  }

  return position;
}

export function buildReplayProjectFromEditableProject(baseProject: JsonObject, data: EditableProjectData): JsonObject {
  const project = JSON.parse(JSON.stringify(baseProject)) as JsonObject;
  const layers = data.layers
    .slice()
    .sort((left, right) => left.order - right.order || left.displayName.localeCompare(right.displayName));
  const objects = data.objects.slice();
  const objectIndex = new Map(objects.map((object, index) => [object.id, index]));
  const nodeById = new Map<string, LegacySceneNode>();
  const childrenByParent = new Map<string, string[]>();

  for (const object of objects) {
    const assetRef = object.assetRef ?? object.placeholderRef;
    const node: LegacySceneNode = {
      nodeId: object.id,
      name: object.displayName,
      type: toLegacyNodeType(object.type),
      position: toLegacyNodePosition(object),
      visible: object.visible,
      extensions: {
        editorBridgeVersion: "editable-scene-direct-v1",
        editorObjectId: object.id,
        editorLayerId: object.layerId,
        editorObjectType: object.type
      }
    };

    if (assetRef) {
      node.assetRef = assetRef;
    }

    const donorEvidenceRefs = object.donorAsset?.evidenceId
      ? [object.donorAsset.evidenceId]
      : [];

    if (object.notes) {
      node.extensions = {
        ...node.extensions,
        notes: object.notes
      };
    }

    if (object.donorAsset) {
      node.extensions = {
        ...node.extensions,
        donorAsset: {
          ...object.donorAsset
        },
        evidenceRefs: donorEvidenceRefs
      };
    }

    if (object.parentId) {
      const parentChildren = childrenByParent.get(object.parentId) ?? [];
      parentChildren.push(object.id);
      childrenByParent.set(object.parentId, parentChildren);
      node.extensions = {
        ...node.extensions,
        parentId: object.parentId
      };
    }

    nodeById.set(object.id, node);
  }

  const legacyLayers: LegacySceneLayer[] = layers.map((layer, index) => ({
    layerId: layer.id,
    name: layer.displayName,
    role: toLegacySceneRole(layer, index),
    nodes: objects
      .filter((object) => object.layerId === layer.id)
      .sort((left, right) => (objectIndex.get(left.id) ?? 0) - (objectIndex.get(right.id) ?? 0))
      .map((object) => {
        const node = nodeById.get(object.id);
        if (!node) {
          return null;
        }

        const children = childrenByParent.get(object.id);
        return {
          ...node,
          ...(children && children.length > 0 ? { children: children.slice() } : {})
        };
      })
      .filter((node): node is LegacySceneNode => Boolean(node))
  }));

  const sceneDraft: JsonObject & {
    sceneId: string;
    name: string;
    kind: string;
    layers: JsonValue;
    extensions: JsonObject;
    viewport?: {
      width: number;
      height: number;
    };
  } = {
    sceneId: data.scene.sceneId,
    name: data.scene.displayName,
    kind: data.scene.kind,
    layers: legacyLayers as unknown as JsonValue,
    extensions: {
      editorBridgeVersion: "editable-scene-direct-v1",
      source: "editable-internal"
    }
  };

  if (data.scene.viewport) {
    sceneDraft.viewport = {
      width: data.scene.viewport.width,
      height: data.scene.viewport.height
    };
  }

  const scene = sceneDraft as unknown as JsonObject;

  return {
    ...project,
    scenes: [scene as unknown as JsonValue]
  } as JsonObject;
}

async function snapshotIfPresent(filePath: string, destinationDir: string): Promise<void> {
  try {
    await fs.access(filePath);
  } catch {
    return;
  }

  await fs.mkdir(destinationDir, { recursive: true });
  await fs.copyFile(filePath, path.join(destinationDir, path.basename(filePath)));
}

async function writeAtomicJson(filePath: string, value: JsonValue): Promise<void> {
  const tempPath = `${filePath}.${new Date().toISOString().replace(/[:.]/g, "-")}-${process.pid}.tmp`;
  await fs.writeFile(tempPath, stringifyJson(value), "utf8");
  await fs.rename(tempPath, filePath);
}

async function appendHistoryEntry(filePath: string, entry: JsonObject): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.appendFile(filePath, `${JSON.stringify(entry)}\n`, "utf8");
}

export async function syncReplayProjectFromEditableSource(
  projectRoot: string,
  editableDataOverride?: EditableProjectData
): Promise<SyncReplayProjectResult> {
  const editableData = editableDataOverride ?? await loadEditableProjectData(projectRoot);
  if (!editableData) {
    throw new Error(`Editable internal scene files are missing for sync: ${projectRoot}`);
  }

  const paths = getEditableProjectPaths(projectRoot);
  let replayTemplate: JsonObject = {};

  try {
    replayTemplate = await readJsonObject(paths.replayProjectPath);
  } catch {
    replayTemplate = {};
  }

  const replayProject = buildReplayProjectFromEditableProject(replayTemplate, editableData);
  await writeAtomicJson(paths.replayProjectPath, replayProject as unknown as JsonValue);

  return {
    replayProjectPath: paths.replayProjectPath,
    sceneId: editableData.scene.sceneId,
    layerCount: editableData.layers.length,
    objectCount: editableData.objects.length,
    bridgeVersion: "editable-to-project.v1"
  };
}

export async function saveEditableProjectData(projectRoot: string, data: EditableProjectData): Promise<SaveEditableProjectResult> {
  const paths = getEditableProjectPaths(projectRoot);
  const savedAt = new Date().toISOString();
  const snapshotDir = path.join(paths.snapshotRoot, savedAt.replace(/[:.]/g, "-"));

  await Promise.all([
    snapshotIfPresent(paths.scenePath, snapshotDir),
    snapshotIfPresent(paths.layersPath, snapshotDir),
    snapshotIfPresent(paths.objectsPath, snapshotDir),
    snapshotIfPresent(paths.replayProjectPath, snapshotDir)
  ]);

  const syncedScene: EditableSceneDocument = {
    ...data.scene,
    layerIds: data.layers
      .slice()
      .sort((left, right) => left.order - right.order)
      .map((layer) => layer.id),
    objectIds: data.objects.map((object) => object.id)
  };
  const layerDocument: EditableLayerCollection = {
    schemaVersion: "0.1.0",
    sceneId: syncedScene.sceneId,
    layers: data.layers
  };
  const objectDocument: EditableObjectCollection = {
    schemaVersion: "0.1.0",
    sceneId: syncedScene.sceneId,
    objects: data.objects
  };
  const syncedEditableData: EditableProjectData = {
    ...data,
    scene: syncedScene,
    paths
  };

  await fs.mkdir(path.dirname(paths.scenePath), { recursive: true });
  await Promise.all([
    writeAtomicJson(paths.scenePath, syncedScene as unknown as JsonValue),
    writeAtomicJson(paths.layersPath, layerDocument as unknown as JsonValue),
    writeAtomicJson(paths.objectsPath, objectDocument as unknown as JsonValue)
  ]);

  const syncResult = await syncReplayProjectFromEditableSource(projectRoot, syncedEditableData);

  await appendHistoryEntry(paths.historyPath, {
    savedAt,
    projectRoot,
    sceneId: syncedScene.sceneId,
    snapshotDir,
    files: {
      scenePath: paths.scenePath,
      layersPath: paths.layersPath,
      objectsPath: paths.objectsPath,
      replayProjectPath: paths.replayProjectPath
    },
    counts: {
      layers: data.layers.length,
      objects: data.objects.length
    },
    sync: {
      bridgeVersion: syncResult.bridgeVersion,
      replayProjectPath: syncResult.replayProjectPath
    }
  });

  return {
    savedAt,
    snapshotDir,
    historyPath: paths.historyPath,
    replayProjectPath: syncResult.replayProjectPath,
    syncBridge: syncResult.bridgeVersion
  };
}

export function cloneEditableProjectData(data: EditableProjectData): EditableProjectData {
  return JSON.parse(JSON.stringify(data)) as EditableProjectData;
}
