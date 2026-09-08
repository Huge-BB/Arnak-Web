# Rule verification workflow

`data/rule-audit.json` is the checklist for a complete-rules claim. It is deliberately separate from engine coverage: an implemented rule can have tests and still remain unverified until a reviewer records an authoritative printed source.

## Statuses

| Status | Meaning |
| --- | --- |
| `unreviewed` | No implementation or source conclusion has been recorded. |
| `implemented` | The engine has executable code and automated evidence, but its printed source has not yet been formally logged. |
| `verified` | Implementation and tests exist, and a source plus precise locator (rulebook page, official FAQ section, or board/card identity) have been recorded. |
| `blocked` | Cannot be verified without a missing source, decision, or unsupported rule primitive. |

## Reviewing an entry

1. Compare the rule against a primary source. Prefer the rulebook, official FAQ/errata, or an identified physical board/card; do not infer it from artwork alone.
2. Record an object in `sourceEvidence`, for example `{ "source": "Base rulebook", "locator": "p. 12, Discover a new site" }`.
3. Add or refine the smallest deterministic test/replay that proves the happy path and an important illegal/edge path.
4. Change the entry to `verified` only when both source and automated evidence are present.
5. Run `npm run audit:rules` and `npm test`.

## Browser acceptance replays

After the module-level audit, retain a serializable replay for each acceptance scenario:

- a two-player base-game five-round game;
- one game per research board;
- one game per Expedition Leader;
- at least one resolution of every structured pending-choice family;
- a room reconnect/private-hand scenario.

The replay validates determinism. It does not replace the source citation in `rule-audit.json`.
