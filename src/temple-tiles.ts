import { researchNodeLevel } from './research-topology.ts';
import costs from '../data/temple-tile-costs-manual.json' with { type: 'json' };
import type { GameState, PlayerId, ResearchBoardId, ResearchTrackDefinition, ResourceCost, TempleTileSupply } from './types.ts';
export const TEMPLE_TILE_POINTS = { bronze: 2, silver: 6, gold: 11 } as const;
export type TempleTileTier = keyof typeof TEMPLE_TILE_POINTS;
type TempleCostBoard = { twoPointCosts: readonly ResourceCost[]; verified: boolean };
const BOARD_COSTS = costs.boards as Record<ResearchBoardId, TempleCostBoard>;
export function baseTempleTileSupply(playerCount:number):TempleTileSupply{if(!Number.isInteger(playerCount)||playerCount<1||playerCount>4)throw new Error('Arnak supports 1-4 players');return{bronze:3*playerCount,silver:2*playerCount,silverLeft:playerCount,silverRight:playerCount,gold:playerCount};}
export function templeTileCost(tier:TempleTileTier,combination?:0|1|2,board:ResearchBoardId='bird'):ResourceCost{
 const costsForBoard=BOARD_COSTS[board];if(!costsForBoard?.verified)throw new Error(`Temple tile costs for ${board} have not been verified`);
 const parts=tier==='bronze'?[combination??0]:tier==='silver'?(combination===1?[1,2]:[0,1]):[0,1,2];
 return parts.reduce<ResourceCost>((total,index)=>{if(index<0||index>2)throw new Error('Invalid temple tile combination');for(const [resource,amount]of Object.entries(costsForBoard.twoPointCosts[index]??{}))total[resource as keyof ResourceCost]=(total[resource as keyof ResourceCost]??0)+amount!;return total;},{});
}
function canBuyEarlyTempleTile(state:GameState,playerId:PlayerId,tier:TempleTileTier,track:ResearchTrackDefinition|undefined){
 if(!track||!['monkey','lizard'].includes(track.id))return false;
 const node=state.research.magnifyingNode[playerId]??`${track.id}:start`,level=researchNodeLevel(track,node),distance=track.rows.length-level;
 return (distance===1&&tier!=='gold')||(distance===2&&tier==='bronze');
}
export function canBuyTempleTile(state:GameState,playerId:PlayerId,tier:TempleTileTier,track?:ResearchTrackDefinition){return state.research.templeArrivals.includes(playerId)||canBuyEarlyTempleTile(state,playerId,tier,track);}
export function buyTempleTile(state:GameState,playerId:PlayerId,tier:TempleTileTier,combination?:0|1|2,track?:ResearchTrackDefinition){const player=state.players[playerId];if(!player)throw new Error(`Unknown player: ${playerId}`);if(!canBuyTempleTile(state,playerId,tier,track))throw new Error('Temple tile requires the Lost Temple or an eligible Monkey/Lizard research position');if(state.templeTiles[tier]<1)throw new Error(`No ${tier} temple tiles remain`);const cost=templeTileCost(tier,combination,track?.id??state.research.board);for(const [resource,amount]of Object.entries(cost))if(player.resources[resource as keyof typeof player.resources]<amount!)throw new Error(`Insufficient ${resource}`);if(tier==='silver'){const stack=combination===1?'silverRight':'silverLeft';if(state.templeTiles[stack]<1)throw new Error(`No ${stack==='silverLeft'?'left':'right'} 6-point temple tiles remain`);state.templeTiles[stack]-=1;}for(const [resource,amount]of Object.entries(cost))player.resources[resource as keyof typeof player.resources]-=amount!;state.templeTiles[tier]-=1;player.templeTiles.push(TEMPLE_TILE_POINTS[tier]);}
