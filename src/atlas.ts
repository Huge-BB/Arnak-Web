import './atlas.css';
import cards from './generated/cards.json';
import assetsJson from './generated/local-assets.json';
import generatedTracks from './generated/research-tracks.json';
import manualResearch from '../data/research-manual-data.json';
import rewardManual from '../data/research-rewards-manual.json';
import { buildResearchTracks } from './research-data.ts';
import { cardEffectSummaries, cardHoverText } from './card-effect-summaries.ts';
import type { ResearchBoardId } from './types.ts';

type Asset={url?:string;sheetUrl:string;sheetWidth:number;sheetHeight:number;cardIndex:number};
type Card={id:string;name:string;type:string;expansion:string;cost?:number;points?:number;travel?:Record<string,number>};
const assets=(assetsJson as {assets:Record<string,Asset>}).assets,app=document.querySelector<HTMLDivElement>('#app')!;
const allCards=Object.values(cards) as Card[];
const marketCards=allCards.filter(card=>['Item','Artifact'].includes(card.type)).sort((a,b)=>Number(a.id)-Number(b.id));
const leaderCards=allCards.filter(card=>card.expansion==='Expedition Leaders'&&card.type==='Starter').sort((a,b)=>Number(a.id)-Number(b.id));
const tracks=buildResearchTracks(generatedTracks,manualResearch,{rewardManual});
let section:'market'|'leaders'|'research'='market',expansion='all',status='all',query='',researchBoard:ResearchBoardId='bird';

const leaderCardTexts:Record<string,string>={
  Funding:'获得 1 金币。', Piloting:'获得 1 罗盘；或支付 1 金币获得 2 飞机。', Transmission:'按已放置考古学家数量解锁：1 个得金币、2 个得罗盘、3 个得 2 石板。',
  Falconry:'获得 1 罗盘；或推进猎鹰。', Tracking:'获得 1 罗盘；本回合查看并选择守卫时获得额外选择。', 'Animal Bond':'获得 1 金币；击败守卫后可放逐牌；击败 3 个守卫后可推进猎鹰。',
  Connections:'获得 1 金币，并可放逐最左物品后补充。', 'Research Notes':'获得 1 罗盘；或支付 2 金币获得 1 宝石。', Resourcefulness:'获得 1 金币；按已打出物品数解锁罗盘与重置助手。',
  Preservation:'获得 1 罗盘；或升级 1 个资源。', Arnakology:'获得 1 罗盘；并可交换档案与市场中的神器。', Linguistics:'获得 1 金币；按已打出神器数向公文包加入罗盘/石板。',
  Hike:'获得 1 罗盘；或消耗零食激活已发现地点。', Cartography:'获得 1 金币；或消耗零食激活未发现地点的正面神像。', Scouting:'获得 1 罗盘；本回合发现时查看更多一级地点。',
  'Worldly Goods':'获得 1 金币或抽 1 张牌。', 'Divine Guidance':'获得 1 罗盘；或放逐自己 1 张牌。', Meditation:'获得 1 金币；或放逐自己 1 张牌。', Blindsight:'获得 1 罗盘；本回合发现地点时将正面神像效果改为放逐自己 1 张牌。',
  'Hidden Fear':'恐惧牌，不能主动打出；可作为弃牌/旅行支付。', 'Special Delivery':'男爵夫人的专属递送牌；随其购买物品与回合机制结算。',
};
const leaderByCard:Record<string,string>={Falconry:'猎鹰手',Tracking:'猎鹰手',Funding:'各领袖','Animal Bond':'猎鹰手',Piloting:'船长',Transmission:'船长','Hidden Fear':'船长',Connections:'男爵夫人','Research Notes':'男爵夫人',Resourcefulness:'男爵夫人','Special Delivery':'男爵夫人',Preservation:'教授',Arnakology:'教授',Linguistics:'教授',Hike:'探险家',Cartography:'探险家',Scouting:'探险家','Worldly Goods':'神秘人','Divine Guidance':'神秘人',Meditation:'神秘人',Blindsight:'神秘人'};
// Funding has four different physical cards.  Keep the card id here so that
// each leader page shows only its own starting deck, rather than all Fundings.
const leaderByCardId:Record<string,string>={
  '1001':'猎鹰手','1002':'猎鹰手','1003':'猎鹰手','1004':'猎鹰手',
  '1005':'探险家','1006':'探险家','1007':'探险家','1008':'探险家',
  '1009':'教授','1010':'教授','1011':'教授','1012':'教授',
  '1013':'神秘人','1014':'神秘人','1015':'神秘人','1016':'神秘人',
  '1017':'男爵夫人','1018':'男爵夫人','1019':'男爵夫人','1020':'男爵夫人',
  '1021':'船长','1022':'船长','1023':'船长','1024':'船长',
};
const leaderRules=[
  ['船长','三名考古学家；可用专家主行动从供给区触发银色助手。蓝色神像给予罗盘与临时飞机；隐藏恐惧不能主动打出。'],
  ['猎鹰手','一名考古学家与猎鹰轨；击败守卫可推进猎鹰，之后可收回猎鹰取得对应地点/资源奖励。蓝色神像推进猎鹰。'],
  ['男爵夫人','以递送物品与市场操作为核心；每轮具有专属收入，Connections 可处理最左物品。蓝色神像获得金币并抽牌。'],
  ['教授','拥有档案与公文包；可用主行动购买档案神器，公文包储存罗盘/石板。蓝色神像触发公文包相关收益。'],
  ['探险家','仅一名考古学家，配三枚零食；零食可用于额外移动、Hike 与 Cartography，按回合解锁。蓝色神像重置零食。'],
  ['神秘人','五个神像槽（含恐惧槽与蓝槽）；恐惧可被放逐进入仪式堆，以 2/3/4 张恐惧执行不同仪式主行动。'],
] as const;
const researchSpecials:Record<ResearchBoardId,string>={
  bird:'鸟神庙：两枚研究标记沿各自路线推进；放大镜抵达终层后可按规则购买神庙板块，再进入失落神庙。',
  snake:'蛇神庙：两枚研究标记沿各自路线推进；末段奖励与失落神庙进入费用使用已核路径数据。',
  monkey:'猴神庙：放大镜与笔记本在中段分叉；放大镜经过神器格时激活该神器。末段前可购买 2 分，终层可购买 2/6 分神庙板块。',
  lizard:'蜥蜴神庙：第四层有守卫；放大镜到达该行时揭示，向上推进前必须击败。守卫会在回合结束给予停留标记恐惧；末段神庙板块购买规则同猴神庙。',
};

