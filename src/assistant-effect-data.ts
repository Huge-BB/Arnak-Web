import manual from '../data/assistant-effects-manual.json' with { type:'json' };
import type { AssistantEffectLevels, EngineContext } from './types.ts';

type ManualData = {
  effectCatalog:Record<string, AssistantEffectLevels>;
  assistantBindings:Array<{assistantId:string;effectKey:string|null}>;
};

/** Maps the visually verified base-game assistant IDs to executable effects. */
export function baseAssistantEffects():Record<string, AssistantEffectLevels> {
  const data=manual as ManualData;
  return Object.fromEntries(data.assistantBindings.map(binding=>{
    if(!binding.effectKey)throw new Error(`Assistant ${binding.assistantId} has no effect binding`);
    const effect=data.effectCatalog[binding.effectKey];
    if(!effect)throw new Error(`Assistant ${binding.assistantId} references unknown effect ${binding.effectKey}`);
    return[binding.assistantId,effect];
  }));
}

/** Adds the base-game catalog without replacing caller-provided custom effects. */
export function withBaseAssistantEffects(context:EngineContext):EngineContext {
  return{...context,assistantEffects:{...baseAssistantEffects(),...context.assistantEffects}};
}
