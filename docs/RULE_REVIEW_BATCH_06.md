# Rule Review Batch 06: Research Boards and Lost Temple

Scope: each research board is reviewed as one unit: its research-path payment
icons, Lost Temple entry, and that Temple's own 2/6/11-point reward-tile
costs.  Existing data is executable but is not promoted to source-verified
merely by this document.

Project-owner review result: all listed research-path costs are confirmed. The
one exceptional Monkey connection below has two printed, mutually-exclusive
payment options.

Reply to a row with `OK`, `change: ...`, or `uncertain`.  A contiguous range
is fine, for example `bird-cost-01 through bird-cost-20 OK`.

## Bird Temple board

### Bird Temple reward tiles

The current engine incorrectly applies the old generic pyramid below to every
Temple.  It is shown only to make the defect auditable; do **not** confirm it
as Bird data unless it matches the Bird board.

| Review ID | Printed value | Current engine fallback | Board result |
| --- | ---: | --- | --- |
| `bird-temple-tile-2-a` | 2 | 1 coin + 2 tablets | confirmed |
| `bird-temple-tile-2-b` | 2 | 1 jewel | confirmed |
| `bird-temple-tile-2-c` | 2 | 1 compass + 1 arrowhead | confirmed |
| `bird-temple-tile-6-a` | 6 | 1 coin + 2 tablets + 1 jewel | confirmed |
| `bird-temple-tile-6-b` | 6 | 1 jewel + 1 compass + 1 arrowhead | confirmed |
| `bird-temple-tile-11` | 11 | 1 coin + 2 tablets + 1 jewel + 1 compass + 1 arrowhead | confirmed |

| Review ID | Printed path | Current cost |
| --- | --- | --- |
| `bird-cost-01` | start -> r0:p0 | 1 arrowhead + 1 compass |
| `bird-cost-02` | start -> r0:p1 | 1 jewel |
| `bird-cost-03` | r0:p0 -> r1:p0 | 1 jewel |
| `bird-cost-04` | r0:p0 -> r1:p1 | 1 arrowhead + 1 tablet |
| `bird-cost-05` | r0:p1 -> r1:p1 | 1 arrowhead + 1 tablet |
| `bird-cost-06` | r1:p0 -> r2:p0 | 1 arrowhead + 2 tablets |
| `bird-cost-07` | r1:p1 -> r2:p0 | 1 arrowhead + 2 tablets |
| `bird-cost-08` | r2:p0 -> r3:p0 | 1 arrowhead + 1 tablet + 1 coin |
| `bird-cost-09` | r2:p0 -> r3:p1 | 1 jewel + 1 tablet |
| `bird-cost-10` | r2:p0 -> r3:p2 | 2 arrowheads |
| `bird-cost-11` | r3:p0 -> r4:p0 | 1 jewel + 1 coin |
| `bird-cost-12` | r3:p1 -> r4:p0 | 1 jewel + 1 coin |
| `bird-cost-13` | r3:p2 -> r4:p0 | 1 jewel + 1 coin |
| `bird-cost-14` | r4:p0 -> r5:p0 | 1 jewel + 1 compass |
| `bird-cost-15` | r4:p0 -> r5:p1 | 1 arrowhead + 2 tablets |
| `bird-cost-16` | r5:p0 -> r6:p0 | 1 arrowhead + 1 tablet + 1 coin |
| `bird-cost-17` | r5:p1 -> r6:p0 | 1 arrowhead + 1 tablet + 1 coin |
| `bird-cost-18` | r5:p1 -> r6:p1 | 1 jewel + 1 tablet |
| `bird-cost-19` | r6:p0 -> Temple | 1 compass + 1 coin + 1 jewel |
| `bird-cost-20` | r6:p1 -> Temple | 1 compass + 1 coin + 1 jewel |

## Snake Temple board

### Snake Temple reward tiles

| Review ID | Printed value | Current engine fallback | Board result |
| --- | ---: | --- | --- |
| `snake-temple-tile-2-a` | 2 | 1 coin + 2 tablets | confirmed |
| `snake-temple-tile-2-b` | 2 | 1 jewel | confirmed |
| `snake-temple-tile-2-c` | 2 | 1 compass + 1 arrowhead | confirmed |
| `snake-temple-tile-6-a` | 6 | 1 coin + 2 tablets + 1 jewel | confirmed |
| `snake-temple-tile-6-b` | 6 | 1 jewel + 1 compass + 1 arrowhead | confirmed |
| `snake-temple-tile-11` | 11 | 1 coin + 2 tablets + 1 jewel + 1 compass + 1 arrowhead | confirmed |

