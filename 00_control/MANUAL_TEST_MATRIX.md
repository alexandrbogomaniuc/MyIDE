# Manual Test Matrix

| Area | Quick Steps | Expected Result | Capture If It Fails |
| --- | --- | --- | --- |
| Prepare session | Run `npm run manual:prepare:project_001` | `project_001` resets to tracked baseline, sync/validation pass, and the command tells you to start `npm run dev` | Full terminal output plus any refusal/error text |
| Launch | Run `npm run dev` | Shell window opens | Screenshot of the window or crash text |
| Bridge health | Look at the bridge card | Healthy/connected state is visible | Screenshot of bridge card and any error text |
| Project load | Open `project_001` | Scene/layer/object list appears | Screenshot of project browser + inspector |
| Create/edit | Create one preset object and edit one field | New object appears and inspector accepts the edit | Screenshot before/after plus field name |
| Move | Drag the object once | Object follows the pointer and stays selected | Screenshot of canvas + selected object |
| Resize/align | Resize once and use one align action | Size and position visibly change | Screenshot after the failed step |
| Reassign/reorder | Move object to another layer and change order once | Layer/order change is reflected in the UI | Screenshot of inspector + scene explorer |
| Duplicate/delete | Duplicate once, then delete the duplicate | One copy remains, duplicate disappears | Screenshot of object list before/after |
| Undo/redo | Undo once, redo once | Object returns to old state, then back to new state | Screenshot or note the exact state chain |
| Save/reload | Save, then reload from disk | Final intended state survives reload | Screenshot after reload plus any mismatch note |
| Bug context | Run `npm run manual:bug-context` after a failure | Concise local/public/handoff bug context is printed | Copy the full bug-context output |
