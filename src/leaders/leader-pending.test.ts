import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../engine.ts';
import { resolvePendingFalconerSite, resolvePendingMysticArtifact } from '../pending-rewards.ts';
import type { EngineContext } from '../types.ts';

test('Falconer eagle position 3 activates any discovered Level I site',()=>{
 const state=createGame(['p1']); state.sites.s1={id:'s1',level:1,tileId:'site1',idolSlots:1};
 state.pendingRewards.push({playerId:'p1',sourceId:'leader:falconer:eagle',code:'leader:FALCONER_EAGLE_REWARD',payload:{rewardPosition:3,mainAction:true}});
 const context:EngineContext={cards:{},sites:{site1:{id:'site1',level:1,rewardCode:'c',expansion:'Base Game'}}};
 const next=resolvePendingFalconerSite(state,'p1',0,'s1',context); assert.equal(next.players.p1.resources.coin,1); assert.equal(next.pendingRewards.length,0);
});

test('Falconer eagle position 4 requires a discovered Level II site',()=>{
 const state=createGame(['p1']); state.sites.s1={id:'s1',level:1,tileId:'site1',idolSlots:1};
 state.pendingRewards.push({playerId:'p1',sourceId:'leader:falconer:eagle',code:'leader:FALCONER_EAGLE_REWARD',payload:{rewardPosition:4,mainAction:true}});
 const context:EngineContext={cards:{},sites:{site1:{id:'site1',level:1,rewardCode:'c',expansion:'Base Game'}}};
 assert.throws(()=>resolvePendingFalconerSite(state,'p1',0,'s1',context),/Level 2/);
});

test('Mystic three-Fear ritual buys an Artifact with three compass discount',()=>{
 const state=createGame(['p1']); state.players.p1.resources.compass=1; state.market.artifacts=['a']; state.market.artifactDeck=['b'];
 state.pendingRewards.push({playerId:'p1',sourceId:'leader:mystic:ritual',code:'leader:MYSTIC_BUY_ARTIFACT_DISCOUNT',payload:{discount:3}});
 const context:EngineContext={cards:{a:{id:'a',name:'A',type:'Artifact',expansion:'Base Game',cost:4},b:{id:'b',name:'B',type:'Artifact',expansion:'Base Game',cost:2}}};
 const next=resolvePendingMysticArtifact(state,'p1',0,'a',context); assert.equal(next.players.p1.resources.compass,0); assert.deepEqual(next.players.p1.playedCards,['a']); assert.deepEqual(next.market.artifacts,['b']);
});
