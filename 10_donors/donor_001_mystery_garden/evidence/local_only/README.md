# Local-Only Evidence

This folder is intentionally excluded from public git.

## Purpose
- Hold raw donor downloads, runtime screenshots, and request or response bodies that are useful for local verification but unnecessary or unsafe for public publication.

## Public Pairing Rule
- Every local-only artifact must still be represented publicly by:
  - an evidence ID
  - a hash entry in `../HASHES.csv`
  - an inventory entry in `../INVENTORY.csv`
  - a sanitized description in `../EVIDENCE_INDEX.md`

## Safety Rule
- Do not move secrets into git and call them sanitized.
- If an artifact contains session-specific runtime identifiers or other risky data, keep it local-only or create a truly redacted derivative before publication.
