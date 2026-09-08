import assert from 'node:assert/strict';
import test from 'node:test';
import { blockedCampIds, createBaseBoardSites, resolveBaseBoardPlacementSite } from './base-board-setup.ts';
import { createGame, reduce } from './engine.ts';

test('base board keeps five camps and blocks right-hand camp spaces by player count deterministically', () => {
  const two = createBaseBoardSites(2, 'setup');
  const three = createBaseBoardSites(3, 'setup');
  const four = createBaseBoardSites(4, 'setup');
  assert.equal(Object.values(four).filter((site) => site.isTentSite).length, 10);
  assert.equal(Object.values(two).filter((site) => site.blocked).length, 5);
  assert.equal(Object.values(three).filter((site) => site.blocked).length, 3);
  assert.equal(Object.values(four).filter((site) => site.blocked).length, 0);
  assert.deepEqual(blockedCampIds(3, 'setup'), blockedCampIds(3, 'setup'));
});

test('a blocked camp space cannot receive an archaeologist', () => {
  const state = createGame(['p1', 'p2']);
  state.sites = createBaseBoardSites(2, 'setup');
  const started = reduce(state, { type: 'START_GAME', seed: 'setup' });
  const blocked = Object.values(started.sites).find((site) => site.blocked)!;
  assert.throws(() => reduce(started, { type: 'PLACE_WORKER', playerId: 'p1', siteId: blocked.id }), /blocked/);
});

test('one visible camp target resolves to its first available internal worker space', () => {
  const sites = createBaseBoardSites(4, 'setup');
  assert.equal(resolveBaseBoardPlacementSite(sites, 'camp-1'), 'camp-1-a');
  sites['camp-1-a'].occupiedBy = 'p1';
  assert.equal(resolveBaseBoardPlacementSite(sites, 'camp-1'), 'camp-1-b');
  sites['camp-1-b'].occupiedBy = 'p2';
  assert.throws(() => resolveBaseBoardPlacementSite(sites, 'camp-1'), /full/);
});

test('Snake board uses its own printed travel costs where routes differ', () => {
  const snake = createBaseBoardSites(4, 'snake', 'snake');
  assert.deepEqual(snake['level1-6'].travelCost, { boot: 2 });
  assert.deepEqual(snake['level1-7'].travelCost, { plane: 1 });
  assert.deepEqual(snake['level2-2'].travelCost, { plane: 1, boot: 1 });
  assert.deepEqual(snake['level2-3'].travelCost, { car: 1, boat: 1 });
});

test('setup places one face-up idol on each Level I site and a face-up/down pair on Level II sites', () => {
  const state = createGame(['p1', 'p2']);
  state.sites = createBaseBoardSites(2, 'setup');
  const started = reduce(state, { type: 'START_GAME', seed: 'setup' }, { cards: {}, idols: Object.fromEntries(Array.from({ length: 16 }, (_, index) => [`idol-${index}`, { id: `idol-${index}`, rewardCode: '', expansion: 'Base Game' }])) });
  const levelOne = Object.values(started.sites).filter((site) => !site.isTentSite && site.level === 1);
  const levelTwo = Object.values(started.sites).filter((site) => site.level === 2);
  assert.ok(levelOne.every((site) => site.faceUpIdolId && !site.faceDownIdolIds?.length));
  assert.ok(levelTwo.every((site) => site.faceUpIdolId && site.faceDownIdolIds?.length === 1));
});
