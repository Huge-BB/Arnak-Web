import assert from 'node:assert/strict';
import test from 'node:test';
import { createGame, reduce } from './engine.ts';
import { advanceResearchByNode } from './research-action.ts';
import { applyCardEffects } from './effects.ts';
import { resolvePendingCardEffect } from './card-effect-actions.ts';
import { resolvePendingChoice } from './pending-choice.ts';
import type { ResearchTrackDefinition } from './types.ts';

test('a printed site discard cost is selected after placement and before its reward', () => {
  const state = createGame(['p1']);
  state.phase = 'playing'; state.currentPlayer = 'p1'; state.players.p1.hand = ['fodder'];
  state.sites.camp = { id: 'camp', level: 1, isTentSite: true, idolSlots: 0, discardCardCost: 1, rewardCode: 'j' };
  const placed = reduce(state, { type: 'PLACE_WORKER', playerId: 'p1', siteId: 'camp' });
  assert.equal(placed.sites.camp.occupiedBy, 'p1');
  assert.deepEqual(placed.players.p1.hand, ['fodder']);
  assert.equal(placed.players.p1.resources.jewel, 0);
  assert.equal(placed.pendingRewards[0]?.code, 'site:DISCARD_AFTER_PLACEMENT');
  const resolved = resolvePendingChoice(placed, 'p1', 0, { type: 'card', cardId: 'fodder' }, { cards: {} });
  assert.deepEqual(resolved.players.p1.hand, []);
  assert.deepEqual(resolved.players.p1.playedCards, ['fodder']);
  assert.equal(resolved.players.p1.resources.jewel, 1);
});

test('Fear may be discarded from hand to pay a printed discard cost', () => {
  const state = createGame(['p1']);
  state.phase = 'playing'; state.currentPlayer = 'p1'; state.players.p1.hand = ['fear'];
  state.sites.camp = { id: 'camp', level: 1, isTentSite: true, idolSlots: 0, discardCardCost: 1, rewardCode: 'j' };
  const placed = reduce(state, { type: 'PLACE_WORKER', playerId: 'p1', siteId: 'camp' });
  const next = resolvePendingChoice(placed, 'p1', 0, { type: 'card', cardId: 'fear' }, { cards: {} });
  assert.deepEqual(next.players.p1.hand, []);
  assert.deepEqual(next.players.p1.playedCards, ['fear']);
});

test('a player with no hand card cannot enter a discard-cost site', () => {
  const state=createGame(['p1']);state.phase='playing';state.currentPlayer='p1';state.players.p1.hand=[];
  state.sites.camp={id:'camp',level:1,isTentSite:true,idolSlots:0,discardCardCost:1,rewardCode:'j'};
  assert.throws(()=>reduce(state,{type:'PLACE_WORKER',playerId:'p1',siteId:'camp'}),/requires one discarded hand card/);
  assert.equal(state.sites.camp.occupiedBy,undefined);assert.equal(state.players.p1.resources.jewel,0);
});

test('research discard costs use the same hand-to-used-area payment', () => {
  const track: ResearchTrackDefinition = {
    id: 'bird', name: 'Bird', rows: [{ magnifyingPoints: 1, journalPoints: 0, grantsAssistant: false, nodes: [{ id: 'bird:r0:p0', rowIndex: 0, pathIndex: 0, researchLevel: 0 }] }],
    bridges: [{ id: 'bird:start->bird:r0:p0', from: 'bird:start', to: 'bird:r0:p0', cost: { discardCard: 1 }, verified: true }],
  };
  const state = createGame(['p1']);
  state.phase = 'playing'; state.currentPlayer = 'p1'; state.players.p1.hand = ['fodder'];
  advanceResearchByNode(state, track, { playerId: 'p1', token: 'magnifying', toNodeId: 'bird:r0:p0', discardCardId: 'fodder' });
  assert.deepEqual(state.players.p1.hand, []);
  assert.deepEqual(state.players.p1.playedCards, ['fodder']);
});

test('a card effect discard also becomes used this round, rather than an independently usable zone', () => {
  const state = createGame(['p1']);
  state.phase = 'playing'; state.currentPlayer = 'p1'; state.players.p1.hand = ['fodder'];
  const context = { cards: { drum: { id: 'drum', name: 'Drum', type: 'Artifact' as const, expansion: 'Base Game' as const }, fodder: { id: 'fodder', name: 'Fodder', type: 'Starter' as const, expansion: 'Base Game' as const } }, cardEffects: { drum: [{ type: 'DISCARD_ONE_THEN' as const, effects: [] }] } };
  applyCardEffects(state, 'p1', context.cardEffects.drum, context, 'drum');
  const resolved = resolvePendingCardEffect(state, 'p1', 0, { type: 'card', cardId: 'fodder' }, context);
  assert.deepEqual(resolved.players.p1.playedCards, ['fodder']);
});
