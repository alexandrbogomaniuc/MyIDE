# Donor Scan Tooling

Reusable donor-scan tooling for future games.

## Lifecycle Role

Donor scan now serves Stage 1 `Investigation` directly.

It combines:
- static donor scan
- bounded runtime/scenario capture
- scenario catalog generation
- scenario coverage classification
- structured investigation events
- next-action guidance
- operator-assist guidance
- explicit promotion into Modification

The key product distinction is explicit:
- Lane A: ready for reconstruction / modification
- Lane B: still blocked on source material

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
- `npm run donor-scan:static -- --donor-id donor_XXX --donor-name "NAME"`
  - Refresh the static donor-scan artifacts for a donor that already has local harvest data.
- `npm run donor-scan:scenario -- --donor-id donor_XXX --profile default-bet --minutes 5`
  - Run one bounded investigation profile, refresh the scenario capture log and event stream, and update stage handoff guidance.
- `npm run donor-scan:coverage -- --donor-id donor_XXX`
  - Refresh the scenario catalog, scenario coverage, next scenario targets, blocker summary, event stream, and investigation status without starting another bounded profile.
- `npm run donor-scan:promote -- --donor-id donor_XXX`
  - Promote reconstruction-ready families or sections into an explicit `modification-queue.json` instead of leaving readiness as an advisory-only state.
- `npm run project:prepare-modification -- --project-id project_001`
  - Resolve that donor-side queue into a project-facing `reports/modification-handoff.json` board so Compose/Runtime can start from the strongest grounded artifact per queued task.
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
- `npm run donor-scan:run-section-action -- --donor-id donor_XXX --section big_win/BW`
  - Prepare one grounded reconstruction section workset directly from `family-reconstruction-section-bundles.json` when a specific section is already ready to leave the family queue. That same action now also emits a normalized section reconstruction bundle, a section skin blueprint, a section skin render plan, a section skin material plan, a section skin material review bundle, a section skin page-match bundle, a section skin page-lock bundle, a section skin page-lock audit bundle, a section skin page-lock resolution bundle, a section skin page-lock decision bundle, a section skin page-lock review bundle, a section skin page-lock approval bundle, a section skin page-lock apply bundle, a section skin texture input bundle, a section skin texture-source plan, a section skin texture reconstruction bundle, a section skin texture-lock bundle, a section skin texture-assembly bundle, and refreshes the donor-wide section reconstruction/blueprint/render-plan/material-plan/material-review/page-match/page-lock/page-lock-audit/page-lock-resolution/page-lock-decision/page-lock-review/page-lock-approval/page-lock-apply/texture-input/texture-source/texture-reconstruction/texture-lock/texture-assembly profiles.

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
- `scenario-catalog.json`
- `scenario-coverage.json`
- `scenario-capture-log.json`
- `next-scenario-targets.json`
- `scenario-blocker-summary.md`
- `investigation-events.jsonl`
- `investigation-status.json`
- `reconstruction-ready-families.json`
- `modification-queue.json`
- `40_projects/<project_id>/reports/modification-handoff.json`
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
- `family-reconstruction-section-bundles.json`
- `section-action-run.json`
- `section-reconstruction-worksets/<family>--<section>.json`
- `section-reconstruction-bundles/<family>--<section>.json`
- `section-reconstruction-profiles.json`
- `section-skin-blueprints/<family>--<section>.json`
- `section-skin-blueprint-profiles.json`
- `section-skin-render-plans/<family>--<section>.json`
- `section-skin-render-plan-profiles.json`
- `section-skin-material-plans/<family>--<section>.json`
- `section-skin-material-plan-profiles.json`
- `section-skin-material-review-bundles/<family>--<section>.json`
- `section-skin-material-review-bundle-profiles.json`
- `section-skin-page-match-bundles/<family>--<section>.json`
- `section-skin-page-match-bundle-profiles.json`
- `section-skin-page-lock-bundles/<family>--<section>.json`
- `section-skin-page-lock-bundle-profiles.json`
- `section-skin-page-lock-audit-bundles/<family>--<section>.json`
- `section-skin-page-lock-audit-bundle-profiles.json`
- `section-skin-page-lock-resolution-bundles/<family>--<section>.json`
- `section-skin-page-lock-resolution-bundle-profiles.json`
- `section-skin-page-lock-decision-bundles/<family>--<section>.json`
- `section-skin-page-lock-decision-bundle-profiles.json`
- `section-skin-page-lock-review-bundles/<family>--<section>.json`
- `section-skin-page-lock-review-bundle-profiles.json`
- `section-skin-texture-input-bundles/<family>--<section>.json`
- `section-skin-texture-input-bundle-profiles.json`
- `section-skin-texture-source-plans/<family>--<section>.json`
- `section-skin-texture-source-plan-profiles.json`
- `section-skin-texture-reconstruction-bundles/<family>--<section>.json`
- `section-skin-texture-reconstruction-bundle-profiles.json`
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

`family-reconstruction-section-bundles.json` is the next reusable step after those section summaries. It turns each grounded section unit into a reconstruction input with exact local source counts, attachment lists, atlas page ownership, slot names, animation names, and the shared family reconstruction bundle path.

