# GS VABS Output Notes

`npm run vabs:replay:project_001` writes deterministic local replay artifacts outside the repo under:

- `/tmp/myide-vabs-project_001-replay/derived/replay-summary.json`
- `/tmp/myide-vabs-project_001-replay/derived/replay-summary.html`
- `/tmp/myide-vabs-project_001-replay/derived/replay-summary.txt`

If a captured fixture is added later, the same command can also emit:

- `/tmp/myide-vabs-project_001-replay/captured-sanitized/replay-summary.json`
- `/tmp/myide-vabs-project_001-replay/captured-sanitized/replay-summary.html`
- `/tmp/myide-vabs-project_001-replay/captured-sanitized/replay-summary.txt`

or, for a local-only raw row that has not yet been sanitized:

- `/tmp/myide-vabs-project_001-replay/captured-raw-local/replay-summary.json`
- `/tmp/myide-vabs-project_001-replay/captured-raw-local/replay-summary.html`
- `/tmp/myide-vabs-project_001-replay/captured-raw-local/replay-summary.txt`

These artifacts are local harness outputs only. They are not part of the public repo and should not be committed.
