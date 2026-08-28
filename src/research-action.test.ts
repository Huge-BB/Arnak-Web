import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from './engine.ts';
import { advanceResearchByNode } from './research-action.ts';
import type { ResearchTrackDefinition } from './types.ts';

const track: ResearchTrackDefinition = {
  id: 'bird',
  name: 'Bird',
  rows: [
    {
      magnifyingPoints: 1,
      journalPoints: 0,
      grantsAssistant: false,
      nodes: [
        { id: 'bird:r0:p0', rowIndex: 0, pathIndex: 0, researchLevel: 0 },
        { id: 'bird:r0:p1', rowIndex: 0, pathIndex: 1, researchLevel: 0 },
      ],
    },
    {
      magnifyingPoints: 2,
      journalPoints: 1,
      grantsAssistant: false,
      nodes: [
        { id: 'bird:r1:p0', rowIndex: 1, pathIndex: 0, researchLevel: 1 },
        { id: 'bird:r1:p1', rowIndex: 1, pathIndex: 1, researchLevel: 2, spansLevels: [1, 2] },
      ],
    },
  ],
  bridges: [
    { id: 'bird:start->bird:r0:p0', from: 'bird:start', to: 'bird:r0:p0', cost: { coin: 1 }, verified: true },
    { id: 'bird:start->bird:r0:p1', from: 'bird:start', to: 'bird:r0:p1', cost: {}, verified: false },
    { id: 'bird:r0:p0->bird:r1:p0', from: 'bird:r0:p0', to: 'bird:r1:p0', cost: { tablet: 1 }, verified: true },
    { id: 'bird:r0:p0->bird:r1:p1', from: 'bird:r0:p0', to: 'bird:r1:p1', cost: { compass: 2 }, verified: true },
    { id: 'bird:r1:p0->bird:temple', from: 'bird:r1:p0', to: 'bird:temple', cost: { jewel: 1 }, verified: true },
  ],
  templeArrivalPoints: [11, 9, 7, 5],
};

function playingGame() {
  const state = createGame(['p1']);
  state.phase = 'playing';
  state.players.p1.resources.coin = 3;
  state.players.p1.resources.tablet = 2;
  state.players.p1.resources.compass = 3;
  state.players.p1.resources.jewel = 2;
  return state;
}

test('node research move pays the verified bridge cost and updates exact node', () => {
  const state = playingGame();
  advanceResearchByNode(state, track, { playerId: 'p1', token: 'magnifying', toNodeId: 'bird:r0:p0' });
  assert.equal(state.players.p1.resources.coin, 2);
  assert.equal(state.research.magnifyingNode.p1, 'bird:r0:p0');
  assert.equal(state.research.magnifying.p1, 0);
  assert.equal(state.players.p1.researchMagnifying, 0);
});

test('unverified manual research cost is never treated as free', () => {
  const state = playingGame();
  assert.throws(
    () => advanceResearchByNode(state, track, { playerId: 'p1', token: 'magnifying', toNodeId: 'bird:r0:p1' }),
    /has not been verified/,
  );
  assert.equal(state.research.magnifyingNode.p1, 'bird:start');
});

test('illegal topology move is rejected before resources change', () => {
  const state = playingGame();
  const before = structuredClone(state.players.p1.resources);
  assert.throws(
    () => advanceResearchByNode(state, track, { playerId: 'p1', token: 'magnifying', toNodeId: 'bird:r1:p0' }),
    /Illegal research bridge/,
  );
  assert.deepEqual(state.players.p1.resources, before);
});

test('irregular researchLevel, not row count, controls journal lead', () => {
  const state = playingGame();
  advanceResearchByNode(state, track, { playerId: 'p1', token: 'magnifying', toNodeId: 'bird:r0:p0' });
  advanceResearchByNode(state, track, { playerId: 'p1', token: 'journal', toNodeId: 'bird:r0:p0' });
  state.players.p1.rules.journalMaxLead = 1;
  assert.throws(
    () => advanceResearchByNode(state, track, { playerId: 'p1', token: 'journal', toNodeId: 'bird:r1:p1' }),
    /ahead of the magnifying glass/,
  );
  state.players.p1.rules.journalMaxLead = 2;
  advanceResearchByNode(state, track, { playerId: 'p1', token: 'journal', toNodeId: 'bird:r1:p1' });
  assert.equal(state.research.journalNode.p1, 'bird:r1:p1');
});

test('insufficient bridge cost leaves node and resources unchanged', () => {
  const state = playingGame();
  advanceResearchByNode(state, track, { playerId: 'p1', token: 'magnifying', toNodeId: 'bird:r0:p0' });
  state.players.p1.resources.tablet = 0;
  const before = structuredClone(state);
  assert.throws(
    () => advanceResearchByNode(state, track, { playerId: 'p1', token: 'magnifying', toNodeId: 'bird:r1:p0' }),
    /Insufficient tablet/,
  );
  assert.deepEqual(state, before);
});

test('magnifying glass entering the Lost Temple pays cost and records configured arrival points', () => {
  const state = playingGame();
  advanceResearchByNode(state, track, { playerId: 'p1', token: 'magnifying', toNodeId: 'bird:r0:p0' });
  advanceResearchByNode(state, track, { playerId: 'p1', token: 'magnifying', toNodeId: 'bird:r1:p0' });
  advanceResearchByNode(state, track, { playerId: 'p1', token: 'magnifying', toNodeId: 'bird:temple' });
  assert.equal(state.players.p1.resources.jewel, 1);
  assert.equal(state.research.magnifyingNode.p1, 'bird:temple');
  assert.equal(state.research.templeArrivalPoints.p1, 11);
  assert.deepEqual(state.research.templeArrivals, ['p1']);
});

test('journal cannot use a Lost Temple entry bridge', () => {
  const state = playingGame();
  state.research.journalNode.p1 = 'bird:r1:p0';
  state.research.journal.p1 = 1;
  state.research.magnifyingNode.p1 = 'bird:r1:p0';
  state.research.magnifying.p1 = 1;
  assert.throws(
    () => advanceResearchByNode(state, track, { playerId: 'p1', token: 'journal', toNodeId: 'bird:temple' }),
    /Journal cannot enter/,
  );
});
