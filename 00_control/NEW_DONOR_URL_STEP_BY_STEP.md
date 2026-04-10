# New Donor URL Step-by-Step

Use this when you have a brand-new guest-mode donor URL and want to start a new project in MyIDE.

## Step-by-step
1. Launch the IDE.
   - Terminal: `./run/start-myide.sh`
   - Finder: `./run/Start-MyIDE.command`
2. Open the New Project form.
   - Click **New Project** in the top bar or **Start New Project** in the Workflow Hub.
   - This opens the **Project** panel at **New Project (Start Here)**.
3. Fill in each field exactly as labeled:
   - **New Game Name (required)**: human name of the donor game.
   - **New Game ID (required)**: short id/slug for the project folder (example `example-game`).
   - **Game Family**: choose `slot`, `card`, `dice`, `crash`, or `other`.
   - **Donor ID (required)**: donor pack id (example `donor_003_example`).
   - **Donor Launch URL (starting point for a new donor)**: paste the guest-mode URL.
   - **Target Game Name (required)**: the resulting game name you are aiming for.
   - **RTP (optional)** and **Default Bet (optional)**: stored as notes.
   - **Notes**: any quick context you want to save.
4. Paste the donor URL into **Donor Launch URL**.
5. Click **Create Project**.
   - This creates `40_projects/<new game id>/` and `10_donors/<donor id>/`.
   - If the URL is present, MyIDE also captures launch HTML and donor scan artifacts.
6. Click **Start Investigation** or open the **Investigation** panel from the left rail.
7. Run the first investigation commands.
   - `npm run donor-scan:coverage -- --donor-id donor_XXX`
   - `npm run donor-scan:scenario -- --donor-id donor_XXX --profile default-bet --minutes 5`
   - If you created the project without a URL, run:
     `npm run donor:intake:url -- --donor-id donor_XXX --donor-name "Donor Name" --url "<guest url>"`
8. Follow **Next Profile** and **Next Operator Action** in Investigation.
   - If blocked, run a guided capture:
     `npm run donor-scan:capture-next -- --donor-id donor_XXX --limit 5`
9. When Investigation shows ready families, promote and prepare:
   - `npm run donor-scan:promote -- --donor-id donor_XXX`
   - `npm run project:prepare-modification -- --project-id <new game id>`
10. Move into **Modification / Compose / Runtime** only after the modification board exists.
    - Start a prepared task, then use **Open Compose** or **Open Runtime** from that task.

## What is supported now
- New Project flow creates a project and donor pack from the shell form.
- Guest-mode donor URL intake is supported from the same form.
- Investigation shows scan state, coverage, next profile, and next operator action.
- Ready families can be promoted and turned into a modification board.
- Prepared tasks can be opened in Compose or Runtime when they exist.

## What is still blocked
- Full local donor runtime packages are not fully captured yet.
- Atlas/frame import stays blocked until missing atlas page images and deeper runtime payloads are captured.
- Runtime/compose deep validation is still strongest for the current validated slice (`project_001`).
