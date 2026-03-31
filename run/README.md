# MyIDE Launch Scripts

Use these scripts instead of guessing which raw `npm` command to run.

## Recommended Daily Entry Points
- `./run/start-workbench.sh`
  - Refresh donor assets, refresh the safe runtime mirror view, then open the main MyIDE app.
- `./run/start-workbench-clean.sh`
  - Reset `project_001` to the tracked baseline, refresh assets/runtime data, then open the app.
  - Use this only when you want a clean test session.
- `./run/open-runtime-debug-host.sh`
  - Open the dedicated Runtime Debug Host directly.
- `./run/refresh-runtime-assets.sh`
  - Refresh the safe local runtime mirror/request view without opening the app.

## Which One To Use
- Normal day-to-day work: `./run/start-workbench.sh`
- Clean demo/test session: `./run/start-workbench-clean.sh`
- Runtime-only investigation: `./run/open-runtime-debug-host.sh`
- Refresh runtime evidence only: `./run/refresh-runtime-assets.sh`
