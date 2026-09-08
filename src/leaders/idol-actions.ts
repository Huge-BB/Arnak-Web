import { grantTemporaryTravel } from '../action-window.ts';
import type { CardId, EngineContext, GameState, LeaderId, PlayerId } from '../types.ts';
import { falconerAdvanceEagle } from './actions.ts';

export type IdolEffect =
  | 'coinToJewel' | 'arrowhead' | 'tablets' | 'coinCompass' | 'draw'
  | 'leaderUnique' | 'mysticExileArrowhead' | 'mysticExileRitual';
export type LeaderIdolActionTiming = 'free' | 'main';
interface SlotConfig { points:number; blue:boolean; fear?:boolean; }
const FOUR:SlotConfig[]=[{points:1,blue:false},{points:2,blue:false},{points:3,blue:true},{points:4,blue:true}];
const MYSTIC:SlotConfig[]=[{points:1,blue:false,fear:true},{points:2,blue:false},{points:2,blue:true,fear:true},{points:3,blue:true},{points:4,blue:true}];
export function idolSlotConfig(leaderId:LeaderId|undefined):SlotConfig[]{return leaderId==='mystic'?MYSTIC:FOUR;}
/** Printed lightning timing for leader idol effects.  Mystic's ritual branch is the sole main-action exception. */
export function leaderIdolActionTiming(leaderId:LeaderId,effect:IdolEffect):LeaderIdolActionTiming{return leaderId==='mystic'&&effect==='mysticExileRitual'?'main':'free';}
function fearCard(context:EngineContext){return Object.values(context.cards).find(card=>card.type==='Fear'&&card.expansion==='Base Game');}
function queueExile(next:GameState,playerId:PlayerId,source:string,payload:Record<string,unknown>={}){next.pendingRewards.push({playerId,sourceId:source,code:'leader:EXILE_OWN_CARD',payload:{max:1,freeAction:true,...payload}});}
function queueMysticRitual(next:GameState,playerId:PlayerId,source:string){next.pendingRewards.push({playerId,sourceId:source,code:'leader:MYSTIC_RITUAL_CHOICE',payload:{allowedFearCounts:[2,3,4],mainAction:true}});}
function resolveStandard(next:GameState,playerId:PlayerId,effect:IdolEffect){const p=next.players[playerId];switch(effect){case'coinToJewel':if(p.resources.coin<1)throw new Error('Idol jewel effect requires 1 coin');p.resources.coin-=1;p.resources.jewel+=1;return next;case'arrowhead':p.resources.arrowhead+=1;return next;case'tablets':p.resources.tablet+=2;return next;case'coinCompass':p.resources.coin+=1;p.resources.compass+=1;return next;case'draw':{const card=p.deck.shift();if(card)p.hand.push(card);return next;}default:return undefined;}}
function refreshExplorerSnack(next:GameState,playerId:PlayerId,snackId?:'free'|'coin'|'compass'){const leader=next.players[playerId].leader!;const snacks=(leader.data.snacks??[]) as Array<{id:string;used:boolean;siteId?:string}>;const used=snacks.filter(snack=>snack.used);if(!used.length)return;if(!snackId)throw new Error('Explorer unique idol effect requires a used snack choice');const snack=used.find(candidate=>candidate.id===snackId);if(!snack)throw new Error('Chosen Explorer snack is not currently used');snack.used=false;delete snack.siteId;}
function professorUniqueIdolReward(next:GameState,playerId:PlayerId){const player=next.players[playerId],leader=player.leader!;const suitcase=(leader.data.suitcase??={compass:0,tablet:0}) as {compass:number;tablet:number};player.resources.coin+=1;suitcase.compass=(suitcase.compass??0)+1;next.pendingRewards.push({playerId,sourceId:'leader:professor:idol',code:'leader:UPGRADE_RESOURCE',payload:{allowedResources:['tablet','arrowhead']}});return next;}
/** Resolve an idol effect printed on a leader board without placing an idol.
 * This is used by cards such as Idol Research.  Effects that need an extra
 * target retain their normal pending/validation behaviour. */
