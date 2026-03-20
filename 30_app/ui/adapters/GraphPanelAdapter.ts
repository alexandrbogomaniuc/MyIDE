export const GRAPH_PANEL_ADAPTER_BOUNDARY = "myide.ui.graph-panel.v1";

export type GraphNodeKind = "state" | "trigger" | "asset" | "scene" | "note";
export type GraphEdgeKind = "transition" | "reference" | "contains" | "supports";

export interface GraphNode {
  readonly nodeId: string;
  readonly label: string;
  readonly kind: GraphNodeKind;
  readonly status?: "proven" | "assumption" | "todo";
  readonly evidenceRefs?: readonly string[];
  readonly notes?: string;
}

export interface GraphEdge {
  readonly edgeId: string;
  readonly from: string;
  readonly to: string;
  readonly kind: GraphEdgeKind;
  readonly label?: string;
  readonly evidenceRefs?: readonly string[];
}

export interface GraphPanelInput {
  readonly graphId: string;
  readonly title: string;
  readonly subtitle?: string;
  readonly nodes: readonly GraphNode[];
  readonly edges: readonly GraphEdge[];
  readonly notes?: readonly string[];
}

export interface GraphPanelViewModel {
  readonly graphId: string;
  readonly title: string;
  readonly subtitle?: string;
  readonly nodes: readonly GraphNode[];
  readonly edges: readonly GraphEdge[];
  readonly notes: readonly string[];
}

export interface GraphPanelAdapter {
  toViewModel(input: GraphPanelInput): GraphPanelViewModel;
}

function normalizeStrings(items: readonly string[] | undefined): readonly string[] {
  if (!items) {
    return [];
  }

  return items.filter((item) => item.trim().length > 0);
}

export class LocalGraphPanelAdapter implements GraphPanelAdapter {
  toViewModel(input: GraphPanelInput): GraphPanelViewModel {
    return {
      graphId: input.graphId,
      title: input.title,
      subtitle: input.subtitle,
      nodes: input.nodes.filter((node) => node.nodeId.length > 0),
      edges: input.edges.filter((edge) => edge.edgeId.length > 0),
      notes: normalizeStrings(input.notes)
    };
  }
}

export function buildGraphPanelViewModel(input: GraphPanelInput): GraphPanelViewModel {
  return new LocalGraphPanelAdapter().toViewModel(input);
}
