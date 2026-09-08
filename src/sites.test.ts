import assert from 'node:assert/strict';
import test from 'node:test';
import { createGame, reduce } from './engine.ts';
import { resolvePendingChoice } from './pending-choice.ts';
import { resolveRewardCode } from './site-rewards.ts';
import type { EngineContext } from './types.ts';

const context: EngineContext = {
  cards: {
    fear: { id: 'fear', name: 'Fear', type: 'Fear', expansion: 'Base Game', points: -1, travel: { boot: 1 } },
  },
  sites: {
    siteTile: { id: 'siteTile', level: 1, rewardCode: 'ctt', expansion: 'Base Game' },
    choiceTile: { id: 'choiceTile', level: 1, rewardCode: 'c1', expansion: 'Base Game' },
  },
};

test('placing a worker resolves automatic site resource rewards', () => {
  let state = reduce(createGame(['p1']), { type: 'START_GAME' });
  state.sites.slot = { id: 'slot', level: 1, tileId: 'siteTile', idolSlots: 0 };
  state = reduce(state, { type: 'PLACE_WORKER', playerId: 'p1', siteId: 'slot' }, context);

  assert.equal(state.players.p1.resources.coin, 3);
  assert.equal(state.players.p1.resources.tablet, 2);
  assert.equal(state.sites.slot.occupiedBy, 'p1');
});

test('placing a worker on a printed camp resolves its fixed reward without a site tile', () => {
  let state = reduce(createGame(['p1']), { type: 'START_GAME' });
  state.sites.camp = { id: 'camp', level: 1, rewardCode: 'cc', idolSlots: 0 };
  state = reduce(state, { type: 'PLACE_WORKER', playerId: 'p1', siteId: 'camp' }, context);

  assert.equal(state.players.p1.resources.coin, 4);
  assert.equal(state.sites.camp.occupiedBy, 'p1');
});

test('site choices are surfaced as pending rewards instead of guessed', () => {
  let state = reduce(createGame(['p1']), { type: 'START_GAME' });
  state.sites.slot = { id: 'slot', level: 1, tileId: 'choiceTile', idolSlots: 0 };
  state = reduce(state, { type: 'PLACE_WORKER', playerId: 'p1', siteId: 'slot' }, context);

  assert.equal(state.players.p1.resources.coin, 3);
  assert.deepEqual(state.pendingRewards, [{ playerId: 'p1', sourceId: 'choiceTile', code: '1' }]);
});

test('reviewed site symbols queue their typed effects and i/v buy an Item for free', () => {
  const state = createGame(['p1']);
  state.phase = 'playing';
  state.market.items = ['item'];
  const siteContext: EngineContext = { cards: { item: { id: 'item', name: 'Item', type: 'Item', expansion: 'Base Game', cost: 3 } } };
  resolveRewardCode(state, 'p1', 'reviewed-site', 'ivumb', siteContext);
  assert.deepEqual(state.pendingRewards.map(reward => [reward.code, (reward.payload as { effect: { type: string } }).effect.type]), [['card:RESOLVE_EFFECT', 'BUY_ITEM'], ['card:RESOLVE_EFFECT', 'BUY_ITEM'], ['card:RESOLVE_EFFECT', 'UPGRADE_RESOURCE_THEN'], ['card:RESOLVE_EFFECT', 'ACTIVATE_TENT_SITE'], ['card:RESOLVE_EFFECT', 'RETURN_SLOTTED_IDOL']]);
  const resolved = resolvePendingChoice(state, 'p1', 0, { type: 'card', cardId: 'item' }, siteContext);
  assert.ok(resolved.players.p1.deck.includes('item'));
  assert.equal(resolved.players.p1.resources.coin, 0);
});

test('an undefeated guardian gives Fear before round cleanup', () => {
  let state = reduce(createGame(['p1']), { type: 'START_GAME', seed: 'guardian-test' });
  state.sites.slot = { id: 'slot', level: 1, guardian: 'guardian-1', idolSlots: 0 };
  state = reduce(state, { type: 'PLACE_WORKER', playerId: 'p1', siteId: 'slot' }, context);
  state = reduce(state, { type: 'PASS', playerId: 'p1' }, context);

  assert.equal(state.round, 2);
  assert.ok(state.players.p1.discard.includes('fear'));
  assert.equal(state.sites.slot.occupiedBy, undefined);
});
