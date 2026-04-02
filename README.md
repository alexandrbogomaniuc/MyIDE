# MyIDE

MyIDE is a universal local-first IDE for multiple game projects over time, with a desktop web UI for collecting donor evidence, reconstructing each project into a clean internal model, replaying that model locally, and preparing a project-specific target or resulting game path.

## Lifecycle Backbone

The target workflow is now explicit:

1. Investigation
2. Modification / Compose / Runtime
3. Math / Config
4. GS Export

Investigation is now a first-class IDE stage. It combines static donor scan, bounded runtime/scenario capture, scenario coverage, blocked-family reporting, next-profile guidance, operator-assist guidance, and an explicit handoff queue into Modification.

The operational rule is now:
- Lane A: ready for reconstruction / modification
- Lane B: still blocked on source material or scenario coverage

The IDE now tries bounded self-investigation first, then tells the operator what to do next, and only then promotes ready families/sections into Modification.

Once a project modification board exists, the next step is no longer another donor-only report: operators can start a prepared task and let the shell move into Compose or Runtime with the strongest grounded task context it can match.

Prepared tasks can now also expose donor-backed task kits in the donor palette, so ready sections are not limited to a status row. When the grounded section bundle carries local image sources, the shell can show **Show Task Kit** and **Import Task Kit** for that task and reuse the existing grouped donor import flow in Compose.

After a task kit has been imported once, the same prepared task now reopens that grouped Compose section directly, so Lane A work can keep moving on the strongest real editing surface instead of falling back to a generic board row.

When one grouped section is selected in Compose, the inspector can now surface task-aware edit actions for that active Modification task, including task-local replace actions that preserve layout while staying on the same grouped section.

If that task is grounded by a page-fit artifact such as the `big_win/BW` fit-apply bundle, the same inspector now also shows page-aware reconstruction cues: lead page name, fit mode, strongest affected slot or attachment, and a page-local **Use This Page Source** action when the selected object can be swapped from that grounded page source directly.

Those page-aware cards can now either select the best single grouped Compose member for that grounded page cue or widen out to all grouped members already tied to the same grounded page source, so the operator can move from a page cue to the right section members on the current surface without falling back to donor hunting.

The same page-aware cards can now also jump straight to the grounded donor asset or donor evidence behind that page cue, then return to the active grouped Compose section to continue editing on the same task surface.

Those same page-aware cards can now also jump into runtime proof from the active task surface: when a page-linked runtime source is already grounded, they open that exact runtime trace in Runtime Mode; otherwise they can launch the dedicated Runtime Debug Host without leaving the modification workflow.

That dedicated Debug Host path is now also page-scoped for the active task cue, so the `big_win/BW` guide can land on an upstream `big-win` runtime asset such as `big-win-ribbon.png_80_80.webp` and prove the bounded override hit after reload even when that page asset was not part of the original local mirror manifest.

After that page-scoped proof succeeds, the same page card now upgrades into a direct **Open Page Runtime** link for that proved source, and task-level **Open Runtime** reuses the same page-scoped runtime trace instead of sending the operator back through Debug Host again.

That proved page-scoped runtime link now also survives a workspace reload for the same project: once the active task has been saved and reloaded, the same page card and task-level runtime action still reuse the proved `big-win` runtime source instead of forcing another Debug Host pass.

