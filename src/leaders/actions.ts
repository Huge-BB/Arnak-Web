import { grantTemporaryTravel } from '../action-window.ts';
import { applyCardEffects, getCardEffects } from '../effects.ts';
import { resolveRewardCode } from '../site-rewards.ts';
import type { CardId, EngineContext, GameState, PlayerId } from '../types.ts';

function requireLeader(state: GameState, playerId: PlayerId, id: string) {
  const player = state.players[playerId];
  if (!player) throw new Error(`Unknown player: ${playerId}`);
  const leader = player.leader;
  if (leader?.id !== id) throw new Error(`${playerId} is not using leader ${id}`);
  return { player, leader };
}

export function captainCallSpecialist(state: GameState, playerId: PlayerId, stackIndex: number): GameState {
  const next=structuredClone(state); const {player,leader}=requireLeader(next,playerId,'captain');
  if(leader.data.specialistUsedThisRound)throw new Error('Captain specialist has already been used this round'); if(player.availableWorkers<1)throw new Error('Captain has no available archaeologist for specialist');
  if(!Number.isInteger(stackIndex)||stackIndex<0||stackIndex>=next.assistants.stacks.length)throw new Error(`Invalid assistant stack: ${stackIndex}`); const assistantId=next.assistants.stacks[stackIndex]?.[0]; if(!assistantId)throw new Error(`Assistant stack is empty: ${stackIndex}`);
  player.availableWorkers-=1;leader.data.specialistUsedThisRound=true;leader.data.specialistWorkerCommitted=true;next.pendingRewards.push({playerId,sourceId:'leader:captain:specialist',code:'assistant:ACTIVATE_SILVER',payload:{type:'ACTIVATE_ASSISTANT_EFFECT',assistantId,level:'silver',fromSupply:true}});return next;
}
export function falconerAdvanceEagle(state:GameState,playerId:PlayerId,amount=1):GameState{if(!Number.isInteger(amount)||amount<0)throw new Error('Eagle advance must be a non-negative integer');const next=structuredClone(state);const {leader}=requireLeader(next,playerId,'falconer');leader.data.eaglePosition=Math.min(Number(leader.data.eagleMaxPosition??4),Number(leader.data.eaglePosition??0)+amount);return next;}
export function falconerReturnEagle(state:GameState,playerId:PlayerId,rewardPosition:number):GameState{
  const next=structuredClone(state);const {player,leader}=requireLeader(next,playerId,'falconer');const current=Number(leader.data.eaglePosition??0);
  if(!Number.isInteger(rewardPosition)||rewardPosition<1||rewardPosition>current)throw new Error(`Falconer cannot claim eagle reward ${rewardPosition} from position ${current}`);
  leader.data.eaglePosition=0;
  if(rewardPosition===1){player.resources.coin+=1;return next;}
  if(rewardPosition===2){player.resources.tablet+=1;return grantTemporaryTravel(next,playerId,{plane:1});}
  next.pendingRewards.push({playerId,sourceId:'leader:falconer:eagle',code:'leader:FALCONER_EAGLE_REWARD',payload:{rewardPosition,mainAction:true}});return next;
}

export function baronessPlaySpecialDelivery(state:GameState,playerId:PlayerId):GameState{
  const next=structuredClone(state); const {player,leader}=requireLeader(next,playerId,'baroness'); const cardId=leader.data.specialDeliveryCardId as CardId|undefined;
  if(!cardId)throw new Error('Baroness has no Special Delivery card'); const index=player.hand.indexOf(cardId); if(index<0)throw new Error('Special Delivery is not in hand');
  player.hand.splice(index,1); player.playedCards.push(cardId); leader.data.specialDeliveryArmed=true; return next;
}

export function professorBuyArchiveArtifact(state:GameState,playerId:PlayerId,cardId:CardId,context:EngineContext,suitcaseCompass=0):GameState{const next=structuredClone(state);const {player,leader}=requireLeader(next,playerId,'professor');const archive=(leader.data.archive??[]) as CardId[],index=archive.indexOf(cardId);if(index<0)throw new Error('Artifact is not in the Professor archive');const card=context.cards[cardId];if(!card||card.type!=='Artifact')throw new Error(`Unknown artifact: ${cardId}`);const cost=card.cost??0,suitcase=(leader.data.suitcase??{compass:0,tablet:0}) as {compass?:number;tablet?:number};if(!Number.isInteger(suitcaseCompass)||suitcaseCompass<0||suitcaseCompass>(suitcase.compass??0))throw new Error('Invalid Professor suitcase payment');if(suitcaseCompass>cost)throw new Error('Professor suitcase payment exceeds artifact cost');const generalCost=cost-suitcaseCompass;if(player.resources.compass<generalCost)throw new Error('Insufficient compass');suitcase.compass=(suitcase.compass??0)-suitcaseCompass;player.resources.compass-=generalCost;archive.splice(index,1);player.playedCards.push(cardId);applyCardEffects(next,playerId,getCardEffects(cardId,context),context,cardId);if(archive.length===0&&!leader.data.archiveRefilled){leader.data.archive=next.market.artifactDeck.splice(0,3);leader.data.archiveRefilled=true;suitcase.compass=(suitcase.compass??0)+1;}leader.data.suitcase=suitcase;return next;}

