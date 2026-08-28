import manual from '../data/guardian-effects-manual.json' with { type:'json' };
import type { EngineContext, GuardianBoon, GuardianCost, GuardianDefinition } from './types.ts';

type ManualEntry={cost:GuardianCost;boon:GuardianBoon};
type ManualData={$schemaVersion:1;guardians:Record<string,ManualEntry>};

/** Merge only visually verified base-game guardian data into extracted TTS identities. */
export function withBaseGuardianEffects(context:EngineContext):EngineContext{
  const entries=(manual as ManualData).guardians;
  const guardians:Record<string,GuardianDefinition>={...context.guardians};
  for(const [id,entry] of Object.entries(entries)){
    const guardian=guardians[id];
    if(!guardian)throw new Error(`Guardian manual entry references unknown guardian: ${id}`);
    guardians[id]={...guardian,cost:entry.cost,boon:entry.boon};
  }
  return {...context,guardians};
}
