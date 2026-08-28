import { idolSlotConfig } from './leaders/idol-actions.ts';
import type { PlayerState } from './types.ts';

export const GUARDIAN_POINTS = 5;
export const IDOL_POINTS = 3;
export function guardianScore(player:Pick<PlayerState,'defeatedGuardians'>):number{return player.defeatedGuardians.length*GUARDIAN_POINTS;}
export function idolScore(player:Pick<PlayerState,'idols'>):number{return player.idols.length*IDOL_POINTS;}
export function templeTileScore(player:Pick<PlayerState,'templeTiles'>):number{return player.templeTiles.reduce((total,points)=>total+points,0);}
/** Score the values still visible in empty idol slots. Leaders may fill slots in any order. */
export function emptyIdolSlotScore(player:Pick<PlayerState,'idols'|'leader'>):number{
 const slots=idolSlotConfig(player.leader?.id);const occupied=new Set(player.idols.filter(idol=>idol.inSlot).map(idol=>(idol as any).slotIndex).filter((index):index is number=>Number.isInteger(index)));
 return slots.reduce((total,slot,index)=>total+(occupied.has(index)?0:slot.points),0);
}
