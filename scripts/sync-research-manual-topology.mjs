import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const generatedPath = resolve(root, 'src/generated/research-tracks.json');
const manualPath = resolve(root, 'data/research-manual-data.json');

const generated = JSON.parse(await readFile(generatedPath, 'utf8'));
const manual = JSON.parse(await readFile(manualPath, 'utf8'));
manual.boards ??= {};

function bridgeKey(bridge) {
  return `${bridge.from}->${bridge.to}`;
}

let added = 0;
for (const [boardId, track] of Object.entries(generated)) {
  const board = manual.boards[boardId] ??= { bridges: [], nodeOverrides: [], nodeRewards: [] };
  board.bridges ??= [];
  board.nodeOverrides ??= [];
  board.nodeRewards ??= [];

  const existing = new Set(board.bridges.map(bridgeKey));
  for (const bridge of track.bridges ?? []) {
    const key = bridgeKey(bridge);
    if (existing.has(key)) continue;
    board.bridges.push({
      from: bridge.from,
      to: bridge.to,
      cost: {},
      rewards: [],
      verified: false,
      comment: 'Auto-synced from TTS topology; fill printed cost/reward and verify.',
    });
    existing.add(key);
    added += 1;
  }
}

await writeFile(manualPath, `${JSON.stringify(manual, null, 2)}\n`);
console.log(`Research manual topology synchronized: ${added} missing bridge(s) added.`);
