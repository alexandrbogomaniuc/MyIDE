# GS VABS Risks

## Contract Risks
- `ROUND_ID` missing or inconsistently encoded:
  - support/history lookup can land on the wrong round or fail entirely
- `betData` / `servletData` shape drift:
  - TRow-compatible parsing can silently fail even if JSON transport still looks valid
- row payloads treated like arbitrary JSON instead of delimiter-based bags:
  - game-local VABS renderers may stop extracting values they assume are present

## Folder And Asset Risks
- wrong normalized folder name:
  - host page loads the wrong folder or a missing `code.js`
- case-sensitive file mismatch:
  - assets work on one environment and break on another
- incomplete package deployment:
  - renderer logic loads but images/strings do not

## Deployment Risks
- missing shared `/common/vabs` engine assets:
  - viewer loads a page shell with no real replay rendering
- host/path mismatch:
  - static asset base points at the wrong origin or path segment
- localization files forgotten:
  - non-English sessions degrade or error

## Process Risks
- VABS treated like an afterthought after the editor is already complete:
  - archived row contract and deploy validation arrive too late
- VABS coupled directly into the current shell/editor runtime:
  - current validated editor becomes harder to reason about and verify
- renderer template copied from proprietary source without boundary docs:
  - legal/reuse risks plus long-term maintenance confusion

## MyIDE Guardrails
- Keep VABS as a separate module/workstream.
- Keep donor evidence read-only.
- Keep the current internal scene editor as the editable source of truth.
- Require per-project contract docs, renderer scaffold, deploy checklist, and acceptance checklist before calling VABS delivery ready.
