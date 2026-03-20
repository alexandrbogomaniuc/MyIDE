import { buildGraphPanelViewModel, type GraphPanelViewModel } from "../adapters/GraphPanelAdapter";

export function createMockGraphPanel(): GraphPanelViewModel {
  return buildGraphPanelViewModel({
    graphId: "graph.project_001.states",
    title: "Mystery Garden State Flow",
    subtitle: "Local reuse target for future PCUI-Graph adoption",
    nodes: [
      {
        nodeId: "state.idle",
        label: "Idle",
        kind: "state",
        status: "proven",
        evidenceRefs: ["MG-EV-20260320-WEB-A-004", "MG-EV-20260320-LIVE-A-002"]
      },
      {
        nodeId: "state.spin",
        label: "Spin",
        kind: "state",
        status: "proven",
        evidenceRefs: ["MG-EV-20260320-LIVE-A-002", "MG-EV-20260320-LIVE-A-003", "MG-EV-20260320-LIVE-A-006"]
      },
      {
        nodeId: "state.base-win",
        label: "Base Win",
        kind: "state",
        status: "proven",
        evidenceRefs: ["MG-EV-20260320-WEB-A-006"]
      },
      {
        nodeId: "state.free-spins-trigger",
        label: "Free Spins Trigger",
        kind: "trigger",
        status: "proven",
        evidenceRefs: ["MG-EV-20260320-WEB-A-007"]
      },
      {
        nodeId: "state.free-spins-active",
        label: "Free Spins Active",
        kind: "state",
        status: "proven",
        evidenceRefs: ["MG-EV-20260320-WEB-A-005"]
      },
      {
        nodeId: "state.restore.free-spins-active",
        label: "Restart Restore",
        kind: "note",
        status: "todo"
      }
    ],
    edges: [
      {
        edgeId: "edge.idle.spin",
        from: "state.idle",
        to: "state.spin",
        kind: "transition",
        label: "spin.requested"
      },
      {
        edgeId: "edge.spin.base-win",
        from: "state.spin",
        to: "state.base-win",
        kind: "transition",
        label: "spin.resolved.baseWin"
      },
      {
        edgeId: "edge.spin.free-spins-trigger",
        from: "state.spin",
        to: "state.free-spins-trigger",
        kind: "transition",
        label: "spin.resolved.freeSpinsTrigger"
      },
      {
        edgeId: "edge.trigger.active",
        from: "state.free-spins-trigger",
        to: "state.free-spins-active",
        kind: "transition",
        label: "bonus.start"
      },
      {
        edgeId: "edge.restore.active",
        from: "state.restore.free-spins-active",
        to: "state.free-spins-active",
        kind: "transition",
        label: "restart.restore"
      }
    ],
    notes: [
      "Graph model is adapter-only and does not render the actual UI yet.",
      "This mock stays isolated from the replay shell.",
      "Any future PCUI-Graph spike must consume this local graph view model instead of replacing it."
    ]
  });
}

export const mockGraphPanel = createMockGraphPanel();
