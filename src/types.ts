export type PlayerId = string;
export type SoloRivalActionKind = 'dig'|'discover'|'research'|'overcome'|'buy-item'|'buy-artifact';
export type SoloRivalTileId = string;
export interface SoloRivalState {
  /** The normal player and the synthetic rival are both kept in GameState so
   * occupancy, the market, and the research race use one authoritative board. */
  humanPlayerId: PlayerId;
  rivalPlayerId: PlayerId;
  difficulty: number;
  actionDeck: SoloRivalTileId[];
  usedActionTiles: SoloRivalTileId[];
  lastAction?: { tileId: SoloRivalTileId; description: string; resolved: boolean };
}
export type CardId = string;
export type PlayerColor = 'Yellow' | 'Green' | 'Blue' | 'Red';
export type Resource = 'tablet' | 'arrowhead' | 'jewel' | 'coin' | 'compass' | 'fear';
export type SpendableResource = Exclude<Resource, 'fear'>;
export type ResourceCost = Partial<Record<SpendableResource, number>>;
export type CardType = 'Item' | 'Artifact' | 'Fear' | 'Starter' | 'Other';
export type TravelIcon = 'boot' | 'car' | 'boat' | 'plane';
export type TravelCost = Partial<Record<TravelIcon, number>>;
export type ResearchCost = ResourceCost & { usableIdol?: number; travel?: TravelCost; discardCard?: number };
export type ResearchBoardId = 'bird' | 'snake' | 'monkey' | 'lizard' | string;
export type ResearchToken = 'magnifying' | 'journal';
export type AssistantLevel = 'silver' | 'gold';
export type AssistantEffect =
 | { type:'GAIN_RESOURCES'; resources:ResourceCost; freeAction?:boolean }
 | { type:'GAIN_FEAR_CARD'; amount:number; freeAction?:boolean }
 | { type:'GAIN_TRAVEL'; travel:TravelCost; freeAction?:boolean }
 | { type:'DRAW_CARD'; amount:number; freeAction?:boolean }
 | { type:'CHOOSE'; options:AssistantEffect[]; freeAction?:boolean }
 | { type:'SEQUENCE'; effects:AssistantEffect[]; freeAction?:boolean }
 | { type:'PAY_RESOURCE_CHOOSE'; cost:ResourceCost; options:AssistantEffect[]; freeAction?:boolean }
 | { type:'PAY_TRAVEL_GAIN'; cost:TravelCost; gain:ResourceCost; freeAction?:boolean }
 | { type:'UPGRADE_RESOURCE'; freeAction?:boolean }
 | { type:'DRAW_THEN_DISCARD'; draw:number; discard:number; freeAction?:boolean }
 | { type:'EXILE_OWN_CARD'; max:number; freeAction?:boolean }
 | { type:'BUY_WITH_DISCOUNT'; itemDiscount:number; artifactDiscount:number; freeAction?:boolean };
export interface AssistantEffectLevels { silver:AssistantEffect; gold:AssistantEffect; }
export type ResearchNodeId = string;
export type ResearchBridgeId = string;
export type LeaderId = 'captain'|'falconer'|'baroness'|'professor'|'explorer'|'mystic'|string;
export type ExplorerSnackId = 'free'|'coin'|'compass';
export interface ExplorerMoveSpec { fromSiteId:string; snackId:ExplorerSnackId; }

export interface Resources { tablet:number; arrowhead:number; jewel:number; coin:number; compass:number; fear:number; }
export interface PlayerRules { journalMaxLead:number; }
export type CardEffectCounter = 'IDOLS'|'OCCUPIED_WORKERS'|'GUARDIAN_TOTAL'|'FEAR_IN_HAND_AND_PLAY';
/**
 * Card effect primitives.  The guardian pair models the new reusable visual
 * language used by later content: a guardian can be readied again, or one of
 * the guardians you defeated can be spent as a printed cost (and therefore no
 * longer scores or supplies a boon).
 */
