import './style.css';import './theme.css';
import { cardHoverText } from './card-effect-summaries.ts';
import cards from './generated/cards.json';import assistants from './generated/assistants.json';import sites from './generated/sites.json';import idols from './generated/idols.json';import guardians from './generated/guardians.json';import assetsJson from './generated/local-assets.json';import generatedTracks from './generated/research-tracks.json';import manual from '../data/research-manual-data.json';import rewards from '../data/research-rewards-manual.json';
import {createGame} from './engine.ts';import {applyEngineCommand} from './engine-api.ts';import type {EngineContext,GameAction,GameState,LeaderId,MoonStaffVariant,PlayerId,ResearchBoardId} from './types.ts';import type {PendingChoice} from './pending-choice.ts';import {withBaseAssistantEffects} from './assistant-effect-data.ts';import {withBaseGuardianEffects} from './guardian-effect-data.ts';import {withBaseCardEffects} from './card-effect-data.ts';import {buildResearchTracks} from './research-data.ts';
import {scoreFinishedGame} from './final-scoring.ts';
import {canBuyTempleTile} from './temple-tiles.ts';
import {BASE_BOARD_SPOTS,createBaseBoardSites} from './base-board-setup.ts';
import {BASE_IDOL_SLOTS,LEADER_LAYOUT,RESEARCH_BOARD_SIZE,researchTokenPoint,pointStyle,playerPointStyle} from './board-layout.ts';
type Asset={url?:string;sheetUrl:string;sheetWidth:number;sheetHeight:number;cardIndex:number};type Spot={id:string;level:1|2;left:number;top:number;rewardCode?:string};
const tracks=buildResearchTracks(generatedTracks,manual,{rewardManual:rewards}),context:EngineContext=withBaseCardEffects(withBaseGuardianEffects(withBaseAssistantEffects({cards,assistants,sites,idols,guardians,researchTracks:tracks}))),assets=(assetsJson as {assets:Record<string,Asset>}).assets,app=document.querySelector<HTMLDivElement>('#app')!;
const spots:Spot[]=BASE_BOARD_SPOTS;
let state:GameState=createGame(['p1','p2']),screen:'setup'|'game'|'rooms'|'room'='setup',setupPlayerCount=2,setupSeed='arnak-demo',setupMoonStaff:MoonStaffVariant='blue',setupSurpriseShipment=false,setupLeadersMarket=false,setupLeaders:Record<string,LeaderId|''>={p1:'',p2:'',p3:'',p4:''},theme:'bga'|'jungle'='jungle',mainBoard:'bird'|'snake'='bird',researchBoard:ResearchBoardId='bird',researchToken:'magnifying'|'journal'='magnifying',pendingSelection:string[]=[],artifactId:string|undefined,leaderStartingCardId:string|undefined,message='';
function start(){const players=Array.from({length:setupPlayerCount},(_,i)=>`p${i+1}`);const leaders=Object.fromEntries(players.flatMap(id=>setupLeaders[id] ? [[id,setupLeaders[id]]] : []));const seed=setupSeed||'arnak-demo',marketExpansions=['Base Game',...(setupLeadersMarket?['Expedition Leaders']:[]),...(setupSurpriseShipment?['Surprise Shipment']:[])];state=createGame(players);state.sites=createBaseBoardSites(players.length,seed);state=applyEngineCommand(state,{type:'action',action:{type:'START_GAME',seed,researchBoard,moonStaff:setupMoonStaff,leaders,marketExpansions}},context);screen='game';pendingSelection=[];artifactId=undefined;leaderStartingCardId=undefined;message='';render()}
function run(action:GameAction){try{state=applyEngineCommand(state,{type:'action',action},context);message=''}catch(e){message=e instanceof Error?e.message:String(e)}render()}
function choose(choice:PendingChoice){try{const p=state.pendingRewards[0];state=applyEngineCommand(state,{type:'pending-choice',playerId:p.playerId,pendingIndex:0,choice},context);pendingSelection=[];message=''}catch(e){message=e instanceof Error?e.message:String(e)}render()}
function sprite(a?:Asset){if(!a)return'';if(a.url)return`background-image:url('${a.url}')`;const x=a.cardIndex%a.sheetWidth,y=Math.floor(a.cardIndex/a.sheetWidth);return`background-image:url('${a.sheetUrl}');background-size:${a.sheetWidth*100}% ${a.sheetHeight*100}%;background-position:${x/Math.max(1,a.sheetWidth-1)*100}% ${y/Math.max(1,a.sheetHeight-1)*100}%`}
function card(id:string,action:'play'|'buy'){const d=context.cards[id],fear=d?.type==='Fear';return`<button class="card ${fear?'fear':''}" ${fear?'disabled':''} data-card-id="${id}" data-card-action="${action}" title="${cardHoverText(id,d?.name??id)}"><i style="${sprite(assets[`card:${id}:face`])}"></i></button>`}
function board(){return`<section class="map-board"><img src="/assets/boards/main-${mainBoard}.jpg" alt="main board">${spots.map(s=>{const site=state.sites[s.id];if(!site)return'';const ready=!!(s.rewardCode||site.tileId),status=site.blocked?'blocked':site.occupiedBy?'occupied':site.tileId?'discovered':'';return`<button class="map-hotspot ${status}" style="--site-x:${s.left}%;--site-y:${s.top}%" ${site.blocked?'disabled ':''}${ready?'data-site':'data-discover'}="${s.id}" title="${site.blocked?'blocked camp':s.rewardCode?'camp':`level ${s.level}`}"></button>`}).join('')}${research()}</section>`}
function research(){const t=context.researchTracks?.[state.research.board],from=state.research[`${researchToken}Node`][state.currentPlayer];const nodes=t?.rows.flatMap(row=>row.nodes)??[];const moves=!t||!from?'':(t.bridges??[]).filter(b=>b.from===from&&b.verified&&b.to!==`${t.id}:temple`).map(b=>{const n=nodes.find(x=>x.id===b.to);return n?`<button class="research-target" style="--target-x:${33+n.pathIndex*19}%;--target-y:${13+n.rowIndex*10}%" data-research="${n.id}">⌁</button>`:''}).join('');const p1=state.players.p1,p2=state.players.p2;const token=(id:PlayerId,position:number,left:number)=>`<i class="track-token ${state.players[id].color.toLowerCase()}" style="--token-x:${left}%;--token-y:${position}%">${id==='p1'?'1':'2'}</i>`;return`<aside class="research-board"><img src="/assets/boards/${state.research.board}-board.jpg" alt="research board"><div class="research-tokens">${token('p1',13+p1.researchMagnifying*10,40)}${token('p2',15+p2.researchMagnifying*10,40)}${token('p1',13+p1.researchJournal*10,56)}${token('p2',15+p2.researchJournal*10,56)}</div>${moves}</aside>`}
function player(id:PlayerId){const p=state.players[id],current=id===state.currentPlayer,leader=p.leader?.id,as=p.assistants.map(a=>`<button class="assistant ${a.exhausted?'exhausted':''} ${a.level}" ${!current||a.exhausted?'disabled':''} data-assistant="${a.id}" title="Activate assistant">♙</button>`).join('');return`<section class="player ${p.color.toLowerCase()} ${current?'current':''} ${leader?`leader-${leader}`:''}"><div class="player-id">${id.slice(1)}</div><div class="player-resources"><span title="coin">● ${p.resources.coin}</span><span title="compass">◉ ${p.resources.compass}</span><span title="tablet">▰ ${p.resources.tablet}</span><span title="arrowhead">▲ ${p.resources.arrowhead}</span><span title="jewel">◆ ${p.resources.jewel}</span><span title="Fear">☠ ${p.resources.fear}</span></div><div class="assistants">${as}</div><div class="worker-count" title="available workers">♟ ${p.availableWorkers}/${p.workers}</div></section>`}
function pendingButton(label:string,c:PendingChoice){return`<button class="pending-button" data-pending-choice="${encodeURIComponent(JSON.stringify(c))}">${label}</button>`}
function pendingResearchButton(label:string,token:'magnifying'|'journal',nodeId:string,discount:Record<string,number>){return`<button class="pending-button" data-pending-research="${nodeId}" data-pending-research-token="${token}" data-pending-research-discount="${encodeURIComponent(JSON.stringify(discount))}">${label}</button>`}
function multi(kind:'assistants'|'sites'|'options',values:string[],count:number,labels:string[]){return`${values.map((v,i)=>`<button class="pending-button ${pendingSelection.includes(v)?'picked':''}" data-pending-select="${v}">${labels[i]??'○'}</button>`).join('')}<button class="pending-confirm" ${pendingSelection.length===count?'':'disabled'} data-pending-multi="${kind}">✓</button>`}
function effectOptions(payload:Record<string,unknown>,id:PlayerId){if(payload.type==='CARD_EFFECT'&&payload.effect&&typeof payload.effect==='object'&&String((payload.effect as Record<string,unknown>).type)==='DISCARD_ONE_THEN')return state.players[id].hand.map(cardId=>pendingButton('↷',{type:'card',cardId})).join('');return legacyEffectOptions(payload,id)}
function legacyEffectOptions(payload:Record<string,unknown>,id:PlayerId){if(payload.type!=='CARD_EFFECT'||!payload.effect||typeof payload.effect!=='object')return'';const e=payload.effect as Record<string,unknown>,p=state.players[id],ss=Object.values(state.sites),type=String(e.type);if(['DISCARD_ONE_THEN','EXILE_OWN_CARD'].includes(type))return[...p.hand,...p.playedCards].map(x=>pendingButton('▣',{type:'card',cardId:x})).join('');if(type==='RETURN_SLOTTED_IDOL')return p.idols.filter(x=>pendingButton('◉',{type:'idol',idolId:x.id})).join('');if(type==='USE_STANDARD_IDOL_SLOT_EFFECT')return[['coinToJewel','◆'],['tablets','▰'],['arrowhead','▲'],['coinCompass','●◉'],['draw','▣']].map(([effect,label])=>pendingButton(label,{type:'idol-effect',effect})).join('');if(type==='REFRESH_GUARDIAN_BOON')return p.usedGuardianBoons.map(x=>pendingButton('♞',{type:'guardian',guardianId:x})).join('');if(type==='SPEND_DEFEATED_GUARDIAN_THEN')return p.defeatedGuardians.map(x=>pendingButton('♞',{type:'guardian',guardianId:x})).join('');if(['RETURN_OCCUPIED_WORKER_THEN','ACTIVATE_OWN_OCCUPIED_SITE'].includes(type))return ss.filter(x=>x.occupiedBy===id).map(x=>pendingButton('⌾',{type:'site',siteId:x.id})).join('');if(type==='ACTIVATE_OTHER_PLAYER_OCCUPIED_SITE')return ss.filter(x=>x.occupiedBy&&x.occupiedBy!==id&&(e.level===undefined||x.level===e.level)).map(x=>pendingButton('⌾',{type:'site',siteId:x.id})).join('');if(type==='ACTIVATE_TENT_SITES'){const xs=ss.filter(x=>x.isTentSite&&(!e.requireEmpty||!x.occupiedBy));return multi('sites',xs.map(x=>x.id),Number(e.count),xs.map(_=>'⌾'))}if(type==='CHOOSE_ONE'&&Array.isArray(e.options))return e.options.map((_,i)=>pendingButton(String(i+1),{type:'card-option',optionIndex:i})).join('');if(type==='CHOOSE_DISTINCT'&&Array.isArray(e.options))return multi('options',e.options.map((_,i)=>String(i)),Number(e.count),e.options.map((_,i)=>String(i+1)));if(type==='UPGRADE_RESOURCE_PER'||type==='UPGRADE_RESOURCE_THEN')return(['tablet','arrowhead'] as const).filter(resource=>p.resources[resource]>0).map(resource=>pendingButton(resource==='tablet'?'▰':'▲',{type:'resource',resource})).join('');if(type==='REFRESH_ASSISTANTS_THEN')return multi('assistants',p.assistants.map(x=>x.id),Number(e.amount),p.assistants.map(_=>'♙'));if(type==='ACTIVATE_OWN_ASSISTANTS')return multi('assistants',p.assistants.filter(x=>(e.levels as string[]).includes(x.level)).map(x=>x.id),Array.isArray(e.levels)?e.levels.length:0,p.assistants.filter(x=>(e.levels as string[]).includes(x.level)).map(_=>'♙'));if(type==='UPGRADE_OWN_SILVER_ASSISTANT')return p.assistants.filter(x=>x.level==='silver').map(x=>pendingButton('♙',{type:'assistant-target',ownerId:id,assistantId:x.id})).join('');if(['ACTIVATE_AVAILABLE_ASSISTANT','CLAIM_AVAILABLE_SILVER_ASSISTANT'].includes(type))return state.assistants.stacks.map((_,i)=>pendingButton(`◈ ${i+1}`,{type:'assistant-stack',stackIndex:i})).join('');if(['ACQUIRE_MARKET_ITEM','USE_MARKET_ITEM_EFFECT'].includes(type))return state.market.items.map(x=>pendingButton('◈',{type:'card',cardId:x})).join('');if(type==='BUY_WITH_DISCOUNT')return[...state.market.items,...state.market.artifacts].map(x=>pendingButton('◈',{type:'card',cardId:x})).join('');return''}
function pending(){const p=state.pendingRewards[0];if(!p)return'';const payload=(p.payload??{}) as Record<string,unknown>,type=String(payload.type??p.code),player=state.players[p.playerId],ss=Object.values(state.sites);let o=effectOptions(payload,p.playerId);if(!o&&(type==='CLAIM_ASSISTANT'||type==='ACTIVATE_VISIBLE_SILVER_ASSISTANT_THEN_BOTTOM'))o=state.assistants.stacks.map((_,i)=>pendingButton(`◈ ${i+1}`,{type:'assistant-stack',stackIndex:i})).join('');else if(!o&&['UPGRADE_ASSISTANT','UPGRADE_AND_REFRESH_ASSISTANT','REFRESH_ASSISTANT'].includes(type))o=player.assistants.map(x=>pendingButton('♙',{type:'assistant',assistantId:x.id})).join('');else if(!o&&type==='REFRESH_ASSISTANTS'&&typeof payload.amount==='number')o=multi('assistants',player.assistants.map(x=>x.id),payload.amount,player.assistants.map(_=>'♙'));else if(!o&&type==='CHOOSE'&&Array.isArray(payload.options)&&payload.count===1)o=payload.options.map((_,i)=>pendingButton(String(i+1),{type:'research-option',optionIndex:i})).join('');else if(!o&&['ACQUIRE_ARTIFACT_FREE','BUY_ARTIFACT_WITH_DISCOUNT'].includes(type))o=state.market.artifacts.map(x=>pendingButton('◆',{type:'artifact',artifactId:x})).join('');else if(!o&&(type==='ACTIVATE_DISCOVERED_LEVEL1_SITE'||type==='BURN_UNOCCUPIED_LEVEL1_SITE_REFILL_IDOL'||p.code.includes('GUARDIAN')))o=ss.map(x=>pendingButton('⌾',{type:'site',siteId:x.id})).join('');if(!o)o='<span class="pending-unsupported">…</span>';return`<section class="pending-panel"><span>⌁</span><div>${o}</div></section>`}
function artifact(){if(!artifactId)return'';const p=state.players[state.currentPlayer];if(!p.hand.includes(artifactId))return'';return`<section class="pending-panel artifact-panel"><span>◆</span><div>${p.hand.filter(x=>x!==artifactId).map(x=>`<button class="card" data-artifact-payment="${x}"><i style="${sprite(assets[`card:${x}:face`])}"></i></button>`).join('')}<button class="pending-button" data-artifact-cancel>×</button></div></section>`}
function render(){document.documentElement.dataset.theme=theme;const active=state.players[state.currentPlayer];app.innerHTML=`<main><header><div class="round">${state.round}</div><div class="turn-dot ${active.color.toLowerCase()}"></div><div class="header-actions"><select data-theme><option value="bga" ${theme==='bga'?'selected':''}>BGA</option><option value="jungle" ${theme==='jungle'?'selected':''}>Jungle</option></select><select data-main-board><option value="bird" ${mainBoard==='bird'?'selected':''}>普通</option><option value="snake" ${mainBoard==='snake'?'selected':''}>进阶</option></select><select data-board>${(['bird','snake','monkey','lizard'] as ResearchBoardId[]).map(x=>`<option value="${x}" ${researchBoard===x?'selected':''}>${x}</option>`).join('')}</select><button data-token="magnifying">⌕</button><button data-token="journal">▤</button><button data-action="end">✓</button><button data-action="pass">≫</button><button data-action="reset">↻</button></div></header><section class="play-surface">${board()}<aside class="market"><div class="market-row">${state.market.items.map(x=>card(x,'buy')).join('')}</div><div class="market-row">${state.market.artifacts.map(x=>card(x,'buy')).join('')}</div></aside></section><section class="players">${state.playerOrder.map(player).join('')}</section><section class="hand">${active.hand.map(x=>card(x,'play')).join('')}</section>${artifact()}${pending()}${message?`<div class="message">${message}</div>`:''}</main>`}
app.addEventListener('change',e=>{const t=e.target as HTMLSelectElement;if(t.matches('[data-theme]')){theme=t.value==='jungle'?'jungle':'bga';render()}else if(t.matches('[data-main-board]')){mainBoard=t.value as typeof mainBoard;render()}else if(t.matches('[data-board]')){researchBoard=t.value as ResearchBoardId;start()}});
app.addEventListener('click',e=>{const b=(e.target as HTMLElement).closest<HTMLButtonElement>('button');if(!b||b.disabled)return;const pid=state.currentPlayer,id=b.dataset.cardId;if(b.dataset.artifactCancel!==undefined){artifactId=undefined;render();return}if(b.dataset.artifactPayment&&artifactId){try{state=applyEngineCommand(state,{type:'action',action:{type:'PLAY_CARD',playerId:pid,cardId:artifactId,activationPaymentCardId:b.dataset.artifactPayment}},context);artifactId=undefined;message=''}catch(x){message=x instanceof Error?x.message:String(x)}render();return}if(b.dataset.pendingSelect){const x=b.dataset.pendingSelect;pendingSelection=pendingSelection.includes(x)?pendingSelection.filter(y=>y!==x):[...pendingSelection,x];render();return}if(b.dataset.pendingMulti){if(b.dataset.pendingMulti==='assistants')choose({type:'assistants',assistantIds:pendingSelection});else if(b.dataset.pendingMulti==='sites')choose({type:'site-ids',siteIds:pendingSelection});else choose({type:'card-options',optionIndexes:pendingSelection.map(Number)});return}if(b.dataset.pendingChoice){choose(JSON.parse(decodeURIComponent(b.dataset.pendingChoice)) as PendingChoice);return}if(b.dataset.assistant){run({type:'ACTIVATE_ASSISTANT',playerId:pid,assistantId:b.dataset.assistant});return}if(id){if(b.dataset.cardAction==='play'&&context.cards[id]?.expansion==='Expedition Leaders'){leaderStartingCardId=id;render();return}if(b.dataset.cardAction==='play'&&context.cards[id]?.type==='Artifact'){artifactId=id;render();return}run(b.dataset.cardAction==='buy'?{type:'BUY_CARD',playerId:pid,cardId:id}:{type:'PLAY_CARD',playerId:pid,cardId:id});return}if(b.dataset.site)run({type:'PLACE_WORKER',playerId:pid,siteId:b.dataset.site});else if(b.dataset.discover)run({type:'DISCOVER_SITE',playerId:pid,siteId:b.dataset.discover});else if(b.dataset.research)run({type:'ADVANCE_RESEARCH',playerId:pid,track:researchToken,toNodeId:b.dataset.research});else if(b.dataset.token){researchToken=b.dataset.token as typeof researchToken;render()}else if(b.dataset.action==='end')run({type:'END_TURN',playerId:pid});else if(b.dataset.action==='pass')run({type:'PASS',playerId:pid});else if(b.dataset.action==='reset')start()});

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
  if (queued.code === 'leader:OPTIONAL_EXILE_FAR_LEFT_ITEM') return panel(`${state.market.items[0] ? pendingButton('◈', { type: 'card', cardId: state.market.items[0] }) : ''}${pendingButton('×', { type: 'skip' })}`);
  if (queued.code === 'leader:ACTIVATE_DISCOVERED_SITE' || queued.code === 'leader:ACTIVATE_FACEUP_UNDISCOVERED_IDOL') return panel(Object.values(state.sites).map((site) => pendingButton(`⌾ ${site.level}`, { type: 'site', siteId: site.id })).join(''));
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
  if (effect.type === 'BUY_ITEM_DISCOUNT_INCLUDE_TOP') {
    const candidates = [...state.market.items, ...(state.market.itemDeck[0] ? [state.market.itemDeck[0]] : [])];
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
    if (name === 'Transmission') return [basic('coin', '●'), ...(placed >= 2 ? [basic('compass', '◉')] : []), ...(placed >= 3 ? [basic('tablets', '▰▰')] : [])];
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
    if (name === 'Preservation') return [basic('compass', '◉'), basic('refreshAssistant', '♙')];
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
    const fields = (['coin', 'compass', 'tablet', 'arrowhead', 'jewel'] as const).filter((resource) => allowed.includes(resource)).map((resource) => `<label title="${resource}"><img src="/assets/resource-${resource}.png" alt="${resource}"><input data-flex-resource="${resource}" type="number" min="0" max="${amount}" value="0"></label>`).join('');
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
type RoomSummaryUi = { id: string; name: string; seats: number; occupiedSeats: number; status: 'lobby' | 'playing' | 'finished'; hostPlayerId: PlayerId };
type RoomSnapshotUi = { room: RoomSummaryUi; viewer: { playerId?: PlayerId; role: 'player' | 'spectator' }; state?: GameState };
const roomSessionKey = 'arnak.room-session.v1', roomAddressKey = 'arnak.room-address.v1';
let roomAddress = localStorage.getItem(roomAddressKey) || `${location.protocol}//${location.hostname || '127.0.0.1'}:8787`;
let roomSession: (RoomTicketUi & { baseUrl: string }) | undefined;
try { roomSession = JSON.parse(localStorage.getItem(roomSessionKey) || '') as RoomTicketUi & { baseUrl: string }; } catch { localStorage.removeItem(roomSessionKey); }
let roomList: RoomSummaryUi[] = [], roomSnapshot: RoomSnapshotUi | undefined, roomEvents: EventSource | undefined;

function roomUrl(path: string) { return `${roomAddress.replace(/\/$/, '')}${path}`; }
async function roomRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(roomUrl(path), { ...init, headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) } });
  const value = await response.json() as { ok: boolean; error?: string } & T;
  if (!response.ok || !value.ok) throw new Error(value.error || `Room service returned ${response.status}`);
  return value;
}
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
    const ticket = (await roomRequest<{ ticket: RoomTicketUi }>('/rooms', { method: 'POST', body: JSON.stringify({ name: 'Arnak LAN', seats: setupPlayerCount, hostName: 'Host' }) })).ticket;
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
function renderRooms() {
  app.innerHTML = `<main class="setup-screen"><section class="setup-card room-lobby"><div class="setup-mark">⌂</div><h1>局域网房间</h1><label>服务地址<input data-room-address value="${roomAddress}" spellcheck="false"></label><div class="room-actions"><button data-room-refresh>刷新</button><button class="setup-start" data-room-create>创建 ${setupPlayerCount} 人房间</button></div><div class="room-list">${roomList.map(room => `<article><strong>${room.name}</strong><span>${room.occupiedSeats}/${room.seats}</span><small>${room.status}</small>${room.status === 'lobby' && room.occupiedSeats < room.seats ? `<button data-room-join="${room.id}">加入</button>` : ''}${room.status === 'lobby' ? `<button data-room-watch="${room.id}">旁观</button>` : ''}</article>`).join('') || '<p>没有可加入的房间</p>'}</div><button data-room-local>本地热座对局</button>${message ? `<div class="message">${message}</div>` : ''}</section></main>`;
}
function renderRoomLobby() {
  const room = roomSnapshot?.room;
  app.innerHTML = `<main class="setup-screen"><section class="setup-card room-lobby"><div class="setup-mark">⌂</div><h1>${room?.name || '正在连接房间'}</h1><p>${room ? `${room.occupiedSeats}/${room.seats} · ${room.status}` : ''}</p>${roomSession?.playerId === room?.hostPlayerId && room?.status === 'lobby' ? `<button class="setup-start" data-room-start>以当前设置开局</button>` : '<p>等待房主开局…</p>'}<button data-room-leave>离开房间</button>${message ? `<div class="message">${message}</div>` : ''}</section></main>`;
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
app.addEventListener('input', event => { const target = event.target as HTMLInputElement; if (target.matches('[data-room-address]')) roomAddress = target.value; });
app.addEventListener('click', event => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button'); if (!button) return;
  if (button.dataset.roomRefresh !== undefined) { void refreshRooms(); return; }
  if (button.dataset.roomCreate !== undefined) { void createLanRoom(); return; }
  if (button.dataset.roomJoin) { void joinLanRoom(button.dataset.roomJoin); return; }
  if (button.dataset.roomWatch) { void joinLanRoom(button.dataset.roomWatch, true); return; }
  if (button.dataset.roomStart !== undefined) { void startLanRoom(); return; }
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
  const tile = (tier: 'bronze' | 'silver' | 'gold', combination: 0 | 1 | 2 | undefined, points: number, title: string) => `<button class="temple-tile ${tier}" ${supply[tier] ? '' : 'disabled'} data-temple-tier="${tier}" ${combination === undefined ? '' : `data-temple-combination="${combination}"`} title="${title}">${points}<small>${supply[tier]}</small></button>`;
  const bonusTiles = state.research.templeArrivals.includes(state.currentPlayer) ? state.research.templeBonusTiles.map((tileId, index) => `<button class="temple-secret" data-temple-bonus="${tileId}" title="face-down temple bonus">?</button>`).join('') : '';
  app.insertAdjacentHTML('beforeend', `<section class="temple-shop" role="dialog" aria-label="temple tiles"><div>${tile('bronze', 0, 2, 'coin + 2 tablets')}${tile('bronze', 1, 2, 'jewel')}${tile('bronze', 2, 2, 'compass + arrowhead')}</div><div>${tile('silver', 0, 6, 'coin + 2 tablets + jewel')}${tile('silver', 1, 6, 'jewel + compass + arrowhead')}</div><div>${tile('gold', undefined, 11, 'coin + 2 tablets + jewel + compass + arrowhead')}</div>${bonusTiles ? `<div class="temple-secrets">${bonusTiles}</div>` : ''}<button data-temple-close title="close">×</button></section>`);
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
    const enabled = id === state.currentPlayer && slotIndex === nextSlot && playerState.idols.some((candidate) => !candidate.inSlot);
    return `<button class="base-idol-slot ${idol ? 'filled' : ''}" style="${playerPointStyle(BASE_IDOL_SLOTS[slotIndex]!)}" ${enabled ? '' : 'disabled'} data-base-idol-slot="${slotIndex}" title="${idol ? 'used idol' : 'use idol'}">${idol ? `<i style="${sprite(assets[`idol:${idol.id}:face`])}"></i>` : ''}</button>`;
  }).join('');
  return rendered.replace('</section>', `<div class="base-idol-slots">${slots}</div></section>`);
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

