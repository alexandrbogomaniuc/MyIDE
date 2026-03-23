# Manual QA Tooling

Manual QA helpers are for local testing against the current tracked `project_001` baseline.

## Recommended Tester Flow
1. Run `npm run manual:status` for a quick LOCAL vs PUBLIC vs HANDOFF check.
2. Run `npm run manual:prepare:project_001` to reset, sync, and validate the `project_001` baseline before testing.
3. Launch the shell with `npm run dev`.
4. If you hit a bug, run `npm run manual:bug-bundle` to create a timestamped folder outside the repo with a prefilled bug note, current context, and an `attachments/` folder.
5. If you only need a quick paste-friendly text block, run `npm run manual:bug-context`.
6. Use `npm run manual:reset:project_001` again when you want to clean up after a session without running the full prepare flow.

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
