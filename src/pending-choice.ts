import {
  resolveLeaderPendingChoice,
  type LeaderPendingChoice,
} from "./leaders/pending.ts";
import {
  resolvePendingAssistantReward,
  resolvePendingAssistantRefresh,
  resolvePendingArtifactDiscount,
  resolvePendingLizardBurn,
  resolvePendingSnakeRescueAssistant,
  resolvePendingResearchExile,
  resolvePendingFalconerSite,
  resolvePendingFreeArtifact,
  resolvePendingFreeGuardian,
  resolvePendingFreeLizardTrackGuardian,
  resolvePendingLevel1SiteActivation,
  resolvePendingMysticArtifact,
  resolvePendingResearchChoice,
  resolvePendingVisibleSilverAssistant,
  resolvePendingBonusTile,
  resolvePendingBonusUpgrade,
} from "./pending-rewards.ts";
import { resolvePendingAssistantEffect, type AssistantEffectChoice } from "./assistant-effects.ts";
import { resolvePendingCardEffect } from './card-effect-actions.ts';
import { reduceWithLeaders } from './engine-with-leaders.ts';
import { resolveRewardCode } from './site-rewards.ts';
import type { CardId, EngineContext, GameState, PlayerId, SpendableResource } from "./types.ts";

/** Serializable choice contract exposed to a web client. */
export type PendingChoice =
  | { type: "assistant-stack"; stackIndex: number }
  | { type: "assistant-target"; ownerId: PlayerId; assistantId: string }
  | { type: "assistant"; assistantId: string }
  | { type: "snake-rescue-assistant"; assistantId: string }
  | { type: "assistants"; assistantIds: string[] }
  | { type: "assistant-exchange"; assistantId: string; stackIndex: number }
  | { type: "research-option"; optionIndex: number }
  | { type: "artifact"; artifactId: CardId }
  | { type: "site"; siteId: string }
  | { type: "site-pair"; fromSiteId: string; toSiteId: string }
  | { type: "site-swap"; firstSiteId: string; secondSiteId: string; activateSiteId: string }
  | { type: "site-ids"; siteIds: string[] }
  | { type: "research-node"; token: import('./types.ts').ResearchToken; nodeId: import('./types.ts').ResearchNodeId; paymentCardIds?: CardId[]; costAlternativeIndex?:number }
  | { type: "card-count"; count: number }
  | { type: "card-option"; optionIndex: number }
  | { type: "card-options"; optionIndexes: number[] }
  | { type: "idol"; idolId: string }
  | { type: "idol-effect"; effect: 'coinToJewel'|'tablets'|'arrowhead'|'coinCompass'|'draw'|'leaderUnique'|'mysticExileArrowhead'|'mysticExileRitual' }
  | { type: "guardian"; guardianId: string }
  | { type: "keep-and-top"; keepCardId: CardId; topDeckCardId?: CardId }
  | { type: "lizard-track-guardian" }
  | { type: "card"; cardId: CardId }
  | { type: "archive-swap"; archiveCardId: CardId; marketCardId: CardId }
  | { type: "ritual"; fearCount: 2 | 3 | 4 }
  | { type: "assistant-option"; optionIndex: number }
  | { type: "assistant-resource"; resource: SpendableResource }
  | { type: "resource"; resource: SpendableResource }
  | { type: "resource-payment"; payment: Partial<Record<SpendableResource, number>> }
  | { type: "cards"; cardIds: CardId[] }
  | { type: "top-deck"; mode: 'keep'|'exile'; cardIds: CardId[] }
  | { type: "skip" };

function pendingAt(state: GameState, playerId: PlayerId, index: number) {
  if (
    !Number.isInteger(index) ||
    index < 0 ||
    index >= state.pendingRewards.length
  )
    throw new Error(`Invalid pending reward index: ${index}`);
  const pending = state.pendingRewards[index];
  if (pending.playerId !== playerId)
    throw new Error(`Pending reward belongs to ${pending.playerId}`);
  return pending;
}
function leaderChoice(choice: PendingChoice): LeaderPendingChoice {
  switch (choice.type) {
    case "assistant":
      return { type: "assistant", assistantId: choice.assistantId };
    case "card":
      return { type: "card", cardId: choice.cardId };
    case "site":
      return { type: "site", siteId: choice.siteId };
    case "archive-swap":
      return {
        type: "archiveSwap",
        archiveCardId: choice.archiveCardId,
        marketCardId: choice.marketCardId,
      };
    case "ritual":
      return { type: "ritual", fearCount: choice.fearCount };
    case "resource":
      return { type: "resource", resource: choice.resource };
    case "skip":
      return { type: "skip" };
    default:
      throw new Error(
        `Choice ${choice.type} is not valid for this leader pending action`,
      );
  }
}

