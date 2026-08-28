import assert from 'node:assert/strict';
import test from 'node:test';
import { createGame, reduce } from './engine.ts';

function game() {
  const state = createGame(['p1']);
  state.phase = 'playing';
  state.currentPlayer = 'p1';
  state.players.p1.idols = Array.from({ length: 5 }, (_, index) => ({ id: `idol-${index}`, faceUp: true }));
  return state;
}

test('base idol is a free action and fills the leftmost empty slot', () => {
  let state = game();
  state.players.p1.resources.coin = 1;
  state = reduce(state, { type: 'USE_IDOL', playerId: 'p1', idolId: 'idol-0', effect: 'coinToJewel' });
  assert.equal(state.players.p1.mainActionUsed, undefined);
  assert.deepEqual(state.players.p1.idols[0], { id: 'idol-0', faceUp: true, inSlot: true, slotIndex: 0 });
  assert.equal(state.players.p1.resources.coin, 0);
  assert.equal(state.players.p1.resources.jewel, 1);
  state = reduce(state, { type: 'USE_IDOL', playerId: 'p1', idolId: 'idol-1', effect: 'tablets' });
  assert.equal(state.players.p1.idols[1].slotIndex, 1);
  assert.equal(state.players.p1.resources.tablet, 2);
});

test('base idol effects cover arrows, coin-compass, and draw', () => {
  let state = game();
  state.players.p1.deck = ['drawn'];
  state = reduce(state, { type: 'USE_IDOL', playerId: 'p1', idolId: 'idol-0', effect: 'arrowhead' });
  state = reduce(state, { type: 'USE_IDOL', playerId: 'p1', idolId: 'idol-1', effect: 'coinCompass' });
  state = reduce(state, { type: 'USE_IDOL', playerId: 'p1', idolId: 'idol-2', effect: 'draw' });
  assert.equal(state.players.p1.resources.arrowhead, 1);
  assert.equal(state.players.p1.resources.coin, 1);
  assert.equal(state.players.p1.resources.compass, 1);
  assert.deepEqual(state.players.p1.hand, ['drawn']);
});

test('base idol cannot skip a slot, exceed four slots, or spend a missing coin', () => {
  const state = game();
  assert.throws(() => reduce(state, { type: 'USE_IDOL', playerId: 'p1', idolId: 'idol-0', effect: 'coinToJewel' }), /requires 1 coin/);
  let filled = game();
  for (let index = 0; index < 4; index += 1) filled = reduce(filled, { type: 'USE_IDOL', playerId: 'p1', idolId: `idol-${index}`, effect: 'arrowhead' });
  assert.throws(() => reduce(filled, { type: 'USE_IDOL', playerId: 'p1', idolId: 'idol-4', effect: 'arrowhead' }), /No empty base idol slots/);
});
