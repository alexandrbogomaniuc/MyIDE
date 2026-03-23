# Manual QA Tooling

Manual QA helpers are for local testing against the current tracked `project_001` baseline.

## Commands
- `npm run manual:status`
  - Print the local commit, local phase, public `origin/main` SHA when available, current validated project, and whether a stable handoff bundle is present.
- `npm run manual:reset:project_001`
  - Restore tracked `40_projects/project_001` files from the current local `HEAD`.
  - Remove only the known local-only editor log outputs:
    - `40_projects/project_001/logs/editor-snapshots/`
    - `40_projects/project_001/logs/editor-save-history.jsonl`
  - Abort if the repo has changes outside `project_001`.
  - Abort if unexpected untracked files exist inside `project_001`.

## Safety Model
- The reset baseline is the current tracked `HEAD` state of `project_001`.
- The reset command is intentionally destructive for `project_001` edits and known local-only logs.
- If you intentionally created extra local files inside `project_001`, review them before using `--force-unknown`.