export type CardEffect = { type:'GAIN_RESOURCE'; resource:Resource; amount:number } | { type:'GAIN_RESOURCE_PER'; resource:Resource; counter:CardEffectCounter; max?:number } | { type:'UPGRADE_RESOURCE_PER'; counter:CardEffectCounter; max?:number } | { type:'GAIN_TRAVEL'; travel:TravelCost } | { type:'DRAW_CARD'; amount:number } | { type:'DRAW_FROM_BOTTOM'; amount:number } | { type:'DRAW_BOTTOM_THEN_KEEP'; maximum:number } | { type:'DRAW_THEN_KEEP_AND_OPTIONAL_TOP'; maximum:number } | { type:'DRAW_TOP_PROCESS'; kind:'first-aid'|'rod-of-division' } | { type:'GAIN_FEAR_CARD'; amount:number } | { type:'IGNORE_GUARDIAN_FEAR_THIS_ROUND' } | { type:'GAIN_ON_OVERCOME_GUARDIAN_THIS_ROUND'; gain:ResourceCost } | { type:'USE_STANDARD_IDOL_SLOT_EFFECT' } | { type:'EXILE_SLOTTED_IDOL'; gain:ResourceCost } | { type:'PASS_IMMEDIATELY_GAIN'; gain:ResourceCost } | { type:'GAIN_EXTRA_MAIN_ACTION' } | { type:'SEQUENCE'; effects:CardEffect[] } | { type:'CHOOSE_ONE'; options:CardEffect[] } | { type:'CHOOSE_DISTINCT'; count: number; options:CardEffect[] } | { type:'EXILE_SELF' } | { type:'EXILE_OWN_CARD'; effects?:CardEffect[] } | { type:'RETURN_SLOTTED_IDOL' } | { type:'RETURN_OCCUPIED_WORKER_THEN'; effects:CardEffect[] } | { type:'ALL_TRAVEL_ICONS_ARE_PLANES_THIS_ROUND' } | { type:'REDUCE_NEXT_SITE_ACTION_COST'; plane:number; discoveryCompass?:number } | { type:'ACTIVATE_TENT_SITE'; requireEmpty:boolean } | { type:'ACTIVATE_TENT_SITES'; count:number; requireEmpty:boolean } | { type:'ACTIVATE_OWN_OCCUPIED_SITE'; level2CompassCost?:number } | { type:'ACTIVATE_OCCUPIED_SITE'; level?:1|2 } | { type:'ACTIVATE_OTHER_PLAYER_OCCUPIED_SITE'; level?:1|2 } | { type:'ACTIVATE_UNOCCUPIED_SITE'; level?:1|2 } | { type:'ACTIVATE_SITE_IN_ROW_ABOVE_OWN_WORKER'; fearIfLevel2?:number } | { type:'ACTIVATE_LEVEL1_SITE_IN_ROW_WITH_OWN_WORKER' } | { type:'SWAP_SITE_TILES_THEN_ACTIVATE' } | { type:'ACTIVATE_ANY_GOLD_ASSISTANT' } | { type:'MOVE_OCCUPIED_WORKER_THEN_ACTIVATE'; sourceLevel?:1|2; destination:'tent'|'tent-or-level1'|'level1'|'level2'|'level1-or-level2'; activations:1|2 } | { type:'MOVE_GUARDIAN_FROM_OWN_SITE_THEN_ACTIVATE'; destination:'tent-or-level1' } | { type:'FREE_RESEARCH'; token:ResearchToken } | { type:'RESEARCH_DISCOUNT'; discount:ResourceCost } | { type:'RESEARCH_ANY_DISCOUNT_THEN'; discount:ResourceCost; magnifyingEffects:CardEffect[]; journalEffects:CardEffect[] } | { type:'PAY_RESOURCE_THEN'; cost:ResourceCost; effects:CardEffect[] } | { type:'PAY_ANY_RESOURCES_THEN'; resources:SpendableResource[]; amount:number; effects:CardEffect[] } | { type:'DISCARD_ONE_THEN'; effects:CardEffect[] } | { type:'UPGRADE_RESOURCE_THEN'; effects:CardEffect[] } | { type:'REFRESH_ASSISTANTS_THEN'; amount:number; effects:CardEffect[] } | { type:'REFRESH_GUARDIAN_BOON' } | { type:'SPEND_DEFEATED_GUARDIAN_THEN'; effects:CardEffect[] } | { type:'ACTIVATE_AVAILABLE_ASSISTANT'; level:AssistantLevel } | { type:'CLAIM_AVAILABLE_SILVER_ASSISTANT' } | { type:'UPGRADE_OWN_SILVER_ASSISTANT' } | { type:'ACTIVATE_OWN_ASSISTANTS'; levels:AssistantLevel[] } | { type:'ACQUIRE_MARKET_ITEM'; destination:'hand'|'deck-top' } | { type:'EXILE_RIGHTMOST_ITEM_GAIN_EXILED_ITEM' } | { type:'EXILE_MARKET_CARD_REFILL'; row:'item'|'artifact'|'either'; optional?:boolean; itemGain?:ResourceCost; artifactGain?:ResourceCost } | { type:'BUY_ARTIFACT_WITH_DISCOUNT_THEN_EXILE'; discount:number } | { type:'USE_MARKET_ITEM_EFFECT' } | { type:'BUY_ARTIFACT_WITH_DISCOUNT_TO_HAND'; discount:number } | { type:'EXCHANGE_ASSISTANT_WITH_AVAILABLE' } | { type:'ACTIVATE_TOP_SITE_DECK'; level:1|2 } | { type:'BUY_ITEM'; discount:number; includeTop?:boolean } | { type:'BUY_ARTIFACT'; discount:number; includeTop?:boolean } | { type:'OVERCOME_GUARDIAN_FREE'; lizardTrackAllowed?:true|'uncontested'; requiresOwnArchaeologist?:boolean } | { type:'ACTIVATE_DISCOVERED_LEVEL1_SITE' } | { type:'ACTIVATE_DEFEATED_GUARDIAN_BOON' } | { type:'BUY_WITH_DISCOUNT'; itemDiscount:number; artifactDiscount:number } | { type:'BEGIN_SITE_ACTION_WINDOW'; kind:'place'|'discover'; travelDiscount?:TravelCost; discoveryCompassDiscount?:number; consumesMainAction:boolean } | { type:'PUT_BOUGHT_ITEMS_ON_DECK_TOP_THIS_ROUND' } | { type:'BUY_ARTIFACTS_WITH_COIN_THIS_ROUND' } | { type:'PLACE_ARROWHEAD_ON_JOURNAL' } | { type:'IF_NO_OTHER_PLAYED_CARDS'; ifTrue:CardEffect[]; otherwise:CardEffect[] } | { type:'IF_NO_FEAR_IN_PLAY'; effects:CardEffect[] } | { type:'EFFECT_BY_ROUND'; effects:CardEffect[][] } | { type:'RETURN_FEAR_FROM_PLAY_TO_HAND' } | { type:'CHOOSE_ONE_BY_OTHER_PLAYED_COUNT'; options:{minimum:number; effect:CardEffect}[] } | { type:'CHOOSE_DISTINCT_BY_MAGNIFYING_ROWS'; thresholds:number[]; options:CardEffect[] } | { type:'PAY_RESOURCE_GAIN'; cost:ResourceCost; gain:ResourceCost };
export type ResearchReward =
 | { type:'GAIN_RESOURCE'; resource:Resource; amount:number }
 | { type:'DRAW_CARD'; amount:number }
 | { type:'GAIN_FEAR_CARD'; amount:number }
 | { type:'EXILE_OWN_CARD' }
 | { type:'CLAIM_ASSISTANT'; level:'silver' }
 | { type:'CLAIM_SNAKE_RESCUE_ASSISTANT' }
 | { type:'UPGRADE_ASSISTANT'; level:'gold' }
 | { type:'UPGRADE_AND_REFRESH_ASSISTANT'; level:'gold' }
 | { type:'REFRESH_ASSISTANT' }
 | { type:'REFRESH_ASSISTANTS'; amount:number|'all' }
 | { type:'BUY_ARTIFACT_WITH_DISCOUNT'; discount:number }
 | { type:'BURN_UNOCCUPIED_LEVEL1_SITE_REFILL_IDOL' }
 | { type:'ACQUIRE_ARTIFACT_FREE'; filter?:Record<string,unknown> }
 | { type:'ACTIVATE_DISCOVERED_LEVEL1_SITE' }
 | { type:'ACTIVATE_VISIBLE_SILVER_ASSISTANT_THEN_BOTTOM' }
 | { type:'OVERCOME_GUARDIAN_FREE' }
 | { type:'BONUS_TILE'; slot?:string }
 | { type:'SEQUENCE'; rewards:ResearchReward[] }
 | { type:'CHOOSE'; count:number; options:ResearchReward[] }
 | { type:'TEMPLE_SPECIAL'; code:string; data?:Record<string,unknown> }
 | { type:string; [key:string]:unknown };
