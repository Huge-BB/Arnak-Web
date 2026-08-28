import { expansionEffectPresets } from './expansion-effect-presets.ts';
import type { ActionTiming, CardEffect } from './types.ts';

/**
 * Card effects transcribed from the local TTS card faces.  Keep this separate
 * from the base manual so expansion coverage can be audited card by card.
 * IDs are the source's 3xxx identifiers.
 */
export const surpriseShipmentEffects: Record<string, CardEffect[]> = {
  // Buggy: free action, gain one car icon and one compass.
  '3101': [{ type:'SEQUENCE', effects:[{ type:'GAIN_TRAVEL', travel:{car:1} },{ type:'GAIN_RESOURCE', resource:'compass', amount:1 }] }],
  // Crossbow: choose arrowhead or compass for every guardian at your sites or
  // in your defeated collection, up to three.
  '3103': [{ type:'CHOOSE_ONE', options:[
    { type:'GAIN_RESOURCE_PER', resource:'arrowhead', counter:'GUARDIAN_TOTAL', max:3 },
    { type:'GAIN_RESOURCE_PER', resource:'compass', counter:'GUARDIAN_TOTAL', max:3 },
  ] }],
  '3104': [{ type:'GAIN_RESOURCE', resource:'arrowhead', amount:1 }],
  '3106': [{ type:'SEQUENCE', effects:[{ type:'GAIN_TRAVEL', travel:{plane:1} },{ type:'GAIN_RESOURCE', resource:'compass', amount:1 }] }],
  '3107': [{ type:'SEQUENCE', effects:[{ type:'GAIN_RESOURCE', resource:'arrowhead', amount:1 },{ type:'GAIN_RESOURCE', resource:'coin', amount:1 }] }],
  // Idol Research currently shares the five universal player-board effects.
  // Leader-specific blue slots are dispatched through the leader idol module
  // and are added alongside this primitive below.
  '3108': [{ type:'USE_STANDARD_IDOL_SLOT_EFFECT' }],
  // Llama: gain one coin, draw one card, then upgrade one resource.
  '3110': [{ type:'SEQUENCE', effects:[{ type:'GAIN_RESOURCE', resource:'coin', amount:1 }, { type:'DRAW_CARD', amount:1 }, { type:'UPGRADE_RESOURCE_THEN', effects:[] }] }],
  // Metal Detector: choose its lightning three-coin payout or the printed
  // two-compass Artifact discount.
  '3111': [{ type:'CHOOSE_ONE', options:[{ type:'GAIN_RESOURCE', resource:'coin', amount:3 }, { type:'BUY_WITH_DISCOUNT', itemDiscount:0, artifactDiscount:2 }] }],
  // Surveyor's Set delegates this card's main action to the normal discovery
  // reducer, retaining all ordinary worker, idol, guardian and reward rules.
  '3119': [{ type:'BEGIN_SITE_ACTION_WINDOW', kind:'discover', discoveryCompassDiscount:2, consumesMainAction:true }],
  '3118': [{ type:'SEQUENCE', effects:[{ type:'GAIN_RESOURCE', resource:'compass', amount:1 }, { type:'GAIN_RESOURCE', resource:'tablet', amount:1 }] }],
  // Shipping Crate: buy one visible Item two coins cheaper and put it on the
  // top of the deck.  The pre-existing purchase resolver handles payment,
  // refill, and the delayed card draw normally.
  '3116': [{ type:'BUY_ITEM_DISCOUNT_INCLUDE_TOP', discount:2 }],
  // Mirror Stone: activate any occupied discovered site, regardless of level.
  '3212': [{ type:'ACTIVATE_OCCUPIED_SITE' }],
  // Ominous Chalice: its ordinary effect is coin then one resource upgrade;
  // the separate exile penalty is handled by resolveOwnedCardExile.
  '3214': [{ type:'SEQUENCE', effects:[{ type:'GAIN_RESOURCE', resource:'coin', amount:1 }, { type:'UPGRADE_RESOURCE_THEN', effects:[] }] }],
  // Ominous Warpaint: activate one of your defeated guardian boons; its exile
  // penalty (two Fear to hand) remains centralized in resolveOwnedCardExile.
  '3216': [{ type:'ACTIVATE_DEFEATED_GUARDIAN_BOON' }],
  // Totem of Trade upgrades twice; the second upgrade is deliberately chained
  // after the first selection so it may use the resource just created.
  '3225': [{ type:'UPGRADE_RESOURCE_THEN', effects:[{ type:'UPGRADE_RESOURCE_THEN', effects:[] }] }],
  '3230': [expansionEffectPresets.extraMainAction()],
  '3205': [{ type:'SEQUENCE', effects:[{ type:'GAIN_RESOURCE', resource:'tablet', amount:2 }, { type:'CHOOSE_ONE', options:[{ type:'RETURN_FEAR_FROM_PLAY_TO_HAND' }, { type:'SEQUENCE', effects:[] }] }] }],
  '3120': [{ type:'CHOOSE_ONE_BY_OTHER_PLAYED_COUNT', options:[
    {minimum:0,effect:{type:'DRAW_CARD',amount:1}},
    {minimum:3,effect:{type:'SEQUENCE',effects:[{type:'GAIN_RESOURCE',resource:'compass',amount:1},{type:'UPGRADE_RESOURCE_THEN',effects:[]}]}},
    {minimum:8,effect:{type:'SEQUENCE',effects:[{type:'GAIN_RESOURCE',resource:'compass',amount:2},{type:'UPGRADE_RESOURCE_THEN',effects:[]}]}}
  ]}],
  // Motorboat: lightning action, gain one boat icon and one arrowhead.
  '3112': [{ type:'SEQUENCE', effects:[{ type:'GAIN_TRAVEL', travel:{boat:1} },{ type:'GAIN_RESOURCE', resource:'arrowhead', amount:1 }] }],
  // Puppy: activate any empty Level I site without placing an archaeologist.
  '3114': [expansionEffectPresets.activateUnoccupiedSite(1)],
  // Rope Ladder: activate a site in the row directly above one of your
  // archaeologists; Level II targets add two Fear to hand.
  '3115': [expansionEffectPresets.activateSiteInRowAboveOwnWorker(2)],
  // Kitty: activate any occupied Level I site, including an opponent's.
  '3109': [expansionEffectPresets.activateOccupiedSite(1)],
  // Stew Pot: resolve (but do not exhaust) any gold assistant's gold effect.
  '3117': [expansionEffectPresets.activateAnyGoldAssistant()],
  '3113': [{ type:'SEQUENCE', effects:[{ type:'GAIN_RESOURCE', resource:'compass', amount:1 },{ type:'GAIN_RESOURCE', resource:'tablet', amount:1 },expansionEffectPresets.onOvercomeGuardianThisRound({tablet:1})] }],
  // Guardian's Maw: spend one defeated guardian, then gain two arrowheads.
  '3210': [expansionEffectPresets.spendDefeatedGuardian([{ type:'GAIN_RESOURCE', resource:'arrowhead', amount:2 }])],
  // Coins of Mourning: put a Fear into hand, then gain up to three coins for
  // Fear cards in hand and play (including the one just gained).
  '3204': [{ type:'SEQUENCE', effects:[{ type:'GAIN_FEAR_TO_HAND', amount:1 }, expansionEffectPresets.perFear('coin', 3)] }],
  // Stones of Mourning follows the same Fear-to-hand template, rewarding a
  // tablet (rather than coins or upgrades) for each counted Fear.
  '3222': [{ type:'SEQUENCE', effects:[{ type:'GAIN_FEAR_TO_HAND', amount:1 }, expansionEffectPresets.perFear('tablet', 3)] }],
  // Beads of Mourning: gain Fear to hand, then upgrade once for each Fear in
  // hand/play (up to three).
  '3202': [{ type:'SEQUENCE', effects:[{ type:'GAIN_FEAR_TO_HAND', amount:1 }, expansionEffectPresets.upgradesPerFear(3)] }],
  // Footprints of Artan grants an additional main action this turn.
  '3207': [expansionEffectPresets.extraMainAction()],
  '3206': [{ type:'SEQUENCE', effects:[{ type:'GAIN_TRAVEL', travel:{boat:2} }, expansionEffectPresets.extraMainAction()] }],
  // Waystones exchanges only two discovered tiles; workers, guardians, and
  // other tokens stay at their original map positions.
  '3229': [expansionEffectPresets.swapSiteTilesThenActivate()],
  // Pathfinder's Mantle: move one placed archaeologist to any unoccupied
  // discovered site (Level I or II) and resolve that site's reward.
  '3217': [{ type:'MOVE_OCCUPIED_WORKER_THEN_ACTIVATE', destination:'level1-or-level2', activations:1 }],
  '3219': [{ type:'EXILE_SLOTTED_IDOL', gain:{jewel:1} }],
  // Runechime / Sistrum each trade one defeated guardian for their printed
  // resource; the guardian leaves the player's scoring/boon collection.
  '3220': [expansionEffectPresets.spendDefeatedGuardian([{ type:'GAIN_RESOURCE', resource:'tablet', amount:1 }])],
  '3221': [expansionEffectPresets.spendDefeatedGuardian([{ type:'GAIN_RESOURCE', resource:'arrowhead', amount:1 }])],
  // Sunstone Amulet: take an Artifact 2 compasses cheaper into hand, without
  // resolving its effect.
  '3223': [{ type:'BUY_ARTIFACT_WITH_DISCOUNT_TO_HAND', discount:2 }],
  // Untainted Ruby includes all Fear-card identities, notably the Captain's
  // Hidden Fear, when checking the player's play area.
  '3228': [{ type:'IF_NO_FEAR_IN_PLAY', effects:[{ type:'GAIN_RESOURCE', resource:'jewel', amount:1 }] }],
  '3227': [{ type:'DRAW_THEN_KEEP_AND_OPTIONAL_TOP', maximum:2 }],
  // The three altars share a flexible *purchase* cost (handled by the market
  // purchase reducer); their played effects are deliberately simple.
  '3211': [{ type:'DRAW_CARD', amount:1 }],
  '3209': [{ type:'GAIN_RESOURCE', resource:'arrowhead', amount:1 }],
  '3208': [{ type:'GAIN_RESOURCE', resource:'jewel', amount:1 }],
  // Charmer's Flute either returns a defeated guardian or borrows the reward
  // of a Level II site occupied by another player.
  '3203': [{ type:'CHOOSE_ONE', options:[
    expansionEffectPresets.spendDefeatedGuardian([]),
    { type:'ACTIVATE_OTHER_PLAYER_OCCUPIED_SITE', level:2 },
  ] }],
  // Ritual Incense's hand-play branch and its self-exile branch are both
  // represented explicitly.  Normal play comes from hand; direct market
  // activation remains validated by the general artifact purchase rules.
  '3218': [{ type:'CHOOSE_ONE', options:[
    { type:'SEQUENCE', effects:[{ type:'DRAW_CARD', amount:1 }, { type:'CLAIM_AVAILABLE_SILVER_ASSISTANT' }] },
    { type:'SEQUENCE', effects:[{ type:'EXILE_SELF' }, { type:'DRAW_CARD', amount:1 }, { type:'UPGRADE_OWN_SILVER_ASSISTANT' }] },
  ] }],
  '3224': [{ type:'SEQUENCE', effects:[{ type:'GAIN_RESOURCE', resource:'coin', amount:3 }, { type:'BUY_ARTIFACTS_WITH_COIN_THIS_ROUND' }] }],
  // These statues preserve the normal choice of research token; only the
  // printed bridge-resource portion is discounted, then the chosen track
  // determines the follow-up resource.
  '3201': [{ type:'RESEARCH_ANY_DISCOUNT_THEN', discount:{tablet:2}, magnifyingEffects:[{ type:'GAIN_RESOURCE', resource:'arrowhead', amount:1 }], journalEffects:[{ type:'GAIN_RESOURCE', resource:'tablet', amount:1 }] }],
  '3226': [{ type:'RESEARCH_ANY_DISCOUNT_THEN', discount:{arrowhead:1}, magnifyingEffects:[{ type:'GAIN_RESOURCE', resource:'arrowhead', amount:1 }], journalEffects:[{ type:'GAIN_RESOURCE', resource:'tablet', amount:1 }] }],
  '3215': [{ type:'BUY_WITH_DISCOUNT', itemDiscount:1, artifactDiscount:0 }],
  '3102': [{ type:'EFFECT_BY_ROUND', effects:[
    [{ type:'GAIN_RESOURCE', resource:'coin', amount:1 }, { type:'EXILE_OWN_CARD' }],
    [{ type:'GAIN_RESOURCE', resource:'arrowhead', amount:1 }, { type:'EXILE_OWN_CARD' }],
    [{ type:'GAIN_RESOURCE', resource:'arrowhead', amount:1 }, { type:'GAIN_RESOURCE', resource:'tablet', amount:1 }],
    [{ type:'DRAW_CARD', amount:1 }, { type:'GAIN_RESOURCE', resource:'tablet', amount:1 }],
    [{ type:'DRAW_CARD', amount:1 }, { type:'GAIN_RESOURCE', resource:'jewel', amount:1 }],
  ] }],
  '3213': [{ type:'SEQUENCE', effects:[{ type:'DRAW_CARD', amount:1 }, { type:'PLACE_ARROWHEAD_ON_JOURNAL' }] }],
  // Fancy Tea Set has no play-time payload: its rule is a permanent
  // ownership-based final-scoring tiebreaker, implemented in final-scoring.
  '3105': [],
};

export const surpriseShipmentTiming: Record<string, ActionTiming> = {
  '3101':'free', '3103':'main', '3104':'free', '3105':'free', '3106':'free', '3107':'main', '3108':'main', '3111':'free', '3112':'free', '3113':'main', '3116':'main', '3118':'free', '3210':'main',
};
