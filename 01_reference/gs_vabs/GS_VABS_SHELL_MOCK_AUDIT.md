# GS VABS Shell Mock Audit

This note captures the minimum GS VABS shell behavior that the local MyIDE shell mock can emulate honestly.

## Reference Files Read
- `vabs/show.jsp`
- `vabs/html5template.jspf`
- `vabs/VabEngine/EngineHeader.jsp`
- `vabs/VabEngine/VabEngineMain.jspf`
- `vabs/VabEngine/VabParameters.jsp`

## Minimal Shell Responsibilities
- include a page shell around the per-game renderer rather than loading `code.js` in isolation
- derive a normalized per-game folder token and load `/common/vabs/<folder>/code.js`
- expose a static asset base for shared engine/package files
- provide a title/game identity context
- pass round/session-related boot inputs into the VABS engine boot path
- mount a visible history/info area and a renderer area on the same page

## Parameters And Inputs The Real Shell Supplies
- scheme / backend host
- static asset base
- normalized folder token
- game name / localized title
- game session id
- round id
- optional flags such as hide-balance and show-ext-bet-id
- locale-dependent strings when a non-English bundle exists

## What The Local Mock Can Safely Emulate
- a browser-facing page shell instead of a raw renderer file
- the normalized `common/vabs/mysterygarden/` package path
- boot metadata such as title, game name, round id, fixture provenance, and package folder token
- per-game `strings_en.js` and `code.js` loading via relative static paths
- renderer boot through `start()`, `createRowEvent()`, and `draw()` with a local fixture-backed row adapter
- a visible left-side boot/provenance panel plus a renderer mount area

## What The Local Mock Cannot Honestly Claim
- live JSP execution
- real `VabEngine` / `TVabEngine` behavior
- real servlet-backed `GETINFO` or history pagination/filter flows
- real backend host/session lookup behavior
- production static-host readiness

## MyIDE Shell-Mock Rule
- The MyIDE shell mock should approximate the GS page shape and boot inputs just enough to prove the exported package can execute in a browser-like shell.
- It should stay local-only, deterministic, and explicit about captured-vs-derived fixture provenance.
- It must not be reported as JSP deployment proof.
