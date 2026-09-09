import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from './engine.ts';
import { grantTemporaryTravel } from './action-window.ts';
import { payTravel } from './travel-payment.ts';
import type { EngineContext } from './types.ts';

const context:EngineContext={cards:{boot:{id:'boot',name:'Boot',type:'Starter',expansion:'Base Game',travel:{boot:1}},car:{id:'car',name:'Car',type:'Starter',expansion:'Base Game',travel:{car:1}}}};
function state(){const s=createGame(['p1']);s.phase='playing';return s;}

test('travel generated earlier can pay a later main action',()=>{
 let s=grantTemporaryTravel(state(),'p1',{plane:1});
 payTravel(s,'p1',{boat:1},[],context);
 assert.equal(s.actionWindow?.temporaryTravel.plane,0);
});

test('card and temporary travel can be combined in one later payment',()=>{
 let s=state();s.players.p1.hand=['boot'];s=grantTemporaryTravel(s,'p1',{plane:1});
 payTravel(s,'p1',{boot:1,car:1},['boot'],context);
 assert.deepEqual(s.players.p1.hand,[]);assert.deepEqual(s.players.p1.playedCards,['boot']);assert.equal(s.actionWindow?.temporaryTravel.plane,0);
});

test('temporary travel is consumed according to normal substitution hierarchy',()=>{
 let s=grantTemporaryTravel(state(),'p1',{car:1});
 payTravel(s,'p1',{boot:1},[],context);assert.equal(s.actionWindow?.temporaryTravel.car,0);
 let s2=grantTemporaryTravel(state(),'p1',{car:1});assert.throws(()=>payTravel(s2,'p1',{boat:1},[],context),/does not satisfy/);
});

test('an explicit temporary-travel selection is authoritative',()=>{
 let s=state();s.players.p1.hand=['car'];s=grantTemporaryTravel(s,'p1',{plane:2});
 payTravel(s,'p1',{car:1},['car'],context,'Site travel',{});
 assert.deepEqual(s.players.p1.playedCards,['car']);
 assert.equal(s.actionWindow?.temporaryTravel.plane,2);
 assert.throws(()=>payTravel(s,'p1',{plane:1},[],context,'Site travel',{}),/does not satisfy/);
});
