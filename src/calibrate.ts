import './calibrate.css';
import { BASE_BOARD_INTERACTION_SPOTS } from './base-board-setup.ts';
import { BASE_IDOL_EFFECTS, BASE_IDOL_SLOTS, LEADER_IDOL_EFFECT_LAYOUT, LEADER_LAYOUT, RESEARCH_LANES, RESEARCH_BOARD_SIZE, SUPPLY_BOARD_COMPONENTS, SUPPLY_BOARD_SIZE } from './board-layout.ts';
import { calibrationStorageKey } from './board-calibration.ts';
import generatedTracks from './generated/research-tracks.json';

type Mark={id:string;kind:'token'|'hotspot';asset:string;label:string;x:number;y:number;width:number;height:number;rotation:number};
type Stored=Partial<Mark>&{id:string;kind:'token'|'hotspot';x:number;y:number;radius?:number};
const publicAsset=(path:string)=>!path||/^(?:https?:|data:)/.test(path)?path:`${import.meta.env.BASE_URL.replace(/\/$/,'')}${path.startsWith('/')?path:`/${path}`}`;
const BOARDS=[['main-bird','主板 · 普通','/assets/boards/main-bird.jpg'],['main-snake','主板 · 进阶','/assets/boards/main-snake.jpg'],['bird','研究轨 · Bird','/assets/boards/bird-board.jpg'],['snake','研究轨 · Snake','/assets/boards/snake-board.jpg'],['monkey','研究轨 · Monkey','/assets/boards/monkey-board.jpg'],['lizard','研究轨 · Lizard','/assets/boards/lizard-board.jpg'],['player-base','玩家板 · 基础','/assets/boards/player-base.jpg'],['supply-board','供应板','/assets/boards/supply-board.png'],['leader-captain','领袖 · Captain','/assets/boards/leader-captain.jpg'],['leader-falconer','领袖 · Falconer','/assets/boards/leader-falconer.jpg'],['leader-baroness','领袖 · Baroness','/assets/boards/leader-baroness.jpg'],['leader-professor','领袖 · Professor','/assets/boards/leader-professor.jpg'],['leader-explorer','领袖 · Explorer','/assets/boards/leader-explorer.jpg'],['leader-mystic','领袖 · Mystic','/assets/boards/leader-mystic.jpg']] as const;
const ASSETS=[['archaeologist','考古学家','/assets/archaeologists-base-sprite.png'],['magnifying','放大镜','/assets/tokens-yellow-magnifying.png'],['journal','笔记本','/assets/tokens-yellow-journal.png'],['falcon','猎鹰','/assets/leader-falcon-token.png'],['snack-free','免费零食','/assets/leader-snack-free.png'],['snack-coin','金币零食','/assets/leader-snack-coin.png'],['snack-compass','罗盘零食','/assets/leader-snack-compass.png'],['coin','金币','/assets/resource-coin.png'],['compass','罗盘','/assets/resource-compass.png'],['tablet','石板','/assets/resource-tablet.png'],['arrowhead','箭头','/assets/resource-arrowhead.png'],['jewel','宝石','/assets/resource-jewel.png'],['idol-back','神像背面','/assets/idol-back.jpg'],['site-level1-back','一级地点背面','/assets/site-level1-back.jpg'],['site-level2-back','二级地点背面','/assets/site-level2-back.jpg'],['guardian-back','守卫背面','/assets/guardian-back.jpg'],['temple-2a','神庙板块 2A','/assets/temple-tile-2a.png'],['temple-2b','神庙板块 2B','/assets/temple-tile-2b.png'],['temple-2c','神庙板块 2C','/assets/temple-tile-2c.png'],['temple-6a','神庙板块 6A','/assets/temple-tile-6a.png'],['temple-6b','神庙板块 6B','/assets/temple-tile-6b.png'],['temple-11','神庙板块 11','/assets/temple-tile-11.png'],['suitcase','教授公文包','/assets/leader-professor-suitcase-alpha.png'],['research-bonus-1','研究奖励块（实体）','/assets/research-bonus-1.png'],['research-bonus-2','研究奖励块（实体）','/assets/research-bonus-2.png'],['research-bonus-3','研究奖励块（实体）','/assets/research-bonus-3.png'],['research-bonus-4','研究奖励块（实体）','/assets/research-bonus-4.png']] as const;
const app=document.querySelector<HTMLDivElement>('#app')!,key=calibrationStorageKey,undoKey=`${key}.undo`;let boardId=BOARDS[0][0],mode:'token'|'hotspot'='token',assetId=ASSETS[0][0],selected:string|undefined,dragging:string|undefined,resizing:string|undefined,resizeStart:{x:number;y:number;width:number;height:number}|undefined;let data:Record<string,Mark[]>={},undoHistory:Record<string,Mark[]>[]=[];try{const old=JSON.parse(localStorage.getItem(key)||localStorage.getItem('arnak.board-calibrator.v1')||'{}')as Record<string,Stored[]>;data=Object.fromEntries(Object.entries(old).map(([id,marks])=>[id,marks.map(m=>({...m,asset:m.asset??'',label:m.label??'',width:m.width??(m.radius??24)*2,height:m.height??(m.radius??24)*2,rotation:m.rotation??0}))]))as Record<string,Mark[]>;const savedUndo=JSON.parse(localStorage.getItem(undoKey)||'[]');if(Array.isArray(savedUndo))undoHistory=savedUndo.filter((entry):entry is Record<string,Mark[]>=>Boolean(entry)&&typeof entry==='object').slice(-30)}catch{}
const hotspot=(id:string,label:string,x:number,y:number,width=48,height=38):Mark=>({id,kind:'hotspot',asset:'',label,x,y,width,height,rotation:0});
type ResearchDefaultNode={id:string;rowIndex:number;pathIndex:number;metadata?:{bonusSlot?:boolean;bonusSlotMinimums?:number[]}};
const research=(id:keyof typeof RESEARCH_LANES)=>{
  const generated=((generatedTracks as Record<string,{rows:{nodes:ResearchDefaultNode[]}[]}>)[id]?.rows.flatMap(row=>row.nodes)??[]);
  // This is a real rule node introduced by the Monkey manual overlay.  It is
  // visually one long magnifying-glass space crossing r3/r4, rather than a
  // second journal cell.  Keeping it explicit makes it calibratable.
  const nodes:ResearchDefaultNode[]=[...generated,...(id==='monkey'?[{id:'monkey:r4:magnifying',rowIndex:4,pathIndex:0}]:[])];
  const point=(node:ResearchDefaultNode)=>{const lane=RESEARCH_LANES[id].magnifying[Math.min(node.rowIndex,RESEARCH_LANES[id].magnifying.length-1)]!;return{x:(lane.x-node.pathIndex*135)/RESEARCH_BOARD_SIZE.width*100,y:lane.y/RESEARCH_BOARD_SIZE.height*100};};
  const suffix=(nodeId:string)=>nodeId.replace(`${id}:`,'').replaceAll(':','-');
  const cells=nodes.map(node=>{const p=point(node);return hotspot(`${id}-research-cell-${suffix(node.id)}`,`research cell · ${node.id}`,p.x,p.y,node.id==='monkey:r4:magnifying'?92:72,node.id==='monkey:r4:magnifying'?180:58);});
  // Physical reward-tile anchors. Research movement belongs to the cell
  // hotspot; this reference artwork only makes the tile position editable.
  const bonusSlots=generated.flatMap(node=>node.metadata?.bonusSlot?[node]:[]).flatMap(node=>Array.from({length:Math.max(1,node.metadata?.bonusSlotMinimums?.length??1)},(_,index)=>{const p=point(node);return{id:`${id}-research-bonus-${suffix(node.id)}-${index}`,kind:'token' as const,asset:`research-bonus-${index%4+1}`,label:`research bonus tile ${node.id} ${index+1}`,x:p.x,y:p.y,width:120,height:120,rotation:0};}));
  const temple=[
    hotspot(`${id}-research-temple-entry`,'research temple entry',795/RESEARCH_BOARD_SIZE.width*100,150/RESEARCH_BOARD_SIZE.height*100,100,90),
    ...[['2a',185],['2b',250],['2c',315],['6a',380],['6b',445],['11',510]].map(([variant,y])=>({id:`${id}-research-temple-tile-${variant}`,kind:'token' as const,asset:`temple-${variant}`,label:`temple tile · ${variant.toUpperCase()}`,x:165/RESEARCH_BOARD_SIZE.width*100,y:Number(y)/RESEARCH_BOARD_SIZE.height*100,width:210,height:94,rotation:0})),
    ...[0,1,2,3].map(index=>({id:`${id}-research-temple-bonus-${index}`,kind:'token' as const,asset:`research-bonus-${index%4+1}`,label:`temple bonus tile ${index+1}`,x:(625+index*72)/RESEARCH_BOARD_SIZE.width*100,y:205/RESEARCH_BOARD_SIZE.height*100,width:120,height:120,rotation:0})),
  ];
  return [...cells,...bonusSlots,...temple];
};
const mainBoardDefaults=(id:'main-bird'|'main-snake')=>BASE_BOARD_INTERACTION_SPOTS.map(s=>{
  // Visual-QA measurements: discovered Level I tiles and their guardian
  // overlays occupy 150×150 source pixels; Level II occupies 160×160.
  return hotspot(`${id}-${s.id}`,s.id,s.left * 3 / 2,s.top,(s.width ?? (s.level===1?150:160)) * 3 / 2,s.height ?? (s.level===1?150:160));
});
const mainBoardPieceDefaults=(id:'main-bird'|'main-snake')=>BASE_BOARD_INTERACTION_SPOTS.filter((spot)=>!spot.rewardCode).flatMap((spot)=>{
  const size=spot.level===1?150:160, x=spot.left*3/2, y=spot.top;
  const guardianX=(spot.left+((spot.width??size)/10)*.28)*3/2,guardianY=spot.top-((spot.height??size)/10.3)*.27;
  return [
    {id:`${id}-${spot.id}-site`,kind:'token' as const,asset:spot.level===1?'site-level1-back':'site-level2-back',label:`${spot.id}-site`,x,y,width:size,height:size,rotation:0},
    {id:`${id}-${spot.id}-guardian`,kind:'token' as const,asset:'guardian-back',label:`${spot.id}-guardian`,x:guardianX,y:guardianY,width:size,height:size,rotation:0},
  ];
});
const mainBoardComponents=(_id:'main-bird'|'main-snake')=>[] as Mark[];
const playerBaseDefaults=()=>[
  ...BASE_IDOL_SLOTS.map((point,index):Mark=>({id:`player-base-idol-slot-${index}`,kind:'token',asset:'idol-back',label:`idol-slot-${index + 1}`,x:point.x/1270*100,y:point.y/328*100,width:34,height:42,rotation:0})),
  ...BASE_IDOL_EFFECTS.map(({effect,point}):Mark=>hotspot(`player-base-idol-effect-${effect}`,effect,point.x/1270*100,point.y/328*100,31,26)),
  hotspot('player-base-draw-deck','player board · draw deck',610/1270*100,160/328*100,150,250),
  hotspot('player-base-discard','player board · discard pile',1190/1270*100,78/328*100,125,105),
  hotspot('player-base-play-area','player board · played cards',1190/1270*100,235/328*100,125,105),
  ...[1,2,3,4].map(index=>hotspot(`player-base-archaeologist-${index}`,`player board · archaeologist ${index}`,(880+(index-1)*65)/1270*100,55/328*100,52,52)),
  ...[0,1,2].map(index=>hotspot(`player-base-assistant-${index}`,`player board · assistant ${index+1}`,(648+index*62)/1270*100,285/328*100,52,52)),
  ...[0,1,2,3,4].map(index=>({id:`player-base-idol-reserve-${index}`,kind:'token' as const,asset:'idol-back',label:`player board · usable idol ${index+1}`,x:(640+index*40)/1270*100,y:247/328*100,width:34,height:42,rotation:0})),
];
const defaults:Record<string,Mark[]>={'main-bird':[...mainBoardDefaults('main-bird'),...mainBoardPieceDefaults('main-bird'),...mainBoardComponents('main-bird')],'main-snake':[...mainBoardDefaults('main-snake'),...mainBoardPieceDefaults('main-snake'),...mainBoardComponents('main-snake')],bird:research('bird'),snake:research('snake'),monkey:research('monkey'),lizard:research('lizard'),'player-base':playerBaseDefaults(),'leader-explorer':[{id:'leader-explorer-snack-free',kind:'token',asset:'snack-free',label:'snack-free',x:60.31,y:16.77,width:90,height:90,rotation:0},{id:'leader-explorer-snack-coin',kind:'token',asset:'snack-coin',label:'snack-coin',x:60.31,y:49.39,width:90,height:90,rotation:0},{id:'leader-explorer-snack-compass',kind:'token',asset:'snack-compass',label:'snack-compass',x:60.24,y:82.62,width:90,height:90,rotation:0}]};for(const[id,marks]of Object.entries(defaults)){let existing=data[id]??[];if(['bird','snake','monkey','lizard'].includes(id)){const legacy=new RegExp(`^${id}-(?:(?:magnifying|journal)-\\d+|research-cell-\\d+)$`);const migrated=marks.flatMap(mark=>{if(existing.some(candidate=>candidate.id===mark.id)||!mark.id.endsWith('-p0'))return[];const row=mark.id.match(/r(\d+)-p0$/)?.[1],old=existing.find(candidate=>candidate.id===`${id}-research-cell-${row}`)||existing.find(candidate=>candidate.id===`${id}-magnifying-${row}`)||existing.find(candidate=>candidate.id===`${id}-journal-${row}`);return old?[{...old,id:mark.id,label:mark.label}]:[];});existing=[...existing.filter(mark=>!legacy.test(mark.id)),...migrated];}const known=new Set(existing.map(mark=>mark.id));data[id]=[...existing,...marks.filter(mark=>!known.has(mark.id))];}
// Existing calibrated reward pieces keep their positions, but use one
// consistent 120×120 source-pixel footprint for the user to fine-tune.
for(const id of ['bird','snake','monkey','lizard'])data[id]=(data[id]??[]).map(mark=>{
  const trackBonus=mark.id.match(new RegExp(`^${id}-research-bonus-.+-(\\d+)$`));
  const templeBonus=mark.id.match(new RegExp(`^${id}-research-temple-bonus-(\\d+)$`));
  const index=Number((trackBonus??templeBonus)?.[1]??0);
  return trackBonus||templeBonus?{...mark,kind:'token' as const,asset:`research-bonus-${index%4+1}`,width:120,height:120}:mark;
});
for(const id of ['bird','snake','monkey','lizard'])data[id]=(data[id]??[]).filter(mark=>!new RegExp(`^${id}-research-start-(?:magnifying|journal)$`).test(mark.id));
const supplyBoardDefaults=()=>[
  ...SUPPLY_BOARD_COMPONENTS.assistants.map((component,index)=>hotspot(`supply-assistant-${index}`,`supply board · assistant stack ${index+1}`,component.x/SUPPLY_BOARD_SIZE.width*100,component.y/SUPPLY_BOARD_SIZE.height*100,component.width,component.height)),
  ...(['coin','compass','tablet','arrowhead','jewel'] as const).map(resource=>{const component=SUPPLY_BOARD_COMPONENTS.resources[resource];return{id:`supply-resource-${resource}`,kind:'token' as const,asset:resource,label:`supply board · ${resource}`,x:component.x/SUPPLY_BOARD_SIZE.width*100,y:component.y/SUPPLY_BOARD_SIZE.height*100,width:component.width,height:component.height,rotation:0};}),
  ...(['magnifying','journal'] as const).map(kind=>{const component=SUPPLY_BOARD_COMPONENTS.researchStarts[kind];return{id:`supply-research-start-${kind}`,kind:'token' as const,asset:kind,label:`supply board · research start ${kind}`,x:component.x/SUPPLY_BOARD_SIZE.width*100,y:component.y/SUPPLY_BOARD_SIZE.height*100,width:component.width,height:component.height,rotation:0};}),
];
{const existing=data['supply-board']??[],known=new Set(existing.map(mark=>mark.id));data['supply-board']=[...existing,...supplyBoardDefaults().filter(mark=>!known.has(mark.id))];}
const leaderIdolDefaults=(leader:'captain'|'falconer'|'baroness'|'professor'|'explorer'|'mystic')=>{
  const standard=leader==='mystic'?LEADER_IDOL_EFFECT_LAYOUT.mysticStandard:LEADER_IDOL_EFFECT_LAYOUT.standard;
  const effects=standard.map(({effect,point})=>hotspot(`leader-${leader}-idol-effect-${effect}`,`leader ${leader} · idol effect ${effect}`,point.x/1270*100,point.y/328*100,48,32));
  return leader==='mystic'
    ? [...effects,hotspot('leader-mystic-idol-effect-mysticExileArrowhead','leader mystic · idol effect exile arrowhead',LEADER_IDOL_EFFECT_LAYOUT.mysticArrowhead.point.x/1270*100,LEADER_IDOL_EFFECT_LAYOUT.mysticArrowhead.point.y/328*100,68,36),hotspot('leader-mystic-idol-effect-mysticExileRitual','leader mystic · idol effect ritual',LEADER_IDOL_EFFECT_LAYOUT.mysticRitual.point.x/1270*100,LEADER_IDOL_EFFECT_LAYOUT.mysticRitual.point.y/328*100,68,36)]
    : [...effects,hotspot(`leader-${leader}-idol-effect-leaderUnique`,`leader ${leader} · blue idol effect`,LEADER_IDOL_EFFECT_LAYOUT.unique.point.x/1270*100,LEADER_IDOL_EFFECT_LAYOUT.unique.point.y/328*100,76,36)];
};
const leaderCollectorDefaults:Record<string,Mark[]>={
  'leader-captain':[...leaderIdolDefaults('captain'),hotspot('leader-captain-specialist','leader captain · specialist',LEADER_LAYOUT.captain.specialist.x/1270*100,LEADER_LAYOUT.captain.specialist.y/328*100,78,112)],
  // Falconer track anchors are player-calibrated physical-token marks.  Do
  // not synthesize a second set: legacy Falcon markers are renamed below.
  'leader-falconer':leaderIdolDefaults('falconer'),
  'leader-baroness':leaderIdolDefaults('baroness'),
  'leader-professor':leaderIdolDefaults('professor'),
  'leader-explorer':leaderIdolDefaults('explorer'),
  'leader-mystic':[...leaderIdolDefaults('mystic'),...LEADER_LAYOUT.mystic.ritualEffects.map(({fearCount,point})=>hotspot(`leader-mystic-ritual-${fearCount}`,`leader mystic · ${fearCount}-Fear ritual`,point.x/1270*100,point.y/328*100,145,32))],
};
// Early collector sessions stored the five Falconer landing markers with the
// generic drag-and-drop name.  Preserve their calibrated rectangle, size and
// rotation, but promote them to stable state-machine names in left-to-right
// track order.  The game renders one eagle at exactly one of these anchors.
const oldFalconerMarks=data['leader-falconer']??[];
if(!oldFalconerMarks.some(mark=>/^leader-falconer-eagle-track-\d+$/.test(mark.id))){
  const legacyFalconerMarks=oldFalconerMarks.filter(mark=>mark.asset==='falcon').sort((a,b)=>a.x-b.x).slice(0,5);
  if(legacyFalconerMarks.length===5){
    const remapped=new Map(legacyFalconerMarks.map((mark,index)=>[mark.id,{...mark,id:`leader-falconer-eagle-track-${index}`,label:`leader falconer · eagle track ${index}`}]));
    data['leader-falconer']=oldFalconerMarks.map(mark=>remapped.get(mark.id)??mark);
  }
}
// Slot clicks were an early UI experiment.  Leader idols now follow the same
// convention as the base board: the printed effect is clickable, while slots
// merely show spent idols.  Remove only those generated leader-slot hotspots;
// player-created artwork and all named effect/track marks remain untouched.
for(const leader of ['captain','falconer','baroness','professor','explorer','mystic']){
  const boardId=`leader-${leader}`;
  data[boardId]=(data[boardId]??[]).filter(mark=>!/^leader-(captain|falconer|baroness|professor|explorer|mystic)-idol-slot-\d+$/.test(mark.id));
}
data['leader-mystic']=(data['leader-mystic']??[]).filter(mark=>mark.id!=='leader-mystic-ritual');
for(const[id,marks]of Object.entries(leaderCollectorDefaults)){const existing=data[id]??[];const known=new Set(existing.map(mark=>mark.id));data[id]=[...existing,...marks.filter(mark=>!known.has(mark.id))];}

