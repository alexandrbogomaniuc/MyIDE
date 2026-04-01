# Donor Intake Tooling

Use this when you want to start a project from a real donor launch URL instead of only creating a placeholder scaffold.

## Current scope
- Creates or refreshes a shared donor pack under `10_donors/<donorId>/`.
- Captures the donor launch HTML in sanitized form.
- Writes a bounded discovered URL inventory that starts from the launch page and then recurses through downloaded JS/CSS/JSON references.
- Downloads bounded static assets into `10_donors/<donorId>/evidence/local_only/harvest/files/`.
- Writes a machine-readable harvest manifest at `10_donors/<donorId>/evidence/local_only/harvest/asset-manifest.json`.
- Writes a donor-package manifest at `10_donors/<donorId>/evidence/local_only/harvest/package-manifest.json` with entry points, host coverage, bounded asset families, unresolved references, and package-graph summary counts.
- Writes a donor-package graph at `10_donors/<donorId>/evidence/local_only/harvest/package-graph.json` so you can trace which harvested files point to which other files.
- Keeps raw donor bootstrap files read-only after capture.
- Does **not** yet recurse through the full donor runtime package or reconstruct gameplay logic.

## Commands
- `npm run donor:intake:url -- --donor-id donor_003_example --donor-name "Example Donor" --url "https://demo.example.com/play/Game/FUN?server=demo"`
- The shell **New Project** form now supports the same flow through the optional **Donor Launch URL** field and automatically runs the same bounded recursive harvest.

## Output
- `10_donors/<donorId>/raw/bootstrap/launch.html`
- `10_donors/<donorId>/raw/bootstrap/launch-request.json`
- `10_donors/<donorId>/raw/discovered/discovered-urls.json`
- `10_donors/<donorId>/reports/DONOR_INTAKE_REPORT.md`
- `10_donors/<donorId>/evidence/local_only/harvest/asset-manifest.json`
- `10_donors/<donorId>/evidence/local_only/harvest/package-manifest.json`
- `10_donors/<donorId>/evidence/local_only/harvest/package-graph.json`
- `10_donors/<donorId>/evidence/local_only/harvest/files/`
