import type { EngineCommand } from './engine-api.ts';
import type { EngineContext, GameAction, GameState } from './types.ts';

const REVEAL_EFFECTS = /DRAW_CARD|DRAW_FROM_BOTTOM|DRAW_BOTTOM_THEN_KEEP|DRAW_THEN_KEEP_AND_OPTIONAL_TOP|DRAW_TOP_PROCESS|ACTIVATE_TOP_SITE_DECK/;

function cardReveals(cardId: string, context: EngineContext) {
  return REVEAL_EFFECTS.test(JSON.stringify(context.cardEffects?.[cardId] ?? []));
}

/** Actions that expose information a player could exploit after an undo. */
export function actionRevealsHiddenInformation(state: GameState, action: GameAction, context: EngineContext): boolean {
  if (action.type === 'DISCOVER_SITE') return true;
  if (action.type === 'PLAY_CARD') return cardReveals(action.cardId, context);
  if (action.type === 'ACTIVATE_ASSISTANT') {
    const assistant=state.players[action.playerId]?.assistants.find(entry=>entry.id===action.assistantId);
    return REVEAL_EFFECTS.test(JSON.stringify(assistant ? context.assistantEffects?.[assistant.id]?.[assistant.level] : undefined));
  }
  if (action.type === 'USE_IDOL' && action.effect === 'draw') return true;
  if (action.type === 'LEADER_USE_IDOL' && action.effect === 'draw') return true;
  if (action.type === 'ADVANCE_RESEARCH') {
    const track=context.researchTracks?.[state.research.board];
    const node=track?.rows.flatMap(row=>row.nodes??[]).find(entry=>entry.id===action.toNodeId);
    return REVEAL_EFFECTS.test(JSON.stringify(node?.rewards ?? []));
  }
  return false;
}

export function commandRevealsHiddenInformation(state: GameState, command: EngineCommand, context: EngineContext): boolean {
  if (command.type === 'action') return actionRevealsHiddenInformation(state, command.action, context);
  const pending=state.pendingRewards[command.pendingIndex];
  return REVEAL_EFFECTS.test(JSON.stringify(pending?.payload ?? pending?.code ?? ''));
}
