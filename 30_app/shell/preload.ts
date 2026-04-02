import { contextBridge, ipcRenderer } from "electron";
import type { ProjectSliceBundle } from "./projectSlice";
import type { ShellCreateProjectInput, ShellCreateProjectResult } from "../workspace/createProject";
import type { EditableProjectData, SaveEditableProjectResult } from "../workspace/editableProject";
import type { PropertyPanelInput, PropertyPanelViewModel, PropertyGroup, PropertyRow, PropertyFieldOption } from "../ui/adapters/PropertyPanelAdapter";
import type { SessionEditHistorySummary } from "../ui/helpers/SessionEditHistory";

interface BridgeHealthSnapshot {
  preloadPath: string;
  preloadExists: boolean;
  preloadExecuted: boolean;
  bridgeExposed: boolean;
  rendererReady: boolean;
  lastRendererReadyAt: string | null;
  lastPingAt: string | null;
  lastProjectLoadAt: string | null;
  lastProjectLoadRequestedProjectId: string | null;
  lastSelectedProjectId: string | null;
  lastProjectLoadError: string | null;
  workspaceProjectCount: number;
}

function normalizeStrings(items: readonly string[] | undefined): readonly string[] {
  if (!items) {
    return [];
  }

  return items.filter((item) => item.trim().length > 0);
}

