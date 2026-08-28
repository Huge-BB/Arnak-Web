import type { CardId, EngineContext, GameState, PlayerId } from '../types.ts';
import type { LeaderId, LeaderState } from './types.ts';

export function leaderState(state: GameState, playerId: PlayerId): LeaderState | undefined {
  return (state.players[playerId] as typeof state.players[PlayerId] & { leader?: LeaderState }).leader;
}

export function setLeaderState(state: GameState, playerId: PlayerId, id: LeaderId, data: Record<string, unknown>) {
  const player = state.players[playerId] as typeof state.players[PlayerId] & { leader?: LeaderState };
  player.leader = { id, data };
}

export function resolveLeaderCard(context: EngineContext, name: string): CardId {
  const matches = Object.values(context.cards)
    .filter(card => card.expansion === 'Expedition Leaders' && card.name === name)
    .sort((left, right) => left.id.localeCompare(right.id));
  if (matches.length === 0) throw new Error(`Missing Expedition Leaders card named ${name}`);
  // The TTS save contains colour/print duplicates of the same starting card.
  // Card ids are definitions rather than physical instances in the web engine,
  // so select a deterministic canonical definition.
  return matches[0].id;
}

export function resolveLeaderCards(context: EngineContext, names: string[]): CardId[] {
  return names.map(name => resolveLeaderCard(context, name));
}

export function findFearCardsInStartingDeck(state: GameState, playerId: PlayerId, context: EngineContext): CardId[] {
  const player = state.players[playerId];
  return [...player.hand, ...player.deck]
    .filter(id => context.cards[id]?.type === 'Fear')
    .slice(0, 2);
}

export function replaceStartingDeckWithLeaderCards(
  state: GameState,
  playerId: PlayerId,
  context: EngineContext,
  names: string[],
  seedShuffle: (values: CardId[], seed: string) => CardId[],
  seed: string,
) {
  const fear = findFearCardsInStartingDeck(state, playerId, context);
  if (fear.length !== 2) throw new Error(`Leader setup expected two Fear cards for ${playerId}`);
  const leaderCards = resolveLeaderCards(context, names);
  const cards = seedShuffle([...fear, ...leaderCards], `${seed}:leader:${playerId}`);
  const player = state.players[playerId];
  player.hand = cards.slice(0, 5);
  player.deck = cards.slice(5);
  player.discard = [];
  player.playedCards = [];
}
