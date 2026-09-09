import { shuffleWithSeed } from '../rng.ts';
import type { CardDefinition, CardId, EngineContext, GameState, PlayerId } from '../types.ts';
import { baronessLeader } from './baroness.ts';
import { captainLeader } from './captain.ts';
import { explorerLeader } from './explorer.ts';
import { falconerLeader } from './falconer.ts';
import { mysticLeader } from './mystic.ts';
import { professorLeader } from './professor.ts';
import type { LeaderId, LeaderRules } from './types.ts';
import { findFearCardsInStartingDeck, resolveLeaderCards } from './utils.ts';

const RULES: Record<string, LeaderRules> = Object.fromEntries([
  captainLeader, falconerLeader, baronessLeader, professorLeader, explorerLeader, mysticLeader,
].map(rule => [rule.id, rule]));

export const EXPEDITION_LEADER_IDS = Object.freeze(['captain','falconer','baroness','professor','explorer','mystic'] as const);
export function leaderRulesFor(id: LeaderId): LeaderRules { const rules=RULES[id]; if(!rules) throw new Error(`Unsupported expedition leader: ${id}`); return rules; }
function buildLeaderStartingDeck(state:GameState,playerId:PlayerId,rules:LeaderRules,context:EngineContext,seed:string){if(!rules.startingCardNames)return;const fear=findFearCardsInStartingDeck(state,playerId,context);if(fear.length!==2)throw new Error(`Leader setup expected two Fear cards for ${playerId}`);const leaderCards=resolveLeaderCards(context,rules.startingCardNames,rules.id),player=state.players[playerId];if(rules.id==='baroness'){const special=leaderCards.find(id=>context.cards[id]?.name==='Special Delivery');if(!special)throw new Error('Baroness setup requires Special Delivery');const rest=shuffleWithSeed([...fear,...leaderCards.filter(id=>id!==special)],`${seed}:leader:${playerId}`);player.hand=[special,...rest.slice(0,4)];player.deck=rest.slice(4);}else{const cards=shuffleWithSeed([...fear,...leaderCards],`${seed}:leader:${playerId}`);player.hand=cards.slice(0,5);player.deck=cards.slice(5);}player.discard=[];player.playedCards=[];}
export function setupLeader(state:GameState,playerId:PlayerId,id:LeaderId,context:EngineContext,seed:string){const rules=leaderRulesFor(id);buildLeaderStartingDeck(state,playerId,rules,context,seed);rules.setup({state,playerId,context,seed});}
export function runLeaderRoundStart(state:GameState,playerId:PlayerId,context:EngineContext){const leader=state.players[playerId].leader;if(!leader)return;leaderRulesFor(leader.id).onRoundStart?.({state,playerId,context,seed:state.setupSeed??'default',round:state.round});}
export function runLeaderRoundEnd(state:GameState,playerId:PlayerId,context:EngineContext){const leader=state.players[playerId].leader;if(!leader)return;leaderRulesFor(leader.id).onRoundEnd?.({state,playerId,context,seed:state.setupSeed??'default',round:state.round});}
/** Mystic's round income is a printed exception: it puts the Fear card in hand, not discard. */
export function addFearToHand(state:GameState,playerId:PlayerId,context:EngineContext):CardId|undefined{const fear=Object.values(context.cards).find(card=>card.type==='Fear'&&card.expansion==='Base Game');if(!fear)return undefined;state.players[playerId].hand.push(fear.id);return fear.id;}

export function leaderCardDestination(state:GameState,playerId:PlayerId,card:CardDefinition):'hand'|'deck'|'played'{
 const player=state.players[playerId];
 if(card.type==='Artifact')return'played';
 if(card.type==='Item'&&player.leader?.id==='baroness'&&player.leader.data.specialDeliveryArmed===true){
   player.leader.data.specialDeliveryArmed=false;
   return'hand';
 }
 return'deck';
}
