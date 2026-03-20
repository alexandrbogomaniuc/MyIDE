# UI Reuse Strategy

## Strategy
MyIDE will reuse open-source UI building blocks only behind local adapter interfaces. The adapters own the semantic contract, while the external library only owns rendering details.

## Adapter Layers
- `PropertyPanelAdapter` converts project, scene, state, and evidence data into a stable property-panel view model.
- `GraphPanelAdapter` converts state/trigger relationships into a stable graph view model.
- `MockPropertyPanel` and `MockGraphPanel` provide no-dependency reference implementations for testing and screenshots.

## Why This Shape
- The replay pipeline must remain independent of UI libraries.
- The future editor and graph UI may change, but the data contracts should not.
- Property-panel and graph UI are the two places where reuse is likely to save the most time.

## Approved Reuse Directions
- `PCUI` for property panels, inspector stacks, and form-like tool surfaces.
- `PCUI-Graph` for future node/trigger graph surfaces.
- `GDevelop` for interaction patterns only, especially workspace separation and scene/logic organization.

## Non-Goals For This Phase
- No whole-editor embedding.
- No full graph editor.
- No scene editor rewrite.
- No binding core replay logic to a vendor-specific component tree.

## Replacement Strategy
- Adapters stay stable.
- Renderers are swappable.
- Mock implementations remain available even if a library spike fails or is delayed.

## PHASE 3 Status
- `PropertyPanelAdapter` remains the local semantic boundary.
- `MockPropertyPanel` remains the no-dependency reference implementation.
- `30_app/ui/spikes/pcui/` now contains an isolated browser-side spike that exercises the property-panel direction without touching replay/runtime code.

## TODO Investigation Items
- Decide whether PCUI should render in Electron DOM directly or via a lightweight wrapper component layer.
- Decide whether a future graph surface should use PCUI-Graph first or a local canvas abstraction first.
