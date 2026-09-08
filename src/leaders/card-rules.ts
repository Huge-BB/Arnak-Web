import { grantTemporaryTravel } from '../action-window.ts';
import type { CardId, EngineContext, GameState, PlayerId } from '../types.ts';
import { falconerAdvanceEagle } from './actions.ts';
import { explorerSpendSnackOnStartingCard } from './extra-actions.ts';

export type LeaderCardChoice =
  | 'coin'|'compass'|'tablets'|'exile'|'eagle'|'refreshAssistant'|'upgradeResource'|'suitcaseCompass'|'suitcaseTablet'
  | 'payCoinForPlanes'|'payCoinsForJewel'|'activateSite'|'activateFaceupIdol'|'draw';
function requirePlayer(state:GameState,playerId:PlayerId){const player=state.players[playerId];if(!player)throw new Error(`Unknown player: ${playerId}`);if(!player.leader)throw new Error(`${playerId} has no expedition leader`);return player;}
function requireCard(state:GameState,playerId:PlayerId,cardId:CardId,context:EngineContext){const player=requirePlayer(state,playerId);const card=context.cards[cardId];if(!card||card.expansion!=='Expedition Leaders')throw new Error(`Not an Expedition Leaders starting card: ${cardId}`);if(!player.hand.includes(cardId)&&!player.playedCards.includes(cardId))throw new Error('Leader card is not available to this player');return{player,card};}
function queue(next:GameState,playerId:PlayerId,source:string,code:string,payload:Record<string,unknown>={}){next.pendingRewards.push({playerId,sourceId:source,code,payload});}
function gain(next:GameState,playerId:PlayerId,resource:'coin'|'compass'|'tablet',amount=1){next.players[playerId].resources[resource]+=amount;}
function placedArchaeologists(state:GameState,playerId:PlayerId){return Object.values(state.sites).filter(site=>site.occupiedBy===playerId).length;}
function countPlayedType(state:GameState,playerId:PlayerId,context:EngineContext,type:'Item'|'Artifact'){return state.players[playerId].playedCards.filter(id=>context.cards[id]?.type===type).length;}
export function resolveLeaderStartingCard(state:GameState,playerId:PlayerId,cardId:CardId,choice:LeaderCardChoice,context:EngineContext,options:{snackId?:'free'|'coin'|'compass'}={}):GameState{
 const {player,card}=requireCard(state,playerId,cardId,context),next=structuredClone(state),leader=player.leader!.id,source=`leader-card:${card.name}`;
 switch(leader){
  case'captain':{
   if(card.name==='Funding'){if(choice!=='coin')throw new Error('Funding grants coin');gain(next,playerId,'coin');return next;}
   if(card.name==='Piloting'){if(choice==='compass'){gain(next,playerId,'compass');return next;}if(choice==='payCoinForPlanes'){if(next.players[playerId].resources.coin<1)throw new Error('Piloting requires 1 coin');next.players[playerId].resources.coin-=1;return grantTemporaryTravel(next,playerId,{plane:2});}throw new Error('Invalid Piloting choice');}
   if(card.name==='Transmission'){const placed=placedArchaeologists(next,playerId);if(placed<1)throw new Error('Transmission has no effect with zero placed archaeologists');if(choice==='coin'){gain(next,playerId,'coin');return next;}if(choice==='compass'&&placed>=2){gain(next,playerId,'compass');return next;}if(choice==='tablets'&&placed>=3){gain(next,playerId,'tablet');return next;}throw new Error('Transmission choice is not unlocked');}
   if(card.name==='Hidden Fear')throw new Error('Hidden Fear cannot be played for an effect');break;
  }
  case'falconer':{
   if(card.name==='Funding'){if(choice!=='coin')throw new Error('Funding grants coin');gain(next,playerId,'coin');return next;}
   if(card.name==='Falconry'){if(choice==='compass'){gain(next,playerId,'compass');return next;}if(choice==='eagle')return falconerAdvanceEagle(next,playerId,1);throw new Error('Invalid Falconry choice');}
   if(card.name==='Tracking'){if(choice!=='compass')throw new Error('Tracking grants compass');gain(next,playerId,'compass');next.players[playerId].leader!.data.trackingGuardianChoiceThisTurn=true;return next;}
   if(card.name==='Animal Bond'){const guardians=next.players[playerId].defeatedGuardians.length;if(choice==='coin'){gain(next,playerId,'coin');return next;}if(choice==='exile'&&guardians>=1){queue(next,playerId,source,'leader:EXILE_OWN_CARD',{max:1,freeAction:true});return next;}if(choice==='eagle'&&guardians>=3){gain(next,playerId,'coin');return falconerAdvanceEagle(next,playerId,1);}throw new Error('Animal Bond choice is not unlocked');}break;
  }
  case'baroness':{
   if(card.name==='Connections'){if(choice!=='coin')throw new Error('Connections grants coin');gain(next,playerId,'coin');queue(next,playerId,source,'leader:OPTIONAL_EXILE_FAR_LEFT_ITEM',{refill:true,freeAction:true});return next;}
   if(card.name==='Research Notes'){if(choice==='compass'){gain(next,playerId,'compass');return next;}if(choice==='payCoinsForJewel'){if(next.players[playerId].resources.coin<2)throw new Error('Research Notes requires 2 coins');next.players[playerId].resources.coin-=2;next.players[playerId].resources.jewel+=1;return next;}throw new Error('Invalid Research Notes choice');}
   if(card.name==='Resourcefulness'){const items=countPlayedType(next,playerId,context,'Item');if(choice==='coin'){gain(next,playerId,'coin');return next;}if(choice==='compass'&&items>=1){gain(next,playerId,'compass');return next;}if(choice==='refreshAssistant'&&items>=3){queue(next,playerId,source,'leader:REFRESH_OWN_ASSISTANT',{max:1,freeAction:true});return next;}throw new Error('Resourcefulness choice is not unlocked');}break;
  }
  case'professor':{
   if(card.name==='Funding'){if(choice!=='coin')throw new Error('Funding grants coin');gain(next,playerId,'coin');return next;}
   if(card.name==='Preservation'){if(choice==='compass'){gain(next,playerId,'compass');return next;}if(choice==='upgradeResource'){queue(next,playerId,source,'leader:UPGRADE_RESOURCE',{allowedResources:['tablet','arrowhead'],freeAction:true});return next;}throw new Error('Invalid Preservation choice');}
   if(card.name==='Arnakology'){if(choice!=='compass')throw new Error('Arnakology grants compass');gain(next,playerId,'compass');queue(next,playerId,source,'leader:OPTIONAL_SWAP_ARCHIVE_ARTIFACT',{freeAction:true});return next;}
   if(card.name==='Linguistics'){const artifacts=countPlayedType(next,playerId,context,'Artifact'),suitcase=(next.players[playerId].leader!.data.suitcase??={compass:0,tablet:0}) as {compass:number;tablet:number};if(choice==='coin'){gain(next,playerId,'coin');return next;}if(choice==='suitcaseCompass'&&artifacts>=1){suitcase.compass=(suitcase.compass??0)+1;return next;}if(choice==='suitcaseTablet'&&artifacts>=2){suitcase.tablet=(suitcase.tablet??0)+1;return next;}throw new Error('Linguistics choice is not unlocked');}break;
  }
  case'explorer':{
   if(card.name==='Funding'){if(choice!=='coin')throw new Error('Funding grants coin');gain(next,playerId,'coin');return next;}
   if(card.name==='Hike'){if(choice==='compass'){gain(next,playerId,'compass');return next;}if(choice==='activateSite'){if(!options.snackId)throw new Error('Hike requires a snack token');const spent=explorerSpendSnackOnStartingCard(next,playerId,options.snackId,cardId,context);queue(spent,playerId,source,'leader:ACTIVATE_TENT_SITE',{mainAction:true});return spent;}throw new Error('Invalid Hike choice');}
   if(card.name==='Cartography'){if(choice==='coin'){gain(next,playerId,'coin');return next;}if(choice==='activateFaceupIdol'){if(!options.snackId)throw new Error('Cartography requires a snack token');const spent=explorerSpendSnackOnStartingCard(next,playerId,options.snackId,cardId,context);gain(spent,playerId,'tablet');queue(spent,playerId,source,'leader:ACTIVATE_FACEUP_UNDISCOVERED_IDOL',{mainAction:true});return spent;}throw new Error('Invalid Cartography choice');}
   if(card.name==='Scouting'){if(choice!=='compass')throw new Error('Scouting grants compass');gain(next,playerId,'compass');next.players[playerId].leader!.data.scoutingSiteChoiceThisTurn=true;return next;}break;
  }
  case'mystic':{
   if(card.name==='Worldly Goods'){if(choice==='coin'){gain(next,playerId,'coin');return next;}if(choice==='draw'){const draw=next.players[playerId].deck.shift();if(draw)next.players[playerId].hand.push(draw);return next;}}
   if(card.name==='Divine Guidance'||card.name==='Meditation'){const base=card.name==='Divine Guidance'?'compass':'coin';if(choice===base){gain(next,playerId,base);return next;}if(choice==='exile'){queue(next,playerId,source,'leader:EXILE_OWN_CARD',{max:1,freeAction:true,mysticFearToRitual:true});return next;}}
   if(card.name==='Blindsight'&&choice==='compass'){gain(next,playerId,'compass');next.players[playerId].leader!.data.blindsightIdolExileThisTurn=true;return next;}throw new Error(`Invalid ${card.name} choice`);
  }
 }
 throw new Error(`Unsupported leader starting card: ${leader}/${card.name}`);
}
