# Current Build: How To Use It

Use this when you want to test the current MyIDE build exactly as it works today.

## Lifecycle Stages
1. Investigation
2. Modification / Compose / Runtime
3. Math / Config
4. GS Export

For the current build, Investigation is the important new truth surface. Use it to review donor scan state, runtime scan state, scenario coverage, blocked families, next profile, operator-assist guidance, and promotion readiness before switching into compose/runtime work.

## Investigation Quick Path
1. Run `npm run donor-scan:url -- --donor-id donor_001_mystery_garden --donor-name "Mystery Garden"` if the donor harvest needs a refresh.
2. Run `npm run donor-scan:coverage -- --donor-id donor_001_mystery_garden` to refresh investigation artifacts.
3. Run one bounded profile such as `npm run donor-scan:scenario -- --donor-id donor_001_mystery_garden --profile default-bet --minutes 5`.
4. Open the shell and use the `Investigation` panel to review coverage, blocked families, the next IDE self-investigation profile, the next manual-assist action, and promotion readiness.
5. When the panel shows ready candidates, run `npm run donor-scan:promote -- --donor-id donor_001_mystery_garden` or use **Promote Ready Families** in the shell.
6. Then run `npm run project:prepare-modification -- --project-id project_001` or use **Prepare Modification Board** in the shell so the promoted donor queue becomes explicit compose/runtime tasks for the project.
7. Once the modification board is ready, use **Start Task**, **Open Compose**, or **Open Runtime** from that board instead of continuing to scan the same ready section endlessly.
8. If the task exposes grounded donor-backed task-kit images, use **Show Task Kit** to focus that ready section in the donor palette or **Import Task Kit** to move straight into bounded compose work from the task itself.
9. Once a task kit has been imported, **Start Task** and **Open Compose** now reopen that grouped scene section directly instead of dropping you back onto a generic compose surface.

## 1. Launch The Current Build
1. Finder double-click daily start: `./run/Start-MyIDE-Workbench.command`.
2. Finder double-click clean demo/test start: `./run/Start-MyIDE-Workbench-Clean.command`.
3. Finder double-click runtime-only debug start: `./run/Open-Runtime-Debug-Host.command`.
4. Finder double-click safe runtime refresh: `./run/Refresh-Runtime-Assets.command`.
5. Terminal equivalents:
   - `./run/start-workbench.sh`
   - `./run/start-workbench-clean.sh`
   - `./run/open-runtime-debug-host.sh`
   - `./run/refresh-runtime-assets.sh`
6. If you still need the raw commands, the scripts wrap these existing repo commands:
   - `manual:prepare:project_001`
   - `donor-assets:index:project_001`
   - `runtime:harvest:project_001`
   - `runtime:debug:project_001`
   - `dev`
7. Runtime debug rule:
   - `./run/Open-Runtime-Debug-Host.command` and `npm run runtime:debug:project_001` are the interactive runtime window path.
   - `npm run smoke:electron-runtime-debug` is the automated proof harness.

Recommended rule:
- If you are unsure, double-click `./run/Start-MyIDE-Workbench.command`.
- Use the clean launcher only when you intentionally want a clean `project_001` baseline.

## 2. Open The Validated Project
1. In the shell, use **Project Browser**.
2. Open `project_001` (`Mystery Garden Replay Slice`).
3. If the list looks stale, click **Rescan Workspace**.

## 2A. Start A New Project From A Donor URL
1. In **New Project**, fill in:
   - **Display Name**
   - **Slug**
   - **Donor Reference / ID**
   - **Donor Launch URL** if you already have one
   - **Target / Resulting Game**
2. Click **Create Project**.
3. MyIDE now does two things:
   - scaffolds the project under `40_projects/<slug>/`
   - scaffolds the shared donor pack under `10_donors/<donorId>/`
4. If a launch URL was supplied, MyIDE also captures:
   - `raw/bootstrap/launch.html`
   - `raw/bootstrap/launch-request.json`
   - `raw/discovered/discovered-urls.json`
   - `reports/DONOR_INTAKE_REPORT.md`
   - `evidence/local_only/harvest/asset-manifest.json`
   - `evidence/local_only/harvest/entry-points.json`
   - `evidence/local_only/harvest/url-inventory.json`
   - `evidence/local_only/harvest/package-manifest.json`
   - `evidence/local_only/harvest/package-graph.json`
   - `evidence/local_only/harvest/runtime-candidates.json`
   - `evidence/local_only/harvest/bundle-asset-map.json`
   - `evidence/local_only/harvest/atlas-manifests.json`
   - `evidence/local_only/harvest/next-capture-targets.json`
   - `evidence/local_only/harvest/next-capture-run.json` after guided capture is used
   - `evidence/local_only/harvest/blocker-summary.md`
   - `evidence/local_only/harvest/scan-summary.json`
   - downloaded bounded recursive static assets under `evidence/local_only/harvest/files/`
