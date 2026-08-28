import { applyCardEffects, getCardEffects, resolveOwnedCardExile } from './effects.ts';
import { buyMarketCardWithDiscount } from './assistant-effects.ts';
import { resolveAssistantEffect } from './assistant-effects.ts';
import { claimAssistant, upgradeOwnedAssistant } from './assistant-actions.ts';
import { advanceResearchByNode } from './research-action.ts';
import { resolveRewardCode } from './site-rewards.ts';
import { resolveBaseIdolEffect } from './idol-actions.ts';
import { activateGuardianBoon } from './guardian-actions.ts';
import { resolveLeaderPrintedIdolEffect, type IdolEffect } from './leaders/idol-actions.ts';
import type { CardEffect, CardId, EngineContext, GameState, PlayerId, ResearchNodeId, ResearchToken, SpendableResource } from './types.ts';

type CardEffectPendingPayload = { type:'CARD_EFFECT'; sourceCardId:CardId; effect:CardEffect; stage?:'choose-keep'|'upgrade-per'|'top-process'; drawnCardIds?:CardId[]; remaining?:number };

function payloadAt(state:GameState, playerId:PlayerId, pendingIndex:number):CardEffectPendingPayload {
  if (!Number.isInteger(pendingIndex) || pendingIndex < 0 || pendingIndex >= state.pendingRewards.length) throw new Error(`Invalid pending reward index: ${pendingIndex}`);
  const pending=state.pendingRewards[pendingIndex];
  if (pending.playerId !== playerId) throw new Error(`Pending reward belongs to ${pending.playerId}`);
  const payload=pending.payload as Partial<CardEffectPendingPayload> | undefined;
  if (pending.code !== 'card:RESOLVE_EFFECT' || payload?.type !== 'CARD_EFFECT' || typeof payload.sourceCardId !== 'string' || !payload.effect) throw new Error('Pending reward is not a card effect');
  return payload as CardEffectPendingPayload;
}

/** Resolves card effects that need a player-selected card, resource, or assistant. */
function upgrade(state:GameState, playerId:PlayerId, resource:SpendableResource) {
  const next:Partial<Record<SpendableResource,SpendableResource>>={tablet:'arrowhead',arrowhead:'jewel'};
  const target=next[resource];
  if (!target) throw new Error(`${resource} cannot be upgraded`);
  const resources=state.players[playerId].resources;
  if (resources[resource] < 1) throw new Error(`Insufficient ${resource}`);
  resources[resource]-=1; resources[target]+=1;
}

