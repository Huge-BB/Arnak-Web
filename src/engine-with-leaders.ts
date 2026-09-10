import { assertNoUnresolvedPendingChoice } from './engine.ts';
import { reduceWithActionWindow } from './engine-with-action-window.ts';
import { reduceExpeditionLeaderAction, type ExpeditionLeaderAction } from './leaders/reducer.ts';
import { assignedFaceUpIdol, clearAssignedSiteIdols, prepareAssignedSiteIdols } from './site-idols.ts';
import type { EngineContext, GameAction, GameState } from './types.ts';

type DiscoverAction=Extract<GameAction,{type:'DISCOVER_SITE'}>;
export type LeaderAwareDiscoverAction=DiscoverAction&{useScouting?:boolean;siteChoiceIndex?:0|1;useTracking?:boolean;guardianChoiceIndex?:0|1;useBlindsight?:boolean;};
export type LeaderAwareGameAction=Exclude<GameAction,DiscoverAction>|LeaderAwareDiscoverAction|ExpeditionLeaderAction;
function chooseTopTwo(deck:string[],choice:0|1,label:string){if(deck.length<2)throw new Error(`${label} requires at least two tiles in the stack`);const[first,second,...rest]=deck;const chosen=choice===0?first:second,other=choice===0?second:first;return[chosen,...rest,other];}
function contextWithoutIdolReward(context:EngineContext,idolId:string):EngineContext{const idol=context.idols?.[idolId];if(!idol)return context;return{...context,idols:{...context.idols,[idolId]:{...idol,rewardCode:''}}};}
function discoverWithAssignedIdols(state:GameState,action:DiscoverAction,context:EngineContext){const prepared=prepareAssignedSiteIdols(state,action.siteId);const resolved=reduceWithActionWindow(prepared,action,context);return clearAssignedSiteIdols(resolved,action.siteId);}

/** Canonical reducer facade when Expedition Leaders are enabled. */
export function reduceWithLeaders(state:GameState,action:LeaderAwareGameAction,context:EngineContext):GameState{
 if('playerId'in action)assertNoUnresolvedPendingChoice(state,action.playerId);
 if(action.type.startsWith('LEADER_'))return reduceExpeditionLeaderAction(state,action as ExpeditionLeaderAction,context);
 if(action.type!=='DISCOVER_SITE')return reduceWithActionWindow(state,action as GameAction,context);
 const next=structuredClone(state),player=next.players[action.playerId],leader=player?.leader;if(!player)throw new Error(`Unknown player: ${action.playerId}`);
 if(leader?.id==='explorer'&&leader.data.scoutingSiteChoiceThisTurn===true){if(action.useScouting){if(action.siteChoiceIndex!==0&&action.siteChoiceIndex!==1)throw new Error('Scouting requires siteChoiceIndex 0 or 1');const site=next.sites[action.siteId];if(!site)throw new Error(`Unknown site: ${action.siteId}`);const deck=site.level===1?next.discovery.level1Deck:next.discovery.level2Deck;const reordered=chooseTopTwo(deck,action.siteChoiceIndex,'Scouting');if(site.level===1)next.discovery.level1Deck=reordered;else next.discovery.level2Deck=reordered;}leader.data.scoutingSiteChoiceThisTurn=false;}
 if(leader?.id==='falconer'&&leader.data.trackingGuardianChoiceThisTurn===true){if(action.guardianChoiceIndex!==0&&action.guardianChoiceIndex!==1)throw new Error('Tracking requires choosing one of the top two guardians');next.discovery.guardianDeck=chooseTopTwo(next.discovery.guardianDeck,action.guardianChoiceIndex,'Tracking');leader.data.trackingGuardianChoiceThisTurn=false;}
 if(leader?.id==='mystic'&&leader.data.blindsightIdolExileThisTurn===true){leader.data.blindsightIdolExileThisTurn=false;if(action.useBlindsight){const idolId=assignedFaceUpIdol(next,action.siteId)??next.discovery.idolDeck[0];if(!idolId)throw new Error('Blindsight requires a face-up idol from discovery');const resolved=discoverWithAssignedIdols(next,action as DiscoverAction,contextWithoutIdolReward(context,idolId));resolved.pendingRewards.push({playerId:action.playerId,sourceId:'leader:mystic:Blindsight',code:'leader:EXILE_OWN_CARD',payload:{max:1,freeAction:true,replacesIdolEffect:true}});return resolved;}}
 return discoverWithAssignedIdols(next,action as DiscoverAction,context);
}