export interface SpriteImage { faceUrl:string; backUrl?:string; sheetWidth?:number; sheetHeight?:number; cardIndex?:number; }
export interface AssistantImage { silverUrl:string; goldUrl:string; sheetWidth:number; sheetHeight:number; cardIndex:number; uniqueBack:boolean; }
export interface CardDefinition { id:CardId; name:string; type:CardType; expansion:string; color?:string; cost?:number; points?:number; travel?:TravelCost; image?:SpriteImage; }
export interface SiteDefinition { id:string; level:1|2; rewardCode:string; expansion:string; image?:SpriteImage; }
export interface IdolDefinition { id:string; rewardCode:string; expansion:string; image?:SpriteImage; }
/** Printed guardian costs can combine resources and travel icons. */
export type GuardianCost = ResourceCost & { travel?:TravelCost; discardCard?:number };
/** A guardian boon is a once-per-game free action, used after the guardian is defeated. */
export type GuardianBoon = Extract<AssistantEffect,{type:'GAIN_TRAVEL'|'EXILE_OWN_CARD'|'DRAW_CARD'|'UPGRADE_RESOURCE'}>;
export interface GuardianDefinition { id:string; expansion:string; cost?:GuardianCost; boon?:GuardianBoon; image?:SpriteImage; }
export interface AssistantDefinition { id:string; expansion:string; image:AssistantImage; }
export interface ResearchNodeRewardDefinition { token?:ResearchToken; rewards:ResearchReward[]; verified:boolean; }
export interface ResearchNodeDefinition { id:ResearchNodeId; rowIndex:number; pathIndex:number; researchLevel:number; spansLevels?:number[]; rewards?:ResearchNodeRewardDefinition[]; metadata?:Record<string,unknown>; }
/** A bridge can have one printed cost plus one or more mutually-exclusive printed alternatives. */
export interface ResearchBridgeDefinition { id:ResearchBridgeId; from:ResearchNodeId; to:ResearchNodeId; cost?:ResearchCost; alternativeCosts?:ResearchCost[]; rewards?:ResearchReward[]; verified?:boolean; allowedTokens?:ResearchToken[]; metadata?:Record<string,unknown>; }
export interface ResearchRowDefinition { magnifyingPoints:number; journalPoints:number; grantsAssistant:boolean; nodes?:ResearchNodeDefinition[]; }
export interface ResearchTrackDefinition { id:ResearchBoardId; name:string; rows:ResearchRowDefinition[]; bridges?:ResearchBridgeDefinition[]; templeArrivalPoints?: [number, number, number, number]; metadata?:Record<string,unknown>; }
export interface ResearchManualNodeOverride { node:ResearchNodeId; researchLevel?:number; spansLevels?:number[]; verified:boolean; comment?:string; }
export interface ResearchManualNodeReward { node?:ResearchNodeId; row?:string; token?:ResearchToken; rewards:ResearchReward[]; verified:boolean; comment?:string; }
export interface ResearchManualBridge { from:ResearchNodeId; to:ResearchNodeId; cost:ResearchCost; alternativeCosts?:ResearchCost[]; allowedTokens?:ResearchToken[]; verified:boolean; comment?:string; }
export interface ResearchManualBoardData { bridges:ResearchManualBridge[]; nodeOverrides?:ResearchManualNodeOverride[]; templeArrivalPoints?: [number, number, number, number]; }
export interface ResearchManualData { $schemaVersion:1|2|3; boards:Partial<Record<ResearchBoardId, ResearchManualBoardData>>; }
export interface ResearchRewardsManualBoardData { nodeRewards:ResearchManualNodeReward[]; }
export interface ResearchRewardsManualData { $schemaVersion:1|2; boards:Partial<Record<ResearchBoardId, ResearchRewardsManualBoardData>>; }
export interface PendingReward { playerId:PlayerId; sourceId:string; code:string; payload?:unknown; }
export interface PlayerIdol { id:string; faceUp:boolean; inSlot?:boolean; slotIndex?:number; }
export interface PlayerAssistant { id:string; level:AssistantLevel; exhausted:boolean; }
export interface PlayerLeaderState { id:LeaderId; data:Record<string,unknown>; }
export interface PlayerState { id:PlayerId; name:string; color:PlayerColor; rules:PlayerRules; resources:Resources; workers:number; availableWorkers:number; hasPassed:boolean; /** Set after this player resolves their one main action, and cleared when their turn ends. */ mainActionUsed?:boolean; /** Extra main actions granted for the current turn. */ extraMainActions?:number; researchMagnifying:number; researchJournal:number; deck:CardId[]; hand:CardId[]; discard:CardId[]; playedCards:CardId[]; idols:PlayerIdol[]; assistants:PlayerAssistant[]; defeatedGuardians:string[]; usedGuardianBoons:string[]; templeTiles:number[]; /** Cleared at round cleanup after guardian Fear is evaluated. */ guardianFearImmuneThisRound?:boolean; /** Resource bundles triggered once for every guardian overcome this round. */ guardianDefeatRewardsThisRound?:ResourceCost[]; /** Treat every travel icon this player supplies as a plane for the rest of this round. */ allTravelIconsArePlanesThisRound?:boolean; /** Landing Net: purchased Items are placed on deck top this round. */ boughtItemsToDeckTopThisRound?:boolean; /** Golden Wing: Artifacts use coin rather than compass this round. */ boughtArtifactsWithCoinThisRound?:boolean; /** Arrowheads physically placed on the Journal by Obsidian Feathers. */ journalArrowheads?:number; /** One pending action discount from an effect such as Aeroplane or Hot Air Balloon. */ nextSiteActionPlaneDiscount?:number; nextDiscoveryCompassDiscount?:number; /** Internal marker: settle this card effect by immediately passing its owner. */ mustPassImmediately?:boolean; leader?:PlayerLeaderState; }
export interface SiteState { id:string; level:1|2; /** Printed vertical map row; rows increase away from the camp. This is game topology, not a UI coordinate. */ mapRow?:number; /** Each printed tent space is represented independently, allowing its normal occupancy rule. */ isTentSite?:boolean; /** Fixed base-board reward code for a tent/action space. */ rewardCode?:string; discardCardCost?:number; /** A player-count setup blocker occupies this printed space. */ blocked?:boolean; tileId?:string; occupiedBy?:PlayerId; guardian?:string; idolSlots:number; travelCost?:TravelCost; faceUpIdolId?:string; faceDownIdolIds?:string[]; }
export interface DiscoveryState { level1Deck:string[]; level2Deck:string[]; guardianDeck:string[]; idolDeck:string[]; }
export interface AssistantSupplyState { stacks:string[][]; specialStack:string[]; }
export type MoonStaffVariant = 'blue' | 'red';
export interface MarketState { items:CardId[]; artifacts:CardId[]; itemDeck:CardId[]; artifactDeck:CardId[]; exiled:CardId[]; }
export interface TempleTileSupply {
  bronze:number;
  /** Total remaining 6-point tiles, retained for the existing UI. */
  silver:number;
  /** The two physical 6-point stacks. Their identity matters to the solo rival
   * and to the two distinct printed cost combinations. */
  silverLeft:number;
  silverRight:number;
  gold:number;
}
export interface ResearchState { board:ResearchBoardId; magnifying:Record<PlayerId,number>; journal:Record<PlayerId,number>; magnifyingNode:Record<PlayerId,ResearchNodeId>; journalNode:Record<PlayerId,ResearchNodeId>; templeArrivals:PlayerId[]; templeArrivalPoints:Record<PlayerId,number>; /** Face-up bonus tiles keyed by their research-space node. A node can retain multiple physical slots. */ bonusTiles:Record<ResearchNodeId,string[]>; /** Face-down Lost Temple bonus tiles; only the arriving player may inspect this list. */ templeBonusTiles:string[]; /** Claimed bonus tile ids, retained for replay/audit only. */ claimedBonusTiles:string[]; templeData?:Record<string,unknown>; }
/** A temporary, typed modifier around an ordinary public action.  It never
 * reimplements the action: PLACE_WORKER / DISCOVER_SITE remain authoritative. */
