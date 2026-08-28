import type { GameState, PlayerId } from './types.ts';

/** Shared one-main-action-per-turn rule, including leader-only commands. */
export function assertMainActionAvailable(state:GameState,playerId:PlayerId){
  const player=state.players[playerId];
  if(!player)throw new Error(`Unknown player: ${playerId}`);
  if(player.mainActionUsed&&(player.extraMainActions??0)<1)throw new Error('Your main action has already been used this turn');
}

export function consumeMainAction(state:GameState,playerId:PlayerId){
  assertMainActionAvailable(state,playerId);
  const player=state.players[playerId];
  if(player.mainActionUsed){
    player.extraMainActions=(player.extraMainActions??0)-1;
    if(player.extraMainActions<1)delete player.extraMainActions;
  } else player.mainActionUsed=true;
}
