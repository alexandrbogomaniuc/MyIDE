# Donor Scan Tooling

Reusable donor-scan tooling for future games.

## Purpose

The donor-scan subsystem takes either:

- a donor launch URL
- or an already-harvested donor package

and answers early:

1. what runtime entry points exist
2. what assets exist
3. what atlas/frame metadata exists
4. what bundle asset references exist
5. whether a local mirror candidate is weak, strong-partial, or blocked
6. what the current blockers are
7. what the next operator action should be

## Commands

- `npm run donor-scan:url -- --donor-id donor_XXX --donor-name "NAME" --url "https://..."`
  - Run donor intake first, then donor scan.
- `npm run donor-scan:url -- --donor-id donor_XXX --donor-name "NAME"`
  - Re-scan an already-harvested donor package without requiring a fresh donor URL.
- `npm run donor-scan:verify -- --donor-id donor_XXX`
  - Verify the machine-readable donor-scan outputs exist and are internally coherent enough for operator use.

## Outputs

All outputs are written under:

`10_donors/<donor_id>/evidence/local_only/harvest/`

Key files:

- `entry-points.json`
- `url-inventory.json`
- `asset-manifest.json`
- `runtime-candidates.json`
- `bundle-asset-map.json`
- `atlas-manifests.json`
- `package-graph.json`
- `blocker-summary.md`
- `scan-summary.json`

## What The Scan Can Break Early

- Missing runtime entry points
- Missing bundle-level asset references
- Missing atlas/frame metadata
- Weak vs strong-partial local mirror state
- The next runtime files that should be mirrored locally
- Whether atlas/frame import is blocked by missing source material or by missing importer work

## What The Scan Cannot Break By Itself

- Hidden runtime payloads that never appear in harvested launch files, bundles, or metadata
- Donor-side token/session/API dependencies
- Full local runtime reconstruction when critical files are still missing upstream or uncaptured
- Full live runtime object ownership or mechanics decomposition

## Current Proof Donor

`project_001` / `donor_001_mystery_garden` is the proving ground for this subsystem.

Current grounded result:

- strong partial local runtime package: yes
- full standalone local runtime package: no
- atlas/frame metadata present locally: yes
- atlas/frame import feasible right now: no, because referenced page images and deeper runtime payloads are still missing
