import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from './engine.ts';
import { reduceWithLeaders } from './engine-with-leaders.ts';
import type { EngineContext } from './types.ts';

const context:EngineContext={
  cards:{fear:{id:'fear',name:'Fear',type:'Fear',expansion:'Base Game'}},
  sites:{
    a:{id:'a',level:1,rewardCode:'',expansion:'Base Game'},
    b:{id:'b',level:1,rewardCode:'',expansion:'Base Game'},
    c:{id:'c',level:1,rewardCode:'',expansion:'Base Game'},
  },
  idols:{idol:{id:'idol',rewardCode:'COIN',expansion:'Base Game'}},
  guardians:{g1:{id:'g1',expansion:'Base Game'},g2:{id:'g2',expansion:'Base Game'},g3:{id:'g3',expansion:'Base Game'}},
};
function base(leader:'explorer'|'falconer'|'mystic'){
  const s=createGame(['p1']);s.phase='playing';s.currentPlayer='p1';s.players.p1.resources.compass=3;s.players.p1.leader={id:leader,data:{}};
  s.sites.slot={id:'slot',level:1,idolSlots:1};s.discovery.level1Deck=['a','b','c'];s.discovery.guardianDeck=['g1','g2','g3'];s.discovery.idolDeck=['idol'];return s;
}

test('Scouting chooses one of top two site tiles and bottoms the other',()=>{
  const s=base('explorer');s.players.p1.leader!.data.scoutingSiteChoiceThisTurn=true;
  const next=reduceWithLeaders(s,{type:'DISCOVER_SITE',playerId:'p1',siteId:'slot',useScouting:true,siteChoiceIndex:1},context);
  assert.equal(next.sites.slot.tileId,'b');assert.deepEqual(next.discovery.level1Deck,['c','a']);assert.equal(next.players.p1.leader!.data.scoutingSiteChoiceThisTurn,false);
});

test('Tracking chooses one of top two guardians and bottoms the other',()=>{
  const s=base('falconer');s.players.p1.leader!.data.trackingGuardianChoiceThisTurn=true;
  const next=reduceWithLeaders(s,{type:'DISCOVER_SITE',playerId:'p1',siteId:'slot',useTracking:true,guardianChoiceIndex:1},context);
  assert.equal(next.sites.slot.guardian,'g2');assert.deepEqual(next.discovery.guardianDeck,['g3','g1']);assert.equal(next.players.p1.leader!.data.trackingGuardianChoiceThisTurn,false);
});

test('Tracking cannot silently reveal the top guardian without the required choice',()=>{
  const s=base('falconer');s.players.p1.leader!.data.trackingGuardianChoiceThisTurn=true;
  assert.throws(()=>reduceWithLeaders(s,{type:'DISCOVER_SITE',playerId:'p1',siteId:'slot'},context),/requires choosing/);
  assert.equal(s.players.p1.leader!.data.trackingGuardianChoiceThisTurn,true);
});

test('optional Scouting may be declined and is consumed by that discovery',()=>{
  const s=base('explorer');s.players.p1.leader!.data.scoutingSiteChoiceThisTurn=true;
  const next=reduceWithLeaders(s,{type:'DISCOVER_SITE',playerId:'p1',siteId:'slot'},context);
  assert.equal(next.sites.slot.tileId,'a');assert.equal(next.players.p1.leader!.data.scoutingSiteChoiceThisTurn,false);
});

test('Blindsight replaces the face-up idol reward with a free exile choice',()=>{
  const s=base('mystic');s.players.p1.leader!.data.blindsightIdolExileThisTurn=true;const coin=s.players.p1.resources.coin;
  const next=reduceWithLeaders(s,{type:'DISCOVER_SITE',playerId:'p1',siteId:'slot',useBlindsight:true},context);
  assert.equal(next.players.p1.resources.coin,coin);assert.equal(next.players.p1.leader!.data.blindsightIdolExileThisTurn,false);
  assert.ok(next.players.p1.idols.some(idol=>idol.id==='idol'));assert.equal(next.pendingRewards.at(-1)?.code,'leader:EXILE_OWN_CARD');assert.equal(next.pendingRewards.at(-1)?.payload?.replacesIdolEffect,true);
});
