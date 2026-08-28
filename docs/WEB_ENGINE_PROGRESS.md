# Arnak Web Engine Progress

Last updated: 2026-08-25
Branch: `web-engine/implementation`

This document tracks the long-running conversion of the TTS implementation into a deterministic web game engine. It should be updated together with engine changes so that implementation status does not depend on GitHub Issues or Wiki availability. For run, LAN, and deployment operations, see `WEB_OPERATIONS.md`.

## Current state

The core engine is already substantial. Turn flow, market, Dig/Discover, sites, guardians, idols, assistants, research tracks, and Temple arrival are represented in the TypeScript engine and covered by focused tests. Research topology is complete, but its printed cost/reward transcription is still deliberately partial and cannot yet support a complete-rules claim.

A Vite local hot-seat demo is available in `web/`. Its BGA-oriented board-first view treats the local two-sided main board (Bird/Snake) and the independently selectable Bird/Snake/Monkey/Lizard research boards as dominant surfaces. The main-board overlay now exposes all 22 base-board worker slots: both spaces on each of the five printed camps, eight Level I discovery sites, and four Level II discovery sites. Camps use their own printed reward codes directly; discovered sites still use the shuffled site-tile deck. Card, market, worker-placement, end-turn, pass, and verified research commands all go through `applyEngineCommand()`.

The same demo renders owned assistants as directly activatable icons and presents a card-image choice overlay when a hand Artifact needs its required discard payment. These are client-side presentations of public engine commands, not UI-only rules shortcuts.

Research data/topology and validators exist for all four expedition tracks: Bird, Snake, Monkey, and Lizard.

Run `npm run report:research-bridges` from `web/` to produce the current compact confirmation queue. Bird and Snake are fully verified (including their user-confirmed Lost Temple entry costs); it currently reports 21 Monkey and 42 Lizard bridge costs that remain intentionally unavailable to runtime moves.

## Turn action economy

- [x] Each player has one explicitly recorded main action per turn; it clears on `END_TURN`, `PASS`, and round cleanup.
- [x] Dig, Discover, Research, market purchase, temple-tile purchase, guardian defeat, and the non-free assistant market action consume it.
- [x] All 16 Funding/Exploration starters are audited free actions; all 35 base-game Artifact effects are audited main actions; all 40 base-game Item effects are audited card-face-by-card-face.
- [x] Captain Specialist, Professor archive Artifact purchase, and Mystic Ritual use the same main-action guard as base-game actions.
- [x] Deferred main actions consume the action only after their pending target is validly resolved (including Falconer, Explorer, and Mystic flows).
- [x] A player with an unresolved pending choice cannot take another action, end their turn, or pass before resolving or explicitly skipping it.

## Temporary travel / action window

Core model is implemented.

Rules represented by the current model:

- Travel produced during an action window can be consumed by a later action in the same window.
- The producer may be a main action or a free/quick action.
- The consumer may be a main action or a free/quick action.
- Travel cannot retroactively pay the cost of the action that produced it.
- The action window is cleared when the turn ends or the player passes.

Integration status:

- [x] Core temporary-travel state/model
- [x] Mixed card + temporary-travel payment planner
- [x] Research travel costs
- [x] Dig / `PLACE_WORKER` facade integration
- [x] Discover / `DISCOVER_SITE` facade integration
- [x] Leader quick action -> Dig integration coverage
- [x] Leader quick action -> Discover integration coverage
- [x] Leader quick action -> Research integration coverage
- [x] Action-window cleanup after `END_TURN` / `PASS`
- [x] Static routing audit reports legacy hand-only travel helper locations
- [x] Remove duplicated legacy hand-only travel-payment path; all site payment now uses `payTravel()`

## Expedition Leaders

All six leaders have data/state and reducer support. Remaining work is concentrated in edge cases and assistant-dependent pending flows.

### Captain
- [x] Core leader state/setup
- [x] Specialist action
- [x] Leader card rules
- [x] Unique idol effect
- [x] Unique idol temporary travel covered against Dig/Discover/Research
- [x] Blue idol path covered through public engine API

### Falconer
- [x] Core leader state/setup
- [x] Eagle progression/return action
- [x] Leader card rules
- [x] Unique idol effect
- [x] Blue idol path covered through public engine API

### Baroness
- [x] Core leader state/setup
- [x] Income / card behavior
- [x] Leader card rules
- [x] Unique idol effect
- [x] Blue idol path covered through public engine API

### Professor
- [x] Core leader state/setup
- [x] Suitcase resources
- [x] Archive artifact purchase action
- [x] Leader card rules
- [x] Unique idol effect
- [x] Blue idol path covered through public engine API

