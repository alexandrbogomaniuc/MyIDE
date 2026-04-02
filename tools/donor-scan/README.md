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
  - Attempt the top ranked missing donor/runtime files from `next-capture-targets.json`, rewrite grounded placeholder-style URLs when possible, try the strongest grounded alternates first when bundle-image-variant or request-backed hints exist, refresh donor scan, and write a machine-readable capture run summary.
- `npm run donor-scan:capture-family -- --donor-id donor_XXX --family big_win --limit 10`
  - Run the same guided capture runner, but constrain it to one ranked capture family from `capture-target-families.json` so operators can attack `big_win`, `bird`, `coin`, and other grouped blocker families directly.
- `npm run donor-scan:capture-family-sources -- --donor-id donor_XXX --family big_win --limit 10`
  - Build a grounded family-source queue from `capture-family-source-profiles.json`, bundle image variants, bundle references, atlas missing pages, and still-open family targets, then capture those family-specific source-material candidates directly.
- `npm run donor-scan:run-family-action -- --donor-id donor_XXX --family big_win --limit 10`
  - Execute the current family action from `capture-family-actions.json`. Capture-oriented families reuse the existing donor-scan capture runner; evidence/reconstruction families prepare grounded worksets, and `use-local-sources` families now also emit reconstruction-ready family bundles instead of stopping at an advisory note.

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
- `capture-target-families.json`
- `capture-blocker-families.json`
- `capture-family-source-profiles.json`
- `capture-family-actions.json`
- `family-action-run.json`
- `family-action-worksets/<family>.json`
- `family-reconstruction-bundles/<family>.json` for `use-local-sources` families
- `family-reconstruction-profiles.json`
- `family-reconstruction-maps.json`
- `family-reconstruction-sections.json`
- `next-capture-run.json`
- `package-graph.json`
- `blocker-summary.md`
- `scan-summary.json`

`bundle-asset-map.json` now preserves two kinds of grounded bundle evidence:

- ordinary resolved references extracted from bundle text
- structured `images:{...}` table metadata when a bundle exposes per-image variant suffix fields such as `e` and `f_e`

Those bundle image variants are recorded as evidence first. When loader/runtime code later proves the exact URL construction too, donor scan upgrades the same records with grounded `requestBaseUrl` and `variantUrls` entries, reports `bundleImageVariantUrlBuilderStatus` / `bundleImageVariantUrlCount` in `scan-summary.json`, and lets ranked capture targets reuse those exact optimized image URLs instead of only suffix-token evidence.

Donor scan now does the same kind of upgrade for translation roots when the donor bundle proves the loader rule. If the bundle exposes a concrete translation base such as `localeResourcesPath`, a grounded locale hint such as `defaultLanguage` or a rules URL locale segment, and a real `<base>/<locale>.json` fetch pattern, donor scan now writes grounded translation payload URLs into `bundle-asset-map.json`, reports `translationPayloadStatus` / `translationPayloadCount` in `scan-summary.json`, and lets ranked capture targets queue the exact locale JSON payload instead of only the bare translation root.

`request-backed-static-hints.json` is an optional supporting donor-scan artifact. When live runtime harvest evidence exists, donor scan normalizes exact request-backed static alternates there first and then reuses them in ranked capture targets.

`next-capture-targets.json` is the first actionable operator output. It ranks the missing runtime files the IDE should try to capture next, using atlas missing-page refs, unresolved runtime candidates, and missing bundle references. It now also carries grounded `alternateCaptureHints` so the scan can expose placeholder rewrites, bundle-backed rooted path variants, request-backed static alternates, image-family rooted path substitutions, and exact optimized bundle image URLs when the donor bundle proves the request-base rule. Atlas-page targets also keep atlas page order, so unsuffixed base pages are tried before later suffix pages when the metadata already proves that order.

`next-capture-run.json` records what the guided capture runner attempted, which exact URLs were tried, which URL actually downloaded when a fallback worked, what failed, and how many ranked targets still remain after donor scan was refreshed.

After a guided capture run, donor scan now feeds the latest failed attempts back into `next-capture-targets.json` too. That lets the IDE show which ranked targets are still blocked even after every grounded alternate URL in the latest run was already tried, and it now demotes those recently blocked dead ends below the next untried grounded targets. If a later donor-scan pass discovers new grounded alternate URLs for the same target, the target automatically reopens as actionable instead of staying falsely blocked on stale capture evidence.

