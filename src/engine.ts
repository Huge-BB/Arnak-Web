import { prepareAssistantSupply } from "./assistants.ts";
import { assertMainActionAvailable, consumeMainAction } from './action-economy.ts';
import { activateOwnedAssistant } from "./assistant-actions.ts";
import { assistantEffectFor } from './assistant-effect-data.ts';
import { prepareBaseGameSetup } from "./cards.ts";
import { applyCardEffects, getCardEffects } from "./effects.ts";
import { beginForcedSiteAction } from './action-window.ts';
import {
  setupLeader,
  runLeaderRoundStart,
  runLeaderRoundEnd,
  addFearToHand,
  leaderCardDestination,
} from "./leaders/index.ts";
import {
  captainCallSpecialist,
  explorerMoveArchaeologist,
  explorerSpendSnack,
  falconerReturnEagle,
  mysticPerformRitual,
  professorBuyArchiveArtifact,
} from "./leaders/actions.ts";
import { leaderIdolActionTiming, useLeaderIdol } from './leaders/idol-actions.ts';
import { advanceResearchByNode } from "./research-action.ts";
import { researchStartNode } from "./research-topology.ts";
import {
  nextLegalResearchPosition,
  RESEARCH_START_POSITION,
} from "./research.ts";
import { shuffleWithSeed } from "./rng.ts";
import { addGuardianFear, resolveRewardCode } from "./site-rewards.ts";
import { payTravel } from "./travel-payment.ts";
import { payDiscardedHandCard } from './discard-cost.ts';
import { claimTempleResearchBonus, setupResearchBonusTiles } from './research-bonus-tiles.ts';
import { baseTempleTileSupply, buyTempleTile } from './temple-tiles.ts';
import { activateGuardianBoon, overcomeGuardian, overcomeLizardTrackGuardian } from './guardian-actions.ts';
import { LIZARD_TRACK_GUARDIAN_NODE, lizardTrackGuardians, placeLizardTrackGuardian } from './temples/lizard-state.ts';
import { setupMonkeyTrackArtifact } from './temples/monkey-state.ts';
import { MONKEY_TRACK_ARTIFACT_NODE } from './temples/monkey-topology.ts';
import { setupAssignedSiteIdols } from './site-idols.ts';
import { createBaseBoardSites, resolveBaseBoardPlacementSite } from './base-board-setup.ts';
import { useBaseIdol } from './idol-actions.ts';
import { configureSoloGame, resetSoloRound, resolveSoloRivalAction, SOLO_HUMAN, SOLO_RIVAL } from './solo.ts';
import type {
  EngineContext,
  GameAction,
  GameState,
  PlayerColor,
  CardId,
  PlayerId,
  Resource,
  TravelCost,
} from "./types.ts";

