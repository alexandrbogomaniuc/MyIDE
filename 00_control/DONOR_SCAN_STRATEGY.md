# Donor Scan Strategy

This file describes the reusable donor-scan subsystem that now sits behind donor intake.

## Goal

Given a donor launch URL or an already-harvested donor package, the IDE should answer early and automatically:

1. what runtime entry points exist
2. what asset URLs exist
3. what atlas or frame metadata exists
4. what bundle-level asset references exist
5. what can already be mirrored locally
6. what is still missing or blocking
7. what the next operator step should be

## Generic Scan Stages

1. Launch capture
   - Capture donor launch HTML and request metadata when a donor URL is provided.
   - If a donor package already exists, reuse the harvested package instead of forcing a new live capture.

2. Entry-point discovery
   - Read launch HTML, discovered URLs, and any harvested package metadata.
   - Identify likely launch/runtime entry points such as HTML, JS bundles, CSS, JSON boot files, and host roots.

3. URL inventory crawl
   - Normalize discovered URLs.
   - Classify them by category.
   - Record downloaded, failed, skipped, and inventory-only items.

4. Asset classification
   - Group files into practical categories:
     - images
     - fonts
     - audio
     - video
     - scripts
     - styles
     - JSON / metadata
     - API roots

5. Runtime candidate detection
   - Promote likely launch/runtime files into explicit runtime candidates.
   - Estimate whether the donor currently has:
     - a full local runtime package
     - a strong partial local runtime package
     - or no useful local package yet

6. Bundle asset-map extraction
   - Inspect downloaded JS bundles for grounded asset references.
   - Record asset URLs, loader roots, tables, texture/frame hints, and confidence level.

7. Atlas/frame manifest discovery
   - Detect atlas text, sprite-sheet JSON, plist, Spine JSON, and related metadata.
   - Record missing page-image dependencies separately from metadata presence.

8. Mirror candidate generation
   - Identify what is already downloaded locally.
   - Identify the next missing runtime targets that could strengthen a local mirror.

9. Blocker summary generation
   - Produce an operator-facing summary that says plainly:
     - what is already possible
     - what is blocked
     - what the next operator action should be

## Primary Outputs

All local-only donor-scan outputs live under:

`10_donors/<donor_id>/evidence/local_only/harvest/`

Current outputs:

- `asset-manifest.json`
- `package-manifest.json`
- `package-graph.json`
- `entry-points.json`
- `url-inventory.json`
- `runtime-candidates.json`
- `bundle-asset-map.json`
- `atlas-manifests.json`
- `blocker-summary.md`
- `scan-summary.json`

## Current Product Use

- New donor URL intake now runs donor scan automatically after bounded harvest.
- Existing mirrored donors can also be scanned later without re-running the original intake.
- The shell reads donor scan status from `scan-summary.json` and `blocker-summary.md`.

## Honest Boundaries

- Donor scan does not mutate raw donor payloads.
- Donor scan does not guarantee a full standalone local runtime package.
- Donor scan can prove that atlas/frame import is blocked by missing payloads instead of missing parser/UI work, but it cannot invent missing atlas page images or hidden runtime files.
- Donor scan is a discovery system, not a full automatic donor reconstruction system.
