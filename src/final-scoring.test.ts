import assert from 'node:assert/strict';
import test from 'node:test';
import { createGame } from './engine.ts';
import { scoreFinishedGame } from './final-scoring.ts';
import type { EngineContext, ResearchTrackDefinition } from './types.ts';

const track:ResearchTrackDefinition={id:'bird',name:'Bird',rows:[{magnifyingPoints:2,journalPoints:1,grantsAssistant:false}],templeArrivalPoints:[12,8,6,4]};
const context:EngineContext={cards:{item:{id:'item',name:'Item',type:'Item',expansion:'Base Game',points:3},fear:{id:'fear',name:'Fear',type:'Fear',expansion:'Base Game',points:-1},hidden:{id:'hidden',name:'Hidden Fear',type:'Starter',expansion:'Expedition Leaders',points:-2},tea:{id:'tea',name:'Fancy Tea Set',type:'Item',expansion:'Surprise Shipment',points:2}},researchTracks:{bird:track}};
function finished(){const state=createGame(['p1','p2']);state.phase='finished';state.research.board='bird';return state;}

test('final scoring aggregates every printed source and excludes exiled cards',()=>{
 const state=finished(),p1=state.players.p1;
 p1.researchMagnifying=0;p1.researchJournal=0;p1.templeTiles=[2,6];p1.idols=[{id:'i1',faceUp:true},{id:'i2',faceUp:false,inSlot:true,slotIndex:3}];p1.defeatedGuardians=['g'];p1.hand=['item','fear'];p1.deck=['hidden'];state.market.exiled=['item'];
 const score=scoreFinishedGame(state,context).scores.p1;
 assert.deepEqual(score,{playerId:'p1',research:3,templeTiles:8,idols:6,emptyIdolSlots:1+2+3,guardians:5,cards:0,total:28});
});

test('final scoring breaks score ties by temple arrival, then research, while preserving true ties',()=>{
 const state=finished();state.players.p1.researchMagnifying=0;state.players.p1.researchJournal=0;state.players.p2.researchMagnifying=0;state.players.p2.researchJournal=0;state.players.p1.templeTiles=[2,2];
 state.research.templeArrivals=['p2','p1'];state.research.templeArrivalPoints={p1:8,p2:12};
 let result=scoreFinishedGame(state,context);assert.deepEqual(result.rankedPlayerIds,['p2','p1']);assert.deepEqual(result.winnerIds,['p2']);
 state.research.templeArrivals=[];state.research.templeArrivalPoints={};state.players.p1.templeTiles=[];result=scoreFinishedGame(state,context);assert.deepEqual(result.winnerIds,['p1','p2']);
});

test('Fancy Tea Set breaks an otherwise true final tie while merely owned',()=>{
 const state=finished();state.players.p1.hand=['tea'];state.players.p2.templeTiles=[2];
 const result=scoreFinishedGame(state,context);
 assert.deepEqual(result.rankedPlayerIds,['p1','p2']);assert.deepEqual(result.winnerIds,['p1']);
});

test('final scoring rejects a non-finished or trackless game',()=>{
 const state=createGame(['p1']);assert.throws(()=>scoreFinishedGame(state,context),/finished/);
 state.phase='finished';assert.throws(()=>scoreFinishedGame(state,{cards:{}}),/research track/);
});
