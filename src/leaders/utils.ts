import type { CardId, EngineContext, GameState, PlayerId } from '../types.ts';
import type { LeaderId, LeaderState } from './types.ts';

// The source deck contains four physically different cards named Funding.
// Card names therefore are not sufficient to construct a leader's starter
// deck.  Keep the audited production identifiers here, alongside the other
// unique starter cards, so setup and the UI share one ownership definition.
const STARTER_CARD_IDS: Record<string, Record<string, CardId>> = {
  falconer: { Falconry: '1001', Tracking: '1002', Funding: '1003', 'Animal Bond': '1004' },
  explorer: { Scouting: '1005', Hike: '1006', Cartography: '1007', Funding: '1008' },
  professor: { Arnakology: '1009', Preservation: '1010', Linguistics: '1011', Funding: '1012' },
  mystic: { 'Divine Guidance': '1013', Blindsight: '1014', 'Worldly Goods': '1015', Meditation: '1016' },
  baroness: { 'Research Notes': '1017', Resourcefulness: '1018', 'Special Delivery': '1019', Connections: '1020' },
  captain: { Piloting: '1021', Transmission: '1022', Funding: '1023', 'Hidden Fear': '1024' },
};

export function leaderState(state: GameState, playerId: PlayerId): LeaderState | undefined {
  return (state.players[playerId] as typeof state.players[PlayerId] & { leader?: LeaderState }).leader;
}

export function setLeaderState(state: GameState, playerId: PlayerId, id: LeaderId, data: Record<string, unknown>) {
  const player = state.players[playerId] as typeof state.players[PlayerId] & { leader?: LeaderState };
  player.leader = { id, data };
}

export function resolveLeaderCard(context: EngineContext, name: string, leaderId?: LeaderId): CardId {
  const preferred = leaderId ? STARTER_CARD_IDS[leaderId]?.[name] : undefined;
  if (preferred && context.cards[preferred]) return preferred;
  const matches = Object.values(context.cards)
    .filter(card => card.expansion === 'Expedition Leaders' && card.name === name)
    .sort((left, right) => left.id.localeCompare(right.id));
  if (matches.length === 0) throw new Error(`Missing Expedition Leaders card named ${name}`);
  // The TTS save contains colour/print duplicates of the same starting card.
  // Card ids are definitions rather than physical instances in the web engine,
  // so select a deterministic canonical definition.
  return matches[0].id;
}

export function resolveLeaderCards(context: EngineContext, names: string[], leaderId?: LeaderId): CardId[] {
  return names.map(name => resolveLeaderCard(context, name, leaderId));
}

/** Whether a card is one of this player's own four leader starter cards. */
export function isLeaderStartingCard(context: EngineContext, leaderId: LeaderId | undefined, cardId: CardId): boolean {
  if (!leaderId) return false;
  const bindings = STARTER_CARD_IDS[leaderId] ?? {}, preferred = Object.values(bindings);
  if (preferred.every(id => Boolean(context.cards[id]))) return preferred.includes(cardId);
  // Test fixtures and future imports may not preserve TTS production ids. In
  // that fallback mode names are still safe because the fixture lacks the
  // competing physical printings that made Funding ambiguous in production.
  const card = context.cards[cardId];
  return Boolean(card && card.expansion === 'Expedition Leaders' && card.type === 'Starter' && Object.hasOwn(bindings, card.name));
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
