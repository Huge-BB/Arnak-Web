import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { buildBaseGameCardPools, prepareBaseGameSetup, validateBaseGameCardPools } from './cards.ts';
import type { EngineContext, GuardianDefinition, IdolDefinition, SiteDefinition } from './types.ts';

async function loadExtractedContext(): Promise<EngineContext> {
  const raw = await readFile(new URL('./generated/cards.json', import.meta.url), 'utf8');
  return { cards: JSON.parse(raw) };
}

async function loadExtractedSites(): Promise<Record<string, SiteDefinition>> {
  const raw = await readFile(new URL('./generated/sites.json', import.meta.url), 'utf8');
  return JSON.parse(raw);
}

async function loadExtractedIdols(): Promise<Record<string, IdolDefinition>> {
  const raw = await readFile(new URL('./generated/idols.json', import.meta.url), 'utf8');
  return JSON.parse(raw);
}

async function loadExtractedGuardians(): Promise<Record<string, GuardianDefinition>> {
  const raw = await readFile(new URL('./generated/guardians.json', import.meta.url), 'utf8');
  return JSON.parse(raw);
}

test('extracted TTS catalog contains a playable base-game card pool', async () => {
  const context = await loadExtractedContext();
  const pools = buildBaseGameCardPools(context);

  assert.doesNotThrow(() => validateBaseGameCardPools(pools));
  assert.ok(pools.items.length >= 5);
  assert.ok(pools.artifacts.length >= 1);
  assert.ok(pools.fear.length >= 1);
  assert.equal(pools.startersByColor.Yellow.length, 4);
  assert.equal(pools.startersByColor.Green.length, 4);
  assert.equal(pools.startersByColor.Blue.length, 4);
  assert.equal(pools.startersByColor.Red.length, 4);
});

test('extracted TTS catalog can produce a four-player round-one setup', async () => {
  const context = await loadExtractedContext();
  const setup = prepareBaseGameSetup(context, 4, 'catalog-smoke-test');

  assert.equal(setup.market.items.length, 5);
  assert.equal(setup.market.artifacts.length, 1);
  assert.equal(setup.playerDecks.length, 4);
  for (const player of setup.playerDecks) {
    assert.equal(player.hand.length, 5);
    assert.equal(player.deck.length, 1);
  }
});

test('extracted TTS site catalog preserves base-game levels and reward codes', async () => {
  const sites = await loadExtractedSites();
  const all = Object.values(sites);

  assert.ok(all.filter(site => site.level === 1).length > 0);
  assert.ok(all.filter(site => site.level === 2).length > 0);
  assert.equal(sites['4e4290']?.rewardCode, 'ctt');
  assert.equal(sites['3b6bd8']?.rewardCode, 'fttaa');
  for (const site of all) {
    assert.equal(site.expansion, 'Base Game');
    assert.ok(site.image?.faceUrl);
  }
});

test('extracted TTS idols and guardians form usable base-game discovery pools', async () => {
  const idols = await loadExtractedIdols();
  const guardians = await loadExtractedGuardians();

  assert.ok(Object.keys(idols).length >= 12);
  assert.ok(Object.keys(guardians).length >= 10);
  assert.equal(idols['0a80b4']?.rewardCode, 'e');
  for (const idol of Object.values(idols)) {
    assert.equal(idol.expansion, 'Base Game');
    assert.ok(idol.image?.faceUrl);
  }
  for (const guardian of Object.values(guardians)) {
    assert.equal(guardian.expansion, 'Base Game');
    assert.ok(guardian.image?.faceUrl);
  }
});
