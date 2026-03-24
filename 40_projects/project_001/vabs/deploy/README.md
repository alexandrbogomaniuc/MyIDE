# VABS Deploy Notes

This folder records the static-host and packaging expectations for the future `project_001` GS VABS package.

## Focus
- target folder naming
- shared engine/static dependencies
- host/path checks
- deployment pitfalls
- local export-package shape
- local preview dry-run expectations

## Current Local Export Shape
- local export root: `/tmp/myide-vabs-project_001-export/`
- intended static package path: `common/vabs/mysterygarden/`
- current exported files:
  - `code.js`
  - `strings_en.js`
  - `manifest.json`
- example manifest shape: `export-manifest.example.json`

## Current Limits
- stub-only renderer package
- no live JSP/static-host deployment proof yet
- no full captured archived Mystery Garden `playerBets` row yet

Use `static-host-checklist.md` before calling a project deployment-ready.