export function resolveLeaderPrintedIdolEffect(state:GameState,playerId:PlayerId,effect:IdolEffect,context:EngineContext,options:{snackId?:'free'|'coin'|'compass'}={}):GameState{
 const next=structuredClone(state),player=next.players[playerId],leader=player?.leader;if(!player||!leader)throw new Error('Printed leader idol effect requires an Expedition Leader');
 const standard=resolveStandard(next,playerId,effect);if(standard)return standard;
 switch(leader.id){
  case'captain':if(effect==='leaderUnique'){player.resources.compass+=1;return grantTemporaryTravel(next,playerId,{plane:1});}break;
  case'falconer':if(effect==='leaderUnique'){player.resources.compass+=1;return falconerAdvanceEagle(next,playerId,1);}break;
  case'baroness':if(effect==='leaderUnique'){player.resources.coin+=1;const card=player.deck.shift();if(card)player.hand.push(card);return next;}break;
  case'professor':if(effect==='leaderUnique')return professorUniqueIdolReward(next,playerId);
  case'explorer':if(effect==='leaderUnique'){player.resources.compass+=1;player.resources.coin+=1;refreshExplorerSnack(next,playerId,options.snackId);return grantTemporaryTravel(next,playerId,{boot:1});}break;
  case'mystic':if(effect==='mysticExileArrowhead'){player.resources.arrowhead+=1;queueExile(next,playerId,'card:idol-research');return next;}if(effect==='mysticExileRitual'){queueMysticRitual(next,playerId,'card:idol-research');return next;}break;
 }
 throw new Error(`Unsupported printed leader idol effect for ${leader.id}: ${effect}`);
}
export function useLeaderIdol(state:GameState,playerId:PlayerId,idolId:CardId,slotIndex:number,effect:IdolEffect,context:EngineContext,options:{snackId?:'free'|'coin'|'compass';ritualFearCount?:2|3|4}={}):GameState{
 const next=structuredClone(state),player=next.players[playerId];if(!player)throw new Error(`Unknown player: ${playerId}`);const leader=player.leader;if(!leader)throw new Error('Expedition Leader idol action requires a leader');
 const slots=idolSlotConfig(leader.id);if(!Number.isInteger(slotIndex)||slotIndex<0||slotIndex>=slots.length)throw new Error(`Invalid idol slot: ${slotIndex}`);if(player.idols.some(idol=>idol.inSlot&&(idol as any).slotIndex===slotIndex))throw new Error('Idol slot is already occupied');const idol=player.idols.find(candidate=>candidate.id===idolId&&!candidate.inSlot);if(!idol)throw new Error('Unused idol is not owned by player');
 const slot=slots[slotIndex];if((effect==='leaderUnique'||effect==='mysticExileArrowhead'||effect==='mysticExileRitual')&&!slot.blue)throw new Error('Unique idol effect requires a blue slot');idol.inSlot=true;(idol as any).slotIndex=slotIndex;
 if(leader.id==='mystic'&&slot.fear){const fear=fearCard(context);if(fear)player.playedCards.push(fear.id);}
 const standard=resolveStandard(next,playerId,effect);if(standard)return standard;
 switch(leader.id){
  case'captain':if(effect!=='leaderUnique')break;player.resources.compass+=1;return grantTemporaryTravel(next,playerId,{plane:1});
  case'falconer':if(effect!=='leaderUnique')break;player.resources.compass+=1;return falconerAdvanceEagle(next,playerId,1);
  case'baroness':if(effect!=='leaderUnique')break;player.resources.coin+=1;{const card=player.deck.shift();if(card)player.hand.push(card);}return next;
  case'professor':if(effect!=='leaderUnique')break;return professorUniqueIdolReward(next,playerId);
  case'explorer':if(effect!=='leaderUnique')break;player.resources.compass+=1;player.resources.coin+=1;refreshExplorerSnack(next,playerId,options.snackId);return grantTemporaryTravel(next,playerId,{boot:1});
  case'mystic':{
   if(effect==='leaderUnique')throw new Error('Mystic unique idol effect requires an explicit branch');
   if(effect==='mysticExileArrowhead'){player.resources.arrowhead+=1;queueExile(next,playerId,'leader:mystic:idol');return next;}
   if(effect==='mysticExileRitual'){queueMysticRitual(next,playerId,'leader:mystic:idol');return next;}
   break;
  }
 }
 throw new Error(`Unsupported idol effect for ${leader.id}: ${effect}`);
}