function normalizePath(path: readonly string[] | undefined): readonly string[] | undefined {
  if (!path) {
    return undefined;
  }

  const normalized = path.map((segment) => segment.trim()).filter((segment) => segment.length > 0);
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeOptions(options: readonly PropertyFieldOption[] | undefined): readonly PropertyFieldOption[] | undefined {
  if (!options) {
    return undefined;
  }

  const normalized = options.filter((option) => option.label.trim().length > 0);
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeHistory(history: SessionEditHistorySummary | undefined): SessionEditHistorySummary | undefined {
  if (!history) {
    return undefined;
  }

  return {
    dirty: Boolean(history.dirty),
    canUndo: Boolean(history.canUndo),
    canRedo: Boolean(history.canRedo),
    undoDepth: Math.max(0, Math.floor(history.undoDepth)),
    redoDepth: Math.max(0, Math.floor(history.redoDepth)),
    maxEntries: Math.max(1, Math.floor(history.maxEntries))
  };
}

function normalizeGroups(groups: readonly PropertyGroup[] | undefined): readonly PropertyGroup[] {
  if (!groups) {
    return [];
  }

  return groups
    .map((group) => ({
      ...group,
      rows: group.rows
        .filter((row: PropertyRow) => row.key.trim().length > 0)
        .map((row: PropertyRow) => ({
          ...row,
          path: normalizePath(row.path),
          options: normalizeOptions(row.options)
        }))
    }))
    .filter((group) => group.rows.length > 0);
}

function buildPropertyPanelViewModel(input: PropertyPanelInput): PropertyPanelViewModel {
  const groups = normalizeGroups(input.groups);
  const rows = groups.flatMap((group) => group.rows);
  const editableRowCount = rows.filter((row) => row.fieldState === "editable").length;
  const readOnlyRowCount = rows.length - editableRowCount;

  return {
    panelId: input.subjectId,
    title: input.title,
    subtitle: input.subtitle,
    subjectKind: input.subjectKind,
    mode: input.mode ?? "inspect",
    history: normalizeHistory(input.history),
    evidenceRefs: normalizeStrings(input.evidenceRefs),
    groups,
    facts: normalizeStrings(input.facts),
    assumptions: normalizeStrings(input.assumptions),
    unresolved: normalizeStrings(input.unresolved),
    editableRowCount,
    readOnlyRowCount
  };
}

ipcRenderer.send("myide:preload-ready");

contextBridge.exposeInMainWorld("myideApi", {
  ping: (): Promise<{ ok: true; stamp: string; preloadPath: string }> => ipcRenderer.invoke("myide:ping"),
  bridgeHealth: (): Promise<BridgeHealthSnapshot> => ipcRenderer.invoke("myide:bridge-health"),
  reportRendererReady: (): Promise<BridgeHealthSnapshot> => ipcRenderer.invoke("myide:renderer-ready"),
  reportBridgeSmokeResult: (payload: unknown): void => {
    ipcRenderer.send("myide:bridge-smoke-result", payload);
  },
  reportLivePersistSmokeResult: (payload: unknown): void => {
    ipcRenderer.send("myide:live-persist-smoke-result", payload);
  },
  reportLiveDragSmokeResult: (payload: unknown): void => {
    ipcRenderer.send("myide:live-drag-smoke-result", payload);
  },
  reportLiveCreateDragSmokeResult: (payload: unknown): void => {
    ipcRenderer.send("myide:live-create-drag-smoke-result", payload);
  },
  reportLiveDonorImportSmokeResult: (payload: unknown): void => {
    ipcRenderer.send("myide:live-donor-import-smoke-result", payload);
  },
  reportLiveRuntimeSmokeResult: (payload: unknown): void => {
    ipcRenderer.send("myide:live-runtime-smoke-result", payload);
  },
  reportLiveRuntimeSmokeProgress: (payload: unknown): void => {
    ipcRenderer.send("myide:live-runtime-smoke-progress", payload);
  },
  reportLiveDuplicateDeleteSmokeResult: (payload: unknown): void => {
    ipcRenderer.send("myide:live-duplicate-delete-smoke-result", payload);
  },
  reportLiveReorderSmokeResult: (payload: unknown): void => {
    ipcRenderer.send("myide:live-reorder-smoke-result", payload);
  },
  reportLiveLayerReassignSmokeResult: (payload: unknown): void => {
    ipcRenderer.send("myide:live-layer-reassign-smoke-result", payload);
  },
  reportLiveResizeSmokeResult: (payload: unknown): void => {
    ipcRenderer.send("myide:live-resize-smoke-result", payload);
  },
  reportLiveAlignSmokeResult: (payload: unknown): void => {
    ipcRenderer.send("myide:live-align-smoke-result", payload);
  },
  reportLiveUndoRedoSmokeResult: (payload: unknown): void => {
    ipcRenderer.send("myide:live-undo-redo-smoke-result", payload);
  },
  loadProjectSlice: (selectedProjectId?: string): Promise<ProjectSliceBundle> => ipcRenderer.invoke("myide:load-project-slice", selectedProjectId),
  createProject: (input: ShellCreateProjectInput): Promise<ShellCreateProjectResult> => ipcRenderer.invoke("myide:create-project", input),
  getRuntimeResourceMap: (projectId: string): Promise<unknown> => ipcRenderer.invoke("myide:get-runtime-resource-map", projectId),
  saveRuntimePageProof: (projectId: string, proof: Record<string, unknown>): Promise<unknown> => ipcRenderer.invoke("myide:save-runtime-page-proof", projectId, proof),
  resetRuntimeResourceMap: (projectId: string): Promise<unknown> => ipcRenderer.invoke("myide:reset-runtime-resource-map", projectId),
  setRuntimeRequestStage: (stage: string): Promise<unknown> => ipcRenderer.invoke("myide:set-runtime-request-stage", stage),
  clearRuntimeCache: (): Promise<unknown> => ipcRenderer.invoke("myide:clear-runtime-cache"),
  openRuntimeDebugHost: (options?: Record<string, unknown>): Promise<unknown> => ipcRenderer.invoke("myide:open-runtime-debug-host", options ?? null),
  runDonorScanCapture: (donorId: string, limit?: number, family?: string, mode?: string): Promise<unknown> => ipcRenderer.invoke("myide:run-donor-scan-capture", donorId, limit, family, mode),
  runDonorScanFamilyAction: (donorId: string, family: string, limit?: number): Promise<unknown> => ipcRenderer.invoke("myide:run-donor-scan-family-action", donorId, family, limit),
  runDonorScenarioProfile: (donorId: string, profileId: string, minutes?: number, donorName?: string): Promise<unknown> => ipcRenderer.invoke("myide:run-donor-scan-scenario", donorId, profileId, minutes, donorName),
  runDonorPromotionQueue: (donorId: string, donorName?: string): Promise<unknown> => ipcRenderer.invoke("myide:run-donor-scan-promotion", donorId, donorName),
  prepareProjectModificationHandoff: (projectId: string): Promise<unknown> => ipcRenderer.invoke("myide:prepare-project-modification-handoff", projectId),
  runDonorScanSectionAction: (donorId: string, sectionKey: string): Promise<unknown> => ipcRenderer.invoke("myide:run-donor-scan-section-action", donorId, sectionKey),
  getRuntimeOverrideStatus: (projectId: string): Promise<unknown> => ipcRenderer.invoke("myide:get-runtime-override-status", projectId),
  createRuntimeOverride: (projectId: string, runtimeSourceUrl: string, donorAssetId: string): Promise<unknown> => ipcRenderer.invoke("myide:create-runtime-override", projectId, runtimeSourceUrl, donorAssetId),
  clearRuntimeOverride: (projectId: string, runtimeSourceUrl: string): Promise<unknown> => ipcRenderer.invoke("myide:clear-runtime-override", projectId, runtimeSourceUrl),
  saveProjectEditor: (projectId: string, data: EditableProjectData): Promise<SaveEditableProjectResult> => ipcRenderer.invoke("myide:save-project-editor", projectId, data),
  buildPropertyPanelViewModel: (input: PropertyPanelInput): PropertyPanelViewModel => buildPropertyPanelViewModel(input)
});
