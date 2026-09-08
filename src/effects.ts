import type { CardEffect, CardEffectCounter, CardId, EngineContext, GameState, PlayerId, Resource, ResourceCost } from './types.ts';
import { beginForcedSiteAction, grantTemporaryTravel } from './action-window.ts';
import { resolveRewardCode } from './site-rewards.ts';

function gainResource(state: GameState, playerId: PlayerId, resource: Resource, amount: number) {
  if (!Number.isInteger(amount) || amount < 0) throw new Error('Effect amount must be a non-negative integer');
  state.players[playerId].resources[resource] += amount;
}

function drawCards(state: GameState, playerId: PlayerId, amount: number) {
  if (!Number.isInteger(amount) || amount < 0) throw new Error('Draw amount must be a non-negative integer');
  const player = state.players[playerId];
  for (let i = 0; i < amount; i += 1) {
    const card = player.deck.shift();
    if (!card) break;
    player.hand.push(card);
  }
}

export function inferBaseStarterEffects(cardId: CardId, context: EngineContext): CardEffect[] {
  const card = context.cards[cardId];
  if (!card || card.expansion !== 'Base Game' || card.type !== 'Starter') return [];
  if (card.name === 'Funding') return [{ type: 'GAIN_RESOURCE', resource: 'coin', amount: 1 }];
  if (card.name === 'Exploration') return [{ type: 'GAIN_RESOURCE', resource: 'compass', amount: 1 }];
  return [];
}

export function getCardEffects(cardId: CardId, context: EngineContext): CardEffect[] {
  return context.cardEffects?.[cardId] ?? inferBaseStarterEffects(cardId, context);
}

export function gainFearCards(state: GameState, playerId: PlayerId, amount: number, context: EngineContext) {
  if (!Number.isInteger(amount) || amount < 0) throw new Error('Fear amount must be a non-negative integer');
  const fear = Object.values(context.cards).find(card => card.type === 'Fear' && card.expansion === 'Base Game');
  if (!fear) throw new Error('Base-game Fear card is missing from the card catalog');
  for (let i = 0; i < amount; i += 1) state.players[playerId].discard.push(fear.id);
}
/** Expansion cards may have a special effect merely for being exiled. */
export function resolveOwnedCardExile(state:GameState,playerId:PlayerId,cardId:CardId,context:EngineContext){const card=context.cards[cardId];if(card?.expansion!=='Surprise Shipment')return;if(card.name==='Ominous Chalice'){gainFearCards(state,playerId,1,context);gainResource(state,playerId,'coin',1);}else if(card.name==='Ominous Medallion')gainFearCards(state,playerId,1,context);else if(card.name==='Ominous Warpaint')gainFearCards(state,playerId,2,context);}
function drawFromBottom(state:GameState,playerId:PlayerId,amount:number){if(!Number.isInteger(amount)||amount<0)throw new Error('Bottom draw amount must be a non-negative integer');const player=state.players[playerId];for(let index=0;index<amount;index+=1){const card=player.deck.pop();if(!card)break;player.hand.push(card);}}
function counterValue(state:GameState,playerId:PlayerId,counter:CardEffectCounter,context:EngineContext){const player=state.players[playerId];switch(counter){case'IDOLS':return player.idols.length;case'OCCUPIED_WORKERS':return Object.values(state.sites).filter(site=>site.occupiedBy===playerId).length;case'GUARDIAN_TOTAL':return player.defeatedGuardians.length+Object.values(state.sites).filter(site=>site.occupiedBy===playerId&&site.guardian).length;case'FEAR_IN_HAND_AND_PLAY':return [...player.hand,...player.playedCards].filter(id=>context.cards[id]?.type==='Fear'||(context.cards[id]?.expansion==='Expedition Leaders'&&context.cards[id]?.name==='Hidden Fear')).length;}}
function spendEffectResources(state:GameState,playerId:PlayerId,cost:ResourceCost){const player=state.players[playerId];for(const resource of ['tablet','arrowhead','jewel','coin','compass'] as const){const amount=cost[resource]??0;if(!Number.isInteger(amount)||amount<0)throw new Error(`Invalid card ${resource} cost`);if(player.resources[resource]<amount)throw new Error(`Insufficient ${resource}`);}for(const resource of ['tablet','arrowhead','jewel','coin','compass'] as const)player.resources[resource]-=cost[resource]??0;}