const leaderOptions=(selected:LeaderId|'')=>`<option value="" ${selected===''?'selected':''}>基础</option>${(['captain','falconer','baroness','professor','explorer','mystic'] as LeaderId[]).map(id=>`<option value="${id}" ${selected===id?'selected':''}>${id}</option>`).join('')}`;
renderSetup=()=>{const players=Array.from({length:setupPlayerCount},(_,index)=>`p${index+1}`);app.innerHTML=`<main class="setup-screen"><section class="setup-card"><div class="setup-mark">◈</div><h1>阿纳克遗迹</h1><p>本地对局设置</p><label>玩家<select data-setup-players>${[2,3,4].map(count=>`<option value="${count}" ${setupPlayerCount===count?'selected':''}>${count}</option>`).join('')}</select></label><label>主板<select data-setup-main><option value="bird" ${mainBoard==='bird'?'selected':''}>普通</option><option value="snake" ${mainBoard==='snake'?'selected':''}>进阶</option></select></label><label>研究轨<select data-setup-research>${(['bird','snake','monkey','lizard'] as ResearchBoardId[]).map(id=>`<option value="${id}" ${researchBoard===id?'selected':''}>${id}</option>`).join('')}</select></label>${players.map((id,index)=>`<label>玩家 ${index+1}<select data-setup-leader="${id}">${leaderOptions(setupLeaders[id])}</select></label>`).join('')}<label>种子<input data-setup-seed value="${setupSeed}" spellcheck="false"></label><button class="setup-start" data-setup-start>开始对局</button></section></main>`};
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

