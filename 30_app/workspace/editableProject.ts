import { promises as fs } from "node:fs";
import path from "node:path";

type JsonValue = null | boolean | number | string | JsonObject | JsonValue[];
type JsonObject = { [key: string]: JsonValue };

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
  notes?: string;
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
    snapshotRoot: string;
    historyPath: string;
  };
}

export interface SaveEditableProjectResult {
  savedAt: string;
  snapshotDir?: string;
  historyPath?: string;
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

export async function saveEditableProjectData(projectRoot: string, data: EditableProjectData): Promise<SaveEditableProjectResult> {
  const paths = getEditableProjectPaths(projectRoot);
  const savedAt = new Date().toISOString();
  const snapshotDir = path.join(paths.snapshotRoot, savedAt.replace(/[:.]/g, "-"));

  await Promise.all([
    snapshotIfPresent(paths.scenePath, snapshotDir),
    snapshotIfPresent(paths.layersPath, snapshotDir),
    snapshotIfPresent(paths.objectsPath, snapshotDir)
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

  await fs.mkdir(path.dirname(paths.scenePath), { recursive: true });
  await Promise.all([
    writeAtomicJson(paths.scenePath, syncedScene as unknown as JsonValue),
    writeAtomicJson(paths.layersPath, layerDocument as unknown as JsonValue),
    writeAtomicJson(paths.objectsPath, objectDocument as unknown as JsonValue)
  ]);

  await appendHistoryEntry(paths.historyPath, {
    savedAt,
    projectRoot,
    sceneId: syncedScene.sceneId,
    snapshotDir,
    files: {
      scenePath: paths.scenePath,
      layersPath: paths.layersPath,
      objectsPath: paths.objectsPath
    },
    counts: {
      layers: data.layers.length,
      objects: data.objects.length
    }
  });

  return {
    savedAt,
    snapshotDir,
    historyPath: paths.historyPath
  };
}

export function cloneEditableProjectData(data: EditableProjectData): EditableProjectData {
  return JSON.parse(JSON.stringify(data)) as EditableProjectData;
}
