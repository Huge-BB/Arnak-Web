# Arnak Web Operations Guide

This guide covers the current local/hot-seat client and the account-backed LAN
room service. It is intentionally separate from the rule-engine architecture:
operations must never alter game rules or bypass `applyEngineCommand()`.

## Local development

```powershell
npm install
npm run dev
```

Open the Vite address printed by the command (normally
`http://localhost:5173`). The start screen offers local hot-seat play and the
LAN room lobby. Useful companion pages are `/atlas.html` for card-rule review
and `/calibrate.html` for visual coordinate recording.

## Trusted LAN test

Run the game client and the authoritative room service in separate terminals:

```powershell
npm run server:rooms
```

```powershell
npm run dev -- --host 0.0.0.0
```

The room service listens on port `8787` by default; set `ARNAK_ROOM_PORT` to
change it. On each device, open the host machine's Vite LAN address, select
the LAN lobby, and use the same room-service address (`http://HOST:8787`).

Register or sign in before creating or joining. The host creates the room,
other players join, and only the host can start. A returning account receives
its existing seat with a fresh room ticket, so refresh and reconnect are
supported while the room persists. Spectators may join a running game but are
read-only. During a game, `≫` reserves one automatic skip for your next turn;
`⏸` cancels it before it fires.

## Authority and privacy guarantees

- The browser sends typed `EngineCommand` values only. The room service owns
  the authoritative `GameState` and calls the same public engine API as local
  hot-seat play.
- A ticket may act only for its assigned player seat. Spectators cannot send
  commands. Tickets are stored server-side only as hashes.
- Snapshots are projected per viewer: a player receives their own hand, while
  other hands, decks, market decks, and discovery decks are represented only
  by counts.
- Server-Sent Events deliver state changes after start and accepted commands.
- Pending-choice payloads are projected only to their owner, avoiding leaks of
  private hand/card choices.

This is appropriate for a trusted household/LAN test. Accounts and file-backed
persistence are included, but public deployment still requires TLS
termination, an exact origin allowlist, reverse-proxy rate limits, durable
database stores, and production observability. See `MULTIPLAYER.md`.

## Verification commands

```powershell
npm run assets:validate:local
npm test
npm run test:rooms-http
npm run build
```

`test:rooms-http` is an end-to-end protocol smoke test. It starts a disposable
server on port `18887` (override with `ARNAK_SMOKE_ROOM_PORT`), creates and
joins a two-player room, starts it, asserts both private snapshot views, then
subscribes through SSE and verifies that an accepted command pushes an updated
snapshot.

## Configuration

Copy `.env.example` into your deployment environment. `ARNAK_DATA_DIR` holds
the file-backed account and room data; back it up for a self-hosted service.
Set `ARNAK_ALLOWED_ORIGINS` to the exact comma-separated Web client origins.
The secure default admits only local Vite origins, so a LAN/deployed client
must be explicitly added.

## Production/container direction

Keep the Vite static client separate from the room-service process. The room
server is intentionally stateless above its `RoomStore` interface. Replace
the in-memory implementation before using more than one process or allowing
restarts:

1. Persist room metadata, append-only command events, and periodic snapshots
   in PostgreSQL. Serialize a command with a per-room transaction/row lock.
2. Publish room-change notices through Redis or NATS so SSE clients connected
   to any replica refresh after a command.
3. Put HTTPS/TLS, origin policy, authentication, request limits, health checks,
   and metrics at the reverse proxy/service boundary.
4. Treat the engine replay event stream as the recovery source; do not persist
   client-rendered state as authority.

The HTTP routes and `RoomStore` boundary are designed so this replacement does
not require changes to reducer semantics or the browser command protocol.

## Current non-goals

- Public matchmaking, invitations, account recovery, and reconnect across a
  server restart when using the file-backed store.
- Rule changes inferred from artwork. Unverified research data stays disabled
  in the engine.
- Pixel-perfect board calibration. The coordinate collector preserves existing
  user marks; it never silently overwrites their recorded positions.
