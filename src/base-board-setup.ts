import { shuffleWithSeed } from './rng.ts';
import type { GameState } from './types.ts';

/** A clickable printed space on the selected main board. */
export type BaseBoardSpot = {
  id: string;
  level: 1 | 2;
  /** Semantic board row: camp=0, then each printed row above it. */
  mapRow: number;
  left: number;
  top: number;
  /** Source-art pixel dimensions captured by the board calibrator. */
  width?: number;
  height?: number;
  /** Cards that must be committed as the printed travel cost. */
  travelCost?: Record<string, number>;
  rewardCode?: string;
};

/** One visible interaction area per camp; its two internal worker slots stay server-side. */
export const BASE_BOARD_INTERACTION_SPOTS: BaseBoardSpot[] = [
  ...[[1,11.26,89.79,136,184],[2,30.94,87.56,136,184],[3,50.47,85.54,136,174],[4,70,87.87,136,180],[5,89.99,90.29,136,174]].map(([n,left,top,width,height])=>({id:`camp-${n}`,level:1 as const,mapRow:0,left:Number(left)*2/3,top:Number(top),width:Number(width)*2/3,height:Number(height),rewardCode:'camp'})),
  ...[[1,12.98,64.11,132,204],[2,38.75,60.77,140,190],[3,63.28,62.89,128,190],[4,87.49,64.71,130,176],[5,12.51,40.85,134,182],[6,37.81,39.43,128,186],[7,61.4,41.86,126,192],[8,87.81,42.67,134,190]].map(([n,left,top,width,height])=>({id:`level1-${n}`,level:1 as const,mapRow:n! <= 4 ? 1 : 2,left:Number(left)*2/3,top:Number(top),width:Number(width)*2/3,height:Number(height)})),
  ...[[1,13.91,14.26,160,160],[2,38.13,12.44,150,156],[3,62.34,12.13,160,160],[4,87.18,15.07,152,146]].map(([n,left,top,width,height])=>({id:`level2-${n}`,level:2 as const,mapRow:3,left:Number(left)*2/3,top:Number(top),width:Number(width)*2/3,height:Number(height)})),
];

// The five camp sites have two independently occupiable shoe spaces. The TTS
// mod uses a blocker on a random right-hand shoe for games below four players.
export const BASE_BOARD_SPOTS: BaseBoardSpot[] = [
  // The full-board art reserves its right third for research. Camps are the
  // five cards along the lower map edge, not the upper exploration rows.
  ...[['camp-1', 7, 96, 'cc'], ['camp-2', 20.5, 96, 'ss'], ['camp-3', 34, 96, 'tt'], ['camp-4', 47.5, 96, 'a'], ['camp-5', 60, 96, 'j']]
    .flatMap(([id, left, top, rewardCode]) => [
      { id: `${id}-a`, level: 1 as const, mapRow: 0, left: Number(left) - 1.7, top: Number(top), rewardCode: String(rewardCode), travelCost: { boot: 1 } },
      { id: `${id}-b`, level: 1 as const, mapRow: 0, left: Number(left) + 1.7, top: Number(top), rewardCode: String(rewardCode), travelCost: { boot: 2 } },
    ]),
  // The upper row is Level II (two matching transport icons); the two rows
  // below it are Level I (one icon). IDs match the visible interaction areas,
  // so a clicked L1 cannot accidentally resolve as L2.
  ...[[12.98,64.11],[38.75,60.77],[63.28,62.89],[87.49,64.71],[12.51,40.85],[37.81,39.43],[61.4,41.86],[87.81,42.67]]
    .map(([left, top], index) => ({ id: `level1-${index + 1}`, level: 1 as const, mapRow: index < 4 ? 1 : 2, left: left * 2 / 3, top, travelCost: index % 4 < 2 ? { car: 1 } : { boat: 1 } })),
  ...[[13.91,14.26],[38.13,12.44],[62.34,12.13],[87.18,15.07]]
    .map(([left, top], index) => ({ id: `level2-${index + 1}`, level: 2 as const, mapRow: 3, left: left * 2 / 3, top, travelCost: index < 2 ? { car: 2 } : { boat: 2 } })),
];

export function blockedCampIds(playerCount: number, seed: string): string[] {
  const count = playerCount === 2 ? 5 : playerCount === 3 ? 3 : 0;
  return shuffleWithSeed(['camp-1-b', 'camp-2-b', 'camp-3-b', 'camp-4-b', 'camp-5-b'], `${seed}:camp-blocking`).slice(0, count);
}

/** Resolve one visual camp interaction into a legal physical worker slot. */
export function resolveBaseBoardPlacementSite(sites: GameState['sites'], siteId: string): string {
  if (!/^camp-[1-5]$/.test(siteId)) return siteId;
  const slot = ['a','b'].map(suffix => sites[`${siteId}-${suffix}`]).find(candidate => candidate && !candidate.blocked && !candidate.occupiedBy);
  if (!slot) throw new Error('Camp is full or blocked for this player count');
  return slot.id;
}

export function createBaseBoardSites(playerCount: number, seed: string, board: 'bird' | 'snake' = 'bird'): GameState['sites'] {
  const blocked = new Set(blockedCampIds(playerCount, seed));
  const sites = Object.fromEntries(BASE_BOARD_SPOTS.map((spot) => [spot.id, {
    id: spot.id,
    level: spot.level,
    mapRow: spot.mapRow,
    isTentSite: Boolean(spot.rewardCode),
    idolSlots: spot.rewardCode ? 0 : spot.level === 1 ? 1 : 2,
    ...(spot.rewardCode ? { rewardCode: spot.rewardCode } : {}),
    ...('travelCost' in spot ? { travelCost: spot.travelCost } : {}),
    ...(spot.id.startsWith('camp-5-') ? { discardCardCost: 1 } : {}),
    ...(blocked.has(spot.id) ? { blocked: true } : {}),
  }])) as GameState['sites'];
  // The advanced Snake map changes four printed routes; the board selector is
  // gameplay data, not merely a visual skin.
  if (board === 'snake') {
    sites['level1-6'].travelCost = { boot: 2 };
    sites['level1-7'].travelCost = { plane: 1 };
    sites['level2-2'].travelCost = { plane: 1, boot: 1 };
    sites['level2-3'].travelCost = { car: 1, boat: 1 };
  }
  return sites;
}
