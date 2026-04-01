# Donor Intake Tooling

Use this when you want to start a project from a real donor launch URL instead of only creating a placeholder scaffold.

## Current scope
- Creates or refreshes a shared donor pack under `10_donors/<donorId>/`.
- Captures the donor launch HTML in sanitized form.
- Writes a first-pass discovered URL inventory.
- Downloads directly discovered static assets into `10_donors/<donorId>/evidence/local_only/harvest/files/`.
- Writes a machine-readable harvest manifest at `10_donors/<donorId>/evidence/local_only/harvest/asset-manifest.json`.
- Keeps raw donor bootstrap files read-only after capture.
- Does **not** yet recurse through the full donor runtime package or reconstruct gameplay logic.

## Commands
- `npm run donor:intake:url -- --donor-id donor_003_example --donor-name "Example Donor" --url "https://demo.example.com/play/Game/FUN?server=demo"`
- The shell **New Project** form now supports the same flow through the optional **Donor Launch URL** field and automatically runs the same first-pass harvest.

## Output
- `10_donors/<donorId>/raw/bootstrap/launch.html`
- `10_donors/<donorId>/raw/bootstrap/launch-request.json`
- `10_donors/<donorId>/raw/discovered/discovered-urls.json`
- `10_donors/<donorId>/reports/DONOR_INTAKE_REPORT.md`
- `10_donors/<donorId>/evidence/local_only/harvest/asset-manifest.json`
- `10_donors/<donorId>/evidence/local_only/harvest/files/`
