import type { ActionWindowState, GameState, PlayerId, TravelCost, TravelIcon } from './types.ts';

const ICONS: TravelIcon[] = ['boot','car','boat','plane'];

function windowFor(state:GameState,playerId:PlayerId):ActionWindowState {
  const current=state.actionWindow;
  if(current?.playerId===playerId)return current;
  const created:ActionWindowState={playerId,temporaryTravel:{}};
  state.actionWindow=created;
  return created;
}

/** Add travel icons as soon as an effect resolves. The source may be a main action or a free/quick action. */
export function grantTemporaryTravel(state:GameState,playerId:PlayerId,travel:TravelCost):GameState {
  const next=structuredClone(state),window=windowFor(next,playerId);
  for(const icon of ICONS){const amount=travel[icon]??0;if(!Number.isInteger(amount)||amount<0)throw new Error(`Invalid temporary ${icon} amount`);if(amount)window.temporaryTravel[icon]=(window.temporaryTravel[icon]??0)+amount;}
  return next;
}

/** Consume travel icons that were produced earlier in the same turn window. Any later action may consume them, including a main action. */
export function consumeTemporaryTravel(state:GameState,playerId:PlayerId,cost:TravelCost):GameState {
  const next=structuredClone(state),window=windowFor(next,playerId);
  for(const icon of ICONS){const need=cost[icon]??0;if(!Number.isInteger(need)||need<0)throw new Error(`Invalid temporary ${icon} cost`);if((window.temporaryTravel[icon]??0)<need)throw new Error(`Insufficient temporary ${icon}`);}
  for(const icon of ICONS){const need=cost[icon]??0;if(need)window.temporaryTravel[icon]=(window.temporaryTravel[icon]??0)-need;}
  return next;
}

export function clearActionWindow(state:GameState):GameState {
  const next=structuredClone(state);delete next.actionWindow;return next;
}

export function temporaryTravelFor(state:GameState,playerId:PlayerId):TravelCost {
  if(state.actionWindow?.playerId!==playerId)return {};
  return {...state.actionWindow.temporaryTravel};
}

/** Open a one-shot constrained window around one of the normal site actions.
 * The engine, not the card, still performs every placement/discovery check. */
export function beginForcedSiteAction(state:GameState,playerId:PlayerId,forced:NonNullable<ActionWindowState['forcedSiteAction']>):GameState {
  const next=structuredClone(state),window=windowFor(next,playerId);
  if(window.forcedSiteAction)throw new Error('A site action window is already pending');
  window.forcedSiteAction=structuredClone(forced);
  return next;
}
