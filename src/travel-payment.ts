import { temporaryTravelFor } from './action-window.ts';
import { hasTravelCost, planTravelPayment } from './travel.ts';
import type { CardId, EngineContext, GameState, PlayerId, TravelIcon } from './types.ts';

const ICONS:TravelIcon[]=['boot','car','boat','plane'];

/** Pay a travel cost using cards plus travel icons produced earlier in the current action window. */
export function payTravel(state:GameState,playerId:PlayerId,cost:Partial<Record<TravelIcon,number>>,cardIds:CardId[],context:EngineContext,label='Travel',temporarySelection?:Partial<Record<TravelIcon,number>>,hiredPlanes=0){
  const player=state.players[playerId];if(!player)throw new Error(`Unknown player: ${playerId}`);
  if(!Number.isInteger(hiredPlanes)||hiredPlanes<0)throw new Error('Invalid hired plane count');
  if(!hasTravelCost(cost)){if(cardIds.length||hiredPlanes)throw new Error(`${label} does not require travel payment`);return;}
  if(player.resources.coin<hiredPlanes*2)throw new Error('Insufficient coin to hire plane');
  // GameState currently stores a card's definition ID rather than a separate
  // physical-instance ID. A player may therefore hold several Fear cards
  // with the same ID; validate and consume them as a multiset.
  const required=new Map<CardId,number>();
  for(const cardId of cardIds)required.set(cardId,(required.get(cardId)??0)+1);
  for(const [cardId,count] of required)if(player.hand.filter((id)=>id===cardId).length<count)throw new Error(`${label} card is not in hand: ${cardId}`);
  const availableTemporary=temporaryTravelFor(state,playerId),selectedTemporary=temporarySelection===undefined?availableTemporary:temporarySelection;
  for(const icon of ICONS){const selected=selectedTemporary[icon]??0;if(!Number.isInteger(selected)||selected<0||selected>(availableTemporary[icon]??0))throw new Error(`Invalid selected temporary ${icon} travel`);}
  const temporary={...selectedTemporary,plane:(selectedTemporary.plane??0)+hiredPlanes};
  const temporaryUsed=planTravelPayment(cost,cardIds,context,temporary,{allIconsArePlanes:player.allTravelIconsArePlanesThisRound===true});
  if(!temporaryUsed)throw new Error(label==='Site travel'?'Travel payment does not satisfy site cost':`${label} payment does not satisfy cost`);
  // A submitted card must contribute to satisfying the route. This prevents
  // silently accepting an extra card after the printed cost is already paid.
  for(let index=0;index<cardIds.length;index++){
    const without=[...cardIds.slice(0,index),...cardIds.slice(index+1)];
    if(planTravelPayment(cost,without,context,temporary,{allIconsArePlanes:player.allTravelIconsArePlanesThisRound===true})!==undefined)throw new Error(`${label} payment contains an unnecessary card`);
  }
  const hiredUsed=Math.max(0,(temporaryUsed.plane??0)-(selectedTemporary.plane??0));
  if(hiredUsed!==hiredPlanes)throw new Error(`${label} payment contains an unnecessary hired plane`);
  for(const cardId of cardIds){player.hand.splice(player.hand.indexOf(cardId),1);player.playedCards.push(cardId);}
  player.resources.coin-=hiredPlanes*2;
  if(state.actionWindow?.playerId===playerId)for(const icon of ICONS){const used=icon==='plane'?Math.min(temporaryUsed[icon]??0,selectedTemporary.plane??0):temporaryUsed[icon]??0;if(used)state.actionWindow.temporaryTravel[icon]=(state.actionWindow.temporaryTravel[icon]??0)-used;}
}