function sprite(asset?:Asset){if(!asset)return'';if(asset.url)return`background-image:url('${asset.url}')`;const x=asset.cardIndex%asset.sheetWidth,y=Math.floor(asset.cardIndex/asset.sheetWidth);return`background-image:url('${asset.sheetUrl}');background-size:${asset.sheetWidth*100}% ${asset.sheetHeight*100}%;background-position:${x/Math.max(1,asset.sheetWidth-1)*100}% ${y/Math.max(1,asset.sheetHeight-1)*100}%`;}
function travel(card:Card){return card.travel?Object.entries(card.travel).map(([kind,amount])=>`${amount}${({boot:'鞋',car:'车',boat:'船',plane:'飞机'} as Record<string,string>)[kind]??kind}`).join('＋'):'';}
function cardFacts(card:Card){const currency=card.type==='Artifact'?'罗盘':'金币',cost=typeof card.cost==='number'?`${card.cost} ${currency}`:'—',points=typeof card.points==='number'?`${card.points} 分`:'—';return`费用：${cost} · 分值：${points}`;}
function cardTile(card:Card,text:string,tag:string,done=true){return`<article class="atlas-card ${done?'done':'missing'}" title="${cardHoverText(card.id,card.name)}"><i style="${sprite(assets[`card:${card.id}:face`])}"></i><footer><b>${card.name}</b><small>${card.id} · ${tag}${travel(card)?` · ${travel(card)}`:''}</small><small class="card-facts">${cardFacts(card)}</small><p>${text}</p></footer></article>`;}
function tabs(){return`<section class="atlas-tabs"><button data-section="market" class="${section==='market'?'active':''}">市场牌</button><button data-section="leaders" class="${section==='leaders'?'active':''}">领袖机制</button><button data-section="research" class="${section==='research'?'active':''}">研究轨</button></section>`;}
function market(){const shown=marketCards.filter(card=>(expansion==='all'||card.expansion===expansion)&&(status==='all'||(status==='done')===Boolean(cardEffectSummaries[card.id]))&&(`${card.id} ${card.name}`).toLowerCase().includes(query.toLowerCase()));return`<section class="atlas-controls"><select data-expansion><option value="all">全部扩展</option>${[...new Set(marketCards.map(card=>card.expansion))].map(value=>`<option ${value===expansion?'selected':''}>${value}</option>`).join('')}</select><select data-status><option value="all">全部状态</option><option value="done" ${status==='done'?'selected':''}>已录入</option><option value="missing" ${status==='missing'?'selected':''}>待录入</option></select><input data-query value="${query}" placeholder="名称或 ID"><span>${shown.length}/${marketCards.length}</span></section><section class="atlas-grid">${shown.map(card=>cardTile(card,cardEffectSummaries[card.id]??'待录入 / 复核',card.expansion,Boolean(cardEffectSummaries[card.id]))).join('')}</section>`;}
function leaderCardsFor(name:string){return leaderCards.filter(card=>leaderByCardId[card.id]===name).map(card=>cardTile(card,leaderCardTexts[card.name]??'已接入领袖起始牌流程，待补充可读摘要。',name,Boolean(leaderCardTexts[card.name]))).join('');}
function leaders(){return`<section class="atlas-intro">每位领袖的专属起始牌紧跟在机制说明下；它们不会进入市场牌池。</section>${leaderRules.map(([name,body])=>`<section class="leader-section"><article class="rule-card"><h2>${name}</h2><p>${body}</p></article><div class="atlas-grid leader-card-grid">${leaderCardsFor(name)}</div></section>`).join('')}`;}
function cost(value:unknown){if(!value||typeof value!=='object')return'免费';const names:Record<string,string>={coin:'金币',compass:'罗盘',tablet:'石板',arrowhead:'箭头',jewel:'宝石',usableIdol:'神像'};const raw=value as Record<string,unknown>,parts=Object.entries(raw).flatMap(([key,amount])=>key==='travel'&&amount&&typeof amount==='object'?Object.entries(amount as Record<string,unknown>).map(([kind,count])=>`${count}${({boot:'鞋',car:'车',boat:'船',plane:'飞机'} as Record<string,string>)[kind]??kind}`):typeof amount==='number'&&amount?`${amount}${names[key]??key}`:[]);return parts.join('＋')||'免费';}
function reward(values:unknown){if(!Array.isArray(values)||!values.length)return'—';return values.map(value=>{if(!value||typeof value!=='object')return String(value);const item=value as Record<string,unknown>;if(item.type==='GAIN_RESOURCE')return`${item.amount}${({coin:'金币',compass:'罗盘',tablet:'石板',arrowhead:'箭头',jewel:'宝石'} as Record<string,string>)[String(item.resource)]??item.resource}`;if(item.type==='DRAW_CARD')return`抽 ${item.amount} 张`;return String(item.type);}).join(' / ');}
function research(){const track=tracks[researchBoard];if(!track)return'<p>研究轨数据不可用。</p>';const nodeReward=(node:{rewards?:unknown},token:'magnifying'|'journal')=>{const entries=node.rewards as Array<{token?:string;rewards?:unknown}>|undefined;return reward(entries?.find(entry=>entry.token===token)?.rewards);};const rows=track.rows.map(row=>`<article class="research-row"><h3>${row.id}</h3>${row.nodes.map(node=>`<div><b>${node.id.split(':').slice(-2).join(' ')}</b><span>放大镜：${nodeReward(node,'magnifying')} · 笔记本：${nodeReward(node,'journal')}</span></div>`).join('')}</article>`).join('');const bridges=(track.bridges??[]).map(bridge=>{const costs=[bridge.cost,...(bridge.alternativeCosts??[])].map(cost).join(' 或 ');return`<li>${bridge.from.split(':').slice(-2).join(' ')} → ${bridge.to.split(':').slice(-2).join(' ')} <b>${bridge.verified?'已核':'待核'}</b> ${costs}</li>`;}).join('');return`<section class="research-switch">${(['bird','snake','monkey','lizard'] as ResearchBoardId[]).map(id=>`<button data-research-board="${id}" class="${id===researchBoard?'active':''}">${id}</button>`).join('')}</section><section class="atlas-intro">${researchSpecials[researchBoard]} 节点奖励来自已验证研究奖励覆盖；路径费用来自研究轨手工覆盖。</section><section class="research-layout"><div>${rows}</div><aside><h2>路径费用</h2><ul>${bridges}</ul></aside></section>`;}
function render(){const body=section==='market'?market():section==='leaders'?leaders():research();app.innerHTML=`<main class="atlas"><header><a href="/">← 对局</a><h1>阿纳克规则图鉴</h1></header>${tabs()}${body}</main>`;}
app.addEventListener('click',event=>{const button=(event.target as HTMLElement).closest<HTMLButtonElement>('button');if(!button)return;if(button.dataset.section){section=button.dataset.section as typeof section;render();}if(button.dataset.researchBoard){researchBoard=button.dataset.researchBoard as ResearchBoardId;render();}});
app.addEventListener('change',event=>{const target=event.target as HTMLInputElement|HTMLSelectElement;if(target.matches('[data-expansion]'))expansion=target.value;if(target.matches('[data-status]'))status=target.value;if(target.matches('[data-query]'))query=target.value;render();});app.addEventListener('input',event=>{const target=event.target as HTMLInputElement;if(target.matches('[data-query]')){query=target.value;render();}});render();
