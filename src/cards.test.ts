import assert from 'node:assert/strict';
import test from 'node:test';
import { buildBaseGameCardPools, cardRecord, dealMarketForRound, prepareBaseGameSetup, validateBaseGameCardPools } from './cards.ts';
import type { CardDefinition } from './types.ts';

function starter(id: string, color: string): CardDefinition {
  return { id, name: id, type: 'Starter', expansion: 'Base Game', color };
}

const baseCards: CardDefinition[] = [
  ...Array.from({ length: 8 }, (_, index) => ({
    id: `item-${index + 1}`, name: `Item ${index + 1}`, type: 'Item' as const, expansion: 'Base Game', cost: 1,
  })),
  ...Array.from({ length: 6 }, (_, index) => ({
    id: `artifact-${index + 1}`, name: `Artifact ${index + 1}`, type: 'Artifact' as const, expansion: 'Base Game', cost: 1,
  })),
  { id: 'fear', name: 'Fear', type: 'Fear', expansion: 'Base Game', points: -1 },
  ...['Yellow', 'Green', 'Blue', 'Red'].flatMap((color, colorIndex) =>
    Array.from({ length: 4 }, (_, index) => starter(`${colorIndex}-${index}`, color)),
  ),
  { id: 'exp-item', name: 'Expansion Item', type: 'Item', expansion: 'Expedition Leaders', cost: 1 },
  { id: 'shipment-item', name: 'Shipment Item', type: 'Item', expansion: 'Surprise Shipment', cost: 1 },
  { id: 'shipment-artifact', name: 'Shipment Artifact', type: 'Artifact', expansion: 'Surprise Shipment', cost: 1 },
];

const context = { cards: cardRecord(baseCards) };

test('buildBaseGameCardPools separates base-game market, starter, and fear cards', () => {
  const pools = buildBaseGameCardPools(context);

  assert.equal(pools.items.length, 8);
  assert.equal(pools.artifacts.length, 6);
  assert.deepEqual(pools.fear, ['fear']);
  assert.equal(pools.startersByColor.Yellow.length, 4);
  assert.equal(pools.startersByColor.Red.length, 4);
  assert.ok(!pools.items.includes('exp-item'));
  assert.ok(!pools.items.includes('shipment-item'));
  assert.doesNotThrow(() => validateBaseGameCardPools(pools));
});

test('an opted-in shared market expansion mixes regular leader cards but not leader starting cards', () => {
  const pools = buildBaseGameCardPools(context, ['Base Game', 'Surprise Shipment', 'Expedition Leaders']);
  assert.ok(pools.items.includes('shipment-item'));
  assert.ok(pools.artifacts.includes('shipment-artifact'));
  assert.ok(pools.items.includes('exp-item'));
  const leaderStarting = { id: 'leader-funding', name: 'Funding', type: 'Item' as const, expansion: 'Expedition Leaders', cost: 1 };
  const withoutStarting = buildBaseGameCardPools({ cards: cardRecord([...baseCards, leaderStarting]) }, ['Base Game', 'Expedition Leaders']);
  assert.ok(!withoutStarting.items.includes('leader-funding'));
});

test('base-game starter cards require color metadata', () => {
  const broken: CardDefinition[] = [
    ...baseCards,
    { id: 'broken', name: 'Broken Starter', type: 'Starter', expansion: 'Base Game' },
  ];
  assert.throws(
    () => buildBaseGameCardPools({ cards: cardRecord(broken) }),
    /missing color metadata/,
  );
});

test('validation requires exactly four starter cards for each base color', () => {
  const pools = buildBaseGameCardPools({ cards: cardRecord(baseCards.filter(card => card.id !== '0-0')) });
  assert.throws(() => validateBaseGameCardPools(pools), /Expected 4 base-game starter cards for Yellow, found 3/);
});

test('market card counts follow the moon staff position by round', () => {
  const items = ['i1', 'i2', 'i3', 'i4', 'i5', 'i6'];
  const artifacts = ['a1', 'a2', 'a3', 'a4', 'a5'];
  for (let round = 1; round <= 5; round += 1) {
    const market = dealMarketForRound(round, items, artifacts);
    assert.equal(market.artifacts.length, round);
    assert.equal(market.items.length, 6 - round);
  }
});

test('prepareBaseGameSetup is deterministic for the same seed', () => {
  const first = prepareBaseGameSetup(context, 2, 'room-42');
  const second = prepareBaseGameSetup(context, 2, 'room-42');
  assert.deepEqual(first, second);
  assert.equal(first.market.items.length, 5);
  assert.equal(first.market.artifacts.length, 1);
  assert.equal(first.playerDecks[0].hand.length, 5);
  assert.equal(first.playerDecks[0].deck.length, 1);
  assert.equal(first.playerDecks[0].color, 'Yellow');
  assert.equal(first.playerDecks[1].color, 'Green');
});

test('different seeds produce a different shuffled setup', () => {
  const first = prepareBaseGameSetup(context, 2, 'room-42');
  const second = prepareBaseGameSetup(context, 2, 'room-43');
  assert.notDeepEqual(first, second);
});
