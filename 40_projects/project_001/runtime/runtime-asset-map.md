# Project 001 Runtime Asset Map

## Confirmed

### Confirmed from local mirror manifest
- `manifest.json` contains `46` grounded mirrored entries.
- confirmed mirrored preloader/static assets:
  - `preloader-assets/a.png`
  - `preloader-assets/b.png`
  - `preloader-assets/g.png`
  - `preloader-assets/i.png`
  - `preloader-assets/m.png`
  - `preloader-assets/n.png`
  - `preloader-assets/logo.png`
  - `preloader-assets/logo.jpg`
  - `preloader-assets/logo-lights.png`
  - `preloader-assets/spin.gif`
  - `preloader-assets/spin2.gif`
  - `preloader-assets/spin3.gif`
  - `preloader-assets/split.png`
- confirmed mirrored runtime/bootstrap scripts:
  - `bundle.js`
  - multiple `loader.js?...` variants
  - `drops-fe bundle.js`
  - `lobby-bundle.js`
  - `wrapper.js`
  - `amplitude.js`
  - `replays.js`
  - `rsa-plugins.js`
  - `rsa-plugins-remote-XhrQueue.min.js`

### Confirmed from request harvest
- request-backed local/proxy hits exist for:
  - `http://127.0.0.1:38901/runtime/project_001/assets/bundle.js`
  - `https://drops-fe.bgaming-network.com/bundle.js`
  - `https://lobby.bgaming-network.com/lobby-bundle.js`
  - `https://boost2.bgaming-network.com/analytics/amplitude.js?game=MysteryGarden`
  - `https://boost2.bgaming-network.com/wrapper.js`
  - `https://replays.bgaming-network.com/replays.js`
- exact current blocker:
  - `request-log.latest.json` still contains `0` request-backed static image entries

## Likely

### Likely from loader and bundle string tables
- `loader--q1774630728.js` explicitly sets:
  - `resources_root_path`
  - `resources_path`
  - version folder `v0.0.15_53dc164`
  - `bundle.js`
- `bundle.js` contains concrete runtime asset references for:
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
  - `https://translations.bgaming-network.com/MysteryGarden`

## Provisional
- atlas/frame metadata files paired with the above bundle-discovered paths
- runtime font payloads
- translation payload structure
- runtime animation sheet ownership beyond the string references

## Product-direction answer
- strongest source-discovery opportunity now:
  - chase the bundle-discovered `img/spines/*.json`, `img/coins/coin.json`, `img/ui/logo.png`, and translations roots into a deeper local donor/runtime package hunt
- not the next best path:
  - atlas/frame import from current local files alone