## Current Phase
- Current milestone: IDE-LIFECYCLE-A lifecycle backbone on top of the existing runtime-first shell, donor scan, and compose/runtime proving slices.
- Active validated donor slice: `donor_001_mystery_garden`.
- Proven replay scope: one bounded Mystery Garden slice driven only by internal project data under `40_projects/project_001`.
- Runtime-first donor workflow now exists for `project_001`: Runtime Mode launches the strongest grounded Mystery Garden donor runtime surface inside the shell and keeps the live runtime surface as the main viewport in that mode, while Compose Mode keeps the bounded internal compositor available as the secondary workflow.
- The shell now includes a workflow hub and left-rail context switcher so Runtime, Donor, Compose, VABS, and Project setup no longer feel like one long stacked wall of unrelated panels.
- Runtime pick/inspect now bridges into the strongest grounded donor source context available: runtime evidence always, a best supporting donor screenshot when only phase-level proof exists, and a related compose object when one is already donor-linked in the internal scene.
- Runtime Mode now prefers a bounded local Mystery Garden runtime mirror when it is available on this machine, with the recorded donor demo entry kept only as the live launch/token upstream dependency for that mirror.
- Runtime pick/inspect now also exposes one bounded static asset override slice for grounded static Mystery Garden runtime image URLs: the shell can create a project-local override under `40_projects/project_001/overrides/`, reload the runtime without cache, and keep raw donor files untouched.
- Runtime Mode now records a bounded local runtime resource map for `project_001` that captures requested runtime URLs, the matched local mirror file when one exists, project-local override paths when one is active, and hit counts for the current launch/reload cycle.
- `npm run runtime:harvest:project_001` now performs a safe local mirror refresh from the strongest already-known runtime evidence and reports any existing machine-readable request map at `40_projects/project_001/runtime/local-mirror/request-log.latest.json` without launching Electron smoke windows.
- `npm run runtime:harvest:smoke:project_001` is the explicit maintenance variant that first runs the Runtime Debug Host smoke, then refreshes the mirror from that request-backed runtime evidence.
- The current strongest local-runtime proof is narrower and better grounded: the local mirror now serves the observed launch path by default on this machine, the bounded slice leaves no unresolved upstream bootstrap/static dependency in the current launch/start/spin cycle, the embedded runtime request tap now proves a real local `bundle.js` hit inside Runtime Mode, and direct local launch inspection proves the same mirror can serve local static preloader images.
- The shell now has one official runtime workbench path for `project_001`: the bounded dedicated Runtime Debug Host loads the same local mirror in a separate BrowserWindow, anchors the runtime asset/request workbench inside the shell, and is the path to use when runtime asset tracing or override proof matters.
- The current dedicated Runtime Debug Host proof is grounded again after a real blocker fix: mirrored module/runtime assets now return cross-origin-safe headers from the local mirror, so the host can recover a request-backed local static image candidate such as `preloader-assets/logo-lights.png`, prove a bounded project-local override hit after reload, and include console/load diagnostics when that path blocks again.
- The generic **New Project** flow is no longer donor-name-only: it can now accept a donor launch URL, scaffold the shared donor pack under `10_donors/<donorId>/`, capture the donor launch HTML in sanitized form, write a bounded discovered URL inventory, download bounded recursively discovered static assets into the local-only donor pack, and generate a donor-package manifest that summarizes entry points, hosts, families, and unresolved references for follow-up evidence work.
- Donor intake now also runs a first-class generic donor-scan subsystem that writes `entry-points.json`, `url-inventory.json`, `runtime-candidates.json`, `bundle-asset-map.json`, `atlas-manifests.json`, `blocker-summary.md`, and `scan-summary.json` under the donor harvest root, then feeds those results back into project metadata and the shell.
- Donor scan now also preserves structured bundle image-variant metadata from bundle `images:{...}` tables when a donor exposes them, so the IDE can report how many logical runtime image entries and suffix tokens are grounded locally without guessing final optimized URLs.
- When the donor bundle also proves the real loader rule for those images, donor scan now upgrades that evidence into grounded optimized image request URLs too. In the current proven Mystery Garden slice, the scan now reports `bundleImageVariantUrlBuilderStatus=mapped` and `bundleImageVariantUrlCount=385`, then feeds those exact optimized variant URLs back into ranked capture targets instead of leaving them trapped inside bundle metadata.
- Donor scan now also promotes grounded translation-loader rules into concrete locale JSON payload URLs when the donor bundle proves both the translation root and the `<base>/<locale>.json` fetch pattern. In the current Mystery Garden slice, that now surfaces `translationPayloadStatus=mapped` and a grounded `https://translations.bgaming-network.com/MysteryGarden/en.json` payload target instead of only the bare translation root.
- Donor scan now also writes `next-capture-targets.json`, so the IDE can rank the missing runtime files it should try to capture next instead of stopping at a generic blocker note. Those ranked targets now also carry grounded alternate capture hints when donor scan can prove placeholder rewrites, bundle-backed rooted path variants, or same-family rooted path substitutions from repeated exact matches.
- Donor scan now also writes `capture-target-families.json`, and the shell can run guided capture against one ranked family at a time. That makes grouped source families like `big_win`, `bird`, `coin`, or `FS_popups` first-class operator units instead of leaving the next-capture lane as one long flat queue.
- Donor scan now also normalizes optional runtime request evidence into `request-backed-static-hints.json`, so future games can surface exact request-backed static alternates when a live runtime harvest really observed them. Those request-backed alternates also feed the same family-alias inference that ranked capture targets already use.
- Donor scan now also has a guided capture runner: `npm run donor-scan:capture-next -- --donor-id donor_XXX --limit 5` attempts the top ranked missing donor/runtime files, rewrites grounded placeholder-style paths such as `_resourcesPath_...` when possible, tries the strongest grounded alternates first when bundle-image-variant or request-backed hints exist, writes `next-capture-run.json`, refreshes donor scan, and tells the operator whether the blocker queue actually shrank.
- Donor scan now also has a grounded family-source capture runner: `npm run donor-scan:capture-family-sources -- --donor-id donor_XXX --family big_win --limit 10` turns one family dossier back into a reusable source-material queue and captures variant-backed, bundle-backed, atlas-missing, or still-open family URLs without inventing new hosts or filenames.
- Donor scan now also has a generic family-action runner: `npm run donor-scan:run-family-action -- --donor-id donor_XXX --family big_win --limit 10` executes the current family action queue directly. Capture-oriented families reuse donor-scan capture; evidence/reconstruction families prepare grounded family worksets, and `use-local-sources` families now also emit reconstruction-ready family bundles instead of stopping at advisory source notes.
- Donor scan now also parses those reconstruction bundles into `family-reconstruction-profiles.json`, so the IDE can tell when a family is ready for Spine+atlas reconstruction, atlas/frame import, or image-level reconstruction using already captured local source files instead of more URL heuristics.
- Donor scan now also writes `family-reconstruction-maps.json` for those reconstruction-ready families, so the IDE can show grounded slot/attachment coverage against local atlas regions and pages before deeper reconstruction work starts.
- Donor scan now also writes `family-reconstruction-sections.json`, so one reconstruction-ready family can break down into grounded section units such as Spine skin groupings before any editor-side reconstruction work starts.
- Donor scan now also writes `family-reconstruction-section-bundles.json`, so those grounded section units become reusable reconstruction inputs with exact local source counts, attachment lists, atlas page ownership, and shared family reconstruction bundle paths.
- Donor scan now also has a generic section-action runner: `npm run donor-scan:run-section-action -- --donor-id donor_XXX --section big_win/BW` prepares one grounded reconstruction section workset directly from `family-reconstruction-section-bundles.json`, so section-level reconstruction can start from a reusable donor artifact instead of another ad hoc source hunt.
- That same section action now also emits `section-reconstruction-bundles/<family>--<section>.json` plus `section-reconstruction-profiles.json`, so one grounded section moves from “prepared workset” to a normalized reconstruction bundle with page/slot groupings before deeper section or skin reconstruction starts.
- That same section action now also emits `section-skin-blueprints/<family>--<section>.json` plus `section-skin-blueprint-profiles.json`, so one grounded section also gets an ordered slot/page reconstruction blueprint before deeper skin reconstruction starts.
- It now goes one step further and emits `section-skin-render-plans/<family>--<section>.json` plus `section-skin-render-plan-profiles.json`, which turn that ordered blueprint into layered section render records with grounded atlas geometry when a local `.atlas` exists.
- It now also emits `section-skin-material-plans/<family>--<section>.json` plus `section-skin-material-plan-profiles.json`, which show whether a reconstruction-ready section actually has the exact atlas page images locally or only ranked related image candidates for page review.
- The next donor-scan seam now also emits `section-skin-material-review-bundles/<family>--<section>.json` plus `section-skin-material-review-bundle-profiles.json`, which turn those ranked page candidates into first-class per-page review units with one recommended local image candidate per missing atlas page.
- The next donor-scan seam now also emits `section-skin-page-match-bundles/<family>--<section>.json` plus `section-skin-page-match-bundle-profiles.json`, which turn those review-ready pages into proposed atlas page-image matches that can be locked before deeper texture reconstruction.
- It now also emits `section-skin-page-lock-bundles/<family>--<section>.json` plus `section-skin-page-lock-bundle-profiles.json`, which turn those proposed page-image matches into one explicit per-page lock/review bundle. When the state is `ready-for-page-lock-review`, the section is no longer blocked on source discovery, but the page-image locks are still provisional until an operator confirms them.
- It now also emits `section-skin-page-lock-audit-bundles/<family>--<section>.json` plus `section-skin-page-lock-audit-bundle-profiles.json`, which audit whether those page-image locks are actually unique or whether multiple atlas pages still reuse the same local source. When the state is `has-page-lock-conflicts`, the next step is duplicate-source review, not final texture reconstruction.
- It now also emits `section-skin-page-lock-resolution-bundles/<family>--<section>.json` plus `section-skin-page-lock-resolution-bundle-profiles.json`, which turn those duplicate-source audit rows into a deterministic unique-assignment proposal using the grounded ranked page candidates already captured for that section. When the state is `ready-with-unique-proposed-page-locks`, donor scan has found one unique local image proposal per atlas page, but an operator still needs to review and lock it.
- It now also emits `section-skin-page-lock-decision-bundles/<family>--<section>.json` plus `section-skin-page-lock-decision-bundle-profiles.json`, which turn those resolved unique assignments into an operator-ready decision pack with the chosen local path, candidate score, and grounded reasons per atlas page. When the state is `ready-for-lock-review`, the section is ready for final page-lock review instead of more conflict resolution or source hunting.
- It now also emits `section-skin-page-lock-review-bundles/<family>--<section>.json` plus `section-skin-page-lock-review-bundle-profiles.json`, which add the affected slots, attachments, and atlas regions for each selected page-image assignment so operators can review lock choices with real section impact instead of only candidate scores.
- It now also emits `section-skin-page-lock-approval-bundles/<family>--<section>.json` plus `section-skin-page-lock-approval-bundle-profiles.json`, which turn that impact-aware review surface into one explicit approval unit per section. When the state is `ready-for-page-lock-approval`, the section is waiting on approval, not more source discovery.
- It now also emits `section-skin-page-lock-apply-bundles/<family>--<section>.json` plus `section-skin-page-lock-apply-bundle-profiles.json`, which turn the approval-ready page-image assignments into one explicit downstream lock surface per section. When the state is `ready-with-applied-page-locks`, the next blocker is downstream texture reconstruction, not source hunting.
- It now also emits `section-skin-texture-lock-bundles/<family>--<section>.json` plus `section-skin-texture-lock-bundle-profiles.json`, which apply that page-lock surface back onto the section’s texture layers so downstream reconstruction can consume one lock-aware final texture bundle instead of a provisional page-source bundle. When the state is `ready-with-applied-page-locks`, the section is ready to leave page-lock review and move into final texture reconstruction.
- It now also emits `section-skin-texture-assembly-bundles/<family>--<section>.json` plus `section-skin-texture-assembly-bundle-profiles.json`, which turn that lock-aware layer bundle into one explicit per-page final texture assembly handoff. When the state is `ready-for-applied-texture-assembly`, the section is ready for final texture reconstruction with unique locked local page sources and per-page region assembly records.
- It now also emits `section-skin-texture-render-bundles/<family>--<section>.json` plus `section-skin-texture-render-bundle-profiles.json`, which turn that assembly handoff into one explicit page-size-aware render surface for final texture reconstruction. When the state is `ready-for-applied-page-texture-render`, the section is carrying locked local page sources, atlas page dimensions, and render-ready page records in one downstream bundle.
- It now also emits `section-skin-texture-canvas-bundles/<family>--<section>.json` plus `section-skin-texture-canvas-bundle-profiles.json`, which turn that render surface into one explicit per-page canvas-operation handoff for final texture reconstruction. When the state is `ready-for-applied-page-canvas-reconstruction`, the section is carrying locked local page sources, atlas page dimensions, and ordered draw operations in one downstream bundle.
- It now also emits `section-skin-texture-source-fit-bundles/<family>--<section>.json` plus `section-skin-texture-source-fit-bundle-profiles.json`, which compare those locked local page sources against the atlas page dimensions and classify each page as exact-fit, uniformly scalable, non-uniform, or missing-dimension. That keeps donor scan honest about whether “canvas-ready” really means “copy-ready.”
- When a section lands in `ready-with-non-uniform-page-source-fits`, donor scan now also writes `section-skin-texture-fit-review-bundles/<family>--<section>.json` plus `section-skin-texture-fit-review-bundle-profiles.json`, so the next blocker becomes explicit contain/cover/stretch fit review with real scale metrics instead of a vague mismatch warning.
- Donor scan now also writes `section-skin-texture-fit-decision-bundles/<family>--<section>.json` plus `section-skin-texture-fit-decision-bundle-profiles.json`, which proposes one grounded fit mode per atlas page and turns the blocker from raw option comparison into fit-decision review.
- Donor scan now also writes `section-skin-texture-fit-approval-bundles/<family>--<section>.json` plus `section-skin-texture-fit-approval-bundle-profiles.json`, which packages the chosen transform per atlas page together with affected-layer context so the next blocker becomes explicit fit approval instead of raw penalty comparison.
- Donor scan now also writes `section-skin-texture-fit-apply-bundles/<family>--<section>.json` plus `section-skin-texture-fit-apply-bundle-profiles.json`, which turns that approved fit choice into one downstream applied-transform surface for final texture reconstruction. When the state is `ready-with-applied-fit-transforms`, the section is past fit review and ready to hand those transforms downstream.
- It now also emits `section-skin-texture-input-bundles/<family>--<section>.json` plus `section-skin-texture-input-bundle-profiles.json`, which turn the page-lock surface and the downstream texture reconstruction records into one lock-aware texture input bundle. When the state is `ready-with-proposed-page-locks`, the section is usable for downstream prep, but the page-image locks are still provisional.
- It now also emits `section-skin-texture-source-plans/<family>--<section>.json` plus `section-skin-texture-source-plan-profiles.json`, which package those exact or proposed atlas page-image assignments into one structured downstream texture-source input. When the state is `ready-with-proposed-page-sources`, that plan is usable for downstream reconstruction prep but the page matches are still not final.
- It now also emits `section-skin-texture-reconstruction-bundles/<family>--<section>.json` plus `section-skin-texture-reconstruction-bundle-profiles.json`, which join the section texture-source plan back to atlas geometry and per-layer render records. When the state is `ready-with-proposed-page-sources`, that bundle is usable as provisional downstream texture-reconstruction input but the page-image locks are still not final.
- Guided capture failure evidence now feeds back into donor scan too, so ranked targets can show when the latest guided capture already exhausted the current grounded URL attempts and the operator should switch to deeper source discovery instead of repeating the same run.
- Donor scan now also classifies `raw-payload-blocked` image targets when guided capture has already exhausted only raw/direct grounded URLs for them and no stronger grounded alternate path exists yet, so the operator can stop treating those families as near-term capture wins.
- Donor scan now also groups those dead ends into `capture-blocker-families.json`, so the IDE can say “the `coin`, `big_win`, or `bird` family is blocked” instead of only dumping a flat list of failed URLs.
- Donor scan now also writes `capture-target-families.json`, so the IDE can show the active capture queue as source families like `big_win`, `bird`, or `coin` instead of only a flat next-target list.
- Ranked next-capture targets now stay actionable after a partial run too: donor scan demotes recently blocked dead ends below the next untried grounded targets instead of pinning already-proven 404s at the top forever.
- Ranked atlas-page targets now also preserve atlas page order, so donor scan tries the base atlas page before later suffixed page variants when the captured atlas metadata already proves that sequence.
- Ranked atlas-page targets now also reopen automatically when donor scan discovers new grounded alternate URLs for them. In the current Mystery Garden proof donor, that let guided capture pull four missing atlas-adjacent payloads (`h1`, `h2`, `stick`, and `wild`) from optimized bundle-backed sibling image families instead of staying stuck on the raw missing atlas page URLs alone.
- After that reopened-atlas step, the same generic capture ordering also proved out on the next Mystery Garden pass: trying grounded optimized alternates before the raw atlas URL pulled seven more atlas-adjacent payloads (`h3`, `key`, `m1`, `m2`, `m3`, `m4`, and `scatter`) and reduced the missing atlas-page count from `27` to `20`.
- The new deep donor scan now answers the next product-direction question plainly for `project_001`: a strong bounded partial local runtime package already exists, a full standalone local donor runtime package still does not, atlas/frame metadata now exists locally, atlas/frame import is still blocked on missing atlas page images and deeper runtime payloads, and the next best source-discovery path is the bundle-discovered runtime metadata family (`img/spines/*.json`, `img/coins/coin.json`, `img/ui/logo.png`, translation roots).
- The current strongest previously verified embedded-runtime result is still explicit: `frameCount=0`, `accessibleFrameCount=0`, `canvasCount=0`, the only observed resource window is `top`, and the embedded path still does not expose a request-backed static image or display-object handle for override proof.
- The decisive product conclusion is now clearer: embedded Runtime Mode remains weaker and secondary for this slice, while the dedicated Runtime Debug Host is the official day-to-day runtime workflow for asset tracing, source jumps, compose bridging, and override proof in the current validated slice.
- There is still no captured full local donor runtime package for `project_001`, so Runtime Mode currently uses a partial local mirror rather than pretending a complete local donor bundle exists.
- Proven editor scope: open `project_001`, inspect the internal scene/layer/object list, create placeholder objects from a small preset set, drag/nudge with optional snap, align supported placeholder-backed objects to viewport edges/centers, reassign editable objects between unlocked layers, edit bounded properties including placeholder width/height, reorder editable objects within a layer, read the selected object's order position within its layer, step to the previous/next object within that layer, use quick session-only layer isolation for focused editing, zoom/pan/reset/fit the viewport without dirtying project state, duplicate/delete, undo/redo, save, reload, prove deterministic sync updates the replay-facing `project.json`, prove the live Electron shell can load `project_001` through a working preload bridge, prove one bounded renderer-driven inspector edit/save/reload cycle through the real Electron shell path, prove one bounded live-shell canvas drag/save/reload cycle for an existing object, prove one bounded live-shell create -> drag -> save -> reload cycle for a newly created placeholder object, prove one bounded live-shell create -> duplicate/delete -> save -> reload cycle for a newly created placeholder object, prove one bounded live-shell create -> reorder -> save -> reload cycle for a newly created placeholder object, prove one bounded live-shell create -> layer reassignment -> save -> reload cycle for a newly created placeholder object, prove one bounded live-shell create -> resize -> save -> reload cycle for a newly created placeholder object, prove one bounded live-shell create -> align -> save -> reload cycle for a newly created placeholder object, and prove one bounded live-shell create -> drag -> undo -> redo -> save -> reload cycle for a newly created placeholder object through the same real shell path.
- GS VABS support now starts as a separate strategy/scaffold/validation module on top of that editor. It does not replace the current internal-scene authoring flow.

