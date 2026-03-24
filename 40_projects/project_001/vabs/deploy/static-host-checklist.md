# Static Host Checklist

## Folder And Path
- [ ] Final VABS folder name is recorded explicitly.
- [ ] Target host/path for the per-game package is recorded.
- [ ] The deployment can serve `/common/vabs/<folder>/code.js`.
- [ ] Shared VABS engine assets are present alongside the per-game package.

## Static Package Contents
- [ ] `code.js` exists in the target package.
- [ ] Required static art files exist with the expected case-sensitive names.
- [ ] Localization files are present if the target deployment needs them.

## Contract Safety
- [ ] `ROUND_ID` is documented and verified against a real target row.
- [ ] One deterministic archived row sample is available for acceptance.
- [ ] The package does not depend on private local machine paths.

## Failure Modes To Check
- [ ] Wrong folder-name normalization
- [ ] Missing shared `/common/vabs` assets
- [ ] Missing or mismatched asset filenames
- [ ] Renderer logic published without the required static files
