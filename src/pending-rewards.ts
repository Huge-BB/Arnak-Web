import { claimAssistant, refreshOwnedAssistant, upgradeOwnedAssistant } from './assistant-actions.ts';
import { applyCardEffects, getCardEffects, resolveOwnedCardExile } from './effects.ts';
import { resolveResearchReward } from './research-rewards.ts';
import { resolveRewardCode } from './site-rewards.ts';
import { buyMarketCardWithDiscount } from './assistant-effects.ts';
import { activateAndBurnLizardLevel1Site } from './temples/lizard-rewards.ts';
import { defeatLizardTrackGuardian, lizardTrackGuardians } from './temples/lizard-state.ts';
import type { CardId, EngineContext, GameState, PlayerId, ResearchReward, SpendableResource } from './types.ts';

function pendingAt(state: GameState, index: number) {
  if (!Number.isInteger(index) || index < 0 || index >= state.pendingRewards.length) throw new Error(`Invalid pending reward index: ${index}`);
  return state.pendingRewards[index];
}
function researchRewardPayload(payload: unknown): ResearchReward { if (!payload || typeof payload !== 'object' || typeof (payload as Record<string, unknown>).type !== 'string') throw new Error('Pending research reward has no structured payload'); return payload as ResearchReward; }
function assertPendingOwner(state: GameState, playerId: PlayerId, index: number) { const pending=pendingAt(state,index); if(pending.playerId!==playerId) throw new Error(`Pending reward belongs to ${pending.playerId}`); return pending; }
function consumePending(state: GameState, index: number): GameState { const next=structuredClone(state); next.pendingRewards.splice(index,1); return next; }