## Core Rules
- The product architecture is universal and multi-project.
- One project equals one donor-to-release cycle.
- The current implementation slice is slot-only.
- V1 is single-user.
- The editable source of truth is the internal clean project model, not donor atlas/json/runtime files.
- Raw donor material remains read-only evidence and is not read by preview runtime.
- Public git excludes raw donor/runtime downloads when hashes and sanitized notes are sufficient.

## Public Repo Contents
- Control docs, schemas, importer code, shell code, replay fixtures, workspace registry files, and validation tooling.
- Evidence indexes, hashes, inventories, and honest capture notes.
- Sanitized donor reports with evidence IDs.
- Project metadata that explains donor -> internal model -> target/resulting game relationships.
- Standard project folder templates and lifecycle docs for adding new projects by folder.
- Donor URL intake now writes a bounded donor-package graph under `10_donors/<donorId>/evidence/local_only/harvest/package-graph.json` so the captured donor surface is summarized as nodes, edges, and unresolved entries instead of only flat download counts.
- Donor intake now also writes a reusable donor scan summary under `10_donors/<donorId>/evidence/local_only/harvest/scan-summary.json`, plus machine-readable entry-point, inventory, runtime-candidate, bundle-map, atlas-manifest, and blocker-summary artifacts that future games can reuse.
- Harvested package-graph images now carry package-family grouping into the donor asset palette, so captured runtime/package image bundles can be imported into Compose as grouped donor-backed scene kits instead of only one flat image card at a time.
- Imported donor scene kits now stay visible as grouped Compose working sets: selected donor-backed objects can show which scene kit they belong to, jump back to the scene kit in the donor palette, and reselect the current kit members in one action.
- Compose now surfaces imported donor scene kits as named scene sections in the scene explorer, so grouped donor-backed parts can be selected and edited as one higher-level working set instead of disappearing into a flat object list.
- Those named scene sections now carry their strongest grounded runtime link too, so you can move from one imported section into the Runtime workbench through **Open Runtime Group** instead of losing runtime context at the editor boundary.
- Those runtime-linked scene sections now also surface grouped override readiness, so one imported game-part section can show whether it already has a grounded static override candidate and can trigger **Create Override** or **Clear Override** without dropping back to the flat runtime asset list first.
- Those same scene sections now surface reconstruction-kit provenance inside both Compose and Runtime, including donor asset counts, evidence-ref counts, source categories, capture sessions, and copyable grouped provenance summaries.
- Those same scene sections now expose section-level working controls too, including **Frame Section** for Compose viewport focus and **Show Section Evidence** for grouped donor evidence jumps, so one imported section behaves more like a workable game-part kit.
- Those same scene sections now also expose a stronger game-part summary and a direct **Show Section Assets** action, so one grouped section can jump back to its donor asset kit and carry a clearer grouped readiness label such as donor-backed, evidence-backed, runtime-linked, or override-ready.
- Those same scene sections now also support **Duplicate Section** and **Delete Section**, so one imported game-part kit can be copied or removed as a grouped working unit instead of forcing one-object-at-a-time cleanup.
- Those same scene sections now also support **Center Section** and **Restore Suggested Layer**, so one grouped game-part kit can be repositioned or moved back to its inferred scene-kit layer without breaking the preserved section structure.
- Those same scene sections now also support **Reset Section Layout**, so one grouped game-part kit can be repacked into its inferred scene-kit layout around the current section anchor instead of dragging each child object back into place by hand.
- Those same scene sections now also support grouped **Hide/Show Section** and **Lock/Unlock Section**, so one imported game-part kit can be hidden, revealed, frozen, or reopened for editing without toggling every child object separately.
- Those same scene sections now also support grouped **Scale Section Up** and **Scale Section Down**, so one imported game-part kit can be resized as a bounded section-level unit around its current center instead of scaling every child object separately.
- Those same scene sections now also support **Restore Section Defaults**, so one imported game-part kit can be returned to a clean working baseline in one action: visible, unlocked, reset to its inferred scene-kit layout, back to 100% scale, and moved to its suggested layer when available.
- Those same scene sections now also support a session-only **Solo Section** view, so one imported game-part kit can take over the viewport and scene explorer without changing saved object visibility or layer state.
- Those same scene sections now also support **Send Section Backward** and **Bring Section Forward**, so one imported game-part kit can move through the layer stack as a grouped unit instead of reordering child objects one by one.
- Those harvested package-graph image nodes can now appear in the shell donor asset palette as importable editable-image candidates, so new donor-URL projects are no longer limited to the older hand-indexed donor image set.

