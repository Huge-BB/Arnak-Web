import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyResearchManualData,
  assertVerifiedResearchBridge,
  findResearchBridge,
  findResearchNode,
} from './research-manual.ts';
import type { ResearchManualData, ResearchTrackDefinition } from './types.ts';

const track: ResearchTrackDefinition = {
  id: 'bird',
  name: 'Bird',
  rows: [
    {
      magnifyingPoints: 1,
      journalPoints: 0,
      grantsAssistant: false,
      nodes: [{ id: 'bird:r0:p0', rowIndex: 0, pathIndex: 0, researchLevel: 0 }],
    },
    {
      magnifyingPoints: 2,
      journalPoints: 1,
      grantsAssistant: false,
      nodes: [{ id: 'bird:r1:p0', rowIndex: 1, pathIndex: 0, researchLevel: 1 }],
    },
  ],
  bridges: [
    { id: 'bird:start->bird:r0:p0', from: 'bird:start', to: 'bird:r0:p0' },
    { id: 'bird:r0:p0->bird:r1:p0', from: 'bird:r0:p0', to: 'bird:r1:p0' },
  ],
  templePoints: [23, 21, 20, 19],
};

function manualBridge(overrides: Record<string, unknown> = {}): ResearchManualData {
  return {
    $schemaVersion: 2,
    boards: {
      bird: {
        bridges: [{
          from: 'bird:start',
          to: 'bird:r0:p0',
          cost: { compass: 1, tablet: 1 },
          verified: true,
          ...overrides,
        }],
        nodeOverrides: [],
        nodeRewards: [],
      },
    },
  } as ResearchManualData;
}

test('manual research data merges verified costs onto generated topology', () => {
  const merged = applyResearchManualData(track, manualBridge(), { requireVerified: true });
  const bridge = findResearchBridge(merged, 'bird:start', 'bird:r0:p0');
  assert.deepEqual(bridge.cost, { compass: 1, tablet: 1 });
  assert.equal(bridge.verified, true);
  assertVerifiedResearchBridge(bridge);
  assert.equal(track.bridges?.[0].cost, undefined, 'input topology must remain immutable');
});

test('manual research data rejects a bridge that is absent from generated topology', () => {
  assert.throws(
    () => applyResearchManualData(track, manualBridge({ to: 'bird:r9:p9' })),
    /does not exist/,
  );
});

test('manual research data rejects negative costs', () => {
  assert.throws(
    () => applyResearchManualData(track, manualBridge({ cost: { jewel: -1 } })),
    /invalid jewel cost/,
  );
});

test('manual research data can require human verification', () => {
  assert.throws(
    () => applyResearchManualData(track, manualBridge({ verified: false }), { requireVerified: true }),
    /not verified/,
  );
});

test('manual node override can model one physical space spanning multiple printed levels', () => {
  const manual = manualBridge();
  manual.boards.bird!.nodeOverrides = [{
    node: 'bird:r1:p0',
    researchLevel: 5,
    spansLevels: [4, 5],
    verified: true,
    comment: 'Example merged level 4/5 space',
  }];
  const merged = applyResearchManualData(track, manual, { requireVerified: true });
  const node = findResearchNode(merged, 'bird:r1:p0');
  assert.equal(node.researchLevel, 5);
  assert.deepEqual(node.spansLevels, [4, 5]);
  assert.equal(track.rows[1].nodes?.[0].researchLevel, 1, 'input topology must remain immutable');
});

test('manual node override rejects invalid levels and unknown node ids', () => {
  const invalidLevel = manualBridge();
  invalidLevel.boards.bird!.nodeOverrides = [{
    node: 'bird:r1:p0', researchLevel: -1, verified: true,
  }];
  assert.throws(() => applyResearchManualData(track, invalidLevel), /invalid researchLevel/);

  const unknownNode = manualBridge();
  unknownNode.boards.bird!.nodeOverrides = [{
    node: 'bird:r9:p9', researchLevel: 5, verified: true,
  }];
  assert.throws(() => applyResearchManualData(track, unknownNode), /does not exist/);
});
