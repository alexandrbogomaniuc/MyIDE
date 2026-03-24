# VABS Deploy Notes

This folder records the static-host and packaging expectations for the future `project_001` GS VABS package.

## Focus
- target folder naming
- shared engine/static dependencies
- host/path checks
- deployment pitfalls
- local export-package shape
- local preview dry-run expectations
- local shell-mock / browser-smoke expectations

## Current Local Export Shape
- local export root: `/tmp/myide-vabs-project_001-export/`
- intended static package path: `common/vabs/mysterygarden/`
- current exported files:
  - `code.js`
  - `strings_en.js`
  - `manifest.json`
- example manifest shape: `export-manifest.example.json`

## Current Local Shell Mock Shape
- local shell-mock root: `/tmp/myide-vabs-project_001-shell-mock/`
- shell path per fixture kind: `/tmp/myide-vabs-project_001-shell-mock/<fixture-kind>/shell-mock.html`
- browser smoke writes deterministic JSON/TXT results beside that shell mock
- the shell mock loads `./common/vabs/mysterygarden/strings_en.js` and `./common/vabs/mysterygarden/code.js` from the staged mock root

## Current Limits
- stub-only renderer package
- no live JSP/static-host deployment proof yet
- no full captured archived Mystery Garden `playerBets` row yet
- shell-mock success only proves local file-backed boot behavior, not a real GS servlet/JSP path

Use `static-host-checklist.md` before calling a project deployment-ready.
