import test from 'node:test';
import assert from 'node:assert/strict';
import generatedCards from './generated/cards.json' with { type:'json' };
import { withBaseCardEffects } from './card-effect-data.ts';
import type { EngineContext } from './types.ts';

test('verified market card effects merge without overriding caller effects',()=>{
 const context=withBaseCardEffects({cards:generatedCards as EngineContext['cards'],cardEffects:{'0106':[{type:'DRAW_CARD',amount:1}]}});
 assert.deepEqual(context.cardEffects?.['0106'],[{type:'DRAW_CARD',amount:1}]);
 assert.deepEqual(context.cardEffects?.['0130'],[{type:'GAIN_RESOURCE',resource:'coin',amount:2}]);
 assert.deepEqual(context.cardEffects?.['0105'],[{type:'DRAW_CARD',amount:1},{type:'GAIN_RESOURCE',resource:'coin',amount:1},{type:'GAIN_RESOURCE',resource:'compass',amount:1}]);
 assert.equal(context.cardActionTiming?.['0001'],'free');
});

test('every base-market card has an audited action timing',()=>{
 const context=withBaseCardEffects({cards:generatedCards as EngineContext['cards']});
 const marketIds=Object.values(generatedCards as EngineContext['cards'])
  .filter(card=>card.expansion==='Base Game'&&(card.type==='Item'||card.type==='Artifact'))
  .map(card=>card.id).sort();
 assert.deepEqual(Object.keys(context.cardActionTiming??{}).filter(id=>marketIds.includes(id)).sort(),marketIds);
 assert.equal(context.cardActionTiming?.['0106'],'free');
 assert.equal(context.cardActionTiming?.['1208'],'main');
});

test('Surprise Shipment cards are main actions by safe default, with audited lightning overrides',()=>{
  const context=withBaseCardEffects({cards:generatedCards as EngineContext['cards']});
 assert.equal(context.cardActionTiming?.['3112'],'free');
 assert.equal(context.cardActionTiming?.['3103'],'main');
 assert.equal(context.cardActionTiming?.['3104'],'free');
 assert.equal(context.cardActionTiming?.['3210'],'main');
});

test('regular Expedition Leaders market cards are safe main actions, while leader starting cards are not market timings',()=>{
 const context=withBaseCardEffects({cards:generatedCards as EngineContext['cards']});
 assert.equal(context.cardActionTiming?.['1114'],'main');
 assert.equal(context.cardActionTiming?.['1023'],undefined);
});
