import type { PlayerId, ResearchTrackDefinition } from './types.ts';

export interface TempleArrivalState { arrivals: PlayerId[]; points: Record<PlayerId, number>; }
export function emptyTempleArrivalState(): TempleArrivalState { return { arrivals: [], points: {} }; }
export function assignTempleArrival(state:TempleArrivalState,track:ResearchTrackDefinition,playerId:PlayerId):TempleArrivalState {
 if(state.arrivals.includes(playerId)) throw new Error(`${playerId} has already reached the Lost Temple`);
 const slot=state.arrivals.length;
 if(slot>=4) throw new Error('No Lost Temple arrival space remains');
 const points=track.templeArrivalPoints?.[slot];
 if(points===undefined) throw new Error(`Lost Temple arrival points for ${track.id} place ${slot+1} have not been recorded`);
 return {arrivals:[...state.arrivals,playerId],points:{...state.points,[playerId]:points}};
}
export function templeArrivalPoints(state:TempleArrivalState,playerId:PlayerId):number{return state.points[playerId]??0;}
