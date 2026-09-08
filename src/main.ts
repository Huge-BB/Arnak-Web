import './style.css';import './theme.css';
import { cardHoverText } from './card-effect-summaries.ts';
import cards from './generated/cards.json';import assistants from './generated/assistants.json';import sites from './generated/sites.json';import idols from './generated/idols.json';import guardians from './generated/guardians.json';import assetsJson from './generated/local-assets.json';import generatedTracks from './generated/research-tracks.json';import manual from '../data/research-manual-data.json';import rewards from '../data/research-rewards-manual.json';
import {createGame,createSoloGame} from './engine.ts';import {applyEngineCommand} from './engine-api.ts';import type {EngineContext,GameAction,GameState,LeaderId,MoonStaffVariant,PlayerId,ResearchBoardId} from './types.ts';import type {PendingChoice} from './pending-choice.ts';import {withBaseAssistantEffects} from './assistant-effect-data.ts';import {withBaseGuardianEffects} from './guardian-effect-data.ts';import {withBaseCardEffects} from './card-effect-data.ts';import {buildResearchTracks} from './research-data.ts';
import {scoreFinishedGame} from './final-scoring.ts';
import {scoreSoloGame} from './solo.ts';
import {canBuyTempleTile,templeTileCost} from './temple-tiles.ts';
import {canPayTravel} from './travel.ts';
import {decodeStateCode,encodeStateCode} from './state-code.ts';
import { calibrationMark, calibrationStorageKey, readBoardCalibration } from './board-calibration.ts';
import {BASE_BOARD_INTERACTION_SPOTS,createBaseBoardSites} from './base-board-setup.ts';
import {BASE_IDOL_EFFECTS,BASE_IDOL_SLOTS,LEADER_IDOL_EFFECT_LAYOUT,LEADER_LAYOUT,RESEARCH_BOARD_SIZE,SUPPLY_BOARD_COMPONENTS,SUPPLY_BOARD_SIZE,researchTokenPoint,pointStyle,playerPointStyle} from './board-layout.ts';
import {idolSlotConfig,type IdolEffect} from './leaders/idol-actions.ts';
type Asset={url?:string;sheetUrl:string;sheetWidth:number;sheetHeight:number;cardIndex:number};type Spot={id:string;level:1|2;left:number;top:number;width?:number;height?:number;rewardCode?:string};
const tracks=buildResearchTracks(generatedTracks,manual,{rewardManual:rewards}),context:EngineContext=withBaseCardEffects(withBaseGuardianEffects(withBaseAssistantEffects({cards,assistants,sites,idols,guardians,researchTracks:tracks}))),assets=(assetsJson as {assets:Record<string,Asset>}).assets,app=document.querySelector<HTMLDivElement>('#app')!;
const spots:Spot[]=BASE_BOARD_INTERACTION_SPOTS;
function templeCostText(tier:'bronze'|'silver'|'gold',combination?:0|1|2) {
  return Object.entries(templeTileCost(tier, combination, state.research.board)).map(([resource, amount]) => `${amount} ${resource}`).join(' + ');
}
function calibratedPlayerPoint(id: string, fallback: { x: number; y: number }) {
  const mark = calibrationMark('player-base', id);
  return mark ? { x: mark.x / 100 * 1270, y: mark.y / 100 * 328 } : fallback;
}
function calibratedLeaderPoint(leader: LeaderId, id: string, fallback: { x: number; y: number }) {
  const mark = calibrationMark(`leader-${leader}`, id);
  return mark ? { x: mark.x / 100 * 1270, y: mark.y / 100 * 328 } : fallback;
}
function calibratedMainSpots() {
  const marks = readBoardCalibration()[`main-${mainBoard}`] ?? [];
  return spots.map((spot) => {
    // A discovered site card is now the interaction target.  Prefer its own
    // calibrated rectangle, while accepting legacy generic hotspot records
    // only as a migration fallback.
    const reversed = [...marks].reverse();
    const mark = reversed.find((candidate) => candidate.id.endsWith(`-${spot.id}-site`))
      ?? reversed.find((candidate) => candidate.label === `${spot.id}-site`)
      ?? reversed.find((candidate) => candidate.id.endsWith(`-${spot.id}`) || candidate.id.endsWith(`-${spot.id}-a`))
      ?? reversed.find((candidate) => candidate.label === spot.id || candidate.label === `${spot.id}-a`);
    return mark ? { ...spot, left: mark.x * 2 / 3, top: mark.y, width: mark.width * 2 / 3, height: mark.height } : spot;
  });
}
function calibratedMainPieceStyle(spot: Spot, kind: 'site' | 'guardian') {
  const marks = readBoardCalibration()[`main-${mainBoard}`] ?? [], reversed = [...marks].reverse();
  const mark = reversed.find((candidate) => candidate.id.endsWith(`-${spot.id}-${kind}`))
    ?? reversed.find((candidate) => candidate.label === `${spot.id}-${kind}`);
  const defaultSize = spot.level === 1 ? 150 : 160;
  const defaultX = kind === 'site' ? 50 : 78, defaultY = kind === 'site' ? 50 : 23;
  const width = mark?.width ?? defaultSize, height = mark?.height ?? defaultSize;
  if (!mark) return `--piece-x:${defaultX}%;--piece-y:${defaultY}%;--piece-w:${width / (spot.width ?? width) * 100}%;--piece-h:${height / (spot.height ?? height) * 100}%`;
  const visualX = mark.x * 2 / 3, visualY = mark.y;
  const hotspotWidth = (spot.width ?? width) / 10, hotspotHeight = (spot.height ?? height) / 10.3;
  return `--piece-x:${(visualX - spot.left) / hotspotWidth * 100}%;--piece-y:${(visualY - spot.top) / hotspotHeight * 100}%;--piece-w:${width / (spot.width ?? width) * 100}%;--piece-h:${height / (spot.height ?? height) * 100}%`;
}
/** Absolute board rectangle for an independently clickable calibrated piece. */
function calibratedMainPieceRect(spot: Spot, kind: 'site' | 'guardian') {
  const marks = readBoardCalibration()[`main-${mainBoard}`] ?? [], reversed = [...marks].reverse();
  const mark = reversed.find((candidate) => candidate.id.endsWith(`-${spot.id}-${kind}`))
    ?? reversed.find((candidate) => candidate.label === `${spot.id}-${kind}`);
  const defaultSize = spot.level === 1 ? 150 : 160;
  const defaultX = kind === 'site' ? 50 : 78, defaultY = kind === 'site' ? 50 : 23;
  const siteWidth = spot.width ? spot.width / 10 : 6.2, siteHeight = spot.height ? spot.height / 10.3 : 5.3;
  const width = mark?.width ?? defaultSize, height = mark?.height ?? defaultSize;
  const x = mark ? mark.x * 2 / 3 : spot.left + siteWidth * defaultX / 100;
  const y = mark ? mark.y : spot.top + siteHeight * defaultY / 100;
  return { x, y, width: siteWidth * width / (spot.width ?? width), height: siteHeight * height / (spot.height ?? height) };
}
function calibratedResearchPoint(board: ResearchBoardId, kind: 'magnifying' | 'journal', index: number, fallback: { x: number; y: number }) {
  const mark = calibrationMark(board, `${board}-${kind}-${index}`) ?? calibrationMark(board, `${kind}-${index}`);
  return mark ? { x: mark.x / 100 * RESEARCH_BOARD_SIZE.width, y: mark.y / 100 * RESEARCH_BOARD_SIZE.height } : fallback;
}
function calibratedResearchCellPoint(board: ResearchBoardId, nodeId: string, fallback: { x: number; y: number }) {
  const suffix = nodeId.replace(`${board}:`, '').replaceAll(':', '-');
  const mark = calibrationMark(board, `${board}-research-cell-${suffix}`) ?? calibrationMark(board, `research-cell-${suffix}`);
  return mark ? { x: mark.x / 100 * RESEARCH_BOARD_SIZE.width, y: mark.y / 100 * RESEARCH_BOARD_SIZE.height } : fallback;
}
function calibratedResearchComponent(board: ResearchBoardId, id: string, fallback: { x: number; y: number; width: number; height: number }) {
  const mark = calibrationMark(board, `${board}-${id}`) ?? calibrationMark(board, id);
  return mark ? {
    x: mark.x / 100 * RESEARCH_BOARD_SIZE.width,
    y: mark.y / 100 * RESEARCH_BOARD_SIZE.height,
    width: mark.width,
    height: mark.height,
  } : fallback;
}
function researchComponentStyle(component: { x: number; y: number; width: number; height: number }) {
  return `${pointStyle(component, RESEARCH_BOARD_SIZE)};--component-w:${component.width / RESEARCH_BOARD_SIZE.width * 100}%;--component-h:${component.height / RESEARCH_BOARD_SIZE.height * 100}%`;
}
let state:GameState=createGame(['p1','p2']),screen:'setup'|'game'|'rooms'|'room'='setup',setupPlayerCount=2,setupSeed='arnak-demo',setupMoonStaff:MoonStaffVariant='blue',setupSurpriseShipment=false,setupLeadersMarket=false,setupLeaders:Record<string,LeaderId|''>={p1:'',p2:'',p3:'',p4:''},theme:'bga'|'jungle'='jungle',mainBoard:'bird'|'snake'='bird',researchBoard:ResearchBoardId='bird',researchToken:'magnifying'|'journal'='magnifying',pendingSelection:string[]=[],artifactId:string|undefined,leaderStartingCardId:string|undefined,message='',researchLab=false,soloDifficulty=2,researchMoveChoice:{destination:string;tokens:('magnifying'|'journal')[]}|undefined,researchBonusChoice:{destination:string;token:'magnifying'|'journal';tileIds:string[]}|undefined,leaderIdolDraft:{playerId:PlayerId;slotIndex:number}|undefined,leaderIdolSnackDraft:{playerId:PlayerId;slotIndex:number;effect:IdolEffect}|undefined,captainSpecialistDraft:PlayerId|undefined,mysticRitualDraft:PlayerId|undefined;
const SOLO_ACTION_ART=new Set(['dig-coin','dig-tablet','dig-jewel','dig-compass','dig-arrowhead','discover-green','discover-red','buy-item-green','buy-item-red','buy-artifact-green','buy-artifact-red','research-green','research-red','overcome-green','overcome-red']);
function soloActionFace(tileId:string){return SOLO_ACTION_ART.has(tileId)?`<i class="solo-action-face" style="background-image:url('${publicAsset(`/assets/solo-actions/${tileId}.webp`)}')" aria-hidden="true"></i>`:'';}
function start(){const players=Array.from({length:setupPlayerCount},(_,i)=>`p${i+1}`);const leaders=Object.fromEntries(players.flatMap(id=>setupLeaders[id] ? [[id,setupLeaders[id]]] : []));const seed=setupSeed||'arnak-demo',marketExpansions=['Base Game',...(setupLeadersMarket?['Expedition Leaders']:[]),...(setupSurpriseShipment?['Surprise Shipment']:[])];state=createGame(players);state.sites=createBaseBoardSites(players.length,seed,mainBoard);state=applyEngineCommand(state,{type:'action',action:{type:'START_GAME',seed,researchBoard,moonStaff:setupMoonStaff,leaders,marketExpansions}},context);screen='game';pendingSelection=[];artifactId=undefined;leaderStartingCardId=undefined;message='';render()}
function startSolo(){const seed=setupSeed||'arnak-solo';researchLab=false;const unsupportedResearchBoard=researchBoard!=='bird'&&researchBoard!=='snake',soloResearchBoard=unsupportedResearchBoard?'bird':researchBoard;if(unsupportedResearchBoard)researchBoard=soloResearchBoard;state=createSoloGame({seed,difficulty:soloDifficulty,board:mainBoard,researchBoard:soloResearchBoard,context});screen='game';pendingSelection=[];artifactId=undefined;leaderStartingCardId=undefined;message=`单人 solo：难度 ${soloDifficulty}，对手先行动。${unsupportedResearchBoard?' 已切换至基础研究板。':''}`;render()}
function startResearchLab(){researchLab=true;setupPlayerCount=1;mainBoard='bird';state=createGame(['p1']);state.sites=createBaseBoardSites(1,setupSeed||'research-lab',mainBoard);state=applyEngineCommand(state,{type:'action',action:{type:'START_GAME',seed:setupSeed||'research-lab',researchBoard,moonStaff:setupMoonStaff,marketExpansions:['Base Game']}},context);const player=state.players.p1;player.resources={coin:40,compass:40,tablet:40,arrowhead:40,jewel:40,fear:0};const travelCards=Object.values(context.cards).filter(card=>card.type!=='Fear'&&Object.values(card.travel??{}).some(amount=>amount>0)).map(card=>card.id);player.hand=[...new Set([...player.hand,...travelCards])];player.idols=[...player.idols,...Object.keys(context.idols??{}).slice(0,5).map(id=>({id,inSlot:false}))];screen='game';pendingSelection=[];artifactId=undefined;leaderStartingCardId=undefined;message='研究轨实验室：资源与旅行牌已补满。选择研究标记后连续推进；重开会保留当前研究板。';render()}
function run(action:GameAction){try{state=applyEngineCommand(state,{type:'action',action},context);message=''}catch(e){message=e instanceof Error?e.message:String(e)}render()}
function choose(choice:PendingChoice){try{const p=state.pendingRewards[0];state=applyEngineCommand(state,{type:'pending-choice',playerId:p.playerId,pendingIndex:0,choice},context);pendingSelection=[];message=''}catch(e){message=e instanceof Error?e.message:String(e)}render()}
const publicAsset=(path:string)=>!path||/^(?:https?:|data:)/.test(path)?path:`${import.meta.env.BASE_URL.replace(/\/$/,'')}${path.startsWith('/')?path:`/${path}`}`;
function sprite(a?:Asset){if(!a)return'';if(a.url)return`background-image:url('${publicAsset(a.url)}')`;const x=a.cardIndex%a.sheetWidth,y=Math.floor(a.cardIndex/a.sheetWidth);return`background-image:url('${publicAsset(a.sheetUrl)}');background-size:${a.sheetWidth*100}% ${a.sheetHeight*100}%;background-position:${x/Math.max(1,a.sheetWidth-1)*100}% ${y/Math.max(1,a.sheetHeight-1)*100}%`}
function assistantAsset(id:string,level:'silver'|'gold'):Asset|undefined{const local=assets[`assistant:${id}:${level}`];if(local)return local;const image=assistants[id]?.image;if(!image)return undefined;return{sheetUrl:level==='silver'?image.silverUrl:image.goldUrl,sheetWidth:image.sheetWidth,sheetHeight:image.sheetHeight,cardIndex:image.cardIndex};}
function researchBonusFace(tileId: string) {
  const kind = tileId.replace(/:\d+$/, '').replace('base:', '');
  const source: Record<string, string> = { compass:'research-bonus-1.png', coin:'research-bonus-2.png', exile:'research-bonus-3.png', tablet:'research-bonus-4.png', upgrade:'research-bonus-coin.png', draw:'card-back.jpg' };
  const label: Record<string, string> = { compass:'gain 1 compass', coin:'gain 1 coin', tablet:'gain 1 tablet', draw:'draw 1 card', exile:'exile 1 card', upgrade:'upgrade 1 resource' };
  return { kind, label: label[kind] ?? kind, html: `<img src="${publicAsset(`/assets/${source[kind] ?? 'card-back.jpg'}`)}" alt="${label[kind] ?? kind}">` };
}
function card(id:string,action:'play'|'buy'){const d=context.cards[id],fear=d?.type==='Fear';return`<button class="card ${fear?'fear':''}" ${fear?'disabled':''} data-card-id="${id}" data-card-action="${action}" title="${cardHoverText(id,d?.name??id)}"><i style="${sprite(assets[`card:${id}:face`])}"></i></button>`}
function board(){return`<section class="map-board"><img src="${publicAsset(`/assets/boards/main-${mainBoard}.jpg`)}" alt="main board">${spots.map(s=>{const site=state.sites[s.id];if(!site)return'';const ready=!!(s.rewardCode||site.tileId),status=site.blocked?'blocked':site.occupiedBy?'occupied':site.tileId?'discovered':'';return`<button class="map-hotspot ${status}" style="--site-x:${s.left}%;--site-y:${s.top}%" ${site.blocked?'disabled ':''}${ready?'data-site':'data-discover'}="${s.id}" title="${site.blocked?'blocked camp':s.rewardCode?'camp':`level ${s.level}`}"></button>`}).join('')}${research()}</section>`}
function research(){const t=context.researchTracks?.[state.research.board],from=state.research[`${researchToken}Node`][state.currentPlayer];const nodes=t?.rows.flatMap(row=>row.nodes)??[];const moves=!t||!from?'':(t.bridges??[]).filter(b=>b.from===from&&b.verified&&b.to!==`${t.id}:temple`).map(b=>{const n=nodes.find(x=>x.id===b.to);return n?`<button class="research-target" style="--target-x:${33+n.pathIndex*19}%;--target-y:${13+n.rowIndex*10}%" data-research="${n.id}">⌁</button>`:''}).join('');const p1=state.players.p1,p2=state.players.p2;const token=(id:PlayerId,position:number,left:number)=>`<i class="track-token ${state.players[id].color.toLowerCase()}" style="--token-x:${left}%;--token-y:${position}%">${id==='p1'?'1':'2'}</i>`;return`<aside class="research-board"><img src="${publicAsset(`/assets/boards/${state.research.board}-board.jpg`)}" alt="research board"><div class="research-tokens">${token('p1',13+p1.researchMagnifying*10,40)}${token('p2',15+p2.researchMagnifying*10,40)}${token('p1',13+p1.researchJournal*10,56)}${token('p2',15+p2.researchJournal*10,56)}</div>${moves}</aside>`}
function player(id:PlayerId){const p=state.players[id],current=id===state.currentPlayer,leader=p.leader?.id,as=p.assistants.map(a=>`<button class="assistant ${a.exhausted?'exhausted':''} ${a.level}" ${!current||a.exhausted?'disabled':''} data-assistant="${a.id}" title="Activate assistant">♙</button>`).join('');return`<section class="player ${p.color.toLowerCase()} ${current?'current':''} ${leader?`leader-${leader}`:''}"><div class="player-id">${id.slice(1)}</div><div class="player-resources"><span title="coin">● ${p.resources.coin}</span><span title="compass">◉ ${p.resources.compass}</span><span title="tablet">▰ ${p.resources.tablet}</span><span title="arrowhead">▲ ${p.resources.arrowhead}</span><span title="jewel">◆ ${p.resources.jewel}</span><span title="Fear">☠ ${p.resources.fear}</span></div><div class="assistants">${as}</div><div class="worker-count" title="available workers">♟ ${p.availableWorkers}/${p.workers}</div></section>`}
function pendingButton(label:string,c:PendingChoice){
  let art='',text=label;
  if(c.type==='card'||c.type==='artifact'){
    const cardId=c.type==='card'?c.cardId:c.artifactId;
    const card=context.cards[cardId];
    art=assets[`card:${cardId}:face`]?`<i class="pending-choice-art card-art" style="${sprite(assets[`card:${cardId}:face`])}"></i>`:'';
    text=card?.name??cardId;
  }else if(c.type==='assistant'||c.type==='assistant-target'){
    const assistantId=c.assistantId,assistant=(c.type==='assistant-target'?state.players[c.ownerId]?.assistants:state.players[state.pendingRewards[0]?.playerId]?.assistants)?.find(item=>item.id===assistantId);
    const definition=context.assistants[assistantId];
    art=`<i class="pending-choice-art assistant-art" style="${sprite(assistantAsset(assistantId,assistant?.level??'silver'))}"></i>`;
    text=`${definition?.name??assistantId} · ${assistant?.level??'assistant'}`;
  }else if(c.type==='assistant-stack'){
    const assistantId=state.assistants.stacks[c.stackIndex]?.[0],definition=assistantId?context.assistants[assistantId]:undefined;
    if(assistantId)art=`<i class="pending-choice-art assistant-art" style="${sprite(assistantAsset(assistantId,'silver'))}"></i>`;
    text=definition?.name??`Assistant supply ${c.stackIndex+1}`;
  }else if(c.type==='resource'||c.type==='assistant-resource'){
    const resource=c.resource;
    art=`<img class="pending-choice-art resource-art" src="${publicAsset(`/assets/resource-${resource}.png`)}" alt="${resource}">`;
    text=resource;
  }else if(c.type==='idol'){
    art=`<i class="pending-choice-art idol-art" style="${sprite(assets[`idol:${c.idolId}:face`])}"></i>`;
    text='Idol';
  }else if(c.type==='guardian'){
    art=assets[`guardian:${c.guardianId}:face`]?`<i class="pending-choice-art guardian-art" style="${sprite(assets[`guardian:${c.guardianId}:face`])}"></i>`:'';
    text=context.guardians[c.guardianId]?.name??c.guardianId;
  }else if(c.type==='site'){
    const site=state.sites[c.siteId];
    text=site?.isTentSite?`Camp ${c.siteId}`:`Site ${c.siteId} · Level ${site?.level??''}`;
  }else if(c.type==='lizard-track-guardian')text='Lizard track guardian';
  else if(c.type==='skip')text='Skip';
  else if(/^[^\p{L}\p{N}]+$/u.test(label))text='Choose';
  return`<button class="pending-button pending-choice" data-pending-choice="${encodeURIComponent(JSON.stringify(c))}">${art}<span>${text}</span></button>`
}
function pendingResearchButton(label:string,token:'magnifying'|'journal',nodeId:string,discount:Record<string,number>){return`<button class="pending-button" data-pending-research="${nodeId}" data-pending-research-token="${token}" data-pending-research-discount="${encodeURIComponent(JSON.stringify(discount))}">${label}</button>`}
function multi(kind:'assistants'|'sites'|'options',values:string[],count:number,labels:string[]){return`${values.map((v,i)=>`<button class="pending-button ${pendingSelection.includes(v)?'picked':''}" data-pending-select="${v}">${labels[i]??'○'}</button>`).join('')}<button class="pending-confirm" ${pendingSelection.length===count?'':'disabled'} data-pending-multi="${kind}">✓</button>`}
function effectOptions(payload:Record<string,unknown>,id:PlayerId){if(payload.type==='CARD_EFFECT'&&payload.effect&&typeof payload.effect==='object'&&String((payload.effect as Record<string,unknown>).type)==='DISCARD_ONE_THEN')return state.players[id].hand.map(cardId=>pendingButton('↷',{type:'card',cardId})).join('');return legacyEffectOptions(payload,id)}
function legacyEffectOptions(payload:Record<string,unknown>,id:PlayerId){if(payload.type!=='CARD_EFFECT'||!payload.effect||typeof payload.effect!=='object')return'';const e=payload.effect as Record<string,unknown>,p=state.players[id],ss=Object.values(state.sites),type=String(e.type);if(['DISCARD_ONE_THEN','EXILE_OWN_CARD'].includes(type))return[...p.hand,...p.playedCards].map(x=>pendingButton('▣',{type:'card',cardId:x})).join('');if(type==='RETURN_SLOTTED_IDOL')return p.idols.filter(x=>pendingButton('◉',{type:'idol',idolId:x.id})).join('');if(type==='USE_STANDARD_IDOL_SLOT_EFFECT')return[['coinToJewel','◆'],['tablets','▰'],['arrowhead','▲'],['coinCompass','●◉'],['draw','▣']].map(([effect,label])=>pendingButton(label,{type:'idol-effect',effect})).join('');if(type==='REFRESH_GUARDIAN_BOON')return p.usedGuardianBoons.map(x=>pendingButton('♞',{type:'guardian',guardianId:x})).join('');if(type==='SPEND_DEFEATED_GUARDIAN_THEN')return p.defeatedGuardians.map(x=>pendingButton('♞',{type:'guardian',guardianId:x})).join('');if(['RETURN_OCCUPIED_WORKER_THEN','ACTIVATE_OWN_OCCUPIED_SITE'].includes(type))return ss.filter(x=>x.occupiedBy===id).map(x=>pendingButton('⌾',{type:'site',siteId:x.id})).join('');if(type==='ACTIVATE_OTHER_PLAYER_OCCUPIED_SITE')return ss.filter(x=>x.occupiedBy&&x.occupiedBy!==id&&(e.level===undefined||x.level===e.level)).map(x=>pendingButton('⌾',{type:'site',siteId:x.id})).join('');if(type==='ACTIVATE_TENT_SITES'){const xs=ss.filter(x=>x.isTentSite&&(!e.requireEmpty||!x.occupiedBy));return multi('sites',xs.map(x=>x.id),Number(e.count),xs.map(_=>'⌾'))}if(type==='CHOOSE_ONE'&&Array.isArray(e.options))return e.options.map((_,i)=>pendingButton(String(i+1),{type:'card-option',optionIndex:i})).join('');if(type==='CHOOSE_DISTINCT'&&Array.isArray(e.options))return multi('options',e.options.map((_,i)=>String(i)),Number(e.count),e.options.map((_,i)=>String(i+1)));if(type==='UPGRADE_RESOURCE_PER'||type==='UPGRADE_RESOURCE_THEN')return(['tablet','arrowhead'] as const).filter(resource=>p.resources[resource]>0).map(resource=>pendingButton(resource==='tablet'?'▰':'▲',{type:'resource',resource})).join('');if(type==='REFRESH_ASSISTANTS_THEN')return multi('assistants',p.assistants.map(x=>x.id),Number(e.amount),p.assistants.map(_=>'♙'));if(type==='ACTIVATE_OWN_ASSISTANTS')return multi('assistants',p.assistants.filter(x=>(e.levels as string[]).includes(x.level)).map(x=>x.id),Array.isArray(e.levels)?e.levels.length:0,p.assistants.filter(x=>(e.levels as string[]).includes(x.level)).map(_=>'♙'));if(type==='UPGRADE_OWN_SILVER_ASSISTANT')return p.assistants.filter(x=>x.level==='silver').map(x=>pendingButton('♙',{type:'assistant-target',ownerId:id,assistantId:x.id})).join('');if(['ACTIVATE_AVAILABLE_ASSISTANT','CLAIM_AVAILABLE_SILVER_ASSISTANT'].includes(type))return state.assistants.stacks.map((_,i)=>pendingButton(`◈ ${i+1}`,{type:'assistant-stack',stackIndex:i})).join('');if(['ACQUIRE_MARKET_ITEM','USE_MARKET_ITEM_EFFECT'].includes(type))return state.market.items.map(x=>pendingButton('◈',{type:'card',cardId:x})).join('');if(type==='BUY_WITH_DISCOUNT')return[...state.market.items,...state.market.artifacts].map(x=>pendingButton('◈',{type:'card',cardId:x})).join('');return''}
function pending(){const p=state.pendingRewards[0];if(!p)return'';const payload=(p.payload??{}) as Record<string,unknown>,type=String(payload.type??p.code),player=state.players[p.playerId],ss=Object.values(state.sites);let o=effectOptions(payload,p.playerId);if(!o&&(type==='CLAIM_ASSISTANT'||type==='ACTIVATE_VISIBLE_SILVER_ASSISTANT_THEN_BOTTOM'))o=state.assistants.stacks.map((_,i)=>pendingButton(`◈ ${i+1}`,{type:'assistant-stack',stackIndex:i})).join('');else if(!o&&['UPGRADE_ASSISTANT','UPGRADE_AND_REFRESH_ASSISTANT','REFRESH_ASSISTANT'].includes(type))o=player.assistants.map(x=>pendingButton('♙',{type:'assistant',assistantId:x.id})).join('');else if(!o&&type==='REFRESH_ASSISTANTS'&&typeof payload.amount==='number')o=multi('assistants',player.assistants.map(x=>x.id),payload.amount,player.assistants.map(_=>'♙'));else if(!o&&type==='CHOOSE'&&Array.isArray(payload.options)&&payload.count===1)o=payload.options.map((_,i)=>pendingButton(String(i+1),{type:'research-option',optionIndex:i})).join('');else if(!o&&['ACQUIRE_ARTIFACT_FREE','BUY_ARTIFACT_WITH_DISCOUNT'].includes(type))o=state.market.artifacts.map(x=>pendingButton('◆',{type:'artifact',artifactId:x})).join('');else if(!o&&(type==='ACTIVATE_DISCOVERED_LEVEL1_SITE'||type==='BURN_UNOCCUPIED_LEVEL1_SITE_REFILL_IDOL'||p.code.includes('GUARDIAN')))o=ss.map(x=>pendingButton('⌾',{type:'site',siteId:x.id})).join('');if(!o)o='<span class="pending-unsupported">…</span>';return`<section class="pending-panel"><span>⌁</span><div>${o}</div></section>`}
function artifact(){if(!artifactId)return'';const p=state.players[state.currentPlayer];if(!p.hand.includes(artifactId))return'';return`<section class="pending-panel artifact-panel"><span>◆</span><div>${p.hand.filter(x=>x!==artifactId).map(x=>`<button class="card" data-artifact-payment="${x}"><i style="${sprite(assets[`card:${x}:face`])}"></i></button>`).join('')}<button class="pending-button" data-artifact-cancel>×</button></div></section>`}
function render(){document.documentElement.dataset.theme=theme;const active=state.players[state.currentPlayer];app.innerHTML=`<main><header><div class="round">${state.round}</div><div class="turn-dot ${active.color.toLowerCase()}"></div><div class="header-actions"><select data-theme><option value="bga" ${theme==='bga'?'selected':''}>BGA</option><option value="jungle" ${theme==='jungle'?'selected':''}>Jungle</option></select><select data-main-board><option value="bird" ${mainBoard==='bird'?'selected':''}>普通</option><option value="snake" ${mainBoard==='snake'?'selected':''}>进阶</option></select><select data-board>${(['bird','snake','monkey','lizard'] as ResearchBoardId[]).map(x=>`<option value="${x}" ${researchBoard===x?'selected':''}>${x}</option>`).join('')}</select><button class="${researchToken==='magnifying'?'active':''}" data-token="magnifying">⌕</button><button class="${researchToken==='journal'?'active':''}" data-token="journal">▤</button><button data-action="end">✓</button><button data-action="pass">≫</button><button data-action="reset">↻</button></div></header><section class="play-surface">${board()}<aside class="market"><div class="market-row">${state.market.items.map(x=>card(x,'buy')).join('')}</div><div class="market-row">${state.market.artifacts.map(x=>card(x,'buy')).join('')}</div></aside></section><section class="players">${state.playerOrder.map(player).join('')}</section><section class="hand">${active.hand.map(x=>card(x,'play')).join('')}</section>${artifact()}${pending()}${message?`<div class="message">${message}</div>`:''}</main>`}
app.addEventListener('change',e=>{const t=e.target as HTMLSelectElement;if(t.matches('[data-theme]')){theme=t.value==='jungle'?'jungle':'bga';render()}else if(t.matches('[data-main-board]')){mainBoard=t.value as typeof mainBoard;render()}else if(t.matches('[data-board]')){researchBoard=t.value as ResearchBoardId;start()}});
app.addEventListener('click',e=>{const b=(e.target as HTMLElement).closest<HTMLButtonElement>('button');if(!b||b.disabled)return;const pid=state.currentPlayer,id=b.dataset.cardId;if(b.dataset.artifactCancel!==undefined){artifactId=undefined;render();return}if(b.dataset.artifactPayment&&artifactId){const action:GameAction={type:'PLAY_CARD',playerId:pid,cardId:artifactId,activationPaymentCardId:b.dataset.artifactPayment};try{state=applyEngineCommand(state,{type:'action',action},context);artifactId=undefined;message='';recordReducerEvent(action,'accepted')}catch(x){message=x instanceof Error?x.message:String(x);recordReducerEvent(action,'rejected',message)}render();return}if(b.dataset.pendingSelect){const x=b.dataset.pendingSelect;pendingSelection=pendingSelection.includes(x)?pendingSelection.filter(y=>y!==x):[...pendingSelection,x];render();return}if(b.dataset.pendingMulti){if(b.dataset.pendingMulti==='assistants')choose({type:'assistants',assistantIds:pendingSelection});else if(b.dataset.pendingMulti==='sites')choose({type:'site-ids',siteIds:pendingSelection});else choose({type:'card-options',optionIndexes:pendingSelection.map(Number)});return}if(b.dataset.pendingChoice){choose(JSON.parse(decodeURIComponent(b.dataset.pendingChoice)) as PendingChoice);return}if(b.dataset.assistant){run({type:'ACTIVATE_ASSISTANT',playerId:pid,assistantId:b.dataset.assistant});return}if(id){if(b.dataset.cardAction==='play'&&context.cards[id]?.expansion==='Expedition Leaders'){leaderStartingCardId=id;render();return}if(b.dataset.cardAction==='play'&&context.cards[id]?.type==='Artifact'){artifactId=id;render();return}run(b.dataset.cardAction==='buy'?{type:'BUY_CARD',playerId:pid,cardId:id}:{type:'PLAY_CARD',playerId:pid,cardId:id});return}if(b.dataset.site)run({type:'PLACE_WORKER',playerId:pid,siteId:b.dataset.site});else if(b.dataset.discover)run({type:'DISCOVER_SITE',playerId:pid,siteId:b.dataset.discover});else if(b.dataset.research)run({type:'ADVANCE_RESEARCH',playerId:pid,track:researchToken,toNodeId:b.dataset.research});else if(b.dataset.token){researchToken=b.dataset.token as typeof researchToken;render()}else if(b.dataset.action==='end')run({type:'END_TURN',playerId:pid});else if(b.dataset.action==='pass')run({type:'PASS',playerId:pid});else if(b.dataset.action==='reset')start()});

