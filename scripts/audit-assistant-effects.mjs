import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

// This web client was split out of the former monorepo.  Keep the audit
// self-contained so its result is meaningful from this repository's root.
const repoRoot=resolve(import.meta.dirname,'..');
const path=resolve(repoRoot,'data/assistant-effects-manual.json');
const data=JSON.parse(await readFile(path,'utf8'));
if(data.$schemaVersion!==1)throw new Error(`Unsupported assistant effect schema: ${data.$schemaVersion}`);
const catalog=data.effectCatalog??{},bindings=data.assistantBindings??[];
const keys=Object.keys(catalog),baseBindings=bindings.filter(binding=>(binding.expansion??'Base Game')==='Base Game'),leaderBindings=bindings.filter(binding=>binding.expansion==='Expedition Leaders');
if(keys.length!==15)throw new Error(`Expected 15 assistant effect definitions, found ${keys.length}`);
if(baseBindings.length!==12||leaderBindings.length!==3||bindings.length!==15)throw new Error(`Expected 12 base and 3 Expedition Leaders assistant bindings, found ${baseBindings.length} base / ${leaderBindings.length} leaders`);
const ids=new Set(),cards=new Set(),mapped=new Set();
for(const binding of bindings){
 if(!binding.assistantId)throw new Error('Assistant binding missing assistantId');
 if(ids.has(binding.assistantId))throw new Error(`Duplicate assistant binding: ${binding.assistantId}`);ids.add(binding.assistantId);
 if(!Number.isInteger(binding.cardId))throw new Error(`Assistant ${binding.assistantId} missing CardID`);
 if(cards.has(binding.cardId))throw new Error(`Duplicate assistant CardID: ${binding.cardId}`);cards.add(binding.cardId);
 if(binding.effectKey!==null){if(!catalog[binding.effectKey])throw new Error(`Unknown effectKey ${binding.effectKey} for ${binding.assistantId}`);if(mapped.has(binding.effectKey))throw new Error(`Effect ${binding.effectKey} is bound more than once`);mapped.add(binding.effectKey);}
}
const unmapped=bindings.filter(x=>x.effectKey===null);
const unused=keys.filter(key=>!mapped.has(key));
console.log(`Assistant effect catalog: ${keys.length} definitions (${baseBindings.length} base, ${leaderBindings.length} Expedition Leaders), ${bindings.length-unmapped.length}/${bindings.length} visual bindings complete.`);
if(unmapped.length){console.log('Unmapped TTS assistants:');for(const b of unmapped)console.log(`  ${b.assistantId} CardID=${b.cardId} (deck ${b.deckId}, sprite index ${b.cardIndex})`);}
if(unused.length){console.log(`Unused effect keys: ${unused.join(', ')}`);}
if(process.argv.includes('--strict')&&(unmapped.length||unused.length))process.exitCode=1;
