# Import Log

## 2026-03-20
- Created the first deterministic Mystery Garden importer foundation.
- Source boundary: donor evidence and donor report maps only.
- Output artifact: `mystery-garden-import.json`.
- Status: importer contract is explicit and now has a repeatable CLI generation step.
- Updated the importer provenance after `MG-CS-20260320-LIVE-A` so live idle/spin evidence is reflected in the import inputs.
- Public repo boundary now excludes raw donor downloads and runtime payload bodies while keeping hashes and evidence IDs.

## Proven Facts
- The import artifact preserves evidence refs on imported fields.
- Unknowns remain explicit in the import artifact.
- No donor raw files are read by the importer foundation.

## Next Step
- Expand from deterministic import generation into richer report-to-model translation only after new live evidence fills the current donor gaps.
