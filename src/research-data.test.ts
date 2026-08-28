import test from 'node:test';
import assert from 'node:assert/strict';
import { buildResearchTracks, researchBridgeCoverage } from './research-data.ts';
import type { ResearchManualData, ResearchTrackDefinition } from './types.ts';

const bird: ResearchTrackDefinition = {
  id: 'bird',
  name: 'Bird',
  rows: [{
    magnifyingPoints: 1,
    journalPoints: 0,
    grantsAssistant: false,
    nodes: [{ id: 'bird:r0:p0', rowIndex: 0, pathIndex: 0, researchLevel: 0 }],
  }],
  bridges: [{ id: 'bird:start->bird:r0:p0', from: 'bird:start', to: 'bird:r0:p0' }],
  templePoints: [23, 21, 20, 19],
};

const manual: ResearchManualData = {
  $schemaVersion: 2,
  boards: {
    bird: {
      bridges: [{
        from: 'bird:start',
        to: 'bird:r0:p0',
        cost: { compass: 1 },
        verified: true,
      }],
      nodeOverrides: [],
      nodeRewards: [],
    },
  },
};

test('buildResearchTracks merges manual bridge data without mutating generated topology', () => {
  const merged = buildResearchTracks({ bird }, manual);
  assert.deepEqual(merged.bird?.bridges?.[0].cost, { compass: 1 });
  assert.equal(merged.bird?.bridges?.[0].verified, true);
  assert.equal(bird.bridges?.[0].cost, undefined);
});

test('research bridge coverage reports manual-entry progress', () => {
  const merged = buildResearchTracks({ bird }, manual).bird!;
  assert.deepEqual(researchBridgeCoverage(merged), {
    total: 1,
    verified: 1,
    remaining: 0,
    complete: true,
  });
});
