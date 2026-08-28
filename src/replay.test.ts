import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { createGame } from './engine.ts';
import { applyEngineCommand, type EngineCommand } from './engine-api.ts';
import { parseReplay, replayEngineCommands, serializeReplay, type EngineReplay } from './replay.ts';
import type { EngineContext } from './types.ts';

const context:EngineContext={cards:{}};
test('a JSON round-tripped command replay deterministically reaches the same finished state',()=>{
 const replay:EngineReplay={initialState:createGame(['p1']),commands:[{type:'action',action:{type:'START_GAME',seed:'replay-seed'}},{type:'action',action:{type:'PASS',playerId:'p1'}},{type:'action',action:{type:'PASS',playerId:'p1'}},{type:'action',action:{type:'PASS',playerId:'p1'}},{type:'action',action:{type:'PASS',playerId:'p1'}},{type:'action',action:{type:'PASS',playerId:'p1'}}]};
 const direct=replayEngineCommands(replay,context),serialized=serializeReplay(replay),roundTripped=replayEngineCommands(parseReplay(serialized),context);
 assert.equal(direct.phase,'finished');assert.equal(direct.round,5);assert.deepEqual(roundTripped,direct);
});
test('a two-player replay preserves a public main action and completes the round in turn order',()=>{
 const initialState=createGame(['p1','p2']);
 initialState.sites.camp={id:'camp',level:1,idolSlots:0};
 const replay:EngineReplay={initialState,commands:[
  {type:'action',action:{type:'START_GAME',seed:'two-player-replay'}},
  {type:'action',action:{type:'PLACE_WORKER',playerId:'p1',siteId:'camp'}},
  {type:'action',action:{type:'END_TURN',playerId:'p1'}},
  {type:'action',action:{type:'PASS',playerId:'p2'}},
  {type:'action',action:{type:'PASS',playerId:'p1'}},
 ]};
 const result=replayEngineCommands(parseReplay(serializeReplay(replay)),context);
 assert.equal(result.round,2);
 assert.equal(result.phase,'playing');
 assert.equal(result.sites.camp.occupiedBy,undefined);
 assert.equal(result.players.p1.mainActionUsed,undefined);
 assert.equal(result.players.p1.availableWorkers,2);
});
test('a replay serializes and resumes a card pending choice through the public dispatcher',()=>{
 const pendingContext:EngineContext={cards:{discard:{id:'discard',name:'Discard',type:'Item',expansion:'Base Game'},fodder:{id:'fodder',name:'Fodder',type:'Starter',expansion:'Base Game'}},cardEffects:{discard:[{type:'DISCARD_ONE_THEN',effects:[{type:'GAIN_RESOURCE',resource:'coin',amount:2}]}]}};
 const initialState=createGame(['p1']);initialState.phase='playing';initialState.players.p1.hand=['discard','fodder'];
 const replay:EngineReplay={initialState,commands:[
  {type:'action',action:{type:'PLAY_CARD',playerId:'p1',cardId:'discard'}},
  {type:'pending-choice',playerId:'p1',pendingIndex:0,choice:{type:'card',cardId:'fodder'}},
 ]};
 const result=replayEngineCommands(parseReplay(serializeReplay(replay)),pendingContext);
 assert.equal(result.pendingRewards.length,0);assert.equal(result.players.p1.resources.coin,2);assert.deepEqual(result.players.p1.playedCards,['discard','fodder']);assert.deepEqual(result.players.p1.discard,[]);
});
test('a full two-player leader replay is JSON-stable across all five rounds',async()=>{
 const extracted=JSON.parse(await readFile(new URL('./generated/cards.json',import.meta.url),'utf8')) as EngineContext['cards'];
 const cards=Object.fromEntries(Object.entries(extracted).filter(([,card])=>card.expansion==='Base Game')) as EngineContext['cards'];
 for(const name of ['Funding','Piloting','Transmission','Hidden Fear','Falconry','Animal Bond','Tracking'])cards[`leader:${name}`]={id:`leader:${name}`,name,type:'Starter',expansion:'Expedition Leaders'};
 const leaderContext:EngineContext={cards};
 const initialState=createGame(['p1','p2']);initialState.sites.camp={id:'camp',level:1,idolSlots:0};
 const commands:EngineCommand[]=[];let simulated=initialState;
 const append=(command:EngineCommand)=>{commands.push(command);simulated=applyEngineCommand(simulated,command,leaderContext);};
 append({type:'action',action:{type:'START_GAME',seed:'leader-replay',leaders:{p1:'captain',p2:'falconer'}}});
 append({type:'action',action:{type:'PLACE_WORKER',playerId:'p1',siteId:'camp'}});
 append({type:'action',action:{type:'END_TURN',playerId:'p1'}});
 while(simulated.phase!=='finished')append({type:'action',action:{type:'PASS',playerId:simulated.currentPlayer}});
 const replay:EngineReplay={initialState,commands};
 const result=replayEngineCommands(parseReplay(serializeReplay(replay)),leaderContext);
 assert.deepEqual(result,simulated);
 assert.equal(result.phase,'finished');assert.equal(result.round,5);
 assert.equal(result.players.p1.leader?.id,'captain');assert.equal(result.players.p1.workers,3);
 assert.equal(result.players.p2.leader?.id,'falconer');assert.equal(result.players.p2.leader?.data.eaglePosition,4);
});
test('replay parser rejects a malformed payload',()=>{assert.throws(()=>parseReplay('{"commands":[]}'),/Invalid engine replay/);});
