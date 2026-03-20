# Importer Assumptions

## Proven Facts
- The importer is deterministic.
- The importer maps evidence-backed findings into internal project data only.
- The importer does not read donor raw files.
- The executable importer step now validates its documented input docs before writing the import artifact.

## Assumptions
- Published screenshots, official BGaming JSON, and one live public runtime session are sufficient for the current replay slice.
- The first importer can keep a local evidence-backed mapping layer while the project format stabilizes.
- The preview shell will continue to load only `40_projects/project_001` data.

## Unknowns
- Exact runtime timing for launch, spin, and restart.
- Full symbol inventory and paytable.
- Any later need to split the importer into multiple donor-specific stages.

## Guardrails
- Every imported field should carry evidence refs when a donor-backed source exists.
- Unknowns should remain visible in the import artifact instead of being inferred.
- Any later production adapter work must stay separate from this importer foundation.