export type ExplorerSnackId='free'|'coin'|'compass';
function applyExplorerSnack(state:GameState,playerId:PlayerId,snackId:ExplorerSnackId,markedSiteId:string):GameState{
  const next=structuredClone(state);const {player,leader}=requireLeader(next,playerId,'explorer');const snacks=(leader.data.snacks??[]) as any[],snack=snacks.find(v=>v.id===snackId);
  if(!snack)throw new Error(`Unknown Explorer snack: ${snackId}`);if(next.round<snack.availableFromRound)throw new Error(`Explorer snack ${snackId} is not available until round ${snack.availableFromRound}`);if(snack.used)throw new Error(`Explorer snack ${snackId} has already been used this round`);
  for(const [resource,amount] of Object.entries(snack.cost??{})){const key=resource as keyof typeof player.resources;if(player.resources[key]<Number(amount))throw new Error(`Insufficient ${resource}`);player.resources[key]-=Number(amount);}snack.used=true;snack.siteId=markedSiteId;return next;
}
export function explorerSpendSnack(state:GameState,playerId:PlayerId,snackId:ExplorerSnackId,siteId:string):GameState{return applyExplorerSnack(state,playerId,snackId,siteId);}
export function explorerMoveArchaeologist(state:GameState,playerId:PlayerId,fromSiteId:string,toSiteId:string,snackId:ExplorerSnackId):GameState{
  const source=state.sites[fromSiteId],target=state.sites[toSiteId];if(!source)throw new Error(`Unknown Explorer source site: ${fromSiteId}`);if(!target)throw new Error(`Unknown Explorer destination site: ${toSiteId}`);if(fromSiteId===toSiteId)throw new Error('Explorer must move to a different site');if(source.occupiedBy!==playerId)throw new Error('Explorer source site does not contain your archaeologist');if(target.occupiedBy)throw new Error('Explorer destination site is occupied');
  const {leader}=requireLeader(state,playerId,'explorer');const snacks=(leader.data.snacks??[]) as any[];if(snacks.some(v=>v.used&&v.siteId===toSiteId))throw new Error('Explorer cannot return to a site marked by a snack token');
  const next=applyExplorerSnack(state,playerId,snackId,fromSiteId);delete next.sites[fromSiteId].occupiedBy;return next;
}
export function mysticMoveFearToRitualPile(state:GameState,playerId:PlayerId,fearCardId:CardId):GameState{const next=structuredClone(state);const {leader}=requireLeader(next,playerId,'mystic');const pile=(leader.data.ritualPile??=[]) as CardId[];pile.push(fearCardId);return next;}
export function mysticPerformRitual(state:GameState,playerId:PlayerId,fearCount:2|3|4):GameState{const next=structuredClone(state);const {player,leader}=requireLeader(next,playerId,'mystic');const pile=(leader.data.ritualPile??[]) as CardId[];if(pile.length<fearCount)throw new Error(`Mystic ritual requires ${fearCount} Fear cards`);pile.splice(0,fearCount);if(fearCount===2){player.resources.coin+=1;player.resources.compass+=1;}else if(fearCount===3){next.pendingRewards.push({playerId,sourceId:'leader:mystic:ritual',code:'leader:MYSTIC_BUY_ARTIFACT_DISCOUNT',payload:{discount:3}});}else{next.pendingRewards.push({playerId,sourceId:'leader:mystic:ritual',code:'leader:MYSTIC_OVERCOME_GUARDIAN_FREE',payload:{occupiedSiteOnly:true}});}return next;}
export function activateDiscoveredSiteForLeader(state:GameState,playerId:PlayerId,siteId:string,context:EngineContext):GameState{const next=structuredClone(state),site=next.sites[siteId];if(!site?.tileId)throw new Error(`Site is not discovered: ${siteId}`);const definition=context.sites?.[site.tileId];if(!definition)throw new Error(`Unknown site tile: ${site.tileId}`);resolveRewardCode(next,playerId,site.tileId,definition.rewardCode,context);return next;}
