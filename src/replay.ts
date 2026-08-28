import { applyEngineCommand, type EngineCommand } from './engine-api.ts';
import type { EngineContext, GameState } from './types.ts';

/** JSON-safe event envelope for hot-seat history, network sync, and replay. */
export interface EngineReplay { initialState:GameState; commands:EngineCommand[]; }

export function replayEngineCommands(replay:EngineReplay,context:EngineContext):GameState{
  return replay.commands.reduce((state,command)=>applyEngineCommand(state,command,context),structuredClone(replay.initialState));
}

/** Fails early when a caller attempts to persist non-serializable state or commands. */
export function serializeReplay(replay:EngineReplay):string{return JSON.stringify(replay);}
export function parseReplay(serialized:string):EngineReplay{
  const replay=JSON.parse(serialized) as EngineReplay;
  if(!replay||typeof replay!=='object'||!replay.initialState||!Array.isArray(replay.commands))throw new Error('Invalid engine replay payload');
  return replay;
}