// Extend the generic card/research choice panel with leader and assistant
// pending flows that use the same public PendingChoice dispatcher.
const basePendingPanel = pending;
pending = () => {
  const queued = state.pendingRewards[0];
  if (!queued) return '';
  const payload = (queued.payload ?? {}) as Record<string, unknown>;
  const player = state.players[queued.playerId];
  const panel = (options: string) => `<section class="pending-panel"><span>⌁</span><div>${options}</div></section>`;
  const cardsOwned = [...player.hand, ...player.playedCards, ...player.discard, ...player.deck];
  if (queued.code === 'leader:EXILE_OWN_CARD') return panel(cardsOwned.map((id) => pendingButton('▣', { type: 'card', cardId: id })).join(''));
  if (queued.code === 'leader:MYSTIC_RITUAL_CHOICE') {
    const allowed = Array.isArray(payload.allowedFearCounts) ? payload.allowedFearCounts : [2, 3, 4];
    return panel(allowed.filter((count): count is 2 | 3 | 4 => count === 2 || count === 3 || count === 4).map((fearCount) => pendingButton(String(fearCount), { type: 'ritual', fearCount })).join(''));
  }
  if (queued.code === 'leader:REFRESH_OWN_ASSISTANT') return panel(player.assistants.map((assistant) => pendingButton('♙', { type: 'assistant', assistantId: assistant.id })).join(''));
  if (queued.code === 'leader:UPGRADE_RESOURCE') return panel((['tablet', 'arrowhead'] as const).filter((resource) => player.resources[resource] > 0).map((resource) => pendingButton(resource === 'tablet' ? '▰' : '▲', { type: 'resource', resource })).join(''));
  if (queued.code === 'leader:OPTIONAL_EXILE_FAR_LEFT_ITEM') return panel(`${state.market.items[0] ? pendingButton('◈', { type: 'card', cardId: state.market.items[0] }) : ''}${pendingButton('×', { type: 'skip' })}`);
  if (queued.code === 'leader:ACTIVATE_TENT_SITE') return panel(Object.values(state.sites).filter((site) => site.isTentSite).map((site) => pendingButton('⌾', { type: 'site', siteId: site.id })).join(''));
  if (queued.code === 'leader:ACTIVATE_DISCOVERED_SITE' || queued.code === 'leader:ACTIVATE_FACEUP_UNDISCOVERED_IDOL') return panel(Object.values(state.sites).map((site) => pendingButton(`⌾ ${site.level}`, { type: 'site', siteId: site.id })).join(''));
  if (payload.type === 'OVERCOME_GUARDIAN_FREE' && payload.lizardTrackAllowed === true) { const guardians = ((state.research.templeData as Record<string, unknown> | undefined)?.lizardGuardians ?? []) as Array<{ nodeId: string; defeated: boolean; revealed: boolean }>; const lizard = guardians.find((guardian) => !guardian.defeated && guardian.revealed && state.research.magnifyingNode[queued.playerId] === guardian.nodeId); return panel(`${Object.values(state.sites).filter((site) => site.guardian).map((site) => pendingButton('⌾', { type: 'site', siteId: site.id })).join('')}${lizard ? pendingButton('♞', { type: 'lizard-track-guardian' }) : ''}`); }
  if (payload.type === 'BONUS_TILE' && payload.slot === 'EXILE_OWN_CARD') return `<section class="research-bonus-picker" role="dialog"><strong>研究奖励：放逐自己的一张牌（可跳过）</strong><div>${[...player.hand, ...player.playedCards].map((id) => pendingButton('放逐', { type:'card', cardId:id })).join('')}${pendingButton('跳过', { type:'skip' })}</div></section>`;
  if (payload.type === 'BONUS_TILE' && payload.slot === 'UPGRADE_RESOURCE') return `<section class="research-bonus-picker" role="dialog"><strong>研究奖励：升级一种资源</strong><div>${(['tablet','arrowhead'] as const).filter(resource => player.resources[resource] > 0).map(resource => pendingButton(resource, { type:'resource', resource })).join('')}</div></section>`;
  if (payload.type === 'ACTIVATE_ASSISTANT_EFFECT') {
    const effect = (payload.effect ?? context.assistantEffects?.[String(payload.assistantId)]?.[payload.level as 'silver' | 'gold']) as Record<string, unknown> | undefined;
    if (!effect) return basePendingPanel();
    if ((effect.type === 'CHOOSE' || effect.type === 'PAY_RESOURCE_CHOOSE') && Array.isArray(effect.options)) return panel(effect.options.map((_, optionIndex) => pendingButton(String(optionIndex + 1), { type: 'assistant-option', optionIndex })).join(''));
    if (effect.type === 'UPGRADE_RESOURCE') return panel((['tablet', 'arrowhead'] as const).filter((resource) => player.resources[resource] > 0).map((resource) => pendingButton(resource === 'tablet' ? '▰' : '▲', { type: 'assistant-resource', resource })).join(''));
    if (effect.type === 'DRAW_THEN_DISCARD') return panel(player.hand.map((id) => pendingButton('▣', { type: 'card', cardId: id })).join(''));
    if (effect.type === 'EXILE_OWN_CARD') return panel(`${[...player.hand, ...player.playedCards].map((id) => pendingButton('▣', { type: 'card', cardId: id })).join('')}${pendingButton('×', { type: 'skip' })}`);
    if (effect.type === 'BUY_WITH_DISCOUNT') return panel(`${[...state.market.items, ...state.market.artifacts].map((id) => pendingButton('◈', { type: 'card', cardId: id })).join('')}${pendingButton('×', { type: 'skip' })}`);
  }
  return basePendingPanel();
};
render();

// A collector save in another tab is immediately a visual-only update to the
// running board.  This prevents the game from retaining a previous render
// until the next action or a manual reload.
window.addEventListener('storage', (event) => {
  if (event.key === calibrationStorageKey) render();
});

// Leader boards are real action surfaces, not just decorative artwork.  Their
// coordinates come from the collector's named marks, exactly like main-board
// and research hotspots.
const standardLeaderIdolEffects: Array<{ effect: IdolEffect; label: string }> = [
  { effect: 'coinToJewel', label: '1 coin → 1 jewel' },
  { effect: 'tablets', label: '2 tablets' },
  { effect: 'arrowhead', label: '1 arrowhead' },
  { effect: 'coinCompass', label: '1 coin + 1 compass' },
  { effect: 'draw', label: 'draw 1 card' },
];
function leaderBoardHotspots(id: PlayerId) {
  const playerState = state.players[id];
  const leader = playerState.leader;
  if (!leader) return '';
  const layout = (LEADER_LAYOUT as unknown as Record<string, { idolSlots?: ReadonlyArray<{ x: number; y: number }>; specialist?: { x: number; y: number }; ritualEffects?: ReadonlyArray<{ fearCount: 2|3|4; point: { x: number; y: number } }> }>)[leader.id];
  const slots = idolSlotConfig(leader.id);
  const nextSlot = slots.findIndex((_, slotIndex) => !playerState.idols.some((idol) => idol.inSlot && idol.slotIndex === slotIndex));
  const canUseIdol = id === state.currentPlayer && nextSlot >= 0 && playerState.idols.some((idol) => !idol.inSlot);
  const idolSlots = slots.map((slot, slotIndex) => {
    const fallback = layout?.idolSlots?.[slotIndex];
    if (!fallback) return '';
    const markId = `leader-${leader.id}-idol-slot-${slotIndex}`;
    const mark = calibrationMark(`leader-${leader.id}`, markId);
    const point = calibratedLeaderPoint(leader.id, markId, fallback);
    const idol = playerState.idols.find((candidate) => candidate.inSlot && candidate.slotIndex === slotIndex);
    const dimensions = mark ? `;--leader-hotspot-w:${mark.width / 1270 * 100}%;--leader-hotspot-h:${mark.height / 328 * 100}%` : '';
    return `<span class="leader-idol-slot ${slot.blue ? 'blue' : 'standard'} ${idol ? 'filled' : ''}" style="${playerPointStyle(point, true)}${dimensions}" title="${idol ? 'used idol' : `${slot.blue ? 'blue ' : ''}idol slot ${slotIndex + 1}`}">${idol ? `<i style="${sprite(assets[`idol:${idol.id}:face`])}"></i>` : ''}</span>`;
  }).join('');
  const effectHotspot = (effect: IdolEffect, point: { x: number; y: number }, label: string, key = effect, needsBlue = false) => {
    const markId = `leader-${leader.id}-idol-effect-${key}`, mark = calibrationMark(`leader-${leader.id}`, markId);
    const calibrated = calibratedLeaderPoint(leader.id, markId, point);
    const dimensions = mark ? `;--leader-hotspot-w:${mark.width / 1270 * 100}%;--leader-hotspot-h:${mark.height / 328 * 100}%` : '';
    const enabled = canUseIdol && (!needsBlue || slots[nextSlot]?.blue);
    return `<button class="leader-panel-hotspot leader-idol-effect" style="${playerPointStyle(calibrated, true)}${dimensions}" ${enabled ? `data-leader-idol-direct="${effect}" data-leader-idol-owner="${id}"` : 'disabled'} title="use idol: ${label}"></button>`;
  };
  const printedStandard = leader.id === 'mystic' ? LEADER_IDOL_EFFECT_LAYOUT.mysticStandard : LEADER_IDOL_EFFECT_LAYOUT.standard;
  const idolEffects = `${printedStandard.map(({ effect, point }) => effectHotspot(effect, point, effect)).join('')}${leader.id === 'mystic'
    ? `${effectHotspot('mysticExileArrowhead', LEADER_IDOL_EFFECT_LAYOUT.mysticArrowhead.point, 'arrowhead + exile a card', 'mysticExileArrowhead', true)}${effectHotspot('mysticExileRitual', LEADER_IDOL_EFFECT_LAYOUT.mysticRitual.point, 'perform ritual', 'mysticExileRitual', true)}`
    : effectHotspot('leaderUnique', LEADER_IDOL_EFFECT_LAYOUT.unique.point, 'leader blue-slot effect', 'leaderUnique', true)}`;
  const captain = leader.id === 'captain' && layout?.specialist ? (() => {
    const markId = 'leader-captain-specialist', mark = calibrationMark('leader-captain', markId);
    const point = calibratedLeaderPoint('captain', markId, layout.specialist!);
    const dimensions = mark ? `;--leader-hotspot-w:${mark.width / 1270 * 100}%;--leader-hotspot-h:${mark.height / 328 * 100}%` : '';
    const enabled = id === state.currentPlayer && playerState.availableWorkers > 0 && !leader.data.specialistUsedThisRound;
    return `<button class="leader-panel-hotspot captain-specialist" style="${playerPointStyle(point, true)}${dimensions}" ${enabled ? `data-captain-specialist="${id}"` : 'disabled'} title="Captain specialist: activate a silver assistant from supply"></button>`;
  })() : '';
  const mystic = leader.id === 'mystic' ? (layout?.ritualEffects ?? []).map(({ fearCount, point }) => {
    const markId = `leader-mystic-ritual-${fearCount}`, mark = calibrationMark('leader-mystic', markId);
    const calibrated = calibratedLeaderPoint('mystic', markId, point);
    const dimensions = mark ? `;--leader-hotspot-w:${mark.width / 1270 * 100}%;--leader-hotspot-h:${mark.height / 328 * 100}%` : '';
    const availableFear = ((leader.data.ritualPile ?? []) as unknown[]).length;
    return `<button class="leader-panel-hotspot mystic-ritual" style="${playerPointStyle(calibrated, true)}${dimensions}" ${id === state.currentPlayer && availableFear >= fearCount ? `data-mystic-ritual-direct="${fearCount}" data-mystic-ritual-owner="${id}"` : 'disabled'} title="Mystic ${fearCount}-Fear ritual"></button>`;
  }).join('') : '';
  return `<div class="leader-board-hotspots">${idolSlots}${idolEffects}${captain}${mystic}</div>`;
}
function leaderIdolPicker() {
  if (!leaderIdolDraft) return '';
  const { playerId, slotIndex } = leaderIdolDraft, playerState = state.players[playerId], leader = playerState?.leader;
  const slot = leader ? idolSlotConfig(leader.id)[slotIndex] : undefined;
  if (!leader || !slot || !playerState.idols.some((idol) => !idol.inSlot)) return '';
  const special: Array<{ effect: IdolEffect; label: string; disabled?: boolean }> = !slot.blue ? [] : leader.id === 'mystic'
    ? [{ effect: 'mysticExileArrowhead', label: 'arrowhead + exile a card' }, { effect: 'mysticExileRitual', label: 'perform ritual (main action)' }]
    : [{ effect: 'leaderUnique', label: 'leader blue-slot effect', disabled: leader.id === 'explorer' && !((leader.data.snacks ?? []) as Array<{ used: boolean }>).some((snack) => snack.used) }];
  const options = [...standardLeaderIdolEffects, ...special].map(({ effect, label, disabled }) => `<button class="pending-button" ${disabled ? 'disabled' : ''} data-leader-idol-effect="${effect}">${label}</button>`).join('');
  return `<section class="pending-panel leader-idol-picker"><span>Idol slot ${slotIndex + 1}</span><div>${options}</div><button class="pending-button" data-leader-panel-cancel>×</button></section>`;
}
function leaderIdolSnackPicker() {
  if (!leaderIdolSnackDraft) return '';
  const playerState = state.players[leaderIdolSnackDraft.playerId], snacks = ((playerState.leader?.data.snacks ?? []) as Array<{ id: 'free'|'coin'|'compass'; used: boolean }>).filter((snack) => snack.used);
  return `<section class="pending-panel leader-idol-picker"><span>Choose a used snack to refresh</span><div>${snacks.map((snack) => `<button class="pending-button" data-leader-idol-snack="${snack.id}">${snack.id}</button>`).join('')}</div><button class="pending-button" data-leader-panel-cancel>×</button></section>`;
}
function mysticRitualPicker() {
  if (!mysticRitualDraft) return '';
  const playerState = state.players[mysticRitualDraft], fearCount = ((playerState.leader?.data.ritualPile ?? []) as unknown[]).length;
  return `<section class="pending-panel leader-idol-picker"><span>Perform ritual</span><div>${([2,3,4] as const).map((count) => `<button class="pending-button" ${fearCount < count ? 'disabled' : ''} data-mystic-ritual-fear="${count}">${count} Fear</button>`).join('')}</div><button class="pending-button" data-leader-panel-cancel>×</button></section>`;
}
const playerWithLeaderBoardHotspots = player;
player = (id: PlayerId) => playerWithLeaderBoardHotspots(id).replace('</section>', `${leaderBoardHotspots(id)}</section>`);
const renderWithLeaderBoardHotspots = render;
render = () => {
  renderWithLeaderBoardHotspots();
  if (screen !== 'game') return;
  const controls = `${leaderIdolPicker()}${leaderIdolSnackPicker()}${mysticRitualPicker()}${captainSpecialistDraft ? '<section class="leader-action-hint">Captain: choose a silver assistant in the supply.</section>' : ''}`;
  if (controls) app.insertAdjacentHTML('beforeend', controls);
};
app.addEventListener('click', (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button');
  if (!button || button.disabled) return;
  if (button.dataset.leaderPanelCancel !== undefined) { leaderIdolDraft = undefined; leaderIdolSnackDraft = undefined; captainSpecialistDraft = undefined; mysticRitualDraft = undefined; render(); return; }
  if (button.dataset.leaderIdolDirect && button.dataset.leaderIdolOwner) {
    const playerId = button.dataset.leaderIdolOwner as PlayerId, playerState = state.players[playerId], leader = playerState.leader;
    const slotIndex = leader ? idolSlotConfig(leader.id).findIndex((_, index) => !playerState.idols.some((idol) => idol.inSlot && idol.slotIndex === index)) : -1;
    const effect = button.dataset.leaderIdolDirect as IdolEffect;
    if (slotIndex < 0) return;
    if (effect === 'leaderUnique' && leader?.id === 'explorer') { leaderIdolSnackDraft = { playerId, slotIndex, effect }; render(); return; }
    const idol = playerState.idols.find((candidate) => !candidate.inSlot);
    if (idol) run({ type: 'LEADER_USE_IDOL', playerId, idolId: idol.id, slotIndex, effect });
    return;
  }
  if (button.dataset.leaderIdolSlot !== undefined && button.dataset.leaderIdolOwner) { leaderIdolDraft = { playerId: button.dataset.leaderIdolOwner as PlayerId, slotIndex: Number(button.dataset.leaderIdolSlot) }; render(); return; }
  if (button.dataset.leaderIdolEffect && leaderIdolDraft) {
    const draft = leaderIdolDraft, effect = button.dataset.leaderIdolEffect as IdolEffect, playerState = state.players[draft.playerId];
    if (effect === 'leaderUnique' && playerState.leader?.id === 'explorer') { leaderIdolDraft = undefined; leaderIdolSnackDraft = { ...draft, effect }; render(); return; }
    const idol = playerState.idols.find((candidate) => !candidate.inSlot);
    leaderIdolDraft = undefined;
    if (idol) run({ type: 'LEADER_USE_IDOL', playerId: draft.playerId, idolId: idol.id, slotIndex: draft.slotIndex, effect });
    return;
  }
  if (button.dataset.leaderIdolSnack && leaderIdolSnackDraft) {
    const draft = leaderIdolSnackDraft, idol = state.players[draft.playerId].idols.find((candidate) => !candidate.inSlot);
    leaderIdolSnackDraft = undefined;
    if (idol) run({ type: 'LEADER_USE_IDOL', playerId: draft.playerId, idolId: idol.id, slotIndex: draft.slotIndex, effect: draft.effect, snackId: button.dataset.leaderIdolSnack as 'free'|'coin'|'compass' });
    return;
  }
  if (button.dataset.captainSpecialist) { captainSpecialistDraft = button.dataset.captainSpecialist as PlayerId; render(); return; }
  if (button.dataset.supplyAssistantStack !== undefined && captainSpecialistDraft) {
    const playerId = captainSpecialistDraft; captainSpecialistDraft = undefined;
    run({ type: 'LEADER_CAPTAIN_SPECIALIST', playerId, stackIndex: Number(button.dataset.supplyAssistantStack) });
    return;
  }
  if (button.dataset.mysticRitualDirect && button.dataset.mysticRitualOwner) {
    run({ type: 'LEADER_MYSTIC_RITUAL', playerId: button.dataset.mysticRitualOwner as PlayerId, fearCount: Number(button.dataset.mysticRitualDirect) as 2|3|4 });
    return;
  }
  if (button.dataset.mysticRitual) { mysticRitualDraft = button.dataset.mysticRitual as PlayerId; render(); return; }
  if (button.dataset.mysticRitualFear && mysticRitualDraft) {
    const playerId = mysticRitualDraft; mysticRitualDraft = undefined;
    run({ type: 'LEADER_MYSTIC_RITUAL', playerId, fearCount: Number(button.dataset.mysticRitualFear) as 2|3|4 });
  }
});

