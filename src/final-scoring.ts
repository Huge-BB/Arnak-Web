import { researchScore } from './research.ts';
import { emptyIdolSlotScore, guardianScore, idolScore, templeTileScore } from './scoring.ts';
import type { CardId, EngineContext, GameState, PlayerId, PlayerState } from './types.ts';

export interface PlayerScoreBreakdown { playerId:PlayerId; research:number; templeTiles:number; idols:number; emptyIdolSlots:number; guardians:number; cards:number; total:number; }
export interface FinalScoreResult { scores:Record<PlayerId,PlayerScoreBreakdown>; rankedPlayerIds:PlayerId[]; winnerIds:PlayerId[]; }

function ownedCards(player:PlayerState):CardId[]{return [...player.hand,...player.deck,...player.discard,...player.playedCards];}
export function cardScore(player:PlayerState,context:EngineContext):number{return ownedCards(player).reduce((score,id)=>score+(context.cards[id]?.points??0),0);}
/** Fancy Tea Set's printed rule is active while owned; it need not be played. */
function winsTies(player:PlayerState,context:EngineContext){return ownedCards(player).some(id=>context.cards[id]?.expansion==='Surprise Shipment'&&context.cards[id]?.name==='Fancy Tea Set');}

/** Scores a finished game using only state that remains owned by each player. */
export function scoreFinishedGame(state:GameState,context:EngineContext):FinalScoreResult{
  if(state.phase!=='finished')throw new Error('Final scoring is available only after the game has finished');
  const track=context.researchTracks?.[state.research.board];
  if(!track)throw new Error(`Final scoring requires the selected research track: ${state.research.board}`);
  const scores=Object.fromEntries(state.playerOrder.map(playerId=>{
    const player=state.players[playerId];
    const research=researchScore(track,player.researchMagnifying,player.researchJournal,state.research.templeArrivalPoints[playerId]??0);
    const templeTiles=templeTileScore(player),idols=idolScore(player),emptyIdolSlots=emptyIdolSlotScore(player),guardians=guardianScore(player),cards=cardScore(player,context);
    return[playerId,{playerId,research,templeTiles,idols,emptyIdolSlots,guardians,cards,total:research+templeTiles+idols+emptyIdolSlots+guardians+cards}];
  })) as Record<PlayerId,PlayerScoreBreakdown>;
  const arrivalIndex=(playerId:PlayerId)=>{const index=state.research.templeArrivals.indexOf(playerId);return index<0?Number.POSITIVE_INFINITY:index;};
  const compare=(left:PlayerId,right:PlayerId)=>scores[right].total-scores[left].total||arrivalIndex(left)-arrivalIndex(right)||scores[right].research-scores[left].research||Number(winsTies(state.players[right],context))-Number(winsTies(state.players[left],context))||state.playerOrder.indexOf(left)-state.playerOrder.indexOf(right);
  const rankedPlayerIds=[...state.playerOrder].sort(compare),leader=rankedPlayerIds[0];
  const winnerIds=rankedPlayerIds.filter(playerId=>scores[playerId].total===scores[leader].total&&arrivalIndex(playerId)===arrivalIndex(leader)&&scores[playerId].research===scores[leader].research&&winsTies(state.players[playerId],context)===winsTies(state.players[leader],context));
  return{scores,rankedPlayerIds,winnerIds};
}