| Review ID | Printed path | Current cost |
| --- | --- | --- |
| `snake-cost-01` | start -> r0:p0 | 2 tablets + 1 compass |
| `snake-cost-02` | start -> r0:p1 | 1 jewel |
| `snake-cost-03` | r0:p0 -> r1:p0 | 1 arrowhead + 1 coin + 1 compass |
| `snake-cost-04` | r0:p0 -> r1:p1 | 1 jewel + 1 tablet |
| `snake-cost-05` | r0:p1 -> r1:p1 | 1 jewel + 1 tablet |
| `snake-cost-06` | r0:p1 -> r1:p2 | 2 arrowheads |
| `snake-cost-07` | r1:p0 -> r2:p0 | 1 arrowhead + 2 tablets |
| `snake-cost-08` | r1:p1 -> r2:p0 | 1 arrowhead + 2 tablets |
| `snake-cost-09` | r1:p1 -> r2:p1 | 1 jewel + 1 coin |
| `snake-cost-10` | r1:p2 -> r2:p1 | 1 jewel + 1 coin |
| `snake-cost-11` | r2:p0 -> r3:p0 | 1 usable idol |
| `snake-cost-12` | r2:p1 -> r3:p0 | 1 usable idol |
| `snake-cost-13` | r3:p0 -> r4:p0 | 2 arrowheads |
| `snake-cost-14` | r3:p0 -> r4:p1 | 1 jewel + 1 tablet |
| `snake-cost-15` | r4:p0 -> r5:p0 | 1 jewel + 1 tablet |
| `snake-cost-16` | r4:p0 -> r5:p1 | 3 tablets + 1 compass |
| `snake-cost-17` | r4:p1 -> r5:p1 | 3 tablets + 1 compass |
| `snake-cost-18` | r5:p0 -> r6:p0 | 1 arrowhead + 1 tablet + 1 coin |
| `snake-cost-19` | r5:p1 -> r6:p0 | 1 arrowhead + 1 tablet + 1 coin |
| `snake-cost-20` | r6:p0 -> Temple | 1 compass + 1 arrowhead + 1 jewel |

## Monkey Temple board

### Monkey Temple reward tiles

| Review ID | Printed value | Current engine fallback | Board result |
| --- | ---: | --- | --- |
| `monkey-temple-tile-2-a` | 2 | 1 coin + 2 tablets | confirmed |
| `monkey-temple-tile-2-b` | 2 | 1 jewel | confirmed |
| `monkey-temple-tile-2-c` | 2 | 1 compass + 1 arrowhead | 1 coin + 1 arrowhead |
| `monkey-temple-tile-6-a` | 6 | 1 coin + 2 tablets + 1 jewel | confirmed |
| `monkey-temple-tile-6-b` | 6 | 1 jewel + 1 compass + 1 arrowhead | 1 jewel + 1 coin + 1 arrowhead |
| `monkey-temple-tile-11` | 11 | 1 coin + 2 tablets + 1 jewel + 1 compass + 1 arrowhead | 2 coins + 2 tablets + 1 jewel + 1 arrowhead |

`r4:magnifying` is the one long printed magnifying-glass space that spans
r3/r4.  It is not a second journal space.

| Review ID | Printed path | Current cost |
| --- | --- | --- |
| `monkey-cost-01` | start -> r0:p0 | 1 compass + 2 tablets |
| `monkey-cost-02` | start -> r0:p1 | 1 jewel |
| `monkey-cost-03` | start -> r0:p2 | 1 compass + 1 arrowhead |
| `monkey-cost-04` | r0:p0 -> r1:p0 | 1 coin + 1 jewel |
| `monkey-cost-05` | r0:p1 -> r1:p0 | 1 coin + 1 jewel |
| `monkey-cost-06` | r0:p1 -> r1:p1 | 1 compass + 1 tablet + 1 arrowhead |
| `monkey-cost-07` | r0:p2 -> r1:p1 | 1 compass + 1 tablet + 1 arrowhead |
| `monkey-cost-08` | r0:p2 -> r1:p2 | 1 tablet + 1 jewel |
| `monkey-cost-09` | r1:p0 -> r2:p0 | 1 arrowhead + 1 car travel |
| `monkey-cost-10` | r1:p1 -> r2:p0 | choose one: 1 arrowhead + 1 car travel **or** 2 tablets + 1 boat travel |
| `monkey-cost-11` | r1:p2 -> r2:p0 | 2 tablets + 1 boat travel |
| `monkey-cost-12` | r2:p0 -> r3:p0 (journal only) | 1 jewel |
| `monkey-cost-13` | r2:p0 -> r4:magnifying (magnifying only) | 2 tablets + 1 arrowhead |
| `monkey-cost-14` | r3:p0 -> r4:p0 (journal only) | 1 tablet + 1 arrowhead |
| `monkey-cost-15` | r4:p0 -> r5:p0 (journal only) | 1 coin + 1 tablet + 1 jewel |
| `monkey-cost-16` | r4:magnifying -> r5:p0 (magnifying only) | 1 coin + 1 tablet + 1 jewel |
| `monkey-cost-17` | r5:p0 -> r6:p0 | discard 1 hand card + 1 jewel |
| `monkey-cost-18` | r5:p0 -> r6:p1 | 1 compass + 1 tablet + 1 arrowhead |
| `monkey-cost-19` | r6:p0 -> r7:p0 | 2 arrowheads + 1 plane travel |
| `monkey-cost-20` | r6:p1 -> r7:p0 | 2 arrowheads + 1 plane travel |
| `monkey-cost-21` | r6:p1 -> r7:p1 | 1 tablet + 1 jewel + 1 plane travel |
| `monkey-cost-22` | r7:p0 -> Temple | 2 coins + 1 tablet + 1 jewel |
| `monkey-cost-23` | r7:p1 -> Temple | 2 coins + 1 tablet + 1 jewel |

