# Publication Playbook

PUB-B keeps publication and handoff predictable without adding editor/runtime scope.

## What The States Mean
- `LOCAL`: the current MyIDE repository checkout on this machine.
- `PUBLIC`: `origin/main` plus the raw public files on GitHub.
- `HANDOFF`: the external portable package under `/Users/alexb/Documents/Dev/MyIDE_handoff`.

## Fast Control Loop
1. Run `npm run publication:preflight`.
2. Run `npm run publication:compare`.
3. Read [`LOCAL_PUBLIC_GAP.md`](./LOCAL_PUBLIC_GAP.md).
4. Run `npm run handoff:refresh`.
5. Run `npm run handoff:verify`.

## What The Handoff Package Contains
- Phase-specific files such as `PHASE5T_or_later.bundle` and `PHASE5T_or_later_RECOVERY_NOTES.txt`.
- Stable current files:
  - `CURRENT.bundle`
  - `CURRENT.patch`
  - `CURRENT_CHANGED_FILES.txt`
  - `CURRENT_DIFFSTAT.txt`
  - `CURRENT_RECOVERY_NOTES.txt`

Use the phase-specific files for audit history and the stable `CURRENT.*` files for the fastest publication handoff.

## Publishing From Another Authenticated Environment
1. Clone or open an authenticated `MyIDE` checkout elsewhere.
2. Run `git -C /path/to/authenticated/MyIDE fetch origin`.
3. Run `git -C /path/to/authenticated/MyIDE rev-parse origin/main`.
4. Confirm that SHA matches the `Public origin/main` value in `CURRENT_RECOVERY_NOTES.txt`.
5. Run `git -C /path/to/authenticated/MyIDE fetch /Users/alexb/Documents/Dev/MyIDE_handoff/CURRENT.bundle main:handoff-main`.
6. Review the unpublished range with `git -C /path/to/authenticated/MyIDE log --oneline origin/main..handoff-main`.
7. Publish with `git -C /path/to/authenticated/MyIDE push origin handoff-main:main`.
8. Verify the raw public files listed in `CURRENT_RECOVERY_NOTES.txt`.

## Current Host Truth
- This host can measure the local/public gap and refresh the handoff package.
- Use `npm run publication:preflight` to determine whether this host can push right now.
- If push fails here, do not keep retrying random fixes in this repo. Refresh the handoff package and publish from the authenticated environment instead.
- For local manual testing, prefer `npm run manual:status` and the docs in `00_control/MANUAL_*`.
