# Project 001 Atlas Scan Notes

## Hard answer
- `ATLAS_IMPORT_FEASIBLE_NOW = no`

## Exact local counts
- atlas text files: `0`
- sprite-sheet JSON manifests: `0`
- plist files: `0`
- explicit frame manifests: `0`
- local spine/json/frame files captured under donor or local mirror roots: `0`

## What the deep scan did find
- `bundle.js` references concrete runtime metadata candidates:
  - `img/coins/coin.json`
  - `img/ui/logo.png`
  - `img/spines/Start_page.json`
  - `img/spines/bird.json`
  - `img/spines/antisipation.json`
  - `img/spines/big_win.json`
  - `img/spines/key.json`
  - `img/spines/FS_popups.json`
  - `img/spines/stick.json`
  - `img/spines/h1.json`
  - `img/spines/h2.json`
  - `img/spines/h3.json`
  - `img/spines/m1.json`
  - `img/spines/m2.json`
  - `img/spines/m3.json`
  - `img/spines/m4.json`
  - `img/spines/scatter.json`
  - `img/spines/wild.json`

## Why atlas/frame import is still blocked
- the repo currently has bundle-discovered runtime metadata *references*, but not the referenced local files
- there are no local atlas/plist/frame manifests to parse
- there are no local paired sheet sources plus frame tables to import honestly

## Product-direction answer
- atlas/frame import is not the next best path yet
- the next best source-discovery lane is a deeper local runtime package hunt for the referenced runtime metadata files
