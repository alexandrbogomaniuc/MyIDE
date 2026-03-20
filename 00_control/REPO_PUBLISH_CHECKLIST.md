# Repo Publish Checklist

## Preflight
- [x] Work stays inside the `MyIDE/` repository root.
- [x] MyIDE is its own git repository.
- [x] `origin` points to `https://github.com/alexandrbogomaniuc/MyIDE.git`.
- [x] Active branch is `main`.

## Public-Safety Review
- [ ] Search staged content for tokens, cookies, auth headers, and session identifiers.
- [ ] Confirm no raw donor downloads or runtime payload bodies are staged.
- [ ] Confirm any excluded artifacts are represented by hashes, evidence IDs, and sanitized notes.
- [ ] Confirm `local_only/` remains git-ignored except for explanatory `README.md`.
- [ ] Confirm `progress.md` or other local scratch notes are not staged.

## Technical Verification
- [ ] Run `npm run typecheck`.
- [ ] Run `npm run import:mystery-garden`.
- [ ] Run `npm run verify:project_001`.
- [ ] Review any changed import artifact for deterministic output only.

## Publication
- [ ] Stage intended files.
- [ ] Commit with a truthful message.
- [ ] Push to `origin/main`.
- [ ] Record exact git publication details in the run report.
