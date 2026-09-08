# Rule Review Batch 05 — Expedition Leaders Guardians

Scope: the five Guardians added by *Expedition Leaders*. These are not in the
runtime guardian catalogue yet. This review establishes their printed payment
cost and one-use boon before they are imported.

## Source

The local TTS source is `objects/GuardiansExpeditionLeaders.b876d5`; its deck
uses the following five cells from the original image sheet:

[Open the original five-guardian sheet](https://steamusercontent-a.akamaihd.net/ugc/1862806463732172227/EA553AB2DE712F89BC4569A8A2828C5E2C18401F/)

Read the sheet left-to-right. The upper strip is the defeat cost; the lower
strip is the guardian's once-per-game boon. Please provide the meaning of each
icon sequence, or simply mark an entry correct after adjusting it.

| TTS card id | Sheet position | Visual identification | Defeat cost | One-use boon | Review |
|---|---:|---|---|---|---|
| `1200` (`9ae554`) | 1 | crab-like guardian | — | — | pending |
| `1201` (`e31dd6`) | 2 | blue plated beast | — | — | pending |
| `1202` (`d8ef41`) | 3 | flying insect guardian | — | — | pending |
| `1203` (`c1f255`) | 4 | purple bird guardian | — | — | pending |
| `1204` (`191da5`) | 5 | green scorpion guardian | — | — | pending |

## Implementation boundary

After confirmation, each row will become a typed entry in
`data/guardian-effects-manual.json`, backed by the existing guardian-payment
and one-time-boon engine tests. Until then these five cards deliberately stay
out of the random guardian deck.
