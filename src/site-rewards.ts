import type { CardEffect, EngineContext, GameState, PlayerId, Resource } from './types.ts';

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
  state.players[playerId].discard.push(fear.id);
}

function queueSiteEffect(state: GameState, playerId: PlayerId, sourceId: string, code: string, effect: CardEffect) {
  state.pendingRewards.push({
    playerId,
    sourceId,
    code: 'card:RESOLVE_EFFECT',
    payload: { type: 'CARD_EFFECT', sourceCardId: sourceId, effect },
  });
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
    } else if (code === 'i' || code === 'v') {
      // Both printed icons grant a free normal Item purchase: select a visible
      // Item, pay no coins, and use the ordinary Item purchase destination.
      queueSiteEffect(state, playerId, sourceId, 'BUY_ITEM_FREE', { type: 'BUY_ITEM', discount: 99 });
    } else if (code === 'u') {
      queueSiteEffect(state, playerId, sourceId, 'UPGRADE_RESOURCE', { type: 'UPGRADE_RESOURCE_THEN', effects: [] });
    } else if (code === 'm') {
      queueSiteEffect(state, playerId, sourceId, 'ACTIVATE_CAMP', { type: 'ACTIVATE_TENT_SITE', requireEmpty: false });
    } else if (code === 'b') {
      queueSiteEffect(state, playerId, sourceId, 'RETURN_SLOTTED_IDOL', { type: 'RETURN_SLOTTED_IDOL' });
    } else {
      state.pendingRewards.push({ playerId, sourceId, code });
    }
  }
}

export function addGuardianFear(state: GameState, playerId: PlayerId, context: EngineContext) {
  gainFearCard(state, playerId, context);
}
