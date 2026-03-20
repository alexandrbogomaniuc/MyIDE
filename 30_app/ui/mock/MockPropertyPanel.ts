import { buildPropertyPanelViewModel, type PropertyPanelViewModel } from "../adapters/PropertyPanelAdapter";

export function createMockPropertyPanel(): PropertyPanelViewModel {
  return buildPropertyPanelViewModel({
    subjectId: "project_001",
    subjectKind: "project",
    title: "project_001",
    subtitle: "Mystery Garden replay slice",
    mode: "edit",
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
        groupId: "group.core-metadata",
        title: "Core Metadata",
        description: "Local-first editable properties that the shell can map to a project object.",
        rows: [
          {
            key: "displayName",
            label: "Display Name",
            value: "Mystery Garden",
            status: "proven",
            fieldKind: "text",
            fieldState: "editable",
            path: ["displayName"],
            placeholder: "Human-friendly project name"
          },
          {
            key: "slug",
            label: "Slug",
            value: "project_001_mystery_garden",
            status: "proven",
            fieldKind: "text",
            fieldState: "editable",
            path: ["slug"],
            placeholder: "stable-project-slug"
          },
          {
            key: "gameFamily",
            label: "Game Family",
            value: "slot",
            status: "proven",
            fieldKind: "select",
            fieldState: "editable",
            path: ["gameFamily"],
            options: [
              { label: "Slot", value: "slot" },
              { label: "Planned", value: "planned" }
            ]
          },
          {
            key: "donorReference",
            label: "Donor Reference",
            value: "donor_001_mystery_garden",
            status: "proven",
            fieldKind: "text",
            fieldState: "editable",
            path: ["donor", "reference"],
            placeholder: "donor_###_slug"
          },
          {
            key: "targetGame",
            label: "Target / Resulting Game",
            value: "Mystery Garden",
            status: "proven",
            fieldKind: "text",
            fieldState: "editable",
            path: ["targetGame", "displayName"],
            placeholder: "target game display name"
          },
          {
            key: "notes",
            label: "Notes",
            value: "Inspector boundary stays local-first; vendor UI stays behind adapters.",
            status: "assumption",
            fieldKind: "multiline",
            fieldState: "editable",
            path: ["notes"],
            placeholder: "Project notes, assumptions, and next steps"
          }
        ]
      },
      {
        groupId: "group.summary",
        title: "Summary",
        description: "High-signal project facts and replay scope notes.",
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
      },
      {
        groupId: "group.provenance",
        title: "Provenance",
        description: "Evidence references are kept attached to read-only history rows.",
        rows: [
          {
            key: "source",
            label: "Source",
            value: "public donor evidence + live capture notes",
            status: "proven",
            fieldState: "read-only",
            path: ["source"]
          },
          {
            key: "replay-runtime",
            label: "Replay Runtime",
            value: "internal project data only",
            status: "proven",
            fieldState: "read-only",
            path: ["runtime", "replay"]
          }
        ]
      }
    ]
  });
}

export const mockPropertyPanel = createMockPropertyPanel();
