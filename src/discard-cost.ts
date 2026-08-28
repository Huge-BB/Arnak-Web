import type { CardId, GameState, PlayerId } from './types.ts';

/**
 * Arnak's printed "discard a card" payments use a card from the player's hand.
 * On the table that card joins the used/play area for the rest of the round;
 * it is deliberately not a second, independently usable discard zone.
 */
export function payDiscardedHandCard(
  state: GameState,
  playerId: PlayerId,
  required: number | undefined,
  cardId: CardId | undefined,
  label: string,
) {
  if (!required) {
    if (cardId) throw new Error(`${label} does not require a discarded card`);
    return;
  }
  if (required !== 1 || !cardId) throw new Error(`${label} requires one discarded hand card`);
  const player = state.players[playerId];
  if (!player) throw new Error(`Unknown player: ${playerId}`);
  const index = player.hand.indexOf(cardId);
  if (index < 0) throw new Error(`${label} discard card is not in hand`);
  player.hand.splice(index, 1);
  player.playedCards.push(cardId);
}