5. The donor panel now surfaces the donor scan summary too, so you can see scan state, runtime candidate count, atlas metadata count, bundle-map status, bundle image-variant status/counts, grounded bundle-image URL rule status/counts, grounded translation-payload status/counts, mirror status, top next capture targets, grounded alternate hint counts, last guided capture result, blocker summary, and the next operator action without opening raw JSON first.
6. If a donor has grounded runtime request evidence, donor scan now also writes `evidence/local_only/harvest/request-backed-static-hints.json` and shows the request-backed alternate count in the shell before you run guided capture.
7. Use **Run Guided Capture** when you want MyIDE to attempt the top ranked missing donor/runtime files automatically and then refresh donor scan. The capture runner now also rewrites grounded placeholder-style paths such as `_resourcesPath_...`, uses any request-backed static alternates already discovered, reuses grounded optimized variant URLs when bundle metadata plus loader rules prove them, prefers those stronger grounded alternates before the raw atlas-page URL when they exist, and records every alternate URL it tried before a target stays blocked.
8. After a guided capture run, donor scan now feeds the latest failed attempt evidence back into the ranked target list. If a target shows as recently blocked, the current grounded URLs were already tried and the next step is deeper source discovery rather than repeating the same capture blindly. If donor scan later discovers new grounded alternate URLs for that same target, it now reopens the target automatically instead of leaving it stuck as blocked forever.
9. If donor scan also marks a target or family as **raw-payload blocked**, the latest guided capture already exhausted only raw/direct grounded URLs for that blocker class and donor scan still has no stronger grounded alternate. Treat that as a source-discovery blocker, not as a signal to rerun the same capture again.
10. Use **Capture `<family>` sources** or `npm run donor-scan:capture-family-sources -- --donor-id donor_XXX --family big_win --limit 10` when one family dossier already has grounded bundle/variant/atlas evidence but the flat ranked queue is not the best next operator view. This path captures family-specific source-material candidates directly and then refreshes donor scan.
11. Use **Prepare `<family>` workset** from the donor-scan family action queue, or run `npm run donor-scan:run-family-action -- --donor-id donor_XXX --family big_win --limit 10`, when a family already has grounded local sources or strong bundle evidence. Capture-style family actions reuse donor-scan capture automatically; evidence/reconstruction family actions write a prepared workset under `evidence/local_only/harvest/family-action-worksets/`, and `use-local-sources` families now also write a normalized reconstruction bundle under `evidence/local_only/harvest/family-reconstruction-bundles/`.
12. After a `use-local-sources` family action, donor scan now also writes `evidence/local_only/harvest/family-reconstruction-profiles.json`. Use that file or the shell donor-scan summary when you want to know whether a prepared family is already ready for Spine+atlas reconstruction, atlas/frame import, or image-level reconstruction from grounded local sources.
13. Donor scan now also writes `evidence/local_only/harvest/family-reconstruction-maps.json` for reconstruction-ready families. Use that when you want the next deeper truth: grounded mapped-vs-unmapped attachment coverage against local atlas regions/pages, not just a high-level readiness label.
14. Donor scan now also writes `evidence/local_only/harvest/family-reconstruction-sections.json` for reconstruction-ready families. Use that when you want the next reusable unit after family-wide attachment coverage: grounded section keys such as Spine skin groupings, with per-section mapped coverage and atlas page counts.
15. Donor scan now also writes `evidence/local_only/harvest/family-reconstruction-section-bundles.json` for reconstruction-ready families. Use that when you want a section-level reconstruction input that already carries exact local source counts, attachment lists, atlas page ownership, and the shared family reconstruction bundle path.
16. Use **Prepare Section** from the donor-scan reconstruction-section rows, or run `npm run donor-scan:run-section-action -- --donor-id donor_XXX --section big_win/BW`, when one grounded reconstruction section is already ready to leave the family-level queue. This writes `evidence/local_only/harvest/section-action-run.json` plus a normalized section workset under `evidence/local_only/harvest/section-reconstruction-worksets/`.
17. That same section action now also writes `evidence/local_only/harvest/section-reconstruction-bundles/<family>--<section>.json` plus `evidence/local_only/harvest/section-reconstruction-profiles.json`. Use those when you want page-grouped and slot-grouped section reconstruction inputs instead of the flatter workset view.
18. That same section action now also writes `evidence/local_only/harvest/section-skin-blueprints/<family>--<section>.json` plus `evidence/local_only/harvest/section-skin-blueprint-profiles.json`. Use those when you want ordered slot/page skin reconstruction inputs instead of stopping at the broader section reconstruction bundle.
19. When that section also has a grounded local `.atlas`, the same section action now writes `evidence/local_only/harvest/section-skin-render-plans/<family>--<section>.json` plus `evidence/local_only/harvest/section-skin-render-plan-profiles.json`. Use those when you need ordered section render layers with real atlas bounds/rotation instead of only slot/page names.
20. That same section action now also writes `evidence/local_only/harvest/section-skin-material-plans/<family>--<section>.json` plus `evidence/local_only/harvest/section-skin-material-plan-profiles.json`. Use those when you need the honest page-image blocker state for a section: exact atlas page images present locally vs only ranked related image candidates per missing page vs still missing source material.
21. The next layer now also writes `evidence/local_only/harvest/section-skin-material-review-bundles/<family>--<section>.json` plus `evidence/local_only/harvest/section-skin-material-review-bundle-profiles.json`. Use those when you want each missing atlas page broken into a first-class review row with one recommended local image candidate, its score, and its grounded reasons before deeper texture reconstruction.
22. The next layer now also writes `evidence/local_only/harvest/section-skin-page-match-bundles/<family>--<section>.json` plus `evidence/local_only/harvest/section-skin-page-match-bundle-profiles.json`. Use those when you want donor scan to turn each reviewed page into one proposed atlas page-image match that can be locked before deeper section/skin reconstruction.
23. The next layer now also writes `evidence/local_only/harvest/section-skin-page-lock-bundles/<family>--<section>.json` plus `evidence/local_only/harvest/section-skin-page-lock-bundle-profiles.json`. Use those when you want one explicit per-page lock/review bundle before final texture reconstruction. If the state is `ready-for-page-lock-review`, the page-image assignments are still proposed and need confirmation.
24. The next layer now also writes `evidence/local_only/harvest/section-skin-page-lock-audit-bundles/<family>--<section>.json` plus `evidence/local_only/harvest/section-skin-page-lock-audit-bundle-profiles.json`. Use those when you want donor scan to detect duplicate page-image reuse before final texture reconstruction. If the state is `has-page-lock-conflicts`, multiple atlas pages still point at the same local source and need review.
25. The next layer now also writes `evidence/local_only/harvest/section-skin-page-lock-resolution-bundles/<family>--<section>.json` plus `evidence/local_only/harvest/section-skin-page-lock-resolution-bundle-profiles.json`. Use those when you want donor scan to turn duplicate-source audit rows into a deterministic unique page-image proposal using the grounded ranked candidates already captured for that section. If the state is `ready-with-unique-proposed-page-locks`, donor scan found one unique local image proposal per atlas page, but an operator still needs to review and lock it.
26. The next layer now also writes `evidence/local_only/harvest/section-skin-page-lock-decision-bundles/<family>--<section>.json` plus `evidence/local_only/harvest/section-skin-page-lock-decision-bundle-profiles.json`. Use those when you want one operator-ready decision pack per section with the selected local path, candidate score, and grounded reasons for each atlas page. If the state is `ready-for-lock-review`, the next step is page-lock review, not more conflict resolution or source hunting.
27. The next layer now also writes `evidence/local_only/harvest/section-skin-page-lock-review-bundles/<family>--<section>.json` plus `evidence/local_only/harvest/section-skin-page-lock-review-bundle-profiles.json`. Use those when you want the selected page-image assignments joined to the affected slots, attachments, and atlas regions before final page-lock approval.
28. The next layer now also writes `evidence/local_only/harvest/section-skin-page-lock-approval-bundles/<family>--<section>.json` plus `evidence/local_only/harvest/section-skin-page-lock-approval-bundle-profiles.json`. Use those when you want one explicit approval unit per section after the impact-aware review. If the state is `ready-for-page-lock-approval`, the next step is approval, not more source hunting.
29. The next layer now also writes `evidence/local_only/harvest/section-skin-page-lock-apply-bundles/<family>--<section>.json` plus `evidence/local_only/harvest/section-skin-page-lock-apply-bundle-profiles.json`. Use those when you want one explicit downstream lock surface per section after approval. If the state is `ready-with-applied-page-locks`, the next blocker is downstream texture reconstruction rather than source hunting.
30. The next layer now also writes `evidence/local_only/harvest/section-skin-texture-input-bundles/<family>--<section>.json` plus `evidence/local_only/harvest/section-skin-texture-input-bundle-profiles.json`. Use those when you want one lock-aware downstream texture input per section. If the state is `ready-with-proposed-page-locks`, the section is usable for downstream prep but the page-image locks are still provisional.
31. The next layer now also writes `evidence/local_only/harvest/section-skin-texture-source-plans/<family>--<section>.json` plus `evidence/local_only/harvest/section-skin-texture-source-plan-profiles.json`. Use those when you want one structured downstream texture-source input per section. If the state is `ready-with-proposed-page-sources`, treat it as provisional until the atlas page-image matches are locked.
32. The next layer now also writes `evidence/local_only/harvest/section-skin-texture-reconstruction-bundles/<family>--<section>.json` plus `evidence/local_only/harvest/section-skin-texture-reconstruction-bundle-profiles.json`. Use those when you want per-layer reconstruction-ready geometry plus source-path assignments. If the state is `ready-with-proposed-page-sources`, treat the bundle as provisional until the atlas page-image matches are locked.
33. The next layer now also writes `evidence/local_only/harvest/section-skin-texture-lock-bundles/<family>--<section>.json` plus `evidence/local_only/harvest/section-skin-texture-lock-bundle-profiles.json`. Use those when you want one final texture-ready bundle that applies the approved page-lock set back onto the section's texture layers. If the state is `ready-with-applied-page-locks`, the section is ready for final texture reconstruction rather than more page-image review or source hunting.
34. The next layer now also writes `evidence/local_only/harvest/section-skin-texture-assembly-bundles/<family>--<section>.json` plus `evidence/local_only/harvest/section-skin-texture-assembly-bundle-profiles.json`. Use those when you want one explicit per-page final texture assembly handoff after the page-lock set has already been applied. If the state is `ready-for-applied-texture-assembly`, the section is ready for final texture reconstruction rather than more page-image review or source hunting.
35. The next layer now also writes `evidence/local_only/harvest/section-skin-texture-render-bundles/<family>--<section>.json` plus `evidence/local_only/harvest/section-skin-texture-render-bundle-profiles.json`. Use those when you want one explicit page-size-aware render bundle for final texture reconstruction. If the state is `ready-for-applied-page-texture-render`, the section already has one locked local source per atlas page plus atlas page dimensions and render-ready page rows.
36. The next layer now also writes `evidence/local_only/harvest/section-skin-texture-canvas-bundles/<family>--<section>.json` plus `evidence/local_only/harvest/section-skin-texture-canvas-bundle-profiles.json`. Use those when you want one explicit per-page canvas-operation bundle for final texture reconstruction. If the state is `ready-for-applied-page-canvas-reconstruction`, the section already has one locked local source per atlas page, atlas page dimensions, and ordered draw operations.
37. The next layer now also writes `evidence/local_only/harvest/section-skin-texture-source-fit-bundles/<family>--<section>.json` plus `evidence/local_only/harvest/section-skin-texture-source-fit-bundle-profiles.json`. Use those when you need donor scan to prove whether the locked local page sources actually fit the atlas page dimensions cleanly. If the state is `ready-with-non-uniform-page-source-fits`, the section is no longer blocked on source discovery, but it still needs explicit fit review before final texture reconstruction.
38. For those non-uniform sections, donor scan now also writes `evidence/local_only/harvest/section-skin-texture-fit-review-bundles/<family>--<section>.json` plus `evidence/local_only/harvest/section-skin-texture-fit-review-bundle-profiles.json`. Use those to review concrete contain/cover/stretch transform options and their scale deltas before final texture reconstruction.
39. Donor scan now also writes `evidence/local_only/harvest/section-skin-texture-fit-decision-bundles/<family>--<section>.json` plus `evidence/local_only/harvest/section-skin-texture-fit-decision-bundle-profiles.json`. Use those to review the single proposed grounded fit decision per atlas page before final texture reconstruction.
40. Donor scan now also writes `evidence/local_only/harvest/section-skin-texture-fit-approval-bundles/<family>--<section>.json` plus `evidence/local_only/harvest/section-skin-texture-fit-approval-bundle-profiles.json`. Use those to review the selected transform per atlas page together with affected-layer context before final texture reconstruction.
41. Donor scan now also writes `evidence/local_only/harvest/section-skin-texture-fit-apply-bundles/<family>--<section>.json` plus `evidence/local_only/harvest/section-skin-texture-fit-apply-bundle-profiles.json`. Use those once the selected fit transforms are accepted and you want one explicit applied-transform handoff for final texture reconstruction.
19. Donor scan now also writes `evidence/local_only/harvest/capture-blocker-families.json`, which groups those blocker-class targets into reusable families such as `coin`, `big_win`, or `bird`. Use that file or the donor panel summary when you want to review blocked source families instead of reading one long flat URL list.
17. Donor scan now also writes `evidence/local_only/harvest/capture-target-families.json`, which groups the active next-capture queue by family too. Use that when you want to focus source discovery on the next untried family block, not just on individual URLs.
18. If you already know which family you want to attack, run family-focused guided capture instead of the flat queue:
   - in the shell, use one of the new donor-scan family buttons such as `big_win`, `bird`, or `coin`
   - or run `npm run donor-scan:capture-family -- --donor-id donor_XXX --family big_win --limit 10`
