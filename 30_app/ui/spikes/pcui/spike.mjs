import "../../../../node_modules/@playcanvas/pcui/styles/dist/index.mjs";
import { Label, LabelGroup, Panel, TextInput } from "../../../../node_modules/@playcanvas/pcui/dist/module/src/index.mjs";

const viewModel = {
  panelId: "project_001",
  title: "project_001",
  subtitle: "Mystery Garden replay slice",
  subjectKind: "project",
  evidenceRefs: ["MG-EV-20260320-WEB-A-001", "MG-EV-20260320-WEB-A-005", "MG-EV-20260320-LIVE-A-002", "MG-EV-20260320-LIVE-A-006"],
  facts: [
    "Preview runtime loads internal project JSON only.",
    "Donor raw files remain read-only evidence.",
    "Live runtime observation now confirms a visible 5x3 board."
  ],
  assumptions: [
    "The visible board is imported as 5x3 from visible runtime evidence while API layout fields remain unresolved."
  ],
  unresolved: [
    "Exact spin timing is still unproven.",
    "Live restart recovery remains uncaptured."
  ],
  groups: [
    {
      groupId: "group.summary",
      title: "Summary",
      rows: [
        { label: "Mode", value: "slot-only / single-user / desktop-web-ui" },
        { label: "Replay States", value: "idle -> spin -> win -> free spins trigger -> free spins active" },
        { label: "Evidence Count", value: "14 indexed items across WEB + LIVE capture sessions" }
      ]
    },
    {
      groupId: "group.runtime",
      title: "Live Runtime Proof",
      rows: [
        { label: "Visible Board", value: "5x3 in entered live runtime" },
        { label: "Live Currency", value: "FUN" },
        { label: "Buy Bonus", value: "18.00 FUN on entered idle screen" }
      ]
    }
  ]
};

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function createReadOnlyField(value, key) {
  const input = new TextInput({ value, readOnly: true, renderChanges: false });
  input.class.add("pcui-not-flexible");
  const nativeInput = input.dom.querySelector("input");
  if (nativeInput) {
    nativeInput.name = key;
    nativeInput.id = key;
  }
  return input;
}

function addSection(panel, title, rows) {
  const heading = new Label({ text: title, dom: "h3" });
  heading.dom.style.margin = "18px 6px 8px";
  heading.dom.style.color = "#f4fff5";
  panel.content.dom.appendChild(heading.dom);

  rows.forEach((row) => {
    const fieldKey = `${slugify(title)}-${slugify(row.label)}`;
    const group = new LabelGroup({
      text: row.label,
      field: createReadOnlyField(row.value, fieldKey),
      labelAlignTop: false
    });
    panel.content.dom.appendChild(group.dom);
  });
}

function addList(panel, title, items) {
  const heading = new Label({ text: title, dom: "h3" });
  heading.dom.style.margin = "18px 6px 8px";
  heading.dom.style.color = "#f4fff5";
  panel.content.dom.appendChild(heading.dom);

  const block = document.createElement("div");
  block.style.margin = "0 6px 10px";
  block.style.padding = "12px 14px";
  block.style.borderRadius = "10px";
  block.style.background = "rgba(255, 255, 255, 0.04)";
  block.innerHTML = `<ul style="margin:0; padding-left:18px;">${items.map((item) => `<li style="margin:0 0 6px;">${item}</li>`).join("")}</ul>`;
  panel.content.dom.appendChild(block);
}

function render() {
  const root = document.getElementById("pcui-root");
  if (!root) {
    return;
  }

  const panel = new Panel({ headerText: `${viewModel.title} (${viewModel.subjectKind})` });
  panel.dom.style.maxWidth = "880px";
  panel.dom.style.margin = "0 auto";

  const subtitle = new Label({ text: viewModel.subtitle, dom: "p" });
  subtitle.dom.style.margin = "10px 6px 2px";
  subtitle.dom.style.color = "#cde4d2";
  panel.content.dom.appendChild(subtitle.dom);

  addSection(panel, "Summary", viewModel.groups[0].rows);
  addSection(panel, "Live Runtime Proof", viewModel.groups[1].rows);
  addList(panel, "Facts", viewModel.facts);
  addList(panel, "Assumptions", viewModel.assumptions);
  addList(panel, "Unresolved", viewModel.unresolved);
  addSection(panel, "Evidence", [{ label: "Evidence Refs", value: viewModel.evidenceRefs.join(", ") }]);

  root.appendChild(panel.dom);
}

render();