const MAX_ROUNDS = 5;
const PLAYER_COLORS: PlayerColor[] = ["Yellow", "Green", "Blue", "Red"];
const DISCOVERY_COMPASS_COST = { 1: 3, 2: 6 } as const;
const STARTING_RESOURCES = [
  { coin: 2, compass: 0 },
  { coin: 1, compass: 1 },
  { coin: 2, compass: 1 },
  { coin: 1, compass: 2 },
] as const;
const EMPTY_CONTEXT: EngineContext = { cards: {} };
const emptyResources = () => ({
  tablet: 0,
  arrowhead: 0,
  jewel: 0,
  coin: 0,
  compass: 0,
  fear: 0,
});
/** Client actions cannot bypass a choice created by an earlier effect. */
export function assertNoUnresolvedPendingChoice(state:GameState,playerId:PlayerId){
  if(state.pendingRewards.some(pending=>pending.playerId===playerId))
    throw new Error('Resolve the pending choice before taking another action');
}
/** Printed plane costs may be reduced by a pre-played Aeroplane/Hot Air Balloon effect. */
export function discountedSiteTravelCost(state:GameState,playerId:PlayerId,cost:TravelCost):TravelCost {
  const discount=state.players[playerId]?.nextSiteActionPlaneDiscount??0;
  const forced=state.actionWindow?.playerId===playerId?state.actionWindow.forcedSiteAction:undefined;
  const result={...cost,plane:Math.max(0,(cost.plane??0)-discount)};
  if(forced?.travelDiscount)for(const icon of ['boot','car','boat','plane'] as const){const amount=forced.travelDiscount[icon]??0;if(amount)result[icon]=Math.max(0,(result[icon]??0)-amount);}
  return result;
}
function consumeSiteActionDiscount(state:GameState,playerId:PlayerId){
  delete state.players[playerId].nextSiteActionPlaneDiscount;
  delete state.players[playerId].nextDiscoveryCompassDiscount;
}
function forcedSiteAction(state:GameState,playerId:PlayerId,kind:'place'|'discover'){
  const forced=state.actionWindow?.playerId===playerId?state.actionWindow.forcedSiteAction:undefined;
  if(forced&&forced.kind!==kind)throw new Error(`This effect requires a ${forced.kind} site action`);
  return forced;
}
function finishSiteAction(state:GameState,playerId:PlayerId,forced:ReturnType<typeof forcedSiteAction>){
  if(forced){delete state.actionWindow?.forcedSiteAction;if(forced.consumesMainAction)consumeMainAction(state,playerId);return;}
  consumeMainAction(state,playerId);
}
export function createGame(playerIds: PlayerId[]): GameState {
  if (playerIds.length < 1 || playerIds.length > 4)
    throw new Error("Arnak supports 1-4 players");
  const players = Object.fromEntries(
    playerIds.map((id, index) => [
      id,
      {
        id,
        name: `Player ${index + 1}`,
        color: PLAYER_COLORS[index],
        rules: { journalMaxLead: 0 },
        resources: emptyResources(),
        workers: 2,
        availableWorkers: 2,
        hasPassed: false,
        researchMagnifying: RESEARCH_START_POSITION,
        researchJournal: RESEARCH_START_POSITION,
        deck: [],
        hand: [],
        discard: [],
        playedCards: [],
        idols: [],
        assistants: [],
    defeatedGuardians: [],
    usedGuardianBoons: [],
        templeTiles: [],
      },
    ]),
  );
  const startNode = researchStartNode("bird");
  return {
    version: 1,
    phase: "setup",
    round: 1,
    moonStaff: 'blue',
    firstPlayer: playerIds[0],
    currentPlayer: playerIds[0],
    players,
    playerOrder: [...playerIds],
    sites: {},
    discovery: {
      level1Deck: [],
      level2Deck: [],
      guardianDeck: [],
      idolDeck: [],
    },
    assistants: { stacks: [], specialStack: [] },
    market: {
      items: [],
      artifacts: [],
      itemDeck: [],
      artifactDeck: [],
      exiled: [],
    },
    templeTiles: baseTempleTileSupply(playerIds.length),
    research: {
      board: "bird",
      magnifying: Object.fromEntries(
        playerIds.map((id) => [id, RESEARCH_START_POSITION]),
      ),
      journal: Object.fromEntries(
        playerIds.map((id) => [id, RESEARCH_START_POSITION]),
      ),
      magnifyingNode: Object.fromEntries(
        playerIds.map((id) => [id, startNode]),
      ),
      journalNode: Object.fromEntries(playerIds.map((id) => [id, startNode])),
      templeArrivals: [],
      templeArrivalPoints: {},
      bonusTiles: {},
      templeBonusTiles: [],
      claimedBonusTiles: [],
    },
    pendingRewards: [],
  };
}
/** Official base-game solo setup. The rival occupies the first seat only so
 * the existing two-player component setup and turn ownership stay canonical. */
