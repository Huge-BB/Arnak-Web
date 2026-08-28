import { resolveResearchReward } from './research-rewards.ts';
import type { GameState, PlayerId, ResearchNodeId, ResearchReward, ResearchTrackDefinition } from './types.ts';
import { shuffleWithSeed } from './rng.ts';

/** The base game contains three copies of each of these six research bonus tiles. */
export const BASE_RESEARCH_BONUS_REWARDS: Record<string, ResearchReward> = {
  'base:compass': { type: 'GAIN_RESOURCE', resource: 'compass', amount: 1 },
  'base:coin': { type: 'GAIN_RESOURCE', resource: 'coin', amount: 1 },
  'base:tablet': { type: 'GAIN_RESOURCE', resource: 'tablet', amount: 1 },
  'base:draw': { type: 'DRAW_CARD', amount: 1 },
  // The printed exile symbol is optional and may target a card in hand or play area.
  'base:exile': { type: 'BONUS_TILE', slot: 'EXILE_OWN_CARD' },
  'base:upgrade': { type: 'BONUS_TILE', slot: 'UPGRADE_RESOURCE' },
};

export function baseResearchBonusTileDeck() {
  return Object.keys(BASE_RESEARCH_BONUS_REWARDS).flatMap(kind => [1, 2, 3].map(copy => `${kind}:${copy}`));
}

function minPlayers(node: { metadata?: Record<string, unknown> }) {
  const value = node.metadata?.bonusMinPlayers;
  return typeof value === 'number' && Number.isInteger(value) ? value : 1;
}
function slotMinimums(node: { metadata?: Record<string, unknown> }) {
  const values = node.metadata?.bonusSlotMinimums;
  if (Array.isArray(values) && values.every(value => typeof value === 'number' && Number.isInteger(value))) return values as number[];
  return [minPlayers(node)];
}

export function setupResearchBonusTiles(state: GameState, track: ResearchTrackDefinition, seed: string) {
  const deck = shuffleWithSeed(baseResearchBonusTileDeck(), `${seed}:research-bonus:${track.id}`);
  const slots = track.rows.flatMap(row => row.nodes ?? []).flatMap(node => node.metadata?.bonusSlot === true ? slotMinimums(node).filter(minimum => minimum <= state.playerOrder.length).map(() => node.id) : []);
  const templeCount = state.playerOrder.length;
  if (slots.length + templeCount > deck.length) throw new Error(`Research board ${track.id} needs too many bonus tiles`);
  state.research.bonusTiles = {};
  for (const nodeId of slots) (state.research.bonusTiles[nodeId] ??= []).push(deck.shift()!);
  state.research.templeBonusTiles = deck.splice(0, templeCount);
  state.research.claimedBonusTiles = [];
}

function rewardFor(tileId: string) {
  const kind = tileId.replace(/:\d+$/, '');
  const reward = BASE_RESEARCH_BONUS_REWARDS[kind];
  if (!reward) throw new Error(`Unknown research bonus tile: ${tileId}`);
  return reward;
}

export function claimResearchBonusAtNode(state: GameState, playerId: PlayerId, nodeId: ResearchNodeId, chosenTileId?: string) {
  const tiles = state.research.bonusTiles[nodeId];
  if (!tiles?.length) return;
  if (tiles.length > 1 && !chosenTileId) throw new Error('This research space has multiple bonus tiles; choose a tile explicitly');
  const tileId = chosenTileId ?? tiles[0];
  const index = tiles.indexOf(tileId);
  if (index < 0) throw new Error('Chosen research bonus tile is not on this space');
  tiles.splice(index, 1);
  if (!tiles.length) delete state.research.bonusTiles[nodeId];
  state.research.claimedBonusTiles.push(tileId);
  resolveResearchReward(state, playerId, `research-bonus:${nodeId}`, rewardFor(tileId));
}

/** Temple arrivals select one tile from their private face-down stack. */
export function claimTempleResearchBonus(state: GameState, playerId: PlayerId, tileId: string) {
  if (!state.research.templeArrivals.includes(playerId)) throw new Error('Only a player at the Lost Temple may claim a temple bonus');
  const index = state.research.templeBonusTiles.indexOf(tileId);
  if (index < 0) throw new Error('Temple bonus tile is not available');
  state.research.templeBonusTiles.splice(index, 1);
  state.research.claimedBonusTiles.push(tileId);
  resolveResearchReward(state, playerId, 'research-bonus:temple', rewardFor(tileId));
}
