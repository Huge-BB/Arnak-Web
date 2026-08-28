import assert from 'node:assert/strict';
import test from 'node:test';
import { baseAssistantEffects } from './assistant-effect-data.ts';
import { createGame } from './engine.ts';
import { applyEngineCommand } from './engine-api.ts';
import type { EngineContext, GameState } from './types.ts';

function game():GameState { const state=createGame(['p1']); state.phase='playing'; state.currentPlayer='p1'; return state; }

test('visual assistant bindings build a complete executable base-game catalog',()=>{
 const effects=baseAssistantEffects();
 assert.equal(Object.keys(effects).length,12);
 assert.deepEqual(effects.f7574d.silver,{type:'GAIN_RESOURCES',resources:{coin:2},freeAction:true});
});

test('ACTIVATE_ASSISTANT exhausts the assistant and resolves immediate effects through the public API',()=>{
 const state=game(); state.players.p1.assistants=[{id:'a',level:'silver',exhausted:false}];
 const context:EngineContext={cards:{},assistantEffects:{a:{silver:{type:'GAIN_RESOURCES',resources:{coin:2}},gold:{type:'GAIN_RESOURCES',resources:{coin:3}}}}};
 const next=applyEngineCommand(state,{type:'action',action:{type:'ACTIVATE_ASSISTANT',playerId:'p1',assistantId:'a'}},context);
 assert.equal(next.players.p1.resources.coin,2);
 assert.equal(next.players.p1.assistants[0].exhausted,true);
 assert.throws(()=>applyEngineCommand(next,{type:'action',action:{type:'ACTIVATE_ASSISTANT',playerId:'p1',assistantId:'a'}},context),/already exhausted/);
});

test('assistant choice effects serialize and resolve through the canonical pending dispatcher',()=>{
 const state=game(); state.players.p1.assistants=[{id:'a',level:'silver',exhausted:false}];
 const context:EngineContext={cards:{},assistantEffects:{a:{silver:{type:'CHOOSE',options:[{type:'GAIN_RESOURCES',resources:{coin:1}},{type:'GAIN_TRAVEL',travel:{plane:1}}]},gold:{type:'GAIN_RESOURCES',resources:{coin:1}}}}};
 let next=applyEngineCommand(state,{type:'action',action:{type:'ACTIVATE_ASSISTANT',playerId:'p1',assistantId:'a'}},context);
 assert.equal(next.pendingRewards[0]?.code,'assistant:ACTIVATE_EFFECT');
 next=applyEngineCommand(next,{type:'pending-choice',playerId:'p1',pendingIndex:0,choice:{type:'assistant-option',optionIndex:1}},context);
 assert.equal(next.pendingRewards.length,0);
 assert.equal(next.actionWindow?.temporaryTravel.plane,1);
});

test('assistant draw/discard pending effect draws before validating the discard choice',()=>{
 const state=game(); state.players.p1.assistants=[{id:'a',level:'silver',exhausted:false}]; state.players.p1.deck=['drawn'];
 const context:EngineContext={cards:{drawn:{id:'drawn',name:'Drawn',type:'Starter',expansion:'Base Game'}},assistantEffects:{a:{silver:{type:'DRAW_THEN_DISCARD',draw:1,discard:1},gold:{type:'DRAW_CARD',amount:1}}}};
 let next=applyEngineCommand(state,{type:'action',action:{type:'ACTIVATE_ASSISTANT',playerId:'p1',assistantId:'a'}},context);
 next=applyEngineCommand(next,{type:'pending-choice',playerId:'p1',pendingIndex:0,choice:{type:'card',cardId:'drawn'}},context);
 assert.deepEqual(next.players.p1.hand,[]);
 assert.deepEqual(next.players.p1.discard,['drawn']);
});

test('assistant resource upgrade and discounted market purchase resolve through pending choices',()=>{
 const state=game(); state.players.p1.assistants=[{id:'upgrade',level:'silver',exhausted:false},{id:'discount',level:'silver',exhausted:false}]; state.players.p1.resources.tablet=1;
 state.market.items=['item']; state.market.itemDeck=['replacement'];
 const context:EngineContext={cards:{item:{id:'item',name:'Item',type:'Item',expansion:'Base Game',cost:2},replacement:{id:'replacement',name:'Replacement',type:'Item',expansion:'Base Game',cost:3}},assistantEffects:{upgrade:{silver:{type:'UPGRADE_RESOURCE'},gold:{type:'GAIN_RESOURCES',resources:{}}},discount:{silver:{type:'BUY_WITH_DISCOUNT',itemDiscount:2,artifactDiscount:0},gold:{type:'BUY_WITH_DISCOUNT',itemDiscount:3,artifactDiscount:0}}}};
 let next=applyEngineCommand(state,{type:'action',action:{type:'ACTIVATE_ASSISTANT',playerId:'p1',assistantId:'upgrade'}},context);
 next=applyEngineCommand(next,{type:'pending-choice',playerId:'p1',pendingIndex:0,choice:{type:'assistant-resource',resource:'tablet'}},context);
 assert.equal(next.players.p1.resources.tablet,0); assert.equal(next.players.p1.resources.arrowhead,1);
 next=applyEngineCommand(next,{type:'action',action:{type:'ACTIVATE_ASSISTANT',playerId:'p1',assistantId:'discount'}},context);
 next=applyEngineCommand(next,{type:'pending-choice',playerId:'p1',pendingIndex:0,choice:{type:'card',cardId:'item'}},context);
 assert.deepEqual(next.players.p1.deck,['item']); assert.deepEqual(next.market.items,['replacement']);
});

test('assistant exile can target a card already in the play area',()=>{
 const state=createGame(['p1']);state.phase='playing';state.currentPlayer='p1';state.players.p1.assistants=[{id:'a',level:'silver',exhausted:false}];state.players.p1.playedCards=['played'];
 const context:EngineContext={cards:{},assistantEffects:{a:{silver:{type:'EXILE_OWN_CARD',max:1},gold:{type:'GAIN_RESOURCES',resources:{coin:1}}}}};
 const activated=applyEngineCommand(state,{type:'action',action:{type:'ACTIVATE_ASSISTANT',playerId:'p1',assistantId:'a'}},context);
 const resolved=applyEngineCommand(activated,{type:'pending-choice',playerId:'p1',pendingIndex:0,choice:{type:'card',cardId:'played'}},context);
 assert.deepEqual(resolved.players.p1.playedCards,[]);assert.deepEqual(resolved.market.exiled,['played']);
});

test('legacy visible-silver-assistant pending payload resolves through the bound catalog',()=>{
 const state=game(); state.pendingRewards=[{playerId:'p1',sourceId:'monkey',code:'assistant:ACTIVATE_SILVER',payload:{type:'ACTIVATE_ASSISTANT_EFFECT',assistantId:'a',level:'silver'}}];
 const context:EngineContext={cards:{},assistantEffects:{a:{silver:{type:'GAIN_RESOURCES',resources:{compass:1}},gold:{type:'GAIN_RESOURCES',resources:{compass:2}}}}};
 const next=applyEngineCommand(state,{type:'pending-choice',playerId:'p1',pendingIndex:0,choice:{type:'skip'}},context);
 assert.equal(next.pendingRewards.length,0); assert.equal(next.players.p1.resources.compass,1);
});
