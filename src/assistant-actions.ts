import {
  claimAssistantFromStack,
  exhaustAssistant,
  refreshAssistant,
  upgradeAssistant,
} from './assistants.ts';
import { resolveAssistantEffect } from './assistant-effects.ts';
import type { EngineContext, GameState, PlayerAssistant, PlayerId } from './types.ts';

function requirePlayer(state: GameState, playerId: PlayerId) {
  const player = state.players[playerId];
  if (!player) throw new Error(`Unknown player: ${playerId}`);
  return player;
}

function requireCurrentPlayer(state: GameState, playerId: PlayerId) {
  if (state.phase !== 'playing') throw new Error('Game is not in progress');
  if (state.currentPlayer !== playerId) throw new Error(`It is not ${playerId}'s turn`);
  const player = requirePlayer(state, playerId);
  if (player.hasPassed) throw new Error(`${playerId} has already passed`);
  return player;
}

function findAssistant(playerAssistants: PlayerAssistant[], assistantId: string): number {
  const index = playerAssistants.findIndex(assistant => assistant.id === assistantId);
  if (index < 0) throw new Error(`Player does not own assistant: ${assistantId}`);
  return index;
}

export function claimAssistant(
  state: GameState,
  playerId: PlayerId,
  stackIndex: number,
): GameState {
  const next = structuredClone(state);
  const player = requireCurrentPlayer(next, playerId);
  const claimed = claimAssistantFromStack(next.assistants, stackIndex);
  next.assistants = claimed.supply;
  player.assistants.push(claimed.assistant);
  return next;
}

export function upgradeOwnedAssistant(
  state: GameState,
  playerId: PlayerId,
  assistantId: string,
): GameState {
  const next = structuredClone(state);
  const player = requireCurrentPlayer(next, playerId);
  const index = findAssistant(player.assistants, assistantId);
  player.assistants[index] = upgradeAssistant(player.assistants[index]);
  return next;
}

export function exhaustOwnedAssistant(
  state: GameState,
  playerId: PlayerId,
  assistantId: string,
): GameState {
  const next = structuredClone(state);
  const player = requireCurrentPlayer(next, playerId);
  const index = findAssistant(player.assistants, assistantId);
  player.assistants[index] = exhaustAssistant(player.assistants[index]);
  return next;
}

/** Exhaust an owned ready assistant and execute its level-specific effect. */
export function activateOwnedAssistant(
  state: GameState,
  playerId: PlayerId,
  assistantId: string,
  context: EngineContext,
): GameState {
  const next = structuredClone(state);
  const player = requireCurrentPlayer(next, playerId);
  const index = findAssistant(player.assistants, assistantId);
  const assistant = player.assistants[index];
  const effect = context.assistantEffects?.[assistant.id]?.[assistant.level];
  if (!effect) throw new Error(`No ${assistant.level} effect is defined for assistant: ${assistant.id}`);
  player.assistants[index] = exhaustAssistant(assistant);
  return resolveAssistantEffect(next, playerId, assistant.id, effect);
}

export function refreshOwnedAssistant(
  state: GameState,
  playerId: PlayerId,
  assistantId: string,
): GameState {
  const next = structuredClone(state);
  const player = requirePlayer(next, playerId);
  const index = findAssistant(player.assistants, assistantId);
  player.assistants[index] = refreshAssistant(player.assistants[index]);
  return next;
}