export function createSoloGame(options:{seed:string;difficulty:number;board:'bird'|'snake';researchBoard:string;context:EngineContext}):GameState {
  let state=createGame([SOLO_RIVAL,SOLO_HUMAN]);
  state.sites=createBaseBoardSites(2,options.seed,options.board);
  state=reduce(state,{type:'START_GAME',seed:options.seed,researchBoard:options.researchBoard,marketExpansions:['Base Game']},options.context);
  return configureSoloGame(state,options.difficulty);
}
function assertPlaying(s: GameState) {
  if (s.phase !== "playing") throw new Error("Game is not in progress");
}
function assertPlayer(s: GameState, id: PlayerId) {
  const p = s.players[id];
  if (!p) throw new Error(`Unknown player: ${id}`);
  return p;
}
function assertCurrentPlayer(s: GameState, id: PlayerId) {
  if (s.currentPlayer !== id) throw new Error(`It is not ${id}'s turn`);
  const p = assertPlayer(s, id);
  if (p.hasPassed) throw new Error(`${id} has already passed`);
}
function addResource(s: GameState, id: PlayerId, r: Resource, a: number) {
  const p = assertPlayer(s, id);
  if (!Number.isInteger(a) || a < 0)
    throw new Error("Amount must be a non-negative integer");
  p.resources[r] += a;
}
function spendResource(s: GameState, id: PlayerId, r: Resource, a: number) {
  const p = assertPlayer(s, id);
  if (!Number.isInteger(a) || a < 0)
    throw new Error("Amount must be a non-negative integer");
  if (p.resources[r] < a) throw new Error(`Insufficient ${r}`);
  p.resources[r] -= a;
}
function nextActivePlayer(s: GameState, from: PlayerId) {
  const i = s.playerOrder.indexOf(from);
  for (let o = 1; o <= s.playerOrder.length; o++) {
    const c = s.playerOrder[(i + o) % s.playerOrder.length];
    if (!s.players[c].hasPassed) return c;
  }
}
function rotateFirstPlayer(s: GameState) {
  const i = s.playerOrder.indexOf(s.firstPlayer);
  return s.playerOrder[(i + 1) % s.playerOrder.length];
}
function refillMarketSlot(s: GameState, type: "Item" | "Artifact") {
  const deck = type === "Item" ? s.market.itemDeck : s.market.artifactDeck;
  const card = deck.shift();
  if (!card) return;
  if (type === "Item") s.market.items.push(card);
  else s.market.artifacts.unshift(card);
}
function refillMarketForRound(s: GameState) {
  const a = s.market.artifactDeck.splice(
    0,
    Math.max(0, s.round - s.market.artifacts.length),
  );
  if (a.length) s.market.artifacts.unshift(...a);
  s.market.items.push(
    ...s.market.itemDeck.splice(
      0,
      Math.max(0, 6 - s.round - s.market.items.length),
    ),
  );
}
function advanceMarketToNextRound(s: GameState) {
  const cardsPerSide = s.moonStaff === 'red' ? 2 : 1;
  for (let index = 0; index < cardsPerSide; index += 1) {
    const artifact = s.market.artifacts.pop();
    const item = s.market.items.shift();
    if (artifact) s.market.exiled.push(artifact);
    if (item) s.market.exiled.push(item);
  }
  s.round += 1;
  refillMarketForRound(s);
}
function setupDiscoveryDecks(s: GameState, c: EngineContext, seed: string) {
  const sites = Object.values(c.sites ?? {}).filter(
    (x) => x.expansion === "Base Game",
  );
  s.discovery.level1Deck = shuffleWithSeed(
    sites
      .filter((x) => x.level === 1)
      .map((x) => x.id)
      .sort(),
    `${seed}:sites:1`,
  );
  s.discovery.level2Deck = shuffleWithSeed(
    sites
      .filter((x) => x.level === 2)
      .map((x) => x.id)
      .sort(),
    `${seed}:sites:2`,
  );
  s.discovery.guardianDeck = shuffleWithSeed(
    Object.values(c.guardians ?? {})
      .filter((x) => x.expansion === "Base Game")
      .map((x) => x.id)
      .sort(),
    `${seed}:guardians`,
  );
  s.discovery.idolDeck = shuffleWithSeed(
    Object.values(c.idols ?? {})
      .filter((x) => x.expansion === "Base Game")
      .map((x) => x.id)
      .sort(),
    `${seed}:idols`,
  );
}
function playCard(
  s: GameState,
  a: Extract<GameAction, { type: "PLAY_CARD" }>,
  c: EngineContext,
) {
  assertPlaying(s);
  assertCurrentPlayer(s, a.playerId);
  const p = assertPlayer(s, a.playerId);
  let i = p.hand.indexOf(a.cardId);
  if (i < 0) throw new Error("Card is not in the player hand");
  const card = c.cards[a.cardId];
  if (!card) throw new Error(`Unknown card: ${a.cardId}`);
  // Fear is a burden card, not a playable action. It can still be used as an
  // Artifact discard payment or removed by effects, but may never enter play
  // through the public PLAY_CARD command.
  if (card.type === "Fear") throw new Error("Fear cards cannot be played");
  const isMainAction = c.cardActionTiming?.[a.cardId] === 'main';
  if (isMainAction) assertMainActionAvailable(s, a.playerId);
  if (card.type === 'Artifact') {
    const paymentId = a.activationPaymentCardId;
    if (!paymentId) throw new Error('Playing an Artifact requires one discarded hand card');
    if (paymentId === a.cardId) throw new Error('Artifact activation payment must be another card');
    const paymentIndex = p.hand.indexOf(paymentId);
    if (paymentIndex < 0) throw new Error('Artifact activation payment card is not in hand');
    p.hand.splice(paymentIndex, 1);
    p.playedCards.push(paymentId);
    i = p.hand.indexOf(a.cardId);
  } else if (a.activationPaymentCardId) throw new Error('Only Artifacts require an activation payment card');
  p.hand.splice(i, 1);
  p.playedCards.push(a.cardId);
  applyCardEffects(s, a.playerId, getCardEffects(a.cardId, c), c, a.cardId);
  // A card can delegate its main action to one constrained, ordinary site
  // action.  The deferred action consumes it when that window resolves.
  const deferred=s.actionWindow?.playerId===a.playerId&&s.actionWindow.forcedSiteAction?.consumesMainAction===true;
  if (isMainAction&&!deferred) consumeMainAction(s, a.playerId);
}
function resolveSite(
  s: GameState,
  id: PlayerId,
  siteId: string,
  c: EngineContext,
) {
  const site = s.sites[siteId];
  // Camps are printed, fixed board spaces.  Unlike discovered locations they
  // have no drawn site tile, but use the same compact reward-code resolver.
  if (site.rewardCode) {
    resolveRewardCode(s, id, site.id, site.rewardCode, c);
    return;
  }
  if (!site.tileId) return;
  const d = c.sites?.[site.tileId];
  if (!d) throw new Error(`Unknown site tile: ${site.tileId}`);
  if (d.level !== site.level)
    throw new Error(`Site tile level mismatch: ${site.tileId}`);
  resolveRewardCode(s, id, site.tileId, d.rewardCode, c);
}
function takeIdol(
  s: GameState,
  id: PlayerId,
  faceUp: boolean,
  c: EngineContext,
) {
  const idolId = s.discovery.idolDeck.shift();
  if (!idolId) throw new Error("Idol deck is empty");
  const idol = c.idols?.[idolId];
  if (!idol) throw new Error(`Unknown idol: ${idolId}`);
  s.players[id].idols.push({ id: idolId, faceUp });
  if (faceUp) resolveRewardCode(s, id, idolId, idol.rewardCode, c);
}
function prepareWorkerForSiteAction(
  s: GameState,
  a: Extract<GameAction, { type: "PLACE_WORKER" | "DISCOVER_SITE" }>,
) {
  const p = assertPlayer(s, a.playerId);
  if (a.explorerMove) {
    const moved = explorerMoveArchaeologist(
      s,
      a.playerId,
      a.explorerMove.fromSiteId,
      a.siteId,
      a.explorerMove.snackId,
    );
    Object.assign(s, moved);
    return false;
  }
  if (p.availableWorkers < 1) throw new Error("No available worker");
  return true;
}
function discoverSite(
  s: GameState,
  a: Extract<GameAction, { type: "DISCOVER_SITE" }>,
  c: EngineContext,
) {
  assertPlaying(s);
  assertCurrentPlayer(s, a.playerId);
  let site = s.sites[a.siteId];
  if (!site) throw new Error(`Unknown site: ${a.siteId}`);
  if (site.blocked) throw new Error('Site is blocked for this player count');
  if (site.tileId) throw new Error("Site has already been discovered");
  if (site.occupiedBy) throw new Error("Site is occupied");
  payDiscardedHandCard(s,a.playerId,site.discardCardCost,a.discardCardId,'Site');
  const consumesWorker = prepareWorkerForSiteAction(s, a);
  site = s.sites[a.siteId];
  const deck =
    site.level === 1 ? s.discovery.level1Deck : s.discovery.level2Deck;
  if (!deck.length) throw new Error(`Level ${site.level} site deck is empty`);
  if (!s.discovery.guardianDeck.length)
    throw new Error("Guardian deck is empty");
  const idols = site.level === 2 ? 2 : 1;
  if (s.discovery.idolDeck.length < idols)
    throw new Error("Not enough idols to discover site");
  payTravel(s,a.playerId,discountedSiteTravelCost(s,a.playerId,site.travelCost??{}),a.paymentCardIds??[],c,'Site travel');
  const forced=forcedSiteAction(s,a.playerId,'discover');
  spendResource(s, a.playerId, "compass", Math.max(0,DISCOVERY_COMPASS_COST[site.level]-(s.players[a.playerId].nextDiscoveryCompassDiscount??0)-(forced?.discoveryCompassDiscount??0)));
  if (consumesWorker) s.players[a.playerId].availableWorkers -= 1;
  site.occupiedBy = a.playerId;
  takeIdol(s, a.playerId, true, c);
  if (site.level === 2) takeIdol(s, a.playerId, false, c);
  site.tileId = deck.shift()!;
  resolveSite(s, a.playerId, a.siteId, c);
  site.guardian = s.discovery.guardianDeck.shift()!;
  consumeSiteActionDiscount(s,a.playerId);
}
function buyCard(
  s: GameState,
  a: Extract<GameAction, { type: "BUY_CARD" }>,
  c: EngineContext,
) {
  assertPlaying(s);
  assertCurrentPlayer(s, a.playerId);
  const card = c.cards[a.cardId];
  if (!card) throw new Error(`Unknown card: ${a.cardId}`);
  if (card.type !== "Item" && card.type !== "Artifact")
    throw new Error("Card cannot be bought from the market");
  const row = card.type === "Item" ? s.market.items : s.market.artifacts,
    index = row.indexOf(a.cardId);
  if (index < 0) throw new Error("Card is not available in the market");
  const p=assertPlayer(s,a.playerId);
  const flexibleAltar=['3208','3209','3211'].includes(card.id);
  if(flexibleAltar){
    const cost=card.cost??0,payment=a.payment??{compass:Math.min(p.resources.compass,cost),coin:Math.max(0,cost-p.resources.compass)};
    const coin=payment.coin??0,compass=payment.compass??0;
    if(!Number.isInteger(coin)||!Number.isInteger(compass)||coin<0||compass<0||coin+compass!==cost)throw new Error('Tribute Altar requires an exact coin/compass payment split');
    spendResource(s,a.playerId,'coin',coin);spendResource(s,a.playerId,'compass',compass);
  }else spendResource(s,a.playerId,card.type === "Item" || p.boughtArtifactsWithCoinThisRound ? "coin" : "compass",card.cost ?? 0);
  row.splice(index, 1);
  const destination = leaderCardDestination(s, a.playerId, card);
  if (card.type==='Item'&&p.boughtItemsToDeckTopThisRound) p.deck.unshift(card.id);
  else if (destination === "hand") p.hand.push(card.id);
  else if (destination === "deck") p.deck.push(card.id);
  else p.playedCards.push(card.id);
  if (card.type === 'Artifact' && a.activateImmediately) applyCardEffects(s, a.playerId, getCardEffects(card.id, c), c, card.id);
  refillMarketSlot(s, card.type);
}
function advanceResearch(
  s: GameState,
  a: Extract<GameAction, { type: "ADVANCE_RESEARCH" }>,
  c: EngineContext,
) {
  assertPlaying(s);
  assertCurrentPlayer(s, a.playerId);
  const p = assertPlayer(s, a.playerId),
    d = c.researchTracks?.[s.research.board];
  if (!d)
    throw new Error(`Research track data required for ${s.research.board}`);
  if (a.toNodeId) {
    advanceResearchByNode(
      s,
      d,
      {
        playerId: a.playerId,
        token: a.track,
        toNodeId: a.toNodeId,
        paymentCardIds: a.paymentCardIds,
        discardCardId: a.discardCardId,
        bonusTileId: a.bonusTileId,
        costAlternativeIndex: a.costAlternativeIndex,
      },
      c,
    );
    return;
  }
  const amount = a.amount ?? 1;
  if (!Number.isInteger(amount) || amount < 1)
    throw new Error("Research amount must be positive");
  let pos = s.research[a.track][a.playerId],
    m = s.research.magnifying[a.playerId],
    j = s.research.journal[a.playerId];
  for (let step = 0; step < amount; step++) {
    pos = nextLegalResearchPosition(
      d,
      a.track,
      pos,
      m,
      j,
      p.rules.journalMaxLead,
    );
    if (a.track === "magnifying") m = pos;
    else j = pos;
  }
  s.research[a.track][a.playerId] = pos;
  if (a.track === "magnifying") p.researchMagnifying = pos;
  else p.researchJournal = pos;
}
function cleanupPlayerForNextRound(
  s: GameState,
  id: PlayerId,
  c: EngineContext,
) {
  const p = s.players[id];
  runLeaderRoundEnd(s, id, c);
  p.guardianFearImmuneThisRound = false;
  delete p.allTravelIconsArePlanesThisRound;
  delete p.boughtItemsToDeckTopThisRound;
  delete p.boughtArtifactsWithCoinThisRound;
  delete p.nextSiteActionPlaneDiscount;
  delete p.nextDiscoveryCompassDiscount;
  delete p.mustPassImmediately;
  delete p.mainActionUsed;
  delete p.extraMainActions;
  p.availableWorkers = p.workers;
  p.hasPassed = false;
  delete p.guardianDefeatRewardsThisRound;
  if (p.playedCards.length) {
    p.deck.push(
      ...shuffleWithSeed(
        p.playedCards,
        `${s.setupSeed ?? "default"}:round:${s.round}:cleanup:${id}`,
      ),
    );
    p.playedCards = [];
  }
  while (p.hand.length < 5 && p.deck.length) p.hand.push(p.deck.shift()!);
  if (p.leader?.id === "mystic") addFearToHand(s, id, c);
}
function resolveGuardianFear(s: GameState, c: EngineContext) {
  for (const site of Object.values(s.sites))
    if (site.guardian && site.occupiedBy && site.occupiedBy!==s.solo?.rivalPlayerId && !s.players[site.occupiedBy].guardianFearImmuneThisRound)
      addGuardianFear(s, site.occupiedBy, c);
  for (const guardian of lizardTrackGuardians(s)) {
    if (guardian.defeated) continue;
    for (const playerId of s.playerOrder) {
      if (playerId!==s.solo?.rivalPlayerId && !s.players[playerId].guardianFearImmuneThisRound && s.research.magnifyingNode[playerId] === guardian.nodeId)
        addGuardianFear(s, playerId, c);
      if (playerId!==s.solo?.rivalPlayerId && !s.players[playerId].guardianFearImmuneThisRound && s.research.journalNode[playerId] === guardian.nodeId)
        addGuardianFear(s, playerId, c);
    }
  }
}
function finishRound(s: GameState, c: EngineContext) {
  resolveGuardianFear(s, c);
  for (const id of s.playerOrder) cleanupPlayerForNextRound(s, id, c);
  for (const site of Object.values(s.sites)) delete site.occupiedBy;
  if (s.round >= MAX_ROUNDS) {
    s.phase = "finished";
    return;
  }
  advanceMarketToNextRound(s);
  if(s.solo) resetSoloRound(s);
  else { s.firstPlayer = rotateFirstPlayer(s); s.currentPlayer = s.firstPlayer; }
  for (const id of s.playerOrder) runLeaderRoundStart(s, id, c);
}
export function reduce(
  state: GameState,
  action: GameAction,
  context: EngineContext = EMPTY_CONTEXT,
): GameState {
  if(action.type!=='START_GAME'&&'playerId' in action)assertNoUnresolvedPendingChoice(state,action.playerId);
  const next = structuredClone(state);
  if(next.solo&&action.type!=='SOLO_RIVAL_ACTION'&&'playerId' in action&&action.playerId===next.solo.rivalPlayerId)
    throw new Error('The solo rival may act only by revealing its next action tile');
  switch (action.type) {
    case "START_GAME": {
      if (next.phase !== "setup") throw new Error("Game has already started");
      next.playerOrder.forEach((id, i) => {
        const r = STARTING_RESOURCES[i];
        next.players[id].resources.coin = r.coin;
        next.players[id].resources.compass = r.compass;
      });
      const seed = action.seed ?? "default";
      next.setupSeed = seed;
      next.enabledExpansions = [...new Set(action.marketExpansions ?? ['Base Game'])];
      next.moonStaff = action.moonStaff ?? 'blue';
      next.research.board = action.researchBoard ?? "bird";
      const start = researchStartNode(next.research.board);
      next.research.magnifyingNode = Object.fromEntries(
        next.playerOrder.map((id) => [id, start]),
      );
      next.research.journalNode = Object.fromEntries(
        next.playerOrder.map((id) => [id, start]),
      );
      setupDiscoveryDecks(next, context, seed);
      if (Object.keys(next.sites).length) setupAssignedSiteIdols(next);
      if (next.research.board === 'lizard') {
        const guardianId = next.discovery.guardianDeck.shift();
        if (guardianId) placeLizardTrackGuardian(next, { id: guardianId, nodeId: LIZARD_TRACK_GUARDIAN_NODE });
      }
      if (next.research.board === 'monkey' && Object.keys(context.cards).length) {
        setupMonkeyTrackArtifact(next, context, MONKEY_TRACK_ARTIFACT_NODE, seed);
      }
      const researchTrack = context.researchTracks?.[next.research.board];
      if (researchTrack) setupResearchBonusTiles(next, researchTrack, seed);
      if (context.assistants && Object.keys(context.assistants).length)
        next.assistants = prepareAssistantSupply(
          context.assistants,
          next.research.board,
          next.playerOrder.length,
          seed,
          next.enabledExpansions,
        );
      if (Object.keys(context.cards).length) {
        const setup = prepareBaseGameSetup(
          context,
          next.playerOrder.length,
          seed,
          action.marketExpansions ?? ['Base Game'],
        );
        next.market = setup.market;
        next.playerOrder.forEach((id, i) => {
          next.players[id].color = setup.playerDecks[i].color;
          next.players[id].hand = setup.playerDecks[i].hand;
          next.players[id].deck = setup.playerDecks[i].deck;
        });
      }
      for (const id of next.playerOrder) {
        const leader = action.leaders?.[id];
        if (leader) setupLeader(next, id, leader, context, seed);
      }
      for (const id of next.playerOrder) {
        if (next.players[id].leader?.id === "mystic")
          addFearToHand(next, id, context);
        runLeaderRoundStart(next, id, context);
      }
      next.phase = "playing";
      return next;
    }
    case 'SOLO_RIVAL_ACTION': {
      assertPlaying(next);
      if(!next.solo||action.playerId!==next.solo.rivalPlayerId) throw new Error('Only the solo rival may reveal a rival action');
      resolveSoloRivalAction(next,context);
      if(next.players[next.solo.humanPlayerId].hasPassed&&next.players[next.solo.rivalPlayerId].hasPassed) finishRound(next,context);
      return next;
    }
    case 'USE_IDOL':
      assertPlaying(next);
      assertCurrentPlayer(next, action.playerId);
      return useBaseIdol(next, action.playerId, action.idolId, action.effect);
    case 'BEGIN_SITE_ACTION_WINDOW':
      assertPlaying(next);
      assertCurrentPlayer(next, action.playerId);
      if(action.discoveryCompassDiscount!==undefined&&(!Number.isInteger(action.discoveryCompassDiscount)||action.discoveryCompassDiscount<0))throw new Error('Invalid discovery compass discount');
      return beginForcedSiteAction(next,action.playerId,{kind:action.kind,travelDiscount:action.travelDiscount,discoveryCompassDiscount:action.discoveryCompassDiscount,consumesMainAction:action.consumesMainAction});
    case "GAIN_RESOURCE":
      addResource(next, action.playerId, action.resource, action.amount);
      return next;
    case "SPEND_RESOURCE":
      spendResource(next, action.playerId, action.resource, action.amount);
      return next;
    case "ADVANCE_RESEARCH":
      assertMainActionAvailable(next, action.playerId);
      advanceResearch(next, action, context);
      consumeMainAction(next, action.playerId);
      return next;
    case 'CLAIM_TEMPLE_BONUS':
      assertPlaying(next);
      assertCurrentPlayer(next, action.playerId);
      claimTempleResearchBonus(next, action.playerId, action.tileId);
      return next;
    case 'BUY_TEMPLE_TILE':
      assertPlaying(next);
      assertCurrentPlayer(next, action.playerId);
      assertMainActionAvailable(next, action.playerId);
      buyTempleTile(next, action.playerId, action.tier, action.combination, context.researchTracks?.[next.research.board]);
      consumeMainAction(next, action.playerId);
      return next;
    case 'OVERCOME_GUARDIAN':
      assertPlaying(next);
      assertCurrentPlayer(next, action.playerId);
      assertMainActionAvailable(next, action.playerId);
      overcomeGuardian(next, action.playerId, action.siteId, context, action.paymentCardIds, action.discardCardId);
      consumeMainAction(next, action.playerId);
      return next;
    case 'OVERCOME_LIZARD_TRACK_GUARDIAN':
      assertPlaying(next);
      assertCurrentPlayer(next, action.playerId);
      assertMainActionAvailable(next, action.playerId);
      overcomeLizardTrackGuardian(next, action.playerId, context, action.paymentCardIds, action.discardCardId);
      consumeMainAction(next, action.playerId);
      return next;
    case 'ACTIVATE_GUARDIAN_BOON':
      assertPlaying(next);
      assertCurrentPlayer(next, action.playerId);
      return activateGuardianBoon(next, action.playerId, action.guardianId, context);
    case "PLAY_CARD":
      playCard(next, action, context);
      if(next.players[action.playerId].mustPassImmediately){delete next.players[action.playerId].mustPassImmediately;return reduce(next,{type:'PASS',playerId:action.playerId},context);}
      return next;
    case "ACTIVATE_ASSISTANT":
      { const assistant=next.players[action.playerId]?.assistants.find(candidate=>candidate.id===action.assistantId),effect=assistant?assistantEffectFor(next,assistant.id,assistant.level,context):undefined,isMain=effect?.freeAction===false;
      if (isMain) assertMainActionAvailable(next, action.playerId);
      const resolved=activateOwnedAssistant(
        next,
        action.playerId,
        action.assistantId,
        context,
      ); if (isMain) consumeMainAction(resolved, action.playerId); return resolved; }
    case "PLACE_WORKER": {
      assertPlaying(next);
      assertCurrentPlayer(next, action.playerId);
      const resolvedAction = { ...action, siteId: resolveBaseBoardPlacementSite(next.sites, action.siteId) };
      const forced=forcedSiteAction(next,action.playerId,'place');
      if(!forced||forced.consumesMainAction)assertMainActionAvailable(next, action.playerId);
      let site = next.sites[resolvedAction.siteId];
      if (!site) throw new Error(`Unknown site: ${resolvedAction.siteId}`);
      if (site.blocked) throw new Error('Site is blocked for this player count');
      if (site.occupiedBy) throw new Error("Site is occupied");
      // Camp 5's discard is a printed site cost. It must be paid before the
      // worker is placed and before its jewel reward can be collected.
      payDiscardedHandCard(next,resolvedAction.playerId,site.discardCardCost,resolvedAction.discardCardId,'Site');
      const consumesWorker = prepareWorkerForSiteAction(next, resolvedAction);
      site = next.sites[resolvedAction.siteId];
      payTravel(next,resolvedAction.playerId,discountedSiteTravelCost(next,resolvedAction.playerId,site.travelCost??{}),resolvedAction.paymentCardIds??[],context,'Site travel');
      if (consumesWorker) next.players[action.playerId].availableWorkers -= 1;
      site.occupiedBy = action.playerId;
      resolveSite(next, action.playerId, resolvedAction.siteId, context);
      consumeSiteActionDiscount(next,action.playerId);
      finishSiteAction(next,action.playerId,forced);
      return next;
    }
    case "DISCOVER_SITE": {
      const forced=forcedSiteAction(next,action.playerId,'discover');
      if(!forced||forced.consumesMainAction)assertMainActionAvailable(next, action.playerId);
      discoverSite(next, action, context);
      finishSiteAction(next,action.playerId,forced);
      return next;
    }
    case "BUY_CARD":
      assertMainActionAvailable(next, action.playerId);
      buyCard(next, action, context);
      consumeMainAction(next, action.playerId);
      return next;
    case "LEADER_CAPTAIN_SPECIALIST":
      assertPlaying(next);
      assertCurrentPlayer(next, action.playerId);
      assertMainActionAvailable(next, action.playerId);
      consumeMainAction(next, action.playerId);
      return captainCallSpecialist(next, action.playerId, action.stackIndex);
    case "LEADER_USE_IDOL": {
      assertPlaying(next);
      assertCurrentPlayer(next, action.playerId);
      const leaderId = next.players[action.playerId]?.leader?.id;
      if (!leaderId) throw new Error('Leader idol action requires an Expedition Leader');
      const timing = leaderIdolActionTiming(leaderId, action.effect);
      if (timing === 'main') assertMainActionAvailable(next, action.playerId);
      const resolved = useLeaderIdol(next, action.playerId, action.idolId, action.slotIndex, action.effect, context, { snackId: action.snackId });
      if (timing === 'main') consumeMainAction(resolved, action.playerId);
      return resolved;
    }
    case "LEADER_FALCONER_RETURN_EAGLE":
      assertPlaying(next);
      assertCurrentPlayer(next, action.playerId);
      return falconerReturnEagle(next, action.playerId, action.rewardPosition);
    case "LEADER_PROFESSOR_BUY_ARCHIVE":
      assertPlaying(next);
      assertCurrentPlayer(next, action.playerId);
      return professorBuyArchiveArtifact(
        next,
        action.playerId,
        action.cardId,
        context,
        action.suitcaseCompass ?? 0,
      );
    case "LEADER_EXPLORER_SPEND_SNACK":
      assertPlaying(next);
      assertCurrentPlayer(next, action.playerId);
      return explorerSpendSnack(
        next,
        action.playerId,
        action.snackId,
        action.siteId,
      );
    case "LEADER_MYSTIC_RITUAL":
      assertPlaying(next);
      assertCurrentPlayer(next, action.playerId);
      assertMainActionAvailable(next, action.playerId);
      consumeMainAction(next, action.playerId);
      return mysticPerformRitual(next, action.playerId, action.fearCount);
    case "END_TURN": {
      assertPlaying(next);
      assertCurrentPlayer(next, action.playerId);
      if (!next.players[action.playerId].mainActionUsed) throw new Error('Take a main action or PASS instead of ending the turn');
      delete next.players[action.playerId].mainActionUsed;
      delete next.players[action.playerId].extraMainActions;
      const following = nextActivePlayer(next, action.playerId);
      if (!following)
        throw new Error(
          "All players have passed; round should already be finished",
        );
      next.currentPlayer = following;
      return next;
    }
    case "PASS": {
      assertPlaying(next);
      assertCurrentPlayer(next, action.playerId);
      const player=next.players[action.playerId];
      player.hasPassed = true;
      const following = nextActivePlayer(next, action.playerId);
      if (following) next.currentPlayer = following;
      else finishRound(next, context);
      return next;
    }
  }
}
