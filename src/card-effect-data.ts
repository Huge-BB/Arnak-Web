import manual from '../data/card-effects-manual.json' with { type:'json' };
import timingManual from '../data/card-action-timing-manual.json' with { type:'json' };
import { surpriseShipmentEffects, surpriseShipmentTiming } from './surprise-shipment-effects.ts';
import { leaderMarketEffects, leaderMarketTiming } from './leader-market-effects.ts';
import { LEADER_STARTING_CARD_NAMES } from './cards.ts';
import type { ActionTiming, CardEffect, EngineContext } from './types.ts';

type ManualData={$schemaVersion:1;effects:Record<string,CardEffect[]>};
type TimingManualData={$schemaVersion:1;timing:Record<string,ActionTiming>};

/** Adds only visually/rulebook-verified market-card effects to a context. */
export function withBaseCardEffects(context:EngineContext):EngineContext {
  const effects={...(manual as ManualData).effects,...leaderMarketEffects,...surpriseShipmentEffects};
  // Every market card must consume a main action unless its printed lightning
  // icon is explicitly audited.  This makes newly imported expansion cards
  // safe by default instead of accidentally treating missing data as free.
  const expansionDefaultTiming=Object.fromEntries(Object.values(context.cards)
    .filter(card=>(card.expansion==='Surprise Shipment'||card.expansion==='Expedition Leaders')&&(card.type==='Item'||card.type==='Artifact')&&!(card.expansion==='Expedition Leaders'&&LEADER_STARTING_CARD_NAMES.has(card.name)))
    .map(card=>[card.id,'main' as ActionTiming]));
  const timing={...(timingManual as TimingManualData).timing,...expansionDefaultTiming,...leaderMarketTiming,...surpriseShipmentTiming};
  for(const id of Object.keys(effects)){
    const card=context.cards[id];
    if(!card||!['Base Game','Surprise Shipment','Expedition Leaders'].includes(card.expansion)||(card.type!=='Item'&&card.type!=='Artifact')) throw new Error(`Card effect entry references invalid supported market card: ${id}`);
  }
  for(const [id,value] of Object.entries(timing)){
    const card=context.cards[id];
    if(!card||!['Base Game','Surprise Shipment','Expedition Leaders'].includes(card.expansion)||value!=='main'&&value!=='free') throw new Error(`Card timing entry references invalid supported market card: ${id}`);
  }
  return {...context,cardEffects:{...effects,...context.cardEffects},cardActionTiming:{...timing,...context.cardActionTiming}};
}