export function resolvePendingAssistantReward(state:GameState,playerId:PlayerId,pendingIndex:number,choice:{stackIndex?:number;assistantId?:string}):GameState{
 const pending=assertPendingOwner(state,playerId,pendingIndex),reward=researchRewardPayload(pending.payload);let resolved:GameState;
 if(reward.type==='CLAIM_ASSISTANT'){if(reward.level!=='silver')throw new Error('CLAIM_ASSISTANT research reward must grant a silver assistant');if(!Number.isInteger(choice.stackIndex))throw new Error('CLAIM_ASSISTANT requires a stackIndex choice');resolved=claimAssistant(state,playerId,choice.stackIndex!);}
 else if(reward.type==='UPGRADE_ASSISTANT'){if(reward.level!=='gold')throw new Error('UPGRADE_ASSISTANT research reward must grant a gold upgrade');if(!choice.assistantId)throw new Error('UPGRADE_ASSISTANT requires an assistantId choice');resolved=upgradeOwnedAssistant(state,playerId,choice.assistantId);}
 else if(reward.type==='UPGRADE_AND_REFRESH_ASSISTANT'){if(reward.level!=='gold')throw new Error('UPGRADE_AND_REFRESH_ASSISTANT research reward must grant a gold upgrade');if(!choice.assistantId)throw new Error('UPGRADE_AND_REFRESH_ASSISTANT requires an assistantId choice');resolved=refreshOwnedAssistant(upgradeOwnedAssistant(state,playerId,choice.assistantId),playerId,choice.assistantId);}
 else if(reward.type==='REFRESH_ASSISTANT'){if(!choice.assistantId)throw new Error('REFRESH_ASSISTANT requires an assistantId choice');resolved=refreshOwnedAssistant(state,playerId,choice.assistantId);}
 else throw new Error(`Pending research reward is not an assistant choice: ${reward.type}`);
 return consumePending(resolved,pendingIndex);
}
export function resolvePendingAssistantRefresh(state:GameState,playerId:PlayerId,pendingIndex:number,assistantIds:string[]):GameState{
 const pending=assertPendingOwner(state,playerId,pendingIndex),reward=researchRewardPayload(pending.payload);
 if(reward.type!=='REFRESH_ASSISTANTS'||reward.amount==='all')throw new Error('Pending reward is not a selected assistant refresh');
 if(!Number.isInteger(reward.amount)||assistantIds.length!==reward.amount||new Set(assistantIds).size!==assistantIds.length)throw new Error('Assistant refresh requires the exact number of distinct assistants');
 let next=state;for(const assistantId of assistantIds)next=refreshOwnedAssistant(next,playerId,assistantId);return consumePending(next,pendingIndex);
}
export function resolvePendingArtifactDiscount(state:GameState,playerId:PlayerId,pendingIndex:number,artifactId:CardId,context:EngineContext):GameState{
 const pending=assertPendingOwner(state,playerId,pendingIndex),reward=researchRewardPayload(pending.payload);if(reward.type!=='BUY_ARTIFACT_WITH_DISCOUNT')throw new Error(`Pending reward is not an Artifact discount: ${reward.type}`);
 const card=context.cards[artifactId];if(!card||card.type!=='Artifact')throw new Error('Artifact discount requires a market Artifact');const next=structuredClone(state);buyMarketCardWithDiscount(next,playerId,artifactId,{itemDiscount:0,artifactDiscount:reward.discount},context);next.pendingRewards.splice(pendingIndex,1);return next;
}
export function resolvePendingLizardBurn(state:GameState,playerId:PlayerId,pendingIndex:number,siteId:string,context:EngineContext):GameState{
 const pending=assertPendingOwner(state,playerId,pendingIndex),reward=researchRewardPayload(pending.payload);if(reward.type!=='BURN_UNOCCUPIED_LEVEL1_SITE_REFILL_IDOL')throw new Error(`Pending reward is not a Lizard site burn: ${reward.type}`);const next=activateAndBurnLizardLevel1Site(state,playerId,siteId,context);next.pendingRewards.splice(pendingIndex,1);return next;
}
export function resolvePendingResearchChoice(state:GameState,playerId:PlayerId,pendingIndex:number,optionIndex:number,context?:EngineContext):GameState{const pending=assertPendingOwner(state,playerId,pendingIndex),reward=researchRewardPayload(pending.payload);if(reward.type!=='CHOOSE')throw new Error(`Pending reward is not a CHOOSE reward: ${reward.type}`);if(reward.count!==1)throw new Error('Only single-option research choices are currently resolvable');if(!Number.isInteger(optionIndex)||optionIndex<0||optionIndex>=reward.options.length)throw new Error(`Invalid research choice index: ${optionIndex}`);const next=structuredClone(state),sourceId=next.pendingRewards[pendingIndex].sourceId;next.pendingRewards.splice(pendingIndex,1);resolveResearchReward(next,playerId,sourceId,reward.options[optionIndex],context);return next;}
export function resolvePendingFreeArtifact(state:GameState,playerId:PlayerId,pendingIndex:number,artifactId:string,context:EngineContext):GameState{const pending=assertPendingOwner(state,playerId,pendingIndex),reward=researchRewardPayload(pending.payload);if(reward.type!=='ACQUIRE_ARTIFACT_FREE')throw new Error(`Pending reward is not a free Artifact choice: ${reward.type}`);const card=context.cards[artifactId];if(!card||card.type!=='Artifact')throw new Error(`Invalid Artifact choice: ${artifactId}`);const marketIndex=state.market.artifacts.indexOf(artifactId);if(marketIndex<0)throw new Error('Artifact is not available in the market');const next=structuredClone(state);next.market.artifacts.splice(marketIndex,1);next.players[playerId].playedCards.push(artifactId);const refill=next.market.artifactDeck.shift();if(refill)next.market.artifacts.unshift(refill);applyCardEffects(next,playerId,getCardEffects(artifactId,context),context,artifactId);next.pendingRewards.splice(pendingIndex,1);return next;}
export function resolvePendingLevel1SiteActivation(state:GameState,playerId:PlayerId,pendingIndex:number,siteId:string,context:EngineContext):GameState{const pending=assertPendingOwner(state,playerId,pendingIndex),reward=researchRewardPayload(pending.payload);if(reward.type!=='ACTIVATE_DISCOVERED_LEVEL1_SITE')throw new Error(`Pending reward is not a Level I site activation: ${reward.type}`);const site=state.sites[siteId];if(!site||site.level!==1||!site.tileId)throw new Error(`Site is not a discovered Level I site: ${siteId}`);const definition=context.sites?.[site.tileId];if(!definition||definition.level!==1)throw new Error(`Unknown Level I site tile: ${site.tileId}`);const next=structuredClone(state);resolveRewardCode(next,playerId,site.tileId,definition.rewardCode,context);next.pendingRewards.splice(pendingIndex,1);return next;}
export function resolvePendingVisibleSilverAssistant(state:GameState,playerId:PlayerId,pendingIndex:number,stackIndex:number):GameState{const pending=assertPendingOwner(state,playerId,pendingIndex),reward=researchRewardPayload(pending.payload);if(reward.type!=='ACTIVATE_VISIBLE_SILVER_ASSISTANT_THEN_BOTTOM')throw new Error(`Pending reward is not a visible silver assistant activation: ${reward.type}`);if(!Number.isInteger(stackIndex)||stackIndex<0||stackIndex>=state.assistants.stacks.length)throw new Error(`Invalid assistant stack: ${stackIndex}`);const assistantId=state.assistants.stacks[stackIndex]?.[0];if(!assistantId)throw new Error(`Assistant stack is empty: ${stackIndex}`);const next=structuredClone(state),stack=next.assistants.stacks[stackIndex];stack.shift();stack.push(assistantId);next.pendingRewards.splice(pendingIndex,1);next.pendingRewards.push({playerId,sourceId:pending.sourceId,code:'assistant:ACTIVATE_SILVER',payload:{type:'ACTIVATE_ASSISTANT_EFFECT',assistantId,level:'silver'}});return next;}
export function resolvePendingBonusTile(state:GameState,playerId:PlayerId,pendingIndex:number,cardId?:CardId,context?:EngineContext,source?:'hand'|'played'):GameState{const pending=assertPendingOwner(state,playerId,pendingIndex),reward=researchRewardPayload(pending.payload);if(reward.type!=='BONUS_TILE'||reward.slot!=='EXILE_OWN_CARD')throw new Error('Pending reward is not an exile research bonus tile');const next=structuredClone(state);if(cardId!==undefined){const player=next.players[playerId],zones=source==='hand'?[player.hand]:source==='played'?[player.playedCards]:[player.hand,player.playedCards];for(const zone of zones){const index=zone.indexOf(cardId);if(index>=0){zone.splice(index,1);next.market.exiled.push(cardId);if(context)resolveOwnedCardExile(next,playerId,cardId,context);next.pendingRewards.splice(pendingIndex,1);return next;}}throw new Error('Research bonus exile requires a card from the selected area');}next.pendingRewards.splice(pendingIndex,1);return next;}
export function resolvePendingBonusUpgrade(state:GameState,playerId:PlayerId,pendingIndex:number,resource:SpendableResource):GameState{const pending=assertPendingOwner(state,playerId,pendingIndex),reward=researchRewardPayload(pending.payload);if(reward.type!=='BONUS_TILE'||reward.slot!=='UPGRADE_RESOURCE')throw new Error('Pending reward is not an upgrade research bonus tile');const target:Partial<Record<SpendableResource,SpendableResource>>={tablet:'arrowhead',arrowhead:'jewel'},nextResource=target[resource];if(!nextResource)throw new Error(`${resource} cannot be upgraded`);const next=structuredClone(state),resources=next.players[playerId].resources;if(resources[resource]<1)throw new Error(`Insufficient ${resource}`);resources[resource]-=1;resources[nextResource]+=1;next.pendingRewards.splice(pendingIndex,1);return next;}

