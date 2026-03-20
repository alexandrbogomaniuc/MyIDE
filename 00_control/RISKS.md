# MyIDE Risks

## Active Risks

### R-001: Donor evidence may be incomplete or contradictory
- Impact: high
- Likelihood: medium
- Why it matters: the first milestone depends on reconstructing donor behavior from observable assets and runtime behavior only.
- Mitigation: require an evidence ledger, keep assumptions explicit, and block importer work on unproven donor claims.

### R-002: Scope creep toward a full universal editor
- Impact: high
- Likelihood: high
- Why it matters: the mission explicitly rejects building a full editor first.
- Mitigation: keep PHASE 1 limited to evidence capture, schemas, and a minimal shell; defer editing workflows to later phases.

### R-003: Upstream GSRefactor runtime details are split across TypeScript and legacy Java/runtime layers
- Impact: medium
- Likelihood: high
- Why it matters: the audited TypeScript repos expose the new-games contract but not the whole legacy runtime lifecycle.
- Mitigation: document proven contract evidence now and mark Java/runtime-only areas as TODO investigation items.

### R-004: Accidentally treating donor raw files as editable assets
- Impact: high
- Likelihood: medium
- Why it matters: that would destroy evidence integrity and blur provenance.
- Mitigation: keep donor raw storage in `10_donors/.../raw`, forbid direct runtime paths to raw assets in the internal schema, and use import steps instead of direct binding.

### R-005: License/provenance ambiguity in reused code
- Impact: high
- Likelihood: medium
- Why it matters: the project must avoid GPL contamination and keep reuse defensible.
- Mitigation: prefer newly authored code and reuse patterns first; verify third-party licenses before shipping.

### R-006: The audited NGS server is not restart-durable
- Impact: medium
- Likelihood: high
- Why it matters: current session, round, and idempotency state live in process memory.
- Mitigation: keep production adapter work deferred and document restart recovery as a future design task.
