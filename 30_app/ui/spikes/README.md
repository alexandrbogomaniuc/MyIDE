# UI Spikes

## Purpose
- Holds isolated experiments for third-party UI reuse.
- Nothing in this folder should be imported by the replay shell yet.

## Rules
- Keep spikes disposable.
- Keep adapters stable even if the spike is deleted.
- Do not wire spike code into core replay or importer logic.
- Record package/license decisions in `01_reference/open_source_reuse/` before promoting any spike.
