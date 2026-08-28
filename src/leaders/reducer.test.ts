import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../engine.ts';
import type { EngineContext } from '../types.ts';
import { setupLeader } from './index.ts';
import { reduceExpeditionLeaderAction } from './reducer.ts';

const names=['Funding','Falconry','Animal Bond','Tracking','Connections','Research Notes','Resourcefulness','Special Delivery','Preservation','Arnakology','Linguistics','Hike','Cartography','Scouting','Divine Guidance','Meditation','Worldly Goods','Blindsight'];
const cards:EngineContext['cards']={fear:{id:'fear',name:'Fear',type:'Fear',expansion:'Base Game'},fear2:{id:'fear2',name:'Fear',type:'Fear',expansion:'Base Game'}};
for(const name of names)cards[`l:${name}`]={id:`l:${name}`,name,type:'Starter',expansion:'Expedition Leaders'};
const context:EngineContext={cards};
function stateFor(leader:'falconer'|'baroness'|'explorer'|'mystic'){
  const s=createGame(['p1']); s.phase='playing'; s.currentPlayer='p1'; s.players.p1.hand=['fear']; s.players.p1.deck=['fear2']; setupLeader(s,'p1',leader,context,'seed'); return s;
}

test('starting-card action moves card from hand and resolves its printed effect',()=>{
  let s=stateFor('falconer'); const id='l:Funding'; s.players.p1.hand=[id]; const before=s.players.p1.resources.coin;
  s=reduceExpeditionLeaderAction(s,{type:'LEADER_STARTING_CARD_EFFECT',playerId:'p1',cardId:id,choice:'coin'},context);
  assert.equal(s.players.p1.resources.coin,before+1); assert.ok(!s.players.p1.hand.includes(id)); assert.ok(s.players.p1.playedCards.includes(id));
});

test('Baroness Special Delivery is available through typed reducer',()=>{
  let s=stateFor('baroness'); const id='l:Special Delivery'; s.players.p1.hand=[id]; s.players.p1.leader!.data.specialDeliveryCardId=id;
  s=reduceExpeditionLeaderAction(s,{type:'LEADER_BARONESS_SPECIAL_DELIVERY',playerId:'p1'},context);
  assert.equal(s.players.p1.leader!.data.specialDeliveryArmed,true); assert.ok(s.players.p1.playedCards.includes(id));
});

test('Falconer guardian boon action advances eagle once',()=>{
  let s=stateFor('falconer'); s.players.p1.defeatedGuardians=['g1']; const before=Number(s.players.p1.leader!.data.eaglePosition);
  s=reduceExpeditionLeaderAction(s,{type:'LEADER_FALCONER_GUARDIAN_BOON',playerId:'p1',guardianId:'g1'},context);
  assert.equal(s.players.p1.leader!.data.eaglePosition,before+1);
});

test('Mystic self-exile queues ritual choice through typed reducer',()=>{
  let s=stateFor('mystic'); const id='l:Meditation'; s.players.p1.hand=[id];
  s=reduceExpeditionLeaderAction(s,{type:'LEADER_MYSTIC_EXILE_STARTING_CARD',playerId:'p1',cardId:id},context);
  assert.ok(s.market.exiled.includes(id)); assert.equal(s.pendingRewards[0].code,'leader:MYSTIC_RITUAL_CHOICE');
});

test('only Mystic ritual idol branch spends the main action',()=>{
  let s=stateFor('mystic'); s.players.p1.idols=[{id:'idol',faceUp:true}];
  s=reduceExpeditionLeaderAction(s,{type:'LEADER_USE_IDOL',playerId:'p1',idolId:'idol',slotIndex:2,effect:'mysticExileRitual'},context);
  assert.equal(s.players.p1.mainActionUsed,true);
  assert.equal(s.pendingRewards[0].code,'leader:EXILE_OWN_CARD');
  const free=stateFor('falconer'); free.players.p1.idols=[{id:'idol',faceUp:true}];
  const afterFree=reduceExpeditionLeaderAction(free,{type:'LEADER_USE_IDOL',playerId:'p1',idolId:'idol',slotIndex:3,effect:'leaderUnique'},context);
  assert.equal(afterFree.players.p1.mainActionUsed,undefined);
});

test('leader actions enforce current turn',()=>{
  const s=stateFor('explorer'); s.currentPlayer='other';
  assert.throws(()=>reduceExpeditionLeaderAction(s,{type:'LEADER_EXPLORER_SPEND_SNACK',playerId:'p1',snackId:'free',siteId:'x'},context),/not p1's turn/);
});
