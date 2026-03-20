# External Game Contract Map

## Intent
Translate the currently observable reference runtime contract into a developer-ready checklist for later MyIDE adapter work.

## Proven Facts

### Session Start / Enter
- The observable legacy launch flow starts at `cwstartgamev2.do`, expects a `302`, extracts `SID` and `BANKID`, validates the session through GS-internal `session/validate`, and then opens NGS via `/v1/opengame`. Evidence: `new-games-server/scripts/runtime-e2e.sh:9-17`, `new-games-server/scripts/runtime-e2e.sh:65-123`.
- The reference entrypoint is `POST /v1/opengame`, not separate `start` and `enter` endpoints. Evidence: `new-games-server/README.md:10-15`, `new-games-server/src/index.ts:550-677`.
- `opengame` validates the session against GS internal APIs when `gsInternalBaseUrl` exists and falls back to mock behavior when it does not. Evidence: `new-games-server/src/index.ts:401-433`, `new-games-server/src/index.ts:557-656`.
- Reopening an existing session returns the same in-memory session state and current request counter. Evidence: `new-games-server/src/index.ts:563-584`, `new-games-server/test/ngs-failure-reconnect.e2e.test.ts:105-139`.

### Process Transactions
- `placebet` is the reserve step: it validates session + request counter, reserves wallet funds, computes the deterministic outcome, stores round state, and returns `nextAction: ["COLLECT"]`. Evidence: `new-games-server/src/index.ts:680-808`.
- `collect` is the settle step: it validates session + round + request counter, performs wallet settle if the round is not already collected, marks the round as collected, and returns balance + win amount. Evidence: `new-games-server/src/index.ts:811-902`.
- History writes are asynchronous side effects on both place and collect paths. Evidence: `new-games-server/src/index.ts:765-779`, `new-games-server/src/index.ts:875-885`.

### Get Balance
- There is no dedicated `getBalance` endpoint in the current reference API list.
- Balance is returned on `opengame`, `placebet`, and `collect`. Evidence: `new-games-server/src/index.ts:659-677`, `new-games-server/src/index.ts:781-801`, `new-games-server/src/index.ts:888-895`.

### Restart / Recovery
- Restart-like recovery currently means reopening the same session through `opengame` and continuing with the preserved in-memory request counter. Evidence: `new-games-server/test/ngs-failure-reconnect.e2e.test.ts:105-139`.
- `opengame` can recover from a stale SID mismatch by retrying GS validation with the expected session ID. Evidence: `new-games-server/src/index.ts:591-612`, `new-games-server/test/ngs-failure-reconnect.e2e.test.ts:141-169`.

### Close
- No dedicated `close` endpoint was found in the current reference server.

### Error Handling
- Session validation timeouts return `502 GS_SESSION_VALIDATE_FAILED`. Evidence: `new-games-server/src/index.ts:613-634`, `new-games-server/test/ngs-failure-reconnect.e2e.test.ts:19-39`.
- Reserve timeouts return `502 GS_WALLET_RESERVE_FAILED`. Evidence: `new-games-server/src/index.ts:727-734`, `new-games-server/test/ngs-failure-reconnect.e2e.test.ts:41-68`.
- Settle timeouts return `502 GS_WALLET_SETTLE_FAILED`. Evidence: `new-games-server/src/index.ts:858-865`, `new-games-server/test/ngs-failure-reconnect.e2e.test.ts:70-103`.
- Out-of-order requests return `409 INVALID_REQUEST_COUNTER`. Evidence: `new-games-server/src/index.ts:696-704`, `new-games-server/src/index.ts:828-836`, `new-games-server/src/index.ts:911-918`, `new-games-server/test/ngs-contract.e2e.test.ts:88-103`.

### State Ownership
- Session state, request counters, balances, and round state are owned by the server process in memory during the current reference flow. Evidence: `new-games-server/src/index.ts:15-37`, `new-games-server/src/index.ts:120-123`, `new-games-server/src/index.ts:646-656`, `new-games-server/src/index.ts:751-763`.

### Idempotency / Request Queue
- The current reference design does not implement a durable queue, but it does implement ordering and replay protection through request counters and idempotent response maps keyed by client operation IDs. Evidence: `new-games-server/src/index.ts:302-305`, `new-games-server/src/index.ts:691-693`, `new-games-server/src/index.ts:823-825`.

## Assumptions / Inferences
- For MyIDE planning, `start` and `enter` should be treated as parts of the `opengame` handshake unless later GS evidence proves a stricter separation.
- A future MyIDE request queue will need durability beyond the reference server's in-memory maps.

## Missing / Not Yet Proven
- HMAC behavior: no HMAC generation or verification logic was found in the current reference server code searched for PHASE 0/1.
- Public request-signature validation: not present in the current NGS handlers or `.env.example`. Evidence: `new-games-server/src/index.ts:352-399`, `new-games-server/.env.example:1-3`.
- Dedicated close/restart endpoints: not present in the current reference server.
- Durable recovery store: not present in the current reference server.

## Developer Checklist For Later Adapter Work
- Reproduce `opengame` session validation behavior.
- Reproduce monotonic request counter checks.
- Preserve idempotency keys across retryable reserve/settle operations.
- Model reopen/restart as state recovery, not as unconditional fresh start.
- Add explicit balance ownership rules.
- Add durable queue + restart recovery design before production integration.
- Keep HMAC marked as unresolved until evidence is collected from the real GS path.