/**
 * Canonical pending resolver for UI/network callers. Internal specialized resolvers remain available,
 * while clients only need pending index + this discriminated choice object.
 */
function resolvePendingChoiceInternal(
  state: GameState,
  playerId: PlayerId,
  pendingIndex: number,
  choice: PendingChoice,
  context: EngineContext,
): GameState {
  const pending = pendingAt(state, playerId, pendingIndex),
    payload = (pending.payload ?? {}) as Record<string, unknown>,
    payloadType = typeof payload.type === "string" ? payload.type : undefined;
  if (payloadType === 'CARD_EFFECT') {
    if (choice.type !== 'card' && choice.type !== 'idol' && choice.type !== 'idol-effect' && choice.type !== 'guardian' && choice.type !== 'site' && choice.type !== 'site-pair' && choice.type !== 'site-swap' && choice.type !== 'site-ids' && choice.type !== 'resource' && choice.type !== 'resource-payment' && choice.type !== 'assistants' && choice.type !== 'assistant-stack' && choice.type !== 'assistant-target' && choice.type !== 'assistant-exchange' && choice.type !== 'research-node' && choice.type !== 'card-count' && choice.type !== 'card-option' && choice.type !== 'card-options' && choice.type !== 'keep-and-top' && choice.type !== 'top-deck' && choice.type !== 'skip') throw new Error('Card effect requires a supported serialized choice');
    const resolved=resolvePendingCardEffect(state, playerId, pendingIndex, choice, context);
    if(resolved.players[playerId].mustPassImmediately){delete resolved.players[playerId].mustPassImmediately;return reduceWithLeaders(resolved,{type:'PASS',playerId},context);}
    return resolved;
  }
  if (payloadType === "ACTIVATE_ASSISTANT_EFFECT") {
    return resolvePendingAssistantEffect(state, playerId, pendingIndex, choice as AssistantEffectChoice, context);
  }
  if (
    pending.code.startsWith("leader:") &&
    pending.code !== "leader:FALCONER_EAGLE_REWARD" &&
    pending.code !== "leader:MYSTIC_OVERCOME_GUARDIAN_FREE" &&
    pending.code !== "leader:MYSTIC_BUY_ARTIFACT_DISCOUNT"
  )
    return resolveLeaderPendingChoice(
      state,
      playerId,
      pendingIndex,
      leaderChoice(choice),
      context,
    );
  if (pending.code === "leader:FALCONER_EAGLE_REWARD") {
    if (choice.type !== "site")
      throw new Error("Falconer site reward requires a site choice");
    return resolvePendingFalconerSite(
      state,
      playerId,
      pendingIndex,
      choice.siteId,
      context,
    );
  }
  if (
    pending.code === "leader:MYSTIC_OVERCOME_GUARDIAN_FREE" ||
    payloadType === "OVERCOME_GUARDIAN_FREE"
  ) {
    if (choice.type === 'lizard-track-guardian') return resolvePendingFreeLizardTrackGuardian(state, playerId, pendingIndex);
    if (choice.type !== "site")
      throw new Error("Free guardian reward requires a site or eligible Lizard guardian choice");
    return resolvePendingFreeGuardian(
      state,
      playerId,
      pendingIndex,
      choice.siteId,
    );
  }
  if (pending.code === "leader:MYSTIC_BUY_ARTIFACT_DISCOUNT") {
    if (choice.type !== "artifact")
      throw new Error("Mystic Artifact reward requires an Artifact choice");
    return resolvePendingMysticArtifact(
      state,
      playerId,
      pendingIndex,
      choice.artifactId,
      context,
    );
  }
  switch (payloadType) {
    case 'BONUS_TILE':
      if (payload.slot === 'EXILE_OWN_CARD') {
        if (choice.type === 'skip') return resolvePendingBonusTile(state, playerId, pendingIndex, undefined, context);
        if (choice.type !== 'card') throw new Error('Research bonus exile requires a card choice or skip');
        return resolvePendingBonusTile(state, playerId, pendingIndex, choice.cardId, context);
      }
      if (payload.slot === 'UPGRADE_RESOURCE') {
        if (choice.type !== 'resource') throw new Error('Research bonus upgrade requires a resource choice');
        return resolvePendingBonusUpgrade(state, playerId, pendingIndex, choice.resource);
      }
      break;
    case "CLAIM_ASSISTANT":
      if (choice.type !== "assistant-stack")
        throw new Error("Assistant claim requires a stack choice");
      return resolvePendingAssistantReward(state, playerId, pendingIndex, {
        stackIndex: choice.stackIndex,
      });
    case "CLAIM_SNAKE_RESCUE_ASSISTANT":
      if (choice.type !== 'snake-rescue-assistant') throw new Error('Snake rescue requires an assistant choice');
      return resolvePendingSnakeRescueAssistant(state, playerId, pendingIndex, choice.assistantId);
    case 'EXILE_OWN_CARD':
      if(choice.type==='skip')return resolvePendingResearchExile(state,playerId,pendingIndex,undefined,context);
      if(choice.type!=='card')throw new Error('Research exile requires a card choice or skip');
      return resolvePendingResearchExile(state,playerId,pendingIndex,choice.cardId,context);
    case "UPGRADE_ASSISTANT":
    case "UPGRADE_AND_REFRESH_ASSISTANT":
    case "REFRESH_ASSISTANT":
      if (choice.type !== "assistant")
        throw new Error("Assistant reward requires an assistant choice");
      return resolvePendingAssistantReward(state, playerId, pendingIndex, {
        assistantId: choice.assistantId,
      });
    case "REFRESH_ASSISTANTS":
      if (choice.type !== 'assistants') throw new Error('Assistant refresh requires assistant choices');
      return resolvePendingAssistantRefresh(state, playerId, pendingIndex, choice.assistantIds);
    case "CHOOSE":
      if (choice.type !== "research-option")
        throw new Error("Research choice requires an option index");
      return resolvePendingResearchChoice(
        state,
        playerId,
        pendingIndex,
        choice.optionIndex,
        context,
      );
    case "ACQUIRE_ARTIFACT_FREE":
      if (choice.type !== "artifact")
        throw new Error("Free Artifact reward requires an Artifact choice");
      return resolvePendingFreeArtifact(
        state,
        playerId,
        pendingIndex,
        choice.artifactId,
        context,
      );
    case 'BUY_ARTIFACT_WITH_DISCOUNT':
      if (choice.type !== 'artifact') throw new Error('Artifact discount reward requires an Artifact choice');
      return resolvePendingArtifactDiscount(state, playerId, pendingIndex, choice.artifactId, context);
    case "ACTIVATE_DISCOVERED_LEVEL1_SITE":
      if (choice.type !== "site")
        throw new Error("Level I site reward requires a site choice");
      return resolvePendingLevel1SiteActivation(
        state,
        playerId,
        pendingIndex,
        choice.siteId,
        context,
      );
    case 'BURN_UNOCCUPIED_LEVEL1_SITE_REFILL_IDOL':
      if (choice.type !== 'site') throw new Error('Lizard burn reward requires a site choice');
      return resolvePendingLizardBurn(state, playerId, pendingIndex, choice.siteId, context);
    case "ACTIVATE_VISIBLE_SILVER_ASSISTANT_THEN_BOTTOM":
      if (choice.type !== "assistant-stack")
        throw new Error("Visible assistant reward requires a stack choice");
      return resolvePendingVisibleSilverAssistant(
        state,
        playerId,
        pendingIndex,
        choice.stackIndex,
      );
  }
  throw new Error(
    `Unsupported pending reward: ${pending.code}${payloadType ? ` (${payloadType})` : ""}`,
  );
}

