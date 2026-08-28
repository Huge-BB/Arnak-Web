import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root=resolve(import.meta.dirname,'..');
const generated=JSON.parse(await readFile(resolve(root,'src/generated/research-tracks.json'),'utf8'));
const manual=JSON.parse(await readFile(resolve(root,'data/research-manual-data.json'),'utf8'));
const boardIds=['bird','snake','monkey','lizard'];
const label=node=>node.endsWith(':start')?'起点':node.endsWith(':temple')?'失落神庙':node.replace(/^.*:r(\d+):p(\d+)$/,'第 $1 行 / 路径 $2');
let remaining=0;
for(const boardId of boardIds){
 const track=generated[boardId],recorded=new Set((manual.boards?.[boardId]?.bridges??[]).filter(bridge=>bridge.verified).map(bridge=>`${bridge.from}->${bridge.to}`));
 const generatedBridges=track.bridges??[],ids=new Set(generatedBridges.map(bridge=>`${bridge.from}->${bridge.to}`));
 const entries=[...generatedBridges.map(bridge=>({from:bridge.from,to:bridge.to})),...((manual.boards?.[boardId]?.bridges??[]).filter(bridge=>bridge.to===`${boardId}:temple`&&!ids.has(`${bridge.from}->${bridge.to}`)))];
 const missing=entries.filter(bridge=>!recorded.has(`${bridge.from}->${bridge.to}`));remaining+=missing.length;
 console.log(`\n${boardId.toUpperCase()} — ${missing.length} 条待核验路径`);
 for(const bridge of missing)console.log(`  ${bridge.from} -> ${bridge.to}  (${label(bridge.from)} → ${label(bridge.to)})`);
}
console.log(`\n总计：${remaining} 条待核验路径。`);
