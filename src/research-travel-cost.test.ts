import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, reduce } from './engine.ts';
import { advanceResearchByNode } from './research-action.ts';
import type { EngineContext, ResearchTrackDefinition } from './types.ts';

const track: ResearchTrackDefinition = {
  id: 'monkey',
  name: 'Monkey',
  rows: [{ magnifyingPoints: 1, journalPoints: 0, grantsAssistant: false, nodes: [
    { id: 'monkey:r0:p0', rowIndex: 0, pathIndex: 0, researchLevel: 0 },
  ] }],
  bridges: [{
    id: 'monkey:start->monkey:r0:p0', from: 'monkey:start', to: 'monkey:r0:p0', cost: { travel: { car: 1 } }, verified: true, allowedTokens: ['magnifying'],
  }],
};
const context:EngineContext={cards:{car:{id:'car',name:'Car',type:'Starter',expansion:'test',travel:{car:1}},plane:{id:'plane',name:'Plane',type:'Starter',expansion:'test',travel:{plane:1}},boot:{id:'boot',name:'Boot',type:'Starter',expansion:'test',travel:{boot:1}}},researchTracks:{monkey:track}};
function game(){const s=createGame(['p1']);s.phase='playing';s.currentPlayer='p1';s.research.board='monkey';s.research.magnifyingNode.p1='monkey:start';s.research.journalNode.p1='monkey:start';return s;}
test('Monkey research travel cost consumes a matching card from hand',()=>{const s=game();s.players.p1.hand=['car'];advanceResearchByNode(s,track,{playerId:'p1',token:'magnifying',toNodeId:'monkey:r0:p0',paymentCardIds:['car']},context);assert.deepEqual(s.players.p1.hand,[]);assert.deepEqual(s.players.p1.playedCards,['car']);assert.equal(s.research.magnifyingNode.p1,'monkey:r0:p0');});
test('plane can satisfy Monkey research car cost',()=>{const s=game();s.players.p1.hand=['plane'];advanceResearchByNode(s,track,{playerId:'p1',token:'magnifying',toNodeId:'monkey:r0:p0',paymentCardIds:['plane']},context);assert.deepEqual(s.players.p1.playedCards,['plane']);});
test('invalid Monkey research travel payment leaves state unchanged',()=>{const s=game();s.players.p1.hand=['boot'];const before=structuredClone(s);assert.throws(()=>advanceResearchByNode(s,track,{playerId:'p1',token:'magnifying',toNodeId:'monkey:r0:p0',paymentCardIds:['boot']},context),/does not satisfy cost/);assert.deepEqual(s,before);});
test('ADVANCE_RESEARCH reducer forwards Monkey travel payment cards and context',()=>{const s=game();s.players.p1.hand=['car'];const next=reduce(s,{type:'ADVANCE_RESEARCH',playerId:'p1',track:'magnifying',toNodeId:'monkey:r0:p0',paymentCardIds:['car']},context);assert.deepEqual(next.players.p1.hand,[]);assert.deepEqual(next.players.p1.playedCards,['car']);assert.equal(next.research.magnifyingNode.p1,'monkey:r0:p0');});
