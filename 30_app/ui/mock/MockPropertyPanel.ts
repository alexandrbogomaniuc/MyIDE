import { buildPropertyPanelViewModel, type PropertyPanelViewModel } from "../adapters/PropertyPanelAdapter";

export function createMockPropertyPanel(): PropertyPanelViewModel {
  return buildPropertyPanelViewModel({
    subjectId: "project_001",
    subjectKind: "project",
    title: "project_001",
    subtitle: "Mystery Garden replay slice",
    evidenceRefs: [
      "MG-EV-20260320-WEB-A-001",
      "MG-EV-20260320-WEB-A-005",
      "MG-EV-20260320-WEB-A-007",
      "MG-EV-20260320-LIVE-A-002",
      "MG-EV-20260320-LIVE-A-006"
    ],
    facts: [
      "Preview runtime loads internal project JSON only.",
      "Donor raw files remain read-only evidence.",
      "Live runtime observation now confirms a visible 5x3 board.",
      "Vendor property panel implementations must consume the local adapter view model only."
    ],
    assumptions: [
      "The visible board is imported as 5x3 from visible runtime evidence while the API layout fields remain unresolved."
    ],
    unresolved: [
      "Exact spin timing and live restart recovery are still unproven."
    ],
    groups: [
      {
        groupId: "group.summary",
        title: "Summary",
        rows: [
          {
            key: "mode",
            label: "Mode",
            value: "slot-only / single-user / desktop-web-ui",
            status: "proven",
            evidenceRefs: ["MG-EV-20260320-WEB-A-001"]
          },
          {
            key: "replay-state",
            label: "Replay State",
            value: "idle -> spin -> win -> free spins trigger -> free spins active",
            status: "proven",
            evidenceRefs: ["MG-EV-20260320-WEB-A-005", "MG-EV-20260320-WEB-A-006", "MG-EV-20260320-WEB-A-007", "MG-EV-20260320-LIVE-A-002", "MG-EV-20260320-LIVE-A-003"]
          }
        ]
      }
    ]
  });
}

export const mockPropertyPanel = createMockPropertyPanel();