// Keep the leader-board interaction layer outermost.  This file layers a few
// historical render decorators; placing this wrapper last ensures the named
// board hotspots survive every other player-panel enhancement.
const finalPlayerWithLeaderBoardHotspots = player;
player = (id: PlayerId) => finalPlayerWithLeaderBoardHotspots(id).replace('</section>', `${leaderBoardHotspots(id)}</section>`);
const finalRenderWithLeaderBoardHotspots = render;
render = () => {
  finalRenderWithLeaderBoardHotspots();
  if (screen !== 'game') return;
  const controls = `${leaderIdolPicker()}${leaderIdolSnackPicker()}${mysticRitualPicker()}${captainSpecialistDraft ? '<section class="leader-action-hint">Captain: choose a silver assistant in the supply.</section>' : ''}`;
  if (controls) app.insertAdjacentHTML('beforeend', controls);
};
render();

// Camp 5 is a mandatory post-placement discard. Render the player's actual
// hand here rather than the generic symbolic pending buttons used by effects.
const pendingBeforeCampFiveDiscard = pending;
pending = () => {
  const queued = state.pendingRewards[0];
  if (queued?.code !== 'site:DISCARD_AFTER_PLACEMENT') return pendingBeforeCampFiveDiscard();
  const player = state.players[queued.playerId];
  const cards = player.hand.map((cardId, index) => `<button class="card" data-camp-five-discard="${index}" title="弃置：${context.cards[cardId]?.name ?? cardId}"><i style="${sprite(assets[`card:${cardId}:face`])}"></i></button>`).join('');
  return `<section class="pending-panel camp-five-discard"><span>营地 5：弃置 1 张手牌</span><div class="camp-five-discard-cards">${cards}</div></section>`;
};
app.addEventListener('click', (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-camp-five-discard]');
  if (!button || button.disabled) return;
  const queued = state.pendingRewards[0];
  const cardId = queued && state.players[queued.playerId]?.hand[Number(button.dataset.campFiveDiscard)];
  if (cardId) choose({ type: 'card', cardId });
});
render();

// Every exile prompt must present the actual selectable cards.  Generic
// symbolic buttons are fine for abstract choices, but make card-audit and
// play testing needlessly ambiguous.
const pendingBeforeCardArtworkExile = pending;
pending = () => {
  const queued = state.pendingRewards[0];
  if (!queued) return pendingBeforeCardArtworkExile();
  const payload = (queued.payload ?? {}) as Record<string, unknown>;
  const effect = payload.type === 'CARD_EFFECT' && payload.effect && typeof payload.effect === 'object'
    ? payload.effect as Record<string, unknown>
    : payload.type === 'ACTIVATE_ASSISTANT_EFFECT' && payload.effect && typeof payload.effect === 'object'
      ? payload.effect as Record<string, unknown>
      : undefined;
  const isExile = queued.code === 'leader:EXILE_OWN_CARD'
    || payload.type === 'EXILE_OWN_CARD'
    || effect?.type === 'EXILE_OWN_CARD';
  if (!isExile) return pendingBeforeCardArtworkExile();
  const player = state.players[queued.playerId];
  const cardIds = [...player.hand, ...player.playedCards];
  const cards = cardIds.map((cardId) => `<button class="card exile-card-choice" data-pending-choice="${encodeURIComponent(JSON.stringify({ type: 'card', cardId }))}" title="放逐：${context.cards[cardId]?.name ?? cardId}"><i style="${sprite(assets[`card:${cardId}:face`])}"></i></button>`).join('');
  return `<section class="pending-panel exile-card-panel"><span>选择要放逐的牌</span><div>${cards || '<span class="pending-unsupported">没有可放逐的牌</span>'}</div></section>`;
};
render();

// State codes are intentionally a local hot-seat/debug feature.  Rooms retain
// their authoritative action log and server snapshots; importing a code must
// never overwrite a shared room state.
const renderWithStateCodeControls = render;
render = () => {
  renderWithStateCodeControls();
};
app.addEventListener('click', async (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-state-export], [data-state-import]');
  if (!button || roomSession) return;
  if (button.hasAttribute('data-state-export')) {
    const code = encodeStateCode(state);
    try {
      await navigator.clipboard.writeText(code);
      message = `已复制状态码（${code.length} 字符）`;
      render();
    } catch {
      window.prompt('复制这个状态码；之后可用“载入状态”恢复：', code);
    }
    return;
  }
  const code = window.prompt('粘贴 ARNK2 状态码以恢复本地测试局面：');
  if (!code) return;
  try {
    restoreDebugState(code, 'IMPORT_STATE_CODE');
  } catch (error) {
    message = `无法载入状态码：${error instanceof Error ? error.message : '格式无效'}`;
  }
  render();
});
render();

// Local debugging timeline -------------------------------------------------
// A state code is a checkpoint, while a reducer entry is an explanation of how
// that checkpoint was reached.  Keep this client-only: a room's event log is
// still owned by its server.
type DebugTimelineEntry = { id: number; label: string; status: 'accepted' | 'rejected' | 'checkpoint'; code: string; detail?: string };
let debugTimeline: DebugTimelineEntry[] = [], debugTimelineId = 0;
function html(value: unknown) { return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;'); }
function describeReducerValue(value: unknown) {
  const record = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const type = String(record.type ?? '');
  const cardName = typeof record.cardId === 'string' ? context.cards[record.cardId]?.name ?? record.cardId : undefined;
  const descriptions: Record<string, string> = {
    START_GAME: '开始新游戏', END_TURN: '结束回合', PASS: '跳过回合',
    PLACE_WORKER: `派遣考古学家到 ${record.siteId ?? '地点'}`,
    DISCOVER_SITE: `发现 ${record.siteId ?? '地点'}`,
    ADVANCE_RESEARCH: `${record.track === 'journal' ? '笔记本' : '放大镜'}推进研究`,
    BUY_CARD: `购买 ${cardName ?? '市场卡牌'}`,
    PLAY_CARD: `使用 ${cardName ?? '卡牌'}`,
    ACTIVATE_ASSISTANT: '启动助手', OVERCOME_GUARDIAN: '击败守卫',
    BUY_TEMPLE_TILE: '购买神庙奖励板块', CLAIM_TEMPLE_BONUS: '领取神庙奖励',
    'assistant-option': '选择助手效果', 'assistant-stack': '选择助手供应堆',
    'research-node': '确认研究推进', card: '选择卡牌', resource: '选择资源',
  };
  if (descriptions[type]) return descriptions[type];
  const parts = [record.type, record.siteId, record.cardId, record.toNodeId, record.assistantId]
    .filter((part): part is string => typeof part === 'string');
  return parts.join(' · ') || '未知操作';
}
function recordReducerEvent(value: unknown, status: DebugTimelineEntry['status'], detail?: string) {
  if (roomSession || screen !== 'game') return;
  debugTimeline = [...debugTimeline.slice(-59), {
    id: ++debugTimelineId,
    label: describeReducerValue(value), status,
    detail,
    code: encodeStateCode(state),
  }];
}
function resetDebugTimeline(label: string) {
  debugTimeline = [];
  recordReducerEvent({ type: label }, 'checkpoint');
}
function debugPanel() {
  const current = encodeStateCode(state);
  const entries = [...debugTimeline].reverse().map((entry) => `<li class="debug-entry ${entry.status}">
    <div><strong>${html(entry.label)}</strong><small>${entry.status === 'accepted' ? '已应用' : entry.status === 'rejected' ? '已拒绝' : '检查点'}</small></div>
    ${entry.detail ? `<p>${html(entry.detail)}</p>` : ''}
    <details><summary>状态码 · ${entry.code.length} 字符</summary><textarea readonly spellcheck="false">${entry.code}</textarea></details>
    <div class="debug-entry-actions"><button data-debug-copy="${entry.id}">复制</button><button data-debug-load="${entry.id}">恢复</button></div>
  </li>`).join('') || '<li class="debug-empty">尚无 reducer 操作。</li>';
  return `<aside class="debug-timeline" aria-label="本地测试时间线">
    <div class="debug-title"><strong>测试时间线</strong><button data-debug-clear title="清空本局历史">清空</button></div>
    <p>当前状态码</p><textarea class="debug-current-code" readonly spellcheck="false">${current}</textarea>
    <div class="debug-current-actions"><button data-debug-copy-current>复制当前</button><button data-debug-load-current>粘贴恢复</button></div>
    <ol>${entries}</ol>
  </aside>`;
}
const renderWithDebugTimeline = render;
render = () => {
  renderWithDebugTimeline();
  const visible = screen === 'game' && !roomSession;
  document.body.classList.toggle('with-debug-timeline', visible);
  if (visible) app.querySelector('main')?.insertAdjacentHTML('beforeend', debugPanel());
};
function activityLog() {
  const entries = [...debugTimeline].slice(-5).reverse().map((entry) => `<li class="${entry.status}"><span>${html(entry.label)}</span>${entry.detail ? `<small>${html(entry.detail)}</small>` : ''}</li>`).join('') || '<li><span>本局尚未发生操作</span></li>';
  return `<section class="activity-log" aria-label="行动记录"><strong>行动记录</strong><ol>${entries}</ol></section>`;
}
const renderWithActivityLog = render;
render = () => {
  renderWithActivityLog();
  if (screen === 'game') app.querySelector('header')?.insertAdjacentHTML('afterend', activityLog());
};
const startWithDebugTimeline = start;
start = () => { startWithDebugTimeline(); resetDebugTimeline('START_GAME'); render(); };
const runWithDebugTimeline = run;
run = (action) => {
  runWithDebugTimeline(action);
  recordReducerEvent(action, message ? 'rejected' : 'accepted', message || undefined);
  render();
};
const chooseWithDebugTimeline = choose;
choose = (choice) => {
  chooseWithDebugTimeline(choice);
  recordReducerEvent(choice, message ? 'rejected' : 'accepted', message || undefined);
  render();
};
function restoreDebugState(code: string, label: string) {
  state = decodeStateCode(code.trim());
  researchBoard = state.research.board;
  pendingSelection = [];
  artifactId = undefined;
  leaderStartingCardId = undefined;
  researchPayment = undefined;
  message = '已恢复状态检查点。';
  recordReducerEvent({ type: label }, 'checkpoint');
}
app.addEventListener('click', async (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-debug-copy], [data-debug-load], [data-debug-copy-current], [data-debug-load-current], [data-debug-clear]');
  if (!button || roomSession || screen !== 'game') return;
  if (button.hasAttribute('data-debug-clear')) { debugTimeline = []; message = '已清空本局测试时间线。'; render(); return; }
  const entry = button.dataset.debugCopy || button.dataset.debugLoad
    ? debugTimeline.find((candidate) => candidate.id === Number(button.dataset.debugCopy ?? button.dataset.debugLoad))
    : undefined;
  if (button.hasAttribute('data-debug-copy') || button.hasAttribute('data-debug-copy-current')) {
    const code = entry?.code ?? encodeStateCode(state);
    try { await navigator.clipboard.writeText(code); message = `状态码已复制（${code.length} 字符）。`; }
    catch { window.prompt('复制这个状态码：', code); message = '状态码已显示，可手动复制。'; }
    render();
    return;
  }
  const code = entry?.code ?? window.prompt('粘贴 ARNK2 状态码以恢复本地测试局面：');
  if (!code) return;
  try { restoreDebugState(code, entry ? `RESTORE #${entry.id}` : 'IMPORT_STATE_CODE'); }
  catch (error) { message = `无法载入状态码：${error instanceof Error ? error.message : '格式无效'}`; }
  render();
});
render();

// Structured card effects deliberately keep their selection state outside the
// reducer.  This final panel covers the two card/research shapes that were
// previously serializable but had no browser affordance.
let structuredPendingKey = '';
let topDeckMode: 'keep' | 'exile' = 'keep';
let topDeckSelection: string[] = [];
const pendingBeforeStructuredChoices = pending;
pending = () => {
  const queued = state.pendingRewards[0];
  const payload = (queued?.payload ?? {}) as Record<string, unknown>;
  const effect = payload.type === 'CARD_EFFECT' && payload.effect && typeof payload.effect === 'object'
    ? payload.effect as Record<string, unknown> : undefined;
  const key = queued ? `${queued.playerId}:${queued.sourceId}:${JSON.stringify(payload)}` : '';
  if (key !== structuredPendingKey) { structuredPendingKey = key; topDeckMode = 'keep'; topDeckSelection = []; }
  if (!queued || !effect) return pendingBeforeStructuredChoices();
  const panel = (body: string, label = 'Choose') => `<section class="pending-panel structured-choice"><span>${label}</span><div>${body}</div></section>`;
  if (effect.type === 'DRAW_TOP_PROCESS' && payload.stage === 'top-process' && Array.isArray(payload.drawnCardIds)) {
    const drawn = payload.drawnCardIds.filter((id): id is string => typeof id === 'string');
    const max = effect.kind === 'first-aid' ? (topDeckMode === 'keep' ? 1 : 2) : 1;
    const cards = drawn.map((id) => `<button class="card ${topDeckSelection.includes(id) ? 'selected-choice' : ''}" data-top-deck-card="${id}" title="${context.cards[id]?.name ?? id}"><i style="${sprite(assets[`card:${id}:face`])}"></i></button>`).join('');
    const mode = effect.kind === 'first-aid'
      ? `<div class="pending-mode"><button class="pending-button ${topDeckMode === 'keep' ? 'picked' : ''}" data-top-deck-mode="keep">Keep 1</button><button class="pending-button ${topDeckMode === 'exile' ? 'picked' : ''}" data-top-deck-mode="exile">Exile 0–2</button></div>`
      : '<div class="pending-mode">Exile at most 1 (gain 1 coin if you do)</div>';
    const required = effect.kind === 'first-aid' && topDeckMode === 'keep';
    const ready = topDeckSelection.length <= max && (!required || topDeckSelection.length === 1);
    return panel(`${mode}<div class="pending-card-grid">${cards}</div><button class="pending-confirm" ${ready ? '' : 'disabled'} data-top-deck-confirm>✓</button>`, effect.kind === 'first-aid' ? 'First Aid' : 'Rod of Division');
  }
  if (effect.type === 'RESEARCH_ANY_DISCOUNT_THEN') {
    const track = context.researchTracks?.[state.research.board];
    const playerId = queued.playerId;
    const targets = (['magnifying', 'journal'] as const).flatMap((token) => {
      const from = state.research[`${token}Node`][playerId];
      return (track?.bridges ?? []).filter((bridge) => bridge.from === from && bridge.verified && bridge.to !== `${track?.id}:temple`)
        .map((bridge) => pendingResearchButton(`${token === 'magnifying' ? '⌕' : '▤'} ${bridge.to.split(':').slice(-2).join(' ')}`, token, bridge.to, effect.type === 'RESEARCH_ANY_DISCOUNT_THEN' ? effect.discount as Record<string,number> : {}));
    }).join('');
    return panel(targets || '<span class="pending-unsupported">No verified research destination</span>', 'Research');
  }
  return pendingBeforeStructuredChoices();
};
app.addEventListener('click', (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button');
  if (!button || button.disabled) return;
  if (button.dataset.topDeckMode) {
    topDeckMode = button.dataset.topDeckMode === 'exile' ? 'exile' : 'keep';
    topDeckSelection = [];
    render();
    return;
  }
  if (button.dataset.topDeckCard) {
    const id = button.dataset.topDeckCard;
    const queued = state.pendingRewards[0];
    const effect = ((queued?.payload as Record<string, unknown> | undefined)?.effect ?? {}) as Record<string, unknown>;
    const max = effect.kind === 'first-aid' ? (topDeckMode === 'keep' ? 1 : 2) : 1;
    topDeckSelection = topDeckSelection.includes(id) ? topDeckSelection.filter((cardId) => cardId !== id) : topDeckSelection.length < max ? [...topDeckSelection, id] : [id];
    render();
    return;
  }
  if (button.dataset.topDeckConfirm !== undefined) choose({ type: 'top-deck', mode: topDeckMode, cardIds: topDeckSelection });
});
render();

