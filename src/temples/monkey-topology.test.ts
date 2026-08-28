import assert from 'node:assert/strict';
import test from 'node:test';
import { applyMonkeyPrintedTopology, MONKEY_TRACK_ARTIFACT_NODE } from './monkey-topology.ts';
import type { ResearchTrackDefinition } from '../types.ts';

const base: ResearchTrackDefinition = { id: 'monkey', name: 'Monkey', rows: Array.from({ length: 6 }, (_, rowIndex) => ({ magnifyingPoints: 0, journalPoints: 0, grantsAssistant: false, nodes: [{ id: `monkey:r${rowIndex}:p0`, rowIndex, pathIndex: 0, researchLevel: rowIndex }] })), bridges: [
  { id: 'a', from: 'monkey:r2:p0', to: 'monkey:r3:p0' },
  { id: 'b', from: 'monkey:r3:p0', to: 'monkey:r4:p0' },
  { id: 'c', from: 'monkey:r4:p0', to: 'monkey:r5:p0' },
] };

test('Monkey printed topology splits its level 4/5 area into magnifying and journal routes', () => {
  const track = applyMonkeyPrintedTopology(base);
  const artifact = track.rows[4].nodes?.find((node) => node.id === MONKEY_TRACK_ARTIFACT_NODE);
  assert.deepEqual(artifact?.spansLevels, [3, 4]);
  const move = (from: string, to: string) => track.bridges?.find((entry) => entry.from === from && entry.to === to);
  assert.deepEqual(move('monkey:r2:p0', MONKEY_TRACK_ARTIFACT_NODE)?.allowedTokens, ['magnifying']);
  assert.deepEqual(move('monkey:r2:p0', 'monkey:r3:p0')?.allowedTokens, ['journal']);
  assert.deepEqual(move(MONKEY_TRACK_ARTIFACT_NODE, 'monkey:r5:p0')?.allowedTokens, ['magnifying']);
  assert.deepEqual(move('monkey:r3:p0', 'monkey:r4:p0')?.allowedTokens, ['journal']);
});
