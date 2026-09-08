# Rule review batch 02: printed exploration-site travel costs

This batch covers the twelve printed discovery spaces on the main board. It does **not** review the random site-tile rewards, idol rewards, or guardian tiles. IDs correspond to the clickable space IDs used by the client, numbered left-to-right by printed row.

Reply with an item ID and `OK`, `change: ...`, or `uncertain`.

## Standard Bird board

| Review ID | Printed location | Current engine travel cost | Check |
| --- | --- | --- | --- |
| `bird:level1-1` | Level I, lower row, 1st from left | 1 car | ☐ |
| `bird:level1-2` | Level I, lower row, 2nd from left | 1 car | ☐ |
| `bird:level1-3` | Level I, lower row, 3rd from left | 1 boat | ☐ |
| `bird:level1-4` | Level I, lower row, 4th from left | 1 boat | ☐ |
| `bird:level1-5` | Level I, upper row, 1st from left | 1 car | ☐ |
| `bird:level1-6` | Level I, upper row, 2nd from left | 1 car | ☐ |
| `bird:level1-7` | Level I, upper row, 3rd from left | 1 boat | ☐ |
| `bird:level1-8` | Level I, upper row, 4th from left | 1 boat | ☐ |
| `bird:level2-1` | Level II, 1st from left | 2 cars | ☐ |
| `bird:level2-2` | Level II, 2nd from left | 2 cars | ☐ |
| `bird:level2-3` | Level II, 3rd from left | 2 boats | ☐ |
| `bird:level2-4` | Level II, 4th from left | 2 boats | ☐ |

## Advanced Snake board overrides

Only these four spaces differ from the Bird-board values above. Every other exploration-space cost is shared.

| Review ID | Printed location | Current engine travel cost | Check |
| --- | --- | --- | --- |
| `snake:level1-6` | Level I, upper row, 2nd from left | 2 boots | ☐ |
| `snake:level1-7` | Level I, upper row, 3rd from left | 1 plane | ☐ |
| `snake:level2-2` | Level II, 2nd from left | 1 plane, 1 boot | ☐ |
| `snake:level2-3` | Level II, 3rd from left | 1 car, 1 boat | ☐ |

## Response examples

```text
bird:level1-6 OK
snake:level2-2 change: 1 plane only
bird:level2-4 uncertain
```
