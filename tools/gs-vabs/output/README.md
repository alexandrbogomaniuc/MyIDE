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

`npm run vabs:mock:project_001` writes a local browser-facing shell mock outside the repo under:

- `/tmp/myide-vabs-project_001-shell-mock/derived/shell-mock.html`
- `/tmp/myide-vabs-project_001-shell-mock/derived/shell-mock.json`
- `/tmp/myide-vabs-project_001-shell-mock/derived/shell-mock.txt`

That mock now embeds a deterministic session-level `playerBets[]` list and a click-to-replay flow around the exported package.

The shell mock stages the exported package under:

- `/tmp/myide-vabs-project_001-shell-mock/derived/common/vabs/mysterygarden/code.js`
- `/tmp/myide-vabs-project_001-shell-mock/derived/common/vabs/mysterygarden/strings_en.js`
- `/tmp/myide-vabs-project_001-shell-mock/derived/common/vabs/mysterygarden/manifest.json`

`npm run vabs:smoke:project_001` writes deterministic browser-smoke artifacts beside the shell mock:

- `/tmp/myide-vabs-project_001-shell-mock/derived/browser-smoke.dom.html`
- `/tmp/myide-vabs-project_001-shell-mock/derived/browser-smoke.json`
- `/tmp/myide-vabs-project_001-shell-mock/derived/browser-smoke.txt`

The smoke now proves:
- the shell mock rendered multiple rows
- a non-default row was selected through the mock shell
- the replay panel updated to that row's `ROUND_ID` and state

If a sanitized captured row exists later, the shell-mock and browser-smoke paths can also emit a `captured-sanitized/` tier.
