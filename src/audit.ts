import './audit.css';
import cards from './generated/cards.json';
import assetsJson from './generated/local-assets.json';
import { cardEffectSummaries } from './card-effect-summaries.ts';
import type { CardDefinition, LeaderId } from './types.ts';

type Status='pending'|'pass'|'issue';
type AuditRecord={status:Status;note:string;updatedAt:string};
type AuditItem={key:string;group:string;name:string;subtitle:string;image?:string;cardId?:string;leader?:LeaderId;summary:string};
type Asset={url?:string;sheetUrl:string;sheetWidth:number;sheetHeight:number;cardIndex:number};
const assetMap=(assetsJson as {assets:Record<string,Asset>}).assets;
const storageKey='arnak.semantic-audit.v1';
const leaderByStarter:Record<string,LeaderId>={
  '1001':'falconer','1002':'falconer','1003':'falconer','1004':'falconer','1005':'explorer','1006':'explorer','1007':'explorer','1008':'explorer',
  '1009':'professor','1010':'professor','1011':'professor','1012':'professor','1013':'mystic','1014':'mystic','1015':'mystic','1016':'mystic',
  '1017':'baroness','1018':'baroness','1019':'baroness','1020':'baroness','1021':'captain','1022':'captain','1023':'captain','1024':'captain',
};
const leaderNames:Record<LeaderId,string>={captain:'队长',falconer:'鹰女',baroness:'女爵',professor:'教授',explorer:'探险家',mystic:'神秘人'};
const leaderOperations:Record<LeaderId,Array<{id:string;name:string;summary:string}>>={
  captain:[{id:'specialist',name:'专家行动',summary:'放置不计入已放置数量的专家考古学家，并执行供应区任意银色助手。'},{id:'idol',name:'领袖神像槽',summary:'逐一验证各神像槽费用、时机及临时飞机。'}],
  falconer:[{id:'eagle',name:'猎鹰轨与召回',summary:'验证推进、五个位置、召回至 0 以及任选已经越过的奖励。'},{id:'tracking',name:'Tracking',summary:'当回合发现地点时查看两个守卫并选择一个。'},{id:'idol',name:'领袖神像槽',summary:'验证神像槽效果及消耗可用守卫推进猎鹰。'}],
  baroness:[{id:'income',name:'每轮收入',summary:'验证第一至第五轮收入及牌进入手牌后占用抽牌容量。'},{id:'delivery',name:'Special Delivery',summary:'验证购买物品、回收与市场交互。'},{id:'idol',name:'领袖神像槽',summary:'验证女爵各神像槽效果。'}],
  professor:[{id:'suitcase',name:'公文包',summary:'验证资源存入、解锁与教授第五格的金币/升级/罗盘收益。'},{id:'archive',name:'神器档案',summary:'验证档案神器获取、交换与执行。'},{id:'idol',name:'领袖神像槽',summary:'验证教授各神像槽效果。'}],
  explorer:[{id:'snacks',name:'零食',summary:'验证三种零食的解锁、消耗和在需要时弹窗选择。'},{id:'relocate',name:'移动限制',summary:'验证一名考古学家、普通 relocate 与地点激活限制。'},{id:'idol',name:'领袖神像槽',summary:'验证领袖神像槽以及零食重置。'}],
  mystic:[{id:'ritual',name:'仪式',summary:'点击仪式效果执行主行动；验证恐惧消耗、奖励与符合条件的守卫。'},{id:'blue-idol',name:'蓝色神像槽',summary:'直接执行仪式，不放逐起始牌；新获得恐惧可立即用于该效果。'},{id:'idol',name:'其他神像槽',summary:'验证五个神像槽的费用与效果。'}],
};

