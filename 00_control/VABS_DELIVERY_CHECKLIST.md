# VABS Delivery Checklist

Use this for each project that will eventually ship GS VABS / visual round history support.

## Before Renderer Work
- [ ] Decide the target VABS folder name.
- [ ] Document the archived row contract.
- [ ] Document required `betData` keys.
- [ ] Document required `servletData` keys.
- [ ] Record that `ROUND_ID` is mandatory.
- [ ] Add one deterministic sample archived row.
- [ ] Record whether that row is captured, derived, or mixed provenance.
- [ ] Define the raw local capture-drop path and the sanitized commit-safe capture path.
- [ ] Define whether `auto` replay selection may use only sanitized captured rows or some broader fallback.
- [ ] Define the local GS-style export package shape.

## Renderer Scaffold
- [ ] Create `renderer/code.template.js`.
- [ ] Create `renderer/strings_en.template.js`.
- [ ] Keep templates clearly marked as templates, not finished production code.
- [ ] Record any per-game renderer assumptions in the project-local VABS README.

## Assets And Paths
- [ ] Define the static package folder name and final host/path target.
- [ ] Record expected shared engine/static dependencies.
- [ ] Record any required localization files.
- [ ] Record case-sensitive asset naming expectations.

## Deployment Validation
- [ ] Confirm target host/path can serve `/common/vabs/<folder>/code.js`.
- [ ] Confirm shared VABS engine/static assets are present.
- [ ] Confirm the per-game folder contains the expected static assets.
- [ ] Confirm the deployment does not depend on private local files.

## Acceptance
- [ ] Acceptance checklist exists.
- [ ] One deterministic archived row sample replays consistently.
- [ ] Captured-vs-derived provenance is explicit for the active fixture.
- [ ] Raw local-only captured rows stay out of Git and do not become the default replay input accidentally.
- [ ] Captured-vs-derived comparison exists and is readable.
- [ ] One deterministic local replay harness run emits a replay-summary artifact for review/debug.
- [ ] One deterministic local export package can be built for `common/vabs/<folder>/`.
- [ ] One deterministic local preview dry-run can execute against the exported package.
- [ ] One deterministic local page-shell mock can boot the exported package in a browser-facing shell.
- [ ] One deterministic browser smoke can confirm the mock shell rendered the expected summary.
- [ ] Export and preview success are described only as local validation artifacts until real deployment proof exists.
- [ ] Shell-mock and browser-smoke success are described only as local validation artifacts until real deployment proof exists.
- [ ] One support/history flow proves the intended round can be opened by `ROUND_ID`.
- [ ] Current internal scene editor workflow still passes unchanged.

## MyIDE Guardrails
- [ ] Internal scene data remains the editable source of truth.
- [ ] Donor evidence remains read-only.
- [ ] VABS remains a separate module/workstream.
- [ ] No project is called VABS-ready without scaffold + deploy + acceptance coverage.

## Project 001 Current Decision
- Intended folder name: `mysterygarden`
- Decision status: provisional but intended
- Current concrete slice: stronger derived free-spins-trigger row fixture plus captured-round-id tracking plus explicit captured-row intake/comparison plus local replay harness plus stronger replay-summary renderer stub
- Current intake rule: `auto` uses the sanitized captured row if present, otherwise falls back to the derived fixture
- Current export rule: the local export package mirrors `common/vabs/mysterygarden/` but remains a stub-only non-production package
- Current shell-mock rule: the local shell mock approximates `/vabs/show.jsp` boot with the exported package, but it is still not live JSP deployment proof