19. Family-focused capture still uses the same grounded alternate rules and blocker feedback as the flat guided-capture runner. It does not invent new sources; it just lets you work family-by-family.
20. In the current `project_001` proof donor, that reopened-atlas logic let guided capture pull four missing atlas-adjacent payloads (`h1`, `h2`, `stick`, and `wild`) from optimized bundle-backed sibling image families, reducing the missing atlas page count from `31` to `27`.
21. The next generic guided-capture pass on the same donor then pulled seven more atlas-adjacent payloads (`h3`, `key`, `m1`, `m2`, `m3`, `m4`, and `scatter`) once stronger grounded optimized URLs were tried before the raw atlas-page URL, reducing the missing atlas page count again from `27` to `20`.
22. The refreshed ranked list now also demotes those recently blocked dead ends, so the next untried grounded targets become the top guided-capture candidates automatically.
23. Atlas-page targets now also preserve atlas page order in that ranked list, so the base page is attempted before later suffixed atlas pages when the captured metadata already proves that order.
6. Downloaded package-graph images now join the donor asset palette automatically, grouped by harvested runtime/package scene kit, so you can drag one image at a time or use **Import Scene Kit To Compose** for a whole captured family of editable donor-backed objects instead of keeping them stuck in read-only capture files.
7. Imported scene sections now show their strongest grounded runtime link too. Use **Open Runtime Group** from the Scene Sections banner or the selected-object inspector when you want one grouped Compose section to jump back into the Runtime workbench.
8. When a scene section has a grounded runtime-backed static candidate, the same grouped section now shows **Create Override** / **Clear Override** actions so you can keep the override flow attached to that higher-level imported game part instead of hunting in the flat runtime asset list first.
9. Scene sections now also expose reconstruction-kit provenance. In the Scene Sections banner, selected-object inspector, and Runtime workbench you can now read donor asset counts, evidence-ref counts, source categories, capture sessions, and copy a grouped provenance summary for the current imported game-part section.
10. Scene sections now also expose section-level working controls. Use **Frame Section** to center one imported game-part section in Compose and **Show Section Evidence** to jump the whole grouped section back into donor evidence instead of chasing one asset at a time.
11. Scene sections now also expose a stronger game-part summary and **Show Section Assets**, so a grouped section can jump back to its donor asset kit and carry a clearer readiness label such as donor-backed, evidence-backed, runtime-linked, or override-ready.
12. Scene sections now also expose **Duplicate Section** and **Delete Section**, so one imported grouped game-part kit can be copied or removed as a bounded section-level edit instead of forcing one object at a time.
13. Scene sections now also expose **Center Section** and **Restore Suggested Layer**, so one imported grouped game-part kit can be repositioned in the viewport or moved back to its inferred scene-kit layer without breaking the grouped section structure.
14. Scene sections now also expose **Reset Section Layout**, so one imported grouped game-part kit can be repacked into its inferred scene-kit layout around the current section anchor instead of manually re-spacing each child object.
15. Scene sections now also expose grouped **Hide/Show Section** and **Lock/Unlock Section**, so one imported grouped game-part kit can be hidden, revealed, frozen, or reopened for editing without toggling each child object separately.
16. Scene sections now also expose grouped **Scale Section Up** and **Scale Section Down**, so one imported grouped game-part kit can be resized around its current section center as a bounded edit instead of scaling each child object manually.
17. Scene sections now also expose **Restore Section Defaults**, so one imported grouped game-part kit can return to a clean baseline in one action: visible, unlocked, reset to its inferred scene-kit layout, back to 100% scale, and restored to its suggested layer when available.
18. Scene sections now also expose a session-only **Solo Section** view, so one imported grouped game-part kit can temporarily take over the viewport and scene explorer without changing saved visibility or layer rules.
19. Scene sections now also expose **Send Section Backward** and **Bring Section Forward**, so one imported grouped game-part kit can move through the layer stack as a bounded grouped section instead of reordering child objects one by one.
20. This is still only a bounded donor-package slice. It does not yet recurse through the full runtime package or expose full game logic as editable objects.
21. Deep donor-scan result for `project_001`:
   - strong partial local runtime package: yes
   - full standalone local donor runtime package: no
   - atlas/frame metadata present locally: yes
   - atlas/frame import from current local files: no
   - current atlas/frame blocker: referenced page images and deeper runtime payloads are still missing locally
   - next best source-discovery path: chase the bundle-discovered runtime metadata family `img/spines/*.json`, `img/coins/coin.json`, `img/ui/logo.png`, and translation roots into the local donor/runtime boundary