/**
 * Resolves a client-visible choice and settles a deferred main action only
 * after its target/payment has been validated.  Leader abilities such as
 * Hike and a high-position Falconer return create these pending choices.
 */
export function resolvePendingChoice(
  state: GameState,
  playerId: PlayerId,
  pendingIndex: number,
  choice: PendingChoice,
  context: EngineContext,
): GameState {
  const pending = pendingAt(state, playerId, pendingIndex);
  const pendingPayload = (pending.payload ?? {}) as Record<string, unknown>;
  const isMainAction = pendingPayload.mainAction === true;
  if (isMainAction && state.players[playerId].mainActionUsed)
    throw new Error('This player has already used their main action this turn');
  const resolved = resolvePendingChoiceInternal(state, playerId, pendingIndex, choice, context);
  const afterDiscoverySiteId = typeof pendingPayload.afterDiscoverySiteId === 'string' ? pendingPayload.afterDiscoverySiteId : undefined;
  if (afterDiscoverySiteId) {
    const site = resolved.sites[afterDiscoverySiteId];
    if (!site?.tileId) throw new Error(`Deferred discovery site is unavailable: ${afterDiscoverySiteId}`);
    const definition = context.sites?.[site.tileId];
    if (!definition || definition.level !== site.level) throw new Error(`Unknown deferred discovery site tile: ${site.tileId}`);
    resolveRewardCode(resolved, playerId, site.tileId, definition.rewardCode, context);
  }
  if (isMainAction) resolved.players[playerId].mainActionUsed = true;
  return resolved;
}
