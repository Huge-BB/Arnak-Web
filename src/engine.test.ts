import assert from 'node:assert/strict';
import test from 'node:test';
import { createGame, reduce } from './engine.ts';
import type { EngineContext } from './types.ts';

const cards: EngineContext = {
  cards: {
    item1: { id: 'item1', name: 'Test Item', type: 'Item', expansion: 'Base Game', cost: 2, points: 1 },
    item2: { id: 'item2', name: 'Refill Item', type: 'Item', expansion: 'Base Game', cost: 1, points: 0 },
    artifact1: { id: 'artifact1', name: 'Test Artifact', type: 'Artifact', expansion: 'Base Game', cost: 1, points: 2 },
    artifact2: { id: 'artifact2', name: 'Refill Artifact', type: 'Artifact', expansion: 'Base Game', cost: 2, points: 1 },
  },
  cardEffects: { artifact1: [{ type: 'GAIN_RESOURCE', resource: 'tablet', amount: 1 }] },
};

const setupCards: EngineContext = {
  cards: Object.fromEntries([
    ...Array.from({ length: 8 }, (_, index) => ({ id: `i${index}`, name: `Item ${index}`, type: 'Item' as const, expansion: 'Base Game', cost: 1 })),
    ...Array.from({ length: 6 }, (_, index) => ({ id: `a${index}`, name: `Artifact ${index}`, type: 'Artifact' as const, expansion: 'Base Game', cost: 1 })),
    { id: 'fear', name: 'Fear', type: 'Fear' as const, expansion: 'Base Game', points: -1 },
    ...['Yellow', 'Green', 'Blue', 'Red'].flatMap((color, colorIndex) =>
      Array.from({ length: 4 }, (_, index) => ({
        id: `s${colorIndex}-${index}`, name: `Starter ${colorIndex}-${index}`, type: 'Starter' as const, expansion: 'Base Game', color,
      })),
    ),
  ].map(card => [card.id, card])),
};

test('START_GAME assigns base-game starting resources by player order', () => {
  const state = reduce(createGame(['p1', 'p2', 'p3', 'p4']), { type: 'START_GAME' });
  assert.deepEqual(state.playerOrder.map(id => ({ coin: state.players[id].resources.coin, compass: state.players[id].resources.compass })), [
    { coin: 2, compass: 0 }, { coin: 1, compass: 1 }, { coin: 2, compass: 1 }, { coin: 1, compass: 2 },
  ]);
});

test('seeded START_GAME initializes reproducible market and starting hands', () => {
  const first = reduce(createGame(['p1', 'p2']), { type: 'START_GAME', seed: 'game-123' }, setupCards);
  const second = reduce(createGame(['p1', 'p2']), { type: 'START_GAME', seed: 'game-123' }, setupCards);

  assert.equal(first.setupSeed, 'game-123');
  assert.deepEqual(first.market, second.market);
  assert.deepEqual(first.players.p1.hand, second.players.p1.hand);
  assert.equal(first.market.items.length, 5);
  assert.equal(first.market.artifacts.length, 1);
  assert.equal(first.players.p1.hand.length, 5);
  assert.equal(first.players.p1.deck.length, 1);
  assert.equal(first.players.p1.color, 'Yellow');
  assert.equal(first.players.p2.color, 'Green');
});

test('END_TURN does not advance the round', () => {
  let state = reduce(createGame(['p1', 'p2']), { type: 'START_GAME' });
  state.players.p1.mainActionUsed = true;
  state = reduce(state, { type: 'END_TURN', playerId: 'p1' });
  state.players.p2.mainActionUsed = true;
  state = reduce(state, { type: 'END_TURN', playerId: 'p2' });
  assert.equal(state.round, 1);
  assert.equal(state.currentPlayer, 'p1');
});

test('passed players are skipped until all players pass', () => {
  let state = reduce(createGame(['p1', 'p2', 'p3']), { type: 'START_GAME' });
  state = reduce(state, { type: 'PASS', playerId: 'p1' });
  assert.equal(state.currentPlayer, 'p2');
  state.players.p2.mainActionUsed = true;
  state = reduce(state, { type: 'END_TURN', playerId: 'p2' });
  assert.equal(state.currentPlayer, 'p3');
  state.players.p3.mainActionUsed = true;
  state = reduce(state, { type: 'END_TURN', playerId: 'p3' });
  assert.equal(state.currentPlayer, 'p2');
});

test('all players passing starts the next round and rotates first player', () => {
  let state = reduce(createGame(['p1', 'p2']), { type: 'START_GAME' });
  state.sites.campsite = { id: 'campsite', level: 1, idolSlots: 0 };
  state = reduce(state, { type: 'PLACE_WORKER', playerId: 'p1', siteId: 'campsite' });
  state = reduce(state, { type: 'PASS', playerId: 'p1' });
  state = reduce(state, { type: 'PASS', playerId: 'p2' });
  assert.equal(state.round, 2);
  assert.equal(state.firstPlayer, 'p2');
  assert.equal(state.currentPlayer, 'p2');
  assert.equal(state.sites.campsite.occupiedBy, undefined);
  assert.equal(state.players.p1.availableWorkers, 2);
  assert.equal(state.players.p1.hasPassed, false);
});

