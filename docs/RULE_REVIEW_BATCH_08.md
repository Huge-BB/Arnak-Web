# Rule Review Batch 08: Research Bonus Tile Setup

Scope: the small bonus tiles placed on the research boards during setup. This
review is separate from Temple reward-tile costs. It verifies which printed
spaces receive a tile at each player count, the common tile-pool contents,
whether tiles are face up or face down, and the Lost Temple bonus supply.

## Current executable setup

- The engine builds a deterministic shuffled pool from three copies each of:
  compass, coin, tablet, draw, optional exile, and resource upgrade.
- A research-space tile is placed only when its recorded minimum-player value
  is no greater than the seated-player count.
- Lost Temple receives one private face-down bonus tile per player. It is not
  shown to players before they reach the Temple.
- Ordinary research-space bonus tiles are currently face up in state. The
  board view must use the assigned tile ID rather than a fixed decorative
  image; incomplete matching source art is tracked below.

## Common bonus-tile pool: audit inventory

The current engine model uses the following 18-tile common pool. The values
below are the setup pool, before tiles are dealt to research spaces and the
Lost Temple supply.

| Tile face | Effect | Copies | Total |
| --- | --- | ---: | ---: |
| Compass | Gain 1 compass | 3 | 3 |
| Coin | Gain 1 coin | 3 | 3 |
| Tablet | Gain 1 tablet | 3 | 3 |
| Draw | Draw 1 card | 3 | 3 |
| Exile | Optionally exile one of your own cards | 3 | 3 |
| Upgrade | Upgrade one resource (`tablet → arrowhead → jewel`) | 3 | 3 |
| **Total** |  | **18** | **18** |

Audit note: the setup shuffle is seeded, but the resulting assigned `tileId`
must be rendered face up on each ordinary research-space tile. Calibration
markers are position-only and must not imply a fixed compass result.

## Printed-space audit targets

`1` means present at every player count. Multiple values inside one cell are
separate physical slots on that same printed space.

| Board | Research-space bonus slots and minimum players |
| --- | --- |
| Bird | `r1:p0` 1; `r1:p1` 1; `r2:p0` 4; `r3:p0` 1; `r3:p1` 1; `r3:p2` 1; `r4:p0` 4; `r5:p0` 1; `r5:p1` 1; `r6:p0` 3; `r6:p1` 3 |
| Snake | `r1:p0` 1; `r1:p1` 3; `r1:p2` 1; `r2:p0` 1; `r2:p1` 1; `r4:p0` 4; `r4:p1` 4; `r5:p0` 1; `r5:p1` 1; `r6:p0` 1/3/1 |
| Monkey | `r2:p0` 1; `r5:p0` 1 |
| Lizard | `r1:p0` 1; `r1:p1` 1; `r2:p0` 1; `r2:p2` 1; `r3:p0` 1; `r4:p0` 3/1/1; `r6:p0` 3/1/1/4 |

## Review needed

1. Confirm every listed printed-space slot and minimum-player condition from
   the physical Bird, Snake, Monkey, and Lizard boards.
2. Confirm the six common tile faces and the listed three-copy count for each
   face (18 tiles total).
3. Confirm which Temple/track bonus tiles are private face down versus public
   face up, and supply the missing face art for tablet and draw if the current
   source assets do not cover them.

## Implementation map

- Setup randomization and player-count filtering: `src/research-bonus-tiles.ts`.
- Runtime state: `GameState.research.bonusTiles` and
  `GameState.research.templeBonusTiles`.
- Board placement calibration: `src/calibrate.ts`.
- Tests: `src/research-bonus-tiles.test.ts`.