## Lizard Temple board

### Lizard Temple reward tiles

| Review ID | Printed value | Current engine fallback | Board result |
| --- | ---: | --- | --- |
| `lizard-temple-tile-2-a` | 2 | 1 coin + 2 tablets | 1 coin + 1 compass + 1 tablet |
| `lizard-temple-tile-2-b` | 2 | 1 jewel | confirmed |
| `lizard-temple-tile-2-c` | 2 | 1 compass + 1 arrowhead | 1 tablet + 1 arrowhead |
| `lizard-temple-tile-6-a` | 6 | 1 coin + 2 tablets + 1 jewel | 1 coin + 1 compass + 1 tablet + 1 jewel |
| `lizard-temple-tile-6-b` | 6 | 1 jewel + 1 compass + 1 arrowhead | 1 jewel + 1 tablet + 1 arrowhead |
| `lizard-temple-tile-11` | 11 | 1 coin + 2 tablets + 1 jewel + 1 compass + 1 arrowhead | 1 coin + 1 compass + 2 tablets + 1 jewel + 1 arrowhead |

| Review ID | Printed path | Current cost |
| --- | --- | --- |
| `lizard-cost-01` | start -> r0:p0 | 2 tablets + 1 boot travel |
| `lizard-cost-02` | start -> r0:p1 | 1 arrowhead + 1 boot travel |
| `lizard-cost-03` | start -> r0:p2 | 2 compasses + 1 boot travel |
| `lizard-cost-04` | r0:p0 -> r1:p0 | 1 compass + 1 jewel |
| `lizard-cost-05` | r0:p1 -> r1:p0 | 1 compass + 1 jewel |
| `lizard-cost-06` | r0:p1 -> r1:p1 | 1 tablet + 1 jewel |
| `lizard-cost-07` | r0:p2 -> r1:p1 | 1 tablet + 1 jewel |
| `lizard-cost-08` | r1:p0 -> r2:p0 | 2 arrowheads |
| `lizard-cost-09` | r1:p0 -> r2:p1 | 1 jewel |
| `lizard-cost-10` | r1:p1 -> r2:p1 | 1 jewel |
| `lizard-cost-11` | r1:p1 -> r2:p2 | 2 tablets + 1 arrowhead |
| `lizard-cost-12` | r2:p0 -> r3:p0 | 1 coin + 1 compass + 1 tablet |
| `lizard-cost-13` | r2:p1 -> r3:p0 | 1 coin + 1 compass + 1 tablet |
| `lizard-cost-14` | r2:p2 -> r3:p0 | 1 coin + 1 compass + 1 tablet |
| `lizard-cost-15` | r3:p0 -> r4:p0 | 1 arrowhead + 1 jewel |
| `lizard-cost-16` | r4:p0 -> r5:p0 | 2 tablets + 1 usable idol |
| `lizard-cost-17` | r4:p0 -> r5:p1 | 1 coin + 1 jewel + 1 boot travel |
| `lizard-cost-18` | r5:p0 -> r6:p0 | 1 tablet + 2 arrowheads |
| `lizard-cost-19` | r5:p1 -> r6:p0 | 1 tablet + 2 arrowheads |
| `lizard-cost-20` | r6:p0 -> Temple | 2 jewels |
