# Reuse Decisions

## Decision Summary
- Use `Electron` as the desktop shell foundation.
- Use `PCUI` as the preferred future property-panel and inspector UI family.
- Use `PCUI-Graph` as the preferred future graph and trigger visualization family.
- Treat `GDevelop` as workflow reference only, not as a dependency target.

## Proven Facts
- `PCUI` is MIT licensed. Source: [playcanvas/pcui](https://github.com/playcanvas/pcui).
- `PlayCanvas` engine and developer resources are MIT licensed. Sources: [playcanvas/engine](https://github.com/playcanvas/engine), [playcanvas/developer.playcanvas.com](https://github.com/playcanvas/developer.playcanvas.com).
- `GDevelop` is MIT licensed. Source: [4ian/GDevelop](https://github.com/4ian/GDevelop).
- `PCUI Graph` exists as a PlayCanvas graph visualization direction. Source: [PCUI Graph docs](https://developer.playcanvas.com/user-manual/pcui/pcui-graph/).

## Decisions
- No whole-editor embedding.
- No GPL dependencies.
- No direct coupling between core MyIDE logic and third-party UI components.
- All third-party UI usage must flow through `PropertyPanelAdapter` and `GraphPanelAdapter`.
- The current phase keeps local mock renderers as the stable boundary and adds one isolated `PCUI` spike under `30_app/ui/spikes/pcui/`.

## Replacement Strategy
- If `PCUI` does not fit the inspector layout, replace it with a local DOM renderer while keeping the adapter contract.
- If `PCUI-Graph` does not fit the future graph workflow, replace it with a local canvas/SVG graph surface behind the same adapter.
- If either library becomes unavailable or licensing changes, keep the local adapter API stable and swap only the implementation layer.

## Assumptions
- Inspector-heavy tooling will benefit more from a component library than from a hand-built ad hoc form stack.
- A graph UI is useful later for state/trigger review, but not for the current replay milestone.

## TODO Investigation Items
- Decide whether the `PCUI` spike should graduate into the Electron renderer or remain a disposable reference.
- Verify `PCUI-Graph` package/license details before any graph-surface spike.
