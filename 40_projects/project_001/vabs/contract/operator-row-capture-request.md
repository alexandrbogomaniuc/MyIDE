# Operator Row Capture Request

Use this when a real archived Mystery Garden `playerBets` row is available before a full `playerBets[]` session can be captured.

## Smallest Useful Capture Pack
- one archived row that preserves the real GS transport shape
- preserve the real `ROUND_ID`
- preserve the original `betData` and `servletData` bag format
- do not edit the raw payload in place

## Minimum Required Row Fields
- `time`
- `stateId`
- `stateName`
- `extBetId`
- `bet`
- `win`
- `balance`
- `betData`
- `servletData`
- `ROUND_ID`

## Local Intake Paths
- raw local-only drop: `contract/captured-playerBets-row.json`
- sanitized commit-safe output: `contract/captured-playerBets-row.sanitized.json`

## Minimum Provenance To Record
- source environment or capture session id
- exact evidence item or history export id
- whether the file is raw, sanitized, or derived
- whether any fields were removed or replaced during sanitization

## Exact Commands After Drop-In
- `npm run vabs:intake:project_001 -- --source /absolute/path/to/raw-row.json`
- `npm run vabs:sanitize:project_001`
- `npm run vabs:verify:captured:project_001`
- `npm run vabs:compare:project_001`
- `npm run vabs:replay:project_001`
- `npm run vabs:export:project_001`
- `npm run vabs:verify:export:project_001`
- `npm run vabs:preview:project_001`
- `npm run vabs:mock:project_001`
- `npm run vabs:smoke:project_001`

## Current Blocker
- No real Mystery Garden archived `playerBets` row is available in the accessible donor/canonical material yet.
- Until that changes, the repo must stay honest and keep using the derived row fixture plus derived session fixture for default proof runs.
