export const PROPERTY_PANEL_ADAPTER_BOUNDARY = "myide.ui.property-panel.v1";

export type PropertyStatus = "proven" | "assumption" | "todo";
export type PropertyValue = string | number | boolean | null | readonly string[];

export interface PropertyRow {
  readonly key: string;
  readonly label: string;
  readonly value: PropertyValue;
  readonly status: PropertyStatus;
  readonly evidenceRefs?: readonly string[];
  readonly notes?: string;
}

export interface PropertyGroup {
  readonly groupId: string;
  readonly title: string;
  readonly rows: readonly PropertyRow[];
}

export interface PropertyPanelInput {
  readonly subjectId: string;
  readonly subjectKind: "project" | "scene" | "state" | "asset" | "fixture" | "runtime";
  readonly title: string;
  readonly subtitle?: string;
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
  readonly evidenceRefs: readonly string[];
  readonly groups: readonly PropertyGroup[];
  readonly facts: readonly string[];
  readonly assumptions: readonly string[];
  readonly unresolved: readonly string[];
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

function normalizeGroups(groups: readonly PropertyGroup[] | undefined): readonly PropertyGroup[] {
  if (!groups) {
    return [];
  }

  return groups.map((group) => ({
    ...group,
    rows: group.rows.filter((row) => row.key.length > 0)
  }));
}

export class LocalPropertyPanelAdapter implements PropertyPanelAdapter {
  toViewModel(input: PropertyPanelInput): PropertyPanelViewModel {
    return {
      panelId: input.subjectId,
      title: input.title,
      subtitle: input.subtitle,
      subjectKind: input.subjectKind,
      evidenceRefs: normalizeStrings(input.evidenceRefs),
      groups: normalizeGroups(input.groups),
      facts: normalizeStrings(input.facts),
      assumptions: normalizeStrings(input.assumptions),
      unresolved: normalizeStrings(input.unresolved)
    };
  }
}

export function buildPropertyPanelViewModel(input: PropertyPanelInput): PropertyPanelViewModel {
  return new LocalPropertyPanelAdapter().toViewModel(input);
}