## 3. Runtime Mode Is The Primary Workflow
1. `project_001` now opens into **Runtime** mode when the grounded donor runtime entry is available.
2. Use the new **Workflow Hub** in the left column to switch the side context between **Runtime**, **Donor**, **Compose**, **VABS**, and **Project** without hunting through one long stack of panels.
3. Runtime Mode is the main working surface; **Compose** mode is the bounded secondary workflow.
4. Use **Launch Runtime** to open the recorded Mystery Garden donor runtime inside the shell.
4. Use **Launch Runtime** to open the bounded local Mystery Garden runtime mirror inside the shell when it is available on this machine.
5. Use **Reload Runtime** to refresh the runtime surface.
6. Use **Click To Start** if the donor runtime needs one bounded pointer click to begin.
7. Use **Spin / Trigger** if you want the bounded runtime action path that currently sends `Space` to the runtime surface.
8. Use **Use Debug Host** from the Runtime toolbar as the primary runtime action.
9. The dedicated Runtime Debug Host loads the same local mirror in a separate window and is the current path that can prove a request-backed static image override hit.
10. Use **Pick / Inspect** and then click the live runtime surface when you need the strongest grounded runtime trace available inside the shell.
11. Read the right-hand inspector and runtime asset workbench for picked target, request-backed source priority, runtime/display-object trace when exposed, texture/frame info when exposed, runtime URL, local mirror file path when grounded, the current runtime resource-map record, override eligibility, and supporting evidence refs.
12. Use the new runtime bridge actions in the inspector or workbench to:
   - focus the strongest grounded donor asset card
   - focus the strongest grounded donor evidence entry
   - focus a related compose object if one already exists for that donor-linked asset
