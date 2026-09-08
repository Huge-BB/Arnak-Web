import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { buildResearchTracks } from './research-data.ts';
import { findResearchBridge } from './research-manual.ts';
import type { ResearchManualData, ResearchTrackDefinition } from './types.ts';

async function tracks(){
 const generated=JSON.parse(await readFile(new URL('./generated/research-tracks.json',import.meta.url),'utf8')) as Record<string,ResearchTrackDefinition>;
 const manual=JSON.parse(await readFile(new URL('../data/research-manual-data.json',import.meta.url),'utf8')) as ResearchManualData;
 return buildResearchTracks(generated,manual);
}

test('user-confirmed Bird and Snake Lost Temple entry costs are executable verified bridges',async()=>{
 const all=await tracks(),bird=all.bird!,snake=all.snake!;
 for(const from of ['bird:r6:p0','bird:r6:p1']){
  const bridge=findResearchBridge(bird,from,'bird:temple');
  assert.equal(bridge.verified,true);
  assert.deepEqual(bridge.cost,{compass:1,coin:1,jewel:1});
 }
 const bridge=findResearchBridge(snake,'snake:r6:p0','snake:temple');
 assert.equal(bridge.verified,true);
 assert.deepEqual(bridge.cost,{compass:1,arrowhead:1,jewel:1});
});

test('user-confirmed Lizard paths preserve all three starting routes and their grouped printed costs',async()=>{
 const lizard=(await tracks()).lizard!;
 const cost=(from:string,to:string)=>findResearchBridge(lizard,from,to).cost;
 assert.deepEqual(cost('lizard:start','lizard:r0:p0'),{tablet:2,travel:{boot:1}});
 assert.deepEqual(cost('lizard:start','lizard:r0:p1'),{arrowhead:1,travel:{boot:1}});
 assert.deepEqual(cost('lizard:start','lizard:r0:p2'),{compass:2,travel:{boot:1}});
 assert.deepEqual(cost('lizard:r0:p0','lizard:r1:p0'),{compass:1,jewel:1});
 assert.deepEqual(cost('lizard:r0:p1','lizard:r1:p1'),{tablet:1,jewel:1});
 assert.deepEqual(cost('lizard:r1:p0','lizard:r2:p0'),{arrowhead:2});
 assert.deepEqual(cost('lizard:r1:p0','lizard:r2:p1'),{jewel:1});
 assert.deepEqual(cost('lizard:r1:p1','lizard:r2:p2'),{tablet:2,arrowhead:1});
 assert.deepEqual(cost('lizard:r2:p1','lizard:r3:p0'),{coin:1,compass:1,tablet:1});
 assert.deepEqual(cost('lizard:r3:p0','lizard:r4:p0'),{arrowhead:1,jewel:1});
 assert.deepEqual(cost('lizard:r4:p0','lizard:r5:p0'),{tablet:2,usableIdol:1});
 assert.deepEqual(cost('lizard:r4:p0','lizard:r5:p1'),{coin:1,jewel:1,travel:{boot:1}});
 assert.deepEqual(cost('lizard:r5:p0','lizard:r6:p0'),{tablet:1,arrowhead:2});
 const temple=findResearchBridge(lizard,'lizard:r6:p0','lizard:temple');
 assert.equal(temple.verified,true);
 assert.deepEqual(temple.cost,{jewel:2});
});

test('user-confirmed Monkey topology has distinct magnifying and journal routes with its printed costs',async()=>{
 const monkey=(await tracks()).monkey!;
 const cost=(from:string,to:string)=>findResearchBridge(monkey,from,to).cost;
 assert.deepEqual(cost('monkey:start','monkey:r0:p0'),{compass:1,tablet:2});
 assert.deepEqual(cost('monkey:start','monkey:r0:p1'),{jewel:1});
 assert.deepEqual(cost('monkey:start','monkey:r0:p2'),{compass:1,arrowhead:1});
 assert.deepEqual(cost('monkey:r1:p0','monkey:r2:p0'),{arrowhead:1,travel:{car:1}});
 assert.deepEqual(findResearchBridge(monkey,'monkey:r1:p1','monkey:r2:p0').alternativeCosts,[{tablet:2,travel:{boat:1}}]);
 assert.deepEqual(cost('monkey:r1:p2','monkey:r2:p0'),{tablet:2,travel:{boat:1}});
 assert.deepEqual(cost('monkey:r2:p0','monkey:r4:magnifying'),{tablet:2,arrowhead:1});
 assert.deepEqual(cost('monkey:r2:p0','monkey:r3:p0'),{jewel:1});
 assert.deepEqual(cost('monkey:r3:p0','monkey:r4:p0'),{tablet:1,arrowhead:1});
 assert.deepEqual(cost('monkey:r4:magnifying','monkey:r5:p0'),{coin:1,tablet:1,jewel:1});
 assert.deepEqual(cost('monkey:r5:p0','monkey:r6:p0'),{discardCard:1,jewel:1});
 assert.deepEqual(cost('monkey:r6:p0','monkey:r7:p0'),{arrowhead:2,travel:{plane:1}});
 assert.deepEqual(cost('monkey:r6:p1','monkey:r7:p1'),{tablet:1,jewel:1,travel:{plane:1}});
 assert.deepEqual(cost('monkey:r7:p0','monkey:temple'),{coin:2,tablet:1,jewel:1});
});