`donor-scan:run-section-action` is the executable layer on top of those section bundles. It writes `section-action-run.json` plus `section-reconstruction-worksets/<family>--<section>.json`, so one grounded section can move into deeper reconstruction without inventing a new capture lane or forcing the operator to reassemble the section by hand.

That same section action now also writes `section-reconstruction-bundles/<family>--<section>.json`, which groups one grounded section by atlas page and slot while preserving the mapped attachment set, local source evidence, and next reconstruction step. `section-reconstruction-profiles.json` is the compact donor-wide summary of those prepared section bundles.

That same section action now also writes `section-skin-blueprints/<family>--<section>.json`, which turns one grounded section reconstruction bundle into an ordered slot/page blueprint for deeper skin reconstruction. `section-skin-blueprint-profiles.json` is the compact donor-wide summary of those prepared section skin blueprints.

When a grounded local `.atlas` is present for that same section, the action now also writes `section-skin-render-plans/<family>--<section>.json`, which turns the ordered blueprint into layered render records with real atlas bounds, offsets, rotation, and page ownership. `section-skin-render-plan-profiles.json` is the compact donor-wide summary of those prepared section render plans.

That same section action now also writes `section-skin-material-plans/<family>--<section>.json`, which answers the next practical reconstruction question: does this section already have the exact atlas page images locally, or only ranked related local image candidates for each missing page? `section-skin-material-plan-profiles.json` is the compact donor-wide summary of those page-material readiness states.

That same section action now also writes `section-skin-material-review-bundles/<family>--<section>.json`, which turns those ranked page-material candidates into first-class per-page review rows with one recommended local image candidate, its score, and its grounded reasons for each missing atlas page. `section-skin-material-review-bundle-profiles.json` is the compact donor-wide summary of those review-ready section states.

That same section action now also writes `section-skin-page-match-bundles/<family>--<section>.json`, which turns those reviewed pages into proposed atlas page-image matches that can be locked before deeper texture reconstruction. `section-skin-page-match-bundle-profiles.json` is the compact donor-wide summary of those proposed-match section states.

That same section action now also writes `section-skin-page-lock-bundles/<family>--<section>.json`, which turns those proposed page-image matches into one explicit per-page lock/review surface before final texture reconstruction. `section-skin-page-lock-bundle-profiles.json` is the compact donor-wide summary of those states. When the state is `ready-for-page-lock-review`, the section is no longer blocked on source discovery, but the page-image assignments are still provisional until they are confirmed.

That same section action now also writes `section-skin-page-lock-audit-bundles/<family>--<section>.json`, which audits whether those page-image assignments are actually unique or whether multiple atlas pages still reuse the same local source. `section-skin-page-lock-audit-bundle-profiles.json` is the compact donor-wide summary of those states. When the state is `has-page-lock-conflicts`, the next step is duplicate-source review before final texture reconstruction.

That same section action now also writes `section-skin-page-lock-resolution-bundles/<family>--<section>.json`, which takes those duplicate-source audit rows plus the grounded material-review candidates and computes the best deterministic unique page-image proposal donor scan can make without inventing new evidence. `section-skin-page-lock-resolution-bundle-profiles.json` is the compact donor-wide summary of those states. When the state is `ready-with-unique-proposed-page-locks`, donor scan has found one unique local image proposal per atlas page, but an operator still needs to review and lock it.

That same section action now also writes `section-skin-page-lock-decision-bundles/<family>--<section>.json`, which joins those unique resolved page-image proposals back to the grounded candidate score/reason trail so operators can review one explicit decision row per atlas page before locking it. `section-skin-page-lock-decision-bundle-profiles.json` is the compact donor-wide summary of those states. When the state is `ready-for-lock-review`, donor scan has already resolved duplicate-source conflicts and the remaining step is operator approval of the selected unique page-image assignments.

That same section action now also writes `section-skin-page-lock-review-bundles/<family>--<section>.json`, which joins those selected page-image assignments to the affected slots, attachments, and atlas regions from the section render plan so operators can review the real section impact of each page lock before final approval. `section-skin-page-lock-review-bundle-profiles.json` is the compact donor-wide summary of those states.

That same section action now also writes `section-skin-page-lock-approval-bundles/<family>--<section>.json`, which turns that impact-aware review surface into one explicit approval unit per section. `section-skin-page-lock-approval-bundle-profiles.json` is the compact donor-wide summary of those states.

That same section action now also writes `section-skin-page-lock-apply-bundles/<family>--<section>.json`, which turns the approval-ready page-image assignments into one explicit downstream lock surface per section. `section-skin-page-lock-apply-bundle-profiles.json` is the compact donor-wide summary of those states. When the state is `ready-with-applied-page-locks`, the section is ready to leave page-lock review and move into downstream texture work.

That same section action now also writes `section-skin-texture-input-bundles/<family>--<section>.json`, which joins the page-lock surface and the downstream texture reconstruction records into one lock-aware texture input bundle per section. `section-skin-texture-input-bundle-profiles.json` is the compact donor-wide summary of those states. When the state is `ready-with-proposed-page-locks`, the bundle is usable for downstream prep but the page-image locks are still provisional until they are confirmed.