When a ranked image target has exhausted only raw/direct grounded URLs and donor scan still has no stronger request-backed or bundle-image-variant path for it, the refreshed target now becomes `raw-payload-blocked`. That blocker class is meant to stop vague retry loops: it means the next move is deeper source discovery for that family, not another identical capture pass.

`capture-target-families.json` groups the whole ranked queue into reusable source families, with untried-vs-blocked counts, capture strategies, and location prefixes. Use it when the next move is family-level source discovery, not another scan of hundreds of flat URLs.

`capture-blocker-families.json` groups only the blocker-class targets into reusable source families such as `coin`, `big_win`, or `bird`, with target counts, sample URLs, capture strategies, and location prefixes. That makes the next operator step more practical: review blocker families, not just one long flat list of failed URLs.

`capture-family-source-profiles.json` turns those families into source-discovery dossiers. Each family now records its source state (`local-pages-complete`, `partial-local-pages`, `variant-backed`, `bundle-evidence-only`, or `raw-only`) plus exact evidence previews such as atlas manifest sources, local page paths, missing page URLs, same-family bundle references, same-family variant assets, newly captured local source assets, and the top untried or blocked target URLs. Use it when you need to answer “what source material do we actually have for this family?” before adding another capture rule.

`capture-family-actions.json` turns those dossiers into an operator queue. It maps meaningful families into reusable action lanes such as `use-local-sources`, `capture-family-sources`, `capture-missing-pages`, `review-bundle-evidence`, or `source-discovery-required`, then records a grounded reason, next step, and one sample evidence path or URL.

`donor-scan:run-family-action` is the executable layer on top of that queue. It keeps the same action classes, but now:

- `capture-family-sources` and `capture-missing-pages` reuse the capture runner automatically
- `use-local-sources`, `review-bundle-evidence`, and `source-discovery-required` write a prepared family workset instead of pretending the next step is another URL retry

`family-action-run.json` records the last executed family action, and `family-action-worksets/<family>.json` records the grounded evidence bundle for prepared families. When the family action class is `use-local-sources`, donor scan now also writes `family-reconstruction-bundles/<family>.json`, which normalizes the exact grounded local source files, atlas pages, bundle references, open targets, and next operator step for deeper reconstruction work. Use those reconstruction bundles when a family already has enough local source material to leave the URL-hunt lane.

`family-reconstruction-profiles.json` is the next generic step after those bundles. It parses the prepared family reconstruction bundles and tells the IDE whether a donor family is now ready for:

- Spine + atlas reconstruction
- atlas/frame import
- image-level reconstruction
- or manual source review

The file stays grounded: it only summarizes local sources donor scan already captured and normalized.

`family-reconstruction-maps.json` goes one step deeper for reconstruction-ready families. When local Spine JSON plus atlas text exist, donor scan now maps grounded slot/attachment evidence back to atlas regions and pages, counts mapped vs unmapped attachments, and records the next reconstruction step without inventing new runtime payloads.

`family-reconstruction-sections.json` is the next reusable step after those family-wide maps. It breaks one reconstruction-ready family down into grounded section units, currently using Spine skin groupings when that evidence exists, and records per-section mapped coverage, atlas page counts, animation names, and the next section-level reconstruction step.

`donor-scan:capture-family-sources` is the next step after that dossier. It does not invent new URLs. Instead, it turns the grounded family evidence back into a family-specific source-material queue, prioritizes optimized variant-backed and bundle-backed family assets before raw atlas-page retries, and refreshes donor scan after the run.

That reopened-target behavior is already proven on the live Mystery Garden donor: once donor scan started surfacing optimized variant URLs from bundle-backed sibling image families, guided capture successfully downloaded atlas-adjacent payloads such as `h1`, `h2`, `stick`, and `wild` from those newly grounded URLs.

The next generic proof step is now grounded too: when those same ranked atlas targets also carry stronger optimized alternates than their raw atlas-page URL, the guided capture runner now tries those stronger grounded URLs first. On the live Mystery Garden donor that pulled seven more atlas-adjacent payloads (`h3`, `key`, `m1`, `m2`, `m3`, `m4`, and `scatter`) and reduced `atlasMissingPageCount` from `27` to `20`.

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
