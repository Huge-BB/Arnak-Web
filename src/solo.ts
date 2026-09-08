import { researchNodeLevel } from './research-topology.ts';
import { researchTempleNode } from './research-manual.ts';
import { researchScore } from './research.ts';
import { shuffleWithSeed } from './rng.ts';
import { cardScore } from './final-scoring.ts';
import { emptyIdolSlotScore, guardianScore, templeTileScore } from './scoring.ts';
import type { EngineContext, GameState, PlayerId, Resource, SoloRivalActionKind, SoloRivalState } from './types.ts';

export const SOLO_HUMAN = 'p1';
export const SOLO_RIVAL = 'rival';
type Direction = 'left'|'right';
type RivalTile = { id:string; kind:SoloRivalActionKind; color:'archaeologist'|'green'|'red'; direction:Direction; resource?:Resource; skipRoundFive?:boolean };

// The physical arrows are deliberately kept with the tile definitions rather
// than rerolled: a seeded solo state is replayable and auditable.
const TILES: RivalTile[] = [
  { id:'dig-coin', kind:'dig', color:'archaeologist', resource:'coin', direction:'left' },
  { id:'dig-compass', kind:'dig', color:'archaeologist', resource:'compass', direction:'right' },
  { id:'dig-tablet', kind:'dig', color:'archaeologist', resource:'tablet', direction:'left' },
  { id:'dig-arrowhead', kind:'dig', color:'archaeologist', resource:'arrowhead', direction:'right' },
  { id:'dig-jewel', kind:'dig', color:'archaeologist', resource:'jewel', direction:'left' },
  { id:'discover-green', kind:'discover', color:'green', direction:'right', skipRoundFive:true },
  { id:'discover-red', kind:'discover', color:'red', direction:'right' },
  { id:'research-green', kind:'research', color:'green', direction:'left', skipRoundFive:true },
  { id:'research-red', kind:'research', color:'red', direction:'left', skipRoundFive:true },
  { id:'overcome-green', kind:'overcome', color:'green', direction:'right', skipRoundFive:true },
  { id:'overcome-red', kind:'overcome', color:'red', direction:'right' },
  { id:'buy-item-green', kind:'buy-item', color:'green', direction:'left' },
  { id:'buy-item-red', kind:'buy-item', color:'red', direction:'left' },
  { id:'buy-artifact-green', kind:'buy-artifact', color:'green', direction:'right' },
  { id:'buy-artifact-red', kind:'buy-artifact', color:'red', direction:'right' },
];
const tile = (id:string) => {
  const result=TILES.find(candidate=>candidate.id===id);
  if(!result) throw new Error(`Unknown solo rival tile: ${id}`);
  return result;
};
const siteX = (siteId:string) => {
  const match=siteId.match(/(?:camp|level[12])-(\d+)/);
  return match ? Number(match[1]) : 0;
};
function chooseSite(direction:Direction, candidates:{id:string;mapRow?:number}[], prefer:'high'|'low') {
  if(!candidates.length) return undefined;
  const bestRow=prefer==='high' ? Math.max(...candidates.map(candidate=>candidate.mapRow??0)) : Math.min(...candidates.map(candidate=>candidate.mapRow??0));
  const row=candidates.filter(candidate=>(candidate.mapRow??0)===bestRow).sort((a,b)=>siteX(a.id)-siteX(b.id));
  return direction==='left'?row[0]:row[row.length-1];
}
function actionDeck(seed:string,difficulty:number) {
  if(!Number.isInteger(difficulty)||difficulty<0||difficulty>5) throw new Error('Solo difficulty must be an integer from 0 to 5');
  const pairKinds:SoloRivalActionKind[]=['discover','research','overcome','buy-item','buy-artifact'];
  const redKinds=new Set(shuffleWithSeed(pairKinds,`${seed}:solo:red`).slice(0,difficulty));
  const selected=[...TILES.filter(candidate=>candidate.color==='archaeologist').map(candidate=>candidate.id),...pairKinds.map(kind=>`${kind}-${redKinds.has(kind)?'red':'green'}`)];
  return shuffleWithSeed(selected,`${seed}:solo:deck`);
}

