import assert from 'node:assert/strict';
import test from 'node:test';
import { createGame, reduce } from './engine.ts';
import type { EngineContext } from './types.ts';

function setupContext(): EngineContext {
  const definitions = [
    ...Array.from({ length: 10 }, (_, index) => ({ id: `i${index}`, name: `Item ${index}`, type: 'Item' as const, expansion: 'Base Game', cost: 1 })),
    ...Array.from({ length: 10 }, (_, index) => ({ id: `a${index}`, name: `Artifact ${index}`, type: 'Artifact' as const, expansion: 'Base Game', cost: 1 })),
    { id: 'fear', name: 'Fear', type: 'Fear' as const, expansion: 'Base Game', points: -1 },
    ...['Yellow', 'Green', 'Blue', 'Red'].flatMap((color, colorIndex) =>
      Array.from({ length: 4 }, (_, index) => ({
        id: `s${colorIndex}-${index}`,
        name: `Starter ${colorIndex}-${index}`,
        type: 'Starter' as const,
        expansion: 'Base Game',
        color,
      })),
    ),
  ];
  return { cards: Object.fromEntries(definitions.map(card => [card.id, card])) };
}

test('round transition exiles the cards nearest the moon staff and refills the new ratio', () => {
  const context = setupContext();
  let state = reduce(createGame(['p1']), { type: 'START_GAME', seed: 'round-market' }, context);

  const nearestArtifact = state.market.artifacts.at(-1)!;
  const nearestItem = state.market.items[0];
  state = reduce(state, { type: 'PASS', playerId: 'p1' }, context);

  assert.equal(state.round, 2);
  assert.equal(state.market.artifacts.length, 2);
  assert.equal(state.market.items.length, 4);
  assert.ok(state.market.exiled.includes(nearestArtifact));
  assert.ok(state.market.exiled.includes(nearestItem));
  assert.equal(state.market.exiled.length, 2);
});

test('the optional red moon staff exiles two cards from each side before refilling', () => {
  const context = setupContext();
  let state = reduce(createGame(['p1']), { type: 'START_GAME', seed: 'red-staff', moonStaff: 'red' }, context);
  const nearestArtifacts = state.market.artifacts.slice(-2);
  const nearestItems = state.market.items.slice(0, 2);
  state = reduce(state, { type: 'PASS', playerId: 'p1' }, context);
  assert.equal(state.moonStaff, 'red');
  assert.equal(state.round, 2);
  assert.ok(nearestArtifacts.every((id) => state.market.exiled.includes(id)));
  assert.ok(nearestItems.every((id) => state.market.exiled.includes(id)));
  assert.equal(state.market.exiled.length, 3); // Round I has only one Artifact beside the staff.
  assert.equal(state.market.artifacts.length, 2);
  assert.equal(state.market.items.length, 4);
});

test('played cards are shuffled to the bottom of the deck and hand draws back to five', () => {
  const context = setupContext();
  let state = reduce(createGame(['p1']), { type: 'START_GAME', seed: 'round-cleanup' }, context);

  state.players.p1.hand = state.players.p1.hand.slice(0, 3);
  state.players.p1.deck = ['existing-bottom'];
  state.players.p1.playedCards = ['played-a', 'played-b', 'played-c'];

  state = reduce(state, { type: 'PASS', playerId: 'p1' }, context);

  assert.equal(state.players.p1.hand.length, 5);
  assert.equal(state.players.p1.playedCards.length, 0);
  assert.equal(state.players.p1.discard.length, 0);
  assert.equal(state.players.p1.deck.length, 2);
});

test('artifact purchase refills on the far side of the artifact row', () => {
  const context = setupContext();
  let state = reduce(createGame(['p1']), { type: 'START_GAME', seed: 'artifact-refill' }, context);

  state.players.p1.resources.compass = 10;
  state.market.artifacts = ['a0', 'a1'];
  state.market.artifactDeck = ['a9'];
  state = reduce(state, { type: 'BUY_CARD', playerId: 'p1', cardId: 'a1' }, context);

  assert.deepEqual(state.market.artifacts, ['a9', 'a0']);
});
