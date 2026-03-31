# MyIDE Launch Scripts

Use these launchers instead of guessing which raw `npm` command to run.

## Double-Click On macOS
- Double-click `*.command` files from Finder.
- Use matching `*.sh` files when you want to launch from Terminal.

## Recommended Daily Entry Points
- `./run/Start-MyIDE-Workbench.command`
  - Finder-friendly double-click launcher for normal daily work.
- `./run/start-workbench.sh`
  - Refresh donor assets, refresh the safe runtime mirror view, then open the main MyIDE app.
- `./run/Start-MyIDE-Workbench-Clean.command`
  - Finder-friendly double-click launcher for a clean `project_001` baseline.
- `./run/start-workbench-clean.sh`
  - Reset `project_001` to the tracked baseline, refresh assets/runtime data, then open the app.
  - Use this only when you want a clean test session.
- `./run/Open-Runtime-Debug-Host.command`
  - Finder-friendly double-click launcher for the interactive Runtime Debug Host.
- `./run/open-runtime-debug-host.sh`
  - Open the interactive Runtime Debug Host directly.
- `./run/Refresh-Runtime-Assets.command`
  - Finder-friendly double-click launcher for a safe runtime refresh.
- `./run/refresh-runtime-assets.sh`
  - Refresh the safe local runtime mirror/request view without opening the app.

## Which One To Use
- Double-click normal day-to-day work: `./run/Start-MyIDE-Workbench.command`
- Double-click clean demo/test session: `./run/Start-MyIDE-Workbench-Clean.command`
- Double-click runtime-only investigation: `./run/Open-Runtime-Debug-Host.command`
- Double-click runtime refresh only: `./run/Refresh-Runtime-Assets.command`
- Automated proof only: `npm run smoke:electron-runtime-debug`