13. If the picked runtime trace or runtime asset workbench shows **Eligible static image override**, click **Create Override**.
14. The embedded runtime reloads immediately, and you should reopen or keep using **Use Debug Host** for the strongest override-hit confirmation path.
15. Use **Clear Override** if you want to restore the original donor runtime asset.
16. Use **Show Runtime Note** or **Show Init Response** to jump back to the grounded runtime evidence behind the current Runtime Mode slice.

## 4. Where Donor Evidence Appears
1. In the shell, donor content appears in **Donor Assets & Evidence**.
2. On a typical window size, that panel sits in the **left column below Project Browser**.
3. If you do not see it immediately, scroll the left column down.
4. The donor area now has two bounded parts:
   - a donor asset palette for supported local donor images
   - the existing read-only donor evidence drill-down for refs, sessions, and linkage
5. The donor asset palette now supports quick search, format filters such as `PNG` and `WEBP`, and a visible donor import target layer control.

## 5. Scene Mode Is Still Available
1. Use the **Compose** tab in the workbench mode bar when you want the bounded internal compositor instead of the live donor runtime.
2. Compose Mode is where donor images can still be composed into the internal scene, replaced onto existing objects, resized, aligned, distributed, saved, and reloaded.

## 6. What You Can Edit Today
You can edit the reconstructed internal scene for `project_001` in **Compose** mode, including new donor-backed image objects created from the donor asset palette.

