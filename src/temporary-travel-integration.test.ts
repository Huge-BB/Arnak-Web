import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from './engine.ts';
import { reduceWithLeaders } from './engine-with-leaders.ts';
import type { EngineContext, GameState, ResearchTrackDefinition } from './types.ts';

const track:ResearchTrackDefinition={
  id:'monkey',name:'Monkey',
  rows:[{magnifyingPoints:1,journalPoints:0,grantsAssistant:false,nodes:[{id:'monkey:r0:p0',rowIndex:0,pathIndex:0,researchLevel:0}]}],
  bridges:[{id:'monkey:start->monkey:r0:p0',from:'monkey:start',to:'monkey:r0:p0',cost:{travel:{boat:1}},verified:true,allowedTokens:['magnifying']}],
};
const context:EngineContext={
  cards:{},
  sites:{tile:{id:'tile',level:1,rewardCode:'c',expansion:'Base Game'},fresh:{id:'fresh',level:1,rewardCode:'t',expansion:'Base Game'}},
  idols:{idol:{id:'idol',rewardCode:'s',expansion:'Base Game'}},
  guardians:{guardian:{id:'guardian',expansion:'Base Game'}},
  researchTracks:{monkey:track},
};
function captain():GameState{
  const s=createGame(['p1']);s.phase='playing';s.currentPlayer='p1';
  s.players.p1.leader={id:'captain',data:{}};s.players.p1.idols=[{id:'owned-idol',faceUp:true}];
  return s;
}
function gainPlaneFromBlueIdol(state:GameState){
  return reduceWithLeaders(state,{type:'LEADER_USE_IDOL',playerId:'p1',idolId:'owned-idol',slotIndex:2,effect:'leaderUnique'},context);
}

test('Captain quick idol travel can pay a later Dig action',()=>{
  let s=captain();s.sites.x={id:'x',level:1,tileId:'tile',idolSlots:0,travelCost:{boat:1}};
  s=gainPlaneFromBlueIdol(s);assert.equal(s.actionWindow?.temporaryTravel.plane,1);
  s=reduceWithLeaders(s,{type:'PLACE_WORKER',playerId:'p1',siteId:'x'},context);
  assert.equal(s.sites.x.occupiedBy,'p1');assert.equal(s.players.p1.resources.coin,1);assert.equal(s.actionWindow?.temporaryTravel.plane,0);
});

test('Captain quick idol travel can pay a later Discover action',()=>{
  let s=captain();s.players.p1.resources.compass=3;s.sites.x={id:'x',level:1,idolSlots:1,travelCost:{boat:1}};
  s.discovery.level1Deck=['fresh'];s.discovery.guardianDeck=['guardian'];s.discovery.idolDeck=['idol'];
  s=gainPlaneFromBlueIdol(s);
  s=reduceWithLeaders(s,{type:'DISCOVER_SITE',playerId:'p1',siteId:'x'},context);
  assert.equal(s.sites.x.tileId,'fresh');assert.equal(s.sites.x.guardian,'guardian');assert.equal(s.players.p1.resources.compass,2);assert.equal(s.players.p1.resources.tablet,1);assert.equal(s.actionWindow?.temporaryTravel.plane,0);
});

test('Captain quick idol travel can pay a later Research move',()=>{
  let s=captain();s.research.board='monkey';s.research.magnifyingNode.p1='monkey:start';s.research.journalNode.p1='monkey:start';
  s=gainPlaneFromBlueIdol(s);
  s=reduceWithLeaders(s,{type:'ADVANCE_RESEARCH',playerId:'p1',track:'magnifying',toNodeId:'monkey:r0:p0'},context);
  assert.equal(s.research.magnifyingNode.p1,'monkey:r0:p0');assert.equal(s.actionWindow?.temporaryTravel.plane,0);
});

test('temporary travel generated in one action window is unavailable after END_TURN',()=>{
  let s=createGame(['p1','p2']);s.phase='playing';s.currentPlayer='p1';s.players.p1.leader={id:'captain',data:{}};s.players.p1.idols=[{id:'owned-idol',faceUp:true}];
  s=gainPlaneFromBlueIdol(s);s.players.p1.mainActionUsed=true;s=reduceWithLeaders(s,{type:'END_TURN',playerId:'p1'},context);
  assert.equal(s.currentPlayer,'p2');assert.equal(s.actionWindow,undefined);
});
