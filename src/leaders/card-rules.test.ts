import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../engine.ts';
import type { EngineContext, GameState } from '../types.ts';
import { resolveLeaderStartingCard } from './card-rules.ts';
import { resolveLeaderPendingChoice } from './pending.ts';

const context:EngineContext={cards:{hike:{id:'hike',name:'Hike',type:'Starter',expansion:'Expedition Leaders'},cart:{id:'cart',name:'Cartography',type:'Starter',expansion:'Expedition Leaders'},ling:{id:'ling',name:'Linguistics',type:'Starter',expansion:'Expedition Leaders'},a1:{id:'a1',name:'A1',type:'Artifact',expansion:'Base Game'},a2:{id:'a2',name:'A2',type:'Artifact',expansion:'Base Game'}},idols:{idol:{id:'idol',rewardCode:'c',expansion:'Base Game'}}};
function state(id:string):GameState{const s=createGame(['p1']);s.phase='playing';s.currentPlayer='p1';s.players.p1.leader={id,data:{}};return s;}

test('Explorer Hike can activate any discovered site and spends a snack',()=>{let s=state('explorer');s.players.p1.hand=['hike'];s.players.p1.playedCards=['hike'];s.players.p1.leader!.data.snacks=[{id:'free',availableFromRound:1,used:false}];s=resolveLeaderStartingCard(s,'p1','hike','activateSite',context,{snackId:'free'});assert.equal(s.pendingRewards[0].code,'leader:ACTIVATE_DISCOVERED_SITE');assert.equal((s.pendingRewards[0].payload as any).level,undefined);assert.equal((s.players.p1.leader!.data.snacks as any[])[0].used,true);});

test('Explorer Cartography activates a visible idol without taking it',()=>{let s=state('explorer');s.players.p1.hand=['cart'];s.players.p1.playedCards=['cart'];s.players.p1.leader!.data.snacks=[{id:'free',availableFromRound:1,used:false}];s.sites.hidden={id:'hidden',level:1,idolSlots:1,faceUpIdolId:'idol'};s=resolveLeaderStartingCard(s,'p1','cart','activateFaceupIdol',context,{snackId:'free'});assert.equal(s.players.p1.resources.tablet,1);assert.equal(s.pendingRewards[0].code,'leader:ACTIVATE_FACEUP_UNDISCOVERED_IDOL');s=resolveLeaderPendingChoice(s,'p1',0,{type:'site',siteId:'hidden'},context);assert.equal(s.players.p1.resources.coin,1);assert.equal(s.sites.hidden.faceUpIdolId,'idol');assert.equal(s.players.p1.idols.length,0);assert.equal((s.players.p1.leader!.data.snacks as any[])[0].used,true);assert.equal(s.pendingRewards.length,0);});

test('Professor Linguistics second threshold adds only suitcase tablet',()=>{let s=state('professor');s.players.p1.hand=['ling'];s.players.p1.playedCards=['ling','a1','a2'];s.players.p1.leader!.data.suitcase={compass:0,tablet:0};s=resolveLeaderStartingCard(s,'p1','ling','suitcaseTablet',context);assert.deepEqual(s.players.p1.leader!.data.suitcase,{compass:0,tablet:1});});

test('Professor Linguistics first threshold still offers suitcase compass',()=>{let s=state('professor');s.players.p1.hand=['ling'];s.players.p1.playedCards=['ling','a1'];s.players.p1.leader!.data.suitcase={compass:0,tablet:0};s=resolveLeaderStartingCard(s,'p1','ling','suitcaseCompass',context);assert.deepEqual(s.players.p1.leader!.data.suitcase,{compass:1,tablet:0});});
