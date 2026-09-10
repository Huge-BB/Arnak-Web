import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, reduce } from './engine.ts';
import { buyTempleTile, templeTileCost } from './temple-tiles.ts';
import type { ResearchTrackDefinition } from './types.ts';
import { templeTileScore } from './scoring.ts';
test('temple tile costs follow the printed three-cost pyramid',()=>{assert.deepEqual(templeTileCost('bronze',0),{coin:1,tablet:2});assert.deepEqual(templeTileCost('bronze',1),{jewel:1});assert.deepEqual(templeTileCost('silver',0),{coin:1,tablet:2,jewel:1});assert.deepEqual(templeTileCost('silver',1),{jewel:1,compass:1,arrowhead:1});assert.deepEqual(templeTileCost('gold'),{coin:1,tablet:2,jewel:1,compass:1,arrowhead:1});});
test('Monkey and Lizard temple tiles use their own reviewed 2-point costs',()=>{
 assert.deepEqual(templeTileCost('bronze',2,'monkey'),{coin:1,arrowhead:1});
 assert.deepEqual(templeTileCost('silver',1,'monkey'),{jewel:1,coin:1,arrowhead:1});
 assert.deepEqual(templeTileCost('gold',undefined,'monkey'),{coin:2,tablet:2,jewel:1,arrowhead:1});
 assert.deepEqual(templeTileCost('bronze',0,'lizard'),{coin:1,compass:1,tablet:1});
 assert.deepEqual(templeTileCost('bronze',2,'lizard'),{tablet:1,arrowhead:1});
 assert.deepEqual(templeTileCost('silver',0,'lizard'),{coin:1,compass:1,tablet:1,jewel:1});
 assert.deepEqual(templeTileCost('silver',1,'lizard'),{jewel:1,tablet:1,arrowhead:1});
 assert.deepEqual(templeTileCost('gold',undefined,'lizard'),{coin:1,compass:1,tablet:2,jewel:1,arrowhead:1});
});
test('a temple-arrived player buys from limited stacks and scores the tile',()=>{const state=createGame(['p1']);state.phase='playing';state.currentPlayer='p1';state.research.templeArrivals=['p1'];state.players.p1.resources.jewel=1;const next=reduce(state,{type:'BUY_TEMPLE_TILE',playerId:'p1',tier:'bronze',combination:1});assert.equal(next.templeTiles.bronze,2);assert.deepEqual(next.players.p1.templeTiles,[2]);assert.equal(templeTileScore(next.players.p1),2);const notArrived=createGame(['p1']);notArrived.phase='playing';assert.throws(()=>reduce(notArrived,{type:'BUY_TEMPLE_TILE',playerId:'p1',tier:'bronze',combination:1}),/requires the Lost Temple/);});

test('each physical temple tile stack starts with one tile per player and depletes independently',()=>{const state=createGame(['p1','p2','p3']);assert.deepEqual({a:state.templeTiles.bronzeA,b:state.templeTiles.bronzeB,c:state.templeTiles.bronzeC,left:state.templeTiles.silverLeft,right:state.templeTiles.silverRight,gold:state.templeTiles.gold},{a:3,b:3,c:3,left:3,right:3,gold:3});state.phase='playing';state.currentPlayer='p1';state.research.templeArrivals=['p1'];state.players.p1.resources.jewel=1;const next=reduce(state,{type:'BUY_TEMPLE_TILE',playerId:'p1',tier:'bronze',combination:1});assert.equal(next.templeTiles.bronze,8);assert.equal(next.templeTiles.bronzeA,3);assert.equal(next.templeTiles.bronzeB,2);assert.equal(next.templeTiles.bronzeC,3);});
test('6-point temple stacks are individually limited by their printed left/right combination',()=>{const state=createGame(['p1']);state.phase='playing';state.currentPlayer='p1';state.research.templeArrivals=['p1'];state.templeTiles.silverLeft=0;state.templeTiles.silver=1;state.templeTiles.silverRight=1;state.players.p1.resources.coin=3;state.players.p1.resources.compass=3;state.players.p1.resources.tablet=3;state.players.p1.resources.arrowhead=3;state.players.p1.resources.jewel=3;assert.throws(()=>reduce(state,{type:'BUY_TEMPLE_TILE',playerId:'p1',tier:'silver',combination:0}),/left 6-point/);const next=reduce(state,{type:'BUY_TEMPLE_TILE',playerId:'p1',tier:'silver',combination:1});assert.equal(next.templeTiles.silver,0);assert.equal(next.templeTiles.silverRight,0);assert.deepEqual(next.players.p1.templeTiles,[6]);});
test('Monkey and Lizard magnifying glass can buy appropriate temple tiles before arrival',()=>{
 const track:ResearchTrackDefinition={id:'monkey',name:'Monkey',rows:[{magnifyingPoints:0,journalPoints:0,grantsAssistant:false,nodes:[{id:'monkey:r0:p0',rowIndex:0,pathIndex:0,researchLevel:0}]},{magnifyingPoints:0,journalPoints:0,grantsAssistant:false,nodes:[{id:'monkey:r1:p0',rowIndex:1,pathIndex:0,researchLevel:1}]},{magnifyingPoints:0,journalPoints:0,grantsAssistant:false,nodes:[{id:'monkey:r2:p0',rowIndex:2,pathIndex:0,researchLevel:2}]}]};
 const oneBelow=createGame(['p1']);oneBelow.research.magnifyingNode.p1='monkey:r2:p0';oneBelow.players.p1.resources.coin=1;oneBelow.players.p1.resources.tablet=2;oneBelow.players.p1.resources.jewel=1;buyTempleTile(oneBelow,'p1','silver',undefined,track);assert.deepEqual(oneBelow.players.p1.templeTiles,[6]);
 const twoBelow=createGame(['p1']);twoBelow.research.magnifyingNode.p1='monkey:r1:p0';twoBelow.players.p1.resources.coin=1;twoBelow.players.p1.resources.tablet=2;buyTempleTile(twoBelow,'p1','bronze',0,track);assert.deepEqual(twoBelow.players.p1.templeTiles,[2]);assert.throws(()=>buyTempleTile(twoBelow,'p1','silver',undefined,track),/requires the Lost Temple/);
});
