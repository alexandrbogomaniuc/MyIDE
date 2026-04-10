# User Acceptance Checklist

Use this list to confirm the currently supported path works end to end. Stop at the first failure and report that line.

- [ ] Action: Open MyIDE and wait for the main shell window. Expected: the app opens and shows the top bar. Failure sign: app crash, blank window, or stuck loading state.
- [ ] Action: Click **New Project** (top bar) or **Start New Project** (Workflow Hub). Expected: **New Project (Start Here)** form appears. Failure sign: wrong panel opens or nothing happens.
- [ ] Action: Paste a guest-mode URL into **Donor Launch URL**. Expected: URL stays in the field. Failure sign: field rejects it or clears it.
- [ ] Action: Fill required fields and click **Create Project**. Expected: status confirms project scaffold creation. Failure sign: error toast/message or no status change.
- [ ] Action: Open **Investigation** from the left rail or button. Expected: **Investigation Mode** panel appears. Failure sign: panel missing or not reachable.
- [ ] Action: Check Investigation summary. Expected: visible scan/coverage state plus **Next Profile** and **Next Operator Action** guidance. Failure sign: empty panel or missing next-step guidance.
- [ ] Action: Run `npm run donor-scan:coverage -- --donor-id donor_XXX`. Expected: command passes and Investigation refreshes. Failure sign: command error or no panel update.
- [ ] Action: Run `npm run donor-scan:scenario -- --donor-id donor_XXX --profile default-bet --minutes 5`. Expected: scenario run finishes and appears in Investigation. Failure sign: command error or no scenario signal.
- [ ] Action: Promote ready families from Investigation (**Promote Ready Families**) or CLI (`npm run donor-scan:promote -- --donor-id donor_XXX`). Expected: ready items move to promotion queue. Failure sign: promotion fails or nothing is queued.
- [ ] Action: Prepare the modification board (**Prepare Modification Board**) or CLI (`npm run project:prepare-modification -- --project-id <new game id>`). Expected: modification board is created/refreshed. Failure sign: no board state appears.
- [ ] Action: Open one prepared task with **Start Task**. Expected: task opens with **Open Compose** and/or **Open Runtime** actions based on readiness. Failure sign: task cannot open or runtime/compose actions never appear.
