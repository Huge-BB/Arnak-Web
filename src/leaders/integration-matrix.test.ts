import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../engine.ts';
import { applyEngineCommand } from '../engine-api.ts';
import type { EngineContext, LeaderId } from '../types.ts';
import { setupLeader } from './index.ts';

const leaderNames=['Funding','Piloting','Transmission','Hidden Fear','Falconry','Animal Bond','Tracking','Connections','Research Notes','Resourcefulness','Special Delivery','Preservation','Arnakology','Linguistics','Hike','Cartography','Scouting','Divine Guidance','Meditation','Worldly Goods','Blindsight'];
const cards:EngineContext['cards']={fear1:{id:'fear1',name:'Fear',type:'Fear',expansion:'Base Game'},fear2:{id:'fear2',name:'Fear',type:'Fear',expansion:'Base Game'},draw:{id:'draw',name:'Draw Target',type:'Starter',expansion:'Base Game'},art1:{id:'art1',name:'Archive 1',type:'Artifact',expansion:'Base Game'},art2:{id:'art2',name:'Archive 2',type:'Artifact',expansion:'Base Game'},art3:{id:'art3',name:'Archive 3',type:'Artifact',expansion:'Base Game'}};
for(const name of leaderNames)cards[`leader:${name}`]={id:`leader:${name}`,name,type:'Starter',expansion:'Expedition Leaders'};
const context:EngineContext={cards};

function leaderState(id:LeaderId){
 const s=createGame(['p1']);s.phase='playing';s.currentPlayer='p1';s.setupSeed='matrix';s.players.p1.hand=['fear1','fear2'];s.players.p1.deck=['draw'];s.market.artifactDeck=['art1','art2','art3'];
 setupLeader(s,'p1',id,context,'matrix');s.players.p1.deck=['draw'];s.players.p1.idols.push({id:'idol',faceUp:true});return s;
}
function useIdol(id:LeaderId,effect:'leaderUnique'|'mysticExileArrowhead',extra:Record<string,unknown>={}){
 const s=leaderState(id);return applyEngineCommand(s,{type:'action',action:{type:'LEADER_USE_IDOL',playerId:'p1',idolId:'idol',slotIndex:2,effect,...extra} as any},context);
}

test('Captain blue idol integrates through public engine API',()=>{const s=useIdol('captain','leaderUnique');assert.equal(s.players.p1.resources.compass,1);assert.equal(s.actionWindow?.temporaryTravel.plane,1);assert.equal(s.players.p1.idols[0].inSlot,true);});
test('Falconer blue idol integrates through public engine API',()=>{const s=useIdol('falconer','leaderUnique');assert.equal(s.players.p1.resources.compass,1);assert.equal(s.players.p1.leader!.data.eaglePosition,1);});
test('Baroness blue idol integrates through public engine API',()=>{const s=useIdol('baroness','leaderUnique');assert.equal(s.players.p1.resources.coin,1);assert.ok(s.players.p1.hand.includes('draw'));});
test('Professor blue idol integrates through public engine API',()=>{const s=useIdol('professor','leaderUnique');const suitcase=s.players.p1.leader!.data.suitcase as {compass:number;tablet:number};assert.equal(suitcase.compass,1);assert.equal(suitcase.tablet,1);});
test('Explorer blue idol refreshes a used snack through public engine API',()=>{const s=leaderState('explorer');const snacks=s.players.p1.leader!.data.snacks as Array<{id:string;used:boolean;siteId?:string}>;const snack=snacks[0];snack.used=true;snack.siteId='x';const next=applyEngineCommand(s,{type:'action',action:{type:'LEADER_USE_IDOL',playerId:'p1',idolId:'idol',slotIndex:2,effect:'leaderUnique',snackId:snack.id as 'free'|'coin'|'compass'}},context);assert.equal(next.players.p1.resources.compass,1);assert.equal(next.players.p1.resources.coin,1);const refreshed=(next.players.p1.leader!.data.snacks as Array<{id:string;used:boolean;siteId?:string}>).find(x=>x.id===snack.id)!;assert.equal(refreshed.used,false);assert.equal(refreshed.siteId,undefined);});
test('Mystic blue idol creates resolvable exile pending through public engine API',()=>{let s=useIdol('mystic','mysticExileArrowhead');assert.equal(s.players.p1.resources.arrowhead,1);assert.equal(s.pendingRewards[0]?.code,'leader:EXILE_OWN_CARD');const cardId=s.players.p1.hand[0];s=applyEngineCommand(s,{type:'pending-choice',playerId:'p1',pendingIndex:0,choice:{type:'card',cardId}},context);assert.equal(s.pendingRewards.length,0);assert.ok(s.market.exiled.includes(cardId)||((s.players.p1.leader!.data.ritualPile as string[]|undefined)?.includes(cardId)));});
