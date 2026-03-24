# VABS Delivery Checklist

Use this for each project that will eventually ship GS VABS / visual round history support.

## Before Renderer Work
- [ ] Decide the target VABS folder name.
- [ ] Document the archived row contract.
- [ ] Document required `betData` keys.
- [ ] Document required `servletData` keys.
- [ ] Record that `ROUND_ID` is mandatory.
- [ ] Add one deterministic sample archived row.

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
- [ ] One support/history flow proves the intended round can be opened by `ROUND_ID`.
- [ ] Current internal scene editor workflow still passes unchanged.

## MyIDE Guardrails
- [ ] Internal scene data remains the editable source of truth.
- [ ] Donor evidence remains read-only.
- [ ] VABS remains a separate module/workstream.
- [ ] No project is called VABS-ready without scaffold + deploy + acceptance coverage.
