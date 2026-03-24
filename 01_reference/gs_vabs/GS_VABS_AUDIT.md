# GS VABS Audit

This note captures the grounded GS/VABS patterns that were actually inspected during GS-VABS-A.
It does not copy large proprietary code dumps. It records structure, contracts, and risks only.

## Reference Files Read
- `GameHistoryServlet.java`
- `vabs/show.jsp`
- `vabs/html5template.jspf`
- `common/vabs/VabEngine/TRow.js`
- `common/vabs/dragonstone/code.js`

## Example Folders Confirmed
- `common/vabs/amazon`
- `common/vabs/sectorx`
- `common/vabs/bg_mission_amazon`
- `common/vabs/bg_dragonstone`
- `common/vabs/dragonstone`

## What Was Confirmed
- `show.jsp` is only a thin include wrapper around the HTML5 template. The real VABS host-page logic lives in `html5template.jspf`.
- The template resolves a per-game VABS folder name from game metadata, not from a manual folder parameter.
- The template then loads shared engine assets plus `common/vabs/<folderName>/code.js`.
- The history servlet exposes `GETINFO` and returns a JSON response containing `playerBets` rows with:
  - `time`
  - `stateId`
  - `stateName`
  - `bet`
  - `win`
  - `balance`
  - `betData`
  - `servletData`
  - `extBetId`
- `TRow.js` supports both a legacy delimited line format and a JSON row format.
- `TRow.js` expects the public/private payloads to be delimited key/value strings, not arbitrary nested JSON blobs.
- `TRow.js` extracts `ROUND_ID` from the parsed payload bag and treats it as a first-class value.
- Example VABS game folders consistently contain:
  - `code.js`
  - background art
  - game-specific static art
  - optional localization files
  - in several cases `empty.gif`

## Structural Notes
- The file path supplied for the servlet sits under `com/dgphoenix/...`, but the file content declares package `com.abs.casino.web.history`. Treat path/package drift as a legacy-repo reality.
- The template builds its static asset base from the current scheme/server host and points at `/html5pc/common/vabs`.
- Non-English localization is optional but, when used, depends on both shared common strings and per-game strings files.

## Scope Of This Audit
- This audit is for MyIDE VABS module strategy and scaffolding only.
- It does not claim that MyIDE now ships a production GS VABS renderer.
- It does not copy third-party renderer code into MyIDE.
