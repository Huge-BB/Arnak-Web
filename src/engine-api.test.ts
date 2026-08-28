import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from './engine.ts';
import { applyEngineCommand } from './engine-api.ts';
import type { EngineContext } from './types.ts';

const context:EngineContext={
  cards:{},
  sites:{tile:{id:'tile',level:1,rewardCode:'',expansion:'Base Game'}},
};
function game(){const s=createGame(['p1','p2']);s.phase='playing';s.currentPlayer='p1';return s;}

test('canonical action route keeps leader-aware discovery hooks',()=>{
  const s=game();s.players.p1.leader={id:'explorer',data:{scoutingSiteChoiceThisTurn:true}};
  s.players.p1.resources.compass=3;s.sites.x={id:'x',level:1,idolSlots:0};s.discovery.level1Deck=['a','b'];s.discovery.guardianDeck=['guardian'];s.discovery.idolDeck=['idol'];
  const ctx:EngineContext={...context,sites:{a:{id:'a',level:1,rewardCode:'',expansion:'Base Game'},b:{id:'b',level:1,rewardCode:'',expansion:'Base Game'}},idols:{idol:{id:'idol',rewardCode:'',expansion:'Base Game'}},guardians:{guardian:{id:'guardian',expansion:'Base Game'}}};
  const next=applyEngineCommand(s,{type:'action',action:{type:'DISCOVER_SITE',playerId:'p1',siteId:'x',useScouting:true,siteChoiceIndex:1}},ctx);
  assert.equal(next.sites.x.tileId,'b');assert.equal(next.players.p1.leader!.data.scoutingSiteChoiceThisTurn,false);
});

test('canonical action route preserves temporary travel from leader free action',()=>{
  let s=game();s.players.p1.leader={id:'captain',data:{}};s.players.p1.idols=[{id:'idol',faceUp:true}];s.sites.x={id:'x',level:1,tileId:'tile',idolSlots:0,travelCost:{boat:1}};
  s=applyEngineCommand(s,{type:'action',action:{type:'LEADER_USE_IDOL',playerId:'p1',idolId:'idol',slotIndex:2,effect:'leaderUnique'}},context);
  assert.equal(s.actionWindow?.temporaryTravel.plane,1);
  s=applyEngineCommand(s,{type:'action',action:{type:'PLACE_WORKER',playerId:'p1',siteId:'x'}},context);
  assert.equal(s.sites.x.occupiedBy,'p1');assert.equal(s.actionWindow?.temporaryTravel.plane,0);
});

test('canonical pending route validates owner and resolves through public dispatcher',()=>{
  const s=game();s.assistants.stacks=[['a1']];s.pendingRewards=[{playerId:'p1',sourceId:'bird',code:'research:CLAIM_ASSISTANT',payload:{type:'CLAIM_ASSISTANT',level:'silver'}}];
  assert.throws(()=>applyEngineCommand(s,{type:'pending-choice',playerId:'p2',pendingIndex:0,choice:{type:'assistant-stack',stackIndex:0}},context),/belongs to p1/);
  const next=applyEngineCommand(s,{type:'pending-choice',playerId:'p1',pendingIndex:0,choice:{type:'assistant-stack',stackIndex:0}},context);
  assert.equal(next.players.p1.assistants[0].id,'a1');assert.equal(next.pendingRewards.length,0);
});

test('public command API rejects internal resource and lifecycle reducer transitions',()=>{
 const state=game(),before=structuredClone(state);
 assert.throws(()=>applyEngineCommand(state,{type:'action',action:{type:'GAIN_RESOURCE',playerId:'p1',resource:'coin',amount:99}},context),/Internal reducer action/);
 assert.throws(()=>applyEngineCommand(state,{type:'action',action:{type:'CLAIM_ASSISTANT',playerId:'p1',stackIndex:0}},context),/Internal reducer action/);
 assert.deepEqual(state,before);
});

