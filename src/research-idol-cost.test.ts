import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from './engine.ts';
import { advanceResearchByNode } from './research-action.ts';
import type { ResearchTrackDefinition } from './types.ts';

const track: ResearchTrackDefinition = {
  id: 'snake',
  name: 'Snake',
  rows: [
    { magnifyingPoints: 1, journalPoints: 0, grantsAssistant: false, nodes: [{ id: 'snake:r2:p0', rowIndex: 2, pathIndex: 0, researchLevel: 2 }] },
    { magnifyingPoints: 2, journalPoints: 1, grantsAssistant: false, nodes: [{ id: 'snake:r3:p0', rowIndex: 3, pathIndex: 0, researchLevel: 3 }] },
  ],
  bridges: [{ id: 'snake:r2:p0->snake:r3:p0', from: 'snake:r2:p0', to: 'snake:r3:p0', cost: { usableIdol: 1 }, verified: true }],
};

function gameWithIdols() {
  const state = createGame(['p1']);
  state.phase = 'playing';
  state.currentPlayer = 'p1';
  state.research.board = 'snake';
  state.research.magnifyingNode.p1 = 'snake:r2:p0';
  state.research.journalNode.p1 = 'snake:r2:p0';
  state.research.magnifying.p1 = 2;
  state.research.journal.p1 = 2;
  state.players.p1.idols = [
    { id: 'supply-idol', faceUp: true },
    { id: 'slotted-idol', faceUp: true, inSlot: true },
  ];
  return state;
}

test('Snake Temple idol bridge removes one idol from supply crates', () => {
  const state = gameWithIdols();
  advanceResearchByNode(state, track, { playerId: 'p1', token: 'magnifying', toNodeId: 'snake:r3:p0' });
  assert.deepEqual(state.players.p1.idols, [{ id: 'slotted-idol', faceUp: true, inSlot: true }]);
});

test('idol already in a player-board slot cannot pay Snake Temple bridge cost', () => {
  const state = gameWithIdols();
  state.players.p1.idols = [{ id: 'slotted-idol', faceUp: true, inSlot: true }];
  const before = structuredClone(state);
  assert.throws(
    () => advanceResearchByNode(state, track, { playerId: 'p1', token: 'magnifying', toNodeId: 'snake:r3:p0' }),
    /Insufficient usable idol/,
  );
  assert.deepEqual(state, before);
});
