import { discountedSiteTravelCost, reduce } from './engine.ts';
import { payTravel } from './travel-payment.ts';
import { resolveBaseBoardPlacementSite } from './base-board-setup.ts';
import type { EngineContext, GameAction, GameState } from './types.ts';

type SiteAction=Extract<GameAction,{type:'PLACE_WORKER'|'DISCOVER_SITE'}>;

/** Core reducer facade that makes travel produced earlier in the current turn available to later actions. */
export function reduceWithActionWindow(state:GameState,action:GameAction,context:EngineContext):GameState{
  if(action.type==='PLACE_WORKER'||action.type==='DISCOVER_SITE'){
    const next=structuredClone(state);
    // A visual camp has one public ID but two physical spaces. Resolve before
    // this wrapper inspects travel, then forward the physical ID throughout.
    const siteId=action.type==='PLACE_WORKER'
      ? resolveBaseBoardPlacementSite(next.sites,action.siteId)
      : action.siteId;
    const site=next.sites[siteId];
    if(!site)throw new Error(`Unknown site: ${siteId}`);
    const cost=site.travelCost??{},discountedCost=discountedSiteTravelCost(next,action.playerId,cost);
    payTravel(next,action.playerId,discountedCost,action.paymentCardIds??[],context,'Site travel');
    // Core engine still owns worker/discovery resolution. Travel is already paid here.
    next.sites[siteId]={...site,travelCost:{}};
    const forwarded={...action,siteId,paymentCardIds:[]} as SiteAction;
    const resolved=reduce(next,forwarded,context);
    resolved.sites[siteId].travelCost=cost;
    return resolved;
  }
  const resolved=reduce(state,action,context);
  if(action.type==='END_TURN'||action.type==='PASS'||('playerId' in action&&state.players[action.playerId]?.hasPassed===false&&resolved.players[action.playerId]?.hasPassed===true))delete resolved.actionWindow;
  return resolved;
}
