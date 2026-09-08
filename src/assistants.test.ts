import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import {
  availableAssistantIds,
  buildBaseAssistantPool,
  claimAssistantFromStack,
  exhaustAssistant,
  prepareAssistantSupply,
  refreshAssistant,
  upgradeAssistant,
} from './assistants.ts';
import type { AssistantDefinition } from './types.ts';

async function loadAssistants(): Promise<Record<string, AssistantDefinition>> {
  const raw = await readFile(new URL('./generated/assistants.json', import.meta.url), 'utf8');
  return JSON.parse(raw);
}

test('extracts twelve base-game and three Expedition Leaders assistants with silver and gold artwork', async () => {
  const assistants = await loadAssistants();
  const all = Object.values(assistants);
  assert.equal(all.length, 15);
  for (const assistant of all) {
    assert.ok(['Base Game', 'Expedition Leaders'].includes(assistant.expansion));
    assert.ok(assistant.image.silverUrl);
    assert.ok(assistant.image.goldUrl);
    assert.equal(assistant.image.uniqueBack, true);
    assert.ok(assistant.image.cardIndex >= 0);
    assert.ok(assistant.image.cardIndex < assistant.image.sheetWidth * assistant.image.sheetHeight);
  }
});

test('Expedition Leaders adds exactly its three assistants to the supply pool', async () => {
  const assistants = await loadAssistants();
  assert.equal(buildBaseAssistantPool(assistants).length, 12);
  const expanded = buildBaseAssistantPool(assistants, ['Base Game', 'Expedition Leaders']);
  assert.equal(expanded.length, 15);
  assert.deepEqual(expanded.filter(id => ['bd8dc7', '08d375', '97253a'].includes(id)).sort(), ['08d375', '97253a', 'bd8dc7']);

  const supply = prepareAssistantSupply(assistants, 'bird', 2, 'leaders-assistants', ['Base Game', 'Expedition Leaders']);
  assert.deepEqual(supply.stacks.map(stack => stack.length), [5, 5, 5]);
});

test('known base assistant GUID keeps its TTS sprite identity', async () => {
  const assistants = await loadAssistants();
  assert.equal(assistants['224d5d']?.image.cardIndex, 9);
  assert.equal(assistants['224d5d']?.image.sheetWidth, 4);
  assert.equal(assistants['224d5d']?.image.sheetHeight, 3);
});

test('Bird board creates three deterministic stacks of four assistants', async () => {
  const assistants = await loadAssistants();
  const first = prepareAssistantSupply(assistants, 'bird', 4, 'assistant-seed');
  const second = prepareAssistantSupply(assistants, 'bird', 4, 'assistant-seed');

  assert.deepEqual(first, second);
  assert.deepEqual(first.stacks.map(stack => stack.length), [4, 4, 4]);
  assert.deepEqual(first.specialStack, []);
  assert.equal(new Set(first.stacks.flat()).size, 12);
  assert.equal(availableAssistantIds(first).length, 3);
});

test('Snake board separates one special assistant per player before splitting the remainder', async () => {
  const assistants = await loadAssistants();
  const expectedStackSizes: Record<number, number[]> = {
    1: [4, 4, 3],
    2: [3, 3, 4],
    3: [3, 3, 3],
    4: [3, 3, 2],
  };

  for (const playerCount of [1, 2, 3, 4]) {
    const supply = prepareAssistantSupply(assistants, 'snake', playerCount, `snake-${playerCount}`);
    assert.equal(supply.specialStack.length, playerCount);
    assert.deepEqual(supply.stacks.map(stack => stack.length), expectedStackSizes[playerCount]);
    assert.equal(new Set([...supply.specialStack, ...supply.stacks.flat()]).size, 12);
    assert.equal(availableAssistantIds(supply).length, 3);
  }
});

test('claiming reveals the next assistant and creates a ready silver assistant', async () => {
  const assistants = await loadAssistants();
  const supply = prepareAssistantSupply(assistants, 'bird', 2, 'claim-seed');
  const originalTop = supply.stacks[1][0];
  const nextTop = supply.stacks[1][1];
  const claimed = claimAssistantFromStack(supply, 1);

  assert.deepEqual(claimed.assistant, { id: originalTop, level: 'silver', exhausted: false });
  assert.equal(claimed.supply.stacks[1][0], nextTop);
  assert.equal(supply.stacks[1][0], originalTop);
});

test('assistant lifecycle supports exhaust, refresh, and one silver-to-gold upgrade', () => {
  const silver = { id: 'assistant', level: 'silver' as const, exhausted: false };
  const exhausted = exhaustAssistant(silver);
  assert.equal(exhausted.exhausted, true);
  assert.equal(refreshAssistant(exhausted).exhausted, false);

  const gold = upgradeAssistant(exhausted);
  assert.equal(gold.level, 'gold');
  assert.equal(gold.exhausted, false);
  assert.throws(() => upgradeAssistant(gold), /already gold/);
  assert.throws(() => exhaustAssistant(exhausted), /already exhausted/);
});
