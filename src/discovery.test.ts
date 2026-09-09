import assert from 'node:assert/strict';
import test from 'node:test';
import { createGame, reduce } from './engine.ts';
import type { EngineContext } from './types.ts';

const context: EngineContext = {
  cards: {},
  sites: {
    level1Tile: { id: 'level1Tile', level: 1, rewardCode: 't', expansion: 'Base Game' },
    level2Tile: { id: 'level2Tile', level: 2, rewardCode: 'j', expansion: 'Base Game' },
  },
  idols: {
    idolCoin: { id: 'idolCoin', rewardCode: 'c', expansion: 'Base Game' },
    idolChoice: { id: 'idolChoice', rewardCode: 'e', expansion: 'Base Game' },
  },
  guardians: {
    guardian1: { id: 'guardian1', expansion: 'Base Game' },
  },
};

function startedGame() {
  return reduce(createGame(['p1']), { type: 'START_GAME', seed: 'discovery-test' });
}

test('level I discovery costs 3 compasses and resolves idol before site reward', () => {
  const state = startedGame();
  state.players.p1.resources.compass = 3;
  state.sites.slot = { id: 'slot', level: 1, idolSlots: 1 };
  state.discovery.level1Deck = ['level1Tile'];
  state.discovery.idolDeck = ['idolCoin'];
  state.discovery.guardianDeck = ['guardian1'];

  const next = reduce(state, { type: 'DISCOVER_SITE', playerId: 'p1', siteId: 'slot' }, context);

  assert.equal(next.players.p1.resources.compass, 0);
  assert.equal(next.players.p1.resources.coin, 3);
  assert.equal(next.players.p1.resources.tablet, 1);
  assert.deepEqual(next.players.p1.idols, [{ id: 'idolCoin', faceUp: true }]);
  assert.equal(next.sites.slot.tileId, 'level1Tile');
  assert.equal(next.sites.slot.guardian, 'guardian1');
  assert.equal(next.sites.slot.occupiedBy, 'p1');
  assert.equal(next.players.p1.availableWorkers, 1);
});

test('level II discovery costs 6 compasses and takes one face-up plus one face-down idol', () => {
  const state = startedGame();
  state.players.p1.resources.compass = 6;
  state.sites.slot = { id: 'slot', level: 2, idolSlots: 2 };
  state.discovery.level2Deck = ['level2Tile'];
  state.discovery.idolDeck = ['idolChoice', 'idolCoin'];
  state.discovery.guardianDeck = ['guardian1'];

  const next = reduce(state, { type: 'DISCOVER_SITE', playerId: 'p1', siteId: 'slot' }, context);

  assert.equal(next.players.p1.resources.compass, 0);
  assert.equal(next.players.p1.resources.jewel, 1);
  assert.deepEqual(next.players.p1.idols, [
    { id: 'idolChoice', faceUp: true },
    { id: 'idolCoin', faceUp: false },
  ]);
  assert.deepEqual(next.pendingRewards, [{ playerId: 'p1', sourceId: 'idolChoice', code: 'card:RESOLVE_EFFECT', payload: { type: 'CARD_EFFECT', sourceCardId: 'idolChoice', effect: { type: 'EXILE_OWN_CARD' } } }]);
  assert.equal(next.sites.slot.tileId, 'level2Tile');
  assert.equal(next.sites.slot.guardian, 'guardian1');
});

test('failed discovery is atomic when compass payment is insufficient', () => {
  const state = startedGame();
  state.players.p1.resources.compass = 2;
  state.sites.slot = { id: 'slot', level: 1, idolSlots: 1 };
  state.discovery.level1Deck = ['level1Tile'];
  state.discovery.idolDeck = ['idolCoin'];
  state.discovery.guardianDeck = ['guardian1'];

  assert.throws(
    () => reduce(state, { type: 'DISCOVER_SITE', playerId: 'p1', siteId: 'slot' }, context),
    /Insufficient compass/,
  );
  assert.equal(state.players.p1.resources.compass, 2);
  assert.equal(state.players.p1.availableWorkers, 2);
  assert.equal(state.sites.slot.tileId, undefined);
  assert.deepEqual(state.players.p1.idols, []);
});