Current editable workflow:
- select objects from the scene list or canvas
- create placeholder objects from the preset picker
- choose the donor import target layer in **Donor Assets & Evidence**
- drag one supported donor image asset from **Donor Assets & Evidence** into empty canvas space to create a new internal image object on that target layer
- drag a second supported donor image asset into the canvas if you want to confirm multiple donor-backed imports in one session
- drag one supported donor image asset directly over an editable canvas object if you want to replace it while keeping the same object slot, layer, and layout
- use **Replace Selected Object** on a donor asset card if you want the bounded button path instead of direct drop-to-replace
- drag a marquee box across visible canvas objects if you want a bounded multi-select path
- use `Shift`/`Cmd` click in the scene list or canvas if you want to add or remove one object from the current selection
- move objects on the canvas
- change bounded inspector fields
- resize placeholder-backed objects
- resize donor-backed imported image objects with the small bottom-right canvas handle on the selected donor-backed image
- align or distribute the current multi-selection from the canvas toolbar
- use **Show Asset In Palette** or **Show Evidence** from the donor summary on a selected donor-backed object if you want to jump back to donor source context quickly
- use **Show Scene Kit In Palette** or **Select This Scene Kit** from the donor-backed inspector summary if you want to jump back to the imported donor kit or reselect that whole grouped kit in one step
- use the new **Scene Sections** row in the scene explorer if you want to select one imported donor section as a whole working set before moving/resizing/alignment work
- use **Open Runtime Context** from a selected donor-backed runtime screenshot object if you want to move straight back to Runtime Mode
- use **Duplicate Section** or **Delete Section** from the Scene Sections banner, selected-object inspector, or Runtime workbench when you want to treat one imported grouped game-part kit as one bounded editing unit
- use **Center Section** when you want to move one grouped game-part kit back into the middle of the editable viewport without dragging each child object separately
- use **Reset Section Layout** when you want one grouped game-part kit to snap back into its inferred scene-kit spacing around the current section anchor
- use **Hide Section** or **Show Section** when you want to temporarily remove one grouped game-part kit from the editable scene or bring it back as a bounded unit
- use **Lock Section** or **Unlock Section** when you want to freeze one grouped game-part kit against accidental edits or reopen it for grouped editing
- use **Scale Section Up** or **Scale Section Down** when you want one grouped game-part kit to grow or shrink around its current section center without touching every child object one by one
- use **Restore Section Defaults** when you want one grouped game-part kit to snap back to a clean working baseline without chaining several section actions manually
- use **Solo Section** when you want to focus on one imported grouped game-part kit in isolation without saving new visibility changes into the project
- use **Send Section Backward** or **Bring Section Forward** when you want one grouped game-part kit to move through its current layer stack as one unit instead of reordering each child object by hand
- use **Restore Suggested Layer** when you want one grouped section to jump back to its inferred scene-kit target layer instead of reassigning every child object one by one
- align placeholder-backed objects to the viewport
- reassign objects between unlocked layers
- reorder objects within the current layer
- duplicate and delete objects
- undo and redo
- save and reload