## Public Repo Exclusions
- Raw donor downloads and runtime payload bodies.
- Session-specific runtime identifiers, tokens, cookies, and private local notes.
- Local-only capture artifacts that are unnecessary for architecture validation.

Public publication rules are defined in [`00_control/PUBLIC_REPO_POLICY.md`](./00_control/PUBLIC_REPO_POLICY.md).

## Local Verification
- `npm run build`
- `npm run typecheck`
- `npm run generate:registry`
- `npm run manual:status`
- `npm run manual:prepare:project_001`
- `npm run manual:bug-context`
- `npm run manual:bug-bundle`
- `npm run manual:reset:project_001`
- `npm run donor:intake:url -- --donor-id donor_003_example --donor-name "Example Donor" --url "https://demo.example.com/play/Game/FUN?server=demo"`
- `npm run donor-scan:url -- --donor-id donor_001_mystery_garden --donor-name "Mystery Garden"`
- `npm run donor-scan:static -- --donor-id donor_001_mystery_garden --donor-name "Mystery Garden"`
- `npm run donor-scan:scenario -- --donor-id donor_001_mystery_garden --profile default-bet --minutes 5`
- `npm run donor-scan:coverage -- --donor-id donor_001_mystery_garden`
- `npm run donor-scan:promote -- --donor-id donor_001_mystery_garden`
- `npm run project:prepare-modification -- --project-id project_001`
- `npm run donor-scan:run-family-action -- --donor-id donor_001_mystery_garden --family big_win --limit 10`
- `npm run donor-scan:run-section-action -- --donor-id donor_001_mystery_garden --section big_win/BW`
- `npm run donor-scan:verify -- --donor-id donor_001_mystery_garden`
- `npm run smoke:donor-scan-investigation`
- `npm run smoke:donor-scan-promotion`
- `npm run smoke:project-modification-handoff`
- `npm run smoke:modification-task-kit`
- `npm run runtime:mirror:project_001`
- `npm run runtime:harvest:project_001`
- `npm run runtime:harvest:smoke:project_001`
- `npm run donor-assets:index:project_001`
- `npm run donor-assets:verify-override:project_001`
- `npm run vabs:scaffold:project_001`
- `npm run vabs:intake:project_001`
- `npm run vabs:sanitize:project_001`
- `npm run vabs:verify:captured:project_001`
- `npm run vabs:intake:session:project_001`
- `npm run vabs:sanitize:session:project_001`
- `npm run vabs:verify:captured-session:project_001`
- `npm run vabs:verify:project_001`
- `npm run vabs:compare:project_001`
- `npm run vabs:export:project_001`
- `npm run vabs:verify:export:project_001`
- `npm run vabs:preview:project_001`
- `npm run vabs:mock:project_001`
- `npm run vabs:smoke:project_001`
- `npm run vabs:replay:project_001`
- `npm run publication:preflight`
- `npm run publication:compare`
- `npm run automation:status-snapshot`
- `npm run automation:check-freshness`
- `npm run handoff:refresh`
- `npm run handoff:verify`
- `npm run create:project -- --config 40_projects/templates/project-template/project.meta.json.example --project-root 40_projects/project_003`
- `npm run smoke:create-project`
- `npm run smoke:donor-scan-family-action`
- `npm run smoke:donor-scan-section-action`
- `npm run smoke:edit-project`
- `npm run smoke:create-object`
- `npm run smoke:order-isolate`
- `npm run smoke:layer-navigation`
- `npm run smoke:viewport-controls`
- `npm run smoke:electron-bridge`
- `npm run smoke:electron-live-persist`
- `npm run smoke:electron-live-drag`
- `npm run smoke:electron-live-create-drag`
- `npm run smoke:electron-live-duplicate-delete`
- `npm run smoke:electron-live-reorder`
- `npm run smoke:electron-live-layer-reassign`
- `npm run smoke:electron-live-resize`
- `npm run smoke:electron-live-align`
- `npm run smoke:electron-live-undo-redo`
- `npm run smoke:electron-donor-import`
- `npm run smoke:electron-runtime-mode`
- `npm run import:mystery-garden`
- `npm run validate:workspace`
- `npm run verify:workspace`
- `npm run verify:project_001`

