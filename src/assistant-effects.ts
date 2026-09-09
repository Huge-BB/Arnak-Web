import { grantTemporaryTravel } from './action-window.ts';
import { getCardEffects, applyCardEffects, gainFearCards, resolveOwnedCardExile } from './effects.ts';
import { leaderCardDestination } from './leaders/index.ts';
import { payTravel } from './travel-payment.ts';
import type { AssistantEffect, AssistantLevel, CardId, EngineContext, GameState, PlayerId, SpendableResource } from './types.ts';

export type AssistantPendingPayload={type:'ACTIVATE_ASSISTANT_EFFECT';assistantId:string;effect?:AssistantEffect;level?:AssistantLevel};
const spendable:SpendableResource[]=['tablet','arrowhead','jewel','coin','compass'];

function queue(state:GameState,playerId:PlayerId,assistantId:string,effect:AssistantEffect,sourceKind:'assistant'|'guardian'='assistant'){state.pendingRewards.push({playerId,sourceId:`${sourceKind}:${assistantId}`,code:`${sourceKind}:ACTIVATE_EFFECT`,payload:{type:'ACTIVATE_ASSISTANT_EFFECT',assistantId,effect} satisfies AssistantPendingPayload});}
function draw(state:GameState,playerId:PlayerId,amount:number){const player=state.players[playerId];for(let index=0;index<amount;index+=1){const card=player.deck.shift();if(!card)break;player.hand.push(card);}}
function gain(state:GameState,playerId:PlayerId,resources:Partial<Record<SpendableResource,number>>){const player=state.players[playerId];for(const resource of spendable){const amount=resources[resource]??0;if(!Number.isInteger(amount)||amount<0)throw new Error(`Invalid assistant ${resource} amount`);player.resources[resource]+=amount;}}

/** Resolves deterministic assistant effects immediately and queues client choices for the rest. */
export function resolveAssistantEffect(state:GameState,playerId:PlayerId,assistantId:string,effect:AssistantEffect,sourceKind:'assistant'|'guardian'='assistant',context:EngineContext={cards:{}}):GameState{
 switch(effect.type){
  case'GAIN_RESOURCES':gain(state,playerId,effect.resources);return state;
  case'GAIN_FEAR_CARD':gainFearCards(state,playerId,effect.amount,context);return state;
  case'GAIN_TRAVEL':return grantTemporaryTravel(state,playerId,effect.travel);
  case'DRAW_CARD':draw(state,playerId,effect.amount);return state;
  case'SEQUENCE':for(const child of effect.effects)resolveAssistantEffect(state,playerId,assistantId,child,sourceKind,context);return state;
  default:queue(state,playerId,assistantId,effect,sourceKind);return state;
 }
}