The live editable source is still:
- `40_projects/project_001/internal/scene.json`
- `40_projects/project_001/internal/layers.json`
- `40_projects/project_001/internal/objects.json`

Save still syncs the replay-facing:
- `40_projects/project_001/project.json`

## 7. What Is Still Blocked
You still cannot edit donor source files directly, and the current runtime-first slice has real limits.

Current hard limits:
- there is still no captured full local donor runtime package for `project_001`
- Runtime Mode now prefers a bounded local runtime mirror when it is available, but that mirror still depends on the live donor launch upstream for launch HTML/token/API state
- the first static override slice works only for grounded static runtime image URLs that the current runtime trace can prove and that match a supported donor image file type
- when Runtime Mode uses the local mirror, the shell can now trace one grounded static runtime candidate back to a local mirror file path and show the current request map; no unresolved upstream bootstrap/static dependency remains in the current bounded cycle, the embedded runtime tap now proves a local `bundle.js` hit, direct local launch inspection proves the mirror can serve local static assets, but the embedded Runtime Mode slice still does not confirm a request-backed static override hit
- the embedded runtime webview is still weaker for live asset-level proof, so the bounded dedicated Runtime Debug Host is now the official runtime work mode for `project_001`
- the strongest previously verified embedded-runtime proof is still the reason it stays secondary: `frameCount=0`, `accessibleFrameCount=0`, `canvasCount=0`, resource window labels stay at `top`, and no request-backed static image or display-object handle is exposed in the bounded embedded slice
- the dedicated Runtime Debug Host is the stronger proof path in daily use: it can surface a request-backed static image candidate from the local mirror and prove a bounded project-local override hit after reload
- pause, resume, and step only work if the embedded runtime exposes a stable ticker-like hook; if it does not, the shell shows the blocker instead of faking the control
- only `project_001` is supported in this slice
- only static donor image files are supported
- atlas/frame donor import is blocked in this build because the required atlas page images and deeper runtime payloads are still missing locally for `project_001`
- the deep donor scan now proves local atlas/frame metadata exists and bundle-discovered runtime metadata paths are grounded, so atlas/frame import is blocked by missing payloads rather than parser/UI code
- no animation import
- no audio/video import
- no raw donor file mutation

