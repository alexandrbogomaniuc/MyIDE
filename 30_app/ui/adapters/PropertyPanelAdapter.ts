import type { SessionEditHistorySummary } from "../helpers/SessionEditHistory";

export const PROPERTY_PANEL_ADAPTER_BOUNDARY = "myide.ui.property-panel.v1";

export type PropertyStatus = "proven" | "assumption" | "todo";
export type PropertyFieldKind = "text" | "multiline" | "number" | "boolean" | "select" | "json";
export type PropertyFieldState = "read-only" | "editable" | "locked";
export type PropertyValue = string | number | boolean | null | readonly string[];

export interface PropertyFieldOption {
  readonly label: string;
  readonly value: string | number | boolean;
  readonly description?: string;
}

export interface PropertyRow {
  readonly key: string;
  readonly label: string;
  readonly value: PropertyValue;
  readonly status: PropertyStatus;
  readonly fieldKind?: PropertyFieldKind;
  readonly fieldState?: PropertyFieldState;
  readonly path?: readonly string[];
  readonly placeholder?: string;
  readonly options?: readonly PropertyFieldOption[];
  readonly evidenceRefs?: readonly string[];
  readonly notes?: string;
}

export interface PropertyGroup {
  readonly groupId: string;
  readonly title: string;
  readonly description?: string;
  readonly rows: readonly PropertyRow[];
}

export type PropertyPanelMode = "inspect" | "edit";

export interface PropertyPanelInput {
  readonly subjectId: string;
  readonly subjectKind: "project" | "scene" | "object" | "state" | "asset" | "fixture" | "runtime";
  readonly title: string;
  readonly subtitle?: string;
  readonly mode?: PropertyPanelMode;
  readonly history?: SessionEditHistorySummary;
  readonly evidenceRefs?: readonly string[];
  readonly facts?: readonly string[];
  readonly assumptions?: readonly string[];
  readonly unresolved?: readonly string[];
  readonly groups?: readonly PropertyGroup[];
}

export interface PropertyPanelViewModel {
  readonly panelId: string;
  readonly title: string;
  readonly subtitle?: string;
  readonly subjectKind: PropertyPanelInput["subjectKind"];
  readonly mode: PropertyPanelMode;
  readonly history?: SessionEditHistorySummary;
  readonly evidenceRefs: readonly string[];
  readonly groups: readonly PropertyGroup[];
  readonly facts: readonly string[];
  readonly assumptions: readonly string[];
  readonly unresolved: readonly string[];
  readonly editableRowCount: number;
  readonly readOnlyRowCount: number;
}

export interface PropertyPanelAdapter {
  toViewModel(input: PropertyPanelInput): PropertyPanelViewModel;
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
        .filter((row) => row.key.trim().length > 0)
        .map((row) => ({
          ...row,
          path: normalizePath(row.path),
          options: normalizeOptions(row.options)
        }))
    }))
    .filter((group) => group.rows.length > 0);
}

export class LocalPropertyPanelAdapter implements PropertyPanelAdapter {
  toViewModel(input: PropertyPanelInput): PropertyPanelViewModel {
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
}

export function buildPropertyPanelViewModel(input: PropertyPanelInput): PropertyPanelViewModel {
  return new LocalPropertyPanelAdapter().toViewModel(input);
}
