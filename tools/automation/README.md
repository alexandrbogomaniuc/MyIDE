# Automation Truth Tooling

Use this tooling before any automation sends a MyIDE project report.

## Commands
- `npm run automation:status-snapshot`
  - Refresh the authoritative repo-local automation snapshot.
  - Writes gitignored files:
    - `00_control/AUTOMATION_STATUS_SNAPSHOT.json`
    - `00_control/AUTOMATION_STATUS_SNAPSHOT.md`
  - Does not rewrite tracked publication docs.
  - If you need a fresh tracked local/public gap snapshot, run `npm run publication:compare` separately.
- `npm run automation:check-freshness`
  - Prints exactly one leading status line:
    - `CURRENT`
    - `STALE_LOCAL`
    - `STALE_PUBLIC`
    - `SNAPSHOT_MISSING`

## Wrapper Rule
1. Run `npm run automation:status-snapshot`.
2. Run `npm run automation:check-freshness`.
3. Only send a project report if freshness returns `CURRENT`.
4. If freshness is not `CURRENT`, do not send cached or previously copied status as if it were current.
5. If no new substantive workstream has completed since the last outbound report, say `no new substantive workstream` plainly.

## Why The Snapshot Files Are Ignored
The authoritative snapshot includes the current local HEAD. If it were tracked, every commit would immediately make the committed snapshot stale again. Keeping the snapshot repo-local but gitignored avoids that self-staleness loop while still giving automation one deterministic source of truth.
