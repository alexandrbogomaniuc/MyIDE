# UI Adapters

## Purpose
- Holds local MyIDE UI contracts and adapter boundaries.
- Keeps third-party UI libraries behind stable local interfaces.
- Defines the shell-facing view models for local-first property inspection and graph review.

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

## Shell Contract
- `PropertyPanelAdapter` is the local-first inspector boundary for editing basic object properties.
- Property rows may be read-only or editable, and editable rows carry a `fieldKind`, a `fieldState`, and an optional object `path`.
- The shell can rely on the adapter to normalize evidence refs, strip empty rows, and preserve simple metadata for rendering inputs, selects, booleans, and multiline text.
- The current shell inspector now builds its selected-object view model through the local property-panel adapter before rendering HTML controls.
- `GraphPanelAdapter` stays review-oriented for now and reports normalized node/edge counts instead of binding core logic to a graph UI package.
- PCUI is an optional experiment, not a required runtime dependency for the current phase.
