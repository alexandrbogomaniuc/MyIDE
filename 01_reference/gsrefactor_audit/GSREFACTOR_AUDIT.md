# GSRefactor Audit

## Scope
This PHASE 0/1 audit treats the current local `new-games-client` and `new-games-server` repositories as the reference/upstream stack for MyIDE.

## Proven Facts

### Client Stack
- The client repo is a private TypeScript ESM app using Vite for dev/build and Pixi as its main runtime dependency. Evidence: `new-games-client/package.json:1-14`.
- The client currently targets a game-specific runtime shell rather than a generic editor. Evidence: `new-games-client/README.md:3-7`, `new-games-client/README.md:22-76`.
- The client already understands GS launch parameters from URL query strings and casing variants. Evidence: `new-games-client/README.md:48-54`.

### Server Stack
- The server repo is a private TypeScript ESM app using Fastify and `tsx`. Evidence: `new-games-server/package.json:1-19`.
- The service contract exposes `opengame`, `placebet`, `collect`, and `readhistory`. Evidence: `new-games-server/README.md:10-15`, `new-games-server/src/index.ts:542-547`.
- Runtime state is currently held in in-memory `Map` objects for sessions, rounds, and idempotent responses. Evidence: `new-games-server/src/index.ts:120-123`.
- The server enforces monotonic request counters per session. Evidence: `new-games-server/src/index.ts:193-199`, `new-games-server/src/index.ts:696-704`, `new-games-server/src/index.ts:828-836`, `new-games-server/src/index.ts:911-918`.
- The server performs wallet reserve on `placebet` and wallet settle on `collect`, with idempotency keys derived from client operation IDs when present. Evidence: `new-games-server/src/index.ts:435-500`, `new-games-server/src/index.ts:691-805`, `new-games-server/src/index.ts:823-899`.
- The server includes contract-compatible mock GS-internal endpoints for local integration tests. Evidence: `new-games-server/src/index.ts:944-963`.
- The tests cover happy path, idempotency, counter validation, timeout handling, reconnect preserving state, and stale SID recovery. Evidence: `new-games-server/test/ngs-contract.e2e.test.ts:18-166`, `new-games-server/test/ngs-failure-reconnect.e2e.test.ts:19-169`.
- The runtime scripts show a legacy GS bridge path: launch begins at `cwstartgamev2.do`, expects a `302`, extracts `SID` and `BANKID`, validates via `/gs-internal/newgames/v1/session/validate`, and then calls NGS `opengame`; deploy tooling patches Java start-action classes and `NewGamesInternalApiServlet` into GS. Evidence: `new-games-server/scripts/runtime-e2e.sh:9-17`, `new-games-server/scripts/runtime-e2e.sh:65-123`, `new-games-server/scripts/deploy-gs-runtime.sh:18-18`, `new-games-server/scripts/deploy-gs-runtime.sh:46-51`, `new-games-server/scripts/deploy-gs-runtime.sh:107-123`.

## Reusable For MyIDE
- TypeScript-first dev ergonomics and small-tooling footprint.
- Fastify contract patterns for local runtime/mock integration.
- Request counter and idempotency concepts for future adapter work.
- URL launch-param parsing concepts from the client side.
- Legacy GS bridge checkpoints and proof-script structure as evidence sources for later adapter design.
- Proof-pack and runtime status ideas as release-readiness patterns, even if MyIDE does not reuse the scripts directly. Evidence: `new-games-server/README.md:57-98`.

## Not Directly Reusable
- The current client is game-specific and Plinko-focused, not slot-editor-aware. Evidence: `new-games-client/README.md:3-4`, `new-games-client/README.md:22-76`.
- The current server stores state in process memory, which is useful for PHASE 1 reference behavior but not sufficient proof of release-grade durability. Evidence: `new-games-server/src/index.ts:120-123`.

## Assumptions / Inferences
- A MyIDE preview shell can reuse the reference repos' TypeScript build culture without copying game-specific code directly.
- The reference repos are closer to a runtime slice than to a donor reconstruction platform, so MyIDE should reuse patterns more than files.

## TODO Investigation Items
- Inspect whether any reusable utility code in the reference repos is worth extraction after license checks.
- Verify if there are external GS runtime documents or scripts that express contract details not visible in the current server repo.
- Audit how much of the client-side launch bootstrap can become a reusable MyIDE adapter helper later.
