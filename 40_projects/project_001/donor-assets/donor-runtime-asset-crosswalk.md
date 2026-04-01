# Project 001 Donor Runtime Asset Crosswalk

| Status | Source family | Grounded evidence | Local file status | Notes |
| --- | --- | --- | --- | --- |
| confirmed | preloader images | `local-mirror/manifest.json` | present locally | mirrored under `cdn.bgaming-network.com/*.png|jpg|gif` |
| confirmed | runtime bundle | `bundle.js` in local mirror + request harvest | present locally | request-backed `bundle.js` hit exists |
| confirmed | runtime/bootstrap scripts | manifest + request harvest | present locally | `drops-fe`, `lobby`, `wrapper`, `amplitude`, `replays`, `rsa-plugins` |
| likely | spine runtime metadata | `bundle.js` string table | missing locally | concrete `img/spines/*.json` references found |
| likely | coin metadata | `bundle.js` string table | missing locally | `img/coins/coin.json` reference found |
| likely | UI logo runtime asset | `bundle.js` string table | missing locally | `img/ui/logo.png` reference found; mirror manifest also logged a skipped unavailable candidate |
| likely | translations | `bundle.js` string table | missing locally | translations root referenced but not captured locally |
| provisional | frame/atlas import sources | none beyond runtime string hints | missing locally | no atlas/plist/frame manifests captured |