// Remaining card effects which have a simple, typed target use this shared
// layer.  It deliberately sits before later special-purpose wrappers: those
// wrappers still take precedence for pair/swap/archive selections.
let drawChoiceKey = '';
let drawKeepId: string | undefined;
let drawTopId: string | undefined;
let exchangeAssistantId: string | undefined;
let exchangeStackIndex: number | undefined;
const pendingBeforeSimpleCardChoices = pending;
pending = () => {
  const queued = state.pendingRewards[0];
  const payload = (queued?.payload ?? {}) as Record<string, unknown>;
  const effect = payload.type === 'CARD_EFFECT' && payload.effect && typeof payload.effect === 'object' ? payload.effect as Record<string, unknown> : undefined;
  if (!queued || !effect) return pendingBeforeSimpleCardChoices();
  const playerId = queued.playerId;
  const playerState = state.players[playerId];
  const panel = (body: string, title = 'Choose') => `<section class="pending-panel structured-choice"><span>${title}</span><div>${body}</div></section>`;
  const destinationButtons = (tokens: Array<'magnifying' | 'journal'>, free = false) => {
    const track = context.researchTracks?.[state.research.board];
    if (free) return tokens.flatMap((token) => {
      const from = state.research[`${token}Node`][playerId];
      return (track?.bridges ?? []).filter((bridge) => bridge.from === from && bridge.verified && bridge.to !== `${track?.id}:temple`)
        .map((bridge) => pendingButton(`${token} ${bridge.to.split(':').slice(-2).join(' ')}`, { type:'research-node', token, nodeId:bridge.to }));
    }).join('');
    return tokens.flatMap((token) => {
      const from = state.research[`${token}Node`][playerId];
      return (track?.bridges ?? []).filter((bridge) => bridge.from === from && bridge.verified && bridge.to !== `${track?.id}:temple`)
        .map((bridge) => pendingResearchButton(`${token === 'magnifying' ? '⌕' : '▤'} ${bridge.to.split(':').slice(-2).join(' ')}`, token, bridge.to, effect.discount as Record<string, number>));
    }).join('');
  };
  if (effect.type === 'FREE_RESEARCH') return panel(destinationButtons([effect.token], true), 'Free research');
  if (effect.type === 'RESEARCH_DISCOUNT') return panel(destinationButtons(['magnifying']), 'Discounted research');
  if (effect.type === 'ACTIVATE_TENT_SITE') {
    const targets = Object.values(state.sites).filter(site => site.isTentSite && (!effect.requireEmpty || !site.occupiedBy));
    return panel(targets.map(site => pendingButton(`Camp ${site.id}`, { type: 'site', siteId: site.id })).join(''));
  }
  if (effect.type === 'RETURN_SLOTTED_IDOL') return panel(playerState.idols.filter(idol => idol.inSlot).map(idol => pendingButton('Return idol', { type: 'idol', idolId: idol.id })).join(''));
  if (effect.type === 'EXILE_RIGHTMOST_ITEM_GAIN_EXILED_ITEM') return panel(state.market.exiled.filter(cardId => context.cards[cardId]?.type === 'Item').map(cardId => pendingButton(context.cards[cardId]?.name ?? cardId, { type: 'card', cardId })).join(''));
  if (effect.type === 'BUY_ITEM' || effect.type === 'BUY_ARTIFACT') {
    const row = effect.type === 'BUY_ITEM' ? state.market.items : state.market.artifacts;
    const deck = effect.type === 'BUY_ITEM' ? state.market.itemDeck : state.market.artifactDeck;
    const candidates = [...row, ...(effect.includeTop && deck[0] ? [deck[0]] : [])];
    return panel(`${candidates.map(cardId => pendingButton(context.cards[cardId]?.name ?? cardId, { type: 'card', cardId })).join('')}${pendingButton('Skip', { type: 'skip' })}`);
  }
  if (effect.type === 'EXCHANGE_ASSISTANT_WITH_AVAILABLE') {
    const own = playerState.assistants.map(assistant => `<button class="pending-button ${exchangeAssistantId === assistant.id ? 'picked' : ''}" data-exchange-assistant="${assistant.id}">${assistant.level} assistant</button>`).join('');
    const stacks = state.assistants.stacks.map((stack, index) => `<button class="pending-button ${exchangeStackIndex === index ? 'picked' : ''}" data-exchange-stack="${index}">supply ${index + 1}${stack[0] ? '' : ' (empty)'}</button>`).join('');
    const ready = exchangeAssistantId !== undefined && exchangeStackIndex !== undefined;
    return panel(`<div>${own}</div><div>${stacks}</div><button class="pending-confirm" ${ready ? '' : 'disabled'} data-exchange-confirm>✓</button>`, 'Exchange assistant');
  }
  if (effect.type === 'DRAW_BOTTOM_THEN_KEEP' || effect.type === 'DRAW_THEN_KEEP_AND_OPTIONAL_TOP') {
    const drawn = Array.isArray(payload.drawnCardIds) ? payload.drawnCardIds.filter((id): id is string => typeof id === 'string') : [];
    if (!payload.stage) return panel(Array.from({ length: Number(effect.maximum) + 1 }, (_, count) => pendingButton(String(count), { type: 'card-count', count })).join(''), 'Cards to reveal');
    if (effect.type === 'DRAW_BOTTOM_THEN_KEEP') return panel(drawn.map(cardId => pendingButton(context.cards[cardId]?.name ?? cardId, { type: 'card', cardId })).join(''), 'Keep one');
    const key = `${queued.sourceId}:${drawn.join(',')}`;
    if (key !== drawChoiceKey) { drawChoiceKey = key; drawKeepId = undefined; drawTopId = undefined; }
    const cardButton = (cardId: string, role: 'keep' | 'top') => `<button class="pending-button ${role === 'keep' ? drawKeepId === cardId ? 'picked' : '' : drawTopId === cardId ? 'picked' : ''}" data-draw-choice="${role}:${cardId}">${role === 'keep' ? 'Keep ' : 'Top '}${context.cards[cardId]?.name ?? cardId}</button>`;
    return panel(`<div>${drawn.map(cardId => cardButton(cardId, 'keep')).join('')}</div><div>${drawn.filter(cardId => cardId !== drawKeepId).map(cardId => cardButton(cardId, 'top')).join('')}<button class="pending-button" data-draw-no-top>No top card</button></div><button class="pending-confirm" ${drawKeepId ? '' : 'disabled'} data-draw-confirm>✓</button>`, 'Keep and optionally return');
  }
  return pendingBeforeSimpleCardChoices();
};
app.addEventListener('click', event => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button');
  if (!button || button.disabled) return;
  if (button.dataset.drawChoice) {
    const [role, cardId] = button.dataset.drawChoice.split(':', 2);
    if (role === 'keep') { drawKeepId = drawKeepId === cardId ? undefined : cardId; if (drawTopId === cardId) drawTopId = undefined; }
    else drawTopId = drawTopId === cardId ? undefined : cardId;
    render(); return;
  }
  if (button.dataset.drawNoTop !== undefined) { drawTopId = undefined; render(); return; }
  if (button.dataset.drawConfirm && drawKeepId) { choose({ type: 'keep-and-top', keepCardId: drawKeepId, ...(drawTopId ? { topDeckCardId: drawTopId } : {}) }); return; }
  if (button.dataset.exchangeAssistant) { exchangeAssistantId = button.dataset.exchangeAssistant; render(); return; }
  if (button.dataset.exchangeStack !== undefined) { exchangeStackIndex = Number(button.dataset.exchangeStack); render(); return; }
  if (button.dataset.exchangeConfirm && exchangeAssistantId !== undefined && exchangeStackIndex !== undefined) {
    const assistantId = exchangeAssistantId, stackIndex = exchangeStackIndex;
    exchangeAssistantId = undefined; exchangeStackIndex = undefined;
    choose({ type: 'assistant-exchange', assistantId, stackIndex }); return;
  }
});
render();

type LeaderCardUiChoice = { choice: string; snackId?: 'free' | 'coin' | 'compass'; label: string };
function leaderCardChoices(cardId: string): LeaderCardUiChoice[] {
  const player = state.players[state.currentPlayer], cardDefinition = context.cards[cardId], name = cardDefinition?.name ?? '', leader = player.leader?.id;
  const placed = Object.values(state.sites).filter((site) => site.occupiedBy === player.id).length;
  const items = player.playedCards.filter((id) => context.cards[id]?.type === 'Item').length;
  const artifacts = player.playedCards.filter((id) => context.cards[id]?.type === 'Artifact').length;
  const guardians = player.defeatedGuardians.length;
  const basic = (choice: string, label: string): LeaderCardUiChoice => ({ choice, label });
  if (leader === 'captain') {
    if (name === 'Funding') return [basic('coin', '●')];
    if (name === 'Piloting') return [basic('compass', '◉'), ...(player.resources.coin > 0 ? [basic('payCoinForPlanes', '●→✈✈')] : [])];
    if (name === 'Transmission') return [basic('coin', '●'), ...(placed >= 2 ? [basic('compass', '◉')] : []), ...(placed >= 3 ? [basic('tablets', '▰')] : [])];
  }
  if (leader === 'falconer') {
    if (name === 'Funding') return [basic('coin', '●')];
    if (name === 'Falconry') return [basic('compass', '◉'), basic('eagle', '🦅')];
    if (name === 'Tracking') return [basic('compass', '◉')];
    if (name === 'Animal Bond') return [basic('coin', '●'), ...(guardians >= 1 ? [basic('exile', '▣')] : []), ...(guardians >= 3 ? [basic('eagle', '🦅')] : [])];
  }
  if (leader === 'baroness') {
    if (name === 'Connections') return [basic('coin', '●')];
    if (name === 'Research Notes') return [basic('compass', '◉'), ...(player.resources.coin >= 2 ? [basic('payCoinsForJewel', '●●→◆')] : [])];
    if (name === 'Resourcefulness') return [basic('coin', '●'), ...(items >= 1 ? [basic('compass', '◉')] : []), ...(items >= 3 ? [basic('refreshAssistant', '♙')] : [])];
  }
  if (leader === 'professor') {
    if (name === 'Funding') return [basic('coin', '●')];
    if (name === 'Preservation') return [basic('compass', '◉'), basic('upgradeResource', '▰→▲')];
    if (name === 'Arnakology') return [basic('compass', '◉')];
    if (name === 'Linguistics') return [basic('coin', '●'), ...(artifacts >= 1 ? [basic('suitcaseCompass', '◉')] : []), ...(artifacts >= 2 ? [basic('suitcaseTablet', '▰')] : [])];
  }
  if (leader === 'explorer') {
    const snacks = ((player.leader?.data.snacks ?? []) as Array<{ id: 'free' | 'coin' | 'compass'; used: boolean; availableFromRound: number }>).filter((snack) => !snack.used && state.round >= snack.availableFromRound);
    const snackChoices = (choice: string) => snacks.map((snack) => ({ choice, snackId: snack.id, label: choice === 'activateSite' ? `⌾ ${snack.id}` : `◉ ${snack.id}` }));
    if (name === 'Funding') return [basic('coin', '●')];
    if (name === 'Hike') return [basic('compass', '◉'), ...snackChoices('activateSite')];
    if (name === 'Cartography') return [basic('coin', '●'), ...snackChoices('activateFaceupIdol')];
    if (name === 'Scouting') return [basic('compass', '◉')];
  }
  if (leader === 'mystic') {
    if (name === 'Worldly Goods') return [basic('coin', '●'), basic('draw', '▣')];
    if (name === 'Divine Guidance') return [basic('compass', '◉'), basic('exile', '▣')];
    if (name === 'Meditation') return [basic('coin', '●'), basic('exile', '▣')];
    if (name === 'Blindsight') return [basic('compass', '◉')];
  }
  return [];
}
function leaderStartingCardPanel() {
  if (!leaderStartingCardId) return '';
  const options = leaderCardChoices(leaderStartingCardId);
  return `<section class="pending-panel leader-card-panel"><span>✦</span><div>${options.map((option) => `<button class="pending-button" data-leader-card-choice="${encodeURIComponent(JSON.stringify({ cardId: leaderStartingCardId, choice: option.choice, snackId: option.snackId }))}" title="${option.choice}">${option.label}</button>`).join('') || '<span class="pending-unsupported">…</span>'}<button class="pending-button" data-leader-card-cancel>×</button></div></section>`;
}
const renderWithLeaderCardPanel = render;
render = () => {
  renderWithLeaderCardPanel();
  if (screen === 'game') app.querySelector('main')?.insertAdjacentHTML('beforeend', leaderStartingCardPanel());
};
app.addEventListener('click', (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button');
  if (!button || button.disabled) return;
  if (button.dataset.leaderCardCancel !== undefined) { leaderStartingCardId = undefined; render(); return; }
  if (!button.dataset.leaderCardChoice) return;
  const input = JSON.parse(decodeURIComponent(button.dataset.leaderCardChoice)) as { cardId: string; choice: string; snackId?: 'free' | 'coin' | 'compass' };
  leaderStartingCardId = undefined;
  run({ type: 'LEADER_STARTING_CARD_EFFECT', playerId: state.currentPlayer, cardId: input.cardId, choice: input.choice, snackId: input.snackId } as unknown as GameAction);
});
render();

// Expansion presets can require richer targets than the original card panel.
// Keep these selections local to the view; the engine still validates every
// serialized PendingChoice before changing authoritative state.
let expansionSwapSites: string[] = [];
const pendingWithExpansionTargets = pending;
pending = () => {
  const queued = state.pendingRewards[0];
  const payload = (queued?.payload ?? {}) as Record<string, unknown>;
  const effect = payload.type === 'CARD_EFFECT' && payload.effect && typeof payload.effect === 'object' ? payload.effect as Record<string, unknown> : undefined;
  if (!queued || !effect) return pendingWithExpansionTargets();
  const id = queued.playerId;
  const panel = (content: string) => `<section class="pending-panel expansion-pending"><span>✦</span><div>${content}</div></section>`;
  if (effect.type === 'EXILE_SLOTTED_IDOL') return panel(state.players[id].idols.filter((idol) => idol.inSlot).map((idol) => pendingButton('移除神像', { type:'idol', idolId:idol.id })).join(''));
  if (effect.type === 'ACTIVATE_OCCUPIED_SITE' || effect.type === 'ACTIVATE_UNOCCUPIED_SITE' || effect.type === 'ACTIVATE_SITE_IN_ROW_ABOVE_OWN_WORKER' || effect.type === 'ACTIVATE_LEVEL1_SITE_IN_ROW_WITH_OWN_WORKER') {
    const level = typeof effect.level === 'number' ? effect.level : undefined;
    const targets = Object.values(state.sites).filter((site) => {
      if (effect.type === 'ACTIVATE_SITE_IN_ROW_ABOVE_OWN_WORKER') return Object.values(state.sites).some((source) => source.occupiedBy === id && source.mapRow !== undefined && site.mapRow === source.mapRow + 1);
      if (effect.type === 'ACTIVATE_LEVEL1_SITE_IN_ROW_WITH_OWN_WORKER') return site.level === 1 && Object.values(state.sites).some((source) => source.occupiedBy === id && source.mapRow !== undefined && site.mapRow === source.mapRow);
      return (effect.type === 'ACTIVATE_OCCUPIED_SITE' ? site.occupiedBy : !site.occupiedBy) && (level === undefined || site.level === level);
    });
    return panel(targets.map((site) => pendingButton(`⌾ ${site.level}`, { type: 'site', siteId: site.id })).join(''));
  }
  if (effect.type === 'EXILE_MARKET_CARD_REFILL') {
    const row = effect.row === 'item' ? state.market.items : effect.row === 'artifact' ? state.market.artifacts : [...state.market.items, ...state.market.artifacts];
    const skip = effect.optional ? pendingButton('跳过', { type: 'skip' }) : '';
    return panel(`${row.map((cardId) => pendingButton('放逐', { type: 'card', cardId })).join('')}${skip}`);
  }
  if (effect.type === 'BUY_ARTIFACT_WITH_DISCOUNT_THEN_EXILE' || effect.type === 'BUY_ARTIFACT_WITH_DISCOUNT_TO_HAND') {
    return panel(state.market.artifacts.map((cardId) => pendingButton('购买并放逐', { type: 'card', cardId })).join(''));
  }
  if (effect.type === 'ACTIVATE_ANY_GOLD_ASSISTANT') {
    const targets = state.playerOrder.flatMap((ownerId) => state.players[ownerId].assistants.filter((assistant) => assistant.level === 'gold').map((assistant) => pendingButton(`♙ ${ownerId}`, { type: 'assistant-target', ownerId, assistantId: assistant.id })));
    return panel(targets.join(''));
  }
  if (effect.type === 'ACTIVATE_DEFEATED_GUARDIAN_BOON') {
    return panel(state.players[id].defeatedGuardians.filter((guardianId) => !state.players[id].usedGuardianBoons.includes(guardianId)).map((guardianId) => pendingButton('守卫能力', { type:'guardian', guardianId })).join(''));
  }
  if (effect.type === 'RETURN_FEAR_FROM_PLAY_TO_HAND') {
    return panel(state.players[id].playedCards.filter((cardId) => context.cards[cardId]?.type === 'Fear').map((cardId) => pendingButton('收回恐惧', { type:'card', cardId })).join(''));
  }
  if (effect.type === 'PAY_ANY_RESOURCES_THEN') {
    const allowed = Array.isArray(effect.resources) ? effect.resources.filter((resource): resource is string => typeof resource === 'string') : [];
    const amount = Number(effect.amount);
    const fields = (['coin', 'compass', 'tablet', 'arrowhead', 'jewel'] as const).filter((resource) => allowed.includes(resource)).map((resource) => `<label title="${resource}"><img src="${publicAsset(`/assets/resource-${resource}.png`)}" alt="${resource}"><input data-flex-resource="${resource}" type="number" min="0" max="${amount}" value="0"></label>`).join('');
    return panel(`${fields}<button class="pending-confirm" data-flex-confirm="${amount}">✓</button>`);
  }
  if (effect.type === 'SWAP_SITE_TILES_THEN_ACTIVATE') {
    const candidates = Object.values(state.sites).filter((site) => site.tileId);
    if (expansionSwapSites.length < 2) return panel(candidates.map((site) => `<button class="pending-button ${expansionSwapSites.includes(site.id) ? 'picked' : ''}" data-expansion-swap-site="${site.id}">⌾ ${site.level}</button>`).join(''));
    return panel(expansionSwapSites.map((siteId) => `<button class="pending-button" data-expansion-swap-activate="${siteId}">⌾</button>`).join(''));
  }
  return pendingWithExpansionTargets();
};
app.addEventListener('click', (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button');
  if (!button || button.disabled) return;
  if (button.dataset.expansionSwapSite) {
    const siteId = button.dataset.expansionSwapSite;
    expansionSwapSites = expansionSwapSites.includes(siteId) ? expansionSwapSites.filter((id) => id !== siteId) : expansionSwapSites.length < 2 ? [...expansionSwapSites, siteId] : expansionSwapSites;
    render(); return;
  }
  if (button.dataset.expansionSwapActivate && expansionSwapSites.length === 2) {
    const activateSiteId = button.dataset.expansionSwapActivate;
    const [firstSiteId, secondSiteId] = expansionSwapSites; expansionSwapSites = [];
    choose({ type: 'site-swap', firstSiteId, secondSiteId, activateSiteId }); return;
  }
  if (button.dataset.flexConfirm !== undefined) {
    const payment: Partial<Record<'coin' | 'compass' | 'tablet' | 'arrowhead' | 'jewel', number>> = {};
    app.querySelectorAll<HTMLInputElement>('[data-flex-resource]').forEach((input) => { const value = Number(input.value); if (Number.isInteger(value) && value > 0) payment[input.dataset.flexResource as keyof typeof payment] = value; });
    choose({ type: 'resource-payment', payment }); return;
  }
});
render();

// LAN room client.  It deliberately speaks only to the authoritative room
// service: browser state is a projected view, never a reducer input.
type RoomTicketUi = { roomId: string; token: string; playerId?: PlayerId; role: 'player' | 'spectator' };
type RoomSummaryUi = { id: string; name: string; seats: number; occupiedSeats: number; spectatorCount: number; status: 'lobby' | 'playing' | 'finished'; hostPlayerId: PlayerId; visibility: 'public' | 'unlisted' };
type RoomSnapshotUi = { room: RoomSummaryUi; viewer: { playerId?: PlayerId; role: 'player' | 'spectator'; autoPass?: boolean }; state?: GameState };
type AuthSessionUi = { token: string; user: { id: string; username: string; displayName: string }; expiresAt: string };
const roomSessionKey = 'arnak.room-session.v1', roomAddressKey = 'arnak.room-address.v1', authSessionKey = 'arnak.auth-session.v1';
let roomAddress = localStorage.getItem(roomAddressKey) || `${location.protocol}//${location.hostname || '127.0.0.1'}:8787`;
let roomSession: (RoomTicketUi & { baseUrl: string }) | undefined;
try { roomSession = JSON.parse(localStorage.getItem(roomSessionKey) || '') as RoomTicketUi & { baseUrl: string }; } catch { localStorage.removeItem(roomSessionKey); }
let roomList: RoomSummaryUi[] = [], roomSnapshot: RoomSnapshotUi | undefined, roomEvents: EventSource | undefined;
let authSession: AuthSessionUi | undefined, authUsername = '', authDisplayName = '', authPassword = '';
try { authSession = JSON.parse(localStorage.getItem(authSessionKey) || '') as AuthSessionUi; } catch { localStorage.removeItem(authSessionKey); }

