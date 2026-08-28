import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from './engine.ts';
import { reduceWithActionWindow } from './engine-with-action-window.ts';
import { grantTemporaryTravel } from './action-window.ts';
import type { EngineContext } from './types.ts';

const context:EngineContext={
  cards:{},
  sites:{tile:{id:'tile',level:1,rewardCode:'',expansion:'Base Game'}},
  idols:{idol:{id:'idol',rewardCode:'',expansion:'Base Game'}},
  guardians:{guardian:{id:'guardian',expansion:'Base Game'}},
};
function playing(){const s=createGame(['p1','p2']);s.phase='playing';s.currentPlayer='p1';return s;}

test('temporary plane produced earlier pays later PLACE_WORKER main action',()=>{
  let s=playing();s.sites.x={id:'x',level:1,tileId:'tile',idolSlots:0,travelCost:{boat:1}};s=grantTemporaryTravel(s,'p1',{plane:1});
  s=reduceWithActionWindow(s,{type:'PLACE_WORKER',playerId:'p1',siteId:'x'},context);
  assert.equal(s.sites.x.occupiedBy,'p1');assert.equal(s.actionWindow?.temporaryTravel.plane,0);assert.deepEqual(s.sites.x.travelCost,{boat:1});
});

test('temporary travel can combine with a card on later site action',()=>{
  const ctx:EngineContext={...context,cards:{boot:{id:'boot',name:'Boot',type:'Starter',expansion:'Base Game',travel:{boot:1}}}};
  let s=playing();s.sites.x={id:'x',level:1,tileId:'tile',idolSlots:0,travelCost:{boot:1,car:1}};s.players.p1.hand=['boot'];s=grantTemporaryTravel(s,'p1',{plane:1});
  s=reduceWithActionWindow(s,{type:'PLACE_WORKER',playerId:'p1',siteId:'x',paymentCardIds:['boot']},ctx);
  assert.deepEqual(s.players.p1.hand,[]);assert.ok(s.players.p1.playedCards.includes('boot'));assert.equal(s.actionWindow?.temporaryTravel.plane,0);
});

test('END_TURN clears unspent temporary travel before next player',()=>{
  let s=grantTemporaryTravel(playing(),'p1',{plane:2});s.players.p1.mainActionUsed=true;s=reduceWithActionWindow(s,{type:'END_TURN',playerId:'p1'},context);
  assert.equal(s.currentPlayer,'p2');assert.equal(s.actionWindow,undefined);
});

test('PASS clears unspent temporary travel',()=>{
  let s=grantTemporaryTravel(playing(),'p1',{plane:2});s=reduceWithActionWindow(s,{type:'PASS',playerId:'p1'},context);
  assert.equal(s.actionWindow,undefined);
});
