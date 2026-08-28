import { temporaryTravelFor } from './action-window.ts';
import { hasTravelCost, planTravelPayment } from './travel.ts';
import type { CardId, EngineContext, GameState, PlayerId, TravelIcon } from './types.ts';

const ICONS:TravelIcon[]=['boot','car','boat','plane'];

/** Pay a travel cost using cards plus travel icons produced earlier in the current action window. */
export function payTravel(state:GameState,playerId:PlayerId,cost:Partial<Record<TravelIcon,number>>,cardIds:CardId[],context:EngineContext,label='Travel'){
  const player=state.players[playerId];if(!player)throw new Error(`Unknown player: ${playerId}`);
  if(!hasTravelCost(cost)){if(cardIds.length)throw new Error(`${label} does not require travel payment`);return;}
  if(new Set(cardIds).size!==cardIds.length)throw new Error(`${label} payment contains duplicate cards`);
  for(const cardId of cardIds)if(!player.hand.includes(cardId))throw new Error(`${label} card is not in hand: ${cardId}`);
  const temporary=temporaryTravelFor(state,playerId),temporaryUsed=planTravelPayment(cost,cardIds,context,temporary,{allIconsArePlanes:player.allTravelIconsArePlanesThisRound===true});
  if(!temporaryUsed)throw new Error(label==='Site travel'?'Travel payment does not satisfy site cost':`${label} payment does not satisfy cost`);
  for(const cardId of cardIds){player.hand.splice(player.hand.indexOf(cardId),1);player.playedCards.push(cardId);}
  if(state.actionWindow?.playerId===playerId)for(const icon of ICONS){const used=temporaryUsed[icon]??0;if(used)state.actionWindow.temporaryTravel[icon]=(state.actionWindow.temporaryTravel[icon]??0)-used;}
}
