# Manual QA Tooling

Manual QA helpers are for local testing against the current tracked `project_001` baseline.
New donor onboarding for this slice is: run `npm run manual:status`, then `npm run manual:prepare:project_001`, then `Open Debug Host` for runtime proof, then `Open Compose` for donor-backed edits.
The product backbone is now explicit: `Investigation -> Modification / Compose / Runtime -> Math / Config -> GS Export`.
For this build, testers should treat the `Investigation` panel as the truth surface for static scan state, bounded runtime capture state, scenario coverage, blocked families, next profile guidance, operator-assist guidance, and promotion readiness before diving into compose/runtime edits.
The current shell is now runtime-first for `project_001`: Runtime Mode launches the strongest grounded Mystery Garden donor runtime source inside the shell, keeps the live runtime surface front and center, and exposes bounded runtime launch/reload/inspect controls plus one bounded project-local static image override path when the runtime trace proves an eligible source URL. Compose Mode still edits reconstructed internal scene data under `40_projects/project_001/internal`; it also keeps the stronger bounded donor composition slice for `project_001`, where supported local donor images appear in the in-app donor asset palette, can be filtered by type, can target an explicit layer, can be dropped into empty canvas space to create donor-linked internal scene objects, can be dropped directly over an editable object to replace it, can be multi-selected with a bounded marquee/additive workflow, can be aligned/distributed with nearby composition controls, and give selected donor-backed images a small bottom-right resize handle.
The shell now includes a workflow hub and left-side context rail so Runtime, Donor, Compose, VABS, and Project setup behave like one flow instead of one long stack of unrelated panels.
Raw donor files remain read-only evidence, and on a typical window size the **Donor Assets & Evidence** panel sits in the left column below Project Browser, so testers may need to scroll the left column to reach it.
There is still no captured full local donor runtime package for `project_001`, but Runtime Mode can now prefer a bounded partial local runtime mirror on this machine. The first override slice works by creating project-local override files under `40_projects/project_001/overrides/`; raw donor files under `10_donors/` remain untouched. The shell now also records a bounded runtime resource map for the current launch/reload cycle so testers can see which runtime URLs were requested, which local mirror files were used, which request capture method proved them, and whether an override recorded a hit. The shell now prefers a stronger main-world runtime introspection bridge too, though the strongest previously verified embedded proof is still the older `frameCount=0`, `accessibleFrameCount=0`, `canvasCount=0`, resource-windows-`top` result from the guest-preload slice because the current Electron smoke environment is aborting in AppKit before MyIDE emits its main-process marker. Pause/resume/step only work when the embedded runtime exposes a stable ticker-like hook; otherwise the shell shows that blocker plainly.
Atlas/frame donor import is still blocked in this build, but the blocker is now narrower and better grounded: local atlas/frame metadata exists for `project_001`, while referenced atlas page images and deeper runtime payloads are still missing locally.
The deep donor scan now proves that blocker early instead of leaving atlas/frame import in a vague unknown state.
The shell donor panel now also shows the top next capture targets from donor scan, so testers can copy the current missing runtime target set directly from the app.
GS VABS support is a separate project-delivery module; the manual commands here are still for the current shell/editor baseline, not a production VABS renderer.
`project_001` now has one stronger VABS contract/renderer-stub slice with explicit raw-vs-sanitized captured-row intake and captured-vs-derived fixture tracking, but editor QA and VABS verification remain separate flows.
The shell now shows a read-only VABS status panel for the selected project, but manual editor prep and proof still use the same bounded shell/editor commands as before.

## Recommended Tester Flow
1. Run `npm run manual:status` for a quick LOCAL vs PUBLIC vs HANDOFF check.
2. Use one of the launch scripts under [run/README.md](/Users/alexb/Documents/Dev/MyIDE/run/README.md):
   - `./run/start-workbench.sh` for normal day-to-day use
   - `./run/start-workbench-clean.sh` for a clean `project_001` baseline
   - `./run/open-runtime-debug-host.sh` for runtime-only investigation
3. Open `project_001` in Project Browser when the shell appears.
4. Open the `Investigation` panel first and confirm static scan state, runtime scan state, blocked families, next profile, and stage handoff readiness look coherent.
5. In Runtime Mode, use `Launch Runtime`, `Reload Runtime`, `Click To Start`, `Spin / Trigger`, and `Pick / Inspect` as the first donor workflow path.
5. After a runtime pick, use the runtime bridge buttons to focus donor asset, donor evidence, or related compose context when those are grounded.
6. If the runtime trace says the current source is override-eligible, use `Create Override`, let Runtime Mode reload, and confirm either:
   - the active override card shows a runtime hit, or
   - the shell reports the current local-mirror override blocker plainly
