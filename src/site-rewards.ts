import type { EngineContext, GameState, PlayerId, Resource } from './types.ts';

const RESOURCE_CODES: Record<string, Resource> = {
  c: 'coin',
  s: 'compass',
  t: 'tablet',
  a: 'arrowhead',
  j: 'jewel',
};

function drawCards(state: GameState, playerId: PlayerId, amount: number) {
  const player = state.players[playerId];
  for (let i = 0; i < amount && player.deck.length > 0; i += 1) {
    player.hand.push(player.deck.shift()!);
  }
}

function gainFearCard(state: GameState, playerId: PlayerId, context: EngineContext) {
  const fear = Object.values(context.cards).find(card => card.type === 'Fear' && card.expansion === 'Base Game');
  if (!fear) throw new Error('No base-game Fear card found');
  state.players[playerId].playedCards.push(fear.id);
}

export function resolveRewardCode(
  state: GameState,
  playerId: PlayerId,
  sourceId: string,
  rewardCode: string,
  context: EngineContext,
) {
  const player = state.players[playerId];
  if (!player) throw new Error(`Unknown player: ${playerId}`);

  for (const code of rewardCode) {
    const resource = RESOURCE_CODES[code];
    if (resource) {
      player.resources[resource] += 1;
    } else if (code === 'd') {
      drawCards(state, playerId, 1);
    } else if (code === 'f') {
      gainFearCard(state, playerId, context);
    } else {
      state.pendingRewards.push({ playerId, sourceId, code });
    }
  }
}

export function addGuardianFear(state: GameState, playerId: PlayerId, context: EngineContext) {
  gainFearCard(state, playerId, context);
}
