import { reduceWithLeaders, type LeaderAwareGameAction } from './engine-with-leaders.ts';
import { resolvePendingChoice, type PendingChoice } from './pending-choice.ts';
import type { EngineContext, GameState, PlayerId } from './types.ts';

const INTERNAL_REDUCER_ACTIONS=new Set(['GAIN_RESOURCE','SPEND_RESOURCE','CLAIM_ASSISTANT','UPGRADE_ASSISTANT','EXHAUST_ASSISTANT','REFRESH_ASSISTANT']);

/**
 * Public command surface for the web/network layer.
 *
 * UI code should use this facade instead of importing reduce(),
 * reduceWithActionWindow(), reduceWithLeaders(), or specialized pending
 * resolvers directly. This keeps leader hooks, action-window travel, and
 * pending-choice ownership validation on every client-driven transition.
 */
export type EngineCommand =
  | { type:'action'; action:LeaderAwareGameAction }
  | { type:'pending-choice'; playerId:PlayerId; pendingIndex:number; choice:PendingChoice };

export function applyEngineCommand(
  state:GameState,
  command:EngineCommand,
  context:EngineContext,
):GameState {
  switch(command.type){
    case'action':
      if(INTERNAL_REDUCER_ACTIONS.has(command.action.type))throw new Error(`Internal reducer action cannot be dispatched through public API: ${command.action.type}`);
      return reduceWithLeaders(state,command.action,context);
    case'pending-choice':
      return resolvePendingChoice(state,command.playerId,command.pendingIndex,command.choice,context);
  }
}
