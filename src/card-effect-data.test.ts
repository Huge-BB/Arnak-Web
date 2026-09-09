import test from 'node:test';
import assert from 'node:assert/strict';
import generatedCards from './generated/cards.json' with { type:'json' };
import { withBaseCardEffects } from './card-effect-data.ts';
import { buyArtifactWithDiscount } from './assistant-effects.ts';
import { createGame } from './engine.ts';
import { applyCardEffects, getCardEffects } from './effects.ts';
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
 assert.equal(context.cardActionTiming?.['0108'],'free');
 assert.equal(context.cardActionTiming?.['0125'],'free');
 assert.equal(context.cardActionTiming?.['0130'],'free');
 assert.equal(context.cardActionTiming?.['0132'],'free');
 assert.equal(context.cardActionTiming?.['0136'],'free');
 assert.equal(context.cardActionTiming?.['0140'],'free');
 assert.equal(context.cardActionTiming?.['1208'],'main');
});

test('base item audit corrections retain gain, exile, travel, guardian, and Artifact-only semantics',()=>{
 const context=withBaseCardEffects({cards:generatedCards as EngineContext['cards']});
 assert.deepEqual(context.cardEffects?.['0102'],[{type:'GAIN_RESOURCE',resource:'compass',amount:1},{type:'ACTIVATE_TENT_SITE',requireEmpty:true}]);
 assert.deepEqual(context.cardEffects?.['0110']?.[1],{type:'GAIN_TRAVEL',travel:{car:1}});
 assert.deepEqual(context.cardEffects?.['0115']?.[0],{type:'GAIN_RESOURCE',resource:'coin',amount:1});
 for(const id of ['0118','0121','0134'])assert.equal(context.cardEffects?.[id]?.[0]?.type,'EXILE_OWN_CARD');
 assert.deepEqual(context.cardEffects?.['0120'],[{type:'BUY_ARTIFACT',discount:3,includeTop:true}]);
 assert.deepEqual(context.cardEffects?.['0135'],[{type:'BUY_ITEM',discount:3,includeTop:true}]);
 assert.deepEqual(context.cardEffects?.['0137'],[{type:'EXILE_SELF'},{type:'BUY_ARTIFACT',discount:4}]);
 assert.deepEqual(context.cardEffects?.['0139']?.[0],{type:'GAIN_RESOURCE',resource:'coin',amount:1});
 assert.deepEqual(context.cardEffects?.['0202']?.[0],{type:'PAY_RESOURCE_THEN',cost:{compass:1},effects:[{type:'ACTIVATE_TOP_SITE_DECK',level:2}]});
 for(const id of ['0206','0208'])assert.equal(context.cardEffects?.[id]?.[0]?.type,'EXILE_OWN_CARD');
});

test('Artifact-only discounts cannot buy Items and may buy the revealed Artifact deck top when allowed',()=>{
 const cards:EngineContext['cards']={artifact:{id:'artifact',name:'Artifact',type:'Artifact',expansion:'Base Game',cost:4},top:{id:'top',name:'Top',type:'Artifact',expansion:'Base Game',cost:3},item:{id:'item',name:'Item',type:'Item',expansion:'Base Game',cost:1}};
 const state=createGame(['p1']);state.players.p1.resources.compass=4;state.market.artifacts=['artifact'];state.market.artifactDeck=['top'];
 buyArtifactWithDiscount(state,'p1','artifact',3,false,{cards});
 assert.equal(state.players.p1.resources.compass,3);assert.deepEqual(state.market.artifacts,['top']);assert.ok(state.players.p1.playedCards.includes('artifact'));
 state.players.p1.resources.compass=3;state.market.artifactDeck=['top'];
 buyArtifactWithDiscount(state,'p1','top',3,true,{cards});
 assert.equal(state.players.p1.resources.compass,3);assert.equal(state.market.artifactDeck.length,0);
 assert.throws(()=>buyArtifactWithDiscount(state,'p1','item',4,true,{cards}),/Artifact/);
});

test('Surprise Shipment cards are main actions by safe default, with audited lightning overrides',()=>{
  const context=withBaseCardEffects({cards:generatedCards as EngineContext['cards']});
 assert.equal(context.cardActionTiming?.['3112'],'free');
 assert.equal(context.cardActionTiming?.['3103'],'main');
 assert.equal(context.cardActionTiming?.['3104'],'free');
 assert.equal(context.cardActionTiming?.['3210'],'main');
});

test('Wings of Ara-Anu grants two temporary planes and an additional main action',()=>{
 const context=withBaseCardEffects({cards:generatedCards as EngineContext['cards']}),state=createGame(['p1']);state.phase='playing';state.currentPlayer='p1';
 applyCardEffects(state,'p1',getCardEffects('3230',context),context,'3230');
 assert.deepEqual(state.actionWindow?.temporaryTravel,{plane:2});
 assert.equal(state.players.p1.extraMainActions,1);
 assert.equal(context.cardActionTiming?.['3230'],'main');
});

test('regular Expedition Leaders market cards are safe main actions, while leader starting cards are not market timings',()=>{
 const context=withBaseCardEffects({cards:generatedCards as EngineContext['cards']});
 assert.equal(context.cardActionTiming?.['1114'],'main');
 assert.equal(context.cardActionTiming?.['1023'],undefined);
});