10. Use the `Inspection Bridge` card in the runtime inspector to confirm whether the stronger `main-world-execute-js` bridge attached or whether the shell fell back to `guest-preload`.
11. Use the runtime resource-map record in the inspector to confirm the current launch/reload cycle actually requested the traced source when that evidence exists. The strongest current proof leaves no unresolved upstream bootstrap/static dependency in the bounded cycle, but the embedded Runtime Mode slice may still block on a mirror-manifest-backed candidate even though direct local launch inspection proves the mirror can serve local static assets. The strongest previously verified embedded bridge also proves whether the runtime exposed any accessible child frame or canvas surface in this slice.
11. Use `Clear Override` when you want to restore the original runtime asset.
12. Use `Show Runtime Note` or `Show Init Response` if you want to jump back to the runtime evidence behind the current runtime slice.
13. Switch to Compose Mode when you want donor image composition instead of live runtime inspection.
14. Scroll the left column down if you need to inspect **Donor Assets & Evidence**.
15. Choose a donor import target layer, then drag one supported donor image into empty canvas space if you want to test donor composition.
16. If both `png` and `webp` donor assets are present, drag one of each to prove the stronger bounded import slice.
17. Drag one donor image over an existing editable canvas object if you want to test direct donor-backed replacement, or use **Replace Selected Object** for the bounded button path.
18. Use a marquee box or `Shift`/`Cmd` selection to build a small multi-object composition.
19. Try one align or distribute action from the editor toolbar.
20. Select a donor-backed image and use its bottom-right resize handle if you want to test bounded direct manipulation.
21. Use **Show Asset In Palette**, **Show Evidence**, or **Open Runtime Context** from the donor summary if you want to trace a donor-backed object back to source context quickly.
22. If you hit a bug, run `npm run manual:bug-bundle` to create a timestamped folder outside the repo with a prefilled bug note, current context, and an `attachments/` folder.
23. If you only need a quick paste-friendly text block, run `npm run manual:bug-context`.
24. Use `npm run manual:reset:project_001` again when you want to clean up after a session without running the full prepare flow.

## Commands
- `npm run manual:status`
  - Print the local commit, local phase, public `origin/main` SHA when available, current validated project, and whether a stable handoff bundle is present.
- `npm run manual:prepare:project_001`
  - Print the current manual status.
  - Reset tracked `40_projects/project_001` files to the current local `HEAD` baseline.
  - Regenerate the derived workspace registry, resync replay-facing `project.json`, validate the `project_001` schema, and tell the tester what to run next.
  - Re-run with `-- --force-unknown` only if you intentionally want to remove unexpected untracked files inside `project_001`.
- `npm run manual:bug-bundle`
  - Create a timestamped bug-report folder under `/Users/alexb/Documents/Dev/MyIDE_manual_reports/`.
  - Write `BUG.md`, `context.txt`, `README.txt`, and an empty `attachments/` folder outside the repo.
  - Keep the bundle local; it is not part of Git tracking.
- `npm run manual:bug-context`
  - Print a concise block with timestamp, local commit, local phase, public `origin/main`, local/public match status, validated project, and current handoff paths so a tester can paste it directly into a bug note.
- `npm run manual:reset:project_001`
  - Restore tracked `40_projects/project_001` files from the current local `HEAD`.
  - Remove only the known local-only editor log outputs:
    - `40_projects/project_001/logs/editor-snapshots/`
    - `40_projects/project_001/logs/editor-save-history.jsonl`
  - Abort if tracked files outside `project_001` are dirty.
  - Leave unrelated untracked notes or report folders outside `project_001` alone.
  - Abort if unexpected untracked files exist inside `project_001`.

## Safety Model
- The reset baseline is the current tracked `HEAD` state of `project_001`.
- `manual:prepare:project_001` is intentionally destructive for current `project_001` edits because it runs the same reset step before rebuilding a clean test baseline.
- The reset command is intentionally destructive for `project_001` edits and known local-only logs.
- If you intentionally created extra local files inside `project_001`, review them before using `--force-unknown`.