/** Resolve the shared free-guardian effect used by cards, research, and Mystic ritual. */
export function resolvePendingFreeGuardian(state:GameState,playerId:PlayerId,pendingIndex:number,siteId:string):GameState{
 const pending=assertPendingOwner(state,playerId,pendingIndex); const payload=pending.payload as Record<string,unknown>|undefined;
 if(payload?.type!=='OVERCOME_GUARDIAN_FREE'&&pending.code!=='leader:MYSTIC_OVERCOME_GUARDIAN_FREE')throw new Error('Pending reward is not a free guardian action');
 const site=state.sites[siteId],requiresOwnArchaeologist=payload?.requiresOwnArchaeologist!==false; if(!site)throw new Error(`Unknown site: ${siteId}`); if(requiresOwnArchaeologist&&site.occupiedBy!==playerId)throw new Error('Free guardian action requires your archaeologist at the site'); if(!requiresOwnArchaeologist&&site.occupiedBy&&site.occupiedBy!==playerId)throw new Error('This free guardian action cannot target another player\'s archaeologist'); if(!site.guardian)throw new Error('There is no guardian at the site');
 const next=structuredClone(state),guardianId=next.sites[siteId].guardian!; delete next.sites[siteId].guardian; next.players[playerId].defeatedGuardians.push(guardianId); next.pendingRewards.splice(pendingIndex,1); return next;
}
/** Snake Temple rescue: choose any hidden assistant from its dedicated stack; it joins exhausted. */
export function resolvePendingSnakeRescueAssistant(state:GameState,playerId:PlayerId,pendingIndex:number,assistantId:string):GameState{
 const pending=assertPendingOwner(state,playerId,pendingIndex),reward=researchRewardPayload(pending.payload);
 if(reward.type!=='CLAIM_SNAKE_RESCUE_ASSISTANT')throw new Error(`Pending reward is not a Snake rescue: ${reward.type}`);
 const index=state.assistants.specialStack.indexOf(assistantId);if(index<0)throw new Error('Snake rescue requires an assistant from the rescue stack');
 const next=structuredClone(state);next.assistants.specialStack.splice(index,1);next.players[playerId].assistants.push({id:assistantId,level:'silver',exhausted:true});next.pendingRewards.splice(pendingIndex,1);return next;
}
/** Optional research exile may select a card from hand or play area, or decline. */
export function resolvePendingResearchExile(state:GameState,playerId:PlayerId,pendingIndex:number,cardId?:CardId,context?:EngineContext,source?:'hand'|'played'):GameState{
 const pending=assertPendingOwner(state,playerId,pendingIndex),reward=researchRewardPayload(pending.payload);
 if(reward.type!=='EXILE_OWN_CARD')throw new Error(`Pending reward is not a research exile: ${reward.type}`);
 const next=structuredClone(state);if(cardId!==undefined){const player=next.players[playerId],zones=source==='hand'?[player.hand]:source==='played'?[player.playedCards]:[player.hand,player.playedCards];for(const zone of zones){const index=zone.indexOf(cardId);if(index>=0){zone.splice(index,1);next.market.exiled.push(cardId);if(context)resolveOwnedCardExile(next,playerId,cardId,context);next.pendingRewards.splice(pendingIndex,1);return next;}}throw new Error('Research exile requires a card from the selected area');}
 next.pendingRewards.splice(pendingIndex,1);return next;
}
/** Shared free-guardian effects with lizardTrackAllowed may defeat the revealed Lizard guardian when the magnifying glass is on it. */
export function resolvePendingFreeLizardTrackGuardian(state:GameState,playerId:PlayerId,pendingIndex:number):GameState{
 const pending=assertPendingOwner(state,playerId,pendingIndex),payload=pending.payload as Record<string,unknown>|undefined;
 if(payload?.type!=='OVERCOME_GUARDIAN_FREE'||(payload.lizardTrackAllowed!==true&&payload.lizardTrackAllowed!=='uncontested'))throw new Error('This free guardian effect cannot target the Lizard track guardian');
 const next=structuredClone(state),guardian=lizardTrackGuardians(next).find(entry=>!entry.defeated);
 if(!guardian||!guardian.revealed)throw new Error('No revealed Lizard track guardian is available');
 if(payload.lizardTrackAllowed===true&&next.research.magnifyingNode[playerId]!==guardian.nodeId)throw new Error('Free Lizard guardian action requires your magnifying glass at its row');
 if(payload.lizardTrackAllowed==='uncontested'&&next.playerOrder.some(id=>id!==playerId&&(next.research.magnifyingNode[id]===guardian.nodeId||next.research.journalNode[id]===guardian.nodeId)))throw new Error('Bear Trap cannot target the Lizard guardian after another player reaches its row');
 defeatLizardTrackGuardian(next,guardian.id);next.players[playerId].defeatedGuardians.push(guardian.id);next.pendingRewards.splice(pendingIndex,1);return next;
}

