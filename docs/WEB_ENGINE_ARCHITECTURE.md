# Web Engine Architecture

## Purpose

`web/` is a local, deterministic TypeScript engine for Lost Ruins of Arnak. It uses extracted TTS content as data input, but gameplay state must not depend on TTS GUIDs, object positions, or a browser DOM.

The core invariant is:

```text
GameState + typed GameAction + EngineContext -> next GameState
```

The input state is not mutated by public reducer calls. This makes hot-seat play, persistence, replay, server authority, and later multiplayer synchronization possible without changing rule semantics.

## Layers

| Layer | Main files | Responsibility |
| --- | --- | --- |
| Extracted catalogs | `web/src/generated/`, `web/scripts/extract-*.mjs` | Stable IDs, TTS artwork metadata, base pools, and research topology. |
| Manual rule overlays | `web/data/*.json` | Human-verified printed rules only. Unknown rules remain absent rather than becoming free/no-op behavior. |
| Core reducer | `web/src/engine.ts` | Setup, turns, cards, worker actions, market, research, and round cleanup. |
| Rule modules | `research-*.ts`, `guardian-actions.ts`, `assistant-effects.ts`, `leaders/` | Isolated rule families and specialized state transitions. |
| Public command API | `web/src/engine-api.ts`, `pending-choice.ts` | Client-safe action and pending-choice entry points. |
| Rendering | `web/src/main.ts`, CSS | Board-first local hot-seat client. It must call `applyEngineCommand()` only. |

## State and actions

`GameState` contains the complete serializable game: players, resources, cards, sites, market, assistant supply, research state, temple tiles, pending choices, and temporary travel.

`GameAction` is discriminated by `type`. Examples include `PLACE_WORKER`, `DISCOVER_SITE`, `ADVANCE_RESEARCH`, `OVERCOME_GUARDIAN`, `OVERCOME_LIZARD_TRACK_GUARDIAN`, `ACTIVATE_GUARDIAN_BOON`, `BUY_CARD`, and `PLAY_CARD`.

Effects that need a player choice never guess a target. They create a serialized `pendingRewards` entry. The client later submits `PendingChoice` through `applyEngineCommand()`, which validates ownership and resumes the correct resolver.

The Lizard board stores its reserved guardian in `research.templeData.lizardGuardians`, not in a normal site. This keeps the guardian visible to replay/persistence while allowing its special reveal, movement block, normal paid defeat, eligible free-defeat cards, and end-of-round Fear rule to use the same deterministic state transition model.

## Effect catalog policy

TTS card and component JSON normally provides artwork but not printed rule text. Rule data therefore lives in manual overlays:

- `assistant-effects-manual.json`: all 12 base assistant silver/gold effects.
- `guardian-effects-manual.json`: all 15 base guardian costs and one-use boons.
- `card-effects-manual.json`: all 75 verified base market-card effects and action timing.
- `research-manual-data.json` and `research-rewards-manual.json`: validated overlays over generated research topology.

`npm run audit:cards` reports base-market-card coverage. It currently verifies 75/75 base-market cards; the remaining engine-complete catalog gap is research bridge costs.

## Assets

`assets:manifest` inventories source image URLs. `assets:localize` stores sheets locally and produces a local runtime map. `assets:localize:crop` produces one WebP per catalog face/back. The client prefers cropped images, avoiding browser interpolation artifacts from CSS sprite-sheet slicing.

Existing local sheets are reused by default. Network access is needed only for absent sheets or `--force`.

## Verification

`npm test` runs research validation, routing audit, card-coverage audit, dedicated special-rule tests, and the core engine suite. `npm run build` validates the Vite client. `npm run assets:validate:local` proves every runtime asset URL resolves inside `web/public/assets/`.

Tests only prove the scenarios they cover. Coverage numbers in progress documents are part of the acceptance evidence and should be updated whenever a manual overlay changes.