export function assistantPendingPayload(payload:unknown):AssistantPendingPayload{
 if(!payload||typeof payload!=='object')throw new Error('Assistant effect pending has no payload');
 const value=payload as Partial<AssistantPendingPayload>;
 if(value.type!=='ACTIVATE_ASSISTANT_EFFECT'||typeof value.assistantId!=='string'||(!value.effect&&value.level!=='silver'&&value.level!=='gold'))throw new Error('Invalid assistant effect pending payload');
 return value as AssistantPendingPayload;
}
function pendingAt(state:GameState,playerId:PlayerId,index:number){if(!Number.isInteger(index)||index<0||index>=state.pendingRewards.length)throw new Error(`Invalid pending reward index: ${index}`);const pending=state.pendingRewards[index];if(pending.playerId!==playerId)throw new Error(`Pending reward belongs to ${pending.playerId}`);const payload=assistantPendingPayload(pending.payload);return{pending,payload};}
function consume(state:GameState,index:number){state.pendingRewards.splice(index,1);}
function chooseOption(effect:Extract<AssistantEffect,{type:'CHOOSE'|'PAY_RESOURCE_CHOOSE'}>,optionIndex:number){if(!Number.isInteger(optionIndex)||optionIndex<0||optionIndex>=effect.options.length)throw new Error('Invalid assistant effect option');return effect.options[optionIndex];}
function payResources(state:GameState,playerId:PlayerId,cost:Partial<Record<SpendableResource,number>>){const resources=state.players[playerId].resources;for(const resource of spendable){const amount=cost[resource]??0;if(!Number.isInteger(amount)||amount<0)throw new Error(`Invalid assistant ${resource} cost`);if(resources[resource]<amount)throw new Error(`Insufficient ${resource}`);}for(const resource of spendable)resources[resource]-=cost[resource]??0;}
function exileOrDiscard(state:GameState,playerId:PlayerId,cardId:CardId,mode:'exile'|'discard',context:EngineContext){const player=state.players[playerId],zones=mode==='exile'?[player.hand,player.playedCards]:[player.hand];for(const zone of zones){const index=zone.indexOf(cardId);if(index>=0){zone.splice(index,1);if(mode==='exile'){state.market.exiled.push(cardId);resolveOwnedCardExile(state,playerId,cardId,context);}else player.playedCards.push(cardId);return;}}throw new Error(mode==='exile'?'Assistant exile requires a card in hand or play area':'Assistant discard requires a card in hand');}
function upgrade(state:GameState,playerId:PlayerId,resource:SpendableResource){const target:Partial<Record<SpendableResource,SpendableResource>>={tablet:'arrowhead',arrowhead:'jewel'};const next=target[resource];if(!next)throw new Error(`${resource} cannot be upgraded`);const resources=state.players[playerId].resources;if(resources[resource]<1)throw new Error(`Insufficient ${resource}`);resources[resource]-=1;resources[next]+=1;}
export function buyMarketCardWithDiscount(state:GameState,playerId:PlayerId,cardId:CardId,effect:Pick<Extract<AssistantEffect,{type:'BUY_WITH_DISCOUNT'}>,'itemDiscount'|'artifactDiscount'>,context:EngineContext){const card=context.cards[cardId];if(!card||!['Item','Artifact'].includes(card.type))throw new Error('Discount purchase requires an Item or Artifact');const row=card.type==='Item'?state.market.items:state.market.artifacts,index=row.indexOf(cardId);if(index<0)throw new Error('Chosen card is not in the market');const currency=card.type==='Item'?'coin':'compass',discount=card.type==='Item'?effect.itemDiscount:effect.artifactDiscount,cost=Math.max(0,(card.cost??0)-discount),player=state.players[playerId];if(player.resources[currency]<cost)throw new Error(`Insufficient ${currency}`);player.resources[currency]-=cost;row.splice(index,1);const destination=leaderCardDestination(state,playerId,card);if(destination==='hand')player.hand.push(cardId);else if(destination==='deck')player.deck.push(cardId);else player.playedCards.push(cardId);const deck=card.type==='Item'?state.market.itemDeck:state.market.artifactDeck,refill=deck.shift();if(refill){if(card.type==='Item')state.market.items.push(refill);else state.market.artifacts.unshift(refill);}if(destination==='played')applyCardEffects(state,playerId,getCardEffects(cardId,context),context,cardId);}
/** Purchase an Artifact only, optionally exposing the top Artifact deck card. */
/** Purchase exactly one kind of market card, optionally allowing its currently visible deck top. */
export function buyTypedMarketCardWithDiscount(state:GameState,playerId:PlayerId,cardId:CardId,kind:'Item'|'Artifact',discount:number,includeTop:boolean,context:EngineContext){const card=context.cards[cardId];if(!card||card.type!==kind)throw new Error(`Card effect requires a ${kind}`);const row=kind==='Item'?state.market.items:state.market.artifacts,deck=kind==='Item'?state.market.itemDeck:state.market.artifactDeck,rowIndex=row.indexOf(cardId),isDeckTop=deck[0]===cardId;if(rowIndex<0&&(!includeTop||!isDeckTop))throw new Error(`${kind} must be in the market${includeTop?' or the revealed deck top':''}`);const currency=kind==='Item'?'coin':'compass',cost=Math.max(0,(card.cost??0)-discount),player=state.players[playerId];if(player.resources[currency]<cost)throw new Error(`Insufficient ${currency}`);player.resources[currency]-=cost;if(isDeckTop)deck.shift();else {row.splice(rowIndex,1);const refill=deck.shift();if(refill){if(kind==='Item')state.market.items.push(refill);else state.market.artifacts.unshift(refill);}}const destination=leaderCardDestination(state,playerId,card);if(destination==='hand')player.hand.push(cardId);else if(destination==='deck')player.deck.push(cardId);else player.playedCards.push(cardId);if(destination==='played')applyCardEffects(state,playerId,getCardEffects(cardId,context),context,cardId);}

