# IDE Chunk Matrix

Last updated: 2026-04-10 (Europe/London)

## C0. New Project / donor intake
- Purpose: Create a new project and bind it to donor metadata.
- Input: New project form values (display name, slug, donor id/name/url).
- Expected behavior: Project folder, metadata, registry entry, and shell visibility are created consistently.
- Expected output: New project in `40_projects/` plus registry update.
- Automated test path: `50_tests/workspace/create-project-smoke.ts`, `50_tests/schema/validate-workspace.ts`.
- Manual user test path: `00_control/CURRENT_BUILD_HOW_TO.md` (New Project flow).
- Current status: `usable`.
- Blocker: none.

## C1. Static donor scan
- Purpose: Scan donor static assets and produce harvest artifacts.
- Input: Donor id + launch context + local donor evidence.
- Expected behavior: Capture/summary/workset outputs are generated with actionable statuses.
- Expected output: Harvest artifacts under `10_donors/<donor>/evidence/local_only/harvest/`.
- Automated test path: `50_tests/workspace/donor-scan-capture-smoke.ts`, `50_tests/workspace/donor-scan-family-action-smoke.ts`, `50_tests/workspace/donor-scan-section-action-smoke.ts`.
- Manual user test path: `00_control/MANUAL_TEST_PLAYBOOK.md` (Investigation capture and family/section actions).
- Current status: `usable`.
- Blocker: none.

## C2. Dynamic scenario scan
- Purpose: Run bounded runtime scenarios to collect dynamic evidence.
- Input: Investigation profile + donor runtime path.
- Expected behavior: Runtime requests/events are collected and reflected in investigation artifacts.
- Expected output: Scenario coverage and runtime request evidence updates.
- Automated test path: `50_tests/workspace/donor-scan-investigation-smoke.ts`.
- Manual user test path: `00_control/MANUAL_TEST_PLAYBOOK.md` (Investigation scenario lane).
- Current status: `usable`.
- Blocker: none.

## C3. Investigation coverage board
- Purpose: Show operator-ready investigation coverage truth and next actions.
- Input: Donor scan outputs + runtime evidence + coverage summaries.
- Expected behavior: Coverage state, blockers, and follow-ups remain honest and current.
- Expected output: Investigation panel guidance and coverage summary updates.
- Automated test path: `50_tests/workspace/donor-scan-investigation-smoke.ts`, `50_tests/workspace/donor-scan-promotion-smoke.ts`.
- Manual user test path: `00_control/CURRENT_BUILD_HOW_TO.md` and `00_control/MANUAL_TEST_PLAYBOOK.md` (Investigation board checks).
- Current status: `partial`.
- Blocker: Coverage messaging depends on donor artifact quality; malformed optional donor artifacts still appear in some donor trees.

## C4. Promotion / prepare modification
- Purpose: Promote investigation outputs into modification-ready tasks.
- Input: Coverage-ready donor findings and promotion action.
- Expected behavior: Modification handoff queue is produced with clear next actions.
- Expected output: `reports/modification-handoff.json` with ready/blocked tasks.
- Automated test path: `50_tests/workspace/donor-scan-promotion-smoke.ts`, `50_tests/workspace/project-modification-handoff-smoke.ts`.
- Manual user test path: `00_control/MANUAL_TEST_PLAYBOOK.md` (Promotion to modification).
- Current status: `usable`.
- Blocker: none.

## C5. Compose donor-backed editing
- Purpose: Perform scene/object edits with donor/task-kit grounding.
- Input: Active modification task + task-kit assets + compose actions.
- Expected behavior: Compose edits persist cleanly with undo/redo and replay consistency.
- Expected output: Updated project/editor artifacts and deterministic replay state.
- Automated test path: `50_tests/workspace/modification-task-kit-smoke.ts`, `50_tests/workspace/edit-project-smoke.ts`, `50_tests/workspace/drag-edit-smoke.ts`, `50_tests/workspace/duplicate-delete-smoke.ts`, `50_tests/workspace/create-object-smoke.ts`.
- Manual user test path: `00_control/MANUAL_TEST_PLAYBOOK.md` (Compose lane).
- Current status: `usable`.
- Blocker: none.

## C6. Runtime / debug host / trace / override
- Purpose: Ground runtime evidence, harvest request-backed traces, and create/clear bounded overrides.
- Input: Selected project runtime evidence (page proof/resource map/mirror), runtime actions, override actions.
- Expected behavior: Harvest and override flows stay project-scoped, honest, and testable; no stale-state drift.
- Expected output: Request-backed runtime entries + override manifest/asset updates + truthful runtime status surfaces.
- Automated test path: `50_tests/workspace/electron-runtime-selected-project-*.ts` (reopen/harvest/fallback/override/route/debug lanes), `50_tests/workspace/runtime-page-proof-storage-smoke.ts`, `50_tests/workspace/runtime-selected-project-status-smoke.ts`.
- Manual user test path: `00_control/CHUNK_USER_CHECKLISTS.md` (C6 checklist), `00_control/MANUAL_TEST_PLAYBOOK.md` runtime section.
- Current status: `proven`.
- Blocker: none in this sprint run; full workspace verify is green.

## C7. Reconstruction-ready section output
- Purpose: Produce reconstruction-ready section bundles from scan/action pipelines.
- Input: Family/section action outputs and reconstruction artifacts.
- Expected behavior: Section outputs are generated and consumable by downstream stages.
- Expected output: Reconstruction section bundles/worksets in donor harvest outputs.
- Automated test path: `50_tests/workspace/donor-scan-section-action-smoke.ts`.
- Manual user test path: `00_control/MANUAL_TEST_PLAYBOOK.md` section-action path.
- Current status: `partial`.
- Blocker: Artifact quality is uneven across donors (example: malformed optional donor JSON artifacts observed).

## C8. Math / config stage
- Purpose: Run explicit math/config transformations after modification/runtime grounding.
- Input: Reconstruction-ready outputs + config/math operator choices.
- Expected behavior: Deterministic math/config stage execution with dedicated tooling and tests.
- Expected output: Stage-specific artifacts and validation output.
- Automated test path: currently only schema/lifecycle presence checks via `50_tests/schema/validate-workspace.ts`.
- Manual user test path: lifecycle docs only; no dedicated operator playbook yet.
- Current status: `partial`.
- Blocker: No dedicated execution lane and no focused stage tests beyond metadata presence.

## C9. GS export stage
- Purpose: Export validated build artifacts for GS delivery.
- Input: Completed lifecycle outputs and export parameters.
- Expected behavior: Export packaging is deterministic, auditable, and repeatable.
- Expected output: GS export artifact bundle and audit trail.
- Automated test path: local GS tooling checks only (`tools/gs-vabs/*`), no full production export proof in workspace verify.
- Manual user test path: `00_control/CURRENT_BUILD_HOW_TO.md` export references.
- Current status: `partial`.
- Blocker: End-to-end production-grade export proof is not yet represented in current automated suite.
