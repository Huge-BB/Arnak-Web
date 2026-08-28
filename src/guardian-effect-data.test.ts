import test from 'node:test';
import assert from 'node:assert/strict';
import { withBaseGuardianEffects } from './guardian-effect-data.ts';
import type { EngineContext } from './types.ts';

test('verified guardian bindings preserve identities and add executable cost plus boon',()=>{
 const ids=['094b9c','46196d','4820e2','4e3cf3','4f2bd2','87eb00','88e2d0','8b09d1','9cfd06','9d1649','be4964','c1e7ef','cdb620','e5153d','faa0f3'];
 const context:EngineContext={cards:{},guardians:Object.fromEntries([...ids,'other'].map(id=>[id,{id,expansion:'Base Game'}]))};
 const result=withBaseGuardianEffects(context);
 assert.deepEqual(result.guardians?.['094b9c'].cost,{compass:2,arrowhead:1});
 assert.deepEqual(result.guardians?.['094b9c'].boon,{type:'GAIN_TRAVEL',travel:{boat:1}});
 assert.equal(result.guardians?.other.cost,undefined);
});