type PaymentDraft = { action: 'research' | 'pending-research' | 'site' | 'discover' | 'guardian' | 'lizard-guardian'; destinationId: string; cost: Record<string, unknown>; cardIds: string[]; discardCardId?: string; researchToken?: 'magnifying'|'journal' };
let researchPayment: PaymentDraft | undefined;

const paymentIcon = (kind: string, amount: number) => {
  const icon: Record<string, string> = { coin: '●', compass: '◌', tablet: '▤', arrowhead: '◆', jewel: '♦', usableIdol: '◉', boot: '◒', car: '▰', boat: '◓', plane: '▲' };
  return Array.from({ length: amount }, () => `<i class="payment-icon payment-${kind}" title="${kind}">${icon[kind] ?? '•'}</i>`).join('');
};
const paymentCost = (cost: Record<string, unknown>) => {
  const resources = ['coin', 'compass', 'tablet', 'arrowhead', 'jewel', 'usableIdol', 'discardCard']
    .map((kind) => paymentIcon(kind, Number(cost[kind] ?? 0))).join('');
  const travel = cost.travel && typeof cost.travel === 'object'
    ? Object.entries(cost.travel as Record<string, unknown>).map(([kind, amount]) => paymentIcon(kind, Number(amount))).join('') : '';
  return `${resources}${travel}` || '<i class="payment-icon">—</i>';
};
const renderBeforeResearchPayment = render;
render = () => {
  renderBeforeResearchPayment();
  if (!researchPayment) return;
  const player = state.players[state.currentPlayer];
  const selected = new Set(researchPayment.cardIds);
  const cards = player.hand.map((id) => `<button class="card ${selected.has(id) ? 'selected-choice' : ''} ${researchPayment.discardCardId === id ? 'discard-choice' : ''}" data-payment-card="${id}" title="${context.cards[id]?.name ?? id}"><i style="${sprite(assets[`card:${id}:face`])}"></i></button>`).join('');
  const discard = Number(researchPayment.cost.discardCard ?? 0) ? `<div class="payment-discard"><span>↷</span>${player.hand.map((id) => `<button class="card ${researchPayment.discardCardId === id ? 'selected-choice' : ''}" data-payment-discard-card="${id}" title="discard ${context.cards[id]?.name ?? id}"><i style="${sprite(assets[`card:${id}:face`])}"></i></button>`).join('')}</div>` : '';
  if (discard) app.insertAdjacentHTML('beforeend', `<section class="payment-panel payment-discard-panel">${discard}</section>`);
  app.insertAdjacentHTML('beforeend', `<section class="payment-panel" role="dialog" aria-label="research payment"><div class="payment-cost">${paymentCost(researchPayment.cost)}</div><div class="payment-cards">${cards}</div><div class="payment-actions"><button data-payment-cancel title="cancel">×</button><button data-payment-confirm title="confirm">✓</button></div></section>`);
};

