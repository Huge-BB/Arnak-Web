# Rule review batch 03: random site tiles

The current runtime catalog contains 17 tiles labelled `Base Game`. The prior TTS asset source additionally contains **8 Expedition Leaders site tiles** (the first expansion) and 2 Surprise Shipment site tiles; those assets were previously omitted by the Web extractor and are listed below for review before import.

Open `/atlas.html`, select the site view, and search by ID when comparing artwork. Reply with `OK`, `change: ...`, or `not in this set`.

Reward legend: coin, compass, tablet, arrowhead, jewel, draw one card, and gain Fear are implemented directly. `i` and `v` are extracted symbols that currently create an unresolved structured site reward; their exact printed meaning needs review before implementation.

## Level I

| Review ID | Raw reward code | Current executable interpretation | Check |
| --- | --- | --- | --- |
| `site:1eee42` | `cssv` | 1 coin, 2 compasses, `v` unresolved | ☐ |
| `site:4e4290` | `ctt` | 1 coin, 2 tablets | ☐ |
| `site:5420e2` | `da` | Draw 1 card, 1 arrowhead | ☐ |
| `site:550880` | `sa` | 1 compass, 1 arrowhead | ☐ |
| `site:604de9` | `ssi` | 2 compasses, `i` unresolved | ☐ |
| `site:b4b6b8` | `ca` | 1 coin, 1 arrowhead | ☐ |
| `site:ba58b0` | `j` | 1 jewel | ☐ |
| `site:c8325e` | `dct` | Draw 1 card, 1 coin, 1 tablet | ☐ |
| `site:d76cb9` | `ta` | 1 tablet, 1 arrowhead | ☐ |
| `site:db2bf3` | `fsj` | Gain 1 Fear, 1 compass, 1 jewel | ☐ |
| `site:f71379` | `ftj` | Gain 1 Fear, 1 tablet, 1 jewel | ☐ |

## Level II

| Review ID | Raw reward code | Current executable interpretation | Check |
| --- | --- | --- | --- |
| `site:3b6bd8` | `fttaa` | Gain 1 Fear, 2 tablets, 2 arrowheads | ☐ |
| `site:637a6d` | `ssj` | 2 compasses, 1 jewel | ☐ |
| `site:72bdd9` | `ttj` | 2 tablets, 1 jewel | ☐ |
| `site:c542fc` | `aj` | 1 arrowhead, 1 jewel | ☐ |
| `site:d3f597` | `dtj` | Draw 1 card, 1 tablet, 1 jewel | ☐ |
| `site:d57d79` | `csta` | 1 coin, 1 compass, 1 tablet, 1 arrowhead | ☐ |

## Expedition Leaders (first expansion) — Level I

`u` means upgrade one resource and is now represented by a structured resource-choice effect. All other symbols use the legend above.

| Review ID | Raw reward code | Current readable interpretation | Check |
| --- | --- | --- | --- |
| `leaders-site:1d796c` | `fcta` | Gain 1 Fear, 1 coin, 1 tablet, 1 arrowhead | ☐ |
| `leaders-site:2ecf03` | `au` | 1 arrowhead, `u` unresolved | ☐ |
| `leaders-site:9d9491` | `ttu` | 2 tablets, `u` unresolved | ☐ |
| `leaders-site:b52560` | `fdj` | Gain 1 Fear, draw 1 card, 1 jewel | ☐ |
| `leaders-site:f40cc1` | `sst` | 2 compasses, 1 tablet | ☐ |

## Expedition Leaders (first expansion) — Level II

`m` means activate one camp effect and is now represented by a structured camp-choice effect.

| Review ID | Raw reward code | Current readable interpretation | Check |
| --- | --- | --- | --- |
| `leaders-site:196176` | `caud` | 1 coin, 1 arrowhead, `u` unresolved, draw 1 card | ☐ |
| `leaders-site:3db92c` | `cttm` | 1 coin, 2 tablets, `m` unresolved | ☐ |
| `leaders-site:4bae7c` | `fsaj` | Gain 1 Fear, 1 compass, 1 arrowhead, 1 jewel | ☐ |

## Surprise Shipment — Level II

These are separate from the first expansion and will remain out of the default import scope unless enabled. `b` means return one slotted idol, matching the base Stone Key effect.

| Review ID | Raw reward code | Current readable interpretation | Check |
| --- | --- | --- | --- |
| `shipment-site:e94108` | `cab` | 1 coin, 1 arrowhead, `b` unresolved | ☐ |
| `shipment-site:e7fb58` | `jb` | 1 jewel, `b` unresolved | ☐ |

## Response examples

```text
site:4e4290 OK
site:1eee42 change: v means choose one of ...
leaders-site:2ecf03 change: u means ...
site:d57d79 not in this set
shipment-site:e7fb58 OK
```
