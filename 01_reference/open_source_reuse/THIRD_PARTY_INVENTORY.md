# Third Party Inventory

## Inventory
| Component | Source | License | Intended Scope | MyIDE Boundary | Replacement Strategy | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Electron | [electron/electron](https://github.com/electron/electron) | MIT | Desktop shell for MyIDE | `30_app/shell` only | Replace only if a future shell decision forces it | Approved foundation |
| PCUI | [playcanvas/pcui](https://github.com/playcanvas/pcui) | MIT | Property panels, inspectors, tool-style forms | `30_app/ui/adapters/PropertyPanelAdapter.ts` plus isolated spike files under `30_app/ui/spikes/pcui/` | Replace with a local DOM form layer if the fit is poor | Installed for isolated spike |
| @playcanvas/observer | [playcanvas/observer](https://github.com/playcanvas/observer) | MIT | Transitive runtime support for PCUI bindings/events | Isolated `PCUI` spike only in this phase | Remove with the PCUI spike if reuse direction changes | Installed transitively |
| PCUI Graph | [PCUI Graph docs](https://developer.playcanvas.com/user-manual/pcui/pcui-graph/) | To verify before adoption | Future node/trigger graph viewer | `30_app/ui/adapters/GraphPanelAdapter.ts` and future graph renderer wrappers | Replace with local canvas/SVG graph surface if needed | Preferred future candidate |
| GDevelop | [4ian/GDevelop](https://github.com/4ian/GDevelop) | MIT | Workflow inspiration for scene, logic, and desktop-web editor patterns | Reference only, no code import | N/A, reference only | Inspiration only |

## Proven Facts
- `@playcanvas/pcui@6.1.3` is installed in the repo for an isolated spike.
- `@playcanvas/observer@1.7.1` is present as a transitive MIT dependency of `PCUI`.
- The current codebase keeps external UI concerns behind local adapter interfaces.

## Notes
- All third-party components must be recorded here before direct adoption.
- Intended scope is intentionally narrow so we can delete or replace a dependency without changing replay or importer logic.

## TODO Investigation Items
- Decide whether the `PCUI` spike earns promotion beyond isolated experimentation.
- Add per-component license file references to the release docs when actual dependency acquisition begins.
