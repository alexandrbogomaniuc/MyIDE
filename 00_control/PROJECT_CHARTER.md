# MyIDE Project Charter

## Purpose
MyIDE is a local-first desktop application with a web UI for reconstructing one donor slot game into a clean internal project, improving it into an original game, validating it locally, and preparing it for later server/runtime integration and release.

## Proven Facts
- V1 scope is slot-only.
- V1 scope is single-user only.
- V1 delivery target is a desktop application with a web UI.
- The reference/upstream stack is the existing GSRefactor work in `new-games-client` and `new-games-server`.
- The first milestone is donor to local preview, not a general-purpose drag-and-drop editor.
- The first donor is BGaming Mystery Garden.
- The second donor is BGaming Sugar Merge Up, but research-only for now.
- Raw donor material must remain separate and read-only.
- The editable source of truth must be a clean internal project format, not donor atlases or donor JSON files.
- Work for this initiative is restricted to `/Users/alexb/Documents/Dev/MyIDE`.
- The PHASE 1 shell is implemented as Electron + TypeScript with a local HTML/CSS renderer placeholder. Evidence: `/Users/alexb/Documents/Dev/MyIDE/package.json:1-15`, `/Users/alexb/Documents/Dev/MyIDE/30_app/shell/main.ts:1-34`, `/Users/alexb/Documents/Dev/MyIDE/30_app/shell/renderer/index.html:1-171`.

## Goals
- Preserve donor evidence in a traceable evidence pack.
- Build a clean internal model that can outlive any one donor game.
- Provide a desktop shell that can browse projects, inspect donor evidence, and render a local preview.
- Map the existing GSRefactor integration assumptions before attempting production server/runtime work.
- Keep a strict distinction between proven facts, assumptions, and TODO investigations.

## Non-Goals For PHASE 0 and PHASE 1
- Full donor decoding.
- Full editor workflows.
- Production server adapter implementation.
- Multi-user collaboration.
- Automatic donor asset rewriting.

## Operating Rules
- Raw donor files are evidence and must never be silently overwritten.
- Every donor-related claim must be traceable to evidence.
- Progress must be logged in `00_control/STATUS.md`.
- GPL code is excluded unless explicitly approved later.
- Reuse should prefer MIT-friendly patterns and newly authored code.

## Deliverables For This Run
- PHASE 0: folder tree, control docs, reference docs, schema drafts.
- PHASE 1: GSRefactor audit, integration contract map, donor capture plan, minimal desktop shell scaffold.

## Open Questions
- Which exact donor capture artifacts for BGaming Mystery Garden can be obtained through normal client-side delivery and observation?
- Which GS integration details live only in the Java/runtime layer outside the audited TypeScript reference repos?
- What subset of the internal model is sufficient for donor capture to local replay in PHASE 2?
