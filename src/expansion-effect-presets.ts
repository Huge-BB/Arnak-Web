import type { CardEffect, Resource, SpendableResource } from './types.ts';

/**
 * Reusable icon semantics introduced by expansion cards.  Card-data files
 * should compose these rather than encode a fresh ad-hoc rule every time the
 * same printed icon appears.
 */
export const expansionEffectPresets = {
  /** Ready one previously exhausted guardian boon. */
  resetGuardianBoon: (): CardEffect => ({ type: 'REFRESH_GUARDIAN_BOON' }),
  /** Spend a defeated guardian (it no longer scores or has a boon), then act. */
  spendDefeatedGuardian: (effects: CardEffect[]): CardEffect => ({ type: 'SPEND_DEFEATED_GUARDIAN_THEN', effects }),
  /** Mourning-style count: Fear cards in hand and play area, capped by card. */
  perFear: (resource: Resource, max = 3): CardEffect => ({ type: 'GAIN_RESOURCE_PER', resource, counter: 'FEAR_IN_HAND_AND_PLAY', max }),
  /** Upgrade once for each Fear in hand/play, to the printed cap. */
  upgradesPerFear: (max = 3): CardEffect => ({ type:'UPGRADE_RESOURCE_PER', counter:'FEAR_IN_HAND_AND_PLAY', max }),
  /** Register a once-per-guardian reward that expires during round cleanup. */
  onOvercomeGuardianThisRound: (gain: import('./types.ts').ResourceCost): CardEffect => ({ type: 'GAIN_ON_OVERCOME_GUARDIAN_THIS_ROUND', gain }),
  /** Use one normal printed idol-slot effect without supplying an idol. */
  useStandardIdolSlotEffect: (): CardEffect => ({ type: 'USE_STANDARD_IDOL_SLOT_EFFECT' }),
  /** Pay the shown total using any mix of the shown resource icons. */
  payAnyResourcesThen: (resources: SpendableResource[], amount: number, effects: CardEffect[]): CardEffect => ({ type:'PAY_ANY_RESOURCES_THEN', resources, amount, effects }),
  /** The card grants one more main action before the current turn ends. */
  extraMainAction: (): CardEffect => ({ type:'GAIN_EXTRA_MAIN_ACTION' }),
  /** Activate a printed reward at an occupied site, regardless of its owner. */
  activateOccupiedSite: (level?:1|2): CardEffect => ({ type:'ACTIVATE_OCCUPIED_SITE', level }),
  /** Activate an empty printed/discovered site without placing a worker there. */
  activateUnoccupiedSite: (level?:1|2): CardEffect => ({ type:'ACTIVATE_UNOCCUPIED_SITE', level }),
  /** Activate any site in the printed row immediately above one of your archaeologists. */
  activateSiteInRowAboveOwnWorker: (fearIfLevel2 = 0): CardEffect => ({ type:'ACTIVATE_SITE_IN_ROW_ABOVE_OWN_WORKER', ...(fearIfLevel2 ? {fearIfLevel2} : {}) }),
  /** Use the gold effect of any player-owned gold assistant without exhausting it. */
  activateAnyGoldAssistant: (): CardEffect => ({ type:'ACTIVATE_ANY_GOLD_ASSISTANT' }),
  /** Move two discovered site tiles only, then resolve either new location. */
  swapSiteTilesThenActivate: (): CardEffect => ({ type:'SWAP_SITE_TILES_THEN_ACTIVATE' }),
} as const;
