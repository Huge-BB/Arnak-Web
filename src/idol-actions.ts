import type { CardId, GameState, PlayerId } from './types.ts';

/** The five printed effects on every base-game player board. */
export type BaseIdolEffect = 'coinToJewel' | 'tablets' | 'arrowhead' | 'coinCompass' | 'draw';
export const BASE_IDOL_SLOT_POINTS = [1, 2, 3, 4] as const;

/** Resolve a printed normal idol-slot effect without occupying a slot. */
export function resolveBaseIdolEffect(state: GameState, playerId: PlayerId, effect: BaseIdolEffect): GameState {
  const next = structuredClone(state), player = next.players[playerId];
  if (!player) throw new Error(`Unknown player: ${playerId}`);
  if (effect === 'coinToJewel' && player.resources.coin < 1) throw new Error('Idol jewel effect requires 1 coin');
  switch (effect) {
    case 'coinToJewel': player.resources.coin -= 1; player.resources.jewel += 1; break;
    case 'tablets': player.resources.tablet += 2; break;
    case 'arrowhead': player.resources.arrowhead += 1; break;
    case 'coinCompass': player.resources.coin += 1; player.resources.compass += 1; break;
    case 'draw': { const card = player.deck.shift(); if (card) player.hand.push(card); break; }
  }
  return next;
}

/**
 * Use an idol as the free action printed on a normal player board.
 * Unlike Expedition Leader boards, its slots must be filled from left to right.
 */
export function useBaseIdol(state: GameState, playerId: PlayerId, idolId: CardId, effect: BaseIdolEffect): GameState {
  const next = structuredClone(state);
  const player = next.players[playerId];
  if (!player) throw new Error(`Unknown player: ${playerId}`);
  if (player.leader) throw new Error('Base idol action is replaced by the Expedition Leader board');

  const slotIndex = BASE_IDOL_SLOT_POINTS.findIndex((_, index) => !player.idols.some(idol => idol.inSlot && idol.slotIndex === index));
  if (slotIndex < 0) throw new Error('No empty base idol slots remain');
  const idol = player.idols.find(candidate => candidate.id === idolId && !candidate.inSlot);
  if (!idol) throw new Error('Unused idol is not owned by player');

  idol.inSlot = true;
  idol.slotIndex = slotIndex;
  // Resolve after marking the slot, while retaining atomic validation.
  if (effect === 'coinToJewel' && player.resources.coin < 1) throw new Error('Idol jewel effect requires 1 coin');
  switch (effect) { case 'coinToJewel': player.resources.coin -= 1; player.resources.jewel += 1; break; case 'tablets': player.resources.tablet += 2; break; case 'arrowhead': player.resources.arrowhead += 1; break; case 'coinCompass': player.resources.coin += 1; player.resources.compass += 1; break; case 'draw': { const card = player.deck.shift(); if (card) player.hand.push(card); break; } }
  return next;
}