That same section action now also writes `section-skin-texture-source-plans/<family>--<section>.json`, which packages exact or proposed atlas page-image assignments into one downstream texture-source input per section. `section-skin-texture-source-plan-profiles.json` is the compact donor-wide summary of those texture-source states. When the state is `ready-with-proposed-page-sources`, the plan is usable for downstream prep but the page-image matches are still provisional until they are locked.

That same section action now also writes `section-skin-texture-reconstruction-bundles/<family>--<section>.json`, which joins the texture-source plan back to atlas geometry and per-layer render records so downstream reconstruction work can consume one structured section bundle instead of rejoining those artifacts manually. `section-skin-texture-reconstruction-bundle-profiles.json` is the compact donor-wide summary of those states. When the state is `ready-with-proposed-page-sources`, the bundle is usable for provisional downstream reconstruction but the page-image matches are still not locked.

That same section action now also writes `section-skin-texture-lock-bundles/<family>--<section>.json`, which applies the approved page-lock surface back onto the section’s texture layers so downstream reconstruction work can consume one lock-aware final texture bundle instead of a provisional page-source bundle. `section-skin-texture-lock-bundle-profiles.json` is the compact donor-wide summary of those states. When the state is `ready-with-applied-page-locks`, the next blocker is final texture reconstruction, not page-lock cleanup or source hunting.

That same section action now also writes `section-skin-texture-assembly-bundles/<family>--<section>.json`, which turns that lock-aware layer bundle into one explicit per-page final texture assembly handoff with locked local source paths plus grouped page-region records. `section-skin-texture-assembly-bundle-profiles.json` is the compact donor-wide summary of those states. When the state is `ready-for-applied-texture-assembly`, the next step is final texture reconstruction rather than more page-lock review or source hunting.

That same section action now also writes `section-skin-texture-render-bundles/<family>--<section>.json`, which turns that assembly handoff into one explicit page-size-aware render bundle with one render-ready row per atlas page. `section-skin-texture-render-bundle-profiles.json` is the compact donor-wide summary of those states. When the state is `ready-for-applied-page-texture-render`, the next step is final texture reconstruction with locked page sources plus atlas page dimensions, not more page-lock review or source hunting.

That same section action now also writes `section-skin-texture-canvas-bundles/<family>--<section>.json`, which turns that render handoff into one explicit per-page canvas-operation bundle with ordered draw operations, atlas geometry, and one locked local source per atlas page. `section-skin-texture-canvas-bundle-profiles.json` is the compact donor-wide summary of those states. When the state is `ready-for-applied-page-canvas-reconstruction`, the next step is final texture reconstruction from explicit page-canvas operations, not more page-lock review or source hunting.

That same section action now also writes `section-skin-texture-source-fit-bundles/<family>--<section>.json`, which compares those locked local page sources against the atlas page dimensions and records exact-fit, uniform-scale, non-uniform-scale, or missing-dimension states per atlas page. `section-skin-texture-source-fit-bundle-profiles.json` is the compact donor-wide summary of those states. When the state is `ready-with-non-uniform-page-source-fits`, the next blocker is no longer source hunting or page-lock cleanup; it is explicit fit review before final texture reconstruction.

For those non-uniform sections, the same section action now also writes `section-skin-texture-fit-review-bundles/<family>--<section>.json`, which packages concrete contain, cover, and stretch transform options per atlas page using the locked local source dimensions and atlas page sizes. `section-skin-texture-fit-review-bundle-profiles.json` is the compact donor-wide summary of those review-ready sections. When the state is `ready-for-fit-transform-review`, the blocker is no longer “some page does not fit”; it is “review the concrete fit-transform options before final texture reconstruction.”

After that review seam, donor scan now also writes `section-skin-texture-fit-decision-bundles/<family>--<section>.json`, which proposes one grounded fit mode per atlas page using page occupancy plus contain/cover/stretch penalty comparisons. `section-skin-texture-fit-decision-bundle-profiles.json` is the donor-wide summary of those decision-ready sections. When the state is `ready-for-fit-decision-review`, the blocker is no longer “compare three raw transforms”; it is “review the proposed fit decision before final texture reconstruction.”

After the decision seam, donor scan now also writes `section-skin-texture-fit-approval-bundles/<family>--<section>.json`, which packages the selected transform per atlas page together with affected-layer context from the section render plan. `section-skin-texture-fit-approval-bundle-profiles.json` is the donor-wide summary of those approval-ready sections. When the state is `ready-for-fit-approval`, the blocker is no longer “pick a transform”; it is “approve the selected transform before final texture reconstruction.”

After the approval seam, donor scan now also writes `section-skin-texture-fit-apply-bundles/<family>--<section>.json`, which turns those approved per-page transform choices into one explicit downstream applied-fit handoff. `section-skin-texture-fit-apply-bundle-profiles.json` is the donor-wide summary of those applied sections. When the state is `ready-with-applied-fit-transforms`, the blocker is no longer “approve the transform”; it is “use the applied fit surface for final texture reconstruction.”

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
