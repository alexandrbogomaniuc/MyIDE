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

`auto` replay selection only promotes the sanitized captured row. The `captured-raw-local` output tier should appear only when captured replay is selected explicitly before sanitization.

These artifacts are local harness outputs only. They are not part of the public repo and should not be committed.

`npm run vabs:export:project_001` writes a GS-style local export package outside the repo under:

- `/tmp/myide-vabs-project_001-export/common/vabs/mysterygarden/code.js`
- `/tmp/myide-vabs-project_001-export/common/vabs/mysterygarden/strings_en.js`
- `/tmp/myide-vabs-project_001-export/common/vabs/mysterygarden/manifest.json`

`npm run vabs:preview:project_001` writes deterministic export-preview artifacts outside the repo under:

- `/tmp/myide-vabs-project_001-export-preview/derived/preview-summary.json`
- `/tmp/myide-vabs-project_001-export-preview/derived/preview-summary.html`
- `/tmp/myide-vabs-project_001-export-preview/derived/preview-summary.txt`

If a sanitized captured row exists later, the preview path can also emit a `captured-sanitized/` tier.
