import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, reduce } from './engine.ts';
import { claimResearchBonusAtNode } from './research-bonus-tiles.ts';
import { resolvePendingChoice } from './pending-choice.ts';
import type { EngineContext, ResearchTrackDefinition } from './types.ts';

const track: ResearchTrackDefinition = { id: 'test', name: 'Test', rows: [{ magnifyingPoints: 1, journalPoints: 0, grantsAssistant: false, nodes: [
  { id: 'test:r0:p0', rowIndex: 0, pathIndex: 0, researchLevel: 0, metadata: { bonusSlot: true, bonusMinPlayers: 1 } },
  { id: 'test:r0:p1', rowIndex: 0, pathIndex: 1, researchLevel: 0, metadata: { bonusSlot: true, bonusMinPlayers: 3 } },
] }], bridges: [] };
const context: EngineContext = { cards: {}, researchTracks: { test: track } };

test('research bonus setup is seeded, player-count-aware, and reserves one temple tile per player', () => {
  const two = reduce(createGame(['p1', 'p2']), { type: 'START_GAME', seed: 'bonus', researchBoard: 'test' }, context);
  const three = reduce(createGame(['p1', 'p2', 'p3']), { type: 'START_GAME', seed: 'bonus', researchBoard: 'test' }, context);
  assert.equal(Object.keys(two.research.bonusTiles).length, 1);
  assert.equal(two.research.templeBonusTiles.length, 2);
  assert.equal(Object.keys(three.research.bonusTiles).length, 2);
  assert.equal(three.research.templeBonusTiles.length, 3);
});

test('claiming a research bonus removes it and its optional exile resolves through the canonical dispatcher', () => {
  const state = createGame(['p1']); state.phase = 'playing'; state.currentPlayer = 'p1';
  state.research.bonusTiles = { 'test:r0:p0': ['base:coin:1'] };
  claimResearchBonusAtNode(state, 'p1', 'test:r0:p0');
  assert.equal(state.players.p1.resources.coin, 1);
  assert.deepEqual(state.research.bonusTiles, {});
  state.research.bonusTiles = { 'test:r0:p0': ['base:exile:1'] }; state.players.p1.hand = ['card'];
  claimResearchBonusAtNode(state, 'p1', 'test:r0:p0');
  const next = resolvePendingChoice(state, 'p1', 0, { type: 'card', cardId: 'card' }, context);
  assert.ok(next.market.exiled.includes('card'));
});

test('a collapsed multi-slot node requires the caller to select a visible tile', () => {
  const state = createGame(['p1']); state.phase = 'playing'; state.currentPlayer = 'p1';
  state.research.bonusTiles = { 'test:r0:p0': ['base:coin:1', 'base:compass:1'] };
  assert.throws(() => claimResearchBonusAtNode(state, 'p1', 'test:r0:p0'), /choose a tile explicitly/);
  claimResearchBonusAtNode(state, 'p1', 'test:r0:p0', 'base:compass:1');
  assert.equal(state.players.p1.resources.compass, 1);
  assert.deepEqual(state.research.bonusTiles['test:r0:p0'], ['base:coin:1']);
});

test('research bonus resource upgrade follows the printed tablet-arrowhead-jewel chain', () => {
  const state = createGame(['p1']); state.phase = 'playing'; state.currentPlayer = 'p1'; state.players.p1.resources.tablet = 1;
  state.research.bonusTiles = { 'test:r0:p0': ['base:upgrade:1'] };
  claimResearchBonusAtNode(state, 'p1', 'test:r0:p0');
  const next = resolvePendingChoice(state, 'p1', 0, { type: 'resource', resource: 'tablet' }, context);
  assert.equal(next.players.p1.resources.tablet, 0); assert.equal(next.players.p1.resources.arrowhead, 1);
  assert.throws(() => resolvePendingChoice(state, 'p1', 0, { type: 'resource', resource: 'coin' }, context), /cannot be upgraded/);
});
