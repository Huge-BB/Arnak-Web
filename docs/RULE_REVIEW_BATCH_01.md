# Rule review batch 01: base-board camps and guardians

Use this sheet to compare the current executable data with the physical base board and guardian tiles. Reply with an item ID and one of: `OK`, `change: ...`, or `uncertain`. No entry in this document is promoted to `verified` until its review result is written back to the structured catalog.

## Printed camps

The client exposes one visual camp target; the engine resolves it to the first available physical slot. At two or three players, some `-b` slots are blocked by setup.

| Review ID | Engine slots | Current travel cost | Current reward | Check |
| --- | --- | --- | --- | --- |
| `camp-1` | `camp-1-a`, `camp-1-b` | a: 1 boot; b: 2 boots | 2 coins | ☐ |
| `camp-2` | `camp-2-a`, `camp-2-b` | a: 1 boot; b: 2 boots | 2 compasses | ☐ |
| `camp-3` | `camp-3-a`, `camp-3-b` | a: 1 boot; b: 2 boots | 2 tablets | ☐ |
| `camp-4` | `camp-4-a`, `camp-4-b` | a: 1 boot; b: 2 boots | 1 arrowhead | ☐ |
| `camp-5` | `camp-5-a`, `camp-5-b` | a: 1 boot; b: 2 boots, discard 1 hand card | 1 jewel | ☐ |

## Base guardians

`boon` is the once-per-game action after defeating the guardian. “Exile one” means choose and remove up to one of your own eligible cards.

| Review ID | Defeat cost currently encoded | One-time boon currently encoded | Check |
| --- | --- | --- | --- |
| `guardian:094b9c` | 2 compasses, 1 arrowhead | Gain 1 boat travel | ☐ |
| `guardian:46196d` | 1 coin, 1 compass, 1 arrowhead | Gain 1 boat travel | ☐ |
| `guardian:4820e2` | 1 arrowhead, 1 car travel | Gain 1 boat travel | ☐ |
| `guardian:4e3cf3` | 2 coins, 1 arrowhead | Gain 1 car travel | ☐ |
| `guardian:87eb00` | 1 coin, 1 arrowhead, 1 boot travel | Gain 1 car travel | ☐ |
| `guardian:88e2d0` | 1 jewel, 1 boot travel | Gain 1 plane travel | ☐ |
| `guardian:c1e7ef` | 3 tablets | Gain 1 plane travel | ☐ |
| `guardian:e5153d` | 1 arrowhead, 1 boat travel | Gain 1 car travel | ☐ |
| `guardian:4f2bd2` | 1 tablet, 1 arrowhead, 1 boot travel | Exile one own card | ☐ |
| `guardian:9cfd06` | 1 compass, 2 boot travel | Exile one own card | ☐ |
| `guardian:9d1649` | 1 arrowhead, 1 plane travel | Exile one own card | ☐ |
| `guardian:faa0f3` | 1 arrowhead, 1 plane travel | Exile one own card | ☐ |
| `guardian:8b09d1` | 1 coin, 1 arrowhead, discard 1 hand card | Exile one own card | ☐ |
| `guardian:be4964` | 1 compass, 1 arrowhead, discard 1 hand card | Draw 1 card | ☐ |
| `guardian:cdb620` | 4 coins | Upgrade 1 resource | ☐ |

## How to send results

Examples:

```text
camp-3 OK
guardian:4f2bd2 change: boon should be draw 1, not exile
guardian:9d1649 uncertain
```

If a guardian ID is hard to identify visually, open the card atlas and send its image/position instead; the ID-to-sprite mapping is retained in `src/generated/guardians.json`.
