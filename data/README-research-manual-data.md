# Research manual data entry

`src/ResearchTrackData.ttslua` already contains the research-board topology, scores, and path connectivity. The Web extractor turns that into stable node and bridge IDs.

Run:

```bash
cd web
npm run extract:data
npm run validate:research
```

This generates:

- `src/generated/research-tracks.json` — machine-generated topology used by the engine.
- `data/research-bridges.generated.json` — a human-readable checklist of every research bridge.

Edit only `data/research-manual-data.json`. The validator checks every manually entered bridge/node against the generated topology and prints progress as `verified / total bridges`.

Do **not** manually edit generated topology. Copy IDs from `data/research-bridges.generated.json` into `data/research-manual-data.json` and fill only costs/rewards you have verified from the board or rulebook.

## Bridge entry

```json
{
  "from": "bird:r2:p0",
  "to": "bird:r3:p1",
  "cost": {
    "coin": 0,
    "compass": 0,
    "tablet": 1,
    "arrowhead": 0,
    "jewel": 0
  },
  "reward": null,
  "verified": true,
  "comment": "Checked against Bird Temple board"
}
```

Only non-zero resource values matter. Keeping all five keys is fine and makes manual entry easier.

Supported cost resource keys:

- `coin`
- `compass`
- `tablet`
- `arrowhead`
- `jewel`

## Irregular node entry

Use `nodeOverrides` only when the printed board has a physical research space whose logical height differs from the default row index, such as one space spanning two printed levels.

```json
{
  "node": "bird:r4:p1",
  "researchLevel": 5,
  "spansLevels": [4, 5],
  "verified": true,
  "comment": "One printed space spans levels 4 and 5"
}
```

## Node reward entry

Use `nodeRewards` only when an effect belongs to arriving at a destination node rather than paying a bridge cost.

```json
{
  "node": "bird:r4:p0",
  "token": "journal",
  "reward": {
    "type": "CLAIM_ASSISTANT",
    "level": "silver"
  },
  "verified": true,
  "comment": "Journal reward printed on the board"
}
```

Reward objects are intentionally declarative. If a printed reward is not yet represented by the engine, record the visible meaning in `comment` and leave `reward` as `null`; the engine-side reward registry can be extended later without changing the topology.

## IDs

IDs are generated in start-to-temple order:

- `bird:start` — initial research area.
- `bird:r0:p0` — first scored row, path 0.
- `bird:r1:p1` — second scored row, path 1.
- `snake:r6:p0` — top scored Snake row, path 0.

A bridge ID is simply `from->to`, for example:

```text
bird:r2:p0->bird:r3:p1
```

Copy IDs exactly from `research-bridges.generated.json`; do not renumber paths manually.
`npm run report:research-bridges` prints only the unverified routes, in deterministic start-to-temple order, with both stable IDs and row/path labels. Use it when checking a board image or when preparing a short confirmation list.
