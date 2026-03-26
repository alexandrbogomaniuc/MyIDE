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