// Capture destination clicks before the legacy board handler dispatches a
// zero-card action. The reducer remains the source of truth for every payment.
app.addEventListener('click', (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button');
  if (!button) return;
  const requestedResearch = button.dataset.research ?? button.dataset.pendingResearch;
  if (requestedResearch) {
    const track = context.researchTracks?.[state.research.board];
    const pendingToken = button.dataset.pendingResearchToken as 'magnifying'|'journal'|undefined;
    const token = pendingToken ?? researchToken;
    const from = state.research[`${token}Node`][state.currentPlayer];
    const bridge = track?.bridges?.find((candidate) => candidate.from === from && candidate.to === requestedResearch);
    if (!bridge?.cost) return;
    event.preventDefault(); event.stopImmediatePropagation();
    const discount = button.dataset.pendingResearchDiscount ? JSON.parse(decodeURIComponent(button.dataset.pendingResearchDiscount)) as Record<string, number> : {};
    const cost = structuredClone(bridge.cost as Record<string, unknown>);
    for (const resource of ['coin','compass','tablet','arrowhead','jewel'] as const) if (typeof cost[resource] === 'number') cost[resource] = Math.max(0, Number(cost[resource]) - Number(discount[resource] ?? 0));
    researchPayment = { action: button.dataset.pendingResearch ? 'pending-research' : 'research', destinationId: requestedResearch, cost, cardIds: [], ...(pendingToken ? { researchToken: pendingToken } : {}) };
    render();
    return;
  }
  const siteId = button.dataset.site ?? button.dataset.discover;
  if (siteId) {
    const site = state.sites[siteId];
    if (site?.guardian && site.occupiedBy === state.currentPlayer) {
      const guardian = context.guardians?.[site.guardian];
      if (!guardian?.cost) { message = 'Guardian cost has not been verified'; render(); return; }
      event.preventDefault(); event.stopImmediatePropagation();
      researchPayment = { action: 'guardian', destinationId: siteId, cost: guardian.cost as Record<string, unknown>, cardIds: [] };
      render();
      return;
    }
    const cost = site ? { ...(site.travelCost ? { travel: site.travelCost } : {}), ...(site.discardCardCost ? { discardCard: site.discardCardCost } : {}) } : {};
    if (!Object.keys(cost).length) return;
    event.preventDefault(); event.stopImmediatePropagation();
    researchPayment = { action: button.dataset.site ? 'site' : 'discover', destinationId: siteId, cost, cardIds: [] };
    render();
    return;
  }
  if (button.dataset.lizardGuardian !== undefined) {
    const guardian = ((state.research.templeData?.lizardGuardians as { id: string; revealed: boolean; defeated: boolean }[] | undefined) ?? []).find((entry) => entry.revealed && !entry.defeated);
    const definition = guardian ? context.guardians?.[guardian.id] : undefined;
    if (!guardian || !definition?.cost) { message = 'Lizard guardian is not available'; render(); return; }
    event.preventDefault(); event.stopImmediatePropagation();
    researchPayment = { action: 'lizard-guardian', destinationId: guardian.id, cost: definition.cost as Record<string, unknown>, cardIds: [] };
    render();
    return;
  }
  if (!researchPayment) return;
  if (button.dataset.paymentCard) {
    event.preventDefault(); event.stopImmediatePropagation();
    const id = button.dataset.paymentCard;
    researchPayment.cardIds = researchPayment.cardIds.includes(id) ? researchPayment.cardIds.filter((cardId) => cardId !== id) : [...researchPayment.cardIds.filter((cardId) => cardId !== researchPayment.discardCardId), id];
    render();
    return;
  }
  if (button.dataset.paymentDiscardCard) {
    event.preventDefault(); event.stopImmediatePropagation();
    const id = button.dataset.paymentDiscardCard;
    researchPayment.discardCardId = researchPayment.discardCardId === id ? undefined : id;
    researchPayment.cardIds = researchPayment.cardIds.filter((cardId) => cardId !== id);
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
        choose({ type: 'research-node', token: draft.researchToken ?? researchToken, nodeId: draft.destinationId, paymentCardIds: draft.cardIds });
        return;
      }
      const action: GameAction = researchPayment.action === 'research'
        ? { type: 'ADVANCE_RESEARCH', playerId: state.currentPlayer, track: researchToken, toNodeId: researchPayment.destinationId, paymentCardIds: researchPayment.cardIds, discardCardId: researchPayment.discardCardId }
        : researchPayment.action === 'guardian'
          ? { type: 'OVERCOME_GUARDIAN', playerId: state.currentPlayer, siteId: researchPayment.destinationId, paymentCardIds: researchPayment.cardIds, discardCardId: researchPayment.discardCardId }
          : researchPayment.action === 'lizard-guardian'
            ? { type: 'OVERCOME_LIZARD_TRACK_GUARDIAN', playerId: state.currentPlayer, paymentCardIds: researchPayment.cardIds, discardCardId: researchPayment.discardCardId }
            : { type: researchPayment.action === 'site' ? 'PLACE_WORKER' : 'DISCOVER_SITE', playerId: state.currentPlayer, siteId: researchPayment.destinationId, paymentCardIds: researchPayment.cardIds, discardCardId: researchPayment.discardCardId };
      state = applyEngineCommand(state, { type: 'action', action }, context);
      researchPayment = undefined; message = '';
    } catch (error) { message = error instanceof Error ? error.message : String(error); }
    render();
  }
}, true);
render();