function roomUrl(path: string) { return `${roomAddress.replace(/\/$/, '')}${path}`; }
async function roomRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(roomUrl(path), { ...init, headers: { 'content-type': 'application/json', ...(authSession ? { authorization: `Bearer ${authSession.token}` } : {}), ...(init?.headers ?? {}) } });
  const value = await response.json() as { ok: boolean; error?: string } & T;
  if (!response.ok || !value.ok) throw new Error(value.error || `Room service returned ${response.status}`);
  return value;
}
function saveAuthSession(session?: AuthSessionUi) { authSession = session; if (session) localStorage.setItem(authSessionKey, JSON.stringify(session)); else localStorage.removeItem(authSessionKey); }
async function authenticateRoomUser(mode: 'register' | 'login') {
  try { localStorage.setItem(roomAddressKey, roomAddress); const path = mode === 'register' ? '/auth/register' : '/auth/login'; const session = (await roomRequest<{ session: AuthSessionUi }>(path, { method: 'POST', body: JSON.stringify({ username: authUsername, displayName: authDisplayName || undefined, password: authPassword }) })).session; saveAuthSession(session); authPassword = ''; message = ''; await refreshRooms(); }
  catch (error) { message = error instanceof Error ? error.message : String(error); render(); }
}
async function logoutRoomUser() { try { await roomRequest('/auth/logout', { method: 'POST' }); } finally { roomEvents?.close(); saveAuthSession(); saveRoomSession(); roomSnapshot = undefined; screen = 'rooms'; render(); } }
function saveRoomSession(session?: typeof roomSession) {
  roomSession = session;
  if (session) localStorage.setItem(roomSessionKey, JSON.stringify(session)); else localStorage.removeItem(roomSessionKey);
}
function applyRoomSnapshot(snapshot: RoomSnapshotUi) {
  const previous = state;
  roomSnapshot = snapshot;
  if (snapshot.state) { state = snapshot.state; researchBoard = state.research.board; screen = 'game'; }
  else screen = 'room';
  message = ''; render();
  if (snapshot.state) playActionFeedback(previous, state);
}
async function refreshRooms() {
  try { roomList = (await roomRequest<{ rooms: RoomSummaryUi[] }>('/rooms')).rooms; message = ''; }
  catch (error) { message = error instanceof Error ? error.message : String(error); }
  render();
}
async function refreshRoomSnapshot() {
  if (!roomSession) return;
  const { baseUrl, roomId, token } = roomSession; roomAddress = baseUrl;
  try { applyRoomSnapshot((await roomRequest<{ snapshot: RoomSnapshotUi }>(`/rooms/${roomId}/snapshot?token=${encodeURIComponent(token)}`)).snapshot); }
  catch (error) { message = error instanceof Error ? error.message : String(error); screen = 'rooms'; render(); }
}
function watchRoom() {
  roomEvents?.close();
  if (!roomSession) return;
  roomEvents = new EventSource(`${roomSession.baseUrl.replace(/\/$/, '')}/rooms/${roomSession.roomId}/events?token=${encodeURIComponent(roomSession.token)}`);
  roomEvents.addEventListener('snapshot', event => {
    try { applyRoomSnapshot(JSON.parse((event as MessageEvent<string>).data) as RoomSnapshotUi); }
    catch { /* A reconnect will provide the next complete snapshot. */ }
  });
}
async function createLanRoom() {
  try {
    localStorage.setItem(roomAddressKey, roomAddress);
    const ticket = (await roomRequest<{ ticket: RoomTicketUi }>('/rooms', { method: 'POST', body: JSON.stringify({ name: 'Arnak LAN', seats: setupPlayerCount }) })).ticket;
    saveRoomSession({ ...ticket, baseUrl: roomAddress }); await refreshRoomSnapshot(); watchRoom();
  } catch (error) { message = error instanceof Error ? error.message : String(error); render(); }
}
async function joinLanRoom(roomId: string, spectator = false) {
  try {
    localStorage.setItem(roomAddressKey, roomAddress);
    const ticket = (await roomRequest<{ ticket: RoomTicketUi }>(`/rooms/${roomId}/join`, { method: 'POST', body: JSON.stringify({ name: spectator ? 'Spectator' : 'Guest', spectator }) })).ticket;
    saveRoomSession({ ...ticket, baseUrl: roomAddress }); await refreshRoomSnapshot(); watchRoom();
  } catch (error) { message = error instanceof Error ? error.message : String(error); render(); }
}
async function startLanRoom() {
  if (!roomSession) return;
  try {
    const players = Array.from({ length: roomSnapshot?.room.seats ?? setupPlayerCount }, (_, index) => `p${index + 1}`);
    const leaders = Object.fromEntries(players.flatMap(id => setupLeaders[id] ? [[id, setupLeaders[id]]] : []));
    const snapshot = (await roomRequest<{ snapshot: RoomSnapshotUi }>(`/rooms/${roomSession.roomId}/start`, { method: 'POST', body: JSON.stringify({ token: roomSession.token, seed: setupSeed || undefined, researchBoard, moonStaff: setupMoonStaff, leaders, marketExpansions: ['Base Game', ...(setupLeadersMarket ? ['Expedition Leaders'] : []), ...(setupSurpriseShipment ? ['Surprise Shipment'] : [])] }) })).snapshot;
    applyRoomSnapshot(snapshot);
  } catch (error) { message = error instanceof Error ? error.message : String(error); render(); }
}
async function submitLanCommand(command: unknown) {
  if (!roomSession) return;
  try {
    const snapshot = (await roomRequest<{ snapshot: RoomSnapshotUi }>(`/rooms/${roomSession.roomId}/commands`, { method: 'POST', body: JSON.stringify({ token: roomSession.token, command }) })).snapshot;
    applyRoomSnapshot(snapshot);
  } catch (error) { message = error instanceof Error ? error.message : String(error); render(); }
}
async function reserveLanPass(enabled: boolean) {
  if (!roomSession) return;
  try { const snapshot = (await roomRequest<{ snapshot: RoomSnapshotUi }>(`/rooms/${roomSession.roomId}/auto-pass`, { method: 'POST', body: JSON.stringify({ token: roomSession.token, enabled }) })).snapshot; applyRoomSnapshot(snapshot); }
  catch (error) { message = error instanceof Error ? error.message : String(error); render(); }
}
function roomStatusLabel(status: RoomSummaryUi['status']) { return status === 'lobby' ? '等待开局' : status === 'playing' ? '进行中' : '已结束'; }
function roomListItem(room: RoomSummaryUi) {
  const canJoin = room.status === 'lobby' && room.occupiedSeats < room.seats;
  return `<article class="room-list-item"><div><strong>${room.name}</strong><span>${room.occupiedSeats}/${room.seats} 位玩家 · ${room.spectatorCount} 位旁观</span></div><small class="room-status room-status--${room.status}">${roomStatusLabel(room.status)}</small><div class="room-item-actions">${canJoin ? `<button data-room-join="${room.id}">加入</button>` : ''}<button data-room-watch="${room.id}">旁观</button></div></article>`;
}
function roomAddressField() { return `<label class="setup-field room-address-field"><span>房间服务</span><input data-room-address value="${roomAddress}" spellcheck="false" aria-label="房间服务地址"></label>`; }
function renderRooms() {
  const notices = message ? `<div class="message">${message}</div>` : '';
  const back = '<button class="text-button" data-room-local>← 返回本地热座</button>';
  if (!authSession) {
    app.innerHTML = `<main class="setup-screen setup-screen--lobby"><section class="setup-card room-lobby"><header class="setup-hero"><div class="setup-kicker">联机模式</div><h1>连接房间</h1><p>房间服务负责同步和规则判定；本地热座不需要它。</p></header><div class="setup-fields room-auth-fields">${roomAddressField()}<label class="setup-field"><span>用户名</span><input data-auth-username value="${authUsername}" autocomplete="username"></label><label class="setup-field"><span>显示名</span><input data-auth-display-name value="${authDisplayName}" placeholder="注册时可填"></label><label class="setup-field"><span>密码</span><input data-auth-password type="password" value="${authPassword}" autocomplete="current-password"></label></div><div class="room-actions"><button class="setup-start" data-auth-login>登录</button><button data-auth-register>创建账户</button></div><p class="setup-note">账户只用于身份、断线重连与玩家席位权限。</p>${notices}${back}</section></main>`;
    return;
  }
  app.innerHTML = `<main class="setup-screen setup-screen--lobby"><section class="setup-card room-lobby"><header class="setup-hero"><div class="setup-kicker">房间联机</div><h1>局域网房间</h1><p>在同一局域网中创建、加入或旁观一局游戏。</p></header><div class="room-account"><span>已登录为 <strong>${authSession.user.displayName}</strong></span><button class="text-button" data-auth-logout>退出</button></div>${roomAddressField()}<div class="room-actions"><button data-room-refresh>刷新列表</button><button class="setup-start" data-room-create>创建 ${setupPlayerCount} 人房间</button></div><section class="room-list" aria-label="公开房间"><h2>可加入的房间</h2>${roomList.map(roomListItem).join('') || '<p class="room-empty">还没有公开房间。创建一个，让朋友加入即可。</p>'}</section>${notices}${back}</section></main>`;
}
function renderRoomLobby() {
  const room = roomSnapshot?.room;
  const canStart = roomSession?.playerId === room?.hostPlayerId && room?.status === 'lobby';
  app.innerHTML = `<main class="setup-screen setup-screen--lobby"><section class="setup-card room-lobby room-waiting"><header class="setup-hero"><div class="setup-kicker">房间已连接</div><h1>${room?.name || '正在连接房间'}</h1><p>${room ? `${room.occupiedSeats}/${room.seats} 位玩家 · ${roomStatusLabel(room.status)}` : '正在取得房间信息…'}</p></header><div class="waiting-indicator"><i></i><span>${canStart ? '玩家已就绪，可以由房主开局。' : '等待房主开始游戏…'}</span></div>${canStart ? `<button class="setup-start" data-room-start>以当前设置开局</button>` : ''}<button data-room-leave>离开房间</button>${message ? `<div class="message">${message}</div>` : ''}</section></main>`;
}
const renderWithoutLanRooms = render;
render = () => {
  if (screen === 'rooms') { renderRooms(); return; }
  if (screen === 'room') { renderRoomLobby(); return; }
  renderWithoutLanRooms();
  if (roomSession && screen === 'game' && roomSession.playerId !== state.currentPlayer) app.querySelectorAll<HTMLButtonElement>('button[data-card-id],button[data-site],button[data-discover],button[data-research],button[data-assistant],button[data-action="end"],button[data-action="pass"]').forEach(button => { button.disabled = true; });
};
const localRun = run, localChoose = choose;
run = (action: GameAction) => { if (roomSession) { void submitLanCommand({ type: 'action', action }); } else localRun(action); };
choose = (choice: PendingChoice) => { if (roomSession) { const pending = state.pendingRewards[0]; if (pending) void submitLanCommand({ type: 'pending-choice', playerId: pending.playerId, pendingIndex: 0, choice }); } else localChoose(choice); };
app.addEventListener('input', event => { const target = event.target as HTMLInputElement; if (target.matches('[data-room-address]')) roomAddress = target.value; if (target.matches('[data-auth-username]')) authUsername = target.value; if (target.matches('[data-auth-display-name]')) authDisplayName = target.value; if (target.matches('[data-auth-password]')) authPassword = target.value; });
app.addEventListener('click', event => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button'); if (!button) return;
  if (button.dataset.roomRefresh !== undefined) { void refreshRooms(); return; }
  if (button.dataset.authLogin !== undefined) { void authenticateRoomUser('login'); return; }
  if (button.dataset.authRegister !== undefined) { void authenticateRoomUser('register'); return; }
  if (button.dataset.authLogout !== undefined) { void logoutRoomUser(); return; }
  if (button.dataset.roomCreate !== undefined) { void createLanRoom(); return; }
  if (button.dataset.roomJoin) { void joinLanRoom(button.dataset.roomJoin); return; }
  if (button.dataset.roomWatch) { void joinLanRoom(button.dataset.roomWatch, true); return; }
  if (button.dataset.roomStart !== undefined) { void startLanRoom(); return; }
  if (button.dataset.roomAutoPass !== undefined) { void reserveLanPass(button.dataset.roomAutoPass !== 'true'); return; }
  if (button.dataset.roomLeave !== undefined) { roomEvents?.close(); saveRoomSession(); roomSnapshot = undefined; screen = 'rooms'; void refreshRooms(); return; }
  if (button.dataset.roomLocal !== undefined) { screen = 'setup'; render(); return; }
});
const lanSetup = renderSetup;
renderSetup = () => {
  lanSetup();
  app.querySelector('.setup-start')?.insertAdjacentHTML('afterend', '<button data-room-open>局域网房间</button>');
};
app.addEventListener('click', event => { const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button'); if (button?.dataset.roomOpen !== undefined) { screen = 'rooms'; void refreshRooms(); } });
if (roomSession) { void refreshRoomSnapshot().then(watchRoom); }
render();

// Temple-tile purchase is a normal main action.  The marker only becomes a
// button when the current magnifying glass is at an eligible printed space.
let templeShopOpen = false;
const renderWithoutTempleShop = render;
render = () => {
  renderWithoutTempleShop();
  if (!templeShopOpen || state.phase !== 'playing') return;
  const supply = state.templeTiles;
  const tile = (tier: 'bronze' | 'silver' | 'gold', combination: 0 | 1 | 2 | undefined, points: number, variant: string, title: string) => {
    const remaining=tier==='silver'?(combination===1?supply.silverRight:supply.silverLeft):supply[tier];
    return `<button class="temple-tile ${tier}" ${remaining ? '' : 'disabled'} data-temple-tier="${tier}" ${combination === undefined ? '' : `data-temple-combination="${combination}"`} title="${title}"><img src="${publicAsset(`/assets/temple-tile-${variant}.png`)}" alt="${variant} Temple tile"><small>${remaining}</small></button>`;
  };
  const bonusTiles = state.research.templeArrivals.includes(state.currentPlayer) ? state.research.templeBonusTiles.map((tileId, index) => `<button class="temple-secret" data-temple-bonus="${tileId}" title="face-down temple bonus">?</button>`).join('') : '';
  app.insertAdjacentHTML('beforeend', `<section class="temple-shop" role="dialog" aria-label="temple tiles"><div>${tile('bronze', 0, 2, '2a', templeCostText('bronze',0))}${tile('bronze', 1, 2, '2b', templeCostText('bronze',1))}${tile('bronze', 2, 2, '2c', templeCostText('bronze',2))}</div><div>${tile('silver', 0, 6, '6a', templeCostText('silver',0))}${tile('silver', 1, 6, '6b', templeCostText('silver',1))}</div><div>${tile('gold', undefined, 11, '11', templeCostText('gold'))}</div>${bonusTiles ? `<div class="temple-secrets">${bonusTiles}</div>` : ''}<button data-temple-close title="close">×</button></section>`);
};
app.addEventListener('click', (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button');
  if (!button || button.disabled) return;
  if (button.dataset.templeShop !== undefined) { templeShopOpen = true; render(); return; }
  if (button.dataset.templeClose !== undefined) { templeShopOpen = false; render(); return; }
  if (button.dataset.templeBonus) {
    templeShopOpen = false;
    run({ type: 'CLAIM_TEMPLE_BONUS', playerId: state.currentPlayer, tileId: button.dataset.templeBonus });
    return;
  }
  if (button.dataset.templeTier) {
    const tier = button.dataset.templeTier as 'bronze' | 'silver' | 'gold';
    const rawCombination = button.dataset.templeCombination;
    templeShopOpen = false;
    run({ type: 'BUY_TEMPLE_TILE', playerId: state.currentPlayer, tier, ...(rawCombination === undefined ? {} : { combination: Number(rawCombination) as 0 | 1 | 2 }) });
  }
});
render();

// This is intentionally the last render wrapper: previous UI additions also
// redefine render, while the market must be repositioned for every table draw.
const renderWithMoonStaffMarket = render;
render = () => {
  renderWithMoonStaffMarket();
  if (screen !== 'game') return;
  const market = app.querySelector<HTMLElement>('.play-surface > .market');
  const boardElement = app.querySelector<HTMLElement>('.play-surface > .map-board');
  if (!market || !boardElement) return;
  market.classList.add('market-above-board');
  market.innerHTML = `<div class="market-group market-items">${state.market.items.map((id) => card(id, 'buy')).join('')}</div><div class="moon-staff ${state.moonStaff}" style="--moon-step:${Math.max(0, Math.min(4, state.round - 1))}" title="${state.moonStaff} moon staff"><i class="moon-staff-head"></i><i class="moon-staff-shaft"></i><i class="moon-staff-marker"></i></div><div class="market-group market-artifacts">${state.market.artifacts.map((id) => card(id, 'buy')).join('')}</div>`;
  boardElement.before(market);
};
render();

// Keep the market visually attached to the board, like the physical display:
// Item cards, the moon staff (with its red round marker), then Artifacts.
const renderWithBoardMarket = render;
render = () => {
  renderWithBoardMarket();
  if (screen !== 'game') return;
  const market = app.querySelector<HTMLElement>('.play-surface > .market');
  const boardElement = app.querySelector<HTMLElement>('.play-surface > .map-board');
  if (!market || !boardElement) return;
  market.classList.add('market-above-board');
  market.innerHTML = `<div class="market-group market-items">${state.market.items.map((id) => card(id, 'buy')).join('')}</div><div class="moon-staff" style="--moon-step:${Math.max(0, Math.min(4, state.round - 1))}" title="moon staff — cards refresh each round"><i class="moon-staff-head"></i><i class="moon-staff-shaft"></i><i class="moon-staff-marker"></i></div><div class="market-group market-artifacts">${state.market.artifacts.map((id) => card(id, 'buy')).join('')}</div>`;
  boardElement.before(market);
};
render();

// Base boards have their own four left-to-right idol slots.  Leader boards use
// the separate leader action because their blue slots and special effects vary.
let baseIdolDraft: string | undefined;
const playerWithoutBaseIdols = player;
player = (id: PlayerId) => {
  const rendered = playerWithoutBaseIdols(id);
  const playerState = state.players[id];
  if (playerState.leader) return rendered;
  const nextSlot = [0, 1, 2, 3].find((slotIndex) => !playerState.idols.some((idol) => idol.inSlot && idol.slotIndex === slotIndex));
  const slots = [0, 1, 2, 3].map((slotIndex) => {
    const idol = playerState.idols.find((candidate) => candidate.inSlot && candidate.slotIndex === slotIndex);
    const point = calibratedPlayerPoint(`player-base-idol-slot-${slotIndex}`, BASE_IDOL_SLOTS[slotIndex]!);
    return `<span class="base-idol-slot ${idol ? 'filled' : ''}" style="${playerPointStyle(point)}" title="${idol ? 'used idol' : 'empty idol slot'}">${idol ? `<i style="${sprite(assets[`idol:${idol.id}:face`])}"></i>` : ''}</span>`;
  }).join('');
  const canUse = id === state.currentPlayer && playerState.idols.some((candidate) => !candidate.inSlot) && nextSlot !== undefined;
  const effects = BASE_IDOL_EFFECTS.map(({ effect, point }) => `<button class="base-idol-effect" style="${playerPointStyle(calibratedPlayerPoint(`player-base-idol-effect-${effect}`, point))}" ${canUse ? '' : 'disabled'} data-base-idol-direct="${effect}" title="use an idol: ${effect}"></button>`).join('');
  return rendered.replace('</section>', `<div class="base-idol-slots">${slots}${effects}</div></section>`);
};
const renderWithBaseIdolPicker = render;
render = () => {
  renderWithBaseIdolPicker();
  if (!baseIdolDraft || state.players[state.currentPlayer].leader) return;
  app.insertAdjacentHTML('beforeend', `<section class="idol-picker" role="dialog" aria-label="idol effect"><button data-base-idol-effect="coinToJewel" title="pay 1 coin: gain 1 jewel">●→◆</button><button data-base-idol-effect="tablets" title="gain 2 tablets">▰▰</button><button data-base-idol-effect="arrowhead" title="gain 1 arrowhead">▲</button><button data-base-idol-effect="coinCompass" title="gain 1 coin and 1 compass">●◉</button><button data-base-idol-effect="draw" title="draw a card">▣</button><button data-base-idol-cancel title="cancel">×</button></section>`);
};
app.addEventListener('click', (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button');
  if (!button || button.disabled) return;
  if (button.dataset.baseIdolDirect) {
    const idol = state.players[state.currentPlayer].idols.find((candidate) => !candidate.inSlot);
    if (idol) run({ type: 'USE_IDOL', playerId: state.currentPlayer, idolId: idol.id, effect: button.dataset.baseIdolDirect as 'coinToJewel' | 'tablets' | 'arrowhead' | 'coinCompass' | 'draw' });
    return;
  }
  if (button.dataset.baseIdolSlot !== undefined) {
    const idol = state.players[state.currentPlayer].idols.find((candidate) => !candidate.inSlot);
    if (idol) { baseIdolDraft = idol.id; render(); }
    return;
  }
  if (button.dataset.baseIdol) { baseIdolDraft = button.dataset.baseIdol; render(); return; }
  if (button.dataset.baseIdolCancel !== undefined) { baseIdolDraft = undefined; render(); return; }
  if (button.dataset.baseIdolEffect && baseIdolDraft) {
    const idolId = baseIdolDraft;
    baseIdolDraft = undefined;
    run({ type: 'USE_IDOL', playerId: state.currentPlayer, idolId, effect: button.dataset.baseIdolEffect as 'coinToJewel' | 'tablets' | 'arrowhead' | 'coinCompass' | 'draw' });
  }
});
render();

const leaderOptions=(selected:LeaderId|'')=>`<option value="" ${selected===''?'selected':''}>基础探险家</option>${(['captain','falconer','baroness','professor','explorer','mystic'] as LeaderId[]).map(id=>`<option value="${id}" ${selected===id?'selected':''}>${id}</option>`).join('')}`;
renderSetup=()=>{const players=Array.from({length:setupPlayerCount},(_,index)=>`p${index+1}`);app.innerHTML=`<main class="setup-screen"><section class="setup-card setup-card--local"><header class="setup-hero"><div class="setup-kicker">阿纳克：失落遗迹</div><h1>开始一场探索</h1><p>本地热座 · 同一设备轮流操作</p></header><nav class="play-mode-switch" aria-label="游戏模式"><button class="is-current" disabled><strong>本地热座</strong><small>无需服务</small></button><button data-room-open><strong>房间联机</strong><small>连接房间服务</small></button></nav><div class="setup-fields"><label class="setup-field"><span>玩家人数</span><select data-setup-players>${[2,3,4].map(count=>`<option value="${count}" ${setupPlayerCount===count?'selected':''}>${count} 位</option>`).join('')}</select></label><label class="setup-field"><span>主板图</span><select data-setup-main><option value="bird" ${mainBoard==='bird'?'selected':''}>普通版</option><option value="snake" ${mainBoard==='snake'?'selected':''}>进阶版</option></select></label><label class="setup-field"><span>研究板</span><select data-setup-research>${(['bird','snake','monkey','lizard'] as ResearchBoardId[]).map(id=>`<option value="${id}" ${researchBoard===id?'selected':''}>${id}</option>`).join('')}</select></label>${players.map((id,index)=>`<label class="setup-field"><span>玩家 ${index+1} 领袖</span><select data-setup-leader="${id}">${leaderOptions(setupLeaders[id])}</select></label>`).join('')}<label class="setup-field"><span>随机种子</span><input data-setup-seed value="${setupSeed}" placeholder="留空则随机" spellcheck="false"></label></div><div class="setup-primary-actions"><button class="setup-start" data-setup-start>开始本地对局</button></div></section></main>`};
app.addEventListener('change',(event)=>{const target=event.target as HTMLSelectElement;if(target.dataset.setupLeader){setupLeaders[target.dataset.setupLeader]=target.value as LeaderId;}});
render();

const playerWithoutGuardianBoons = player;
player = (id: PlayerId) => {
  const playerState = state.players[id];
  const base = playerWithoutGuardianBoons(id);
  const boons = playerState.defeatedGuardians.filter((guardianId) => !playerState.usedGuardianBoons.includes(guardianId)).map((guardianId) => `<button class="guardian-boon" ${id === state.currentPlayer ? '' : 'disabled'} data-guardian-boon="${guardianId}" title="activate guardian boon">!</button>`).join('');
  return boons ? base.replace('</section>', `<div class="guardian-boons">${boons}</div></section>`) : base;
};
app.addEventListener('click', (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button');
  if (!button?.dataset.guardianBoon || button.disabled) return;
  run({ type: 'ACTIVATE_GUARDIAN_BOON', playerId: state.currentPlayer, guardianId: button.dataset.guardianBoon });
});

// Match configuration is deliberately separate from the table.  A future room
// service can persist this small configuration object without coupling to UI state.
const renderTable = render;
function renderSetup(){
  app.innerHTML=`<main class="setup-screen"><section class="setup-card"><div class="setup-mark">◈</div><h1>阿纳克遗迹</h1><p>本地对局设置</p><label>玩家<select data-setup-players>${[2,3,4].map(count=>`<option value="${count}" ${setupPlayerCount===count?'selected':''}>${count}</option>`).join('')}</select></label><label>主板<select data-setup-main><option value="bird" ${mainBoard==='bird'?'selected':''}>普通</option><option value="snake" ${mainBoard==='snake'?'selected':''}>进阶</option></select></label><label>研究轨<select data-setup-research>${(['bird','snake','monkey','lizard'] as ResearchBoardId[]).map(id=>`<option value="${id}" ${researchBoard===id?'selected':''}>${id}</option>`).join('')}</select></label><label>种子<input data-setup-seed value="${setupSeed}" spellcheck="false"></label><button class="setup-start" data-setup-start>开始对局</button></section></main>`;
}
render=()=>{if(screen==='setup'){renderSetup();return;}renderTable();};
app.addEventListener('change',(event)=>{const target=event.target as HTMLInputElement|HTMLSelectElement;if(target.matches('[data-setup-players]'))setupPlayerCount=Number(target.value);else if(target.matches('[data-setup-main]'))mainBoard=target.value as typeof mainBoard;else if(target.matches('[data-setup-research]'))researchBoard=target.value as ResearchBoardId;else return;render();});
app.addEventListener('input',(event)=>{const target=event.target as HTMLInputElement;if(target.matches('[data-setup-seed]'))setupSeed=target.value;});
app.addEventListener('click',(event)=>{const button=(event.target as HTMLElement).closest<HTMLButtonElement>('button');if(!button)return;if(button.dataset.setupStart!==undefined){start();return;}if(button.dataset.action==='reset'){screen='setup';render();}});
render();

let pendingArchiveSwap: { archiveCardId?: string; marketCardId?: string } = {};
const pendingWithoutArchiveSwap = pending;
pending = () => {
  const queued = state.pendingRewards[0];
  if (queued?.code !== 'leader:OPTIONAL_SWAP_ARCHIVE_ARTIFACT') return pendingWithoutArchiveSwap();
  const archive = (state.players[queued.playerId].leader?.data.archive ?? []) as string[];
  const archiveButtons = archive.map((id) => `<button class="card ${pendingArchiveSwap.archiveCardId === id ? 'selected-choice' : ''}" data-archive-card="${id}" title="archive"><i style="${sprite(assets[`card:${id}:face`])}"></i></button>`).join('');
  const marketButtons = state.market.artifacts.map((id) => `<button class="card ${pendingArchiveSwap.marketCardId === id ? 'selected-choice' : ''}" data-market-artifact="${id}" title="market"><i style="${sprite(assets[`card:${id}:face`])}"></i></button>`).join('');
  const ready = pendingArchiveSwap.archiveCardId && pendingArchiveSwap.marketCardId;
  return `<section class="pending-panel archive-swap"><span>◆</span><div>${archiveButtons}</div><div>${marketButtons}</div><div><button class="pending-confirm" ${ready ? '' : 'disabled'} data-archive-confirm>✓</button>${pendingButton('×', { type: 'skip' })}</div></section>`;
};
app.addEventListener('click', (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button');
  if (!button || button.disabled) return;
  if (button.dataset.archiveCard) { pendingArchiveSwap.archiveCardId = button.dataset.archiveCard; render(); return; }
  if (button.dataset.marketArtifact) { pendingArchiveSwap.marketCardId = button.dataset.marketArtifact; render(); return; }
  if (button.dataset.archiveConfirm && pendingArchiveSwap.archiveCardId && pendingArchiveSwap.marketCardId) {
    const { archiveCardId, marketCardId } = pendingArchiveSwap;
    pendingArchiveSwap = {};
    choose({ type: 'archive-swap', archiveCardId, marketCardId });
  }
  if (button.dataset.action === 'reset') pendingArchiveSwap = {};
});
render();

type PaymentDraft = { action: 'research' | 'pending-research' | 'site' | 'discover' | 'guardian' | 'lizard-guardian'; destinationId: string; cost: Record<string, unknown>; cardIds: string[]; cardIndexes: number[]; discardCardId?: string; researchToken?: 'magnifying'|'journal'; bonusTileId?:string; costAlternativeIndex?:number; feedbackOrigin?: { x:number; y:number } };
let researchPayment: PaymentDraft | undefined;
type ResearchCostChoice = { action:'research'|'pending-research'; destinationId:string; researchToken:'magnifying'|'journal'; costs:Record<string,unknown>[]; discount:Record<string,number>; bonusTileId?:string };
let researchCostChoice: ResearchCostChoice | undefined;
const paymentCardIds = (draft: PaymentDraft) => draft.cardIndexes.map((index) => state.players[state.currentPlayer].hand[index]).filter((id): id is string => Boolean(id));

const paymentIcon = (kind: string, amount: number) => {
  const icon: Record<string, string> = { coin: '●', compass: '◌', tablet: '▤', arrowhead: '◆', jewel: '♦', usableIdol: '◉', boot: '◒', car: '▰', boat: '◓', plane: '▲' };
  return Array.from({ length: amount }, () => `<i class="payment-icon payment-${kind}" title="${kind}">${icon[kind] ?? '•'}</i>`).join('');
};
const paymentIconArtwork = (kind: string, amount: number) => {
  if (!Number.isFinite(amount) || amount <= 0) return '';
  const resource = ['coin', 'compass', 'tablet', 'arrowhead', 'jewel'].includes(kind);
  const special: Record<string, string> = { usableIdol: publicAsset('/assets/idol-back.jpg'), discardCard: publicAsset('/assets/card-back.jpg') };
  const amountBadge = amount > 1 ? `<b class="payment-amount">${amount}</b>` : '';
  return resource
    ? `<i class="payment-icon payment-${kind}" title="${kind} ×${amount}"><img src="${publicAsset(`/assets/resource-${kind}.png`)}" alt="${kind}">${amountBadge}</i>`
    : special[kind]
      ? `<i class="payment-icon payment-${kind}" title="${kind} ×${amount}"><img src="${special[kind]}" alt="${kind}">${amountBadge}</i>`
      : `<i class="payment-icon payment-travel payment-${kind}" title="${kind} ×${amount}" aria-label="${kind} ×${amount}">${amountBadge}</i>`;
};
const paymentCost = (cost: Record<string, unknown>) => {
  const resources = ['coin', 'compass', 'tablet', 'arrowhead', 'jewel', 'usableIdol', 'discardCard']
    .map((kind) => paymentIconArtwork(kind, Number(cost[kind] ?? 0))).join('');
  const travel = cost.travel && typeof cost.travel === 'object'
    ? Object.entries(cost.travel as Record<string, unknown>).map(([kind, amount]) => paymentIconArtwork(kind, Number(amount))).join('') : '';
  return `${resources}${travel}` || '<i class="payment-icon">—</i>';
};
const discountedResearchCost = (raw: Record<string, unknown>, discount: Record<string, number>) => {
  const cost = structuredClone(raw);
  for (const resource of ['coin','compass','tablet','arrowhead','jewel'] as const) if (typeof cost[resource] === 'number') cost[resource] = Math.max(0, Number(cost[resource]) - Number(discount[resource] ?? 0));
  return cost;
};
const openResearchPayment = (choice: ResearchCostChoice, costAlternativeIndex: number) => {
  const raw = choice.costs[costAlternativeIndex];
  if (!raw) throw new Error('Selected research cost is unavailable');
  researchPayment = { action:choice.action, destinationId:choice.destinationId, cost:discountedResearchCost(raw,choice.discount), cardIds:[], cardIndexes:[], researchToken:choice.researchToken, costAlternativeIndex, ...(choice.bonusTileId ? { bonusTileId:choice.bonusTileId } : {}) };
};
const renderBeforeResearchPayment = render;
const paymentTitle = (draft: PaymentDraft) => ({
  site: `放置考古学家 · ${draft.destinationId}`,
  discover: `发现遗迹 · ${draft.destinationId}`,
  research: `研究推进 · ${draft.destinationId}`,
  'pending-research': `研究推进 · ${draft.destinationId}`,
  guardian: `击败守卫 · ${draft.destinationId}`,
  'lizard-guardian': '击败蜥蜴神庙守卫',
}[draft.action]);
render = () => {
  renderBeforeResearchPayment();
  if (!researchPayment) return;
  const player = state.players[state.currentPlayer];
  const selected = new Set(researchPayment.cardIndexes);
  const cards = player.hand.map((id,index) => `<button class="card ${selected.has(index) ? 'selected-choice' : ''} ${researchPayment.discardCardId === id ? 'discard-choice' : ''}" data-payment-card-index="${index}" title="${context.cards[id]?.name ?? id}"><i style="${sprite(assets[`card:${id}:face`])}"></i></button>`).join('');
  const discard = Number(researchPayment.cost.discardCard ?? 0) ? `<div class="payment-discard"><span>↷</span>${player.hand.map((id) => `<button class="card ${researchPayment.discardCardId === id ? 'selected-choice' : ''}" data-payment-discard-card="${id}" title="discard ${context.cards[id]?.name ?? id}"><i style="${sprite(assets[`card:${id}:face`])}"></i></button>`).join('')}</div>` : '';
  if (discard) app.insertAdjacentHTML('beforeend', `<section class="payment-panel payment-discard-panel">${discard}</section>`);
  app.insertAdjacentHTML('beforeend', `<section class="payment-panel" role="dialog" aria-label="research payment"><div class="payment-cost">${paymentCost(researchPayment.cost)}</div><div class="payment-cards">${cards}</div><div class="payment-actions"><button data-payment-cancel title="cancel">×</button><button data-payment-confirm title="confirm">✓</button></div></section>`);
};
const renderWithPaymentTitle = render;
render = () => {
  renderWithPaymentTitle();
  if (researchPayment) app.querySelector<HTMLElement>('.payment-panel[role="dialog"]')?.insertAdjacentHTML('afterbegin', `<h2 class="payment-title">${paymentTitle(researchPayment)}</h2>`);
  if (researchBonusChoice) app.insertAdjacentHTML('beforeend', `<section class="research-bonus-picker" role="dialog" aria-label="choose research bonus"><strong>选择该研究格的奖励</strong><div>${researchBonusChoice.tileIds.map(tileId=>{const face=researchBonusFace(tileId);return`<button data-research-bonus-tile="${tileId}" title="${face.label}">${face.html}</button>`;}).join('')}</div><button data-research-bonus-cancel>×</button></section>`);
  if (researchCostChoice) app.insertAdjacentHTML('beforeend', `<section class="research-cost-picker" role="dialog" aria-label="choose research cost"><strong>选择一组研究费用</strong><div>${researchCostChoice.costs.map((cost,index)=>`<button data-research-cost-alternative="${index}" title="choose this printed cost">${paymentCost(discountedResearchCost(cost,researchCostChoice!.discount))}</button>`).join('')}</div><button data-research-cost-cancel title="cancel">×</button></section>`);
};

// Capture destination clicks before the legacy board handler dispatches a
// zero-card action. The reducer remains the source of truth for every payment.
app.addEventListener('click', (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button');
  if (!button) return;
  if (button.dataset.researchCostCancel !== undefined) {
    event.preventDefault(); event.stopImmediatePropagation(); researchCostChoice = undefined; render(); return;
  }
  if (button.dataset.researchCostAlternative !== undefined && researchCostChoice) {
    event.preventDefault(); event.stopImmediatePropagation();
    const choice = researchCostChoice;
    try { openResearchPayment(choice, Number(button.dataset.researchCostAlternative)); researchCostChoice = undefined; }
    catch (error) { message = error instanceof Error ? error.message : String(error); }
    render(); return;
  }
  if (button.dataset.researchBonusCancel !== undefined) {
    event.preventDefault(); event.stopImmediatePropagation(); researchBonusChoice = undefined; render(); return;
  }
  if (button.dataset.researchBonusTile && researchBonusChoice) {
    event.preventDefault(); event.stopImmediatePropagation();
    const choice = researchBonusChoice, track = context.researchTracks?.[state.research.board];
    const bridge = track?.bridges?.find((candidate) => candidate.from === state.research[`${choice.token}Node`][state.currentPlayer] && candidate.to === choice.destination);
    if (!bridge) { researchBonusChoice = undefined; message = 'Research destination is no longer available'; render(); return; }
    researchToken = choice.token; researchBonusChoice = undefined;
    if (bridge.cost) {
      const costChoice:ResearchCostChoice={action:'research',destinationId:choice.destination,researchToken:choice.token,costs:[bridge.cost as Record<string,unknown>,...(bridge.alternativeCosts??[]) as Record<string,unknown>[]],discount:{},bonusTileId:button.dataset.researchBonusTile};
      if (costChoice.costs.length > 1) { researchCostChoice = costChoice; render(); return; }
      openResearchPayment(costChoice,0);
      render(); return;
    }
    run({ type:'ADVANCE_RESEARCH', playerId:state.currentPlayer, track:choice.token, toNodeId:choice.destination, bonusTileId:button.dataset.researchBonusTile });
    return;
  }
  const requestedResearch = button.dataset.research ?? button.dataset.pendingResearch;
  if (requestedResearch) {
    if (button.dataset.researchChoice) {
      event.preventDefault(); event.stopImmediatePropagation();
      researchMoveChoice = { destination: requestedResearch, tokens: button.dataset.researchChoice.split(',') as ('magnifying'|'journal')[] };
      render();
      return;
    }
    const track = context.researchTracks?.[state.research.board];
    const pendingToken = (button.dataset.pendingResearchToken ?? button.dataset.researchToken) as 'magnifying'|'journal'|undefined;
    const eligible = (['magnifying', 'journal'] as const).filter((candidate) => track?.bridges?.some((bridge) => bridge.from === state.research[`${candidate}Node`][state.currentPlayer] && bridge.to === requestedResearch));
    const token = pendingToken ?? (eligible.includes(researchToken) ? researchToken : eligible[0]) ?? researchToken;
    researchToken = token;
    const bonusTileIds = state.research.bonusTiles[requestedResearch] ?? [];
    if (bonusTileIds.length > 1) {
      event.preventDefault(); event.stopImmediatePropagation();
      researchBonusChoice = { destination:requestedResearch, token, tileIds:bonusTileIds };
      render(); return;
    }
    const from = state.research[`${token}Node`][state.currentPlayer];
    const bridge = track?.bridges?.find((candidate) => candidate.from === from && candidate.to === requestedResearch);
    if (!bridge?.cost) {
      if (bonusTileIds[0] && !button.dataset.pendingResearch) {
        event.preventDefault(); event.stopImmediatePropagation();
        run({ type:'ADVANCE_RESEARCH', playerId:state.currentPlayer, track:token, toNodeId:requestedResearch, bonusTileId:bonusTileIds[0] });
      }
      return;
    }
    event.preventDefault(); event.stopImmediatePropagation();
    const discount = button.dataset.pendingResearchDiscount ? JSON.parse(decodeURIComponent(button.dataset.pendingResearchDiscount)) as Record<string, number> : {};
    const costChoice:ResearchCostChoice={action:button.dataset.pendingResearch?'pending-research':'research',destinationId:requestedResearch,researchToken:token,costs:[bridge.cost as Record<string,unknown>,...(bridge.alternativeCosts??[]) as Record<string,unknown>[]],discount,...(bonusTileIds[0]?{bonusTileId:bonusTileIds[0]}:{})};
    if (costChoice.costs.length > 1) { researchCostChoice=costChoice; render(); return; }
    openResearchPayment(costChoice,0);
    render();
    return;
  }
  const siteId = button.dataset.site ?? button.dataset.discover;
  const guardianSiteId = button.dataset.guardianSite;
  if (guardianSiteId) {
    const site = state.sites[guardianSiteId];
    const guardian = site?.guardian ? context.guardians?.[site.guardian] : undefined;
    if (!site?.guardian || site.occupiedBy !== state.currentPlayer || !guardian?.cost) {
      message = 'Guardian is not available to overcome'; render(); return;
    }
    event.preventDefault(); event.stopImmediatePropagation();
    researchPayment = { action: 'guardian', destinationId: guardianSiteId, cost: guardian.cost as Record<string, unknown>, cardIds: [], cardIndexes: [] };
    render(); return;
  }
  if (siteId) {
    // Camps are intentionally a single visible target.  Pick the first
    // server-eligible internal slot only to display its payment; the reducer
    // resolves it again atomically when the action is submitted.
    const site = state.sites[siteId] ?? (/^camp-[1-5]$/.test(siteId)
      ? ['a', 'b'].map((suffix) => state.sites[`${siteId}-${suffix}`]).find((candidate) => candidate && !candidate.blocked && !candidate.occupiedBy)
      : undefined);
    if (site?.guardian && site.occupiedBy === state.currentPlayer) {
      const guardian = context.guardians?.[site.guardian];
      if (!guardian?.cost) { message = 'Guardian cost has not been verified'; render(); return; }
      event.preventDefault(); event.stopImmediatePropagation();
      researchPayment = { action: 'guardian', destinationId: siteId, cost: guardian.cost as Record<string, unknown>, cardIds: [], cardIndexes: [] };
      render();
      return;
    }
    // Discovery always has its printed compass cost, even before a site tile
    // has been revealed.  Showing it here prevents the legacy zero-payment
    // click path from obscuring the real 3/6-compass requirement.
    const cost = site ? {
      ...(site.travelCost ? { travel: site.travelCost } : {}),
      ...(site.discardCardCost ? { discardCard: site.discardCardCost } : {}),
      ...(button.dataset.discover ? { compass: site.level === 1 ? 3 : 6 } : {}),
    } : {};
    if (!Object.keys(cost).length) return;
    event.preventDefault(); event.stopImmediatePropagation();
    researchPayment = { action: button.dataset.site ? 'site' : 'discover', destinationId: siteId, cost, cardIds: [], cardIndexes: [], feedbackOrigin: { x: button.getBoundingClientRect().left + button.getBoundingClientRect().width / 2, y: button.getBoundingClientRect().top + button.getBoundingClientRect().height / 2 } };
    render();
    return;
  }
  if (button.dataset.lizardGuardian !== undefined) {
    const guardian = ((state.research.templeData?.lizardGuardians as { id: string; revealed: boolean; defeated: boolean }[] | undefined) ?? []).find((entry) => entry.revealed && !entry.defeated);
    const definition = guardian ? context.guardians?.[guardian.id] : undefined;
    if (!guardian || !definition?.cost) { message = 'Lizard guardian is not available'; render(); return; }
    event.preventDefault(); event.stopImmediatePropagation();
    researchPayment = { action: 'lizard-guardian', destinationId: guardian.id, cost: definition.cost as Record<string, unknown>, cardIds: [], cardIndexes: [] };
    render();
    return;
  }
  if (!researchPayment) return;
  if (button.dataset.paymentCardIndex !== undefined) {
    event.preventDefault(); event.stopImmediatePropagation();
    const index = Number(button.dataset.paymentCardIndex);
    const id = state.players[state.currentPlayer].hand[index];
    researchPayment.cardIndexes = researchPayment.cardIndexes.includes(index) ? researchPayment.cardIndexes.filter((candidate) => candidate !== index) : [...researchPayment.cardIndexes.filter((candidate) => state.players[state.currentPlayer].hand[candidate] !== researchPayment.discardCardId), index];
    researchPayment.cardIds = paymentCardIds(researchPayment);
    render();
    const travel = researchPayment.cost.travel;
    if (travel && typeof travel === 'object' && canPayTravel(travel as Record<'boot'|'car'|'boat'|'plane',number>, researchPayment.cardIds, context)) queueMicrotask(() => app.querySelector<HTMLButtonElement>('[data-payment-confirm]')?.click());
    return;
  }
  if (button.dataset.paymentDiscardCard) {
    event.preventDefault(); event.stopImmediatePropagation();
    const id = button.dataset.paymentDiscardCard;
    researchPayment.discardCardId = researchPayment.discardCardId === id ? undefined : id;
    researchPayment.cardIndexes = researchPayment.cardIndexes.filter((index) => state.players[state.currentPlayer].hand[index] !== id);
    researchPayment.cardIds = paymentCardIds(researchPayment);
    render();
    return;
  }
  if (button.dataset.paymentCancel !== undefined) {
    event.preventDefault(); event.stopImmediatePropagation(); researchPayment = undefined; render(); return;
  }
  if (button.dataset.paymentConfirm !== undefined) {
    event.preventDefault(); event.stopImmediatePropagation();
    try {
      if (researchPayment.action === 'pending-research') {
        const draft = researchPayment;
        researchPayment = undefined;
        choose({ type: 'research-node', token: draft.researchToken ?? researchToken, nodeId: draft.destinationId, paymentCardIds: draft.cardIds, costAlternativeIndex:draft.costAlternativeIndex });
        return;
      }
      const draft = researchPayment;
      const before = state;
      const action: GameAction = draft.action === 'research'
        ? { type: 'ADVANCE_RESEARCH', playerId: state.currentPlayer, track: draft.researchToken ?? researchToken, toNodeId: draft.destinationId, paymentCardIds: draft.cardIds, discardCardId: draft.discardCardId, bonusTileId:draft.bonusTileId, costAlternativeIndex:draft.costAlternativeIndex }
        : researchPayment.action === 'guardian'
          ? { type: 'OVERCOME_GUARDIAN', playerId: state.currentPlayer, siteId: researchPayment.destinationId, paymentCardIds: researchPayment.cardIds, discardCardId: researchPayment.discardCardId }
          : researchPayment.action === 'lizard-guardian'
            ? { type: 'OVERCOME_LIZARD_TRACK_GUARDIAN', playerId: state.currentPlayer, paymentCardIds: researchPayment.cardIds, discardCardId: researchPayment.discardCardId }
            : { type: researchPayment.action === 'site' ? 'PLACE_WORKER' : 'DISCOVER_SITE', playerId: state.currentPlayer, siteId: researchPayment.destinationId, paymentCardIds: researchPayment.cardIds, discardCardId: researchPayment.discardCardId };
      state = applyEngineCommand(state, { type: 'action', action }, context);
      researchPayment = undefined; message = '';
      recordReducerEvent(action, 'accepted');
      if (!roomSession) playActionFeedback(before, state, draft.feedbackOrigin);
    } catch (error) { message = error instanceof Error ? error.message : String(error); recordReducerEvent({ type: 'PAYMENT_CONFIRM' }, 'rejected', message); }
    render();
  }
}, true);
render();

// Setup markers belong to the game state, rather than being decorative board
// overlays.  Keep all player tokens visible for a 2–4 player local game and
// expose the physical research setup pieces as compact, image-first markers.
research = () => {
  const track = context.researchTracks?.[state.research.board];
  const nodes = track?.rows.flatMap((row) => row.nodes) ?? [];
  const byId = Object.fromEntries(nodes.map((node) => [node.id, node]));
  const visualNode = (nodeId: string) => {
    const existing = byId[nodeId]; if (existing) return existing;
    // Monkey's printed magnifying route crosses r3/r4.  Its rule endpoint is
    // separate from the journal node, so it must also be a calibratable view.
    const match = nodeId.match(/:(r(\d+)):magnifying$/);
    return match && state.research.board === 'monkey' ? { id: nodeId, rowIndex: Number(match[2]), pathIndex: 0 } : undefined;
  };
  const availableMoves = (track?.bridges ?? []).flatMap((bridge) => (['magnifying', 'journal'] as const)
    .filter((token) => state.research[`${token}Node`][state.currentPlayer] === bridge.from && bridge.verified && (!bridge.allowedTokens || bridge.allowedTokens.includes(token)))
    .map((token) => ({ bridge, token })));
  const movesByDestination = new Map<string, typeof availableMoves>();
  for (const move of availableMoves) movesByDestination.set(move.bridge.to, [...(movesByDestination.get(move.bridge.to) ?? []), move]);
  const moveTargets = [...movesByDestination.entries()].map(([destination, moves]) => {
    // Most printed spaces can be reached by only one marker.  If both can
    // reach the same node, retain the visible marker toggle as an explicit
    // tie-breaker instead of inferring from their vertical screen positions.
    const sameStartingSpace = moves.length === 2 && new Set(moves.map((move) => move.bridge.from)).size === 1;
    const journalistChoice = sameStartingSpace && state.players[state.currentPlayer].rules.journalMaxLead > 0;
    const selected = journalistChoice ? moves.find((move) => move.token === researchToken) ?? moves[0]! : moves.find((move) => move.token === 'magnifying') ?? moves[0]!;
    const temple = destination === `${track?.id}:temple`;
    const node = visualNode(destination);
    const fallback = node ? (() => { const lane=researchTokenPoint(state.research.board, 'magnifying', node.rowIndex); return { x: lane.x-node.pathIndex*135, y: lane.y }; })() : undefined;
    const entry = calibratedResearchComponent(state.research.board, 'research-temple-entry', { x:795,y:150,width:100,height:90 });
    const cell = node && fallback ? calibratedResearchComponent(state.research.board, `research-cell-${node.id.replace(`${state.research.board}:`, '').replaceAll(':', '-')}`, { ...fallback,width:72,height:58 }) : undefined;
    const point = temple ? entry : cell;
    const label = journalistChoice ? 'choose marker' : selected.token;
    return point ? `<button class="research-target ${temple ? 'temple-target' : ''}" style="${researchComponentStyle(point)}" data-research="${destination}" data-research-token="${selected.token}" ${journalistChoice ? `data-research-choice="${moves.map((move) => move.token).join(',')}"` : ''} title="${temple ? 'enter Lost Temple' : `advance ${label}`}">${temple ? '◆' : selected.token === 'magnifying' ? '⌕' : '▤'}</button>` : '';
  }).join('');
  const token = (id: PlayerId, kind: 'magnifying' | 'journal', index: number) => {
    const nodeId = state.research[`${kind}Node`][id];
    if (nodeId === `${state.research.board}:start`) return '';
    const node = visualNode(nodeId);
    const fallback = node ? (() => { const lane=researchTokenPoint(state.research.board, kind, node.rowIndex); return { x:lane.x-node.pathIndex*135,y:lane.y }; })() : researchTokenPoint(state.research.board, kind, 0);
    const point = nodeId === `${state.research.board}:temple` ? calibratedResearchComponent(state.research.board, 'research-temple-entry', { x:795,y:150,width:100,height:90 })
      : node ? calibratedResearchCellPoint(state.research.board, nodeId, fallback) : fallback;
    const color = state.players[id].color.toLowerCase();
    const otherKind = kind === 'magnifying' ? 'journal' : 'magnifying';
    const samePrintedSpace = state.research[`${otherKind}Node`][id] === nodeId;
    const visualPoint = samePrintedSpace ? { x: point.x + (kind === 'magnifying' ? -23 : 23), y: point.y } : point;
    return `<i class="track-token ${color}" data-research-token="${id}-${kind}" style="${pointStyle(visualPoint, RESEARCH_BOARD_SIZE)}"><img src="${publicAsset(`/assets/tokens-${color}-${kind}.png`)}" alt="${kind}"></i>`;
  };
  const playerTokens = state.playerOrder.flatMap((id, index) => [token(id, 'magnifying', index), token(id, 'journal', index)]).join('');
  // These are setup components, not printed rewards. Render the authoritative
  // tile state with the same concrete art used by the player panels.
  const bonusTile = (tileId: string, slot: number) => {
    const kind = tileId.replace(/:\\d+$/, '').replace('base:', '');
    const label = kind === 'draw' ? 'draw card' : kind === 'exile' ? 'exile card' : kind === 'upgrade' ? 'upgrade resource' : kind;
    const face = researchBonusFace(tileId);
    return `<i class="research-bonus ${face.kind}" title="${face.label}">${face.html}</i>`;
  };
  // Each tile remains anchored to its authoritative research node.  The
  // node's track coordinates are shared with the research markers, so setup
  // pieces stay attached when the composite board scales.
  const bonusTiles = Object.entries(state.research.bonusTiles).flatMap(([nodeId, tileIds]) => {
    const node = visualNode(nodeId); if (!node) return [];
    const fallback = researchTokenPoint(state.research.board, 'magnifying', node.rowIndex);
    return tileIds.map((tileId, index) => {
      const suffix = node.id.replace(`${state.research.board}:`, '').replaceAll(':', '-');
      const component = calibratedResearchComponent(state.research.board, `research-bonus-${suffix}-${index}`, { x:fallback.x,y:fallback.y,width:120,height:120 });
      return `<span class="research-bonus-slot" style="${researchComponentStyle(component)}">${bonusTile(tileId, index)}</span>`;
    });
  }).join('');
  const monkey = state.research.templeData?.monkeyTrackArtifact as { nodeId?: string } | undefined;
  const monkeyNode = monkey?.nodeId ? byId[monkey.nodeId] : undefined;
  const artifact = '';
  const lizard = (state.research.templeData?.lizardGuardians as { nodeId: string; defeated: boolean }[] | undefined)?.find((entry) => !entry.defeated);
  const lizardNode = lizard ? byId[lizard.nodeId] : undefined;
  const guardianAsset = lizard ? assets[`guardian:${lizard.id}:face`] : undefined;
  const guardian = lizardNode ? `<button class="track-guardian" style="--guardian-x:${33 + lizardNode.pathIndex * 19}%;--guardian-y:${13 + lizardNode.rowIndex * 10}%;${sprite(guardianAsset)}" data-lizard-guardian title="Lizard track guardian"></button>` : '';
  const assistantSupply = '';
  const temple = ([
    ['bronze', 2, '2a'], ['bronze', 2, '2b'], ['bronze', 2, '2c'],
    ['silver', 6, '6a'], ['silver', 6, '6b'], ['gold', 11, '11'],
  ] as const).map(([tier, points, variant], index) => {
    const available = tier==='silver' ? (variant==='6b'?state.templeTiles.silverRight:state.templeTiles.silverLeft)>0 : state.templeTiles[tier] > 0;
    const eligible = available && canBuyTempleTile(state, state.currentPlayer, tier, track);
    const component = calibratedResearchComponent(state.research.board, `research-temple-tile-${variant}`, { x:165,y:185+index*65,width:210,height:94 });
    const remaining=tier==='silver'?(variant==='6b'?state.templeTiles.silverRight:state.templeTiles.silverLeft):state.templeTiles[tier];
    return `<button class="research-temple-tile ${tier}" style="${researchComponentStyle(component)}" ${eligible ? 'data-temple-shop' : 'disabled'} title="${eligible ? `buy ${variant.toUpperCase()} temple tile` : `${variant.toUpperCase()} temple tile unavailable`}"><img src="${publicAsset(`/assets/temple-tile-${variant}.png`)}" alt="${variant} temple tile"><b>${remaining}</b></button>`;
  }).join('');
  const templeBonuses = state.research.templeArrivals.includes(state.currentPlayer) ? state.research.templeBonusTiles.map((tileId, index) => {
    const component = calibratedResearchComponent(state.research.board, `research-temple-bonus-${index}`, { x:625+index*72,y:205,width:120,height:120 });
    return `<button class="research-temple-bonus" style="${researchComponentStyle(component)}" data-temple-bonus="${tileId}" title="claim face-down temple bonus"><img src="${publicAsset(`/assets/research-bonus-${index % 4 + 1}.png`)}" alt="face-down temple bonus"></button>`;
  }).join('') : '';
  return `<aside class="research-board"><img src="${publicAsset(`/assets/boards/${state.research.board}-board.jpg`)}" alt="research board"><div class="research-tokens">${playerTokens}${bonusTiles}${artifact}${guardian}${assistantSupply}</div>${temple}${templeBonuses}${moveTargets}</aside>`;
};
// Interaction rectangles cover a complete site card.  Archaeologists instead
// use the printed worker-circle anchor inside that rectangle.
const workerAnchor = (spot: Spot) => {
  const number = Number(spot.id.split('-').at(-1));
  if (spot.id.startsWith('camp-')) return { x: [7, 20.5, 34, 47.5, 60][number - 1], y: 96 };
  if (spot.id.startsWith('level1-')) return { x: [8, 25, 42, 59][(number - 1) % 4], y: number <= 4 ? 70 : [45, 44, 48, 48][(number - 1) % 4] };
  return { x: [8, 25, 42, 59][number - 1], y: 20 };
};
function isAssistantSupplyChoice(queued = state.pendingRewards[0]) {
  if (!queued) return false;
  const payload = (queued.payload ?? {}) as Record<string, unknown>;
  const nested = payload.effect && typeof payload.effect === 'object' ? payload.effect as Record<string, unknown> : undefined;
  const type = String(payload.type ?? queued.code);
  return ['CLAIM_ASSISTANT', 'ACTIVATE_VISIBLE_SILVER_ASSISTANT_THEN_BOTTOM', 'CLAIM_AVAILABLE_SILVER_ASSISTANT', 'ACTIVATE_AVAILABLE_ASSISTANT'].includes(type)
    || ['CLAIM_AVAILABLE_SILVER_ASSISTANT', 'ACTIVATE_AVAILABLE_ASSISTANT'].includes(String(nested?.type ?? ''));
}
function supplyBoard(){
  const selectable=isAssistantSupplyChoice()||captainSpecialistDraft===state.currentPlayer;
  const component=(id:string,fallback:{x:number;y:number;width:number;height:number})=>{const mark=calibrationMark('supply-board',id);const source=mark?{x:mark.x/100*SUPPLY_BOARD_SIZE.width,y:mark.y/100*SUPPLY_BOARD_SIZE.height,width:mark.width,height:mark.height}:fallback;return`--supply-x:${source.x/SUPPLY_BOARD_SIZE.width*100}%;--supply-y:${source.y/SUPPLY_BOARD_SIZE.height*100}%;--supply-w:${source.width/SUPPLY_BOARD_SIZE.width*100}%;--supply-h:${source.height/SUPPLY_BOARD_SIZE.height*100}%;`;};
  const assistants=state.assistants.stacks.slice(0,3).map((stack,index)=>{const assistantId=stack[0],asset=assistantId?assistantAsset(assistantId,'silver'):undefined,style=component(`supply-assistant-${index}`,SUPPLY_BOARD_COMPONENTS.assistants[index]!),tag=selectable?'button':'span',choice=selectable&&stack.length?` data-supply-assistant-stack="${index}"`:'';return`<${tag} class="supply-assistant-stack ${selectable?'selectable':''}" style="${style}" title="assistant supply ${index+1}: ${stack.length}" ${!stack.length&&selectable?'disabled':''}${choice}>${assistantId?`<i style="${sprite(asset)}"></i>`:''}<b>${stack.length}</b></${tag}>`;}).join('');
  const resources=(['coin','compass','tablet','arrowhead','jewel'] as const).map(resource=>{const style=component(`supply-resource-${resource}`,SUPPLY_BOARD_COMPONENTS.resources[resource]);return`<img class="supply-resource-pile" style="${style}" src="${publicAsset(`/assets/resource-${resource}.png`)}" alt="${resource} supply" title="${resource} supply">`;}).join('');
  const researchStarts=state.playerOrder.flatMap((id,index)=>(['magnifying','journal'] as const).flatMap(kind=>state.solo?.rivalPlayerId===id&&kind==='journal'?[]:state.research[`${kind}Node`][id]===`${state.research.board}:start`?[{id,kind,index}]:[])).map(({id,kind,index})=>{const base=SUPPLY_BOARD_COMPONENTS.researchStarts[kind],offset=index*24,style=component(`supply-research-start-${kind}`,{...base,x:base.x+offset});const color=state.players[id].color.toLowerCase();return`<i class="supply-research-start" style="${style}" title="${id} ${kind} research start"><img src="${publicAsset(`/assets/tokens-${color}-${kind}.png`)}" alt="${kind}"></i>`;}).join('');
  return`<aside class="supply-board"><img src="${publicAsset('/assets/boards/supply-board.png')}" alt="supply board"><div class="supply-assistant-stacks">${assistants}${resources}${researchStarts}</div></aside>`;
}
board = () => `<section class="map-board"><img src="${publicAsset(`/assets/boards/main-${mainBoard}.jpg`)}" alt="main board">${calibratedMainSpots().map((spot) => {
  const campSlots=spot.id.startsWith('camp-')?['a','b'].map(suffix=>state.sites[`${spot.id}-${suffix}`]).filter(Boolean):[];
  const site = state.sites[spot.id] ?? campSlots[0];
  if (!site) return '';
  const ready = Boolean(spot.rewardCode || site.tileId);
  const occupiedBy=campSlots.map(slot=>slot.occupiedBy).find(Boolean)??site.occupiedBy;
  const blocked=campSlots.length?campSlots.every(slot=>slot.blocked||slot.occupiedBy):site.blocked;
  const status = blocked ? 'blocked' : occupiedBy ? 'occupied' : site.tileId ? 'discovered' : '';
  // An idol belongs visually only to an unrevealed site.  Discovery clears
  // its assignment in the reducer; this guard also prevents a stale visual
  // marker from surviving a revealed card between animation frames.
  const idols = !site.tileId ? [site.faceUpIdolId ? `<i class="site-idol site-idol-${spot.id}" style="${sprite(assets[`idol:${site.faceUpIdolId}:face`])}" title="face-up idol"></i>` : '', ...(site.faceDownIdolIds ?? []).map(() => `<i class="site-idol site-idol-${spot.id} face-down" title="face-down idol"></i>`)].join('') : '';
  // A discovery card is centred directly on its collector mark.  It must not
  // live inside the action rectangle: that rectangle has a different size and
  // clips an oversized card, which used to shift every card up-left.
  const tile = site.tileId ? (() => { const piece=calibratedMainPieceRect(spot,'site'); return `<i class="map-site-piece level-${spot.level}" style="--site-piece-x:${piece.x}%;--site-piece-y:${piece.y}%;--site-piece-w:${piece.width}%;--site-piece-h:${piece.height}%;${sprite(assets[`site:${site.tileId}:face`])}" title="discovered site"></i>`; })() : '';
  const guardian = site.guardian ? (() => { const piece=calibratedMainPieceRect(spot,'guardian'),available=site.occupiedBy===state.currentPlayer; return `<button class="map-guardian-hotspot ${available?'available':''}" style="--guardian-x:${piece.x}%;--guardian-y:${piece.y}%;--guardian-w:${piece.width}%;--guardian-h:${piece.height}%;${sprite(assets[`guardian:${site.guardian}:face`])}" data-guardian-site="${spot.id}" ${available?'':'disabled'} title="${available?'overcome guardian':'guardian'}"></button>`; })() : '';
  const anchor = workerAnchor(spot), siteWidth = spot.width ? spot.width / 10 : 6.2, siteHeight = spot.height ? spot.height / 10.3 : 5.3;
  const workerLeft = (anchor.x - spot.left) / siteWidth * 100, workerTop = (anchor.y - spot.top) / siteHeight * 100;
  const archaeologist = occupiedBy ? `<i class="archaeologist-base ${state.players[occupiedBy].color.toLowerCase()}" style="--worker-left:${workerLeft}%;--worker-top:${workerTop}%" aria-hidden="true"></i><i class="archaeologist-token ${state.players[occupiedBy].color.toLowerCase()}" style="--worker-left:${workerLeft}%;--worker-top:${workerTop}%" title="${occupiedBy} archaeologist"></i>` : '';
  return `<button class="map-hotspot ${status}" style="--site-x:${spot.left}%;--site-y:${spot.top}%;--site-w:${siteWidth}%;--site-h:${siteHeight}%" ${blocked ? 'disabled ' : ''}${ready ? 'data-site' : 'data-discover'}="${spot.id}" title="${blocked ? 'blocked camp' : spot.rewardCode ? 'camp' : `level ${spot.level}`}">${archaeologist}${idols}</button>${tile}${guardian}`;
}).join('')}${research()}</section>${supplyBoard()}`;
render();

// Keep scoring in the engine: this overlay only renders the finished result.
const renderWithoutFinalScore = render;
render = () => {
  renderWithoutFinalScore();
  if (state.phase !== 'finished') return;
  if (state.solo) {
    const result = scoreSoloGame(state, context);
    app.insertAdjacentHTML('beforeend', `<section class="final-score" role="dialog" aria-label="solo final score"><h2>${result.humanWon ? '胜利' : '惜败'}</h2><div><div class="final-score-row ${result.humanWon ? 'winner' : ''}"><span>你</span><strong>${result.human}</strong></div><div class="final-score-row ${result.humanWon ? '' : 'winner'}"><span>对手</span><strong>${result.rival}</strong></div></div><button data-action="reset" title="new game">↻</button></section>`);
    return;
  }
  const result = scoreFinishedGame(state, context);
  const rows = result.rankedPlayerIds.map((playerId, index) => {
    const score = result.scores[playerId];
    return `<div class="final-score-row ${result.winnerIds.includes(playerId) ? 'winner' : ''}" title="research ${score.research}, temple ${score.templeTiles}, idols ${score.idols}, guardians ${score.guardians}, cards ${score.cards}"><span>${index + 1}</span><span class="player-id ${state.players[playerId].color.toLowerCase()}">${playerId === 'p1' ? '1' : '2'}</span><strong>${score.total}</strong></div>`;
  }).join('');
  app.insertAdjacentHTML('beforeend', `<section class="final-score" role="dialog" aria-label="final score"><div>${rows}</div><button data-action="reset" title="new game">↻</button></section>`);
};
render();

// Two-site card effects need an ordered source/destination selection.  Keep
// this transient selection outside GameState and submit only the typed pair.
let pendingSitePair: string[] = [];
const pendingWithoutPairs = pending;
pending = () => {
  const queued = state.pendingRewards[0];
  const payload = (queued?.payload ?? {}) as Record<string, unknown>;
  if (payload.type !== 'CARD_EFFECT' || !payload.effect || typeof payload.effect !== 'object') return pendingWithoutPairs();
  const effect = payload.effect as Record<string, unknown>;
  if (effect.type !== 'MOVE_OCCUPIED_WORKER_THEN_ACTIVATE' && effect.type !== 'MOVE_GUARDIAN_FROM_OWN_SITE_THEN_ACTIVATE') return pendingWithoutPairs();
  const selected = new Set(pendingSitePair);
  const buttons = Object.values(state.sites).map((site) => `<button class="pending-button ${selected.has(site.id) ? 'picked' : ''}" data-pair-site="${site.id}" title="site">⌾ ${site.level}</button>`).join('');
  const ready = pendingSitePair.length === 2;
  return `<section class="pending-panel"><span>⌾</span><div>${buttons}<button class="pending-confirm" ${ready ? '' : 'disabled'} data-pair-confirm>✓</button></div></section>`;
};
app.addEventListener('click', (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button');
  if (!button || button.disabled) return;
  if (button.dataset.action === 'reset') pendingSitePair = [];
  if (button.dataset.pairSite) {
    const siteId = button.dataset.pairSite;
    pendingSitePair = pendingSitePair.includes(siteId) ? pendingSitePair.filter((id) => id !== siteId) : pendingSitePair.length < 2 ? [...pendingSitePair, siteId] : [pendingSitePair[0], siteId];
    render();
    return;
  }
  if (button.dataset.pairConfirm && pendingSitePair.length === 2) {
    const [fromSiteId, toSiteId] = pendingSitePair;
    pendingSitePair = [];
    choose({ type: 'site-pair', fromSiteId, toSiteId });
  }
});
render();

// Final UI wrappers must live after all historical render reassignments above.
const finalRenderSetup = renderSetup;
renderSetup = () => {
  finalRenderSetup();
  const seed = app.querySelector<HTMLInputElement>('[data-setup-seed]');
  seed?.closest('label')?.insertAdjacentHTML('beforebegin', `<label>权杖<select data-setup-moon-staff><option value="blue" ${setupMoonStaff === 'blue' ? 'selected' : ''}>蓝色</option><option value="red" ${setupMoonStaff === 'red' ? 'selected' : ''}>红色</option></select></label>`);
  seed?.closest('label')?.insertAdjacentHTML('beforebegin', `<label class="setup-check"><input type="checkbox" data-setup-surprise-shipment ${setupSurpriseShipment ? 'checked' : ''}> 惊奇包裹（4扩）市场牌</label><small class="setup-hint">领袖的 1xxx 专属起始牌会随领袖自动加入，不会进入市场。</small>`);
  seed?.closest('label')?.insertAdjacentHTML('beforebegin', `<label class="setup-check"><input type="checkbox" data-setup-leaders-market ${setupLeadersMarket ? 'checked' : ''}> 领袖扩展市场牌</label>`);
  app.querySelector<HTMLButtonElement>('[data-setup-start]')?.insertAdjacentHTML('afterend', '<button data-research-lab>研究轨实验室</button>');
};
app.addEventListener('change', (event) => {
  const target = event.target as HTMLSelectElement;
  if (target.matches('[data-setup-moon-staff]')) setupMoonStaff = target.value === 'red' ? 'red' : 'blue';
  if (target.matches('[data-setup-surprise-shipment]')) setupSurpriseShipment = (target as HTMLInputElement).checked;
  if (target.matches('[data-setup-leaders-market]')) setupLeadersMarket = (target as HTMLInputElement).checked;
});

const finalRenderWithMoonStaffMarket = render;
render = () => {
  finalRenderWithMoonStaffMarket();
  if (screen !== 'game') return;
  const market = app.querySelector<HTMLElement>('.play-surface > .market');
  const boardElement = app.querySelector<HTMLElement>('.play-surface > .map-board');
  if (!market || !boardElement) return;
  market.classList.add('market-above-board');
  market.innerHTML = `<div class="market-group market-artifacts">${state.market.artifacts.map((id) => card(id, 'buy')).join('')}</div><div class="moon-staff ${state.moonStaff}" style="--moon-step:${Math.max(0, Math.min(4, state.round - 1))}" title="${state.moonStaff} moon staff"><img src="${publicAsset(`/assets/moon-staff-${state.moonStaff}.png`)}" alt="${state.moonStaff} moon staff"><i class="moon-staff-marker"></i></div><div class="market-group market-items">${state.market.items.map((id) => card(id, 'buy')).join('')}</div>`;
  boardElement.before(market);
};
render();

// Keep the LAN screen guard outermost: the file intentionally layers several
// rendering enhancements, and those enhancements assume a game table exists.
const finalLanScreenRender = render;
render = () => {
  if (screen === 'rooms') { renderRooms(); return; }
  if (screen === 'room') { renderRoomLobby(); return; }
  finalLanScreenRender();
  if (roomSession && screen === 'game' && roomSession.playerId !== state.currentPlayer) {
    app.querySelectorAll<HTMLButtonElement>('button[data-card-id],button[data-site],button[data-discover],button[data-research],button[data-assistant],button[data-action="end"],button[data-action="pass"]').forEach(button => { button.disabled = true; });
  }
  if (roomSession && screen === 'game' && roomSnapshot?.viewer.role === 'player') {
    const enabled = Boolean(roomSnapshot.viewer.autoPass);
    app.querySelector('.header-actions')?.insertAdjacentHTML('beforeend', `<button data-room-auto-pass="${enabled}" title="${enabled ? '取消预约跳过' : '下次轮到你时自动跳过'}">${enabled ? '⏸' : '≫'}</button>`);
  }
};
const startLocalGame = start;
start = () => {
  // Returning to hot-seat mode must not accidentally keep routing commands to
  // the most recently joined LAN room.
  if (roomSession) { roomEvents?.close(); saveRoomSession(); roomSnapshot = undefined; }
  startLocalGame();
};
render();

// Short-lived presentation layer for every accepted state transition.  It is
// intentionally derived from snapshots, so the same feedback works for local
// hot-seat actions and authoritative LAN updates without entering GameState.
const feedbackIcons: Record<string, string> = { coin: '●', compass: '◉', tablet: '▰', arrowhead: '▲', jewel: '◆', fear: '☠' };
function feedbackPoint(element?: Element | null) {
  const box = element?.getBoundingClientRect();
  return box ? { x: box.left + box.width / 2, y: box.top + box.height / 2 } : { x: innerWidth / 2, y: innerHeight / 2 };
}
function addFeedback(kind: 'resource' | 'worker' | 'card' | 'idol' | 'flash' | 'site-reveal' | 'guardian-reveal', label: string, from: { x: number; y: number }, to: { x: number; y: number }, imageUrl?: string) {
  const token = document.createElement('i');
  token.className = `action-feedback ${kind}`; token.textContent = label;
  token.style.left = `${from.x}px`; token.style.top = `${from.y}px`;
  token.style.setProperty('--feedback-x', `${to.x - from.x}px`); token.style.setProperty('--feedback-y', `${to.y - from.y}px`);
  if (imageUrl) token.style.backgroundImage = `url('${imageUrl}')`;
  document.body.append(token); token.addEventListener('animationend', () => token.remove(), { once: true });
}
function addResourceFeedback(label: string, to: { x: number; y: number }, imageUrl?: string, delay = 0) {
  const from = { x: innerWidth / 2, y: innerHeight / 2 };
  const token = document.createElement('i');
  token.className = 'action-feedback resource'; token.textContent = label;
  token.style.left = `${from.x}px`; token.style.top = `${from.y}px`;
  token.style.setProperty('--feedback-x', `${to.x - from.x}px`); token.style.setProperty('--feedback-y', `${to.y - from.y}px`);
  token.style.setProperty('--feedback-delay', `${delay}ms`);
  if (imageUrl) token.style.backgroundImage = `url('${imageUrl}')`;
  document.body.append(token); token.addEventListener('animationend', () => token.remove(), { once: true });
}
function playActionFeedback(before: GameState, after: GameState, origin?: { x:number; y:number }) {
  if (before.phase !== 'playing' || after.phase !== 'playing') return;
  requestAnimationFrame(() => {
    const boardPoint = origin ?? feedbackPoint(app.querySelector('.map-board'));
    let changed = false;
    for (const id of after.playerOrder) {
      const oldPlayer = before.players[id], nextPlayer = after.players[id]; if (!oldPlayer || !nextPlayer) continue;
      const target = feedbackPoint(app.querySelector(`.player[data-feedback-player="${id}"]`));
      for (const [resource, icon] of Object.entries(feedbackIcons)) {
        const amount = nextPlayer.resources[resource as keyof typeof nextPlayer.resources] - oldPlayer.resources[resource as keyof typeof oldPlayer.resources];
        const resourceImage = resource === 'fear' ? undefined : publicAsset(`/assets/resource-${resource}.png`);
        if (amount > 0) { changed = true; for (let index = 0; index < Math.min(amount, 3); index += 1) addResourceFeedback(resourceImage ? '' : icon, target, resourceImage, index * 120); }
      }
      if (nextPlayer.hand.length > oldPlayer.hand.length) { changed = true; addFeedback('card', '▣', boardPoint, feedbackPoint(app.querySelector('.hand'))); }
      for (const idol of nextPlayer.idols) {
        const beforeIdol = oldPlayer.idols.find((candidate) => candidate.id === idol.id);
        if (!idol.inSlot || beforeIdol?.inSlot || idol.slotIndex === undefined) continue;
        changed = true;
        const playerElement = app.querySelector(`.player[data-feedback-player="${id}"]`);
        const from = feedbackPoint(playerElement);
        const to = feedbackPoint(playerElement?.querySelector(`[data-base-idol-slot="${idol.slotIndex}"]`));
        addFeedback('idol', '', { x: from.x - 45, y: from.y + 18 }, to, assets[`idol:${idol.id}:face`]?.url);
      }
    }
    for (const [siteId, nextSite] of Object.entries(after.sites)) {
      const oldSite = before.sites[siteId];
      const destination = feedbackPoint(app.querySelector(`[data-site="${siteId}"],[data-discover="${siteId}"]`));
      if (!oldSite) continue;
      if (oldSite.occupiedBy !== nextSite.occupiedBy && nextSite.occupiedBy) {
        changed = true;
        const from = feedbackPoint(app.querySelector(`.player[data-feedback-player="${nextSite.occupiedBy}"]`));
        addFeedback('worker', '♟', from, destination);
      }
      if (!oldSite.tileId && nextSite.tileId) {
        changed = true;
        const siteAsset = assets[`site:${nextSite.tileId}:face`];
        addFeedback('site-reveal', '', destination, destination, siteAsset?.url);
      }
      if (!oldSite.guardian && nextSite.guardian) {
        changed = true;
        const guardianAsset = assets[`guardian:${nextSite.guardian}:face`];
        addFeedback('guardian-reveal', '!', destination, destination, guardianAsset?.url);
      }
    }
    if (changed) addFeedback('flash', '✦', boardPoint, boardPoint);
  });
}
const runWithFeedback = run, chooseWithFeedback = choose;
run = (action: GameAction) => {
  const before = state;
  runWithFeedback(action);
  if (!roomSession) playActionFeedback(before, state);
  const draft = researchPayment, travel = draft?.cost.travel;
  if (draft && travel && typeof travel === 'object' && canPayTravel(travel as Record<'boot'|'car'|'boat'|'plane',number>, draft.cardIds, context)) queueMicrotask(() => app.querySelector<HTMLButtonElement>('[data-payment-confirm]')?.click());
};
choose = (choice: PendingChoice) => { const before = state; chooseWithFeedback(choice); if (!roomSession) playActionFeedback(before, state); };
const renderWithFeedbackTargets = render;
render = () => {
  renderWithFeedbackTargets();
  if (screen === 'game') app.querySelectorAll<HTMLElement>('.players .player').forEach((playerElement, index) => { playerElement.dataset.feedbackPlayer = state.playerOrder[index] || ''; });
};
const playerWithGlyphResources = player;
const resourceArtwork = (resource: 'coin' | 'compass' | 'tablet' | 'arrowhead' | 'jewel', amount: number) => `<span class="resource-chip" title="${resource}"><img src="${publicAsset(`/assets/resource-${resource}.png`)}" alt="${resource}"><b>${amount}</b></span>`;
player = (id: PlayerId) => {
  const playerState = state.players[id];
  const usableIdols = playerState.idols.filter((idol) => !idol.inSlot).length;
  const resources = `<div class="player-resources">${resourceArtwork('coin', playerState.resources.coin)}${resourceArtwork('compass', playerState.resources.compass)}${resourceArtwork('tablet', playerState.resources.tablet)}${resourceArtwork('arrowhead', playerState.resources.arrowhead)}${resourceArtwork('jewel', playerState.resources.jewel)}<span class="resource-chip" title="usable idols"><img src="${publicAsset('/assets/idol-back.jpg')}" alt="idol"><b>${usableIdols}</b></span></div>`;
  return playerWithGlyphResources(id).replace(/<div class="player-resources">[\s\S]*?<\/div>/, resources);
};
const playerWithPhysicalComponents = player;
function playerIdolReserve(id: PlayerId) {
  const spare = state.players[id].idols.filter((idol) => !idol.inSlot);
  if (!spare.length) return '';
  return `<div class="player-idol-reserve" title="unplaced idols">${spare.map((_, index) => {
    const point = calibratedPlayerPoint(`player-base-idol-reserve-${index}`, { x: 640 + index * 40, y: 247 });
    return `<i style="${playerPointStyle(point)}"></i>`;
  }).join('')}</div>`;
}
function leaderComponents(id: PlayerId) {
  const playerState = state.players[id];
  const leader = playerState.leader;
  if (!leader) return '';
  if (leader.id === 'falconer') {
    const position = Number(leader.data.eaglePosition ?? 0);
    const trackIndex = Math.max(0, Math.min(4, position));
    const markId = `leader-falconer-eagle-track-${trackIndex}`;
    const namedMark = calibrationMark('leader-falconer', markId);
    // Respect the five physical-token anchors the player calibrated before
    // they receive their stable names.  There is still only one rendered
    // eagle: eaglePosition selects exactly one sorted anchor.
    const legacyMark = (readBoardCalibration()['leader-falconer'] ?? []).filter((candidate) => candidate.asset === 'falcon').sort((left, right) => left.x - right.x)[trackIndex];
    const mark = namedMark ?? legacyMark;
    const point = mark ? { x: mark.x / 100 * 1270, y: mark.y / 100 * 328 } : LEADER_LAYOUT.falconer.eagleTrack[trackIndex]!;
    const canReturn = id === state.currentPlayer && position > 0;
    const size = mark ? `;--leader-piece-w:${mark.width / 1270 * 100}%;--leader-piece-h:${mark.height / 328 * 100}%;--leader-piece-rotation:${mark.rotation ?? 0}deg` : '';
    return `<button class="falcon-track-token" style="${playerPointStyle(point, true)}${size}" ${canReturn ? `data-falcon-return="${position}"` : 'disabled'} title="${canReturn ? `return falcon from step ${position}` : `falcon step ${position}`}"><img src="${publicAsset('/assets/leader-falcon-token.png')}" alt="falcon"></button>`;
  }
  if (leader.id === 'professor') {
    const suitcase = (leader.data.suitcase ?? {}) as { compass?: number; tablet?: number };
    return `<span class="professor-suitcase-token" style="${playerPointStyle(LEADER_LAYOUT.professor.suitcase, true)}" title="Professor suitcase: ${suitcase.compass ?? 0} compass, ${suitcase.tablet ?? 0} tablets"><img src="${publicAsset('/assets/leader-professor-suitcase-alpha.png')}" alt="Professor suitcase"></span>`;
  }
  if (leader.id === 'explorer') {
    const snacks = (leader.data.snacks ?? []) as Array<{ id: 'free' | 'coin' | 'compass'; used: boolean; availableFromRound: number }>;
    return snacks.map((snack) => `<img class="explorer-snack-token ${snack.used ? 'used' : ''} ${state.round < snack.availableFromRound ? 'locked' : ''}" style="${playerPointStyle(LEADER_LAYOUT.explorer.snacks[snack.id], true)};--token-size:7.087%" src="${publicAsset(`/assets/leader-snack-${snack.id}.png`)}" alt="${snack.id} snack" title="${snack.id} snack"></img>`).join('');
  }
  return '';
}
player = (id: PlayerId) => playerWithPhysicalComponents(id).replace('</section>', `<div class="physical-components">${playerIdolReserve(id)}${leaderComponents(id)}</div></section>`);
app.addEventListener('click', (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-falcon-return]');
  if (!button || button.disabled) return;
  run({ type: 'LEADER_FALCONER_RETURN_EAGLE', playerId: state.currentPlayer, rewardPosition: Number(button.dataset.falconReturn) });
});
// Leader panels use the same un-cropped 1270×328 art viewport as the
// coordinate collector. This keeps calibrated positions and component scale
// identical between /calibrate.html and the game table.
const playerWithCalibratedLeaderBoard = player;
player = (id: PlayerId) => {
  const leader = state.players[id].leader?.id;
  const rendered = playerWithCalibratedLeaderBoard(id);
  if (!leader) return rendered;
  return rendered.replace(/(<section class="player [^"]+">)/, `$1<img class="player-board-art" src="${publicAsset(`/assets/boards/leader-${leader}.jpg`)}" alt="${leader} board">`);
};
const renderWithConcreteAssets = render;
render = () => {
  renderWithConcreteAssets();
  if (screen !== 'game') return;
  const picker = app.querySelector<HTMLElement>('.idol-picker');
  if (!picker) return;
  picker.innerHTML = `<button data-base-idol-effect="coinToJewel" title="pay 1 coin: gain 1 jewel"><img src="${publicAsset('/assets/resource-coin.png')}" alt="coin"><span>→</span><img src="${publicAsset('/assets/resource-jewel.png')}" alt="jewel"></button><button data-base-idol-effect="tablets" title="gain 2 tablets"><img src="${publicAsset('/assets/resource-tablet.png')}" alt="tablet"><img src="${publicAsset('/assets/resource-tablet.png')}" alt="tablet"></button><button data-base-idol-effect="arrowhead" title="gain 1 arrowhead"><img src="${publicAsset('/assets/resource-arrowhead.png')}" alt="arrowhead"></button><button data-base-idol-effect="coinCompass" title="gain 1 coin and 1 compass"><img src="${publicAsset('/assets/resource-coin.png')}" alt="coin"><img src="${publicAsset('/assets/resource-compass.png')}" alt="compass"></button><button data-base-idol-effect="draw" class="idol-draw" title="draw 1 card"></button><button data-base-idol-cancel title="cancel">×</button>`;
};
render();

// This wrapper is deliberately last: historical feature wrappers above also
// replace pending(), so Camp 5 must take precedence over all of them.
const pendingFinalBeforeCampFiveDiscard = pending;
pending = () => {
  const queued = state.pendingRewards[0];
  if (queued?.code !== 'site:DISCARD_AFTER_PLACEMENT') return pendingFinalBeforeCampFiveDiscard();
  const player = state.players[queued.playerId];
  const cards = player.hand.map((cardId, index) => `<button class="card" data-camp-five-discard="${index}" title="弃置：${context.cards[cardId]?.name ?? cardId}"><i style="${sprite(assets[`card:${cardId}:face`])}"></i></button>`).join('');
  return `<section class="pending-panel camp-five-discard"><span>营地 5：弃置 1 张手牌</span><div class="camp-five-discard-cards">${cards}</div></section>`;
};
app.addEventListener('click', (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-camp-five-discard]');
  if (!button || button.disabled) return;
  const queued = state.pendingRewards[0];
  const cardId = queued && state.players[queued.playerId]?.hand[Number(button.dataset.campFiveDiscard)];
  if (cardId) choose({ type: 'card', cardId });
});
render();

// Keep this last: several historical UI layers replace pending().
const pendingFinalWithCardArtworkExile = pending;
pending = () => {
  const queued = state.pendingRewards[0];
  if (!queued) return pendingFinalWithCardArtworkExile();
  const payload = (queued.payload ?? {}) as Record<string, unknown>;
  const nestedEffect = payload.effect && typeof payload.effect === 'object' ? payload.effect as Record<string, unknown> : undefined;
  const isExile = queued.code.includes('EXILE_OWN_CARD') || payload.type === 'EXILE_OWN_CARD' || payload.slot === 'EXILE_OWN_CARD' || nestedEffect?.type === 'EXILE_OWN_CARD';
  if (!isExile) return pendingFinalWithCardArtworkExile();
  const player = state.players[queued.playerId];
  const cardIds = [...player.hand, ...player.playedCards];
  const cards = cardIds.map((cardId) => `<button class="card exile-card-choice" data-pending-choice="${encodeURIComponent(JSON.stringify({ type: 'card', cardId }))}" title="放逐：${context.cards[cardId]?.name ?? cardId}"><i style="${sprite(assets[`card:${cardId}:face`])}"></i></button>`).join('');
  return `<section class="pending-panel exile-card-panel"><span>选择要放逐的牌</span><div>${cards || '<span class="pending-unsupported">没有可放逐的牌</span>'}</div></section>`;
};
render();

// Assistant cards are physical components, so keep their supplied artwork on
// the personal board instead of falling back to a chess-pawn glyph.
const playerWithAssistantArtwork = player;
player = (id) => {
  const p = state.players[id];
  const assistants = p.assistants.map((assistant, index) => {
    const point = calibratedPlayerPoint(`player-base-assistant-${index}`, { x: 648 + index * 62, y: 285 });
    return `<button class="assistant player-board-assistant ${assistant.exhausted ? 'exhausted' : ''} ${assistant.level}" style="${playerPointStyle(point)}" ${id !== state.currentPlayer || assistant.exhausted ? 'disabled' : ''} data-assistant="${assistant.id}" title="Activate ${context.assistants[assistant.id]?.name ?? assistant.id}"><i style="${sprite(assistantAsset(assistant.id,assistant.level))}"></i></button>`;
  }).join('');
  return playerWithAssistantArtwork(id).replace(/<div class="assistants">[\s\S]*?<\/div>/, `<div class="assistants">${assistants}</div>`);
};

// When an effect asks the player to choose from the public assistant supply,
// the stacks themselves are the choices. Do not duplicate them in a modal.
const pendingWithDirectAssistantSupply = pending;
pending = () => isAssistantSupplyChoice() ? '' : pendingWithDirectAssistantSupply();
const pendingWithArtworkAssistantChoices = pending;
pending = () => {
  const queued = state.pendingRewards[0];
  const payload = (queued?.payload ?? {}) as Record<string, unknown>;
  const type = String(payload.type ?? queued?.code ?? '');
  if (!queued || !['UPGRADE_ASSISTANT', 'UPGRADE_AND_REFRESH_ASSISTANT', 'REFRESH_ASSISTANT'].includes(type)) return pendingWithArtworkAssistantChoices();
  const player = state.players[queued.playerId];
  const choices = player.assistants.map((assistant) => {
    const definition = context.assistants[assistant.id];
    return `<button class="pending-button pending-assistant-choice" data-pending-choice="${encodeURIComponent(JSON.stringify({ type:'assistant', assistantId: assistant.id }))}"><i style="${sprite(assistantAsset(assistant.id, assistant.level))}"></i><span>${definition?.name ?? assistant.id}<small>${assistant.level}</small></span></button>`;
  }).join('');
  return `<section class="pending-panel"><span>Choose assistant</span><div>${choices}</div></section>`;
};
app.addEventListener('click', (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-supply-assistant-stack]');
  if (!button || button.disabled || !isAssistantSupplyChoice()) return;
  choose({ type: 'assistant-stack', stackIndex: Number(button.dataset.supplyAssistantStack) });
});
render();

