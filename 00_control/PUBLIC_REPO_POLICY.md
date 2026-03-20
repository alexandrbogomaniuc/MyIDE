# Public Repo Policy

## Purpose
- Keep `MyIDE` publishable to a public GitHub repository without leaking secrets, session-specific runtime data, or unnecessary third-party donor assets.
- Preserve enough sanitized evidence, hashes, and provenance for architecture review and internal replay validation.

## Public Repo Includes
- Control docs, roadmap, decisions, risks, and status.
- Internal model schemas and example internal project data.
- Application shell, importer code, replay/runtime mocks, validation code, and UI adapter boundaries.
- Donor evidence indexes, inventories, hashes, capture notes, and donor reports that use evidence IDs.

## Public Repo Excludes
- Auth tokens, launch tokens, cookies, request headers with secrets, and private session identifiers.
- Raw donor downloads, runtime screenshots, request/response bodies, and other large evidence payloads when a hash plus sanitized metadata is sufficient.
- Private operator notes, machine-specific paths outside repo context, and local-only scratch logs.
- Any GPL dependency or copied GPL implementation.

## Donor Evidence Handling
- `10_donors/*/raw/` is read-only evidence and must never be overwritten.
- Public git keeps evidence IDs, hashes, inventories, and honest capture notes.
- Excluded donor/runtime downloads live under `10_donors/.../evidence/local_only/` and are ignored by git.
- If a tracked document references a local-only artifact, it must do so with:
  - evidence ID
  - hash location
  - sanitized source/provenance note
  - explicit statement that the body is excluded from public git

## Sanitization Rules
- Replace session-specific runtime endpoints with a redacted form such as `.../<runtime-session-redacted>`.
- Do not publish round IDs, last action IDs, cookies, or any equivalent runtime session material.
- Do not claim sanitization unless the risky value was actually removed or excluded.
- When exclusion is chosen over redaction, document the exclusion in this file and the relevant `local_only/README.md`.

## Third-Party Reuse Rules
- Selective MIT-friendly reuse is allowed when it reduces risk and speeds delivery.
- Every dependency must be recorded with intended scope, license, and replacement strategy.
- Core MyIDE logic must stay behind local interfaces and must not depend directly on third-party editor UI packages.
- Whole-editor forks or embeddings require explicit approval.

## Local Verification Before Publish
- Run `npm run typecheck`.
- Run `npm run import:mystery-garden`.
- Run `npm run verify:project_001`.
- Review `git diff --cached` for public-safety issues before commit.

## Publication Workflow
1. Stage intended MyIDE changes only.
2. Commit with a truthful message.
3. Push to `origin/main`.
4. Report exact branch, commit hash, commit message, status summary, remote summary, and push result.
