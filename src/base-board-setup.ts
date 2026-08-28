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
  rewardCode?: string;
};

// The five camp sites have two independently occupiable shoe spaces. The TTS
// mod uses a blocker on a random right-hand shoe for games below four players.
export const BASE_BOARD_SPOTS: BaseBoardSpot[] = [
  // The full-board art reserves its right third for research. Camps are the
  // five cards along the lower map edge, not the upper exploration rows.
  ...[['camp-1', 7, 96, 'cc'], ['camp-2', 20.5, 96, 'ss'], ['camp-3', 34, 96, 'tt'], ['camp-4', 47.5, 96, 'a'], ['camp-5', 60, 96, 'j']]
    .flatMap(([id, left, top, rewardCode]) => [
      { id: `${id}-a`, level: 1 as const, mapRow: 0, left: Number(left) - 1.7, top: Number(top), rewardCode: String(rewardCode) },
      { id: `${id}-b`, level: 1 as const, mapRow: 0, left: Number(left) + 1.7, top: Number(top), rewardCode: String(rewardCode) },
    ]),
  ...[[8, 20], [25, 19], [42, 18], [59, 20], [8, 45], [25, 44], [42, 48], [59, 48]]
    .map(([left, top], index) => ({ id: `level1-${index + 1}`, level: 1 as const, mapRow: index < 4 ? 3 : 2, left, top })),
  ...[[8, 70], [25, 70], [42, 70], [59, 70]]
    .map(([left, top], index) => ({ id: `level2-${index + 1}`, level: 2 as const, mapRow: 1, left, top })),
];

export function blockedCampIds(playerCount: number, seed: string): string[] {
  const count = playerCount === 2 ? 5 : playerCount === 3 ? 3 : 0;
  return shuffleWithSeed(['camp-1-b', 'camp-2-b', 'camp-3-b', 'camp-4-b', 'camp-5-b'], `${seed}:camp-blocking`).slice(0, count);
}

export function createBaseBoardSites(playerCount: number, seed: string): GameState['sites'] {
  const blocked = new Set(blockedCampIds(playerCount, seed));
  return Object.fromEntries(BASE_BOARD_SPOTS.map((spot) => [spot.id, {
    id: spot.id,
    level: spot.level,
    mapRow: spot.mapRow,
    isTentSite: Boolean(spot.rewardCode),
    idolSlots: spot.rewardCode ? 0 : spot.level === 1 ? 1 : 2,
    ...(spot.rewardCode ? { rewardCode: spot.rewardCode } : {}),
    ...(spot.id.startsWith('camp-5-') ? { discardCardCost: 1 } : {}),
    ...(blocked.has(spot.id) ? { blocked: true } : {}),
  }])) as GameState['sites'];
}