/** Falconer eagle positions 3/4 activate any discovered Level I/II site. */
export function resolvePendingFalconerSite(state:GameState,playerId:PlayerId,pendingIndex:number,siteId:string,context:EngineContext):GameState{
 const pending=assertPendingOwner(state,playerId,pendingIndex); if(pending.code!=='leader:FALCONER_EAGLE_REWARD')throw new Error('Pending reward is not a Falconer eagle reward');
 const payload=(pending.payload??{}) as Record<string,unknown>,position=Number(payload.rewardPosition); if(position!==3&&position!==4)throw new Error(`Falconer eagle reward ${position} is not a site activation`);
 const site=state.sites[siteId]; const requiredLevel=position===3?1:2; if(!site?.tileId||site.level!==requiredLevel)throw new Error(`Falconer reward ${position} requires a discovered Level ${requiredLevel} site`);
 const definition=context.sites?.[site.tileId]; if(!definition||definition.level!==requiredLevel)throw new Error(`Unknown Level ${requiredLevel} site tile: ${site.tileId}`);
 const next=structuredClone(state); resolveRewardCode(next,playerId,site.tileId,definition.rewardCode,context); next.pendingRewards.splice(pendingIndex,1); return next;
}

/** Mystic 3-Fear ritual buys one market Artifact with a 3-compass discount. */
export function resolvePendingMysticArtifact(state:GameState,playerId:PlayerId,pendingIndex:number,artifactId:string,context:EngineContext):GameState{
 const pending=assertPendingOwner(state,playerId,pendingIndex); if(pending.code!=='leader:MYSTIC_BUY_ARTIFACT_DISCOUNT')throw new Error('Pending reward is not a Mystic discounted Artifact purchase');
 const discount=Number((pending.payload as Record<string,unknown>|undefined)?.discount??0); const card=context.cards[artifactId]; if(!card||card.type!=='Artifact')throw new Error(`Invalid Artifact choice: ${artifactId}`);
 const marketIndex=state.market.artifacts.indexOf(artifactId); if(marketIndex<0)throw new Error('Artifact is not available in the market'); const cost=Math.max(0,(card.cost??0)-discount); if(state.players[playerId].resources.compass<cost)throw new Error('Insufficient compass');
 const next=structuredClone(state); next.players[playerId].resources.compass-=cost; next.market.artifacts.splice(marketIndex,1); next.players[playerId].playedCards.push(artifactId); const refill=next.market.artifactDeck.shift(); if(refill)next.market.artifacts.unshift(refill); applyCardEffects(next,playerId,getCardEffects(artifactId,context),context,artifactId); next.pendingRewards.splice(pendingIndex,1); return next;
}