// Setup markers belong to the game state, rather than being decorative board
// overlays.  Keep all player tokens visible for a 2–4 player local game and
// expose the physical research setup pieces as compact, image-first markers.
research = () => {
  const track = context.researchTracks?.[state.research.board];
  const from = state.research[`${researchToken}Node`][state.currentPlayer];
  const nodes = track?.rows.flatMap((row) => row.nodes) ?? [];
  const byId = Object.fromEntries(nodes.map((node) => [node.id, node]));
  const moveTargets = !track || !from ? '' : (track.bridges ?? [])
    .filter((bridge) => bridge.from === from && bridge.verified && bridge.to !== `${track.id}:temple`)
    .map((bridge) => {
      const node = byId[bridge.to];
      return node ? `<button class="research-target" style="--target-x:${33 + node.pathIndex * 19}%;--target-y:${13 + node.rowIndex * 10}%" data-research="${node.id}" title="research move">◌</button>` : '';
    }).join('');
  const token = (id: PlayerId, kind: 'magnifying' | 'journal', index: number) => {
    const position = state.players[id][kind === 'magnifying' ? 'researchMagnifying' : 'researchJournal'];
    const point = researchTokenPoint(state.research.board, kind, position);
    const color = state.players[id].color.toLowerCase();
    return `<i class="track-token ${color}" data-research-token="${id}-${kind}" style="${pointStyle({ x: point.x + (index % 2) * 25, y: point.y + Math.floor(index / 2) * 22 }, RESEARCH_BOARD_SIZE)}"><img src="/assets/tokens-${color}-${kind}.png" alt="${kind}"></i>`;
  };
  const playerTokens = state.playerOrder.flatMap((id, index) => [token(id, 'magnifying', index), token(id, 'journal', index)]).join('');
  // These are setup components, not printed rewards. Render the authoritative
  // tile state with the same concrete art used by the player panels.
  const bonusTile = (tileId: string) => {
    const kind = tileId.replace(/:\\d+$/, '').replace('base:', '');
    const art = kind === 'draw' || kind === 'exile' ? '/assets/card-back.jpg'
      : kind === 'upgrade' ? '/assets/resource-jewel.png'
      : `/assets/resource-${kind}.png`;
    const label = kind === 'draw' ? 'draw card' : kind === 'exile' ? 'exile card' : kind === 'upgrade' ? 'upgrade resource' : kind;
    return `<i class="research-bonus ${kind}" title="${label}"><img src="${art}" alt="${label}"></i>`;
  };
  // The four research boards use different physical bonus-slot layouts. Do
  // not place generic tiles until each board's coordinate sheet is recorded.
  const bonusTiles = '';
  const monkey = state.research.templeData?.monkeyTrackArtifact as { nodeId?: string } | undefined;
  const monkeyNode = monkey?.nodeId ? byId[monkey.nodeId] : undefined;
  const artifact = '';
  const lizard = (state.research.templeData?.lizardGuardians as { nodeId: string; defeated: boolean }[] | undefined)?.find((entry) => !entry.defeated);
  const lizardNode = lizard ? byId[lizard.nodeId] : undefined;
  const guardianAsset = lizard ? assets[`guardian:${lizard.id}:face`] : undefined;
  const guardian = lizardNode ? `<button class="track-guardian" style="--guardian-x:${33 + lizardNode.pathIndex * 19}%;--guardian-y:${13 + lizardNode.rowIndex * 10}%;${sprite(guardianAsset)}" data-lizard-guardian title="Lizard track guardian"></button>` : '';
  const canBuyTile = ['bronze', 'silver', 'gold'].some((tier) => canBuyTempleTile(state, state.currentPlayer, tier as 'bronze' | 'silver' | 'gold', track));
  const temple = canBuyTile ? `<button class="temple-bonus" data-temple-shop title="buy temple tile"></button>` : '';
  return `<aside class="research-board"><img src="/assets/boards/${state.research.board}-board.jpg" alt="research board"><div class="research-tokens">${playerTokens}${bonusTiles}${temple}${artifact}${guardian}</div>${moveTargets}</aside>`;
};
board = () => `<section class="map-board"><img src="/assets/boards/main-${mainBoard}.jpg" alt="main board">${spots.map((spot) => {
  const site = state.sites[spot.id];
  if (!site) return '';
  const ready = Boolean(spot.rewardCode || site.tileId);
  const status = site.blocked ? 'blocked' : site.occupiedBy ? 'occupied' : site.tileId ? 'discovered' : '';
  const idols = '';
  const guardian = '';
  const archaeologist = site.occupiedBy ? `<i class="archaeologist-base ${state.players[site.occupiedBy].color.toLowerCase()}" aria-hidden="true"></i><i class="archaeologist-token ${state.players[site.occupiedBy].color.toLowerCase()}" title="${site.occupiedBy} archaeologist"></i>` : '';
  return `<button class="map-hotspot ${status}" style="--site-x:${spot.left}%;--site-y:${spot.top}%" ${site.blocked ? 'disabled ' : ''}${ready ? 'data-site' : 'data-discover'}="${spot.id}" title="${site.guardian && site.occupiedBy === state.currentPlayer ? 'overcome guardian' : site.blocked ? 'blocked camp' : spot.rewardCode ? 'camp' : `level ${spot.level}`}">${archaeologist}${idols}${guardian}</button>`;
}).join('')}${research()}</section>`;
render();

