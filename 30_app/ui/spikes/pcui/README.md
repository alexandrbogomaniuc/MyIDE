# PCUI Spike

## Goal
Test whether [PCUI](https://github.com/playcanvas/pcui) is a good fit for MyIDE property panels and inspector stacks.

## Isolation Rules
- This spike must never become the source of truth for replay data.
- The spike should consume only local adapter view-models.
- The spike should be safe to delete without impacting runtime or importer behavior.

## Concrete Experiment
- Render `mockPropertyPanel` through a thin wrapper.
- Compare the mock implementation against a future PCUI-backed implementation.
- Measure whether the component library reduces code without forcing core coupling.

## Notes
- The isolated PHASE 3 spike lives in `index.html` and `spike.mjs`.
- It uses `@playcanvas/pcui` from local `node_modules` plus an import map for `@playcanvas/observer`.
- It stays browser-only and is not imported into replay/runtime code.

## Manual Open
- Serve `/Users/alexb/Documents/Dev/MyIDE` over HTTP, then open `http://127.0.0.1:8123/30_app/ui/spikes/pcui/index.html`.
- Example local command: `python3 -m http.server 8123`