// Guardians follow their site card.  Use the calibrated level-1/1
// site-to-guardian relationship as the template for every discovery spot.
function synchronizeMainBoardGuardians(id: 'main-bird' | 'main-snake') {
  const boardMarks = data[id] ?? [];
  const referenceSite = boardMarks.find((mark) => mark.id === `${id}-level1-1-site` || mark.label === 'level1-1-site');
  const referenceGuardian = boardMarks.find((mark) => mark.id === `${id}-level1-1-guardian` || mark.label === 'level1-1-guardian');
  if (!referenceSite || !referenceGuardian) return;
  const deltaX = referenceGuardian.x - referenceSite.x;
  const deltaY = referenceGuardian.y - referenceSite.y;
  const semanticSite = (mark: Mark) => `${mark.id} ${mark.label ?? ''}`.match(/(level[12]-\d+)-site(?:\s+copy)?$/)?.[1];
  const semanticGuardian = (mark: Mark) => `${mark.id} ${mark.label ?? ''}`.match(/(level[12]-\d+)-guardian(?:\s+copy)?$/)?.[1];
  const existing = new Map(boardMarks.flatMap((mark) => {
    const key = semanticGuardian(mark); return key ? [[key, mark] as const] : [];
  }));
  const synchronized = boardMarks.filter((mark) => !semanticGuardian(mark));
  for (const site of boardMarks) {
    const key = semanticSite(site); if (!key) continue;
    const guardianId = `${id}-${key}-guardian`;
    const previous = existing.get(key);
    synchronized.push({
      id: guardianId, kind: 'token', asset: 'guardian-back', label: guardianId.replace(`${id}-`, ''),
      x: site.x + deltaX, y: site.y + deltaY,
      width: referenceGuardian.width, height: referenceGuardian.height,
      rotation: previous?.rotation ?? referenceGuardian.rotation ?? 0,
    });
  }
  data[id] = synchronized;
}
function copyDiscoveryCalibrationToSnake() {
  const birdMarks = data['main-bird'] ?? [];
  const snakeMarks = data['main-snake'] ?? [];
  const byId = new Map(snakeMarks.map((mark) => [mark.id, mark]));
  for (const birdMark of birdMarks) {
    const suffix = `${birdMark.id} ${birdMark.label ?? ''}`.match(/(level[12]-\d+(?:-(?:site|guardian))?)(?:\s+copy)?$/)?.[1];
    if (!suffix) continue;
    const target = snakeMarks.find((mark) => mark.id === `main-snake-${suffix}` || mark.label === suffix);
    if (target) byId.set(target.id, { ...target, x: birdMark.x, y: birdMark.y, width: birdMark.width, height: birdMark.height, rotation: birdMark.rotation });
  }
  data['main-snake'] = [...byId.values()];
}
// Old browser-local exports occasionally predate the `level1-4` discovery
// pieces. Re-add every named discovery piece after migration so a stale Snake
// calibration can never hide only that site and guardian.
function ensureMainBoardDiscoveryPieces(id: 'main-bird' | 'main-snake') {
  const marks = data[id] ?? [];
  const known = new Set(marks.map(mark => mark.id));
  data[id] = [...marks, ...mainBoardPieceDefaults(id).filter(mark => !known.has(mark.id))];
}
// The six Bird Temple tiles were initially placed as anonymous 2/6/11 art in
// the collector. Once all physical copies are present, give them immutable
// variant names while preserving the positions the reviewer already set.
function normalizeBirdTempleTiles() {
  const marks = data.bird ?? [];
  const groups = [{ tier: '2', variants: ['2a', '2b', '2c'] }, { tier: '6', variants: ['6a', '6b'] }, { tier: '11', variants: ['11'] }] as const;
  const canonicalIds = new Set(groups.flatMap(group => group.variants.map(variant => `bird-research-temple-tile-${variant}`)));
  const tierOf = (asset: string) => asset.match(/^temple-(2(?:[abc])?|6(?:[ab])?|11)$/)?.[1]?.replace(/[abc]$/, '');
  let next = [...marks];
  for (const group of groups) {
    // A manually dropped token has a random id; a generated default has the
    // canonical id. Prefer the manually positioned pieces and discard their
    // overlapping defaults before assigning the final stable identifiers.
    const manual = next.filter(mark => mark.kind === 'token' && tierOf(mark.asset) === group.tier && !canonicalIds.has(mark.id)).sort((left, right) => left.y - right.y || left.x - right.x);
    if (manual.length !== group.variants.length) continue;
    const sourceIds = new Set(manual.map(mark => mark.id));
    const ids = new Set(group.variants.map(variant => `bird-research-temple-tile-${variant}`));
    const replacements = manual.map((mark, index) => { const variant = group.variants[index]!; return { ...mark, id: `bird-research-temple-tile-${variant}`, asset: `temple-${variant}`, label: `temple tile · ${variant.toUpperCase()}` }; });
    next = [...next.filter(mark => !sourceIds.has(mark.id) && !ids.has(mark.id)), ...replacements];
  }
  // Repair any duplicate canonical ids created by an older migration. The
  // user-created mark has the non-default label, so retain that one.
  const unique = new Map<string, Mark>();
  for (const mark of next) {
    const previous = unique.get(mark.id);
    if (!previous || (canonicalIds.has(mark.id) && !mark.label.startsWith('temple tile') && previous.label.startsWith('temple tile'))) unique.set(mark.id, mark);
  }
  data.bird = [...unique.values()];
}
synchronizeMainBoardGuardians('main-bird');
copyDiscoveryCalibrationToSnake();
ensureMainBoardDiscoveryPieces('main-bird');
ensureMainBoardDiscoveryPieces('main-snake');
synchronizeMainBoardGuardians('main-snake');
// Repair only the three records that were absent in older Snake layouts (and
// the matching Bird guardian).  Do not recalculate or touch any other board
// component the user has calibrated.
function restoreNamedDiscoveryPiece(board: 'main-bird' | 'main-snake', suffix: string) {
  const expected = mainBoardPieceDefaults(board).find(mark => mark.id === `${board}-${suffix}`);
  if (!expected) return;
  const existing = (data[board] ?? []).find(mark => mark.id === expected.id);
  if (existing?.kind === 'token' && existing.asset === expected.asset) return;
  data[board] = [...(data[board] ?? []).filter(mark => mark.id !== expected.id), existing
    ? { ...expected, x: existing.x, y: existing.y, width: existing.width, height: existing.height, rotation: existing.rotation }
    : expected];
}
restoreNamedDiscoveryPiece('main-bird', 'level1-4-guardian');
restoreNamedDiscoveryPiece('main-snake', 'level1-4-site');
restoreNamedDiscoveryPiece('main-snake', 'level1-4-guardian');
// The public level1-4 hotspot was manually confirmed as the correct anchor.
// Use it for the missing site card, then retain each board's calibrated 1-1
// site-to-guardian offset.  This fixes only L1-4 and cannot move other tiles.
function alignLevel14ToConfirmedHotspot(board: 'main-bird' | 'main-snake') {
  const marks = data[board] ?? [];
  const anchor = marks.find(mark => mark.id === `${board}-level1-4` && mark.kind === 'hotspot');
  const referenceSite = marks.find(mark => mark.id === `${board}-level1-1-site`);
  const referenceGuardian = marks.find(mark => mark.id === `${board}-level1-1-guardian`);
  const site = marks.find(mark => mark.id === `${board}-level1-4-site`);
  const guardian = marks.find(mark => mark.id === `${board}-level1-4-guardian`);
  if (!anchor || !site || !guardian || !referenceSite || !referenceGuardian) return;
  const deltaX = referenceGuardian.x - referenceSite.x, deltaY = referenceGuardian.y - referenceSite.y;
  const replacement = new Map(marks.map(mark => [mark.id, mark]));
  replacement.set(site.id, { ...site, x: anchor.x, y: anchor.y });
  replacement.set(guardian.id, { ...guardian, x: anchor.x + deltaX, y: anchor.y + deltaY, width: referenceGuardian.width, height: referenceGuardian.height, rotation: referenceGuardian.rotation });
  data[board] = [...replacement.values()];
}
normalizeBirdTempleTiles();
const marks=()=>data[boardId]??[],asset=(id:string)=>ASSETS.find(a=>a[0]===id),board=()=>BOARDS.find(b=>b[0]===boardId)??BOARDS[0],persist=()=>localStorage.setItem(key,JSON.stringify(data));
const snapshot=()=>JSON.parse(JSON.stringify(data)) as Record<string,Mark[]>;
function recordUndo(){undoHistory=[...undoHistory,snapshot()].slice(-30);localStorage.setItem(undoKey,JSON.stringify(undoHistory));}
function undo(){const previous=undoHistory.pop();if(!previous)return;data=previous;selected=undefined;localStorage.setItem(undoKey,JSON.stringify(undoHistory));persist();render();}
// Explicit recovery, authorised after the two L1-3/L1-4 pairs on both main
// boards were corrupted.  Each card returns to its own printed hotspot; its
// guardian keeps the already-calibrated L1-1 offset from the same board.
// This does not copy coordinates between Bird and Snake.
const discoveryPairRecoveryKey='arnak.board-calibrator.v2.rebuild-main-l1-3-4';
if(!localStorage.getItem(discoveryPairRecoveryKey)){
  recordUndo();
  for(const board of ['main-bird','main-snake'] as const){
    const marks=data[board]??[],next=new Map(marks.map(mark=>[mark.id,mark]));
    const byId=(id:string)=>[...marks].reverse().find(mark=>mark.id===id);
    const referenceSite=byId(`${board}-level1-1-site`),referenceGuardian=byId(`${board}-level1-1-guardian`);
    for(const level of ['level1-3','level1-4']){
      const spot=BASE_BOARD_INTERACTION_SPOTS.find(candidate=>candidate.id===level);
      const anchor=byId(`${board}-${level}`);
      const site=next.get(`${board}-${level}-site`),guardian=next.get(`${board}-${level}-guardian`);
      const x=anchor?.x??(spot?.left??0)*3/2,y=anchor?.y??spot?.top??0;
      if(site)next.set(site.id,{...site,x,y,width:referenceSite?.width??150,height:referenceSite?.height??150,rotation:referenceSite?.rotation??0});
      if(guardian&&referenceSite&&referenceGuardian)next.set(guardian.id,{...guardian,x:x+(referenceGuardian.x-referenceSite.x),y:y+(referenceGuardian.y-referenceSite.y),width:referenceGuardian.width,height:referenceGuardian.height,rotation:referenceGuardian.rotation});
    }
    data[board]=[...next.values()];
  }
  localStorage.setItem(discoveryPairRecoveryKey,'1');
}
const marker=(m:Mark)=>m.kind==='hotspot'?`<button class="mark hotspot ${m.id===selected?'selected':''}" style="--x:${m.x}%;--y:${m.y}%;--w:${m.width};--h:${m.height};--rot:${m.rotation}deg" data-mark="${m.id}" title="${m.label}"><span>${m.label||'互动'}</span><i class="resize-handle" data-resize="${m.id}"></i></button>`:`<button class="mark token ${m.id===selected?'selected':''}" style="--x:${m.x}%;--y:${m.y}%;--w:${m.width};--h:${m.height};--rot:${m.rotation}deg" data-mark="${m.id}" title="${m.label}"><img src="${publicAsset(asset(m.asset)?.[2]||'')}" alt="${m.label}"><i class="resize-handle" data-resize="${m.id}"></i></button>`;
function render(){const b=board(),m=marks().find(x=>x.id===selected);app.innerHTML=`<main><header><strong>版图坐标采集器</strong><span>拖入贴图；互动点可与贴图重叠。坐标相对原图保存。</span><a href="${import.meta.env.BASE_URL}">游戏</a></header><section class="layout"><aside><label>版图<select data-board>${BOARDS.map(x=>`<option value="${x[0]}" ${x[0]===boardId?'selected':''}>${x[1]}</option>`).join('')}</select></label><div class="mode"><button data-mode="token" class="${mode==='token'?'active':''}">贴图 token</button><button data-mode="hotspot" class="${mode==='hotspot'?'active':''}">互动热区</button></div><p>互动热区：切换后点击空白处新增；拖动移动；右侧可调宽、高。</p><h2>可拖动贴图</h2><div class="palette">${ASSETS.map(x=>`<button draggable="true" data-asset="${x[0]}" class="${x[0]===assetId?'selected':''}"><img src="${publicAsset(x[2])}" alt=""><small>${x[1]}</small></button>`).join('')}</div></aside><section class="canvas-wrap"><div class="canvas" data-canvas><div class="image-plane" data-board-plane><img data-board-image src="${publicAsset(b[2])}" alt="${b[1]}">${marks().map(marker).join('')}</div></div></section><aside><h2>选中项</h2>${m?`<label>名称<input data-field="label" value="${m.label}"></label><label>宽度 px<input type="number" min="4" data-field="width" value="${m.width}"></label><label>高度 px<input type="number" min="4" data-field="height" value="${m.height}"></label><label>角度<input type="number" data-field="rotation" value="${m.rotation}"></label><code>x ${m.x}% · y ${m.y}%</code>${m.kind==='hotspot'?'<button data-test>测试点击动画</button>':''}<button data-delete>删除</button>`:'<p>选中/拖入标记后可命名、调整长宽和旋转。主板和研究轨已预录入现有互动点，可直接微调。</p>'}<h2>导出</h2><button data-copy>复制 JSON</button><button data-download>下载 JSON</button><textarea readonly>${JSON.stringify({version:2,boards:data},null,2)}</textarea></aside></section></main>`}
function point(e:MouseEvent|DragEvent){const r=app.querySelector<HTMLElement>('[data-board-plane]')!.getBoundingClientRect();return{x:Math.round((e.clientX-r.left)/r.width*10000)/100,y:Math.round((e.clientY-r.top)/r.height*10000)/100}}
function place(e:MouseEvent|DragEvent,input:Partial<Mark>){recordUndo();const{x,y}=point(e),m:Mark={id:`${boardId}-${crypto.randomUUID()}`,kind:mode,asset:assetId,label:mode==='hotspot'?'interactive':assetId,x,y,width:48,height:40,rotation:0,...input};data[boardId]=[...marks(),m];selected=m.id;persist();render()}
function modify(id:string,c:Partial<Mark>){recordUndo();data[boardId]=marks().map(m=>m.id===id?{...m,...c}:m);persist();render()}function move(id:string,e:MouseEvent){const{x,y}=point(e);data[boardId]=marks().map(m=>m.id===id?{...m,x,y}:m);const el=app.querySelector<HTMLElement>(`[data-mark="${id}"]`);el?.style.setProperty('--x',`${x}%`);el?.style.setProperty('--y',`${y}%`)}function test(id:string){const el=app.querySelector<HTMLElement>(`[data-mark="${id}"]`);if(!el)return;el.classList.remove('testing');void el.offsetWidth;el.classList.add('testing');setTimeout(()=>el.classList.remove('testing'),850)}
function refreshBoardScale(){const plane=app.querySelector<HTMLElement>('.image-plane'),image=app.querySelector<HTMLImageElement>('[data-board-image]');if(!plane||!image||!image.naturalWidth)return;if(boardId.startsWith('main-')){plane.style.width=`${image.getBoundingClientRect().width*2/3}px`;plane.style.overflow='hidden';}else{plane.style.width='';plane.style.overflow='';}const sourceWidth=image.naturalWidth*(boardId.startsWith('main-')?2/3:1);plane.style.setProperty('--board-scale',`${plane.getBoundingClientRect().width/sourceWidth}`);}
const baseRender=render;render=()=>{baseRender();const image=app.querySelector<HTMLImageElement>('[data-board-image]');if(image){image.addEventListener('load',refreshBoardScale,{once:true});refreshBoardScale();}if(selected){const target=app.querySelector<HTMLElement>('[data-delete]');target?.insertAdjacentHTML('beforebegin','<button data-duplicate>复制组件</button>');}};
const renderWithUndoButton=render;render=()=>{renderWithUndoButton();app.querySelector('header')?.insertAdjacentHTML('beforeend',`<button data-undo ${undoHistory.length?'':'disabled'}>Undo (${undoHistory.length})</button>`);};
app.addEventListener('click',e=>{const button=(e.target as HTMLElement).closest<HTMLElement>('[data-duplicate]');if(!button||!selected)return;e.preventDefault();e.stopImmediatePropagation();recordUndo();const source=marks().find(mark=>mark.id===selected);if(!source)return;const copy={...source,id:`${boardId}-${crypto.randomUUID()}`,label:`${source.label} copy`,x:Math.min(99,source.x+2),y:Math.min(99,source.y+2)};data[boardId]=[...marks(),copy];selected=copy.id;persist();render();},true);
app.addEventListener('mousedown',e=>{const handle=(e.target as HTMLElement).closest<HTMLElement>('[data-resize]');if(!handle)return;const id=handle.dataset.resize!,mark=marks().find(candidate=>candidate.id===id);if(!mark)return;e.preventDefault();e.stopImmediatePropagation();recordUndo();selected=id;resizing=id;resizeStart={x:e.clientX,y:e.clientY,width:mark.width,height:mark.height};},true);
app.addEventListener('mousedown',e=>{const target=e.target as HTMLElement;if(!target.closest<HTMLElement>('[data-resize]')&&target.closest<HTMLElement>('[data-mark]'))recordUndo();},true);
app.addEventListener('click',e=>{const button=(e.target as HTMLElement).closest<HTMLElement>('button');if(!button)return;if(button.dataset.undo!==undefined){e.preventDefault();e.stopImmediatePropagation();undo();return;}if(button.dataset.delete!==undefined&&selected)recordUndo();},true);
window.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'&&!e.shiftKey){e.preventDefault();undo();}});
app.addEventListener('mousemove',e=>{if(!resizing||!resizeStart||!e.buttons)return;const plane=app.querySelector<HTMLElement>('[data-board-plane]');const scale=Number(plane&&getComputedStyle(plane).getPropertyValue('--board-scale'))||1;const width=Math.max(4,Math.round(resizeStart.width+(e.clientX-resizeStart.x)/scale)),height=Math.max(4,Math.round(resizeStart.height+(e.clientY-resizeStart.y)/scale));data[boardId]=marks().map(mark=>mark.id===resizing?{...mark,width,height}:mark);const element=app.querySelector<HTMLElement>(`[data-mark="${resizing}"]`);element?.style.setProperty('--w',`${width}`);element?.style.setProperty('--h',`${height}`);},true);
app.addEventListener('mouseup',()=>{if(!resizing)return;persist();resizing=undefined;resizeStart=undefined;render();},true);
app.addEventListener('change',e=>{const el=e.target as HTMLInputElement|HTMLSelectElement;if(el.matches('[data-board]')){boardId=el.value;selected=undefined;render();return}if(!selected||!el.dataset.field)return;const f=el.dataset.field;modify(selected,f==='label'?{label:el.value}:{[f]:Number(el.value)})});app.addEventListener('dragstart',e=>{const id=(e.target as HTMLElement).closest<HTMLElement>('[data-asset]')?.dataset.asset;if(id)e.dataTransfer?.setData('asset',id)});app.addEventListener('dragover',e=>{if((e.target as HTMLElement).closest('[data-canvas]'))e.preventDefault()});app.addEventListener('drop',e=>{if(!(e.target as HTMLElement).closest('[data-canvas]'))return;e.preventDefault();const id=e.dataTransfer?.getData('asset');if(id){assetId=id;place(e,{kind:'token',asset:id,label:id})}});app.addEventListener('click',async e=>{const t=e.target as HTMLElement,b=t.closest<HTMLElement>('button');if(!b&&t.closest('[data-canvas]'))return place(e,{});if(!b)return;if(b.dataset.mode){mode=b.dataset.mode as typeof mode;return render()}if(b.dataset.asset){assetId=b.dataset.asset;return render()}if(b.dataset.mark){selected=b.dataset.mark;return render()}if(b.dataset.test&&selected)return test(selected);if(b.dataset.delete!==undefined&&selected){data[boardId]=marks().filter(m=>m.id!==selected);selected=undefined;persist();return render()}if(b.dataset.copy)return navigator.clipboard.writeText(JSON.stringify({version:2,boards:data},null,2));if(b.dataset.download){const u=URL.createObjectURL(new Blob([JSON.stringify({version:2,boards:data},null,2)],{type:'application/json'})),a=Object.assign(document.createElement('a'),{href:u,download:'arnak-board-layout.json'});a.click();URL.revokeObjectURL(u)}});app.addEventListener('mousedown',e=>{const m=(e.target as HTMLElement).closest<HTMLElement>('[data-mark]');if(!m)return;e.preventDefault();selected=m.dataset.mark;dragging=selected;render()});app.addEventListener('mousemove',e=>{if(dragging&&e.buttons)move(dragging,e)});app.addEventListener('mouseup',()=>{if(dragging){persist();render()}dragging=undefined});persist();render();
