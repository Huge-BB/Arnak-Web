import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../engine.ts';
import { setupLeader } from './index.ts';
import { explorerSpendSnackOnStartingCard, falconerUseGuardianBoonForFlight, mysticExileFear, mysticExileStartingCardForRitual } from './extra-actions.ts';
import type { EngineContext } from '../types.ts';

const leaderNames=['Funding','Falconry','Animal Bond','Tracking','Hike','Cartography','Scouting','Divine Guidance','Meditation','Worldly Goods','Blindsight'];
const cards:EngineContext['cards']={fear:{id:'fear',name:'Fear',type:'Fear',expansion:'Base Game'},fear2:{id:'fear2',name:'Fear',type:'Fear',expansion:'Base Game'}};
for(const name of leaderNames)cards[`l:${name}`]={id:`l:${name}`,name,type:'Starter',expansion:'Expedition Leaders'};
const context:EngineContext={cards};
function stateFor(leader:'falconer'|'explorer'|'mystic'){const s=createGame(['p1']);s.phase='playing';s.players.p1.hand=['fear'];s.players.p1.deck=['fear2'];setupLeader(s,'p1',leader,context,'seed');return s;}

test('Falconer can spend each defeated guardian boon only once to advance eagle',()=>{
 let s=stateFor('falconer'); s.players.p1.defeatedGuardians=['g1']; const before=Number(s.players.p1.leader!.data.eaglePosition);
 s=falconerUseGuardianBoonForFlight(s,'p1','g1'); assert.equal(s.players.p1.leader!.data.eaglePosition,before+1); assert.deepEqual(s.players.p1.leader!.data.usedGuardianBoons,['g1']);
 assert.throws(()=>falconerUseGuardianBoonForFlight(s,'p1','g1'),/already been used/);
});

test('Mystic exiled Fear leaves player zones and enters ritual pile',()=>{
 let s=stateFor('mystic'); s.players.p1.hand=['fear']; s=mysticExileFear(s,'p1','fear',context); assert.ok(!s.players.p1.hand.includes('fear')); assert.deepEqual(s.players.p1.leader!.data.ritualPile,['fear']);
});

test('Mystic starting card exile queues a main-action ritual choice',()=>{
 let s=stateFor('mystic'); const id='l:Meditation'; s.players.p1.hand=[id]; s=mysticExileStartingCardForRitual(s,'p1',id,context); assert.ok(s.market.exiled.includes(id)); assert.equal(s.pendingRewards[0].code,'leader:MYSTIC_RITUAL_CHOICE');
});

test('Explorer Hike and Cartography consume the same snack pool as movement',()=>{
 let s=stateFor('explorer'); const id='l:Hike'; s.players.p1.playedCards=[id]; s=explorerSpendSnackOnStartingCard(s,'p1','free',id,context); const free=(s.players.p1.leader!.data.snacks as any[]).find(x=>x.id==='free'); assert.equal(free.used,true); assert.equal(free.siteId,`card:${id}`);
});
