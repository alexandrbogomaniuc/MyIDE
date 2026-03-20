# UI Adapters

## Purpose
- Holds local MyIDE UI contracts and adapter boundaries.
- Keeps third-party UI libraries behind stable local interfaces.

## Contents
- `adapters/PropertyPanelAdapter.ts`
- `adapters/GraphPanelAdapter.ts`
- `mock/MockPropertyPanel.ts`
- `mock/MockGraphPanel.ts`
- `spikes/README.md`
- `spikes/pcui/README.md`
- `spikes/pcui/index.html`
- `spikes/pcui/spike.mjs`

## Rules
- Core replay logic must not import vendor UI code directly.
- The adapter contracts are the source of truth.
- Mock implementations stay useful even if the PCUI spike is delayed or rejected.
- Only `30_app/ui/spikes/` may import experimental third-party UI packages directly.
- Any future property-panel or graph-panel package integration must adapt into the local view-model contracts first.