/** @deprecated Prefer buyTypedMarketCardWithDiscount with kind 'Artifact'. */
export function buyArtifactWithDiscount(state:GameState,playerId:PlayerId,cardId:CardId,discount:number,includeTop:boolean,context:EngineContext){buyTypedMarketCardWithDiscount(state,playerId,cardId,'Artifact',discount,includeTop,context);}

export type AssistantEffectChoice={type:'assistant-option';optionIndex:number}|{type:'assistant-resource';resource:SpendableResource}|{type:'cards';cardIds:CardId[]}|{type:'card';cardId:CardId}|{type:'skip'};
/** Continue one serialized assistant effect. The assistant has already been exhausted by activation. */
export function resolvePendingAssistantEffect(state:GameState,playerId:PlayerId,pendingIndex:number,choice:AssistantEffectChoice,context:EngineContext):GameState{
 const {payload}=pendingAt(state,playerId,pendingIndex),next=structuredClone(state),effect=payload.effect??context.assistantEffects?.[payload.assistantId]?.[payload.level!];if(!effect)throw new Error(`No ${payload.level??'pending'} effect is defined for assistant: ${payload.assistantId}`);consume(next,pendingIndex);
 if(effect.type==='GAIN_RESOURCES'||effect.type==='GAIN_FEAR_CARD'||effect.type==='GAIN_TRAVEL'||effect.type==='DRAW_CARD'||effect.type==='SEQUENCE')return resolveAssistantEffect(next,playerId,payload.assistantId,effect,'assistant',context);
 switch(effect.type){
  case'CHOOSE':if(choice.type!=='assistant-option')throw new Error('Assistant choice requires an option');return resolveAssistantEffect(next,playerId,payload.assistantId,chooseOption(effect,choice.optionIndex),'assistant',context);
  case'PAY_RESOURCE_CHOOSE':if(choice.type!=='assistant-option')throw new Error('Assistant choice requires an option');payResources(next,playerId,effect.cost);return resolveAssistantEffect(next,playerId,payload.assistantId,chooseOption(effect,choice.optionIndex),'assistant',context);
  case'PAY_TRAVEL_GAIN':if(choice.type!=='cards')throw new Error('Assistant travel payment requires card choices');payTravel(next,playerId,effect.cost,choice.cardIds,context,'Assistant travel');gain(next,playerId,effect.gain);return next;
  case'UPGRADE_RESOURCE':if(choice.type!=='assistant-resource')throw new Error('Assistant upgrade requires a resource choice');upgrade(next,playerId,choice.resource);return next;
  case'DRAW_THEN_DISCARD':if(choice.type!=='card')throw new Error('Assistant draw/discard requires a card choice');draw(next,playerId,effect.draw);exileOrDiscard(next,playerId,choice.cardId,'discard',context);return next;
  case'EXILE_OWN_CARD':if(choice.type==='skip')return next;if(choice.type!=='card')throw new Error('Assistant exile requires a card choice');exileOrDiscard(next,playerId,choice.cardId,'exile',context);return next;
  case'BUY_WITH_DISCOUNT':if(choice.type==='skip')return next;if(choice.type!=='card')throw new Error('Assistant discount requires a market card choice');buyMarketCardWithDiscount(next,playerId,choice.cardId,effect,context);return next;
  default:throw new Error(`Assistant effect ${effect.type} does not require a pending choice`);
 }
}