// The laboratory deliberately uses the normal game renderer and reducer; it
// only changes the initial player inventory so research can be exercised in
// isolation without taking repeated setup turns.
const renderWithResearchLabControls = render;
render = () => {
  renderWithResearchLabControls();
  if (screen !== 'game') return;
  if (researchLab) app.querySelector('header')?.insertAdjacentHTML('afterend', `<section class="research-lab-controls"><strong>研究轨实验室</strong><span>资源 40 · 全旅行牌 · 可连续推进</span><button data-research-lab-restart>重开本研究板</button><button data-research-lab-exit>返回设置</button></section>`);
  if (researchMoveChoice) app.insertAdjacentHTML('beforeend', `<section class="pending-panel research-marker-choice"><span>选择推进标记</span><div>${researchMoveChoice.tokens.map((token) => `<button data-research-choice-token="${token}">${token === 'magnifying' ? '⌕ 放大镜' : '▤ 笔记本'}</button>`).join('')}</div></section>`);
};
app.addEventListener('click', (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button');
  if (!button) return;
  if (button.dataset.researchLab !== undefined) { startResearchLab(); return; }
  if (button.dataset.researchLabRestart !== undefined) { startResearchLab(); return; }
  if (button.dataset.researchLabExit !== undefined) { researchLab = false; screen = 'setup'; render(); }
  if (button.dataset.researchChoiceToken && researchMoveChoice) {
    const destination = researchMoveChoice.destination;
    researchToken = button.dataset.researchChoiceToken as 'magnifying'|'journal';
    researchMoveChoice = undefined;
    render();
    queueMicrotask(() => [...app.querySelectorAll<HTMLButtonElement>('[data-research]')].find((target) => target.dataset.research === destination)?.click());
    return;
  }
  if (button.dataset.action === 'reset' && researchLab) researchLab = false;
});

