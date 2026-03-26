# Manual QA Tooling

Manual QA helpers are for local testing against the current tracked `project_001` baseline.
The current shell edits reconstructed internal scene data under `40_projects/project_001/internal`; it now also supports a stronger bounded donor composition slice for `project_001`, where supported local donor images appear in the in-app donor asset palette, can be filtered by type, can target an explicit layer, can be dropped into empty canvas space to create donor-linked internal scene objects, can be dropped directly over an editable object to replace it, and give selected donor-backed images a small bottom-right resize handle.
Raw donor files remain read-only evidence, and on a typical window size the **Donor Assets & Evidence** panel sits in the left column below Project Browser, so testers may need to scroll the left column to reach it.
GS VABS support is a separate project-delivery module; the manual commands here are still for the current shell/editor baseline, not a production VABS renderer.
`project_001` now has one stronger VABS contract/renderer-stub slice with explicit raw-vs-sanitized captured-row intake and captured-vs-derived fixture tracking, but editor QA and VABS verification remain separate flows.
The shell now shows a read-only VABS status panel for the selected project, but manual editor prep and proof still use the same bounded shell/editor commands as before.

## Recommended Tester Flow
1. Run `npm run manual:status` for a quick LOCAL vs PUBLIC vs HANDOFF check.
2. Run `npm run manual:prepare:project_001` to reset, sync, and validate the `project_001` baseline before testing.
3. Launch the shell with `npm run dev`.
4. Run `npm run donor-assets:index:project_001` before opening the shell if you want to test donor import.
5. Open `project_001` in Project Browser, then scroll the left column down if you need to inspect **Donor Assets & Evidence**.
6. Choose a donor import target layer, then drag one supported donor image into empty canvas space if you want to test the donor composition slice.
7. If both `png` and `webp` donor assets are present, drag one of each to prove the stronger bounded import slice.
8. Drag one donor image over an existing editable canvas object if you want to test direct donor-backed replacement, or use **Replace Selected Object** for the bounded button path.
9. Select a donor-backed image and use its bottom-right resize handle if you want to test bounded direct manipulation.
10. If you hit a bug, run `npm run manual:bug-bundle` to create a timestamped folder outside the repo with a prefilled bug note, current context, and an `attachments/` folder.
11. If you only need a quick paste-friendly text block, run `npm run manual:bug-context`.
12. Use `npm run manual:reset:project_001` again when you want to clean up after a session without running the full prepare flow.

## Commands
- `npm run manual:status`
  - Print the local commit, local phase, public `origin/main` SHA when available, current validated project, and whether a stable handoff bundle is present.
- `npm run manual:prepare:project_001`
  - Print the current manual status.
  - Reset tracked `40_projects/project_001` files to the current local `HEAD` baseline.
  - Regenerate the derived workspace registry, resync replay-facing `project.json`, validate the `project_001` schema, and tell the tester what to run next.
  - Re-run with `-- --force-unknown` only if you intentionally want to remove unexpected untracked files inside `project_001`.
- `npm run manual:bug-bundle`
  - Create a timestamped bug-report folder under `/Users/alexb/Documents/Dev/MyIDE_manual_reports/`.
  - Write `BUG.md`, `context.txt`, `README.txt`, and an empty `attachments/` folder outside the repo.
  - Keep the bundle local; it is not part of Git tracking.
- `npm run manual:bug-context`
  - Print a concise block with timestamp, local commit, local phase, public `origin/main`, local/public match status, validated project, and current handoff paths so a tester can paste it directly into a bug note.
- `npm run manual:reset:project_001`
  - Restore tracked `40_projects/project_001` files from the current local `HEAD`.
  - Remove only the known local-only editor log outputs:
    - `40_projects/project_001/logs/editor-snapshots/`
    - `40_projects/project_001/logs/editor-save-history.jsonl`
  - Abort if tracked files outside `project_001` are dirty.
  - Leave unrelated untracked notes or report folders outside `project_001` alone.
  - Abort if unexpected untracked files exist inside `project_001`.

## Safety Model
- The reset baseline is the current tracked `HEAD` state of `project_001`.
- `manual:prepare:project_001` is intentionally destructive for current `project_001` edits because it runs the same reset step before rebuilding a clean test baseline.
- The reset command is intentionally destructive for `project_001` edits and known local-only logs.
- If you intentionally created extra local files inside `project_001`, review them before using `--force-unknown`.