test('a deferred main-action choice is consumed only when it resolves successfully',()=>{
  const s=game();s.players.p1.assistants=[{id:'a1',level:'silver',exhausted:true}];
  s.pendingRewards=[{playerId:'p1',sourceId:'leader:test',code:'leader:REFRESH_OWN_ASSISTANT',payload:{mainAction:true}}];
  assert.throws(()=>applyEngineCommand(s,{type:'pending-choice',playerId:'p1',pendingIndex:0,choice:{type:'assistant',assistantId:'missing'}},context),/does not own/);
  assert.equal(s.players.p1.mainActionUsed,undefined);
  const resolved=applyEngineCommand(s,{type:'pending-choice',playerId:'p1',pendingIndex:0,choice:{type:'assistant',assistantId:'a1'}},context);
  assert.equal(resolved.players.p1.mainActionUsed,true);
  assert.equal(resolved.players.p1.assistants[0].exhausted,false);
});

test('Captain Specialist, Professor archive purchase, and Mystic Ritual each consume a main action',()=>{
  const captain=game();captain.players.p1.leader={id:'captain',data:{}};captain.assistants.stacks=[['a1']];
  const afterCaptain=applyEngineCommand(captain,{type:'action',action:{type:'LEADER_CAPTAIN_SPECIALIST',playerId:'p1',stackIndex:0}},context);
  assert.equal(afterCaptain.players.p1.mainActionUsed,true);

  const professor=game();professor.players.p1.leader={id:'professor',data:{archive:['artifact'],suitcase:{compass:0,tablet:0}}};professor.players.p1.resources.compass=1;
  const artifactContext:EngineContext={cards:{artifact:{id:'artifact',name:'Artifact',type:'Artifact',expansion:'Base Game',cost:1}}};
  const afterArchive=applyEngineCommand(professor,{type:'action',action:{type:'LEADER_PROFESSOR_BUY_ARCHIVE',playerId:'p1',cardId:'artifact'}},artifactContext);
  assert.equal(afterArchive.players.p1.mainActionUsed,true);

  const mystic=game();mystic.players.p1.leader={id:'mystic',data:{ritualPile:['fear','fear2']}};mystic.sites.x={id:'x',level:1,idolSlots:0};
  const afterRitual=applyEngineCommand(mystic,{type:'action',action:{type:'LEADER_MYSTIC_RITUAL',playerId:'p1',fearCount:2}},context);
  assert.equal(afterRitual.players.p1.mainActionUsed,true);
  assert.throws(()=>applyEngineCommand(afterRitual,{type:'action',action:{type:'PLACE_WORKER',playerId:'p1',siteId:'x'}},context),/main action/);
});

test('canonical route consumes an Aeroplane-style discount on the next Discover and clears it afterwards',()=>{
  const s=game();s.players.p1.hand=['air'];s.players.p1.resources.compass=1;s.sites.x={id:'x',level:1,idolSlots:1,travelCost:{plane:1}};s.discovery.level1Deck=['tile'];s.discovery.guardianDeck=['guardian'];s.discovery.idolDeck=['idol'];
  const ctx:EngineContext={cards:{air:{id:'air',name:'Air',type:'Item',expansion:'Base Game'}},cardEffects:{air:[{type:'REDUCE_NEXT_SITE_ACTION_COST',plane:1,discoveryCompass:2}]},sites:{tile:{id:'tile',level:1,rewardCode:'',expansion:'Base Game'}},idols:{idol:{id:'idol',rewardCode:'',expansion:'Base Game'}},guardians:{guardian:{id:'guardian',expansion:'Base Game'}}};
  let next=applyEngineCommand(s,{type:'action',action:{type:'PLAY_CARD',playerId:'p1',cardId:'air'}},ctx);
  assert.equal(next.players.p1.nextSiteActionPlaneDiscount,1);assert.equal(next.players.p1.nextDiscoveryCompassDiscount,2);
  next=applyEngineCommand(next,{type:'action',action:{type:'DISCOVER_SITE',playerId:'p1',siteId:'x'}},ctx);
  assert.equal(next.sites.x.tileId,'tile');assert.equal(next.players.p1.resources.compass,0);assert.equal(next.players.p1.nextSiteActionPlaneDiscount,undefined);assert.equal(next.players.p1.nextDiscoveryCompassDiscount,undefined);
});
