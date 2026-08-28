import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from './engine.ts';
import { reduceWithLeaders } from './engine-with-leaders.ts';
import { activateFaceUpUndiscoveredIdol } from './site-idols.ts';
import type { EngineContext } from './types.ts';

const context:EngineContext={cards:{},idols:{coin:{id:'coin',rewardCode:'c',expansion:'Base Game'},tablet:{id:'tablet',rewardCode:'t',expansion:'Base Game'}},sites:{site1:{id:'site1',level:1,rewardCode:'',expansion:'Base Game'}},guardians:{g:{id:'g',expansion:'Base Game'}}};
function game(){const s=createGame(['p1']);s.phase='playing';s.currentPlayer='p1';s.players.p1.resources.compass=3;s.discovery.level1Deck=['site1'];s.discovery.guardianDeck=['g'];s.discovery.idolDeck=['tablet','coin'];s.sites.x={id:'x',level:1,idolSlots:1} as any;(s.sites.x as any).faceUpIdolId='coin';return s;}

test('Cartography activates a visible idol without taking it',()=>{const s=game();const next=activateFaceUpUndiscoveredIdol(s,'p1','x',context);assert.equal(next.players.p1.resources.coin,1);assert.deepEqual(next.players.p1.idols,[]);assert.equal((next.sites.x as any).faceUpIdolId,'coin');});
test('later discovery takes the same idol that was assigned to the site',()=>{const s=game();const next=reduceWithLeaders(s,{type:'DISCOVER_SITE',playerId:'p1',siteId:'x'},context);assert.deepEqual(next.players.p1.idols,[{id:'coin',faceUp:true}]);assert.equal(next.players.p1.resources.coin,1);assert.equal((next.sites.x as any).faceUpIdolId,undefined);assert.ok(next.discovery.idolDeck.includes('tablet'));});
test('Cartography rejects an already discovered site',()=>{const s=game();s.sites.x.tileId='site1';assert.throws(()=>activateFaceUpUndiscoveredIdol(s,'p1','x',context),/undiscovered/);});
