# MyIDE Launch Scripts

Use these launchers instead of guessing which raw `npm` command to run.

## Double-Click On macOS
- Double-click `*.command` files from Finder.
- Use matching `*.sh` files when you want to launch from Terminal.

## Universal Daily Entry Point
Use one launcher for daily work:
- `./run/Start-MyIDE.command`
  - Finder-friendly double-click launcher for normal daily work.
- `./run/start-myide.sh`
  - Terminal-friendly universal launcher.

## Advanced Tools (Optional)
Use these only when you need a clean baseline or a dedicated debug window:
- `./run/Start-MyIDE-Workbench-Clean.command`
  - Finder-friendly launcher for a clean `project_001` baseline.
- `./run/start-workbench-clean.sh`
  - Reset `project_001` to the tracked baseline, refresh assets/runtime data, then open the app.
- `./run/Open-Runtime-Debug-Host.command`
  - Finder-friendly launcher for the interactive Runtime Debug Host.
- `./run/open-runtime-debug-host.sh`
  - Refresh runtime state, then open the interactive Runtime Debug Host directly.
- `./run/Refresh-Runtime-Assets.command`
  - Finder-friendly launcher for a safe runtime refresh.
- `./run/refresh-runtime-assets.sh`
  - Refresh the safe local runtime mirror/request view without opening the app.

## Which One To Use
- Daily work: `./run/Start-MyIDE.command` or `./run/start-myide.sh`
- Clean demo/test session: `./run/Start-MyIDE-Workbench-Clean.command`
- Runtime-only investigation: `./run/Open-Runtime-Debug-Host.command`
- Runtime refresh only: `./run/Refresh-Runtime-Assets.command`
- Automated proof only: `npm run smoke:electron-runtime-debug`
