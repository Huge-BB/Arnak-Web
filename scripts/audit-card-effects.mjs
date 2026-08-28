import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root=resolve(import.meta.dirname,'..');
const cards=JSON.parse(await readFile(resolve(root,'src/generated/cards.json'),'utf8'));
const manual=JSON.parse(await readFile(resolve(root,'data/card-effects-manual.json'),'utf8'));
if(manual.$schemaVersion!==1||!manual.effects||typeof manual.effects!=='object')throw new Error('Invalid card effect manual data');
const targets=Object.values(cards).filter(card=>card.expansion==='Base Game'&&(card.type==='Item'||card.type==='Artifact'));
const targetIds=new Set(targets.map(card=>card.id));
for(const id of Object.keys(manual.effects))if(!targetIds.has(id))throw new Error(`Card effect entry references non-base market card: ${id}`);
const verified=Object.keys(manual.effects).length;
console.log(`Base market card effect coverage: ${verified}/${targets.length} verified (${targets.length-verified} pending transcription).`);
