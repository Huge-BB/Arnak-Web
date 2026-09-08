# Arnak Web Engine

This repository is the local, deterministic TypeScript implementation of Lost Ruins of Arnak. It contains both the rules engine and a BGA-oriented board-first Vite hot-seat client. Its localized artwork was initially sourced from the Tabletop Simulator mod, but the game runtime has no TTS dependency.

Read [`docs/WEB_ENGINE_ARCHITECTURE.md`](docs/WEB_ENGINE_ARCHITECTURE.md) for boundaries and data flow, [`docs/WEB_ENGINE_PROGRESS.md`](docs/WEB_ENGINE_PROGRESS.md) for the authoritative implementation checklist, and [`data/CATALOGS.md`](data/CATALOGS.md) before editing verified-rule overlays.

## Run the local demo

```powershell
npm install
npm run dev
```

Open the Vite address printed in the terminal (normally `http://localhost:5173`). The local client uses the full local Bird/Snake main-board artwork plus an independently selectable Bird/Snake/Monkey/Lizard research panel. It renders 22 base-board worker slots, local card art, assistants, pending-choice controls, and sends every game action through the public `applyEngineCommand()` API.

## Verify a change

```powershell
npm run assets:validate:local
npm test
npm run test:rooms-http
npm run build
```

- `assets:validate:local` verifies the 602 local asset references and their sprite metadata.
- `npm test` runs research validation, routing and card coverage audits, special-rule tests, and core engine integration tests.
- `npm run test:rooms-http` starts a disposable room server and verifies the browser HTTP contract: create, join, start, snapshot projection, and private hands.
- `npm run build` produces and validates the Vite production bundle.

Useful focused commands are `npm run audit:cards`, `npm run audit:assistants -- --strict`, and `npm run validate:research`.

## Automation CLI

`npm run engine:cli` is a JSONL facade over the same public command API used by the client. It is intended for scripted simulations and future agent-vs-agent tests: the first line creates a game, later lines are `EngineCommand` values, and each accepted input produces a complete serializable state snapshot. A normal base-board setup is supplied automatically before `START_GAME` when the state has no sites.

```powershell
@'
{"type":"create-game","players":["p1","p2"]}
{"type":"action","action":{"type":"START_GAME","seed":"test-1","researchBoard":"monkey"}}
{"type":"action","action":{"type":"PLACE_WORKER","playerId":"p1","siteId":"camp-1-a"}}
'@ | npm run engine:cli
```

## Local multiplayer rooms (foundation)

Run the authoritative local/LAN room server in a second terminal:

```powershell
npm run server:lan
```

It listens on `http://127.0.0.1:8787` by default (`ARNAK_ROOM_PORT` changes the port). The protocol deliberately separates browser identity from game authority: create a room with `POST /rooms`, join through `POST /rooms/:roomId/join`, start it with `POST /rooms/:roomId/start`, submit an `EngineCommand` to `POST /rooms/:roomId/commands`, and subscribe through `GET /rooms/:roomId/events?token=…` using Server-Sent Events.

For a trusted LAN test, start the room service on the host and expose Vite on the LAN:

```powershell
# terminal 1
npm run server:rooms

# terminal 2
npm run dev:lan
```

Open the Vite address using the host's LAN IP on each device, choose **局域网房间**, then create or join a room. The browser defaults its room-service address to the same host on port `8787`; it can be changed in the lobby. The opaque room token is stored only in that browser's local storage, allowing a refresh/reconnect during the same server lifetime.

The server is authoritative and uses the same `applyEngineCommand()` facade as the local client. Each connection receives a player-specific snapshot: only its own hand is present; other hands, deck ordering, market decks, and discovery decks are reduced to counts.

`src/room-service.ts` owns room permissions, deterministic game setup, command validation, and SSE fan-out. It depends on the narrow `RoomStore` interface in `src/room-store.ts`, rather than directly on process memory. The included `InMemoryRoomStore` is intentionally for development only: restarting it clears rooms. It still serializes writes per room, records an append-only start/command event stream, and snapshots at game start and every 20 commands.

For a containerized deployment, keep the HTTP/SSE process stateless and implement `RoomStore` with a durable database transaction (for example, PostgreSQL `SELECT ... FOR UPDATE` per room). Store room metadata, event log, and snapshots there; then publish room-change notifications through Redis or NATS so SSE connections on other replicas refresh their local clients. This preserves the engine API and room HTTP contract while allowing multiple server replicas. Authentication, matchmaking, and a network-client UI are separate next layers.

## Engine model

```text
GameState
  |- phase, round, active player, and turn order
  |- player mats: resources, decks, hands, assistants, leaders, guardians
  |- sites, discovery decks, idols, and market
  |- research nodes, bonus tiles, temple state, and board-specific data
  `- serialized pending choices and the temporary-travel action window

EngineCommand
  `- typed action or typed pending-choice resolution

applyEngineCommand(state, command, context)
  `- next serializable GameState

EngineReplay
  `- JSON-safe initial GameState + canonical EngineCommand history
  `- replayEngineCommands(replay, context) -> deterministic final GameState
```

UI state such as hover, zoom, selected card, and animation progress must stay outside `GameState`. Browser, replay, network, and future server callers should never import a specialised reducer directly; submit a typed command through `applyEngineCommand()` instead.

`scoreFinishedGame(state, context)` returns the final per-player breakdown, ranking, and tie result once `state.phase` is `finished`. It scores research, temple tiles, idols and empty idol slots, guardians, and printed point values on all cards still owned by the player; exiled cards are not scored.

## Rule data and current coverage

Generated data identifies TTS components and artwork. Printed rules are deliberately held in reviewable JSON overlays under `data/`; unknown entries are omitted rather than guessed. The current manual validator reports 83/83 recorded research bridges and 58/58 reward entries as verified. `audit:cards` reports all 75 base-market effects mapped; Expedition Leaders and Surprise Shipment market effects are also represented in dedicated effect overlays and should be reviewed in the atlas before being called rules-final. Monkey and Lizard magnifying glass tokens may buy the 2-point temple tile from the penultimate row, or a 2- or 6-point tile from the final row before entering the Lost Temple. Tent-site activation, archaeologist and guardian relocation, immediate-pass alternatives, one-action travel/discovery discounts, and all-travel-as-plane effects are represented as executable rules. A card option that says “gain this and pass” is modelled as one atomic resolution: award it, then immediately pass and rotate the turn. Fear is a burden card: it cannot be played, but remains a legal discard/removal target.

The engine includes board-specific Temple behavior, including the Lizard track guardian. Its runtime state is serialized with research data: it is seeded from the guardian deck, revealed by a magnifying glass, blocks advancement beyond its row, uses ordinary guardian costs, and can be targeted by an explicitly eligible free-guardian card.

Green tests prove only the transcribed rules and covered flows; they are not a claim that the remaining printed catalogs are complete.

## Coverage update

All four research boards now have 83 verified executable bridges. Monkey includes its distinct magnifying-only two-level artifact space and Journal route. A printed discard-card payment (fifth camp, applicable guardian costs, Sacred Drum-style effects, or Monkey research) always moves a chosen hand card into the current round's used/play area.

## Frontend direction

The renderer is dominated by the full map board and selected research board, uses local artwork and icon-led interactions, and keeps decorative text to a minimum. Remaining frontend work is precise visual hotspot QA and support for the less common structured pending-choice flows.
