# Captured Session Redaction Guidelines

Use these rules before committing any archived `playerBets[]` session.

## Keep
- `time`
- `stateId`
- `stateName`
- `bet`
- `win`
- `balance`
- parseable `betData`
- parseable `servletData`
- `ROUND_ID`
- stable row order

## Redact Or Replace
- `extBetId`
- any account, player, operator, token, or cookie-like fields
- any raw local file paths

## Commit-Safe Output
- commit only `captured-playerBets-session.sanitized.json`
- keep `captured-playerBets-session.json` local-only and gitignored
- add session-level provenance fields:
  - `sessionFixtureKind`
  - `sessionFixtureProvenance`
  - `captureStatus`
  - `sourceNote`

## Honesty Rule
- If the payload is incomplete, say so.
- If only one row survives sanitization, keep the session file but report that limitation.
