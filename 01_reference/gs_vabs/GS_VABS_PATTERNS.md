# GS VABS Patterns

## Folder Mapping Rule
- The GS VABS host page derives the per-game folder name from the full game name.
- The normalization step removes platform-specific suffixes and certain prefixes before resolving the folder.
- Practical implication for MyIDE:
  - every project must record its intended GS VABS folder name explicitly
  - folder-name mapping should be verified before deployment
  - folder naming cannot be treated as an afterthought

## Archived Row Contract
- The GS history servlet returns a `GETINFO` JSON payload with `playerBets`.
- Each archived row needs stable values for:
  - `time`
  - `stateId`
  - `stateName`
  - `bet`
  - `win`
  - `balance`
  - `betData`
  - `servletData`
  - `extBetId`
- `ROUND_ID` must be recoverable from the row payloads and should be treated as a required contract field for reliable replay lookup and support/history linking.

## TRow Parsing Expectations
- Legacy rows can be parsed from a `+`-delimited string format.
- JSON rows are supported too, but `betData` and `servletData` are still expected to be delimiter-based key/value text.
- Public/private parameter bags use:
  - `~` between key/value pairs
  - `=` between key and value
- Game-specific renderer code often parses additional structure from `row.publicText` after the engine-level split.

## Per-Game Package Shape
- Common observed pattern under `common/vabs/<folderName>/`:
  - `code.js`
  - background art
  - game-specific icons/symbols
  - optional localized strings
  - optional helper sprites such as `empty.gif`
- Practical implication for MyIDE:
  - scaffold the renderer package separately per project
  - keep code template, strings template, assets notes, and deploy notes together
  - treat renderer assets as package-local static artifacts, not editor objects

## Common Renderer Structure
- Shared JSP/template code:
  - resolves session/game context
  - sets the static asset base
  - creates the VABS engine
  - points the engine at the selected folder
  - loads per-game `code.js`
- Per-game `code.js` usually:
  - registers row-click / row-create / draw callbacks
  - parses row payloads into game-specific pages or screens
  - draws history/replay UI from archived row data

## Deployment Pattern
- Static assets are expected under a stable host/path layout like `/html5pc/common/vabs/<folderName>/`.
- Case-sensitive asset names matter.
- Missing shared engine assets or a missing `code.js` yields a blank or broken history viewer.
- Localization assets are optional, but if the target deployment uses non-English locales they must be published together.