## Publication Control
- Use `npm run publication:preflight` to confirm whether this host can publish right now instead of assuming the answer.
- [`00_control/PUBLICATION_PLAYBOOK.md`](./00_control/PUBLICATION_PLAYBOOK.md) explains the repeatable publication and handoff flow.
- [`00_control/LOCAL_PUBLIC_GAP.md`](./00_control/LOCAL_PUBLIC_GAP.md) is the tracked snapshot generated by `npm run publication:compare`.
- Before any automated project report, run `npm run automation:status-snapshot` and require `npm run automation:check-freshness` to return `CURRENT`.
- Do not send cached or previously copied status as if it were current, and if no new substantive workstream has completed since the last outbound report, say `no new substantive workstream` plainly.

## Manual QA
- [`00_control/CURRENT_BUILD_HOW_TO.md`](./00_control/CURRENT_BUILD_HOW_TO.md) is the shortest step-by-step guide for the current local build.
- [`00_control/MANUAL_TEST_PLAYBOOK.md`](./00_control/MANUAL_TEST_PLAYBOOK.md) is the plain-English tester checklist.
- [`00_control/RUNTIME_PACKAGE_NOTES.md`](./00_control/RUNTIME_PACKAGE_NOTES.md) records the exact current local-runtime hunt result and why Runtime Mode still uses the recorded public donor entry.
- [`00_control/MANUAL_TEST_MATRIX.md`](./00_control/MANUAL_TEST_MATRIX.md) is the fast pass/fail matrix.
- [`00_control/MANUAL_BUG_TEMPLATE.md`](./00_control/MANUAL_BUG_TEMPLATE.md) is the copy/paste bug report format.
- The current shell is now runtime-first for `project_001`: Runtime Mode is the main donor workflow when the grounded donor runtime entry is available, and Compose Mode remains the bounded internal scene editor for `40_projects/project_001/internal`.
- The shell **New Project** panel now supports an optional **Donor Launch URL**. When you provide one, MyIDE scaffolds `10_donors/<donorId>/` and captures the first donor launch page plus discovered URL list instead of only storing a donor label.
- Runtime Mode now prefers the bounded local runtime mirror URL when it is available on this machine.
- The exact full-package blocker is still recorded in [`00_control/RUNTIME_PACKAGE_NOTES.md`](./00_control/RUNTIME_PACKAGE_NOTES.md): there is still no captured standalone local donor runtime package for `project_001`.
- Runtime Mode currently supports bounded launch, reload, click-to-start, space-triggered spin when the donor runtime listens for it, and a stronger pick/inspect flow that can jump straight into donor asset, donor evidence, and related compose context when grounded.
- Pause, resume, and step only become active when the embedded donor runtime exposes a ticker-like hook we can drive honestly. When that hook is absent, the shell reports the blocker plainly instead of faking the controls.
- After `npm run donor-assets:index:project_001`, the left column shows **Donor Assets & Evidence** with a donor asset palette for supported local donor images found on this machine.
- Supported import types in this slice are static donor images only: `png`, `webp`, `jpg`, `jpeg`, and `svg` when those files exist locally for `project_001`.
- The donor palette now supports search plus file-type filters, a visible import-target layer selector, direct create-vs-replace drop intent in the canvas, and the earlier bounded replace-selected-object path for the current editable selection.
- Dragging donor asset cards into empty canvas space creates new editable internal scene objects with donor linkage on the chosen target layer. Dropping a donor asset directly over an editable scene object now replaces that object while preserving its layout and switching it to donor-backed linkage.
- The current donor-composer slice now adds bounded multi-object composition on top of that import flow: empty-canvas marquee selection, additive `Shift`/`Cmd` selection from the scene list or canvas, compact align/distribute actions in the canvas toolbar, and fast donor source jumps from a selected donor-backed object back to its donor asset card or evidence entry.
- Selected donor-backed image objects now expose one bounded direct-manipulation improvement: a small bottom-right resize handle that persists through save/reload.
- The current bounded proof now covers more than one real donor image import on `project_001`, including `png` and `webp` when both are present locally, plus donor-backed replacement, donor-backed resize, marquee/multi-select composition, align/distribute, donor source jump, and save/reload linkage persistence.
- The current bounded runtime proof now covers Runtime Mode launch, reload, the first live runtime pick/inspect flow, and the strongest grounded source trace available from the embedded donor runtime surface.
- The current bounded runtime proof now covers a local runtime mirror launch URL, a grounded local mirror source-path trace for one static Mystery Garden runtime candidate, a real runtime resource map for the current launch/reload cycle, a request-backed embedded `bundle.js` hit from the runtime partition tap, and explicit blocker reporting when the embedded Electron Runtime Mode path still does not surface a request-backed static image even though the bounded local mirror can serve local static assets in a direct local launch.
- Atlas/frame donor import is still blocked for `project_001` on this machine, but the blocker is now narrower and better grounded: local atlas/frame metadata exists, while referenced atlas page images and deeper runtime payloads are still missing. The donor palette therefore remains limited to loose donor images for now.
- Raw donor files under `10_donors/` remain read-only evidence. The editable source of truth is still the internal scene, not the donor file itself.
- `npm run manual:prepare:project_001` resets `project_001` to the current tracked baseline, refreshes derived/synced outputs, validates the project slice, and tells the tester what to run next.
- `npm run manual:status` prints the exact local/public/handoff context the tester is using.
- `npm run manual:bug-context` prints a paste-friendly bug context block with current local/public/handoff details.
- `npm run manual:bug-bundle` creates a timestamped bug-report folder outside the repo under `/Users/alexb/Documents/Dev/MyIDE_manual_reports/`, prefilled with `BUG.md`, current `context.txt`, and an `attachments/` folder.
- `npm run manual:reset:project_001` restores `project_001` to the current tracked local baseline and clears known local-only editor logs.

