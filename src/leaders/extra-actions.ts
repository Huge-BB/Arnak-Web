import type { CardId, EngineContext, GameState, PlayerId } from '../types.ts';
import { falconerAdvanceEagle, explorerSpendSnack } from './actions.ts';

function requireLeader(state:GameState,playerId:PlayerId,id:string){
  const player=state.players[playerId]; if(!player)throw new Error(`Unknown player: ${playerId}`);
  if(player.leader?.id!==id)throw new Error(`${playerId} is not using leader ${id}`);
  return {player,leader:player.leader};
}

/** A defeated guardian boon can be spent once to advance the Falconer's eagle instead of resolving its printed boon. */
export function falconerUseGuardianBoonForFlight(state:GameState,playerId:PlayerId,guardianId:string):GameState{
  const {player,leader}=requireLeader(state,playerId,'falconer');
  if(!player.defeatedGuardians.includes(guardianId))throw new Error('Falconer does not own this guardian');
  const used=(leader.data.usedGuardianBoons??[]) as string[];
  if(used.includes(guardianId))throw new Error('Guardian boon has already been used');
  const next=falconerAdvanceEagle(state,playerId,1);
  const nextLeader=next.players[playerId].leader!;
  nextLeader.data.usedGuardianBoons=[...used,guardianId];
  return next;
}

function removeOne(zone:CardId[],cardId:CardId){const index=zone.indexOf(cardId);if(index>=0){zone.splice(index,1);return true;}return false;}

/** Mystic replacement rule: every exiled Fear card goes to the ritual pile instead of normal exile. */
export function mysticExileFear(state:GameState,playerId:PlayerId,fearCardId:CardId,context:EngineContext,source?:'hand'|'played'):GameState{
  const {player}=requireLeader(state,playerId,'mystic');
  const card=context.cards[fearCardId];
  if(!card||card.type!=='Fear')throw new Error('Mystic ritual pile accepts only Fear cards');
  const next=structuredClone(state); const p=next.players[playerId];
  const removed=source==='hand'?removeOne(p.hand,fearCardId):source==='played'?removeOne(p.playedCards,fearCardId):removeOne(p.hand,fearCardId)||removeOne(p.playedCards,fearCardId);
  if(!removed)throw new Error('Fear card is not owned by the Mystic');
  const pile=(p.leader!.data.ritualPile??=[]) as CardId[]; pile.push(fearCardId);
  return next;
}

/** All four Mystic starting cards may exile themselves to trigger a ritual as a main action. */
export function mysticExileStartingCardForRitual(state:GameState,playerId:PlayerId,cardId:CardId,context:EngineContext):GameState{
  const {player}=requireLeader(state,playerId,'mystic'); const card=context.cards[cardId];
  if(!card||card.expansion!=='Expedition Leaders'||!['Divine Guidance','Meditation','Worldly Goods','Blindsight'].includes(card.name))throw new Error('Card cannot trigger a Mystic ritual');
  if(!player.hand.includes(cardId))throw new Error('Mystic starting card is not in hand');
  const next=structuredClone(state); const p=next.players[playerId]; p.hand.splice(p.hand.indexOf(cardId),1);
  next.market.exiled.push(cardId);
  next.pendingRewards.push({playerId,sourceId:`leader:mystic:${card.name}`,code:'leader:MYSTIC_RITUAL_CHOICE',payload:{allowedFearCounts:[2,3,4],mainAction:true}});
  return next;
}

/** Hike/Cartography spend the same snack tokens used for Explorer movement. */
export function explorerSpendSnackOnStartingCard(state:GameState,playerId:PlayerId,snackId:'free'|'coin'|'compass',cardId:CardId,context:EngineContext):GameState{
  const {player}=requireLeader(state,playerId,'explorer'); const card=context.cards[cardId];
  if(!card||card.expansion!=='Expedition Leaders'||!['Hike','Cartography'].includes(card.name))throw new Error('Only Hike or Cartography can spend a snack token this way');
  if(!player.playedCards.includes(cardId)&&!player.hand.includes(cardId))throw new Error('Explorer starting card is not available');
  return explorerSpendSnack(state,playerId,snackId,`card:${cardId}`);
}
