import type { CardDefinition, CardId, EngineContext, MarketState, PlayerColor } from './types.ts';
import { shuffleWithSeed } from './rng.ts';

export interface BaseGameCardPools {
  items: CardId[];
  artifacts: CardId[];
  startersByColor: Record<string, CardId[]>;
  fear: CardId[];
}

export interface BaseGameSetup {
  market: MarketState;
  playerDecks: { color: PlayerColor; hand: CardId[]; deck: CardId[] }[];
}

const BASE_COLORS: PlayerColor[] = ['Yellow', 'Green', 'Blue', 'Red'];

/** These are dealt by the selected Leader board, never shuffled into market. */
export const LEADER_STARTING_CARD_NAMES = new Set([
  'Funding', 'Piloting', 'Transmission', 'Hidden Fear',
  'Connections', 'Research Notes', 'Resourcefulness', 'Special Delivery',
  'Preservation', 'Arnakology', 'Linguistics',
  'Hike', 'Cartography', 'Scouting',
  'Falconry', 'Animal Bond', 'Tracking',
  'Divine Guidance', 'Meditation', 'Worldly Goods', 'Blindsight',
]);

export function buildBaseGameCardPools(context: EngineContext, marketExpansions:readonly string[]=['Base Game']): BaseGameCardPools {
  const items: CardId[] = [];
  const artifacts: CardId[] = [];
  const startersByColor: Record<string, CardId[]> = {};
  const fear: CardId[] = [];

  for (const card of Object.values(context.cards)) {
    const isBaseStarter=card.expansion==='Base Game'&&card.type==='Starter';
    // Expedition Leaders contains both a regular market module and leader
    // starting cards. Only the named starting cards are excluded here.
    const isLeaderStartingCard=card.expansion==='Expedition Leaders'&&LEADER_STARTING_CARD_NAMES.has(card.name);
    const isSharedMarket=!isLeaderStartingCard&&marketExpansions.includes(card.expansion)&&(card.type==='Item'||card.type==='Artifact');
    const isBaseFear=card.expansion==='Base Game'&&card.type==='Fear';
    if (!isBaseStarter&&!isSharedMarket&&!isBaseFear) continue;

    switch (card.type) {
      case 'Item': items.push(card.id); break;
      case 'Artifact': artifacts.push(card.id); break;
      case 'Fear': fear.push(card.id); break;
      case 'Starter': {
        if (!card.color) throw new Error(`Base-game starter ${card.id} is missing color metadata`);
        (startersByColor[card.color] ??= []).push(card.id);
        break;
      }
    }
  }

  items.sort();
  artifacts.sort();
  fear.sort();
  for (const cards of Object.values(startersByColor)) cards.sort();
  return { items, artifacts, startersByColor, fear };
}

export function validateBaseGameCardPools(pools: BaseGameCardPools) {
  if (pools.items.length < 5) throw new Error(`Expected at least 5 base-game item cards, found ${pools.items.length}`);
  if (pools.artifacts.length < 1) throw new Error('No base-game artifact cards found');
  if (pools.fear.length === 0) throw new Error('No base-game fear card found');

  for (const color of BASE_COLORS) {
    const starters = pools.startersByColor[color] ?? [];
    if (starters.length !== 4) throw new Error(`Expected 4 base-game starter cards for ${color}, found ${starters.length}`);
  }
}

export function dealMarketForRound(round: number, itemDeck: CardId[], artifactDeck: CardId[]): MarketState {
  if (!Number.isInteger(round) || round < 1 || round > 5) throw new Error('Round must be between 1 and 5');

  const remainingItems = [...itemDeck];
  const remainingArtifacts = [...artifactDeck];
  const artifactCount = round;
  const itemCount = 6 - round;

  return {
    artifacts: remainingArtifacts.splice(0, artifactCount),
    items: remainingItems.splice(0, itemCount),
    artifactDeck: remainingArtifacts,
    itemDeck: remainingItems,
    exiled: [],
  };
}

export function prepareBaseGameSetup(context: EngineContext, playerCount: number, seed: string, marketExpansions:readonly string[]=['Base Game']): BaseGameSetup {
  if (!Number.isInteger(playerCount) || playerCount < 1 || playerCount > 4) throw new Error('Arnak supports 1-4 players');

  const pools = buildBaseGameCardPools(context, marketExpansions);
  validateBaseGameCardPools(pools);

  const itemDeck = shuffleWithSeed(pools.items, `${seed}:items`);
  const artifactDeck = shuffleWithSeed(pools.artifacts, `${seed}:artifacts`);
  const market = dealMarketForRound(1, itemDeck, artifactDeck);
  const fearId = pools.fear[0];

  const playerDecks = BASE_COLORS.slice(0, playerCount).map((color, index) => {
    const sixCards = [...pools.startersByColor[color], fearId, fearId];
    const shuffled = shuffleWithSeed(sixCards, `${seed}:player:${index}`);
    return { color, hand: shuffled.slice(0, 5), deck: shuffled.slice(5) };
  });

  return { market, playerDecks };
}

export function cardRecord(cards: CardDefinition[]): EngineContext['cards'] {
  return Object.fromEntries(cards.map(card => [card.id, card]));
}