## Quick Start Scripts
If you just want to launch the app without memorizing raw `npm` commands, use the scripts in [run/README.md](/Users/alexb/Documents/Dev/MyIDE/run/README.md).

- Double-click from Finder:
  - `./run/Start-MyIDE-Workbench.command`
  - `./run/Start-MyIDE-Workbench-Clean.command`
  - `./run/Open-Runtime-Debug-Host.command`
  - `./run/Refresh-Runtime-Assets.command`
- `./run/start-workbench.sh`
  - Normal daily entry point. Refresh donor assets, refresh the safe runtime mirror view, then open MyIDE.
- `./run/start-workbench-clean.sh`
  - Clean demo/test entry point. Reset `project_001` to the tracked baseline, refresh assets/runtime data, then open MyIDE.
- `./run/open-runtime-debug-host.sh`
  - Open the official Runtime Debug Host directly for `project_001`.
- `./run/refresh-runtime-assets.sh`
  - Refresh the safe local runtime mirror/request view without opening the app.

If you are unsure which one to use, double-click `./run/Start-MyIDE-Workbench.command`.

## GS VABS Module
- [`00_control/VABS_MODULE_STRATEGY.md`](./00_control/VABS_MODULE_STRATEGY.md) explains how GS VABS fits into MyIDE as an additional module.
- [`00_control/VABS_DELIVERY_CHECKLIST.md`](./00_control/VABS_DELIVERY_CHECKLIST.md) is the delivery checklist for per-project archived round history support.
- `40_projects/project_001/vabs/` is now the project-local VABS scaffold for `project_001`.
- `project_001` now has one concrete project-specific VABS slice: an intended folder-name decision, a stronger derived archived-row fixture, a derived session-level `playerBets[]` fixture, explicit captured-row and captured-session intake paths, a parser/compare harness, a local replay harness, a local GS-style export package path, a local export preview dry-run, a local page-shell mock plus browser smoke path, and a replay-summary stub package under `40_projects/project_001/vabs/renderer/mysterygarden/`.
- The shell now exposes that VABS lane as a compact read-only project panel so operators can see fixture truth, current blocker, and the exact next capture commands without changing the editor workflow.
- `npm run vabs:scaffold:project_001`, `npm run vabs:intake:project_001`, `npm run vabs:sanitize:project_001`, `npm run vabs:verify:captured:project_001`, `npm run vabs:intake:session:project_001`, `npm run vabs:sanitize:session:project_001`, `npm run vabs:verify:captured-session:project_001`, `npm run vabs:verify:project_001`, `npm run vabs:export:project_001`, `npm run vabs:verify:export:project_001`, `npm run vabs:preview:project_001`, `npm run vabs:mock:project_001`, `npm run vabs:smoke:project_001`, and `npm run vabs:replay:project_001` are local-first scaffold/intake/sanitize/verification/export/preview/mock/smoke/replay helpers.
- `npm run vabs:parse:project_001` prints the parsed row-contract summary for the current fixture.
- `npm run vabs:compare:project_001` prints the current captured-vs-derived comparison view for `project_001`.
- `project_001` now tracks captured-vs-derived truth explicitly: no full captured archived `playerBets` row or `playerBets[]` session is stored yet, but the current derived fixture carries one confirmed live `ROUND_ID` from `MG-EV-20260320-LIVE-A-005`, the repo now reserves both gitignored raw captured-row/session intake paths and future commit-safe sanitized captured row/session paths, and `auto` selection only promotes sanitized captured data.
- GS-VABS-L hard-stops the lane there for now: until one real sanitized archived row or session exists, the repo should use the derived proof chain plus the operator capture request docs instead of adding more generic VABS scaffolding.
- The next operator step is still one real sanitized archived row or session drop through the existing intake/sanitize/verify flow; the new app panel only makes that blocker visible in the project workflow.
- `npm run vabs:replay:project_001` writes deterministic replay-summary artifacts to `/tmp/myide-vabs-project_001-replay/<fixture-kind>/`.
- `npm run vabs:export:project_001` writes a deterministic GS-style local package to `/tmp/myide-vabs-project_001-export/common/vabs/mysterygarden/`.
- `npm run vabs:preview:project_001` proves that exported package can be exercised locally without JSP hosting or live GS deployment.
- `npm run vabs:mock:project_001` writes a browser-facing local shell mock under `/tmp/myide-vabs-project_001-shell-mock/<fixture-kind>/`.
- `npm run vabs:smoke:project_001` opens that mock through a headless local browser, confirms a non-default session row was selected, and confirms the exported stub updated inside the mock shell.
- These export, preview, mock, and smoke outputs are local validation artifacts, not production-ready GS deployment proof.
- VABS in the current repo is now at a stronger project-specific concrete replay slice for `project_001`, but it still does not claim a finished production GS renderer.

## Current Boundaries
- No production server adapter implementation yet.
- No reskinning yet.
- No full editor platform yet beyond the bounded internal scene/object editor slice.
- No non-slot or multi-user implementation yet.
