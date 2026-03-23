# Manual Bug Template

Fast path: run `npm run manual:bug-bundle` to create a timestamped bug folder under `/Users/alexb/Documents/Dev/MyIDE_manual_reports/` with this template prefilled, current context already captured, and an `attachments/` folder ready for screenshots or exported files.

If you only need a quick copy/paste text block, run `npm run manual:bug-context` first and paste its output into the top fields below.

```md
Date/time:
Local commit SHA:
Local phase:
Public/main SHA:
Feature area:
Local/public/handoff status:

Exact steps:
1.
2.
3.

Expected result:

Actual result:

Screenshot / file paths:

Issue visible in:
- [ ] LOCAL only
- [ ] PUBLIC too
- [ ] HANDOFF / publish flow

Extra notes:
```

## Evidence Checklist
- One screenshot or exact file path
- The bug-context output from `npm run manual:bug-context` or the `context.txt` file from `npm run manual:bug-bundle`
- The exact step number where the issue appeared
- Whether the issue is only local or also present in public state
