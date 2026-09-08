import manual from '../data/assistant-effects-manual.json' with { type:'json' };
import type { AssistantEffect, AssistantEffectLevels, AssistantLevel, EngineContext, GameState } from './types.ts';

type ManualData = {
  effectCatalog:Record<string, AssistantEffectLevels>;
  assistantBindings:Array<{assistantId:string;effectKey:string|null}>;
};

/** Maps every imported assistant ID to its executable effects. Setup decides which cards enter supply. */
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

/** Applies the Expedition Leaders replacement silver side without changing the base game. */
export function assistantEffectFor(state:GameState,assistantId:string,level:AssistantLevel,context:EngineContext):AssistantEffect|undefined {
  if (state.enabledExpansions?.includes('Expedition Leaders') && assistantId==='f7574d' && level==='silver') {
    return {type:'SEQUENCE',freeAction:true,effects:[{type:'GAIN_TRAVEL',travel:{boot:1}},{type:'GAIN_RESOURCES',resources:{coin:1}}]};
  }
  return context.assistantEffects?.[assistantId]?.[level];
}