export function resolvePendingCardEffect(state:GameState, playerId:PlayerId, pendingIndex:number, choice:{type:'card';cardId:CardId}|{type:'idol';idolId:string}|{type:'idol-effect';effect:IdolEffect}|{type:'guardian';guardianId:string}|{type:'card-count';count:number}|{type:'card-option';optionIndex:number}|{type:'card-options';optionIndexes:number[]}|{type:'keep-and-top';keepCardId:CardId;topDeckCardId?:CardId}|{type:'top-deck';mode:'keep'|'exile';cardIds:CardId[]}|{type:'resource';resource:SpendableResource}|{type:'resource-payment';payment:Partial<Record<SpendableResource,number>>}|{type:'assistants';assistantIds:string[]}|{type:'assistant-stack';stackIndex:number}|{type:'assistant-target';ownerId:PlayerId;assistantId:string}|{type:'assistant-exchange';assistantId:string;stackIndex:number}|{type:'site';siteId:string}|{type:'site-pair';fromSiteId:string;toSiteId:string}|{type:'site-swap';firstSiteId:string;secondSiteId:string;activateSiteId:string}|{type:'site-ids';siteIds:string[]}|{type:'skip'}|{type:'research-node';token:ResearchToken;nodeId:ResearchNodeId;paymentCardIds?:CardId[]}, context:EngineContext):GameState {
  const payload=payloadAt(state,playerId,pendingIndex);
  if(payload.effect.type==='DRAW_BOTTOM_THEN_KEEP'){
    const next=structuredClone(state),player=next.players[playerId];
    if(!payload.stage){
      if(choice.type!=='card-count'||!Number.isInteger(choice.count)||choice.count<0||choice.count>payload.effect.maximum)throw new Error(`Bottom draw requires a count from 0 to ${payload.effect.maximum}`);
      const drawnCardIds:CardId[]=[];for(let index=0;index<choice.count;index+=1){const card=player.deck.pop();if(!card)break;drawnCardIds.push(card);}
      if(!drawnCardIds.length){next.pendingRewards.splice(pendingIndex,1);return next;}
      next.pendingRewards[pendingIndex].payload={...payload,stage:'choose-keep',drawnCardIds};return next;
    }
    if(choice.type!=='card'||!payload.drawnCardIds?.includes(choice.cardId))throw new Error('Bottom draw keep requires one of the drawn cards');
    player.hand.push(choice.cardId);for(const cardId of payload.drawnCardIds)if(cardId!==choice.cardId)player.discard.push(cardId);next.pendingRewards.splice(pendingIndex,1);return next;
  }
  if(payload.effect.type==='DRAW_THEN_KEEP_AND_OPTIONAL_TOP'){
    const next=structuredClone(state),player=next.players[playerId];
    if(!payload.stage){
      if(choice.type!=='card-count'||!Number.isInteger(choice.count)||choice.count<0||choice.count>payload.effect.maximum)throw new Error(`Draw selection requires a count from 0 to ${payload.effect.maximum}`);
      const drawnCardIds:CardId[]=[];for(let index=0;index<choice.count;index+=1){const card=player.deck.shift();if(!card)break;drawnCardIds.push(card);}
      if(!drawnCardIds.length){next.pendingRewards.splice(pendingIndex,1);return next;}
      next.pendingRewards[pendingIndex].payload={...payload,stage:'choose-keep',drawnCardIds};return next;
    }
    if(choice.type!=='keep-and-top'||!payload.drawnCardIds?.includes(choice.keepCardId)||choice.topDeckCardId!==undefined&&(!payload.drawnCardIds.includes(choice.topDeckCardId)||choice.topDeckCardId===choice.keepCardId))throw new Error('Draw selection requires one kept card and an optional different top-deck card');
    player.hand.push(choice.keepCardId);if(choice.topDeckCardId)player.deck.unshift(choice.topDeckCardId);for(const cardId of payload.drawnCardIds)if(cardId!==choice.keepCardId&&cardId!==choice.topDeckCardId)player.discard.push(cardId);next.pendingRewards.splice(pendingIndex,1);return next;
  }
  if(payload.effect.type==='DRAW_TOP_PROCESS'){
    if(payload.stage!=='top-process'||!payload.drawnCardIds)throw new Error('Top-deck card effect has no revealed cards');
    if(choice.type!=='top-deck')throw new Error('Top-deck card effect requires a revealed-card choice');
    const drawn=payload.drawnCardIds,selected=choice.cardIds;
    if(new Set(selected).size!==selected.length||selected.some(cardId=>!drawn.includes(cardId)))throw new Error('Top-deck selection must use only revealed cards');
    const next=structuredClone(state),player=next.players[playerId];
    if(payload.effect.kind==='first-aid'){
      if(choice.mode==='keep'&&selected.length!==1||choice.mode==='exile'&&selected.length>2)throw new Error('First Aid requires one kept card or up to two exiled cards');
      if(choice.mode==='keep')player.hand.push(selected[0]);else next.market.exiled.push(...selected);
    }else{
      if(choice.mode!=='exile'||selected.length>1)throw new Error('Rod of Division may exile at most one drawn card');
      if(selected.length){next.market.exiled.push(selected[0]);player.resources.coin+=1;}
    }
    const returned=drawn.filter(cardId=>!selected.includes(cardId));player.deck.unshift(...returned);next.pendingRewards.splice(pendingIndex,1);return next;
  }
  if(payload.effect.type==='UPGRADE_RESOURCE_PER'){
    if(payload.stage!=='upgrade-per'||!Number.isInteger(payload.remaining)||payload.remaining<1)throw new Error('Upgrade-per effect has invalid pending state');
    if(choice.type!=='resource')throw new Error('Upgrade-per effect requires a resource choice');
    const next=structuredClone(state);upgrade(next,playerId,choice.resource);
    if(payload.remaining===1){next.pendingRewards.splice(pendingIndex,1);return next;}
    next.pendingRewards[pendingIndex].payload={...payload,remaining:payload.remaining-1};return next;
  }
  const next=structuredClone(state);
  let followUps:CardEffect[]=[];
  const activateSite=(siteId:string)=>{const site=next.sites[siteId];if(!site)throw new Error(`Unknown site: ${siteId}`);const definition=site.tileId?context.sites?.[site.tileId]:undefined,code=definition?.rewardCode??site.rewardCode;if(!code)throw new Error(`Site has no verified reward: ${siteId}`);resolveRewardCode(next,playerId,site.tileId??siteId,code,context);};
  if (payload.effect.type === 'EXILE_SLOTTED_IDOL') {
    if(choice.type!=='idol')throw new Error('Card effect requires one of your slotted idols');
    const idols=next.players[playerId].idols,index=idols.findIndex(idol=>idol.id===choice.idolId&&idol.inSlot===true);
    if(index<0)throw new Error('Card effect requires one of your slotted idols');
    idols.splice(index,1);
    const gain=payload.effect.gain;
    for(const [resource,amount] of Object.entries(gain))next.players[playerId].resources[resource as SpendableResource]+=amount??0;
  } else if (payload.effect.type === 'USE_STANDARD_IDOL_SLOT_EFFECT') {
    if(choice.type!=='idol-effect')throw new Error('Card effect requires a printed idol-slot effect choice');
    if(next.players[playerId].leader){
      const resolved=resolveLeaderPrintedIdolEffect(next,playerId,choice.effect,context);
      resolved.pendingRewards.splice(pendingIndex,1);return resolved;
    }
    if(!['coinToJewel','tablets','arrowhead','coinCompass','draw'].includes(choice.effect))throw new Error('Base player board has no such idol effect');
    const resolved=resolveBaseIdolEffect(next,playerId,choice.effect);
    resolved.pendingRewards.splice(pendingIndex,1);return resolved;
  } else if (payload.effect.type === 'DISCARD_ONE_THEN') {
    if (choice.type !== 'card') throw new Error('Card effect discard requires a card choice');
    const hand=next.players[playerId].hand, index=hand.indexOf(choice.cardId);
    if (index < 0) throw new Error('Card effect discard requires a card in hand');
    hand.splice(index,1); next.players[playerId].playedCards.push(choice.cardId);
    followUps=payload.effect.effects;
  } else if (payload.effect.type === 'EXILE_OWN_CARD') {
    if (choice.type !== 'card') throw new Error('Card effect exile requires a card choice');
    const player=next.players[playerId];
    let removed=false;
    for(const zone of [player.hand,player.playedCards]){const index=zone.indexOf(choice.cardId);if(index>=0){zone.splice(index,1);next.market.exiled.push(choice.cardId);resolveOwnedCardExile(next,playerId,choice.cardId,context);removed=true;break;}}
    if(!removed) throw new Error('Card effect exile requires a card in hand or play area');
    followUps=payload.effect.effects??[];
  } else if (payload.effect.type === 'RETURN_FEAR_FROM_PLAY_TO_HAND') {
    if(choice.type!=='card')throw new Error('Card effect requires a Fear card in play');
    const index=next.players[playerId].playedCards.indexOf(choice.cardId);
    if(index<0||context.cards[choice.cardId]?.type!=='Fear')throw new Error('Card effect requires a Fear card in play');
    next.players[playerId].playedCards.splice(index,1);next.players[playerId].hand.push(choice.cardId);
  } else if (payload.effect.type === 'RETURN_SLOTTED_IDOL') {
    if(choice.type!=='idol')throw new Error('Card effect requires a slotted idol choice');
    const idols=next.players[playerId].idols,index=idols.findIndex(idol=>idol.id===choice.idolId&&idol.inSlot===true);
    if(index<0)throw new Error('Card effect requires one of your slotted idols');
    idols.splice(index,1);
  } else if (payload.effect.type === 'RETURN_OCCUPIED_WORKER_THEN') {
    if(choice.type!=='site')throw new Error('Card effect requires one of your occupied sites');
    const site=next.sites[choice.siteId];
    if(!site||site.occupiedBy!==playerId)throw new Error('Card effect requires one of your occupied sites');
    delete site.occupiedBy;
    next.players[playerId].availableWorkers+=1;
    followUps=payload.effect.effects;
  } else if (payload.effect.type === 'ACTIVATE_TENT_SITE') {
    if(choice.type!=='site')throw new Error('Card effect requires a tent site');
    const site=next.sites[choice.siteId];
    if(!site?.isTentSite||(payload.effect.requireEmpty&&site.occupiedBy))throw new Error('Card effect requires an eligible tent site');
    activateSite(choice.siteId);
  } else if (payload.effect.type === 'ACTIVATE_TENT_SITES') {
    if(choice.type!=='site-ids'||choice.siteIds.length!==payload.effect.count||new Set(choice.siteIds).size!==choice.siteIds.length)throw new Error('Card effect requires the exact number of distinct tent sites');
    for(const siteId of choice.siteIds){const site=next.sites[siteId];if(!site?.isTentSite||(payload.effect.requireEmpty&&site.occupiedBy))throw new Error('Card effect requires eligible tent sites');}
    for(const siteId of choice.siteIds)activateSite(siteId);
  } else if (payload.effect.type === 'ACTIVATE_OWN_OCCUPIED_SITE') {
    if(choice.type!=='site')throw new Error('Card effect requires one of your occupied sites');
    const site=next.sites[choice.siteId];if(!site||site.occupiedBy!==playerId)throw new Error('Card effect requires one of your occupied sites');
    const cost=site.level===2?(payload.effect.level2CompassCost??0):0;if(next.players[playerId].resources.compass<cost)throw new Error('Insufficient compass');next.players[playerId].resources.compass-=cost;
    activateSite(choice.siteId);
  } else if (payload.effect.type === 'ACTIVATE_OCCUPIED_SITE') {
    if(choice.type!=='site')throw new Error('Card effect requires an occupied site');
    const site=next.sites[choice.siteId];
    if(!site?.occupiedBy||(payload.effect.level!==undefined&&site.level!==payload.effect.level))throw new Error('Card effect requires an eligible occupied site');
    activateSite(choice.siteId);
  } else if (payload.effect.type === 'ACTIVATE_OTHER_PLAYER_OCCUPIED_SITE') {
    if(choice.type!=='site')throw new Error('Card effect requires an opponent-occupied site');
    const site=next.sites[choice.siteId];
    if(!site?.occupiedBy||site.occupiedBy===playerId||(payload.effect.level!==undefined&&site.level!==payload.effect.level))throw new Error('Card effect requires an eligible opponent-occupied site');
    activateSite(choice.siteId);
  } else if (payload.effect.type === 'ACTIVATE_UNOCCUPIED_SITE') {
    if(choice.type!=='site')throw new Error('Card effect requires an unoccupied site');
    const site=next.sites[choice.siteId];
    if(!site||site.occupiedBy||(payload.effect.level!==undefined&&site.level!==payload.effect.level))throw new Error('Card effect requires an eligible unoccupied site');
    activateSite(choice.siteId);
  } else if (payload.effect.type === 'ACTIVATE_SITE_IN_ROW_ABOVE_OWN_WORKER') {
    if(choice.type!=='site')throw new Error('Card effect requires a site in the row directly above your archaeologist');
    const site=next.sites[choice.siteId];
    const hasWorkerBelow=Object.values(next.sites).some((candidate)=>candidate.occupiedBy===playerId&&candidate.mapRow!==undefined&&site?.mapRow===candidate.mapRow+1);
    if(!site||site.mapRow===undefined||!hasWorkerBelow)throw new Error('Card effect requires a site in the row directly above your archaeologist');
    activateSite(choice.siteId);
    if(site.level===2&&(payload.effect.fearIfLevel2??0)>0)applyCardEffects(next,playerId,[{type:'GAIN_FEAR_TO_HAND',amount:payload.effect.fearIfLevel2}],context,payload.sourceCardId);
  } else if (payload.effect.type === 'ACTIVATE_LEVEL1_SITE_IN_ROW_WITH_OWN_WORKER') {
    if(choice.type!=='site')throw new Error('Card effect requires a Level I site in a row containing your archaeologist');
    const site=next.sites[choice.siteId];
    const hasWorkerInRow=Object.values(next.sites).some((candidate)=>candidate.occupiedBy===playerId&&candidate.mapRow!==undefined&&candidate.mapRow===site?.mapRow);
    if(!site||site.level!==1||site.mapRow===undefined||!hasWorkerInRow)throw new Error('Card effect requires a Level I site in a row containing your archaeologist');
    activateSite(choice.siteId);
  } else if (payload.effect.type === 'SWAP_SITE_TILES_THEN_ACTIVATE') {
    if(choice.type!=='site-swap'||choice.firstSiteId===choice.secondSiteId||![choice.firstSiteId,choice.secondSiteId].includes(choice.activateSiteId))throw new Error('Card effect requires two sites and one of them to activate');
    const first=next.sites[choice.firstSiteId],second=next.sites[choice.secondSiteId];
    if(!first?.tileId||!second?.tileId)throw new Error('Card effect requires two discovered site tiles');
    [first.tileId,second.tileId]=[second.tileId,first.tileId];
    activateSite(choice.activateSiteId);
  } else if (payload.effect.type === 'MOVE_OCCUPIED_WORKER_THEN_ACTIVATE') {
    if(choice.type!=='site-pair'||choice.fromSiteId===choice.toSiteId)throw new Error('Card effect requires different source and destination sites');
    const source=next.sites[choice.fromSiteId],target=next.sites[choice.toSiteId];
    if(!source||source.occupiedBy!==playerId)throw new Error('Card effect source must contain your archaeologist');
    if(payload.effect.sourceLevel!==undefined&&source.level!==payload.effect.sourceLevel)throw new Error(`Card effect source must be a Level ${payload.effect.sourceLevel} site`);
    if(!target||target.occupiedBy)throw new Error('Card effect destination must be unoccupied');
    if(payload.effect.destination==='tent'&&!target.isTentSite)throw new Error('Card effect destination must be a tent site');
    if(payload.effect.destination==='tent-or-level1'&&!target.isTentSite&&target.level!==1)throw new Error('Card effect destination must be a tent or Level I site');
    if(payload.effect.destination==='level1'&&target.level!==1)throw new Error('Card effect destination must be a Level I site');
    if(payload.effect.destination==='level2'&&target.level!==2)throw new Error('Card effect destination must be a Level II site');
    if(payload.effect.destination==='level1-or-level2'&&(target.level!==1&&target.level!==2))throw new Error('Card effect destination must be a Level I or Level II site');
    delete source.occupiedBy;target.occupiedBy=playerId;
    for(let index=0;index<payload.effect.activations;index+=1)activateSite(choice.toSiteId);
  } else if (payload.effect.type === 'MOVE_GUARDIAN_FROM_OWN_SITE_THEN_ACTIVATE') {
    if(choice.type!=='site-pair'||choice.fromSiteId===choice.toSiteId)throw new Error('Card effect requires different guardian source and destination sites');
    const source=next.sites[choice.fromSiteId],target=next.sites[choice.toSiteId];
    if(!source||source.occupiedBy!==playerId||!source.guardian)throw new Error('Card effect source must be your occupied guardian site');
    if(!target||target.occupiedBy||target.guardian)throw new Error('Card effect destination must be unoccupied and guardian-free');
    if(!target.isTentSite&&target.level!==1)throw new Error('Card effect destination must be a tent or Level I site');
    target.guardian=source.guardian;delete source.guardian;activateSite(choice.toSiteId);
  } else if (payload.effect.type === 'FREE_RESEARCH') {
    if(choice.type!=='research-node'||choice.token!==payload.effect.token)throw new Error(`Card effect requires a ${payload.effect.token} research destination`);
    const track=context.researchTracks?.[next.research.board];
    if(!track)throw new Error(`Research track data required for ${next.research.board}`);
    advanceResearchByNode(next,track,{playerId,token:choice.token,toNodeId:choice.nodeId,free:true},context);
  } else if (payload.effect.type === 'RESEARCH_DISCOUNT') {
    if(choice.type!=='research-node'||choice.token!=='magnifying')throw new Error('Card effect requires a magnifying-glass research destination');
    const track=context.researchTracks?.[next.research.board];
    if(!track)throw new Error(`Research track data required for ${next.research.board}`);
    advanceResearchByNode(next,track,{playerId,token:choice.token,toNodeId:choice.nodeId,paymentCardIds:choice.paymentCardIds,resourceDiscount:payload.effect.discount},context);
  } else if (payload.effect.type === 'RESEARCH_ANY_DISCOUNT_THEN') {
    if(choice.type!=='research-node')throw new Error('Card effect requires a research destination');
    const track=context.researchTracks?.[next.research.board];
    if(!track)throw new Error(`Research track data required for ${next.research.board}`);
    advanceResearchByNode(next,track,{playerId,token:choice.token,toNodeId:choice.nodeId,paymentCardIds:choice.paymentCardIds,resourceDiscount:payload.effect.discount},context);
    followUps=choice.token==='magnifying'?payload.effect.magnifyingEffects:payload.effect.journalEffects;
  } else if (payload.effect.type === 'CHOOSE_ONE') {
    if(choice.type!=='card-option'||!Number.isInteger(choice.optionIndex)||choice.optionIndex<0||choice.optionIndex>=payload.effect.options.length)throw new Error('Card effect requires one valid option');
    followUps=[payload.effect.options[choice.optionIndex]];
  } else if (payload.effect.type === 'CHOOSE_DISTINCT') {
    if(choice.type!=='card-options'||!Number.isInteger(payload.effect.count)||payload.effect.count<1||choice.optionIndexes.length!==payload.effect.count||new Set(choice.optionIndexes).size!==choice.optionIndexes.length||choice.optionIndexes.some(index=>!Number.isInteger(index)||index<0||index>=payload.effect.options.length))throw new Error('Card effect requires the exact number of distinct valid options');
    followUps=choice.optionIndexes.map(index=>payload.effect.options[index]);
  } else if (payload.effect.type === 'UPGRADE_RESOURCE_THEN') {
    if (choice.type !== 'resource') throw new Error('Card effect upgrade requires a resource choice');
    upgrade(next,playerId,choice.resource);
    followUps=payload.effect.effects;
  } else if (payload.effect.type === 'REFRESH_ASSISTANTS_THEN') {
    if (choice.type !== 'assistants') throw new Error('Card effect refresh requires assistant choices');
    if (!Number.isInteger(payload.effect.amount) || payload.effect.amount < 1 || choice.assistantIds.length !== payload.effect.amount || new Set(choice.assistantIds).size !== choice.assistantIds.length) throw new Error('Card effect refresh requires the exact number of distinct assistants');
    for (const assistantId of choice.assistantIds) {
      const assistant=next.players[playerId].assistants.find(value=>value.id===assistantId);
      if (!assistant) throw new Error('Card effect refresh requires owned assistants');
      assistant.exhausted=false;
    }
    followUps=payload.effect.effects;
  } else if (payload.effect.type === 'REFRESH_GUARDIAN_BOON') {
    if(choice.type!=='guardian')throw new Error('Card effect requires one defeated guardian');
    const used=next.players[playerId].usedGuardianBoons,index=used.indexOf(choice.guardianId);
    if(!next.players[playerId].defeatedGuardians.includes(choice.guardianId)||index<0)throw new Error('Card effect requires one of your used guardian boons');
    used.splice(index,1);
  } else if (payload.effect.type === 'ACTIVATE_DEFEATED_GUARDIAN_BOON') {
    if(choice.type!=='guardian')throw new Error('Card effect requires one defeated guardian');
    const resolved=activateGuardianBoon(next,playerId,choice.guardianId,context);
    resolved.pendingRewards.splice(pendingIndex,1);return resolved;
  } else if (payload.effect.type === 'SPEND_DEFEATED_GUARDIAN_THEN') {
    if(choice.type!=='guardian')throw new Error('Card effect requires one defeated guardian as its cost');
    const player=next.players[playerId],index=player.defeatedGuardians.indexOf(choice.guardianId);
    if(index<0)throw new Error('Card effect requires one of your defeated guardians');
    player.defeatedGuardians.splice(index,1);
    player.usedGuardianBoons=player.usedGuardianBoons.filter(id=>id!==choice.guardianId);
    followUps=payload.effect.effects;
  } else if (payload.effect.type === 'PAY_ANY_RESOURCES_THEN') {
    if(choice.type!=='resource-payment')throw new Error('Card effect requires a resource payment split');
    const allowed=new Set(payload.effect.resources),payment=choice.payment;
    if(!Number.isInteger(payload.effect.amount)||payload.effect.amount<0||payload.effect.resources.length<1)throw new Error('Card effect has an invalid flexible resource cost');
    let total=0;
    for(const resource of ['tablet','arrowhead','jewel','coin','compass'] as const){const amount=payment[resource]??0;if(!Number.isInteger(amount)||amount<0)throw new Error('Card effect payment must use non-negative integers');if(amount>0&&!allowed.has(resource))throw new Error('Card effect payment uses a disallowed resource');if(next.players[playerId].resources[resource]<amount)throw new Error(`Insufficient ${resource}`);total+=amount;}
    if(total!==payload.effect.amount)throw new Error('Card effect payment total does not match the printed cost');
    for(const resource of ['tablet','arrowhead','jewel','coin','compass'] as const)next.players[playerId].resources[resource]-=payment[resource]??0;
    followUps=payload.effect.effects;
  } else if (payload.effect.type === 'ACTIVATE_ANY_GOLD_ASSISTANT') {
    if(choice.type!=='assistant-target')throw new Error('Card effect requires a gold assistant target');
    const assistant=next.players[choice.ownerId]?.assistants.find(value=>value.id===choice.assistantId&&value.level==='gold'),effect=assistant?context.assistantEffects?.[assistant.id]?.gold:undefined;
    if(!assistant||!effect)throw new Error('Card effect requires an owned gold assistant with a verified effect');
    resolveAssistantEffect(next,playerId,assistant.id,effect);
  } else if (payload.effect.type === 'ACTIVATE_AVAILABLE_ASSISTANT') {
    if(choice.type!=='assistant-stack'||!Number.isInteger(choice.stackIndex)||choice.stackIndex<0||choice.stackIndex>=next.assistants.stacks.length)throw new Error('Card effect requires one available assistant stack');
    const assistantId=next.assistants.stacks[choice.stackIndex]?.[0],effect=assistantId?context.assistantEffects?.[assistantId]?.[payload.effect.level]:undefined;
    if(!assistantId||!effect)throw new Error(`No available ${payload.effect.level} assistant effect is defined for the selected stack`);
    resolveAssistantEffect(next,playerId,assistantId,effect);
  } else if (payload.effect.type === 'CLAIM_AVAILABLE_SILVER_ASSISTANT') {
    if(choice.type!=='assistant-stack'||!Number.isInteger(choice.stackIndex)||choice.stackIndex<0||choice.stackIndex>=next.assistants.stacks.length)throw new Error('Card effect requires one available assistant stack');
    const claimed=claimAssistant(next,playerId,choice.stackIndex);
    claimed.pendingRewards.splice(pendingIndex,1);
    return claimed;
  } else if (payload.effect.type === 'UPGRADE_OWN_SILVER_ASSISTANT') {
    if(choice.type!=='assistant-target'||choice.ownerId!==playerId)throw new Error('Card effect requires one of your assistants');
    const upgraded=upgradeOwnedAssistant(next,playerId,choice.assistantId);
    upgraded.pendingRewards.splice(pendingIndex,1);
    return upgraded;
  } else if (payload.effect.type === 'ACTIVATE_OWN_ASSISTANTS') {
    if(choice.type!=='assistants'||choice.assistantIds.length!==payload.effect.levels.length||new Set(choice.assistantIds).size!==choice.assistantIds.length)throw new Error('Card effect requires the exact printed assistant set');
    const selected=choice.assistantIds.map(id=>next.players[playerId].assistants.find(assistant=>assistant.id===id));
    if(selected.some(assistant=>!assistant))throw new Error('Card effect requires owned assistants');
    const levels=[...selected.map(assistant=>assistant!.level)].sort(),expected=[...payload.effect.levels].sort();
    if(levels.join(',')!==expected.join(','))throw new Error('Card effect assistant levels do not match the printed requirement');
    for(const assistant of selected){const effect=context.assistantEffects?.[assistant!.id]?.[assistant!.level];if(!effect)throw new Error('Assistant has no verified effect');resolveAssistantEffect(next,playerId,assistant!.id,effect);}
  } else if (payload.effect.type === 'ACQUIRE_MARKET_ITEM') {
    if(choice.type!=='card')throw new Error('Card effect requires an Item from the market');
    const card=context.cards[choice.cardId],index=next.market.items.indexOf(choice.cardId);
    if(!card||card.type!=='Item'||index<0)throw new Error('Card effect requires a visible Item from the market');
    next.market.items.splice(index,1);
    if(payload.effect.destination==='hand')next.players[playerId].hand.push(choice.cardId);else next.players[playerId].deck.unshift(choice.cardId);
    const refill=next.market.itemDeck.shift();if(refill)next.market.items.push(refill);
  } else if (payload.effect.type === 'USE_MARKET_ITEM_EFFECT') {
    if(choice.type!=='card')throw new Error('Card effect requires a visible Item');
    const card=context.cards[choice.cardId];
    if(!card||card.type!=='Item'||!next.market.items.includes(choice.cardId))throw new Error('Card effect requires a visible Item');
    // Keep Tool Box as the originating card.  In particular, a copied
    // self-exile means “exile Tool Box instead”, exactly as printed.
    applyCardEffects(next,playerId,getCardEffects(choice.cardId,context),context,payload.sourceCardId);
  } else if (payload.effect.type === 'EXILE_RIGHTMOST_ITEM_GAIN_EXILED_ITEM') {
    if(choice.type!=='card')throw new Error('Card effect requires an exiled Item choice');
    const rightmost=next.market.items.pop();if(!rightmost)throw new Error('Card effect requires a visible Item to exile');
    next.market.exiled.push(rightmost);const refill=next.market.itemDeck.shift();if(refill)next.market.items.push(refill);
    const card=context.cards[choice.cardId],index=next.market.exiled.indexOf(choice.cardId);
    if(!card||card.type!=='Item'||index<0)throw new Error('Card effect requires an exiled Item choice');
    next.market.exiled.splice(index,1);next.players[playerId].deck.push(choice.cardId);
  } else if (payload.effect.type === 'EXILE_MARKET_CARD_REFILL') {
    if(choice.type==='skip'&&payload.effect.optional) {
      // This card's "may" clause is intentionally a real no-op choice.
    } else {
      if(choice.type!=='card')throw new Error('Card effect requires a visible market card');
      const card=context.cards[choice.cardId];
      const itemIndex=next.market.items.indexOf(choice.cardId),artifactIndex=next.market.artifacts.indexOf(choice.cardId);
      const row=card?.type==='Item'?'item':card?.type==='Artifact'?'artifact':undefined;
      if(!row||(payload.effect.row!=='either'&&payload.effect.row!==row)||(row==='item'?itemIndex<0:artifactIndex<0))throw new Error('Card effect requires an eligible visible market card');
      const marketRow=row==='item'?next.market.items:next.market.artifacts,deck=row==='item'?next.market.itemDeck:next.market.artifactDeck,index=row==='item'?itemIndex:artifactIndex;
      marketRow.splice(index,1);next.market.exiled.push(choice.cardId);
      const refill=deck.shift();if(refill)marketRow.push(refill);
      const gain=row==='item'?payload.effect.itemGain:payload.effect.artifactGain;
      for(const [resource,amount] of Object.entries(gain??{}))next.players[playerId].resources[resource as SpendableResource]+=(amount??0);
    }
  } else if (payload.effect.type === 'BUY_ARTIFACT_WITH_DISCOUNT_THEN_EXILE') {
    if(choice.type!=='card')throw new Error('Card effect requires a visible Artifact');
    const card=context.cards[choice.cardId];
    if(!card||card.type!=='Artifact'||!next.market.artifacts.includes(choice.cardId))throw new Error('Card effect requires a visible Artifact');
    buyMarketCardWithDiscount(next,playerId,choice.cardId,{itemDiscount:0,artifactDiscount:payload.effect.discount},context);
    const playedIndex=next.players[playerId].playedCards.lastIndexOf(choice.cardId);
    if(playedIndex<0)throw new Error('Purchased Artifact did not enter the play area');
    next.players[playerId].playedCards.splice(playedIndex,1);next.market.exiled.push(choice.cardId);resolveOwnedCardExile(next,playerId,choice.cardId,context);
  } else if (payload.effect.type === 'BUY_ARTIFACT_WITH_DISCOUNT_TO_HAND') {
    if(choice.type!=='card')throw new Error('Card effect requires a visible Artifact');
    const card=context.cards[choice.cardId], index=next.market.artifacts.indexOf(choice.cardId);
    if(!card||card.type!=='Artifact'||index<0)throw new Error('Card effect requires a visible Artifact');
    const cost=Math.max(0,(card.cost??0)-payload.effect.discount);
    if(next.players[playerId].resources.compass<cost)throw new Error('Insufficient compass');
    next.players[playerId].resources.compass-=cost;
    next.market.artifacts.splice(index,1);next.players[playerId].hand.push(choice.cardId);
    const refill=next.market.artifactDeck.shift();if(refill)next.market.artifacts.unshift(refill);
  } else if (payload.effect.type === 'EXCHANGE_ASSISTANT_WITH_AVAILABLE') {
    if(choice.type!=='assistant-exchange'||!Number.isInteger(choice.stackIndex)||choice.stackIndex<0||choice.stackIndex>=next.assistants.stacks.length)throw new Error('Card effect requires one owned assistant and one available assistant stack');
    const player=next.players[playerId],ownedIndex=player.assistants.findIndex(assistant=>assistant.id===choice.assistantId),replacement=next.assistants.stacks[choice.stackIndex]?.[0];
    if(ownedIndex<0||!replacement)throw new Error('Card effect requires one owned assistant and one available assistant stack');
    const owned=player.assistants[ownedIndex];next.assistants.stacks[choice.stackIndex].shift();next.assistants.stacks[choice.stackIndex].unshift(owned.id);
    player.assistants[ownedIndex]={id:replacement,level:owned.level,exhausted:false};
  } else if (payload.effect.type === 'BUY_ITEM_DISCOUNT_INCLUDE_TOP') {
    if(choice.type==='skip'){
      // Viewing the deck-top card is non-mutating when the optional purchase is declined.
    } else if(choice.type==='card') {
      const card=context.cards[choice.cardId];if(!card||card.type!=='Item')throw new Error('Card effect requires an Item from the market or the revealed deck top');
      const rowIndex=next.market.items.indexOf(choice.cardId),isDeckTop=next.market.itemDeck[0]===choice.cardId;
      if(rowIndex<0&&!isDeckTop)throw new Error('Card effect requires an Item from the market or the revealed deck top');
      const cost=Math.max(0,(card.cost??0)-payload.effect.discount);if(next.players[playerId].resources.coin<cost)throw new Error('Insufficient coin');
      next.players[playerId].resources.coin-=cost;
      if(isDeckTop)next.market.itemDeck.shift();else {next.market.items.splice(rowIndex,1);const refill=next.market.itemDeck.shift();if(refill)next.market.items.push(refill);}
      next.players[playerId].deck.push(choice.cardId);
    } else throw new Error('Card effect requires an Item choice or skip');
  } else if (payload.effect.type === 'BUY_WITH_DISCOUNT') {
    if (choice.type !== 'card') throw new Error('Card effect discount requires a market card choice');
    buyMarketCardWithDiscount(next,playerId,choice.cardId,payload.effect,context);
  } else throw new Error(`Card effect ${payload.effect.type} does not require a pending choice`);
  next.pendingRewards.splice(pendingIndex,1);
  if (followUps.length) applyCardEffects(next,playerId,followUps,context,payload.sourceCardId);
  return next;
}
