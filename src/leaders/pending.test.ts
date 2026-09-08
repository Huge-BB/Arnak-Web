import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../engine.ts';
import type { EngineContext } from '../types.ts';
import { setupLeader } from './index.ts';
import { resolveLeaderPendingChoice } from './pending.ts';

const cards:EngineContext['cards']={
  fear:{id:'fear',name:'Fear',type:'Fear',expansion:'Base Game'}, fear2:{id:'fear2',name:'Fear',type:'Fear',expansion:'Base Game'},
  hidden:{id:'hidden',name:'Hidden Fear',type:'Starter',expansion:'Expedition Leaders'},
  item1:{id:'item1',name:'Item 1',type:'Item',expansion:'Base Game'}, item2:{id:'item2',name:'Item 2',type:'Item',expansion:'Base Game'},
  a1:{id:'a1',name:'Archive 1',type:'Artifact',expansion:'Base Game'},a2:{id:'a2',name:'Archive 2',type:'Artifact',expansion:'Base Game'},a3:{id:'a3',name:'Archive 3',type:'Artifact',expansion:'Base Game'},a4:{id:'a4',name:'Market Artifact',type:'Artifact',expansion:'Base Game'},
};
for(const name of ['Divine Guidance','Meditation','Worldly Goods','Blindsight','Funding','Preservation','Arnakology','Linguistics'])cards[`l:${name}`]={id:`l:${name}`,name,type:'Starter',expansion:'Expedition Leaders'};
const context:EngineContext={cards,sites:{s1:{id:'tile1',level:1,rewardCode:'COIN',expansion:'Base Game'}} as any};
function mystic(){const s=createGame(['p1']);s.phase='playing';s.currentPlayer='p1';s.players.p1.hand=['fear'];s.players.p1.deck=['fear2'];setupLeader(s,'p1','mystic',context,'seed');return s;}

test('Mystic ritual pending choice consumes pending and ritual Fear',()=>{
  let s=mystic(); s.players.p1.leader!.data.ritualPile=['fear','fear2']; s.pendingRewards=[{playerId:'p1',sourceId:'x',code:'leader:MYSTIC_RITUAL_CHOICE',payload:{allowedFearCounts:[2,3,4]}}];
  s=resolveLeaderPendingChoice(s,'p1',0,{type:'ritual',fearCount:2},context);
  assert.equal(s.pendingRewards.length,0); assert.deepEqual(s.players.p1.leader!.data.ritualPile,[]); assert.equal(s.players.p1.resources.coin,1); assert.equal(s.players.p1.resources.compass,1);
});

test('Mystic Fear exile pending routes Fear to ritual pile',()=>{
  let s=mystic(); s.players.p1.hand=['fear']; s.pendingRewards=[{playerId:'p1',sourceId:'x',code:'leader:EXILE_OWN_CARD'}];
  s=resolveLeaderPendingChoice(s,'p1',0,{type:'card',cardId:'fear'},context);
  assert.deepEqual(s.players.p1.leader!.data.ritualPile,['fear']); assert.equal(s.pendingRewards.length,0);
});

test('Captain gains a Fear to discard and a compass when Hidden Fear is exiled',()=>{
  let s=createGame(['p1']);s.phase='playing';s.currentPlayer='p1';s.players.p1.leader={id:'captain',data:{}};s.players.p1.hand=['hidden'];
  s.pendingRewards=[{playerId:'p1',sourceId:'x',code:'leader:EXILE_OWN_CARD'}];
  s=resolveLeaderPendingChoice(s,'p1',0,{type:'card',cardId:'hidden'},context);
  assert.ok(s.market.exiled.includes('hidden'));assert.ok(s.players.p1.discard.includes('fear'));assert.equal(s.players.p1.resources.compass,1);assert.equal(s.pendingRewards.length,0);
});

test('Baroness optional far-left market exile can resolve or skip',()=>{
  let s=createGame(['p1']);s.phase='playing';s.currentPlayer='p1';s.market.items=['item1','item2'];s.market.itemDeck=[];s.pendingRewards=[{playerId:'p1',sourceId:'x',code:'leader:OPTIONAL_EXILE_FAR_LEFT_ITEM',payload:{refill:true}}];
  assert.throws(()=>resolveLeaderPendingChoice(s,'p1',0,{type:'card',cardId:'item2'},context),/far-left/);
  s=resolveLeaderPendingChoice(s,'p1',0,{type:'card',cardId:'item1'},context); assert.deepEqual(s.market.items,['item2']); assert.deepEqual(s.market.exiled,['item1']);
});

test('Professor Arnakology swaps one archive Artifact with one market Artifact',()=>{
  let s=createGame(['p1']);s.phase='playing';s.currentPlayer='p1';s.players.p1.hand=['fear','fear2'];s.market.artifactDeck=['a1','a2','a3'];setupLeader(s,'p1','professor',context,'seed');
  s.market.artifacts=['a4'];s.pendingRewards=[{playerId:'p1',sourceId:'leader-card:Arnakology',code:'leader:OPTIONAL_SWAP_ARCHIVE_ARTIFACT',payload:{freeAction:true}}];
  s=resolveLeaderPendingChoice(s,'p1',0,{type:'archiveSwap',archiveCardId:'a2',marketCardId:'a4'},context);
  assert.deepEqual(s.players.p1.leader!.data.archive,['a1','a4','a3']);assert.deepEqual(s.market.artifacts,['a2']);assert.equal(s.pendingRewards.length,0);
});
