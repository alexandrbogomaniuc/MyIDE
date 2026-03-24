# Acceptance Checklist

## Contract
- [ ] Archived row contract doc exists.
- [ ] `betData` keys doc exists.
- [ ] `servletData` keys doc exists.
- [ ] `ROUND_ID` is documented clearly.
- [ ] One deterministic sample archived row exists.

## Renderer Scaffold
- [ ] `renderer/code.template.js` exists.
- [ ] `renderer/strings_en.template.js` exists.
- [ ] Renderer templates are clearly marked as templates only.

## Deployment
- [ ] Static host checklist exists.
- [ ] Final VABS folder name is recorded before shipping.
- [ ] Package contents are verified on the target static host/path.

## Validation
- [ ] The same archived row produces the same replay result.
- [ ] Support/history replay can open the intended round by `ROUND_ID`.
- [ ] Current MyIDE editor verification still passes unchanged.