// Keep scoring in the engine: this overlay only renders the finished result.
const renderWithoutFinalScore = render;
render = () => {
  renderWithoutFinalScore();
  if (state.phase !== 'finished') return;
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
  market.innerHTML = `<div class="market-group market-artifacts">${state.market.artifacts.map((id) => card(id, 'buy')).join('')}</div><div class="moon-staff ${state.moonStaff}" style="--moon-step:${Math.max(0, Math.min(4, state.round - 1))}" title="${state.moonStaff} moon staff"><img src="/assets/moon-staff-${state.moonStaff}.png" alt="${state.moonStaff} moon staff"><i class="moon-staff-marker"></i></div><div class="market-group market-items">${state.market.items.map((id) => card(id, 'buy')).join('')}</div>`;
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
function playActionFeedback(before: GameState, after: GameState) {
  if (before.phase !== 'playing' || after.phase !== 'playing') return;
  requestAnimationFrame(() => {
    const boardPoint = feedbackPoint(app.querySelector('.map-board'));
    let changed = false;
    for (const id of after.playerOrder) {
      const oldPlayer = before.players[id], nextPlayer = after.players[id]; if (!oldPlayer || !nextPlayer) continue;
      const target = feedbackPoint(app.querySelector(`.player[data-feedback-player="${id}"]`));
      for (const [resource, icon] of Object.entries(feedbackIcons)) {
        const amount = nextPlayer.resources[resource as keyof typeof nextPlayer.resources] - oldPlayer.resources[resource as keyof typeof oldPlayer.resources];
        const resourceImage = resource === 'fear' ? undefined : `/assets/resource-${resource}.png`;
        if (amount > 0) { changed = true; for (let index = 0; index < Math.min(amount, 3); index += 1) addFeedback('resource', resourceImage ? '' : icon, { x: boardPoint.x + (index - 1) * 12, y: boardPoint.y }, target, resourceImage); }
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
run = (action: GameAction) => { const before = state; runWithFeedback(action); if (!roomSession) playActionFeedback(before, state); };
choose = (choice: PendingChoice) => { const before = state; chooseWithFeedback(choice); if (!roomSession) playActionFeedback(before, state); };
const renderWithFeedbackTargets = render;
render = () => {
  renderWithFeedbackTargets();
  if (screen === 'game') app.querySelectorAll<HTMLElement>('.players .player').forEach((playerElement, index) => { playerElement.dataset.feedbackPlayer = state.playerOrder[index] || ''; });
};
const playerWithGlyphResources = player;
const resourceArtwork = (resource: 'coin' | 'compass' | 'tablet' | 'arrowhead' | 'jewel', amount: number) => `<span class="resource-chip" title="${resource}"><img src="/assets/resource-${resource}.png" alt="${resource}"><b>${amount}</b></span>`;
player = (id: PlayerId) => {
  const playerState = state.players[id];
  const resources = `<div class="player-resources">${resourceArtwork('coin', playerState.resources.coin)}${resourceArtwork('compass', playerState.resources.compass)}${resourceArtwork('tablet', playerState.resources.tablet)}${resourceArtwork('arrowhead', playerState.resources.arrowhead)}${resourceArtwork('jewel', playerState.resources.jewel)}</div>`;
  return playerWithGlyphResources(id).replace(/<div class="player-resources">[\s\S]*?<\/div>/, resources);
};
const playerWithPhysicalComponents = player;
function leaderComponents(id: PlayerId) {
  const playerState = state.players[id];
  const leader = playerState.leader;
  if (!leader) return '';
  if (leader.id === 'falconer') {
    const position = Number(leader.data.eaglePosition ?? 0);
    const point = LEADER_LAYOUT.falconer.eagleTrack[Math.max(0, Math.min(4, position))]!;
    const canReturn = id === state.currentPlayer && position > 0;
    return `<button class="falcon-track-token" style="${playerPointStyle(point, true)}" ${canReturn ? `data-falcon-return="${position}"` : 'disabled'} title="${canReturn ? `return falcon from step ${position}` : `falcon step ${position}`}"><img src="/assets/leader-falcon-token.png" alt="falcon"></button>`;
  }
  if (leader.id === 'professor') {
    const suitcase = (leader.data.suitcase ?? {}) as { compass?: number; tablet?: number };
    return `<span class="professor-suitcase-token" style="${playerPointStyle(LEADER_LAYOUT.professor.suitcase, true)}" title="Professor suitcase: ${suitcase.compass ?? 0} compass, ${suitcase.tablet ?? 0} tablets"><img src="/assets/leader-professor-suitcase-alpha.png" alt="Professor suitcase"></span>`;
  }
  if (leader.id === 'explorer') {
    const snacks = (leader.data.snacks ?? []) as Array<{ id: 'free' | 'coin' | 'compass'; used: boolean; availableFromRound: number }>;
    return snacks.map((snack) => `<img class="explorer-snack-token ${snack.used ? 'used' : ''} ${state.round < snack.availableFromRound ? 'locked' : ''}" style="${playerPointStyle(LEADER_LAYOUT.explorer.snacks[snack.id], true)};--token-size:7.087%" src="/assets/leader-snack-${snack.id}.png" alt="${snack.id} snack" title="${snack.id} snack"></img>`).join('');
  }
  return '';
}
player = (id: PlayerId) => playerWithPhysicalComponents(id).replace('</section>', `<div class="physical-components">${leaderComponents(id)}</div></section>`);
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
  return rendered.replace(/(<section class="player [^"]+">)/, `$1<img class="player-board-art" src="/assets/boards/leader-${leader}.jpg" alt="${leader} board">`);
};
const renderWithConcreteAssets = render;
render = () => {
  renderWithConcreteAssets();
  if (screen !== 'game') return;
  const picker = app.querySelector<HTMLElement>('.idol-picker');
  if (!picker) return;
  picker.innerHTML = `<button data-base-idol-effect="coinToJewel" title="pay 1 coin: gain 1 jewel"><img src="/assets/resource-coin.png" alt="coin"><span>→</span><img src="/assets/resource-jewel.png" alt="jewel"></button><button data-base-idol-effect="tablets" title="gain 2 tablets"><img src="/assets/resource-tablet.png" alt="tablet"><img src="/assets/resource-tablet.png" alt="tablet"></button><button data-base-idol-effect="arrowhead" title="gain 1 arrowhead"><img src="/assets/resource-arrowhead.png" alt="arrowhead"></button><button data-base-idol-effect="coinCompass" title="gain 1 coin and 1 compass"><img src="/assets/resource-coin.png" alt="coin"><img src="/assets/resource-compass.png" alt="compass"></button><button data-base-idol-effect="draw" class="idol-draw" title="draw 1 card"></button><button data-base-idol-cancel title="cancel">×</button>`;
};
render();
