# Projects

- Clean internal MyIDE projects live here.
- A project folder is the canonical unit of the workspace.
- One project equals one donor-to-release cycle.
- The standard project layout is documented in [`../00_control/PROJECT_LIFECYCLE.md`](../00_control/PROJECT_LIFECYCLE.md).
- `project.meta.json` is required for discovery and should describe donor linkage, target/resulting-game metadata, phase/status, verification status, key paths, and proven vs planned notes.
- `registry.json` may exist as a derived workspace index or cache, but project folders remain the source of truth.
- `project_001` is still compatible with the current replay/import path during the transition to folder-led discovery.
- Adding a valid project folder and refreshing discovery is enough to surface a new project in the shell.
- Do not store raw donor evidence in this folder.
