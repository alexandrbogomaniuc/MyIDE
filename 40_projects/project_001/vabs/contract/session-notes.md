# Session Fixture Notes

- File: `contract/sample-playerBets-session.json`
- Reserved raw local-only captured path: `contract/captured-playerBets-session.json`
- Reserved sanitized commit-safe captured path: `contract/captured-playerBets-session.sanitized.json`
- Status: derived session-level `playerBets[]` fixture
- Current session tier: derived
- Current row truth:
  - row 0: derived base-spin neighbor row
  - row 1: derived free-spins-trigger row with one grounded live `ROUND_ID`
  - row 2: derived free-spins-active neighbor row
- No captured archived `playerBets[]` session is committed yet.
- `auto` session selection must only promote the sanitized captured session path.
- The raw local-only session path may be used only intentionally through the captured-session sanitize/verify flow.
- The current shell mock uses this session file to mimic a support/history row list and row-click replay flow without claiming a real GS `/vabs/show.jsp` deployment.
- GS-VABS-L stops at that derived-session truth on purpose until a real sanitized archived session or row exists.
- Operator handoff docs:
  - `contract/operator-session-capture-request.md`
  - `contract/operator-row-capture-request.md`