### Explorer
- [x] Core leader state/setup
- [x] Snack model
- [x] Archaeologist movement
- [x] Snack spending/refresh support
- [x] Blue-slot unique idol effect
- [x] Cartography: activate a face-up idol without taking or flipping it
- [x] Cartography pending-choice flow covered end-to-end
- [x] Blue idol snack-refresh path covered through public engine API

### Mystic
- [x] Core leader state/setup
- [x] Fear/exile/ritual foundations
- [x] Five-slot idol layout represented
- [x] Two Fear-marked idol slots represented
- [x] Three blue idol slots represented
- [x] Mystic-specific idol branches represented
- [x] Arbitrary idol-slot ordering covered
- [x] Five-slot scoring covered
- [x] Fear-slot -> exile -> ritual chain covered
- [x] Blue idol -> exile pending -> public pending resolver covered

### Shared leader work
- [x] Blue idol-slot model exists in leader idol actions
- [x] Blue idol behavior covered for all six leaders through the public engine API
- [x] Public pending-choice dispatcher shared by research and leader pending flows
- [x] Six-leader integration matrix added
- [ ] Extend matrix with more starting-card/round-transition combinations after local test verification

## Assistants

Base-game assistant setup, claiming, upgrading, exhausting, and refreshing are implemented. TTS object JSON contains sprite metadata but no rules text or assistant names.

- [x] Base 12-assistant TTS identities / CardIDs extracted
- [x] Base 12 silver/gold effect catalog recovered into `web/data/assistant-effects-manual.json`
- [x] Special semantics captured for travel payment, resource upgrade, exile, draw/discard, and market discount
- [x] `audit:assistants` reports unmapped visual bindings without blocking the normal test suite
- [x] Visually bind the 12 TTS GUID/CardID entries to the 12 effect keys
- [x] Strict assistant-effect validation (`audit:assistants -- --strict`)
- [x] Implement base assistant effect resolver, activation command, and shared pending-choice routing

## Research tracks

- [x] Bird topology/data
- [x] Snake topology/data
- [x] Monkey topology/data
- [x] Lizard topology/data
- [x] Manual topology validator
- [x] Reward validator
- [x] Research resource costs
- [x] Research travel costs through temporary-travel model
- [x] Node rewards / pending rewards
- [x] Temple arrival
- [x] Post-arrival temple-tile purchase: base-game pyramid costs, limited stacks, and scoring
- [x] Monkey/Lizard early temple-tile purchase: silver or bronze one row below the temple; bronze two rows below
- [x] Lizard track guardian: seeded from the guardian deck, hidden until a magnifying glass reaches its row, blocks only advancement beyond that row, uses normal guardian payment, and gives Fear to every research token left there at round end
- [x] War Club-compatible free guardian flow can target the revealed Lizard track guardian when the effect explicitly permits it and one of the owner's research tokens is on its row
- [x] Seeded base-game research-bonus deck, player-count-aware placement, claim/removal, and Lost Temple selection
- [x] Preserve multiple physical bonus slots collapsed by TTS path topology; require an explicit tile id when a node exposes more than one choice
- [ ] Continue rule-by-rule verification of expansion-specific edge cases

## Dig / Discover / sites

- [x] Worker placement
- [x] Site discovery
- [x] Level I / II site decks
- [x] Guardians
- [x] Standard guardian-overcome action with occupied-site, verified resource/travel-cost, and ownership checks
- [x] One-time guardian-boon state and activation; a travel boon feeds the shared action-window payment model
- [x] All fifteen visually verified base-game guardian costs and one-time boons loaded into the client context
- [x] Face-up / face-down idols
- [x] Site rewards
- [x] Explorer movement hooks
- [x] Unified temporary-travel facade for `PLACE_WORKER` and `DISCOVER_SITE`
- [x] Free/quick-action temporary travel integration coverage before Dig/Discover
- [x] Direct reducer and facade now share `payTravel()` semantics

## Pending rewards / choices

`pendingRewards` remains the serialized engine queue. `pending-choice.ts` provides the canonical client-facing resolver: callers submit a pending index plus a discriminated `PendingChoice`, and the dispatcher routes it to the existing research/leader implementation.

- [x] Generic pending reward representation
- [x] Research pending rewards
- [x] Several leader pending flows
- [x] Consistent public `PendingChoice` contract for the web client
- [x] Unified owner/index validation before pending dispatch
- [x] Pending-choice lock prevents client action/turn-order bypass while a choice is unresolved
- [x] Deferred `mainAction` pending payload consumes the action only after successful resolution
- [x] Dispatcher coverage for research CHOOSE, assistants, free Artifact, Level I site, visible assistant, normal/free Lizard-track guardian, Falconer site, Mystic Artifact, and existing leader choices
- [x] Static `audit:routing` for produced pending codes and reducer bypasses
- [x] Route assistant effect activation through the same API after visual effect bindings are complete
- [ ] Ensure every pending state is deterministic and serializable

