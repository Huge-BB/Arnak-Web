import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, reduce } from '../engine.ts';
import { setupLeader } from './index.ts';
import type { EngineContext } from '../types.ts';

const cards:EngineContext['cards']={
 fear1:{id:'fear1',name:'Fear',type:'Fear',expansion:'Base Game'},fear2:{id:'fear2',name:'Fear',type:'Fear',expansion:'Base Game'},
 f:{id:'f',name:'Funding',type:'Starter',expansion:'Expedition Leaders'},h:{id:'h',name:'Hike',type:'Starter',expansion:'Expedition Leaders'},c:{id:'c',name:'Cartography',type:'Starter',expansion:'Expedition Leaders'},s:{id:'s',name:'Scouting',type:'Starter',expansion:'Expedition Leaders'},
};
const context:EngineContext={cards,sites:{oldTile:{id:'oldTile',level:1,rewardCode:'c',expansion:'Base Game'},newTile:{id:'newTile',level:1,rewardCode:'c',expansion:'Base Game'}},idols:{idol:{id:'idol',rewardCode:'c',expansion:'Base Game'}},guardians:{g:{id:'g',expansion:'Base Game'}}};
function explorerState(){const state=createGame(['p1']);state.phase='playing';state.currentPlayer='p1';state.setupSeed='x';state.players.p1.hand=['fear1'];state.players.p1.deck=['fear2'];setupLeader(state,'p1','explorer',context,'x');state.players.p1.availableWorkers=0;state.sites.old={id:'old',level:1,tileId:'oldTile',occupiedBy:'p1',idolSlots:1};state.sites.next={id:'next',level:1,tileId:'newTile',idolSlots:1};return state;}
test('Explorer can move the same archaeologist to dig with a snack',()=>{const state=explorerState();const next=reduce(state,{type:'PLACE_WORKER',playerId:'p1',siteId:'next',explorerMove:{fromSiteId:'old',snackId:'free'}},context);assert.equal(next.sites.old.occupiedBy,undefined);assert.equal(next.sites.next.occupiedBy,'p1');assert.equal(next.players.p1.availableWorkers,0);const snack=(next.players.p1.leader!.data.snacks as any[]).find(x=>x.id==='free');assert.equal(snack.siteId,'old');assert.equal(snack.used,true);});
test('Explorer cannot move back onto a snack-marked site in the same round',()=>{let state=explorerState();state=reduce(state,{type:'PLACE_WORKER',playerId:'p1',siteId:'next',explorerMove:{fromSiteId:'old',snackId:'free'}},context);state.players.p1.mainActionUsed=false;assert.throws(()=>reduce(state,{type:'PLACE_WORKER',playerId:'p1',siteId:'old',explorerMove:{fromSiteId:'next',snackId:'coin'}},context),/snack token/);});
test('Explorer move can discover without consuming another archaeologist',()=>{const state=explorerState();delete state.sites.next.tileId;state.players.p1.resources.compass=3;state.discovery.level1Deck=['newTile'];state.discovery.guardianDeck=['g'];state.discovery.idolDeck=['idol'];const next=reduce(state,{type:'DISCOVER_SITE',playerId:'p1',siteId:'next',explorerMove:{fromSiteId:'old',snackId:'free'}},context);assert.equal(next.sites.old.occupiedBy,undefined);assert.equal(next.sites.next.occupiedBy,'p1');assert.equal(next.sites.next.tileId,'newTile');assert.equal(next.players.p1.availableWorkers,0);});
