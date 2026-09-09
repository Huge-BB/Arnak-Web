import assert from 'node:assert/strict';
import test from 'node:test';
import { createGame, reduce } from './engine.ts';
import { resolvePendingChoice } from './pending-choice.ts';
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
  assert.equal(next.players.p1.resources.jewel, 0);
  assert.deepEqual(next.players.p1.idols, [
    { id: 'idolChoice', faceUp: true },
    { id: 'idolCoin', faceUp: false },
  ]);
  assert.deepEqual(next.pendingRewards, [{ playerId: 'p1', sourceId: 'idolChoice', code: 'card:RESOLVE_EFFECT', payload: { type: 'CARD_EFFECT', sourceCardId: 'idolChoice', effect: { type: 'EXILE_OWN_CARD' }, afterDiscoverySiteId: 'slot' } }]);
  assert.equal(next.sites.slot.tileId, 'level2Tile');
  assert.equal(next.sites.slot.guardian, 'guardian1');
});

test('choice idol fully resolves before a discovered site draws a card', () => {
  const drawContext: EngineContext = {
    ...context,
    cards: {
      old: { id: 'old', name: 'Old card', type: 'Starter', expansion: 'Base Game' },
      drawn: { id: 'drawn', name: 'Drawn card', type: 'Item', expansion: 'Base Game' },
    },
    sites: { level1Draw: { id: 'level1Draw', level: 1, rewardCode: 'd', expansion: 'Base Game' } },
  };
  const state = startedGame();
  state.players.p1.resources.compass = 3;
  state.players.p1.hand = ['old'];
  state.players.p1.deck = ['drawn'];
  state.sites.slot = { id: 'slot', level: 1, idolSlots: 1 };
  state.discovery.level1Deck = ['level1Draw'];
  state.discovery.idolDeck = ['idolChoice'];
  state.discovery.guardianDeck = ['guardian1'];

  const discovered = reduce(state, { type: 'DISCOVER_SITE', playerId: 'p1', siteId: 'slot' }, drawContext);
  assert.deepEqual(discovered.players.p1.hand, ['old']);
  assert.deepEqual(discovered.players.p1.deck, ['drawn']);

  const resolved = resolvePendingChoice(discovered, 'p1', 0, { type: 'card', cardId: 'old' }, drawContext);
  assert.deepEqual(resolved.players.p1.hand, ['drawn']);
  assert.deepEqual(resolved.players.p1.deck, []);
  assert.deepEqual(resolved.market.exiled, ['old']);
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
