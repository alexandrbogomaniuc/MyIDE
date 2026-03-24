# Parsed Row Example

This file shows the intended parsed summary for the current `project_001` contract fixture.

## Source Row
- file: `contract/sample-playerBets-row.json`
- status: sanitized contract fixture, not a captured production GS row

## Parsed Summary
- `time`: `20 Mar 2026 10:32:56`
- `stateId`: `317`
- `stateName`: `Free Spins Trigger`
- `extBetId`: `project001-fs-trigger-0001`
- `ROUND_ID`: `202603200001`
- `entryState`: `state.spin`
- `resultState`: `state.free-spins-trigger`
- `followUpState`: `state.free-spins-active`
- `awardFreeSpins`: `10`
- `currency`: `EUR`

## Parsed betData Keys
- `BET_TOTAL`
- `BETID`
- `COINSEQ`
- `ENTRY_STATE`
- `RESULT_STATE`
- `FOLLOW_UP_STATE`
- `AWARD_FREE_SPINS`
- `CURRENCY`
- `SYMBOL_GRID`
- `EVIDENCE_REFS`

## Parsed servletData Keys
- `ROUND_ID`
- `PROJECT_ID`
- `DONOR_ID`
- `SOURCE_CAPTURE`
- `FIXTURE_KIND`
- `SOURCE_NOTE`

## Why This Example Exists
- to keep the contract parser testable
- to keep the renderer stub deterministic
- to make the first project-specific VABS slice concrete without claiming a finished production row
