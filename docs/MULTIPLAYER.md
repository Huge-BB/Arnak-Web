# Multiplayer architecture

## Trust boundary

The game client is untrusted. It may render a board, animate actions, and
submit typed `EngineCommand` values, but it never mutates an authoritative
`GameState`. `RoomService` owns each state transition and calls
`applyEngineCommand()` with the acting player's room session.

```text
browser / future mini-program
  ├─ register/login ──> AuthService
  ├─ create/join/watch ──> RoomService
  └─ EngineCommand ──> authoritative RoomService ──> engine
                                         └─ projected snapshot / event
```

## Accounts and sessions

- `POST /auth/register` accepts a lowercase username, optional display name,
  and password. Passwords are hashed with Node's `scrypt` and a random salt.
- `POST /auth/login` issues a random, 30-day bearer session. Only a SHA-256
  hash of the bearer token is persisted.
- `GET /auth/me` checks the current bearer session. `POST /auth/logout`
  invalidates it.
- Authentication endpoints are rate-limited per source address. Do not log
  Authorization headers or room/session tokens.

The browser persists its bearer session and its separate room ticket in local
storage. A room ticket is also stored only as a hash server-side; it is the
credential that can submit a game command for one specific seat.

## Rooms, reconnect, and spectators

- Creating and joining a room require a signed-in account.
- A player seat is linked to the account that joined it. Joining again with
  that account rotates the room ticket and restores the existing seat instead
  of allocating another seat. This is the reconnect mechanism.
- Only the seat belonging to `hostPlayerId` starts a lobby. Only a ticket for
  the command's `playerId` can submit that player's command.
- Players cannot join after a game starts. Spectators can join before or after
  start and cannot submit commands.
- Public rooms appear in `GET /rooms`; unlisted rooms can be shared by id but
  are omitted from that list.
- A seated player may reserve one automatic pass through
  `POST /rooms/:roomId/auto-pass`. The reservation is stored with the room,
  fires only when that player next has a legal turn, then clears itself. If a
  pending choice blocks passing, it waits until the choice is resolved.

## Privacy projection

Every snapshot is individually projected before it leaves the process:

- a player sees only their own hand; all other hands are empty plus a count;
- all player decks and market/discovery deck ordering are removed;
- unresolved pending choices are visible only to their owner;
- spectators see no hand and no pending choice payloads;
- the room list exposes only lobby metadata, never game state.

This projection is an API boundary, not a front-end convention. It must remain
true for HTTP, SSE, WebSocket, replay viewers, and future clients.

## Persistence and deployment stages

`JsonFileAuthStore` and `JsonFileRoomStore` persist atomically to
`ARNAK_DATA_DIR` and serialize writes within one Node process. They provide a
usable trusted-LAN/self-hosted default and keep the persistence interface
explicit.

For public or highly available deployment, replace both stores with PostgreSQL
implementations, use a per-room transaction/row lock, store append-only game
events plus snapshots, and fan out room-change messages through Redis or NATS.
Terminate TLS at a reverse proxy, configure `ARNAK_ALLOWED_ORIGINS` exactly,
apply account/IP rate limits at the proxy, add account recovery/verification,
and monitor health and storage.

SSE is the current browser event transport. Commands and snapshots are
transport-neutral; a future WeChat mini-program should use WebSocket for
realtime snapshots, authenticate during connection setup, and reuse the same
room and engine APIs.
