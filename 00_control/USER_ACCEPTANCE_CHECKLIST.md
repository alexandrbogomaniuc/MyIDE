# User Acceptance Checklist

Use this checklist after either creating a new project or opening an existing one. Stop at the first failure and report that line.

## A. Get to a selected project
- [ ] Action: Open MyIDE and wait for the shell window. Expected: app opens with top bar and Workflow Hub. Failure sign: crash, blank window, or stuck loading.
- [ ] Action: Choose one path:
  - New project path: click **New Project** or **Start New Project**, fill required fields, paste donor URL, click **Create Project**.
  - Existing project path: open **Project Browser** and click the project card you want to continue.
  Expected: one project is clearly selected in Project summary. Failure sign: no selected project context.

## B. Investigation-first donor asset collection (required next step)
- [ ] Action: Open **Investigation** immediately after project selection. Expected: **Investigation Mode** panel is visible. Failure sign: panel does not open or stays empty.
- [ ] Action: Check launch URL readiness for this donor/project. If launch URL is missing, run:
  - `npm run donor:intake:url -- --donor-id donor_XXX --donor-name "Donor Name" --url "<guest url>"`
  Expected: launch URL is recorded and donor intake artifacts exist. Failure sign: intake command fails or launch URL remains missing.
- [ ] Action: Run coverage baseline:
  - `npm run donor-scan:coverage -- --donor-id donor_XXX`
  Expected: coverage command passes and Investigation refreshes. Failure sign: command fails or panel remains stale.
- [ ] Action: Run the profile shown by **Next Profile** (or fallback):
  - Preferred: use the profile command shown in Investigation.
  - Fallback: `npm run donor-scan:scenario -- --donor-id donor_XXX --profile default-bet --minutes 5`
  Expected: scenario run completes and appears in Investigation state. Failure sign: profile run fails or no scenario signal appears.
- [ ] Action: Follow **Next Operator Action** exactly. If it says source material is blocked/missing, run guided capture:
  - `npm run donor-scan:capture-next -- --donor-id donor_XXX --limit 5`
  Then rerun coverage.
  Expected: new/updated donor assets are harvested and Investigation guidance changes. Failure sign: repeated same blocker with no new evidence.
- [ ] Action: Repeat this loop until ready families appear:
  - coverage -> next profile -> next operator action -> capture when blocked.
  Expected: Investigation eventually shows promotion-ready families/sections. Failure sign: loop cannot produce any ready candidates.

## C. Handoff from Investigation into modification work
- [ ] Action: Promote ready families from Investigation (**Promote Ready Families**) or CLI:
  - `npm run donor-scan:promote -- --donor-id donor_XXX`
  Expected: ready items move into promotion queue. Failure sign: promotion fails or queue does not change.
- [ ] Action: Prepare the modification board (**Prepare Modification Board**) or CLI:
  - `npm run project:prepare-modification -- --project-id <project id>`
  Expected: modification board is created/refreshed with concrete tasks. Failure sign: board is missing or empty despite promoted items.
- [ ] Action: Open one prepared task with **Start Task**. Expected: task opens with **Open Compose** and/or **Open Runtime** actions based on readiness. Failure sign: task cannot open or runtime/compose actions never appear.
