# MyIDE Roadmap

## PHASE 0: Foundation
- Create the controlled folder tree.
- Document scope, decisions, risks, TODOs, and status.
- Draft the clean internal model schemas.
- Record the GSRefactor audit and current integration map.

## PHASE 1: Reference and Shell
- Audit `new-games-client` and `new-games-server` as upstream references.
- Map the external game contract into a developer-ready checklist.
- Define the donor evidence pack for `donor_001_mystery_garden`.
- Scaffold a minimal desktop shell with:
  - project browser placeholder,
  - donor evidence browser placeholder,
  - preview canvas placeholder,
  - inspector placeholder.

## PHASE 2: Donor Capture to Local Replay
- Capture BGaming Mystery Garden evidence using the PHASE 1 donor pack structure.
- Produce a donor report that separates proven facts, assumptions, and TODOs.
- Import proven donor findings into the internal MyIDE project model.
- Build a local replay path that renders the internal model in the preview shell.
- Define a bounded server-map draft for local replay only.

## PHASE 3: Reconstruction Tooling
- Add importer helpers from donor evidence into the internal model.
- Add basic scene and asset inspection/editing workflows.
- Add validation tooling for schema conformance and missing evidence.

## PHASE 4: Runtime Bridge
- Design and implement the production-grade server adapter.
- Add request queueing, restart recovery, and state ownership rules.
- Validate restart and recovery flows against GSRefactor behavior.

## PHASE 5: QA and Release Prep
- Regression checks for donor evidence traceability.
- Replay and adapter test coverage.
- Packaging, release notes, and release candidate checklist.

## Deferred Until After PHASE 1
- Full donor decoding.
- Full editor.
- Production server integration.
- Sugar Merge Up implementation.
