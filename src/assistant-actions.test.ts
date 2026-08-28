import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import {
  claimAssistant,
  exhaustOwnedAssistant,
  refreshOwnedAssistant,
  upgradeOwnedAssistant,
} from './assistant-actions.ts';
import { createGame, reduce } from './engine.ts';
import type { AssistantDefinition, EngineContext } from './types.ts';

async function loadAssistants(): Promise<Record<string, AssistantDefinition>> {
  const raw = await readFile(new URL('./generated/assistants.json', import.meta.url), 'utf8');
  return JSON.parse(raw);
}

test('claiming an assistant moves the visible top card to the player atomically', async () => {
  const assistants = await loadAssistants();
  const context: EngineContext = { cards: {}, assistants };
  const state = reduce(createGame(['p1', 'p2']), { type: 'START_GAME', seed: 'assistant-action' }, context);
  const originalTop = state.assistants.stacks[0][0];
  const originalState = structuredClone(state);

  const next = claimAssistant(state, 'p1', 0);

  assert.equal(next.players.p1.assistants[0]?.id, originalTop);
  assert.equal(next.players.p1.assistants[0]?.level, 'silver');
  assert.equal(next.players.p1.assistants[0]?.exhausted, false);
  assert.notEqual(next.assistants.stacks[0][0], originalTop);
  assert.deepEqual(state, originalState);
});

test('assistant upgrade and exhaustion are restricted to the current player owner', async () => {
  const assistants = await loadAssistants();
  const context: EngineContext = { cards: {}, assistants };
  let state = reduce(createGame(['p1', 'p2']), { type: 'START_GAME', seed: 'assistant-owner' }, context);
  state = claimAssistant(state, 'p1', 0);
  const id = state.players.p1.assistants[0].id;

  const exhausted = exhaustOwnedAssistant(state, 'p1', id);
  assert.equal(exhausted.players.p1.assistants[0].exhausted, true);

  const upgraded = upgradeOwnedAssistant(exhausted, 'p1', id);
  assert.equal(upgraded.players.p1.assistants[0].level, 'gold');
  assert.equal(upgraded.players.p1.assistants[0].exhausted, true);

  assert.throws(() => upgradeOwnedAssistant(state, 'p2', id), /not p2's turn|does not own assistant/);
});

test('refresh can be used by round/reward logic without requiring current turn ownership', async () => {
  const assistants = await loadAssistants();
  const context: EngineContext = { cards: {}, assistants };
  let state = reduce(createGame(['p1', 'p2']), { type: 'START_GAME', seed: 'assistant-refresh' }, context);
  state = claimAssistant(state, 'p1', 0);
  const id = state.players.p1.assistants[0].id;
  state = exhaustOwnedAssistant(state, 'p1', id);

  state.currentPlayer = 'p2';
  const refreshed = refreshOwnedAssistant(state, 'p1', id);
  assert.equal(refreshed.players.p1.assistants[0].exhausted, false);
});
