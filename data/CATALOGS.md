# Rule overlay catalogs

Files in this directory complement the data extracted from the original TTS mod. They are deliberately small, reviewable overlays: extraction preserves what TTS exposes, while an overlay records a rule that has been checked against a physical board, rulebook, or another authoritative visual source.

## Editing policy

- Do not infer a printed effect from a TTS GUID, sprite index, or card name alone.
- Keep an entry unverified until it has been visually checked.
- Prefer existing structured effect primitives over custom code. Add a new primitive only for a genuinely different icon semantic, with a reducer test.
- Keep source identity stable. Generated card, research, site, and guardian ids must not be renamed to make a catalog look nicer.
- Run the matching audit and the full test suite after every catalog change.

## Catalogs

| File | Purpose | Check command |
| --- | --- | --- |
| `assistant-effects-manual.json` | Base-game assistant visual bindings and silver/gold effect definitions. | `npm run audit:assistants -- --strict` |
| `guardian-effects-manual.json` | The 15 base-game guardian payment costs and one-time boons. | `npm test` |
| `card-effects-manual.json` | Manually verified base-market card effects. Unverified cards remain absent rather than guessed. | `npm run audit:cards` |
| `research-manual-data.json` | Printed research bridge costs, travel costs, route restrictions, and temple-arrival values. | `npm run validate:research` |
| `research-rewards-manual.json` | Printed research-node reward overlays. | `npm run validate:research` |

The more detailed research-entry schema is in [`README-research-manual-data.md`](README-research-manual-data.md).

`OVERCOME_GUARDIAN_FREE` normally requires a site target and the caller's archaeologist there. A card entry can set `lizardTrackAllowed: true` only when its printed rule explicitly permits it to defeat the Lizard board's track guardian; that target additionally requires a revealed guardian and one of the caller's research tokens on its row.

The card catalog also contains reusable primitives for temporary travel, bottom-deck draws, printed resource payments, conditional resource gains, and an explicit own-card exile choice. Each primitive has a focused reducer test; use it only where the printed timing and targeting exactly match.

## Coverage is intentional

An audit count is not a game-completeness claim. It indicates precisely how much information has been transcribed and checked. The game engine rejects or omits behavior that is not represented by verified data; this prevents a plausible-looking but invented rule from silently entering a local game.