test('the fifth round finishes the game after everyone passes', () => {
  let state = reduce(createGame(['p1']), { type: 'START_GAME' });
  for (let round = 1; round <= 5; round += 1) state = reduce(state, { type: 'PASS', playerId: 'p1' });
  assert.equal(state.phase, 'finished');
  assert.equal(state.round, 5);
});

test('resource spending rejects insufficient resources without mutating input state', () => {
  const state = reduce(createGame(['p1']), { type: 'START_GAME' });
  assert.throws(() => reduce(state, { type: 'SPEND_RESOURCE', playerId: 'p1', resource: 'compass', amount: 1 }), /Insufficient compass/);
  assert.equal(state.players.p1.resources.compass, 0);
});

test('buying an item spends coins, puts it on the bottom of the deck, and defers refill until turn end', () => {
  let state = reduce(createGame(['p1']), { type: 'START_GAME' });
  state.market.items = ['item1'];
  state.market.itemDeck = ['item2'];
  state = reduce(state, { type: 'BUY_CARD', playerId: 'p1', cardId: 'item1' }, cards);
  assert.equal(state.players.p1.resources.coin, 0);
  assert.deepEqual(state.players.p1.deck, ['item1']);
  assert.deepEqual(state.market.items, []);
  assert.deepEqual(state.market.itemDeck, ['item2']);
  state=reduce(state,{type:'END_TURN',playerId:'p1'},cards);
  assert.deepEqual(state.market.items,['item2']);
  assert.deepEqual(state.market.itemDeck,[]);
});

test('buying an artifact spends compasses and places it in the played area', () => {
  let state = reduce(createGame(['p1', 'p2']), { type: 'START_GAME' });
  state.players.p1.resources.compass = 1;
  state.market.artifacts = ['artifact1'];
  state.market.artifactDeck = ['artifact2'];
  state = reduce(state, { type: 'BUY_CARD', playerId: 'p1', cardId: 'artifact1' }, cards);
  assert.equal(state.players.p1.resources.compass, 0);
  assert.deepEqual(state.players.p1.playedCards, ['artifact1']);
  assert.deepEqual(state.market.artifacts, []);
  state=reduce(state,{type:'END_TURN',playerId:'p1'},cards);
  assert.deepEqual(state.market.artifacts, ['artifact2']);
});

test('an unresolved effect choice blocks passing or taking another action', () => {
  const state = reduce(createGame(['p1']), { type: 'START_GAME' });
  state.pendingRewards.push({playerId:'p1',sourceId:'test',code:'research:CHOOSE',payload:{type:'CHOOSE',count:1,options:[]}});
  assert.throws(() => reduce(state, { type: 'PASS', playerId: 'p1' }), /Resolve the pending choice/);
  assert.throws(() => reduce(state, { type: 'GAIN_RESOURCE', playerId: 'p1', resource:'coin', amount:1 }), /Resolve the pending choice/);
});

test('a player may use free actions around exactly one main action, then must end or pass', () => {
  const state = reduce(createGame(['p1', 'p2']), { type: 'START_GAME' });
  state.sites.a = { id: 'a', level: 1, idolSlots: 0 };
  state.sites.b = { id: 'b', level: 1, idolSlots: 0 };
  const afterMain = reduce(state, { type: 'PLACE_WORKER', playerId: 'p1', siteId: 'a' });
  assert.equal(afterMain.players.p1.mainActionUsed, true);
  assert.throws(() => reduce(afterMain, { type: 'PLACE_WORKER', playerId: 'p1', siteId: 'b' }), /already been used/);
  const next = reduce(afterMain, { type: 'END_TURN', playerId: 'p1' });
  assert.equal(next.currentPlayer, 'p2');
  assert.equal(next.players.p1.mainActionUsed, undefined);
});

test('a purchased artifact can activate immediately without an extra hand-card cost', () => {
  let state = reduce(createGame(['p1']), { type: 'START_GAME' });
  state.players.p1.resources.compass = 1;
  state.market.artifacts = ['artifact1'];
  state = reduce(state, { type: 'BUY_CARD', playerId: 'p1', cardId: 'artifact1', activateImmediately: true }, cards);
  assert.equal(state.players.p1.resources.tablet, 1);
  assert.deepEqual(state.players.p1.playedCards, ['artifact1']);
});

test('market purchase fails when the card is unavailable or unaffordable', () => {
  const state = reduce(createGame(['p1']), { type: 'START_GAME' });
  state.market.items = ['item1'];
  assert.throws(() => reduce(state, { type: 'BUY_CARD', playerId: 'p1', cardId: 'item2' }, cards), /not available/);
  state.players.p1.resources.coin = 1;
  assert.throws(() => reduce(state, { type: 'BUY_CARD', playerId: 'p1', cardId: 'item1' }, cards), /Insufficient coin/);
});
