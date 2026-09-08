# Rule Review Batch 07: Assistants (Base Game and Expedition Leaders)

Scope: the twelve base-game assistants and the three Expedition Leaders
assistants.  For every assistant, confirm the silver effect, the gold effect
after upgrade, and whether using it is a free action or consumes the turn's
main action.  The local TTS extraction has no names/rules text, so every row
links the exact silver and gold sprite (or its source sheet) and carries its
immutable TTS CardID and internal ID for a reliable correction.

Reply to any row with `OK`, `change: ...`, or `uncertain`.  A contiguous range
is fine, for example `assistant-01 through assistant-06 OK`.

## Per-assistant effects

| Review ID | Exact piece | Silver effect in engine | Gold effect in engine | Timing |
| --- | --- | --- | --- | --- |
| `assistant-01` | [silver](../public/assets/cropped/assistant-2bf231-silver.webp) / [gold](../public/assets/cropped/assistant-2bf231-gold.webp) · CardID 601 · `2bf231` | gain 1 tablet | gain 1 coin + 1 tablet | free |
| `assistant-02` | [silver](../public/assets/cropped/assistant-c9b827-silver.webp) / [gold](../public/assets/cropped/assistant-c9b827-gold.webp) · CardID 602 · `c9b827` | pay 1 boot travel, gain 1 arrowhead | gain 1 arrowhead | free |
| `assistant-03` | [silver](../public/assets/cropped/assistant-8ff939-silver.webp) / [gold](../public/assets/cropped/assistant-8ff939-gold.webp) · CardID 603 · `8ff939` | pay 1 coin, gain 1 arrowhead | pay 1 coin, choose 1 arrowhead or 1 jewel | free |
| `assistant-04` | [silver](../public/assets/cropped/assistant-5c3f5b-silver.webp) / [gold](../public/assets/cropped/assistant-5c3f5b-gold.webp) · CardID 604 · `5c3f5b` | optionally exile 1 card from hand or played area | gain 1 compass, then optionally exile 1 card from hand or played area | free |
| `assistant-05` | [silver](../public/assets/cropped/assistant-8c90ac-silver.webp) / [gold](../public/assets/cropped/assistant-8c90ac-gold.webp) · CardID 605 · `8c90ac` | draw 1, then discard 1 hand card | draw 1 | free |
| `assistant-06` | [silver](../public/assets/cropped/assistant-f5bdcf-silver.webp) / [gold](../public/assets/cropped/assistant-f5bdcf-gold.webp) · CardID 606 · `f5bdcf` | choose 1 coin or 1 plane travel | choose 2 coins or 2 plane travel | free |
| `assistant-07` | [silver](../public/assets/cropped/assistant-fc8dfd-silver.webp) / [gold](../public/assets/cropped/assistant-fc8dfd-gold.webp) · CardID 607 · `fc8dfd` | choose 1 compass or 1 car travel | choose 1 coin + 1 compass, or 2 car travel | free |
| `assistant-08` | [silver](../public/assets/cropped/assistant-a1c97b-silver.webp) / [gold](../public/assets/cropped/assistant-a1c97b-gold.webp) · CardID 608 · `a1c97b` | choose 1 compass or 1 boat travel | choose 1 coin + 1 compass, or 2 boat travel | free |
| `assistant-09` | [silver](../public/assets/cropped/assistant-224d5d-silver.webp) / [gold](../public/assets/cropped/assistant-224d5d-gold.webp) · CardID 609 · `224d5d` | buy one market Item or Artifact with 1 discount | buy one market Item or Artifact with 2 discount | **main action** |
| `assistant-10` | [silver](../public/assets/cropped/assistant-c7024f-silver.webp) / [gold](../public/assets/cropped/assistant-c7024f-gold.webp) · CardID 610 · `c7024f` | upgrade 1 tablet to arrowhead, or 1 arrowhead to jewel | gain 1 compass, then make that upgrade | free |
| `assistant-11` | [silver](../public/assets/cropped/assistant-fd7d0e-silver.webp) / [gold](../public/assets/cropped/assistant-fd7d0e-gold.webp) · CardID 611 · `fd7d0e` | gain 1 compass | gain 2 compasses | free |
| `assistant-12` | [silver](../public/assets/cropped/assistant-f7574d-silver.webp) / [gold](../public/assets/cropped/assistant-f7574d-gold.webp) · CardID 703 · `f7574d` | gain 2 coins | gain 3 coins | free |

## Expedition Leaders assistants — confirmed and implemented

The original TTS source has a separate three-card `Assistants (Expedition
Leaders)` deck. The three cards enter the supply only when that expansion is
selected at setup. CardIDs 700–703 share a 4×2 sheet: 700/701/702 are the
first three cells and the base `assistant-12` (703) is the fourth. The CardID
703 silver correction is expansion-aware, so it does not alter the base game.

| Review ID | Exact TTS source | Silver effect | Gold effect | Timing |
| --- | --- | --- | --- | --- |
| `el-assistant-01` | [silver sheet](https://steamusercontent-a.akamaihd.net/ugc/1862806463732171881/BD754B5E920A72BA10CA83EDDEFC6E20193662B2/) / [gold sheet](https://steamusercontent-a.akamaihd.net/ugc/1862806463732171839/E6FDA7CE2D396AFD019A00E064B661F5B677626D/) · CardID 700 · `bd8dc7` · sheet cell 1 | pay 1 boot, gain 1 coin + 1 tablet | gain 1 tablet, then upgrade one resource | free |
| `el-assistant-02` | same sheets · CardID 701 · `08d375` · sheet cell 2 | choose 1 coin or 2 boots | gain 1 Fear to discard + 1 jewel | free |
| `el-assistant-03` | same sheets · CardID 702 · `97253a` · sheet cell 3 | gain 1 compass | gain 1 arrowhead | free |
| `el-assistant-12-adjustment` | same sheet · CardID 703 / base `f7574d` · sheet cell 4 | **when Expedition Leaders is enabled:** gain 1 boot + 1 coin | unchanged: gain 3 coins | free |

## Shared behaviour currently implemented

| Review ID | Current engine behaviour |
| --- | --- |
| `assistant-shared-01` | A claimed assistant enters play ready at silver level; its supply stack immediately reveals the next one. |
| `assistant-shared-02` | Activating an assistant exhausts it before its effect resolves.  A used assistant cannot activate again until refreshed. |
| `assistant-shared-03` | An assistant can only be upgraded from silver to gold; the upgrade immediately refreshes it, including one that was exhausted. | confirmed |
| `assistant-shared-04` | Assistant effects marked `free` do not spend the player's one main action.  `assistant-09` is deliberately the only current main-action assistant. |
| `assistant-shared-05` | Travel supplied by an assistant is temporary travel for the current turn, exactly like other gained travel icons. |
| `assistant-shared-06` | Optional exile may target one of the owner's cards in hand or played area.  Draw/discard must discard from hand after drawing. |

## Implementation map

- Effect definitions and TTS-piece bindings: `data/assistant-effects-manual.json`.
- Activation and pending choices: `src/assistant-actions.ts` and
  `src/assistant-effects.ts`.
- Supply setup, claim, upgrade, exhaust, refresh: `src/assistants.ts`.
