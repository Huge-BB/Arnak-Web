import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import type { ResearchTrackDefinition } from './types.ts';

const tracks = JSON.parse(
  await readFile(new URL('./generated/research-tracks.json', import.meta.url), 'utf8'),
) as Record<'bird' | 'snake', ResearchTrackDefinition>;

for (const [boardId, track] of Object.entries(tracks)) {
  test(`${boardId} generated research topology has valid endpoints and full reachability`, () => {
    const nodeIds = new Set(track.rows.flatMap(row => (row.nodes ?? []).map(node => node.id)));
    const start = `${boardId}:start`;
    const validFrom = new Set([start, ...nodeIds]);

    for (const bridge of track.bridges ?? []) {
      assert.ok(validFrom.has(bridge.from), `${bridge.id}: unknown bridge source ${bridge.from}`);
      assert.ok(nodeIds.has(bridge.to), `${bridge.id}: unknown bridge destination ${bridge.to}`);
      assert.notEqual(bridge.from, bridge.to, `self-loop ${bridge.id}`);
    }

    const reachable = new Set<string>([start]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const bridge of track.bridges ?? []) {
        if (reachable.has(bridge.from) && !reachable.has(bridge.to)) {
          reachable.add(bridge.to);
          changed = true;
        }
      }
    }

    for (const nodeId of nodeIds) {
      assert.ok(reachable.has(nodeId), `research node is unreachable from start: ${nodeId}`);
    }
  });
}
