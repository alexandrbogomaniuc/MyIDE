# New Donor URL Quick Start

Use this when you have a brand-new donor guest-mode URL and want to start a fresh donor-to-release cycle.

## Step-by-step
1. Launch the IDE with `./run/start-myide.sh` (or `./run/Start-MyIDE.command` from Finder).
2. In the left rail, open the `Project` panel and find **New Project**.
3. Fill in **New Game Name** with the project you are starting.
4. Fill in **New Game ID** (the folder name under `40_projects/`).
5. Choose **Game Family** (slot, card, dice, crash, other).
6. Fill in **Donor ID** (example `donor_003_example`).
7. Paste the guest-mode URL into **Donor Launch URL** (this is the starting point).
8. Fill in **Target Game Name** with the name of the game you are building.
9. Optional: add **RTP** or **Default Bet** if you want them saved into Notes.
10. Click **Create Project**. This scaffolds `40_projects/<slug>` and `10_donors/<donorId>` and captures donor launch evidence.
11. Switch to **Investigation** and run the first scan. Command: `npm run donor-scan:coverage -- --donor-id donor_003_example`.
12. Run one bounded scenario profile. Command: `npm run donor-scan:scenario -- --donor-id donor_003_example --profile default-bet --minutes 5`.

## What to do next
1. Review the Investigation panel for coverage, blocked families, and the next profile or operator action.
2. If blocked, run a guided capture. Command: `npm run donor-scan:capture-next -- --donor-id donor_003_example --limit 5`.
3. When ready candidates appear, promote them. Command: `npm run donor-scan:promote -- --donor-id donor_003_example`.
4. Prepare the modification board. Command: `npm run project:prepare-modification -- --project-id project_003_example`.
5. Open the **Modification / Compose / Runtime** workflow and start a task.

## Notes
- Raw donor files under `10_donors/<donorId>/raw` remain read-only.
- Investigation is the truth surface for the donor-to-release handoff.
- If you created a project without a launch URL, run `npm run donor:intake:url -- --donor-id donor_003_example --donor-name "Donor Name" --url "<launch url>"` after you paste the URL.