export interface ActionWindowState { playerId:PlayerId; temporaryTravel:TravelCost; forcedSiteAction?:{ kind:'place'|'discover'; travelDiscount?:TravelCost; discoveryCompassDiscount?:number; consumesMainAction:boolean; }; }
export interface GameState { version:1; phase:'setup'|'playing'|'finished'; round:number; moonStaff:MoonStaffVariant; setupSeed?:string; /** Setup expansions that alter non-market content, including assistant supply/effects. */ enabledExpansions?:string[]; firstPlayer:PlayerId; currentPlayer:PlayerId; players:Record<PlayerId,PlayerState>; playerOrder:PlayerId[]; sites:Record<string,SiteState>; discovery:DiscoveryState; assistants:AssistantSupplyState; market:MarketState; templeTiles:TempleTileSupply; research:ResearchState; pendingRewards:PendingReward[]; actionWindow?:ActionWindowState; solo?:SoloRivalState; }
export type ActionTiming = 'main'|'free';
export interface EngineContext { cards:Record<CardId,CardDefinition>; cardEffects?:Record<CardId,CardEffect[]>; /** Audited printed timing for a card effect; omitted entries remain under review. */ cardActionTiming?:Partial<Record<CardId,ActionTiming>>; sites?:Record<string,SiteDefinition>; idols?:Record<string,IdolDefinition>; guardians?:Record<string,GuardianDefinition>; assistants?:Record<string,AssistantDefinition>; assistantEffects?:Record<string,AssistantEffectLevels>; researchTracks?:Partial<Record<ResearchBoardId,ResearchTrackDefinition>>; }
export type GameAction =
 /** `marketExpansions` contains only shared market sets. Expedition Leaders
  * cards are leader-owned starters and are intentionally never a market pool. */
 | { type:'START_GAME'; seed?:string; researchBoard?:ResearchBoardId; moonStaff?:MoonStaffVariant; leaders?:Partial<Record<PlayerId,LeaderId>>; marketExpansions?:string[] }
 | { type:'SOLO_RIVAL_ACTION'; playerId:PlayerId }
 | { type:'USE_IDOL'; playerId:PlayerId; idolId:CardId; effect:'coinToJewel'|'tablets'|'arrowhead'|'coinCompass'|'draw' }
 | { type:'END_TURN'; playerId:PlayerId }
 | { type:'PASS'; playerId:PlayerId }
 | { type:'PLAY_CARD'; playerId:PlayerId; cardId:CardId; activationPaymentCardId?:CardId }
 | { type:'PLACE_WORKER'; playerId:PlayerId; siteId:string; paymentCardIds?:CardId[]; discardCardId?:CardId; explorerMove?:ExplorerMoveSpec }
 | { type:'DISCOVER_SITE'; playerId:PlayerId; siteId:string; paymentCardIds?:CardId[]; discardCardId?:CardId; explorerMove?:ExplorerMoveSpec }
 | { type:'BEGIN_SITE_ACTION_WINDOW'; playerId:PlayerId; kind:'place'|'discover'; travelDiscount?:TravelCost; discoveryCompassDiscount?:number; consumesMainAction:boolean }
 | { type:'GAIN_RESOURCE'; playerId:PlayerId; resource:Resource; amount:number }
 | { type:'SPEND_RESOURCE'; playerId:PlayerId; resource:Resource; amount:number }
 | { type:'ADVANCE_RESEARCH'; playerId:PlayerId; track:ResearchToken; toNodeId?:ResearchNodeId; amount?:number; paymentCardIds?:CardId[]; discardCardId?:CardId; bonusTileId?:string; /** Zero-based selected printed bridge cost. Defaults to the primary cost. */ costAlternativeIndex?:number }
 | { type:'CLAIM_TEMPLE_BONUS'; playerId:PlayerId; tileId:string }
 | { type:'BUY_TEMPLE_TILE'; playerId:PlayerId; tier:'bronze'|'silver'|'gold'; combination?:0|1|2 }
  | { type:'OVERCOME_GUARDIAN'; playerId:PlayerId; siteId:string; paymentCardIds?:CardId[]; discardCardId?:CardId }
  | { type:'OVERCOME_LIZARD_TRACK_GUARDIAN'; playerId:PlayerId; paymentCardIds?:CardId[]; discardCardId?:CardId }
 | { type:'ACTIVATE_GUARDIAN_BOON'; playerId:PlayerId; guardianId:string }
 | { type:'CLAIM_ASSISTANT'; playerId:PlayerId; stackIndex:number }
 | { type:'UPGRADE_ASSISTANT'; playerId:PlayerId; assistantId:string }
 | { type:'EXHAUST_ASSISTANT'; playerId:PlayerId; assistantId:string }
 | { type:'ACTIVATE_ASSISTANT'; playerId:PlayerId; assistantId:string }
 | { type:'REFRESH_ASSISTANT'; playerId:PlayerId; assistantId:string }
 | { type:'BUY_CARD'; playerId:PlayerId; cardId:CardId; activateImmediately?:boolean; payment?:Partial<Pick<Resources,'coin'|'compass'>> }
 | { type:'LEADER_USE_IDOL'; playerId:PlayerId; idolId:CardId; slotIndex:number; effect:'coinToJewel'|'arrowhead'|'tablets'|'coinCompass'|'draw'|'leaderUnique'|'mysticExileArrowhead'|'mysticExileRitual'; snackId?:ExplorerSnackId }
 | { type:'LEADER_CAPTAIN_SPECIALIST'; playerId:PlayerId; stackIndex:number }
 | { type:'LEADER_FALCONER_RETURN_EAGLE'; playerId:PlayerId; rewardPosition:number }
 | { type:'LEADER_PROFESSOR_BUY_ARCHIVE'; playerId:PlayerId; cardId:CardId; suitcaseCompass?:number }
 | { type:'LEADER_EXPLORER_SPEND_SNACK'; playerId:PlayerId; snackId:ExplorerSnackId; siteId:string }
 | { type:'LEADER_MYSTIC_RITUAL'; playerId:PlayerId; fearCount:2|3|4 };
