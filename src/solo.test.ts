import assert from 'node:assert/strict';
import test from 'node:test';
import { createSoloGame, reduce } from './engine.ts';
import { scoreSoloGame } from './solo.ts';
import type { EngineContext, ResearchTrackDefinition } from './types.ts';

const track:ResearchTrackDefinition={
  id:'bird',name:'Bird',templeArrivalPoints:[12,8,6,4],
  rows:[
    {magnifyingPoints:2,journalPoints:1,grantsAssistant:false,nodes:[{id:'bird:r1p0',rowIndex:0,pathIndex:0,researchLevel:0}]},
    {magnifyingPoints:5,journalPoints:3,grantsAssistant:false,nodes:[{id:'bird:r2p0',rowIndex:1,pathIndex:0,researchLevel:1}]},
  ],
  bridges:[
    {id:'start-r1',from:'bird:start',to:'bird:r1p0',verified:true},
    {id:'r1-r2',from:'bird:r1p0',to:'bird:r2p0',verified:true},
    {id:'r2-temple',from:'bird:r2p0',to:'bird:temple',verified:true},
  ],
};
const context:EngineContext={
  cards:Object.fromEntries([
    ...Array.from({length:6},(_,index)=>({id:`item${index}`,name:`Item ${index}`,type:'Item' as const,expansion:'Base Game',points:index})),
    ...Array.from({length:3},(_,index)=>({id:`artifact${index}`,name:`Artifact ${index}`,type:'Artifact' as const,expansion:'Base Game',points:index+1})),
    {id:'fear',name:'Fear',type:'Fear' as const,expansion:'Base Game',points:-1},
    ...['Yellow','Green','Blue','Red'].flatMap(color=>Array.from({length:4},(_,index)=>({id:`${color}-${index}`,name:'Starter',type:'Starter' as const,expansion:'Base Game',color}))),
  ].map(card=>[card.id,card])),
  sites:{'site-coin':{id:'site-coin',level:1,rewardCode:'c',expansion:'Base Game'}},
  idols:{},guardians:{},assistants:{},researchTracks:{bird:track},
};

test('solo setup uses two-player components, starts with the rival, and selects exactly the requested red difficulty',()=>{
  const state=createSoloGame({seed:'solo-setup',difficulty:3,board:'bird',researchBoard:'bird',context});
  assert.equal(state.currentPlayer,'rival');
  assert.equal(state.players.rival.workers,6);
  assert.equal(state.players.p1.resources.coin,1);
  assert.equal(state.players.p1.resources.compass,1);
  assert.equal(Object.values(state.sites).filter(site=>site.blocked).length,5);
  const ids=[...state.solo!.actionDeck];
  assert.equal(ids.length,10);
  assert.equal(ids.filter(id=>id.endsWith('-red')).length,3);
  assert.equal(ids.filter(id=>id.startsWith('dig-')).length,5);
});

test('rival action consumes one tile, advances without payment, then hands the turn to the player',()=>{
  let state=createSoloGame({seed:'solo-research',difficulty:0,board:'bird',researchBoard:'bird',context});
  state.solo!.actionDeck=['research-green'];
  state=reduce(state,{type:'SOLO_RIVAL_ACTION',playerId:'rival'},context);
  assert.equal(state.research.magnifying.rival,0);
  assert.equal(state.currentPlayer,'p1');
  assert.equal(state.solo!.usedActionTiles[0],'research-green');
});

test('rival uses the next face-down tile arrow, and the first used tile arrow for the final action',()=>{
  let state=createSoloGame({seed:'solo-arrow',difficulty:0,board:'bird',researchBoard:'bird',context});
  state.market.items=['item0','item1']; // equal points would be selected by the arrow, but use distinct ids below.
  context.cards.item0.points=1; context.cards.item1.points=1;
  state.solo!.actionDeck=['buy-item-green','dig-compass']; // dig-compass points right
  state=reduce(state,{type:'SOLO_RIVAL_ACTION',playerId:'rival'},context);
  assert.deepEqual(state.players.rival.playedCards,['item1']);
  state.currentPlayer='rival'; state.market.items=['item0','item1'];
  state.solo!.actionDeck=['buy-item-green']; // final tile uses bottom used buy-item-green's left arrow
  state=reduce(state,{type:'SOLO_RIVAL_ACTION',playerId:'rival'},context);
  assert.equal(state.players.rival.playedCards.at(-1),'item0');
});