## Final scoring and replay

- [x] Finished-game score breakdown: research, temple tiles, idols, visible empty idol slots, guardians, and every owned card's printed points (including Fear penalties).
- [x] Tie-breaking: total score, then Lost Temple arrival order, then research score; unresolved ties are retained.
- [x] JSON-safe `EngineReplay` envelope replays the canonical public command sequence from an initial `GameState`.
- [x] Two-player, five-round Captain/Falconer replay fixture: includes a public worker-placement main action, end-turn/pass ordering, leader round hooks, first-player rotation, and JSON round-trip state equality.
- [ ] Add longer representative multi-player replay fixtures with pending choices and scored research as remaining research-bridge entries are verified.

## Assets

The TTS sprite sheets have been localized for runtime. Source metadata retains Steam URLs only as provenance; the runtime asset map uses local `/assets/` paths.

- [x] Inventory all external sprite-sheet/image URLs used by extracted data
- [x] Download/source local static assets where legally and technically appropriate
- [x] Preserve sprite metadata in the local runtime map
- [x] Replace runtime Steam CDN dependencies with local asset paths
- [x] Add an asset validation script for missing files / invalid sprite indices
- [x] Reuse existing local sheets during localization; network access is required only for missing files or `--force`

## Test / architecture notes

`engine-api.ts` is the canonical client-facing command surface. `audit:routing` is run as part of `npm test` to flag production calls that bypass the intended reducer layers and to expose legacy travel paths.

The current test suite covers core engine, cards/catalog, round flow, travel, temporary travel, cross-action temporary travel, Dig/Discover, research, research-bonus setup/claims, temples, assistants, scoring, all six leaders, pending rewards, the unified pending-choice dispatcher, and the six-leader public-API matrix.

The completed market-card catalog is data-driven in `web/data/card-effects-manual.json`. In addition to direct resource/card effects, the engine now has typed, serializable pending choices for tent-site activation, multi-tent activation, archaeologist relocation, guardian relocation, and immediate pass alternatives. Aeroplane and Hot Air Balloon retain a one-site-action discount until it is consumed or the round ends; Guardian’s Ocarina changes all supplied travel icons to planes only for the current round. This makes these effects replayable rather than UI-side shortcuts.

Near-term priority:

1. Run representative full-game replays across all six leaders and resolve every structured pending choice through the browser, not only through engine tests.
2. Perform a visual, card-by-card review of the completed market overlays in the atlas. `audit:cards` remains the authoritative base-game count (75/75); expansion market effects are tracked in their dedicated overlays and need human rules review rather than inferred artwork changes.
3. Continue precise visual QA of hotspot placement and board coordinate captures. Do not overwrite collector data supplied by a tester.
4. Add durable `RoomStore` infrastructure before any public deployment; the current HTTP/SSE room service is verified for trusted LAN use only.

Local verification: `npm run assets:validate:local`, `npm test`, `npm run test:rooms-http`, and `npm run build` pass. The current engine suite contains 291 tests; `test:rooms-http` additionally verifies the real create/join/start/snapshot HTTP contract and private-hand projection.

The engine enforces one main action per turn, deferred-action consumption only after valid pending resolution, and a pending-choice lock that prevents further actions, ending the turn, or passing. The public facade rejects reducer-only resource and assistant lifecycle transitions. Finished games have deterministic score breakdown and tie resolution; `EngineReplay` supports JSON-safe public commands, including full leader-game and pending-choice replay coverage. `audit:cards` verifies 75/75 base market-card effects. The Lizard fourth-row guardian is revealed by the magnifying glass, blocks onward movement until defeated, and gives Fear to every token left there at round end. “Gain and pass” alternatives are atomic, and Fear remains ineligible for `PLAY_CARD` while still eligible as a discard/removal cost.

## Definition of engine-complete for the next milestone

Current regression count: 291 engine tests pass, including fixed printed-camp rewards and serialized pending-choice replay coverage. This is regression evidence for covered rules, not a substitute for a complete browser-game playthrough.

The engine milestone is ready when:

- all four research boards validate and play through their special rules;
- every printed research bridge cost and node reward is transcribed and verified;
- every base-game market card and guardian has a verified executable effect catalog;
- all six leaders can complete a full game without unsupported leader actions;
- temporary travel behaves correctly across all supported action ordering combinations;
- Dig, Discover, and Research share the same travel-payment semantics;
- all pending choices can be serialized, presented to a client, resolved, and resumed deterministically;
- the full engine test suite passes with dedicated integration coverage for the above.
