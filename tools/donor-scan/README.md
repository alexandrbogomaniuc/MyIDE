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
5. whether bundles expose structured image variant metadata
6. whether a local mirror candidate is weak, strong-partial, or blocked
7. what the current blockers are
8. what the next operator action should be

## Commands

- `npm run donor-scan:url -- --donor-id donor_XXX --donor-name "NAME" --url "https://..."`
  - Run donor intake first, then donor scan.
- `npm run donor-scan:url -- --donor-id donor_XXX --donor-name "NAME"`
  - Re-scan an already-harvested donor package without requiring a fresh donor URL.
- `npm run donor-scan:verify -- --donor-id donor_XXX`
  - Verify the machine-readable donor-scan outputs exist and are internally coherent enough for operator use.
- `npm run donor-scan:capture-next -- --donor-id donor_XXX --limit 5`
  - Attempt the top ranked missing donor/runtime files from `next-capture-targets.json`, rewrite grounded placeholder-style URLs when possible, try grounded bundle-backed sibling image URLs for atlas-page targets, refresh donor scan, and write a machine-readable capture run summary.

## Outputs

All outputs are written under:

`10_donors/<donor_id>/evidence/local_only/harvest/`

Key files:

- `entry-points.json`
- `url-inventory.json`
- `asset-manifest.json`
- `runtime-request-log.json` when donor scan has grounded runtime request evidence to normalize
- `request-backed-static-hints.json`
- `runtime-candidates.json`
- `bundle-asset-map.json`
- `atlas-manifests.json`
- `next-capture-targets.json`
- `next-capture-run.json`
- `package-graph.json`
- `blocker-summary.md`
- `scan-summary.json`

`bundle-asset-map.json` now preserves two kinds of grounded bundle evidence:

- ordinary resolved references extracted from bundle text
- structured `images:{...}` table metadata when a bundle exposes per-image variant suffix fields such as `e` and `f_e`

Those bundle image variants are recorded as evidence first. When loader/runtime code later proves the exact URL construction too, donor scan upgrades the same records with grounded `requestBaseUrl` and `variantUrls` entries, reports `bundleImageVariantUrlBuilderStatus` / `bundleImageVariantUrlCount` in `scan-summary.json`, and lets ranked capture targets reuse those exact optimized image URLs instead of only suffix-token evidence.

`request-backed-static-hints.json` is an optional supporting donor-scan artifact. When live runtime harvest evidence exists, donor scan normalizes exact request-backed static alternates there first and then reuses them in ranked capture targets.

`next-capture-targets.json` is the first actionable operator output. It ranks the missing runtime files the IDE should try to capture next, using atlas missing-page refs, unresolved runtime candidates, and missing bundle references. It now also carries grounded `alternateCaptureHints` so the scan can expose placeholder rewrites, bundle-backed rooted path variants, request-backed static alternates, image-family rooted path substitutions, and exact optimized bundle image URLs when the donor bundle proves the request-base rule. Atlas-page targets also keep atlas page order, so unsuffixed base pages are tried before later suffix pages when the metadata already proves that order.

`next-capture-run.json` records what the guided capture runner attempted, which exact URLs were tried, which URL actually downloaded when a fallback worked, what failed, and how many ranked targets still remain after donor scan was refreshed.

After a guided capture run, donor scan now feeds the latest failed attempts back into `next-capture-targets.json` too. That lets the IDE show which ranked targets are still blocked even after every grounded alternate URL in the latest run was already tried, and it now demotes those recently blocked dead ends below the next untried grounded targets.

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
- bundle image variant metadata present locally: yes, with `233` logical image entries and `385` suffix tokens currently extracted from `bundle.js`
- bundle image request-base rule present locally: yes, with `385` grounded optimized variant URLs now derived from the same `bundle.js`
