import type { ActionTiming, CardEffect } from './types.ts';
import { expansionEffectPresets } from './expansion-effect-presets.ts';

/**
 * Verified shared-market cards from Expedition Leaders (1xxx).  Leader
 * starting cards live in the leader reducer and are deliberately absent.
 */
export const leaderMarketEffects: Record<string, CardEffect[]> = {
  // Little Monkey: lightning, 2 coins, then may exile/refill any market card.
  '1101': [{ type:'SEQUENCE', effects:[{ type:'GAIN_RESOURCE', resource:'coin', amount:2 }, { type:'EXILE_MARKET_CARD_REFILL', row:'either', optional:true }] }],
  // Shovel: buy a visible Artifact 2 compasses cheaper, resolve it, then exile it.
  '1104': [{ type:'BUY_ARTIFACT_WITH_DISCOUNT_THEN_EXILE', discount:2 }],
  // Crowbar: exile/refill either card-row type, with its printed rebate.
  '1109': [{ type:'EXILE_MARKET_CARD_REFILL', row:'either', itemGain:{coin:1}, artifactGain:{compass:2} }],
  '1115': [{ type:'GAIN_TRAVEL', travel:{plane:2} }],
  '1111': [{ type:'SEQUENCE', effects:[{ type:'GAIN_RESOURCE', resource:'coin', amount:1 }, { type:'GAIN_RESOURCE', resource:'tablet', amount:1 }] }],
  // Camera: a Level I site in any row containing your archaeologist.
  '1118': [{ type:'ACTIVATE_LEVEL1_SITE_IN_ROW_WITH_OWN_WORKER' }],
  // Cat: coin, then optionally activate an occupied Level I site.
  '1114': [{ type:'SEQUENCE', effects:[{ type:'GAIN_RESOURCE', resource:'coin', amount:1 }, { type:'CHOOSE_ONE', options:[{ type:'ACTIVATE_OCCUPIED_SITE', level:1 }, { type:'SEQUENCE', effects:[] }] }] }],
  // Parachute is a lightning self-exile that discounts one later placement by
  // two plane icons.  The shared site-discount state is intentionally consumed
  // by the next site action, rather than at card-play time.
  '1105': [{ type:'SEQUENCE', effects:[{ type:'EXILE_SELF' }, { type:'REDUCE_NEXT_SITE_ACTION_COST', plane:2 }] }],
  // Iron Rations: either remove a defeated guardian or trade one coin for a
  // jewel.  The former is intentionally a cost with no immediate payout.
  '1106': [{ type:'CHOOSE_ONE', options:[
    expansionEffectPresets.spendDefeatedGuardian([]),
    { type:'PAY_RESOURCE_GAIN', cost:{coin:1}, gain:{jewel:1} },
  ] }],
  // Goat delegates its main action to a normal archaeologist placement, with
  // one boot discounted from that placement's printed travel cost.
  '1102': [{ type:'BEGIN_SITE_ACTION_WINDOW', kind:'place', travelDiscount:{boot:1}, consumesMainAction:true }],
  // Guardian's Fang: spend a defeated guardian for the printed coin and jewel.
  '1205': [expansionEffectPresets.spendDefeatedGuardian([{ type:'GAIN_RESOURCE', resource:'coin', amount:1 }, { type:'GAIN_RESOURCE', resource:'jewel', amount:1 }])],
  '1210': [{ type:'PAY_RESOURCE_GAIN', cost:{jewel:1}, gain:{tablet:2,arrowhead:2} }],
  // These relocations retain the normal "destination must be empty" rule.
  '1211': [{ type:'MOVE_OCCUPIED_WORKER_THEN_ACTIVATE', sourceLevel:2, destination:'level2', activations:1 }],
  '1201': [{ type:'IF_NO_OTHER_PLAYED_CARDS', ifTrue:[{ type:'DRAW_CARD', amount:2 }], otherwise:[{ type:'GAIN_RESOURCE', resource:'coin', amount:3 }] }],
  // Guardian's Lute: draw, then return one defeated guardian to the supply.
  '1203': [expansionEffectPresets.spendDefeatedGuardian([{ type:'DRAW_CARD', amount:1 }])],
  '1204': [{ type:'SEQUENCE', effects:[{ type:'GAIN_FEAR_CARD', amount:1 }, { type:'USE_STANDARD_IDOL_SLOT_EFFECT' }] }],
  '1108': [{ type:'CHOOSE_DISTINCT_BY_MAGNIFYING_ROWS', thresholds:[2,4,7], options:[{type:'DRAW_CARD',amount:1},{type:'GAIN_RESOURCE',resource:'coin',amount:1},{type:'GAIN_RESOURCE',resource:'tablet',amount:1}] }],
  '1116': [{ type:'MOVE_OCCUPIED_WORKER_THEN_ACTIVATE', sourceLevel:2, destination:'level1', activations:1 }],
  // Army Belt selects exactly two distinct printed options.
  '1117': [{ type:'CHOOSE_DISTINCT', count:2, options:[
    { type:'BUY_WITH_DISCOUNT', itemDiscount:2, artifactDiscount:0 },
    { type:'CLAIM_AVAILABLE_SILVER_ASSISTANT' },
    expansionEffectPresets.spendDefeatedGuardian([]),
  ] }],
  // Coffee: one compass, then optionally remove one defeated guardian.
  '1112': [{ type:'SEQUENCE', effects:[
    { type:'GAIN_RESOURCE', resource:'compass', amount:1 },
    expansionEffectPresets.spendDefeatedGuardian([]),
  ] }],
  // Landing Net pays out immediately, then changes future Item purchases for
  // the current round.  The engine places them on deck top deterministically.
  '1107': [{ type:'SEQUENCE', effects:[{ type:'GAIN_RESOURCE', resource:'coin', amount:2 }, { type:'PUT_BOUGHT_ITEMS_ON_DECK_TOP_THIS_ROUND' }] }],
  '1212': [{ type:'CHOOSE_ONE', options:[
    { type:'EXILE_OWN_CARD', effects:[{ type:'GAIN_RESOURCE', resource:'coin', amount:1 }] },
    { type:'SEQUENCE', effects:[{ type:'EXILE_SELF' }, { type:'GAIN_RESOURCE', resource:'jewel', amount:1 }] },
  ] }],
  // Sieve may repeat "draw, then put one hand card into play without its
  // effect" zero, one, or two times.  Nesting the existing optional choice
  // keeps each draw/payment window visible to both the UI and CLI.
  '1103': [{ type:'SEQUENCE', effects:[
    { type:'GAIN_RESOURCE', resource:'coin', amount:1 },
    { type:'CHOOSE_ONE', options:[
      { type:'SEQUENCE', effects:[
        { type:'DRAW_CARD', amount:1 },
        { type:'DISCARD_ONE_THEN', effects:[{ type:'CHOOSE_ONE', options:[
          { type:'SEQUENCE', effects:[{ type:'DRAW_CARD', amount:1 }, { type:'DISCARD_ONE_THEN', effects:[] }] },
          { type:'SEQUENCE', effects:[] },
        ] }] },
      ] },
      { type:'SEQUENCE', effects:[] },
    ] },
  ] }],
  // Guardian boons are already free actions in the core action economy;
  // Divine Riders therefore only needs its printed two-tablet payout.
  '1207': [{ type:'GAIN_RESOURCE', resource:'tablet', amount:2 }],
  '1202': [{ type:'ACTIVATE_OWN_ASSISTANTS', levels:['silver','gold'] }],
  '1113': [{ type:'USE_MARKET_ITEM_EFFECT' }],
  '1110': [{ type:'DRAW_TOP_PROCESS', kind:'first-aid' }],
  '1206': [{ type:'DRAW_TOP_PROCESS', kind:'rod-of-division' }],
  '1209': [{ type:'EXILE_SLOTTED_IDOL', gain:{coin:3} }],
};

export const leaderMarketTiming: Record<string, ActionTiming> = {
  '1101':'free',
  '1115':'free',
  '1111':'free',
  '1105':'free',
  '1107':'free',
};