test('rival removes the Snake rescue assistant and chooses the available 6-point stack by stack arrow',()=>{
  const snake:ResearchTrackDefinition={id:'snake',name:'Snake',templeArrivalPoints:[12,8,6,4],rows:[
    {magnifyingPoints:0,journalPoints:0,grantsAssistant:false,nodes:[{id:'snake:r1',rowIndex:0,pathIndex:0,researchLevel:0,rewards:[{token:'magnifying',verified:true,rewards:[{type:'CLAIM_SNAKE_RESCUE_ASSISTANT'}]}]}]},
  ],bridges:[{id:'start-r1',from:'snake:start',to:'snake:r1',verified:true},{id:'r1-temple',from:'snake:r1',to:'snake:temple',verified:true}]};
  const snakeContext:EngineContext={...context,researchTracks:{snake}};
  let state=createSoloGame({seed:'solo-snake',difficulty:0,board:'snake',researchBoard:'snake',context:snakeContext});
  state.assistants.specialStack=['rescued']; state.solo!.actionDeck=['research-green','dig-coin'];
  state=reduce(state,{type:'SOLO_RIVAL_ACTION',playerId:'rival'},snakeContext);
  assert.deepEqual(state.assistants.specialStack,[]);
  state.currentPlayer='rival'; state.solo!.actionDeck=['research-green'];
  state.research.magnifyingNode.rival='snake:temple'; state.templeTiles.silverLeft=0;
  state=reduce(state,{type:'SOLO_RIVAL_ACTION',playerId:'rival'},snakeContext);
  assert.equal(state.templeTiles.silverRight,1);
  assert.equal(state.players.rival.templeTiles.includes(6),true);
});

test('the rival cannot be driven through normal player actions and never takes guardian Fear at round end',()=>{
  let state=createSoloGame({seed:'solo-guard',difficulty:0,board:'bird',researchBoard:'bird',context});
  assert.throws(()=>reduce(state,{type:'PLACE_WORKER',playerId:'rival',siteId:'camp-1'},context),/only by revealing/);
  state.sites['camp-1-a'].occupiedBy='rival'; state.sites['camp-1-a'].guardian='guardian';
  state.players.rival.hasPassed=true; state.currentPlayer='p1';
  state=reduce(state,{type:'PASS',playerId:'p1'},context);
  assert.equal(state.players.rival.discard.includes('fear'),false);
});

test('rival Dig and Discover consume no more than its six archaeologists',()=>{
  let state=createSoloGame({seed:'solo-workers',difficulty:0,board:'bird',researchBoard:'bird',context});
  state.players.rival.availableWorkers=0;
  state.solo!.actionDeck=['dig-coin'];
  state=reduce(state,{type:'SOLO_RIVAL_ACTION',playerId:'rival'},context);
  assert.equal(Object.values(state.sites).some(site=>site.occupiedBy==='rival'),false);
  assert.match(state.solo!.lastAction!.description,/no rival archaeologist/);
});

test('when the player has passed, the last rival tile closes the round and rebuilds its action stack',()=>{
  let state=createSoloGame({seed:'solo-round',difficulty:0,board:'bird',researchBoard:'bird',context});
  state.solo!.actionDeck=['dig-coin','dig-compass'];
  state=reduce(state,{type:'SOLO_RIVAL_ACTION',playerId:'rival'},context);
  state=reduce(state,{type:'PASS',playerId:'p1'},context);
  assert.equal(state.currentPlayer,'rival');
  state=reduce(state,{type:'SOLO_RIVAL_ACTION',playerId:'rival'},context);
  assert.equal(state.round,2);
  assert.equal(state.currentPlayer,'rival');
  assert.equal(state.solo!.actionDeck.length,2);
  assert.equal(state.players.rival.hasPassed,false);
});

test('solo scoring gives the human ordinary idol-slot and Fear scoring, while rival duplicates are worth two',()=>{
  const state=createSoloGame({seed:'solo-score',difficulty:0,board:'bird',researchBoard:'bird',context});
  state.phase='finished';
  state.players.p1.idols=[{id:'a',faceUp:true},{id:'b',faceUp:true}];
  state.players.p1.discard=['fear'];
  state.players.rival.idols=[{id:'r1',faceUp:true},{id:'r2',faceUp:false}];
  const result=scoreSoloGame(state,context);
  // 2 idols (6) + the base board's empty-slot score (8) - one Fear = 13.
  assert.equal(result.human,13);
  assert.equal(result.rival,5);
  assert.equal(result.humanWon,true);
});