// This must remain at EOF: earlier feature layers replace renderSetup(), so
// place the LAN entry around the final setup renderer rather than an earlier one.
const finalSetupWithLanEntry = renderSetup;
renderSetup = () => {
  finalSetupWithLanEntry();
  if (screen === 'setup' && !app.querySelector('[data-solo-start]')) {
    app.querySelector<HTMLButtonElement>('[data-setup-start]')?.insertAdjacentHTML('afterend', `<label class="setup-field solo-difficulty"><span>单人难度</span><select data-solo-difficulty>${[0,1,2,3,4,5].map(level=>`<option value="${level}" ${soloDifficulty===level?'selected':''}>${level} 个红色行动牌</option>`).join('')}</select></label><button data-solo-start>开始单人对手</button>`);
  }
  if (screen === 'setup' && !app.querySelector('[data-room-open]')) {
    app.querySelector<HTMLButtonElement>('[data-setup-start]')?.insertAdjacentHTML('afterend', '<button data-room-open>局域网房间</button>');
  }
};
app.addEventListener('change', event => { const target=event.target as HTMLSelectElement; if(target.matches('[data-solo-difficulty]')) soloDifficulty=Number(target.value); });
app.addEventListener('click', event => { const button=(event.target as HTMLElement).closest<HTMLButtonElement>('button'); if(button?.dataset.soloStart!==undefined) startSolo(); });
render();
if (location.pathname.endsWith('/lab.html')) startResearchLab();
if (location.pathname.endsWith('/solo.html')) {
  const params=new URLSearchParams(location.search),requestedDifficulty=Number(params.get('difficulty') ?? soloDifficulty),requestedBoard=params.get('board'),requestedSeed=params.get('seed');
  soloDifficulty=Number.isInteger(requestedDifficulty)&&requestedDifficulty>=0&&requestedDifficulty<=5?requestedDifficulty:2;
  if(requestedBoard==='bird'||requestedBoard==='snake'){mainBoard=requestedBoard;researchBoard=requestedBoard;}
  if(requestedSeed)setupSeed=requestedSeed;
  startSolo();
}

