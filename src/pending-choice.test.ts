import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from './engine.ts';
import { resolvePendingChoice } from './pending-choice.ts';
import type { EngineContext } from './types.ts';

const context:EngineContext={
 cards:{artifact:{id:'artifact',name:'Artifact',type:'Artifact',expansion:'Base Game',cost:3},fear:{id:'fear',name:'Fear',type:'Fear',expansion:'Base Game'}},
 sites:{tile:{id:'tile',level:1,rewardCode:'c',expansion:'Base Game'},tile2:{id:'tile2',level:2,rewardCode:'t',expansion:'Base Game'}},
};

test('unified pending choice resolves research assistant claim',()=>{
 const s=createGame(['p1']);s.phase='playing';s.currentPlayer='p1';s.assistants.stacks=[['a1']];s.pendingRewards=[{playerId:'p1',sourceId:'bird',code:'research:CLAIM_ASSISTANT',payload:{type:'CLAIM_ASSISTANT',level:'silver'}}];
 const next=resolvePendingChoice(s,'p1',0,{type:'assistant-stack',stackIndex:0},context);
 assert.deepEqual(next.players.p1.assistants,[{id:'a1',level:'silver',exhausted:false}]);assert.equal(next.pendingRewards.length,0);
});

test('unified pending choice resolves research CHOOSE and preserves follow-up pending',()=>{
 const s=createGame(['p1']);s.pendingRewards=[{playerId:'p1',sourceId:'monkey',code:'research:CHOOSE',payload:{type:'CHOOSE',count:1,options:[{type:'CLAIM_ASSISTANT',level:'silver'},{type:'UPGRADE_ASSISTANT',level:'gold'}]}}];
 const next=resolvePendingChoice(s,'p1',0,{type:'research-option',optionIndex:0},context);
 assert.equal(next.pendingRewards[0].code,'research:CLAIM_ASSISTANT');
});

test('unified pending choice resolves or declines an optional research exile',()=>{
 const s=createGame(['p1']);s.players.p1.hand=['fear'];s.players.p1.playedCards=['artifact'];s.pendingRewards=[{playerId:'p1',sourceId:'snake:r1',code:'research:EXILE_OWN_CARD',payload:{type:'EXILE_OWN_CARD'}}];
 const exiled=resolvePendingChoice(s,'p1',0,{type:'card',cardId:'artifact'},context);assert.deepEqual(exiled.market.exiled,['artifact']);assert.deepEqual(exiled.players.p1.playedCards,[]);assert.equal(exiled.pendingRewards.length,0);
 const declined=resolvePendingChoice(s,'p1',0,{type:'skip'},context);assert.deepEqual(declined.players.p1.hand,['fear']);assert.equal(declined.pendingRewards.length,0);
});

test('unified pending choice resolves leader optional skip',()=>{
 const s=createGame(['p1']);s.players.p1.leader={id:'baroness',data:{}};s.pendingRewards=[{playerId:'p1',sourceId:'leader-card:Connections',code:'leader:OPTIONAL_EXILE_FAR_LEFT_ITEM',payload:{refill:true}}];
 const next=resolvePendingChoice(s,'p1',0,{type:'skip'},context);assert.equal(next.pendingRewards.length,0);
});

test('unified pending choice resolves free guardian site',()=>{
 const s=createGame(['p1']);s.sites.s1={id:'s1',level:1,idolSlots:1,occupiedBy:'p1',guardian:'g1'};s.pendingRewards=[{playerId:'p1',sourceId:'bird',code:'research:OVERCOME_GUARDIAN_FREE',payload:{type:'OVERCOME_GUARDIAN_FREE'}}];
 const next=resolvePendingChoice(s,'p1',0,{type:'site',siteId:'s1'},context);assert.deepEqual(next.players.p1.defeatedGuardians,['g1']);assert.equal(next.pendingRewards.length,0);
});

test('unified pending choice resolves Falconer level I site activation',()=>{
 const s=createGame(['p1']);s.sites.s1={id:'s1',level:1,idolSlots:1,tileId:'tile'};s.pendingRewards=[{playerId:'p1',sourceId:'leader:falconer:eagle',code:'leader:FALCONER_EAGLE_REWARD',payload:{rewardPosition:3}}];
 const next=resolvePendingChoice(s,'p1',0,{type:'site',siteId:'s1'},context);assert.equal(next.players.p1.resources.coin,1);assert.equal(next.pendingRewards.length,0);
});

test('unified pending choice resolves Falconer level II site activation',()=>{
 const s=createGame(['p1']);s.sites.s2={id:'s2',level:2,idolSlots:2,tileId:'tile2'};s.pendingRewards=[{playerId:'p1',sourceId:'leader:falconer:eagle',code:'leader:FALCONER_EAGLE_REWARD',payload:{rewardPosition:4}}];
 const next=resolvePendingChoice(s,'p1',0,{type:'site',siteId:'s2'},context);assert.equal(next.players.p1.resources.tablet,1);assert.equal(next.pendingRewards.length,0);
});

test('unified pending choice resolves Mystic discounted Artifact purchase',()=>{
 const s=createGame(['p1']);s.market.artifacts=['artifact'];s.players.p1.resources.compass=1;s.pendingRewards=[{playerId:'p1',sourceId:'leader:mystic:ritual',code:'leader:MYSTIC_BUY_ARTIFACT_DISCOUNT',payload:{discount:3}}];
 const next=resolvePendingChoice(s,'p1',0,{type:'artifact',artifactId:'artifact'},context);assert.equal(next.players.p1.resources.compass,1);assert.deepEqual(next.players.p1.playedCards,['artifact']);assert.equal(next.pendingRewards.length,0);
});

test('unified pending choice preserves Mystic exile to ritual chain',()=>{
 const s=createGame(['p1']);s.players.p1.leader={id:'mystic',data:{ritualPile:[]}};s.players.p1.hand=['fear'];s.pendingRewards=[{playerId:'p1',sourceId:'leader:mystic:idol',code:'leader:EXILE_OWN_CARD',payload:{thenMysticRitual:true,allowedFearCounts:[2,3,4]}}];
 const next=resolvePendingChoice(s,'p1',0,{type:'card',cardId:'fear'},context);assert.deepEqual(next.players.p1.leader!.data.ritualPile,['fear']);assert.equal(next.pendingRewards[0].code,'leader:MYSTIC_RITUAL_CHOICE');
});

test('unified pending choice rejects wrong player before dispatch',()=>{
 const s=createGame(['p1','p2']);s.pendingRewards=[{playerId:'p2',sourceId:'x',code:'research:CLAIM_ASSISTANT',payload:{type:'CLAIM_ASSISTANT',level:'silver'}}];
 assert.throws(()=>resolvePendingChoice(s,'p1',0,{type:'assistant-stack',stackIndex:0},context),/belongs to p2/);
});

test('unified pending choice accepts the serialized top-deck card resolution',()=>{
 const s=createGame(['p1']);s.players.p1.deck=['bottom'];s.pendingRewards=[{playerId:'p1',sourceId:'card:first-aid',code:'card:RESOLVE_EFFECT',payload:{type:'CARD_EFFECT',sourceCardId:'first-aid',effect:{type:'DRAW_TOP_PROCESS',kind:'first-aid'},stage:'top-process',drawnCardIds:['keep','return']}}];
 const next=resolvePendingChoice(s,'p1',0,{type:'top-deck',mode:'keep',cardIds:['keep']},context);
 assert.deepEqual(next.players.p1.hand,['keep']);assert.deepEqual(next.players.p1.deck,['return','bottom']);assert.equal(next.pendingRewards.length,0);
});
