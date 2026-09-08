import type { EngineContext, GameState, PlayerId, ResearchNodeDefinition, ResearchReward, ResearchToken, Resource } from './types.ts';

function isGainResourceReward(reward: ResearchReward): reward is { type: 'GAIN_RESOURCE'; resource: Resource; amount: number } {
  return reward.type === 'GAIN_RESOURCE'
    && typeof reward.resource === 'string'
    && Number.isInteger(reward.amount)
    && Number(reward.amount) >= 0;
}

function enqueuePending(state: GameState, playerId: PlayerId, sourceId: string, reward: ResearchReward) {
  state.pendingRewards.push({
    playerId,
    sourceId,
    code: `research:${reward.type}`,
    payload: structuredClone(reward),
  });
}

function drawCards(state: GameState, playerId: PlayerId, amount: number) {
  if (!Number.isInteger(amount) || amount < 0) throw new Error('Draw amount must be a non-negative integer');
  const player = state.players[playerId];
  if (!player) throw new Error(`Unknown player: ${playerId}`);
  for (let i = 0; i < amount; i += 1) {
    const card = player.deck.shift();
    if (!card) break;
    player.hand.push(card);
  }
}

function gainFearCards(state: GameState, playerId: PlayerId, amount: number, context?: EngineContext) {
  if (!Number.isInteger(amount) || amount < 0) throw new Error('Fear amount must be a non-negative integer');
  if (!context) throw new Error('Card context is required to gain Fear cards');
  const fear = Object.values(context.cards).find(card => card.type === 'Fear' && card.expansion === 'Base Game');
  if (!fear) throw new Error('No base-game Fear card found');
  for (let i = 0; i < amount; i += 1) state.players[playerId].discard.push(fear.id);
}

function refreshAssistants(state: GameState, playerId: PlayerId, amount: number | 'all') {
  const player = state.players[playerId];
  if (!player) throw new Error(`Unknown player: ${playerId}`);
  if (amount === 'all') {
    for (const assistant of player.assistants) assistant.exhausted = false;
    return;
  }
  if (!Number.isInteger(amount) || Number(amount) < 0) throw new Error('Assistant refresh amount must be non-negative');
  let remaining = Number(amount);
  for (const assistant of player.assistants) {
    if (remaining === 0) break;
    if (assistant.exhausted) {
      assistant.exhausted = false;
      remaining -= 1;
    }
  }
}

export function resolveResearchReward(
  state: GameState,
  playerId: PlayerId,
  sourceId: string,
  reward: ResearchReward | undefined,
  context?: EngineContext,
) {
  if (!reward) return;
  if (isGainResourceReward(reward)) {
    const player = state.players[playerId];
    if (!player) throw new Error(`Unknown player: ${playerId}`);
    player.resources[reward.resource] += reward.amount;
    return;
  }
  if (reward.type === 'DRAW_CARD' && Number.isInteger(reward.amount) && Number(reward.amount) >= 0) {
    drawCards(state, playerId, Number(reward.amount));
    return;
  }
  if (reward.type === 'GAIN_FEAR_CARD') {
    gainFearCards(state, playerId, Number(reward.amount), context);
    return;
  }
  if (reward.type === 'REFRESH_ASSISTANTS') {
    if (reward.amount === 'all') refreshAssistants(state, playerId, reward.amount);
    else enqueuePending(state, playerId, sourceId, reward);
    return;
  }
  if (reward.type === 'SEQUENCE' && Array.isArray(reward.rewards)) {
    for (const child of reward.rewards) resolveResearchReward(state, playerId, sourceId, child, context);
    return;
  }
  enqueuePending(state, playerId, sourceId, reward);
}

export function resolveResearchRewards(
  state: GameState,
  playerId: PlayerId,
  sourceId: string,
  rewards: ResearchReward[] | undefined,
  context?: EngineContext,
) {
  for (const reward of rewards ?? []) resolveResearchReward(state, playerId, sourceId, reward, context);
}

export function resolveResearchNodeRewards(
  state: GameState,
  playerId: PlayerId,
  token: ResearchToken,
  node: ResearchNodeDefinition,
  context?: EngineContext,
) {
  for (const entry of node.rewards ?? []) {
    if (!entry.verified) continue;
    if (entry.token && entry.token !== token) continue;
    resolveResearchRewards(state, playerId, node.id, entry.rewards, context);
  }
}