/** Applies the solo-only setup after the normal two-player component setup.
 * Keeping this separate from START_GAME keeps normal multiplayer state and
 * replay data backwards compatible. */
export function configureSoloGame(state:GameState,difficulty:number):GameState {
  if(state.phase!=='playing')throw new Error('Configure solo only after START_GAME');
  if(state.playerOrder.length!==2||!state.players[SOLO_RIVAL]||!state.players[SOLO_HUMAN])throw new Error('Solo setup requires rival and p1 players');
  const seed=state.setupSeed??'default';
  const rival=state.players[SOLO_RIVAL];
  rival.name='Rival'; rival.color='Red'; rival.workers=6; rival.availableWorkers=6;
  rival.deck=[]; rival.hand=[]; rival.discard=[]; rival.playedCards=[]; rival.idols=[]; rival.assistants=[];
  rival.resources={coin:0,compass:0,tablet:0,arrowhead:0,jewel:0,fear:0};
  state.solo={humanPlayerId:SOLO_HUMAN,rivalPlayerId:SOLO_RIVAL,difficulty,actionDeck:actionDeck(seed,difficulty),usedActionTiles:[]};
  state.firstPlayer=SOLO_RIVAL; state.currentPlayer=SOLO_RIVAL;
  return state;
}
function takeAssistant(state:GameState,direction:Direction){
  const sizes=state.assistants.stacks.map(stack=>stack.length),largest=Math.max(...sizes);
  if(largest<1)return;
  const indexes=sizes.map((size,index)=>size===largest?index:-1).filter(index=>index>=0);
  const index=direction==='left'?indexes[0]:indexes[indexes.length-1];
  state.assistants.stacks[index].shift();
}
function advanceRivalResearch(state:GameState,direction:Direction,context:EngineContext,takeSupplyAssistant:boolean) {
  const solo=state.solo!,rival=state.players[solo.rivalPlayerId],track=context.researchTracks?.[state.research.board];
  if(!track) throw new Error(`Solo requires research data for ${state.research.board}`);
  const from=state.research.magnifyingNode[solo.rivalPlayerId];
  if(from===researchTempleNode(track.id)) {
    if(takeSupplyAssistant)takeAssistant(state,direction);
    if(state.templeTiles.silver>0){ state.templeTiles.silver-=1; rival.templeTiles.push(6); return 'already at Lost Temple: takes a 6-point tile'; }
    return 'already at Lost Temple: no 6-point tile remains';
  }
  const bridges=(track.bridges??[]).filter(bridge=>bridge.from===from&&(!bridge.allowedTokens||bridge.allowedTokens.includes('magnifying')));
  if(!bridges.length)return 'cannot advance';
  const ordered=[...bridges].sort((a,b)=>{
    const nodeA=a.to===researchTempleNode(track.id)?{pathIndex:direction==='left'?-Infinity:Infinity}:track.rows.flatMap(row=>row.nodes??[]).find(node=>node.id===a.to)!;
    const nodeB=b.to===researchTempleNode(track.id)?{pathIndex:direction==='left'?-Infinity:Infinity}:track.rows.flatMap(row=>row.nodes??[]).find(node=>node.id===b.to)!;
    return nodeA.pathIndex-nodeB.pathIndex;
  });
  const bridge=direction==='left'?ordered[0]:ordered[ordered.length-1],destination=bridge.to;
  state.research.magnifyingNode[solo.rivalPlayerId]=destination;
  const level=destination===researchTempleNode(track.id)?track.rows.length:researchNodeLevel(track,destination);
  state.research.magnifying[solo.rivalPlayerId]=level; rival.researchMagnifying=level;
  const bonuses=state.research.bonusTiles[destination]; if(bonuses?.length) bonuses.shift();
  if(destination===researchTempleNode(track.id)) {
    const arrival=state.research.templeArrivals.length;
    state.research.templeArrivals.push(solo.rivalPlayerId);
    const points=track.templeArrivalPoints?.[arrival]; if(points!==undefined)state.research.templeArrivalPoints[solo.rivalPlayerId]=points;
    state.research.templeBonusTiles.shift();
  }
  if(takeSupplyAssistant)takeAssistant(state,direction);
  return `researches to ${destination}`;
}
function siteRewardCode(state:GameState,siteId:string,context:EngineContext) {
  const site=state.sites[siteId]; return site.rewardCode??(site.tileId?context.sites?.[site.tileId]?.rewardCode:'')??'';
}
function rivalDig(state:GameState,tileData:RivalTile,context:EngineContext) {
  const solo=state.solo!,rival=state.players[solo.rivalPlayerId],wanted=tileData.resource!;
  const code:Record<Resource,string>={coin:'c',compass:'s',tablet:'t',arrowhead:'a',jewel:'j',fear:'f'};
  const candidates=Object.values(state.sites).filter(site=>!site.blocked&&!site.occupiedBy&&siteRewardCode(state,site.id,context).includes(code[wanted]));
  const selected=chooseSite(tileData.direction,candidates,'high');
  if(!selected)return `no available ${wanted} site`;
  selected.occupiedBy=solo.rivalPlayerId; rival.availableWorkers=Math.max(0,rival.availableWorkers-1);
  return `digs ${selected.id} for ${wanted}`;
}
function discoverDetails(tileId:string,round:number):{level:1|2;guardian:boolean}|undefined {
  if(tileId==='discover-green') return round===1?{level:1,guardian:false}:round===2||round===3?{level:1,guardian:true}:round===4?{level:2,guardian:true}:undefined;
  return round===1?{level:1,guardian:false}:round===2?{level:1,guardian:true}:{level:2,guardian:true};
}
function rivalDiscover(state:GameState,tileData:RivalTile,context:EngineContext) {
  const details=discoverDetails(tileData.id,state.round); if(!details)return 'does nothing in round V';
  const solo=state.solo!,rival=state.players[solo.rivalPlayerId];
  const siteDeck=details.level===1?state.discovery.level1Deck:state.discovery.level2Deck;
  if(!siteDeck.length)return `no level ${details.level} site tiles remain`;
  if(details.guardian&&!state.discovery.guardianDeck.length)return 'no guardian tiles remain';
  const candidates=Object.values(state.sites).filter(site=>!site.blocked&&!site.tileId&&!site.occupiedBy&&site.level===details.level);
  const selected=chooseSite(tileData.direction,candidates,'low'); if(!selected)return `no undiscovered level ${details.level} site`;
  const faceUp=selected.faceUpIdolId,faceDown=selected.faceDownIdolIds??[];
  const moveIdol=(idolId:string,face:boolean)=>{const kind=context.idols?.[idolId]?.rewardCode??idolId;const duplicate=rival.idols.some(idol=>idol.faceUp&&(context.idols?.[idol.id]?.rewardCode??idol.id)===kind);rival.idols.push({id:idolId,faceUp:face&&!duplicate});};
  if(faceUp)moveIdol(faceUp,true); for(const idolId of faceDown)moveIdol(idolId,false);
  selected.faceUpIdolId=undefined; selected.faceDownIdolIds=[]; selected.tileId=siteDeck.shift();
  if(details.guardian)selected.guardian=state.discovery.guardianDeck.shift();
  selected.occupiedBy=solo.rivalPlayerId; rival.availableWorkers=Math.max(0,rival.availableWorkers-1);
  return `discovers ${selected.id}${details.guardian?' and awakens a guardian':''}`;
}
function rivalOvercome(state:GameState,tileData:RivalTile,context:EngineContext) {
  const solo=state.solo!,rival=state.players[solo.rivalPlayerId];
  if(tileData.skipRoundFive&&state.round===5)return 'does nothing in round V';
  const candidates=Object.values(state.sites).filter(site=>site.occupiedBy===solo.rivalPlayerId&&site.guardian);
  const selected=chooseSite(tileData.direction,candidates,'high');
  if(!selected)return advanceRivalResearch(state,tileData.direction,context,false);
  rival.defeatedGuardians.push(selected.guardian!); delete selected.guardian;
  return `overcomes guardian at ${selected.id}`;
}
function rivalBuy(state:GameState,tileData:RivalTile,context:EngineContext) {
  const solo=state.solo!,rival=state.players[solo.rivalPlayerId],row=tileData.kind==='buy-item'?state.market.items:state.market.artifacts;
  if(!row.length)return `no ${tileData.kind==='buy-item'?'item':'artifact'} available`;
  const ordered=row.map((id,index)=>({id,index,points:context.cards[id]?.points??0})).sort((a,b)=>a.points-b.points||a.index-b.index);
  const selected=tileData.color==='red'?ordered[ordered.length-1]:ordered[0];
  row.splice(row.indexOf(selected.id),1); rival.playedCards.push(selected.id);
  const deck=tileData.kind==='buy-item'?state.market.itemDeck:state.market.artifactDeck,refill=deck.shift(); if(refill){if(tileData.kind==='buy-item')row.push(refill);else row.unshift(refill);}
  return `buys ${context.cards[selected.id]?.name??selected.id}`;
}
export function resolveSoloRivalAction(state:GameState,context:EngineContext):GameState {
  const solo=state.solo; if(!solo)throw new Error('This is not a solo game');
  if(state.phase!=='playing'||state.currentPlayer!==solo.rivalPlayerId)throw new Error('It is not the rival’s turn');
  const tileId=solo.actionDeck.shift(); if(!tileId)throw new Error('The rival has no action tiles left this round');
  const data=tile(tileId); let description='',resolved=true;
  if(data.skipRoundFive&&state.round===5){description='does nothing in round V';resolved=false;}
  else if(data.kind==='dig')description=rivalDig(state,data,context);
  else if(data.kind==='discover')description=rivalDiscover(state,data,context);
  else if(data.kind==='research')description=advanceRivalResearch(state,data.direction,context,true);
  else if(data.kind==='overcome')description=rivalOvercome(state,data,context);
  else description=rivalBuy(state,data,context);
  solo.usedActionTiles.push(tileId); solo.lastAction={tileId,description,resolved};
  if(!solo.actionDeck.length) state.players[solo.rivalPlayerId].hasPassed=true;
  const human=state.players[solo.humanPlayerId];
  state.currentPlayer=human.hasPassed?solo.rivalPlayerId:solo.humanPlayerId;
  return state;
}
/** Rebuild the same ten selected tiles for the next official solo round. */
export function resetSoloRound(state:GameState) {
  const solo=state.solo; if(!solo)return;
  const seed=state.setupSeed??'default';
  solo.actionDeck=shuffleWithSeed(solo.usedActionTiles,`${seed}:solo:round:${state.round}`);
  solo.usedActionTiles=[]; delete solo.lastAction;
  const rival=state.players[solo.rivalPlayerId]; rival.hasPassed=false; rival.availableWorkers=rival.workers;
  state.firstPlayer=solo.rivalPlayerId; state.currentPlayer=solo.rivalPlayerId;
}
export interface SoloScore { human:number; rival:number; humanWon:boolean; }
export function scoreSoloGame(state:GameState,context:EngineContext):SoloScore {
  if(!state.solo)throw new Error('This is not a solo game');
  const track=context.researchTracks?.[state.research.board]; if(!track)throw new Error('Solo scoring requires the selected research track');
  const solo=state.solo,human=state.players[solo.humanPlayerId],rival=state.players[solo.rivalPlayerId];
  const cards=(player:typeof human)=>cardScore(player,context);
  const normal=(player:typeof human)=>researchScore(track,player.researchMagnifying,player.researchJournal,state.research.templeArrivalPoints[player.id]??0)+templeTileScore(player)+guardianScore(player)+cards(player);
  const humanScore=normal(human)+human.idols.length*3+emptyIdolSlotScore(human);
  const unique=rival.idols.filter(idol=>idol.faceUp).length*3,duplicates=rival.idols.filter(idol=>!idol.faceUp).length*2;
  return {human:humanScore,rival:normal(rival)+unique+duplicates,humanWon:humanScore>normal(rival)+unique+duplicates};
}
