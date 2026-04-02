# Investigation Mode

Investigation Mode is the first-class IDE stage for donor discovery and coverage.

It combines:
- static donor scan
- bounded runtime/scenario capture
- scenario-family coverage state
- next profile guidance
- next operator action
- stage handoff readiness

## Current files

- `investigationState.ts`
  - lifecycle lane
  - stage handoff readiness
  - agent loop summary
- `scenarioCoverage.ts`
  - reusable scenario family catalog
  - scenario coverage state classification
  - next-profile and next-action helpers

## What the shell should show

- current donor scan state
- current runtime scan state
- scenario coverage counts
- blocked families/events
- next capture profile
- next operator action
- whether the project is investigation-only, partially ready, or ready for reconstruction

## Scope

This mode is future-game oriented.

It is not meant to prove every possible state in one run. It is meant to answer:
- what do we already know
- what is still missing
- what should we do next
