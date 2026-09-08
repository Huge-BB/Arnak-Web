import { shuffleWithSeed } from './rng.ts';
import type { AssistantDefinition, AssistantSupplyState, PlayerAssistant, ResearchBoardId } from './types.ts';

export function buildBaseAssistantPool(assistants: Record<string, AssistantDefinition>, enabledExpansions: readonly string[] = ['Base Game']): string[] {
  const enabled = new Set(['Base Game', ...enabledExpansions]);
  const ids = Object.values(assistants)
    .filter(assistant => enabled.has(assistant.expansion))
    .map(assistant => assistant.id)
    .sort();
  const expected = enabled.has('Expedition Leaders') ? 15 : 12;
  if (ids.length !== expected) throw new Error(`Expected ${expected} enabled assistants, found ${ids.length}`);
  return ids;
}

function splitThreeStacksLikeTts(cards: string[]): string[][] {
  const stackCount = Math.floor(cards.length / 3 + 0.5);
  const first = cards.slice(0, stackCount);
  const second = cards.slice(stackCount, stackCount * 2);
  const third = cards.slice(stackCount * 2);
  if (first.length === 0 || second.length === 0 || third.length === 0) {
    throw new Error('Assistant supply cannot form three stacks');
  }
  return [first, second, third];
}

export function prepareAssistantSupply(
  assistants: Record<string, AssistantDefinition>,
  board: ResearchBoardId,
  playerCount: number,
  seed: string,
  enabledExpansions: readonly string[] = ['Base Game'],
): AssistantSupplyState {
  if (!Number.isInteger(playerCount) || playerCount < 1 || playerCount > 4) {
    throw new Error('Arnak supports 1-4 players');
  }

  const shuffled = shuffleWithSeed(buildBaseAssistantPool(assistants, enabledExpansions), `${seed}:assistants`);
  if (board === 'bird') {
    return { stacks: splitThreeStacksLikeTts(shuffled), specialStack: [] };
  }

  // Snake Temple removes one assistant per seated player into its special deck,
  // then the original mod cuts the remaining deck twice at round(remaining / 3).
  const specialStack = shuffled.slice(0, playerCount);
  const remaining = shuffled.slice(playerCount);
  return { stacks: splitThreeStacksLikeTts(remaining), specialStack };
}

export function availableAssistantIds(supply: AssistantSupplyState): string[] {
  return supply.stacks.flatMap(stack => stack.length > 0 ? [stack[0]] : []);
}

export function claimAssistantFromStack(
  supply: AssistantSupplyState,
  stackIndex: number,
): { supply: AssistantSupplyState; assistant: PlayerAssistant } {
  if (!Number.isInteger(stackIndex) || stackIndex < 0 || stackIndex >= supply.stacks.length) {
    throw new Error(`Invalid assistant stack: ${stackIndex}`);
  }
  const next = structuredClone(supply);
  const assistantId = next.stacks[stackIndex].shift();
  if (!assistantId) throw new Error(`Assistant stack ${stackIndex} is empty`);
  return {
    supply: next,
    assistant: { id: assistantId, level: 'silver', exhausted: false },
  };
}

export function upgradeAssistant(assistant: PlayerAssistant): PlayerAssistant {
  if (assistant.level === 'gold') throw new Error('Assistant is already gold');
  // A newly upgraded assistant is immediately ready, even if its silver side
  // had already been exhausted this round.
  return { ...assistant, level: 'gold', exhausted: false };
}

export function exhaustAssistant(assistant: PlayerAssistant): PlayerAssistant {
  if (assistant.exhausted) throw new Error('Assistant is already exhausted');
  return { ...assistant, exhausted: true };
}

export function refreshAssistant(assistant: PlayerAssistant): PlayerAssistant {
  return { ...assistant, exhausted: false };
}
