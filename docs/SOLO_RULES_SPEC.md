# Base-game solo: executable specification

Status: implementation target for the base game only. Expedition Leaders,
Surprise Shipment, campaign objectives, and purple rival actions are excluded
until their own solo rules are audited.

Mobile test entry: `/solo.html?difficulty=0` through `5` starts an independent
base-game solo match. The ordinary setup page exposes the same selector.

## Sources

- [CGE base rulebook](https://filemanager.czechgames.com/storage/files/lost-ruins-of-arnak/rules/lost-ruins-of-arnak-rules-en.pdf), solo variant, pp. 20–21.
- [CGE solo campaign rules](https://filemanager.czechgames.com/storage/files/lost-ruins-of-arnak/other-downloads/solo-campaign-rules/lost-ruins-of-arnak-solo-campaign-rules-en.pdf), used only to confirm that the normal solo rival is an additional two-player setup participant.

## Setup

- Use every two-player component quantity, including blockers and two-tile
  stacks. The human is seat two and starts with 1 coin and 1 compass.
- The rival is seat one, always starts each of the five rounds, has six
  archaeologists, one magnifying-glass token, no notebook, no resources, no
  cards, and never gains Fear.
- Build ten tiles: all five resource-dig tiles; exactly one tile from each
  green/red pair (discover, research, overcome guardian, buy item, buy
  artifact). Difficulty 0–5 is exactly the number of selected red tiles.
- The selected physical tiles are reshuffled every round. Their printed
  decision arrows, not a new random choice, resolve every left/right tie:
  use the arrow visible on the remaining face-down action stack; for the
  final reveal, use the arrow on the bottom tile of the used pile.

## Rival turn

Reveal one tile, resolve it or record it as impossible, then give the human a
turn. The rival cannot pass before all ten tiles are resolved. If the human
has passed, the rival keeps resolving tiles. At round end, return all rival
archaeologists, never give the rival Fear, reshuffle those ten selected tiles,
and make the rival starting player again.

## Action semantics

- **Dig resource:** occupy an unoccupied location providing that resource.
  Prefer the highest printed map row, then use the tile arrow.
- **Discover:** use the tile's printed round row for level and guardian.
  Green is I: 1+guardian, II: 1, III: 1+guardian, IV: 2, V: skip;
  red is I: 1, II: 1+guardian, III: 1, IV: 2+guardian, V: 2.
  Among eligible locations prefer the lowest map row, then the tile arrow.
  Take idols to the rival board: a previously unseen face-up type remains face
  up; a duplicate or a face-down idol goes into the -1 pile. Reveal the site;
  reveal a guardian only when that tile/round says to do so.
- **Research:** advance the magnifying glass along a legal connected bridge,
  choosing branch by tile arrow; pay no cost. Remove (without resolving) any
  research bonus, take the Lost Temple bonus if applicable, and remove the top
  assistant from the highest supply stack. At the Lost Temple, a later research
  takes a 6-point temple tile instead; if both stacks are available the tile
  arrow chooses the stack.
- **Overcome guardian:** defeat an occupied guardian, preferring the highest
  row and then tile arrow. If none exists, perform the research movement above
  but do not remove a supply assistant.
- **Buy item / artifact:** green takes the lowest printed point value, red the
  highest; break ties using tile arrow. Put it on the rival board and refill
  the market. Effects and costs are ignored.

## Scoring

- The human uses ordinary base-game scoring: research, temple tiles, idols,
  empty idol slots, guardians, cards, and -1 per Fear card.
- The rival scores magnifying-glass research (including arrival points), temple
  tiles, guardians, purchased cards, 3 per unique face-up idol, and 2 per idol
  in its -1 pile. It does not score a notebook or empty idol slots.
- A solo game is a human win only when the human score is strictly higher.

## Evidence required before release

1. Deterministic tests covering setup, each tile family, tie direction,
   guardian-to-research fallback, five-round cleanup, and both score paths.
2. Mobile smoke test on the GitHub Pages release: reveal rival action,
   perform a human turn, pass, and inspect final score.
3. Visual audit of the printed direction and per-round symbols against the
   physical action tiles before the action-tile artwork is presented as final.
