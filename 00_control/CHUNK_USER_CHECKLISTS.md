# Chunk User Checklists

## C6 runtime/debug host/trace/override

### Step-by-step
1. Open MyIDE and switch to `project_002`.
2. Open `Runtime` panel.
3. Confirm `Open Debug Host` is visible.
4. Click `Harvest Request-backed Sources`.
5. Open the active modification task in Runtime (if not already active).
6. In Runtime controls, click `Create Override`.
7. Click `Harvest Request-backed Sources` again.
8. Click `Clear Override`.

### Expected result
- Harvest completes without timeout.
- Runtime workbench keeps a request-backed selected-project entry.
- `Create Override` is enabled when a grounded static source is selected.
- After the second harvest, runtime evidence shows override-backed hits or a clear coverage/debug-host follow-up message.
- `Clear Override` removes the active override.

### Failure signs
- Harvest button does nothing or times out.
- Runtime source changes unexpectedly to unrelated URL after harvest.
- `Create Override` stays disabled when grounded runtime source is visible.
- Override is created but never cleared.
- Status text claims fake behavior (for example, says embedded runtime is reloading when launch is blocked).

### What to report back
- Project id used.
- Which step failed.
- Exact status message shown in the UI.
- Whether `Open Debug Host` and `Create Override` were visible/enabled.
- If possible: attach the generated smoke artifact path from `/tmp/myide-electron-runtime-selected-project-*.json`.
