# Session Fixture Notes

- File: `contract/sample-playerBets-session.json`
- Status: derived session-level `playerBets[]` fixture
- Current session tier: derived
- Current row truth:
  - row 0: derived base-spin neighbor row
  - row 1: derived free-spins-trigger row with one grounded live `ROUND_ID`
  - row 2: derived free-spins-active neighbor row
- No captured archived `playerBets[]` session is committed yet.
- The current shell mock uses this session file to mimic a support/history row list and row-click replay flow without claiming a real GS `/vabs/show.jsp` deployment.