The donor file remains read-only evidence. Runtime Mode can now create one bounded project-local static override, but it still does not edit raw donor files or donor runtime package files directly. Donor drag/drop in Compose Mode still creates a new internal scene object that preserves donor linkage.

## 8. Runtime Override Loop
1. Stay in **Runtime** mode.
2. Click **Use Debug Host**.
3. Use **Pick / Inspect** and click the live runtime surface.
4. Confirm the inspector or runtime asset workbench shows:
   - `Runtime Source: Local mirror` when the bounded mirror is available
   - a request-backed runtime source first when one exists, otherwise the strongest grounded local mirror candidate path
   - a runtime resource-map record for the current launch/reload cycle when one has been captured
   - whether the current trace is override-eligible
5. Click **Create Override**.
6. Wait for the embedded runtime to reload and keep using the Debug Host window for the strongest confirmation path.
7. Read the **Project-local Overrides** card, the active override detail in the inspector, or the selected runtime asset entry in the workbench.
8. If the current slice reports a blocker for the local mirrored candidate instead of a reload-time hit, treat that as the current honest limit rather than a silent failure.
9. Watch the `Inspection Bridge` card in Runtime Mode:
   - `main-world-execute-js` means the new preferred bridge attached
   - `guest-preload` means the shell fell back to the older isolated bridge
10. The current strongest blocker is still explicit: the request map is real, the embedded runtime tap proves a local `bundle.js` hit, the bounded local mirror can serve local static assets in a direct local launch, the strongest previously verified embedded bridge still proves `frameCount=0`, `accessibleFrameCount=0`, `canvasCount=0`, and the strongest current embedded Runtime Mode image candidate is still only mirror-manifest-backed rather than request-backed.
10. Use **Clear Override** when you want to restore the original runtime asset.
11. The override file stays under `40_projects/project_001/overrides/`, and raw donor files under `10_donors/` stay untouched.

## 9. Save / Reload Loop For Scene Composition
1. Switch to **Compose** mode.
2. Optionally choose a donor import target layer first.
3. Drag one donor image into empty canvas space.
4. If both `png` and `webp` donor assets are visible in the palette, import one of each for the stronger bounded donor proof.
5. Optionally drag a donor image over an existing editable object to replace it directly.
6. Drag a marquee box across two or more visible objects, or refine the selection with `Shift`/`Cmd` click from the scene list.
7. Use one or two toolbar composition actions such as **Align Left**, **Align Top**, **Align Center Horizontally**, **Distribute Horizontally**, or **Distribute Vertically**.
8. Select one donor-backed image and drag its small bottom-right resize handle if you want to test bounded direct manipulation.
9. Use **Show Asset In Palette**, **Show Evidence**, or **Open Runtime Context** from the donor summary if you want to confirm the unified bridge behavior.
10. Click **Save Scene Changes** or use `Ctrl/Cmd+S`.
11. Check that the editor state returns to **Saved**.
12. Click **Reload From Disk**.
13. Confirm the imported or replaced donor-backed objects still appear after reload, on the intended layer, with donor linkage details intact.

## 10. If You Hit A Bug
1. Stop after the first clear failure.
2. Run `npm run manual:bug-bundle`.
3. Add screenshots or exports into the new `attachments/` folder.
4. Fill in `BUG.md`.
5. If you only need a short paste-friendly status block, run `npm run manual:bug-context`.