// Solo controls deliberately stay outside the calibrated boards. They are a
// compact mobile-safe status panel, while all actual changes remain engine
// commands and therefore share replay/room validation rules.
const renderWithSoloStatus = render;
render = () => {
  renderWithSoloStatus();
  if (screen !== 'game' || !state.solo || state.phase !== 'playing') return;
  const solo = state.solo, isRivalTurn = state.currentPlayer === solo.rivalPlayerId;
  const last = solo.lastAction ? `上一步：${solo.lastAction.description}` : '对手等待揭示行动牌';
  const face=solo.lastAction?soloActionFace(solo.lastAction.tileId):'';
  app.querySelector('header')?.insertAdjacentHTML('afterend', `<section class="solo-status"><strong>单人对手 · 难度 ${solo.difficulty}</strong>${face}<span>${solo.actionDeck.length} / 10 张待行动 · ${last}</span>${isRivalTurn ? `<button data-solo-rival-action>揭示对手行动</button>` : '<span>你的回合</span>'}</section>`);
};
app.addEventListener('click', event => {
  const button=(event.target as HTMLElement).closest<HTMLButtonElement>('button');
  if(button?.dataset.soloRivalAction!==undefined && state.solo) run({type:'SOLO_RIVAL_ACTION',playerId:state.solo.rivalPlayerId});
});
render();
