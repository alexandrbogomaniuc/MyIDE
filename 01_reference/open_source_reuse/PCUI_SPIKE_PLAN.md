# PCUI Spike Plan

## Goal
Validate whether `PCUI` is a good fit for MyIDE property panels and inspector tooling without letting it leak into the replay/runtime core.

## Spike Boundary
- The spike lives outside the replay shell.
- The spike may render sample property data only.
- The spike must only talk to local adapter view-models.
- The spike must not import donor evidence directly.

## Success Criteria
- A property panel can render a project summary, evidence refs, assumptions, and unresolved items.
- The adapter contract remains usable without `PCUI`.
- Styling can be replaced without changing the data model.

## Concrete Experiment
- Render the `project_001` mock property view model through a thin local wrapper.
- Compare a mock DOM implementation against a PCUI-backed implementation using the same adapter output.
- Keep the output strictly informational: no editor actions, no drag/drop, no runtime coupling.

## PHASE 3 Result
- Package acquisition was available in this repo.
- The isolated spike lives at `30_app/ui/spikes/pcui/index.html` and `30_app/ui/spikes/pcui/spike.mjs`.
- The spike renders a read-only property-panel-style surface using the same local view-model shape as `PropertyPanelAdapter`.
- The spike is not imported by the replay shell or importer code.

## What To Record
- Component fit for dense inspector data.
- Keyboard navigation and focus behavior.
- How much code remains local versus vendor-owned.
- Whether the library encourages coupling to its object model.

## Decision Gate
- If `PCUI` needs too much wrapper code, keep the adapter contract and fall back to local DOM rendering for V1.
- If the fit is good, adopt it only behind the existing adapter boundary.
