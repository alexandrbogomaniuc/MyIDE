# Operator Session Capture Request

Use this when a real archived Mystery Garden `playerBets[]` session is needed.

## Smallest Useful Capture Pack
- one archived history/session payload that contains `playerBets[]`
- at least two rows if possible so row-list and row-click replay can be re-run honestly
- preserve the real `ROUND_ID` values
- preserve the original row order
- do not edit the raw payload in place

## Local Intake Paths
- raw local-only drop: `contract/captured-playerBets-session.json`
- sanitized commit-safe output: `contract/captured-playerBets-session.sanitized.json`

## Minimum Provenance To Record
- source environment or capture session id
- exact evidence item or capture note id
- whether the file is raw, sanitized, or derived
- whether any rows were removed or redacted

## Current Blocker
- No real Mystery Garden archived `playerBets[]` session is available in the accessible donor/canonical material yet.
- Until that changes, the repo must stay honest and keep using the derived session fixture for default local support/history proof.

## Exact Commands After Drop-In
- `npm run vabs:intake:session:project_001 -- --source /absolute/path/to/raw-session.json`
- `npm run vabs:sanitize:session:project_001`
- `npm run vabs:verify:captured-session:project_001`
- `npm run vabs:compare:project_001`
- `npm run vabs:replay:project_001`
- `npm run vabs:export:project_001 -- --row-index 1`
- `npm run vabs:verify:export:project_001 -- --row-index 1`
- `npm run vabs:preview:project_001 -- --row-index 1`
- `npm run vabs:mock:project_001`
- `npm run vabs:smoke:project_001`

## Fallback Rule
- If only one archived row can be captured, use `contract/operator-row-capture-request.md` instead of forcing a fake session.
