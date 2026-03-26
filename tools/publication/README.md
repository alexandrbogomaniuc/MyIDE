# Publication Tooling

Deterministic publication and handoff helpers for the MyIDE repo.

## Commands
- `npm run publication:preflight`
  - Print local HEAD, public HEAD, ahead count, public/raw mismatch signals, branch state, remote summary, and repo cleanliness.
- `npm run publication:compare`
  - Refresh [`00_control/LOCAL_PUBLIC_GAP.md`](../../00_control/LOCAL_PUBLIC_GAP.md) with the latest measured LOCAL vs PUBLIC gap.
- `npm run handoff:refresh`
  - Regenerate the external handoff package under `/Users/alexb/Documents/Dev/MyIDE_handoff`.
  - Writes both phase-specific files such as `PHASE5T_or_later.*` and stable `CURRENT.*` copies.
- `npm run handoff:verify`
  - Check that the latest handoff files exist, are non-empty, include the current local/public SHAs, and that the stable bundle verifies cleanly.

## External Handoff Files
- `CURRENT.bundle`
- `CURRENT.patch`
- `CURRENT_CHANGED_FILES.txt`
- `CURRENT_DIFFSTAT.txt`
- `CURRENT_RECOVERY_NOTES.txt`

The stable `CURRENT.*` files are the fastest handoff path for another authenticated environment. The phase-specific files remain useful for archival and audit.

## Operator Flow
1. Run `npm run publication:preflight`.
2. Run `npm run publication:compare`.
3. Run `npm run handoff:refresh`.
4. Run `npm run handoff:verify`.
5. If this host still cannot push, use `CURRENT.bundle` from another authenticated clone and follow the exact commands in `CURRENT_RECOVERY_NOTES.txt`.

For automated outbound status, refresh `npm run automation:status-snapshot` and require `npm run automation:check-freshness` to return `CURRENT` before sending any report.

## Manual QA Companion
- `npm run manual:status` is the quickest way for a tester to confirm the local commit, local phase, public SHA, and current handoff availability before opening the shell.