function exileSourceCard(state: GameState, playerId: PlayerId, sourceCardId: CardId | undefined, context:EngineContext) {
  if (!sourceCardId) throw new Error('Self-exile effect requires its source card id');
  const played = state.players[playerId].playedCards;
  const index = played.indexOf(sourceCardId);
  if (index < 0) throw new Error('Self-exile effect source is not in the play area');
  played.splice(index, 1);
  state.market.exiled.push(sourceCardId);
  resolveOwnedCardExile(state,playerId,sourceCardId,context);
}

export function applyCardEffects(state: GameState, playerId: PlayerId, effects: CardEffect[], context: EngineContext, sourceCardId?: CardId) {
  for (const effect of effects) {
    switch (effect.type) {
      case 'BEGIN_SITE_ACTION_WINDOW':
        Object.assign(state,beginForcedSiteAction(state,playerId,effect));
        break;
      case 'GAIN_RESOURCE':
        gainResource(state, playerId, effect.resource, effect.amount);
        break;
      case 'GAIN_RESOURCE_PER': {const amount=counterValue(state,playerId,effect.counter,context),capped=effect.max===undefined?amount:Math.min(amount,effect.max);if(!Number.isInteger(effect.max??capped)||(effect.max??capped)<0)throw new Error('Effect maximum must be a non-negative integer');gainResource(state,playerId,effect.resource,capped);break;}
      case 'UPGRADE_RESOURCE_PER': {const amount=counterValue(state,playerId,effect.counter,context),capped=effect.max===undefined?amount:Math.min(amount,effect.max);if(!Number.isInteger(effect.max??capped)||(effect.max??capped)<0)throw new Error('Upgrade-per maximum must be a non-negative integer');if(capped>0){if(!sourceCardId)throw new Error('Upgrade-per card effect requires its source card id');state.pendingRewards.push({playerId,sourceId:`card:${sourceCardId}`,code:'card:RESOLVE_EFFECT',payload:{type:'CARD_EFFECT',sourceCardId,effect,stage:'upgrade-per',remaining:capped}});return;}break;}
      case 'GAIN_TRAVEL':
        Object.assign(state, grantTemporaryTravel(state, playerId, effect.travel));
        break;
      case 'DRAW_CARD':
        drawCards(state, playerId, effect.amount);
        break;
      case 'DRAW_TOP_PROCESS': {
        if(!sourceCardId)throw new Error('Top-deck card effect requires its source card id');
        const amount=effect.kind==='first-aid'?4:2,drawnCardIds=state.players[playerId].deck.splice(0,amount);
        if(!drawnCardIds.length)break;
        state.pendingRewards.push({playerId,sourceId:`card:${sourceCardId}`,code:'card:RESOLVE_EFFECT',payload:{type:'CARD_EFFECT',sourceCardId,effect,stage:'top-process',drawnCardIds}});
        return;
      }
      case 'DRAW_FROM_BOTTOM':drawFromBottom(state,playerId,effect.amount);break;
      case 'DRAW_BOTTOM_THEN_KEEP':
        if (!sourceCardId) throw new Error('Bottom draw card effect requires its source card id');
        state.pendingRewards.push({ playerId, sourceId: `card:${sourceCardId}`, code: 'card:RESOLVE_EFFECT', payload: { type: 'CARD_EFFECT', sourceCardId, effect } });
        return;
      case 'DRAW_THEN_KEEP_AND_OPTIONAL_TOP':
        if (!sourceCardId) throw new Error('Draw-selection card effect requires its source card id');
        state.pendingRewards.push({ playerId, sourceId: `card:${sourceCardId}`, code: 'card:RESOLVE_EFFECT', payload: { type: 'CARD_EFFECT', sourceCardId, effect } });
        return;
      case 'ACTIVATE_TOP_SITE_DECK': {
        const deck=effect.level===1?state.discovery.level1Deck:state.discovery.level2Deck,siteId=deck.shift(),site=context.sites?.[siteId ?? ''];
        if(!siteId||!site||site.level!==effect.level)throw new Error(`Card effect requires a verified Level ${effect.level} site deck`);
        resolveRewardCode(state,playerId,siteId,site.rewardCode,context);deck.push(siteId);
        break;
      }
      case 'GAIN_FEAR_CARD':
        gainFearCards(state, playerId, effect.amount, context);
        break;
      case 'IGNORE_GUARDIAN_FEAR_THIS_ROUND':
        state.players[playerId].guardianFearImmuneThisRound=true;
        break;
      case 'GAIN_ON_OVERCOME_GUARDIAN_THIS_ROUND':
        state.players[playerId].guardianDefeatRewardsThisRound ??= [];
        state.players[playerId].guardianDefeatRewardsThisRound.push(structuredClone(effect.gain));
        break;
      case 'USE_STANDARD_IDOL_SLOT_EFFECT':
      case 'EXILE_SLOTTED_IDOL':
        if(!sourceCardId)throw new Error('Virtual idol effect requires its source card id');
        state.pendingRewards.push({playerId,sourceId:`card:${sourceCardId}`,code:'card:RESOLVE_EFFECT',payload:{type:'CARD_EFFECT',sourceCardId,effect}});
        return;
      case 'PASS_IMMEDIATELY_GAIN': {
        for(const resource of ['tablet','arrowhead','jewel','coin','compass'] as const){const amount=effect.gain[resource]??0;if(!Number.isInteger(amount)||amount<0)throw new Error(`Invalid pass ${resource} gain`);state.players[playerId].resources[resource]+=amount;}
        state.players[playerId].mustPassImmediately=true;
        break;
      }
      case 'GAIN_EXTRA_MAIN_ACTION':
        state.players[playerId].extraMainActions=(state.players[playerId].extraMainActions??0)+1;
        break;
      case 'SEQUENCE':
        applyCardEffects(state,playerId,effect.effects,context,sourceCardId);
        break;
      case 'IF_NO_OTHER_PLAYED_CARDS': {
        const other=state.players[playerId].playedCards.some(cardId=>cardId!==sourceCardId);
        applyCardEffects(state,playerId,other?effect.otherwise:effect.ifTrue,context,sourceCardId);
        break;
      }
      case 'IF_NO_FEAR_IN_PLAY': {
        const hasFear=state.players[playerId].playedCards.some(cardId=>context.cards[cardId]?.type==='Fear');
        if(!hasFear)applyCardEffects(state,playerId,effect.effects,context,sourceCardId);
        break;
      }
      case 'EFFECT_BY_ROUND': {
        const index=Math.max(0,Math.min(state.round-1,effect.effects.length-1));
        const branch=effect.effects[index];
        if(!branch)throw new Error('Round-indexed card effect has no branch');
        applyCardEffects(state,playerId,branch,context,sourceCardId);
        break;
      }
      case 'CHOOSE_ONE':
      case 'CHOOSE_DISTINCT':
        if(!sourceCardId)throw new Error('Card choice effect requires its source card id');
        state.pendingRewards.push({playerId,sourceId:`card:${sourceCardId}`,code:'card:RESOLVE_EFFECT',payload:{type:'CARD_EFFECT',sourceCardId,effect}});
        return;
      case 'CHOOSE_ONE_BY_OTHER_PLAYED_COUNT': {
        const count=state.players[playerId].playedCards.filter(cardId=>cardId!==sourceCardId).length;
        const options=effect.options.filter(option=>Number.isInteger(option.minimum)&&option.minimum>=0&&count>=option.minimum).map(option=>option.effect);
        if(!options.length)throw new Error('Conditional card effect has no eligible option');
        applyCardEffects(state,playerId,[{type:'CHOOSE_ONE',options}],context,sourceCardId);
        break;
      }
      case 'CHOOSE_DISTINCT_BY_MAGNIFYING_ROWS': {
        const rows=state.research.magnifying[playerId]??0;
        const count=effect.thresholds.filter(threshold=>Number.isInteger(threshold)&&rows>=threshold).length;
        if(!count)throw new Error('Magnifying glass has not advanced far enough for this card');
        applyCardEffects(state,playerId,[{type:'CHOOSE_DISTINCT',count:Math.min(count,effect.options.length),options:effect.options}],context,sourceCardId);
        break;
      }
      case 'EXILE_SELF':
        exileSourceCard(state, playerId, sourceCardId, context);
        break;
      case 'EXILE_OWN_CARD':
        if (!sourceCardId) throw new Error('Exile card effect requires its source card id');
        state.pendingRewards.push({ playerId, sourceId: `card:${sourceCardId}`, code: 'card:RESOLVE_EFFECT', payload: { type: 'CARD_EFFECT', sourceCardId, effect } });
        return;
      case 'RETURN_FEAR_FROM_PLAY_TO_HAND':
        if(!sourceCardId)throw new Error('Fear-return effect requires its source card id');
        state.pendingRewards.push({playerId,sourceId:`card:${sourceCardId}`,code:'card:RESOLVE_EFFECT',payload:{type:'CARD_EFFECT',sourceCardId,effect}});
        return;
      case 'RETURN_SLOTTED_IDOL':
        if(!sourceCardId)throw new Error('Slotted idol card effect requires its source card id');
        state.pendingRewards.push({playerId,sourceId:`card:${sourceCardId}`,code:'card:RESOLVE_EFFECT',payload:{type:'CARD_EFFECT',sourceCardId,effect}});
        return;
      case 'RETURN_OCCUPIED_WORKER_THEN':
        if(!sourceCardId)throw new Error('Worker-return card effect requires its source card id');
        state.pendingRewards.push({playerId,sourceId:`card:${sourceCardId}`,code:'card:RESOLVE_EFFECT',payload:{type:'CARD_EFFECT',sourceCardId,effect}});
        return;
      case 'ALL_TRAVEL_ICONS_ARE_PLANES_THIS_ROUND':
        state.players[playerId].allTravelIconsArePlanesThisRound=true;
        break;
      case 'PUT_BOUGHT_ITEMS_ON_DECK_TOP_THIS_ROUND':
        state.players[playerId].boughtItemsToDeckTopThisRound=true;
        break;
      case 'BUY_ARTIFACTS_WITH_COIN_THIS_ROUND':
        state.players[playerId].boughtArtifactsWithCoinThisRound=true;
        break;
      case 'PLACE_ARROWHEAD_ON_JOURNAL':
        state.players[playerId].journalArrowheads=(state.players[playerId].journalArrowheads??0)+1;
        break;
      case 'REDUCE_NEXT_SITE_ACTION_COST':
        if(!Number.isInteger(effect.plane)||effect.plane<0||!Number.isInteger(effect.discoveryCompass??0)||(effect.discoveryCompass??0)<0)throw new Error('Invalid site-action discount');
        state.players[playerId].nextSiteActionPlaneDiscount=(state.players[playerId].nextSiteActionPlaneDiscount??0)+effect.plane;
        state.players[playerId].nextDiscoveryCompassDiscount=(state.players[playerId].nextDiscoveryCompassDiscount??0)+(effect.discoveryCompass??0);
        break;
      case 'ACTIVATE_TENT_SITE':
      case 'ACTIVATE_TENT_SITES':
      case 'ACTIVATE_OWN_OCCUPIED_SITE':
      case 'ACTIVATE_OCCUPIED_SITE':
      case 'ACTIVATE_OTHER_PLAYER_OCCUPIED_SITE':
      case 'ACTIVATE_UNOCCUPIED_SITE':
      case 'ACTIVATE_SITE_IN_ROW_ABOVE_OWN_WORKER':
      case 'ACTIVATE_LEVEL1_SITE_IN_ROW_WITH_OWN_WORKER':
      case 'SWAP_SITE_TILES_THEN_ACTIVATE':
      case 'ACTIVATE_ANY_GOLD_ASSISTANT':
      case 'ACTIVATE_DEFEATED_GUARDIAN_BOON':
      case 'MOVE_OCCUPIED_WORKER_THEN_ACTIVATE':
      case 'MOVE_GUARDIAN_FROM_OWN_SITE_THEN_ACTIVATE':
        if(!sourceCardId)throw new Error('Tent-site card effect requires its source card id');
        state.pendingRewards.push({playerId,sourceId:`card:${sourceCardId}`,code:'card:RESOLVE_EFFECT',payload:{type:'CARD_EFFECT',sourceCardId,effect}});
        return;
      case 'FREE_RESEARCH':
        if (!sourceCardId) throw new Error('Free research card effect requires its source card id');
        state.pendingRewards.push({ playerId, sourceId: `card:${sourceCardId}`, code: 'card:RESOLVE_EFFECT', payload: { type: 'CARD_EFFECT', sourceCardId, effect } });
        return;
      case 'RESEARCH_DISCOUNT':
      case 'RESEARCH_ANY_DISCOUNT_THEN':
        if (!sourceCardId) throw new Error('Research discount card effect requires its source card id');
        state.pendingRewards.push({ playerId, sourceId: `card:${sourceCardId}`, code: 'card:RESOLVE_EFFECT', payload: { type: 'CARD_EFFECT', sourceCardId, effect } });
        return;
      case 'PAY_RESOURCE_THEN':spendEffectResources(state,playerId,effect.cost);applyCardEffects(state,playerId,effect.effects,context,sourceCardId);break;
      case 'PAY_ANY_RESOURCES_THEN':
      case 'DISCARD_ONE_THEN':
      case 'UPGRADE_RESOURCE_THEN':
      case 'REFRESH_ASSISTANTS_THEN':
      case 'REFRESH_GUARDIAN_BOON':
      case 'SPEND_DEFEATED_GUARDIAN_THEN':
      case 'BUY_WITH_DISCOUNT':
      case 'ACTIVATE_AVAILABLE_ASSISTANT':
      case 'CLAIM_AVAILABLE_SILVER_ASSISTANT':
      case 'UPGRADE_OWN_SILVER_ASSISTANT':
      case 'ACTIVATE_OWN_ASSISTANTS':
      case 'ACQUIRE_MARKET_ITEM':
      case 'EXILE_RIGHTMOST_ITEM_GAIN_EXILED_ITEM':
      case 'EXILE_MARKET_CARD_REFILL':
      case 'BUY_ARTIFACT_WITH_DISCOUNT_THEN_EXILE':
      case 'USE_MARKET_ITEM_EFFECT':
      case 'BUY_ARTIFACT_WITH_DISCOUNT_TO_HAND':
      case 'EXCHANGE_ASSISTANT_WITH_AVAILABLE':
      case 'BUY_ITEM':
      case 'BUY_ARTIFACT':
        if (!sourceCardId) throw new Error('Discard card effect requires its source card id');
        state.pendingRewards.push({ playerId, sourceId: `card:${sourceCardId}`, code: 'card:RESOLVE_EFFECT', payload: { type: 'CARD_EFFECT', sourceCardId, effect } });
        return;
      case 'OVERCOME_GUARDIAN_FREE':
        state.pendingRewards.push({ playerId, sourceId: `card:${sourceCardId ?? 'effect'}`, code: 'card:OVERCOME_GUARDIAN_FREE', payload: { type: 'OVERCOME_GUARDIAN_FREE', lizardTrackAllowed: effect.lizardTrackAllowed, requiresOwnArchaeologist: effect.requiresOwnArchaeologist !== false } });
        return;
      case 'ACTIVATE_DISCOVERED_LEVEL1_SITE':
        state.pendingRewards.push({ playerId, sourceId: `card:${sourceCardId ?? 'effect'}`, code: 'card:ACTIVATE_DISCOVERED_LEVEL1_SITE', payload: { type: 'ACTIVATE_DISCOVERED_LEVEL1_SITE' } });
        return;
      case 'PAY_RESOURCE_GAIN': {
        spendEffectResources(state,playerId,effect.cost);const player=state.players[playerId];
        for(const resource of ['tablet','arrowhead','jewel','coin','compass'] as const)player.resources[resource]+=effect.gain[resource]??0;
        break;
      }
    }
  }
}