function art(cardId:string){const asset=assetMap[`card:${cardId}:face`];if(!asset)return'';if(asset.url)return`background-image:url('${asset.url}')`;const col=asset.cardIndex%asset.sheetWidth,row=Math.floor(asset.cardIndex/asset.sheetWidth);return`background-image:url('${asset.sheetUrl}');background-size:${asset.sheetWidth*100}% ${asset.sheetHeight*100}%;background-position:${asset.sheetWidth===1?0:col/(asset.sheetWidth-1)*100}% ${asset.sheetHeight===1?0:row/(asset.sheetHeight-1)*100}%`;}
const cardItems=(cards as Record<string,CardDefinition> ? Object.values(cards as Record<string,CardDefinition>) : []).filter(card=>card.type!=='Fear').map<AuditItem>(card=>{
  const leader=leaderByStarter[card.id];
  return{key:`card:${card.id}`,group:leader?`领袖起始牌 · ${leaderNames[leader]}`:`${card.expansion} · ${card.type}`,name:card.name,subtitle:`${card.id} · ${card.type}${card.cost===undefined?'':` · 费用 ${card.cost}`}`,cardId:card.id,leader,summary:cardEffectSummaries[card.id]??'尚未录入可读语义，必须重点核对牌面、引擎结果与行动时机。'};
});
const operationItems=Object.entries(leaderOperations).flatMap(([leader,operations])=>operations.map<AuditItem>(operation=>({key:`leader:${leader}:${operation.id}`,group:`领袖操作 · ${leaderNames[leader as LeaderId]}`,name:operation.name,subtitle:leaderNames[leader as LeaderId],leader:leader as LeaderId,summary:operation.summary})));
const itemSort=(a:AuditItem,b:AuditItem)=>a.group.localeCompare(b.group,'zh-CN')||a.subtitle.localeCompare(b.subtitle)||a.key.localeCompare(b.key);
const items=[...cardItems.sort(itemSort),...operationItems.sort(itemSort)];
let records:Record<string,AuditRecord>=load(),filter='all',query='',batchSize=5;
function load(){try{return JSON.parse(localStorage.getItem(storageKey)||'{}') as Record<string,AuditRecord>}catch{return{}}}
function save(){localStorage.setItem(storageKey,JSON.stringify(records))}
function statusOf(key:string):Status{return records[key]?.status??'pending'}
function counts(){return items.reduce((result,item)=>{result[statusOf(item.key)]++;return result},{pending:0,pass:0,issue:0} as Record<Status,number>)}
function labUrl(batch:AuditItem[]){const params=new URLSearchParams({audit:'batch'}),cardIds=batch.flatMap(item=>item.cardId?[item.cardId]:[]),leader=batch.find(item=>item.leader)?.leader;if(cardIds.length)params.set('cards',cardIds.join(','));if(leader)params.set('leader',leader);return`/lab.html?${params}`}
function nextBatch(){const pending=items.filter(item=>statusOf(item.key)==='pending');if(!pending.length)return[];const group=pending[0].group;return pending.filter(item=>item.group===group).slice(0,batchSize)}
const app=document.querySelector<HTMLDivElement>('#audit-app')!;
function render(){const c=counts(),batch=nextBatch(),visible=items.filter(item=>(filter==='all'||statusOf(item.key)===filter)&&(!query||`${item.name} ${item.subtitle} ${item.group} ${item.summary}`.toLowerCase().includes(query.toLowerCase()))),groups=Map.groupBy(visible,item=>item.group);app.innerHTML=`<main class="audit-shell"><header><div><small>LOCAL QA WORKBENCH</small><h1>卡牌与领袖语义审计台</h1><p>每批进入一个定向 Lab；结果自动保存在当前浏览器。</p></div><nav><button data-export>导出 JSON</button></nav></header><section class="audit-progress"><strong>${c.pass} / ${items.length}</strong><div><i style="width:${c.pass/items.length*100}%"></i></div><span>通过 ${c.pass} · 有问题 ${c.issue} · 未审 ${c.pending}</span></section><section class="audit-batch"><div><strong>下一批：${batch[0]?.group??'全部完成'}</strong><span>${batch.map(item=>item.name).join(' · ')||'没有未审项目'}</span></div><label>每批 <select data-batch-size><option value="5" ${batchSize===5?'selected':''}>5 项</option><option value="10" ${batchSize===10?'selected':''}>10 项</option></select></label><button data-start-batch ${batch.length?'':'disabled'}>打开本批 Lab</button></section><section class="audit-toolbar"><input data-query value="${query}" placeholder="搜索名称、ID 或问题"><div>${([['all','全部'],['pending','未审'],['issue','有问题'],['pass','通过']] as const).map(([id,label])=>`<button data-filter="${id}" class="${filter===id?'active':''}">${label}</button>`).join('')}</div></section><div class="audit-groups">${[...groups].map(([group,entries])=>`<section class="audit-group"><h2>${group}<span>${entries.length}</span></h2><div>${entries.map(item=>row(item)).join('')}</div></section>`).join('')||'<p class="audit-empty">没有符合条件的审计项。</p>'}</div></main>`;}
function row(item:AuditItem){const status=statusOf(item.key),record=records[item.key];return`<article class="audit-row status-${status}" data-key="${item.key}">${item.cardId?`<i class="audit-card-art" style="${art(item.cardId)}"></i>`:`<i class="audit-leader-art" style="background-image:url('/assets/boards/leader-${item.leader}.jpg')"></i>`}<div class="audit-copy"><h3>${item.name}</h3><small>${item.subtitle}</small><p>${item.summary}</p>${status==='issue'?`<textarea data-note="${item.key}" placeholder="简短记录审计出的问题">${record?.note??''}</textarea>`:''}</div><div class="audit-actions"><button data-status="pass">通过</button><button data-status="issue">有问题</button><button data-status="pending">重置</button></div></article>`}
app.addEventListener('click',event=>{const button=(event.target as HTMLElement).closest<HTMLButtonElement>('button');if(!button)return;if(button.dataset.startBatch!==undefined){const batch=nextBatch();if(batch.length)window.open(labUrl(batch),'_blank','noopener');return}if(button.dataset.filter){filter=button.dataset.filter;render();return}if(button.dataset.export!==undefined){const blob=new Blob([JSON.stringify({version:1,exportedAt:new Date().toISOString(),records},null,2)],{type:'application/json'}),link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download=`arnak-card-audit-${new Date().toISOString().slice(0,10)}.json`;link.click();URL.revokeObjectURL(link.href);return}if(button.dataset.status){const row=button.closest<HTMLElement>('[data-key]');if(!row)return;const key=row.dataset.key!,note=records[key]?.note??'';records[key]={status:button.dataset.status as Status,note,updatedAt:new Date().toISOString()};save();render();}});
app.addEventListener('input',event=>{const target=event.target as HTMLInputElement|HTMLTextAreaElement;if(target.matches('[data-query]')){query=target.value;render();return}if(target.dataset.note){const current=records[target.dataset.note]??{status:'issue' as Status,note:'',updatedAt:''};records[target.dataset.note]={...current,note:target.value,updatedAt:new Date().toISOString()};save();}});
app.addEventListener('change',event=>{const target=event.target as HTMLSelectElement;if(target.matches('[data-batch-size]')){batchSize=Number(target.value);render();}});
render();
