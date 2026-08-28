import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../engine.ts';
import { activateAndBurnLizardLevel1Site, isLizardBurnedSite } from './lizard-rewards.ts';
import type { EngineContext } from '../types.ts';

test('Lizard reward activates a Level I site then removes its tile and guardian', () => {
  const state = createGame(['p1']);
  state.sites.s1 = { id: 's1', level: 1, tileId: 'site-tile', guardian: 'guardian-a', idolSlots: 1 };
  state.discovery.idolDeck = ['replacement-idol'];
  const context: EngineContext = { cards: {}, sites: {
    'site-tile': { id: 'site-tile', level: 1, rewardCode: 'c', expansion: 'Base Game' },
  } };
  const next = activateAndBurnLizardLevel1Site(state, 'p1', 's1', context);
  assert.equal(next.players.p1.resources.coin, 1);
  assert.equal(next.sites.s1.tileId, undefined);
  assert.equal(next.sites.s1.guardian, undefined);
  assert.equal(next.sites.s1.faceUpIdolId, 'replacement-idol');
  assert.equal(isLizardBurnedSite(next, 's1'), true);
  assert.equal(state.sites.s1.tileId, 'site-tile');
});
